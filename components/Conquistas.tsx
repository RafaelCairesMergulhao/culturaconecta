"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  achievementsFor,
  isPodium,
  levelOf,
  nextGoal,
  NICHES,
  nicheIcon,
  nicheLabel,
  progressOf,
  relevantAchievements,
  ROLES,
  roleLabel,
  scenePoints,
  TIERS,
  trajectory,
  type Achievement,
} from "@/lib/achievements";
import { TRIANGLE, userByHandle } from "@/lib/format";
import type { ClientState, Niche, Participation, ParticipationRole, PublicUser } from "@/lib/types";
import { Icon } from "./Icon";
import { useSocial } from "./SocialContext";
import { Avatar, Eyebrow, Field, fieldClass, GhostButton, Meter, Notice, Pill, PrimaryButton } from "./ui";

const INNER = "polygon(50% 17%, 88% 88%, 12% 88%)";

const BADGE_SIZES = {
  sm: "h-9 w-10",
  md: "h-[58px] w-[66px]",
  lg: "h-[92px] w-[104px]",
} as const;

export function AchievementBadge({ item, size = "md" }: { item: Achievement; size?: keyof typeof BADGE_SIZES }) {
  const unlocked = item.tier >= 0;
  const tier = unlocked ? TIERS[item.tier] : null;
  const icon = size === "sm" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-7 w-7";
  return (
    <span className={`relative inline-block shrink-0 ${BADGE_SIZES[size]}`} title={`${item.title}${tier ? ` · ${tier.name}` : ""}`}>
      <span
        className="absolute inset-0"
        style={{
          clipPath: TRIANGLE,
          background: tier ? `linear-gradient(150deg, ${tier.from}, ${tier.to})` : "var(--line)",
        }}
      />
      <span
        className="absolute inset-0 grid place-items-center pt-[22%]"
        style={{
          clipPath: INNER,
          background: tier ? `linear-gradient(150deg, ${tier.to}, #0b0f1a)` : "var(--bg2)",
        }}
      >
        <span className={tier ? "text-white" : "text-muted"}>
          <Icon name={item.icon} className={icon} strokeWidth={2} />
        </span>
      </span>
      {unlocked && item.verified && size !== "sm" && (
        <span className="absolute -bottom-1 right-0 grid h-5 w-5 place-items-center rounded-full border-2 border-[var(--bg)] bg-sky-500 text-white">
          <Icon name="check" className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
      )}
    </span>
  );
}

function tierName(item: Achievement) {
  return item.tier >= 0 ? TIERS[item.tier].name : "Bloqueada";
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day))
  );
}

