import { nicheLabel, roleLabel, trajectory } from "./achievements";
import type { ClientState, EditalProfile, Participation, PublicUser } from "./types";

export const MINI_LIMIT = 1000;
export const FULL_LIMIT = 5000;

export const EMPTY_EDITAL: EditalProfile = {
  legalName: "",
  artisticName: "",
  city: "",
  segment: "",
  formation: "",
  awards: "",
  portfolio: "",
  mapa: null,
};

export const EDITAL_GUIDE = [
  {
    title: "Leia o edital inteiro",
    text: "Anote segmento, município, prazo e o limite de caracteres do currículo. Cada chamada pede um tamanho diferente.",
  },
  {
    title: "Atualize o Mapa Cultural",
    text: "No Espírito Santo, a SECULT pede cadastro em mapa.cultura.es.gov.br antes da inscrição. O perfil de lá é o currículo público do agente.",
  },
  {
    title: "Traga os dados para cá",
    text: "Escreva o nome do agente ou cole o link. Se aparecer mais de um, escolha o seu. A rede lê nome, áreas, cidade e os textos públicos.",
  },
  {
    title: "Confira a trajetória",
    text: "Título, pódio e juris só entram como confirmados quando quem organizou o evento aceitou a participação.",
  },
  {
    title: "Revise antes de colar",
    text: "O texto usa somente a vitrine, as participações registradas e o Mapa Cultural. Nada é inventado. Leia e ajuste o que o edital pedir com outras palavras.",
  },
] as const;

export type CurriculumCheck = { id: string; ok: boolean; label: string };

export type CurriculumSection = { id: string; title: string; body: string };

export type CurriculumDraft = {
  artisticName: string;
  mini: string;
  full: string;
  sections: CurriculumSection[];
  checks: CurriculumCheck[];
};

