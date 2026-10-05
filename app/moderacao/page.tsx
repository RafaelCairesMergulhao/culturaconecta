"use client";

import Link from "next/link";
import { REPORT_REASONS } from "@/lib/policy";
import { useSocial } from "@/components/SocialContext";
import { Notice, PrimaryButton } from "@/components/ui";
import { timeAgo } from "@/lib/format";

const TARGET_LABELS: Record<string, string> = {
  post: "Publicação",
  comment: "Comentário",
  message: "Mensagem",
  user: "Conta",
  story: "Prisma",
  opportunity: "Oportunidade",
};

export default function ModeracaoPage() {
  const { state, act, busy } = useSocial();
  if (!state) return null;
  if (!state.me) {
    return (
      <Notice>
        <Link href="/entrar" className="font-semibold text-azul">
          Entre
        </Link>{" "}
        para acompanhar denúncias.
      </Notice>
    );
  }

  const moderator = state.me.role === "moderator";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{moderator ? "Fila da equipe" : "Suas denúncias"}</h1>
      <p className="text-sm text-muted">
        {moderator
          ? "Ocultar tira o conteúdo do ar ou limita a conta. Manter devolve o que tinha sido ocultado."
          : "Cada denúncia fica registrada. A equipe decide se oculta ou mantém."}
      </p>
      {state.reports.length === 0 && <Notice>Nenhuma denúncia por aqui.</Notice>}
      <ul className="space-y-3">
        {state.reports.map((report) => {
          const reason = REPORT_REASONS.find((item) => item.id === report.reason)?.label ?? report.reason;
          return (
            <li key={report.id} className="rounded-3xl border border-line bg-card p-4">
              <p className="text-sm text-muted">
                {reason} · {report.status} · {timeAgo(report.createdAt)}
              </p>
              <p className="mt-2 font-medium">{report.snapshot}</p>
              {report.details && <p className="mt-1 text-sm text-muted">{report.details}</p>}
              <p className="mt-1 text-xs text-muted">
                {TARGET_LABELS[report.targetType] ?? report.targetType} · {report.targetId}
              </p>
              {moderator && (
                <div className="mt-3 flex gap-2">
                  <PrimaryButton disabled={busy} onClick={() => act({ action: "moderate", reportId: report.id, decision: "oculta" }).catch(() => undefined)}>
                    Ocultar
                  </PrimaryButton>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act({ action: "moderate", reportId: report.id, decision: "mantida" }).catch(() => undefined)}
                    className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
                  >
                    Manter
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
