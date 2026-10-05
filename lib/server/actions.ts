import fs from "fs";
import { randomBytes, randomUUID } from "crypto";
import {
  ACCOUNT_KINDS,
  CATEGORIES,
  DEFAULT_PREFS,
  OPPORTUNITY_TYPES,
  REPORT_REASONS,
  SHAPES,
  STORY_BACKGROUNDS,
  initialsFromName,
  isHexColor,
  normalizeHandle,
  validateHandle,
  validatePassword,
  containsProhibited,
  validateText,
  validateUrl,
  type TextKind,
} from "../policy";
import type {
  AccountKind,
  Database,
  Niche,
  MusicLink,
  Notification,
  OpportunityType,
  Participation,
  ParticipationRole,
  CulturalMapSnapshot,
  EditalProfile,
  Prefs,
  ProfileLink,
  ReactionType,
  ReportReason,
  ReportTarget,
  Shape,
  UserRecord,
} from "../types";
import { achievementsFor, NICHES, nicheLabel, ROLES, roleLabel, TIERS, unlockedTiers } from "../achievements";
import { JAM_MS, parseMusicUrl } from "../music";
import { hashPassword, verifyPassword } from "./password";
import { parseMapaUrl } from "./mapa";
import { uploadFile } from "./paths";

export class ActionError extends Error {}

type Body = Record<string, unknown>;
type Ctx = { db: Database; me: UserRecord | null; body: Body };

const DAY = 24 * 60 * 60 * 1000;

function record(input: unknown): Body {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new ActionError("Pedido inválido.");
  return input as Body;
}

function textField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function checkText(value: unknown, kind: TextKind): string {
  const text = textField(value).trim();
  const error = validateText(text, kind);
  if (error) throw new ActionError(error);
  return text;
}

function optionalText(value: unknown, kind: TextKind): string {
  const text = textField(value).trim();
  if (!text) return "";
  return checkText(text, kind);
}

function bounded(value: unknown, max: number, label: string) {
  const text = textField(value).replace(/\u0000/g, "").trim();
  if (text.length > max) throw new ActionError(`${label} pode ter até ${max} caracteres.`);
  if (containsProhibited(text)) throw new ActionError("Esse conteúdo viola as regras da comunidade e não pode ser salvo.");
  return text;
}

function siteField(value: unknown) {
  const site = textField(value).trim().slice(0, 300);
  if (!site) return "";
  const error = validateUrl(site);
  if (error) throw new ActionError("O site do Mapa Cultural precisa ser um link http ou https.");
  return site;
}

function mapaField(value: unknown): CulturalMapSnapshot | null {
  if (value == null) return null;
  const raw = record(value);
  const parsed = parseMapaUrl(textField(raw.url));
  if (!parsed) throw new ActionError("O link do Mapa Cultural precisa ser o perfil público de um agente.");
  const areas = Array.isArray(raw.areas)
    ? raw.areas.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 16)
    : [];
  if (areas.some((item) => item.length > 80 || containsProhibited(item))) {
    throw new ActionError("As áreas vindas do Mapa Cultural não puderam ser salvas.");
  }
  return {
    url: parsed.href,
    agentId: parsed.id,
    host: new URL(parsed.origin).host,
    name: bounded(raw.name, 160, "O nome no Mapa Cultural"),
    shortDescription: bounded(raw.shortDescription, 1000, "A descrição curta do mapa"),
    longDescription: bounded(raw.longDescription, 8000, "A descrição do mapa"),
    areas,
    city: bounded(raw.city, 80, "O município do mapa"),
    state: bounded(raw.state, 40, "O estado do mapa"),
    site: siteField(raw.site),
    fetchedAt: /^\d{4}-\d{2}-\d{2}T/.test(textField(raw.fetchedAt)) ? textField(raw.fetchedAt).slice(0, 40) : new Date().toISOString(),
  };
}

