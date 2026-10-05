"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { useSocial } from "@/components/SocialContext";
import { Avatar, Eyebrow, Field, fieldClass, GhostButton, Pill, PrimaryButton } from "@/components/ui";
import { mediaUrl, SHAPE_CLIP } from "@/lib/format";
import { uploadImage } from "@/lib/image";
import { ACCENT_PRESETS, ACCOUNT_KINDS, DEFAULT_PREFS, SHAPES } from "@/lib/policy";
import { applyPrefs } from "@/lib/prefs";
import { NICHES } from "@/lib/achievements";
import type { AccountKind, Niche, Prefs, ProfileLink, PublicUser } from "@/lib/types";

type Tab = "aparencia" | "vitrine" | "conta";

export default function PersonalizarPage() {
  const { state } = useSocial();
  const [tab, setTab] = useState<Tab>("aparencia");

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "vitrine" || hash === "conta" || hash === "aparencia") setTab(hash);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  if (!state?.me) return null;

  return (
    <div className="space-y-6">
      <header>
        <Eyebrow>Personalizar</Eyebrow>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Deixe a rede com a sua cara</h1>
        <p className="mt-1 text-sm text-muted">Tudo muda na hora. Salve para levar para qualquer aparelho em que você entrar.</p>
      </header>
      <div className="flex gap-2">
        <Pill active={tab === "aparencia"} onClick={() => setTab("aparencia")}>
          Aparência
        </Pill>
        <Pill active={tab === "vitrine"} onClick={() => setTab("vitrine")}>
          Vitrine
        </Pill>
        <Pill active={tab === "conta"} onClick={() => setTab("conta")}>
          Conta
        </Pill>
      </div>
      {tab === "aparencia" && <Appearance key={state.me.id} />}
      {tab === "vitrine" && <Showcase key={state.me.id} user={state.me} />}
      {tab === "conta" && <Account />}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-card p-5">
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Appearance() {
  const { state, act, busy, fail } = useSocial();
  const saved = state!.me!.prefs;
  const savedRef = useRef(saved);
  const [draft, setDraft] = useState<Prefs>(saved);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);

  useEffect(() => {
    applyPrefs(draft);
  }, [draft]);

  useEffect(() => () => applyPrefs(savedRef.current), []);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const set = (patch: Partial<Prefs>) => {
    setDone(false);
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  async function pickBackground(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { id } = await uploadImage(file, 2400);
      set({ backgroundId: id });
    } catch (reason) {
      fail(reason instanceof Error ? reason.message : "Não foi possível enviar a foto.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    try {
      await act({ action: "updatePrefs", prefs: draft });
      setDone(true);
    } catch {
      /* aviso global */
    }
  }

  const bg = mediaUrl(draft.backgroundId);

  return (
    <div className="space-y-4">
      <Section title="Foto de fundo do app" hint="Escolha uma imagem do celular ou do computador. Ela fica atrás de toda a rede.">
        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <div
            className="relative aspect-[9/16] w-full max-w-[200px] overflow-hidden rounded-3xl border border-line"
            style={{ background: bg ? undefined : "linear-gradient(160deg, var(--accent), var(--accent2))" }}
          >
            {bg && (
              <img
                src={bg}
                alt="Fundo escolhido"
                className="absolute inset-0 h-full w-full object-cover"
                style={{ filter: `blur(${draft.bgBlur / 2}px)`, transform: "scale(1.08)" }}
              />
            )}
            <div className="absolute inset-0" style={{ background: `color-mix(in srgb, var(--bg) ${bg ? draft.bgDim : 0}%, transparent)` }} />
            <div className="absolute inset-x-3 top-3 h-8 rounded-xl bg-card" />
            <div className="absolute inset-x-3 top-14 h-24 rounded-xl bg-card" />
            <div className="absolute bottom-3 left-3 h-8 w-20 rounded-full bg-gradient-to-r from-rosa to-azul" />
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickBackground} />
              <PrimaryButton onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Icon name="image" className="h-4 w-4" /> {uploading ? "Enviando..." : bg ? "Trocar foto" : "Escolher foto"}
              </PrimaryButton>
              {bg && <GhostButton onClick={() => set({ backgroundId: null })}>Remover</GhostButton>}
            </div>
            <Slider label="Escurecer a foto" value={draft.bgDim} min={0} max={90} unit="%" onChange={(bgDim) => set({ bgDim })} />
            <Slider label="Desfoque" value={draft.bgBlur} min={0} max={24} unit="px" onChange={(bgBlur) => set({ bgBlur })} />
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3 text-sm">
              <span>
                <span className="block font-medium">Cartões de vidro</span>
                <span className="text-xs text-muted">Deixa o fundo aparecer através dos cartões.</span>
              </span>
              <input type="checkbox" checked={draft.glass} onChange={(event) => set({ glass: event.target.checked })} className="h-5 w-5" />
            </label>
          </div>
        </div>
      </Section>

      <Section title="Cores" hint="As cores também vestem a sua vitrine quando alguém visita seu perfil.">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {ACCENT_PRESETS.map((preset) => {
            const on = draft.accent === preset.accent && draft.accent2 === preset.accent2;
            return (
              <button
                key={preset.name}
                type="button"
                aria-pressed={on}
                onClick={() => set({ accent: preset.accent, accent2: preset.accent2 })}
                className={`rounded-2xl border p-2 text-xs font-medium transition ${on ? "border-paper" : "border-line"}`}
              >
                <span
                  className="mx-auto mb-1 block h-10 w-11"
                  style={{ clipPath: SHAPE_CLIP.triangulo, background: `linear-gradient(135deg, ${preset.accent}, ${preset.accent2})` }}
                />
                {preset.name}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="color" value={draft.accent} onChange={(event) => set({ accent: event.target.value })} className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-transparent" />
            Cor principal
          </label>
          <label className="flex items-center gap-2">
            <input type="color" value={draft.accent2} onChange={(event) => set({ accent2: event.target.value })} className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-transparent" />
            Cor de apoio
          </label>
        </div>
      </Section>

      <Section title="Tema e leitura">
        <div className="flex flex-wrap gap-2">
          <Pill active={draft.theme === "dark"} onClick={() => set({ theme: "dark" })}>
            Escuro
          </Pill>
          <Pill active={draft.theme === "light"} onClick={() => set({ theme: "light" })}>
            Claro
          </Pill>
        </div>
        <div className="mt-4">
          <Slider label="Tamanho do texto" value={draft.fontScale} min={85} max={125} step={5} unit="%" onChange={(fontScale) => set({ fontScale })} />
        </div>
      </Section>

      <Section title="Formato do seu avatar" hint="Sua forma aparece em toda a rede: no feed, nos comentários e na vitrine.">
        <div className="grid grid-cols-4 gap-2">
          {SHAPES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={draft.shape === item.id}
              onClick={() => set({ shape: item.id })}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-3 text-xs font-medium ${
                draft.shape === item.id ? "border-paper" : "border-line"
              }`}
            >
              <Avatar user={{ ...state!.me!, prefs: draft }} size="lg" shape={item.id} />
              {item.label}
            </button>
          ))}
        </div>
      </Section>

      <div className="sticky bottom-24 z-10 flex flex-wrap items-center justify-end gap-2 rounded-3xl border border-line bg-ink/95 p-3 shadow-2xl backdrop-blur-xl md:bottom-4">
        <span className="mr-auto pl-2 text-sm text-muted">
          {done ? "Salvo. Vale para todos os seus aparelhos." : dirty ? "Alterações ainda não salvas." : "Tudo salvo."}
        </span>
        <GhostButton onClick={() => set({ ...DEFAULT_PREFS })}>Restaurar padrão</GhostButton>
        <GhostButton onClick={() => setDraft(saved)} disabled={!dirty}>
          Desfazer
        </GhostButton>
        <PrimaryButton onClick={save} disabled={busy || !dirty}>
          Salvar
        </PrimaryButton>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 flex justify-between">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-muted">
          {value}
          {unit}
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full" />
    </label>
  );
}

function Showcase({ user }: { user: PublicUser }) {
  const { act, busy, fail } = useSocial();
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio);
  const [kind, setKind] = useState<AccountKind>(user.kind);
  const [city, setCity] = useState(user.city);
  const [tags, setTags] = useState(user.tags.join(", "));
  const [available, setAvailable] = useState(user.available);
  const [niches, setNiches] = useState<Niche[]>(user.niches);
  const [links, setLinks] = useState<ProfileLink[]>(user.links.length ? user.links : [{ label: "", url: "" }]);
  const [avatarId, setAvatarId] = useState(user.avatarId);
  const [coverId, setCoverId] = useState(user.coverId);
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  async function pick(kindOfImage: "avatar" | "cover", event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(kindOfImage);
    try {
      const { id } = await uploadImage(file, kindOfImage === "avatar" ? 640 : 2000);
      if (kindOfImage === "avatar") setAvatarId(id);
      else setCoverId(id);
    } catch (reason) {
      fail(reason instanceof Error ? reason.message : "Não foi possível enviar a foto.");
    } finally {
      setUploading(null);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    try {
      await act({
        action: "updateProfile",
        name,
        bio,
        kind,
        city,
        available,
        niches,
        avatarId,
        coverId,
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        links: links.filter((link) => link.url.trim()),
      });
      router.push(`/perfil/${user.handle}`);
    } catch {
      /* aviso global */
    }
  }

  const cover = mediaUrl(coverId);

  return (
    <form onSubmit={save} className="space-y-4">
      <Section title="Foto e capa" hint="A capa aparece no topo da sua vitrine. A foto de perfil usa o formato que você escolheu.">
        <div
          className="relative h-36 overflow-hidden rounded-3xl"
          style={{ background: "linear-gradient(125deg, var(--accent), var(--accent2))" }}
        >
          {cover && <img src={cover} alt="Capa" className="absolute inset-0 h-full w-full object-cover" />}
          <div className="absolute bottom-3 left-3">
            <Avatar user={{ ...user, avatarId }} size="lg" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(event) => pick("avatar", event)} />
          <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(event) => pick("cover", event)} />
          <GhostButton onClick={() => avatarRef.current?.click()} disabled={!!uploading}>
            {uploading === "avatar" ? "Enviando..." : "Foto de perfil"}
          </GhostButton>
          <GhostButton onClick={() => coverRef.current?.click()} disabled={!!uploading}>
            {uploading === "cover" ? "Enviando..." : "Capa"}
          </GhostButton>
          {avatarId && (
            <button type="button" className="text-sm text-muted" onClick={() => setAvatarId(null)}>
              Tirar foto
            </button>
          )}
          {coverId && (
            <button type="button" className="text-sm text-muted" onClick={() => setCoverId(null)}>
              Tirar capa
            </button>
          )}
        </div>
      </Section>

      <Section title="Quem você é">
        <div className="space-y-3">
          <Field label="Nome">
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} className={fieldClass} />
          </Field>
          <Field label="Tipo de perfil">
            <select value={kind} onChange={(event) => setKind(event.target.value as AccountKind)} className={fieldClass} disabled={user.role === "moderator"}>
              {ACCOUNT_KINDS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} — {item.hint}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cidade">
            <input value={city} onChange={(event) => setCity(event.target.value)} maxLength={60} placeholder="ex.: Vitória, ES" className={fieldClass} />
          </Field>
          <Field label="Bio" hint={`${bio.length}/280`}>
            <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={280} rows={3} className={fieldClass} />
          </Field>
          <Field label="Especialidades" hint="Separe por vírgula. Elas alimentam a Sintonia e o Radar de oportunidades.">
            <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="MC, Breaking, Produção" className={fieldClass} />
          </Field>
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3 text-sm">
            <span>
              <span className="block font-medium">Aberto a propostas</span>
              <span className="text-xs text-muted">Mostra o selo na vitrine para contratantes.</span>
            </span>
            <input type="checkbox" checked={available} onChange={(event) => setAvailable(event.target.checked)} className="h-5 w-5" />
          </label>
        </div>
      </Section>

      <Section title="Seus nichos" hint="Até 6. Eles definem quais conquistas aparecem na sua vitrine e em qual ranking você entra.">
        <div className="flex flex-wrap gap-2">
          {NICHES.map((item) => {
            const active = niches.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                title={item.hint}
                onClick={() =>
                  setNiches((current) =>
                    active ? current.filter((niche) => niche !== item.id) : current.length >= 6 ? current : [...current, item.id]
                  )
                }
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition ${
                  active ? "border-transparent bg-gradient-to-r from-rosa to-azul font-semibold text-white" : "border-line hover:border-rosa/50"
                }`}
              >
                <Icon name={item.icon} className="h-3.5 w-3.5" /> {item.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Links" hint="Música, vídeo, portfólio. Até 5.">
        <div className="space-y-2">
          {links.map((link, index) => (
            <div key={index} className="flex gap-2">
              <input
                value={link.label}
                onChange={(event) => setLinks(links.map((item, i) => (i === index ? { ...item, label: event.target.value } : item)))}
                placeholder="Nome"
                maxLength={24}
                className={`${fieldClass} w-32 shrink-0`}
              />
              <input
                value={link.url}
                onChange={(event) => setLinks(links.map((item, i) => (i === index ? { ...item, url: event.target.value } : item)))}
                placeholder="https://"
                inputMode="url"
                className={fieldClass}
              />
              <button type="button" aria-label="Remover link" onClick={() => setLinks(links.filter((_, i) => i !== index))} className="px-2 text-muted">
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
          ))}
          {links.length < 5 && (
            <button type="button" onClick={() => setLinks([...links, { label: "", url: "" }])} className="text-sm font-semibold text-rosa">
              + Adicionar link
            </button>
          )}
        </div>
      </Section>

      <div className="flex justify-end">
        <PrimaryButton type="submit" disabled={busy || !!uploading}>
          Salvar vitrine
        </PrimaryButton>
      </div>
    </form>
  );
}

function Account() {
  const { auth, act } = useSocial();
  const router = useRouter();
  return (
    <div className="space-y-4">
      <Section title="Sessão">
        <GhostButton
          onClick={() =>
            auth({ action: "logout" })
              .then(() => router.replace("/entrar"))
              .catch(() => undefined)
          }
        >
          <Icon name="logout" className="h-4 w-4" /> Sair desta conta
        </GhostButton>
      </Section>
      <Section title="Encerrar conta" hint="Apaga seu @, publicações, Prismas, oportunidades, mensagens e imagens deste servidor.">
        <button
          type="button"
          className="rounded-full border border-rosa/50 px-4 py-2 text-sm font-semibold text-rosa"
          onClick={() => {
            if (!window.confirm("Encerrar a conta apaga tudo o que é seu neste servidor. Continuar?")) return;
            act({ action: "deleteAccount" })
              .then(() => router.replace("/entrar"))
              .catch(() => undefined);
          }}
        >
          Encerrar minha conta
        </button>
      </Section>
    </div>
  );
}
