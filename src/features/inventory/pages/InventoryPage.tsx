import { ArrowLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  Badge, Button, Card, EmptyState, ErrorNotice, Input, Modal, PageHeader, Pagination, Spinner, Table, cn,
} from '@/components/ui';
import { GroupGrid } from '@/components/GroupGrid';
import { useProducts } from '@/features/products/api';
import { errorMessage, fmtDateTime, fmtQty } from '@/lib/format';
import { groupProducts, pointOf, shortName } from '@/lib/groups';
import { MOVEMENT_LABEL, STOCK_IN_TYPES, balanceBefore } from '@/lib/movements';
import { useDebounced } from '@/lib/hooks';
import { formatKes } from '@/lib/money';
import type { Product } from '@/lib/types';
import { useInventorySummary, useMovements } from '../api';
import { AdjustStockForm } from '../components/AdjustStockForm';

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'warning' }) {
  return (
    <Card>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-xl font-semibold tabular-nums', tone === 'warning' && 'text-warning')}>{value}</p>
    </Card>
  );
}

function StockTab() {
  const [q, setQ] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [params, setParams] = useSearchParams();
  const openGroup = params.get('group');
  const search = useDebounced(q.trim());
  // Without a search: one card per product family; opening one lists its items.
  const grouped = !search;
  const products = useProducts({ ...(search ? { q: search } : {}), status: 'active', ...(lowOnly ? { lowStock: true } : {}), page: grouped ? 1 : page }, grouped ? 200 : 20);
  const groups = useMemo(() => groupProducts(products.data?.items ?? []), [products.data]);
  const current = openGroup ? groups.find((g) => g.key === openGroup) : undefined;
  const inGroup = grouped && Boolean(openGroup);
  const rows = inGroup ? (current?.items ?? []) : (products.data?.items ?? []);
  const showPoint = rows.some((p) => pointOf(p.name) !== null);

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <Input className="max-w-xs" placeholder="Search products" aria-label="Search products" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="size-4" checked={lowOnly} onChange={(e) => { setLowOnly(e.target.checked); setPage(1); }} />
          Low stock only
        </label>
      </div>
      {inGroup && (
        <div className="mb-3 flex items-center gap-3">
          <Button variant="outline" className="min-h-9" onClick={() => setParams({})}><ArrowLeft /> All products</Button>
          <h2 className="text-lg font-semibold">{current?.name ?? 'Product'}</h2>
        </div>
      )}
      {products.isPending ? <Spinner /> : products.isError ? (
        <ErrorNotice message={errorMessage(products.error)} onRetry={() => void products.refetch()} />
      ) : products.data.items.length === 0 || (inGroup && !current) ? (
        <EmptyState title="Nothing to show" />
      ) : grouped && !openGroup ? (
        <GroupGrid groups={groups} onOpen={(g) => setParams({ group: g.key })} />
      ) : (
        <>
          <Table>
            <thead><tr><th>Product</th><th>SKU</th>{showPoint && <th>Point</th>}{inGroup && <th>Category</th>}<th className="text-right">In stock</th><th>Unit</th><th className="text-right">Reorder at</th><th className="text-right">Stock value</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{inGroup ? shortName(p, rows) : p.name}</td>
                  <td className="whitespace-nowrap tabular-nums text-muted-foreground">{p.sku}</td>
                  {showPoint && <td className="font-medium tabular-nums">{pointOf(p.name) ?? '—'}</td>}
                  {inGroup && <td>{p.parentCategoryName ? p.categoryName : '—'}</td>}
                  <td className="whitespace-nowrap text-right tabular-nums">
                    {fmtQty(p.quantity)} {p.quantity === 0 ? <Badge tone="danger">Out</Badge> : p.lowStock ? <Badge tone="warning">Low</Badge> : null}
                  </td>
                  <td className="text-muted-foreground">{p.unit}</td>
                  <td className="text-right tabular-nums">{p.reorderLevel > 0 ? fmtQty(p.reorderLevel) : '—'}</td>
                  <td className="text-right tabular-nums">{formatKes(Math.round(p.quantity * p.costCents))}</td>
                  <td className="text-right"><Button variant="outline" className="min-h-9" onClick={() => setAdjusting(p)}>Adjust</Button></td>
                </tr>
              ))}
            </tbody>
          </Table>
          {!grouped && <Pagination page={page} pageSize={products.data.pageSize} total={products.data.total} onPage={setPage} />}
        </>
      )}
      <Modal open={adjusting !== null} onClose={() => setAdjusting(null)} title="Adjust stock">
        {adjusting && <AdjustStockForm product={adjusting} onDone={() => setAdjusting(null)} />}
      </Modal>
    </>
  );
}

