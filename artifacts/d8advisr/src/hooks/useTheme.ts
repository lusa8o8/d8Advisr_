import { useEffect } from 'react';

export type ThemeValue = 'light' | 'dark' | 'system';

export const THEME_KEY = 'd8advisr_theme';

export function applyTheme(theme: ThemeValue) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldBeDark = theme === 'dark' || (theme === 'system' && prefersDark);
  root.classList.toggle('dark', shouldBeDark);
}

export function useTheme() {
  useEffect(() => {
    const saved = (localStorage.getItem(THEME_KEY) ?? 'system') as ThemeValue;
    applyTheme(saved);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => {
      const current = (localStorage.getItem(THEME_KEY) ?? 'system') as ThemeValue;
      if (current === 'system') applyTheme('system');
    };
    mq.addEventListener('change', onSystemChange);
    return () => mq.removeEventListener('change', onSystemChange);
  }, []);
}
