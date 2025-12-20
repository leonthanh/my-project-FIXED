import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * Theme Context - Quản lý Dark/Light mode
 */

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Load theme from localStorage
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  // Save theme to localStorage when changed
  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    
    // Apply to body
    document.body.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  // Theme colors
  const theme = {
    isDarkMode,
    toggleTheme,
    colors: isDarkMode ? {
      // Dark mode colors
      background: '#1a1a2e',
      surface: '#16213e',
      surfaceHover: '#1f2b47',
      primary: '#4a90d9',
      primaryLight: '#2d5a87',
      text: '#e8e8e8',
      textSecondary: '#a0a0a0',
      border: '#3d3d5c',
      success: '#4caf50',
      danger: '#f44336',
      warning: '#ff9800',
      input: '#0f3460',
      inputBorder: '#4a90d9',
      cardBg: '#1f2b47',
      headerBg: '#0f3460'
    } : {
      // Light mode colors
      background: '#f5f5f5',
      surface: '#ffffff',
      surfaceHover: '#f0f0f0',
      primary: '#0e276f',
      primaryLight: '#e3e8f4',
      text: '#333333',
      textSecondary: '#666666',
      border: '#dddddd',
      success: '#28a745',
      danger: '#dc3545',
      warning: '#ffc107',
      input: '#ffffff',
      inputBorder: '#cccccc',
      cardBg: '#ffffff',
      headerBg: '#0e276f'
    }
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
