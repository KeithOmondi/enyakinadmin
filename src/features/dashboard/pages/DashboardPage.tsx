import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router';
import { useSession } from '@/app/AuthGate';
import { Badge, Button, Card, ErrorNotice, PageHeader, Spinner } from '@/components/ui';
import { useInventorySummary } from '@/features/inventory/api';
import { useProducts } from '@/features/products/api';
import { RevenueBars } from '@/features/reports/components/RevenueBars';
import { useReportSummary } from '@/features/reports/api';
import { addDays, errorMessage, fmtQty, todayISO } from '@/lib/format';
import { formatKes } from '@/lib/money';

export function DashboardPage() {
  const { business } = useSession();
  const today = todayISO();
  const todayReport = useReportSummary(today, today);
  const week = useReportSummary(addDays(today, -6), today);
  const inventory = useInventorySummary();
  const low = useProducts({ status: 'active', lowStock: true, page: 1 }, 6);

  return (
    <>
      <PageHeader title={business.name} description="How the business is doing right now." />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <p className="text-xs text-muted-foreground">Sales today</p>
          <p className="text-xl font-semibold tabular-nums">{todayReport.data ? formatKes(todayReport.data.revenueCents) : '…'}</p>
          <p className="text-xs text-muted-foreground">{todayReport.data?.salesCount ?? 0} sales</p>
        </Card>
        <Card>
          <p className="text-xs text-muted-foreground">Profit today</p>
          <p className="text-xl font-semibold tabular-nums">{todayReport.data ? formatKes(todayReport.data.grossProfitCents) : '…'}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted-foreground">Stock value (cost)</p>
          <p className="text-xl font-semibold tabular-nums">{inventory.data ? formatKes(inventory.data.valueCents) : '…'}</p>
          <p className="text-xs text-muted-foreground">{inventory.data?.products ?? 0} products</p>
        </Card>
        <Card>
          <p className="text-xs text-muted-foreground">Needs restocking</p>
          <p className="text-xl font-semibold tabular-nums">{inventory.data ? inventory.data.lowStock : '…'}</p>
          <p className="text-xs text-muted-foreground">{inventory.data?.outOfStock ?? 0} out of stock</p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Last 7 days</h2>
          {week.isPending ? <Spinner /> : week.isError ? <ErrorNotice message={errorMessage(week.error)} /> : <RevenueBars days={week.data.byDay} />}
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4 text-warning" aria-hidden /> Low stock</h2>
            <Button asChild variant="ghost" className="min-h-9"><Link to="/inventory">See all</Link></Button>
          </div>
          {low.isPending ? <Spinner /> : low.isError ? <ErrorNotice message={errorMessage(low.error)} /> : low.data.items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Everything is above its reorder level.</p>
          ) : (
            <ul className="divide-y divide-border">
              {low.data.items.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{p.name}</span>
                  <span className="tabular-nums">{fmtQty(p.quantity)} {p.unit} <Badge tone={p.quantity === 0 ? 'danger' : 'warning'}>{p.quantity === 0 ? 'Out' : 'Low'}</Badge></span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
