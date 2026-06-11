import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../server.js';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
    beforeAll(async () => {
        await mongoose.connect('mongodb://localhost/test', { useNewUrlParser: true, useUnifiedTopology: true });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should allow access with valid token', async () => {
        jwt.verify.mockReturnValue({ id: 'user123' });

        const res = await request(app)
            .get('/api/tasks')
            .set('Authorization', 'Bearer mockToken');

        expect(res.status).not.toBe(401);
        expect(jwt.verify).toHaveBeenCalledWith('mockToken', process.env.JWT_SECRET);
    });

    it('should return 401 with invalid token', async () => {
        jwt.verify.mockImplementation(() => {
            throw new Error('Invalid token');
        });

        const res = await request(app)
            .get('/api/tasks')
            .set('Authorization', 'Bearer invalidToken');

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ success: false, message: 'Authentication error' });
    });

    it('should return 401 with missing token', async () => {
        const res = await request(app)
            .get('/api/tasks');

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ success: false, message: 'No token provided' });
    });
});