# Cowork Up CRM — Handoff de rediseño para Claude Code

> **Para Claude Code:** Este documento es la especificación completa del rediseño. Lee `DESIGN_TOKENS.md` y `COMPONENTS.md` primero, luego aplica los cambios pantalla por pantalla siguiendo `SCREENS.md`. El prototipo HTML de referencia está en `prototype/Cowork Up CRM.html` — abrelo en el navegador para ver el comportamiento exacto.

---

## Cómo trabajar este rediseño

1. **Crea una rama nueva**: `git checkout -b redesign/lean-saas`
2. **Aplica tokens primero** (`tailwind.config.ts`) — todo lo demás depende de ellos
3. **Migra los primitivos UI** (`src/components/ui/*`) — Button, Card, Badge, Table, Input
4. **Migra el shell** (Sidebar + Topbar) — afecta a todas las páginas
5. **Pantalla por pantalla** siguiendo el orden de `SCREENS.md` (empieza por Dashboard, es la más visible)
6. **No cambies lógica de negocio, queries Supabase, RLS o tipos** — solo presentación

## Filosofía del rediseño

- **Lean SaaS premium** estilo Linear/Vercel/Stripe
- Cero ruido visual: bordes 1px, radios pequeños, **sin sombras** salvo overlays
- Jerarquía por **tipografía y peso**, no por color de fondo
- **Dorado `#f7c948` solo como acento puntual** — selección, focus, KPI destacado, indicador activo
- **Densidad alta pero respirada** — filas de tabla a 40px, padding interno tight
- **Tabular-nums** obligatorio en números, **JetBrains Mono** en IDs/fechas técnicas

## Lo que NO cambia

- Stack (Next.js 15 + Supabase + Tailwind)
- Tipos, queries, RLS, lógica de auth
- Estructura de carpetas
- Funcionalidad existente
- Plus Jakarta Sans → **se elimina**, todo Inter ahora (más afilado)

## Archivos en este paquete

| Archivo | Contenido |
|---|---|
| `README.md` | Este archivo — overview |
| `DESIGN_TOKENS.md` | `tailwind.config.ts` actualizado + variables CSS |
| `COMPONENTS.md` | Specs por componente UI primitive |
| `SCREENS.md` | Specs por pantalla con código de referencia |
| `prototype/` | El prototipo HTML completo (abre `Cowork Up CRM.html`) |
