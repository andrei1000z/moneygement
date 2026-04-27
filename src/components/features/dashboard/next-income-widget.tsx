import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import { CalendarClock } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Widget care afișează următoarea sursă de venit așteptată (salariu /
 * pensie). Folosit pe dashboard.
 */
export async function NextIncomeWidget() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: streams } = await supabase
    .from("income_streams")
    .select("name, payer, expected_amount, expected_currency, next_expected_on")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .not("next_expected_on", "is", null)
    .order("next_expected_on", { ascending: true })
    .limit(1);

  const next = streams?.[0];
  if (!next || !next.next_expected_on) return null;

  const days = Math.ceil(
    (Date.parse(next.next_expected_on) - Date.now()) / 86400000,
  );

  return (
    <Link
      href="/income"
      className="border-border/60 bg-card hover:bg-accent/40 block rounded-xl border p-4 transition"
    >
      <div className="flex items-baseline justify-between">
        <p className="text-muted-foreground text-xs uppercase tracking-wider">
          Următoarea încasare
        </p>
        <CalendarClock
          className="text-muted-foreground size-3.5"
          aria-hidden
        />
      </div>
      <p className="mt-1 text-base font-medium">{next.name}</p>
      <p className="mt-0.5 text-2xl font-semibold tabular-nums">
        {formatMoney(Number(next.expected_amount), next.expected_currency)}
      </p>
      <p
        className={cn(
          "mt-1 text-xs tabular-nums",
          days <= 3
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-muted-foreground",
        )}
      >
        {days < 0
          ? `întârziat cu ${-days} zile`
          : days === 0
            ? "azi"
            : `peste ${days} ${days === 1 ? "zi" : "zile"}`}
        {" · "}
        {format(parseISO(next.next_expected_on), "d MMM", { locale: ro })}
      </p>
    </Link>
  );
}
