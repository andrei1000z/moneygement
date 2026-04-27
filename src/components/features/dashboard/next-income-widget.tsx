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

  // Server component — Date.now() e ok la render server-side, dar React
  // Compiler îl flagă. eslint-disable pentru linia de mai jos.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const days = Math.ceil(
    (Date.parse(next.next_expected_on) - nowMs) / 86400000,
  );

  return (
    <Link
      href="/income"
      className="glass-thin specular block rounded-[--radius-card] p-4 transition-transform duration-200 hover:scale-[1.005]"
    >
      <div className="flex items-baseline justify-between">
        <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.15em]">
          Următoarea încasare
        </p>
        <CalendarClock
          className="text-[--accent-emerald] size-3.5"
          aria-hidden
          strokeWidth={1.75}
        />
      </div>
      <p className="mt-1 text-base font-medium">{next.name}</p>
      <p className="num-hero text-gradient-emerald mt-0.5 text-2xl">
        {formatMoney(Number(next.expected_amount), next.expected_currency)}
      </p>
      <p
        className={cn(
          "mt-1 text-xs tabular-nums",
          days <= 3
            ? "font-medium text-[--accent-emerald]"
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
