// contexts/ThemeContext.js
import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        setIsDark(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDark;
      setIsDark(newTheme);
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const colors = {
    background: isDark ? '#121212' : '#fafafa',
    cardBg: isDark ? '#1e1e1e' : '#ffffff',
    text: isDark ? '#ffffff' : '#1f2937',
    textSecondary: isDark ? '#b0b0b0' : '#6b7280',
    border: isDark ? '#2a2a2a' : '#f5f5f5',
    primary: '#ff2b2b',
    danger: '#dc3545',
    success: '#28a745',
    headerBg: isDark ? '#1e1e1e' : '#ff2b2b',
  };

  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};