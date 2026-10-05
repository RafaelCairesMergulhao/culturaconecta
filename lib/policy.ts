import type { AccountKind, OpportunityType, Prefs, ReportReason, Shape } from "./types";

export const CATEGORIES = [
  "Geral",
  "MC",
  "DJ",
  "Breaking",
  "Graffiti",
  "Slam",
  "Poesia",
  "Set",
  "Evento",
  "Audiovisual",
  "Teatro",
  "Dança",
] as const;

export const ACCOUNT_KINDS: { id: AccountKind; label: string; hint: string }[] = [
  { id: "artista", label: "Artista", hint: "MC, DJ, dança, graffiti, poesia, música" },
  { id: "produtora", label: "Produtora", hint: "Organiza eventos, festivais e batalhas" },
  { id: "estudio", label: "Estúdio", hint: "Gravação, ensaio e audiovisual" },
  { id: "empresa", label: "Empresa ou marca", hint: "Patrocina e fecha parcerias" },
  { id: "espaco", label: "Espaço cultural", hint: "Casa de show, centro cultural, praça" },
  { id: "publico", label: "Público", hint: "Acompanha e apoia a cena" },
];

export function kindLabel(kind: AccountKind) {
  return ACCOUNT_KINDS.find((item) => item.id === kind)?.label ?? "Perfil";
}

export const OPPORTUNITY_TYPES: { id: OpportunityType; label: string }[] = [
  { id: "show", label: "Show e line-up" },
  { id: "edital", label: "Edital" },
  { id: "gravacao", label: "Gravação" },
  { id: "patrocinio", label: "Patrocínio" },
  { id: "vaga", label: "Vaga e freela" },
  { id: "colab", label: "Colaboração" },
];

export function opportunityLabel(type: OpportunityType) {
  return OPPORTUNITY_TYPES.find((item) => item.id === type)?.label ?? type;
}

export const STORY_BACKGROUNDS: Record<string, string> = {
  aurora: "linear-gradient(160deg, #ec2f77, #6d28d9 55%, #2f6fed)",
  brasa: "linear-gradient(160deg, #ffb800, #ff5a1f 45%, #ec2f77)",
  mar: "linear-gradient(160deg, #22d3ee, #2f6fed 60%, #0b1730)",
  mata: "linear-gradient(160deg, #a3e635, #10b981 50%, #065f46)",
  noite: "linear-gradient(160deg, #1e1b4b, #312e81 50%, #0f172a)",
  ouro: "linear-gradient(160deg, #fde68a, #f59e0b 45%, #b45309)",
};

export const ACCENT_PRESETS: { name: string; accent: string; accent2: string }[] = [
  { name: "Cultura", accent: "#ec2f77", accent2: "#2f6fed" },
  { name: "Brasa", accent: "#ff5a1f", accent2: "#ffb800" },
  { name: "Neon", accent: "#8b5cf6", accent2: "#22d3ee" },
  { name: "Mata", accent: "#10b981", accent2: "#f59e0b" },
  { name: "Maré", accent: "#06b6d4", accent2: "#6366f1" },
  { name: "Ouro", accent: "#f59e0b", accent2: "#ef4444" },
];

export const SHAPES: { id: Shape; label: string }[] = [
  { id: "triangulo", label: "Triângulo" },
  { id: "hexagono", label: "Hexágono" },
  { id: "losango", label: "Losango" },
  { id: "circulo", label: "Círculo" },
];

export const DEFAULT_PREFS: Prefs = {
  theme: "dark",
  accent: "#ec2f77",
  accent2: "#2f6fed",
  backgroundId: null,
  bgDim: 60,
  bgBlur: 0,
  glass: true,
  shape: "hexagono",
  fontScale: 100,
};

export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: "spam", label: "Spam ou golpe" },
  { id: "assedio", label: "Assédio ou bullying" },
  { id: "odio", label: "Discurso de ódio" },
  { id: "sexual", label: "Conteúdo sexual" },
  { id: "violencia", label: "Ameaça ou violência" },
  { id: "ilegal", label: "Atividade ilegal" },
  { id: "dados_pessoais", label: "Dados pessoais de outra pessoa" },
  { id: "outro", label: "Outro" },
];

export const RESERVED_HANDLES = new Set([
  "equipe",
  "admin",
  "moderacao",
  "cultura",
  "suporte",
  "ajuda",
  "entrar",
  "conta-encerrada",
]);

const PROHIBITED: RegExp[] = [
  /pornografia\s+infantil/i,
  /abuso\s+sexual\s+infantil/i,
  /conte[uú]do\s+sexual\s+(de|com|envolvendo)\s+menores?/i,
  /sexo\s+com\s+menores?/i,
  /child\s*porn/i,
  /vendo\s+(coca[ií]na|crack|lan[cç]a-?perfume|arma de fogo|fuzil|rev[oó]lver|pistola)/i,
  /compro\s+(coca[ií]na|crack)/i,
];

const LIMITS = {
  post: 500,
  comment: 500,
  message: 1000,
  bio: 280,
  name: 40,
  story: 200,
  title: 80,
  pitch: 500,
  testimonial: 300,
  description: 1000,
  short: 60,
} as const;

export type TextKind = keyof typeof LIMITS;

export function containsProhibited(text: string) {
  return PROHIBITED.some((rule) => rule.test(text));
}

export function validateText(text: string, kind: TextKind): string | null {
  const trimmed = text.trim();
  const min = kind === "name" || kind === "title" ? 2 : 1;
  if (trimmed.length < min) {
    if (kind === "name") return "Informe o nome.";
    if (kind === "title") return "Dê um título.";
    return "Escreva alguma coisa antes de enviar.";
  }
  if (trimmed.length > LIMITS[kind]) return `O limite é ${LIMITS[kind]} caracteres.`;
  if (containsProhibited(trimmed)) {
    return "Esse conteúdo viola as regras da comunidade e não pode ser publicado.";
  }
  return null;
}

export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@/, "");
}

export function validateHandle(handle: string): string | null {
  if (!/^[a-z0-9._]{3,20}$/.test(handle)) {
    return "O @ precisa ter 3 a 20 caracteres: letras minúsculas, números, ponto ou _.";
  }
  if (RESERVED_HANDLES.has(handle)) return "Esse @ está reservado.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  if (password.length > 72) return "A senha é longa demais.";
  return null;
}

export function validateUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "Use um link que comece com https://.";
    }
    return null;
  } catch {
    return "Link inválido. Use o endereço completo, com https://.";
  }
}

export function isHexColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value);
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || "CC";
}
