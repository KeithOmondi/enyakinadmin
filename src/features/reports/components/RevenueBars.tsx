import { fmtDate } from '@/lib/format';
import { formatKes } from '@/lib/money';
import type { ReportSummary } from '@/lib/types';

/** Revenue per day as plain bars: no chart library, readable by screen readers as a list. */
export function RevenueBars({ days }: { days: ReportSummary['byDay'] }) {
  if (days.length === 0) return <p className="p-6 text-center text-sm text-muted-foreground">No sales in this period.</p>;
  const max = Math.max(...days.map((d) => d.revenueCents), 1);
  return (
    <ul className="flex flex-col gap-1.5">
      {days.map((d) => (
        <li key={d.date} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 text-sm">
          <span className="text-muted-foreground">{fmtDate(d.date)}</span>
          <span className="h-5 rounded bg-muted">
            <span className="block h-full rounded bg-primary" style={{ width: `${Math.max(2, (d.revenueCents / max) * 100)}%` }} />
          </span>
          <span className="tabular-nums">{formatKes(d.revenueCents)}</span>
        </li>
      ))}
    </ul>
  );
}
