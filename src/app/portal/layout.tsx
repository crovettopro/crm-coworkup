import Link from "next/link";
import Image from "next/image";
import { getPortalCookie } from "@/lib/portal-cookie";
import { PortalNav } from "./portal-nav";
import { PortalLogout } from "./portal-logout";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identity = await getPortalCookie();

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
            {identity ? (
              <>
                <div className="hidden sm:block text-right leading-tight">
                  <p className="text-[12.5px] font-medium text-ink-950">
                    {identity.name}
                  </p>
                  {identity.coworkingName && (
                    <p className="text-[10.5px] text-ink-500">
                      {identity.coworkingName}
                    </p>
                  )}
                </div>
                <PortalLogout />
              </>
            ) : (
              <Link
                href="/portal"
                className="text-[12px] font-medium text-ink-700 hover:text-ink-950 hover:underline"
              >
                Selecciona tu nombre
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[920px] px-5 py-8">{children}</main>
    </div>
  );
}
