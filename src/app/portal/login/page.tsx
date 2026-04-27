"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Mail, ArrowRight, Check } from "lucide-react";

export default function PortalLoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${origin}/auth/callback?next=/portal` },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-ink-50 flex items-center justify-center p-6">
      <div className="w-full max-w-[440px]">
        <div className="flex justify-center mb-8">
          <Image
            src="/coworkup-logo.png"
            alt="Cowork Up"
            width={160}
            height={48}
            priority
            className="h-9 w-auto"
          />
        </div>

        <div className="rounded-2xl bg-white shadow-xl border border-ink-100 p-7">
          {!sent ? (
            <>
              <div className="text-center mb-5">
                <h1 className="text-[22px] font-semibold tracking-tight text-ink-950">
                  Reserva tu sala
                </h1>
                <p className="mt-1.5 text-[13.5px] text-ink-500">
                  Te mandamos un enlace mágico a tu email.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-500 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="tu@email.com"
                    className="h-11 w-full rounded-lg border border-ink-200 bg-white px-3.5 text-[14.5px] text-ink-950 placeholder:text-ink-400 hover:border-ink-300 focus:outline-none focus:border-ink-700 focus:ring-2 focus:ring-ink-100"
                  />
                </div>

                {error && (
                  <p className="text-[12.5px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group inline-flex w-full h-11 items-center justify-center gap-2 rounded-lg bg-ink-950 text-white text-[14px] font-medium hover:bg-ink-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Enviando…" : (<>Enviar enlace <ArrowRight className="h-3.5 w-3.5" /></>)}
                </button>
              </form>

              <p className="mt-5 text-center text-[12px] text-ink-500">
                Solo funciona si tu email está dado de alta como cliente del coworking.
              </p>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <Check className="h-6 w-6" />
              </div>
              <h2 className="text-[18px] font-semibold text-ink-950">Revisa tu email</h2>
              <p className="mt-2 text-[13.5px] text-ink-500">
                Te hemos enviado un enlace a <span className="font-medium text-ink-900">{email}</span>.
                Pincha en él para entrar.
              </p>
              <button
                type="button"
                className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] text-ink-500 hover:text-ink-900 underline"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
              >
                <Mail className="h-3 w-3" />
                Probar con otro email
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[11.5px] text-ink-500">
          Cowork Up · Ruzafa & Puerta del Mar
        </p>
      </div>
    </div>
  );
}
