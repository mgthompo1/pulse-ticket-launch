import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
type ThemePreset = 'default' | 'contrast' | 'warm' | 'cool';

interface ThemeContextType {
  theme: Theme;
  themePreset: ThemePreset;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setThemePreset: (preset: ThemePreset) => void;
  getThemeTokens: () => ThemeTokens;
}

interface ThemeTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    border: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
    };
    fontWeight: {
      normal: string;
      medium: string;
      semibold: string;
      bold: string;
    };
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

// Initialize theme from localStorage synchronously to prevent flash
const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  const savedTheme = localStorage.getItem('theme') as Theme;
  if (savedTheme) return savedTheme;
  // Check system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getInitialPreset = (): ThemePreset => {
  if (typeof window === 'undefined') return 'default';
  return (localStorage.getItem('themePreset') as ThemePreset) || 'default';
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [themePreset, setThemePresetState] = useState<ThemePreset>(getInitialPreset);

  useEffect(() => {
    // Apply theme to document
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    
    // Apply theme preset
    root.classList.remove('theme-default', 'theme-contrast', 'theme-warm', 'theme-cool');
    root.classList.add(`theme-${themePreset}`);
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
    localStorage.setItem('themePreset', themePreset);
  }, [theme, themePreset]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setThemePreset = (newPreset: ThemePreset) => {
    setThemePresetState(newPreset);
  };

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const getThemeTokens = (): ThemeTokens => {
    return {
      colors: {
        primary: 'hsl(var(--primary))',
        secondary: 'hsl(var(--secondary))',
        accent: 'hsl(var(--accent))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: 'hsl(var(--muted))',
        border: 'hsl(var(--border))',
      },
      spacing: {
        xs: '0.5rem',
        sm: '0.75rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
      },
      typography: {
        fontFamily: 'Plus Jakarta Sans, Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
        },
        fontWeight: {
          normal: '400',
          medium: '500',
          semibold: '600',
          bold: '700',
        },
      },
      shadows: {
        sm: 'var(--shadow-card)',
        md: 'var(--shadow-elegant)',
        lg: 'var(--shadow-glow)',
        xl: '0 25px 50px -12px hsl(0 0% 0% / 0.25)',
      },
      borderRadius: {
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
    };
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      themePreset, 
      toggleTheme, 
      setTheme, 
      setThemePreset,
      getThemeTokens 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}; 