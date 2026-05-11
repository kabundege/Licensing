# BNR Licensing Portal

The **BNR Licensing Portal** is the web client for the National Bank of Rwanda licensing & compliance workflow. It is a [Next.js](https://nextjs.org) App Router app that lets:

- **Applicants** create, submit and clarify licensing applications and upload supporting documents.
- **Reviewers** triage the global queue, claim cases, request clarifications, and escalate to final review.
- **Approvers** make the final approve/reject decision.
- **Admins** manage users, roles and operational dashboard stats.

Authentication, RBAC, document storage and the application state machine live in the sibling [`api/`](../api) service; this app talks to it over REST.

For the system-level design (state machine, ERD, roles, deployment) see [`../Design.md`](../Design.md).

---

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19) |
| Auth | `next-auth` v5 (Credentials provider, JWT session) |
| Data fetching | `@tanstack/react-query` v5 + `axios` (client) / `fetch` (server) |
| Forms | `formik` + `yup` |
| UI | Tailwind CSS v4, `shadcn/ui` primitives, `lucide-react` icons, `sonner` toasts |
| Validation of JWT claims | `jose` (decode only — verification happens in the API) |

> ⚠️ This repo pins **Next.js 16** and **React 19**. The App Router APIs and conventions may differ from older versions — always check `node_modules/next/dist/docs/` before introducing new patterns (see [`AGENTS.md`](./AGENTS.md)).

---

## Getting started

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io) 10+ (the project pins `pnpm@10.33.3` via `packageManager`)
- A running instance of the [`api/`](../api) service (defaults to `http://localhost:3001`)

### 1. Install

```bash
pnpm install
```

### 2. Configure environment

Copy the example file and fill it in:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
| --- | --- | --- |
| `AUTH_SECRET` | prod | Secret for signing the NextAuth JWT session. Generate with `openssl rand -base64 32`. In dev a fallback secret is used if unset. |
| `NEXTAUTH_SECRET` | optional | Legacy alias for `AUTH_SECRET`. |
| `AUTH_URL` | yes | Public URL of this portal (e.g. `http://localhost:3000`). Used for NextAuth callback URLs. |
| `API_URL` | yes | Base URL of the Express API (no trailing slash). Used server-side. |
| `NEXT_PUBLIC_API_URL` | optional | Same value exposed to client bundles. Set only if a browser code path needs it. |

### 3. Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login`; create an account via `/register` (or sign in with a user seeded by the API).

---

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the Next.js dev server. |
| `pnpm build` | Production build. |
| `pnpm start` | Serve the production build. |
| `pnpm lint` | Run ESLint (`eslint-config-next`). |

---

## Project structure

