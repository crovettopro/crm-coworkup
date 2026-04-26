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
import { Avatar } from "@/components/ui/avatar";

type NavItem = { href: string; label: string; icon: any; badge?: string };
type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: "General",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Operativa",
    items: [
      { href: "/clients",       label: "Clientes",      icon: Users },
      { href: "/subscriptions", label: "Suscripciones", icon: ListChecks },
      { href: "/renewals",      label: "Vencimientos",  icon: AlarmClock },
      { href: "/calendar",      label: "Calendario",    icon: CalendarDays },
      { href: "/incidents",     label: "Incidencias",   icon: Wrench },
    ],
  },
  {
    label: "Finanzas",
    items: [
      { href: "/payments", label: "Pagos",            icon: CreditCard },
      { href: "/invoices", label: "Facturas",         icon: FileText },
      { href: "/cash",     label: "Control efectivo", icon: Wallet },
      { href: "/churn",    label: "Altas y bajas",    icon: UserMinus },
    ],
  },
  {
    label: "Espacio",
    items: [
      { href: "/extras",   label: "Monitores y taquillas", icon: Boxes },
      { href: "/settings", label: "Configuración",         icon: Settings },
    ],
  },
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
    <aside className="flex h-screen w-[224px] flex-col bg-white border-r border-ink-200 sticky top-0">
      {/* Brand */}
      <Link href="/dashboard" className="flex items-center gap-2.5 px-4 pt-[18px] pb-3.5 hover:opacity-90 transition-opacity">
        <Image
          src="/coworkup-logo.png"
          alt="Cowork Up"
          width={120}
          height={36}
          priority
          className="h-7 w-auto"
        />
        <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-ink-400 ml-auto">CRM</span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto pb-2">
        {NAV.map((group, gi) => (
          <div
            key={group.label}
            className={cn(
              "px-2 py-1.5",
              gi > 0 && "border-t border-ink-200 mt-1.5 pt-2.5",
            )}
          >
            <div className="px-2.5 pt-1 pb-1.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-ink-400">
              {group.label}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative mb-px flex items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-[13px] transition-colors",
                    active
                      ? "bg-ink-100 text-ink-950 font-medium"
                      : "text-ink-600 hover:bg-[#f5f5f5] hover:text-ink-900",
                  )}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute -left-2 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-[2px] bg-brand-400"
                    />
                  )}
                  <Icon className="h-[15px] w-[15px] shrink-0 opacity-85" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="rounded bg-ink-200 px-1.5 py-px text-[10.5px] font-medium text-ink-700 min-w-[18px] text-center">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-ink-200 p-2">
        <div className="group flex items-center gap-2.5 rounded-[6px] px-2 py-1.5 hover:bg-[#f5f5f5]">
          <Avatar name={user.name ?? user.email} variant="gold" size="md" className="rounded-md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-medium text-ink-900 leading-tight">{user.name || user.email}</p>
            <p className="truncate text-[10.5px] text-ink-500 uppercase tracking-[0.05em] leading-tight mt-0.5">{user.role}</p>
          </div>
          <button
            onClick={signOut}
            title="Cerrar sesión"
            className="text-ink-400 hover:text-ink-900"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
