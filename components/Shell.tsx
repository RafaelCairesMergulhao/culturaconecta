"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { bestOpportunity, pulse, sintonia, unreadCount } from "@/lib/format";
import { jamOpen } from "@/lib/music";
import { DEFAULT_PREFS, opportunityLabel } from "@/lib/policy";
import { applyPrefs } from "@/lib/prefs";
import type { ClientState } from "@/lib/types";
import { NextGoalCard } from "./Conquistas";
import { Icon, type IconName } from "./Icon";
import { useSocial } from "./SocialContext";
import { Avatar, Eyebrow, Logo } from "./ui";

const PUBLIC_PATHS = ["/entrar", "/regras", "/termos", "/privacidade"];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, ready } = useSocial();
  const me = state?.me ?? null;
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const prefsKey = JSON.stringify(me?.prefs ?? DEFAULT_PREFS);

  useEffect(() => {
    applyPrefs(JSON.parse(prefsKey));
  }, [prefsKey]);

  useEffect(() => {
    if (!ready) return;
    if (!me && !isPublic) router.replace("/entrar");
    if (me && pathname === "/entrar") router.replace("/");
  }, [ready, me, isPublic, pathname, router]);

  if (!ready) return <Splash />;

  if (!me) {
    if (!isPublic) return <Splash />;
    return (
      <>
        <div className="app-backdrop" aria-hidden="true" />
        {pathname === "/entrar" ? children : <PublicFrame>{children}</PublicFrame>}
        <Toast />
      </>
    );
  }

  if (pathname === "/entrar") return <Splash />;

  return <AppFrame state={state as ClientState}>{children}</AppFrame>;
}

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="app-backdrop" aria-hidden="true" />
      <div style={{ animation: "cc-pulse 1.6s ease-in-out infinite" }}>
        <Logo />
      </div>
    </div>
  );
}

function PublicFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-5 py-6">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/entrar">
          <Logo />
        </Link>
        <Link href="/entrar" className="rounded-full bg-gradient-to-r from-rosa to-azul px-4 py-2 text-sm font-semibold text-white">
          Entrar
        </Link>
      </header>
      <main>{children}</main>
    </div>
  );
}

