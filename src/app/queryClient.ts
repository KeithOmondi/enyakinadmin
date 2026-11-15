import { QueryClient } from '@tanstack/react-query';
import { isApiError } from '@/lib/api-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Retry only network failures and 5xx; a 4xx won't succeed on retry.
      retry: (failureCount, error) => {
        if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: true,
    },
    mutations: {
      // Never auto-retry writes. Checkout safety relies on its idempotency key,
      // not on the client blindly resending.
      retry: false,
    },
  },
});
