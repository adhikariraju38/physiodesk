# PhysioDesk

Clinic management for a physiotherapy practice: patients, a booking calendar,
billing and a roster, behind a login with two roles.

FastAPI and PostgreSQL on the back, Next.js on the front, all of it in Docker.

---

## Running it

You need Docker. Nothing else has to be installed.

```sh
cp .env.example .env
docker compose up --build
```

Then, in another terminal, build the schema and fill it with a believable week:

```sh
docker compose exec api alembic upgrade head
docker compose exec api python -m app.seed
```

| What | Where |
| --- | --- |
| App | http://localhost:3000 |
| API docs (Swagger) | http://localhost:8000/docs |
| Postgres | localhost:5433 |

Postgres is on 5433 rather than 5432 so it does not fight an instance you may
already have running.

### Signing in

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@physiodesk.com | admin123 |
| Staff | staff@physiodesk.com | staff123 |

Sign in as admin to see everything. Sign in as staff to see the same clinic with
billing and the roster read only.

The Swagger page at `/docs` shares cookies with the app, so signing in at
localhost:3000 first means you can call the protected endpoints from there too.

### Re-seeding

`python -m app.seed` empties the app tables and fills them again, so run it
whenever the data gets messy from clicking around. It is deterministic apart
from being anchored to today's date.

---

## The stack, and why

- **FastAPI** with plain `def` endpoints. FastAPI runs those in a threadpool, so
  synchronous SQLAlchemy is correct here and a lot easier to follow than the
  async flavour.
- **SQLAlchemy 2.0** with typed `Mapped[...]` columns, and **Alembic** for
  migrations. Four revisions, and the schema builds from nothing with one
  command.
- **PostgreSQL 16**.
- **Next.js 15** (App Router) with **TanStack Query** for everything that comes
  from the api, behind one typed table of cache keys so a write invalidates the
  same lists wherever it was made from. Filters, paging and the calendar date
  live in the url rather than a client store, so a link opens the view it
  describes.
- **Tailwind 4**, with the palette from the brief defined once as theme tokens.
  No hex values in components.

### Layout

```
backend/
  app/
    api/v1/      one module per resource, plus deps.py for the auth dependencies
    core/        settings, password and token helpers, cookies, pagination
    db/          engine, session, declarative base
    models/      sqlalchemy models
    schemas/     pydantic request and response models
    services/    the logic worth keeping out of the endpoints:
                 scheduling, billing, dashboard, refresh tokens
    seed.py
  alembic/versions/
  tests/
frontend/
  src/
    app/         routes, grouped into (auth) and (app)
    components/  ui/ holds the design system, the rest is per feature
    lib/         api client, query keys, auth context, formatting
```

---

## Auth

Login returns two httpOnly cookies: a short lived access token (15 minutes, a
signed JWT) and a refresh token (14 days, opaque). The refresh token is
deliberately not a JWT, because a signed token stays valid until it expires and
we want to be able to revoke one.

Only the SHA-256 hash of a refresh token is stored. Every refresh rotates it, and
presenting an already spent token is treated as a stolen cookie: the whole family
is revoked and the user has to sign in again.

A third cookie, `pd_session`, is readable by JavaScript and carries no authority.
It exists so the Next middleware can redirect a signed out visitor without a
round trip to the api. Every real check happens server side.

### Who can do what

| | Admin | Staff |
| --- | --- | --- |
| Patients | full | full |
| Schedule and appointments | full | full |
| Dashboard | full | full |
| Billing | full | view only, every write returns 403 |
| Therapists | full | view only, every write returns 403 |

Staff keep read access to billing and the roster because a receptionist needs to
see whether a patient owes money, and needs the therapist list to book at all.
The rule is enforced in the api, and the UI mirrors it by not drawing buttons
that would only 403.

---

## Data model

```
users                  refresh_tokens
therapists             therapist_working_days, therapist_overrides
patients               appointments               invoices
```

Two constraints are worth calling out:

- `uq_appointment_slot` is a **partial unique index** on
  `(therapist_id, appt_date, start_time) where status <> 'cancelled'`. The
  service layer checks for a clash first, but two requests can both pass that
  check before either commits, so the database has the final say. Cancelled rows
  are excluded, which lets a freed slot be booked again.
- `invoices.patient_id` is `ON DELETE RESTRICT`. Deleting a patient who has been
  billed is refused rather than leaving an invoice pointing at nobody.

Availability is worked out in one place, `app/services/scheduling.py`, and both
the calendar and the booking endpoint use it. That is why the seed script cannot
produce an appointment the app would itself refuse to make.

---

## Tests

