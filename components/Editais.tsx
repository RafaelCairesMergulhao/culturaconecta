"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { useSocial } from "@/components/SocialContext";
import { Eyebrow, Field, fieldClass, GhostButton, Notice, PrimaryButton } from "@/components/ui";
import { nicheLabel } from "@/lib/achievements";
import { buildCurriculum, EDITAL_GUIDE, EMPTY_EDITAL, FULL_LIMIT, MINI_LIMIT } from "@/lib/curriculum";
import type { ClientState, CulturalMapChoice, CulturalMapSnapshot, EditalProfile, PublicUser } from "@/lib/types";

export function EditaisPanel({ state }: { state: ClientState }) {
  const me = state.me!;
  return <Editor key={JSON.stringify(me.edital)} state={state} me={me} />;
}

function Editor({ state, me }: { state: ClientState; me: PublicUser }) {
  const { act, busy } = useSocial();
  const [draft, setDraft] = useState<EditalProfile>(me.edital ?? EMPTY_EDITAL);
  const [mapaUrl, setMapaUrl] = useState(me.edital?.mapa?.url || me.name);
  const [choices, setChoices] = useState<CulturalMapChoice[]>([]);
  const [mapError, setMapError] = useState("");
  const [loadingMap, setLoadingMap] = useState(false);
  const [copied, setCopied] = useState("");

  const vitrineUrl = typeof window === "undefined" ? "" : `${window.location.origin}/perfil/${me.handle}`;
  const curriculum = useMemo(() => buildCurriculum(state, me, draft, vitrineUrl), [state, me, draft, vitrineUrl]);

  function set<K extends keyof EditalProfile>(key: K, value: EditalProfile[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function fillFromProfile() {
    setDraft((current) => ({
      ...current,
      artisticName: current.artisticName || me.name,
      city: current.city || me.city,
      segment: current.segment || me.niches.map(nicheLabel).join(", "),
      portfolio:
        current.portfolio ||
        me.links.map((link) => `${link.label}: ${link.url}`).join("\n"),
    }));
  }

  function applyMapa(mapa: CulturalMapSnapshot) {
    setChoices([]);
    setMapaUrl(mapa.name);
    setDraft((current) => ({
      ...current,
      artisticName: current.artisticName || mapa.name,
      city: current.city || [mapa.city, mapa.state].filter(Boolean).join(", "),
      segment: current.segment || mapa.areas.join(", "),
      mapa,
    }));
  }

  async function pullMap(query = mapaUrl) {
    setLoadingMap(true);
    setMapError("");
    setChoices([]);
    try {
      const res = await fetch("/api/mapa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = (await res.json()) as { mapa?: CulturalMapSnapshot; choices?: CulturalMapChoice[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Não foi possível ler o Mapa Cultural.");
      if (data.mapa) {
        applyMapa(data.mapa);
        return;
      }
      if (data.choices?.length) {
        setChoices(data.choices);
        return;
      }
      throw new Error(data.error || "Não encontrei esse agente.");
    } catch (reason) {
      setMapError(reason instanceof Error ? reason.message : "Não foi possível ler o Mapa Cultural.");
    } finally {
      setLoadingMap(false);
    }
  }

  async function save() {
    await act({ action: "saveEdital", edital: draft });
  }

  async function copy(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    window.setTimeout(() => setCopied(""), 2000);
  }

  async function download() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const [r, g, b] = [1, 3, 5].map((start) => parseInt(me.prefs.accent.slice(start, start + 2), 16));
    const paintHeader = () => {
      doc.setFillColor(r, g, b);
      doc.rect(0, 0, 210, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text("Currículo artístico", 14, 12);
      doc.setFontSize(10);
      doc.text(`${curriculum.artisticName}${draft.city ? ` · ${draft.city}` : ""}`, 14, 20);
    };
    paintHeader();
    let y = 38;
    doc.setTextColor(20, 24, 40);
    for (const section of curriculum.sections) {
      const body = doc.splitTextToSize(section.body, 180) as string[];
      const block = 8 + body.length * 5;
      if (y + block > 280) {
        doc.addPage();
        y = 18;
      }
      doc.setFontSize(12);
      doc.setTextColor(r, g, b);
      doc.text(section.title.toUpperCase(), 14, y);
      y += 6;
      doc.setFontSize(10);
      doc.setTextColor(20, 24, 40);
      doc.text(body, 14, y);
      y += body.length * 5 + 6;
    }
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 150);
    doc.text("Gerado na Cultura Conecta para revisão do proponente. Confira o edital antes de enviar.", 14, 290);
    doc.save(`curriculo-artistico-${me.handle}.pdf`);
  }

  return (
    <div className="space-y-6">
      <header>
        <Eyebrow>Inscrição em editais</Eyebrow>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Currículo artístico</h1>
        <p className="mt-1 text-sm leading-6 text-muted">
          O orientador monta o texto no formato que as chamadas da cultura pedem: identificação, mini currículo, trajetória,
          realizações, prêmios, formação e links. Ele usa a sua vitrine e o perfil público do Mapa Cultural.
        </p>
      </header>

      <ol className="space-y-3">
        {EDITAL_GUIDE.map((step, index) => (
          <li key={step.title} className="flex gap-3 rounded-3xl border border-line bg-card p-4">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-rosa to-azul text-sm font-semibold text-white">
              {index + 1}
            </span>
            <span>
              <span className="block font-semibold">{step.title}</span>
              <span className="mt-0.5 block text-sm leading-6 text-muted">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>

      <section className="rounded-3xl border border-line bg-card p-5">
        <div className="flex items-center gap-2">
          <Icon name="map" />
          <h2 className="font-semibold">Mapa Cultural</h2>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted">
          Escreva o nome do agente como está em{" "}
          <a href="https://mapa.cultura.es.gov.br/agentes/" className="text-rosa" target="_blank" rel="noreferrer">
            mapa.cultura.es.gov.br
          </a>
          . Se existir mais de um, escolha o seu na lista.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={mapaUrl}
            onChange={(event) => setMapaUrl(event.target.value)}
            placeholder="Nome do agente ou link do perfil"
            className={`${fieldClass} min-w-0 flex-1`}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void pullMap();
              }
            }}
          />
          <PrimaryButton onClick={() => void pullMap()} disabled={loadingMap || mapaUrl.trim().length < 2}>
            {loadingMap ? "Buscando..." : "Encontrar agente"}
          </PrimaryButton>
        </div>
        {mapError && <p className="mt-2 text-sm text-rosa">{mapError}</p>}
        {choices.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold">Encontrei estes agentes. Toque no seu.</p>
            <ul className="mt-2 space-y-2">
            {choices.map((choice) => (
              <li key={choice.agentId}>
                <button
                  type="button"
                  onClick={() => void pullMap(choice.url)}
                  className="w-full rounded-2xl border border-line bg-ink/40 p-4 text-left transition hover:border-rosa/60"
                >
                  <span className="block font-semibold">{choice.name}</span>
                  <span className="mt-0.5 block text-sm text-muted">
                    {[choice.areas.join(", "), [choice.city, choice.state].filter(Boolean).join(" — ")]
                      .filter(Boolean)
                      .join(" · ") || "Agente cultural"}
                  </span>
                  {choice.shortDescription && <span className="mt-1 block text-sm leading-6">{choice.shortDescription}</span>}
                </button>
              </li>
            ))}
            </ul>
          </div>
        )}
        {draft.mapa && (
          <div className="mt-4 rounded-2xl border border-line bg-ink/40 p-4 text-sm leading-6">
            <p className="font-semibold">{draft.mapa.name}</p>
            <p className="text-muted">
              {[draft.mapa.areas.join(", "), [draft.mapa.city, draft.mapa.state].filter(Boolean).join(" — ")]
                .filter(Boolean)
                .join(" · ") || draft.mapa.host}
            </p>
            {draft.mapa.shortDescription && <p className="mt-2">{draft.mapa.shortDescription}</p>}
            <a href={draft.mapa.url} className="mt-2 inline-block text-rosa" target="_blank" rel="noreferrer">
              Abrir no Mapa Cultural
            </a>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-3xl border border-line bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Dados do edital</h2>
          <GhostButton onClick={fillFromProfile}>Preencher com a vitrine</GhostButton>
        </div>
        <Field label="Nome artístico" hint="O nome que o público e o edital reconhecem.">
          <input value={draft.artisticName} onChange={(event) => set("artisticName", event.target.value)} className={fieldClass} maxLength={80} />
        </Field>
        <Field label="Nome de registro" hint="Opcional aqui. Muitos editais pedem o nome completo só no formulário.">
          <input value={draft.legalName} onChange={(event) => set("legalName", event.target.value)} className={fieldClass} maxLength={80} />
        </Field>
        <Field label="Município">
          <input value={draft.city} onChange={(event) => set("city", event.target.value)} className={fieldClass} maxLength={80} />
        </Field>
        <Field label="Área de atuação" hint="Como no Mapa Cultural: música, artes visuais, culturas populares e outras.">
          <input value={draft.segment} onChange={(event) => set("segment", event.target.value)} className={fieldClass} maxLength={180} />
        </Field>
        <Field label="Formação" hint="Cursos, oficinas e estudos que você possa comprovar.">
          <textarea value={draft.formation} onChange={(event) => set("formation", event.target.value)} className={`${fieldClass} min-h-24`} maxLength={1200} />
        </Field>
        <Field label="Prêmios e reconhecimentos" hint="Somente o que aconteceu de fato.">
          <textarea value={draft.awards} onChange={(event) => set("awards", event.target.value)} className={`${fieldClass} min-h-24`} maxLength={1200} />
        </Field>
        <Field label="Notas de portfólio" hint="Links extras, vídeo, release ou onde ver o trabalho.">
          <textarea value={draft.portfolio} onChange={(event) => set("portfolio", event.target.value)} className={`${fieldClass} min-h-24`} maxLength={1200} />
        </Field>
        <PrimaryButton onClick={save} disabled={busy}>
          Salvar na conta
        </PrimaryButton>
      </section>

      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="font-semibold">Antes de enviar</h2>
        <ul className="mt-3 space-y-2">
          {curriculum.checks.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <Icon name={item.ok ? "check" : "triangle"} className={`h-4 w-4 ${item.ok ? "text-emerald-400" : "text-rosa"}`} />
              <span className={item.ok ? "" : "text-muted"}>{item.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Eyebrow>Texto para colar no formulário</Eyebrow>
            <h2 className="mt-1 text-2xl font-semibold">Prévia</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <GhostButton onClick={() => copy("mini", curriculum.mini)}>{copied === "mini" ? "Copiado" : "Copiar mini"}</GhostButton>
            <GhostButton onClick={() => copy("full", curriculum.full)}>{copied === "full" ? "Copiado" : "Copiar completo"}</GhostButton>
            <PrimaryButton onClick={download}>Baixar PDF</PrimaryButton>
          </div>
        </div>
        <Count text={curriculum.mini} limit={MINI_LIMIT} label="Mini currículo" />
        <Count text={curriculum.full} limit={FULL_LIMIT} label="Currículo completo" />
        {curriculum.sections.map((section) => (
          <article key={section.id} className="rounded-3xl border border-line bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">{section.title}</h3>
              <button type="button" onClick={() => copy(section.id, section.body)} className="text-xs font-semibold text-rosa">
                {copied === section.id ? "Copiado" : "Copiar"}
              </button>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{section.body}</p>
          </article>
        ))}
        <Notice>
          CPF, dados bancários e documentos de identidade ficam no formulário do edital. Este currículo não guarda esses dados e não envia o texto para fora da Cultura Conecta.
        </Notice>
      </section>
    </div>
  );
}

function Count({ text, limit, label }: { text: string; limit: number; label: string }) {
  const over = text.length > limit;
  return (
    <p className={`text-sm ${over ? "font-semibold text-rosa" : "text-muted"}`}>
      {label}: {text.length} / {limit}
      {over ? ". Passe do limite comum dos editais. Enxugue o texto antes de colar." : "."}
    </p>
  );
}
