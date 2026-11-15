import { useState } from 'react';
import { Link } from 'react-router';
import { Badge, EmptyState, ErrorNotice, PageHeader, Pagination, Select, Spinner, Table } from '@/components/ui';
import { errorMessage, fmtDateTime, titleCase } from '@/lib/format';
import { formatKes } from '@/lib/money';
import type { MpesaRequestRow } from '@/lib/types';
import { useMpesaRequests } from '../api';

const TONE: Record<MpesaRequestRow['status'], 'neutral' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning', paid: 'success', failed: 'danger', cancelled: 'neutral', timeout: 'neutral',
};

export function MpesaPage() {
  const [status, setStatus] = useState('');
  const [unmatched, setUnmatched] = useState(false);
  const [page, setPage] = useState(1);
  const list = useMpesaRequests({ ...(status ? { status } : {}), ...(unmatched ? { unmatched: true } : {}), page });

  return (
    <>
      <PageHeader
        title="M-Pesa prompts"
        description="Every payment prompt sent to a customer's phone. A prompt that was paid but is not on any sale needs a look: the customer's money arrived but the sale was never completed."
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select aria-label="Status" className="max-w-48" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {['paid', 'pending', 'cancelled', 'failed', 'timeout'].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
        </Select>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="size-4" checked={unmatched} onChange={(e) => { setUnmatched(e.target.checked); setPage(1); }} />
          Paid but not on a sale
        </label>
      </div>
      {list.isPending ? <Spinner /> : list.isError ? (
        <ErrorNotice message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState title="No M-Pesa prompts yet">They appear here when a cashier sends a prompt from the shop app.</EmptyState>
      ) : (
        <>
          <Table>
            <thead><tr><th>When</th><th>Customer</th><th className="text-right">Amount</th><th>Result</th><th>Receipt</th><th>Sale</th><th>Sent by</th></tr></thead>
            <tbody>
              {list.data.items.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{fmtDateTime(r.createdAt)}</td>
                  <td className="tabular-nums">{r.phone}</td>
                  <td className="text-right tabular-nums">{formatKes(r.amountCents)}</td>
                  <td>
                    <Badge tone={TONE[r.status]}>{titleCase(r.status)}</Badge>
                    {r.unmatched && <> <Badge tone="danger">Not on a sale</Badge></>}
                    {r.status !== 'paid' && r.resultDesc && <span className="block text-xs text-muted-foreground">{r.resultDesc}</span>}
                  </td>
                  <td className="font-mono text-xs">{r.receipt ?? '—'}</td>
                  <td>{r.receiptNo ? <Link className="text-accent underline" to={`/sales`}>#{r.receiptNo}</Link> : '—'}</td>
                  <td>{r.createdByName}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} pageSize={list.data.pageSize} total={list.data.total} onPage={setPage} />
        </>
      )}
    </>
  );
}
