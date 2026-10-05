import type { IconName } from "@/components/Icon";
import type { Evento, Niche, Participation, ParticipationRole, Post, Rsvp, Testimonial } from "./types";

export const NICHES: { id: Niche; label: string; hint: string; icon: IconName; title: string }[] = [
  { id: "mc", label: "MC", hint: "Batalha de rima, freestyle, rap", icon: "mic", title: "Rima de rua" },
  { id: "dj", label: "DJ", hint: "Discotecagem, scratch, batalha de DJ", icon: "disc", title: "Toca-discos" },
  { id: "beatmaker", label: "Beatmaker", hint: "Beats e instrumentais", icon: "headphones", title: "Fábrica de beats" },
  { id: "producao", label: "Produção musical", hint: "Gravação, mix e master", icon: "sliders", title: "Mão na mesa" },
  { id: "breaking", label: "Breaking", hint: "B-boy, b-girl, cypher", icon: "move", title: "Chão do cypher" },
  { id: "dancas", label: "Danças urbanas", hint: "Popping, locking, house, krump, passinho", icon: "move", title: "Corpo em movimento" },
  { id: "graffiti", label: "Graffiti", hint: "Mural e pintura ao vivo", icon: "spray", title: "Muro vivo" },
  { id: "beatbox", label: "Beatbox", hint: "Batida com a voz", icon: "wave", title: "Batida na voz" },
  { id: "poesia", label: "Poesia e slam", hint: "Slam, sarau, poesia falada", icon: "pen", title: "Voz da praça" },
  { id: "realizacao", label: "Realização de eventos", hint: "Produz batalhas, festivais e rodas", icon: "calendar", title: "Faz acontecer" },
  { id: "audiovisual", label: "Audiovisual", hint: "Foto, clipe, transmissão", icon: "camera", title: "Olho da cena" },
  { id: "educacao", label: "Educação e conhecimento", hint: "Oficinas e rodas de conversa, o 5º elemento", icon: "book", title: "Passa a visão" },
  { id: "cenicas", label: "Artes cênicas", hint: "Teatro, circo, performance", icon: "mask", title: "Palco vivo" },
];

export const ROLES: { id: ParticipationRole; label: string; points: number }[] = [
  { id: "competidor", label: "Competiu", points: 0 },
  { id: "finalista", label: "Finalista", points: 15 },
  { id: "vice", label: "Vice-campeão(ã)", points: 25 },
  { id: "campeao", label: "Campeão(ã)", points: 40 },
  { id: "atracao", label: "Atração ou show", points: 10 },
  { id: "jurado", label: "Jurado(a)", points: 15 },
  { id: "apresentacao", label: "Apresentação ou host", points: 10 },
  { id: "organizacao", label: "Organização", points: 20 },
  { id: "oficina", label: "Deu oficina", points: 15 },
  { id: "producao", label: "Produção ou trilha", points: 10 },
];

const COMPETING = new Set<ParticipationRole>(["competidor", "finalista", "vice", "campeao"]);
const PODIUM = new Set<ParticipationRole>(["finalista", "vice", "campeao"]);

export const TIERS = [
  { name: "Bronze", from: "#f4b183", to: "#8a4b22" },
  { name: "Prata", from: "#f1f5f9", to: "#6b7385" },
  { name: "Ouro", from: "#fde68a", to: "#b7700b" },
  { name: "Lenda", from: "#f472b6", to: "#6366f1" },
] as const;

export const LEVELS = [
  { name: "Chegando na cena", min: 0 },
  { name: "Na roda", min: 40 },
  { name: "Firmeza", min: 150 },
  { name: "Referência", min: 400 },
  { name: "Lenda viva", min: 1000 },
] as const;

export function nicheLabel(id: Niche) {
  return NICHES.find((item) => item.id === id)?.label ?? id;
}

export function nicheIcon(id: Niche): IconName {
  return NICHES.find((item) => item.id === id)?.icon ?? "triangle";
}

export function roleLabel(id: ParticipationRole) {
  return ROLES.find((item) => item.id === id)?.label ?? id;
}

export function isPodium(role: ParticipationRole) {
  return PODIUM.has(role);
}

export type AchievementData = {
  participations: Participation[];
  events: Evento[];
  posts: Post[];
  testimonials: Testimonial[];
  rsvps: Rsvp[];
};

type Count = { value: number; verified: number };

type Ctx = {
  handle: string;
  counted: Participation[];
  confirmed: Participation[];
  data: AchievementData;
};

type Definition = {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  unit: string;
  tiers: readonly [number, number, number, number];
  niche?: Niche;
  core?: boolean;
  count: (ctx: Ctx) => Count;
};

