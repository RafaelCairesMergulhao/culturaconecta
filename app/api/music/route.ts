import { parseMusicUrl } from "@/lib/music";
import { readDb } from "@/lib/server/db";
import { readToken } from "@/lib/server/session";
import { userFromToken } from "@/lib/server/view";
import type { MusicLink } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

export async function POST(req: Request) {
  const token = await readToken();
  const me = await readDb((db) => userFromToken(db, token));
  if (!me) return Response.json({ error: "Entre na sua conta para adicionar música." }, { status: 401 });

  let url = "";
  try {
    const body = (await req.json()) as { url?: unknown };
    url = typeof body.url === "string" ? body.url : "";
  } catch {
    return Response.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const music = parseMusicUrl(url);
  if (!music) {
    return Response.json(
      { error: "Cole um link do Spotify ou do YouTube. A música toca no player oficial, sem baixar o arquivo." },
      { status: 400 }
    );
  }

  const enriched = await lookup(music);
  return Response.json({ music: enriched }, { headers: { "Cache-Control": "no-store" } });
}

async function lookup(music: MusicLink): Promise<MusicLink> {
  const endpoint =
    music.provider === "spotify"
      ? `https://open.spotify.com/oembed?url=${encodeURIComponent(music.url)}`
      : `https://www.youtube.com/oembed?url=${encodeURIComponent(music.url)}&format=json`;
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return music;
    const data = (await response.json()) as { title?: unknown; author_name?: unknown };
    const title = clean(data.title, 140);
    const author = clean(data.author_name, 80);
    return { ...music, title: title || music.title, author: author || music.author };
  } catch {
    return music;
  }
}
