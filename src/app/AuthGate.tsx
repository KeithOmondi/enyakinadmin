import { createContext, useContext, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { Button, ErrorNotice, Spinner } from '@/components/ui';
import { useMe } from '@/features/auth/api';
import { SelectBusinessPage } from '@/features/auth/pages/SelectBusinessPage';
import { errorMessage } from '@/lib/format';
import type { Business, Me } from '@/lib/types';
import { useAuthStore } from './store/auth';
import { useBusinessStore } from './store/business';

interface Session {
  me: Me;
  business: Business;
}
const SessionContext = createContext<Session | null>(null);

/** The signed-in user and the business they are working in. Only valid below AuthGate. */
export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useSession must be used inside AuthGate');
  return s;
}

/**
 * Sends signed-out visitors to /login, loads the profile, and makes sure a valid
 * business is selected. A dead session clears the auth store (see providers.tsx),
 * which re-renders this and redirects.
 */
export function AuthGate() {
  const location = useLocation();
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clear = useAuthStore((s) => s.clear);
  const { selectedBusinessId, setSelectedBusinessId } = useBusinessStore();
  const me = useMe(refreshToken !== null);
  const businesses = me.data?.businesses;
  const business = businesses?.find((b) => b.id === selectedBusinessId);

  useEffect(() => {
    if (businesses && !business && businesses.length === 1) setSelectedBusinessId(businesses[0]!.id);
  }, [businesses, business, setSelectedBusinessId]);

  if (!refreshToken) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (me.isPending) return <Spinner label="Loading your account" />;
  if (me.isError) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
        <ErrorNotice message={errorMessage(me.error)} onRetry={() => void me.refetch()} />
        <Button variant="outline" onClick={clear}>
          Sign out
        </Button>
      </main>
    );
  }
  if (!business) return <SelectBusinessPage businesses={me.data.businesses} />;

  return (
    <SessionContext.Provider value={{ me: me.data, business }}>
      <Outlet />
    </SessionContext.Provider>
  );
}
