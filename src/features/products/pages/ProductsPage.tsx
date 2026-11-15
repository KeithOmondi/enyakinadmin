import { Plus } from 'lucide-react';
import { useState } from 'react';
import {
  Badge, Button, EmptyState, ErrorNotice, Input, Modal, PageHeader, Pagination, Select, Spinner, Table,
} from '@/components/ui';
import { ProductThumb } from '@/components/ProductThumb';
import { errorMessage, fmtQty } from '@/lib/format';
import { useDebounced } from '@/lib/hooks';
import { formatKes } from '@/lib/money';
import type { Product } from '@/lib/types';
import { useCategories, useProducts } from '../api';
import { ProductForm } from '../components/ProductForm';

export function ProductsPage() {
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active');
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const search = useDebounced(q.trim());
  const categories = useCategories();
  const products = useProducts({
    ...(search ? { q: search } : {}),
    ...(categoryId ? { categoryId } : {}),
    status,
    ...(lowStock ? { lowStock: true } : {}),
    page,
  });
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Products"
        description="What you sell, its price and how much is on the shelf."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus /> New product
          </Button>
        }
      />
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Input placeholder="Search name, SKU or barcode" aria-label="Search products" value={q} onChange={(e) => reset(setQ)(e.target.value)} />
        <Select aria-label="Category" value={categoryId} onChange={(e) => reset(setCategoryId)(e.target.value)}>
          <option value="">All categories</option>
          {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select aria-label="Status" value={status} onChange={(e) => reset(setStatus)(e.target.value as typeof status)}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All</option>
        </Select>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="size-4" checked={lowStock} onChange={(e) => reset(setLowStock)(e.target.checked)} />
          Low stock only
        </label>
      </div>

      {products.isPending ? (
        <Spinner />
      ) : products.isError ? (
        <ErrorNotice message={errorMessage(products.error)} onRetry={() => void products.refetch()} />
      ) : products.data.items.length === 0 ? (
        <EmptyState title="No products found">Try a different search, or add your first product.</EmptyState>
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th className="text-right">Price</th>
                <th className="text-right">Cost</th>
                <th className="text-right">In stock</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {products.data.items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <ProductThumb url={p.imageUrl} alt="" className="size-11 rounded-md" />
                      <div>
                        <div className="font-medium">{p.name} {!p.active && <Badge>Inactive</Badge>}</div>
                        <div className="text-xs text-muted-foreground">{p.sku}{p.barcode ? ` · ${p.barcode}` : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td>{p.categoryName ?? '—'}</td>
                  <td className="text-right tabular-nums">{formatKes(p.priceCents)}</td>
                  <td className="text-right tabular-nums">{formatKes(p.costCents)}</td>
                  <td className="text-right tabular-nums">
                    {fmtQty(p.quantity)} {p.unit} {p.lowStock && <Badge tone="warning">Low</Badge>}
                  </td>
                  <td className="text-right">
                    <Button variant="outline" className="min-h-9" onClick={() => setEditing(p)}>Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} pageSize={products.data.pageSize} total={products.data.total} onPage={setPage} />
        </>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'New product' : 'Edit product'} wide>
        {editing !== null && (
          <ProductForm key={editing === 'new' ? 'new' : editing.id} {...(editing === 'new' ? {} : { product: editing })} onDone={() => setEditing(null)} />
        )}
      </Modal>
    </>
  );
}
