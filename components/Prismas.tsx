"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { activeStories, mediaUrl, timeAgo, TRIANGLE, userByHandle } from "@/lib/format";
import { uploadImage } from "@/lib/image";
import { STORY_BACKGROUNDS } from "@/lib/policy";
import type { PublicUser, Story } from "@/lib/types";
import { Icon } from "./Icon";
import { ReportDialog } from "./ReportDialog";
import { useSocial } from "./SocialContext";
import { Avatar, fieldClass, PrimaryButton } from "./ui";

const DURATION = 6000;
const SEEN_KEY = "cc-prismas-vistos";

function useSeen() {
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    try {
      setSeen(new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[]));
    } catch {
      /* storage indisponível */
    }
  }, []);
  const mark = useCallback((id: string) => {
    setSeen((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify([...next].slice(-400)));
      } catch {
        /* storage indisponível */
      }
      return next;
    });
  }, []);
  return { seen, mark };
}

export function PrismaFrame({
  ring,
  inner,
  imageSrc,
  width = 84,
  children,
}: {
  ring: string;
  inner: string;
  imageSrc?: string | null;
  width?: number;
  children?: React.ReactNode;
}) {
  return (
    <span className="relative block" style={{ width, height: width * 0.88 }}>
      <span className="absolute inset-0" style={{ clipPath: TRIANGLE, background: ring }} />
      <span
        className="absolute inset-0 overflow-hidden text-white"
        style={{ clipPath: TRIANGLE, transform: "scale(0.84)", transformOrigin: "50% 66.7%", background: inner }}
      >
        {imageSrc ? (
          <img src={imageSrc} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-end justify-center pb-[14%] text-sm font-semibold">{children}</span>
        )}
      </span>
    </span>
  );
}

function gradientOf(user?: PublicUser) {
  return `linear-gradient(135deg, ${user?.prefs.accent ?? "var(--accent)"}, ${user?.prefs.accent2 ?? "var(--accent2)"})`;
}

export function PrismaBar() {
  const { state } = useSocial();
  const { seen, mark } = useSeen();
  const [viewing, setViewing] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  if (!state?.me) return null;
  const me = state.me;
  const stories = activeStories(state);

  const byAuthor = new Map<string, Story[]>();
  for (const story of stories) {
    byAuthor.set(story.authorHandle, [...(byAuthor.get(story.authorHandle) ?? []), story]);
  }
  const others = [...byAuthor.keys()]
    .filter((handle) => handle !== me.handle)
    .sort((a, b) => {
      const unseenA = byAuthor.get(a)!.some((story) => !seen.has(story.id)) ? 1 : 0;
      const unseenB = byAuthor.get(b)!.some((story) => !seen.has(story.id)) ? 1 : 0;
      if (unseenA !== unseenB) return unseenB - unseenA;
      const lastA = byAuthor.get(a)!.at(-1)!.createdAt;
      const lastB = byAuthor.get(b)!.at(-1)!.createdAt;
      return lastB.localeCompare(lastA);
    });
  const authors = byAuthor.has(me.handle) ? [me.handle, ...others] : others;

  return (
    <section aria-label="Prismas">
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 pt-1 no-scrollbar">
        <button type="button" onClick={() => setCreating(true)} className="w-[88px] shrink-0 text-center">
          <PrismaFrame ring="var(--line)" inner="color-mix(in srgb, var(--bg2) 85%, transparent)">
            <span className="text-rosa">
              <Icon name="plus" className="h-6 w-6" strokeWidth={2.4} />
            </span>
          </PrismaFrame>
          <span className="mt-1.5 block truncate text-xs text-muted">Criar Prisma</span>
        </button>
        {authors.map((handle, index) => {
          const author = userByHandle(state, handle);
          const list = byAuthor.get(handle)!;
          const unseen = list.some((story) => !seen.has(story.id));
          const cover = mediaUrl(author?.avatarId) ?? mediaUrl(list.at(-1)?.imageId);
          return (
            <button key={handle} type="button" onClick={() => setViewing(index)} className="w-[88px] shrink-0 text-center">
              <PrismaFrame
                ring={unseen ? gradientOf(author) : "var(--line)"}
                inner={STORY_BACKGROUNDS[list.at(-1)!.bg] ?? gradientOf(author)}
                imageSrc={cover}
              >
                {author?.avatarInitials}
              </PrismaFrame>
              <span className={`mt-1.5 block truncate text-xs ${unseen ? "font-semibold" : "text-muted"}`}>
                {handle === me.handle ? "Seu Prisma" : (author?.name ?? handle)}
              </span>
            </button>
          );
        })}
      </div>
      {viewing !== null && (
        <PrismaViewer authors={authors} start={viewing} onClose={() => setViewing(null)} markSeen={mark} />
      )}
      {creating && <PrismaCreator onClose={() => setCreating(false)} />}
    </section>
  );
}

