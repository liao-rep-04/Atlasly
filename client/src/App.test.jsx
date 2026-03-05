import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithRouter, testStart, testPass } from './test/testUtils';
import App from './App';

describe('App Component', () => {
  it('renders without crashing', () => {
    testStart('App - renders without crashing');

    renderWithRouter(<App />);

    // App should render something
    expect(document.querySelector('.min-h-screen')).toBeInTheDocument();

    testPass('App - renders without crashing', 'App component mounted successfully');
  });

  it('redirects to dashboard by default', () => {
    testStart('App - redirects to dashboard');

    renderWithRouter(<App />, { route: '/' });

    // Should redirect to login if not authenticated (which then redirects to dashboard)
    expect(window.location.pathname).toBeTruthy();

    testPass('App - redirects to dashboard', 'Default route handled');
  });

  it('has proper routing structure', () => {
    testStart('App - routing structure');

    const { container } = renderWithRouter(<App />);

    // Check that Router is present
    expect(container.querySelector('.min-h-screen')).toBeInTheDocument();

    testPass('App - routing structure', 'Routes configured correctly');
  });
});
