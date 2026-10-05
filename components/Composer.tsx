"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadImage } from "@/lib/image";
import { resolveMusic } from "@/lib/music";
import { CATEGORIES, validateText } from "@/lib/policy";
import type { MusicLink } from "@/lib/types";
import { Icon } from "./Icon";
import { MusicEmbed } from "./Jam";
import { useSocial } from "./SocialContext";
import { Avatar, fieldClass, Notice, PrimaryButton } from "./ui";

export function Composer({ redirectHome = false }: { redirectHome?: boolean }) {
  const { state, act, busy, fail } = useSocial();
  const router = useRouter();
  const [text, setText] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Geral");
  const [image, setImage] = useState<{ id: string; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [featOpen, setFeatOpen] = useState(false);
  const [feat, setFeat] = useState("");
  const [musicOpen, setMusicOpen] = useState(false);
  const [musicUrl, setMusicUrl] = useState("");
  const [music, setMusic] = useState<MusicLink | null>(null);
  const [looking, setLooking] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!state?.me) return null;
  const me = state.me;
  if (me.limited) {
    return <Notice>Sua conta está limitada. Você pode ler a rede, mas não publicar até a equipe revisar.</Notice>;
  }

  async function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      setImage(await uploadImage(file, 1600));
    } catch (reason) {
      fail(reason instanceof Error ? reason.message : "Não foi possível enviar a foto.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (text.trim() || (!image && !music)) {
      const problem = validateText(text, "post");
      if (problem) {
        setLocalError(problem);
        return;
      }
    }
    setLocalError(null);
    try {
      await act({ action: "post", text, category, imageId: image?.id ?? null, music, feat: featOpen ? feat : "" });
      setText("");
      setImage(null);
      setMusic(null);
      setMusicUrl("");
      setMusicOpen(false);
      setFeat("");
      setFeatOpen(false);
      if (redirectHome) router.push("/");
    } catch {
      /* aviso global */
    }
  }

  const others = state.users.filter((user) => user.handle !== me.handle && user.role === "member");

  return (
    <form onSubmit={submit} className="rounded-3xl border border-line bg-card p-4">
      <div className="flex gap-3">
        <Avatar user={me} size="md" />
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={500}
          rows={redirectHome ? 6 : 3}
          placeholder="Solta aí: trabalho novo, bastidor, agenda, chamada..."
          className="min-h-[72px] w-full resize-none bg-transparent pt-2 text-[15px] leading-7 outline-none placeholder:text-muted/80"
        />
      </div>
      {image && (
        <div className="relative mt-3 overflow-hidden rounded-2xl border border-line">
          <img src={image.preview} alt="Prévia da foto" className="max-h-80 w-full object-cover" />
          <button
            type="button"
            onClick={() => setImage(null)}
            aria-label="Remover foto"
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>
      )}
      {musicOpen && (
        <div className="mt-3 space-y-2 rounded-2xl border border-line bg-ink/30 p-3">
          <div className="flex gap-2">
            <input
              value={musicUrl}
              onChange={(event) => {
                setMusicUrl(event.target.value);
                setMusic(null);
              }}
              placeholder="Link do Spotify ou do YouTube"
              className={`${fieldClass} min-w-0 flex-1`}
            />
            <button
              type="button"
              disabled={looking || !musicUrl.trim()}
              onClick={() => {
                setLooking(true);
                resolveMusic(musicUrl)
                  .then(setMusic)
                  .catch((reason: unknown) => {
                    setMusic(null);
                    fail(reason instanceof Error ? reason.message : "Não foi possível usar esse link.");
                  })
                  .finally(() => setLooking(false));
              }}
              className="shrink-0 rounded-full border border-line px-3 text-sm font-semibold disabled:opacity-50"
            >
              {looking ? "..." : "Usar"}
            </button>
          </div>
          {music && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-semibold">{music.title}</span>
                <button type="button" onClick={() => { setMusic(null); setMusicUrl(""); }} className="text-xs text-muted">
                  Tirar
                </button>
              </div>
              <MusicEmbed music={music} />
            </div>
          )}
        </div>
      )}
      {featOpen && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-line bg-ink/30 px-3 py-2">
          <span className="font-mono text-xs uppercase tracking-widest text-rosa">feat.</span>
          <input
            list="cc-feat-handles"
            value={feat}
            onChange={(event) => setFeat(event.target.value)}
            placeholder="@ de quem assina junto"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            autoCapitalize="none"
          />
          <datalist id="cc-feat-handles">
            {others.map((user) => (
              <option key={user.handle} value={user.handle}>
                {user.name}
              </option>
            ))}
          </datalist>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3">
        <div className="flex flex-wrap items-center gap-1">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />
          <ToolButton onClick={() => fileRef.current?.click()} active={!!image} label={uploading ? "Enviando" : "Foto"}>
            <Icon name="image" className="h-4 w-4" />
          </ToolButton>
          <ToolButton onClick={() => setMusicOpen((value) => !value)} active={musicOpen || !!music} label="Música">
            <Icon name="headphones" className="h-4 w-4" />
          </ToolButton>
          <ToolButton onClick={() => setFeatOpen((value) => !value)} active={featOpen} label="Feat">
            <Icon name="users" className="h-4 w-4" />
          </ToolButton>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as (typeof CATEGORIES)[number])}
            aria-label="Categoria"
            className="rounded-full border border-line bg-ink/40 px-3 py-1.5 text-sm"
          >
            {CATEGORIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted">{text.trim().length}/500</span>
          <PrimaryButton type="submit" disabled={busy || uploading || looking || (!text.trim() && !image && !music)}>
            Publicar
          </PrimaryButton>
        </div>
      </div>
      {localError && <p className="mt-2 text-sm text-rosa">{localError}</p>}
    </form>
  );
}

function ToolButton({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-rosa/15 text-rosa" : "text-muted hover:bg-ink/40 hover:text-paper"
      }`}
    >
      {children}
      {label}
    </button>
  );
}
