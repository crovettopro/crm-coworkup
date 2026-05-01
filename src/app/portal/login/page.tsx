import { redirect } from "next/navigation";

// Login por email retirado: el portal ahora identifica al cliente por
// selección de nombre tras escanear el QR de la sala. Cualquier acceso
// aquí (links viejos, QRs viejos) cae al picker de coworking en /portal.
export const dynamic = "force-dynamic";

export default async function PortalLoginRedirect({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; coworking?: string }>;
}) {
  const params = await searchParams;
  // Si traen ?coworking=X, vamos directo al selector
  if (params.coworking) {
    redirect(`/portal/select?coworking=${params.coworking}`);
  }
  redirect("/portal");
}
