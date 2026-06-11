import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import Task from '../models/taskModel.js';

describe('Task Model', () => {
    beforeAll(async () => {
        await mongoose.connect('mongodb://localhost/test', { useNewUrlParser: true, useUnifiedTopology: true });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    afterEach(async () => {
        await Task.deleteMany({});
    });

    it('should create a task with valid data', async () => {
        const taskData = {
            title: 'Test Task',
            description: 'Test Description',
            userId: 'user123',
            status: 'pending',
        };

        const task = new Task(taskData);
        const savedTask = await task.save();

        expect(savedTask._id).toBeDefined();
        expect(savedTask.title).toBe(taskData.title);
        expect(savedTask.description).toBe(taskData.description);
        expect(savedTask.userId).toBe(taskData.userId);
        expect(savedTask.status).toBe(taskData.status);
    });

    it('should not create a task without required fields', async () => {
        const task = new Task({});

        await expect(task.save()).rejects.toThrow();
    });

    it('should enforce status enum', async () => {
        const taskData = {
            title: 'Test Task',
            userId: 'user123',
            status: 'invalid',
        };

        const task = new Task(taskData);

        await expect(task.save()).rejects.toThrow();
    });
});