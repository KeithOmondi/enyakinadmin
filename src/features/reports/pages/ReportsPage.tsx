import { useState } from 'react';
import { Card, ErrorNotice, Field, Input, PageHeader, Spinner, Table } from '@/components/ui';
import { addDays, errorMessage, fmtQty, titleCase, todayISO } from '@/lib/format';
import { formatKes } from '@/lib/money';
import { useReportSummary, useStockValuation } from '../api';
import { RevenueBars } from '../components/RevenueBars';

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

export function ReportsPage() {
  const [from, setFrom] = useState(addDays(todayISO(), -29));
  const [to, setTo] = useState(todayISO());
  const report = useReportSummary(from, to);
  const valuation = useStockValuation();
  const r = report.data;

  return (
    <>
      <PageHeader title="Reports" description="Sales and profit for a period. Voided sales are excluded. Profit uses the cost price at the time of sale." />
      <div className="mb-4 grid max-w-md grid-cols-2 gap-3">
        <Field label="From">{(p) => <Input {...p} type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />}</Field>
        <Field label="To">{(p) => <Input {...p} type="date" value={to} min={from} max={todayISO()} onChange={(e) => setTo(e.target.value)} />}</Field>
      </div>

      {report.isPending ? <Spinner /> : report.isError ? (
        <ErrorNotice message={errorMessage(report.error)} onRetry={() => void report.refetch()} />
      ) : r && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Revenue" value={formatKes(r.revenueCents)} hint={`${r.salesCount} sales`} />
            <Stat label="Gross profit" value={formatKes(r.grossProfitCents)} hint={r.revenueCents ? `${Math.round((r.grossProfitCents / r.revenueCents) * 100)}% margin` : undefined} />
            <Stat label="Average sale" value={formatKes(r.averageSaleCents)} />
            <Stat label="Discounts given" value={formatKes(r.discountCents)} hint={r.voidedCount ? `${r.voidedCount} voided` : undefined} />
          </div>
          <Card>
            <h2 className="mb-3 font-semibold">Revenue by day</h2>
            <RevenueBars days={r.byDay} />
          </Card>
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <h2 className="mb-2 font-semibold">Top products</h2>
              <Table>
                <thead><tr><th>Product</th><th className="text-right">Sold</th><th className="text-right">Revenue</th></tr></thead>
                <tbody>
                  {r.topProducts.length === 0 && <tr><td colSpan={3} className="text-center text-muted-foreground">No sales</td></tr>}
                  {r.topProducts.map((p) => (
                    <tr key={p.productId}><td>{p.name}</td><td className="text-right tabular-nums">{fmtQty(p.quantity)}</td><td className="text-right tabular-nums">{formatKes(p.revenueCents)}</td></tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <div>
              <h2 className="mb-2 font-semibold">Payments received</h2>
              <Table>
                <thead><tr><th>Method</th><th className="text-right">Amount</th></tr></thead>
                <tbody>
                  {r.byPayment.length === 0 && <tr><td colSpan={2} className="text-center text-muted-foreground">No payments</td></tr>}
                  {r.byPayment.map((p) => (
                    <tr key={p.method}><td>{p.method === 'mpesa' ? 'M-Pesa' : titleCase(p.method)}</td><td className="text-right tabular-nums">{formatKes(p.amountCents)}</td></tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        </div>
      )}

      <h2 className="mb-2 mt-8 font-semibold">Stock value today</h2>
      {valuation.isPending ? <Spinner /> : valuation.isError ? (
        <ErrorNotice message={errorMessage(valuation.error)} />
      ) : (
        <Table>
          <thead><tr><th>Category</th><th className="text-right">Products</th><th className="text-right">Units</th><th className="text-right">At cost</th><th className="text-right">At selling price</th></tr></thead>
          <tbody>
            {valuation.data.map((v) => (
              <tr key={v.categoryName ?? 'none'}>
                <td>{v.categoryName ?? 'No category'}</td>
                <td className="text-right tabular-nums">{v.products}</td>
                <td className="text-right tabular-nums">{fmtQty(v.units)}</td>
                <td className="text-right tabular-nums">{formatKes(v.costValueCents)}</td>
                <td className="text-right tabular-nums">{formatKes(v.retailValueCents)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
