"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { bestOpportunity, forYouScore, isFollowing, userByHandle } from "@/lib/format";
import { opportunityLabel } from "@/lib/policy";
import type { ClientState, Opportunity } from "@/lib/types";
import { Composer } from "./Composer";
import { LiveJamStrip } from "./Jam";
import { PostCard } from "./PostCard";
import { PrismaBar } from "./Prismas";
import { useSocial } from "./SocialContext";
import { Avatar, Eyebrow, Notice, Pill } from "./ui";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function HomeFeed() {
  const { state } = useSocial();
  const [tab, setTab] = useState<"voce" | "seguindo">("voce");
  if (!state?.me) return null;
  const me = state.me.handle;
  const visible = state.posts.filter((post) => !post.hidden);
  const posts =
    tab === "voce"
      ? [...visible].sort((a, b) => forYouScore(state, b, me) - forYouScore(state, a, me))
      : visible
          .filter(
            (post) =>
              post.authorHandle === me ||
              isFollowing(state, me, post.authorHandle) ||
              (post.feat === me && post.featStatus === "aceito")
          )
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const radar = bestOpportunity(state, me);

  return (
    <div className="space-y-5">
      <header>
        <Eyebrow>{greeting()}</Eyebrow>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {state.me.name.split(" ")[0]}, o que a cena tem hoje?
        </h1>
      </header>

      <PrismaBar />
      <LiveJamStrip state={state} />
      <Composer />

      <div className="flex items-center gap-2">
        <Pill active={tab === "voce"} onClick={() => setTab("voce")}>
          Para você
        </Pill>
        <Pill active={tab === "seguindo"} onClick={() => setTab("seguindo")}>
          Seguindo
        </Pill>
        <span className="ml-auto hidden text-xs text-muted sm:block">
          {tab === "voce" ? "Ordenado por sintonia e movimento" : "Mais recentes primeiro"}
        </span>
      </div>

      {posts.length === 0 ? (
        <Notice>
          {tab === "seguindo"
            ? "Siga artistas e produtoras para montar esta linha. A aba Para você mostra a rede inteira."
            : "Ainda não há publicações por aqui. Que tal abrir a cena?"}
        </Notice>
      ) : (
        <div className="space-y-4">
          {posts.map((post, index) => (
            <Fragment key={post.id}>
              <PostCard post={post} />
              {index === 1 && radar && <RadarCard state={state} opp={radar.opp} match={radar.match} />}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

function RadarCard({ state, opp, match }: { state: ClientState; opp: Opportunity; match: number }) {
  const author = userByHandle(state, opp.authorHandle);
  return (
    <Link href={`/oportunidades#${opp.id}`} className="block rounded-3xl bg-gradient-to-br from-rosa to-azul p-[1.5px]">
      <div className="rounded-[calc(1.5rem-1.5px)] bg-ink/90 p-5">
        <div className="flex items-center justify-between">
          <Eyebrow>Radar de oportunidade</Eyebrow>
          <span className="font-mono text-sm text-rosa">{match}% com você</span>
        </div>
        <p className="mt-3 text-lg font-semibold leading-snug">{opp.title}</p>
        <div className="mt-3 flex items-center gap-2 text-sm text-muted">
          <Avatar user={author} size="xs" />
          <span>{author?.name}</span>
          <span aria-hidden="true">·</span>
          <span>{opportunityLabel(opp.type)}</span>
          {opp.fee && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-paper">{opp.fee}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
