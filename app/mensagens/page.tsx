"use client";

import Link from "next/link";
import { useSocial } from "@/components/SocialContext";
import { Avatar, Notice } from "@/components/ui";
import { timeAgo, userByHandle } from "@/lib/format";

export default function MensagensPage() {
  const { state } = useSocial();
  if (!state) return null;
  if (!state.me) {
    return (
      <Notice>
        <Link href="/entrar" className="font-semibold text-azul">
          Entre
        </Link>{" "}
        para conversar.
      </Notice>
    );
  }
  const me = state.me.handle;
  const partners = new Map<string, { text: string; createdAt: string }>();
  for (const message of state.messages) {
    const other = message.fromHandle === me ? message.toHandle : message.fromHandle;
    const current = partners.get(other);
    if (!current || message.createdAt > current.createdAt) {
      partners.set(other, { text: message.text, createdAt: message.createdAt });
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Mensagens</h1>
      {partners.size === 0 && <Notice>Nenhuma conversa ainda. Abra um perfil e toque em Mensagem.</Notice>}
      <ul className="space-y-2">
        {[...partners.entries()].map(([handle, last]) => {
          const user = userByHandle(state, handle);
          return (
            <li key={handle}>
              <Link href={`/mensagens/${handle}`} className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3">
                <Avatar user={user} size="sm" />
                <span className="min-w-0">
                  <span className="block font-semibold">{user?.name ?? handle}</span>
                  <span className="block truncate text-sm text-muted">{last.text}</span>
                </span>
                <span className="ml-auto text-xs text-muted">{timeAgo(last.createdAt)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
