"use client";

import { useTransition } from "react";
import { Download, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { exportData } from "@/app/(dashboard)/settings/export-actions";
import { Button } from "@/components/ui/button";

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExportPanel() {
  const [pending, start] = useTransition();

  function exportAs(format: "csv" | "json") {
    start(async () => {
      const res = await exportData(format);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const mime = format === "csv" ? "text/csv;charset=utf-8" : "application/json";
      downloadFile(res.filename, res.content, mime);
      toast.success(`Descărcat ${res.filename}`);
    });
  }

  return (
    <div className="space-y-4">
      <section className="border-border/60 bg-card rounded-xl border p-4">
        <h3 className="mb-2 text-sm font-semibold">Export date</h3>
        <p className="text-muted-foreground text-xs">
          Toate datele gospodăriei. CSV doar tranzacții; JSON include
          conturi, categorii, bugete, goals, recurring și rules.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => exportAs("csv")}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-2 size-4" />
            )}
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => exportAs("json")}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <FileJson className="mr-2 size-4" />
            )}
            Export JSON
          </Button>
        </div>
      </section>

      <section className="border-border/60 bg-card rounded-xl border p-4">
        <h3 className="mb-2 text-sm font-semibold">PDF (în curând)</h3>
        <p className="text-muted-foreground text-xs">
          Generare PDF cu rezumat anual va veni în V2. Pentru moment
          poți printa pagina /insights din browser cu Ctrl+P → Salvează ca PDF.
        </p>
        <Button variant="ghost" size="sm" className="mt-2" disabled>
          <Download className="mr-2 size-4" /> Indisponibil
        </Button>
      </section>
    </div>
  );
}
