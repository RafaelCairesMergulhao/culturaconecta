"use client";

import { ConquistasPanel, SceneRanking } from "@/components/Conquistas";
import { useSocial } from "@/components/SocialContext";
import { Eyebrow } from "@/components/ui";

export default function ConquistasPage() {
  const { state } = useSocial();
  if (!state?.me) return null;
  return (
    <div className="space-y-8">
      <header>
        <Eyebrow>Sua trajetória</Eyebrow>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Conquistas</h1>
        <p className="mt-1 text-sm text-muted">
          Batalhas, títulos, shows, juris e eventos que você realizou. Cada participação desbloqueia um selo.
        </p>
      </header>
      <ConquistasPanel state={state} user={state.me} mine />
      <SceneRanking state={state} />
    </div>
  );
}
