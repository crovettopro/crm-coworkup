import { PageHeader } from "@/components/ui/page-header";
import { CsvImporter } from "./csv-importer";
import { getProfile, getVisibleCoworkings } from "@/lib/auth";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const profile = await getProfile();
  const coworkings = await getVisibleCoworkings(profile);
  return (
    <div>
      <PageHeader
        title="Importar CSV"
        subtitle="Carga clientes, suscripciones y pagos desde un CSV. Detecta duplicados por email."
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CsvImporter coworkings={coworkings} defaultCoworkingId={profile.coworking_id ?? coworkings[0]?.id} />
        </div>
        <Card>
          <CardHeader><CardTitle>Plantilla recomendada</CardTitle></CardHeader>
          <CardBody className="text-sm space-y-3">
            <p className="text-ink-600">
              Descarga la plantilla CSV con las columnas sugeridas. Puedes dejar columnas vacías; solo es obligatorio
              <span className="font-medium"> cliente_nombre</span> y <span className="font-medium">coworking</span>.
            </p>
            <a
              href="/api/csv-template"
              className="inline-flex h-9 items-center rounded-lg border border-ink-200 bg-white px-3 text-sm hover:bg-ink-50"
            >
              Descargar plantilla.csv
            </a>
            <div className="rounded-lg bg-ink-50 p-3 text-xs text-ink-600">
              <p className="font-medium mb-1">Columnas reconocidas:</p>
              <code className="break-all">
                cliente_nombre, tipo_cliente, empresa_nombre, email, telefono, coworking, estado, fecha_alta,
                fecha_baja, plan, precio_base, descuento_tipo, descuento_valor, precio_final,
                fecha_inicio_suscripcion, fecha_fin_suscripcion, metodo_pago, estado_pago, mes_pago,
                importe_esperado, importe_pagado, factura_estado, fianza_entregada, fianza_importe,
                contrato_inicio, contrato_fin, pantalla_alquilada, taquilla_alquilada, notas
              </code>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
