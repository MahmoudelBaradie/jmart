/**
 * Hook into the i18n module's pub/sub so a component re-renders whenever the
 * language changes. Returns `{ locale, dir, t, setLocale }` for ergonomic use.
 *
 *   const { t, locale, setLocale } = useLocale();
 *   return <Text>{t('home.greeting')}</Text>;
 */
import { useSyncExternalStore, useCallback } from 'react';
import {
  getLocale, getDir, subscribe, setLocale as setLocaleInternal, t as tInternal,
  type Locale,
} from '@/lib/i18n';

export function useLocale() {
  const locale = useSyncExternalStore(subscribe, getLocale, getLocale);
  const dir = useSyncExternalStore(subscribe, getDir, getDir);

  // Bind `t` to the current locale so passing it around captures the latest.
  const t = useCallback(
    (key: Parameters<typeof tInternal>[0], fallback?: string) => tInternal(key, fallback),
    [locale],
  );

  const setLocale = useCallback((next: Locale) => setLocaleInternal(next), []);

  return { locale, dir, t, setLocale };
}
