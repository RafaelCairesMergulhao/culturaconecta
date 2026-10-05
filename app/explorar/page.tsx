"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SceneRanking } from "@/components/Conquistas";
import { Icon } from "@/components/Icon";
import { useSocial } from "@/components/SocialContext";
import { Avatar, Eyebrow, fieldClass, KindBadge, Pill } from "@/components/ui";
import { pulse, rising, sintonia, userByHandle } from "@/lib/format";
import { ACCOUNT_KINDS, opportunityLabel } from "@/lib/policy";
import type { AccountKind } from "@/lib/types";

export default function ExplorarPage() {
  const { state } = useSocial();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<AccountKind | "todos">("todos");
  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!state || q.length < 2) return null;
    const has = (text: string) => text.toLowerCase().includes(q);
    return {
      users: state.users.filter((user) => has(`${user.name} ${user.handle} ${user.tags.join(" ")} ${user.city}`)),
      posts: state.posts.filter((post) => !post.hidden && has(`${post.text} ${post.category}`)),
      opportunities: state.opportunities.filter((item) => !item.hidden && has(`${item.title} ${item.description} ${item.tags.join(" ")}`)),
      events: state.events.filter((event) => has(`${event.title} ${event.location} ${event.category}`)),
    };
  }, [state, q]);

  if (!state?.me) return null;
  const me = state.me.handle;
  const trends = pulse(state);
  const top = trends[0]?.score ?? 1;
  const up = rising(state).slice(0, 5);
  const directory = state.users
    .filter((user) => user.role === "member" && user.handle !== me && (kind === "todos" || user.kind === kind))
    .map((user) => ({ user, tune: sintonia(state, me, user.handle) }))
    .sort((a, b) => b.tune.score - a.tune.score);

  return (
    <div className="space-y-6">
      <header>
        <Eyebrow>Explorar</Eyebrow>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">O mapa da cena</h1>
      </header>

      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
          <Icon name="search" className="h-4 w-4" />
        </span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Busque pessoas, tags, vagas, eventos..."
          className={`${fieldClass} pl-10`}
          autoFocus
        />
      </div>

      {results ? (
        <div className="space-y-6">
          <ResultGroup title="Pessoas e marcas" empty={!results.users.length}>
            {results.users.map((user) => (
              <Link key={user.handle} href={`/perfil/${user.handle}`} className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3">
                <Avatar user={user} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{user.name}</span>
                  <span className="text-sm text-muted">@{user.handle}</span>
                </span>
                <KindBadge kind={user.kind} />
              </Link>
            ))}
          </ResultGroup>
          <ResultGroup title="Oportunidades" empty={!results.opportunities.length}>
            {results.opportunities.map((item) => (
              <Link key={item.id} href={`/oportunidades#${item.id}`} className="block rounded-2xl border border-line bg-card p-3">
                <span className="text-xs font-semibold text-rosa">{opportunityLabel(item.type)}</span>
                <span className="block font-medium">{item.title}</span>
              </Link>
            ))}
          </ResultGroup>
          <ResultGroup title="Eventos" empty={!results.events.length}>
            {results.events.map((event) => (
              <Link key={event.id} href="/agenda" className="block rounded-2xl border border-line bg-card p-3">
                <span className="block font-medium">{event.title}</span>
                <span className="text-sm text-muted">{event.date}</span>
              </Link>
            ))}
          </ResultGroup>
          <ResultGroup title="Publicações" empty={!results.posts.length}>
            {results.posts.map((post) => (
              <Link key={post.id} href={`/post/${post.id}`} className="block rounded-2xl border border-line bg-card p-3 text-sm leading-6">
                <span className="font-semibold">{userByHandle(state, post.authorHandle)?.name}: </span>
                {post.text || "Foto"}
              </Link>
            ))}
          </ResultGroup>
        </div>
      ) : (
        <>
          <section className="rounded-3xl border border-line bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Pulso da cena</h2>
              <Eyebrow>últimos 7 dias</Eyebrow>
            </div>
            <p className="mt-1 text-sm text-muted">O que mais movimentou a rede, somando publicações, reações, comentários e reposts.</p>
            <div className="mt-4 flex h-40 items-end gap-2">
              {trends.slice(0, 8).map((item) => (
                <div key={item.category} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-xl bg-gradient-to-t from-rosa to-azul"
                    style={{ height: `${Math.max(8, (item.score / top) * 120)}px` }}
                    title={`${item.posts} publicações`}
                  />
                  <span className="w-full truncate text-center text-[11px] text-muted">{item.category}</span>
                </div>
              ))}
              {trends.length === 0 && <p className="text-sm text-muted">Sem movimento nesta semana.</p>}
            </div>
          </section>

          <SceneRanking state={state} />

          <section className="rounded-3xl border border-line bg-card p-5">
            <h2 className="text-lg font-semibold">Em ascensão</h2>
            <p className="mt-1 text-sm text-muted">Quem mais recebeu retorno da cena nesta semana, feats contam para os dois.</p>
            <ol className="mt-4 space-y-3">
              {up.map((item, index) => {
                const user = userByHandle(state, item.handle);
                if (!user) return null;
                return (
                  <li key={item.handle}>
                    <Link href={`/perfil/${user.handle}`} className="flex items-center gap-3">
                      <span className="w-5 font-mono text-sm text-muted">{index + 1}</span>
                      <Avatar user={user} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{user.name}</span>
                        <span className="text-xs text-muted">@{user.handle}</span>
                      </span>
                      <span className="font-mono text-sm text-rosa">+{item.score}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Diretório por sintonia</h2>
              <p className="text-sm text-muted">Artistas, produtoras, estúdios e marcas, de quem mais combina com você para quem menos.</p>
            </div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
              <Pill active={kind === "todos"} onClick={() => setKind("todos")}>
                Todos
              </Pill>
              {ACCOUNT_KINDS.map((item) => (
                <Pill key={item.id} active={kind === item.id} onClick={() => setKind(item.id)}>
                  {item.label}
                </Pill>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {directory.map(({ user, tune }) => (
                <Link key={user.handle} href={`/perfil/${user.handle}`} className="rounded-3xl border border-line bg-card p-4 transition hover:border-rosa/50">
                  <div className="flex items-center gap-3">
                    <Avatar user={user} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{user.name}</span>
                      <KindBadge kind={user.kind} />
                    </span>
                    <span className="text-xl font-semibold text-gradient">{tune.score}%</span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-muted">{user.bio}</p>
                </Link>
              ))}
              {directory.length === 0 && <p className="text-sm text-muted">Ninguém desse tipo ainda.</p>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function ResultGroup({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-mono text-xs uppercase tracking-widest text-muted">{title}</h2>
      {empty ? <p className="text-sm text-muted">Nada encontrado.</p> : children}
    </section>
  );
}
