import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ProductForm } from '@/features/products/components/ProductForm';
import type { Category, Product } from '@/lib/types';

const product = {
  id: 'p1', sku: 'GF-000042', barcode: '2900000000428', name: 'Tilapia', categoryId: null, categoryName: null, parentCategoryId: null, parentCategoryName: null, unit: 'pcs',
  allowsFraction: false, priceCents: 15000, costCents: 9000, reorderLevel: 5, active: true, imageUrl: null, quantity: 10, lowStock: false,
} as Product;

const wrap = (p?: Product) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ProductForm {...(p ? { product: p } : {})} onDone={() => undefined} />
    </QueryClientProvider>,
  );

afterEach(cleanup);

describe('product form codes', () => {
  it('shows the SKU and barcode of an existing product as read-only', () => {
    wrap(product);
    const sku = screen.getByLabelText('SKU') as HTMLInputElement;
    const barcode = screen.getByLabelText('Barcode') as HTMLInputElement;
    expect(sku.value).toBe('GF-000042');
    expect(sku.readOnly).toBe(true);
    expect(barcode.value).toBe('2900000000428');
    expect(barcode.readOnly).toBe(true);
  });

  it('says the codes are generated for a new product, and lets nothing be typed', () => {
    wrap();
    const sku = screen.getByLabelText('SKU') as HTMLInputElement;
    expect(sku.readOnly).toBe(true);
    expect(sku.value).toBe('Automatic');
    expect((screen.getByLabelText('Barcode') as HTMLInputElement).readOnly).toBe(true);
  });
});

const cat = (id: string, name: string, parentId: string | null = null): Category => ({
  id, name, active: true, parentId, parentName: null, productCount: 0, childCount: 0,
});

describe('product form categories', () => {
  it('offers a sub-category once a category with sub-categories is chosen', () => {
    const qc = new QueryClient();
    qc.setQueryData(['categories', false], [cat('a', 'Adults'), cat('k', 'Kids'), cat('a-t', 'T-shirts', 'a'), cat('k-t', 'T-shirts', 'k'), cat('h', 'Home')]);
    render(
      <QueryClientProvider client={qc}>
        <ProductForm onDone={() => undefined} />
      </QueryClientProvider>,
    );
    expect(screen.queryByLabelText('Sub-category')).toBeNull();
    // Only top-level categories are listed in the first dropdown.
    expect(screen.queryByRole('option', { name: 'T-shirts' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'a' } });
    expect(screen.getByLabelText('Sub-category')).toBeTruthy();
    expect(screen.getByRole('option', { name: 'T-shirts' })).toBeTruthy();
    // A category without sub-categories shows no second dropdown.
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'h' } });
    expect(screen.queryByLabelText('Sub-category')).toBeNull();
  });

  it('opens an existing product with its sub-category already selected', () => {
    const qc = new QueryClient();
    qc.setQueryData(['categories', false], [cat('a', 'Adults'), cat('a-t', 'T-shirts', 'a')]);
    render(
      <QueryClientProvider client={qc}>
        <ProductForm product={{ ...product, categoryId: 'a-t', categoryName: 'T-shirts', parentCategoryId: 'a', parentCategoryName: 'Adults' }} onDone={() => undefined} />
      </QueryClientProvider>,
    );
    expect((screen.getByLabelText('Category') as HTMLSelectElement).value).toBe('a');
    expect((screen.getByLabelText('Sub-category') as HTMLSelectElement).value).toBe('a-t');
  });
});
