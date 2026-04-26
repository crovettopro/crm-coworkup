/* Dashboard page */

function Dashboard() {
  const M = window.MOCK;
  const I = window.I;
  const maxSales = Math.max(...M.salesPoints.map(p => p.value));
  const objectiveTarget = 18000;
  const objectivePct = Math.min(100, Math.round((M.collectedGross / objectiveTarget) * 100));
  const occPct = Math.round((M.occupiedSeats / M.totalCapacity) * 100);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Resumen</h1>
          <div className="page-sub">{M.monthLabel} · todos los coworkings · cifras con IVA</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm"><I.Down size={13}/> Exportar</button>
          <button className="btn btn-outline btn-sm"><I.Cal size={13}/> {M.monthLabel}</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{marginBottom: 16}}>
        <div className="kpi accent">
          <div className="kpi-label"><I.ArrowUp size={11}/> ARR 2026 (YTD)</div>
          <div className="kpi-value">{window.fmtEur(M.arrYTD)}<span className="kpi-trend up"><I.TrendUp size={10}/>+12.4%</span></div>
          <div className="kpi-hint">vs. mismo periodo 2025</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><I.Wallet size={11}/> Cobrado este mes</div>
          <div className="kpi-value">{window.fmtEur(M.collectedGross)}</div>
          <div className="kpi-hint">de {window.fmtEur(M.expectedGross)} previstos</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><I.AlertTri size={11}/> Impagos vencidos</div>
          <div className="kpi-value">{window.fmtEur(M.overdueAmount)}</div>
          <div className="kpi-hint">3 pagos · revisar</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><I.Wrench size={11}/> Incidencias abiertas</div>
          <div className="kpi-value">{M.incidents.length}</div>
          <div className="kpi-hint">1 urgente · 1 alta</div>
        </div>
      </div>

      {/* Objective + Occupation + Today passes */}
      <div style={{display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 16, marginBottom: 16}}>
        <div className="card">
          <div className="card-pad">
            <div className="spaced" style={{marginBottom: 12}}>
              <div className="card-title"><I.Trophy/> Objetivo {M.monthLabel}</div>
              <button className="row-action">Editar</button>
            </div>
            <div style={{display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8}}>
              <div style={{fontSize: 28, fontWeight: 600, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums"}}>
                {window.fmtEur(M.collectedGross)}
              </div>
              <div style={{fontSize: 13, color: "var(--ink-500)"}}>
                / {window.fmtEur(objectiveTarget)} <span style={{color: "var(--ink-700)", fontWeight: 500}}>· {objectivePct}%</span>
              </div>
            </div>
            <div className="progress gold"><span style={{width: objectivePct + "%"}}/></div>
            <div style={{display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11.5, color: "var(--ink-500)"}}>
              <span>{window.fmtEur(objectiveTarget - M.collectedGross)} para alcanzar el objetivo</span>
              <span>9 días restantes</span>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-pad">
            <div className="card-title" style={{marginBottom: 12}}><I.Bldg/> Ocupación</div>
            <div style={{display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8}}>
              <div style={{fontSize: 28, fontWeight: 600, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums"}}>{occPct}%</div>
              <div style={{fontSize: 12, color: "var(--ink-500)"}}>{M.coworkers} coworkers · {M.totalCapacity} plazas</div>
            </div>
            <div className="progress"><span style={{width: occPct + "%"}}/></div>
            <div style={{display: "flex", gap: 14, marginTop: 10, fontSize: 11.5, color: "var(--ink-500)"}}>
              <div><span className="badge-dot" style={{background: "var(--ink-700)", display: "inline-block", width: 6, height: 6, borderRadius: "50%", marginRight: 5}}/>Ruzafa 28/42</div>
              <div><span className="badge-dot" style={{background: "var(--gold-500)", display: "inline-block", width: 6, height: 6, borderRadius: "50%", marginRight: 5}}/>Pta del Mar 22/36</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-pad">
            <div className="card-title" style={{marginBottom: 12}}><I.Activity/> Pases hoy</div>
            <div style={{fontSize: 28, fontWeight: 600, letterSpacing: "-0.025em"}}>{M.todayPasses.length}</div>
            <div style={{fontSize: 12, color: "var(--ink-500)", marginBottom: 10}}>Pases puntuales activos</div>
            <div style={{borderTop: "1px solid var(--line)", paddingTop: 8}}>
              {M.todayPasses.slice(0,3).map((p,i) => (
                <div key={i} style={{display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0", color: "var(--ink-700)"}}>
                  <span>{p.client}</span>
                  <span style={{color: "var(--ink-950)", fontWeight: 500, fontVariantNumeric: "tabular-nums"}}>{window.fmtEur(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sales chart + Top clients */}
      <div style={{display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16}}>
        <div className="card">
          <div className="card-head">
            <div className="card-title"><I.TrendUp/> Ventas últimos 12 meses</div>
            <a className="card-link">Ver pagos →</a>
          </div>
          <div className="card-body">
            <div style={{display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4}}>
              <div style={{fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums"}}>
                {window.fmtEur(M.salesPoints.reduce((a,p)=>a+p.value,0))}
              </div>
              <span className="kpi-trend up"><I.TrendUp size={10}/>+8.7% vs. periodo previo</span>
            </div>
            <div className="chart">
              {M.salesPoints.map((p, i) => (
                <div className="chart-col" key={p.key}>
                  <div className="chart-tip">{window.fmtEur(p.value)}</div>
                  <div
                    className={"chart-bar " + (i === M.salesPoints.length - 1 ? "current" : "")}
                    style={{height: ((p.value / maxSales) * 86) + "%"}}
                  />
                  <div className="chart-label">{p.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title"><I.Trophy/> Top clientes (12m)</div>
          </div>
          <div className="card-body dense">
            {M.topClients.slice(0,6).map((c, i) => (
              <div className="list-row" key={c.id}>
                <div style={{display: "flex", alignItems: "center", gap: 10}}>
                  <span className="list-row-rank">{String(i+1).padStart(2, "0")}</span>
                  <div className={"avatar sm " + (i === 0 ? "gold" : "")}>{window.initials(c.name)}</div>
                  <span className="list-row-name">{c.name}</span>
                </div>
                <span className="list-row-amt">{window.fmtEur(c.total12m)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subs by plan + activity */}
      <div style={{display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16}}>
        <div className="card">
          <div className="card-head">
            <div className="card-title"><I.List/> Suscripciones activas por tipo</div>
            <a className="card-link">Catálogo →</a>
          </div>
          <div className="card-body">
            <div className="plan-grid">
              {M.subsByPlan.map(s => (
                <div className="plan-tile" key={s.plan}>
                  <div className="plan-tile-label">{s.plan}</div>
                  <div className="plan-tile-count">{s.count}</div>
                  <div className="plan-tile-meta">
                    {s.weight === 0 ? "no ocupa plaza" : `peso ${Math.round(s.weight*100)}%`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title"><I.Activity/> Detalle pases hoy</div>
          </div>
          <div className="card-body dense">
            {M.todayPasses.map((p,i) => (
              <div className="list-row" key={i}>
                <div style={{display: "flex", alignItems: "center", gap: 10}}>
                  <div className="avatar sm">{window.initials(p.client)}</div>
                  <div>
                    <div className="list-row-name">{p.client}</div>
                    <div style={{fontSize: 11, color: "var(--ink-500)"}}>{p.plan}</div>
                  </div>
                </div>
                <span className="list-row-amt">{window.fmtEur(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: Pending + Incidents */}
      <div className="split">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Pendientes de cobro</div>
            <a className="card-link">Ver todos →</a>
          </div>
          <div className="card-body dense">
            {M.paymentRows.filter(p => p.status === "overdue" || p.status === "pending").slice(0,5).map(p => (
              <div className="list-row" key={p.id}>
                <div style={{display: "flex", alignItems: "center", gap: 10}}>
                  <span className={"badge " + (p.status === "overdue" ? "badge-danger" : "badge-warning")}>
                    <span className="badge-dot"/>{p.status === "overdue" ? "Vencido" : "Pendiente"}
                  </span>
                  <span className="list-row-name">{p.clientName}</span>
                  <span style={{fontSize: 11.5, color: "var(--ink-500)"}}>vence {window.fmtDate(p.expectedDate)}</span>
                </div>
                <span className="list-row-amt">{window.fmtEur(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Incidencias abiertas</div>
            <a className="card-link">Ver todas →</a>
          </div>
          <div className="card-body dense">
            {M.incidents.map(i => (
              <div className="list-row" key={i.id}>
                <div style={{display: "flex", alignItems: "center", gap: 10}}>
                  <span className={"badge " + (
                    i.priority === "urgent" || i.priority === "high" ? "badge-danger" :
                    i.priority === "medium" ? "badge-warning" : "badge-neutral"
                  )}>
                    <span className="badge-dot"/>{i.priority}
                  </span>
                  <span className="list-row-name" style={{fontWeight: 400}}>{i.title}</span>
                </div>
                <span className="badge badge-neutral">{i.status.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.Dashboard = Dashboard;
