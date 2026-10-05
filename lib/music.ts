import type { Jam, MusicKind, MusicLink, MusicProvider } from "./types";

const SPOTIFY_KINDS = new Set(["track", "album", "playlist", "episode", "show"]);

export const JAM_MS = 8 * 60 * 60 * 1000;

export function jamOpen(jam: Jam, now = Date.now()) {
  return !jam.hidden && !jam.closedAt && now - new Date(jam.createdAt).getTime() < JAM_MS;
}

export function parseMusicUrl(raw: string): MusicLink | null {
  const text = raw.trim();
  const uri = /^spotify:(track|album|playlist|episode|show):([A-Za-z0-9]{10,30})$/.exec(text);
  if (uri) return spotifyLink(uri[1], uri[2]);

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\./, "");

  if (host === "open.spotify.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const index = parts.findIndex((part) => SPOTIFY_KINDS.has(part));
    const id = parts[index + 1] ?? "";
    if (index < 0 || !/^[A-Za-z0-9]{10,30}$/.test(id)) return null;
    return spotifyLink(parts[index], id);
  }

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return youtubeLink(id);
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
    const fromQuery = url.searchParams.get("v") ?? "";
    const fromPath = /\/(?:embed|shorts|live)\/([\w-]{11})/.exec(url.pathname)?.[1] ?? "";
    return youtubeLink(fromQuery || fromPath);
  }

  return null;
}

function spotifyLink(kind: string, id: string): MusicLink {
  return {
    provider: "spotify",
    kind: kind as MusicKind,
    externalId: id,
    url: `https://open.spotify.com/${kind}/${id}`,
    title: "No Spotify",
    author: "",
  };
}

function youtubeLink(id: string): MusicLink | null {
  if (!/^[\w-]{11}$/.test(id)) return null;
  return {
    provider: "youtube",
    kind: "video",
    externalId: id,
    url: `https://www.youtube.com/watch?v=${id}`,
    title: "No YouTube",
    author: "",
  };
}

export function embedSrc(music: MusicLink, startSeconds = 0) {
  if (music.provider === "youtube") {
    const start = Math.max(0, Math.min(Math.floor(startSeconds), 6 * 60 * 60));
    const params = new URLSearchParams({ rel: "0", modestbranding: "1", playsinline: "1" });
    if (start > 0) params.set("start", String(start));
    return `https://www.youtube-nocookie.com/embed/${music.externalId}?${params}`;
  }
  return `https://open.spotify.com/embed/${music.kind}/${music.externalId}?utm_source=generator&theme=0`;
}

export function embedHeight(music: MusicLink) {
  if (music.provider === "youtube") return 220;
  if (music.kind === "track" || music.kind === "episode") return 152;
  return 352;
}

export function providerLabel(provider: MusicProvider) {
  return provider === "spotify" ? "Spotify" : "YouTube";
}

export async function resolveMusic(url: string): Promise<MusicLink> {
  const response = await fetch("/api/music", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = (await response.json()) as { music?: MusicLink; error?: string };
  if (!response.ok || !data.music) throw new Error(data.error || "Não foi possível usar esse link.");
  return data.music;
}
