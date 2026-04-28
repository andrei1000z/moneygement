"use client";

import { useState, useTransition } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { Fingerprint, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deletePasskey } from "@/app/(dashboard)/settings/passkey-actions";
import { Button } from "@/components/ui/button";

type Passkey = {
  id: string;
  device_name: string | null;
  created_at: string;
  last_used_at: string | null;
};

export function PasskeyPanel({ initial }: { initial: Passkey[] }) {
  const [passkeys, setPasskeys] = useState(initial);
  const [registering, setRegistering] = useState(false);
  const [deleting, startDelete] = useTransition();

  async function addPasskey() {
    setRegistering(true);
    try {
      // 1) Get registration options
      const optsRes = await fetch("/api/auth/passkey/register-options", {
        method: "POST",
      });
      if (!optsRes.ok) {
        const err = await optsRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Nu pot iniția înregistrarea");
      }
      const opts = await optsRes.json();

      // 2) Browser WebAuthn ceremony
      const response = await startRegistration({ optionsJSON: opts });

      // 3) Verify on server
      const deviceName = guessDeviceName();
      const verifyRes = await fetch("/api/auth/passkey/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response, device_name: deviceName }),
      });
      if (!verifyRes.ok) {
        const err = await verifyRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Verificare eșuată");
      }

      toast.success("Passkey adăugat", {
        description: `Acum te poți conecta de pe ${deviceName} fără email.`,
      });
      // Optimistic insert until next refetch.
      setPasskeys((prev) => [
        {
          id: `tmp-${Date.now()}`,
          device_name: deviceName,
          created_at: new Date().toISOString(),
          last_used_at: null,
        },
        ...prev,
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Eroare neașteptată";
      // Cancel/timeout user-initiated → nu arătăm toast deranjant.
      if (!msg.toLowerCase().includes("not allowed") && !msg.toLowerCase().includes("aborted")) {
        toast.error("Nu am putut adăuga passkey-ul", { description: msg });
      }
    } finally {
      setRegistering(false);
    }
  }

  function handleDelete(id: string) {
    if (!confirm("Ștergi passkey-ul? Va trebui să-l reînregistrezi de pe device.")) return;
    startDelete(async () => {
      const res = await deletePasskey(id);
      if (!res.ok) {
        toast.error("Ștergere eșuată", { description: res.error });
        return;
      }
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
      toast.success("Passkey șters");
    });
  }

  return (
    <section className="glass-thin rounded-(--radius-card) p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="bg-(--accent-blue)/12 text-(--accent-blue) flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Fingerprint className="size-5" aria-hidden strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-base font-semibold">Passkey-uri</h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Login cu Face ID, Touch ID sau Windows Hello — fără email, fără
              parolă.
            </p>
          </div>
        </div>
        <Button
          variant="eu"
          size="sm"
          onClick={addPasskey}
          disabled={registering}
        >
          {registering ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Plus className="mr-2 size-4" />
          )}
          Adaugă
        </Button>
      </div>

      {passkeys.length === 0 ? (
        <p className="text-muted-foreground mt-4 text-sm">
          Niciun passkey configurat. Adaugă unul ca să te conectezi instant data
          viitoare.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {passkeys.map((p) => (
            <li
              key={p.id}
              className="bg-(--surface-tint-faint) flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
            >
              <div className="flex items-center gap-3">
                <KeyRound className="text-muted-foreground size-4" aria-hidden />
                <div>
                  <p className="text-sm font-medium">
                    {p.device_name ?? "Passkey"}
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    Adăugat{" "}
                    {new Date(p.created_at).toLocaleDateString("ro-RO", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {p.last_used_at
                      ? ` · ultima dată folosit ${new Date(
                          p.last_used_at,
                        ).toLocaleDateString("ro-RO", {
                          day: "numeric",
                          month: "short",
                        })}`
                      : " · nefolosit încă"}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleDelete(p.id)}
                disabled={deleting}
                aria-label="Șterge passkey"
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function guessDeviceName(): string {
  if (typeof window === "undefined") return "Acest dispozitiv";
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Mac/i.test(ua)) return "Mac";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "Acest dispozitiv";
}
