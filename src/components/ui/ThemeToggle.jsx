import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  const isParchment = theme === 'parchment';

  return (
    <button
      onClick={toggleTheme}
      title={isParchment ? 'Switch to default theme' : 'Switch to parchment theme'}
      className={`p-2 rounded-lg hover:bg-ui-surface transition-colors ${className}`}
      aria-label="Toggle theme"
    >
      {isParchment ? (
        <Sun className="w-5 h-5 text-ui-accent-foreground" />
      ) : (
        <Moon className="w-5 h-5 text-ui-muted" />
      )}
    </button>
  );
};

export default ThemeToggle;
