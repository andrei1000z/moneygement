"use client";

import { useState, useTransition } from "react";
import { FileJson, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { exportData } from "@/app/(dashboard)/settings/export-actions";
import { exportYearlyPdf } from "@/app/(dashboard)/settings/export-pdf-action";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

function downloadPdfBase64(filename: string, base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/pdf" });
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
  const [pdfPending, startPdf] = useTransition();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<string>(String(currentYear));

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

  function exportPdf() {
    startPdf(async () => {
      const res = await exportYearlyPdf(parseInt(year, 10));
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      downloadPdfBase64(res.filename, res.base64);
      toast.success(`Descărcat ${res.filename}`);
    });
  }

  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-4">
      <section className="glass-thin rounded-(--radius-card) p-4">
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

      <section className="glass-thin rounded-(--radius-card) p-4">
        <h3 className="mb-2 text-sm font-semibold">Raport anual PDF</h3>
        <p className="text-muted-foreground text-xs">
          Sumar pe an cu KPIs, top categorii, top merchanți și ultimele 200
          tranzacții. Format ro-RO, A4.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-32">
            <Label htmlFor="pdf-year" className="mb-1.5 block">
              An
            </Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger id="pdf-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="eu" onClick={exportPdf} disabled={pdfPending}>
            {pdfPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <FileText className="mr-2 size-4" />
            )}
            Export PDF
          </Button>
        </div>
      </section>
    </div>
  );
}
