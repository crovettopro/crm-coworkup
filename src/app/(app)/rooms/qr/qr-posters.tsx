"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Printer, ScanLine } from "lucide-react";

type Room = {
  id: string;
  name: string;
  color: string | null;
  capacity: number | null;
  coworking_id: string;
  coworking_name: string;
};

export function QrPosters({
  rooms,
  baseUrl,
}: {
  rooms: Room[];
  baseUrl: string;
}) {
  function urlFor(roomId: string) {
    return `${baseUrl}/portal/book?room=${roomId}`;
  }

  return (
    <div>
      {/* Toolbar (hidden when printing) */}
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Link
          href="/rooms"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-ink-200 bg-white px-3 text-[12.5px] font-medium text-ink-700 hover:bg-ink-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al timeline
        </Link>
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight text-ink-950">
            QR para puerta de cada sala
          </h1>
          <p className="text-[12px] text-ink-500">
            Imprime y pega un QR fuera de cada sala. Al escanear, el cliente entra al
            portal con esa sala ya seleccionada.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md bg-ink-950 px-3.5 text-[12.5px] font-semibold text-white hover:bg-ink-800"
        >
          <Printer className="h-3.5 w-3.5" /> Imprimir todos
        </button>
      </div>

      {rooms.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ink-300 bg-white px-6 py-12 text-center text-[13px] text-ink-500 print:hidden">
          No hay salas activas para mostrar.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 print:gap-0 print:grid-cols-1">
          {rooms.map((r) => (
            <Poster key={r.id} room={r} url={urlFor(r.id)} />
          ))}
        </div>
      )}

      {/* Print rules */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html,
          body {
            background: white !important;
          }
          /* Hide app chrome (sidebar, topbar) when printing */
          aside,
          header,
          nav {
            display: none !important;
          }
          main,
          .print-area {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .poster {
            page-break-after: always;
            break-after: page;
            width: 210mm;
            height: 297mm;
            margin: 0;
            border-radius: 0;
            box-shadow: none;
          }
          .poster:last-child {
            page-break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}

function Poster({ room, url }: { room: Room; url: string }) {
  const accent = room.color ?? "#7c5cff";
  return (
    <div
      className="poster relative flex flex-col items-center justify-between rounded-2xl border border-ink-200 bg-white overflow-hidden shadow-sm aspect-[210/297] print:aspect-auto print:border-0 print:rounded-none"
    >
      {/* Top color bar */}
      <div
        className="w-full"
        style={{ backgroundColor: accent, height: "10mm" }}
      />

      {/* Header */}
      <div className="px-8 pt-6 w-full text-center">
        <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-ink-500">
          Cowork Up · {room.coworking_name}
        </p>
        <h2 className="mt-2 text-[44px] font-semibold tracking-tight text-ink-950 leading-none print:text-[56px]">
          {room.name}
        </h2>
        {room.capacity ? (
          <p className="mt-1.5 text-[13px] text-ink-500">
            Capacidad: {room.capacity} personas
          </p>
        ) : null}
      </div>

      {/* QR */}
      <div className="flex flex-col items-center gap-3 px-6 my-2">
        <div
          className="rounded-2xl bg-white p-4 ring-2"
          style={{
            // ring uses the room accent for a subtle splash
            // tailwind's arbitrary ring colors don't read CSS vars cleanly so use boxShadow
            boxShadow: `0 0 0 3px ${accent}`,
          }}
        >
          <QRCodeSVG
            value={url}
            size={240}
            level="M"
            includeMargin={false}
            bgColor="#ffffff"
            fgColor="#0a0a0a"
          />
        </div>
        <p className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-700">
          <ScanLine className="h-3.5 w-3.5" />
          Escanea con tu móvil
        </p>
      </div>

      {/* Big tagline */}
      <div className="px-8 text-center w-full">
        <p className="text-[20px] font-semibold tracking-tight text-ink-950 leading-tight print:text-[26px]">
          Reserva esta sala
        </p>
        <p className="mt-1 text-[13px] text-ink-500">
          Sólo necesitas tu email de cliente.
        </p>
      </div>

      {/* Footer */}
      <div
        className="w-full flex items-center justify-between px-8 py-5"
        style={{ borderTop: `1px solid #e5e7eb` }}
      >
        <span className="text-[10.5px] text-ink-500 font-mono truncate max-w-[60%]">
          {url.replace(/^https?:\/\//, "")}
        </span>
        <span
          className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: accent }}
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: accent }}
          />
          {room.name}
        </span>
      </div>
    </div>
  );
}
