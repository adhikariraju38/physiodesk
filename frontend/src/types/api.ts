export type Role = "admin" | "staff";
export type Gender = "male" | "female" | "other";
export type PatientStatus = "active" | "completed" | "on_hold";
export type AppointmentStatus = "booked" | "completed" | "cancelled" | "no_show";
export type InvoiceStatus = "paid" | "due" | "void";
export type PaymentMethod = "cash" | "card" | "online" | "insurance";

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type User = {
  id: number;
  email: string;
  full_name: string;
  role: Role;
};

export type TherapistBrief = {
  id: number;
  full_name: string;
  specialty: string;
};

export type Therapist = TherapistBrief & {
  start_time: string;
  end_time: string;
  slot_duration_min: number;
  is_active: boolean;
  /** 0 is monday, matching python's date.weekday() */
  working_days: number[];
};

export type ScheduleOverride = {
  id: number;
  therapist_id: number;
  on_date: string;
  is_day_off: boolean;
  start_time: string | null;
  end_time: string | null;
  note: string | null;
};

export type PatientBrief = {
  id: number;
  full_name: string;
  phone: string;
};

export type Patient = PatientBrief & {
  age: number;
  gender: Gender;
  address: string | null;
  condition: string;
  package: string | null;
  status: PatientStatus;
  assigned_therapist: TherapistBrief | null;
  created_at: string;
};

export type Appointment = {
  id: number;
  appt_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  payment_method: PaymentMethod | null;
  notes: string | null;
  patient: PatientBrief;
  therapist: TherapistBrief;
  created_at: string;
};

export type Invoice = {
  id: number;
  invoice_number: string;
  service: string;
  amount: string;
  discount: string;
  total: string;
  status: InvoiceStatus;
  payment_method: PaymentMethod | null;
  issued_date: string;
  paid_at: string | null;
  appointment_id: number | null;
  patient: PatientBrief;
};

export type SlotAppointment = {
  id: number;
  status: AppointmentStatus;
  payment_method: PaymentMethod | null;
  notes: string | null;
  patient: PatientBrief;
};

export type ScheduleSlot = {
  start_time: string;
  end_time: string;
  is_booked: boolean;
  appointment: SlotAppointment | null;
};

export type TherapistDay = {
  therapist: TherapistBrief;
  on_duty: boolean;
  slot_minutes: number;
  note: string | null;
  slots: ScheduleSlot[];
};

export type DaySchedule = {
  date: string;
  therapists: TherapistDay[];
};

export type CapacitySlot = {
  start_time: string;
  is_booked: boolean;
  patient_name: string | null;
};

export type TherapistCapacity = {
  therapist: TherapistBrief;
  booked: number;
  free: number;
  slots: CapacitySlot[];
};

export type DashboardSummary = {
  date: string;
  stats: {
    patients_seen_today: number;
    therapists_on_duty: number;
    revenue_today: string;
    open_slots_today: number;
  };
  capacity: TherapistCapacity[];
  recent_patients: Patient[];
};
