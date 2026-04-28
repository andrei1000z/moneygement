"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Best-effort logging — Vercel runtime logs vor avea stack-ul.
    console.error("[dashboard/error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-10 text-center">
      <div className="bg-destructive/10 text-destructive flex size-14 items-center justify-center rounded-full">
        <AlertTriangle className="size-6" aria-hidden />
      </div>
      <h2 className="mt-4 text-xl font-semibold tracking-tight">
        Pagina nu a încărcat
      </h2>
      <p className="text-muted-foreground mt-2 text-sm">
        A apărut o eroare neașteptată. Reîncărcă, sau scrie-mi codul de mai jos.
      </p>
      {error.digest ? (
        <code className="bg-(--surface-tint) text-foreground mt-3 inline-block rounded-full px-3 py-1 font-mono text-[11px]">
          {error.digest}
        </code>
      ) : null}
      {error.message ? (
        <p className="text-muted-foreground mt-3 max-w-sm break-words text-xs">
          {error.message}
        </p>
      ) : null}
      <div className="mt-5 flex gap-2">
        <Button variant="eu" onClick={reset}>
          <RotateCw className="mr-2 size-4" aria-hidden />
          Reîncearcă
        </Button>
        <Button variant="outline" asChild>
          <a href="/">Mergi acasă</a>
        </Button>
      </div>
    </div>
  );
}
