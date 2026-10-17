import { create } from 'zustand';

export type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem('tradevault-theme');
  if (saved === 'dark' || saved === 'light') {
    return saved;
  }
  // Default to dark theme as in TradeVault design
  return 'dark';
};

const applyThemeToDocument = (theme: Theme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
};

// Initialize immediately upon script evaluation to prevent flash of wrong theme
const initialTheme = getInitialTheme();
applyThemeToDocument(initialTheme);

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initialTheme,
  toggleTheme: () => {
    set((state) => {
      const nextTheme: Theme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('tradevault-theme', nextTheme);
      applyThemeToDocument(nextTheme);
      return { theme: nextTheme };
    });
  },
  setTheme: (theme: Theme) => {
    localStorage.setItem('tradevault-theme', theme);
    applyThemeToDocument(theme);
    set({ theme });
  },
}));
