import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { server } from '../jest.setup.js';
import TaskItem from '../src/components/TaskItem.jsx';
import '@testing-library/jest-dom';

jest.mock('../src/components/TaskModal.jsx', () => {
    return () => <div>Mocked TaskModal</div>;
});

describe('TaskItem Component', () => {
    beforeAll(() => server.listen());
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    const mockTask = {
        _id: '123',
        title: 'Test Task',
        description: 'Test Description',
        completed: 'No',
        priority: 'medium',
    };

    const mockOnEdit = jest.fn();
    const mockOnDelete = jest.fn();

    it('renders task details correctly', () => {
        render(<TaskItem task={mockTask} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

        expect(screen.getByText('Test Task')).toBeInTheDocument();
        expect(screen.getByText('Test Description')).toBeInTheDocument();
        expect(screen.getByText((content, element) => {
            return element.tagName.toLowerCase() === 'span' && content === 'medium';
        })).toBeInTheDocument();
    });

    it('calls onEdit when edit button is clicked', () => {
        render(<TaskItem task={mockTask} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

        const dropdownButton = screen.getByTestId('dropdown-button');
        fireEvent.click(dropdownButton);

        const editButton = screen.getByTestId('edit-button');
        fireEvent.click(editButton);

        expect(mockOnEdit).toHaveBeenCalledWith(mockTask);
    });

    it('calls onDelete when delete button is clicked', () => {
        render(<TaskItem task={mockTask} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

        const dropdownButton = screen.getByTestId('dropdown-button');
        fireEvent.click(dropdownButton);

        const deleteButton = screen.getByTestId('delete-button');
        fireEvent.click(deleteButton);

        expect(mockOnDelete).toHaveBeenCalledWith(mockTask._id);
    });

    it('renders completed task correctly', () => {
        const completedTask = {
            _id: '124',
            title: 'Completed Task',
            description: 'Done',
            completed: 'Yes',
            priority: 'high',
        };
        render(<TaskItem task={completedTask} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
        expect(screen.getByText((content, element) => {
            return element.tagName.toLowerCase() === 'span' && content === 'high';
        })).toBeInTheDocument();
        expect(screen.getByText('Completed Task')).toHaveClass('line-through');
    });
});