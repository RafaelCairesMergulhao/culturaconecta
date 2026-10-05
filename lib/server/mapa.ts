import type { CulturalMapChoice, CulturalMapSnapshot } from "../types";

export class MapaError extends Error {}

const DEFAULT_ORIGIN = "https://mapa.cultura.es.gov.br";
const SELECT = "id,name,shortDescription,longDescription,terms,En_Municipio,En_Estado,site";
const LIST_SELECT = "id,name,shortDescription,terms,En_Municipio,En_Estado";

export function parseMapaUrl(raw: string): { origin: string; id: string; href: string } | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (!allowedHost(url.hostname)) return null;
  const fromPath = url.pathname.match(/\/(?:agente|agentes|agent)\/(\d+)/i)?.[1];
  const fromQuery = url.searchParams.get("id")?.replace(/\D/g, "") ?? "";
  const id = fromPath || fromQuery;
  if (!/^\d{1,12}$/.test(id)) return null;
  const href = `${url.origin}/agente/${id}/`;
  return { origin: url.origin, id, href };
}

function allowedHost(host: string) {
  const name = host.toLowerCase().replace(/\.$/, "");
  if (!/^[a-z0-9.-]+$/.test(name)) return false;
  if (name === "localhost" || name.endsWith(".local") || /^\d{1,3}(\.\d{1,3}){3}$/.test(name)) return false;
  if (name.startsWith("mapa.cultura.") && name.endsWith(".gov.br")) return true;
  if (name.includes("mapacultural") && (name.endsWith(".gov.br") || name.endsWith(".org.br"))) return true;
  if (name.includes(".mapas.") && name.endsWith(".gov.br")) return true;
  return false;
}

function asText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\u0000/g, "").trim().slice(0, max);
}

function asList(value: unknown) {
  if (!Array.isArray(value)) return [];
  const items = value
    .map((item) => (typeof item === "string" ? item : ""))
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 16);
  return [...new Set(items.map((item) => item.slice(0, 80)))];
}

function searchTerm(raw: string) {
  const term = raw
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  if (term.length < 2) return "";
  return term;
}

function agentHref(origin: string, id: string) {
  return `${origin}/agente/${id}/`;
}

export async function lookupMapa(raw: string): Promise<{ mapa: CulturalMapSnapshot } | { choices: CulturalMapChoice[] }> {
  const text = raw.trim();
  if (!text) throw new MapaError("Escreva o nome do agente ou cole o link do perfil público.");

  const parsed = parseMapaUrl(text);
  if (parsed) return { mapa: await fetchMapa(text) };

  let origin = DEFAULT_ORIGIN;
  let term = text;
  if (/^https?:\/\//i.test(text)) {
    let url: URL;
    try {
      url = new URL(text);
    } catch {
      throw new MapaError("Esse link não abre um agente. Escreva o nome público do perfil.");
    }
    if (url.protocol !== "https:" || !allowedHost(url.hostname)) {
      throw new MapaError("Use o Mapa Cultural oficial, como mapa.cultura.es.gov.br, ou escreva o nome do agente.");
    }
    origin = url.origin;
    const slug = url.pathname.split("/").filter(Boolean).pop() ?? "";
    term = /^\d+$/.test(slug) ? "" : slug.replace(/-/g, " ");
  }

  const query = searchTerm(term);
  if (!query) {
    throw new MapaError("Escreva o nome do agente como aparece no perfil público do Mapa Cultural.");
  }

  const found = await findAgents(origin, query);
  if (found.length === 0) {
    throw new MapaError(
      `Não achei “${query}” no Mapa Cultural do Espírito Santo. Confira o nome público do agente ou cole o link da página do perfil.`
    );
  }
  return { choices: found };
}

async function findAgents(origin: string, term: string): Promise<CulturalMapChoice[]> {
  const byName = await queryAgents(origin, `name=ILIKE(*${encodeURIComponent(term)}*)`);
  if (byName.length > 0) return byName;
  const byKeyword = await queryAgents(origin, `@keyword=${encodeURIComponent(term)}`);
  if (byKeyword.length > 0) return byKeyword;
  const last = term
    .split(" ")
    .filter((part) => part.length >= 4)
    .at(-1);
  if (!last || last.toLowerCase() === term.toLowerCase()) return [];
  return queryAgents(origin, `name=ILIKE(*${encodeURIComponent(last)}*)`);
}

async function readJson(endpoint: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json", "User-Agent": "CulturaConecta" },
    });
  } catch {
    throw new MapaError("O Mapa Cultural não respondeu. Tente de novo em instantes ou preencha os campos à mão.");
  }
  if (response.status >= 300 && response.status < 400) {
    throw new MapaError("O Mapa Cultural redirecionou o pedido. Escreva o nome do agente como aparece no perfil.");
  }
  if (!response.ok) throw new MapaError("Não foi possível ler o Mapa Cultural.");
  const payload = await response.text();
  if (payload.length > 500_000) throw new MapaError("A resposta do Mapa Cultural veio grande demais.");
  try {
    return JSON.parse(payload) as unknown;
  } catch {
    throw new MapaError("O Mapa Cultural não devolveu os dados do agente.");
  }
}

async function queryAgents(origin: string, filter: string): Promise<CulturalMapChoice[]> {
  const endpoint = `${origin}/api/agent/find/?@select=${LIST_SELECT}&${filter}&@limit=8`;
  const data = await readJson(endpoint);
  if (!Array.isArray(data)) return [];
  const choices: CulturalMapChoice[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const id = String(record.id ?? "").replace(/\D/g, "");
    const name = asText(record.name, 160);
    if (!/^\d{1,12}$/.test(id) || !name) continue;
    const terms = record.terms && typeof record.terms === "object" ? (record.terms as Record<string, unknown>) : {};
    choices.push({
      url: agentHref(origin, id),
      agentId: id,
      name,
      shortDescription: asText(record.shortDescription, 220),
      areas: [...new Set([...asList(terms.area), ...asList(terms.funcao)])].slice(0, 6),
      city: asText(record.En_Municipio, 80),
      state: asText(record.En_Estado, 40),
    });
  }
  return choices;
}

export async function fetchMapa(rawUrl: string): Promise<CulturalMapSnapshot> {
  const parsed = parseMapaUrl(rawUrl);
  if (!parsed) {
    throw new MapaError("Esse link não é a página de um agente. Escreva o nome ou cole o endereço do perfil.");
  }

  const endpoint = `${parsed.origin}/api/agent/find/?id=EQ(${parsed.id})&@select=${SELECT}&@limit=1`;
  const data = await readJson(endpoint);
  const agent = Array.isArray(data) ? data[0] : null;
  if (!agent || typeof agent !== "object") {
    throw new MapaError("Não encontrei esse agente. Confira se o link abre o perfil público.");
  }

  const record = agent as Record<string, unknown>;
  const terms = record.terms && typeof record.terms === "object" ? (record.terms as Record<string, unknown>) : {};
  const areas = [...asList(terms.area), ...asList(terms.funcao)];
  const name = asText(record.name, 160);
  if (!name) throw new MapaError("O perfil público veio sem nome.");

  return {
    url: parsed.href,
    agentId: parsed.id,
    host: new URL(parsed.origin).host,
    name,
    shortDescription: asText(record.shortDescription, 1000),
    longDescription: asText(record.longDescription, 8000),
    areas: [...new Set(areas)].slice(0, 16),
    city: asText(record.En_Municipio, 80),
    state: asText(record.En_Estado, 40),
    site: asText(record.site, 300),
    fetchedAt: new Date().toISOString(),
  };
}
