"use client";

import Link from "next/link";
import { useState } from "react";
import {
  commentCount,
  hasReaction,
  hasRepost,
  mediaUrl,
  reactionCount,
  repostCount,
  timeAgo,
  TRIANGLE,
  userByHandle,
} from "@/lib/format";
import type { Post, ReactionType } from "@/lib/types";
import { Icon, type IconName } from "./Icon";
import { MusicEmbed } from "./Jam";
import { ReportDialog } from "./ReportDialog";
import { useSocial } from "./SocialContext";
import { Avatar, KindBadge } from "./ui";

const REACTIONS: { type: ReactionType; icon: IconName; label: string }[] = [
  { type: "like", icon: "heart", label: "Curtir" },
  { type: "fire", icon: "flame", label: "Fogo" },
  { type: "arrepio", icon: "sparkle", label: "Arrepio" },
];

export function PostCard({ post, showAuthor = true }: { post: Post; showAuthor?: boolean }) {
  const { state, act } = useSocial();
  const [reportOpen, setReportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [burst, setBurst] = useState(0);
  if (!state?.me) return null;
  const s = state;
  const me = s.me!.handle;
  const author = userByHandle(s, post.authorHandle);
  const featUser = post.feat && post.featStatus === "aceito" ? userByHandle(s, post.feat) : undefined;
  const image = mediaUrl(post.imageId);
  const mine = post.authorHandle === me;
  const canDelete = mine || s.me!.role === "moderator";

  function react(type: ReactionType) {
    act({ action: "react", postId: post.id, type }).catch(() => undefined);
  }

  function doubleTap() {
    setBurst((value) => value + 1);
    if (!hasReaction(s, post.id, me, "like")) react("like");
  }

  async function share() {
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      navigator.share({ title: "Cultura Conecta", text: post.text.slice(0, 80), url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <article className="cc-pop rounded-3xl border border-line bg-card p-4 sm:p-5">
      {post.hidden && (
        <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-rosa">Oculta pela moderação</p>
      )}
      <div className="flex items-start gap-3">
        {showAuthor && (
          <Link href={`/perfil/${post.authorHandle}`} className="relative shrink-0">
            <Avatar user={author} size="md" />
            {featUser && (
              <span className="absolute -bottom-1 -right-2">
                <Avatar user={featUser} size="xs" />
              </span>
            )}
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {showAuthor && (
              <Link href={`/perfil/${post.authorHandle}`} className="font-semibold hover:underline">
                {author?.name ?? post.authorHandle}
              </Link>
            )}
            {featUser && (
              <>
                <span className="font-mono text-xs uppercase tracking-widest text-rosa">feat.</span>
                <Link href={`/perfil/${featUser.handle}`} className="font-semibold hover:underline">
                  {featUser.name}
                </Link>
              </>
            )}
            {showAuthor && author && author.kind !== "artista" && <KindBadge kind={author.kind} />}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
            <span>@{post.authorHandle}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-azul">{post.category}</span>
          </div>
        </div>
      </div>

      {post.text && <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7">{post.text}</p>}

      {mine && post.feat && post.featStatus === "pendente" && (
        <p className="mt-3 rounded-2xl border border-dashed border-line px-3 py-2 text-xs text-muted">
          Aguardando @{post.feat} aceitar o feat.
        </p>
      )}

      {post.music && (
        <div className="mt-3 space-y-2">
          <MusicEmbed music={post.music} />
          <button
            type="button"
            onClick={() => act({ action: "startJam", music: post.music, note: "" }).catch(() => undefined)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-rosa"
          >
            <Icon name="headphones" className="h-4 w-4" /> Abrir uma jam com esta faixa
          </button>
        </div>
      )}

      {image && (
        <div className="relative mt-3 overflow-hidden rounded-2xl border border-line" onDoubleClick={doubleTap}>
          <img src={image} alt={post.text ? `Foto: ${post.text.slice(0, 80)}` : "Foto da publicação"} className="max-h-[560px] w-full select-none object-cover" loading="lazy" />
          {burst > 0 && (
            <span
              key={burst}
              className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-32 bg-gradient-to-br from-rosa to-azul"
              style={{ clipPath: TRIANGLE, animation: "cc-burst 0.7s ease-out forwards" }}
            />
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-1 text-sm">
        {REACTIONS.map((item) => {
          const pressed = hasReaction(s, post.id, me, item.type);
          return (
            <button
              key={item.type}
              type="button"
              aria-pressed={pressed}
              aria-label={item.label}
              title={item.label}
              onClick={() => react(item.type)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${
                pressed ? "bg-rosa/15 font-semibold text-rosa" : "text-muted hover:bg-ink/40 hover:text-paper"
              }`}
            >
              <Icon name={item.icon} className="h-4 w-4" />
              {reactionCount(s, post.id, item.type)}
            </button>
          );
        })}
        <Link href={`/post/${post.id}`} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-muted hover:bg-ink/40 hover:text-paper">
          <Icon name="chat" className="h-4 w-4" />
          {commentCount(s, post.id)}
        </Link>
        {!mine && (
          <button
            type="button"
            aria-pressed={hasRepost(s, post.id, me)}
            title="Repostar"
            onClick={() => act({ action: "repost", postId: post.id }).catch(() => undefined)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${
              hasRepost(s, post.id, me) ? "bg-azul/15 font-semibold text-azul" : "text-muted hover:bg-ink/40 hover:text-paper"
            }`}
          >
            <Icon name="repost" className="h-4 w-4" />
            {repostCount(s, post.id)}
          </button>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={share} title="Compartilhar" className="rounded-full p-2 text-muted hover:bg-ink/40 hover:text-paper">
            {copied ? <Icon name="check" className="h-4 w-4" /> : <Icon name="share" className="h-4 w-4" />}
          </button>
          {canDelete ? (
            <button
              type="button"
              title="Apagar"
              onClick={() => {
                if (window.confirm("Apagar esta publicação?")) act({ action: "deletePost", postId: post.id }).catch(() => undefined);
              }}
              className="rounded-full p-2 text-muted hover:bg-ink/40 hover:text-paper"
            >
              <Icon name="trash" className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" title="Denunciar" onClick={() => setReportOpen(true)} className="rounded-full p-2 text-muted hover:bg-ink/40 hover:text-paper">
              <Icon name="flag" className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <ReportDialog open={reportOpen} title="Denunciar publicação" targetType="post" targetId={post.id} onClose={() => setReportOpen(false)} />
    </article>
  );
}
