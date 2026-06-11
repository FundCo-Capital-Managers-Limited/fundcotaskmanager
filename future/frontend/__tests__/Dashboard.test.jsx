import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import Dashboard from '../src/pages/Dashboard.jsx';

const mockUseOutletContext = jest.fn();
const mockSocket = {
  on: jest.fn(),
  disconnect: jest.fn(),
};

jest.mock('react-router-dom', () => ({
  useOutletContext: () => mockUseOutletContext(),
}));

jest.mock('socket.io-client', () => ({
  __esModule: true,
  default: jest.fn(() => mockSocket),
}));

jest.mock('../src/components/TaskItem', () => ({
  __esModule: true,
  default: ({ task }) => <div>{task.title}</div>,
}));

jest.mock('../src/components/TaskModal', () => ({
  __esModule: true,
  default: () => null,
}));

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders tasks supplied by the outlet context', () => {
    mockUseOutletContext.mockReturnValue({
      user: { id: 'user-1' },
      tasks: [
        { _id: 'task-1', title: 'Site survey', description: 'Visit the project location' },
        { _id: 'task-2', title: 'Approve permits', description: 'Clear municipal paperwork' },
      ],
      tasksLoading: false,
      fetchTasks: jest.fn(),
      onLogout: jest.fn(),
    });

    render(<Dashboard />);

    expect(screen.getByText('Site survey')).toBeInTheDocument();
    expect(screen.getByText('Approve permits')).toBeInTheDocument();
  });

  it('shows the empty state when no tasks are available', () => {
    mockUseOutletContext.mockReturnValue({
      user: { id: 'user-1' },
      tasks: [],
      tasksLoading: false,
      fetchTasks: jest.fn(),
      onLogout: jest.fn(),
    });

    render(<Dashboard />);

    expect(screen.getByText('No tasks found')).toBeInTheDocument();
  });
});