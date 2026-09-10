import { create } from 'zustand';
import { authApi } from '@/lib/api';
import type { AuthUser } from '@/types';

interface AuthState {
  user: AuthUser | null;
  status: 'loading' | 'ready';
  init: () => Promise<void>;
  setUser: (user: AuthUser) => void;
  clear: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: 'loading',

  /** On boot: session cookie or remember-me cookie -> auto login (UniLoginFormAfterShow). */
  init: async () => {
    try {
      const { user } = await authApi.me();
      set({ user, status: 'ready' });
    } catch {
      set({ user: null, status: 'ready' });
    }
  },

  setUser: (user) => set({ user }),
  clear: () => set({ user: null }),
}));
