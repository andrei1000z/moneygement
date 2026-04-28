import "server-only";

import { NextResponse } from "next/server";

import { withPat } from "@/lib/pat/handler";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returnează info despre user-ul autentificat + household. Util pentru
 * MCP server să-și seteze context la prima conexiune.
 */
export const GET = withPat(async (_req, ctx) => {
  const supabase = createAdminClient();
  const [{ data: profile }, { data: household }, { data: user }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, language, default_currency")
      .eq("id", ctx.userId)
      .single(),
    supabase
      .from("households")
      .select("id, name, base_currency")
      .eq("id", ctx.householdId)
      .single(),
    supabase.auth.admin.getUserById(ctx.userId),
  ]);

  return NextResponse.json({
    user: {
      id: ctx.userId,
      email: user?.user?.email ?? null,
      full_name: profile?.full_name ?? null,
      language: profile?.language ?? "ro",
    },
    household: {
      id: household?.id ?? null,
      name: household?.name ?? null,
      base_currency: household?.base_currency ?? "RON",
    },
    scopes: ctx.scopes,
  });
});
