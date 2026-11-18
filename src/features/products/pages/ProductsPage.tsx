import { ArrowLeft, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  Badge, Button, EmptyState, ErrorNotice, Input, Modal, PageHeader, Pagination, Select, Spinner, Table,
} from '@/components/ui';
import { ProductThumb } from '@/components/ProductThumb';
import { errorMessage, fmtQty } from '@/lib/format';
import { useDebounced } from '@/lib/hooks';
import { GroupGrid } from '@/components/GroupGrid';
import { groupProducts, pointOf, shortName } from '@/lib/groups';
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
  const [params, setParams] = useSearchParams();
  const openGroup = params.get('group');
  const search = useDebounced(q.trim());
  // Without a search the page shows one card per product family; opening one lists its items.
  const grouped = !search;
  const categories = useCategories();
  const products = useProducts({
    ...(search ? { q: search } : {}),
    ...(categoryId ? { categoryId } : {}),
    status,
    ...(lowStock ? { lowStock: true } : {}),
    page: grouped ? 1 : page,
  }, grouped ? 200 : 20);
  const groups = useMemo(() => groupProducts(products.data?.items ?? []), [products.data]);
  const current = openGroup ? groups.find((g) => g.key === openGroup) : undefined;
  const rows = grouped && openGroup ? (current?.items ?? []) : (products.data?.items ?? []);
  // Inside a family the Point and Category columns already say what the full name repeats.
  const inGroup = grouped && Boolean(openGroup);
  const showPoint = rows.some((p) => pointOf(p.name) !== null);
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title={grouped && current ? current.name : 'Products'}
        description={grouped && current ? `${current.items.length} item${current.items.length === 1 ? '' : 's'} in this product.` : 'What you sell, its price and how much is on the shelf.'}
        actions={
          <div className="flex gap-2">
            {grouped && openGroup && (
              <Button variant="outline" onClick={() => setParams({})}>
                <ArrowLeft /> All products
              </Button>
            )}
          <Button onClick={() => setEditing('new')}>
            <Plus /> New product
          </Button>
          </div>
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
      ) : products.data.items.length === 0 || (grouped && openGroup && !current) ? (
        <EmptyState title="No products found">Try a different search, or add your first product.</EmptyState>
      ) : grouped && !openGroup ? (
        <GroupGrid groups={groups} onOpen={(g) => setParams({ group: g.key })} />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>Product</th>
                {showPoint && <th>Point</th>}
                <th>Category</th>
                <th className="text-right">Price</th>
                <th className="text-right">Cost</th>
                <th className="text-right">In stock</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <ProductThumb url={p.imageUrl} alt="" className="size-11 rounded-md" />
                      <div>
                        <div className="font-medium">{inGroup ? shortName(p, rows) : p.name} {!p.active && <Badge>Inactive</Badge>}</div>
                        <div className="text-xs text-muted-foreground">{p.sku}{p.barcode ? ` · ${p.barcode}` : ''}</div>
                      </div>
                    </div>
                  </td>
                  {showPoint && <td className="font-medium tabular-nums">{pointOf(p.name) ?? '—'}</td>}
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
          {!grouped && <Pagination page={page} pageSize={products.data.pageSize} total={products.data.total} onPage={setPage} />}
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
