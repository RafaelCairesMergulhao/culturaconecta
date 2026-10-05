import { ActionError, login, logout, register } from "@/lib/server/actions";
import { withDb } from "@/lib/server/db";
import { clearToken, readToken, writeToken } from "@/lib/server/session";
import { toClient } from "@/lib/server/view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { action?: string };
    const action = body?.action;
    const current = await readToken();
    let nextToken = "";
    let clear = false;
    const state = await withDb((db) => {
      if (action === "login") {
        const result = login(db, body);
        nextToken = result.token;
        return toClient(db, result.user);
      }
      if (action === "register") {
        const result = register(db, body);
        nextToken = result.token;
        return toClient(db, result.user);
      }
      if (action === "logout") {
        logout(db, current);
        clear = true;
        return toClient(db, null);
      }
      throw new ActionError("Ação desconhecida.");
    });
    if (nextToken) await writeToken(nextToken, new URL(req.url).protocol === "https:");
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
    return Response.json({ error: "Não foi possível entrar agora." }, { status: 500 });
  }
}
