import { useState } from 'react';
import {
  Badge, Button, Card, EmptyState, ErrorNotice, Input, Modal, PageHeader, Pagination, Spinner, Table, cn,
} from '@/components/ui';
import { useProducts } from '@/features/products/api';
import { errorMessage, fmtDateTime, fmtQty, titleCase } from '@/lib/format';
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
  const search = useDebounced(q.trim());
  const products = useProducts({ ...(search ? { q: search } : {}), status: 'active', ...(lowOnly ? { lowStock: true } : {}), page });

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <Input className="max-w-xs" placeholder="Search products" aria-label="Search products" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="size-4" checked={lowOnly} onChange={(e) => { setLowOnly(e.target.checked); setPage(1); }} />
          Low stock only
        </label>
      </div>
      {products.isPending ? <Spinner /> : products.isError ? (
        <ErrorNotice message={errorMessage(products.error)} onRetry={() => void products.refetch()} />
      ) : products.data.items.length === 0 ? (
        <EmptyState title="Nothing to show" />
      ) : (
        <>
          <Table>
            <thead><tr><th>Product</th><th className="text-right">In stock</th><th className="text-right">Reorder at</th><th className="text-right">Stock value</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {products.data.items.map((p) => (
                <tr key={p.id}>
                  <td><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{p.sku}</div></td>
                  <td className="text-right tabular-nums">
                    {fmtQty(p.quantity)} {p.unit} {p.quantity === 0 ? <Badge tone="danger">Out</Badge> : p.lowStock ? <Badge tone="warning">Low</Badge> : null}
                  </td>
                  <td className="text-right tabular-nums">{p.reorderLevel > 0 ? fmtQty(p.reorderLevel) : '—'}</td>
                  <td className="text-right tabular-nums">{formatKes(Math.round(p.quantity * p.costCents))}</td>
                  <td className="text-right"><Button variant="outline" className="min-h-9" onClick={() => setAdjusting(p)}>Adjust</Button></td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} pageSize={products.data.pageSize} total={products.data.total} onPage={setPage} />
        </>
      )}
      <Modal open={adjusting !== null} onClose={() => setAdjusting(null)} title="Adjust stock">
        {adjusting && <AdjustStockForm product={adjusting} onDone={() => setAdjusting(null)} />}
      </Modal>
    </>
  );
}

const TYPES = ['opening', 'purchase', 'sale', 'void', 'adjustment'];

function MovementsTab() {
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const moves = useMovements({ ...(type ? { type } : {}), page });
  return (
    <>
      <div className="mb-4">
        <select aria-label="Type" className="min-h-11 rounded-md border border-border bg-background px-3 text-sm" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="">All movement types</option>
          {TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
        </select>
      </div>
      {moves.isPending ? <Spinner /> : moves.isError ? (
        <ErrorNotice message={errorMessage(moves.error)} onRetry={() => void moves.refetch()} />
      ) : moves.data.items.length === 0 ? (
        <EmptyState title="No stock movements yet" />
      ) : (
        <>
          <Table>
            <thead><tr><th>When</th><th>Product</th><th>Type</th><th className="text-right">Change</th><th className="text-right">Balance</th><th>Note</th><th>By</th></tr></thead>
            <tbody>
              {moves.data.items.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap">{fmtDateTime(m.createdAt)}</td>
                  <td>{m.productName}</td>
                  <td>{titleCase(m.type)}</td>
                  <td className={cn('text-right tabular-nums', m.quantity < 0 ? 'text-destructive' : 'text-success')}>{m.quantity > 0 ? '+' : ''}{fmtQty(m.quantity)}</td>
                  <td className="text-right tabular-nums">{fmtQty(m.balanceAfter)}</td>
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
      <PageHeader title="Inventory" description="Current stock and every change that led to it." />
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
