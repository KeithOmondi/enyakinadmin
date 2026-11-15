import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button, EmptyState, ErrorNotice, Modal, PageHeader, Pagination, Spinner, Table } from '@/components/ui';
import { errorMessage, fmtDateTime, fmtQty } from '@/lib/format';
import { formatKes } from '@/lib/money';
import { usePurchase, usePurchases } from '../api';

function PurchaseDetail({ id }: { id: string }) {
  const p = usePurchase(id);
  if (p.isPending) return <Spinner />;
  if (p.isError) return <ErrorNotice message={errorMessage(p.error)} />;
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-muted-foreground">
        {fmtDateTime(p.data.createdAt)} · {p.data.supplierName ?? 'No supplier'} · by {p.data.createdByName}
        {p.data.reference ? ` · ${p.data.reference}` : ''}
      </p>
      <Table>
        <thead><tr><th>Product</th><th className="text-right">Qty</th><th className="text-right">Unit cost</th></tr></thead>
        <tbody>
          {p.data.items.map((i) => (
            <tr key={i.productId}>
              <td>{i.productName}</td>
              <td className="text-right tabular-nums">{fmtQty(i.quantity)}</td>
              <td className="text-right tabular-nums">{formatKes(i.unitCostCents)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="text-right font-semibold">Total {formatKes(p.data.totalCents)}</p>
      {p.data.note && <p>Note: {p.data.note}</p>}
    </div>
  );
}

export function PurchasesPage() {
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const purchases = usePurchases(page);

  return (
    <>
      <PageHeader
        title="Purchases"
        description="Stock received from suppliers."
        actions={<Button asChild><Link to="/purchases/new"><Plus /> Receive stock</Link></Button>}
      />
      {purchases.isPending ? (
        <Spinner />
      ) : purchases.isError ? (
        <ErrorNotice message={errorMessage(purchases.error)} onRetry={() => void purchases.refetch()} />
      ) : purchases.data.items.length === 0 ? (
        <EmptyState title="No purchases yet">Receive stock to record what you bought.</EmptyState>
      ) : (
        <>
          <Table>
            <thead><tr><th>Date</th><th>Supplier</th><th>Reference</th><th>By</th><th className="text-right">Total</th><th><span className="sr-only">View</span></th></tr></thead>
            <tbody>
              {purchases.data.items.map((p) => (
                <tr key={p.id}>
                  <td>{fmtDateTime(p.createdAt)}</td>
                  <td>{p.supplierName ?? '—'}</td>
                  <td>{p.reference ?? '—'}</td>
                  <td>{p.createdByName}</td>
                  <td className="text-right tabular-nums">{formatKes(p.totalCents)}</td>
                  <td className="text-right"><Button variant="outline" className="min-h-9" onClick={() => setOpenId(p.id)}>View</Button></td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} pageSize={purchases.data.pageSize} total={purchases.data.total} onPage={setPage} />
        </>
      )}
      <Modal open={openId !== null} onClose={() => setOpenId(null)} title="Purchase" wide>
        {openId && <PurchaseDetail id={openId} />}
      </Modal>
    </>
  );
}
