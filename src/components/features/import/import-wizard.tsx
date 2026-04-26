"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  CheckCircle2,
  FileUp,
  Loader2,
  RotateCcw,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { bulkImport } from "@/app/(dashboard)/import/actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  detectFormat,
  PARSER_MAP,
  type BankFormat,
  type ParsedTransaction,
} from "@/lib/banking/csv-parsers";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type Account = {
  id: string;
  name: string;
  currency: string;
  type: string;
};

type Props = { accounts: Account[] };

const FORMAT_LABELS: Record<BankFormat, string> = {
  bt24: "Banca Transilvania (BT24)",
  bcr: "BCR George",
  ing: "ING Home'Bank",
  revolut: "Revolut",
  cec: "CEC Mobile",
  raiffeisen: "Raiffeisen Smart Mobile",
};

type Stage = "upload" | "preview" | "done";

export function ImportWizard({ accounts }: Props) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [stage, setStage] = useState<Stage>("upload");
  const [csv, setCsv] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [bank, setBank] = useState<BankFormat | null>(null);
  const [parsed, setParsed] = useState<ParsedTransaction[]>([]);
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ?? "");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{
    inserted: number;
    duplicates: number;
    errors: number;
  } | null>(null);

  const account = accounts.find((a) => a.id === accountId) ?? null;

  const summary = useMemo(() => {
    if (parsed.length === 0)
      return { count: 0, totalIn: 0n, totalOut: 0n, currencies: new Set<string>() };
    const currencies = new Set<string>();
    let totalIn = 0n;
    let totalOut = 0n;
    for (const tx of parsed) {
      currencies.add(tx.currency);
      if (tx.amount > 0n) totalIn += tx.amount;
      else totalOut += tx.amount;
    }
    return { count: parsed.length, totalIn, totalOut, currencies };
  }, [parsed]);

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setCsv(text);
      setFilename(file.name);
      const detected = detectFormat(text);
      const chosen = detected ?? "bt24";
      setBank(chosen);
      try {
        const result = PARSER_MAP[chosen].parse(text);
        setParsed(result);
        setStage("preview");
        if (!detected) {
          toast.warning("Format necunoscut", {
            description:
              "Am ghicit BT24. Schimbă manual din lista de mai jos dacă nu se potrivește.",
          });
        }
      } catch (e) {
        toast.error("Eroare la parsare", {
          description: e instanceof Error ? e.message : String(e),
        });
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function reparse(nextBank: BankFormat) {
    if (!csv) return;
    setBank(nextBank);
    try {
      const result = PARSER_MAP[nextBank].parse(csv);
      setParsed(result);
    } catch (e) {
      toast.error("Eroare la re-parsare", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  }

  function reset() {
    setStage("upload");
    setCsv("");
    setFilename("");
    setBank(null);
    setParsed([]);
    setResult(null);
  }

  function submit() {
    if (!accountId || !bank || parsed.length === 0) return;
    start(async () => {
      const res = await bulkImport({
        account_id: accountId,
        bank,
        transactions: parsed.map((tx) => ({
          date: tx.date,
          // BigInt nu se serializează în JSON. Trimitem string.
          amount_minor: tx.amount.toString(),
          currency: tx.currency,
          payee: tx.payee ?? null,
          notes: tx.notes ?? null,
          external_id: tx.external_id,
        })),
      });

      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setResult({
        inserted: res.inserted,
        duplicates: res.duplicates,
        errors: res.errors,
      });
      setStage("done");
      toast.success(
        `${res.inserted} tranzacții importate${
          res.duplicates > 0 ? ` (${res.duplicates} duplicate ignorate)` : ""
        }.`,
      );
    });
  }

  // ---------- UI ----------------------------------------------------------

  if (stage === "done" && result) {
    return (
      <div className="border-border/60 bg-card flex flex-col items-center gap-4 rounded-xl border p-8 text-center">
        <CheckCircle2
          className="size-12 text-emerald-500 dark:text-emerald-400"
          aria-hidden
        />
        <h2 className="text-xl font-semibold">Import gata</h2>
        <div className="grid grid-cols-3 gap-6 text-sm">
          <div>
            <p className="text-2xl font-bold tabular-nums">{result.inserted}</p>
            <p className="text-muted-foreground text-xs">Importate</p>
          </div>
          <div>
            <p className="text-muted-foreground text-2xl font-bold tabular-nums">
              {result.duplicates}
            </p>
            <p className="text-muted-foreground text-xs">Duplicate</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums text-red-500">
              {result.errors}
            </p>
            <p className="text-muted-foreground text-xs">Erori</p>
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <Button onClick={reset}>
            <Upload className="mr-2 size-4" /> Importă alt fișier
          </Button>
          <Button variant="outline" asChild>
            <a href="/transactions">Vezi tranzacțiile</a>
          </Button>
        </div>
      </div>
    );
  }

  if (stage === "preview") {
    const preview = parsed.slice(0, 10);
    return (
      <div className="space-y-4">
        <div className="border-border/60 bg-card flex flex-col gap-3 rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">
                Fișier
              </p>
              <p className="text-sm font-medium">{filename}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={reset}>
              <RotateCcw className="mr-1.5 size-3.5" /> Schimbă
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs uppercase tracking-wider">
                Bancă
              </label>
              <Select
                value={bank ?? undefined}
                onValueChange={(v) => reparse(v as BankFormat)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    ["bt24", "bcr", "ing", "revolut", "cec", "raiffeisen"] as const
                  ).map((b) => (
                    <SelectItem key={b} value={b}>
                      {FORMAT_LABELS[b]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs uppercase tracking-wider">
                Cont destinație
              </label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Alege contul" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} · {a.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground text-xs uppercase tracking-wider">
                Detectate
              </p>
              <p className="mt-1 font-semibold tabular-nums">
                {summary.count} tranzacții
              </p>
              <p className="text-muted-foreground text-xs">
                {Array.from(summary.currencies).join(", ") || "—"}
              </p>
            </div>
          </div>
          {account && account.currency &&
            !summary.currencies.has(account.currency) ? (
            <p className="text-amber-600 text-xs dark:text-amber-300">
              Atenție: contul e în {account.currency} dar tranzacțiile
              sunt în {Array.from(summary.currencies).join(", ")}.
              Verifică dacă e contul corect.
            </p>
          ) : null}
        </div>

        <div className="border-border/60 bg-card overflow-hidden rounded-xl border">
          <div className="text-muted-foreground border-b px-3 py-2 text-xs uppercase tracking-wider">
            Primele 10 din {summary.count}
          </div>
          {preview.length === 0 ? (
            <p className="text-muted-foreground p-4 text-sm">
              Nicio tranzacție recunoscută. Verifică dacă banca selectată e
              corectă sau dacă fișierul are headerul așteptat.
            </p>
          ) : (
            <ul className="divide-y">
              {preview.map((tx, i) => (
                <li
                  key={`${tx.external_id}-${i}`}
                  className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {tx.payee ?? tx.notes ?? "—"}
                    </p>
                    <p className="text-muted-foreground truncate text-[11px]">
                      {tx.date} · {tx.notes?.slice(0, 60) ?? ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "tabular-nums shrink-0 text-right font-semibold",
                      tx.amount > 0n
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-foreground",
                    )}
                  >
                    {tx.amount > 0n ? "+" : ""}
                    {formatMoney(Number(tx.amount), tx.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={reset} disabled={pending}>
            Anulează
          </Button>
          <Button
            onClick={submit}
            disabled={pending || parsed.length === 0 || !accountId}
          >
            {pending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Upload className="mr-2 size-4" />
            )}
            Importă {summary.count}
          </Button>
        </div>
      </div>
    );
  }

  // stage = "upload"
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => fileInput.current?.click()}
      className={cn(
        "border-border/60 bg-card hover:bg-accent/40 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 text-center transition",
      )}
    >
      <FileUp className="text-muted-foreground size-10" aria-hidden />
      <div>
        <p className="text-base font-medium">
          Trage fișierul aici sau apasă să selectezi
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          .csv exportat din BT24, BCR George, ING Home&apos;Bank, Revolut,
          CEC sau Raiffeisen
        </p>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
    </div>
  );
}
