import { differenceInDays, format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";

import { getDashboardContext, getUpcomingBills } from "@/lib/dashboard";
import { formatMoney } from "@/lib/money";

export async function UpcomingBills() {
  const ctx = await getDashboardContext();
  if (!ctx) return null;
  const bills = await getUpcomingBills(ctx, 7);

  if (bills.length === 0) {
    return (
      <div className="border-border/60 bg-card rounded-xl border p-4">
        <h3 className="text-muted-foreground mb-2 text-xs uppercase tracking-wider">
          Următoarele facturi
        </h3>
        <p className="text-muted-foreground text-sm">
          Nimic în următoarele 7 zile.
        </p>
      </div>
    );
  }

  const today = new Date();

  return (
    <div className="border-border/60 bg-card rounded-xl border">
      <div className="flex items-baseline justify-between border-b px-4 py-3">
        <h3 className="text-muted-foreground text-xs uppercase tracking-wider">
          Următoarele facturi
        </h3>
        <p className="text-muted-foreground text-xs">7 zile</p>
      </div>
      <ul className="divide-y">
        {bills.map((b) => {
          const next = parseISO(b.next_date);
          const days = differenceInDays(next, today);
          const label =
            days === 0
              ? "Azi"
              : days === 1
              ? "Mâine"
              : days < 0
              ? `acum ${-days} zile`
              : `în ${days} zile`;
          return (
            <li key={b.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {b.payee ?? "Plată recurentă"}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  {format(next, "d MMM", { locale: ro })} · {label}
                </p>
              </div>
              <span className="tabular-nums text-right text-sm font-semibold">
                {formatMoney(Math.abs(b.amount), b.currency)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
