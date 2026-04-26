/* Sidebar + Topbar */

const NAV_GROUPS = [
  {
    label: "General",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "Dashboard" },
    ],
  },
  {
    label: "Operativa",
    items: [
      { id: "clients", label: "Clientes", icon: "Users", badge: "30" },
      { id: "subscriptions", label: "Suscripciones", icon: "List" },
      { id: "renewals", label: "Vencimientos", icon: "AlarmClock", badge: "8" },
      { id: "calendar", label: "Calendario", icon: "Cal" },
      { id: "incidents", label: "Incidencias", icon: "Wrench", badge: "5" },
    ],
  },
  {
    label: "Finanzas",
    items: [
      { id: "payments", label: "Pagos", icon: "Card" },
      { id: "invoices", label: "Facturas", icon: "File" },
      { id: "cash", label: "Control efectivo", icon: "Wallet" },
      { id: "churn", label: "Altas y bajas", icon: "UserMinus" },
    ],
  },
  {
    label: "Espacio",
    items: [
      { id: "extras", label: "Monitores y taquillas", icon: "Box" },
      { id: "settings", label: "Configuración", icon: "Cog" },
    ],
  },
];

function Sidebar({ current, onNav }) {
  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <div className="sb-logo">cu</div>
        <div className="sb-brand-text">
          <div className="sb-brand-name">Cowork Up</div>
          <div className="sb-brand-sub">CRM · Valencia</div>
        </div>
      </div>

      <div style={{flex: 1, overflowY: "auto", paddingBottom: 8}}>
        {NAV_GROUPS.map((g, gi) => (
          <div className="sb-section" key={gi}>
            <div className="sb-section-label">{g.label}</div>
            {g.items.map(item => {
              const Icon = window.I[item.icon];
              const active = current === item.id;
              return (
                <button
                  key={item.id}
                  className={"sb-item " + (active ? "active" : "")}
                  onClick={() => onNav(item.id)}
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                  {item.badge && <span className="sb-item-badge">{item.badge}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="sb-user">
        <div className="sb-user-card">
          <div className="sb-avatar">CR</div>
          <div className="sb-user-info">
            <div className="sb-user-name">Carlos Rovetto</div>
            <div className="sb-user-role">super_admin</div>
          </div>
          <window.I.LogOut size={14} className="" />
        </div>
      </div>
    </aside>
  );
}

const PAGE_TITLES = {
  dashboard: ["Dashboard"],
  clients: ["Operativa", "Clientes"],
  subscriptions: ["Operativa", "Suscripciones"],
  renewals: ["Operativa", "Vencimientos"],
  calendar: ["Operativa", "Calendario"],
  incidents: ["Operativa", "Incidencias"],
  payments: ["Finanzas", "Pagos"],
  invoices: ["Finanzas", "Facturas"],
  cash: ["Finanzas", "Control efectivo"],
  churn: ["Finanzas", "Altas y bajas"],
  extras: ["Espacio", "Monitores y taquillas"],
  settings: ["Espacio", "Configuración"],
};

function Topbar({ current, coworking, setCoworking }) {
  const crumbs = PAGE_TITLES[current] || ["Dashboard"];
  const cw = window.MOCK.coworkings.find(c => c.id === coworking);
  const allLabel = "Todos los coworkings";

  return (
    <div className="topbar">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="crumb-sep">/</span>}
            <span className={i === crumbs.length - 1 ? "crumb-current" : "crumb"}>{c}</span>
          </React.Fragment>
        ))}
      </div>

      <div className="tb-spacer" />

      <div className="tb-search">
        <window.I.Search size={13} />
        <span>Buscar clientes, pagos…</span>
        <span className="tb-kbd">⌘K</span>
      </div>

      <button className="tb-cw-select" onClick={() => {
        const opts = ["all", ...window.MOCK.coworkings.map(c => c.id)];
        const idx = opts.indexOf(coworking);
        setCoworking(opts[(idx + 1) % opts.length]);
      }}>
        <span className="tb-cw-dot"></span>
        <span>{coworking === "all" ? allLabel : cw?.name}</span>
        <window.I.ChevD size={13} />
      </button>

      <button className="tb-icon-btn">
        <window.I.Bell size={14} />
        <span className="dot" />
      </button>

      <button className="btn btn-primary btn-sm">
        <window.I.Plus size={13} /> Nuevo
      </button>
    </div>
  );
}

window.Sidebar = Sidebar;
window.Topbar = Topbar;
