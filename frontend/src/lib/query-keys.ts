/**
 * One place that owns every cache key and every invalidation.
 *
 * The same list can be changed from several screens: a patient's session list
 * moves when you book from the calendar, when you cancel from the appointment
 * dialog, and when a patient is deleted and their appointments go with them.
 * Rather than remembering that at each call site, a mutation says what it
 * touched and the table below decides what goes stale.
 */

/** The first segment of every key, one per resource the api exposes. */
export const ROOTS = [
  "me",
  "dashboard",
  "patients",
  "therapists",
  "appointments",
  "schedule",
  "invoices",
] as const;

export type Root = (typeof ROOTS)[number];

/** A key is always a known root followed by anything that narrows it. */
export type QueryKey<R extends Root = Root> = readonly [R, ...ReadonlyArray<unknown>];

export type PatientListFilters = {
  search?: string;
  status?: string;
  page?: number;
};

export type InvoiceListFilters = {
  status?: string;
  patientId?: number;
  page?: number;
};

export const keys = {
  me: ["me"] as QueryKey<"me">,

  dashboard: {
    all: ["dashboard"] as QueryKey<"dashboard">,
    summary: (recent: number) => ["dashboard", "summary", recent] as QueryKey<"dashboard">,
  },

  patients: {
    all: ["patients"] as QueryKey<"patients">,
    list: (filters: PatientListFilters) => ["patients", "list", filters] as QueryKey<"patients">,
    detail: (id: number) => ["patients", "detail", id] as QueryKey<"patients">,
  },

  therapists: {
    all: ["therapists"] as QueryKey<"therapists">,
    list: (activeOnly: boolean) => ["therapists", "list", activeOnly] as QueryKey<"therapists">,
    overrides: (therapistId: number) =>
      ["therapists", "overrides", therapistId] as QueryKey<"therapists">,
  },

  appointments: {
    all: ["appointments"] as QueryKey<"appointments">,
    forPatient: (patientId: number) =>
      ["appointments", "patient", patientId] as QueryKey<"appointments">,
    detail: (id: number) => ["appointments", "detail", id] as QueryKey<"appointments">,
  },

  schedule: {
    all: ["schedule"] as QueryKey<"schedule">,
    day: (date: string) => ["schedule", "day", date] as QueryKey<"schedule">,
  },

  invoices: {
    all: ["invoices"] as QueryKey<"invoices">,
    list: (filters: InvoiceListFilters) => ["invoices", "list", filters] as QueryKey<"invoices">,
    forPatient: (patientId: number) => ["invoices", "patient", patientId] as QueryKey<"invoices">,
  },
} as const;

/** Every kind of write the app can perform. */
export type MutationSubject =
  "patient" | "therapist" | "therapistSchedule" | "appointment" | "invoice";

/**
 * What each write makes stale.
 *
 * Typed as a Record, so adding a subject above without saying what it
 * invalidates is a compile error rather than a cache bug found by a reviewer.
 * Keys are the broad roots on purpose: react query matches by prefix, so
 * dropping `patients` also drops every filtered and paged list under it.
 */
export const invalidatesAfter: Record<MutationSubject, ReadonlyArray<QueryKey>> = {
  // a patient's name shows on the calendar and their row feeds the dashboard,
  // and deleting one takes their appointments with it
  patient: [keys.patients.all, keys.appointments.all, keys.schedule.all, keys.dashboard.all],

  // hours and roster changes redraw the grid and move "therapists on duty"
  therapist: [keys.therapists.all, keys.schedule.all, keys.dashboard.all],
  therapistSchedule: [keys.therapists.all, keys.schedule.all, keys.dashboard.all],

  // booking, rescheduling and cancelling all move the same three lists
  appointment: [keys.appointments.all, keys.schedule.all, keys.dashboard.all],

  // billing changes revenue collected today and the patient's billing history
  invoice: [keys.invoices.all, keys.dashboard.all],
};