function clean(value: string) {
  return value.replace(/\s+\n/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function joinAnd(items: string[]) {
  const list = [...new Set(items.map((item) => item.trim()).filter(Boolean))];
  if (list.length <= 1) return list[0] ?? "";
  return `${list.slice(0, -1).join(", ")} e ${list[list.length - 1]}`;
}

function formatDate(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function lineOf(item: Participation) {
  const status = item.status === "confirmada" ? "confirmada por quem organizou" : "declarada na rede";
  const note = item.note.trim() ? ` ${item.note.trim()}` : "";
  return `${formatDate(item.date)} — ${roleLabel(item.role)} — ${item.eventTitle} (${item.city}) — ${nicheLabel(item.niche)} — ${status}.${note}`;
}

export function buildCurriculum(state: ClientState, user: PublicUser, draft: EditalProfile, vitrineUrl: string): CurriculumDraft {
  const mapa = draft.mapa;
  const artisticName = clean(draft.artisticName) || user.name;
  const legalName = clean(draft.legalName);
  const city = clean(draft.city) || [mapa?.city, mapa?.state].filter(Boolean).join(" — ") || user.city;
  const nicheNames = user.niches.map(nicheLabel);
  const segment = clean(draft.segment) || joinAnd(nicheNames) || joinAnd(mapa?.areas ?? []);
  const history = trajectory(state, user.handle);
  const confirmed = history.filter((item) => item.status === "confirmada");
  const declared = history.filter((item) => item.status === "declarada");
  const cities = [...new Set(history.map((item) => item.city).filter(Boolean))];
  const titles = confirmed.filter((item) => item.role === "campeao" || item.role === "vice" || item.role === "finalista");

  const who = segment
    ? `${artisticName} atua em ${segment}${city ? `, com base em ${city}` : ""}.`
    : `${artisticName}${city ? ` atua a partir de ${city}` : " atua na cena cultural"}.`;

  const mapShort = clean(mapa?.shortDescription ?? "");
  const bio = clean(user.bio);
  const opening = mapShort || (bio && bio !== "Chegando na Cultura Conecta." ? bio : "");
  const countLine =
    confirmed.length > 0
      ? `A trajetória registrada reúne ${confirmed.length} ${confirmed.length === 1 ? "participação confirmada" : "participações confirmadas"}${
          cities.length ? `, em ${joinAnd(cities.slice(0, 4))}` : ""
        }.`
      : declared.length > 0
        ? `Há ${declared.length} ${declared.length === 1 ? "participação declarada" : "participações declaradas"} na rede. Elas ainda não foram confirmadas por quem organizou.`
        : "";

  const mini = [who, opening, countLine].filter(Boolean).join(" ");

  const mapLong = clean(mapa?.longDescription ?? "");
  const trajectoryProse = mapLong || [who, opening, countLine].filter(Boolean).join(" ");
  const works = history.map((item) => `- ${lineOf(item)}`).join("\n");
  const titleLines = titles.map((item) => `- ${lineOf(item)}`).join("\n");
  const awards = [clean(draft.awards), titleLines ? `Títulos registrados e confirmados:\n${titleLines}` : ""]
    .filter(Boolean)
    .join("\n\n");
  const formation = clean(draft.formation);
  const links = [
    mapa?.url ? `Mapa Cultural: ${mapa.url}` : "",
    mapa?.site ? `Site no mapa: ${mapa.site}` : "",
    ...user.links.map((link) => `${link.label}: ${link.url}`),
    clean(draft.portfolio),
    vitrineUrl ? `Vitrine Cultura Conecta: ${vitrineUrl}` : "",
  ].filter(Boolean);

  const identity = [
    `Nome artístico: ${artisticName}`,
    legalName ? `Nome de registro: ${legalName}` : "",
    city ? `Município: ${city}` : "Município: não informado",
    segment ? `Área de atuação: ${segment}` : "Área de atuação: não informada",
    mapa?.name ? `Agente no Mapa Cultural: ${mapa.name}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const sections: CurriculumSection[] = [
    { id: "identificacao", title: "Identificação", body: identity },
    { id: "mini", title: "Mini currículo", body: mini },
    { id: "trajetoria", title: "Trajetória", body: trajectoryProse },
    {
      id: "realizacoes",
      title: "Principais realizações",
      body: works || "Nenhuma participação registrada na Cultura Conecta.",
    },
    {
      id: "premios",
      title: "Prêmios e títulos",
      body: awards || "Nenhum prêmio informado. Escreva apenas reconhecimentos que você possa comprovar.",
    },
    {
      id: "formacao",
      title: "Formação",
      body: formation || "Não informada. Inclua somente formação que o edital pedir e que você possa comprovar.",
    },
    { id: "links", title: "Portfólio e links", body: links.join("\n") || "Nenhum link informado." },
  ];

  const full = sections.map((section) => `${section.title.toUpperCase()}\n${section.body}`).join("\n\n");

  const checks: CurriculumCheck[] = [
    { id: "nome", ok: artisticName.length >= 2, label: "Nome artístico" },
    { id: "cidade", ok: Boolean(city), label: "Município" },
    { id: "area", ok: Boolean(segment), label: "Área de atuação" },
    { id: "mapa", ok: Boolean(mapa?.url), label: "Link do Mapa Cultural" },
    { id: "trajetoria", ok: history.length > 0 || Boolean(mapLong), label: "Trajetória ou texto do mapa" },
    {
      id: "confirmada",
      ok: declared.every((item) => item.role !== "campeao" && item.role !== "vice" && item.role !== "finalista"),
      label: "Títulos com confirmação de quem organizou",
    },
    { id: "mini", ok: mini.length > 0 && mini.length <= MINI_LIMIT, label: `Mini currículo até ${MINI_LIMIT} caracteres` },
    { id: "completo", ok: full.length > 0 && full.length <= FULL_LIMIT, label: `Currículo completo até ${FULL_LIMIT} caracteres` },
  ];

  return { artisticName, mini, full, sections, checks };
}
