process.env.USER_JWT_SECRET = process.env.USER_JWT_SECRET || 'test-user-secret';
process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'test-admin-secret';
process.env.INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN || 'test-internal-token';

const mockUserModel = {
  findById: jest.fn(),
  updateOne: jest.fn(),
};

const mockSecurity = {
  verifyPlatformToken: jest.fn(),
};

jest.mock('../models/userModel.js', () => ({
  __esModule: true,
  default: mockUserModel,
}));

jest.mock('../config/security.js', () => mockSecurity);

const authMiddleware = require('../middleware/auth.js').default;

const createResponse = () => {
  const response = {
    status: jest.fn(),
    json: jest.fn(),
  };

  response.status.mockImplementation((statusCode) => {
    response.statusCode = statusCode;
    return response;
  });

  response.json.mockImplementation((payload) => {
    response.body = payload;
    return response;
  });

  return response;
};

describe('auth middleware', () => {
  let consoleLogSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockUserModel.updateOne.mockResolvedValue({ acknowledged: true });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('rejects requests without a bearer token', async () => {
    const response = createResponse();

    await authMiddleware({ headers: {} }, response, jest.fn());

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.body).toEqual({ success: false, message: 'Not Authorized, token missing' });
  });

  it('rejects requests when the user cannot be found', async () => {
    mockSecurity.verifyPlatformToken.mockReturnValue({ payload: { id: 'user-1' } });
    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const response = createResponse();

    await authMiddleware(
      { headers: { authorization: 'Bearer token-1' } },
      response,
      jest.fn(),
    );

    expect(mockSecurity.verifyPlatformToken).toHaveBeenCalledWith('token-1');
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.body).toEqual({ success: false, message: 'User not found' });
  });

  it('rejects deactivated users', async () => {
    mockSecurity.verifyPlatformToken.mockReturnValue({ payload: { id: 'user-1' } });
    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'user-1', isActive: false }),
    });

    const response = createResponse();

    await authMiddleware(
      { headers: { authorization: 'Bearer token-1' } },
      response,
      jest.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.body).toEqual({ success: false, message: 'Account is deactivated' });
  });

  it('attaches the active user to the request and calls next', async () => {
    const next = jest.fn();
    const user = { _id: 'user-1', isActive: true, email: 'ada@fundco.ai' };

    mockSecurity.verifyPlatformToken.mockReturnValue({ payload: { id: 'user-1' }, tokenType: 'user' });
    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(user),
    });

    const request = {
      headers: { authorization: 'Bearer token-1' },
    };
    const response = createResponse();

    await authMiddleware(request, response, next);

    expect(request.user).toBe(user);
    expect(next).toHaveBeenCalledTimes(1);
    expect(response.status).not.toHaveBeenCalled();
  });

  it('returns an invalid-token response when verification fails', async () => {
    mockSecurity.verifyPlatformToken.mockImplementation(() => {
      throw new Error('bad token');
    });

    const response = createResponse();

    await authMiddleware(
      { headers: { authorization: 'Bearer bad-token' } },
      response,
      jest.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.body).toEqual({ success: false, message: 'Token invalid or expired' });
  });
});