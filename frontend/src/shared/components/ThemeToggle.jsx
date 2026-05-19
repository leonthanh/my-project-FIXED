import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './ThemeToggle.css';

const ThemeGlyph = ({ isDarkMode }) => {
  const sharedProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
    focusable: 'false',
  };

  if (isDarkMode) {
    return (
      <svg {...sharedProps}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
    );
  }

  return (
    <svg {...sharedProps}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
};

const ThemeToggle = ({ style = {} }) => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className="themeToggle"
      onClick={toggleTheme}
      title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      style={{
        '--theme-toggle-bg': isDarkMode ? '#ffc107' : '#1a1a2e',
        '--theme-toggle-fg': isDarkMode ? '#1a1a2e' : '#ffc107',
        ...style
      }}
    >
      <span
        className="themeToggle__icon"
        aria-hidden="true"
      >
        <ThemeGlyph isDarkMode={isDarkMode} />
      </span>
      <span className="themeToggle__label">
        {isDarkMode ? 'Light' : 'Dark'}
      </span>
    </button>
  );
};

export default ThemeToggle;