function AppFrame({ state, children }: { state: ClientState; children: React.ReactNode }) {
  const pathname = usePathname();
  const me = state.me!;
  const unread = unreadCount(state);
  const profileHref = `/perfil/${me.handle}`;

  const liveJams = state.jams.filter((jam) => jamOpen(jam)).length;
  const nav: { href: string; label: string; icon: IconName; badge?: number }[] = [
    { href: "/", label: "Início", icon: "home" },
    { href: "/explorar", label: "Explorar", icon: "compass" },
    { href: "/jam", label: "Jam", icon: "headphones", badge: liveJams || undefined },
    { href: "/conquistas", label: "Conquistas", icon: "trophy" },
    { href: "/editais", label: "Editais", icon: "doc" },
    { href: "/oportunidades", label: "Oportunidades", icon: "briefcase" },
    { href: "/agenda", label: "Agenda", icon: "calendar" },
    { href: "/mensagens", label: "Mensagens", icon: "chat" },
    { href: "/notificacoes", label: "Avisos", icon: "bell", badge: unread },
    { href: profileHref, label: "Minha vitrine", icon: "user" },
    { href: "/personalizar", label: "Personalizar", icon: "palette" },
    { href: "/patrocinadores", label: "Parceiros", icon: "heart" },
  ];
  if (me.role === "moderator") nav.push({ href: "/moderacao", label: "Moderação", icon: "shield" });

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <div className="app-backdrop" aria-hidden="true" />
      <div className="mx-auto grid min-h-dvh max-w-7xl md:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_330px]">
        <aside className="sticky top-0 hidden h-dvh flex-col gap-5 overflow-y-auto px-4 py-6 md:flex">
          <Link href="/" className="px-2">
            <Logo />
          </Link>
          <nav className="flex flex-col gap-0.5">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] transition ${
                  active(item.href) ? "bg-card font-semibold text-paper" : "text-muted hover:bg-card/60 hover:text-paper"
                }`}
              >
                <span className={active(item.href) ? "text-rosa" : ""}>
                  <Icon name={item.icon} />
                </span>
                {item.label}
                {!!item.badge && (
                  <span className="ml-auto rounded-full bg-rosa px-2 py-0.5 text-xs font-semibold text-white">{item.badge}</span>
                )}
              </Link>
            ))}
          </nav>
          <Link
            href="/publicar"
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rosa to-azul px-4 py-3 font-semibold text-white shadow-lg shadow-rosa/25 transition hover:brightness-110"
          >
            <Icon name="plus" /> Publicar
          </Link>
          <Link href={profileHref} className="mt-auto flex items-center gap-3 rounded-2xl p-2 transition hover:bg-card">
            <Avatar user={me} size="sm" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{me.name}</span>
              <span className="block truncate text-xs text-muted">@{me.handle}</span>
            </span>
          </Link>
          <div className="flex flex-wrap gap-x-3 gap-y-1 px-2 text-xs text-muted">
            <Link href="/regras">Regras</Link>
            <Link href="/termos">Termos</Link>
            <Link href="/privacidade">Privacidade</Link>
            <Link href="/moderacao">Denúncias</Link>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line/60 bg-ink/70 px-4 py-3 backdrop-blur-xl md:hidden">
            <Link href="/">
              <Logo />
            </Link>
            <div className="flex items-center gap-1">
              <HeaderIcon href="/jam" icon="headphones" label="Jam" badge={liveJams || undefined} />
              <HeaderIcon href="/conquistas" icon="trophy" label="Conquistas" />
              <HeaderIcon href="/editais" icon="doc" label="Editais" />
              <HeaderIcon href="/mensagens" icon="chat" label="Mensagens" />
              <HeaderIcon href="/notificacoes" icon="bell" label="Avisos" badge={unread} />
              <HeaderIcon href="/personalizar" icon="palette" label="Personalizar" />
            </div>
          </header>
          <main className="mx-auto w-full max-w-2xl px-4 py-5 pb-32 md:py-8 md:pb-12">{children}</main>
        </div>

        <aside className="sticky top-0 hidden h-dvh flex-col gap-4 overflow-y-auto py-6 pr-4 no-scrollbar xl:flex">
          <SideRail state={state} />
        </aside>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line/60 bg-ink/80 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end">
          <BottomLink href="/" icon="home" label="Início" active={pathname === "/"} />
          <BottomLink href="/explorar" icon="compass" label="Explorar" active={active("/explorar")} />
          <Link href="/publicar" aria-label="Publicar" className="mx-auto -mt-6 grid h-16 w-[72px] place-items-center">
            <span
              className="grid h-full w-full place-items-center bg-gradient-to-br from-rosa to-azul pt-4 text-white shadow-lg"
              style={{ clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" }}
            >
              <Icon name="plus" className="h-6 w-6" strokeWidth={2.4} />
            </span>
          </Link>
          <BottomLink href="/oportunidades" icon="briefcase" label="Vagas" active={active("/oportunidades")} />
          <BottomLink href={profileHref} icon="user" label="Vitrine" active={active(profileHref)} />
        </div>
      </nav>
      <Toast />
    </>
  );
}

function HeaderIcon({ href, icon, label, badge }: { href: string; icon: IconName; label: string; badge?: number }) {
  return (
    <Link href={href} aria-label={label} className="relative rounded-full p-2 text-muted hover:bg-card hover:text-paper">
      <Icon name={icon} />
      {!!badge && (
        <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rosa px-1 text-[10px] font-semibold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

function BottomLink({ href, icon, label, active }: { href: string; icon: IconName; label: string; active: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium ${active ? "text-rosa" : "text-muted"}`}>
      <Icon name={icon} />
      {label}
    </Link>
  );
}

