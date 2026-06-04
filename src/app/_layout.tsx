import React from 'react';
import { Stack } from 'expo-router';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from '../redux/store';
import { ThemeProvider } from '../context/ThemeContext';
import { I18nProvider } from '../i18n/I18nContext';

export default function RootLayout() {
  return (
    <ReduxProvider store={store}>
      <ThemeProvider>
        <I18nProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
          </Stack>
        </I18nProvider>
      </ThemeProvider>
    </ReduxProvider>
  );
}
