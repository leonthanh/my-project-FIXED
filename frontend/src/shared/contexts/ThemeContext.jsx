import React, { createContext, useContext } from 'react';

const LIGHT_THEME = {
  isDarkMode: false,
};

const ThemeContext = createContext(LIGHT_THEME);

export const useTheme = () => {
  return useContext(ThemeContext);
};

export const ThemeProvider = ({ children }) => {
  return (
    <ThemeContext.Provider value={LIGHT_THEME}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
