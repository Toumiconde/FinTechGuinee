import { Tabs } from 'expo-router';
import { Provider as ReduxProvider } from 'react-redux';
import { ThemeProvider } from '../context/ThemeContext';
import { I18nProvider } from '../i18n/I18nContext';
import { store } from '../redux/store';

export default function RootLayout() {
  return (
    <ReduxProvider store={store}>
      <ThemeProvider>
        <I18nProvider>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarStyle: { display: 'none' },
            }}
          />
        </I18nProvider>
      </ThemeProvider>
    </ReduxProvider>
  );
}