export type Achievement = Omit<Definition, "count"> & {
  tier: number;
  value: number;
  next: number | null;
  verified: boolean;
};

function by(ctx: Ctx, test: (item: Participation) => boolean): Count {
  return { value: ctx.counted.filter(test).length, verified: ctx.confirmed.filter(test).length };
}

export function cityKey(value: string) {
  const parts = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[,–—/]/)
    .map((part) => part.trim())
    .filter((part) => part && !/^[a-z]{2}$/.test(part));
  return parts.at(-1) ?? "";
}

function distinct(list: Participation[], key: (item: Participation) => string) {
  return new Set(list.map(key).filter(Boolean)).size;
}

function createdEvents(ctx: Ctx) {
  return ctx.data.events.filter((event) => event.createdBy === ctx.handle);
}

const DEFINITIONS: Definition[] = [
  {
    id: "presenca",
    title: "Presença na cena",
    description: "Participações registradas na sua trajetória.",
    icon: "triangle",
    unit: "participações",
    tiers: [1, 10, 25, 60],
    core: true,
    count: (ctx) => by(ctx, () => true),
  },
  {
    id: "cinturao",
    title: "Cinturão",
    description: "Títulos de campeão confirmados pela organização do evento.",
    icon: "crown",
    unit: "títulos",
    tiers: [1, 3, 7, 15],
    core: true,
    count: (ctx) => {
      const titles = ctx.confirmed.filter((item) => item.role === "campeao").length;
      return { value: titles, verified: titles };
    },
  },
  {
    id: "podio",
    title: "Pódio",
    description: "Finais, vices e títulos confirmados pela organização.",
    icon: "medal",
    unit: "pódios",
    tiers: [1, 5, 12, 25],
    core: true,
    count: (ctx) => {
      const podiums = ctx.confirmed.filter((item) => PODIUM.has(item.role)).length;
      return { value: podiums, verified: podiums };
    },
  },
  {
    id: "batalha",
    title: "Sangue de batalha",
    description: "Batalhas, slams, cyphers e competições que você encarou.",
    icon: "flame",
    unit: "competições",
    tiers: [3, 10, 30, 75],
    core: true,
    count: (ctx) => by(ctx, (item) => COMPETING.has(item.role)),
  },
  ...NICHES.map<Definition>((niche) => ({
    id: `nicho-${niche.id}`,
    title: niche.title,
    description:
      niche.id === "realizacao"
        ? "Eventos que você realizou, na agenda da rede ou fora dela."
        : `Participações em eventos como ${niche.label}.`,
    icon: niche.icon,
    unit: niche.id === "realizacao" ? "eventos" : "participações",
    tiers: [1, 5, 15, 40],
    niche: niche.id,
    count: (ctx) => {
      const base = by(ctx, (item) => item.niche === niche.id);
      if (niche.id !== "realizacao") return base;
      const own = createdEvents(ctx).length;
      return { value: base.value + own, verified: base.verified + own };
    },
  })),
  {
    id: "jurado",
    title: "Voz da experiência",
    description: "Vezes em que você foi chamado para julgar.",
    icon: "scale",
    unit: "juris",
    tiers: [1, 5, 15, 30],
    count: (ctx) => by(ctx, (item) => item.role === "jurado"),
  },
  {
    id: "palco",
    title: "Palco aberto",
    description: "Shows e apresentações como atração.",
    icon: "star",
    unit: "shows",
    tiers: [1, 5, 15, 40],
    count: (ctx) => by(ctx, (item) => item.role === "atracao"),
  },
  {
    id: "host",
    title: "Mestre de cerimônia",
    description: "Eventos em que você segurou o microfone da noite.",
    icon: "mic",
    unit: "eventos",
    tiers: [1, 5, 15, 30],
    count: (ctx) => by(ctx, (item) => item.role === "apresentacao"),
  },
  {
    id: "oficina",
    title: "Semeia conhecimento",
    description: "Oficinas e aulas que você deu.",
    icon: "book",
    unit: "oficinas",
    tiers: [1, 5, 15, 30],
    count: (ctx) => by(ctx, (item) => item.role === "oficina"),
  },
  {
    id: "estrada",
    title: "Na estrada",
    description: "Cidades diferentes onde você já se apresentou.",
    icon: "map",
    unit: "cidades",
    tiers: [2, 4, 7, 12],
    count: (ctx) => ({
      value: distinct(ctx.counted, (item) => cityKey(item.city)),
      verified: distinct(ctx.confirmed, (item) => cityKey(item.city)),
    }),
  },
  {
    id: "multiartista",
    title: "Multiartista",
    description: "Nichos diferentes em que você já participou.",
    icon: "sparkle",
    unit: "nichos",
    tiers: [2, 3, 5, 7],
    count: (ctx) => ({
      value: distinct(ctx.counted, (item) => item.niche),
      verified: distinct(ctx.confirmed, (item) => item.niche),
    }),
  },
  {
    id: "feat",
    title: "Quatro mãos",
    description: "Feats aceitos na rede.",
    icon: "users",
    unit: "feats",
    tiers: [1, 5, 15, 30],
    count: (ctx) => {
      const total = ctx.data.posts.filter(
        (post) =>
          !post.hidden && post.featStatus === "aceito" && (post.authorHandle === ctx.handle || post.feat === ctx.handle)
      ).length;
      return { value: total, verified: total };
    },
  },
  {
    id: "respeito",
    title: "Respeito da cena",
    description: "Depoimentos profissionais na sua vitrine.",
    icon: "heart",
    unit: "depoimentos",
    tiers: [1, 5, 15, 30],
    count: (ctx) => {
      const total = ctx.data.testimonials.filter((item) => item.artistHandle === ctx.handle).length;
      return { value: total, verified: total };
    },
  },
  {
    id: "casa-cheia",
    title: "Casa cheia",
    description: "Maior número de presenças confirmadas num evento seu.",
    icon: "users",
    unit: "presenças",
    tiers: [10, 50, 200, 1000],
    niche: "realizacao",
    count: (ctx) => {
      const best = Math.max(
        0,
        ...createdEvents(ctx).map((event) => ctx.data.rsvps.filter((item) => item.eventId === event.id).length)
      );
      return { value: best, verified: best };
    },
  },
];

