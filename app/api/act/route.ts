import { ActionError, performAction } from "@/lib/server/actions";
import { withDb } from "@/lib/server/db";
import { clearToken, readToken } from "@/lib/server/session";
import { toClient, userFromToken } from "@/lib/server/view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { action?: string };
    const token = await readToken();
    const clear = body?.action === "deleteAccount";
    const state = await withDb((db) => {
      const me = userFromToken(db, token);
      performAction(db, me, body);
      return toClient(db, clear ? null : userFromToken(db, token));
    });
    if (clear) await clearToken();
    return Response.json({ state }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ActionError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
      return Response.json({ error: "Pedido inválido." }, { status: 400 });
    }
    console.error(error);
    return Response.json({ error: "Não foi possível concluir agora." }, { status: 500 });
  }
}
