-- LOUREX RLS Hard Audit — Phase 1
-- Purpose: read-only security inspection for production-critical tables, policies, functions, and storage buckets.
-- Safe to run in Supabase SQL Editor. This script does not modify data, policies, roles, or functions.

-- 1) Critical table RLS status
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'profiles',
    'lourex_customers',
    'purchase_requests',
    'deals',
    'shipments',
    'tracking_updates',
    'shipment_events',
    'attachments',
    'financial_entries',
    'financial_edit_requests',
    'transfer_proofs',
    'audit_logs',
    'security_audit_events',
    'notifications'
  )
order by c.relname;

-- 2) Policies on production-critical tables
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles',
    'lourex_customers',
    'purchase_requests',
    'deals',
    'shipments',
    'tracking_updates',
    'shipment_events',
    'attachments',
    'financial_entries',
    'financial_edit_requests',
    'transfer_proofs',
    'audit_logs',
    'security_audit_events',
    'notifications'
  )
order by tablename, cmd, policyname;

-- 3) Public functions that should be reviewed for SECURITY DEFINER and grants
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  case when p.prosecdef then 'SECURITY DEFINER' else 'SECURITY INVOKER' end as security_mode,
  array_to_string(p.proacl, ', ') as grants
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'current_lourex_role',
    'upsert_current_customer_record',
    'upsert_lourex_customer_record',
    'create_locked_financial_entry',
    'request_financial_entry_edit',
    'review_financial_entry_edit_request',
    'submit_transfer_proof_for_purchase_request',
    'accept_transfer_proof_with_payment',
    'lookup_lourex_tracking',
    'lookup_shipment_by_tracking',
    'log_security_audit_event',
    'log_shipment_event'
  )
order by p.proname, arguments;

-- 4) Storage bucket privacy status
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id in ('product-images', 'documents', 'transfer-proofs')
order by id;

-- 5) Storage object policies
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by cmd, policyname;

-- 6) High-risk grants on critical tables
select
  table_schema,
  table_name,
  grantee,
  privilege_type,
  is_grantable
from information_schema.table_privileges
where table_schema = 'public'
  and table_name in (
    'financial_entries',
    'financial_edit_requests',
    'transfer_proofs',
    'purchase_requests',
    'deals',
    'tracking_updates',
    'attachments'
  )
  and grantee in ('anon', 'authenticated', 'public')
order by table_name, grantee, privilege_type;

-- 7) RLS disabled warning summary
select
  c.relname as table_name,
  case
    when not c.relrowsecurity then 'FAIL: RLS disabled'
    when c.relrowsecurity and not c.relforcerowsecurity then 'WARN: RLS enabled but not forced'
    else 'OK: RLS enabled and forced'
  end as rls_status
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'profiles',
    'lourex_customers',
    'purchase_requests',
    'deals',
    'shipments',
    'tracking_updates',
    'shipment_events',
    'attachments',
    'financial_entries',
    'financial_edit_requests',
    'transfer_proofs',
    'audit_logs',
    'security_audit_events',
    'notifications'
  )
order by
  case
    when not c.relrowsecurity then 0
    when c.relrowsecurity and not c.relforcerowsecurity then 1
    else 2
  end,
  c.relname;

-- Expected manual review notes:
-- - transfer-proofs bucket should be private: storage.buckets.public = false.
-- - financial_entries should not allow direct client updates/deletes of locked rows.
-- - financial_edit_requests approval should be owner-only at RPC/RLS level.
-- - tracking_updates must not expose internal rows to customers or public tracking.
-- - attachments must scope customer-visible access by linked request/deal ownership.
-- - SECURITY DEFINER functions must have explicit grants and a safe search_path.
-- - Frontend filtering must not be the only enforcement layer for customer/partner visibility.