function PrismaViewer({
  authors,
  start,
  onClose,
  markSeen,
}: {
  authors: string[];
  start: number;
  onClose: () => void;
  markSeen: (id: string) => void;
}) {
  const { state, act } = useSocial();
  const [authorIndex, setAuthorIndex] = useState(start);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [typing, setTyping] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [sent, setSent] = useState(false);

  const all = state ? activeStories(state) : [];
  const handle = authors[authorIndex];
  const list = all.filter((story) => story.authorHandle === handle);
  const story = list[storyIndex];
  const author = state && handle ? userByHandle(state, handle) : undefined;
  const mine = state?.me?.handle === handle;
  const paused = holding || typing || reportOpen;

  const goNext = useCallback(() => {
    setProgress(0);
    setSent(false);
    if (storyIndex + 1 < list.length) setStoryIndex(storyIndex + 1);
    else if (authorIndex + 1 < authors.length) {
      setAuthorIndex(authorIndex + 1);
      setStoryIndex(0);
    } else onClose();
  }, [storyIndex, list.length, authorIndex, authors.length, onClose]);

  const goPrev = useCallback(() => {
    setProgress(0);
    setSent(false);
    if (storyIndex > 0) setStoryIndex(storyIndex - 1);
    else if (authorIndex > 0) {
      setAuthorIndex(authorIndex - 1);
      setStoryIndex(0);
    }
  }, [storyIndex, authorIndex]);

  const storyId = story?.id;

  useEffect(() => {
    if (storyId) markSeen(storyId);
    else onClose();
  }, [storyId, markSeen, onClose]);

  useEffect(() => {
    if (paused || !storyId) return;
    const timer = window.setInterval(() => setProgress((value) => value + 50 / DURATION), 50);
    return () => window.clearInterval(timer);
  }, [paused, storyId]);

  useEffect(() => {
    if (progress >= 1) goNext();
  }, [progress, goNext]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (typing) return;
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [typing, onClose, goNext, goPrev]);

  if (!state || !story) return null;
  const image = mediaUrl(story.imageId);

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    if (!reply.trim() || !story || !handle) return;
    const quote = story.text ? `“${story.text.slice(0, 60)}”` : "(foto)";
    try {
      await act({ action: "message", handle, text: `Respondeu seu Prisma ${quote}: ${reply.trim()}` });
      setReply("");
      setSent(true);
    } catch {
      /* aviso global */
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/90 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Prisma de ${author?.name ?? handle}`}>
      <div
        className="cc-pop relative h-dvh w-full overflow-hidden sm:aspect-[9/16] sm:h-[min(90dvh,860px)] sm:w-auto sm:rounded-[2rem]"
        style={{ background: STORY_BACKGROUNDS[story.bg] ?? STORY_BACKGROUNDS.aurora }}
      >
        {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/55" />
        <svg viewBox="0 0 100 88" className="pointer-events-none absolute left-1/2 top-1/2 w-[140%] -translate-x-1/2 -translate-y-1/2 opacity-[0.12]" aria-hidden="true">
          <path d="M50 2 98 86H2z" fill="none" stroke="white" strokeWidth="0.6" />
          <path d="M50 22 82 78H18z" fill="none" stroke="white" strokeWidth="0.4" />
        </svg>

        <div className="absolute inset-x-0 top-0 z-20 p-3 pt-[max(env(safe-area-inset-top),12px)]">
          <div className="flex gap-1">
            {list.map((item, index) => (
              <span key={item.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                <span
                  className="block h-full bg-white"
                  style={{ width: `${index < storyIndex ? 100 : index === storyIndex ? Math.min(100, progress * 100) : 0}%` }}
                />
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3 text-white">
            <Link href={`/perfil/${handle}`} onClick={onClose} className="flex items-center gap-2">
              <Avatar user={author} size="sm" />
              <span className="text-sm font-semibold drop-shadow">{author?.name ?? handle}</span>
            </Link>
            <span className="text-xs text-white/70">{timeAgo(story.createdAt)}</span>
            <div className="ml-auto flex items-center gap-1">
              {mine ? (
                <button
                  type="button"
                  aria-label="Apagar Prisma"
                  className="rounded-full p-2 hover:bg-white/15"
                  onClick={() => act({ action: "deleteStory", storyId: story.id }).then(onClose).catch(() => undefined)}
                >
                  <Icon name="trash" />
                </button>
              ) : (
                <button type="button" aria-label="Denunciar Prisma" className="rounded-full p-2 hover:bg-white/15" onClick={() => setReportOpen(true)}>
                  <Icon name="flag" />
                </button>
              )}
              <button type="button" aria-label="Fechar" className="rounded-full p-2 hover:bg-white/15" onClick={onClose}>
                <Icon name="x" />
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          aria-label="Prisma anterior"
          className="absolute inset-y-0 left-0 z-10 w-1/3"
          onClick={goPrev}
          onPointerDown={() => setHolding(true)}
          onPointerUp={() => setHolding(false)}
          onPointerLeave={() => setHolding(false)}
        />
        <button
          type="button"
          aria-label="Próximo Prisma"
          className="absolute inset-y-0 right-0 z-10 w-2/3"
          onClick={goNext}
          onPointerDown={() => setHolding(true)}
          onPointerUp={() => setHolding(false)}
          onPointerLeave={() => setHolding(false)}
        />

        {story.text && (
          <p className="pointer-events-none absolute inset-x-6 top-1/2 z-[5] -translate-y-1/2 text-balance text-center text-3xl font-semibold leading-tight tracking-tight text-white drop-shadow-lg">
            {story.text}
          </p>
        )}

        {!mine && (
          <form onSubmit={sendReply} className="absolute inset-x-0 bottom-0 z-20 flex gap-2 p-3 pb-[max(env(safe-area-inset-bottom),12px)]">
            <input
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              onFocus={() => setTyping(true)}
              onBlur={() => setTyping(false)}
              maxLength={400}
              placeholder={sent ? "Resposta enviada na mensagem" : `Responder ${author?.name.split(" ")[0] ?? ""}`}
              className="min-w-0 flex-1 rounded-full border border-white/40 bg-black/30 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/70 focus:border-white"
            />
            <button type="submit" aria-label="Enviar resposta" className="grid h-11 w-11 place-items-center rounded-full bg-white text-black disabled:opacity-50" disabled={!reply.trim()}>
              <Icon name="send" className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
      <ReportDialog open={reportOpen} title="Denunciar Prisma" targetType="story" targetId={story.id} onClose={() => setReportOpen(false)} />
    </div>
  );
}

function PrismaCreator({ onClose }: { onClose: () => void }) {
  const { act, busy, fail } = useSocial();
  const [text, setText] = useState("");
  const [bg, setBg] = useState("aurora");
  const [image, setImage] = useState<{ id: string; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      setImage(await uploadImage(file, 1440));
    } catch (reason) {
      fail(reason instanceof Error ? reason.message : "Não foi possível enviar a foto.");
    } finally {
      setUploading(false);
    }
  }

  async function publish() {
    try {
      await act({ action: "story", text, bg, imageId: image?.id ?? null });
      onClose();
    } catch {
      /* aviso global */
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Novo Prisma">
      <div className="cc-pop grid w-full max-w-3xl gap-5 rounded-[2rem] border border-line bg-card p-5 sm:grid-cols-[240px_1fr]">
        <div
          className="relative mx-auto aspect-[9/16] w-48 overflow-hidden rounded-3xl sm:w-full"
          style={{ background: STORY_BACKGROUNDS[bg] }}
        >
          {image && <img src={image.preview} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/40" />
          <p className="absolute inset-x-4 top-1/2 -translate-y-1/2 text-balance text-center text-xl font-semibold leading-tight text-white">
            {text || (image ? "" : "Seu recado em triângulo")}
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold">Novo Prisma</h2>
              <p className="text-sm text-muted">Fica 24 horas no ar. Quem vê pode responder direto na sua mensagem.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-2 text-muted hover:bg-ink/40">
              <Icon name="x" />
            </button>
          </div>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={200}
            rows={3}
            placeholder="Aviso de show, bastidor, frase de uma letra..."
            className={fieldClass}
          />
          <div>
            <p className="mb-2 text-sm text-muted">Fundo</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STORY_BACKGROUNDS).map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  aria-label={`Fundo ${key}`}
                  aria-pressed={bg === key}
                  onClick={() => setBg(key)}
                  className={`h-11 w-12 transition ${bg === key ? "scale-110" : "opacity-70 hover:opacity-100"}`}
                  style={{ clipPath: TRIANGLE, background: value }}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-rosa/60"
            >
              <Icon name="image" className="h-4 w-4" /> {uploading ? "Enviando..." : image ? "Trocar foto" : "Foto do aparelho"}
            </button>
            {image && (
              <button type="button" onClick={() => setImage(null)} className="text-sm text-muted">
                Remover foto
              </button>
            )}
          </div>
          <div className="mt-auto flex justify-end">
            <PrimaryButton onClick={publish} disabled={busy || uploading || (!text.trim() && !image)}>
              Publicar Prisma
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
