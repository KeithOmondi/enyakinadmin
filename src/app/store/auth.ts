import { create } from 'zustand';
import type { Tokens } from '@/lib/api-client';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Auth tokens only. User profile and businesses come from GET /auth/me via
 * TanStack Query (Stage 2), not from this store.
 *
 * - accessToken: memory only. Lost on reload, then recovered with the refresh token.
 * - refreshToken: persisted in localStorage so a reload doesn't log the cashier out.
 *   (See the Stage 1 assumptions: move to an httpOnly cookie if the backend sets one.)
 */
interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  setTokens: (tokens: Tokens) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      setTokens: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),
      clear: () => set({ accessToken: null, refreshToken: null }),
    }),
    {
      name: 'pos.auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ refreshToken: s.refreshToken }),
      version: 1,
    },
  ),
);
