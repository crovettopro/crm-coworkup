# Specs por pantalla

> Para cada pantalla: abre el prototipo HTML en `prototype/Cowork Up CRM.html`, navega a la página, y úsalo como referencia visual exacta. Aquí solo capturo los cambios estructurales.

## Shell global (Sidebar + Topbar)

### `src/components/sidebar.tsx`
- Ancho **224px** (era 240px)
- **Agrupar items por sección** con label en uppercase: General · Operativa · Finanzas · Espacio
- Item activo: bg `ink-100` (no `ink-900`) + barra dorada `bg-brand-400` de 3px a la izquierda
- Icono activo: ya no en dorado, mismo gris que el resto
- Logo: pequeño cuadrado negro 28px con "cu" en dorado, junto al nombre + subtítulo "CRM · Valencia"
- Footer user: avatar con gradiente dorado, nombre y rol pequeño

### `src/components/topbar.tsx`
- Altura **48px** (era 56px)
- **Breadcrumbs** a la izquierda en vez de selector pegado al borde
- En el centro/derecha: search ⌘K (cosmético), selector de coworking como botón compacto, campana con dot, botón "+ Nuevo"
- Selector coworking: dot dorado + nombre + chevron, todo en un botón outline

---

## Dashboard

**Reemplaza el `MetricCard` actual** por un KPI grid horizontal:
- 4 KPIs en una sola card con divisores verticales internos `border-r border-ink-200`
- Primer KPI con barra dorada superior de 2px (`accent`)
- Valores en 26px tabular-nums
- Hint pequeño + opcional `kpi-trend` (badge mini con flecha y %)

**Objetivo + Ocupación + Pases hoy** en grid de 3 columnas (1.4fr/1fr/1fr):
- Objetivo con progress bar dorada + dato de días restantes
- Ocupación con progress neutra + breakdown por coworking (dot color + número)
- Pases hoy con gran número + lista compacta debajo

**Sales chart**: barras CSS, mes actual con gradiente dorado, resto `ink-100`. Tooltip on hover en `ink-950`.

**Top clientes**: lista con rank mono, avatar pequeño, nombre, importe alineado derecha. **El #1 lleva avatar dorado.**

---

## Clientes

- Filter bar: search con icono + 2 selects + botón "Limpiar" cuando hay filtros activos
- Tabla con columna **MRR nueva** (era implícito antes)
- Cliente: avatar sm + nombre/subtítulo (empresa o email)
- Estado: badge con dot (no Badge + Dot duplicados como ahora)
- Acción: "Abrir →" en gris, no botón completo

## Pagos

- KPIs en grid de **4** (no 3): añade "Tasa de cobro" como KPI accent
- **Segmented control** para 7d/30d/90d/all en lugar de botones-link
- Filas vencidas: bg `bg-red-50/30` muy sutil — funcional pero no agresivo
- Acciones por fila: botón icon `MoreH`, no menú completo

## Facturas

- Mismo patrón que Pagos
- KPIs: Por emitir / Emitidas mes / IVA / Total YTD (último accent)
- Columna `Nº` en mono `F-2026-0042`

## Control efectivo

- 2 cards iguales lado a lado (Ruzafa / Puerta del Mar)
- Cada una: nombre + subtítulo de timestamp + badge de estado (Cuadrada / Sin actualizar)
- Float grande tabular + Ingresos hoy alineado derecha
- Tabla de movimientos: Ingreso = badge success, Gasto = badge neutral, importe en verde si entra

## Vencimientos

- Split 50/50: Próximas (badge warning) / Vencidas (badge danger)
- Cada fila: avatar sm + nombre/plan + fecha + "en X días" / "hace X días"

## Altas y bajas

- KPIs 4 col: Altas (trend up) / Bajas (trend down) / Net new (accent) / Tasa churn
- Split listas

## Calendario

- Grid 7 col, gap 1px sobre fondo `bg-ink-200` para crear líneas finas
- Día actual: número en cuadrado negro con dorado
- Eventos: pill compacto, festivos en rojo claro

## Incidencias

- Filter: segmented control de estado
- Tabla con prioridad como badge danger/warning/neutral según severidad
- Estado como badge info

## Suscripciones

- Catálogo arriba: grid 4 col de plan-tile (label uppercase, precio grande, count abajo)
- Tabla activos abajo: Cliente / Plan / Asientos × N / Coworking / MRR/m / Estado

## Monitores y taquillas

- **Tabs segmented** (Taquillas / Monitores)
- **Grid 8 col** de cuadrados con aspect-ratio 1:1
- Asignados: `bg-ink-950 text-white` con ID en mono + primer nombre del cliente debajo
- Libres: borde + "libre" en gris
- Hover en libres → border `ink-400`

## Configuración

- Tabs segmented: Coworkings / Planes / Usuarios / Importar CSV
- Coworkings: 2 cards lado a lado con avatar grande dark + datos
- Planes: tabla con peso de ocupación y count activos
- Usuarios: tabla con badge de rol (gold para super_admin, info para manager, neutral para staff)
- Import: empty state grande con CTA

---

## Cliente individual (`/clients/[id]`)

> **Esta pantalla no está en el prototipo** — replica el sistema de las demás:
- Header: avatar lg + nombre + empresa + badge estado + acciones (Editar, Programar baja)
- Grid 3 col de KPIs personales: Total facturado / MRR actual / Cliente desde
- Tabs: Suscripciones / Pagos / Facturas / Notas
- Cada tab usa los componentes table / list-row del sistema
