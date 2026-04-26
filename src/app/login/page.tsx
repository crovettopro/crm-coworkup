"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, Building2, ListChecks, Wallet } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-ink-50">
      {/* Lado izquierdo: marca + valor (sólo desktop) */}
      <aside className="hidden lg:flex flex-col justify-between bg-ink-950 text-ink-50 p-12 relative overflow-hidden">
        {/* Detalle decorativo dorado en esquina */}
        <div className="pointer-events-none absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-brand-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 w-[360px] h-[360px] rounded-full bg-brand-400/5 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <Image
            src="/coworkup-logo.png"
            alt="Cowork Up"
            width={180}
            height={48}
            priority
            className="h-9 w-auto"
            style={{ filter: "brightness(0) invert(1)" }}
          />
          <span className="hidden xl:inline-block h-5 w-px bg-ink-700" aria-hidden />
          <p className="hidden xl:inline-block text-[11.5px] uppercase tracking-[0.18em] text-brand-400/90">
            CRM · Operaciones
          </p>
        </div>

        <div className="relative max-w-[460px]">
          <h1 className="text-[34px] leading-[1.1] font-semibold tracking-tight text-white">
            Toda la operativa de tus coworkings,{" "}
            <span className="text-brand-400">en un único panel</span>.
          </h1>
          <p className="mt-4 text-[14.5px] text-ink-300 leading-relaxed">
            Clientes, suscripciones, pagos, vencimientos y caja en un solo sitio. Diseñado
            para tu equipo interno.
          </p>

          <ul className="mt-8 space-y-3.5">
            {[
              { icon: <ListChecks className="h-4 w-4" />, text: "Suscripciones recurrentes con seguimiento de renovación" },
              { icon: <Wallet className="h-4 w-4" />, text: "Pagos, facturas y control de caja física" },
              { icon: <Building2 className="h-4 w-4" />, text: "Multi-coworking con métricas de ocupación ponderada" },
            ].map((it) => (
              <li key={it.text} className="flex items-start gap-3 text-[13.5px] text-ink-200">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-ink-900 text-brand-400 ring-1 ring-ink-800 shrink-0 mt-0.5">
                  {it.icon}
                </span>
                <span>{it.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-[11.5px] text-ink-400">
          <p>Cowork Up · Valencia · Ruzafa & Puerta del Mar</p>
        </div>
      </aside>

      {/* Lado derecho: formulario */}
      <main className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[440px]">
          {/* Logo móvil (cabecera) */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Image
              src="/coworkup-logo.png"
              alt="Cowork Up"
              width={200}
              height={64}
              priority
              className="h-14 w-auto"
            />
          </div>

          <div className="text-center lg:text-left mb-7">
            <h2 className="text-[28px] font-semibold tracking-tight text-ink-950 leading-tight">
              Bienvenido de nuevo
            </h2>
            <p className="mt-1.5 text-[14px] text-ink-500">
              Accede con tu cuenta del equipo de Cowork Up.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-[12px] font-medium uppercase tracking-[0.06em] text-ink-500 mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="tu@coworkup.com"
                className="h-12 w-full rounded-lg border border-ink-200 bg-white px-3.5 text-[15px] text-ink-950 placeholder:text-ink-400 hover:border-ink-300 focus:outline-none focus:border-ink-700 focus:ring-2 focus:ring-ink-100"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="block text-[12px] font-medium uppercase tracking-[0.06em] text-ink-500"
                >
                  Contraseña
                </label>
                <a
                  href="mailto:eduardo.crovetto@ucademy.com?subject=He%20olvidado%20la%20contraseña%20del%20CRM"
                  className="text-[12px] text-ink-500 hover:text-ink-900 underline-offset-2 hover:underline"
                >
                  ¿Olvidaste la contraseña?
                </a>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-12 w-full rounded-lg border border-ink-200 bg-white px-3.5 text-[15px] text-ink-950 placeholder:text-ink-400 hover:border-ink-300 focus:outline-none focus:border-ink-700 focus:ring-2 focus:ring-ink-100"
              />
            </div>

            {error && (
              <p className="text-[13px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">
                {error === "Invalid login credentials"
                  ? "Email o contraseña incorrectos."
                  : error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group inline-flex w-full h-12 items-center justify-center gap-2 rounded-lg bg-ink-950 text-white text-[14.5px] font-medium hover:bg-ink-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Accediendo…" : (<>Entrar <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>)}
            </button>
          </form>

          <p className="mt-6 text-center text-[12px] text-ink-500">
            ¿Problemas para acceder? Contacta con el administrador.
          </p>
        </div>
      </main>
    </div>
  );
}
