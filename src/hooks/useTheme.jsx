import { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext({ dark: false, toggle: () => {} });

// Force light mode — dark theme removed per design spec
export function ThemeProvider({ children }) {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('hr-theme', 'light');
  }, []);

  return (
    <ThemeContext.Provider value={{ dark: false, toggle: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
