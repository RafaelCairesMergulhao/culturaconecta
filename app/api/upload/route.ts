import fs from "fs";
import { randomUUID } from "crypto";
import { ActionError } from "@/lib/server/actions";
import { withDb } from "@/lib/server/db";
import { uploadFile, uploadsDir } from "@/lib/server/paths";
import { readToken } from "@/lib/server/session";
import { userFromToken } from "@/lib/server/view";
import type { Media } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024;

function sniff(buffer: Buffer): Media["ext"] | null {
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  if (buffer.subarray(0, 4).toString("hex") === "89504e47") return "png";
  if (buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP") return "webp";
  return null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { dataUrl?: unknown };
    const match =
      typeof body.dataUrl === "string"
        ? /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(body.dataUrl)
        : null;
    if (!match) throw new ActionError("Envie uma imagem JPG, PNG ou WebP.");
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length > MAX_BYTES) throw new ActionError("A imagem passa de 4 MB.");
    const ext = sniff(buffer);
    if (!ext) throw new ActionError("O arquivo não parece uma imagem válida.");
    const token = await readToken();
    const id = await withDb((db) => {
      const me = userFromToken(db, token);
      if (!me) throw new ActionError("Entre na sua conta para enviar imagens.");
      if (me.limited) throw new ActionError("Sua conta está limitada e não pode enviar imagens.");
      const since = Date.now() - 24 * 60 * 60 * 1000;
      const today = db.media.filter(
        (item) => item.ownerHandle === me.handle && new Date(item.createdAt).getTime() > since
      ).length;
      if (today >= 80) throw new ActionError("Você atingiu o limite de imagens de hoje.");
      const mediaId = randomUUID();
      fs.mkdirSync(uploadsDir, { recursive: true });
      fs.writeFileSync(/*turbopackIgnore: true*/ uploadFile(mediaId, ext), buffer);
      db.media.push({ id: mediaId, ownerHandle: me.handle, ext, createdAt: new Date().toISOString() });
      return mediaId;
    });
    return Response.json({ id, url: `/api/media/${id}` });
  } catch (error) {
    if (error instanceof ActionError) return Response.json({ error: error.message }, { status: 400 });
    if (error instanceof SyntaxError) return Response.json({ error: "Pedido inválido." }, { status: 400 });
    console.error(error);
    return Response.json({ error: "Não foi possível enviar a imagem." }, { status: 500 });
  }
}
