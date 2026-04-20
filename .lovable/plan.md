

# Add Admin Dashboard & Settings Links to Navigation

## What's happening now
The Admin link exists only inside the user dropdown menu (desktop) and hamburger menu (mobile). On a 432px mobile viewport it's buried and easy to miss. The `/admin` route works and `AdminSettings` with Logistics/Security/General tabs is already wired to the "settings" tab inside the Admin page.

## Changes

### 1. Navbar — Add prominent admin-only links (desktop + mobile)
**File: `src/components/Navbar.tsx`**

- Add two gold-accented links after the public nav links, visible only when `isAdmin === true`:
  - **"Dashboard"** → `/admin` (opens overview tab)
  - **"Settings"** → `/admin?tab=settings&sub=security` (opens settings tab with Security sub-tab active)
- Desktop: render as `<Link>` items with a gold `Shield` icon, placed between the public links and the user avatar
- Mobile: render at the top of the authenticated section with gold text styling
- Future-proof with an `ADMIN_EMAILS` constant (empty array for now) — if populated, links only show when `isAdmin && (ADMIN_EMAILS.length === 0 || ADMIN_EMAILS.includes(user.email))`. Currently all admin-role users see the links.

### 2. Admin page — Read URL query params for tab activation
**File: `src/pages/Admin.tsx`**

- Import `useSearchParams` from react-router-dom
- On mount, read `?tab=` param and set `activeTab` accordingly (e.g. `?tab=settings` → settings tab)
- Pass a new `defaultSubTab` prop to `AdminSettings` based on `?sub=` param

### 3. AdminSettings — Accept optional default sub-tab
**File: `src/components/admin/AdminSettings.tsx`**

- Accept optional `defaultSubTab?: "logistics" | "security" | "general"` prop
- Use it as the `defaultValue` for the `<Tabs>` component (fallback: `"logistics"`)
- This allows `/admin?tab=settings&sub=security` to land directly on the Security tab for FaceID registration

## Files changed
| File | Change |
|------|--------|
| `src/components/Navbar.tsx` | Add admin-only Dashboard + Settings links (desktop & mobile) |
| `src/pages/Admin.tsx` | Read `?tab` and `?sub` from URL search params, pass `defaultSubTab` to AdminSettings |
| `src/components/admin/AdminSettings.tsx` | Accept `defaultSubTab` prop for initial tab selection |

## Technical notes
- No database changes needed — admin role check already works via `user_roles` table
- The `ADMIN_EMAILS` allowlist is a code-level constant for future hardening; currently empty so all admin-role users qualify
- URL params are read once on mount to avoid tab-switching conflicts during interaction

