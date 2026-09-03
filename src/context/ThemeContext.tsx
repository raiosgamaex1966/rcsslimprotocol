import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeMode = 'claro' | 'sistema' | 'escuro';

interface ThemeContextValue {
  theme: ThemeMode;
  resolved: 'light' | 'dark';
  setTheme: (t: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'minhacaneta_theme';

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'claro' || saved === 'escuro' || saved === 'sistema' ? saved : 'sistema';
  });
  const [resolved, setResolved] = useState<'light' | 'dark'>(() =>
    theme === 'sistema' ? (systemPrefersDark() ? 'dark' : 'light') : theme === 'escuro' ? 'dark' : 'light',
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const compute = () => {
      const r = theme === 'sistema' ? (mq.matches ? 'dark' : 'light') : theme === 'escuro' ? 'dark' : 'light';
      setResolved(r);
      document.documentElement.classList.toggle('dark', r === 'dark');
      document.documentElement.style.colorScheme = r;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', r === 'dark' ? '#020617' : '#f8fafc');
    };
    compute();
    mq.addEventListener('change', compute);
    return () => mq.removeEventListener('change', compute);
  }, [theme]);

  const setTheme = (t: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
  };

  return <ThemeContext.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme deve ser usado dentro de <ThemeProvider>');
  return ctx;
}
