const HEADERS = [
  "cliente_nombre","tipo_cliente","empresa_nombre","email","telefono",
  "coworking","estado","fecha_alta","fecha_baja",
  "plan","precio_base","descuento_tipo","descuento_valor","precio_final",
  "fecha_inicio_suscripcion","fecha_fin_suscripcion","metodo_pago",
  "estado_pago","mes_pago","importe_esperado","importe_pagado",
  "factura_estado","fianza_entregada","fianza_importe",
  "contrato_inicio","contrato_fin","pantalla_alquilada","taquilla_alquilada","notas",
];

const SAMPLE: Record<string, string> = {
  cliente_nombre: "Ana García",
  tipo_cliente: "individual",
  empresa_nombre: "",
  email: "ana@example.com",
  telefono: "+34 600 000 000",
  coworking: "Cowork Up — Coworking 1",
  estado: "active",
  fecha_alta: "2025-09-01",
  fecha_baja: "",
  plan: "Fijo",
  precio_base: "280",
  descuento_tipo: "",
  descuento_valor: "",
  precio_final: "280",
  fecha_inicio_suscripcion: "2025-09-01",
  fecha_fin_suscripcion: "",
  metodo_pago: "transfer",
  estado_pago: "paid",
  mes_pago: "2026-04-01",
  importe_esperado: "280",
  importe_pagado: "280",
  factura_estado: "issued",
  fianza_entregada: "true",
  fianza_importe: "280",
  contrato_inicio: "2025-09-01",
  contrato_fin: "",
  pantalla_alquilada: "false",
  taquilla_alquilada: "true",
  notas: "Cliente recurrente",
};

export async function GET() {
  const csv = [
    HEADERS.join(","),
    HEADERS.map((h) => `"${(SAMPLE[h] ?? "").replace(/"/g, '""')}"`).join(","),
  ].join("\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="plantilla-coworkup.csv"',
    },
  });
}
