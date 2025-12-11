import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggle } = useTheme();

  return (
    <button
      aria-pressed={theme === 'dark'}
      onClick={toggle}
      className={`p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 ${className}`}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span aria-hidden>{theme === 'dark' ? '🌙' : '☀️'}</span>
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
