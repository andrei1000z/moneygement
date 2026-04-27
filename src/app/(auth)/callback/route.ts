import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Auth callback. Două fluxuri posibile, în funcție de configurarea
 * email template-ului în Supabase:
 *
 *   PKCE (link cu `?code=xxx`)
 *     - generat automat când `signInWithOtp` rulează cu flow-ul default
 *       din `@supabase/ssr`
 *     - se folosește `exchangeCodeForSession`
 *
 *   OTP magic-link (link cu `?token_hash=xxx&type=magiclink`)
 *     - default în template-ul email Supabase, când e folosit
 *       `{{ .ConfirmationURL }}` direct
 *     - se folosește `verifyOtp`
 *
 * Acceptăm ambele ca să fie robust indiferent cum e setat template-ul în
 * Supabase Dashboard (Auth → Email Templates).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  // Redirectul către `next` trebuie să fie un path local, nu un URL
  // arbitrar (mitigarea open-redirect).
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.redirect(`${origin}/login?error=supabase_not_configured`);
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`,
      );
    }
    return NextResponse.redirect(`${origin}${safeNext}`);
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`,
      );
    }
    return NextResponse.redirect(`${origin}${safeNext}`);
  }

  return NextResponse.redirect(`${origin}/login?error=missing_code`);
}
