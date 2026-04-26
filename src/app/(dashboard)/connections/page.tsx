import { redirect } from "next/navigation";

import { ConnectionsScreen } from "@/components/features/connections/connections-screen";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const RO_INSTITUTIONS = [
  { id: "BT_RO", name: "Banca Transilvania" },
  { id: "ING_RO", name: "ING Bank România" },
  { id: "BCR_RO", name: "BCR" },
  { id: "REVOLUT_RO", name: "Revolut" },
  { id: "RAIFFEISEN_RO", name: "Raiffeisen Bank" },
  { id: "CEC_RO", name: "CEC Bank" },
];

type SearchParams = Promise<{
  connected?: string;
  error?: string;
}>;

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;

  const { data: connections } = await supabase
    .from("bank_connections")
    .select(
      "id, institution_id, institution_name, status, expires_at, last_synced_at, created_at",
    )
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Conexiuni bancare</h1>
        <p className="text-muted-foreground text-sm">
          Conectează-ți conturile bancare prin Enable Banking. Acces SCA
          valabil 180 zile, sincronizare automată la 6 ore.
        </p>
      </header>

      <ConnectionsScreen
        institutions={RO_INSTITUTIONS}
        connections={connections ?? []}
        flashError={params.error ?? null}
        flashConnected={params.connected ?? null}
      />
    </div>
  );
}
