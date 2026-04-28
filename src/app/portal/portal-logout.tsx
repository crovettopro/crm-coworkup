"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function PortalLogout() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/portal/logout", { method: "POST" });
    router.push("/portal");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      title="Cerrar sesión en este móvil"
      className="grid h-8 w-8 place-items-center rounded-md text-ink-500 hover:bg-ink-100 hover:text-ink-900"
    >
      <LogOut className="h-3.5 w-3.5" />
    </button>
  );
}
