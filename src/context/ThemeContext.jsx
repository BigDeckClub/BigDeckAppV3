import React, { createContext, useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('bda-theme') || 'default';
    } catch (err) {
      return 'default';
    }
  });

  useEffect(() => {
    const root = document.documentElement || document.body;
    // remove any previous theme- classes we control
    root.classList.remove('theme-parchment');
    root.classList.remove('theme-default');
    if (theme && theme !== 'default') {
      root.classList.add(`theme-${theme}`);
    }
    try {
      localStorage.setItem('bda-theme', theme);
    } catch (err) {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'parchment' ? 'default' : 'parchment'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
