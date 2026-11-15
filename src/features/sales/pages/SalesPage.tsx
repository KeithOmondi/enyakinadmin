import { useState } from 'react';
import { Link } from 'react-router';
import { Badge, Button, EmptyState, ErrorNotice, Field, Input, PageHeader, Pagination, Select, Spinner, Table } from '@/components/ui';
import { addDays, errorMessage, fmtDateTime, titleCase, todayISO } from '@/lib/format';
import { formatKes } from '@/lib/money';
import { useSales } from '../api';

export function SalesPage() {
  const [from, setFrom] = useState(addDays(todayISO(), -6));
  const [to, setTo] = useState(todayISO());
  const [status, setStatus] = useState<'' | 'completed' | 'voided'>('');
  const [receipt, setReceipt] = useState('');
  const [page, setPage] = useState(1);
  const receiptNo = Number(receipt);
  const sales = useSales({
    from, to, page,
    ...(status ? { status } : {}),
    ...(receipt && Number.isInteger(receiptNo) && receiptNo > 0 ? { receiptNo } : {}),
  });
  const touch = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  return (
    <>
      <PageHeader title="Sales" description="Every sale, newest first. Open one to see the receipt or void it." />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="From">{(p) => <Input {...p} type="date" value={from} max={to} onChange={(e) => touch(setFrom)(e.target.value)} />}</Field>
        <Field label="To">{(p) => <Input {...p} type="date" value={to} min={from} onChange={(e) => touch(setTo)(e.target.value)} />}</Field>
        <Field label="Status">
          {(p) => (
            <Select {...p} value={status} onChange={(e) => touch(setStatus)(e.target.value as typeof status)}>
              <option value="">All</option><option value="completed">Completed</option><option value="voided">Voided</option>
            </Select>
          )}
        </Field>
        <Field label="Receipt number">{(p) => <Input {...p} inputMode="numeric" value={receipt} onChange={(e) => touch(setReceipt)(e.target.value)} />}</Field>
      </div>
      {sales.isPending ? <Spinner /> : sales.isError ? (
        <ErrorNotice message={errorMessage(sales.error)} onRetry={() => void sales.refetch()} />
      ) : sales.data.items.length === 0 ? (
        <EmptyState title="No sales in this period" />
      ) : (
        <>
          <Table>
            <thead><tr><th>Receipt</th><th>Date</th><th>Cashier</th><th>Paid with</th><th className="text-right">Items</th><th className="text-right">Total</th><th><span className="sr-only">View</span></th></tr></thead>
            <tbody>
              {sales.data.items.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">#{s.receiptNo} {s.status === 'voided' && <Badge tone="danger">Voided</Badge>}</td>
                  <td className="whitespace-nowrap">{fmtDateTime(s.createdAt)}</td>
                  <td>{s.cashierName}</td>
                  <td>{s.methods ? s.methods.split(', ').map(titleCase).join(', ') : '—'}</td>
                  <td className="text-right tabular-nums">{s.itemCount}</td>
                  <td className="text-right tabular-nums">{formatKes(s.totalCents)}</td>
                  <td className="text-right"><Button asChild variant="outline" className="min-h-9"><Link to={`/sales/${s.id}`}>View</Link></Button></td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} pageSize={sales.data.pageSize} total={sales.data.total} onPage={setPage} />
        </>
      )}
    </>
  );
}
