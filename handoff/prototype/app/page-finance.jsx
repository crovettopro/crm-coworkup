/* Payments + Invoices + Cash + Renewals + Churn pages */

function PaymentsPage() {
  const M = window.MOCK;
  const I = window.I;
  const [range, setRange] = React.useState("7d");

  const overdueAmt = M.paymentRows.filter(p => p.status === "overdue").reduce((a,p) => a + (p.amount - p.paidAmount), 0);
  const pendingAmt = M.paymentRows.filter(p => p.status === "pending" || p.status === "partial").reduce((a,p) => a + (p.amount - p.paidAmount), 0);
  const paidAmt = M.paymentRows.filter(p => p.status === "paid").reduce((a,p) => a + p.paidAmount, 0);

  const TONE = { paid: "success", partial: "warning", overdue: "danger", pending: "warning" };
  const LABEL = { paid: "Pagado", partial: "Parcial", overdue: "Vencido", pending: "Pendiente" };
  const METHOD = { transfer: "Transferencia", card: "Tarjeta", cash: "Efectivo", stripe: "Stripe" };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Pagos</h1>
          <div className="page-sub">{M.paymentRows.length} pagos · últimos 7 días</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm"><I.Down size={13}/> Exportar</button>
          <button className="btn btn-primary btn-sm"><I.Plus size={13}/> Pago manual</button>
        </div>
      </div>

      <div className="kpi-grid" style={{marginBottom: 16}}>
        <div className="kpi">
          <div className="kpi-label"><I.AlertTri size={11}/> Impagos vencidos</div>
          <div className="kpi-value" style={{color: "var(--danger-fg)"}}>{window.fmtEur(overdueAmt)}</div>
          <div className="kpi-hint">Overdue + pending con fecha pasada</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Pendientes</div>
          <div className="kpi-value" style={{color: "var(--warning-fg)"}}>{window.fmtEur(pendingAmt)}</div>
          <div className="kpi-hint">A cobrar próximamente</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><I.Check size={11}/> Cobrado</div>
          <div className="kpi-value" style={{color: "var(--success-fg)"}}>{window.fmtEur(paidAmt)}</div>
          <div className="kpi-hint">últimos 7 días</div>
        </div>
        <div className="kpi accent">
          <div className="kpi-label">Tasa de cobro</div>
          <div className="kpi-value">94%</div>
          <div className="kpi-hint">vs. previstos</div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="seg">
          {["7d", "30d", "90d", "all"].map(k => (
            <button key={k} className={"seg-item " + (range === k ? "active" : "")} onClick={() => setRange(k)}>
              {k === "all" ? "Todo" : `Últimos ${k}`}
            </button>
          ))}
        </div>
        <input className="input input-search" placeholder="Buscar por concepto…" />
        <select className="input input-select"><option>Todos los estados</option></select>
        <button className="btn btn-outline btn-sm"><I.Filter size={13}/> Más filtros</button>
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Concepto</th>
              <th style={{textAlign: "right"}}>Importe</th>
              <th>Fecha</th>
              <th>Método</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {M.paymentRows.map(p => (
              <tr key={p.id} className={p.status === "overdue" ? "danger-row" : ""}>
                <td>
                  <div style={{display: "flex", alignItems: "center", gap: 10}}>
                    <div className="avatar sm">{window.initials(p.clientName)}</div>
                    <span className="cell-strong row-link">{p.clientName}</span>
                  </div>
                </td>
                <td><span className="cell-muted">{p.concept}</span></td>
                <td className="cell-num cell-strong">{window.fmtEur(p.amount)}</td>
                <td><span className="cell-muted">{window.fmtDate(p.paidAt || p.expectedDate)}</span></td>
                <td><span className="cell-muted">{METHOD[p.method]}</span></td>
                <td>
                  <span className={"badge badge-" + TONE[p.status]}>
                    <span className="badge-dot"/>{LABEL[p.status]}
                  </span>
                </td>
                <td style={{textAlign: "right"}}><button className="row-action"><I.MoreH size={14}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CashPage() {
  const M = window.MOCK;
  const I = window.I;
  const ruzafaIn = M.cash.movements.filter(m => m.coworking === "ruzafa" && m.amount > 0).reduce((a,m) => a + m.amount, 0);
  const puertaIn = M.cash.movements.filter(m => m.coworking === "puerta" && m.amount > 0).reduce((a,m) => a + m.amount, 0);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Control de efectivo</h1>
          <div className="page-sub">Float manual + cobros en cash + movimientos de caja</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm"><I.Edit size={13}/> Ajustar float</button>
          <button className="btn btn-primary btn-sm"><I.Plus size={13}/> Movimiento</button>
        </div>
      </div>

      <div className="split" style={{marginBottom: 16}}>
        <div className="card">
          <div className="card-pad">
            <div className="spaced" style={{marginBottom: 14}}>
              <div>
                <div className="card-title">Ruzafa</div>
                <div className="cell-muted" style={{marginTop: 2}}>Caja física · last update hoy 11:30</div>
              </div>
              <span className="badge badge-success"><span className="badge-dot"/>Cuadrada</span>
            </div>
            <div style={{display: "flex", alignItems: "baseline", gap: 14}}>
              <div>
                <div style={{fontSize: 11, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: "0.04em"}}>Float</div>
                <div style={{fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums"}}>{window.fmtEur2(M.cash.floatRuzafa)}</div>
              </div>
              <div style={{flex: 1}}/>
              <div style={{textAlign: "right"}}>
                <div style={{fontSize: 11, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: "0.04em"}}>Ingresos hoy</div>
                <div style={{fontSize: 18, fontWeight: 600, color: "var(--success-fg)", fontVariantNumeric: "tabular-nums"}}>+{window.fmtEur2(ruzafaIn)}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-pad">
            <div className="spaced" style={{marginBottom: 14}}>
              <div>
                <div className="card-title">Puerta del Mar</div>
                <div className="cell-muted" style={{marginTop: 2}}>Caja física · last update ayer 19:00</div>
              </div>
              <span className="badge badge-warning"><span className="badge-dot"/>Sin actualizar 18h</span>
            </div>
            <div style={{display: "flex", alignItems: "baseline", gap: 14}}>
              <div>
                <div style={{fontSize: 11, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: "0.04em"}}>Float</div>
                <div style={{fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums"}}>{window.fmtEur2(M.cash.floatPuerta)}</div>
              </div>
              <div style={{flex: 1}}/>
              <div style={{textAlign: "right"}}>
                <div style={{fontSize: 11, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: "0.04em"}}>Ingresos hoy</div>
                <div style={{fontSize: 18, fontWeight: 600, color: "var(--success-fg)", fontVariantNumeric: "tabular-nums"}}>+{window.fmtEur2(puertaIn)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Movimientos recientes</div>
          <a className="card-link">Ver historial completo →</a>
        </div>
        <table className="tbl">
          <thead><tr><th>Fecha</th><th>Coworking</th><th>Concepto</th><th>Tipo</th><th style={{textAlign:"right"}}>Importe</th></tr></thead>
          <tbody>
            {M.cash.movements.map((m, i) => (
              <tr key={i}>
                <td><span className="cell-muted cell-mono">{window.fmtDate(m.date)}</span></td>
                <td><span className="cell-muted">{M.coworkings.find(c=>c.id===m.coworking)?.name}</span></td>
                <td><span className="cell-strong">{m.concept}</span></td>
                <td>
                  {m.type === "in"
                    ? <span className="badge badge-success"><span className="badge-dot"/>Ingreso</span>
                    : <span className="badge badge-neutral"><span className="badge-dot"/>Gasto</span>}
                </td>
                <td className="cell-num cell-strong" style={{color: m.amount > 0 ? "var(--success-fg)" : "var(--ink-900)"}}>
                  {m.amount > 0 ? "+" : ""}{window.fmtEur2(m.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RenewalsPage() {
  const M = window.MOCK;
  const I = window.I;
  const upcoming = M.renewals.filter(r => r.daysToEnd >= 0).sort((a,b) => a.daysToEnd - b.daysToEnd);
  const overdue = M.renewals.filter(r => r.daysToEnd < 0).sort((a,b) => b.daysToEnd - a.daysToEnd);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Vencimientos</h1>
          <div className="page-sub">Suscripciones que renuevan en los próximos 30 días</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm"><I.Mail size={13}/> Enviar recordatorios</button>
        </div>
      </div>

      <div className="split">
        <div className="card">
          <div className="card-head">
            <div className="card-title"><I.AlarmClock/> Próximas (30d)</div>
            <span className="badge badge-warning">{upcoming.length}</span>
          </div>
          <div className="card-body dense">
            {upcoming.map(r => (
              <div className="list-row" key={r.clientId}>
                <div style={{display: "flex", alignItems: "center", gap: 10}}>
                  <div className="avatar sm">{window.initials(r.name)}</div>
                  <div>
                    <div className="list-row-name">{r.name}</div>
                    <div style={{fontSize: 11, color: "var(--ink-500)"}}>{r.plan}</div>
                  </div>
                </div>
                <div style={{textAlign: "right"}}>
                  <div className="list-row-amt">{window.fmtDate(r.endDate)}</div>
                  <div style={{fontSize: 11, color: "var(--ink-500)"}}>en {r.daysToEnd} días</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <div className="card-title"><I.AlertTri/> Vencidas (últimos 7d)</div>
            <span className="badge badge-danger">{overdue.length}</span>
          </div>
          <div className="card-body dense">
            {overdue.length === 0 ? (
              <div style={{padding: "32px 0", textAlign: "center"}}>
                <div style={{fontSize: 13, color: "var(--ink-500)"}}>Sin vencidas — todo al día</div>
              </div>
            ) : overdue.map(r => (
              <div className="list-row" key={r.clientId}>
                <div style={{display: "flex", alignItems: "center", gap: 10}}>
                  <div className="avatar sm">{window.initials(r.name)}</div>
                  <div>
                    <div className="list-row-name">{r.name}</div>
                    <div style={{fontSize: 11, color: "var(--ink-500)"}}>{r.plan}</div>
                  </div>
                </div>
                <div style={{textAlign: "right"}}>
                  <div className="list-row-amt" style={{color: "var(--danger-fg)"}}>{window.fmtDate(r.endDate)}</div>
                  <div style={{fontSize: 11, color: "var(--danger-fg)"}}>hace {-r.daysToEnd} días</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InvoicesPage() {
  const M = window.MOCK;
  const I = window.I;
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Facturas</h1>
          <div className="page-sub">Vinculadas a pagos · estado emisión</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm"><I.Down size={13}/> Exportar PDF</button>
          <button className="btn btn-primary btn-sm"><I.Plus size={13}/> Nueva factura</button>
        </div>
      </div>

      <div className="kpi-grid" style={{marginBottom: 16}}>
        <div className="kpi"><div className="kpi-label">Por emitir</div><div className="kpi-value">14</div><div className="kpi-hint">Pagos cobrados sin factura</div></div>
        <div className="kpi"><div className="kpi-label">Emitidas este mes</div><div className="kpi-value">42</div><div className="kpi-hint">Total {window.fmtEur(18430)}</div></div>
        <div className="kpi"><div className="kpi-label">IVA repercutido</div><div className="kpi-value">{window.fmtEur(3198)}</div><div className="kpi-hint">21% sobre emitidas</div></div>
        <div className="kpi accent"><div className="kpi-label">Total YTD</div><div className="kpi-value">{window.fmtEur(72840)}</div><div className="kpi-hint">156 facturas</div></div>
      </div>

      <div className="filter-bar">
        <div className="seg">
          <button className="seg-item active">Todas</button>
          <button className="seg-item">Por emitir</button>
          <button className="seg-item">Emitidas</button>
        </div>
        <input className="input input-search" placeholder="Buscar por nº factura, cliente…" />
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr><th>Nº</th><th>Cliente</th><th>Concepto</th><th style={{textAlign:"right"}}>Importe</th><th style={{textAlign:"right"}}>IVA</th><th>Fecha</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            {M.paymentRows.slice(0,10).map((p, i) => (
              <tr key={p.id}>
                <td><span className="cell-mono cell-strong">F-{2026}-{String(i+42).padStart(4, "0")}</span></td>
                <td><span className="cell-strong">{p.clientName}</span></td>
                <td><span className="cell-muted">{p.concept}</span></td>
                <td className="cell-num cell-strong">{window.fmtEur2(p.amount * 0.83)}</td>
                <td className="cell-num"><span className="cell-muted">{window.fmtEur2(p.amount * 0.17)}</span></td>
                <td><span className="cell-muted">{window.fmtDate(p.expectedDate)}</span></td>
                <td>{i < 4
                    ? <span className="badge badge-warning"><span className="badge-dot"/>Por emitir</span>
                    : <span className="badge badge-success"><span className="badge-dot"/>Emitida</span>}</td>
                <td style={{textAlign:"right"}}><button className="row-action"><I.MoreH size={14}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChurnPage() {
  const M = window.MOCK;
  const I = window.I;
  const altas = [
    { name: "Helena Torres", plan: "Flexible", date: "2026-04-22" },
    { name: "Polaris Studio", plan: "Oficina privada", date: "2026-04-18" },
    { name: "Marc Vidal", plan: "20 horas", date: "2026-04-15" },
    { name: "Aitana Roca", plan: "Fijo", date: "2026-04-08" },
  ];
  const bajas = [
    { name: "Joan Pastor", plan: "Flexible", reason: "Cambio de ciudad", date: "2026-04-21" },
    { name: "Studio Norte", plan: "Oficina privada", reason: "Coste", date: "2026-04-14" },
  ];
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Altas y bajas</h1>
          <div className="page-sub">{M.monthLabel} · regla de gracia 7 días</div>
        </div>
      </div>

      <div className="kpi-grid" style={{marginBottom: 16}}>
        <div className="kpi"><div className="kpi-label">Altas este mes</div><div className="kpi-value">{altas.length}<span className="kpi-trend up"><I.TrendUp size={10}/>+1</span></div><div className="kpi-hint">vs. mes anterior</div></div>
        <div className="kpi"><div className="kpi-label">Bajas este mes</div><div className="kpi-value">{bajas.length}<span className="kpi-trend down"><I.TrendDown size={10}/>-2</span></div><div className="kpi-hint">vs. mes anterior</div></div>
        <div className="kpi accent"><div className="kpi-label">Net new</div><div className="kpi-value">+{altas.length - bajas.length}</div><div className="kpi-hint">crecimiento neto</div></div>
        <div className="kpi"><div className="kpi-label">Tasa de churn</div><div className="kpi-value">3.2%</div><div className="kpi-hint">mensual</div></div>
      </div>

      <div className="split">
        <div className="card">
          <div className="card-head"><div className="card-title"><I.ArrowUp/> Altas</div><span className="badge badge-success">{altas.length}</span></div>
          <div className="card-body dense">
            {altas.map((a, i) => (
              <div className="list-row" key={i}>
                <div style={{display: "flex", alignItems: "center", gap: 10}}>
                  <div className="avatar sm">{window.initials(a.name)}</div>
                  <div>
                    <div className="list-row-name">{a.name}</div>
                    <div style={{fontSize: 11, color: "var(--ink-500)"}}>{a.plan}</div>
                  </div>
                </div>
                <span className="cell-muted">{window.fmtDate(a.date)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title"><I.ArrowDown/> Bajas</div><span className="badge badge-danger">{bajas.length}</span></div>
          <div className="card-body dense">
            {bajas.map((b, i) => (
              <div className="list-row" key={i}>
                <div style={{display: "flex", alignItems: "center", gap: 10}}>
                  <div className="avatar sm">{window.initials(b.name)}</div>
                  <div>
                    <div className="list-row-name">{b.name}</div>
                    <div style={{fontSize: 11, color: "var(--ink-500)"}}>{b.plan} · {b.reason}</div>
                  </div>
                </div>
                <span className="cell-muted">{window.fmtDate(b.date)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.PaymentsPage = PaymentsPage;
window.CashPage = CashPage;
window.RenewalsPage = RenewalsPage;
window.InvoicesPage = InvoicesPage;
window.ChurnPage = ChurnPage;
