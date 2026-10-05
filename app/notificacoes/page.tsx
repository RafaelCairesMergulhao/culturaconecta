"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { useSocial } from "@/components/SocialContext";
import { Avatar, Eyebrow, GhostButton, Notice, PrimaryButton } from "@/components/ui";
import { timeAgo, TRIANGLE, userByHandle } from "@/lib/format";
import type { NotificationType } from "@/lib/types";

const ICONS: Record<NotificationType, IconName> = {
  like: "heart",
  fire: "flame",
  arrepio: "sparkle",
  comment: "chat",
  follow: "user",
  repost: "repost",
  message: "send",
  support: "heart",
  moderation: "shield",
  feat: "users",
  application: "briefcase",
  event: "calendar",
  testimonial: "doc",
  participation: "medal",
  achievement: "trophy",
  jam: "headphones",
};

export default function NotificacoesPage() {
  const { state, act } = useSocial();
  const marked = useRef(false);

  useEffect(() => {
    if (!state?.me || marked.current) return;
    if (state.notifications.every((item) => item.read)) return;
    marked.current = true;
    act({ action: "readNotifications" }).catch(() => undefined);
  }, [state, act]);

  if (!state?.me) return null;
  const me = state.me.handle;

  return (
    <div className="space-y-5">
      <header>
        <Eyebrow>Avisos</Eyebrow>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">O que rolou com você</h1>
      </header>
      {state.notifications.length === 0 && <Notice>Nada novo por enquanto.</Notice>}
      <ul className="space-y-2">
        {state.notifications.map((item) => {
          const actor = userByHandle(state, item.actorHandle);
          const featPost =
            item.type === "feat" && item.targetId
              ? state.posts.find((post) => post.id === item.targetId && post.feat === me && post.featStatus === "pendente")
              : undefined;
          const claim =
            item.type === "participation" && item.targetId
              ? state.participations.find((entry) => entry.id === item.targetId && entry.organizerHandle === me && entry.status === "pendente")
              : undefined;
          const achievement = item.type === "achievement";
          return (
            <li key={item.id} className={`rounded-2xl border bg-card p-3 ${item.read ? "border-line" : "border-rosa/50"}`}>
              <Link href={item.href} className="flex items-start gap-3">
                {achievement ? (
                  <span className="grid h-9 w-10 shrink-0 place-items-center bg-gradient-to-br from-amber-200 to-amber-600 pt-2 text-black" style={{ clipPath: TRIANGLE }}>
                    <Icon name="trophy" className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </span>
                ) : (
                  <span className="relative">
                    <Avatar user={actor} size="sm" />
                    <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-rosa text-white">
                      <Icon name={ICONS[item.type]} className="h-3 w-3" strokeWidth={2.2} />
                    </span>
                  </span>
                )}
                <span className="min-w-0 flex-1 text-sm leading-6">
                  {achievement ? (
                    <span className="font-semibold">{item.text}</span>
                  ) : (
                    <>
                      <span className="font-semibold">{actor?.name ?? item.actorHandle}</span> {item.text}
                    </>
                  )}
                  <span className="block text-xs text-muted">{timeAgo(item.createdAt)}</span>
                </span>
              </Link>
              {featPost && (
                <div className="mt-3 flex gap-2 pl-12">
                  <PrimaryButton onClick={() => act({ action: "featRespond", postId: featPost.id, accept: true }).catch(() => undefined)}>
                    Aceitar feat
                  </PrimaryButton>
                  <GhostButton onClick={() => act({ action: "featRespond", postId: featPost.id, accept: false }).catch(() => undefined)}>
                    Recusar
                  </GhostButton>
                </div>
              )}
              {claim && (
                <div className="mt-3 flex gap-2 pl-12">
                  <PrimaryButton onClick={() => act({ action: "decideParticipation", participationId: claim.id, accept: true }).catch(() => undefined)}>
                    Confirmar participação
                  </PrimaryButton>
                  <GhostButton onClick={() => act({ action: "decideParticipation", participationId: claim.id, accept: false }).catch(() => undefined)}>
                    Recusar
                  </GhostButton>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
