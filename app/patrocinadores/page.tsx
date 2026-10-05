"use client";

import { useSocial } from "@/components/SocialContext";

export default function PatrocinadoresPage() {
  const { state } = useSocial();
  if (!state) return null;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Parceiros</h1>
        <p className="mt-1 text-sm text-muted">Quem apoia a cultura da região. Parceria aqui não é anúncio escondido.</p>
      </div>
      <div className="space-y-3">
        {state.sponsors.map((sponsor) => (
          <article key={sponsor.id} className="flex gap-3 rounded-3xl border border-line bg-card p-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-rosa to-azul font-semibold text-white">
              {sponsor.name.slice(0, 1)}
            </div>
            <div>
              <h2 className="font-semibold">{sponsor.name}</h2>
              <p className="text-sm text-azul">{sponsor.category}</p>
              <p className="mt-1 text-sm leading-6 text-muted">{sponsor.description}</p>
              <p className="mt-2 text-xs text-muted">{sponsor.projectsSupported} projetos apoiados</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
