/**
 * Admin's instance of the shared API client, wired to the admin stores:
 * tokens from the auth store, X-Business-Id from the business switcher.
 */
import { createApiClient } from '@/lib/api-client';
import { useAuthStore } from '@/app/store/auth';
import { useBusinessStore } from '@/app/store/business';
import { env } from './env';

export const apiClient = createApiClient({
  baseURL: env.VITE_API_URL,
  session: {
    getAccessToken: () => useAuthStore.getState().accessToken,
    getRefreshToken: () => useAuthStore.getState().refreshToken,
    setTokens: (tokens) => useAuthStore.getState().setTokens(tokens),
    getBusinessId: () => useBusinessStore.getState().selectedBusinessId,
    clearSession: () => useAuthStore.getState().clear(),
  },
});

export const api = apiClient.http;
export const onSessionExpired = apiClient.onSessionExpired;
