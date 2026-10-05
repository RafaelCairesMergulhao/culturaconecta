import Link from "next/link";
import { useId } from "react";
import { mediaUrl, SHAPE_CLIP } from "@/lib/format";
import { kindLabel } from "@/lib/policy";
import type { AccountKind, PublicUser, Shape } from "@/lib/types";

const SIZES = { xs: 26, sm: 36, md: 44, lg: 64, xl: 116 } as const;

type AvatarUser = Pick<PublicUser, "avatarInitials" | "avatarId" | "prefs">;

export function Avatar({
  user,
  size = "md",
  shape,
}: {
  user?: AvatarUser | null;
  size?: keyof typeof SIZES;
  shape?: Shape;
}) {
  const px = SIZES[size];
  const form = shape ?? user?.prefs.shape ?? "hexagono";
  const src = mediaUrl(user?.avatarId);
  const gradient = `linear-gradient(135deg, ${user?.prefs.accent ?? "var(--accent)"}, ${user?.prefs.accent2 ?? "var(--accent2)"})`;
  return (
    <span className="relative inline-block shrink-0" style={{ width: px, height: px }}>
      <span
        className="absolute inset-0 grid place-items-center font-semibold text-white"
        style={{
          clipPath: SHAPE_CLIP[form],
          background: gradient,
          fontSize: Math.max(9, px * 0.3),
          paddingTop: form === "triangulo" && !src ? px * 0.3 : 0,
        }}
      >
        {src ? (
          <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          (user?.avatarInitials ?? "?")
        )}
      </span>
    </span>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  const gradient = `cc-logo-${useId().replace(/:/g, "")}`;
  return (
    <span className="inline-flex items-center gap-2.5 font-semibold tracking-tight">
      <svg viewBox="0 0 32 28" className="h-7 w-8" aria-hidden="true">
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: "var(--accent)" }} />
            <stop offset="1" style={{ stopColor: "var(--accent2)" }} />
          </linearGradient>
        </defs>
        <path d="M16 1 31 27H1z" fill={`url(#${gradient})`} />
        <path d="M16 10.5 23.6 24H8.4z" style={{ fill: "var(--bg)" }} opacity="0.9" />
        <path d="M16 16 19.4 22h-6.8z" fill={`url(#${gradient})`} />
      </svg>
      {!compact && (
        <span className="text-lg">
          Cultura<span className="text-gradient">Conecta</span>
        </span>
      )}
    </span>
  );
}

export function KindBadge({ kind }: { kind: AccountKind }) {
  return (
    <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
      {kindLabel(kind)}
    </span>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted">{children}</p>;
}

export function Notice({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-line bg-card px-4 py-3 text-sm text-muted">{children}</div>;
}

export const fieldClass =
  "w-full rounded-2xl border border-line bg-ink/40 px-3.5 py-2.5 outline-none transition placeholder:text-muted/70 focus:border-rosa focus:ring-2 focus:ring-rosa/25";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function PrimaryButton({
  children,
  type = "button",
  disabled,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rosa to-azul px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rosa/20 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled,
  href,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  href?: string;
  className?: string;
}) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-full border border-line bg-card px-4 py-2.5 text-sm font-semibold transition hover:border-rosa/60 disabled:opacity-50 ${className}`;
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}

export function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
        active ? "bg-paper text-ink" : "border border-line bg-card text-muted hover:text-paper"
      }`}
    >
      {children}
    </button>
  );
}

export function Meter({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-ink/50">
      <div
        className="h-full rounded-full bg-gradient-to-r from-rosa to-azul transition-all"
        style={{ width: `${Math.max(4, value)}%` }}
      />
    </div>
  );
}
