"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Key, Loader2, Plus, Terminal, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createPat,
  revokePat,
} from "@/app/(dashboard)/settings/pat-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";

type Pat = {
  id: string;
  name: string;
  token_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
};

type Props = {
  initial: Pat[];
};

export function PatPanel({ initial }: Props) {
  const [tokens, setTokens] = useState(initial);
  const [createOpen, setCreateOpen] = useState(false);
  const [newToken, setNewToken] = useState<{ token: string; name: string } | null>(
    null,
  );
  const [pending, start] = useTransition();

  function handleRevoke(id: string) {
    if (!confirm("Revoci token-ul? Aplicațiile care îl folosesc nu se vor mai putea conecta.")) return;
    start(async () => {
      const res = await revokePat(id);
      if (!res.ok) {
        toast.error("Revocare eșuată", { description: res.error });
        return;
      }
      setTokens((prev) => prev.filter((p) => p.id !== id));
      toast.success("Token revocat");
    });
  }

  return (
    <section className="glass-thin rounded-(--radius-card) p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="bg-(--accent-yellow)/15 text-(--accent-blue) flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Terminal className="size-5" aria-hidden strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-base font-semibold">API Access</h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Personal Access Tokens pentru MCP server (Claude Desktop), CLI
              sau alte integrări externe.
            </p>
          </div>
        </div>
        <Button variant="eu" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" />
          Generează
        </Button>
      </div>

      {tokens.length === 0 ? (
        <p className="text-muted-foreground mt-4 text-sm">
          Niciun token generat. Creează unul pentru a conecta Claude Desktop
          sau scripturi proprii.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {tokens.map((t) => (
            <li
              key={t.id}
              className="bg-(--surface-tint-faint) flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Key className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <span className="text-muted-foreground bg-(--surface-tint) rounded-full px-2 py-0.5 font-mono text-[10px]">
                    {t.token_prefix}…
                  </span>
                  {t.scopes.includes("write") ? (
                    <span className="bg-(--accent-blue)/15 text-(--accent-blue) rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase">
                      write
                    </span>
                  ) : (
                    <span className="text-muted-foreground bg-(--surface-tint) rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase">
                      read
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  Creat{" "}
                  {new Date(t.created_at).toLocaleDateString("ro-RO", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {t.last_used_at
                    ? ` · folosit ultima dată ${new Date(t.last_used_at).toLocaleDateString("ro-RO", { day: "numeric", month: "short" })}`
                    : " · nefolosit"}
                  {t.expires_at
                    ? ` · expiră ${new Date(t.expires_at).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" })}`
                    : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleRevoke(t.id)}
                disabled={pending}
                aria-label="Revocă token"
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <CreateSheet
        open={createOpen}
        onOpenChange={(v) => {
          setCreateOpen(v);
          if (!v) setNewToken(null);
        }}
        onCreated={(token, name, prefix, id) => {
          setNewToken({ token, name });
          setTokens((prev) => [
            {
              id,
              name,
              token_prefix: prefix,
              scopes: ["read"],
              last_used_at: null,
              expires_at: null,
              created_at: new Date().toISOString(),
            },
            ...prev,
          ]);
        }}
        newToken={newToken}
        clearNewToken={() => setNewToken(null)}
      />
    </section>
  );
}

function CreateSheet({
  open,
  onOpenChange,
  onCreated,
  newToken,
  clearNewToken,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (token: string, name: string, prefix: string, id: string) => void;
  newToken: { token: string; name: string } | null;
  clearNewToken: () => void;
}) {
  const [pending, start] = useTransition();
  const [name, setName] = useState("Claude Desktop");
  const [allowWrite, setAllowWrite] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState("");
  const [copied, setCopied] = useState(false);

  function reset() {
    setName("Claude Desktop");
    setAllowWrite(false);
    setExpiresInDays("");
    setCopied(false);
    clearNewToken();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const days = expiresInDays.trim() ? parseInt(expiresInDays, 10) : undefined;
    start(async () => {
      const res = await createPat({
        name: name.trim(),
        scopes: allowWrite ? ["read", "write"] : ["read"],
        expires_in_days: days,
      });
      if (!res.ok) {
        toast.error("Generare eșuată", { description: res.error });
        return;
      }
      onCreated(res.data.token, name.trim(), res.data.prefix, res.data.id);
      toast.success("Token generat", {
        description: "Copiază-l acum — nu va mai fi afișat.",
      });
    });
  }

  async function copy() {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <SheetContent side="bottom" className="max-h-[90svh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>
            {newToken ? "Token generat" : "Generează token nou"}
          </SheetTitle>
          <SheetDescription>
            {newToken
              ? "Copiază token-ul acum. Nu va mai fi afișat după închidere."
              : "Personal Access Token pentru autentificare API externă."}
          </SheetDescription>
        </SheetHeader>

        {newToken ? (
          <div className="space-y-4 px-4 py-6">
            <div className="bg-(--surface-tint) rounded-xl p-4 font-mono text-xs break-all">
              {newToken.token}
            </div>
            <div className="flex gap-2">
              <Button onClick={copy} variant="eu" className="flex-1">
                {copied ? (
                  <>
                    <Check className="mr-2 size-4" /> Copiat
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 size-4" /> Copiază token
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Închide
              </Button>
            </div>
            <div className="bg-(--accent-yellow)/10 text-(--accent-navy) dark:text-(--accent-yellow) rounded-xl p-3 text-xs">
              <strong>Important:</strong> Acest token nu va mai fi afișat. Dacă
              îl pierzi, generează altul.
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 px-4 pb-6">
            <div>
              <Label htmlFor="pat-name" className="mb-1.5 block">
                Nume
              </Label>
              <Input
                id="pat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Claude Desktop, CLI dev…"
                maxLength={80}
                required
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-(--glass-border) px-3 py-2">
              <div>
                <Label className="text-sm font-medium">Permite write</Label>
                <p className="text-muted-foreground text-xs">
                  Token-ul poate adăuga / modifica tranzacții. Lasă off pentru
                  read-only.
                </p>
              </div>
              <Switch checked={allowWrite} onCheckedChange={setAllowWrite} />
            </div>
            <div>
              <Label htmlFor="pat-expires" className="mb-1.5 block">
                Expiră în (zile, opțional)
              </Label>
              <Input
                id="pat-expires"
                type="number"
                min={1}
                max={365}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                placeholder="90"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                Lasă gol pentru token fără expirare. Recomandat: 90 zile.
              </p>
            </div>
            <Button
              type="submit"
              variant="eu"
              disabled={pending}
              className="w-full"
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Generez…
                </>
              ) : (
                "Generează token"
              )}
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
