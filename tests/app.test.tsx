import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { AxiosAdapter, AxiosResponse } from 'axios';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/app/router';
import { useAuthStore } from '@/app/store/auth';
import { useBusinessStore } from '@/app/store/business';
import { apiClient } from '@/lib/api';

const meFor = (role: string) => ({
  user: { id: 'u1', email: 'a@b.c', name: 'Test User', isSuperAdmin: false },
  businesses: [{ id: 'b1', code: 'go-fish', name: 'Go-fish', role }],
  timezone: 'Africa/Nairobi',
});
const product = {
  id: 'p1', sku: 'T1', barcode: null, name: 'Tilapia', categoryId: null, categoryName: 'Fish', parentCategoryId: null, parentCategoryName: null, unit: 'pcs',
  allowsFraction: false, priceCents: 35000, costCents: 20000, reorderLevel: 5, active: true, quantity: 2, lowStock: true,
};
const report = {
  from: '', to: '', salesCount: 2, voidedCount: 0, revenueCents: 70000, discountCents: 0, cogsCents: 40000,
  grossProfitCents: 30000, averageSaleCents: 35000, byDay: [{ date: '2026-11-14', salesCount: 2, revenueCents: 70000, profitCents: 30000 }],
  byPayment: [], topProducts: [],
};

function mockApi(role = 'admin') {
  const data: Record<string, unknown> = {
    '/auth/me': meFor(role),
    '/products': { items: [product], total: 1, page: 1, pageSize: 20 },
    '/categories': { items: [{ id: 'c1', name: 'Fish', active: true, productCount: 1 }] },
    '/inventory/summary': { products: 1, units: 2, valueCents: 40000, lowStock: 1, outOfStock: 0 },
    '/reports/summary': report,
    '/suppliers': { items: [{ id: 's1', name: 'Lake Traders', phone: null, email: null, notes: null, active: true }] },
    '/payments/mpesa/requests': { items: [], total: 0, page: 1, pageSize: 25 },
    '/payments/mpesa/settings': {
      serverMode: 'daraja', environment: 'production', encryptionReady: true, sharedConsumerAvailable: false, source: 'dashboard',
      configured: true, enabled: true, transactionType: 'paybill', shortcode: '600111', partyB: '', passkeyHint: '••••c919',
      consumerKeyHint: '••••90ab', hasConsumerSecret: true, updatedAt: '2026-11-22T09:00:00Z', updatedByName: 'Dennis Keith',
    },
    '/users': { items: [{ id: 'u1', email: 'a@b.c', name: 'Test User', role: 'admin', active: true }] },
  };
  const adapter: AxiosAdapter = (config) => {
    const body = data[config.url ?? ''];
    const res = { status: body ? 200 : 404, statusText: '', data: body ?? {}, headers: {}, config } as AxiosResponse;
    return res.status === 200 ? Promise.resolve(res) : Promise.reject(Object.assign(new Error('404'), { isAxiosError: true, response: res, config }));
  };
  apiClient.http.defaults.adapter = adapter;
}

function mount(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ accessToken: 'a', refreshToken: 'r' });
  useBusinessStore.setState({ selectedBusinessId: 'b1' });
  mockApi();
});
afterEach(cleanup);

describe('admin app', () => {
  it('sends signed-out visitors to the sign-in page', async () => {
    useAuthStore.setState({ accessToken: null, refreshToken: null });
    mount('/products');
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy();
  });

  it('renders the dashboard with sales and low-stock figures', async () => {
    mount('/');
    expect(await screen.findByText('Sales today')).toBeTruthy();
    expect((await screen.findAllByText(/KES\s?700\.00/)).length).toBeGreaterThan(0);
    expect(await screen.findByText('Low stock')).toBeTruthy();
  });

  it('lists products with their stock and a low-stock flag', async () => {
    mount('/products');
    // One card per product family; opening it lists the items.
    fireEvent.click(await screen.findByRole('button', { name: /Open Tilapia/ }));
    expect(await screen.findByText('Low')).toBeTruthy();
    expect(screen.getByText(/KES\s?350\.00/)).toBeTruthy();
  });

  it('shows the M-Pesa connection with secrets masked', async () => {
    mount('/mpesa');
    expect(await screen.findByText('Connection to Safaricom')).toBeTruthy();
    expect(screen.getByText('Set up here')).toBeTruthy();
    expect((screen.getByLabelText('Paybill number') as HTMLInputElement).value).toBe('600111');
    // Secrets are never filled in: only a hint of the last characters is shown.
    expect((screen.getByLabelText('Passkey') as HTMLInputElement).value).toBe('');
    expect(screen.getByText((t) => t.includes('Saved (••••c919)'))).toBeTruthy();
  });

  it.each([
    ['/categories', 'Fish'],
    ['/suppliers', 'Lake Traders'],
    ['/users', 'Test User'],
    ['/reports', 'Revenue by day'],
    ['/inventory', 'Stock levels'],
  ])('renders %s', async (path, text) => {
    mount(path);
    expect((await screen.findAllByText(text)).length).toBeGreaterThan(0);
  });

  it('keeps shop managers out of the admin panel', async () => {
    mockApi('shop_manager');
    mount('/');
    expect(await screen.findByText('Admin access needed')).toBeTruthy();
  });
});
