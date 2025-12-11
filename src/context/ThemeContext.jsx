import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

const THEMES = ['dark', 'light', 'parchment'];
const THEME_STORAGE_KEY = 'bigdeck-theme';
const LEGACY_STORAGE_KEY = 'theme';

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      let saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (!saved) {
        saved = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (saved) {
          localStorage.setItem(THEME_STORAGE_KEY, saved);
        }
      }
      if (saved && THEMES.includes(saved)) return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (e) {
      return 'dark';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    
    THEMES.forEach(t => {
      root.classList.remove(`theme-${t}`);
    });
    root.classList.remove('dark');
    
    root.classList.add(`theme-${theme}`);
    
    if (theme === 'dark') {
      root.classList.add('dark');
    }
    
    try { 
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      localStorage.setItem(LEGACY_STORAGE_KEY, theme);
    } catch (e) {}
  }, [theme]);

  const toggle = () => {
    setTheme(prev => {
      const currentIndex = THEMES.indexOf(prev);
      return THEMES[(currentIndex + 1) % THEMES.length];
    });
  };

  const setSpecificTheme = (newTheme) => {
    if (THEMES.includes(newTheme)) {
      setTheme(newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme: setSpecificTheme, 
      toggle,
      themes: THEMES 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
