"use client";

import { useState } from "react";
import { REPORT_REASONS } from "@/lib/policy";
import type { ReportReason, ReportTarget } from "@/lib/types";
import { useSocial } from "./SocialContext";
import { fieldClass, PrimaryButton } from "./ui";

export function ReportDialog({
  open,
  title,
  targetType,
  targetId,
  onClose,
}: {
  open: boolean;
  title: string;
  targetType: ReportTarget;
  targetId: string;
  onClose: () => void;
}) {
  const { act, busy, state } = useSocial();
  const [reason, setReason] = useState<ReportReason>("assedio");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState(false);

  if (!open) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await act({ action: "report", targetType, targetId, reason, details });
      setDone(true);
    } catch {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-line bg-card p-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        {done ? (
          <>
            <p className="mt-3 text-sm leading-6 text-muted">
              Denúncia recebida. A equipe analisa e pode ocultar o conteúdo. Você não precisa publicar de novo o que aconteceu.
            </p>
            <button type="button" onClick={onClose} className="mt-4 text-sm font-semibold text-azul">
              Fechar
            </button>
          </>
        ) : state?.me ? (
          <>
            <label className="mt-4 block text-sm text-muted">
              Motivo
              <select
                value={reason}
                onChange={(event) => setReason(event.target.value as ReportReason)}
                className={`${fieldClass} mt-1`}
              >
                {REPORT_REASONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm text-muted">
              Detalhe opcional
              <textarea
                value={details}
                maxLength={300}
                rows={3}
                onChange={(event) => setDetails(event.target.value)}
                className={`${fieldClass} mt-1`}
              />
            </label>
            <div className="mt-4 flex gap-3">
              <PrimaryButton type="submit" disabled={busy}>
                Enviar denúncia
              </PrimaryButton>
              <button type="button" onClick={onClose} className="text-sm text-muted">
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted">Entre na sua conta para denunciar.</p>
            <a href="/entrar" className="mt-3 inline-block text-sm font-semibold text-azul">
              Entrar
            </a>
          </>
        )}
      </form>
    </div>
  );
}
