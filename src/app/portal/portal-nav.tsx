"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function PortalNav() {
  const pathname = usePathname();
  const items = [
    { href: "/portal", label: "Inicio" },
    { href: "/portal/book", label: "Reservar" },
    { href: "/portal/bookings", label: "Mis reservas" },
  ];
  return (
    <nav className="hidden md:flex items-center gap-0.5 ml-4">
      {items.map((it) => {
        const active =
          pathname === it.href || (it.href !== "/portal" && pathname.startsWith(it.href));
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "px-3 py-1.5 rounded-md text-[12.5px] font-medium transition-colors",
              active
                ? "bg-ink-950 text-white"
                : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
