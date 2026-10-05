"use client";

import { Composer } from "@/components/Composer";

export default function PublicarPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Publicar</h1>
      <Composer redirectHome />
    </div>
  );
}
