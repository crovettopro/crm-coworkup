// Mock data plausible para Cowork Up — refleja la estructura real del schema Supabase
// (clients, subscriptions, payments, invoices, incidents, plans, coworkings)

window.MOCK = (() => {
  const COWORKINGS = [
    { id: "ruzafa", name: "Ruzafa", short: "RZF", capacity: 42 },
    { id: "puerta", name: "Puerta del Mar", short: "PDM", capacity: 36 },
  ];

  const PLANS = [
    { id: "p1", name: "Fijo", price: 220, weight: 1.0 },
    { id: "p2", name: "Flexible", price: 160, weight: 0.8 },
    { id: "p3", name: "20 horas", price: 95, weight: 0.6 },
    { id: "p4", name: "10 horas", price: 55, weight: 0.1 },
    { id: "p5", name: "Oficina privada", price: 680, weight: 1.0 },
    { id: "p6", name: "Oficina Virtual", price: 45, weight: 0 },
    { id: "p7", name: "Tardes", price: 75, weight: 0 },
    { id: "p8", name: "Pase día", price: 18, weight: 0, casual: true },
    { id: "p9", name: "Pase semana", price: 75, weight: 0, casual: true },
  ];

  // Clientes — mezcla de freelancers, startups, empresas
  const NAMES = [
    "Helena Torres", "Marc Vidal", "Estudio Marea", "Lucía Ferrer", "Bauhaus Digital",
    "Joan Pastor", "Sara Mompó", "Bruna Soler", "Polaris Studio", "Paula Marín",
    "Iván Gómez", "Atelier Vera", "Foundry Labs", "Núria Bosch", "Daniel Llopis",
    "Cristal Studio", "Anna Beltrán", "Pol Esteve", "Mireia Cano", "Northbeam SL",
    "Roger Camps", "Tinta Roja", "Aitana Roca", "Casals & Co", "Jordi Mateu",
    "Carla Rius", "Bloom Coffee", "Octavi Bas", "Studio Norte", "Eulalia Pons",
  ];
  const COMPANIES = [
    null, null, "Estudio Marea S.L.", null, "Bauhaus Digital S.L.",
    null, null, null, "Polaris Studio S.L.", null,
    null, "Atelier Vera S.C.", "Foundry Labs Inc.", null, null,
    "Cristal Studio S.L.", null, null, null, "Northbeam SL",
    null, "Tinta Roja Editorial", null, "Casals & Co S.L.", null,
    null, "Bloom Coffee S.L.", null, "Studio Norte S.L.", null,
  ];

  const STATUSES = ["active", "active", "active", "active", "active", "active",
                    "overdue", "casual", "casual", "inactive", "pending"];

  const CLIENTS = NAMES.map((name, i) => {
    const cw = i % 3 === 0 ? "puerta" : "ruzafa";
    const status = STATUSES[i % STATUSES.length];
    const planIdx = i % PLANS.length;
    const plan = PLANS[planIdx];
    const lastDays = status === "casual" ? Math.floor(Math.random() * 30) + 5
                   : status === "overdue" ? Math.floor(Math.random() * 40) + 35
                   : status === "inactive" ? 90 + Math.floor(Math.random() * 60)
                   : Math.floor(Math.random() * 28);
    const d = new Date();
    d.setDate(d.getDate() - lastDays);
    return {
      id: `c${i+1}`,
      name,
      company: COMPANIES[i],
      email: name.toLowerCase().replace(/[^a-z]/g, ".") + "@gmail.com",
      type: COMPANIES[i] ? "company" : "individual",
      coworkingId: cw,
      status,
      planName: plan.casual ? null : plan.name,
      seats: i % 7 === 0 ? 2 : 1,
      mrr: plan.casual ? 0 : plan.price * (i % 7 === 0 ? 2 : 1),
      lastPaidAt: d.toISOString().slice(0,10),
      joinedAt: new Date(2024, (i*3) % 12, ((i*7) % 26) + 1).toISOString().slice(0,10),
    };
  });

  // Subs activas con peso
  const subsActive = CLIENTS.filter(c => c.status === "active" || c.status === "overdue").map(c => ({
    clientId: c.id,
    name: c.name,
    plan: c.planName,
    seats: c.seats,
    coworkingId: c.coworkingId,
    weight: (PLANS.find(p => p.name === c.planName)?.weight ?? 0),
    mrr: c.mrr,
  }));

  // KPIs mes actual
  const month = new Date();
  const monthLabel = month.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  const mrrGross = subsActive.reduce((a,s) => a + s.mrr, 0);
  const arrYTD = mrrGross * (month.getMonth() + 1) * 0.92;
  const expectedGross = mrrGross * 1.08;
  const collectedGross = expectedGross * 0.74;
  const overdueAmount = expectedGross - collectedGross - 1240;

  // Sales chart 12m — tendencia ascendente con estacionalidad
  const MONTH_ES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  const salesPoints = Array.from({length: 12}, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    const base = 7800 + i * 320;
    const seasonal = Math.sin((d.getMonth() / 12) * Math.PI * 2) * 800;
    const noise = (Math.sin(i * 17.3) * 600);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,
      label: MONTH_ES[d.getMonth()],
      value: Math.max(2000, Math.round(base + seasonal + noise)),
    };
  });

  // Top clientes 12m
  const topClients = [...CLIENTS]
    .map(c => ({...c, total12m: c.mrr * 11 + Math.random() * 400}))
    .filter(c => c.total12m > 800)
    .sort((a,b) => b.total12m - a.total12m)
    .slice(0, 6);

  // Suscripciones por plan
  const subsByPlan = PLANS.filter(p => !p.casual).map(p => {
    const count = subsActive.filter(s => s.plan === p.name).reduce((a,s) => a + s.seats, 0);
    return { plan: p.name, count, weight: p.weight };
  }).filter(s => s.count > 0).sort((a,b) => b.count - a.count);

  // Pases hoy
  const todayPasses = [
    { client: "Mario Castellano", plan: "Pase día", amount: 18 },
    { client: "Elena Vives", plan: "Pase día", amount: 18 },
    { client: "Studio Aria", plan: "Pase semana", amount: 75 },
    { client: "Pablo Rey", plan: "Pase día", amount: 18 },
  ];

  // Pagos
  const paymentRows = CLIENTS.slice(0, 18).map((c, i) => {
    const status = i < 3 ? "overdue" : i < 6 ? "pending" : i < 8 ? "partial" : "paid";
    const amount = c.mrr || (PLANS[i % PLANS.length].price);
    const d = new Date();
    d.setDate(d.getDate() - (i * 2));
    return {
      id: `pay-${i+1}`,
      clientId: c.id,
      clientName: c.name,
      concept: `${c.planName ?? "Pase"} · ${monthLabel}`,
      amount,
      paidAmount: status === "paid" ? amount : status === "partial" ? amount * 0.5 : 0,
      status,
      method: ["transfer","card","cash","stripe"][i % 4],
      expectedDate: d.toISOString().slice(0,10),
      paidAt: status === "paid" ? d.toISOString().slice(0,10) : null,
    };
  });

  // Incidencias
  const incidents = [
    { id: "i1", title: "Aire acondicionado sala 2 hace ruido", priority: "medium", status: "open", created: "2026-04-22", coworking: "ruzafa" },
    { id: "i2", title: "Cerradura taquilla 14 atascada", priority: "low", status: "in_progress", created: "2026-04-21", coworking: "ruzafa" },
    { id: "i3", title: "Wifi sala reuniones intermitente", priority: "high", status: "waiting_provider", created: "2026-04-20", coworking: "puerta" },
    { id: "i4", title: "Cafetera fuera de servicio", priority: "urgent", status: "open", created: "2026-04-25", coworking: "puerta" },
    { id: "i5", title: "Lámpara mesa 7 fundida", priority: "low", status: "open", created: "2026-04-18", coworking: "ruzafa" },
  ];

  // Renewals
  const renewals = CLIENTS.filter(c => c.status === "active").slice(0, 8).map((c, i) => {
    const d = new Date();
    d.setDate(d.getDate() + (i * 4 - 6));
    return {
      clientId: c.id, name: c.name, plan: c.planName,
      endDate: d.toISOString().slice(0,10),
      daysToEnd: Math.round((d - new Date()) / (1000*60*60*24)),
    };
  });

  // Cash float
  const cash = {
    floatRuzafa: 280,
    floatPuerta: 195,
    movements: [
      { date: "2026-04-25", coworking: "ruzafa", concept: "Pase día — Mario C.", amount: 18, type: "in" },
      { date: "2026-04-25", coworking: "ruzafa", concept: "Pase día — Elena V.", amount: 18, type: "in" },
      { date: "2026-04-24", coworking: "puerta", concept: "Compra leche cafetera", amount: -12.40, type: "out" },
      { date: "2026-04-24", coworking: "ruzafa", concept: "Pase semana — Studio Aria", amount: 75, type: "in" },
      { date: "2026-04-23", coworking: "puerta", concept: "Cambio bombillas oficina", amount: -34.80, type: "out" },
      { date: "2026-04-22", coworking: "ruzafa", concept: "Pase día — Pablo R.", amount: 18, type: "in" },
    ],
  };

  // Lockers / monitores
  const lockers = Array.from({length: 24}, (_, i) => {
    const assigned = i < 18 && i % 5 !== 4;
    return {
      id: `L${String(i+1).padStart(2,"0")}`,
      coworking: i < 14 ? "ruzafa" : "puerta",
      assignedTo: assigned ? CLIENTS[i % CLIENTS.length].name : null,
      clientId: assigned ? CLIENTS[i % CLIENTS.length].id : null,
    };
  });
  const monitors = Array.from({length: 16}, (_, i) => ({
    id: `M${String(i+1).padStart(2,"0")}`,
    coworking: i < 9 ? "ruzafa" : "puerta",
    assignedTo: i < 12 ? CLIENTS[(i*3) % CLIENTS.length].name : null,
    clientId: i < 12 ? CLIENTS[(i*3) % CLIENTS.length].id : null,
  }));

  // Calendar events
  const events = [
    { date: "2026-04-26", title: "Mañana del coworker — Ruzafa", kind: "event", coworking: "ruzafa" },
    { date: "2026-04-28", title: "Charla: SEO para freelancers", kind: "event", coworking: "puerta" },
    { date: "2026-05-01", title: "Festivo — Día del trabajador", kind: "holiday" },
    { date: "2026-05-04", title: "Networking afterwork", kind: "event", coworking: "ruzafa" },
    { date: "2026-05-09", title: "Festivo — Día Comunidad Valenciana", kind: "holiday" },
    { date: "2026-05-15", title: "Workshop diseño UX", kind: "event", coworking: "puerta" },
  ];

  return {
    coworkings: COWORKINGS, plans: PLANS, clients: CLIENTS, subsActive, monthLabel,
    arrYTD, mrrGross, expectedGross, collectedGross, overdueAmount,
    salesPoints, topClients, subsByPlan, todayPasses, paymentRows,
    incidents, renewals, cash, lockers, monitors, events,
    totalCapacity: COWORKINGS.reduce((a,c) => a + c.capacity, 0),
    occupiedSeats: subsActive.reduce((a,s) => a + s.weight * s.seats, 0),
    coworkers: subsActive.filter(s => s.weight > 0).reduce((a,s) => a + s.seats, 0),
  };
})();
