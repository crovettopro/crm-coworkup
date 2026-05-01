export type UserRole = "super_admin" | "manager" | "staff" | "client";
export type ClientType = "individual" | "company";
export type ClientStatus = "active" | "inactive" | "pending" | "overdue" | "paused";
export type PlanType =
  | "fixed" | "flexible" | "hours_20" | "hours_10" | "evening" | "office"
  | "company_custom" | "day_pass" | "half_day_pass" | "week_pass"
  | "coffee" | "misc" | "virtual_office";
export type SubscriptionStatus = "active" | "cancelled" | "paused" | "finished";
export type DiscountType = "percent" | "fixed";
export type PaymentStatus = "pending" | "paid" | "partial" | "overdue" | "cancelled";
export type PaymentMethod = "stripe" | "card" | "cash" | "transfer" | "sepa" | "other";
export type TaxTreatment = "standard" | "reverse_charge" | "intracom" | "exempt";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  stripe: "Stripe",
  card: "Tarjeta",
  cash: "Efectivo",
  transfer: "Transferencia",
  sepa: "SEPA",
  other: "Otro",
};

export const TAX_TREATMENT_LABEL: Record<TaxTreatment, string> = {
  standard: "Estándar (IVA 21%)",
  reverse_charge: "Inv. sujeto pasivo",
  intracom: "Intracomunitario",
  exempt: "Exento",
};

export const PAYMENT_METHODS_LIST: PaymentMethod[] = ["stripe", "card", "cash", "transfer", "sepa"];
export type InvoiceStatus = "to_issue" | "issued" | "sent" | "paid" | "overdue" | "cancelled";
export type ExtraType = "locker" | "screen" | "equipment" | "other";
export type ExtraStatus = "available" | "rented" | "returned" | "pending";
export type CoworkingStatus = "active" | "unmanaged" | "closed";

export interface Coworking {
  id: string;
  name: string;
  address?: string | null;
  status: CoworkingStatus;
  total_capacity?: number | null;
  fixed_desks_capacity?: number | null;
  flexible_capacity?: number | null;
  offices_capacity?: number | null;
  lockers_capacity?: number | null;
  screens_capacity?: number | null;
  manager_name?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  coworking_id?: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  coworking_id: string;
  client_type: ClientType;
  name: string;
  company_name?: string | null;
  tax_id?: string | null;
  email?: string | null;
  phone?: string | null;
  fiscal_address?: string | null;
  contact_person?: string | null;
  status: ClientStatus;
  start_date?: string | null;
  end_date?: string | null;
  scheduled_end_date?: string | null;
  cancellation_reason?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  source?: string | null;
  tax_treatment?: TaxTreatment;
  created_at: string;
}

export interface Plan {
  id: string;
  coworking_id?: string | null;
  name: string;
  plan_type: PlanType;
  default_price: number;
  vat_rate?: number;
  billing_cycle: "monthly" | "one_off";
  duration_days?: number | null;
  included_hours_weekly?: number | null;
  description?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  client_id: string;
  coworking_id: string;
  plan_id?: string | null;
  plan_name: string;
  base_price: number;
  quantity?: number;
  discount_type?: DiscountType | null;
  discount_value?: number | null;
  final_price: number;
  vat_rate?: number;
  tax_treatment?: TaxTreatment;
  start_date: string;
  end_date?: string | null;
  status: SubscriptionStatus;
  auto_renew?: boolean | null;
  billing_day?: number | null;
  payment_method?: PaymentMethod | null;
  billing_months?: number | null;
  notes?: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  client_id: string;
  coworking_id: string;
  subscription_id?: string | null;
  month?: string | null;
  concept?: string | null;
  expected_amount: number;
  paid_amount?: number | null;
  discount_amount?: number | null;
  status: PaymentStatus;
  expected_payment_date?: string | null;
  paid_at?: string | null;
  payment_method?: PaymentMethod | null;
  bank_reference?: string | null;
  invoice_id?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  coworking_id: string;
  month?: string | null;
  invoice_number?: string | null;
  concept?: string | null;
  taxable_base: number;
  vat_amount: number;
  total_amount: number;
  status: InvoiceStatus;
  issue_date?: string | null;
  due_date?: string | null;
  paid_date?: string | null;
  file_url?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface Extra {
  id: string;
  coworking_id: string;
  type: ExtraType;
  identifier: string;
  monthly_price: number;
  status: ExtraStatus;
  notes?: string | null;
  created_at: string;
}

export interface ClientExtra {
  id: string;
  client_id: string;
  coworking_id: string;
  extra_id: string;
  price: number;
  start_date: string;
  end_date?: string | null;
  status: ExtraStatus;
  deposit_amount?: number | null;
  notes?: string | null;
  created_at: string;
}

export const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: "Super Admin",
  manager: "Manager",
  staff: "Staff",
  client: "Cliente",
};

export type RoomBookingSource = "client" | "staff" | "walk_in";
export type RoomBookingStatus = "confirmed" | "cancelled";

export interface MeetingRoom {
  id: string;
  coworking_id: string;
  name: string;
  capacity: number | null;
  color: string | null;
  sort_order: number | null;
  is_active: boolean;
  created_at: string;
}

export interface RoomBooking {
  id: string;
  room_id: string;
  coworking_id: string;
  client_id: string | null;
  walk_in_name: string | null;
  walk_in_email: string | null;
  walk_in_phone: string | null;
  start_at: string;
  end_at: string;
  status: RoomBookingStatus;
  source: RoomBookingSource;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  cancelled_at: string | null;
}

export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  active: "Activo",
  inactive: "Baja",
  pending: "Pendiente",
  overdue: "Impago",
  paused: "Pausado",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  partial: "Parcial",
  overdue: "Impago",
  cancelled: "Cancelado",
};

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  to_issue: "Pendiente de emitir",
  issued: "Emitida",
  sent: "Enviada",
  paid: "Cobrada",
  overdue: "Vencida",
  cancelled: "Cancelada",
};

export const PLAN_TYPE_LABEL: Record<PlanType, string> = {
  fixed: "Fijo",
  flexible: "Flexible",
  hours_20: "20h semanales",
  hours_10: "10h semanales",
  evening: "Tardes Ilimitadas",
  office: "Oficina",
  company_custom: "Empresa personalizado",
  day_pass: "Pase de día",
  half_day_pass: "Pase medio día",
  week_pass: "Pase semanal",
  coffee: "Café",
  misc: "Otro / Ad-hoc",
  virtual_office: "Oficina Virtual",
};

export const EXTRA_TYPE_LABEL: Record<ExtraType, string> = {
  locker: "Taquilla",
  screen: "Pantalla",
  equipment: "Equipamiento",
  other: "Otro",
};