```sh
docker compose exec api pytest
```

24 tests. They build a throwaway `physiodesk_test` database and migrate it with
Alembic, so they run against the schema a deployment would get rather than
whatever `create_all` happens to produce.

They cover the parts where being wrong is expensive:

- login, the identical response for a wrong password and an unknown email,
  refresh rotation, reuse detection, logout
- every endpoint staff must not be able to write to
- slot generation, day off and custom hour overrides, booking a taken slot,
  cancelling and rebooking, times that are not on the grid, and the database
  rejecting a double booking with the api bypassed entirely

Other checks:

```sh
docker compose exec api ruff check .      # lint
docker compose exec api ruff format .     # format
cd frontend && npm run typecheck          # tsc, strict
cd frontend && npm run format             # prettier
```

The backend is also clean under `pyright` in **strict** mode. The config lives in
`pyrightconfig.json` at the root so editors opened at the repo root pick it up.
Two `# pyright: ignore` comments remain in `core/security.py`, both because PyJWT
types its key parameter as a union including key classes from `cryptography`,
which is not installed since everything here is HS256.

---

## Assumptions

The brief said to make a call, write it down and move on. These are the calls.

1. **"Patients seen today"** counts distinct patients with a non-cancelled
   appointment today whose start time has already passed.
2. **"Therapists on duty today"** means active therapists whose weekly pattern
   includes today, minus anyone with a day off recorded for the date.
3. **"Revenue collected today"** sums invoice totals with status `paid` and a
   `paid_at` of today. Invoices still due are not counted.
4. **"Open slots remaining today"** counts future slots only. A free slot that
   has already passed cannot be booked, so it is not offered.
5. **Removing a therapist is a soft delete.** Deleting the row would take their
   appointment history with it. They come off the calendar and the roster, and
   the request is refused with a 409 if they still have appointments to come, so
   nobody silently loses a session.
6. **Deleting a patient is a hard delete** and takes their appointments with it,
   but is refused if they have any invoice that is not void.
7. **Deleting an invoice voids it** rather than removing the row, so the
   numbering stays unbroken.
8. Appointment length comes from the therapist, not the request. Different
   therapists have different session lengths, so the calendar shows the union of
   everyone's slot times and marks a cell that nobody has a slot for.
9. **Appointments have no separate treatment type.** The brief asks for one in
   the session history, so the therapist's specialty stands in for it. The
   service description lives on the invoice, which is where it is actually
   needed.
10. **Fonts on the dashboard.** Section 3.0 asks for Fraunces numerals on the
    stat cards while the type scale puts IBM Plex Mono on figures. I read the
    stat card rule as the more specific one, so the four headline numbers are
    Fraunces and every other figure (amounts, slot times, invoice numbers,
    phone numbers) is Plex Mono.
11. **Booking in the past is allowed.** A receptionist catching up on paperwork
    needs it, and the brief only requires respecting a therapist's availability.
12. Everything runs in the clinic's timezone. Both containers are given
    `TZ=Asia/Kathmandu` so "today" means the same thing in the api and in
    Postgres. Change it in `.env`.
13. Users are created by the seed script. There is no sign up, and no screen for
    managing accounts.

---

## Things the brief listed as optional that are in

- `docker compose up` brings up Postgres, the api and the web app together
- Pagination on patients and invoices
- Tests, listed above
- Conflict prevention beyond the plain 409: the booking form re-reads the day
  before writing, so if someone took the slot while the form was open you are
  told which slot went. It also points out when the patient is already booked
  elsewhere that day, which the api allows but the front desk usually wants to
  know about
- Refresh token rotation, reuse detection and sign out everywhere

---

## What I would do next

- **Frontend tests.** The backend has them, the frontend does not. Playwright
  over the booking flow and the role gating would be the first thing I add.
- **Deploy it.** Everything is containerised, so this is mostly picking somewhere.
- **A real invoice PDF.** The printable view is print stylesheets, which is fine
  for a receptionist with a printer and not fine for emailing.
- **Account management.** Right now users only come from the seed script.
- **Audit trail.** Invoices and appointments record who created them, but nothing
  records who changed them.
- **Optimistic updates** on the calendar. Booking currently waits for the round
  trip before the cell fills in.
- **Rate limiting on login.** The responses do not leak which emails exist, but
  nothing slows an attacker down.

---

## About this repository

This was built as a take-home assignment for a job application, working from a
written brief. It is not a product, and nobody is running it in a clinic.

The code is here to be read. If you would like to use any part of it, or you are
curious about why something was done a particular way, please get in touch first:
[@adhikariraju38](https://github.com/adhikariraju38).
