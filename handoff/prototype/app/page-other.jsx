/* Subscriptions, Calendar, Incidents, Extras (lockers/monitors), Settings, Client detail */

function SubscriptionsPage() {
  const M = window.MOCK;
  const I = window.I;
  const subs = M.subsActive.slice(0, 14);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Suscripciones</h1>
          <div className="page-sub">{M.subsActive.length} activas · {M.subsByPlan.length} planes</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm">Editar catálogo</button>
          <button className="btn btn-primary btn-sm"><I.Plus size={13}/> Nueva suscripción</button>
        </div>
      </div>

      <div className="card" style={{marginBottom: 16}}>
        <div className="card-head"><div className="card-title">Catálogo de planes</div><a className="card-link">Editar →</a></div>
        <div className="card-body">
          <div className="plan-grid" style={{gridTemplateColumns: "repeat(4, 1fr)"}}>
            {M.plans.filter(p => !p.casual).map(p => (
              <div className="plan-tile" key={p.id}>
                <div className="plan-tile-label">{p.name}</div>
                <div style={{display: "flex", alignItems: "baseline", gap: 4, marginTop: 4}}>
                  <span style={{fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums"}}>{window.fmtEur(p.price)}</span>
                  <span style={{fontSize: 11, color: "var(--ink-500)"}}>/mes</span>
                </div>
                <div className="plan-tile-meta">
                  {M.subsByPlan.find(s => s.plan === p.name)?.count ?? 0} activos
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Cliente</th><th>Plan</th><th>Asientos</th><th>Coworking</th><th style={{textAlign:"right"}}>Precio</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {subs.map(s => (
              <tr key={s.clientId}>
                <td><div style={{display:"flex",alignItems:"center",gap:10}}><div className="avatar sm">{window.initials(s.name)}</div><span className="cell-strong row-link">{s.name}</span></div></td>
                <td>{s.plan}</td>
                <td><span className="cell-mono">× {s.seats}</span></td>
                <td><span className="cell-muted">{M.coworkings.find(c=>c.id===s.coworkingId)?.name}</span></td>
                <td className="cell-num cell-strong">{window.fmtEur(s.mrr)}/m</td>
                <td><span className="badge badge-success"><span className="badge-dot"/>Activa</span></td>
                <td style={{textAlign:"right"}}><button className="row-action">Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CalendarPage() {
  const M = window.MOCK;
  const I = window.I;
  const today = 26; // April
  // Build a month grid for April 2026 (starts on Wednesday-ish)
  const startOffset = 2; // Mon-start, April 1 2026 is Wednesday → offset 2
  const cells = Array.from({length: 35}, (_, i) => {
    const dayNum = i - startOffset + 1;
    const inMonth = dayNum >= 1 && dayNum <= 30;
    const dateStr = inMonth ? `2026-04-${String(dayNum).padStart(2,"0")}` : null;
    const ev = inMonth ? M.events.filter(e => e.date === dateStr) : [];
    return { dayNum, inMonth, isToday: dayNum === today, events: ev };
  });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Calendario</h1>
          <div className="page-sub">Abril 2026 · eventos del coworking + festivos de Valencia</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm btn-icon"><I.ChevL size={13}/></button>
          <button className="btn btn-outline btn-sm">Hoy</button>
          <button className="btn btn-outline btn-sm btn-icon"><I.ChevR size={13}/></button>
          <button className="btn btn-primary btn-sm"><I.Plus size={13}/> Evento</button>
        </div>
      </div>

      <div className="cal-grid">
        {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(d => <div key={d} className="cal-head">{d}</div>)}
        {cells.map((c, i) => (
          <div key={i} className={"cal-cell " + (!c.inMonth ? "muted " : "") + (c.isToday ? "today" : "")}>
            {c.inMonth && <span className="cal-day-num">{c.dayNum}</span>}
            {c.events.map((e, j) => (
              <div key={j} className={"cal-event " + (e.kind === "holiday" ? "holiday" : c.isToday ? "gold" : "")}>{e.title}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function IncidentsPage() {
  const M = window.MOCK;
  const I = window.I;
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Incidencias</h1>
          <div className="page-sub">{M.incidents.length} abiertas · 1 urgente · 1 con proveedor</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary btn-sm"><I.Plus size={13}/> Nueva incidencia</button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="seg">
          <button className="seg-item active">Abiertas</button>
          <button className="seg-item">En curso</button>
          <button className="seg-item">Resueltas</button>
          <button className="seg-item">Todas</button>
        </div>
        <input className="input input-search" placeholder="Buscar incidencia…" />
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Título</th><th>Coworking</th><th>Prioridad</th><th>Estado</th><th>Creada</th><th></th></tr></thead>
          <tbody>
            {M.incidents.map(i => (
              <tr key={i.id}>
                <td><span className="cell-strong row-link">{i.title}</span></td>
                <td><span className="cell-muted">{M.coworkings.find(c=>c.id===i.coworking)?.name}</span></td>
                <td>
                  <span className={"badge badge-" + (i.priority === "urgent" || i.priority === "high" ? "danger" : i.priority === "medium" ? "warning" : "neutral")}>
                    <span className="badge-dot"/>{i.priority}
                  </span>
                </td>
                <td><span className="badge badge-info">{i.status.replace("_", " ")}</span></td>
                <td><span className="cell-muted">{window.fmtDate(i.created)}</span></td>
                <td style={{textAlign:"right"}}><button className="row-action">Abrir →</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExtrasPage() {
  const M = window.MOCK;
  const I = window.I;
  const [tab, setTab] = React.useState("lockers");
  const items = tab === "lockers" ? M.lockers : M.monitors;
  const assignedCount = items.filter(x => x.assignedTo).length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Monitores y taquillas</h1>
          <div className="page-sub">Asigna inventario a clientes haciendo clic</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm"><I.Plus size={13}/> Añadir</button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="seg">
          <button className={"seg-item " + (tab === "lockers" ? "active" : "")} onClick={() => setTab("lockers")}>Taquillas ({M.lockers.length})</button>
          <button className={"seg-item " + (tab === "monitors" ? "active" : "")} onClick={() => setTab("monitors")}>Monitores ({M.monitors.length})</button>
        </div>
        <span className="cell-muted" style={{marginLeft: 8}}>{assignedCount} asignados · {items.length - assignedCount} libres</span>
      </div>

      <div className="card">
        <div className="card-pad">
          <div className="locker-grid">
            {items.map(it => (
              <div key={it.id} className={"locker " + (it.assignedTo ? "assigned" : "")}>
                <div className="locker-id">{it.id}</div>
                {it.assignedTo
                  ? <div className="locker-name">{it.assignedTo.split(" ")[0]}</div>
                  : <div className="locker-name" style={{opacity: 0.6}}>libre</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsPage() {
  const M = window.MOCK;
  const I = window.I;
  const [tab, setTab] = React.useState("coworkings");

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Configuración</h1>
          <div className="page-sub">Coworkings, planes, usuarios e importación CSV</div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="seg">
          {[["coworkings","Coworkings"],["plans","Planes"],["users","Usuarios"],["import","Importar CSV"]].map(([k,l]) => (
            <button key={k} className={"seg-item " + (tab === k ? "active" : "")} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
      </div>

      {tab === "coworkings" && (
        <div className="split">
          {M.coworkings.map(cw => (
            <div className="card" key={cw.id}>
              <div className="card-pad">
                <div className="spaced" style={{marginBottom: 12}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div className="avatar lg dark">{cw.short}</div>
                    <div>
                      <div style={{fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em"}}>{cw.name}</div>
                      <div className="cell-muted">Valencia · capacidad {cw.capacity} plazas</div>
                    </div>
                  </div>
                  <button className="btn btn-outline btn-sm"><I.Edit size={13}/></button>
                </div>
                <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12}}>
                  <div><span className="cell-muted">Manager</span><div className="cell-strong" style={{marginTop: 2}}>{cw.id === "ruzafa" ? "Sara Mompó" : "Bruna Soler"}</div></div>
                  <div><span className="cell-muted">Dirección</span><div className="cell-strong" style={{marginTop: 2}}>{cw.id === "ruzafa" ? "C/ Cuba, 44" : "C/ La Paz, 12"}</div></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "plans" && (
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Plan</th><th style={{textAlign:"right"}}>Precio</th><th>Peso ocupación</th><th>Activos</th><th></th></tr></thead>
            <tbody>
              {M.plans.map(p => (
                <tr key={p.id}>
                  <td><span className="cell-strong">{p.name}</span></td>
                  <td className="cell-num">{window.fmtEur(p.price)}</td>
                  <td>{p.weight === 0 ? <span className="cell-muted">no ocupa</span> : `${Math.round(p.weight*100)}%`}</td>
                  <td>{M.subsByPlan.find(s => s.plan === p.name)?.count ?? 0}</td>
                  <td style={{textAlign:"right"}}><button className="row-action">Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "users" && (
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Coworking</th><th></th></tr></thead>
            <tbody>
              {[
                ["Carlos Rovetto","carlos@coworkup.com","super_admin","—"],
                ["Sara Mompó","sara@coworkup.com","manager","Ruzafa"],
                ["Bruna Soler","bruna@coworkup.com","manager","Puerta del Mar"],
                ["Marc Vidal","marc@coworkup.com","staff","Ruzafa"],
              ].map((u, i) => (
                <tr key={i}>
                  <td><div style={{display:"flex",alignItems:"center",gap:10}}><div className="avatar sm">{window.initials(u[0])}</div><span className="cell-strong">{u[0]}</span></div></td>
                  <td><span className="cell-muted">{u[1]}</span></td>
                  <td><span className={"badge " + (u[2] === "super_admin" ? "badge-gold" : u[2] === "manager" ? "badge-info" : "badge-neutral")}>{u[2]}</span></td>
                  <td><span className="cell-muted">{u[3]}</span></td>
                  <td style={{textAlign:"right"}}><button className="row-action">Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "import" && (
        <div className="empty">
          <div className="empty-title">Importar clientes desde CSV</div>
          <div className="empty-sub">Sube un archivo .csv para hacer una importación masiva (idempotente)</div>
          <div style={{marginTop: 14}}><button className="btn btn-primary btn-sm"><I.Down size={13}/> Subir archivo</button></div>
        </div>
      )}
    </div>
  );
}

window.SubscriptionsPage = SubscriptionsPage;
window.CalendarPage = CalendarPage;
window.IncidentsPage = IncidentsPage;
window.ExtrasPage = ExtrasPage;
window.SettingsPage = SettingsPage;
