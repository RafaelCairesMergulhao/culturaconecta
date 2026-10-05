"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ReportDialog } from "@/components/ReportDialog";
import { useSocial } from "@/components/SocialContext";
import { Avatar, fieldClass, Notice, PrimaryButton } from "@/components/ui";
import { isBlocked, timeAgo, userByHandle } from "@/lib/format";

export default function ConversaPage() {
  const params = useParams<{ handle: string }>();
  const handle = Array.isArray(params.handle) ? params.handle[0] : params.handle;
  const { state, act, busy } = useSocial();
  const [text, setText] = useState("");
  const [reportId, setReportId] = useState<string | null>(null);
  if (!state || !handle) return null;
  if (!state.me) return <Notice>Entre para enviar mensagens.</Notice>;
  const other = userByHandle(state, handle);
  if (!other) return <Notice>Essa conta não está na rede.</Notice>;
  const blocked = isBlocked(state, handle);
  const me = state.me.handle;
  const thread = state.messages
    .filter(
      (message) =>
        (message.fromHandle === me && message.toHandle === handle) ||
        (message.fromHandle === handle && message.toHandle === me)
    )
    .filter((message) => !message.hidden)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  async function send(event: React.FormEvent) {
    event.preventDefault();
    try {
      await act({ action: "message", handle, text });
      setText("");
    } catch {
      /* aviso global */
    }
  }

  return (
    <div className="space-y-4">
      <Link href="/mensagens" className="text-sm text-muted">
        Conversas
      </Link>
      <Link href={`/perfil/${handle}`} className="flex items-center gap-3">
        <Avatar user={other} size="md" />
        <span>
          <span className="block text-2xl font-semibold">{other.name}</span>
          <span className="text-sm text-muted">@{other.handle}</span>
        </span>
      </Link>
      {blocked && <Notice>Você bloqueou esta conta. Desbloqueie no perfil para voltar a conversar.</Notice>}
      <ul className="space-y-2">
        {thread.map((message) => {
          const own = message.fromHandle === me;
          return (
            <li key={message.id} className={`max-w-[85%] rounded-3xl px-4 py-3 ${own ? "ml-auto bg-gradient-to-br from-rosa to-azul text-white" : "bg-card border border-line"}`}>
              <p className="whitespace-pre-wrap leading-6">{message.text}</p>
              <div className="mt-1 flex items-center justify-between gap-3 text-xs opacity-80">
                <span>{timeAgo(message.createdAt)}</span>
                {!own && (
                  <button type="button" onClick={() => setReportId(message.id)}>
                    Denunciar
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {!blocked && !state.me.limited && (
        <form onSubmit={send} className="space-y-2">
          <textarea value={text} onChange={(event) => setText(event.target.value)} rows={3} maxLength={1000} className={fieldClass} placeholder="Escreva uma mensagem" />
          <PrimaryButton type="submit" disabled={busy || !text.trim()}>
            Enviar
          </PrimaryButton>
        </form>
      )}
      <ReportDialog open={Boolean(reportId)} title="Denunciar mensagem" targetType="message" targetId={reportId ?? ""} onClose={() => setReportId(null)} />
    </div>
  );
}
