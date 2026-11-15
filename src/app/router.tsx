import { createBrowserRouter, type RouteObject } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { AuthGate } from './AuthGate';
import { NotFoundPage } from './pages/NotFoundPage';
import { RouteErrorPage } from './pages/RouteErrorPage';

/** Loads a page's code only when the route is first visited. */
const page = <T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T): RouteObject['lazy'] =>
  async () => ({ Component: (await load())[name] as React.ComponentType });

export const routes: RouteObject[] = [
  {
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        element: <AuthGate />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, lazy: page(() => import('@/features/dashboard/pages/DashboardPage'), 'DashboardPage') },
              { path: 'products', lazy: page(() => import('@/features/products/pages/ProductsPage'), 'ProductsPage') },
              { path: 'categories', lazy: page(() => import('@/features/products/pages/CategoriesPage'), 'CategoriesPage') },
              { path: 'inventory', lazy: page(() => import('@/features/inventory/pages/InventoryPage'), 'InventoryPage') },
              { path: 'purchases', lazy: page(() => import('@/features/purchases/pages/PurchasesPage'), 'PurchasesPage') },
              { path: 'purchases/new', lazy: page(() => import('@/features/purchases/pages/NewPurchasePage'), 'NewPurchasePage') },
              { path: 'suppliers', lazy: page(() => import('@/features/suppliers/pages/SuppliersPage'), 'SuppliersPage') },
              { path: 'sales', lazy: page(() => import('@/features/sales/pages/SalesPage'), 'SalesPage') },
              { path: 'sales/:id', lazy: page(() => import('@/features/sales/pages/SaleDetailPage'), 'SaleDetailPage') },
              { path: 'mpesa', lazy: page(() => import('@/features/payments/pages/MpesaPage'), 'MpesaPage') },
              { path: 'reports', lazy: page(() => import('@/features/reports/pages/ReportsPage'), 'ReportsPage') },
              { path: 'users', lazy: page(() => import('@/features/users/pages/UsersPage'), 'UsersPage') },
              { path: 'audit', lazy: page(() => import('@/features/audit/pages/AuditPage'), 'AuditPage') },
              { path: 'settings', lazy: page(() => import('@/features/settings/pages/SettingsPage'), 'SettingsPage') },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
