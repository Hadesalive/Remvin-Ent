import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getThemeColors } from '../lib/theme';

const THEME_STORAGE_KEY = '@app_theme_mode';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ReturnType<typeof getThemeColors>;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [currentSystemScheme, setCurrentSystemScheme] = useState(systemColorScheme);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme on mount
  useEffect(() => {
    loadSavedTheme();
  }, []);

  // Listen for system color scheme changes
  useEffect(() => {
    setCurrentSystemScheme(systemColorScheme);
  }, [systemColorScheme]);

  // Save theme whenever it changes
  useEffect(() => {
    if (!isLoading) {
      saveTheme(themeMode);
    }
  }, [themeMode, isLoading]);

  const loadSavedTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system')) {
        setThemeMode(savedTheme as ThemeMode);
      }
    } catch (error) {

    } finally {
      setIsLoading(false);
    }
  };

  const saveTheme = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {

    }
  };

  // Determine if dark mode is active
  const isDark = themeMode === 'system' 
    ? currentSystemScheme === 'dark' 
    : themeMode === 'dark';

  const colors = getThemeColors(isDark);

  const toggleTheme = () => {
    setThemeMode((current) => {
      if (current === 'system') return 'light';
      if (current === 'light') return 'dark';
      return 'system';
    });
  };

  const setThemeModeWithPersistence = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  const value: ThemeContextType = {
    themeMode,
    isDark,
    colors,
    setThemeMode: setThemeModeWithPersistence,
    toggleTheme,
  };

  // Show nothing while loading (prevents flash of wrong theme)
  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

