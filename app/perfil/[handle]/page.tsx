"use client";

import { useParams } from "next/navigation";
import { ProfileView } from "@/components/ProfileView";

export default function PerfilPage() {
  const params = useParams<{ handle: string }>();
  const handle = Array.isArray(params.handle) ? params.handle[0] : params.handle;
  return <ProfileView handle={handle ?? ""} />;
}
