"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BillingIcon,
  DashboardIcon,
  PatientsIcon,
  ScheduleIcon,
  SignOutIcon,
  TherapistsIcon,
} from "@/components/layout/icons";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { href: "/patients", label: "Patients", Icon: PatientsIcon },
  { href: "/schedule", label: "Schedule", Icon: ScheduleIcon },
  { href: "/billing", label: "Billing", Icon: BillingIcon },
  { href: "/therapists", label: "Therapists", Icon: TherapistsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <aside className="flex h-full w-16 shrink-0 flex-col bg-secondary md:w-60">
      <div className="px-3 py-6 md:px-5">
        <p className="hidden font-display text-xl text-white md:block">PhysioDesk</p>
        <p className="mt-0.5 hidden text-xs text-white/45 md:block">Clinic desk</p>
        <p className="text-center font-display text-xl text-white md:hidden">P</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 md:px-3">
        {NAV.map(({ href, label, Icon }) => {
          // startsWith so /patients/7 keeps the Patients item lit
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              title={label}
              className={cn(
                "flex items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors md:justify-start",
                active
                  ? "bg-primary font-medium text-white"
                  : "text-white/65 hover:bg-secondary-light hover:text-white",
              )}
            >
              <Icon />
              <span className="hidden md:inline">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-2 md:p-3">
        <div className="hidden px-2 pt-1 pb-2 md:block">
          <p className="truncate text-sm text-white">{user.full_name}</p>
          <p className="mt-0.5 text-xs text-white/45 capitalize">{user.role}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          title="Sign out"
          className="flex w-full items-center justify-center gap-3 rounded-lg px-3 py-2 text-sm text-white/65 transition-colors hover:bg-secondary-light hover:text-white md:justify-start"
        >
          <SignOutIcon />
          <span className="hidden md:inline">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
