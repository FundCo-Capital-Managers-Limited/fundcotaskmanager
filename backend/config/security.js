import jwt from 'jsonwebtoken';

const requireEnv = (name) => {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const NODE_ENV = String(process.env.NODE_ENV || 'development').trim().toLowerCase();
export const IS_PRODUCTION = NODE_ENV === 'production';

export const USER_JWT_SECRET = requireEnv('USER_JWT_SECRET');
export const ADMIN_JWT_SECRET = requireEnv('ADMIN_JWT_SECRET');
export const INTERNAL_API_TOKEN = requireEnv('INTERNAL_API_TOKEN');

export const ALLOWED_SOCKET_EMIT_EVENTS = new Set([
  'newTask',
  'updateTask',
  'deleteTask',
  'taskReviewed',
  'newReminder',
  'reminderUpdated',
  'reminderDeleted',
  'notification:new',
]);

export const assertFutureBackendSecurityEnv = () => {
  const required = [
    'PORT',
    'MONGO_URI',
    'USER_JWT_SECRET',
    'ADMIN_JWT_SECRET',
    'INTERNAL_API_TOKEN',
    'BASE_URL',
    'FRONTEND_URL',
  ];

  const missing = required.filter((key) => !String(process.env[key] || '').trim());
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const uniqueSecrets = new Set([USER_JWT_SECRET, ADMIN_JWT_SECRET, INTERNAL_API_TOKEN]);
  if (uniqueSecrets.size !== 3) {
    throw new Error('USER_JWT_SECRET, ADMIN_JWT_SECRET, and INTERNAL_API_TOKEN must all be different');
  }

  if (String(process.env.JWT_SECRET || '').trim()) {
    throw new Error('Legacy JWT_SECRET is no longer supported. Use USER_JWT_SECRET and ADMIN_JWT_SECRET.');
  }
};

export const verifyPlatformToken = (token) => {
  try {
    return {
      payload: jwt.verify(token, USER_JWT_SECRET),
      tokenType: 'user',
    };
  } catch (userError) {
    return {
      payload: jwt.verify(token, ADMIN_JWT_SECRET),
      tokenType: 'admin',
    };
  }
};



