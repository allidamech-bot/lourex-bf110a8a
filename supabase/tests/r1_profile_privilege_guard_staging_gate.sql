-- Staging-only R1 profile guard verification.
-- Run in a transaction on an isolated copy with one real (test) active customer
-- and a seeded owner. Never execute against production user records.
-- Assertions to run under a role-authenticated test JWT:
-- 1. Customer can still update full_name and phone on their own profile.
-- 2. INSERT of self-owned profile with role='owner' fails (SQLSTATE 42501).
-- 3. UPDATE of role, status, partner_type, verification_status and verified_at fails.
-- 4. Customer cannot change a different profile (RLS).
-- 5. Trusted owner/admin account-management RPC still updates allowed fields.
-- 6. User can still sign in and load their own profile.
-- Catalog assertions below are read-only; they prove installation, not behavior.
DO $verify$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.profiles'::regclass
      AND tgname = 'guard_profile_privilege_fields_trigger'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Profile privilege guard trigger missing';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    WHERE p.oid = 'public.guard_profile_privilege_fields()'::regprocedure
      AND (p.prosecdef OR has_function_privilege('anon', p.oid, 'EXECUTE'))
  ) THEN
    RAISE EXCEPTION 'Profile guard function must not use SECURITY DEFINER or expose anon EXECUTE';
  END IF;
END
$verify$;
