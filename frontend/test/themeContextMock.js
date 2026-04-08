const React = require('react');

const theme = {
  isDarkMode: false,
  toggleTheme: () => {},
  colors: {
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
    headerBg: '#0e276f',
  },
};

const ThemeContext = React.createContext(theme);

function ThemeProvider({ children }) {
  return React.createElement(React.Fragment, null, children);
}

function useTheme() {
  return theme;
}

module.exports = {
  __esModule: true,
  default: ThemeContext,
  ThemeProvider,
  useTheme,
};