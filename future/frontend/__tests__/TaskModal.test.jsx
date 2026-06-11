import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TaskModal from '../src/components/TaskModal.jsx';

const getDueDateInput = () => document.querySelector('input[name="dueDate"]');

const fillChecklistItem = () => {
  fireEvent.change(screen.getByPlaceholderText(/add checklist item/i), {
    target: { value: 'Break down the task' },
  });
  fireEvent.click(screen.getByRole('button', { name: /add/i }));
};

describe('TaskModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires at least one checklist item before save', async () => {
    const onSave = jest.fn();

    render(<TaskModal isOpen onClose={() => {}} onSave={onSave} />);

    fireEvent.change(screen.getByPlaceholderText(/what needs to be done/i), {
      target: { value: 'Prepare project update' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create task/i }));

    expect(await screen.findByText(/please add at least one checklist item/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('applies today as the minimum due date for new tasks', () => {
    const today = new Date().toISOString().split('T')[0];

    render(<TaskModal isOpen onClose={() => {}} onSave={() => {}} />);

    expect(getDueDateInput()).toHaveAttribute('min', today);
  });

  it('submits normalized task data and closes the modal', async () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    render(<TaskModal isOpen onClose={onClose} onSave={onSave} />);

    fireEvent.change(screen.getByPlaceholderText(/what needs to be done/i), {
      target: { value: 'Prepare project update' },
    });
    fireEvent.change(screen.getByPlaceholderText(/add more detail/i), {
      target: { value: 'Capture blocker summary for leadership.' },
    });
    fireEvent.change(getDueDateInput(), {
      target: { value: tomorrow },
    });
    fillChecklistItem();
    fireEvent.click(screen.getByRole('button', { name: /high/i }));
    fireEvent.click(screen.getByRole('button', { name: /create task/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
        _id: null,
        title: 'Prepare project update',
        description: 'Capture blocker summary for leadership.',
        priority: 'High',
        dueDate: tomorrow,
        checklist: [{ text: 'Break down the task', completed: false }],
      }));
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('hides the submit action for approved tasks', () => {
    render(
      <TaskModal
        isOpen
        onClose={() => {}}
        onSave={() => {}}
        taskToEdit={{
          _id: 'task-1',
          title: 'Locked task',
          submissionStatus: 'approved',
          checklist: [{ text: 'Done', completed: true }],
        }}
      />,
    );

    expect(screen.queryByRole('button', { name: /update task/i })).not.toBeInTheDocument();
  });
});