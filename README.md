# SwasthSetu

> A unified digital healthcare platform for Indian Government Hospitals — connecting citizens, doctors, and hospital staff through one secure care journey.

SwasthSetu brings patient sign-in, appointment booking, live OPD token queues, consultations, in-app notifications, lab reports, blood bank stock, and bed management into one modular application. The backend is an **Express.js + TypeScript** REST API on **PostgreSQL (Prisma)** and **Redis**; the frontend is a lightweight static portal written in HTML, CSS, and vanilla JavaScript.

**Live demo:** [https://swasthsetu-web.onrender.com](https://swasthsetu-web.onrender.com)

---

## Table of contents

- [Tech stack](#tech-stack)
- [System architecture](#system-architecture)
- [Portals and roles](#portals-and-roles)
- [User flows](#user-flows)
  - [Overall user journey](#1-overall-user-journey)
  - [Patient OTP login and registration](#2-patient-otp-login-and-registration)
  - [Staff login](#3-staff-login-doctor--hospital)
  - [Token refresh and logout](#4-token-refresh-and-logout)
  - [Appointment and OPD queue lifecycle](#5-appointment-and-opd-queue-lifecycle)
  - [End-to-end care journey](#6-end-to-end-care-journey)
  - [Hospital operations](#7-hospital-operations-labs-blood-beds)
- [Request lifecycle inside the API](#request-lifecycle-inside-the-api)
- [Data model](#data-model)
- [API reference](#api-reference)
- [Project structure](#project-structure)
- [Run locally](#run-locally)
- [Environment variables](#environment-variables)
- [Demo accounts](#demo-accounts)
- [Testing](#testing)
- [Deployment](#deployment)
- [Roadmap](#roadmap)

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML, CSS, vanilla JavaScript, served by a small Node.js static router (`scripts/serve-frontend.cjs`) |
| Backend | **Express.js 4**, TypeScript 5, Node.js 20 |
| Validation | Zod (request bodies and environment variables) |
| Database | PostgreSQL 16 with **Prisma ORM 5** (migrations + seed) |
| Cache / OTP store | Redis 7 (`redis` client) |
| Authentication | JWT access tokens (15 min) + rotating refresh tokens (7 days) in an `httpOnly` cookie, Argon2 hashing, role-based access control |
| Testing | Vitest + Supertest |
| Local infrastructure | Docker Compose (PostgreSQL + Redis) |
| Package manager | pnpm 9 (backend) |
| Hosting | Render (static web service, Express API, PostgreSQL, Key Value/Redis) |

> The backend was migrated from NestJS to plain Express. API paths and response shapes stayed the same, so the frontend did not need changes.

---

## System architecture

```mermaid
flowchart LR
    subgraph Client["Browser"]
        Public["Public portal<br/>landing + login"]
        PatientUI["Patient dashboard"]
        DoctorUI["Doctor portal"]
        HospitalUI["Hospital dashboard"]
        Guard["portal-guard.js<br/>JWT role check"]
    end

    subgraph WebServer["Frontend server · scripts/serve-frontend.cjs"]
        Router["Static route map<br/>/login/ · /staff-login/ · /*/dashboard/"]
        Runtime["/runtime-config.js<br/>injects SWASTHSETU_API_URL"]
    end

    subgraph API["Express API · apps/backend"]
        MW["cors · express.json · cookie-parser"]
        AuthR["/api/v1/auth"]
        ApptR["/api/v1/appointments"]
        OpsR["/api/v1/operations"]
        Err["notFoundHandler + errorHandler"]
    end

    DB[("PostgreSQL<br/>via Prisma")]
    Cache[("Redis<br/>OTP + cooldown keys")]
    OTP["OTP provider<br/>Demo (dev) / SMS adapter (prod)"]

    Router --> Public & PatientUI & DoctorUI & HospitalUI
    Runtime -.-> Client
    PatientUI & DoctorUI & HospitalUI --> Guard
    Public -->|fetch + credentials| MW
    Guard -->|Bearer access token| MW
    MW --> AuthR & ApptR & OpsR
    AuthR --> DB
    AuthR --> Cache
    AuthR --> OTP
    ApptR --> DB
    OpsR --> DB
    AuthR & ApptR & OpsR --> Err
```

**How the pieces fit together**

- `server.ts` loads and validates the environment with Zod, connects Prisma and Redis, builds the services, and passes them into `createApp()`. Because services are injected, tests can run the app with fakes.
- `app.ts` registers the global middleware, a `/health` endpoint, three routers, and the shared 404 and error handlers.
- Each router uses `authenticate(jwt)` (except the public auth routes), `validateBody(zodSchema)`, and `asyncHandler()` so errors always reach the central error handler.
- Services hold the business logic and check roles. Routers stay thin.

---

## Portals and roles

| Portal | Route | Who signs in | What it does |
| --- | --- | --- | --- |
| Public website | `/` | Anyone | Landing page, hospital info, entry points to patient and staff login |
| Patient login | `/login/` | Patients | Mobile number + OTP, first-time registration |
| Staff login | `/staff-login/` | Doctors and hospital staff | Employee ID + password |
| Patient dashboard | `/patient/dashboard/` | `PATIENT` | Own appointments, live queue position, notifications, lab reports |
| Doctor portal | `/doctor/dashboard/` | `DOCTOR` | Today's OPD overview, assigned queue, start/complete consultations |
| Hospital dashboard | `/hospital/dashboard/` | `HOSPITAL_ADMIN`, `SUPER_ADMIN` | Create appointments, view patients/doctors, manage lab reports, blood stock, and beds |

### Role permissions enforced by the API

| Action | Allowed roles |
| --- | --- |
| Create appointment | `SUPER_ADMIN`, `HOSPITAL_ADMIN`, `RECEPTION` |
| Start / complete consultation | `DOCTOR` (own patients only), `SUPER_ADMIN`, `HOSPITAL_ADMIN` |
| List patients | `SUPER_ADMIN`, `HOSPITAL_ADMIN`, `RECEPTION`, `DOCTOR` |
| List doctors | `SUPER_ADMIN`, `HOSPITAL_ADMIN`, `RECEPTION` |
| Update lab reports, blood stock, beds | `SUPER_ADMIN`, `HOSPITAL_ADMIN`, `LAB_STAFF`, `BLOOD_BANK_STAFF`, `BED_MANAGER` |
| View own appointments, queue, notifications | Every signed-in user (results are scoped to the user) |

Data is scoped automatically: a patient sees only their own records, a doctor sees only appointments assigned to them, and staff see records for their `hospitalId`.

> The schema also defines `ACCOUNTS` and `VIEWER` roles for future use. The frontend portal guard currently opens the hospital dashboard only for `HOSPITAL_ADMIN` and `SUPER_ADMIN`.

---

## User flows

### 1. Overall user journey

```mermaid
flowchart TD
    Start([Visitor opens SwasthSetu]) --> Landing[Public website]
    Landing --> Choice{Who are you?}

    Choice -->|Patient| PLogin["/login/<br/>Enter mobile number"]
    Choice -->|Staff| SLogin["/staff-login/<br/>Employee ID + password"]

    PLogin --> OTP[Verify 6-digit OTP]
    OTP --> Known{Existing patient?}
    Known -->|Yes| PDash[Patient dashboard]
    Known -->|No| Reg[Registration form] --> PDash

    SLogin --> RoleCheck{Role in JWT}
    RoleCheck -->|DOCTOR| DDash[Doctor portal]
    RoleCheck -->|Admin / staff| HDash[Hospital dashboard]

    PDash --> P1[View appointments & token]
    PDash --> P2[Track live queue]
    PDash --> P3[Read notifications]
    PDash --> P4[View lab reports]

    DDash --> D1[See today's OPD stats]
    DDash --> D2[Start consultation]
    D2 --> D3[Complete consultation]

    HDash --> H1[Create appointment & token]
    HDash --> H2[Update lab report status]
    HDash --> H3[Update blood stock units]
    HDash --> H4[Allocate / free beds]

    PDash & DDash & HDash --> Logout([Sign out])
```

### 2. Patient OTP login and registration

```mermaid
sequenceDiagram
    autonumber
    actor P as Patient
    participant W as Patient login page
    participant A as Express API (/auth)
    participant R as Redis
    participant O as OTP provider
    participant D as PostgreSQL

    P->>W: Enter mobile number
    W->>A: POST /patient/send-otp
    A->>R: Check cooldown key (60 s)
    alt Cooldown active
        A-->>W: 429 Please wait
    else Allowed
        A->>R: Store Argon2-hashed OTP (TTL 5 min) + cooldown
        A->>O: sendOtp(mobile, otp)
        A-->>W: OTP sent (demoOtp returned in development)
    end

    P->>W: Enter 6-digit OTP
    W->>A: POST /patient/verify-otp
    A->>R: Load OTP record, check expiry & attempts (max 5)
    alt Invalid / expired
        A-->>W: 401 or 429
    else Valid
        A->>R: Delete OTP, set "verified" flag (5 min)
        A->>D: Find patient by mobile
        alt Patient exists
            A->>D: Save hashed refresh token
            A-->>W: accessToken + refresh cookie + redirectTo
        else New patient
            A-->>W: registrationRequired: true
            P->>W: Fill name, DOB, gender, address, emergency contact
            W->>A: POST /patient/register
            A->>R: Consume "verified" flag
            A->>D: Create PATIENT user
            A-->>W: 201 accessToken + refresh cookie
        end
    end
    W->>W: Save access token in localStorage
    W-->>P: Open /patient/dashboard/
```

### 3. Staff login (doctor / hospital)

```mermaid
flowchart TD
    A[Staff opens /staff-login/] --> B[Enter employee ID + password]
    B --> C[POST /api/v1/auth/staff/login]
    C --> V{Zod validation<br/>password ≥ 8 chars}
    V -->|Fail| E400[400 Bad Request]
    V -->|Pass| F[Find user by employeeId]
    F --> G{User found and<br/>Argon2 password matches?}
    G -->|No| E401[401 Invalid employee ID or password]
    G -->|Yes| T[Issue access JWT 15 min<br/>+ refresh JWT 7 days]
    T --> H[Store Argon2 hash of refresh token]
    H --> I{Role}
    I -->|DOCTOR| J[redirectTo /doctor/dashboard]
    I -->|Other staff| K[redirectTo /hospital/dashboard]
    J & K --> L{temporaryPassword?}
    L -->|Yes| M[forcePasswordChange: true]
    L -->|No| N[Portal opens]
    M --> N
```

### 4. Token refresh and logout

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser
    participant G as portal-guard.js
    participant A as Express API
    participant D as PostgreSQL

    B->>G: Open a dashboard page
    G->>G: Decode JWT from localStorage
    alt Missing, expired, or wrong role
        G-->>B: Redirect to /login/ or /staff-login/
    else Valid
        G-->>B: Render portal
    end

    B->>A: POST /auth/refresh (httpOnly refreshToken cookie)
    A->>A: Verify refresh JWT signature and type
    A->>D: Compare with stored Argon2 hash
    alt Match
        A->>D: Rotate: store hash of new refresh token
        A-->>B: 201 new accessToken + new cookie
    else No match
        A-->>B: 401 Invalid refresh token
    end

    B->>A: POST /auth/logout (Bearer token)
    A->>D: Clear refreshTokenHash
    A-->>B: 204 + clear cookie
```

### 5. Appointment and OPD queue lifecycle

```mermaid
stateDiagram-v2
    [*] --> WAITING: Admin/Reception creates appointment<br/>(token number assigned)
    WAITING --> IN_CONSULTATION: Doctor clicks Start<br/>consultationStartedAt set
    IN_CONSULTATION --> COMPLETED: Doctor clicks Complete<br/>consultationEndedAt set
    COMPLETED --> [*]

    note right of WAITING
        Patient notified:
        "Appointment confirmed"
    end note
    note right of IN_CONSULTATION
        Patient notified:
        "Your consultation has started"
    end note
    note right of COMPLETED
        Patient notified:
        "Consultation completed"
    end note
```

The live queue (`GET /appointments/queue`) shows every appointment that is `WAITING` or `IN_CONSULTATION`, ordered by token number. `CONFIRMED` and `CANCELLED` exist in the schema for future scheduling features.

**How token numbers work:** when an appointment is created, the API finds the highest token for that hospital and time slot and adds one. The first token in a slot is 41.

### 6. End-to-end care journey

```mermaid
sequenceDiagram
    autonumber
    actor H as Hospital Admin
    actor D as Doctor
    actor P as Patient
    participant API as Express API
    participant DB as PostgreSQL

    H->>API: GET /appointments/patients and /doctors
    H->>API: POST /appointments {patientId, doctorId, department, scheduledAt, complaint, priority}
    API->>DB: Create appointment (status WAITING, next token)
    API->>DB: Create notification APPOINTMENT_CREATED
    API-->>H: 201 appointment

    P->>API: GET /appointments/overview
    API-->>P: Appointment, queue position, stats

    D->>API: GET /appointments/overview
    API-->>D: Assigned appointments and queue
    D->>API: POST /appointments/:id/start
    API->>DB: Status IN_CONSULTATION + QUEUE_UPDATE notification
    D->>API: POST /appointments/:id/complete
    API->>DB: Status COMPLETED + CONSULTATION_COMPLETED notification

    P->>API: GET /appointments/notifications
    API-->>P: Latest 30 notifications
    P->>API: GET /operations/lab-reports
    API-->>P: Own lab reports
```

### 7. Hospital operations (labs, blood, beds)

```mermaid
flowchart LR
    Staff[Hospital staff] --> Dash[Hospital dashboard]

    Dash --> Lab[Lab reports]
    Dash --> Blood[Blood bank]
    Dash --> Beds[Bed management]

    Lab --> L1["GET /operations/lab-reports"]
    Lab --> L2["PATCH /operations/lab-reports/:id<br/>status, remarks"]
    L2 --> LS{{"PENDING → PROCESSING → READY → REVIEWED<br/>uploadDate set when READY"}}

    Blood --> B1["GET /operations/blood-stocks"]
    Blood --> B2["PATCH /operations/blood-stocks/:id<br/>units"]
    B2 --> BS{{"Units compared with<br/>criticalThreshold per blood group"}}

    Beds --> D1["GET /operations/beds"]
    Beds --> D2["PATCH /operations/beds/:id<br/>status, patientName, assignedDoctor, remarks"]
    D2 --> DS{{"AVAILABLE ⇄ OCCUPIED ⇄ MAINTENANCE<br/>admissionDate set when OCCUPIED"}}

    L2 & B2 & D2 --> RBAC{"Role allowed?<br/>Admin, Lab, Blood Bank,<br/>Bed Manager"}
    RBAC -->|No| F403[403 Forbidden]
    RBAC -->|Yes| Scope["Record must belong to<br/>the user's hospital"] --> DB[(PostgreSQL)]
```

---

## Request lifecycle inside the API

```mermaid
flowchart TD
    Req[Incoming HTTP request] --> Cors[cors<br/>open in dev, FRONTEND_ORIGIN in production]
    Cors --> Json[express.json]
    Json --> Cookie[cookie-parser]
    Cookie --> Match{Route matched?}
    Match -->|No| NF[notFoundHandler → 404]
    Match -->|Yes| Auth{Protected route?}
    Auth -->|Yes| JWT["authenticate(jwt)<br/>Bearer access token"]
    JWT -->|Invalid| E401[HttpError 401]
    JWT -->|Valid| Val
    Auth -->|No| Val["validateBody(zod schema)"]
    Val -->|ZodError| E400[400 with issue messages]
    Val -->|OK| Handler["asyncHandler → Service"]
    Handler -->|RBAC / not found / conflict| HE[HttpError 403 / 404 / 409 / 429]
    Handler -->|Success| Res[JSON response]
    NF & E401 & E400 & HE --> EH[errorHandler<br/>statusCode · message · error]
    Handler -->|Unexpected| E500[500 Internal server error] --> EH
```

Every error has the same JSON shape:

```json
{ "statusCode": 404, "message": "Appointment not found.", "error": "Not Found" }
```

---

## Data model

```mermaid
erDiagram
    USER ||--o{ APPOINTMENT : "books (patient)"
    USER ||--o{ APPOINTMENT : "consults (doctor)"
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ LAB_REPORT : has
    APPOINTMENT ||--o{ NOTIFICATION : triggers

    USER {
        uuid id PK
        string hospitalId
        enum role
        string mobileNumber UK
        string employeeId UK
        string doctorId UK
        string passwordHash
        string refreshTokenHash
        boolean temporaryPassword
        string fullName
        date dateOfBirth
        enum gender
        string bloodGroup
    }
    APPOINTMENT {
        uuid id PK
        string hospitalId
        uuid patientId FK
        uuid doctorId FK
        int tokenNumber
        string department
        datetime scheduledAt
        enum status
        enum priority
        string chiefComplaint
        datetime consultationStartedAt
        datetime consultationEndedAt
    }
    NOTIFICATION {
        uuid id PK
        uuid userId FK
        uuid appointmentId FK
        string type
        string title
        string message
        string channel
        datetime readAt
    }
    LAB_REPORT {
        uuid id PK
        string hospitalId
        uuid patientId FK
        string testName
        string requestedBy
        enum status
        datetime uploadDate
        string remarks
    }
    BLOOD_STOCK {
        uuid id PK
        string hospitalId
        string bloodGroup
        int units
        int criticalThreshold
        string updatedBy
    }
    BED {
        uuid id PK
        string hospitalId
        string bedNumber
        string ward
        string department
        string patientName
        string assignedDoctor
        enum status
        datetime admissionDate
    }
```

**Enums:** `Role` (PATIENT, DOCTOR, SUPER_ADMIN, HOSPITAL_ADMIN, RECEPTION, LAB_STAFF, BLOOD_BANK_STAFF, BED_MANAGER, ACCOUNTS, VIEWER) · `AppointmentStatus` · `AppointmentPriority` (NORMAL, HIGH, EMERGENCY) · `LabReportStatus` · `BedStatus` · `Gender`.

---

## API reference

Base URL: `http://127.0.0.1:3000/api/v1` · 🔒 = requires `Authorization: Bearer <accessToken>`

### Health

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Returns `{ "status": "ok" }` (no `/api/v1` prefix) |

### Auth — `/auth`

| Method | Path | Body | Description |
| --- | --- | --- | --- |
| POST | `/patient/send-otp` | `{ mobileNumber }` | Send a 6-digit OTP (60 s cooldown, 5 min expiry) |
| POST | `/patient/verify-otp` | `{ mobileNumber, otp }` | Log in, or return `registrationRequired: true` |
| POST | `/patient/register` | `{ mobileNumber, fullName, dateOfBirth, gender, address, bloodGroup?, emergencyContact }` | Create a patient after OTP verification |
| POST | `/staff/login` | `{ employeeId, password }` | Doctor and staff login |
| POST | `/refresh` | refresh cookie | Rotate tokens and return a new access token |
| POST 🔒 | `/logout` | — | Revoke the refresh token and clear the cookie |

### Appointments — `/appointments` 🔒

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | Appointments for the current user |
| GET | `/queue` | Live queue (WAITING + IN_CONSULTATION) |
| GET | `/overview` | Appointments + queue + stats (total, completed, waiting, inConsultation) |
| GET | `/patients` | Up to 50 patients (staff and doctors) |
| GET | `/doctors` | Doctors in the user's hospital |
| GET | `/notifications` | Latest 30 notifications for the user |
| POST | `/` | Create an appointment `{ patientId, doctorId, department, scheduledAt, chiefComplaint, priority? }` |
| POST | `/:id/start` | Move to IN_CONSULTATION |
| POST | `/:id/complete` | Move to COMPLETED |

### Operations — `/operations` 🔒

| Method | Path | Body | Description |
| --- | --- | --- | --- |
| GET | `/lab-reports` | — | Patient: own reports · Staff: hospital reports |
| PATCH | `/lab-reports/:id` | `{ status?, remarks? }` | Update report status or remarks |
| GET | `/blood-stocks` | — | Blood stock by group |
| PATCH | `/blood-stocks/:id` | `{ units }` | Set available units |
| GET | `/beds` | — | Beds in the hospital |
| PATCH | `/beds/:id` | `{ status?, patientName?, assignedDoctor?, remarks? }` | Allocate, free, or mark a bed for maintenance |

---

## Project structure

```text
swasthsetu/
├── apps/
│   ├── backend/                      # Express.js + TypeScript API
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Data model
│   │   │   ├── migrations/           # SQL migrations
│   │   │   └── seed.ts               # Demo hospital, staff, patients, beds, blood, labs
│   │   ├── src/
│   │   │   ├── server.ts             # Bootstrap: env, Prisma, Redis, DI, graceful shutdown
│   │   │   ├── app.ts                # Express app factory: middleware + routers
│   │   │   ├── app.test.ts           # Supertest API tests
│   │   │   ├── config/env.ts         # Zod-validated environment
│   │   │   ├── common/               # asyncHandler, validateBody, HttpError, error handlers
│   │   │   ├── cache/                # Redis and in-memory key-value stores
│   │   │   ├── database/             # PrismaService + auth user repository
│   │   │   └── modules/
│   │   │       ├── auth/             # Routes, JWT, OTP, Argon2, providers, middleware
│   │   │       ├── appointments/     # Booking, queue, consultation, notifications
│   │   │       ├── operations/       # Lab reports, blood stock, beds
│   │   │       └── …                 # Reserved folders for future domain modules
│   │   ├── docker-compose.yml        # PostgreSQL (6543) + Redis (6379)
│   │   └── .env.example
│   └── web/                          # Static frontend
│       ├── public/                   # Landing + login route pages
│       └── src/
│           ├── public-portal/        # Landing and auth scripts/styles
│           ├── patient-portal/       # Patient dashboard
│           ├── doctor-portal/        # Doctor OPD workspace
│           ├── hospital-portal/      # Hospital operations dashboard
│           └── shared/               # portal-guard.js, internal-app.js, shared styles
├── docs/                             # Architecture, auth, features, folder structure
├── scripts/serve-frontend.cjs        # Frontend static router + runtime API config
├── DEMO.md
└── package.json
```

---

## Run locally

### Prerequisites

- Node.js 20
- pnpm 9 (`corepack enable` sets this up)
- Docker Desktop

### 1. Start PostgreSQL and Redis

```bash
cd apps/backend
docker compose up -d
```

### 2. Configure and start the API

```bash
cp .env.example .env
pnpm install
pnpm prisma:migrate
pnpm prisma:seed
pnpm start:dev
```

`start:dev` runs the API with `tsx watch` at `http://127.0.0.1:3000/api/v1`. For a production-style run, use `pnpm build` and then `pnpm start`.

### 3. Start the frontend

From the repository root:

```bash
npm run frontend
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173).

### Useful scripts

| Command | Where | What it does |
| --- | --- | --- |
| `pnpm start:dev` | `apps/backend` | Run the API with hot reload |
| `pnpm build` / `pnpm start` | `apps/backend` | Compile to `dist/` and run |
| `pnpm test` | `apps/backend` | Run Vitest tests |
| `pnpm typecheck` | `apps/backend` | Type-check without emitting files |
| `pnpm prisma:migrate` | `apps/backend` | Apply migrations |
| `pnpm prisma:seed` | `apps/backend` | Load demo data |
| `pnpm demo:reset` | `apps/backend` | Reset the database and reseed |
| `npm run frontend` | root | Serve the frontend on port 4173 |
| `npm run backend` | root | Shortcut for `pnpm start:dev` in the backend |

---

## Environment variables

### Backend (`apps/backend/.env`)

| Variable | Default | Description |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test`, or `production`. Production uses the SMS OTP provider, secure cookies, and strict CORS |
| `PORT` | `3000` | API port |
| `FRONTEND_ORIGIN` | `http://127.0.0.1:4173` | Allowed CORS origin in production |
| `DATABASE_URL` | — | PostgreSQL connection string (local Docker uses port `6543`) |
| `REDIS_URL` | — | Redis connection string |
| `JWT_ACCESS_SECRET` | — | Secret for 15-minute access tokens |
| `JWT_REFRESH_SECRET` | — | Different secret for 7-day refresh tokens |

The API checks these variables with Zod at startup and stops with a clear message if any are missing or invalid.

### Frontend server

| Variable | Default | Description |
| --- | --- | --- |
| `FRONTEND_PORT` / `PORT` | `4173` | Port for the static server |
| `SWASTHSETU_API_URL` | `http://127.0.0.1:3000/api/v1` | API base URL, served to the browser through `/runtime-config.js` |

---

## Demo accounts

Run `pnpm prisma:seed` first.

| Role | Login | Password / method |
| --- | --- | --- |
| Hospital Admin | `HA-1001` | `ChangeMe123!` |
| Doctor | `DR-1001` (also `DR-1002`, `DR-1003`) | `ChangeMe123!` |
| Patient | `9000000001` | Request an OTP. In development the OTP is shown in the response and the API log |

### Suggested demo

1. Log in as **Hospital Admin**, then create an appointment for a patient with `DR-1001`.
2. Log in as **Doctor**, then start and complete that consultation from the live queue.
3. Log in as **Patient** `9000000001` to see the updated appointment, notifications, and lab reports.

See [DEMO.md](DEMO.md) for the full walkthrough.

---

## Testing

```bash
cd apps/backend
pnpm test
```

- `src/app.test.ts` — Supertest API contract tests using injected fake services: health check, patient OTP response, Zod validation and malformed JSON, staff login with the refresh cookie, protected routes, and the 404 error shape.
- `src/modules/auth/services/otp.service.test.ts` — OTP issue/verify and resend cooldown, using the in-memory key-value store.

---

## Deployment

SwasthSetu runs on **Render** as four services:

```mermaid
flowchart LR
    User([User]) --> Web["Render Web Service<br/>swasthsetu-web<br/>npm run frontend"]
    Web -->|SWASTHSETU_API_URL| Api["Render Web Service<br/>Express API<br/>pnpm build && pnpm start"]
    Api --> PG[("Render PostgreSQL")]
    Api --> KV[("Render Key Value<br/>Redis-compatible")]
```

For production, set `NODE_ENV=production`, use strong and different JWT secrets, set `FRONTEND_ORIGIN` to the web service URL, and set `SWASTHSETU_API_URL` on the frontend service to the API URL.

---

## Roadmap

- Connect a real SMS provider (MSG91, Twilio, or Textlocal) in `SmsProvider`. Right now it throws an error in production until it is configured.
- Send notifications over WhatsApp. They are currently stored in the app only (`channel = IN_APP`).
- Add API endpoints for prescriptions, medical history, and full doctor and hospital management. The reserved module folders are already in place.
- Add a password-change flow for staff accounts that have `temporaryPassword`.
- Add live queue updates with WebSockets or server-sent events.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Authentication flow](docs/AUTHENTICATION.md)
- [Features](docs/FEATURES.md)
- [Folder structure](docs/FOLDER_STRUCTURE.md)
- [Demo guide](DEMO.md)
