import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * ThemeToggle - Nút chuyển đổi Dark/Light mode
 */

const ThemeToggle = ({ style = {} }) => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      title={isDarkMode ? 'Chuyển sang Light Mode' : 'Chuyển sang Dark Mode'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        backgroundColor: isDarkMode ? '#ffc107' : '#1a1a2e',
        color: isDarkMode ? '#1a1a2e' : '#ffc107',
        border: 'none',
        borderRadius: '20px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        transition: 'all 0.3s ease',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        ...style
      }}
    >
      <span style={{ fontSize: '18px' }}>
        {isDarkMode ? '☀️' : '🌙'}
      </span>
      <span>
        {isDarkMode ? 'Light' : 'Dark'}
      </span>
    </button>
  );
};

export default ThemeToggle;
