# LOUREX Production Security Audit — Phase 1

This document defines the first production-hardening audit for LOUREX. It focuses on data isolation, role boundaries, storage privacy, and deployment safety before adding new product features.

## Scope

The audit covers the current LOUREX production-critical surfaces:

- Authentication and profile resolution
- Role-based access control
- Customer portal data visibility
- Partner data visibility
- Purchase request lifecycle
- Deal lifecycle
- Shipment and tracking visibility
- Financial entries and financial edit requests
- Transfer proof upload and review flow
- Supabase Storage buckets
- AI Edge Function safety
- CI/build validation

## Current baseline

The project already has an application-level RBAC layer and protected routes. This is useful for UX and navigation, but it must not be treated as the final security boundary. Production data isolation must be enforced at the Supabase/Postgres layer through RLS policies, restricted RPC functions, and private storage buckets.

## Critical security principles

1. Client-side filtering is not a security boundary.
2. Customer-visible data must be selected by secure SQL/RPC, not fetched broadly then filtered in React.
3. Partner-visible data must be scoped by assigned partner IDs in the database layer.
4. Financial data must be read/write separated by role.
5. Transfer proofs and payment documents must not be publicly readable.
6. AI prompts must receive only sanitized context that the current role is allowed to see.
7. Missing optional backend resources must be visible in health diagnostics, not silently treated as empty production data.

## High-priority audit findings to verify

### 1. Customer tracking visibility

Risk: tracking updates may be fetched broadly and filtered in the frontend.

Required outcome:

- Customers can only receive customer-visible tracking updates from the database layer.
- Internal notes must never be returned to a customer session.
- Public tracking must use a secure lookup RPC that returns a minimal customer-safe shape.

Recommended action:

- Add or verify a secure RPC for customer tracking timeline.
- Ensure RLS blocks direct customer reads of internal `tracking_updates` rows.
- Add tests for internal vs customer-visible tracking rows.

### 2. Partner deal visibility

Risk: partners must never receive unassigned deals, customers, attachments, or financial data.

Required outcome:

- Turkish partners only access deals where `assigned_turkish_partner_id = auth.uid()`.
- Saudi partners only access deals where `assigned_saudi_partner_id = auth.uid()`.
- Partner access to accounting must be explicitly view-only and scoped.

Recommended action:

- Verify RLS on `deals`, `shipments`, `attachments`, `tracking_updates`, and any partner settlement tables.
- Avoid loading all deals then filtering in application code for partner roles.

### 3. Accounting permissions

Risk: dashboard access roles and accounting management roles can be confused.

Required outcome:

- Separate accounting permissions into explicit groups:
  - accounting view roles
  - accounting create roles
  - accounting edit-request roles
  - accounting approval roles
- Saudi partner dashboard access must not imply financial mutation permissions.

Recommended action:

- Introduce role constants with precise names.
- Add unit tests proving each role can/cannot view, create, request edit, approve edit, and export financial data.

### 4. Transfer proof storage privacy

Risk: transfer proof/payment files are sensitive and should not be public URLs.

Required outcome:

- `transfer-proofs` bucket is private.
- The database stores storage paths, not public URLs.
- Read access uses signed URLs generated only for authorized users.
- Customers can only access their own proof files.
- Internal roles can review proof files according to management permissions.

Recommended action:

- Verify Supabase Storage policies for `transfer-proofs`.
- Replace any payment proof public URL assumptions with signed URL access.
- Add a helper such as `getTransferProofSignedUrl` with authorization checks.

### 5. Financial immutability

Risk: locked financial entries must remain append-only and corrections must be auditable.

Required outcome:

- Direct updates to locked financial entries are blocked by database triggers/RPC.
- Approved edit requests create correction entries or audited changes according to the defined financial model.
- Reject/approve actions are owner/management-only.

Recommended action:

- Verify `create_locked_financial_entry`, `request_financial_entry_edit`, and `review_financial_entry_edit_request` RPC permissions.
- Add integration-style tests for allowed and forbidden paths.

### 6. AI data safety

Risk: AI context can accidentally expose internal data to a customer if the caller passes unsafe context.

Required outcome:

- AI Edge Function trusts the authenticated user role from Supabase, not only the client-provided role.
- AI receives only safe, pre-sanitized context.
- Guest/customer modes must not expose internal details.

Recommended action:

- Validate `analysisMode` by role.
- Reject internal analysis modes for customer/guest users.
- Add per-role allowlists for AI modes.

### 7. Optional backend visibility

Risk: missing tables/RPCs may appear as empty dashboards.

Required outcome:

- Optional backend absence is visible in a system health page.
- Production operators can distinguish between “no data” and “backend resource missing”.

Recommended action:

- Add a `SystemHealth` diagnostic model.
- Surface missing table/function/storage status to owner/system roles only.

## Required CI gates

Phase 1 CI must run:

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Future CI gates should add:

- Supabase migration validation
- RLS policy smoke tests
- Playwright role visibility smoke tests
- bundle size budget
- Lighthouse check for public pages

## Recommended implementation order

1. Add CI workflow.
2. Add explicit accounting permission constants and tests.
3. Add AI mode allowlist by role.
4. Add secure tracking/customer timeline RPC or client wrapper contract.
5. Convert transfer proof access to private path + signed URL model.
6. Add owner-only System Health diagnostics.
7. Add Playwright role smoke tests.

## Definition of done for Phase 1

- CI exists and validates every pull request into `main`.
- Role constants are explicit and tested.
- No customer or partner workflow relies on frontend-only filtering for sensitive data.
- Transfer proof files are handled as private storage paths.
- AI internal modes are blocked for customer/guest roles.
- System health distinguishes missing backend resources from empty business data.
