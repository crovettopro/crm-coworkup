import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { getProfile, getVisibleCoworkings, getActiveCw } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  const coworkings = await getVisibleCoworkings(profile);
  const canSelectAll = profile.role === "super_admin" && coworkings.length > 1;
  const activeCw = await getActiveCw(profile);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <Sidebar
        user={{
          name: profile.name,
          email: profile.email,
          role: ROLE_LABEL[profile.role],
        }}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          coworkings={coworkings}
          canSelectAll={canSelectAll}
          fixedCw={profile.role === "super_admin" ? null : profile.coworking_id}
          currentValue={activeCw}
        />
        <main className="flex-1 overflow-y-auto px-6 py-7 lg:px-10">
          <div className="mx-auto max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
