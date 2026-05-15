-- Phase 10: responsive workflow backend for transfer receipts and official order follow-up.

create table if not exists public.transfer_proofs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.purchase_requests(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete set null,
  customer_id uuid not null references auth.users(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  file_path text not null,
  file_name text not null,
  file_type text not null default '',
  file_size bigint not null default 0,
  storage_bucket text not null default 'transfer-proofs',
  status text not null default 'pending_review',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_followups (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.purchase_requests(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete set null,
  customer_id uuid not null references auth.users(id) on delete cascade,
  stage_code text not null,
  stage_title text not null,
  admin_note text not null default '',
  customer_note text not null default '',
  visibility text not null default 'internal_only',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'transfer_proofs_status_check') then
    alter table public.transfer_proofs
      add constraint transfer_proofs_status_check
      check (status in ('pending_review', 'approved', 'rejected'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'transfer_proofs_file_type_check') then
    alter table public.transfer_proofs
      add constraint transfer_proofs_file_type_check
      check (file_type in ('image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf', ''));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'order_followups_visibility_check') then
    alter table public.order_followups
      add constraint order_followups_visibility_check
      check (visibility in ('internal_only', 'customer_visible'));
  end if;
end $$;

create index if not exists idx_transfer_proofs_request_id on public.transfer_proofs(request_id);
create index if not exists idx_transfer_proofs_deal_id on public.transfer_proofs(deal_id);
create index if not exists idx_transfer_proofs_customer_id on public.transfer_proofs(customer_id);
create index if not exists idx_transfer_proofs_status on public.transfer_proofs(status);
create index if not exists idx_transfer_proofs_created_at on public.transfer_proofs(created_at desc);
create index if not exists idx_order_followups_request_id on public.order_followups(request_id);
create index if not exists idx_order_followups_deal_id on public.order_followups(deal_id);
create index if not exists idx_order_followups_customer_id on public.order_followups(customer_id);
create index if not exists idx_order_followups_visibility on public.order_followups(visibility);
create index if not exists idx_order_followups_created_at on public.order_followups(created_at desc);

alter table public.transfer_proofs enable row level security;
alter table public.order_followups enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'transfer_proofs' and policyname = 'Customers can insert own transfer proofs') then
    create policy "Customers can insert own transfer proofs"
      on public.transfer_proofs
      for insert
      to authenticated
      with check (
        customer_id = auth.uid()
        and uploaded_by = auth.uid()
        and exists (
          select 1 from public.purchase_requests pr
          where pr.id = transfer_proofs.request_id
            and pr.customer_id = auth.uid()
            and pr.status in ('ready_for_conversion', 'transfer_proof_rejected', 'transfer_proof_pending')
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'transfer_proofs' and policyname = 'Customers can read own transfer proofs') then
    create policy "Customers can read own transfer proofs"
      on public.transfer_proofs
      for select
      to authenticated
      using (customer_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'transfer_proofs' and policyname = 'Internal roles can manage transfer proofs') then
    create policy "Internal roles can manage transfer proofs"
      on public.transfer_proofs
      for all
      to authenticated
      using (public.current_lourex_role() in ('owner', 'operations_employee'))
      with check (public.current_lourex_role() in ('owner', 'operations_employee'));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'order_followups' and policyname = 'Customers can read visible order followups') then
    create policy "Customers can read visible order followups"
      on public.order_followups
      for select
      to authenticated
      using (customer_id = auth.uid() and visibility = 'customer_visible');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'order_followups' and policyname = 'Internal roles can manage order followups') then
    create policy "Internal roles can manage order followups"
      on public.order_followups
      for all
      to authenticated
      using (public.current_lourex_role() in ('owner', 'operations_employee'))
      with check (public.current_lourex_role() in ('owner', 'operations_employee'));
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('transfer-proofs', 'transfer-proofs', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Customers can upload own transfer proofs') then
    create policy "Customers can upload own transfer proofs"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'transfer-proofs'
        and name ~ '^customer-portal/requests/[0-9a-f-]+/transfer-proof/'
        and exists (
          select 1 from public.purchase_requests pr
          where pr.id = split_part(storage.objects.name, '/', 3)::uuid
            and pr.customer_id = auth.uid()
            and pr.status in ('ready_for_conversion', 'transfer_proof_rejected', 'transfer_proof_pending')
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Owners can read transfer proof objects') then
    create policy "Owners can read transfer proof objects"
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'transfer-proofs'
        and (
          public.current_lourex_role() in ('owner', 'operations_employee')
          or exists (
            select 1 from public.transfer_proofs tp
            where tp.storage_bucket = storage.objects.bucket_id
              and tp.file_path = storage.objects.name
              and tp.customer_id = auth.uid()
          )
        )
      );
  end if;
end $$;