```
portal/
├── public/                       Static assets served at /
├── src/
│   ├── app/                      Next.js App Router routes
│   │   ├── (auth)/               Guest-only group: /login, /register
│   │   ├── (dashboard)/          Authenticated group: /dashboard, /dashboard/applications, /dashboard/staff, /dashboard/admin
│   │   ├── api/auth/[...nextauth]/route.ts  NextAuth route handler
│   │   ├── layout.tsx            Root layout: fonts, <Providers>
│   │   ├── page.tsx              Landing redirect
│   │   └── globals.css           Tailwind v4 entry + theme tokens
│   ├── auth.ts                   NextAuth config (Credentials → API login → JWT claims)
│   ├── middleware.ts             Edge auth gate + role-based area routing
│   ├── components/
│   │   ├── ui/                   shadcn/ui primitives (button, card, input, table, …)
│   │   ├── layout/               Shell + sidebar
│   │   ├── auth/                 Login/register forms + permission guards
│   │   ├── applications/         Applicant + staff case views (list, detail, footer actions, trail, docs)
│   │   ├── admin/                Admin dashboard client
│   │   └── providers.tsx         <SessionProvider> + ReactQueryProvider + TooltipProvider + Toaster
│   ├── providers/
│   │   └── ReactQueryProvider.tsx  Wires the persisted QueryClient
│   ├── config/
│   │   └── tantask.config.ts     QueryClient + persister + global mutation error toasts
│   ├── hooks/                    React Query hooks (applications, admin portal)
│   ├── lib/
│   │   ├── api/                  axios instance + typed API modules (applications, admin, documents)
│   │   ├── services/auth.service.ts  Server-side login helper used by NextAuth
│   │   ├── api-server.ts         Server-only `fetch` wrapper that injects the session JWT
│   │   ├── api-url.ts            Resolves API_URL / NEXT_PUBLIC_API_URL
│   │   ├── permissions.ts        Permission helpers + NAV_PERMISSIONS + MIDDLEWARE_RULES
│   │   ├── application-domain.ts ApplicationStatus enum, role helpers, badge tones
│   │   ├── application-transitions.ts  Allowed state transitions / labels
│   │   ├── audit-display.ts      Formatting helpers for the audit trail
│   │   ├── query-keys.ts         Centralised React Query keys
│   │   └── utils.ts              `cn()` and other tiny helpers
│   ├── constants/                Route names, query cache durations, request timeouts
│   ├── validation/               Yup schemas (auth, register)
│   └── types/                    Ambient typings (e.g. `next-auth.d.ts`)
├── components.json               shadcn/ui config
├── next.config.ts
├── tsconfig.json                 `@/*` path alias → `src/*`
├── eslint.config.mjs
├── .env.example
└── AGENTS.md                     Notes for AI assistants editing this app
```

---

## Routing

The app uses two App Router **route groups**:

- `app/(auth)/` — guest-only screens (`/login`, `/register`). Authenticated users hitting these are redirected to `/dashboard` by `middleware.ts`.
- `app/(dashboard)/` — authenticated area, gated by both the middleware and per-component permission guards.

All route URLs are centralised in [`src/constants/routeNames.ts`](./src/constants/routeNames.ts) — import `routes` instead of hard-coding paths:

```tsx
import routes from "@/constants/routeNames";

redirect(routes.dashboard.url);
```

| Path | Who can see it |
| --- | --- |
| `/login`, `/register` | Guests only |
| `/dashboard` | Any authenticated user |
| `/dashboard/applications` | Applicants see their own cases; staff see the global queue |
| `/dashboard/applications/new` | Anyone with `application:create` / `application:submit` |
| `/dashboard/applications/[id]` | Owner or staff (Reviewer/Approver/Admin) |
| `/dashboard/staff/review` | Holders of `application:review` / `application:start_review` |
| `/dashboard/admin` | Holders of `manage_users`, `users:manage_users`, `analytics:view_dashboard`, or `view_dashboard` |

---

## Authentication

`src/auth.ts` configures **NextAuth v5** with a Credentials provider:

1. The login form posts email/password to NextAuth.
2. `authorize()` calls `loginUser()` against the Express API and receives a signed JWT.
3. The JWT is decoded with `jose` to extract `sub`, `email`, `roles[]`, and `permissions[]`.
4. Those claims plus the raw access token are stored on the NextAuth JWT/session (12 h max age, `strategy: "jwt"`).

Consumers:

- **Client components** read the session via `useSession()` from `next-auth/react`.
- **Server components / route handlers** call `await auth()` from `@/auth`.
- The **axios client** (`src/lib/api/index.ts`) attaches `Authorization: Bearer <session.accessToken>` automatically in the browser.
- **Server `fetch`** goes through `apiFetch()` in `src/lib/api-server.ts`, which pulls the token from the server session.

> The API is the source of truth for permission verification. The portal only uses the decoded claims for UX gating (showing/hiding actions, route redirects).

---

## Authorization & permissions

There are three layers:

1. **Edge middleware** (`src/middleware.ts`) — redirects guests away from `/dashboard/*` and blocks `/dashboard/staff/*` and `/dashboard/admin/*` for users who lack the required permission tokens (`MIDDLEWARE_RULES`).
2. **Server components** — call `await auth()` and use helpers from `src/lib/permissions.ts` (`actorHasAnyToken`, `actorHasPermissionPair`, `userMayClaimSubmittedApplication`, `userMayViewApplicationCase`, …) to gate data fetching and rendering.
3. **Client components** — use `<PermissionGuard>` / `<PermissionGuardClient>` in `src/components/auth/` to hide buttons and panels.

Add new permission-aware UI by reusing the constants in [`src/lib/permissions.ts`](./src/lib/permissions.ts) (`NAV_PERMISSIONS`, `MIDDLEWARE_RULES`) rather than sprinkling magic strings across the codebase.

---

## Application state machine

The licensing workflow has seven states defined in [`src/lib/application-domain.ts`](./src/lib/application-domain.ts):

```
DRAFT → SUBMITTED → UNDER_REVIEW → PENDING_CLARIFICATION ↺ UNDER_REVIEW
                              ↓
                          FINAL_REVIEW → APPROVED | REJECTED
```

- `applicationStatusLabel(status)` produces human labels (`UNDER_REVIEW` → `UNDER REVIEW`).
- `applicationStatusBadgeTone(status)` / `applicationStatusBadgeClassName(status)` drive the colored badges in lists and the detail header.
- Allowed transitions (and the corresponding UI affordances) live in `src/lib/application-transitions.ts` and are rendered by `components/applications/application-action-footer.tsx`.

See [`../Design.md`](../Design.md) for the canonical state diagram and role permissions.

---

## Data fetching

This app uses TanStack React Query for all dynamic data, configured in [`src/config/tantask.config.ts`](./src/config/tantask.config.ts):

- A single `QueryClient` with `retry: false` and `gcTime: QUERY_CACHE_DURATION`.
- A `MutationCache` that auto-toasts Axios / Error messages via `sonner`.
- An **`async-storage-persister`** keyed by `bnr-portal-react-query` that persists cached queries in `localStorage` for offline-friendly reloads.

Query keys are centralised in [`src/lib/query-keys.ts`](./src/lib/query-keys.ts); always import from there to keep invalidations consistent. Typed API calls live in `src/lib/api/*-api.ts` and are consumed through hooks in `src/hooks/` (`useApplications`, `useAdminPortal`, …).

For server-rendered pages that need data without a client roundtrip, use `apiFetch()` from `src/lib/api-server.ts` inside the server component / route handler — it injects the session JWT automatically.

---

## Forms

Forms use **Formik + Yup**. Validation schemas live in [`src/validation/`](./src/validation) (e.g. `auth.validation.ts`, `register.validation.ts`) and are shared between the client form and any server-side checks. Submissions go through React Query mutations so error toasts are wired in for free.

---

## Styling

- **Tailwind CSS v4** via `@tailwindcss/postcss`; the entry file is `src/app/globals.css` (no `tailwind.config.js` is needed in v4 — design tokens are declared in CSS).
- Reusable primitives in `src/components/ui/` are generated by **shadcn/ui** (`components.json` describes the generator config). Prefer extending these components over introducing new one-off elements.
- Use the `cn()` helper from `src/lib/utils.ts` for conditional class composition.
- Icons come from `lucide-react`; toasts from `sonner`.

---

## Conventions

- **Path alias**: `@/*` resolves to `src/*` (see `tsconfig.json`).
- **Strings**: project code uses backtick template literals consistently — match the surrounding style.
- **Routes**: import from `@/constants/routeNames`. Do not hard-code `/login`, `/dashboard`, etc.
- **Permissions**: import from `@/lib/permissions`. Add new permission groups to `NAV_PERMISSIONS` instead of inlining tokens.
- **Comments**: keep them sparse and intent-focused — see the workspace style rules and `AGENTS.md`.

---

## Related documents

- [`../Design.md`](../Design.md) — system architecture, state machine, ERD, roles.
- [`../api/`](../api) — Express + PostgreSQL backend powering this portal.
- [`./AGENTS.md`](./AGENTS.md) — notes for AI assistants working in this codebase.
