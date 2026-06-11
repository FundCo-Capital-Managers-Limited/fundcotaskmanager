import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { server } from '../jest.setup.js';
import Dashboard from '../src/pages/Dashboard.jsx';
import '@testing-library/jest-dom';

describe('Dashboard Component', () => {
    beforeAll(() => server.listen());
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    it('renders tasks from API', async () => {
        server.use(
            rest.get('http://localhost:4000/api/tasks', (req, res, ctx) => {
                return res(ctx.json({
                    tasks: [
                        { _id: '1', title: 'Task 1', description: 'Desc 1', completed: 'No', priority: 'medium' },
                        { _id: '2', title: 'Task 2', description: 'Desc 2', completed: 'Yes', priority: 'high' },
                    ],
                }));
            })
        );

        render(<Dashboard />);
        await waitFor(() => {
            expect(screen.getByText('Task 1')).toBeInTheDocument();
            expect(screen.getByText('Task 2')).toBeInTheDocument();
        });
    });

    it('handles API error', async () => {
        server.use(
            rest.get('http://localhost:4000/api/tasks', (req, res, ctx) => {
                return res(ctx.status(500), ctx.json({ message: 'Server error' }));
            })
        );

        render(<Dashboard />);
        await waitFor(() => {
            expect(screen.getByText(/error/i)).toBeInTheDocument();
        });
    });
});