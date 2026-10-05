"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { ReportDialog } from "@/components/ReportDialog";
import { useSocial } from "@/components/SocialContext";
import { Avatar, Eyebrow, Field, fieldClass, GhostButton, KindBadge, Meter, Notice, Pill, PrimaryButton } from "@/components/ui";
import { opportunityMatch, sintonia, timeAgo, userByHandle } from "@/lib/format";
import { OPPORTUNITY_TYPES, opportunityLabel } from "@/lib/policy";
import type { ClientState, Opportunity, OpportunityType } from "@/lib/types";

export default function OportunidadesPage() {
  const { state } = useSocial();
  const [filter, setFilter] = useState<OpportunityType | "todas" | "minhas">("todas");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const timer = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    return () => window.clearTimeout(timer);
  }, []);

  if (!state?.me) return null;
  const me = state.me.handle;
  const list = state.opportunities
    .filter((item) => !item.hidden)
    .filter((item) => {
      if (filter === "todas") return item.open || item.authorHandle === me;
      if (filter === "minhas") return item.authorHandle === me || state.applications.some((app) => app.opportunityId === item.id && app.applicantHandle === me);
      return item.type === filter && item.open;
    })
    .sort((a, b) => {
      const byMatch = opportunityMatch(state, b, me) - opportunityMatch(state, a, me);
      return byMatch || b.createdAt.localeCompare(a.createdAt);
    });

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Mural</Eyebrow>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Oportunidades</h1>
          <p className="mt-1 text-sm text-muted">Shows, editais, gravações e patrocínios. Ordenado pelo que combina com você.</p>
        </div>
        <PrimaryButton onClick={() => setCreating((value) => !value)}>
          <Icon name={creating ? "x" : "plus"} className="h-4 w-4" /> {creating ? "Fechar" : "Publicar oportunidade"}
        </PrimaryButton>
      </header>

      {creating && <CreateOpportunity onDone={() => setCreating(false)} />}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
        <Pill active={filter === "todas"} onClick={() => setFilter("todas")}>
          Todas
        </Pill>
        <Pill active={filter === "minhas"} onClick={() => setFilter("minhas")}>
          Minhas
        </Pill>
        {OPPORTUNITY_TYPES.map((item) => (
          <Pill key={item.id} active={filter === item.id} onClick={() => setFilter(item.id)}>
            {item.label}
          </Pill>
        ))}
      </div>

      {list.length === 0 && <Notice>Nada por aqui ainda. Publique a primeira oportunidade desse tipo.</Notice>}
      <div className="space-y-4">
        {list.map((item) => (
          <OpportunityCard key={item.id} state={state} item={item} />
        ))}
      </div>
    </div>
  );
}

