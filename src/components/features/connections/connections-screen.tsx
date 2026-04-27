"use client";

import { useEffect, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Institution = { id: string; name: string };
type Connection = {
  id: string;
  institution_id: string;
  institution_name: string | null;
  status: "pending" | "active" | "expired" | "error" | "revoked";
  expires_at: string | null;
  last_synced_at: string | null;
  created_at: string;
};

type Props = {
  institutions: Institution[];
  connections: Connection[];
  flashError: string | null;
  flashConnected: string | null;
};

const STATUS_LABEL: Record<Connection["status"], string> = {
  pending: "În autorizare",
  active: "Activ",
  expired: "Expirat",
  error: "Eroare",
  revoked: "Revocat",
};

function expiryStatus(expiresAt: string | null): {
  label: string;
  warn: boolean;
} {
  if (!expiresAt) return { label: "—", warn: false };
  const now = Date.now();
  const exp = Date.parse(expiresAt);
  const days = Math.ceil((exp - now) / 86400000);
  if (days < 0) return { label: "Expirat", warn: true };
  if (days < 14) return { label: `Expiră în ${days} zile`, warn: true };
  return { label: `Expiră ${format(parseISO(expiresAt), "d MMM yyyy", { locale: ro })}`, warn: false };
}

export function ConnectionsScreen({
  institutions,
  connections,
  flashError,
  flashConnected,
}: Props) {
  const [selected, setSelected] = useState<string>(institutions[0]?.id ?? "");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (flashError) toast.error(`Conexiune eșuată: ${flashError}`);
    if (flashConnected) toast.success("Conectat cu succes");
  }, [flashError, flashConnected]);

  function startConnect() {
    if (!selected) return;
    start(async () => {
      const res = await fetch("/api/banking/start-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institution_id: selected }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error ?? "Nu am putut porni autentificarea.");
        return;
      }
      const json = (await res.json()) as { url: string };
      window.location.href = json.url;
    });
  }

  return (
    <div className="space-y-4">
      <section className="glass-thin rounded-[--radius-card] p-4">
        <h2 className="mb-3 text-sm font-semibold">Conectează un cont</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="text-muted-foreground mb-1 block text-xs uppercase tracking-wider">
              Bancă
            </label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="Alege banca" />
              </SelectTrigger>
              <SelectContent>
                {institutions.map((inst) => (
                  <SelectItem key={inst.id} value={inst.id}>
                    {inst.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={startConnect} disabled={!selected || pending}>
            {pending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Plus className="mr-2 size-4" />
            )}
            Conectează
          </Button>
        </div>
        <p className="text-muted-foreground mt-3 text-xs">
          Vei fi redirecționat la banca pentru autentificare (SCA — parolă +
          OTP). Banii nu primesc datele tale de login.
        </p>
      </section>

      <section className="glass-thin overflow-hidden rounded-[--radius-card]">
        <h2 className="border-b px-4 py-2.5 text-sm font-semibold">
          Conexiuni active ({connections.length})
        </h2>
        {connections.length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm">
            Niciuna încă. Folosește bara de mai sus ca să adaugi prima.
          </p>
        ) : (
          <ul className="divide-y">
            {connections.map((c) => {
              const exp = expiryStatus(c.expires_at);
              return (
                <li key={c.id} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Building2 className="text-muted-foreground size-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {c.institution_name ?? c.institution_id}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {STATUS_LABEL[c.status]} ·{" "}
                          {c.last_synced_at
                            ? `ultim sync ${format(parseISO(c.last_synced_at), "d MMM HH:mm", { locale: ro })}`
                            : "fără sync încă"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-xs",
                        exp.warn
                          ? "text-amber-600 dark:text-amber-300"
                          : "text-muted-foreground",
                      )}
                    >
                      {c.status === "active" ? (
                        exp.warn ? (
                          <span className="inline-flex items-center gap-1">
                            <AlertTriangle className="size-3" />
                            {exp.label}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="size-3 text-emerald-500" />
                            {exp.label}
                          </span>
                        )
                      ) : (
                        STATUS_LABEL[c.status]
                      )}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
