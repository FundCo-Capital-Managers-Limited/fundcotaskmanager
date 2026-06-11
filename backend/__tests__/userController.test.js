process.env.USER_JWT_SECRET = process.env.USER_JWT_SECRET || 'test-user-secret';
process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'test-admin-secret';
process.env.INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN || 'test-internal-token';

const mockUserModel = {
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
};

const mockBcrypt = {
  compare: jest.fn(),
  hash: jest.fn(),
};

const mockAuthSession = {
  clearRefreshCookie: jest.fn(),
  issueUserSession: jest.fn(),
  revokeRefreshFamilyForUser: jest.fn(),
  revokeRefreshTokenFromRequest: jest.fn(),
  rotateUserRefreshSession: jest.fn(),
};

jest.mock('../models/userModel.js', () => ({
  __esModule: true,
  default: mockUserModel,
}));

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: mockBcrypt,
}));

jest.mock('../utils/authSession.js', () => mockAuthSession);

const {
  registerUser,
  loginUser,
  refreshUserSession,
  logoutUser,
} = require('../controllers/userController.js');

const createResponse = () => {
  const response = {
    headers: {},
    status: jest.fn(),
    json: jest.fn(),
    set: jest.fn(),
  };

  response.status.mockImplementation((statusCode) => {
    response.statusCode = statusCode;
    return response;
  });

  response.json.mockImplementation((payload) => {
    response.body = payload;
    return response;
  });

  response.set.mockImplementation((key, value) => {
    response.headers[key] = value;
    return response;
  });

  return response;
};

describe('user controller', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('keeps self-registration disabled', async () => {
    const response = createResponse();

    await registerUser({ body: {} }, response);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.body).toEqual({
      success: false,
      message: 'Self-registration is currently disabled. Please contact your Administrator to have your account created.',
    });
  });

  it('requires both email and password for login', async () => {
    const response = createResponse();

    await loginUser({ body: { email: 'ada@fundco.ai' } }, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.body).toEqual({ success: false, message: 'Email and password required' });
  });

  it('rejects missing or inactive accounts during login', async () => {
    mockUserModel.findOne.mockResolvedValue(null);

    const response = createResponse();

    await loginUser(
      { body: { email: 'ada@fundco.ai', password: 'secret-123' } },
      response,
    );

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Invalid credentials or inactive account',
    });
  });

  it('rejects incorrect passwords', async () => {
    mockUserModel.findOne.mockResolvedValue({
      _id: 'user-1',
      isActive: true,
      password: 'hashed-password',
    });
    mockBcrypt.compare.mockResolvedValue(false);

    const response = createResponse();

    await loginUser(
      { body: { email: 'ada@fundco.ai', password: 'wrong-password' } },
      response,
    );

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.body).toEqual({ success: false, message: 'Invalid credentials' });
  });

  it('issues a session and updates activity metadata on successful login', async () => {
    const mockUser = {
      _id: 'user-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      otherName: 'Byron',
      fullName: 'Ada Lovelace Byron',
      position: 'Analyst',
      unitSector: 'Operations',
      email: 'ada@fundco.ai',
      role: 'standard',
      isActive: true,
      password: 'hashed-password',
      activityLogs: [],
      save: jest.fn().mockResolvedValue(true),
    };

    mockUserModel.findOne.mockResolvedValue(mockUser);
    mockBcrypt.compare.mockResolvedValue(true);
    mockAuthSession.issueUserSession.mockResolvedValue({
      token: 'access-token',
      accessTokenExpiresInSeconds: 3600,
      refreshSessionExpiresAt: '2026-06-12T00:00:00.000Z',
      rememberMe: false,
    });

    const request = {
      body: { email: 'ada@fundco.ai', password: 'correct-password' },
      ip: '127.0.0.1',
    };
    const response = createResponse();

    await loginUser(request, response);

    expect(mockUser.save).toHaveBeenCalledTimes(1);
    expect(mockUser.lastLogin).toBeInstanceOf(Date);
    expect(mockUser.lastActive).toBeInstanceOf(Date);
    expect(mockUser.activityLogs).toEqual([
      { action: 'login', details: 'User logged in from IP 127.0.0.1' },
    ]);
    expect(mockAuthSession.issueUserSession).toHaveBeenCalledWith(expect.objectContaining({
      user: mockUser,
      req: request,
      res: response,
    }));
    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      token: 'access-token',
      accessTokenExpiresInSeconds: 3600,
      refreshSessionExpiresAt: '2026-06-12T00:00:00.000Z',
      user: {
        id: 'user-1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        otherName: 'Byron',
        fullName: 'Ada Lovelace Byron',
        position: 'Analyst',
        unitSector: 'Operations',
        email: 'ada@fundco.ai',
        role: 'standard',
      },
    }));
  });

  it('returns the rotated session payload on refresh', async () => {
    const session = {
      token: 'refreshed-token',
      accessTokenExpiresInSeconds: 3600,
      refreshSessionExpiresAt: '2026-06-12T00:00:00.000Z',
      rememberMe: true,
      user: { id: 'user-1', firstName: 'Ada' },
    };

    mockAuthSession.rotateUserRefreshSession.mockResolvedValue(session);

    const response = createResponse();

    await refreshUserSession({ headers: { cookie: 'fc_user_rt=token' } }, response);

    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      token: session.token,
      accessTokenExpiresInSeconds: session.accessTokenExpiresInSeconds,
      refreshSessionExpiresAt: session.refreshSessionExpiresAt,
      user: session.user,
    }));
  });

  it('clears the refresh cookie when refresh fails', async () => {
    mockAuthSession.rotateUserRefreshSession.mockRejectedValue(new Error('Refresh token missing'));

    const response = createResponse();

    await refreshUserSession({ headers: {} }, response);

    expect(mockAuthSession.clearRefreshCookie).toHaveBeenCalledWith(response);
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.body).toEqual({ success: false, message: 'Refresh token missing' });
  });

  it('always clears the cookie on logout', async () => {
    mockAuthSession.revokeRefreshTokenFromRequest.mockRejectedValue(new Error('storage failure'));

    const response = createResponse();

    await logoutUser({ headers: {} }, response);

    expect(mockAuthSession.revokeRefreshTokenFromRequest).toHaveBeenCalled();
    expect(mockAuthSession.clearRefreshCookie).toHaveBeenCalledWith(response);
    expect(response.body).toEqual({ success: true, message: 'Logged out' });
  });
});