"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ClientState } from "@/lib/types";

type SocialContextValue = {
  ready: boolean;
  state: ClientState | null;
  error: string | null;
  busy: boolean;
  clearError: () => void;
  fail: (message: string) => void;
  reload: () => Promise<void>;
  auth: (body: Record<string, unknown>) => Promise<void>;
  act: (body: Record<string, unknown>) => Promise<void>;
};

const SocialContext = createContext<SocialContextValue | null>(null);

async function postJson(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { state?: ClientState; error?: string };
  if (!res.ok || !data.state) throw new Error(data.error || "Não foi possível concluir.");
  return data.state;
}

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ClientState | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (!res.ok) throw new Error("Não foi possível carregar a rede.");
    setState((await res.json()) as ClientState);
  }, []);

  useEffect(() => {
    let live = true;
    reload()
      .catch((reason: unknown) => {
        if (live) setError(reason instanceof Error ? reason.message : "Erro ao carregar.");
      })
      .finally(() => {
        if (live) setReady(true);
      });
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") reload().catch(() => undefined);
    }, 20000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [reload]);

  const send = useCallback(async (url: string, body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      setState(await postJson(url, body));
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Erro inesperado.";
      setError(message);
      throw new Error(message);
    } finally {
      setBusy(false);
    }
  }, []);

  const value = useMemo<SocialContextValue>(
    () => ({
      ready,
      state,
      error,
      busy,
      clearError: () => setError(null),
      fail: (message) => setError(message),
      reload,
      auth: (body) => send("/api/auth", body),
      act: (body) => send("/api/act", body),
    }),
    [ready, state, error, busy, reload, send]
  );

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const value = useContext(SocialContext);
  if (!value) throw new Error("A rede ainda não está disponível nesta tela.");
  return value;
}
