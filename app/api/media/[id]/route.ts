import fs from "fs";
import { readDb } from "@/lib/server/db";
import { uploadFile } from "@/lib/server/paths";

export const runtime = "nodejs";

const TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Não encontrado", { status: 404 });
  const media = await readDb((db) => db.media.find((item) => item.id === id));
  if (!media) return new Response("Não encontrado", { status: 404 });
  const file = uploadFile(media.id, media.ext);
  if (!fs.existsSync(/*turbopackIgnore: true*/ file)) return new Response("Não encontrado", { status: 404 });
  const data = new Uint8Array(await fs.promises.readFile(/*turbopackIgnore: true*/ file));
  return new Response(data, {
    headers: {
      "Content-Type": TYPES[media.ext],
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
