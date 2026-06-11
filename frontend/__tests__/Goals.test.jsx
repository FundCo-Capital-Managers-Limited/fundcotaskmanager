import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import Goals from '../src/pages/Goals.jsx';

const mockNavigate = jest.fn();
const mockUseOutletContext = jest.fn();
const mockSocket = {
  on: jest.fn(),
  disconnect: jest.fn(),
};

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      response: {
        use: jest.fn(() => 1),
        eject: jest.fn(),
      },
    },
  },
}));

jest.mock('react-router-dom', () => ({
  useOutletContext: () => mockUseOutletContext(),
  useNavigate: () => mockNavigate,
}));

jest.mock('socket.io-client', () => ({
  __esModule: true,
  default: jest.fn(() => mockSocket),
  io: jest.fn(() => mockSocket),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
  Toaster: () => null,
}));

jest.mock('react-datepicker', () => ({
  __esModule: true,
  default: ({ selected, onChange }) => (
    <input
      data-testid="date-picker"
      value={selected ? 'selected' : ''}
      onChange={() => onChange?.(new Date())}
      readOnly
    />
  ),
}));

describe('Goals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'session-token');
  });

  it('loads and renders goals from the API', async () => {
    mockUseOutletContext.mockReturnValue({
      user: { id: 'user-1' },
      onLogout: jest.fn(),
    });

    axios.get
      .mockResolvedValueOnce({
        data: {
          goals: [
            {
              _id: 'goal-1',
              title: 'Close Q3 revenue gap',
              type: 'personal',
              timeframe: 'weekly',
              subGoals: [{ title: 'Review receivables', completed: false }],
              endDate: '2026-06-20T00:00:00.000Z',
              createdAt: '2026-06-10T00:00:00.000Z',
            },
          ],
        },
      })
      .mockResolvedValueOnce({ data: { tasks: [] } });

    render(<Goals />);

    expect(await screen.findByText('Close Q3 revenue gap')).toBeInTheDocument();
    expect(axios.get).toHaveBeenNthCalledWith(
      1,
      'http://localhost:5000/api/goals',
      expect.objectContaining({
        headers: { Authorization: 'Bearer session-token' },
        timeout: 15000,
      }),
    );
  });

  it('redirects to login when there is no stored session token', async () => {
    localStorage.removeItem('token');
    mockUseOutletContext.mockReturnValue({
      user: { id: 'user-1' },
      onLogout: jest.fn(),
    });

    render(<Goals />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
});