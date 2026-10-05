"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  achievementsFor,
  isPodium,
  levelOf,
  nicheLabel,
  roleLabel,
  scenePoints,
  TIERS,
  trajectory,
} from "@/lib/achievements";
import { AchievementBadge, ConquistasPanel } from "./Conquistas";
import { NowPlaying } from "./Jam";
import { useRouter } from "next/navigation";
import {
  followerCount,
  followingCount,
  isBlocked,
  isFollowing,
  mediaUrl,
  sintonia,
  TRIANGLE,
  userByHandle,
} from "@/lib/format";
import { kindLabel, opportunityLabel } from "@/lib/policy";
import type { ClientState, Participation, PublicUser } from "@/lib/types";
import { Icon } from "./Icon";
import { PostCard } from "./PostCard";
import { ReportDialog } from "./ReportDialog";
import { useSocial } from "./SocialContext";
import { Avatar, Eyebrow, fieldClass, GhostButton, KindBadge, Meter, Notice, Pill, PrimaryButton } from "./ui";

type Tab = "Publicações" | "Conquistas" | "Oportunidades" | "Depoimentos" | "Agenda" | "Kit de imprensa";

export function ProfileView({ handle }: { handle: string }) {
  const { state, act, auth, busy } = useSocial();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Publicações");

  useEffect(() => {
    const sync = () => {
      if (window.location.hash === "#conquistas") setTab("Conquistas");
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [handle]);
  const [reportOpen, setReportOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [testimonial, setTestimonial] = useState("");
  if (!state?.me) return null;

  const found = userByHandle(state, handle);
  if (!found) return <Notice>Esse perfil não existe ou saiu da rede.</Notice>;
  const artist = found;
  const me = state.me;
  const mine = me.handle === artist.handle;
  const posts = state.posts
    .filter(
      (post) =>
        !post.hidden &&
        (post.authorHandle === artist.handle || (post.feat === artist.handle && post.featStatus === "aceito"))
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const testimonials = state.testimonials.filter((item) => item.artistHandle === artist.handle);
  const events = state.events.filter(
    (event) => event.artistHandles.includes(artist.handle) || event.createdBy === artist.handle
  );
  const opportunities = state.opportunities.filter((item) => item.authorHandle === artist.handle && !item.hidden);
  const blocked = isBlocked(state, artist.handle);
  const following = isFollowing(state, me.handle, artist.handle);
  const followsYou = isFollowing(state, artist.handle, me.handle);
  const tune = sintonia(state, me.handle, artist.handle);
  const cover = mediaUrl(artist.coverId);
  const wroteTestimonial = testimonials.some((item) => item.authorHandle === me.handle);
  const tabs: Tab[] = [
    "Publicações",
    "Conquistas",
    ...(opportunities.length ? (["Oportunidades"] as Tab[]) : []),
    "Depoimentos",
    "Agenda",
    "Kit de imprensa",
  ];
  const badges = achievementsFor(state, artist.handle)
    .filter((item) => item.tier >= 0)
    .sort((a, b) => b.tier - a.tier);
  const level = levelOf(scenePoints(state, artist.handle));

  function openTab(next: Tab) {
    setTab(next);
    const hash = next === "Conquistas" ? "#conquistas" : "";
    if (window.location.hash !== hash) window.history.replaceState(null, "", `${window.location.pathname}${hash}`);
  }

  const vars = { "--accent": artist.prefs.accent, "--accent2": artist.prefs.accent2 } as React.CSSProperties;

  function run(body: Record<string, unknown>) {
    act(body).catch(() => undefined);
  }

  async function sendTestimonial(event: React.FormEvent) {
    event.preventDefault();
    try {
      await act({ action: "testimonial", handle: artist.handle, text: testimonial });
      setTestimonial("");
    } catch {
      /* aviso global */
    }
  }

  return (
    <div style={vars} className="space-y-5">
      <div className="relative -mx-4 -mt-5 sm:mx-0 md:-mt-2">
        <div
          className="relative h-48 overflow-hidden sm:h-60 sm:rounded-[2rem]"
          style={{ background: "linear-gradient(125deg, var(--accent), var(--accent2))" }}
        >
          {cover ? (
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <CoverPattern />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
          <p className="absolute bottom-4 right-5 font-mono text-[10px] uppercase tracking-[0.3em] text-white/85">
            Vitrine · {kindLabel(artist.kind)}
          </p>
        </div>
        <div className="absolute -bottom-14 left-5 sm:left-6" style={{ filter: "drop-shadow(0 0 3px var(--bg)) drop-shadow(0 10px 24px rgba(0,0,0,.35))" }}>
          <Avatar user={artist} size="xl" />
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-end gap-2 pt-1">
        {mine ? (
          <>
            <GhostButton href="/personalizar#vitrine">
              <Icon name="palette" className="h-4 w-4" /> Editar vitrine
            </GhostButton>
            <GhostButton
              onClick={() =>
                auth({ action: "logout" })
                  .then(() => router.replace("/entrar"))
                  .catch(() => undefined)
              }
            >
              <Icon name="logout" className="h-4 w-4" /> Sair
            </GhostButton>
          </>
        ) : (
          <>
            <PrimaryButton disabled={busy || blocked} onClick={() => run({ action: "follow", handle: artist.handle })}>
              {following ? "Seguindo" : followsYou ? "Seguir de volta" : "Seguir"}
            </PrimaryButton>
            <GhostButton href={`/mensagens/${artist.handle}`}>
              <Icon name="chat" className="h-4 w-4" /> Mensagem
            </GhostButton>
            <div className="relative">
              <GhostButton onClick={() => setMoreOpen((value) => !value)} className="px-3">
                <span aria-label="Mais opções">···</span>
              </GhostButton>
              {moreOpen && (
                <div className="cc-pop absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-2xl border border-line bg-card p-1 text-sm shadow-2xl">
                  <MenuItem onClick={() => { setMoreOpen(false); run({ action: "support", handle: artist.handle }); }}>Apoiar este perfil</MenuItem>
                  <MenuItem onClick={() => { setMoreOpen(false); run({ action: blocked ? "unblock" : "block", handle: artist.handle }); }}>
                    {blocked ? "Desbloquear" : "Bloquear"}
                  </MenuItem>
                  <MenuItem onClick={() => { setMoreOpen(false); setReportOpen(true); }}>Denunciar</MenuItem>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{artist.name}</h1>
          <KindBadge kind={artist.kind} />
          {artist.role === "moderator" && (
            <span className="rounded-full bg-azul/15 px-2 py-0.5 text-xs font-semibold text-azul">Equipe</span>
          )}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted">
          <span>@{artist.handle}</span>
          {artist.city && (
            <span className="inline-flex items-center gap-1">
              <Icon name="pin" className="h-3.5 w-3.5" /> {artist.city}
            </span>
          )}
          {followsYou && !mine && <span className="rounded-full bg-ink/50 px-2 py-0.5 text-xs">Segue você</span>}
        </p>
      </div>

      {mine && me.limited && <Notice>Sua conta está limitada. Leia as regras e aguarde a revisão da equipe.</Notice>}

      {mine && (
        <Link href="/editais" className="flex items-center gap-3 rounded-3xl border border-line bg-card p-4 transition hover:border-rosa/50">
          <Icon name="doc" />
          <span className="min-w-0">
            <span className="block font-semibold">Currículo para editais</span>
            <span className="block text-sm text-muted">Puxa o Mapa Cultural e monta o texto da inscrição.</span>
          </span>
        </Link>
      )}

      {artist.bio && <p className="text-[15px] leading-7">{artist.bio}</p>}

      <NowPlaying state={state} handle={artist.handle} />

      <div className="flex flex-wrap gap-2">
        {artist.available && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rosa/15 px-3 py-1 text-sm font-semibold text-rosa">
            <span className="h-2 w-2 rounded-full bg-rosa" /> Aberto a propostas
          </span>
        )}
        {artist.tags.map((tag) => (
          <span key={tag} className="rounded-full border border-line px-3 py-1 text-sm">
            {tag}
          </span>
        ))}
      </div>

      {artist.links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {artist.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-sm font-medium hover:text-rosa"
            >
              <Icon name="link" className="h-3.5 w-3.5" /> {link.label}
            </a>
          ))}
        </div>
      )}

      <div className="grid grid-cols-4 gap-2 text-center">
        <Stat value={followerCount(state, artist.handle)} label="Seguidores" />
        <Stat value={followingCount(state, artist.handle)} label="Seguindo" />
        <Stat value={posts.length} label="Posts" />
        <Stat value={events.length} label="Eventos" />
      </div>

      {(badges.length > 0 || artist.niches.length > 0) && (
        <button
          type="button"
          onClick={() => openTab("Conquistas")}
          className="flex w-full items-center gap-3 rounded-3xl border border-line bg-card p-3 text-left transition hover:border-rosa/50"
        >
          <span className="flex -space-x-2.5">
            {badges.slice(0, 4).map((item) => (
              <AchievementBadge key={item.id} item={item} size="sm" />
            ))}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{level.name}</span>
            <span className="block truncate text-xs text-muted">
              {badges.length} {badges.length === 1 ? "conquista" : "conquistas"}
              {badges[0] && ` · maior: ${badges[0].title} ${TIERS[badges[0].tier].name}`}
            </span>
          </span>
          <span className="text-xs font-semibold text-rosa">Ver trajetória</span>
        </button>
      )}

      {!mine && (
        <div className="rounded-3xl border border-line bg-card p-4">
          <div className="flex items-baseline justify-between">
            <Eyebrow>Sintonia com você</Eyebrow>
            <span className="text-2xl font-semibold text-gradient">{tune.score}%</span>
          </div>
          <div className="mt-2">
            <Meter value={tune.score} />
          </div>
          <p className="mt-2 text-xs text-muted">
            {tune.shared.length
              ? `Vocês se cruzam em ${tune.shared.slice(0, 4).join(", ")}.`
              : "Ainda sem interesses em comum. Interaja para aumentar a sintonia."}
          </p>
        </div>
      )}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
        {tabs.map((item) => (
          <Pill key={item} active={tab === item} onClick={() => openTab(item)}>
            {item}
          </Pill>
        ))}
      </div>

      {tab === "Publicações" && (
        <div className="space-y-4">
          {posts.length ? posts.map((post) => <PostCard key={post.id} post={post} />) : <Notice>Ainda sem publicações.</Notice>}
        </div>
      )}

      {tab === "Conquistas" && <ConquistasPanel state={state} user={artist} mine={mine} />}

      {tab === "Oportunidades" && (
        <div className="space-y-3">
          {opportunities.map((item) => (
            <Link key={item.id} href={`/oportunidades#${item.id}`} className="block rounded-3xl border border-line bg-card p-4">
              <Eyebrow>
                {opportunityLabel(item.type)} · {item.open ? "aberta" : "encerrada"}
              </Eyebrow>
              <p className="mt-1 font-semibold">{item.title}</p>
              <p className="text-sm text-muted">{[item.city, item.date, item.fee].filter(Boolean).join(" · ")}</p>
            </Link>
          ))}
        </div>
      )}

      {tab === "Depoimentos" && (
        <div className="space-y-3">
          {!mine && !wroteTestimonial && (
            <form onSubmit={sendTestimonial} className="rounded-3xl border border-line bg-card p-4">
              <p className="text-sm font-semibold">Deixe um depoimento profissional</p>
              <textarea
                value={testimonial}
                onChange={(event) => setTestimonial(event.target.value)}
                maxLength={300}
                rows={3}
                placeholder={`Como foi trabalhar com ${artist.name.split(" ")[0]}?`}
                className={`${fieldClass} mt-2`}
              />
              <div className="mt-2 flex justify-end">
                <PrimaryButton type="submit" disabled={busy || !testimonial.trim()}>
                  Publicar depoimento
                </PrimaryButton>
              </div>
            </form>
          )}
          {testimonials.length ? (
            testimonials.map((item) => {
              const author = item.authorHandle ? userByHandle(state, item.authorHandle) : undefined;
              const canRemove = mine || item.authorHandle === me.handle || me.role === "moderator";
              return (
                <blockquote key={item.id} className="rounded-3xl border border-line bg-card p-4">
                  <p className="text-[15px] leading-7">“{item.text}”</p>
                  <footer className="mt-3 flex items-center gap-2 text-sm text-muted">
                    <Avatar user={author} size="xs" />
                    {author ? (
                      <Link href={`/perfil/${author.handle}`} className="font-medium text-paper">
                        {item.author}
                      </Link>
                    ) : (
                      <span>{item.author}</span>
                    )}
                    {canRemove && (
                      <button
                        type="button"
                        className="ml-auto text-xs hover:text-paper"
                        onClick={() => run({ action: "deleteTestimonial", testimonialId: item.id })}
                      >
                        Remover
                      </button>
                    )}
                  </footer>
                </blockquote>
              );
            })
          ) : (
            <Notice>Ainda sem depoimentos.</Notice>
          )}
        </div>
      )}

      {tab === "Agenda" && (
        <div className="space-y-3">
          {events.length ? (
            events.map((event) => (
              <Link key={event.id} href="/agenda" className="flex items-center gap-4 rounded-3xl border border-line bg-card p-4">
                <span className="grid h-12 w-14 shrink-0 place-items-center bg-gradient-to-br from-rosa to-azul pt-4 text-white" style={{ clipPath: TRIANGLE }}>
                  <Icon name="calendar" className="h-4 w-4" />
                </span>
                <span>
                  <span className="block font-semibold">{event.title}</span>
                  <span className="text-sm text-muted">
                    {event.date} · {event.location}
                  </span>
                </span>
              </Link>
            ))
          ) : (
            <Notice>Nenhum evento confirmado.</Notice>
          )}
        </div>
      )}

      {tab === "Kit de imprensa" && <PressKit state={state} artist={artist} events={events.length} />}

      <ReportDialog
        open={reportOpen}
        title={`Denunciar @${artist.handle}`}
        targetType="user"
        targetId={artist.handle}
        onClose={() => setReportOpen(false)}
      />
    </div>
  );
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="block w-full rounded-xl px-3 py-2 text-left hover:bg-ink/40">
      {children}
    </button>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-2 py-3">
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}

function CoverPattern() {
  const cells = Array.from({ length: 28 }, (_, index) => index);
  return (
    <svg viewBox="0 0 280 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full opacity-30" aria-hidden="true">
      {cells.map((index) => {
        const col = index % 14;
        const row = Math.floor(index / 14);
        const x = col * 20;
        const y = row * 50;
        const up = (col + row) % 2 === 0;
        return (
          <path
            key={index}
            d={up ? `M${x + 10} ${y} L${x + 30} ${y + 50} L${x - 10} ${y + 50}Z` : `M${x - 10} ${y} L${x + 30} ${y} L${x + 10} ${y + 50}Z`}
            fill="white"
            opacity={((index * 37) % 10) / 22}
          />
        );
      })}
    </svg>
  );
}

function PressKit({ state, artist, events }: { state: ClientState; artist: PublicUser; events: number }) {
  const [copied, setCopied] = useState(false);
  const followers = followerCount(state, artist.handle);
  const testimonials = state.testimonials.filter((item) => item.artistHandle === artist.handle);
  const agenda = state.events.filter((event) => event.artistHandles.includes(artist.handle) || event.createdBy === artist.handle);
  const unlocked = achievementsFor(state, artist.handle)
    .filter((item) => item.tier >= 0)
    .sort((a, b) => b.tier - a.tier);
  const weight = (item: Participation) =>
    (item.status === "confirmada" ? 10 : 0) + (item.role === "campeao" ? 5 : isPodium(item.role) ? 3 : item.role === "jurado" ? 2 : 0);
  const highlights = trajectory(state, artist.handle)
    .slice()
    .sort((a, b) => weight(b) - weight(a) || b.date.localeCompare(a.date))
    .slice(0, 6);

  async function download() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const [r, g, b] = [1, 3, 5].map((start) => parseInt(artist.prefs.accent.slice(start, start + 2), 16));
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, 210, 38, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text(artist.name, 18, 22);
    doc.setFontSize(11);
    doc.text(`@${artist.handle} · ${kindLabel(artist.kind)}${artist.city ? ` · ${artist.city}` : ""}`, 18, 31);
    doc.setTextColor(20, 24, 40);
    let y = 52;
    const section = (title: string) => {
      doc.setFontSize(13);
      doc.setTextColor(r, g, b);
      doc.text(title.toUpperCase(), 18, y);
      doc.setTextColor(20, 24, 40);
      doc.setFontSize(11);
      y += 8;
    };
    section("Sobre");
    const bio = doc.splitTextToSize(artist.bio || "Sem descrição.", 174);
    doc.text(bio, 18, y);
    y += bio.length * 6 + 6;
    if (artist.tags.length) {
      section("Especialidades");
      doc.text(artist.tags.join(" · "), 18, y);
      y += 12;
    }
    section("Números na rede");
    doc.text(`${followers} seguidores · ${events} eventos · ${testimonials.length} depoimentos · ${unlocked.length} conquistas`, 18, y);
    y += 12;
    if (highlights.length || unlocked.length) {
      section(`Trajetória · ${levelOf(scenePoints(state, artist.handle)).name}`);
      for (const item of highlights) {
        const line = `- ${roleLabel(item.role)} (${nicheLabel(item.niche)}) — ${item.eventTitle}, ${item.date.slice(0, 4)}${item.city ? `, ${item.city}` : ""}${item.status === "confirmada" ? " · confirmado pela organização" : ""}`;
        const lines = doc.splitTextToSize(line, 174);
        doc.text(lines, 18, y);
        y += lines.length * 6 + 1;
      }
      if (unlocked.length) {
        const lines = doc.splitTextToSize(
          `Conquistas: ${unlocked.slice(0, 8).map((item) => `${item.title} ${TIERS[item.tier].name}`).join(" · ")}`,
          174
        );
        doc.text(lines, 18, y);
        y += lines.length * 6;
      }
      y += 6;
    }
    if (agenda.length) {
      section("Agenda");
      for (const event of agenda.slice(0, 8)) {
        doc.text(`- ${event.title} — ${event.date} (${event.location})`, 18, y);
        y += 7;
      }
      y += 5;
    }
    if (testimonials.length) {
      section("Depoimentos");
      for (const item of testimonials.slice(0, 4)) {
        const lines = doc.splitTextToSize(`"${item.text}" — ${item.author}`, 174);
        doc.text(lines, 18, y);
        y += lines.length * 6 + 3;
      }
      y += 4;
    }
    if (artist.links.length) {
      section("Links");
      for (const link of artist.links) {
        doc.text(`${link.label}: ${link.url}`, 18, y);
        y += 7;
      }
    }
    doc.setFontSize(9);
    doc.setTextColor(120, 130, 150);
    doc.text(`Vitrine: ${window.location.origin}/perfil/${artist.handle} · gerado pela Cultura Conecta`, 18, 287);
    doc.save(`kit-imprensa-${artist.handle}.pdf`);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/perfil/${artist.handle}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-card">
      <div className="bg-gradient-to-r from-rosa to-azul p-5 text-white">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/80">Kit de imprensa</p>
        <p className="mt-2 text-2xl font-semibold">{artist.name}</p>
        <p className="text-sm text-white/80">{[kindLabel(artist.kind), artist.city].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="space-y-4 p-5">
        <p className="leading-7">{artist.bio}</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat value={followers} label="Seguidores" />
          <Stat value={events} label="Eventos" />
          <Stat value={testimonials.length} label="Depoimentos" />
        </div>
        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={download}>
            <Icon name="doc" className="h-4 w-4" /> Baixar PDF
          </PrimaryButton>
          <GhostButton onClick={copyLink}>
            <Icon name="link" className="h-4 w-4" /> {copied ? "Link copiado" : "Copiar link da vitrine"}
          </GhostButton>
        </div>
        <p className="text-xs text-muted">O PDF usa a cor principal da vitrine e junta bio, números, trajetória, conquistas, agenda, depoimentos e links.</p>
      </div>
    </div>
  );
}
