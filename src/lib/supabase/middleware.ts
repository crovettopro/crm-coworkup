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
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl;
  const path = url.pathname;
  const isLogin = path.startsWith("/login");
  const isPortalLogin = path.startsWith("/portal/login");
  const isAuthRoute = path.startsWith("/auth");
  const isPortal = path === "/portal" || path.startsWith("/portal/");
  const isPublic = isLogin || isAuthRoute || isPortalLogin;

  if (!user && !isPublic) {
    const redirect = url.clone();
    redirect.pathname = isPortal ? "/portal/login" : "/login";
    redirect.search = "";
    if (isPortal) {
      // Preserve deep-link target (e.g. /portal/book?room=xxx) so the magic
      // link can land back on it after auth.
      redirect.searchParams.set("next", path + url.search);
    }
    return NextResponse.redirect(redirect);
  }

  if (user) {
    let role: string | null = null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = (profile as any)?.role ?? null;

    if (role === "client") {
      // Cliente: solo /portal/*
      if (!isPortal && !isPortalLogin && !isAuthRoute) {
        const redirect = url.clone();
        redirect.pathname = "/portal";
        return NextResponse.redirect(redirect);
      }
      if (isPortalLogin) {
        // Honor ?next= so QR deep-links land where they should
        const nextRaw = url.searchParams.get("next");
        const redirect = url.clone();
        redirect.search = "";
        redirect.pathname = "/portal";
        if (nextRaw && nextRaw.startsWith("/portal")) {
          try {
            const nextUrl = new URL(nextRaw, url.origin);
            redirect.pathname = nextUrl.pathname;
            redirect.search = nextUrl.search;
          } catch {
            /* ignore malformed */
          }
        }
        return NextResponse.redirect(redirect);
      }
    } else {
      // Staff/admin: si entra al portal, fuera al dashboard
      if (isPortal) {
        const redirect = url.clone();
        redirect.pathname = "/dashboard";
        return NextResponse.redirect(redirect);
      }
      if (isLogin) {
        const redirect = url.clone();
        redirect.pathname = "/dashboard";
        return NextResponse.redirect(redirect);
      }
    }
  }

  return response;
}
