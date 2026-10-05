import { readDb } from "@/lib/server/db";
import { lookupMapa, MapaError } from "@/lib/server/mapa";
import { readToken } from "@/lib/server/session";
import { userFromToken } from "@/lib/server/view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = await readToken();
  const me = await readDb((db) => userFromToken(db, token));
  if (!me) return Response.json({ error: "Entre na sua conta para buscar o Mapa Cultural." }, { status: 401 });

  let query = "";
  try {
    const body = (await req.json()) as { query?: unknown; url?: unknown };
    query = typeof body.query === "string" ? body.query : typeof body.url === "string" ? body.url : "";
  } catch {
    return Response.json({ error: "Pedido inválido." }, { status: 400 });
  }

  try {
    const result = await lookupMapa(query);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof MapaError ? error.message : "Não foi possível ler o Mapa Cultural.";
    return Response.json({ error: message }, { status: 400 });
  }
}
