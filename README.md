# LOUREX — Verified B2B Sourcing Platform

LOUREX is a verified-only B2B marketplace that connects buyers with vetted
suppliers (primarily Turkish factories) and gives both sides a structured
workspace for quotes, orders, documents, and shipment status.

The product is built as a single-page React application (Vite + TypeScript +
Tailwind + shadcn/ui) backed by Lovable Cloud for authentication, database,
storage, and edge functions.

---

## Stack

- **Frontend:** React 18, Vite 5, TypeScript, Tailwind CSS 3, shadcn/ui,
  Framer Motion, React Router
- **Backend:** Lovable Cloud (Supabase) — Postgres + Row Level Security,
  Auth, Storage, Edge Functions
- **State / data:** TanStack Query, Supabase JS client
- **i18n:** English / Arabic (RTL) / Turkish

## Getting started

```bash
npm install
npm run dev
```

Other scripts:

| Script | Purpose |
| ------ | ------- |
| `npm run dev`         | Start the Vite dev server |
| `npm run build`       | Production build |
| `npm run build:dev`   | Development-mode build |
| `npm run preview`     | Preview the production build |
| `npm run lint`        | Run ESLint |
| `npm run test`        | Run the Vitest suite |

The Supabase client and types in `src/integrations/supabase/` are managed
automatically — do not edit them by hand.

---

## Authentication & roles

Authentication is handled by Lovable Cloud (`auth.users`). On signup the
`handle_new_user` trigger creates a matching row in `public.profiles`.

Roles live in `public.user_roles` and are assigned **only by an admin**. The
`app_role` enum currently supports:

- `admin` — full platform access
- `factory` — approved supplier (granted automatically when an application
  is approved)
- `seller` / `manufacturer` — alternative supplier-style roles
- `broker` — trading-company role
- `buyer` / `user` — default buyer-side roles

Role checks are done with the security-definer function `public.has_role()`
inside RLS policies — never by querying `user_roles` directly from a policy
on the same table.

A helper `public.is_verified_user()` returns true when the caller's profile
has `verification_status` set to `verified` or `approved`, or when the user
is an admin. Most write paths (cart, deals, RFQs, reviews, orders) require
`is_verified_user()`.

---

## Supplier application flow

1. A signed-in user opens **Become a Supplier** (CTA in the hero / `/factory-signup`).
2. They submit a `factory_applications` row with company info and upload
   trade documents to the `verification-docs` storage bucket. Each upload is
   recorded in `kyc_documents`.
3. The application starts in status `pending`. The applicant can see only
   their own application.
4. Admins review the application in the Admin panel.

## Admin approval flow (idempotent)

Approval is handled by the security-definer function
`public.admin_approve_factory_application(p_application_id uuid)`:

- Verifies the caller is an `admin`.
- Locks the application row.
- If status is already `approved`, returns immediately (safe to retry).
- Creates a `factories` row for the applicant **only if one does not exist**
  (`factories.owner_user_id` has a unique partial index).
- Inserts the `factory` role into `user_roles` with
  `ON CONFLICT (user_id, role) DO NOTHING` (also enforced by a unique
  index on `user_roles(user_id, role)`).
- Marks the application as `approved` and writes an audit log entry.

This means clicking **Approve** twice — or two admins clicking it
simultaneously — cannot create duplicate factory records or duplicate role
assignments.

Rejections set the application's status to `rejected` directly.

---

## Product ownership rules

Products are owned by a `factory` (one factory per supplier user). The
following rules are enforced by RLS:

- **Insert/Update/Delete:** Only allowed for the `factories.owner_user_id`
  of the product's `factory_id`, or for an organization staff member with
  the `admin` / `manager` role inside that supplier organization.
- **Sellers (`seller_id` based):** Sellers can also CRUD products they
  personally own.
- **Admins:** Full access via the `Admins can manage products` policy.

A supplier therefore cannot read, edit, or delete another supplier's
products. Image uploads to the `product-images` bucket use the path prefix
`<userId>/...` so each user only writes under their own namespace.

The supplier-facing CRUD UI lives in
`src/components/factory/SupplierProductsManager.tsx` and is the **single
source of truth** for product management on the supplier dashboard.

---

## Public visibility rules

The public marketplace, catalog, and supplier profile pages are restricted to:

- **Suppliers:** only `factories.is_verified = true` are listed publicly.
  Both the storefront query and the supplier-profile route filter on this.
- **Products:** only rows that are `is_active = true` AND `status = 'approved'`
  AND whose factory is verified are returned publicly. This is enforced
  twice:
  - **Database (authoritative):** the `Public can view verified active
    approved products` RLS policy on `public.products`.
  - **Application:** marketplace and supplier-profile queries also filter
    on `is_active`, `status = 'approved'`, and `is_verified` for clarity
    and efficiency.

Draft or inactive products are never returned to anonymous or non-owner
buyers.

---

## Storage buckets

| Bucket              | Public | Purpose |
| ------------------- | ------ | ------- |
| `avatars`           | Yes    | User avatars |
| `product-images`    | Yes    | Product photos (path: `<userId>/<file>`) |
| `verification-docs` | No     | Supplier application trade documents |
| `kyc-documents`     | No     | KYC documents for individual users |
| `inspection-media`  | No     | Order inspection photos / video |

---

## Project structure (top level)

```
src/
  components/        Reusable UI + feature components
    admin/           Admin command center widgets
    factory/         Supplier dashboard (Command Center)
    ui/              shadcn/ui primitives
  pages/             Route components
  integrations/      Supabase client + generated types
  lib/               i18n + utilities
  hooks/             Reusable React hooks
supabase/
  functions/         Edge Functions (landed-cost, lourex-ai-chat, ...)
  migrations/        SQL migrations (managed by Lovable Cloud)
```
