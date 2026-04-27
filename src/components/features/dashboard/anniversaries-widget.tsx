import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import { Clock4 } from "lucide-react";

import { anniversariesForDate } from "@/lib/intelligence/anniversaries";
import { formatMoney } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

/**
 * Widget „Pe vremea asta..." — afișează tranzacțiile cu valoare mare
 * (>100 lei abs) care au avut loc fix cu un an în urmă (±1 zi).
 */
export async function AnniversariesWidget() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_household")
    .eq("id", user.id)
    .single();
  if (!profile?.active_household) return null;

  const oneYearAgo = new Date();
  oneYearAgo.setUTCFullYear(oneYearAgo.getUTCFullYear() - 1);
  const oneYearAgoMinus = new Date(oneYearAgo);
  oneYearAgoMinus.setUTCDate(oneYearAgoMinus.getUTCDate() - 1);
  const oneYearAgoPlus = new Date(oneYearAgo);
  oneYearAgoPlus.setUTCDate(oneYearAgoPlus.getUTCDate() + 1);

  const { data: txs } = await supabase
    .from("transactions")
    .select("occurred_on, amount, currency, payee, category_id, is_transfer")
    .eq("household_id", profile.active_household)
    .eq("is_transfer", false)
    .gte("occurred_on", oneYearAgoMinus.toISOString().slice(0, 10))
    .lte("occurred_on", oneYearAgoPlus.toISOString().slice(0, 10));

  const anniversaries = anniversariesForDate(
    (txs ?? []).map((t) => ({
      occurred_on: t.occurred_on,
      amount: Number(t.amount),
      currency: t.currency,
      payee: t.payee,
      category_id: t.category_id,
      is_transfer: t.is_transfer,
    })),
  );

  // Doar dacă există ceva semnificativ.
  const significant = anniversaries.filter((a) => Math.abs(a.amount) >= 10000);
  if (significant.length === 0) return null;

  return (
    <Link
      href="/transactions"
      className="glass-thin specular block rounded-[--radius-card] p-4 transition-transform duration-200 hover:scale-[1.005]"
    >
      <div className="flex items-baseline justify-between">
        <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.15em]">
          Acum un an…
        </p>
        <Clock4
          className="text-[--accent-violet] size-3.5"
          aria-hidden
          strokeWidth={1.75}
        />
      </div>
      <ul className="mt-2 space-y-1.5">
        {significant.slice(0, 3).map((a, i) => (
          <li key={i} className="flex items-baseline justify-between text-sm">
            <span className="truncate text-foreground">
              {a.payee ?? "—"}
            </span>
            <span className="ml-3 shrink-0 tabular-nums font-medium">
              {a.amount > 0 ? "+" : ""}
              {formatMoney(a.amount, a.currency)}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground mt-2 text-[11px]">
        {format(parseISO(significant[0]!.occurred_on), "d MMMM yyyy", {
          locale: ro,
        })}
      </p>
    </Link>
  );
}
