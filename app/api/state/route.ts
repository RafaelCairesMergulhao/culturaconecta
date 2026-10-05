import { readDb } from "@/lib/server/db";
import { readToken } from "@/lib/server/session";
import { toClient, userFromToken } from "@/lib/server/view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const token = await readToken();
  const state = await readDb((db) => toClient(db, userFromToken(db, token)));
  return Response.json(state, { headers: { "Cache-Control": "no-store" } });
}
