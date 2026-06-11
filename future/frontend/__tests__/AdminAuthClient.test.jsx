import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import axios from 'axios';
const adminAuthClient = require('./helpers/adminAuthClientLoader.cjs');

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

describe('admin auth client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    adminAuthClient.clearAdminSession();
  });

  it('refreshes the admin session and persists the returned user', async () => {
    axios.post.mockResolvedValue({
      data: {
        success: true,
        token: 'admin-token',
        user: { id: 'admin-1', role: 'super-admin' },
      },
    });
    const session = await adminAuthClient.refreshAdminAccessToken();

    expect(session.token).toBe('admin-token');
    expect(localStorage.getItem('adminToken')).toBe('admin-token');
    expect(adminAuthClient.readStoredAdminUser()).toEqual({ id: 'admin-1', role: 'super-admin' });
  });

  it('adds the admin bearer token to managed requests', async () => {
    adminAuthClient.storeAdminSession({ token: 'admin-token', user: { id: 'admin-2' } });

    const instance = {
      defaults: {},
      interceptors: {
        request: {
          use: jest.fn((handler) => {
            instance._requestHandler = handler;
            return 1;
          }),
        },
        response: {
          use: jest.fn(() => 1),
        },
      },
    };

    adminAuthClient.attachAdminAuthInterceptors(instance);
    const config = instance._requestHandler({ url: '/api/admin/users', headers: {} });

    expect(config.withCredentials).toBe(true);
    expect(config.headers.Authorization).toBe('Bearer admin-token');
  });
});
