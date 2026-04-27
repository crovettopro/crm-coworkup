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
        const redirect = url.clone();
        redirect.pathname = "/portal";
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
