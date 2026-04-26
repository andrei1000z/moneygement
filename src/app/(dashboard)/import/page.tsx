import { redirect } from "next/navigation";

import { ImportWizard } from "@/components/features/import/import-wizard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, currency, type")
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Importă din extras CSV</h1>
        <p className="text-muted-foreground text-sm">
          BT24, BCR George, ING Home&apos;Bank, Revolut, CEC, Raiffeisen.
          Detectăm automat formatul. Tranzacțiile duplicate sunt sărite.
        </p>
      </header>

      <ImportWizard accounts={accounts ?? []} />
    </div>
  );
}
