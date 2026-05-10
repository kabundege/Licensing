# BNR Licensing API

Node.js REST API for the BNR bank licensing and compliance portal: authenticated users, license **applications** with a regulated status workflow, **documents** on disk, **audit** trails, and **supervisor / executive** dashboards (see [HTTP API overview](#http-api-overview)).

The live contract is the **OpenAPI 3** document served at runtime and in this repo at `src/docs/openapi.ts`.

## Requirements

- **Node.js** ≥ 20  
- **pnpm** (see `packageManager` in `package.json`)  
- **PostgreSQL** 16+ (local or Docker)

## Quick start

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Start PostgreSQL** (from this directory)

   ```bash
   pnpm run db:up
   ```

   This uses `docker-compose.yml` (database `bnr`, user/password `bnr`, port `5432`).

3. **Configure environment**

   Create a `.env` in `api/` (see [Environment variables](#environment-variables)). For local development, `JWT_SECRET` can be omitted; a dev-only fallback is used when `NODE_ENV` is not `production`.

4. **Seed RBAC and demo users** (optional but useful for first run)

   ```bash
   pnpm run seed
   ```

   Overrides: `SEED_ADMIN_PASSWORD`, `SEED_SUPERUSER_PASSWORD`, etc. Defaults live in `scripts/seed/constants.ts`.

5. **Run the API**

   ```bash
   pnpm run dev
   ```

   Default URL: `http://localhost:3000` (or `PORT` from env).

6. **Explore the API**

   - OpenAPI JSON: `GET /api/docs/openapi.json`  
   - Swagger UI: `GET /api/docs`  
   - Liveness: `GET /health`

## Environment variables

| Variable | Purpose | Default / notes |
| -------- | ------- | ---------------- |
| `NODE_ENV` | Runtime mode | `development`; in **`production`**, `JWT_SECRET` must be ≥ 32 characters |
| `PORT` | HTTP port | `3000` |
| `JWT_SECRET` | JWT signing | Required in production; dev fallback if unset and not production |
| `CORS_ORIGIN` | Allowed origins | `*`; comma-separated list for multiple origins |
| `POSTGRES_HOST` | DB host | `localhost` |
| `POSTGRES_PORT` | DB port | `5432` |
| `POSTGRES_USER` | DB user | `bnr` |
| `POSTGRES_PASSWORD` | DB password | `bnr` |
| `POSTGRES_DB` | Database name | `bnr` |
| `PG_POOL_MAX` | Pool size cap | `10` |
| `SEED_*` | Seed passwords | See `scripts/seed/` |

## Scripts

| Command | Description |
| ------- | ----------- |
| `pnpm run dev` | `tsx watch` on `src/index.ts` |
| `pnpm run build` | Compile to `dist/` (`tsconfig.build.json`) |
| `pnpm run start` | Run compiled `dist/index.js` |
| `pnpm run typecheck` | `tsc --noEmit` |
| `pnpm run test` | Vitest, single run |
| `pnpm run test:watch` | Vitest watch mode |
| `pnpm run test:coverage` | Vitest with coverage |
| `pnpm run seed` | RBAC + seed users (`scripts/seed.ts`) |
| `pnpm run db:up` / `db:down` | Docker Compose Postgres up/down |

## Project layout

```
api/
├── src/
│   ├── index.ts              # Entry: env, DB init, HTTP listen
│   ├── app.ts                # Express app, routers, Swagger, global middleware
│   ├── config/               # Environment and JWT helper
│   ├── database/             # TypeORM DataSource, transactions
│   ├── docs/                 # OpenAPI document + doc tests
│   ├── middleware/           # Auth, validation helpers, errors, upload limits
│   ├── modules/              # Feature modules (see below)
│   ├── repository/           # Shared TypeORM repository exports
│   ├── shared/               # Errors, async handlers
│   └── validation/           # Yup schemas and query/body validators
├── scripts/seed/             # RBAC seeding and demo accounts
├── docker-compose.yml        # Local Postgres
├── package.json
└── tsconfig*.json
```

### Feature modules (`src/modules/`)

Modules follow a common pattern: **routes** (Express `Router`), **controllers** (HTTP ↔ service), **services** (business logic), **entities** (TypeORM), and **tests** under `test/` or colocated.

| Module | Responsibility |
| ------ | -------------- |
| **auth** | Signup, login, JWT issuance, `GET /me`, admin user listing and promotion (`manage_users` permission) |
| **applications** | CRUD-style application lifecycle, optimistic locking on status transitions, compliance audit log views for staff |
| **documents** | Multipart uploads and secure download; files under workspace-relative `uploads/` |
| **audit** | Admin global audit log search |
| **analytics** | **ADMIN** only — executive-style aggregates (`GET /analytics/summary`; OpenAPI: *Executive Oversight Analytics*) |
| **admin** | Supervisor dashboard metrics (`GET /admin/dashboard-stats`; OpenAPI: *Regulatory Oversight Dashboard*) — requires **`analytics:view_dashboard`** (seeded on **ADMIN** and **APPROVER**) |

Routers are mounted in `src/app.ts` under `/api/<area>` (for example `/api/admin`, `/api/analytics`).

## Authentication and authorization

- **JWT** bearer tokens (`Authorization: Bearer <token>`) from `POST /api/auth/login`.
- Payload includes **`roles`** (sorted role names) and flattened **`permissions`** derived from role → permission assignments in the database.
- Guards live in `src/middleware/auth.middleware.ts`, for example:
  - `requireJwt` — valid token and loaded user
  - `restrictTo(...)` — permission tokens required
  - `requireAdminRole` — **ADMIN** role only
  - `requireStaffComplianceAuditAccess` — reviewer / approver / admin for sensitive audit reads
- Permission constants and compound tokens are defined in `src/modules/auth/app-permissions.ts`. Notable tokens include **`users:manage_users`** (admin user management), **`analytics:view_dashboard`** (supervisor dashboard stats), and application transition pairs such as **`application:approve`**.
- After pulling changes that add permissions, run **`pnpm run seed`** again so roles pick up new permission rows (the seed merges missing role-permission links).

Application **status** transitions are validated against a allow-list matrix in `application-transitions.ts` and recorded in **`audit_logs`**. If an approver attempts **APPROVED** or **REJECTED** but is the same user as the assigned reviewer, the request fails (separation of duties) and **`audit_logs`** may record **`APPROVAL_BLOCKED_REVIEWER_IDENTITY`** so dashboards can count integrity-related blocks.

## Data layer

- **TypeORM** with PostgreSQL; entities include `User`, `Role`, `Permission`, `Application`, `AuditLog`, `Document`.
- In non-production environments, **`synchronize: true`** applies schema from entities (see `src/database/data-source.ts`). Production should rely on migrations once you add them (`migrations: []` today).
- **Transactions**: `runInTransaction` in `src/database/transaction.ts` wraps multi-step work (for example status change + audit row).

## HTTP API overview

Exact paths, bodies, and response shapes are defined in **`src/docs/openapi.ts`** and browsable at **`/api/docs`**.

High-level map:

| Prefix | Notes |
| ------ | ----- |
| `/api/auth` | Public signup/login; JWT for `me` and admin user routes |
| `/api/applications` | JWT required; list/create applications; get detail; patch status; staff audit logs |
| `/api/documents` | JWT; upload by `applicationId`, download by document id |
| `/api/audit` | Admin audit search |
| `/api/analytics` | **`GET /summary`** — **ADMIN** only; aggregated status mix, UNDER_REVIEW timing, pipeline bottlenecks |
| `/api/admin` | **`GET /dashboard-stats`** — **`analytics:view_dashboard`** (**ADMIN** + **APPROVER** via seed); chart-oriented workload and throughput metrics |

Errors use a JSON envelope with `success: false` and `error: { code, message }` (see `AppError` and `error-handler.middleware.ts`). Operational auth failures use HTTP **403** per project convention.

## Testing

- **Vitest**; tests live next to features under `**/test/*.test.ts` and in `src/docs/test/`.
- Run `pnpm run test` before pushing changes.

## License

See repository root or `package.json` (`UNLICENSED` as shipped).
