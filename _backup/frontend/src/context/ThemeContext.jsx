// src/context/ThemeContext.jsx
import React, { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

/*
  Strategy: apply/remove the Tailwind "dark" class on <html>
  AND inject CSS custom properties so inline-styled components
  (which can't use Tailwind dark: variants) also respond.
*/
const LIGHT_VARS = {
  '--bg-app':        '#f0f2f8',
  '--bg-surface':    '#ffffff',
  '--bg-subtle':     '#f8f9fc',
  '--bg-hover':      '#f0f2f8',
  '--border-color':  '#e5e7eb',
  '--text-primary':  '#111827',
  '--text-secondary':'#6b7280',
  '--text-muted':    '#9ca3af',
  '--brand-primary': '#312783',
  '--brand-light':   '#eef2ff',
  '--brand-accent':  '#36a9e1',
  '--navbar-bg':     '#312783',
  '--sidebar-bg':    '#ffffff',
  '--sidebar-border':'#e5e7eb',
  '--input-bg':      '#ffffff',
  '--input-border':  '#e5e7eb',
  '--shadow-color':  'rgba(0,0,0,0.06)',
};

const DARK_VARS = {
  '--bg-app':        '#0f1117',
  '--bg-surface':    '#1a1d24',
  '--bg-subtle':     '#13161d',
  '--bg-hover':      '#22262f',
  '--border-color':  '#2a2d35',
  '--text-primary':  '#f3f4f6',
  '--text-secondary':'#9ca3af',
  '--text-muted':    '#6b7280',
  '--brand-primary': '#4f46e5',
  '--brand-light':   '#1e1b4b',
  '--brand-accent':  '#38bdf8',
  '--navbar-bg':     '#1a1d24',
  '--sidebar-bg':    '#1a1d24',
  '--sidebar-border':'#2a2d35',
  '--input-bg':      '#22262f',
  '--input-border':  '#2a2d35',
  '--shadow-color':  'rgba(0,0,0,0.3)',
};

function applyVars(vars) {
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
}

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      applyVars(DARK_VARS);
    } else {
      root.classList.remove('dark');
      applyVars(LIGHT_VARS);
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((p) => (p === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};