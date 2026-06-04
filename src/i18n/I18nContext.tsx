import React, { createContext, useContext, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { translations, TranslationKey } from './translations';

interface I18nContextType {
  t: (key: TranslationKey) => string;
  language: string;
  monthName: (monthIndex: number, short?: boolean) => string;
  monthLocale: () => string;
}

const I18nContext = createContext<I18nContextType>({
  t: (key) => key,
  language: 'fr',
  monthName: () => '',
  monthLocale: () => 'fr-GN',
});

const monthKeys: TranslationKey[] = [
  'month_january', 'month_february', 'month_march', 'month_april',
  'month_may', 'month_june', 'month_july', 'month_august',
  'month_september', 'month_october', 'month_november', 'month_december',
];

const monthShortKeys: TranslationKey[] = [
  'month_jan', 'month_feb', 'month_mar', 'month_apr',
  'month_may_short', 'month_jun', 'month_jul', 'month_aug',
  'month_sep', 'month_oct', 'month_nov', 'month_dec',
];

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const language = useSelector((state: RootState) => state.user.language || 'fr');

  const lang = (language === 'en' ? 'en' : 'fr') as keyof typeof translations;
  const dict = translations[lang];

  const t = useCallback((key: TranslationKey): string => {
    return (dict as any)[key] ?? key;
  }, [dict]);

  const monthName = useCallback((monthIndex: number, short: boolean = false): string => {
    const keys = short ? monthShortKeys : monthKeys;
    const key = keys[monthIndex];
    return key ? (dict as any)[key] : '';
  }, [dict]);

  const monthLocale = useCallback((): string => {
    return language === 'en' ? 'en-US' : 'fr-GN';
  }, [language]);

  return (
    <I18nContext.Provider value={{ t, language, monthName, monthLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
