import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Appearance } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../redux/store';
import { updateProfile } from '../redux/userSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightColors, DarkColors, AppColors } from '../constants/designTokens';

type ThemeType = 'light' | 'dark';

interface ThemeContextProps {
  theme: ThemeType;
  toggleTheme: () => void;
  colors: AppColors;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemTheme = (Appearance.getColorScheme() as ThemeType) ?? 'dark';
  const userThemePref = useSelector((state: RootState) => state.user.themePreference) || 'system';

  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user);

  const activeTheme: ThemeType = userThemePref === 'system' ? systemTheme : (userThemePref as ThemeType);

  const toggleTheme = async () => {
    const newTheme = activeTheme === 'light' ? 'dark' : 'light';
    dispatch(updateProfile({ themePreference: newTheme }));
    
    // Also save to AsyncStorage if user is loaded
    if (user && user.isRegistered) {
      try {
        const fullProfile = { ...user, themePreference: newTheme, isRegistered: true };
        await AsyncStorage.setItem('@user_profile', JSON.stringify(fullProfile));
      } catch (e) {
        console.error('Failed to save theme toggle', e);
      }
    }
  };

  const colors: AppColors = activeTheme === 'light' ? LightColors : DarkColors;

  return (
    <ThemeContext.Provider value={{ theme: activeTheme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};
