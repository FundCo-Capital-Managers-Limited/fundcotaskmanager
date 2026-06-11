import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { server } from '../jest.setup.js';
import Goals from '../src/pages/Goals.jsx';
import '@testing-library/jest-dom';

describe('Goals Component', () => {
    beforeAll(() => server.listen());
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    it('renders goals from API', async () => {
        server.use(
            rest.get('http://localhost:4000/api/goals', (req, res, ctx) => {
                return res(ctx.json({
                    goals: [
                        { _id: '1', title: 'Goal 1', description: 'Desc 1' },
                        { _id: '2', title: 'Goal 2', description: 'Desc 2' },
                    ],
                }));
            })
        );

        render(<Goals />);
        await waitFor(() => {
            expect(screen.getByText('Goal 1')).toBeInTheDocument();
            expect(screen.getByText('Goal 2')).toBeInTheDocument();
        });
    });

    it('handles API error', async () => {
        server.use(
            rest.get('http://localhost:4000/api/goals', (req, res, ctx) => {
                return res(ctx.status(500), ctx.json({ message: 'Server error' }));
            })
        );

        render(<Goals />);
        await waitFor(() => {
            expect(screen.getByText(/error/i)).toBeInTheDocument();
        });
    });
});