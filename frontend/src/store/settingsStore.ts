import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  language: 'en' | 'ar';
  direction: 'ltr' | 'rtl';
  theme: 'light' | 'dark';
  setLanguage: (lang: 'en' | 'ar') => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      language: 'en',
      direction: 'ltr',
      theme: 'light',
      setLanguage: (lang) => {
        const direction = lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.dir = direction;
        document.documentElement.lang = lang;
        set({ language: lang, direction });
      },
      setTheme: (theme) => {
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        set({ theme });
      },
      toggleTheme: () => {
        const { theme } = get();
        const newTheme = theme === 'light' ? 'dark' : 'light';
        if (newTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        set({ theme: newTheme });
      },
    }),
    {
      name: 'settings-storage',
    }
  )
);
