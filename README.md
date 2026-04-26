# Cowork Up · CRM/ERP

CRM/ERP interno para la gestión de los coworkings **Cowork Up** (Ruzafa y Puerta del Mar, Valencia).

Construido con Next.js 15 + React 19 + TypeScript + Tailwind y Supabase (Postgres + Auth + RLS).

## Funcionalidad

- **Dashboard** con KPIs (ARR YTD, MRR, asientos), gráfica de ventas 12 meses, top clientes, ocupación ponderada por tipo de plan, objetivo mensual.
- **Clientes** con paginación, búsqueda y estados `active` / `inactive` / `casual` (clientes que solo usaron pases puntuales).
- **Suscripciones**: catálogo de planes editable + suscripciones de cliente con cantidad de asientos y descuentos.
- **Pagos** con paginación, KPIs agregados y filtro por rango de fechas (default últimos 7 días).
- **Facturas** vinculadas a pagos, con seguimiento de "no emitida" / "emitida".
- **Vencimientos**: próximas (30d) + vencidas (últimos 7d).
- **Altas y bajas mensuales** con regla de gracia 7 días.
- **Control de efectivo**: float manual de caja por coworking, cobros en cash con factura, movimientos manuales (ingresos sin factura / gastos menores).
- **Monitores y taquillas** con asignación a clientes haciendo clic en el inventario.
- **Calendario** con eventos del coworking + festivos de Valencia.
- **Incidencias**, **importación de CSV** masiva, **multi-coworking** con persistencia por cookie.

Roles: `super_admin` (ve todo), `manager` (un coworking), `staff`.

## Stack

- Next.js 15 (App Router) + React 19
- TypeScript estricto
- Tailwind CSS + tipografías Plus Jakarta Sans (display) + Inter (UI)
- Iconos `lucide-react`
- Supabase (`@supabase/ssr`) — Postgres + Auth + RLS

Paleta de marca: `ink-50…900` (gris-azulado) + `brand-300/400/700` (dorado `#ffd957`).

## Requisitos

- Node.js 20+ y npm
- Cuenta de Supabase con un proyecto creado
- Python 3 (solo para el script de importación masiva de CSV)

## Setup

```bash
# 1. Variables de entorno
cp .env.example .env.local
# Edita .env.local con la URL del proyecto + anon key + service_role key

# 2. Instalar dependencias
npm install

# 3. Migrar la base de datos
# Aplica las migraciones SQL en supabase/migrations/ en orden numérico
# (lo más rápido es desde el SQL editor del dashboard de Supabase).

# 4. Levantar dev server
npm run dev
# http://localhost:3000
```

Crea un usuario en Supabase Auth y promociónalo a `super_admin` actualizando la fila correspondiente en la tabla `profiles`.

## Importación masiva de CSV

```bash
export SUPABASE_PROJECT_REF=tu-project-ref
export SUPABASE_PAT=sbp_xxx          # Personal Access Token de Supabase

cd import_data
python3 import.py            # Dry-run, muestra estadísticas
python3 import.py --apply    # Importa de verdad (idempotente)
```

Los CSV se ignoran por `.gitignore` por contener datos reales.

## Estructura

```
src/
  app/
    (app)/                   # Rutas autenticadas (dashboard, clients, payments, etc.)
    login/                   # Login
    layout.tsx
  components/
    ui/                      # Primitivos (Button, Card, Badge, Input, Table)
    *.tsx                    # Componentes específicos (sidebar, dashboard, dialogs)
  lib/
    supabase/                # Cliente browser + server + middleware
    auth.ts utils.ts types.ts
supabase/
  migrations/                # SQL versionado
import_data/
  import.py                  # Importador CSV → Supabase (idempotente)
```

## Comandos

```bash
npm run dev         # Dev server
npm run build       # Build de producción
npm run start       # Servir build
npx tsc --noEmit    # Type-check
```

---

Hecho con [Claude Code](https://claude.com/claude-code).
