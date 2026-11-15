import {
  BarChart3, ClipboardList, LayoutDashboard, LogOut, Menu, Package, Receipt, ScrollText,
  Settings, Smartphone, Tags, Truck, Users, Warehouse, X,
} from 'lucide-react';
import { useState, type ComponentType } from 'react';
import { NavLink, Outlet } from 'react-router';
import { queryClient } from '@/app/queryClient';
import { useSession } from '@/app/AuthGate';
import { useAuthStore } from '@/app/store/auth';
import { useBusinessStore } from '@/app/store/business';
import { Button, cn, Select } from '@/components/ui';
import { logoutRequest } from '@/features/auth/api';

const NAV: { to: string; label: string; icon: ComponentType<{ className?: string }>; end?: boolean }[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/inventory', label: 'Inventory', icon: Warehouse },
  { to: '/purchases', label: 'Purchases', icon: ClipboardList },
  { to: '/suppliers', label: 'Suppliers', icon: Truck },
  { to: '/sales', label: 'Sales', icon: Receipt },
  { to: '/mpesa', label: 'M-Pesa', icon: Smartphone },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/audit', label: 'Audit log', icon: ScrollText },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppLayout() {
  const { me, business } = useSession();
  const [open, setOpen] = useState(false);
  const setBusiness = useBusinessStore((s) => s.setSelectedBusinessId);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clear = useAuthStore((s) => s.clear);

  async function signOut() {
    await logoutRequest(refreshToken);
    queryClient.clear();
    clear();
  }

  function switchBusiness(id: string) {
    queryClient.clear(); // another business's numbers must never linger on screen
    setBusiness(id);
  }

  const nav = (
    <nav aria-label="Main" className="flex flex-col gap-1 p-3">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium hover:bg-muted',
              isActive && 'bg-primary text-primary-foreground hover:bg-primary',
            )
          }
        >
          <Icon className="size-4" /> {label}
        </NavLink>
      ))}
    </nav>
  );

  if (business.role === 'shop_manager') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold">Admin access needed</h1>
        <p className="text-sm text-muted-foreground">
          Your role in {business.name} is shop manager. Use the shop app for sales and stock.
        </p>
        <Button onClick={() => void signOut()}>Sign out</Button>
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 overflow-y-auto border-r border-border lg:block">
        <div className="border-b border-border p-4 font-semibold">Stock &amp; POS</div>
        {nav}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-black/50" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 overflow-y-auto bg-background">
            <div className="flex items-center justify-between border-b border-border p-4 font-semibold">
              Stock &amp; POS
              <Button variant="ghost" className="min-h-9 px-2" onClick={() => setOpen(false)} aria-label="Close menu">
                <X />
              </Button>
            </div>
            {nav}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background px-4 py-2">
          <Button variant="ghost" className="px-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu />
          </Button>
          {me.businesses.length > 1 ? (
            <Select
              aria-label="Business"
              value={business.id}
              onChange={(e) => switchBusiness(e.target.value)}
              className="w-auto max-w-56 font-medium"
            >
              {me.businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          ) : (
            <span className="font-medium">{business.name}</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">{me.user.name}</span>
            <Button variant="outline" onClick={() => void signOut()}>
              <LogOut /> <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
