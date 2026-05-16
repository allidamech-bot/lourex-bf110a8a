-- Final transfer proof constraint repair.
--
-- Transfer review fields are lifecycle fields:
-- - transfer_rejection_reason is only populated after an admin rejects a proof.
-- - review/approval timestamps and actors are only populated after review actions.
-- - proof URL/path fields are empty until a customer uploads a proof.
--
-- They must remain nullable so submit_transfer_proof_for_purchase_request can clear
-- transfer_rejection_reason back to NULL when a customer reuploads a corrected proof.

alter table public.purchase_requests
  alter column transfer_rejection_reason drop not null;

alter table public.purchase_requests
  alter column transfer_proof_url drop not null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'purchase_requests'
      and column_name = 'transfer_proof_path'
  ) then
    alter table public.purchase_requests
      alter column transfer_proof_path drop not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'purchase_requests'
      and column_name = 'transfer_reviewed_at'
  ) then
    alter table public.purchase_requests
      alter column transfer_reviewed_at drop not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'purchase_requests'
      and column_name = 'transfer_reviewed_by'
  ) then
    alter table public.purchase_requests
      alter column transfer_reviewed_by drop not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'purchase_requests'
      and column_name = 'transfer_approved_at'
  ) then
    alter table public.purchase_requests
      alter column transfer_approved_at drop not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'purchase_requests'
      and column_name = 'transfer_accepted_at'
  ) then
    alter table public.purchase_requests
      alter column transfer_accepted_at drop not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'purchase_requests'
      and column_name = 'transfer_accepted_by'
  ) then
    alter table public.purchase_requests
      alter column transfer_accepted_by drop not null;
  end if;
end $$;
