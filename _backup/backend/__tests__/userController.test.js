import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../server.js';
import User from '../models/userModel.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

jest.mock('../models/userModel.js');
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');

describe('User Controller', () => {
    beforeAll(async () => {
        await mongoose.connect('mongodb://localhost/test', { useNewUrlParser: true, useUnifiedTopology: true });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should register a new user', async () => {
        const mockUser = {
            _id: 'user123',
            username: 'testuser',
            email: 'test@example.com',
        };

        User.create.mockResolvedValue(mockUser);
        bcrypt.hash.mockResolvedValue('hashedPassword');

        const res = await request(app)
            .post('/api/user/register')
            .send({ username: 'testuser', email: 'test@example.com', password: 'password123' });

        expect(res.status).toBe(201);
        expect(res.body).toEqual(mockUser);
        expect(User.create).toHaveBeenCalledWith({
            username: 'testuser',
            email: 'test@example.com',
            password: 'hashedPassword',
        });
    });

    it('should login a user', async () => {
        const mockUser = {
            _id: 'user123',
            username: 'testuser',
            email: 'test@example.com',
            password: 'hashedPassword',
        };

        User.findOne.mockResolvedValue(mockUser);
        bcrypt.compare.mockResolvedValue(true);
        jwt.sign.mockReturnValue('mockToken');

        const res = await request(app)
            .post('/api/user/login')
            .send({ email: 'test@example.com', password: 'password123' });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ token: 'mockToken' });
        expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
        expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
        expect(jwt.sign).toHaveBeenCalledWith({ id: 'user123' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    });

    it('should get user profile', async () => {
        const mockUser = {
            _id: 'user123',
            username: 'testuser',
            email: 'test@example.com',
        };

        User.findById.mockResolvedValue(mockUser);
        jwt.verify.mockReturnValue({ id: 'user123' });

        const res = await request(app)
            .get('/api/user/profile')
            .set('Authorization', 'Bearer mockToken');

        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockUser);
        expect(User.findById).toHaveBeenCalledWith('user123');
    });

    it('should return 401 for invalid login', async () => {
        User.findOne.mockResolvedValue(null);

        const res = await request(app)
            .post('/api/user/login')
            .send({ email: 'test@example.com', password: 'wrongpassword' });

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ success: false, message: 'Invalid credentials' });
    });
});