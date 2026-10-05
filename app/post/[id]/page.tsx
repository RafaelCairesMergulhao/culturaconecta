"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PostCard } from "@/components/PostCard";
import { ReportDialog } from "@/components/ReportDialog";
import { useSocial } from "@/components/SocialContext";
import { fieldClass, Notice, PrimaryButton } from "@/components/ui";
import { timeAgo, userByHandle } from "@/lib/format";
import { validateText } from "@/lib/policy";

export default function PostPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { state, act, busy } = useSocial();
  const [text, setText] = useState("");
  const [reportId, setReportId] = useState<string | null>(null);
  if (!state || !id) return null;
  const post = state.posts.find((item) => item.id === id);
  if (!post) return <Notice>Essa publicação não está mais disponível.</Notice>;
  const comments = state.comments
    .filter((item) => item.postId === id && !item.hidden)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const problem = validateText(text, "comment");
    if (problem) return;
    try {
      await act({ action: "comment", postId: id, text });
      setText("");
    } catch {
      /* aviso global */
    }
  }

  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm text-muted">
        Voltar
      </Link>
      <PostCard post={post} />
      <h2 className="font-semibold">Comentários</h2>
      {comments.length === 0 && <Notice>Seja a primeira pessoa a comentar, com respeito.</Notice>}
      <ul className="space-y-3">
        {comments.map((comment) => {
          const author = userByHandle(state, comment.authorHandle);
          return (
            <li key={comment.id} className="rounded-3xl border border-line bg-card p-4">
              <Link href={`/perfil/${comment.authorHandle}`} className="text-sm font-semibold">
                {author?.name ?? comment.authorHandle}
              </Link>
              <span className="ml-2 text-xs text-muted">{timeAgo(comment.createdAt)}</span>
              <p className="mt-2 whitespace-pre-wrap leading-7">{comment.text}</p>
              {state.me && state.me.handle !== comment.authorHandle && (
                <button type="button" onClick={() => setReportId(comment.id)} className="mt-2 text-xs text-muted">
                  Denunciar
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {state.me && !state.me.limited ? (
        <form onSubmit={send} className="space-y-2">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Escreva um comentário"
            className={fieldClass}
          />
          <PrimaryButton type="submit" disabled={busy || !text.trim()}>
            Comentar
          </PrimaryButton>
        </form>
      ) : (
        <Notice>
          {state.me ? "Sua conta está limitada e não pode comentar." : <Link href="/entrar">Entre para comentar.</Link>}
        </Notice>
      )}
      <ReportDialog
        open={Boolean(reportId)}
        title="Denunciar comentário"
        targetType="comment"
        targetId={reportId ?? ""}
        onClose={() => setReportId(null)}
      />
    </div>
  );
}
