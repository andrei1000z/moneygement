import "server-only";

/**
 * Configurarea relying party (RP) pentru WebAuthn ceremonies.
 *
 * RP ID = domeniul (fără protocol/path). Pentru moneygement.vercel.app,
 * RP ID = "moneygement.vercel.app". RP ID NU se schimbă după primul
 * passkey, altfel passkey-urile vechi devin invalide. Pentru dev local,
 * folosim "localhost".
 *
 * Origin = URL complet (cu protocol). Permitem multiple origins (prod +
 * dev) pentru ca passkey-uri create local să funcționeze la deploy.
 */
function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://moneygement.vercel.app";
}

export function rpName(): string {
  return "Banii — Finanțe Personale";
}

export function rpId(): string {
  const url = new URL(siteUrl());
  return url.hostname;
}

export function expectedOrigin(): string {
  return siteUrl().replace(/\/$/, "");
}

/**
 * Pentru dezvoltare local, acceptă și http://localhost:3000.
 */
export function expectedOrigins(): string[] {
  const prod = expectedOrigin();
  if (prod.includes("localhost")) return [prod];
  return [prod, "http://localhost:3000", "http://127.0.0.1:3000"];
}
