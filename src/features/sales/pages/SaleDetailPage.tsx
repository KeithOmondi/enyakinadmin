import { ArrowLeft, Printer } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Receipt } from '@/components/Receipt';
import { Badge, Button, Card, ErrorNotice, Field, Input, Modal, PageHeader, Spinner } from '@/components/ui';
import { errorMessage, fmtDateTime } from '@/lib/format';
import { formatKes } from '@/lib/money';
import { useSale, useVoidSale } from '../api';

export function SaleDetailPage() {
  const { id = '' } = useParams();
  const sale = useSale(id);
  const voidSale = useVoidSale(id);
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState('');

  if (sale.isPending) return <Spinner />;
  if (sale.isError) return <ErrorNotice message={errorMessage(sale.error)} onRetry={() => void sale.refetch()} />;
  const s = sale.data;

  return (
    <>
      <Button asChild variant="ghost" className="mb-2 -ml-3"><Link to="/sales"><ArrowLeft /> All sales</Link></Button>
      <PageHeader
        title={`Receipt #${s.receiptNo}`}
        description={`${fmtDateTime(s.createdAt)} · ${s.cashierName}`}
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()}><Printer /> Print</Button>
            {s.status === 'completed' && <Button variant="destructive" onClick={() => setVoiding(true)}>Void sale</Button>}
          </>
        }
      />
      {s.status === 'voided' && (
        <Card className="mb-4 border-destructive/40">
          <Badge tone="danger">Voided</Badge>
          <p className="mt-2 text-sm">{s.voidedAt && fmtDateTime(s.voidedAt)} by {s.voidedByName}: {s.voidReason}</p>
          <p className="text-xs text-muted-foreground">The stock was returned to the shelf.</p>
        </Card>
      )}
      <Card className="mx-auto max-w-sm">
        <Receipt sale={s} />
      </Card>
      <p className="mx-auto mt-2 max-w-sm text-center text-xs text-muted-foreground">Total {formatKes(s.totalCents)}</p>

      <Modal open={voiding} onClose={() => setVoiding(false)} title="Void this sale">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            voidSale.mutate(reason.trim(), { onSuccess: () => setVoiding(false) });
          }}
        >
          <p className="text-sm">This returns every item to stock and removes the sale from today&apos;s totals. It cannot be undone.</p>
          <Field label="Reason">{(p) => <Input {...p} required minLength={3} maxLength={200} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
          {voidSale.isError && <ErrorNotice message={errorMessage(voidSale.error)} />}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setVoiding(false)}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={voidSale.isPending}>Void sale</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
