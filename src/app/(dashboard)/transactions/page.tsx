import { Suspense } from "react";

import { TransactionsScreen } from "@/components/features/transactions/transactions-screen";

export const dynamic = "force-dynamic";

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground p-6 text-sm">
          Se încarcă tranzacțiile…
        </div>
      }
    >
      <TransactionsScreen />
    </Suspense>
  );
}
