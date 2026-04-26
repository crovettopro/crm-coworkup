// Curated list of recurring annual events in Valencia / Comunitat Valenciana
// Used for "Sugerir fechas" in the calendar.
// Dates that move (Easter-based) are computed per year.

export type ValenciaSuggestion = {
  title: string;
  description: string;
  event_type: "holiday" | "community" | "external_rental" | "custom";
  startMonth: number;   // 1-12
  startDay: number;
  endMonth?: number;
  endDay?: number;
  closes_coworking?: boolean;
  emoji?: string;
};

export const VALENCIA_FIXED: ValenciaSuggestion[] = [
  // Enero
  { title: "Año Nuevo", description: "Festivo nacional. Coworking cerrado.", event_type: "holiday", startMonth: 1, startDay: 1, closes_coworking: true, emoji: "🎉" },
  { title: "Reyes Magos", description: "Festivo nacional. Cabalgata el día 5 por la tarde.", event_type: "holiday", startMonth: 1, startDay: 6, closes_coworking: true, emoji: "👑" },
  { title: "San Vicente Mártir", description: "Patrón de Valencia. Festivo local.", event_type: "holiday", startMonth: 1, startDay: 22, closes_coworking: true, emoji: "🕊️" },

  // Marzo — Fallas (las fechas grandes son fijas: 15-19)
  { title: "Crida de Fallas", description: "Inicio oficial de la fiesta de las Fallas.", event_type: "community", startMonth: 3, startDay: 1, emoji: "🎆" },
  { title: "Fallas — Plantà",   description: "Las fallas se levantan en la calle.", event_type: "community", startMonth: 3, startDay: 15, emoji: "🔥" },
  { title: "Fallas — Ofrenda",  description: "Ofrenda de flores a la Virgen. Centro colapsado.", event_type: "community", startMonth: 3, startDay: 17, endMonth: 3, endDay: 18, emoji: "💐" },
  { title: "San José — Cremà",  description: "Festivo local. Coworking cerrado.", event_type: "holiday", startMonth: 3, startDay: 19, closes_coworking: true, emoji: "🔥" },

  // Mayo
  { title: "Día del Trabajo",   description: "Festivo nacional.", event_type: "holiday", startMonth: 5, startDay: 1, closes_coworking: true, emoji: "🛠️" },

  // Junio
  { title: "Hogueras de San Juan", description: "Noche del 23 al 24, hogueras y verbenas.", event_type: "community", startMonth: 6, startDay: 23, endMonth: 6, endDay: 24, emoji: "🔥" },

  // Agosto
  { title: "La Tomatina (Buñol)", description: "Último miércoles de agosto. Mucha afluencia turística.", event_type: "community", startMonth: 8, startDay: 28, emoji: "🍅" },
  { title: "Asunción",          description: "Festivo nacional.", event_type: "holiday", startMonth: 8, startDay: 15, closes_coworking: true, emoji: "🌅" },

  // Octubre
  { title: "9 d'Octubre — Comunitat Valenciana", description: "Día de la Comunitat Valenciana. Festivo.", event_type: "holiday", startMonth: 10, startDay: 9, closes_coworking: true, emoji: "🟡🔴" },
  { title: "Hispanidad",        description: "Festivo nacional.", event_type: "holiday", startMonth: 10, startDay: 12, closes_coworking: true, emoji: "🇪🇸" },

  // Noviembre
  { title: "Todos los Santos",  description: "Festivo nacional.", event_type: "holiday", startMonth: 11, startDay: 1, closes_coworking: true, emoji: "🕯️" },

  // Diciembre
  { title: "Día de la Constitución", description: "Festivo nacional.", event_type: "holiday", startMonth: 12, startDay: 6, closes_coworking: true, emoji: "🏛️" },
  { title: "Inmaculada",        description: "Festivo nacional.", event_type: "holiday", startMonth: 12, startDay: 8, closes_coworking: true, emoji: "✨" },
  { title: "Nochebuena",        description: "Coworking cierra a media jornada.", event_type: "community", startMonth: 12, startDay: 24, emoji: "🎄" },
  { title: "Navidad",           description: "Festivo nacional.", event_type: "holiday", startMonth: 12, startDay: 25, closes_coworking: true, emoji: "🎄" },
  { title: "Nochevieja",        description: "Coworking cierra a media jornada.", event_type: "community", startMonth: 12, startDay: 31, emoji: "🥂" },
];

export function suggestionsForMonth(year: number, monthIdx0: number): ValenciaSuggestion[] {
  const month = monthIdx0 + 1; // 1-12
  return VALENCIA_FIXED.filter((s) =>
    s.startMonth === month || (s.endMonth === month && s.endMonth !== s.startMonth)
  );
}

export function toEventInsert(s: ValenciaSuggestion, year: number, coworking_id: string | null) {
  const start = new Date(Date.UTC(year, s.startMonth - 1, s.startDay));
  const end = s.endMonth ? new Date(Date.UTC(year, s.endMonth - 1, s.endDay ?? s.startDay)) : null;
  return {
    title: `${s.emoji ?? ""} ${s.title}`.trim(),
    description: s.description,
    event_type: s.event_type as any,
    start_date: start.toISOString(),
    end_date: end?.toISOString() ?? start.toISOString(),
    coworking_id,
    all_day: true,
    color: s.event_type === "holiday" ? "#ef4444" : s.event_type === "community" ? "#f0b429" : "#0ea5e9",
  };
}
