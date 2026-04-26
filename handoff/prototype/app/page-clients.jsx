/* Clients page */

const STATUS = {
  active:   { tone: "success", label: "Activo" },
  overdue:  { tone: "danger", label: "Impago" },
  pending:  { tone: "warning", label: "Pendiente" },
  casual:   { tone: "gold", label: "Casual" },
  inactive: { tone: "neutral", label: "Baja" },
};

function ClientsPage() {
  const M = window.MOCK;
  const I = window.I;
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");

  const rows = M.clients.filter(c => {
    if (search && !(c.name + " " + (c.company||"") + c.email).toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    if (typeFilter && c.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Clientes</h1>
          <div className="page-sub">{rows.length} {rows.length === 1 ? "cliente" : "clientes"} · {M.clients.filter(c=>c.status==="active").length} activos</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm"><I.Down size={13}/> Importar CSV</button>
          <button className="btn btn-primary btn-sm"><I.Plus size={13}/> Nuevo cliente</button>
        </div>
      </div>

      <div className="filter-bar">
        <input className="input input-search" placeholder="Buscar por nombre, empresa o email…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input input-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="input input-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="individual">Individual</option>
          <option value="company">Empresa</option>
        </select>
        {(search || statusFilter || typeFilter) && (
          <button className="btn btn-ghost btn-sm" onClick={() => {setSearch(""); setStatusFilter(""); setTypeFilter("");}}>Limpiar</button>
        )}
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Plan</th>
              <th>Coworking</th>
              <th>Último pago</th>
              <th>MRR</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 14).map(c => {
              const cw = M.coworkings.find(x => x.id === c.coworkingId);
              const st = STATUS[c.status];
              return (
                <tr key={c.id}>
                  <td>
                    <div style={{display: "flex", alignItems: "center", gap: 10}}>
                      <div className="avatar sm">{window.initials(c.name)}</div>
                      <div>
                        <div className="cell-strong row-link">{c.name}</div>
                        <div className="cell-muted">{c.company || c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="cell-muted">{c.type === "company" ? "Empresa" : "Individual"}</span></td>
                  <td>{c.planName ? <span style={{fontSize: 12.5}}>{c.planName}{c.seats > 1 ? ` × ${c.seats}` : ""}</span> : <span className="cell-muted">—</span>}</td>
                  <td><span className="cell-muted">{cw?.name}</span></td>
                  <td><span className="cell-muted">{window.fmtDate(c.lastPaidAt)}</span></td>
                  <td className="cell-num">{c.mrr ? window.fmtEur(c.mrr) : <span className="cell-muted">—</span>}</td>
                  <td>
                    <span className={"badge badge-" + st.tone}>
                      <span className="badge-dot"/>{st.label}
                    </span>
                  </td>
                  <td style={{textAlign: "right"}}>
                    <button className="row-action">Abrir →</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <span>Mostrando 1–14 de {rows.length}</span>
        <div style={{display: "flex", gap: 4}}>
          <button className="btn btn-outline btn-sm"><I.ChevL size={12}/> Anterior</button>
          <button className="btn btn-outline btn-sm">Siguiente <I.ChevR size={12}/></button>
        </div>
      </div>
    </div>
  );
}

window.ClientsPage = ClientsPage;