export function ConquistasPanel({ state, user, mine }: { state: ClientState; user: PublicUser; mine: boolean }) {
  const { act, busy } = useSocial();
  const [adding, setAdding] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const me = state.me!.handle;

  const list = useMemo(() => achievementsFor(state, user.handle), [state, user.handle]);
  const relevant = relevantAchievements(list, user.niches);
  const visible = showAll ? list.slice().sort((a, b) => b.tier - a.tier || progressOf(b) - progressOf(a)) : relevant;
  const unlocked = list.filter((item) => item.tier >= 0);
  const points = scenePoints(state, user.handle);
  const level = levelOf(points);
  const entries = trajectory(state, user.handle, mine);
  const counted = entries.filter((item) => item.status === "declarada" || item.status === "confirmada");
  const titles = counted.filter((item) => item.status === "confirmada" && item.role === "campeao").length;
  const verifiedShare = counted.length
    ? Math.round((counted.filter((item) => item.status === "confirmada").length / counted.length) * 100)
    : 0;
  const toConfirm = mine
    ? state.participations.filter((item) => item.organizerHandle === me && item.status === "pendente")
    : [];

  function run(body: Record<string, unknown>) {
    act(body).catch(() => undefined);
  }

  return (
    <div className="space-y-5">
      <section
        className="relative overflow-hidden rounded-3xl border border-line bg-card p-5"
        style={{ backgroundImage: "radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 60%)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <Eyebrow>Nível na cena</Eyebrow>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-gradient">{level.name}</p>
            <p className="mt-1 text-sm text-muted">
              {points} pontos de cena
              {level.next ? ` · faltam ${level.toNext} para ${level.next}` : " · topo da trajetória"}
            </p>
          </div>
          <div className="flex -space-x-3">
            {unlocked
              .slice()
              .sort((a, b) => b.tier - a.tier)
              .slice(0, 3)
              .map((item) => (
                <AchievementBadge key={item.id} item={item} size="md" />
              ))}
          </div>
        </div>
        <div className="mt-4">
          <Meter value={level.progress} />
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          <MiniStat value={counted.length} label="Participações" />
          <MiniStat value={titles} label="Títulos" />
          <MiniStat value={unlocked.length} label="Conquistas" />
          <MiniStat value={`${verifiedShare}%`} label="Verificado" />
        </div>
      </section>

      <section className="space-y-2">
        <Eyebrow>Nichos</Eyebrow>
        {user.niches.length ? (
          <div className="flex flex-wrap gap-2">
            {user.niches.map((niche) => (
              <span key={niche} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-sm">
                <Icon name={nicheIcon(niche)} className="h-3.5 w-3.5 text-rosa" /> {nicheLabel(niche)}
              </span>
            ))}
          </div>
        ) : mine ? (
          <Notice>
            Escolha seus nichos em{" "}
            <Link href="/personalizar#vitrine" className="font-semibold text-rosa">
              Personalizar
            </Link>{" "}
            para ver as conquistas certas para você.
          </Notice>
        ) : (
          <p className="text-sm text-muted">Ainda sem nichos escolhidos.</p>
        )}
      </section>

      {toConfirm.length > 0 && (
        <section className="space-y-2 rounded-3xl border border-rosa/50 bg-card p-4">
          <p className="font-semibold">Pedidos para você confirmar</p>
          <p className="text-sm text-muted">Confirme só o que aconteceu de verdade. Sua palavra vira selo de verificado na trajetória da pessoa.</p>
          {toConfirm.map((item) => {
            const who = userByHandle(state, item.userHandle);
            return (
              <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-ink/30 p-3">
                <Avatar user={who} size="sm" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold">{who?.name ?? item.userHandle}</p>
                  <p className="text-muted">
                    {item.eventTitle} · {roleLabel(item.role)} · {nicheLabel(item.niche)} · {formatDate(item.date)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <PrimaryButton disabled={busy} onClick={() => run({ action: "decideParticipation", participationId: item.id, accept: true })}>
                    Confirmar
                  </PrimaryButton>
                  <GhostButton disabled={busy} onClick={() => run({ action: "decideParticipation", participationId: item.id, accept: false })}>
                    Recusar
                  </GhostButton>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Conquistas</h2>
            <p className="text-sm text-muted">Bronze, Prata, Ouro e Lenda. O selo azul indica que a organização confirmou.</p>
          </div>
          <button type="button" onClick={() => setShowAll((value) => !value)} className="shrink-0 text-sm font-medium text-rosa">
            {showAll ? "Só as minhas" : "Ver todas"}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {visible.map((item) => (
            <AchievementCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Trajetória</h2>
            <p className="text-sm text-muted">Batalhas, shows, juris, oficinas e eventos realizados.</p>
          </div>
          {mine && (
            <PrimaryButton onClick={() => setAdding((value) => !value)}>
              <Icon name={adding ? "x" : "plus"} className="h-4 w-4" /> {adding ? "Fechar" : "Registrar participação"}
            </PrimaryButton>
          )}
        </div>
        {adding && <ParticipationForm state={state} onDone={() => setAdding(false)} />}
        {entries.length === 0 ? (
          <Notice>{mine ? "Registre sua primeira participação e comece a desbloquear conquistas." : "Ainda sem participações registradas."}</Notice>
        ) : (
          <ol className="relative space-y-3 pl-7 before:absolute before:bottom-2 before:left-[9px] before:top-2 before:w-px before:bg-line">
            {entries.map((item) => (
              <TrajectoryItem key={item.id} state={state} item={item} canRemove={mine || state.me!.role === "moderator"} />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function MiniStat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-2xl bg-ink/40 px-1 py-2.5">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-[10px] text-muted">{label}</div>
    </div>
  );
}

function AchievementCard({ item }: { item: Achievement }) {
  const unlocked = item.tier >= 0;
  const tier = unlocked ? TIERS[item.tier] : null;
  return (
    <div className={`flex flex-col items-center rounded-3xl border bg-card p-4 text-center ${unlocked ? "border-line" : "border-dashed border-line/70"}`}>
      <AchievementBadge item={item} size="lg" />
      <p className={`mt-3 text-sm font-semibold leading-tight ${unlocked ? "" : "text-muted"}`}>{item.title}</p>
      <p
        className="mt-0.5 font-mono text-[10px] uppercase tracking-widest"
        style={tier ? { color: tier.from } : undefined}
      >
        {tierName(item)}
        {unlocked && (item.verified ? " · verificada" : " · declarada")}
      </p>
      <p className="mt-2 line-clamp-2 text-xs text-muted">{item.description}</p>
      <div className="mt-3 w-full">
        <Meter value={progressOf(item)} />
        <p className="mt-1 text-[11px] text-muted">
          {item.next === null
            ? `${item.value} ${item.unit} · nível máximo`
            : `${item.value}/${item.next} ${item.unit} para ${TIERS[item.tier + 1].name}`}
        </p>
      </div>
    </div>
  );
}

function TrajectoryItem({ state, item, canRemove }: { state: ClientState; item: Participation; canRemove: boolean }) {
  const { act } = useSocial();
  const organizer = item.organizerHandle ? userByHandle(state, item.organizerHandle) : undefined;
  const podium = isPodium(item.role);
  const champion = item.role === "campeao";
  return (
    <li className="relative">
      <span
        className={`absolute -left-7 top-4 grid h-5 w-5 place-items-center ${champion ? "bg-gradient-to-br from-amber-300 to-amber-600" : "bg-gradient-to-br from-rosa to-azul"}`}
        style={{ clipPath: TRIANGLE }}
      />
      <div className={`rounded-2xl border bg-card p-3.5 ${item.status === "recusada" ? "border-line opacity-60" : "border-line"}`}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink/50 text-rosa">
            <Icon name={champion ? "crown" : podium ? "medal" : nicheIcon(item.niche)} className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-snug">{item.eventTitle}</p>
            <p className="text-sm">
              <span className={champion ? "font-semibold text-amber-400" : podium ? "font-semibold text-rosa" : ""}>{roleLabel(item.role)}</span>
              <span className="text-muted"> · {nicheLabel(item.niche)}</span>
            </p>
            <p className="text-xs text-muted">{[formatDate(item.date), item.city].filter(Boolean).join(" · ")}</p>
            {item.note && <p className="mt-1 text-sm text-muted">{item.note}</p>}
            <p className="mt-2 text-xs">
              {item.status === "confirmada" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 font-semibold text-sky-400">
                  <Icon name="check" className="h-3 w-3" strokeWidth={3} /> Confirmada por {organizer?.name ?? "organização"}
                </span>
              )}
              {item.status === "declarada" && <span className="rounded-full bg-ink/50 px-2 py-0.5 text-muted">Declarada pelo perfil</span>}
              {item.status === "pendente" && (
                <span className="rounded-full bg-rosa/15 px-2 py-0.5 text-rosa">Aguardando {organizer?.name ?? "organização"}</span>
              )}
              {item.status === "recusada" && <span className="rounded-full bg-ink/50 px-2 py-0.5 text-muted">Não confirmada pela organização</span>}
            </p>
          </div>
          {canRemove && (
            <button
              type="button"
              onClick={() => act({ action: "deleteParticipation", participationId: item.id }).catch(() => undefined)}
              className="p-1 text-muted hover:text-paper"
              title="Remover da trajetória"
            >
              <Icon name="trash" className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function localToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function ParticipationForm({ state, onDone }: { state: ClientState; onDone: () => void }) {
  const { act, busy } = useSocial();
  const me = state.me!;
  const ordered = [...NICHES].sort((a, b) => Number(me.niches.includes(b.id)) - Number(me.niches.includes(a.id)));
  const [source, setSource] = useState<"fora" | "agenda">("fora");
  const [niche, setNiche] = useState<Niche>(me.niches[0] ?? "mc");
  const [role, setRole] = useState<ParticipationRole>("competidor");
  const [eventId, setEventId] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(localToday());
  const [city, setCity] = useState(me.city);
  const [organizer, setOrganizer] = useState("");
  const [note, setNote] = useState("");
  const now = Date.now();
  const agenda = state.events.filter((event) => !event.startsAt || new Date(event.startsAt).getTime() <= now);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await act(
        source === "agenda"
          ? { action: "participation", eventId, niche, role, date, note }
          : { action: "participation", eventTitle: title, date, city, organizerHandle: organizer.replace(/^@/, ""), niche, role, note }
      );
      onDone();
    } catch {
      /* aviso global */
    }
  }

  return (
    <form onSubmit={submit} className="cc-pop space-y-4 rounded-3xl border border-rosa/40 bg-card p-5">
      <div className="flex gap-2">
        <Pill active={source === "fora"} onClick={() => setSource("fora")}>
          Evento de fora
        </Pill>
        <Pill active={source === "agenda"} onClick={() => setSource("agenda")}>
          Evento da agenda
        </Pill>
      </div>

      <Field label="Nicho">
        <div className="-mx-1 flex flex-wrap gap-1.5">
          {ordered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setNiche(item.id)}
              title={item.hint}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                niche === item.id ? "border-transparent bg-gradient-to-r from-rosa to-azul font-semibold text-white" : "border-line hover:border-rosa/50"
              }`}
            >
              <Icon name={item.icon} className="h-3.5 w-3.5" /> {item.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Como você participou">
        <select value={role} onChange={(event) => setRole(event.target.value as ParticipationRole)} className={fieldClass}>
          {ROLES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>

      {source === "agenda" ? (
        <>
          <Field label="Evento" hint="Quem criou o evento recebe um pedido para confirmar.">
            <select value={eventId} onChange={(event) => setEventId(event.target.value)} className={fieldClass}>
              <option value="">Escolha um evento</option>
              {agenda.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} · {item.date}
                </option>
              ))}
            </select>
          </Field>
          {eventId && !state.events.find((item) => item.id === eventId)?.startsAt && (
            <Field label="Data">
              <input type="date" value={date} max={localToday()} onChange={(event) => setDate(event.target.value)} className={fieldClass} />
            </Field>
          )}
        </>
      ) : (
        <>
          <Field label="Nome do evento">
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} className={fieldClass} placeholder="ex.: Batalha da Aldeia, Slam BR, Cypher do Moscoso" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Data">
              <input type="date" value={date} max={localToday()} onChange={(event) => setDate(event.target.value)} className={fieldClass} />
            </Field>
            <Field label="Cidade">
              <input value={city} onChange={(event) => setCity(event.target.value)} maxLength={60} className={fieldClass} placeholder="Vitória, ES" />
            </Field>
          </div>
          <Field label="Quem organizou está na rede? (opcional)" hint="Se informar o @, a organização pode confirmar e sua participação ganha selo de verificada.">
            <input value={organizer} onChange={(event) => setOrganizer(event.target.value)} list="cc-organizers" className={fieldClass} placeholder="@valecultural" />
            <datalist id="cc-organizers">
              {state.users
                .filter((user) => user.handle !== me.handle && user.role === "member")
                .map((user) => (
                  <option key={user.handle} value={user.handle}>
                    {user.name}
                  </option>
                ))}
            </datalist>
          </Field>
        </>
      )}

      <Field label="Detalhe (opcional)">
        <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={60} className={fieldClass} placeholder="ex.: final contra MC X, tema território" />
      </Field>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">Registre só o que aconteceu. Informação falsa pode ser removida pela equipe.</p>
        <PrimaryButton type="submit" disabled={busy || (source === "agenda" ? !eventId : !title.trim())}>
          Salvar na trajetória
        </PrimaryButton>
      </div>
    </form>
  );
}

export function NextGoalCard({ state }: { state: ClientState }) {
  const me = state.me;
  const goal = useMemo(() => (me ? nextGoal(achievementsFor(state, me.handle), me.niches) : undefined), [state, me]);
  if (!me || !goal || goal.next === null) return null;
  return (
    <Link href="/conquistas" className="flex items-center gap-3 rounded-3xl border border-line bg-card p-4 transition hover:border-rosa/50">
      <AchievementBadge item={goal} size="md" />
      <div className="min-w-0 flex-1">
        <Eyebrow>Próxima conquista</Eyebrow>
        <p className="truncate font-semibold">
          {goal.title} · {TIERS[goal.tier + 1].name}
        </p>
        <div className="mt-1.5">
          <Meter value={progressOf(goal)} />
        </div>
        <p className="mt-1 text-[11px] text-muted">
          {goal.value}/{goal.next} {goal.unit}
        </p>
      </div>
    </Link>
  );
}

export function SceneRanking({ state }: { state: ClientState }) {
  const [niche, setNiche] = useState<Niche | "geral">("geral");
  const active = NICHES.filter((item) =>
    state.participations.some((entry) => entry.niche === item.id && (entry.status === "confirmada" || entry.status === "declarada"))
  );
  const ranking = state.users
    .filter((user) => user.role === "member")
    .map((user) => {
      const points = scenePoints(state, user.handle, niche === "geral" ? undefined : niche);
      const titles = state.participations.filter(
        (entry) =>
          entry.userHandle === user.handle &&
          entry.status === "confirmada" &&
          entry.role === "campeao" &&
          (niche === "geral" || entry.niche === niche)
      ).length;
      return { user, points, titles };
    })
    .filter((item) => item.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 10);

  return (
    <section className="rounded-3xl border border-line bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ranking da cena</h2>
        <Eyebrow>pontos de cena</Eyebrow>
      </div>
      <p className="mt-1 text-sm text-muted">Participações confirmadas pela organização valem mais que as declaradas.</p>
      <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 no-scrollbar">
        <Pill active={niche === "geral"} onClick={() => setNiche("geral")}>
          Geral
        </Pill>
        {active.map((item) => (
          <Pill key={item.id} active={niche === item.id} onClick={() => setNiche(item.id)}>
            {item.label}
          </Pill>
        ))}
      </div>
      <ol className="mt-4 space-y-3">
        {ranking.map((item, index) => (
          <li key={item.user.handle}>
            <Link href={`/perfil/${item.user.handle}#conquistas`} className="flex items-center gap-3">
              <span
                className={`grid h-7 w-8 shrink-0 place-items-center pt-2 font-mono text-[11px] font-semibold ${
                  index === 0
                    ? "bg-gradient-to-br from-amber-200 to-amber-600 text-black"
                    : index === 1
                      ? "bg-gradient-to-br from-slate-100 to-slate-500 text-black"
                      : index === 2
                        ? "bg-gradient-to-br from-orange-300 to-orange-800 text-black"
                        : "bg-ink/60 text-muted"
                }`}
                style={{ clipPath: TRIANGLE }}
              >
                {index + 1}
              </span>
              <Avatar user={item.user} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{item.user.name}</span>
                <span className="text-xs text-muted">
                  {levelOf(scenePoints(state, item.user.handle)).name}
                  {item.titles > 0 && ` · ${item.titles} ${item.titles === 1 ? "título" : "títulos"}`}
                </span>
              </span>
              <span className="font-mono text-sm text-rosa">{item.points}</span>
            </Link>
          </li>
        ))}
        {ranking.length === 0 && <p className="text-sm text-muted">Ninguém pontuou neste nicho ainda.</p>}
      </ol>
    </section>
  );
}

export function EventResults({ state, eventId }: { state: ClientState; eventId: string }) {
  const results = state.participations.filter((item) => item.eventId === eventId && item.status === "confirmada");
  if (!results.length) return null;
  const rank = (role: ParticipationRole) => (role === "campeao" ? 0 : role === "vice" ? 1 : role === "finalista" ? 2 : 3);
  return (
    <div className="mt-3 space-y-1.5 rounded-2xl bg-ink/30 p-3">
      <Eyebrow>Resultados confirmados</Eyebrow>
      {results
        .slice()
        .sort((a, b) => rank(a.role) - rank(b.role))
        .map((item) => {
          const who = userByHandle(state, item.userHandle);
          return (
            <Link key={item.id} href={`/perfil/${item.userHandle}#conquistas`} className="flex items-center gap-2 text-sm">
              <Icon
                name={item.role === "campeao" ? "crown" : isPodium(item.role) ? "medal" : nicheIcon(item.niche)}
                className={`h-4 w-4 ${item.role === "campeao" ? "text-amber-400" : "text-rosa"}`}
              />
              <span className="font-semibold">{roleLabel(item.role)}</span>
              <span className="truncate text-muted">
                {who?.name ?? item.userHandle} · {nicheLabel(item.niche)}
              </span>
            </Link>
          );
        })}
    </div>
  );
}

export function RegisterResultForm({ state, eventId, onDone }: { state: ClientState; eventId: string; onDone: () => void }) {
  const { act, busy } = useSocial();
  const event = state.events.find((item) => item.id === eventId);
  const [handle, setHandle] = useState(event?.artistHandles[0] ?? "");
  const [niche, setNiche] = useState<Niche>(() => {
    const who = userByHandle(state, event?.artistHandles[0] ?? "");
    return who?.niches[0] ?? "mc";
  });
  const [role, setRole] = useState<ParticipationRole>("campeao");

  async function submit(submitEvent: React.FormEvent) {
    submitEvent.preventDefault();
    try {
      await act({ action: "registerResult", eventId, handle: handle.replace(/^@/, ""), niche, role });
      onDone();
    } catch {
      /* aviso global */
    }
  }

  return (
    <form onSubmit={submit} className="cc-pop mt-3 space-y-3 rounded-2xl border border-rosa/40 bg-ink/30 p-4">
      <p className="text-sm font-semibold">Registrar resultado</p>
      <p className="text-xs text-muted">O que você registrar aqui entra confirmado na trajetória da pessoa e pode desbloquear conquistas.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Quem">
          <input
            value={handle}
            onChange={(changeEvent) => {
              setHandle(changeEvent.target.value);
              const who = userByHandle(state, changeEvent.target.value.replace(/^@/, ""));
              if (who?.niches[0]) setNiche(who.niches[0]);
            }}
            list={`cc-result-${eventId}`}
            className={fieldClass}
            placeholder="@mckalil"
          />
          <datalist id={`cc-result-${eventId}`}>
            {state.users
              .filter((user) => user.role === "member" && user.handle !== state.me?.handle)
              .map((user) => (
                <option key={user.handle} value={user.handle}>
                  {user.name}
                </option>
              ))}
          </datalist>
        </Field>
        <Field label="Nicho">
          <select value={niche} onChange={(changeEvent) => setNiche(changeEvent.target.value as Niche)} className={fieldClass}>
            {NICHES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Resultado ou papel">
          <select value={role} onChange={(changeEvent) => setRole(changeEvent.target.value as ParticipationRole)} className={fieldClass}>
            {ROLES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <GhostButton onClick={onDone}>Cancelar</GhostButton>
        <PrimaryButton type="submit" disabled={busy || !handle.trim()}>
          Confirmar resultado
        </PrimaryButton>
      </div>
    </form>
  );
}