function OpportunityCard({ state, item }: { state: ClientState; item: Opportunity }) {
  const { act, busy } = useSocial();
  const [applying, setApplying] = useState(false);
  const [pitch, setPitch] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const me = state.me!.handle;
  const author = userByHandle(state, item.authorHandle);
  const mine = item.authorHandle === me;
  const match = opportunityMatch(state, item, me);
  const myApp = state.applications.find((app) => app.opportunityId === item.id && app.applicantHandle === me);
  const apps = state.applications.filter((app) => app.opportunityId === item.id);

  async function apply(event: React.FormEvent) {
    event.preventDefault();
    try {
      await act({ action: "apply", opportunityId: item.id, pitch });
      setApplying(false);
      setPitch("");
    } catch {
      /* aviso global */
    }
  }

  return (
    <article id={item.id} className="scroll-mt-24 rounded-3xl border border-line bg-card p-5 target:border-rosa">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-rosa/15 px-2.5 py-0.5 text-xs font-semibold text-rosa">{opportunityLabel(item.type)}</span>
            {!item.open && <span className="rounded-full bg-ink/50 px-2.5 py-0.5 text-xs text-muted">Encerrada</span>}
            <span className="text-xs text-muted">{timeAgo(item.createdAt)}</span>
          </div>
          <h2 className="mt-2 text-xl font-semibold leading-snug">{item.title}</h2>
        </div>
        {!mine && (
          <div className="shrink-0 text-right">
            <p className="text-2xl font-semibold text-gradient">{match}%</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">com você</p>
          </div>
        )}
      </div>

      <Link href={`/perfil/${item.authorHandle}`} className="mt-3 inline-flex items-center gap-2 text-sm">
        <Avatar user={author} size="xs" />
        <span className="font-medium">{author?.name ?? item.authorHandle}</span>
        {author && <KindBadge kind={author.kind} />}
      </Link>

      <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7">{item.description}</p>
      {item.type === "edital" && (
        <Link href="/editais" className="mt-3 inline-flex text-sm font-semibold text-rosa">
          Montar currículo artístico para este edital
        </Link>
      )}

      <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <Info label="Cachê" value={item.fee || "A combinar"} />
        <Info label="Quando" value={item.date || "A definir"} />
        <Info label="Onde" value={item.city || "A definir"} />
      </dl>

      {item.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-line px-2.5 py-0.5 text-xs">
              {tag}
            </span>
          ))}
        </div>
      )}

      {!mine && (
        <div className="mt-4 border-t border-line/60 pt-4">
          {myApp ? (
            <p className="flex items-center gap-2 text-sm">
              <Icon name="check" className="h-4 w-4 text-rosa" />
              Candidatura {myApp.status === "enviada" ? "enviada. Aguarde o retorno." : myApp.status === "selecionada" ? "selecionada! Confira suas mensagens." : "não seguiu desta vez."}
            </p>
          ) : applying ? (
            <form onSubmit={apply} className="space-y-2">
              <textarea
                value={pitch}
                onChange={(event) => setPitch(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Em poucas linhas: por que você é a escolha certa? Inclua um link na sua vitrine."
                className={fieldClass}
              />
              <div className="flex gap-2">
                <PrimaryButton type="submit" disabled={busy || !pitch.trim()}>
                  Enviar candidatura
                </PrimaryButton>
                <GhostButton onClick={() => setApplying(false)}>Cancelar</GhostButton>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <PrimaryButton onClick={() => setApplying(true)} disabled={!item.open}>
                Quero participar
              </PrimaryButton>
              <button type="button" onClick={() => setReportOpen(true)} className="ml-auto p-2 text-muted hover:text-paper" title="Denunciar">
                <Icon name="flag" className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {mine && (
        <div className="mt-4 space-y-3 border-t border-line/60 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              {apps.length} {apps.length === 1 ? "candidatura" : "candidaturas"}
            </p>
            <GhostButton onClick={() => act({ action: "toggleOpportunity", opportunityId: item.id }).catch(() => undefined)}>
              {item.open ? "Encerrar" : "Reabrir"}
            </GhostButton>
          </div>
          {apps.map((app) => {
            const applicant = userByHandle(state, app.applicantHandle);
            const tune = sintonia(state, me, app.applicantHandle).score;
            return (
              <div key={app.id} className="rounded-2xl border border-line bg-ink/30 p-3">
                <div className="flex items-center gap-3">
                  <Avatar user={applicant} size="sm" />
                  <Link href={`/perfil/${app.applicantHandle}`} className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{applicant?.name ?? app.applicantHandle}</span>
                    <span className="block text-xs text-muted">
                      Sintonia {tune}% · {timeAgo(app.createdAt)}
                    </span>
                  </Link>
                  <span className="text-xs capitalize text-muted">{app.status}</span>
                </div>
                <div className="mt-2">
                  <Meter value={tune} />
                </div>
                <p className="mt-2 text-sm leading-6">{app.pitch}</p>
                {app.status === "enviada" && (
                  <div className="mt-2 flex gap-2">
                    <PrimaryButton onClick={() => act({ action: "decideApplication", applicationId: app.id, status: "selecionada" }).catch(() => undefined)}>
                      Selecionar
                    </PrimaryButton>
                    <GhostButton onClick={() => act({ action: "decideApplication", applicationId: app.id, status: "recusada" }).catch(() => undefined)}>
                      Recusar
                    </GhostButton>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <ReportDialog open={reportOpen} title="Denunciar oportunidade" targetType="opportunity" targetId={item.id} onClose={() => setReportOpen(false)} />
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-ink/30 px-3 py-2">
      <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}

function CreateOpportunity({ onDone }: { onDone: () => void }) {
  const { act, busy } = useSocial();
  const [type, setType] = useState<OpportunityType>("show");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [date, setDate] = useState("");
  const [fee, setFee] = useState("");
  const [tags, setTags] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await act({
        action: "opportunity",
        type,
        title,
        description,
        city,
        date,
        fee,
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      });
      onDone();
    } catch {
      /* aviso global */
    }
  }

  return (
    <form onSubmit={submit} className="cc-pop space-y-3 rounded-3xl border border-rosa/40 bg-card p-5">
      <p className="font-semibold">Nova oportunidade</p>
      <Field label="Tipo">
        <select value={type} onChange={(event) => setType(event.target.value as OpportunityType)} className={fieldClass}>
          {OPPORTUNITY_TYPES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Título">
        <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} className={fieldClass} placeholder="ex.: Line-up de sábado no centro" />
      </Field>
      <Field label="Descrição" hint="O que você procura, como funciona e o que a pessoa precisa mandar.">
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={4} className={fieldClass} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Cachê">
          <input value={fee} onChange={(event) => setFee(event.target.value)} maxLength={60} className={fieldClass} placeholder="R$ 500" />
        </Field>
        <Field label="Quando">
          <input value={date} onChange={(event) => setDate(event.target.value)} maxLength={60} className={fieldClass} placeholder="12 out" />
        </Field>
        <Field label="Cidade">
          <input value={city} onChange={(event) => setCity(event.target.value)} maxLength={60} className={fieldClass} placeholder="Vitória, ES" />
        </Field>
      </div>
      <Field label="Especialidades procuradas" hint="Separe por vírgula. Elas calculam o quanto cada artista combina com a vaga.">
        <input value={tags} onChange={(event) => setTags(event.target.value)} className={fieldClass} placeholder="MC, DJ, Breaking" />
      </Field>
      <div className="flex justify-end">
        <PrimaryButton type="submit" disabled={busy}>
          Publicar no mural
        </PrimaryButton>
      </div>
    </form>
  );
}
