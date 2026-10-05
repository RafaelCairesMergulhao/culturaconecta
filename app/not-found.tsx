import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <Link href="/" className="text-sm font-semibold text-azul">
        Voltar ao início
      </Link>
    </div>
  );
}
