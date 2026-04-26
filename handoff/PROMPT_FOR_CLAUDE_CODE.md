# Prompt para Claude Code (cópialo y pégalo)

> Pega esto como primer mensaje a Claude Code en VS Code, con la carpeta `handoff/` añadida a tu workspace.

---

Hola. Vamos a aplicar un rediseño completo de UI al CRM de Cowork Up. Es **solo presentación** — no toques lógica de negocio, queries de Supabase, RLS, tipos, ni rutas.

**Antes de empezar:**
1. Lee `handoff/README.md`, `handoff/DESIGN_TOKENS.md`, `handoff/COMPONENTS.md` y `handoff/SCREENS.md` en ese orden
2. Abre `handoff/prototype/Cowork Up CRM.html` en el navegador — es la referencia visual exacta
3. Crea rama `redesign/lean-saas`

**Plan de ejecución (en este orden, un commit por paso):**
1. `tailwind.config.ts` + tipografía Inter/JetBrains Mono + variables CSS en `globals.css`
2. Primitivos UI: `button`, `card`, `badge`, `table`, `input`
3. Componentes nuevos: `kpi.tsx`, `seg.tsx`, `avatar.tsx`
4. Shell: `sidebar.tsx`, `topbar.tsx`
5. Páginas en orden de visibilidad: dashboard → clients → payments → invoices → renewals → cash → churn → subscriptions → calendar → incidents → extras → settings → cliente individual

**Reglas durante toda la migración:**
- Mantén las APIs de los componentes (mismas props) — solo cambia presentación
- Si un cambio rompe algún uso, ajusta el caller, no la API
- No introduzcas dependencias nuevas
- Después de cada paso, corre `pnpm build` y arregla TS errors antes de commitear
- Si dudas entre dos opciones, elige la que más se parezca al prototipo HTML

Empieza por el paso 1 y enséñame el diff antes de pasar al 2.
