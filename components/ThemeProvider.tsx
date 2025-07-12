import React, { createContext, useContext } from 'react';
import { Colors, ColorScheme } from '../constants/Colors';

interface ThemeContextType {
  isDarkMode: boolean;
  colors: ColorScheme;
  toggleTheme: () => Promise<void>;
  setTheme: (isDark: boolean) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = {
    isDarkMode: true,
    colors: Colors,
    toggleTheme: async () => {
      // Theme switching disabled
    },
    setTheme: async (isDark: boolean) => {
      // Theme switching disabled
    },
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}