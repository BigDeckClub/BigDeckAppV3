import React from 'react';
import { Sun, Moon, Scroll } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const themeConfig = {
  dark: { icon: Moon, label: 'Dark', next: 'Switch to light mode' },
  light: { icon: Sun, label: 'Light', next: 'Switch to parchment mode' },
  parchment: { icon: Scroll, label: 'Parchment', next: 'Switch to dark mode' }
};

export default function ThemeToggle({ className = '', showLabel = false }) {
  const { theme, toggle } = useTheme();
  const config = themeConfig[theme] || themeConfig.dark;
  const Icon = config.icon;

  return (
    <button
      onClick={toggle}
      className={`
        flex items-center gap-2 p-2 rounded-lg
        text-ui-muted hover:text-ui-primary
        hover:bg-ui-card
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-ui-primary/30
        ${className}
      `}
      title={config.next}
      aria-label={config.next}
    >
      <Icon className="w-5 h-5" />
      {showLabel && (
        <span className="text-sm font-medium">{config.label}</span>
      )}
    </button>
  );
}

export function ThemeSelector({ className = '' }) {
  const { theme, setTheme, themes } = useTheme();

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <label className="text-sm font-medium text-ui-heading">Theme</label>
      <div className="flex gap-2">
        {themes.map(t => {
          const config = themeConfig[t];
          const Icon = config.icon;
          const isActive = theme === t;
          
          return (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`
                flex items-center gap-2 px-4 py-3 rounded-lg
                border transition-all duration-200
                ${isActive 
                  ? 'bg-ui-primary text-ui-primary-foreground border-ui-primary' 
                  : 'bg-ui-card text-ui-muted border-ui-border hover:border-ui-primary hover:text-ui-heading'
                }
              `}
              aria-pressed={isActive}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium capitalize">{t}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
