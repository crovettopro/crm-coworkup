"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

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
    if (error) { setError(error.message); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-7 text-center">
          <div className="flex justify-center mb-4">
            <Image src="/coworkup-logo.png" alt="Cowork Up" width={180} height={56} priority className="h-12 w-auto" />
          </div>
          <p className="text-sm text-ink-500">Operaciones · Acceso para el equipo interno</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft space-y-4"
        >
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="tu@coworkup.com" />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? "Accediendo…" : "Entrar"}
          </Button>
        </form>

        <p className="mt-4 text-center text-[12px] text-ink-500">
          ¿Problemas para acceder? Contacta con el administrador.
        </p>
      </div>
    </div>
  );
}
