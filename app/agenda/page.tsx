"use client";

import Link from "next/link";
import { useState } from "react";
import { EventResults, RegisterResultForm } from "@/components/Conquistas";
import { Icon } from "@/components/Icon";
import { useSocial } from "@/components/SocialContext";
import { Avatar, Eyebrow, Field, fieldClass, PrimaryButton } from "@/components/ui";
import { TRIANGLE, userByHandle } from "@/lib/format";

const DAY = 24 * 60 * 60 * 1000;

export default function AgendaPage() {
  const { state, act, busy } = useSocial();
  const [creating, setCreating] = useState(false);
  const [resultFor, setResultFor] = useState<string | null>(null);
  if (!state?.me) return null;
  const me = state.me.handle;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Agenda</Eyebrow>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Onde a cena acontece</h1>
          <p className="mt-1 text-sm text-muted">Shows, batalhas, slams e festivais. Confirme presença e veja quem vai.</p>
        </div>
        <PrimaryButton onClick={() => setCreating((value) => !value)}>
          <Icon name={creating ? "x" : "plus"} className="h-4 w-4" /> {creating ? "Fechar" : "Criar evento"}
        </PrimaryButton>
      </header>

      {creating && <CreateEvent onDone={() => setCreating(false)} />}

      <div className="space-y-4">
        {state.events.map((event) => {
          const going = state.rsvps.filter((item) => item.eventId === event.id);
          const amGoing = going.some((item) => item.userHandle === me);
          const creator = event.createdBy ? userByHandle(state, event.createdBy) : undefined;
          return (
            <article key={event.id} className="rounded-3xl border border-line bg-card p-5">
              <div className="flex items-start gap-4">
                <div className="grid h-16 w-[72px] shrink-0 place-items-center bg-gradient-to-br from-rosa to-azul pt-5 text-center text-white" style={{ clipPath: TRIANGLE }}>
                  <span className="text-[10px] font-semibold uppercase leading-3">{event.date.split(/[ ,·]/)[0]}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-azul">{event.category}</span>
                    <span className={event.free ? "text-muted" : "font-semibold text-rosa"}>{event.free ? "Gratuito" : event.price}</span>
                  </div>
                  <h2 className="mt-1 text-lg font-semibold leading-snug">{event.title}</h2>
                  <p className="text-sm text-muted">{event.date}</p>
                  <p className="flex items-center gap-1 text-sm text-muted">
                    <Icon name="pin" className="h-3.5 w-3.5" /> {event.location}
                  </p>
                </div>
              </div>
              {event.description && <p className="mt-3 text-sm leading-6">{event.description}</p>}
              {event.artistHandles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {event.artistHandles.map((handle) => {
                    const artist = userByHandle(state, handle);
                    return (
                      <Link key={handle} href={`/perfil/${handle}`} className="inline-flex items-center gap-1.5 rounded-full border border-line py-1 pl-1 pr-3 text-sm">
                        <Avatar user={artist} size="xs" />
                        {artist?.name ?? handle}
                      </Link>
                    );
                  })}
                </div>
              )}
              {creator && <p className="mt-2 text-xs text-muted">Organizado por {creator.name}</p>}
              <EventResults state={state} eventId={event.id} />
              {event.createdBy === me && (!event.startsAt || new Date(event.startsAt).getTime() <= Date.now() + DAY) && (
                resultFor === event.id ? (
                  <RegisterResultForm state={state} eventId={event.id} onDone={() => setResultFor(null)} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setResultFor(event.id)}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-rosa"
                  >
                    <Icon name="trophy" className="h-4 w-4" /> Registrar resultados e participações
                  </button>
                )
              )}
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-line/60 pt-4">
                <div className="flex items-center">
                  <div className="flex -space-x-2">
                    {going.slice(0, 5).map((item) => (
                      <Avatar key={item.userHandle} user={userByHandle(state, item.userHandle)} size="xs" />
                    ))}
                  </div>
                  <span className="ml-3 text-xs text-muted">
                    {going.length} {going.length === 1 ? "confirmado" : "confirmados"}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act({ action: "rsvp", eventId: event.id }).catch(() => undefined)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    amGoing ? "bg-gradient-to-r from-rosa to-azul text-white" : "border border-line hover:border-rosa/60"
                  }`}
                >
                  {amGoing ? "Vou" : "Confirmar presença"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function CreateEvent({ onDone }: { onDone: () => void }) {
  const { state, act, busy, fail } = useSocial();
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("Show");
  const [free, setFree] = useState(true);
  const [price, setPrice] = useState("");
  const [lineup, setLineup] = useState("");
  const [description, setDescription] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!startsAt) {
      fail("Informe data e hora do evento.");
      return;
    }
    try {
      await act({
        action: "createEvent",
        title,
        startsAt: new Date(startsAt).toISOString(),
        location,
        category,
        free,
        price,
        description,
        lineup: lineup.split(",").map((item) => item.trim().replace(/^@/, "")).filter(Boolean),
      });
      onDone();
    } catch {
      /* aviso global */
    }
  }

  return (
    <form onSubmit={submit} className="cc-pop space-y-3 rounded-3xl border border-rosa/40 bg-card p-5">
      <p className="font-semibold">Novo evento</p>
      <Field label="Nome do evento">
        <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} className={fieldClass} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Data e hora">
          <input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className={fieldClass} />
        </Field>
        <Field label="Tipo">
          <input value={category} onChange={(event) => setCategory(event.target.value)} maxLength={30} list="cc-event-types" className={fieldClass} />
          <datalist id="cc-event-types">
            {["Show", "Batalha", "Slam", "Festival", "Oficina", "Exposição", "Festa"].map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </Field>
      </div>
      <Field label="Local">
        <input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={60} className={fieldClass} placeholder="Espaço, bairro, cidade" />
      </Field>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={free} onChange={(event) => setFree(event.target.checked)} /> Gratuito
        </label>
        {!free && (
          <input value={price} onChange={(event) => setPrice(event.target.value)} maxLength={30} placeholder="Valor, ex.: R$ 20" className={`${fieldClass} max-w-44`} />
        )}
      </div>
      <Field label="Line-up" hint="@ dos artistas, separados por vírgula. Eles recebem um aviso.">
        <input value={lineup} onChange={(event) => setLineup(event.target.value)} list="cc-lineup" className={fieldClass} placeholder="mckalil, djrima" />
        <datalist id="cc-lineup">
          {state?.users.filter((user) => user.role === "member").map((user) => (
            <option key={user.handle} value={user.handle}>
              {user.name}
            </option>
          ))}
        </datalist>
      </Field>
      <Field label="Descrição">
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={3} className={fieldClass} />
      </Field>
      <div className="flex justify-end">
        <PrimaryButton type="submit" disabled={busy}>
          Publicar na agenda
        </PrimaryButton>
      </div>
    </form>
  );
}
