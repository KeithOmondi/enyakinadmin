import { Badge, Card } from '@/components/ui';
import { ProductThumb } from '@/components/ProductThumb';
import { fmtQty } from '@/lib/format';
import type { ProductGroup } from '@/lib/groups';
import { formatKes } from '@/lib/money';

export function GroupGrid({ groups, onOpen }: { groups: ProductGroup[]; onOpen: (g: ProductGroup) => void }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((g) => (
        <li key={g.key}>
          <button type="button" onClick={() => onOpen(g)} className="block w-full text-left" aria-label={`Open ${g.name}`}>
            <Card className="flex items-center gap-3 transition-colors hover:bg-muted">
              <ProductThumb url={g.imageUrl} alt="" className="size-14 rounded-md" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{g.name}</div>
                <div className="text-xs text-muted-foreground">
                  {g.items.length} item{g.items.length === 1 ? '' : 's'} · {fmtQty(g.totalQuantity)} {g.unit} in stock
                </div>
                <div className="text-xs tabular-nums text-muted-foreground">
                  {g.minPriceCents === g.maxPriceCents ? formatKes(g.minPriceCents) : `${formatKes(g.minPriceCents)} – ${formatKes(g.maxPriceCents)}`}
                </div>
              </div>
              {g.lowStockCount > 0 && <Badge tone="warning">{g.lowStockCount} low</Badge>}
            </Card>
          </button>
        </li>
      ))}
    </ul>
  );
}
