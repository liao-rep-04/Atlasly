import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import * as api from '../lib/api';
import { testStart, testPass, testFail } from '../test/testUtils';

// Mock the API
vi.mock('../lib/api');

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

global.localStorage = localStorageMock;

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('provides auth context', () => {
    testStart('AuthContext - provides context');

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);

    testPass('AuthContext - provides context', 'Context initialized correctly');
  });

  it('throws error when used outside provider', () => {
    testStart('AuthContext - throws without provider');

    try {
      renderHook(() => useAuth());
      testFail('AuthContext - throws without provider', new Error('Should have thrown'));
    } catch (error) {
      expect(error.message).toContain('useAuth must be used within an AuthProvider');
      testPass('AuthContext - throws without provider', 'Error thrown as expected');
    }
  });

  it('loads user from localStorage on mount', async () => {
    testStart('AuthContext - loads from localStorage');

    const mockUser = { id: '1', username: 'testuser', email: 'test@example.com' };
    localStorage.setItem('token', 'mock-token');
    localStorage.setItem('user', JSON.stringify(mockUser));

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);

    testPass('AuthContext - loads from localStorage', 'User loaded successfully');
  });

  it('handles login successfully', async () => {
    testStart('AuthContext - login success');

    const mockUser = { id: '1', username: 'testuser', email: 'test@example.com' };
    const mockResponse = { data: { token: 'mock-token', user: mockUser } };

    api.login.mockResolvedValue(mockResponse);

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('testuser', 'password');
    });

    expect(loginResult.success).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(localStorage.getItem('token')).toBe('mock-token');
    expect(JSON.parse(localStorage.getItem('user'))).toEqual(mockUser);

    testPass('AuthContext - login success', 'User logged in and stored');
  });

  it('handles login failure', async () => {
    testStart('AuthContext - login failure');

    api.login.mockRejectedValue({
      response: { data: { error: 'Invalid credentials' } },
    });

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('testuser', 'wrongpassword');
    });

    expect(loginResult.success).toBe(false);
    expect(loginResult.error).toBe('Invalid credentials');
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);

    testPass('AuthContext - login failure', 'Error handled correctly');
  });

  it('handles registration successfully', async () => {
    testStart('AuthContext - registration success');

    const mockUser = { id: '1', username: 'newuser', email: 'new@example.com' };
    const mockResponse = { data: { token: 'mock-token', user: mockUser } };

    api.register.mockResolvedValue(mockResponse);

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let registerResult;
    await act(async () => {
      registerResult = await result.current.register({
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
      });
    });

    expect(registerResult.success).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);

    testPass('AuthContext - registration success', 'User registered and logged in');
  });

  it('handles logout', async () => {
    testStart('AuthContext - logout');

    const mockUser = { id: '1', username: 'testuser', email: 'test@example.com' };
    localStorage.setItem('token', 'mock-token');
    localStorage.setItem('user', JSON.stringify(mockUser));

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();

    testPass('AuthContext - logout', 'User logged out and storage cleared');
  });
});
