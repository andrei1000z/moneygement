import "server-only";

import { NextResponse } from "next/server";

import { authenticatePat, requireScope, type PatContext } from "./auth";

export type PatRouteHandler = (
  req: Request,
  ctx: PatContext,
) => Promise<Response | NextResponse>;

/**
 * Wrapper care:
 *   1. extrage Bearer token din Authorization header
 *   2. validează contra DB
 *   3. opcional verifică scope ('read' / 'write')
 *   4. apelează handler-ul cu PatContext popular
 *
 * Returnează 401 dacă auth eșuează, 403 dacă scope insuficient.
 */
export function withPat(
  handler: PatRouteHandler,
  options: { requireWrite?: boolean } = {},
) {
  return async (req: Request) => {
    const ctx = await authenticatePat(req.headers.get("authorization"));
    if (!ctx) {
      return NextResponse.json(
        { error: "Unauthorized — Bearer token invalid sau expirat" },
        { status: 401 },
      );
    }
    if (options.requireWrite && !requireScope(ctx, "write")) {
      return NextResponse.json(
        { error: "Forbidden — token-ul nu are scope 'write'" },
        { status: 403 },
      );
    }
    return handler(req, ctx);
  };
}
