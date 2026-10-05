"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";
import { useSocial } from "@/components/SocialContext";
import { Field, fieldClass, Logo, PrimaryButton } from "@/components/ui";
import { ACCOUNT_KINDS } from "@/lib/policy";
import type { AccountKind } from "@/lib/types";

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: "triangle", title: "Prismas", text: "Histórias de 24 horas em triângulo, com resposta direta na mensagem." },
  { icon: "briefcase", title: "Mural de oportunidades", text: "Shows, editais, gravações e patrocínios com candidatura em um toque." },
  { icon: "wave", title: "Sintonia", text: "Mostra o quanto você combina com cada artista, produtora e vaga." },
  { icon: "trophy", title: "Conquistas e trajetória", text: "Batalhas, títulos, shows e juris viram selos, confirmados por quem organizou." },
  { icon: "headphones", title: "Jam", text: "Cole um link do Spotify ou do YouTube e ouça junto com quem quiser entrar." },
  { icon: "users", title: "Feat", text: "Publicações assinadas a quatro mãos, como na música." },
  { icon: "palette", title: "Vitrine com a sua cara", text: "Suas cores, sua forma, sua capa e sua foto de fundo." },
  { icon: "crown", title: "Ranking da cena", text: "Pontos por nicho: MC, DJ, breaking, graffiti, slam, beatbox e mais." },
  { icon: "doc", title: "Kit de imprensa", text: "Seu perfil vira um PDF profissional para mandar a contratantes." },
  { icon: "map", title: "Currículo para editais", text: "Lê o Mapa Cultural e monta o texto da inscrição com a sua trajetória." },
];

const DEMOS = [
  { handle: "mckalil", password: "cultura123", label: "MC Kalil · artista" },
  { handle: "valecultural", password: "cultura123", label: "Vale Cultural · produtora" },
  { handle: "rimaforte", password: "cultura123", label: "Rima Forte · estúdio" },
  { handle: "equipe", password: "modera123", label: "Equipe · moderação" },
];

const FLOATERS = [
  { left: "6%", top: "14%", size: 90, delay: 0, r: 8, o: 0.35 },
  { left: "78%", top: "8%", size: 140, delay: -3, r: -12, o: 0.25 },
  { left: "88%", top: "62%", size: 70, delay: -6, r: 20, o: 0.4 },
  { left: "42%", top: "82%", size: 110, delay: -2, r: -6, o: 0.2 },
  { left: "18%", top: "70%", size: 54, delay: -5, r: 30, o: 0.45 },
  { left: "58%", top: "20%", size: 40, delay: -8, r: -24, o: 0.5 },
];

export default function EntrarPage() {
  const { auth, busy, state } = useSocial();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "criar">("login");
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AccountKind>("artista");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [acceptedRules, setAcceptedRules] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      if (mode === "login") await auth({ action: "login", handle, password });
      else await auth({ action: "register", handle, password, name, kind, ageConfirmed, acceptedRules });
      router.replace(mode === "criar" ? "/personalizar#vitrine" : "/");
    } catch {
      /* aviso global */
    }
  }

  const stats = state?.stats;

  return (
    <div className="relative min-h-dvh overflow-hidden">
      {FLOATERS.map((item, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="pointer-events-none absolute bg-gradient-to-br from-rosa to-azul"
          style={
            {
              left: item.left,
              top: item.top,
              width: item.size,
              height: item.size * 0.88,
              opacity: item.o,
              clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
              animation: `cc-float ${9 + index}s ease-in-out ${item.delay}s infinite`,
              "--r": `${item.r}deg`,
            } as React.CSSProperties
          }
        />
      ))}

      <div className="relative mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <section>
          <Logo />
          <h1 className="mt-10 text-4xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
            A vitrine profissional de quem <span className="text-gradient">faz cultura</span>.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
            Artistas, produtoras, estúdios, espaços e marcas no mesmo palco. Divulgue seu trabalho, encontre
            oportunidades e feche parcerias, no computador ou no celular.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {FEATURES.map((item) => (
              <li key={item.title} className="flex gap-3 rounded-2xl border border-line bg-card p-3">
                <span className="mt-0.5 text-rosa">
                  <Icon name={item.icon} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{item.title}</span>
                  <span className="block text-xs leading-5 text-muted">{item.text}</span>
                </span>
              </li>
            ))}
          </ul>
          {stats && (
            <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 font-mono text-sm">
              <Stat label="perfis" value={stats.users} />
              <Stat label="publicações" value={stats.posts} />
              <Stat label="oportunidades abertas" value={stats.opportunities} />
              <Stat label="Prismas no ar" value={stats.stories} />
            </dl>
          )}
        </section>

        <section className="rounded-[2rem] border border-line bg-card p-6 shadow-2xl sm:p-8">
          <div className="flex rounded-full border border-line bg-ink/40 p-1">
            {(["login", "criar"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
                  mode === item ? "bg-paper text-ink" : "text-muted"
                }`}
              >
                {item === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "criar" && (
              <>
                <div>
                  <p className="mb-2 text-sm font-medium text-muted">Você chega como</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {ACCOUNT_KINDS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setKind(item.id)}
                        aria-pressed={kind === item.id}
                        className={`rounded-2xl border px-3 py-2.5 text-left transition ${
                          kind === item.id ? "border-rosa bg-rosa/10" : "border-line hover:border-rosa/50"
                        }`}
                      >
                        <span className="block text-sm font-semibold">{item.label}</span>
                        <span className="block text-[11px] leading-4 text-muted">{item.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <Field label="Nome artístico ou da marca">
                  <input value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} autoComplete="name" />
                </Field>
              </>
            )}
            <Field label="Seu @">
              <input
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
                className={fieldClass}
                autoCapitalize="none"
                autoComplete="username"
                placeholder="ex.: mckalil"
              />
            </Field>
            <Field label="Senha" hint={mode === "criar" ? "Pelo menos 8 caracteres." : undefined}>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={fieldClass}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </Field>
            {mode === "criar" && (
              <div className="space-y-2 text-sm">
                <label className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" checked={ageConfirmed} onChange={(event) => setAgeConfirmed(event.target.checked)} />
                  Confirmo que tenho 16 anos ou mais.
                </label>
                <label className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" checked={acceptedRules} onChange={(event) => setAcceptedRules(event.target.checked)} />
                  <span>
                    Li e aceito as{" "}
                    <Link href="/regras" className="text-rosa">
                      regras
                    </Link>
                    , os{" "}
                    <Link href="/termos" className="text-rosa">
                      termos
                    </Link>{" "}
                    e a{" "}
                    <Link href="/privacidade" className="text-rosa">
                      privacidade
                    </Link>
                    .
                  </span>
                </label>
              </div>
            )}
            <PrimaryButton type="submit" disabled={busy} className="w-full py-3">
              {mode === "login" ? "Entrar na cena" : "Criar minha vitrine"}
            </PrimaryButton>
          </form>

          {mode === "login" && (
            <div className="mt-6 border-t border-line pt-5">
              <p className="text-sm font-semibold">Testar com uma conta de demonstração</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {DEMOS.map((demo) => (
                  <button
                    key={demo.handle}
                    type="button"
                    onClick={() => {
                      setHandle(demo.handle);
                      setPassword(demo.password);
                    }}
                    className="rounded-full border border-line px-3 py-1.5 text-xs hover:border-rosa/60"
                  >
                    {demo.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">Toque em uma conta e depois em Entrar na cena.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-muted">{label}</dt>
      <dd className="text-2xl font-semibold text-paper">{value}</dd>
    </div>
  );
}
