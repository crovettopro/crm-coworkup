import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const url = request.nextUrl;
  const path = url.pathname;
  const isLogin = path.startsWith("/login");
  const isAuthRoute = path.startsWith("/auth");
  const isPortal = path === "/portal" || path.startsWith("/portal/");
  const isApiPortal = path.startsWith("/api/portal/");

  // El portal del cliente y sus APIs son públicos. La identificación se hace
  // con cookie firmada (PORTAL_COOKIE_SECRET) gestionada en /api/portal/*.
  if (isPortal || isApiPortal || isAuthRoute) {
    return response;
  }

  // CRM: requerir Supabase Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isLogin) {
    const redirect = url.clone();
    redirect.pathname = "/login";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = (profile as any)?.role ?? null;

    if (role === "client") {
      // Si por algo un cliente acabó con sesión Supabase (legacy magic link),
      // lo mandamos al portal público.
      const redirect = url.clone();
      redirect.pathname = "/portal";
      redirect.search = "";
      return NextResponse.redirect(redirect);
    }

    if (isLogin) {
      const redirect = url.clone();
      redirect.pathname = "/dashboard";
      redirect.search = "";
      return NextResponse.redirect(redirect);
    }
  }

  return response;
}