const TYPES = Object.keys(MOVEMENT_LABEL) as (keyof typeof MOVEMENT_LABEL)[];

function MovementsTab() {
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const moves = useMovements({ ...(type ? { type } : {}), page });
  return (
    <>
      <div className="mb-4">
        <select aria-label="Type" className="min-h-11 rounded-md border border-border bg-background px-3 text-sm" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="">All stock changes</option>
          {TYPES.map((t) => <option key={t} value={t}>{MOVEMENT_LABEL[t]}</option>)}
        </select>
      </div>
      {moves.isPending ? <Spinner /> : moves.isError ? (
        <ErrorNotice message={errorMessage(moves.error)} onRetry={() => void moves.refetch()} />
      ) : moves.data.items.length === 0 ? (
        <EmptyState title="No stock movements yet" />
      ) : (
        <>
          <Table>
            <thead><tr><th>When</th><th>Product</th><th>What happened</th><th className="text-right">Current stock (before)</th><th className="text-right">Added / removed</th><th className="text-right">Total (after)</th><th>Note</th><th>By</th></tr></thead>
            <tbody>
              {moves.data.items.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap">{fmtDateTime(m.createdAt)}</td>
                  <td>{m.productName}</td>
                  <td>{STOCK_IN_TYPES.includes(m.type) ? <Badge tone="success">{MOVEMENT_LABEL[m.type]}</Badge> : MOVEMENT_LABEL[m.type]}</td>
                  <td className="text-right tabular-nums">{fmtQty(balanceBefore(m))}</td>
                  <td className={cn('text-right font-medium tabular-nums', m.quantity < 0 ? 'text-destructive' : 'text-success')}>{m.quantity > 0 ? '+' : ''}{fmtQty(m.quantity)}</td>
                  <td className="text-right font-semibold tabular-nums">{fmtQty(m.balanceAfter)}</td>
                  <td className="text-muted-foreground">{m.note ?? ''}</td>
                  <td>{m.userName ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} pageSize={moves.data.pageSize} total={moves.data.total} onPage={setPage} />
        </>
      )}
    </>
  );
}

export function InventoryPage() {
  const [tab, setTab] = useState<'stock' | 'movements'>('stock');
  const summary = useInventorySummary();
  const s = summary.data;
  return (
    <>
      <PageHeader title="Inventory" description="What is on the shelf now, and every change that got it there: what was added or removed, by whom, and the new total." />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Products" value={s ? String(s.products) : '…'} />
        <Stat label="Stock value (at cost)" value={s ? formatKes(s.valueCents) : '…'} />
        <Stat label="Low stock" value={s ? String(s.lowStock) : '…'} tone={s && s.lowStock > 0 ? 'warning' : undefined} />
        <Stat label="Out of stock" value={s ? String(s.outOfStock) : '…'} tone={s && s.outOfStock > 0 ? 'warning' : undefined} />
      </div>
      <div role="tablist" className="mb-4 flex gap-1 border-b border-border">
        {(['stock', 'movements'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn('min-h-11 border-b-2 px-4 text-sm font-medium', tab === t ? 'border-accent text-accent' : 'border-transparent text-muted-foreground')}>
            {t === 'stock' ? 'Stock levels' : 'Movements'}
          </button>
        ))}
      </div>
      {tab === 'stock' ? <StockTab /> : <MovementsTab />}
    </>
  );
}
