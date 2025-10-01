import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  roles?: string[];
  permissions: string[];
  navigation: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        console.log('setAuth called with:', { user, token });
        localStorage.setItem('auth_token', token);
        set({ user, token, isAuthenticated: true });
        console.log('Auth state updated');
      },
      logout: () => {
        localStorage.removeItem('auth_token');
        set({ user: null, token: null, isAuthenticated: false });
      },
      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;
        return user.permissions.includes('all') || user.permissions.includes(permission);
      },
      hasRole: (role) => {
        const { user } = get();
        if (!user) return false;
        return user.role === role || (user.roles?.includes(role) ?? false);
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
