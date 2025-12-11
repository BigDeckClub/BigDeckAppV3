import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

function Dummy() {
  const { theme, toggle, setTheme } = useTheme();
  return (
    <div>
      <button onClick={toggle} data-theme={theme}>toggle</button>
      <button onClick={() => setTheme('dark')} data-testid="set-dark">set dark</button>
    </div>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    try { localStorage.clear(); } catch (e) {}
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.remove('theme-dark');
    document.documentElement.classList.remove('theme-light');
    document.documentElement.classList.remove('theme-parchment');
  });

  test('cycles through themes correctly', () => {
    localStorage.setItem('bigdeck-theme', 'dark');
    
    const { getByText } = render(
      <ThemeProvider>
        <Dummy />
      </ThemeProvider>
    );

    const btn = getByText('toggle');
    const root = document.documentElement;

    expect(root.classList.contains('theme-dark')).toBe(true);
    expect(root.classList.contains('dark')).toBe(true);

    fireEvent.click(btn);
    expect(root.classList.contains('theme-light')).toBe(true);
    expect(root.classList.contains('dark')).toBe(false);

    fireEvent.click(btn);
    expect(root.classList.contains('theme-parchment')).toBe(true);

    fireEvent.click(btn);
    expect(root.classList.contains('theme-dark')).toBe(true);
    expect(root.classList.contains('dark')).toBe(true);
  });

  test('persists theme to localStorage', () => {
    localStorage.setItem('bigdeck-theme', 'dark');
    
    const { getByText } = render(
      <ThemeProvider>
        <Dummy />
      </ThemeProvider>
    );

    const btn = getByText('toggle');
    fireEvent.click(btn);

    expect(localStorage.getItem('bigdeck-theme')).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  test('preserves backward compatibility with legacy storage key', () => {
    localStorage.setItem('theme', 'light');
    
    const { getByText } = render(
      <ThemeProvider>
        <Dummy />
      </ThemeProvider>
    );

    const btn = getByText('toggle');
    expect(btn.getAttribute('data-theme')).toBe('light');
  });
});