function listField(value: unknown, max: number, maxLength: number, label: string): string[] {
  if (!Array.isArray(value)) return [];
  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  const unique = [...new Set(items)];
  if (unique.length > max) throw new ActionError(`Use no máximo ${max} ${label}.`);
  if (unique.some((item) => item.length > maxLength)) {
    throw new ActionError(`Cada item pode ter até ${maxLength} caracteres.`);
  }
  for (const item of unique) checkText(item, "short");
  return unique;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function requireLogin(me: UserRecord | null): UserRecord {
  if (!me) throw new ActionError("Entre na sua conta para fazer isso.");
  return me;
}

function requireActive(me: UserRecord | null): UserRecord {
  const user = requireLogin(me);
  if (user.limited) throw new ActionError("Sua conta está limitada após análise das regras da comunidade.");
  return user;
}

function findUser(db: Database, handle: string) {
  return db.users.find((user) => user.handle === handle);
}

function blockedBetween(db: Database, a: string, b: string) {
  return db.blocks.some(
    (block) =>
      (block.blocker === a && block.blocked === b) || (block.blocker === b && block.blocked === a)
  );
}

function notify(db: Database, item: Omit<Notification, "id" | "createdAt" | "read">) {
  if (item.userHandle === item.actorHandle) return;
  db.notifications.unshift({ ...item, id: randomUUID(), createdAt: new Date().toISOString(), read: false });
  if (db.notifications.length > 5000) db.notifications.length = 5000;
}

function tooSoon(dates: string[], seconds: number) {
  const latest = Math.max(0, ...dates.map((date) => new Date(date).getTime()));
  return Date.now() - latest < seconds * 1000;
}

function countToday(dates: string[]) {
  const since = Date.now() - DAY;
  return dates.filter((date) => new Date(date).getTime() > since).length;
}

function ownedMedia(db: Database, user: UserRecord, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new ActionError("Imagem inválida.");
  const media = db.media.find((item) => item.id === value);
  if (!media || media.ownerHandle !== user.handle) throw new ActionError("Imagem não encontrada. Envie de novo.");
  return media.id;
}

function targetUser(db: Database, me: UserRecord, value: unknown, verb: string) {
  const handle = normalizeHandle(textField(value));
  if (handle === me.handle) throw new ActionError(`Você não pode ${verb} a si mesmo.`);
  const target = findUser(db, handle);
  if (!target) throw new ActionError("Perfil não encontrado.");
  if (blockedBetween(db, me.handle, handle)) throw new ActionError(`Não é possível ${verb} este perfil.`);
  return target;
}

function visiblePost(db: Database, id: unknown) {
  const post = db.posts.find((item) => item.id === id && !item.hidden);
  if (!post) throw new ActionError("Publicação não encontrada.");
  return post;
}

function newSession(db: Database, user: UserRecord) {
  const token = randomBytes(32).toString("hex");
  db.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
  const mine = db.sessions.filter((session) => session.userId === user.id);
  if (mine.length > 8) {
    const drop = new Set(mine.slice(0, mine.length - 8).map((session) => session.token));
    db.sessions = db.sessions.filter((session) => !drop.has(session.token));
  }
  return token;
}

export function login(db: Database, input: unknown) {
  const body = record(input);
  const handle = normalizeHandle(textField(body.handle));
  const user = findUser(db, handle);
  if (!user || !verifyPassword(textField(body.password), user.passwordHash)) {
    throw new ActionError("Usuário ou senha incorretos.");
  }
  return { token: newSession(db, user), user };
}

export function register(db: Database, input: unknown) {
  const body = record(input);
  if (body.ageConfirmed !== true) throw new ActionError("Confirme que você tem 16 anos ou mais.");
  if (body.acceptedRules !== true) {
    throw new ActionError("É preciso aceitar as regras da comunidade e os termos de uso.");
  }
  const handle = normalizeHandle(textField(body.handle));
  const handleError = validateHandle(handle);
  if (handleError) throw new ActionError(handleError);
  if (findUser(db, handle)) throw new ActionError("Esse @ já está em uso.");
  const name = checkText(body.name, "name");
  const password = textField(body.password);
  const passwordError = validatePassword(password);
  if (passwordError) throw new ActionError(passwordError);
  const kind = ACCOUNT_KINDS.some((item) => item.id === body.kind) ? (body.kind as AccountKind) : "artista";
  const user: UserRecord = {
    id: randomUUID(),
    handle,
    name,
    bio: "Chegando na Cultura Conecta.",
    tags: [],
    avatarInitials: initialsFromName(name),
    available: kind === "artista",
    role: "member",
    kind,
    city: "",
    links: [],
    avatarId: null,
    coverId: null,
    prefs: { ...DEFAULT_PREFS },
    niches: [],
    edital: null,
    createdAt: new Date().toISOString(),
    limited: false,
    passwordHash: hashPassword(password),
  };
  db.users.push(user);
  notify(db, {
    userHandle: user.handle,
    type: "moderation",
    actorHandle: "equipe",
    text: "Bem-vindo. Monte sua vitrine em Personalizar e leia as regras antes de publicar.",
    href: "/personalizar#vitrine",
  });
  return { token: newSession(db, user), user };
}

export function logout(db: Database, token: string | null) {
  if (!token) return;
  db.sessions = db.sessions.filter((session) => session.token !== token);
}

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function dateField(value: unknown) {
  const text = textField(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(new Date(`${text}T12:00:00Z`).getTime())) {
    throw new ActionError("Informe a data da participação.");
  }
  if (text < "1970-01-01") throw new ActionError("Data muito antiga.");
  if (text > today()) throw new ActionError("A data não pode estar no futuro. Registre depois que o evento acontecer.");
  return text;
}

function nicheField(value: unknown): Niche {
  const niche = NICHES.find((item) => item.id === value)?.id;
  if (!niche) throw new ActionError("Escolha o nicho da participação.");
  return niche;
}

function roleField(value: unknown): ParticipationRole {
  const role = ROLES.find((item) => item.id === value)?.id;
  if (!role) throw new ActionError("Escolha como você participou.");
  return role;
}

function celebrate(db: Database, handle: string, before: Record<string, number>) {
  for (const item of achievementsFor(db, handle)) {
    if (item.tier > (before[item.id] ?? -1)) {
      notify(db, {
        userHandle: handle,
        type: "achievement",
        actorHandle: "equipe",
        text: `Conquista desbloqueada: ${item.title} · ${TIERS[item.tier].name}.`,
        href: `/perfil/${handle}#conquistas`,
      });
    }
  }
}

function clip(value: unknown, max: number) {
  return textField(value).replace(/\s+/g, " ").trim().slice(0, max);
}

function musicField(value: unknown): MusicLink {
  const raw = record(value);
  const parsed = parseMusicUrl(textField(raw.url));
  if (!parsed) throw new ActionError("Use um link do Spotify ou do YouTube.");
  const title = clip(raw.title, 140);
  const author = clip(raw.author, 80);
  return { ...parsed, title: title || parsed.title, author };
}

function openJam(db: Database, id: string) {
  const jam = db.jams.find((item) => item.id === id);
  if (!jam || jam.hidden || jam.closedAt) throw new ActionError("Essa jam já encerrou.");
  if (Date.now() - new Date(jam.createdAt).getTime() >= JAM_MS) {
    jam.closedAt = new Date().toISOString();
    throw new ActionError("Essa jam já encerrou.");
  }
  return jam;
}

function removeMediaFile(id: string, ext: string) {
  fs.rmSync(/*turbopackIgnore: true*/ uploadFile(id, ext), { force: true });
}

const handlers: Record<string, (ctx: Ctx) => void> = {
  post({ db, me, body }) {
    const user = requireActive(me);
    const category = textField(body.category);
    if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
      throw new ActionError("Escolha uma categoria da lista.");
    }
    const imageId = ownedMedia(db, user, body.imageId);
    const music = body.music ? musicField(body.music) : null;
    const raw = textField(body.text).trim();
    const text = raw ? checkText(raw, "post") : imageId || music ? "" : checkText(raw, "post");
    const mine = db.posts.filter((post) => post.authorHandle === user.handle).map((post) => post.createdAt);
    if (tooSoon(mine, 5)) throw new ActionError("Espere alguns segundos antes de publicar de novo.");
    if (countToday(mine) >= 40) throw new ActionError("Você atingiu o limite de publicações de hoje.");
    const featHandle = normalizeHandle(textField(body.feat));
    const feat = featHandle ? targetUser(db, user, featHandle, "chamar para feat").handle : null;
    const post = {
      id: randomUUID(),
      authorHandle: user.handle,
      category,
      text,
      imageId,
      music,
      feat,
      featStatus: feat ? ("pendente" as const) : null,
      createdAt: new Date().toISOString(),
      hidden: false,
    };
    db.posts.unshift(post);
    if (feat) {
      notify(db, {
        userHandle: feat,
        type: "feat",
        actorHandle: user.handle,
        text: "chamou você para assinar um feat nesta publicação.",
        href: `/post/${post.id}`,
        targetId: post.id,
      });
    }
  },

  featRespond({ db, me, body }) {
    const user = requireLogin(me);
    const post = visiblePost(db, body.postId);
    if (post.feat !== user.handle || post.featStatus !== "pendente") {
      throw new ActionError("Esse convite de feat não está mais aberto.");
    }
    const beforeAuthor = unlockedTiers(db, post.authorHandle);
    const beforeFeat = unlockedTiers(db, user.handle);
    post.featStatus = body.accept === true ? "aceito" : "recusado";
    celebrate(db, post.authorHandle, beforeAuthor);
    celebrate(db, user.handle, beforeFeat);
    notify(db, {
      userHandle: post.authorHandle,
      type: "feat",
      actorHandle: user.handle,
      text: post.featStatus === "aceito" ? "aceitou o feat. A publicação agora tem duas assinaturas." : "recusou o feat.",
      href: `/post/${post.id}`,
    });
  },

  deletePost({ db, me, body }) {
    const user = requireLogin(me);
    const post = db.posts.find((item) => item.id === body.postId);
    if (!post) throw new ActionError("Publicação não encontrada.");
    if (post.authorHandle !== user.handle && user.role !== "moderator") {
      throw new ActionError("Só quem publicou pode apagar.");
    }
    db.posts = db.posts.filter((item) => item.id !== post.id);
    db.comments = db.comments.filter((item) => item.postId !== post.id);
    db.reactions = db.reactions.filter((item) => item.postId !== post.id);
    db.reposts = db.reposts.filter((item) => item.postId !== post.id);
  },

  comment({ db, me, body }) {
    const user = requireActive(me);
    const post = visiblePost(db, body.postId);
    if (blockedBetween(db, user.handle, post.authorHandle)) throw new ActionError("Não é possível comentar neste perfil.");
    const text = checkText(body.text, "comment");
    const mine = db.comments.filter((item) => item.authorHandle === user.handle).map((item) => item.createdAt);
    if (tooSoon(mine, 3)) throw new ActionError("Espere alguns segundos antes de comentar de novo.");
    db.comments.push({
      id: randomUUID(),
      postId: post.id,
      authorHandle: user.handle,
      text,
      createdAt: new Date().toISOString(),
      hidden: false,
    });
    notify(db, {
      userHandle: post.authorHandle,
      type: "comment",
      actorHandle: user.handle,
      text: "comentou na sua publicação.",
      href: `/post/${post.id}`,
    });
  },

  react({ db, me, body }) {
    const user = requireLogin(me);
    const types: ReactionType[] = ["like", "fire", "arrepio"];
    const type = types.find((item) => item === body.type);
    if (!type) throw new ActionError("Reação inválida.");
    const post = visiblePost(db, body.postId);
    if (blockedBetween(db, user.handle, post.authorHandle)) throw new ActionError("Não é possível reagir a este perfil.");
    const index = db.reactions.findIndex(
      (item) => item.postId === post.id && item.userHandle === user.handle && item.type === type
    );
    if (index >= 0) {
      db.reactions.splice(index, 1);
      return;
    }
    db.reactions.push({ postId: post.id, userHandle: user.handle, type });
    const text = {
      like: "curtiu sua publicação.",
      fire: "marcou fogo na sua publicação.",
      arrepio: "sentiu arrepio com sua publicação.",
    }[type];
    notify(db, { userHandle: post.authorHandle, type, actorHandle: user.handle, text, href: `/post/${post.id}` });
  },

  repost({ db, me, body }) {
    const user = requireActive(me);
    const post = visiblePost(db, body.postId);
    if (post.authorHandle === user.handle) throw new ActionError("Você não pode repostar a si mesmo.");
    if (blockedBetween(db, user.handle, post.authorHandle)) throw new ActionError("Não é possível repostar este perfil.");
    const index = db.reposts.findIndex((item) => item.postId === post.id && item.userHandle === user.handle);
    if (index >= 0) {
      db.reposts.splice(index, 1);
      return;
    }
    db.reposts.push({ postId: post.id, userHandle: user.handle, createdAt: new Date().toISOString() });
    notify(db, {
      userHandle: post.authorHandle,
      type: "repost",
      actorHandle: user.handle,
      text: "repostou sua publicação.",
      href: `/post/${post.id}`,
    });
  },

  follow({ db, me, body }) {
    const user = requireLogin(me);
    const target = targetUser(db, user, body.handle, "seguir");
    const index = db.follows.findIndex((item) => item.follower === user.handle && item.following === target.handle);
    if (index >= 0) {
      db.follows.splice(index, 1);
      return;
    }
    db.follows.push({ follower: user.handle, following: target.handle });
    notify(db, {
      userHandle: target.handle,
      type: "follow",
      actorHandle: user.handle,
      text: "começou a seguir você.",
      href: `/perfil/${user.handle}`,
    });
  },

  message({ db, me, body }) {
    const user = requireActive(me);
    const target = targetUser(db, user, body.handle, "enviar mensagem para");
    const text = checkText(body.text, "message");
    const mine = db.messages.filter((item) => item.fromHandle === user.handle).map((item) => item.createdAt);
    if (tooSoon(mine, 2)) throw new ActionError("Espere um instante antes de enviar outra mensagem.");
    db.messages.push({
      id: randomUUID(),
      fromHandle: user.handle,
      toHandle: target.handle,
      text,
      createdAt: new Date().toISOString(),
      hidden: false,
    });
    notify(db, {
      userHandle: target.handle,
      type: "message",
      actorHandle: user.handle,
      text: "enviou uma mensagem.",
      href: `/mensagens/${user.handle}`,
    });
  },

  support({ db, me, body }) {
    const user = requireLogin(me);
    const target = targetUser(db, user, body.handle, "apoiar");
    const already = db.notifications.some(
      (item) => item.type === "support" && item.actorHandle === user.handle && item.userHandle === target.handle
    );
    if (already) throw new ActionError("Você já apoiou este perfil.");
    notify(db, {
      userHandle: target.handle,
      type: "support",
      actorHandle: user.handle,
      text: "quer apoiar o seu trabalho. Pagamentos ainda não passam por aqui.",
      href: `/perfil/${user.handle}`,
    });
  },

  story({ db, me, body }) {
    const user = requireActive(me);
    const imageId = ownedMedia(db, user, body.imageId);
    const raw = textField(body.text).trim();
    if (!raw && !imageId) throw new ActionError("Escreva algo ou escolha uma foto para o Prisma.");
    const text = raw ? checkText(raw, "story") : "";
    const bg = typeof body.bg === "string" && STORY_BACKGROUNDS[body.bg] ? body.bg : "aurora";
    const mine = db.stories.filter((item) => item.authorHandle === user.handle).map((item) => item.createdAt);
    if (tooSoon(mine, 5)) throw new ActionError("Espere alguns segundos antes do próximo Prisma.");
    if (countToday(mine) >= 20) throw new ActionError("Você atingiu o limite de Prismas de hoje.");
    db.stories.push({
      id: randomUUID(),
      authorHandle: user.handle,
      text,
      imageId,
      bg,
      createdAt: new Date().toISOString(),
      hidden: false,
    });
  },

  deleteStory({ db, me, body }) {
    const user = requireLogin(me);
    const story = db.stories.find((item) => item.id === body.storyId);
    if (!story) throw new ActionError("Prisma não encontrado.");
    if (story.authorHandle !== user.handle && user.role !== "moderator") {
      throw new ActionError("Só quem publicou pode apagar.");
    }
    db.stories = db.stories.filter((item) => item.id !== story.id);
  },

  opportunity({ db, me, body }) {
    const user = requireActive(me);
    const type = OPPORTUNITY_TYPES.find((item) => item.id === body.type)?.id as OpportunityType | undefined;
    if (!type) throw new ActionError("Escolha o tipo de oportunidade.");
    const mine = db.opportunities.filter((item) => item.authorHandle === user.handle).map((item) => item.createdAt);
    if (tooSoon(mine, 10)) throw new ActionError("Espere alguns segundos antes de publicar outra oportunidade.");
    if (countToday(mine) >= 10) throw new ActionError("Você atingiu o limite de oportunidades de hoje.");
    db.opportunities.unshift({
      id: randomUUID(),
      authorHandle: user.handle,
      type,
      title: checkText(body.title, "title"),
      description: checkText(body.description, "description"),
      city: optionalText(body.city, "short"),
      date: optionalText(body.date, "short"),
      fee: optionalText(body.fee, "short"),
      tags: listField(body.tags, 6, 24, "tags"),
      createdAt: new Date().toISOString(),
      open: true,
      hidden: false,
    });
  },

  toggleOpportunity({ db, me, body }) {
    const user = requireLogin(me);
    const item = db.opportunities.find((opp) => opp.id === body.opportunityId);
    if (!item || item.authorHandle !== user.handle) throw new ActionError("Oportunidade não encontrada.");
    item.open = !item.open;
  },

  apply({ db, me, body }) {
    const user = requireActive(me);
    const item = db.opportunities.find((opp) => opp.id === body.opportunityId && !opp.hidden);
    if (!item) throw new ActionError("Oportunidade não encontrada.");
    if (!item.open) throw new ActionError("Essa oportunidade já foi encerrada.");
    if (item.authorHandle === user.handle) throw new ActionError("Você não pode se candidatar à própria oportunidade.");
    if (blockedBetween(db, user.handle, item.authorHandle)) throw new ActionError("Não é possível se candidatar aqui.");
    if (db.applications.some((app) => app.opportunityId === item.id && app.applicantHandle === user.handle)) {
      throw new ActionError("Você já se candidatou.");
    }
    db.applications.push({
      id: randomUUID(),
      opportunityId: item.id,
      applicantHandle: user.handle,
      pitch: checkText(body.pitch, "pitch"),
      createdAt: new Date().toISOString(),
      status: "enviada",
    });
    notify(db, {
      userHandle: item.authorHandle,
      type: "application",
      actorHandle: user.handle,
      text: `se candidatou para “${item.title}”.`,
      href: `/oportunidades#${item.id}`,
    });
  },

  decideApplication({ db, me, body }) {
    const user = requireLogin(me);
    const app = db.applications.find((item) => item.id === body.applicationId);
    const opp = app && db.opportunities.find((item) => item.id === app.opportunityId);
    if (!app || !opp || opp.authorHandle !== user.handle) throw new ActionError("Candidatura não encontrada.");
    const status = body.status === "selecionada" || body.status === "recusada" ? body.status : null;
    if (!status) throw new ActionError("Escolha selecionar ou recusar.");
    app.status = status;
    notify(db, {
      userHandle: app.applicantHandle,
      type: "application",
      actorHandle: user.handle,
      text:
        status === "selecionada"
          ? `selecionou você para “${opp.title}”. Combine os detalhes na mensagem.`
          : `não seguiu com sua candidatura para “${opp.title}”.`,
      href: status === "selecionada" ? `/mensagens/${user.handle}` : "/oportunidades",
    });
  },

  createEvent({ db, me, body }) {
    const user = requireActive(me);
    const title = checkText(body.title, "title");
    const startsAt = new Date(textField(body.startsAt));
    if (Number.isNaN(startsAt.getTime())) throw new ActionError("Informe data e hora do evento.");
    const location = checkText(body.location, "short");
    const category = checkText(body.category || "Evento", "short");
    const free = body.free !== false;
    const price = free ? undefined : checkText(body.price, "short");
    const lineup = listField(body.lineup, 12, 20, "artistas")
      .map((handle) => normalizeHandle(handle))
      .filter((handle) => findUser(db, handle));
    const mine = db.events.filter((item) => item.createdBy === user.handle).length;
    if (mine >= 60) throw new ActionError("Você atingiu o limite de eventos.");
    const before = unlockedTiers(db, user.handle);
    const date = new Intl.DateTimeFormat("pt-BR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(startsAt);
    const event = {
      id: randomUUID(),
      title,
      date,
      startsAt: startsAt.toISOString(),
      location,
      category,
      free,
      price,
      artistHandles: lineup,
      createdBy: user.handle,
      description: optionalText(body.description, "description"),
    };
    db.events.unshift(event);
    for (const handle of lineup) {
      notify(db, {
        userHandle: handle,
        type: "event",
        actorHandle: user.handle,
        text: `colocou você no line-up de “${title}”.`,
        href: "/agenda",
      });
    }
    celebrate(db, user.handle, before);
  },

  participation({ db, me, body }) {
    const user = requireActive(me);
    const niche = nicheField(body.niche);
    const role = roleField(body.role);
    const mine = db.participations.filter((item) => item.userHandle === user.handle);
    if (countToday(mine.map((item) => item.createdAt)) >= 20) {
      throw new ActionError("Você registrou muitas participações hoje. Continue amanhã.");
    }
    if (mine.length >= 500) throw new ActionError("Sua trajetória atingiu o limite de registros.");

    let eventId: string | null = null;
    let eventTitle: string;
    let date: string;
    let city: string;
    let organizer: string | null = null;
    const eventRef = textField(body.eventId);
    if (eventRef) {
      const event = db.events.find((item) => item.id === eventRef);
      if (!event) throw new ActionError("Evento não encontrado na agenda.");
      eventId = event.id;
      eventTitle = event.title;
      city = event.location;
      date = event.startsAt ? event.startsAt.slice(0, 10) : dateField(body.date);
      if (date > today()) throw new ActionError("Registre a participação depois que o evento acontecer.");
      organizer = event.createdBy;
    } else {
      eventTitle = checkText(body.eventTitle, "title");
      date = dateField(body.date);
      city = optionalText(body.city, "short");
      const handle = normalizeHandle(textField(body.organizerHandle));
      if (handle) {
        if (!findUser(db, handle)) throw new ActionError("Não encontramos o @ de quem organizou.");
        organizer = handle;
      }
    }
    if (organizer === user.handle) organizer = null;
    if (organizer && blockedBetween(db, user.handle, organizer)) organizer = null;

    const duplicate = mine.some(
      (item) =>
        item.status !== "recusada" &&
        item.niche === niche &&
        item.role === role &&
        item.date === date &&
        item.eventTitle.toLowerCase() === eventTitle.toLowerCase()
    );
    if (duplicate) throw new ActionError("Essa participação já está na sua trajetória.");

    const item: Participation = {
      id: randomUUID(),
      userHandle: user.handle,
      niche,
      role,
      eventId,
      eventTitle,
      date,
      city,
      organizerHandle: organizer,
      status: organizer ? "pendente" : "declarada",
      note: optionalText(body.note, "short"),
      createdAt: new Date().toISOString(),
      decidedAt: null,
    };
    const before = unlockedTiers(db, user.handle);
    db.participations.unshift(item);
    celebrate(db, user.handle, before);
    if (organizer) {
      notify(db, {
        userHandle: organizer,
        type: "participation",
        actorHandle: user.handle,
        text: `pediu que você confirme a participação em “${eventTitle}” (${nicheLabel(niche)} · ${roleLabel(role)}).`,
        href: `/perfil/${user.handle}#conquistas`,
        targetId: item.id,
      });
    }
  },

  registerResult({ db, me, body }) {
    const user = requireActive(me);
    const event = db.events.find((item) => item.id === textField(body.eventId));
    if (!event) throw new ActionError("Evento não encontrado.");
    if (event.createdBy !== user.handle) throw new ActionError("Só quem criou o evento registra os resultados.");
    if (event.startsAt && new Date(event.startsAt).getTime() > Date.now() + DAY) {
      throw new ActionError("Registre os resultados depois que o evento acontecer.");
    }
    const target = targetUser(db, user, body.handle, "registrar resultado para");
    const niche = nicheField(body.niche);
    const role = roleField(body.role);
    if (db.participations.filter((item) => item.eventId === event.id).length >= 200) {
      throw new ActionError("Este evento atingiu o limite de resultados.");
    }
    const now = new Date().toISOString();
    const before = unlockedTiers(db, target.handle);
    const existing = db.participations.find(
      (item) =>
        item.userHandle === target.handle && item.eventId === event.id && item.niche === niche && item.status !== "recusada"
    );
    if (existing) {
      existing.role = role;
      existing.status = "confirmada";
      existing.organizerHandle = user.handle;
      existing.decidedAt = now;
    } else {
      db.participations.unshift({
        id: randomUUID(),
        userHandle: target.handle,
        niche,
        role,
        eventId: event.id,
        eventTitle: event.title,
        date: (event.startsAt ?? now).slice(0, 10),
        city: event.location,
        organizerHandle: user.handle,
        status: "confirmada",
        note: "",
        createdAt: now,
        decidedAt: now,
      });
    }
    celebrate(db, target.handle, before);
    notify(db, {
      userHandle: target.handle,
      type: "participation",
      actorHandle: user.handle,
      text: `confirmou você em “${event.title}”: ${roleLabel(role)} (${nicheLabel(niche)}).`,
      href: `/perfil/${target.handle}#conquistas`,
    });
  },

  decideParticipation({ db, me, body }) {
    const user = requireLogin(me);
    const item = db.participations.find((current) => current.id === body.participationId);
    if (!item || item.organizerHandle !== user.handle) throw new ActionError("Pedido de confirmação não encontrado.");
    if (item.status !== "pendente") throw new ActionError("Esse pedido já foi respondido.");
    const accept = body.accept === true;
    const before = unlockedTiers(db, item.userHandle);
    item.status = accept ? "confirmada" : "recusada";
    item.decidedAt = new Date().toISOString();
    celebrate(db, item.userHandle, before);
    notify(db, {
      userHandle: item.userHandle,
      type: "participation",
      actorHandle: user.handle,
      text: accept
        ? `confirmou sua participação em “${item.eventTitle}”. Agora ela conta como verificada.`
        : `não confirmou sua participação em “${item.eventTitle}”.`,
      href: `/perfil/${item.userHandle}#conquistas`,
    });
  },

  deleteParticipation({ db, me, body }) {
    const user = requireLogin(me);
    const item = db.participations.find((current) => current.id === body.participationId);
    if (!item) throw new ActionError("Participação não encontrada.");
    if (item.userHandle !== user.handle && user.role !== "moderator") {
      throw new ActionError("Você não pode remover esta participação.");
    }
    db.participations = db.participations.filter((current) => current.id !== item.id);
  },

  rsvp({ db, me, body }) {
    const user = requireLogin(me);
    const eventId = textField(body.eventId);
    if (!db.events.some((event) => event.id === eventId)) throw new ActionError("Evento não encontrado.");
    const index = db.rsvps.findIndex((item) => item.eventId === eventId && item.userHandle === user.handle);
    if (index >= 0) db.rsvps.splice(index, 1);
    else db.rsvps.push({ eventId, userHandle: user.handle });
  },

  startJam({ db, me, body }) {
    const user = requireActive(me);
    const music = musicField(body.music);
    const note = optionalText(body.note, "story");
    const mine = db.jams.filter((item) => item.hostHandle === user.handle);
    if (tooSoon(mine.map((item) => item.createdAt), 15)) throw new ActionError("Espere alguns segundos antes de abrir outra jam.");
    if (countToday(mine.map((item) => item.createdAt)) >= 20) throw new ActionError("Você atingiu o limite de jams de hoje.");
    const now = new Date().toISOString();
    for (const jam of db.jams) {
      if (jam.hostHandle === user.handle && !jam.closedAt) jam.closedAt = now;
    }
    const jam = {
      id: randomUUID(),
      hostHandle: user.handle,
      music,
      note,
      createdAt: now,
      closedAt: null,
      hidden: false,
    };
    db.jams.unshift(jam);
    db.jamMembers = db.jamMembers.filter((item) => item.jamId !== jam.id);
    db.jamMembers.push({ jamId: jam.id, userHandle: user.handle, joinedAt: now });
  },

  joinJam({ db, me, body }) {
    const user = requireLogin(me);
    const jam = openJam(db, textField(body.jamId));
    if (jam.hostHandle === user.handle) return;
    if (blockedBetween(db, user.handle, jam.hostHandle)) throw new ActionError("Não é possível entrar nesta jam.");
    if (db.jamMembers.some((item) => item.jamId === jam.id && item.userHandle === user.handle)) return;
    if (db.jamMembers.filter((item) => item.jamId === jam.id).length >= 80) {
      throw new ActionError("Essa jam já está cheia.");
    }
    db.jamMembers.push({ jamId: jam.id, userHandle: user.handle, joinedAt: new Date().toISOString() });
    notify(db, {
      userHandle: jam.hostHandle,
      type: "jam",
      actorHandle: user.handle,
      text: `entrou na sua jam “${jam.music.title}”.`,
      href: `/jam#${jam.id}`,
      targetId: jam.id,
    });
  },

  leaveJam({ db, me, body }) {
    const user = requireLogin(me);
    const jamId = textField(body.jamId);
    const jam = db.jams.find((item) => item.id === jamId);
    if (jam?.hostHandle === user.handle) throw new ActionError("Quem abriu a jam encerra ela, em vez de sair.");
    db.jamMembers = db.jamMembers.filter((item) => !(item.jamId === jamId && item.userHandle === user.handle));
  },

  closeJam({ db, me, body }) {
    const user = requireLogin(me);
    const jam = db.jams.find((item) => item.id === textField(body.jamId));
    if (!jam) throw new ActionError("Jam não encontrada.");
    if (jam.hostHandle !== user.handle && user.role !== "moderator") throw new ActionError("Só quem abriu a jam pode encerrar.");
    jam.closedAt = new Date().toISOString();
  },

  testimonial({ db, me, body }) {
    const user = requireActive(me);
    const target = targetUser(db, user, body.handle, "deixar depoimento para");
    if (db.testimonials.some((item) => item.artistHandle === target.handle && item.authorHandle === user.handle)) {
      throw new ActionError("Você já deixou um depoimento para este perfil.");
    }
    const before = unlockedTiers(db, target.handle);
    db.testimonials.push({
      id: randomUUID(),
      artistHandle: target.handle,
      author: user.name,
      authorHandle: user.handle,
      text: checkText(body.text, "testimonial"),
      createdAt: new Date().toISOString(),
    });
    notify(db, {
      userHandle: target.handle,
      type: "testimonial",
      actorHandle: user.handle,
      text: "deixou um depoimento na sua vitrine.",
      href: `/perfil/${target.handle}`,
    });
    celebrate(db, target.handle, before);
  },

  deleteTestimonial({ db, me, body }) {
    const user = requireLogin(me);
    const item = db.testimonials.find((testimonial) => testimonial.id === body.testimonialId);
    if (!item) throw new ActionError("Depoimento não encontrado.");
    const allowed = item.authorHandle === user.handle || item.artistHandle === user.handle || user.role === "moderator";
    if (!allowed) throw new ActionError("Você não pode remover este depoimento.");
    db.testimonials = db.testimonials.filter((testimonial) => testimonial.id !== item.id);
  },

  report({ db, me, body }) {
    const user = requireLogin(me);
    const targets: ReportTarget[] = ["post", "comment", "user", "message", "story", "opportunity"];
    const targetType = targets.find((item) => item === body.targetType);
    if (!targetType) throw new ActionError("Não foi possível identificar o que denunciar.");
    const targetId = textField(body.targetId).trim();
    const reason = REPORT_REASONS.find((item) => item.id === body.reason)?.id as ReportReason | undefined;
    if (!reason) throw new ActionError("Escolha um motivo da lista.");
    const details = textField(body.details).trim();
    if (details.length > 300) throw new ActionError("A descrição da denúncia passa de 300 caracteres.");
    if (!targetExists(db, targetType, targetId)) throw new ActionError("O conteúdo denunciado não foi encontrado.");
    if (targetType === "user" && targetId === user.handle) throw new ActionError("Você não pode denunciar a própria conta.");
    const open = db.reports.some(
      (item) =>
        item.reporterHandle === user.handle &&
        item.targetType === targetType &&
        item.targetId === targetId &&
        item.status === "aberta"
    );
    if (open) throw new ActionError("Você já tem uma denúncia aberta sobre isso.");
    db.reports.unshift({
      id: randomUUID(),
      reporterHandle: user.handle,
      targetType,
      targetId,
      reason,
      details,
      snapshot: snapshotOf(db, targetType, targetId),
      createdAt: new Date().toISOString(),
      status: "aberta",
    });
    for (const moderator of db.users.filter((item) => item.role === "moderator")) {
      notify(db, {
        userHandle: moderator.handle,
        type: "moderation",
        actorHandle: user.handle,
        text: "enviou uma denúncia para análise.",
        href: "/moderacao",
      });
    }
  },

  block({ db, me, body }) {
    const user = requireLogin(me);
    const handle = normalizeHandle(textField(body.handle));
    if (handle === user.handle) throw new ActionError("Você não pode bloquear a si mesmo.");
    if (!findUser(db, handle)) throw new ActionError("Perfil não encontrado.");
    if (!db.blocks.some((item) => item.blocker === user.handle && item.blocked === handle)) {
      db.blocks.push({ blocker: user.handle, blocked: handle });
    }
    db.follows = db.follows.filter(
      (item) =>
        !(
          (item.follower === user.handle && item.following === handle) ||
          (item.follower === handle && item.following === user.handle)
        )
    );
  },

  unblock({ db, me, body }) {
    const user = requireLogin(me);
    const handle = normalizeHandle(textField(body.handle));
    db.blocks = db.blocks.filter((item) => !(item.blocker === user.handle && item.blocked === handle));
  },

  updateProfile({ db, me, body }) {
    const user = requireLogin(me);
    const name = checkText(body.name, "name");
    const bio = optionalText(body.bio, "bio");
    const tags = listField(body.tags, 8, 24, "tags");
    const city = optionalText(body.city, "short");
    const links: ProfileLink[] = [];
    if (Array.isArray(body.links)) {
      if (body.links.length > 5) throw new ActionError("Use no máximo 5 links.");
      for (const raw of body.links) {
        const item = record(raw);
        const url = textField(item.url).trim();
        if (!url) continue;
        const urlError = validateUrl(url);
        if (urlError) throw new ActionError(urlError);
        const label = textField(item.label).trim() || new URL(url).hostname.replace(/^www\./, "");
        if (label.length > 24) throw new ActionError("O nome do link pode ter até 24 caracteres.");
        links.push({ label, url });
      }
    }
    if (user.role !== "moderator" && ACCOUNT_KINDS.some((item) => item.id === body.kind)) {
      user.kind = body.kind as AccountKind;
    }
    if ("avatarId" in body) user.avatarId = ownedMedia(db, user, body.avatarId);
    if ("coverId" in body) user.coverId = ownedMedia(db, user, body.coverId);
    user.name = name;
    user.bio = bio;
    user.tags = tags;
    user.city = city;
    user.links = links;
    user.available = body.available === true;
    user.avatarInitials = initialsFromName(name);
    if (Array.isArray(body.niches)) {
      const niches = [...new Set(body.niches)].filter((item): item is Niche => NICHES.some((niche) => niche.id === item));
      if (niches.length > 6) throw new ActionError("Escolha no máximo 6 nichos.");
      user.niches = niches;
    }
  },

  saveEdital({ db, me, body }) {
    const user = requireLogin(me);
    const raw = record(body.edital);
    const mapa = mapaField(raw.mapa);
    const next: EditalProfile = {
      legalName: bounded(raw.legalName, 80, "O nome de registro"),
      artisticName: bounded(raw.artisticName, 80, "O nome artístico"),
      city: bounded(raw.city, 80, "O município"),
      segment: bounded(raw.segment, 180, "A área de atuação"),
      formation: bounded(raw.formation, 1200, "A formação"),
      awards: bounded(raw.awards, 1200, "Os prêmios"),
      portfolio: bounded(raw.portfolio, 1200, "O portfólio"),
      mapa,
    };
    user.edital = next;
  },

  updatePrefs({ db, me, body }) {
    const user = requireLogin(me);
    const raw = record(body.prefs);
    const next: Prefs = { ...user.prefs };
    if (raw.theme === "dark" || raw.theme === "light") next.theme = raw.theme;
    if (typeof raw.accent === "string" && isHexColor(raw.accent)) next.accent = raw.accent.toLowerCase();
    if (typeof raw.accent2 === "string" && isHexColor(raw.accent2)) next.accent2 = raw.accent2.toLowerCase();
    if ("backgroundId" in raw) next.backgroundId = ownedMedia(db, user, raw.backgroundId);
    if (typeof raw.bgDim === "number") next.bgDim = clamp(Math.round(raw.bgDim), 0, 90);
    if (typeof raw.bgBlur === "number") next.bgBlur = clamp(Math.round(raw.bgBlur), 0, 24);
    if (typeof raw.glass === "boolean") next.glass = raw.glass;
    const shape = SHAPES.find((item) => item.id === raw.shape)?.id as Shape | undefined;
    if (shape) next.shape = shape;
    if (typeof raw.fontScale === "number") next.fontScale = clamp(Math.round(raw.fontScale), 85, 125);
    user.prefs = next;
  },

  readNotifications({ db, me }) {
    const user = requireLogin(me);
    for (const item of db.notifications) {
      if (item.userHandle === user.handle) item.read = true;
    }
  },

  deleteAccount({ db, me }) {
    const user = requireLogin(me);
    if (user.role === "moderator") throw new ActionError("A conta da equipe não pode ser encerrada por aqui.");
    const handle = user.handle;
    const oppIds = new Set(db.opportunities.filter((item) => item.authorHandle === handle).map((item) => item.id));
    for (const media of db.media.filter((item) => item.ownerHandle === handle)) removeMediaFile(media.id, media.ext);
    db.media = db.media.filter((item) => item.ownerHandle !== handle);
    db.users = db.users.filter((item) => item.id !== user.id);
    db.sessions = db.sessions.filter((item) => item.userId !== user.id);
    db.posts = db.posts.filter((item) => item.authorHandle !== handle);
    for (const post of db.posts) {
      if (post.feat === handle) {
        post.feat = null;
        post.featStatus = null;
      }
    }
    db.comments = db.comments.filter((item) => item.authorHandle !== handle);
    db.reactions = db.reactions.filter((item) => item.userHandle !== handle);
    db.reposts = db.reposts.filter((item) => item.userHandle !== handle);
    db.follows = db.follows.filter((item) => item.follower !== handle && item.following !== handle);
    db.notifications = db.notifications.filter((item) => item.userHandle !== handle && item.actorHandle !== handle);
    db.messages = db.messages.filter((item) => item.fromHandle !== handle && item.toHandle !== handle);
    db.blocks = db.blocks.filter((item) => item.blocker !== handle && item.blocked !== handle);
    db.rsvps = db.rsvps.filter((item) => item.userHandle !== handle);
    db.reports = db.reports.filter((item) => item.reporterHandle !== handle);
    db.stories = db.stories.filter((item) => item.authorHandle !== handle);
    db.opportunities = db.opportunities.filter((item) => item.authorHandle !== handle);
    db.applications = db.applications.filter(
      (item) => item.applicantHandle !== handle && !oppIds.has(item.opportunityId)
    );
    db.testimonials = db.testimonials.filter((item) => item.artistHandle !== handle && item.authorHandle !== handle);
    for (const event of db.events) event.artistHandles = event.artistHandles.filter((item) => item !== handle);
    db.participations = db.participations.filter((item) => item.userHandle !== handle);
    const hosted = new Set(db.jams.filter((item) => item.hostHandle === handle).map((item) => item.id));
    db.jams = db.jams.filter((item) => item.hostHandle !== handle);
    db.jamMembers = db.jamMembers.filter((item) => item.userHandle !== handle && !hosted.has(item.jamId));
    for (const item of db.participations) {
      if (item.organizerHandle !== handle) continue;
      if (item.status === "pendente") item.status = "declarada";
      if (item.status !== "confirmada") item.organizerHandle = null;
    }
  },

  moderate({ db, me, body }) {
    const user = requireLogin(me);
    if (user.role !== "moderator") throw new ActionError("Só a equipe analisa denúncias.");
    const report = db.reports.find((item) => item.id === body.reportId);
    if (!report) throw new ActionError("Denúncia não encontrada.");
    const decision = body.decision === "oculta" || body.decision === "mantida" ? body.decision : null;
    if (!decision) throw new ActionError("Escolha ocultar ou manter.");
    report.status = decision;
    applyDecision(db, report.targetType, report.targetId, decision, user.handle);
    notify(db, {
      userHandle: report.reporterHandle,
      type: "moderation",
      actorHandle: user.handle,
      text:
        decision === "oculta"
          ? "Sua denúncia foi aceita e o conteúdo foi ocultado."
          : "Sua denúncia foi analisada e o conteúdo foi mantido.",
      href: "/regras",
    });
  },
};

export function performAction(db: Database, me: UserRecord | null, input: unknown) {
  const body = record(input);
  const cutoff = Date.now() - 2 * DAY;
  db.stories = db.stories.filter((story) => new Date(story.createdAt).getTime() > cutoff);
  const now = new Date().toISOString();
  for (const jam of db.jams) {
    if (!jam.closedAt && Date.now() - new Date(jam.createdAt).getTime() >= JAM_MS) jam.closedAt = now;
  }
  const closed = db.jams.filter((jam) => jam.closedAt);
  if (closed.length > 200) {
    const drop = new Set(closed.slice(200).map((jam) => jam.id));
    db.jams = db.jams.filter((jam) => !drop.has(jam.id));
    db.jamMembers = db.jamMembers.filter((member) => !drop.has(member.jamId));
  }
  const handler = handlers[textField(body.action)];
  if (!handler) throw new ActionError("Ação desconhecida.");
  handler({ db, me, body });
}

function snapshotOf(db: Database, type: ReportTarget, id: string) {
  const cut = (text: string | undefined) => (text ?? "").slice(0, 280);
  if (type === "post") return cut(db.posts.find((item) => item.id === id)?.text) || "Publicação com imagem";
  if (type === "comment") return cut(db.comments.find((item) => item.id === id)?.text);
  if (type === "message") return cut(db.messages.find((item) => item.id === id)?.text);
  if (type === "story") return cut(db.stories.find((item) => item.id === id)?.text) || "Prisma com foto";
  if (type === "opportunity") return cut(db.opportunities.find((item) => item.id === id)?.title);
  const user = db.users.find((item) => item.handle === id);
  return user ? `${user.name} (@${user.handle})` : id;
}

function targetExists(db: Database, type: ReportTarget, id: string) {
  if (type === "post") return db.posts.some((item) => item.id === id);
  if (type === "comment") return db.comments.some((item) => item.id === id);
  if (type === "message") return db.messages.some((item) => item.id === id);
  if (type === "story") return db.stories.some((item) => item.id === id);
  if (type === "opportunity") return db.opportunities.some((item) => item.id === id);
  return db.users.some((item) => item.handle === id);
}

function applyDecision(
  db: Database,
  type: ReportTarget,
  id: string,
  decision: "oculta" | "mantida",
  moderator: string
) {
  const hide = decision === "oculta";
  const tell = (userHandle: string, text: string, href: string) =>
    notify(db, { userHandle, type: "moderation", actorHandle: moderator, text, href });

  if (type === "post") {
    const post = db.posts.find((item) => item.id === id);
    if (!post) return;
    post.hidden = hide;
    tell(
      post.authorHandle,
      hide ? "Uma publicação sua foi ocultada porque viola as regras." : "Uma publicação sua foi revisada e continua no ar.",
      "/regras"
    );
    return;
  }
  if (type === "comment") {
    const comment = db.comments.find((item) => item.id === id);
    if (!comment) return;
    comment.hidden = hide;
    tell(comment.authorHandle, hide ? "Um comentário seu foi ocultado porque viola as regras." : "Um comentário seu foi revisado e mantido.", "/regras");
    return;
  }
  if (type === "message") {
    const message = db.messages.find((item) => item.id === id);
    if (message) message.hidden = hide;
    return;
  }
  if (type === "story") {
    const story = db.stories.find((item) => item.id === id);
    if (!story) return;
    story.hidden = hide;
    if (hide) tell(story.authorHandle, "Um Prisma seu foi ocultado porque viola as regras.", "/regras");
    return;
  }
  if (type === "opportunity") {
    const item = db.opportunities.find((opp) => opp.id === id);
    if (!item) return;
    item.hidden = hide;
    if (hide) tell(item.authorHandle, "Uma oportunidade sua foi ocultada porque viola as regras.", "/regras");
    return;
  }
  const target = db.users.find((item) => item.handle === id);
  if (!target || target.role === "moderator") return;
  target.limited = hide;
  tell(
    target.handle,
    hide
      ? "Sua conta foi limitada após uma denúncia. Você pode ler a rede, mas não publicar até a revisão."
      : "A limitação da sua conta foi removida após revisão.",
    "/regras"
  );
}
