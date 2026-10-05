"use client";

import { EditaisPanel } from "@/components/Editais";
import { useSocial } from "@/components/SocialContext";

export default function EditaisPage() {
  const { state } = useSocial();
  if (!state?.me) return null;
  return <EditaisPanel state={state} />;
}
