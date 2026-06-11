import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'fundco-admin-theme';

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEY) || 'system');

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const resolvedTheme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      document.documentElement.setAttribute('data-theme', resolvedTheme);
      document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
    };

    applyTheme();
    media.addEventListener('change', applyTheme);

    return () => media.removeEventListener('change', applyTheme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme:
        theme === 'system'
          ? document.documentElement.getAttribute('data-theme') || 'light'
          : theme,
      setTheme: (nextTheme) => {
        localStorage.setItem(STORAGE_KEY, nextTheme);
        setTheme(nextTheme);
      },
      toggleTheme: () => {
        const currentResolved =
          document.documentElement.getAttribute('data-theme') || 'light';
        const nextTheme = currentResolved === 'dark' ? 'light' : 'dark';
        localStorage.setItem(STORAGE_KEY, nextTheme);
        setTheme(nextTheme);
      },
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
