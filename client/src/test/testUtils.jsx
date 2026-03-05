import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { logTestInfo } from './setup';

/**
 * Custom render function that wraps components with necessary providers
 * @param {React.Component} ui - Component to render
 * @param {Object} options - Render options
 * @returns {Object} - Render result with additional utilities
 */
export function renderWithRouter(ui, { route = '/', ...renderOptions } = {}) {
  window.history.pushState({}, 'Test page', route);

  const Wrapper = ({ children }) => {
    return <BrowserRouter>{children}</BrowserRouter>;
  };

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

/**
 * Wait for async operations with timeout
 * @param {Function} callback - Async function to wait for
 * @param {Object} options - Options including timeout
 */
export async function waitForAsync(callback, { timeout = 5000 } = {}) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await callback();
      if (result) return result;
    } catch (error) {
      // Continue waiting
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`Timeout waiting for async operation after ${timeout}ms`);
}

/**
 * Create mock API responses
 * @param {*} data - Data to return
 * @param {number} status - HTTP status code
 */
export function mockApiResponse(data, status = 200) {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {},
    config: {},
  };
}

/**
 * Create mock API error
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 */
export function mockApiError(message, status = 500) {
  const error = new Error(message);
  error.response = {
    data: { error: message },
    status,
    statusText: 'Error',
  };
  return error;
}

/**
 * Log test start
 */
export function testStart(testName) {
  logTestInfo(testName, 'start');
}

/**
 * Log test pass
 */
export function testPass(testName, details) {
  logTestInfo(testName, 'pass', details);
}

/**
 * Log test fail
 */
export function testFail(testName, error) {
  logTestInfo(testName, 'fail', error.message);
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
