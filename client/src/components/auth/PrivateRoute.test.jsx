import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithRouter, testStart, testPass } from '../../test/testUtils';
import PrivateRoute from './PrivateRoute';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock useAuth hook
vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../contexts/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

describe('PrivateRoute Component', () => {
  it('shows loading spinner when loading', () => {
    testStart('PrivateRoute - loading state');

    const { useAuth } = require('../../contexts/AuthContext');
    useAuth.mockReturnValue({ isAuthenticated: false, loading: true });

    renderWithRouter(
      <PrivateRoute>
        <div>Protected Content</div>
      </PrivateRoute>
    );

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();

    testPass('PrivateRoute - loading state', 'Loading spinner displayed');
  });

  it('renders children when authenticated', () => {
    testStart('PrivateRoute - authenticated');

    const { useAuth } = require('../../contexts/AuthContext');
    useAuth.mockReturnValue({ isAuthenticated: true, loading: false });

    renderWithRouter(
      <PrivateRoute>
        <div>Protected Content</div>
      </PrivateRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();

    testPass('PrivateRoute - authenticated', 'Protected content rendered');
  });
});