function tierOf(value: number, tiers: readonly number[]) {
  let tier = -1;
  tiers.forEach((min, index) => {
    if (value >= min) tier = index;
  });
  return tier;
}

function context(data: AchievementData, handle: string): Ctx {
  const mine = data.participations.filter((item) => item.userHandle === handle);
  return {
    handle,
    counted: mine.filter((item) => item.status === "declarada" || item.status === "confirmada"),
    confirmed: mine.filter((item) => item.status === "confirmada"),
    data,
  };
}

export function achievementsFor(data: AchievementData, handle: string): Achievement[] {
  const ctx = context(data, handle);
  return DEFINITIONS.map(({ count, ...definition }) => {
    const { value, verified } = count(ctx);
    const tier = tierOf(value, definition.tiers);
    return {
      ...definition,
      tier,
      value,
      next: tier < definition.tiers.length - 1 ? definition.tiers[tier + 1] : null,
      verified: tier >= 0 && tierOf(verified, definition.tiers) >= tier,
    };
  });
}

export function unlockedTiers(data: AchievementData, handle: string) {
  const map: Record<string, number> = {};
  for (const item of achievementsFor(data, handle)) map[item.id] = item.tier;
  return map;
}

export function relevantAchievements(list: Achievement[], niches: Niche[]) {
  return list
    .filter((item) => item.tier >= 0 || item.value > 0 || item.core || (item.niche && niches.includes(item.niche)))
    .sort((a, b) => b.tier - a.tier || progressOf(b) - progressOf(a));
}

export function progressOf(item: Achievement) {
  if (item.next === null) return 100;
  const floor = item.tier >= 0 ? item.tiers[item.tier] : 0;
  return Math.round(((item.value - floor) / (item.next - floor)) * 100);
}

export function nextGoal(list: Achievement[], niches: Niche[]) {
  return relevantAchievements(list, niches)
    .filter((item) => item.next !== null)
    .sort((a, b) => progressOf(b) - progressOf(a))[0];
}

export function scenePoints(data: AchievementData, handle: string, niche?: Niche) {
  const ctx = context(data, handle);
  let points = 0;
  for (const item of ctx.counted) {
    if (niche && item.niche !== niche) continue;
    const confirmed = item.status === "confirmada";
    const bonus = ROLES.find((role) => role.id === item.role)?.points ?? 0;
    points += confirmed ? 10 + bonus : 4 + Math.round(bonus / 2);
  }
  if (!niche || niche === "realizacao") points += createdEvents(ctx).length * 15;
  return points;
}

export function levelOf(points: number) {
  let index = 0;
  LEVELS.forEach((level, position) => {
    if (points >= level.min) index = position;
  });
  const current = LEVELS[index];
  const next = LEVELS[index + 1];
  return {
    index,
    name: current.name,
    next: next ? next.name : null,
    toNext: next ? next.min - points : 0,
    progress: next ? Math.round(((points - current.min) / (next.min - current.min)) * 100) : 100,
  };
}

export function trajectory(data: AchievementData, handle: string, includeAll = false) {
  return data.participations
    .filter(
      (item) =>
        item.userHandle === handle &&
        (includeAll || item.status === "declarada" || item.status === "confirmada")
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}
