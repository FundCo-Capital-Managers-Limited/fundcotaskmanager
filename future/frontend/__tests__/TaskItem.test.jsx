import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import TaskItem from '../src/components/TaskItem.jsx';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    put: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const buildTask = (overrides = {}) => ({
  _id: 'task-1',
  title: 'Site survey',
  description: 'Visit the project location',
  priority: 'High',
  completed: false,
  submissionStatus: 'not_submitted',
  checklist: [{ text: 'Visit the site', completed: false }],
  createdAt: '2026-06-10T12:00:00.000Z',
  dueDate: '2026-06-12T12:00:00.000Z',
  ...overrides,
});

describe('TaskItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'session-token');
  });

  it('shows the checklist-required guard instead of completing a task with no checklist', async () => {
    const task = buildTask({ checklist: [] });

    const { container } = render(<TaskItem task={task} />);

    fireEvent.click(container.querySelector('button'));

    expect(await screen.findByText(/checklist required/i)).toBeInTheDocument();
    expect(axios.put).not.toHaveBeenCalled();
  });

  it('updates all checklist items when the completion toggle is used', async () => {
    const onRefresh = jest.fn();
    const task = buildTask({
      checklist: [
        { text: 'Visit the site', completed: false },
        { text: 'Capture readings', completed: false },
      ],
    });

    const { container } = render(<TaskItem task={task} onRefresh={onRefresh} />);

    fireEvent.click(container.querySelector('button'));

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        expect.stringContaining('/api/tasks/task-1/gp'),
        {
          checklist: [
            { text: 'Visit the site', completed: true },
            { text: 'Capture readings', completed: true },
          ],
        },
        { headers: { Authorization: 'Bearer session-token' } },
      );
    });
    expect(onRefresh).toHaveBeenCalled();
  });

  it('submits a completed task for approval from the action menu', async () => {
    const onRefresh = jest.fn();
    const task = buildTask({
      completed: true,
      checklist: [{ text: 'Visit the site', completed: true }],
    });

    render(<TaskItem task={task} onRefresh={onRefresh} />);

    fireEvent.click(screen.getAllByRole('button')[1]);
    fireEvent.click(screen.getByRole('button', { name: /submit for approval/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/tasks/task-1/submit'),
        {},
        { headers: { Authorization: 'Bearer session-token' } },
      );
    });
    expect(onRefresh).toHaveBeenCalled();
  });
});