import { redirect } from "next/navigation";

import { MealVoucherCard } from "@/components/features/accounts/meal-voucher-card";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MealVouchersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, currency, current_balance, type")
    .eq("type", "meal_voucher")
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  const accountIds = (accounts ?? []).map((a) => a.id);
  const { data: lots } = accountIds.length > 0
    ? await supabase
        .from("meal_voucher_lots")
        .select("id, account_id, top_up_date, amount, remaining, expires_on")
        .in("account_id", accountIds)
    : { data: [] };

  const lotsByAccount = new Map<string, typeof lots>();
  for (const l of lots ?? []) {
    const arr = lotsByAccount.get(l.account_id) ?? [];
    arr.push(l);
    lotsByAccount.set(l.account_id, arr);
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Tichete masă</h1>
        <p className="text-muted-foreground text-sm">
          Loturi cu expiry tracking. Cele care expiră în &lt; 60 zile sunt
          marcate.
        </p>
      </header>

      {(accounts ?? []).length === 0 ? (
        <div className="glass-thin text-muted-foreground rounded-[--radius-card] p-6 text-center text-sm">
          Niciun cont de tichete masă. Adaugă unul din pagina Conturi cu
          tipul „Tichete masă&rdquo;.
        </div>
      ) : (
        <div className="space-y-4">
          {(accounts ?? []).map((acc) => (
            <MealVoucherCard
              key={acc.id}
              account={{
                id: acc.id,
                name: acc.name,
                currency: acc.currency,
                current_balance: Number(acc.current_balance ?? 0),
              }}
              lots={(lotsByAccount.get(acc.id) ?? []).map((l) => ({
                id: l.id,
                top_up_date: l.top_up_date,
                amount: Number(l.amount),
                remaining: Number(l.remaining),
                expires_on: l.expires_on,
              }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
