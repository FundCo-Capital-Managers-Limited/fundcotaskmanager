import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import axios from 'axios';
import * as authClient from '../src/security/authClient.js';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    defaults: {},
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

describe('user auth client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    authClient.clearUserSession();
    axios.defaults = {};
    axios.interceptors.request.use.mockImplementation((handler) => {
      axios._requestHandler = handler;
      return 1;
    });
    axios.interceptors.response.use.mockImplementation((_, handler) => {
      axios._responseErrorHandler = handler;
      return 1;
    });
  });

  it('stores and reads the current user session', async () => {
    const session = { token: 'token-1', user: { id: 'user-1', firstName: 'Ada' } };

    authClient.storeUserSession(session);

    expect(authClient.getAccessToken()).toBe('token-1');
    expect(authClient.readStoredUser()).toEqual(session.user);
    expect(localStorage.getItem('userId')).toBe('user-1');
  });

  it('refreshes the access token and persists the returned session', async () => {
    axios.post.mockResolvedValue({
      data: {
        success: true,
        token: 'token-2',
        user: { id: 'user-2', firstName: 'Bola' },
      },
    });
    const session = await authClient.refreshUserAccessToken();

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:4001/api/user/refresh',
      {},
      expect.objectContaining({
        withCredentials: true,
        skipAuthRefresh: true,
        skipAuthHeader: true,
      }),
    );
    expect(session.token).toBe('token-2');
    expect(localStorage.getItem('token')).toBe('token-2');
    expect(authClient.readStoredUser()).toEqual({ id: 'user-2', firstName: 'Bola' });
  });

  it('skips refresh when a usable session is already stored', async () => {
    authClient.storeUserSession({ token: 'cached-token', user: { id: 'user-3' } });

    const ok = await authClient.bootstrapUserSession();

    expect(ok).toBe(true);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('clears the stored session after logout even when the API call fails', async () => {
    axios.post.mockRejectedValue(new Error('network down'));
    authClient.storeUserSession({ token: 'cached-token', user: { id: 'user-3' } });

    await authClient.logoutUserSession();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('currentUser')).toBeNull();
  });

  it('attaches the bearer token to managed API requests', async () => {
    authClient.storeUserSession({ token: 'header-token', user: { id: 'user-4' } });

    authClient.installUserAxiosAuth();
    const config = axios._requestHandler({ url: '/api/tasks', headers: {} });

    expect(config.withCredentials).toBe(true);
    expect(config.headers.Authorization).toBe('Bearer header-token');
  });
});
