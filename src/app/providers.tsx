import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { Toaster, toast } from 'sonner';
import { onSessionExpired } from '@/lib/api';
import { queryClient } from './queryClient';

/** Clears cached data from the previous session as soon as it ends. */
function SessionExpiryHandler() {
  useEffect(
    () =>
      onSessionExpired(() => {
        queryClient.clear();
        toast.error('Your session has ended. Please sign in again.');
        // The auth gate sees the cleared token and redirects to /login.
      }),
    [],
  );
  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionExpiryHandler />
      {children}
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
