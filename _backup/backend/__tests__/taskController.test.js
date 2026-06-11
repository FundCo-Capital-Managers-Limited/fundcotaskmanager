import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../server.js';
import Task from '../models/taskModel.js';
import jwt from 'jsonwebtoken';

jest.mock('../models/taskModel.js');
jest.mock('jsonwebtoken');

describe('Task Controller', () => {
    beforeAll(async () => {
        await mongoose.connect('mongodb://localhost/test', { useNewUrlParser: true, useUnifiedTopology: true });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should create a new task', async () => {
        const mockTask = {
            _id: '123',
            title: 'Test Task',
            description: 'Test Description',
            userId: 'user123',
            status: 'pending',
        };

        Task.create.mockResolvedValue(mockTask);
        jwt.verify.mockReturnValue({ id: 'user123' });

        const res = await request(app)
            .post('/api/tasks')
            .set('Authorization', 'Bearer mockToken')
            .send({ title: 'Test Task', description: 'Test Description' });

        expect(res.status).toBe(201);
        expect(res.body).toEqual(mockTask);
        expect(Task.create).toHaveBeenCalledWith({
            title: 'Test Task',
            description: 'Test Description',
            userId: 'user123',
            status: 'pending',
        });
    });

    it('should get all tasks for a user', async () => {
        const mockTasks = [
            { _id: '123', title: 'Task 1', userId: 'user123', status: 'pending' },
            { _id: '124', title: 'Task 2', userId: 'user123', status: 'completed' },
        ];

        Task.find.mockResolvedValue(mockTasks);
        jwt.verify.mockReturnValue({ id: 'user123' });

        const res = await request(app)
            .get('/api/tasks')
            .set('Authorization', 'Bearer mockToken');

        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockTasks);
        expect(Task.find).toHaveBeenCalledWith({ userId: 'user123' });
    });

    it('should update a task', async () => {
        const mockTask = {
            _id: '123',
            title: 'Updated Task',
            description: 'Updated Description',
            userId: 'user123',
            status: 'completed',
        };

        Task.findByIdAndUpdate.mockResolvedValue(mockTask);
        jwt.verify.mockReturnValue({ id: 'user123' });

        const res = await request(app)
            .put('/api/tasks/123')
            .set('Authorization', 'Bearer mockToken')
            .send({ title: 'Updated Task', description: 'Updated Description', status: 'completed' });

        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockTask);
        expect(Task.findByIdAndUpdate).toHaveBeenCalledWith('123', {
            title: 'Updated Task',
            description: 'Updated Description',
            status: 'completed',
        }, { new: true });
    });

    it('should delete a task', async () => {
        Task.findByIdAndDelete.mockResolvedValue({ _id: '123' });
        jwt.verify.mockReturnValue({ id: 'user123' });

        const res = await request(app)
            .delete('/api/tasks/123')
            .set('Authorization', 'Bearer mockToken');

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ message: 'Task deleted' });
        expect(Task.findByIdAndDelete).toHaveBeenCalledWith('123');
    });

    it('should return 401 for unauthorized access', async () => {
        jwt.verify.mockImplementation(() => {
            throw new Error('Invalid token');
        });

        const res = await request(app)
            .get('/api/tasks')
            .set('Authorization', 'Bearer invalidToken');

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ success: false, message: 'Authentication error' });
    });
});