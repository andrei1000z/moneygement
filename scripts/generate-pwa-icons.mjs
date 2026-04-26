// Generează cele 3 PNG-uri PWA din SVG inline cu sharp.
// Run: node scripts/generate-pwa-icons.mjs
//
// Output în public/: icon-192.png, icon-512.png, icon-maskable-512.png
//
// Design: fundal #0B0D10, "B" alb cu accent emerald #10b981 dedesubt.
// Maskable: același design cu 80% safe-zone (padding 10% pe fiecare latură).

import sharp from "sharp";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "..", "public");

const BG = "#0B0D10";
const FG = "#FAFAF7";
const ACCENT = "#10b981";

function svgIcon({ size, padding }) {
  // padding e procentaj din latura totală (pentru maskable e 0.10).
  const inset = Math.round(size * padding);
  const inner = size - inset * 2;

  // "B" stilizat: două bowl-uri cu spine drept.
  const cx = inset + inner / 2;
  const cy = inset + inner / 2;
  const fontSize = Math.round(inner * 0.62);

  // Cerc accent dedesubt — sugerează monedă.
  const coinR = Math.round(inner * 0.07);
  const coinX = inset + Math.round(inner * 0.7);
  const coinY = inset + Math.round(inner * 0.78);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <text
    x="${cx}"
    y="${cy}"
    fill="${FG}"
    font-family="Inter, system-ui, -apple-system, sans-serif"
    font-weight="800"
    font-size="${fontSize}"
    text-anchor="middle"
    dominant-baseline="central"
  >B</text>
  <circle cx="${coinX}" cy="${coinY}" r="${coinR}" fill="${ACCENT}"/>
</svg>`;
}

async function render(name, size, padding) {
  const svg = svgIcon({ size, padding });
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const out = resolve(OUT_DIR, name);
  await writeFile(out, png);
  console.log(`✓ ${name} (${size}×${size}, padding ${(padding * 100) | 0}%)`);
}

await mkdir(OUT_DIR, { recursive: true });
await render("icon-192.png", 192, 0);
await render("icon-512.png", 512, 0);
await render("icon-maskable-512.png", 512, 0.1);
console.log("Gata.");
