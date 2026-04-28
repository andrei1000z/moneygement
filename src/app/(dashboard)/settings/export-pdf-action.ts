"use server";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { createClient } from "@/lib/supabase/server";

export type PdfExportResult =
  | { ok: true; filename: string; base64: string }
  | { ok: false; error: string };

const MM = 2.834;
const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN_X = 18 * MM;
const MARGIN_Y = 18 * MM;

const COLOR_TEXT = rgb(0.12, 0.12, 0.14);
const COLOR_MUTED = rgb(0.4, 0.4, 0.46);
const COLOR_BLUE = rgb(0.0, 0.2, 0.6);
const COLOR_LINE = rgb(0.85, 0.85, 0.88);
const COLOR_POS = rgb(0.18, 0.55, 0.32);
const COLOR_NEG = rgb(0.78, 0.18, 0.18);

function formatRon(minor: number): string {
  const value = minor / 100;
  return new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1).replace(".", ",")}%`;
}

function escapePdfText(input: string): string {
  // pdf-lib serializează corect UTF-8 dar nu suportă caractere out of WinAnsi
  // în StandardFonts. Diacriticele românești sunt în Latin Extended A.
  // Strategy: rămânem pe Helvetica și înlocuim diacritice cu echivalente.
  return input
    .replace(/[ăâ]/g, "a")
    .replace(/[ĂÂ]/g, "A")
    .replace(/î/g, "i")
    .replace(/Î/g, "I")
    .replace(/ș|ş/g, "s")
    .replace(/Ș|Ş/g, "S")
    .replace(/ț|ţ/g, "t")
    .replace(/Ț|Ţ/g, "T");
}

export async function exportYearlyPdf(
  year: number,
): Promise<PdfExportResult> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { ok: false, error: "An invalid" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_household, full_name")
    .eq("id", user.id)
    .single();
  if (!profile?.active_household) {
    return { ok: false, error: "Niciun household activ" };
  }

  const householdId = profile.active_household;
  const { data: household } = await supabase
    .from("households")
    .select("name, base_currency")
    .eq("id", householdId)
    .single();

  const fromIso = `${year}-01-01`;
  const toIso = `${year}-12-31`;

  const { data: txs, error: txErr } = await supabase
    .from("transactions")
    .select("occurred_on, payee, amount, base_amount, currency, category_id, is_transfer, status")
    .eq("household_id", householdId)
    .gte("occurred_on", fromIso)
    .lte("occurred_on", toIso)
    .order("occurred_on", { ascending: false });
  if (txErr) return { ok: false, error: txErr.message };

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("household_id", householdId);
  const catName = new Map<string, string>(
    (categories ?? []).map((c) => [c.id, c.name as string]),
  );

  const all = (txs ?? []).filter((t) => !t.is_transfer && t.status !== "void");
  let income = 0;
  let expense = 0;
  const byCategory = new Map<string, number>();
  const byPayee = new Map<string, number>();
  for (const t of all) {
    const baseAmt = Number(t.base_amount ?? t.amount);
    if (baseAmt > 0) income += baseAmt;
    else expense += -baseAmt;
    const cat = t.category_id ? catName.get(t.category_id) ?? "Necategorisit" : "Necategorisit";
    if (baseAmt < 0) {
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + -baseAmt);
    }
    const payee = (t.payee ?? "—").trim() || "—";
    if (baseAmt < 0) {
      byPayee.set(payee, (byPayee.get(payee) ?? 0) + -baseAmt);
    }
  }
  const netSavings = income - expense;
  const savingsRate = income > 0 ? netSavings / income : 0;

  const topCategories = Array.from(byCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const topPayees = Array.from(byPayee.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN_Y;

  const drawText = (
    text: string,
    x: number,
    yPos: number,
    opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> } = {},
  ) => {
    page.drawText(escapePdfText(text), {
      x,
      y: yPos,
      size: opts.size ?? 10,
      font: opts.bold ? fontBold : font,
      color: opts.color ?? COLOR_TEXT,
    });
  };

  const drawLine = (yPos: number) => {
    page.drawLine({
      start: { x: MARGIN_X, y: yPos },
      end: { x: PAGE_W - MARGIN_X, y: yPos },
      thickness: 0.5,
      color: COLOR_LINE,
    });
  };

  const newPage = () => {
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN_Y;
  };

  const ensureSpace = (h: number) => {
    if (y - h < MARGIN_Y) newPage();
  };

  // Header
  drawText(`Banii — Raport anual ${year}`, MARGIN_X, y, {
    size: 22,
    bold: true,
    color: COLOR_BLUE,
  });
  y -= 28;
  drawText(
    `${household?.name ?? "Gospodărie"} · ${profile.full_name ?? user.email ?? ""}`,
    MARGIN_X,
    y,
    { size: 11, color: COLOR_MUTED },
  );
  y -= 14;
  drawText(
    `Generat ${new Date().toLocaleString("ro-RO")}`,
    MARGIN_X,
    y,
    { size: 9, color: COLOR_MUTED },
  );
  y -= 22;
  drawLine(y);
  y -= 22;

  // KPIs
  drawText("Sumar", MARGIN_X, y, { size: 14, bold: true });
  y -= 18;
  const baseCurrency = household?.base_currency ?? "RON";
  const kpiRows = [
    ["Venit total", formatRon(income), baseCurrency, COLOR_POS],
    ["Cheltuieli totale", formatRon(expense), baseCurrency, COLOR_NEG],
    ["Net savings", formatRon(netSavings), baseCurrency, netSavings >= 0 ? COLOR_POS : COLOR_NEG],
    ["Rată economisire", formatPct(savingsRate), "", COLOR_TEXT],
    ["Tranzacții", String(all.length), "", COLOR_TEXT],
  ] as const;
  for (const [label, value, unit, color] of kpiRows) {
    drawText(label, MARGIN_X, y, { size: 10, color: COLOR_MUTED });
    drawText(`${value}${unit ? " " + unit : ""}`, MARGIN_X + 200, y, {
      size: 11,
      bold: true,
      color,
    });
    y -= 16;
  }
  y -= 8;
  drawLine(y);
  y -= 22;

  // Top categorii
  drawText("Top 10 categorii (cheltuieli)", MARGIN_X, y, { size: 14, bold: true });
  y -= 18;
  if (topCategories.length === 0) {
    drawText("Niciuna.", MARGIN_X, y, { size: 10, color: COLOR_MUTED });
    y -= 16;
  } else {
    for (const [name, value] of topCategories) {
      ensureSpace(16);
      drawText(name, MARGIN_X, y, { size: 10 });
      drawText(`${formatRon(value)} ${baseCurrency}`, MARGIN_X + 380, y, {
        size: 10,
        bold: true,
      });
      y -= 14;
    }
  }
  y -= 8;
  drawLine(y);
  y -= 22;

  // Top payees
  drawText("Top 5 merchanți", MARGIN_X, y, { size: 14, bold: true });
  y -= 18;
  if (topPayees.length === 0) {
    drawText("Niciun merchant.", MARGIN_X, y, { size: 10, color: COLOR_MUTED });
    y -= 16;
  } else {
    for (const [name, value] of topPayees) {
      ensureSpace(16);
      drawText(name.slice(0, 60), MARGIN_X, y, { size: 10 });
      drawText(`${formatRon(value)} ${baseCurrency}`, MARGIN_X + 380, y, {
        size: 10,
        bold: true,
      });
      y -= 14;
    }
  }
  y -= 12;
  drawLine(y);
  y -= 22;

  // Tranzacții (max 200)
  drawText("Tranzacții (până la 200)", MARGIN_X, y, { size: 14, bold: true });
  y -= 18;
  drawText("Data", MARGIN_X, y, { size: 9, bold: true, color: COLOR_MUTED });
  drawText("Beneficiar", MARGIN_X + 70, y, { size: 9, bold: true, color: COLOR_MUTED });
  drawText("Categorie", MARGIN_X + 290, y, { size: 9, bold: true, color: COLOR_MUTED });
  drawText("Sumă", PAGE_W - MARGIN_X - 70, y, { size: 9, bold: true, color: COLOR_MUTED });
  y -= 12;
  drawLine(y);
  y -= 12;

  const limited = (txs ?? []).slice(0, 200);
  for (const t of limited) {
    ensureSpace(13);
    if (y === PAGE_H - MARGIN_Y) {
      // pagină nouă — re-desenează header tabel
      drawText(`Banii — Raport ${year} (continuare)`, MARGIN_X, y, {
        size: 12,
        bold: true,
        color: COLOR_BLUE,
      });
      y -= 18;
      drawText("Data", MARGIN_X, y, { size: 9, bold: true, color: COLOR_MUTED });
      drawText("Beneficiar", MARGIN_X + 70, y, { size: 9, bold: true, color: COLOR_MUTED });
      drawText("Categorie", MARGIN_X + 290, y, { size: 9, bold: true, color: COLOR_MUTED });
      drawText("Sumă", PAGE_W - MARGIN_X - 70, y, { size: 9, bold: true, color: COLOR_MUTED });
      y -= 12;
      drawLine(y);
      y -= 12;
    }

    const amt = Number(t.amount);
    const isIncome = amt > 0;
    drawText(t.occurred_on, MARGIN_X, y, { size: 9 });
    drawText(
      (t.payee ?? "—").slice(0, 36),
      MARGIN_X + 70,
      y,
      { size: 9 },
    );
    drawText(
      (t.category_id ? catName.get(t.category_id) ?? "—" : "—").slice(0, 22),
      MARGIN_X + 290,
      y,
      { size: 9, color: COLOR_MUTED },
    );
    const sign = isIncome ? "+" : "";
    drawText(
      `${sign}${formatRon(amt)} ${t.currency}`,
      PAGE_W - MARGIN_X - 90,
      y,
      { size: 9, bold: true, color: isIncome ? COLOR_POS : COLOR_TEXT },
    );
    y -= 12;
  }

  if ((txs ?? []).length > 200) {
    ensureSpace(20);
    drawText(
      `… și încă ${(txs ?? []).length - 200} tranzacții. Folosește exportul CSV pentru lista completă.`,
      MARGIN_X,
      y - 4,
      { size: 8, color: COLOR_MUTED },
    );
  }

  const bytes = await pdfDoc.save();
  const base64 = Buffer.from(bytes).toString("base64");

  return {
    ok: true,
    filename: `banii-raport-${year}.pdf`,
    base64,
  };
}
