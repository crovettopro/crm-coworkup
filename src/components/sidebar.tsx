"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, ListChecks, CreditCard, FileText,
  Boxes, UserMinus, Wrench, Settings, LogOut, CalendarDays, AlarmClock, Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const items = [
  { href: "/dashboard",     label: "Dashboard",        icon: LayoutDashboard },
  { href: "/clients",       label: "Clientes",         icon: Users },
  { href: "/subscriptions", label: "Suscripciones",    icon: ListChecks },
  { href: "/payments",      label: "Pagos",            icon: CreditCard },
  { href: "/cash",          label: "Control efectivo", icon: Wallet },
  { href: "/renewals",      label: "Vencimientos",     icon: AlarmClock },
  { href: "/invoices",      label: "Facturas",         icon: FileText },
  { href: "/extras",        label: "Monitores y taquillas", icon: Boxes },
  { href: "/churn",         label: "Altas y bajas",    icon: UserMinus },
  { href: "/incidents",     label: "Incidencias",      icon: Wrench },
  { href: "/calendar",      label: "Calendario",       icon: CalendarDays },
  { href: "/settings",      label: "Configuración",    icon: Settings },
];

export function Sidebar({
  user,
}: {
  user: { name?: string | null; email: string; role: string };
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-ink-100 bg-white">
      <div className="flex items-center px-5 py-5">
        <Image
          src="/coworkup-logo.png"
          alt="Cowork Up"
          width={140}
          height={42}
          priority
          className="h-8 w-auto"
        />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-colors",
                active
                  ? "bg-ink-900 text-white"
                  : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-brand-400" : "")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-ink-100 p-3">
        <div className="mb-2 px-2">
          <p className="truncate text-[13px] font-medium text-ink-900">{user.name || user.email}</p>
          <p className="truncate text-[11px] text-ink-500">{user.email}</p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-brand-700">{user.role}</p>
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-ink-600 hover:bg-ink-50 hover:text-ink-900"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
