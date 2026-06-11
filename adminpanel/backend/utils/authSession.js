import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import RefreshToken from '../models/refreshTokenModel.js';
import User from '../models/userModel.js';
import { ADMIN_JWT_SECRET, IS_PRODUCTION } from '../config/security.js';

const ACCESS_TOKEN_TTL_MINUTES = Math.max(5, Number(process.env.ACCESS_TOKEN_TTL_MINUTES) || 60);
const REFRESH_TOKEN_TTL_DAYS = Math.max(1, Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 14);
const LEGACY_SESSION_REFRESH_TOKEN_TTL_DAYS = Number(process.env.SESSION_REFRESH_TOKEN_TTL_DAYS);
const SESSION_REFRESH_TOKEN_TTL_HOURS = Math.max(
  1,
  Number(process.env.SESSION_REFRESH_TOKEN_TTL_HOURS)
    || ((Number.isFinite(LEGACY_SESSION_REFRESH_TOKEN_TTL_DAYS) && LEGACY_SESSION_REFRESH_TOKEN_TTL_DAYS > 0)
      ? LEGACY_SESSION_REFRESH_TOKEN_TTL_DAYS * 24
      : 1)
);
const REFRESH_TOKEN_ROTATION_GRACE_SECONDS = Math.max(
  5,
  Number(process.env.REFRESH_TOKEN_ROTATION_GRACE_SECONDS) || 45
);
export const REFRESH_COOKIE_NAME = String(process.env.ADMIN_REFRESH_COOKIE_NAME || 'fc_admin_rt').trim();
const ACCESS_TOKEN_TTL_SECONDS = ACCESS_TOKEN_TTL_MINUTES * 60;
const REFRESH_TOKEN_TTL_MS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
const SESSION_REFRESH_TOKEN_TTL_MS = SESSION_REFRESH_TOKEN_TTL_HOURS * 60 * 60 * 1000;
const REFRESH_TOKEN_ROTATION_GRACE_MS = REFRESH_TOKEN_ROTATION_GRACE_SECONDS * 1000;

const hashToken = (value) => crypto.createHash('sha256').update(String(value || '')).digest('hex');
const randomToken = () => crypto.randomBytes(48).toString('base64url');
const makeFamilyId = () => crypto.randomUUID();

const parseCookies = (cookieHeader) =>
  String(cookieHeader || '')
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((accumulator, entry) => {
      const separatorIndex = entry.indexOf('=');
      if (separatorIndex <= 0) return accumulator;
      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      accumulator[key] = decodeURIComponent(value);
      return accumulator;
    }, {});

const getCookieOptions = ({ persistent = false, maxAgeMs } = {}) => {
  const options = {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? 'none' : 'lax',
    path: '/',
  };
  if (persistent && Number.isFinite(maxAgeMs) && maxAgeMs > 0) {
    options.maxAge = maxAgeMs;
  }
  return options;
};

const getRefreshTtlMs = (persistent) => (persistent ? REFRESH_TOKEN_TTL_MS : SESSION_REFRESH_TOKEN_TTL_MS);
const SESSION_ADMIN_SELECT = 'firstName lastName otherName fullName position unitSector email role avatar isActive';
const mapSessionAdmin = (user) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  otherName: user.otherName,
  fullName: user.fullName,
  position: user.position,
  unitSector: user.unitSector,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
});

export const createAdminAccessToken = (userId) =>
  jwt.sign({ id: userId }, ADMIN_JWT_SECRET, {
    expiresIn: `${ACCESS_TOKEN_TTL_MINUTES}m`,
  });

export const getRefreshTokenFromRequest = (req) => {
  const cookies = parseCookies(req.headers.cookie);
  return String(cookies[REFRESH_COOKIE_NAME] || '').trim();
};

export const getRefreshTokenFromCookieHeader = (cookieHeader) => {
  const cookies = parseCookies(cookieHeader);
  return String(cookies[REFRESH_COOKIE_NAME] || '').trim();
};

export const findAdminByRefreshToken = async (rawToken) => {
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);
  const tokenRecord = await RefreshToken.findOne({
    tokenHash,
    platform: 'admin',
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!tokenRecord) return null;
  const user = await User.findById(tokenRecord.userId).select('_id email role isActive');
  if (!user || !user.isActive) return null;
  if (!['team-lead', 'executive', 'admin'].includes(String(user.role || '').trim())) return null;
  return user;
};

export const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, getCookieOptions({ persistent: false }));
};

const issueRefreshToken = async ({ userId, familyId, ipAddress, userAgent, persistent = false }) => {
  const rawToken = randomToken();
  const tokenHash = hashToken(rawToken);
  const refreshTtlMs = getRefreshTtlMs(persistent);
  const expiresAt = new Date(Date.now() + refreshTtlMs);

  await RefreshToken.create({
    userId,
    platform: 'admin',
    tokenHash,
    familyId,
    createdByIp: ipAddress || '',
    userAgent: userAgent || '',
    persistent,
    lastUsedAt: new Date(),
    expiresAt,
  });

  return { rawToken, tokenHash, expiresAt, persistent, refreshTtlMs };
};

const isRotationGraceEligible = (tokenRecord) =>
  Boolean(
    tokenRecord?.revokedAt
    && tokenRecord?.revokedReason === 'rotated'
    && tokenRecord?.replacedByTokenHash
    && (Date.now() - tokenRecord.revokedAt.getTime()) <= REFRESH_TOKEN_ROTATION_GRACE_MS
  );

