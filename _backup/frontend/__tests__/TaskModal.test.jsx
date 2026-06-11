import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { server } from '../jest.setup.js';
import TaskModal from '../src/components/TaskModal.jsx';
import '@testing-library/jest-dom';

describe('TaskModal Component', () => {
    beforeAll(() => server.listen());
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    it('renders and submits task', async () => {
        const mockOnSave = jest.fn();
        render(<TaskModal isOpen={true} onSave={mockOnSave} onClose={() => { }} />);

        fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'New Task' } });
        fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New Desc' } });
        fireEvent.click(screen.getByText(/save/i));

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalled();
        });
    });
});