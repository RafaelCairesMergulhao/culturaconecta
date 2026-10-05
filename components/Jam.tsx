"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { embedHeight, embedSrc, jamOpen, providerLabel, resolveMusic } from "@/lib/music";
import { timeAgo, userByHandle } from "@/lib/format";
import type { ClientState, Jam as JamRecord, MusicLink } from "@/lib/types";
import { Icon } from "./Icon";
import { useSocial } from "./SocialContext";
import { Avatar, Eyebrow, Field, fieldClass, GhostButton, Notice, PrimaryButton } from "./ui";

export function MusicEmbed({ music, startedAt }: { music: MusicLink; startedAt?: string }) {
  const startSeconds = useMemo(() => {
    if (!startedAt || music.provider !== "youtube") return 0;
    const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    return Math.max(0, Math.min(elapsed, 6 * 60 * 60));
  }, [startedAt, music.provider, music.externalId]);

  const compact = music.provider === "spotify" && (music.kind === "track" || music.kind === "episode");
  const height = compact ? 132 : embedHeight(music);
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-black" style={{ height }}>
      <iframe
        src={embedSrc(music, startSeconds)}
        title={music.title || "Música"}
        height={embedHeight(music)}
        className="w-full border-0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

function listenersOf(state: ClientState, jamId: string) {
  return state.jamMembers.filter((item) => item.jamId === jamId);
}

export function NowPlaying({ state, handle }: { state: ClientState; handle: string }) {
  const jam = state.jams.find((item) => item.hostHandle === handle && jamOpen(item));
  if (!jam) return null;
  const count = listenersOf(state, jam.id).length;
  return (
    <Link href={`/jam#${jam.id}`} className="flex items-center gap-3 rounded-3xl border border-line bg-card p-3 transition hover:border-rosa/50">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-rosa to-azul text-white">
        <Icon name="headphones" className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <Eyebrow>Ouvindo agora</Eyebrow>
        <span className="block truncate font-semibold">{jam.music.title}</span>
        <span className="text-xs text-muted">
          {providerLabel(jam.music.provider)} · {count} {count === 1 ? "pessoa na jam" : "pessoas na jam"}
        </span>
      </span>
    </Link>
  );
}

export function LiveJamStrip({ state }: { state: ClientState }) {
  const live = state.jams.filter((item) => jamOpen(item));
  if (!live.length) return null;
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <Eyebrow>Jams ao vivo</Eyebrow>
        <Link href="/jam" className="text-sm font-semibold text-rosa">
          Ouvir junto
        </Link>
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 no-scrollbar">
        {live.map((jam) => {
          const host = userByHandle(state, jam.hostHandle);
          const count = listenersOf(state, jam.id).length;
          return (
            <Link key={jam.id} href={`/jam#${jam.id}`} className="w-64 shrink-0 rounded-3xl border border-line bg-card p-3">
              <span className="flex items-center gap-2">
                <Avatar user={host} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{host?.name ?? jam.hostHandle}</span>
                  <span className="text-xs text-muted">{count} ouvindo · {timeAgo(jam.createdAt)}</span>
                </span>
              </span>
              <span className="mt-2 block truncate font-medium">{jam.music.title}</span>
              <span className="text-xs text-muted">{providerLabel(jam.music.provider)}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function JamBoard() {
  const { state } = useSocial();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const timer = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    return () => window.clearTimeout(timer);
  }, [state?.jams.length]);

  if (!state?.me) return null;
  const me = state.me.handle;
  const live = state.jams.filter((item) => jamOpen(item));
  const mine = live.find((item) => item.hostHandle === me);
  const others = live.filter((item) => item.hostHandle !== me);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Ao vivo</Eyebrow>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Jam</h1>
          <p className="mt-1 text-sm text-muted">
            Compartilhe o que está ouvindo no Spotify ou no YouTube. Quem entrar escuta a mesma faixa com você.
          </p>
        </div>
        {!mine && (
          <PrimaryButton onClick={() => setCreating((value) => !value)}>
            <Icon name={creating ? "x" : "headphones"} className="h-4 w-4" /> {creating ? "Fechar" : "Abrir uma jam"}
          </PrimaryButton>
        )}
      </header>

      {creating && <StartJam onDone={() => setCreating(false)} />}

      {mine && <JamCard state={state} jam={mine} open />}

      {others.length === 0 && !mine && !creating && (
        <Notice>Ninguém está numa jam agora. Abra a primeira e chame a cena para ouvir junto.</Notice>
      )}

      <div className="space-y-4">
        {others.map((jam) => (
          <JamCard key={jam.id} state={state} jam={jam} />
        ))}
      </div>
    </div>
  );
}

function JamCard({ state, jam, open = false }: { state: ClientState; jam: JamRecord; open?: boolean }) {
  const { act, busy } = useSocial();
  const [expanded, setExpanded] = useState(open);
  const me = state.me!.handle;
  const host = userByHandle(state, jam.hostHandle);
  const members = listenersOf(state, jam.id);
  const inside = members.some((item) => item.userHandle === me);
  const hosting = jam.hostHandle === me;

  function run(body: Record<string, unknown>) {
    act(body).catch(() => undefined);
  }

  return (
    <article id={jam.id} className="scroll-mt-24 rounded-3xl border border-line bg-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Link href={`/perfil/${jam.hostHandle}`} className="shrink-0">
          <Avatar user={host} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">
            <Link href={`/perfil/${jam.hostHandle}`} className="font-semibold text-paper">
              {host?.name ?? jam.hostHandle}
            </Link>{" "}
            está ouvindo · {timeAgo(jam.createdAt)}
          </p>
          <h2 className="mt-0.5 text-lg font-semibold leading-snug">{jam.music.title}</h2>
          <p className="text-sm text-muted">
            {providerLabel(jam.music.provider)}
            {jam.music.author ? ` · ${jam.music.author}` : ""}
          </p>
          {jam.note && <p className="mt-2 text-sm leading-6">{jam.note}</p>}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex -space-x-2">
          {members.slice(0, 6).map((item) => (
            <Avatar key={item.userHandle} user={userByHandle(state, item.userHandle)} size="xs" />
          ))}
        </div>
        <span className="text-xs text-muted">
          {members.length} {members.length === 1 ? "pessoa" : "pessoas"}
        </span>
      </div>

      {expanded && (
        <div className="mt-4 space-y-2">
          <MusicEmbed music={jam.music} startedAt={jam.createdAt} />
          <p className="text-xs text-muted">
            {jam.music.provider === "youtube"
              ? "Aperte o play: quem entra agora cai no mesmo ponto do vídeo."
              : "Aperte o play no Spotify. Todo mundo ouve a mesma faixa, cada um no próprio player."}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {!expanded && (
          <PrimaryButton
            onClick={() => {
              setExpanded(true);
              if (!inside && !hosting) run({ action: "joinJam", jamId: jam.id });
            }}
          >
            <Icon name="play" className="h-4 w-4" /> Ouvir junto
          </PrimaryButton>
        )}
        {expanded && !hosting && !inside && (
          <PrimaryButton disabled={busy} onClick={() => run({ action: "joinJam", jamId: jam.id })}>
            Entrar na jam
          </PrimaryButton>
        )}
        {expanded && !hosting && inside && (
          <GhostButton disabled={busy} onClick={() => run({ action: "leaveJam", jamId: jam.id })}>
            Sair da jam
          </GhostButton>
        )}
        {hosting && (
          <GhostButton disabled={busy} onClick={() => run({ action: "closeJam", jamId: jam.id })}>
            Encerrar jam
          </GhostButton>
        )}
        {expanded && (
          <button type="button" onClick={() => setExpanded(false)} className="ml-auto text-sm text-muted hover:text-paper">
            Recolher
          </button>
        )}
      </div>
    </article>
  );
}

function StartJam({ onDone }: { onDone: () => void }) {
  const { act, busy, fail } = useSocial();
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [music, setMusic] = useState<MusicLink | null>(null);
  const [looking, setLooking] = useState(false);

  async function lookup() {
    setLooking(true);
    try {
      setMusic(await resolveMusic(url));
    } catch (reason) {
      setMusic(null);
      fail(reason instanceof Error ? reason.message : "Não foi possível usar esse link.");
    } finally {
      setLooking(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    let resolved = music;
    if (!resolved) {
      setLooking(true);
      try {
        resolved = await resolveMusic(url);
        setMusic(resolved);
      } catch (reason) {
        fail(reason instanceof Error ? reason.message : "Não foi possível usar esse link.");
        return;
      } finally {
        setLooking(false);
      }
    }
    try {
      await act({ action: "startJam", music: resolved, note });
      onDone();
    } catch {
      /* aviso global */
    }
  }

  return (
    <form onSubmit={submit} className="cc-pop space-y-3 rounded-3xl border border-rosa/40 bg-card p-5">
      <p className="font-semibold">O que você está ouvindo?</p>
      <Field label="Link do Spotify ou do YouTube" hint="A faixa toca no player oficial. A rede não baixa nem guarda o áudio.">
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setMusic(null);
            }}
            placeholder="https://open.spotify.com/track/… ou youtube.com/watch?v=…"
            className={fieldClass}
          />
          <GhostButton onClick={lookup} disabled={looking || !url.trim()}>
            {looking ? "..." : "Ver"}
          </GhostButton>
        </div>
      </Field>
      {music && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">
            {music.title}
            {music.author ? <span className="font-normal text-muted"> · {music.author}</span> : null}
          </p>
          <MusicEmbed music={music} />
        </div>
      )}
      <Field label="Recado para quem entrar" hint="Opcional. Até 200 caracteres.">
        <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} className={fieldClass} placeholder="Beat novo, escuta comigo e me diz o que acha" />
      </Field>
      <div className="flex justify-end">
        <PrimaryButton type="submit" disabled={busy || looking || !url.trim()}>
          Abrir a jam
        </PrimaryButton>
      </div>
    </form>
  );
}