const findGraceReplacementRecord = async (tokenRecord, platform) => {
  let nextHash = tokenRecord?.replacedByTokenHash || '';
  let hopCount = 0;

  while (nextHash && hopCount < 6) {
    const candidate = await RefreshToken.findOne({ tokenHash: nextHash, platform });
    if (!candidate) return null;

    if (!candidate.revokedAt && candidate.expiresAt.getTime() > Date.now()) {
      return candidate;
    }

    if (!isRotationGraceEligible(candidate)) {
      return null;
    }

    nextHash = candidate.replacedByTokenHash || '';
    hopCount += 1;
  }

  return null;
};

const writeRefreshCookie = (res, refreshToken) => {
  res.cookie(
    REFRESH_COOKIE_NAME,
    refreshToken.rawToken,
    getCookieOptions({
      persistent: refreshToken.persistent,
      maxAgeMs: refreshToken.refreshTtlMs,
    })
  );
};

const rotateFromActiveRecord = async ({ user, activeRecord, req, res }) => {
  const replacement = await issueRefreshToken({
    userId: user._id,
    familyId: activeRecord.familyId,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    persistent: Boolean(activeRecord.persistent),
  });

  activeRecord.revokedAt = new Date();
  activeRecord.revokedReason = 'rotated';
  activeRecord.replacedByTokenHash = replacement.tokenHash;
  activeRecord.lastUsedAt = new Date();
  await activeRecord.save();

  writeRefreshCookie(res, replacement);

  return {
    token: createAdminAccessToken(user._id),
    accessTokenExpiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
    refreshSessionExpiresAt: replacement.expiresAt.toISOString(),
    rememberMe: replacement.persistent,
    user: mapSessionAdmin(user),
  };
};

export const issueAdminSession = async ({ user, req, res, familyId, rememberMe = false }) => {
  const refreshToken = await issueRefreshToken({
    userId: user._id,
    familyId: familyId || makeFamilyId(),
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    persistent: Boolean(rememberMe),
  });

  writeRefreshCookie(res, refreshToken);

  return {
    token: createAdminAccessToken(user._id),
    accessTokenExpiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
    refreshSessionExpiresAt: refreshToken.expiresAt.toISOString(),
    rememberMe: refreshToken.persistent,
  };
};

export const revokeRefreshFamilyForAdmin = async (userId, reason = 'revoked') => {
  if (!userId) return;
  await RefreshToken.updateMany(
    { userId, platform: 'admin', revokedAt: null },
    {
      $set: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    }
  );
};

export const revokeRefreshTokenFromRequest = async (req) => {
  const rawToken = getRefreshTokenFromRequest(req);
  if (!rawToken) return false;

  const tokenHash = hashToken(rawToken);
  const tokenRecord = await RefreshToken.findOne({
    tokenHash,
    platform: 'admin',
  });

  if (!tokenRecord || tokenRecord.revokedAt) return false;

  tokenRecord.revokedAt = new Date();
  tokenRecord.revokedReason = 'logout';
  tokenRecord.lastUsedAt = new Date();
  await tokenRecord.save();
  return true;
};

export const rotateAdminRefreshSession = async ({ req, res }) => {
  const rawToken = getRefreshTokenFromRequest(req);
  if (!rawToken) {
    throw new Error('Refresh token missing');
  }

  const tokenHash = hashToken(rawToken);
  const existing = await RefreshToken.findOne({
    tokenHash,
    platform: 'admin',
  });

  if (!existing) {
    throw new Error('Refresh token invalid');
  }

  if (existing.revokedAt) {
    if (isRotationGraceEligible(existing)) {
      const graceRecord = await findGraceReplacementRecord(existing, 'admin');
      if (graceRecord) {
        const graceUser = await User.findById(graceRecord.userId).select(SESSION_ADMIN_SELECT);
        if (graceUser?.isActive) {
          return rotateFromActiveRecord({ user: graceUser, activeRecord: graceRecord, req, res });
        }
      }
    }

    await RefreshToken.updateMany(
      { familyId: existing.familyId, platform: 'admin', revokedAt: null },
      {
        $set: {
          revokedAt: new Date(),
          revokedReason: 'refresh token reuse detected',
        },
      }
    );
    throw new Error('Refresh token reuse detected');
  }

  if (existing.expiresAt.getTime() <= Date.now()) {
    existing.revokedAt = new Date();
    existing.revokedReason = 'refresh token expired';
    existing.lastUsedAt = new Date();
    await existing.save();
    throw new Error('Refresh token expired');
  }

  const user = await User.findById(existing.userId).select(SESSION_ADMIN_SELECT);

  if (!user || !user.isActive) {
    await RefreshToken.updateMany(
      { familyId: existing.familyId, platform: 'admin', revokedAt: null },
      {
        $set: {
          revokedAt: new Date(),
          revokedReason: 'user inactive during refresh',
        },
      }
    );
    throw new Error('Account inactive');
  }

  const adminRoles = new Set(['team-lead', 'executive', 'admin']);
  if (!adminRoles.has(String(user.role || '').trim())) {
    await RefreshToken.updateMany(
      { familyId: existing.familyId, platform: 'admin', revokedAt: null },
      {
        $set: {
          revokedAt: new Date(),
          revokedReason: 'role no longer allowed for admin session',
        },
      }
    );
    throw new Error('Admin access denied');
  }

  return rotateFromActiveRecord({ user, activeRecord: existing, req, res });
};



