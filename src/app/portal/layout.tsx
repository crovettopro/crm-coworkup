import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PortalNav } from "./portal-nav";
import { PortalLogout } from "./portal-logout";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Si no hay user, deja que el middleware/login maneje. La página /portal/login
  // tiene su propio diseño y este layout no le aplica.
  if (!user) {
    redirect("/portal/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client") {
    // Si por alguna razón un staff llega aquí, fuera al CRM
    redirect("/dashboard");
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, company_name, coworking_id, coworkings(name)")
    .eq("auth_user_id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50/40 via-white to-ink-50/60">
      <header className="sticky top-0 z-20 border-b border-ink-200 bg-white/85 backdrop-blur">
        <div className="mx-auto max-w-[920px] flex items-center gap-3 px-5 h-14">
          <Link href="/portal" className="flex items-center gap-2">
            <Image
              src="/coworkup-logo.png"
              alt="Cowork Up"
              width={120}
              height={36}
              priority
              className="h-7 w-auto"
            />
          </Link>
          <PortalNav />
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:block text-right leading-tight">
              <p className="text-[12.5px] font-medium text-ink-950">
                {client?.name ?? profile.name ?? profile.email}
              </p>
              {(client as any)?.coworkings?.name && (
                <p className="text-[10.5px] text-ink-500">
                  {(client as any).coworkings.name}
                </p>
              )}
            </div>
            <PortalLogout />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[920px] px-5 py-8">{children}</main>
    </div>
  );
}