function Toast() {
  const { error, clearError } = useSocial();
  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(clearError, 6000);
    return () => window.clearTimeout(timer);
  }, [error, clearError]);
  if (!error) return null;
  return (
    <div className="fixed inset-x-0 top-4 z-[60] flex justify-center px-4" role="alert">
      <div className="cc-pop flex max-w-md items-start gap-3 rounded-2xl border border-rosa/40 bg-card px-4 py-3 text-sm shadow-2xl">
        <span className="mt-0.5 text-rosa">
          <Icon name="triangle" className="h-4 w-4" />
        </span>
        <span className="flex-1">{error}</span>
        <button type="button" onClick={clearError} aria-label="Fechar" className="text-muted hover:text-paper">
          <Icon name="x" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SideRail({ state }: { state: ClientState }) {
  const me = state.me!;
  const trends = pulse(state).slice(0, 4);
  const top = trends[0]?.score ?? 1;
  const radar = bestOpportunity(state, me.handle);
  const tuned = state.users
    .filter((user) => user.handle !== me.handle && user.role === "member")
    .map((user) => ({ user, tune: sintonia(state, me.handle, user.handle) }))
    .sort((a, b) => b.tune.score - a.tune.score)
    .slice(0, 3);

  return (
    <>
      <Link href="/explorar" className="flex items-center gap-2 rounded-2xl border border-line bg-card px-4 py-3 text-sm text-muted hover:text-paper">
        <Icon name="search" className="h-4 w-4" /> Buscar pessoas, vagas e eventos
      </Link>

      {radar && (
        <Link href={`/oportunidades#${radar.opp.id}`} className="block rounded-3xl bg-gradient-to-br from-rosa/90 to-azul/90 p-[1px]">
          <div className="rounded-[calc(1.5rem-1px)] bg-ink/85 p-4">
            <Eyebrow>Radar · {radar.match}% com você</Eyebrow>
            <p className="mt-2 font-semibold leading-snug">{radar.opp.title}</p>
            <p className="mt-1 text-sm text-muted">
              {opportunityLabel(radar.opp.type)} · {radar.opp.fee || "a combinar"}
            </p>
          </div>
        </Link>
      )}

      <NextGoalCard state={state} />

      <Link href="/editais" className="block rounded-3xl border border-line bg-card p-4 transition hover:border-rosa/50">
        <Eyebrow>Editais</Eyebrow>
        <p className="mt-1 font-semibold leading-snug">Currículo artístico com o Mapa Cultural</p>
        <p className="mt-1 text-sm text-muted">Texto no formato da inscrição, a partir da sua vitrine.</p>
      </Link>

      <section className="rounded-3xl border border-line bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Pulso da cena</h2>
          <Eyebrow>7 dias</Eyebrow>
        </div>
        <ul className="mt-3 space-y-3">
          {trends.map((item) => (
            <li key={item.category}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{item.category}</span>
                <span className="font-mono text-xs text-muted">{item.posts} posts</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink/50">
                <div className="h-full rounded-full bg-gradient-to-r from-rosa to-azul" style={{ width: `${(item.score / top) * 100}%` }} />
              </div>
            </li>
          ))}
          {trends.length === 0 && <li className="text-sm text-muted">A cena está quieta esta semana.</li>}
        </ul>
      </section>

      <section className="rounded-3xl border border-line bg-card p-4">
        <h2 className="font-semibold">Quem combina com você</h2>
        <ul className="mt-3 space-y-3">
          {tuned.map(({ user, tune }) => (
            <li key={user.handle}>
              <Link href={`/perfil/${user.handle}`} className="flex items-center gap-3">
                <Avatar user={user} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{user.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {tune.shared.length ? tune.shared.slice(0, 3).join(" · ") : `@${user.handle}`}
                  </span>
                </span>
                <span className="font-mono text-sm text-rosa">{tune.score}%</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-line bg-card p-4">
        <h2 className="font-semibold">Próximos encontros</h2>
        <ul className="mt-3 space-y-3">
          {state.events.slice(0, 3).map((event) => {
            const going = state.rsvps.filter((item) => item.eventId === event.id).length;
            return (
              <li key={event.id}>
                <Link href="/agenda" className="block">
                  <span className="block text-sm font-medium">{event.title}</span>
                  <span className="text-xs text-muted">
                    {event.date} · {going} {going === 1 ? "vai" : "vão"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="px-2 text-xs leading-5 text-muted">
        Arte, batalha e poesia cabem aqui. Assédio, ódio, conteúdo sexual, ameaça e atividade ilegal não.{" "}
        <Link href="/regras" className="text-rosa">
          Regras
        </Link>
      </p>
    </>
  );
}
