import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { EmptyState, ErrorNotice, PageHeader, Pagination, Select, Spinner, Table } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage, fmtDateTime, titleCase } from '@/lib/format';
import type { AuditRow, Page } from '@/lib/types';

const ACTIONS = [
  'sale_voided', 'stock_adjusted', 'product_price_changed', 'product_created', 'product_updated', 'purchase_received',
  'day_closed', 'user_added', 'user_removed', 'user_password_reset', 'business_updated',
];

export function AuditPage() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const log = useQuery({
    queryKey: ['audit', action, page],
    queryFn: async () => (await api.get<Page<AuditRow>>('/audit', { params: { ...(action ? { action } : {}), page, pageSize: 30 } })).data,
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="Audit log" description="Who changed what, and when. Entries cannot be edited." />
      <div className="mb-4">
        <Select aria-label="Action" className="max-w-xs" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          <option value="">All actions</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{titleCase(a)}</option>)}
        </Select>
      </div>
      {log.isPending ? <Spinner /> : log.isError ? (
        <ErrorNotice message={errorMessage(log.error)} onRetry={() => void log.refetch()} />
      ) : log.data.items.length === 0 ? (
        <EmptyState title="Nothing recorded yet" />
      ) : (
        <>
          <Table>
            <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Details</th></tr></thead>
            <tbody>
              {log.data.items.map((a) => (
                <tr key={a.id} className="align-top">
                  <td className="whitespace-nowrap">{fmtDateTime(a.createdAt)}</td>
                  <td>{a.userName ?? '—'}</td>
                  <td>{titleCase(a.action)}</td>
                  <td className="max-w-md break-words text-xs text-muted-foreground">{a.details ? JSON.stringify(a.details) : ''}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} pageSize={log.data.pageSize} total={log.data.total} onPage={setPage} />
        </>
      )}
    </>
  );
}
