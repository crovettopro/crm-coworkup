"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [next, setNext] = useState<string>("/portal");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const n = params.get("next");
    if (n && n.startsWith("/portal")) setNext(n);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/portal/identify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok || !data.identified) {
      setError(
        data.error ||
          "No encontramos tu email. Avisa al equipo para que te dé de alta.",
      );
      return;
    }
    router.push(next);
    router.refresh();
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
          <div className="text-center mb-5">
            <h1 className="text-[22px] font-semibold tracking-tight text-ink-950">
              Reserva tu sala
            </h1>
            <p className="mt-1.5 text-[13.5px] text-ink-500">
              Escribe tu email de cliente. Te recordaremos en este móvil 30 días.
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
              {loading ? (
                "Comprobando…"
              ) : (
                <>
                  Continuar <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-[12px] text-ink-500">
            Sin contraseña, sin email de confirmación. Sólo el email con el que
            estás dado de alta como cliente.
          </p>
        </div>

        <p className="mt-6 text-center text-[11.5px] text-ink-500">
          Cowork Up · Ruzafa & Puerta del Mar
        </p>
      </div>
    </div>
  );
}
