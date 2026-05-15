-- Urgent RLS repair after customer RPC compatibility.
--
-- Schema audit:
-- public.lourex_customers currently links customers to auth through id = auth.uid().
-- There is no user_id, auth_user_id, or profile_id column in this schema snapshot.
-- Legacy rows can still be resolved by lower(email) = lower(auth.jwt()->>'email').

create or replace function public.current_lourex_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select c.id
      from public.lourex_customers c
      where c.id = auth.uid()
      limit 1
    ),
    (
      select c.id
      from public.lourex_customers c
      where lower(c.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      order by (c.id = auth.uid()) desc, c.updated_at desc nulls last, c.created_at desc nulls last
      limit 1
    )
  );
$$;

revoke all on function public.current_lourex_customer_id() from public;
revoke all on function public.current_lourex_customer_id() from anon;
grant execute on function public.current_lourex_customer_id() to authenticated;

drop policy if exists "Customers can view own customer record" on public.lourex_customers;
create policy "Customers can view own customer record"
on public.lourex_customers
for select
to authenticated
using (
  id = auth.uid()
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "Customers can view own purchase requests" on public.purchase_requests;
create policy "Customers can view own purchase requests"
on public.purchase_requests
for select
to authenticated
using (
  customer_id = auth.uid()
  or customer_id = public.current_lourex_customer_id()
  or lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "Customers can insert own purchase requests" on public.purchase_requests;
create policy "Customers can insert own purchase requests"
on public.purchase_requests
for insert
to authenticated
with check (
  customer_id = auth.uid()
  or customer_id = public.current_lourex_customer_id()
  or lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "Customers can insert own transfer proofs" on public.transfer_proofs;
create policy "Customers can insert own transfer proofs"
on public.transfer_proofs
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and (
    customer_id = auth.uid()
    or customer_id = public.current_lourex_customer_id()
  )
  and exists (
    select 1
    from public.purchase_requests pr
    where pr.id = transfer_proofs.request_id
      and pr.status in ('ready_for_conversion', 'transfer_proof_rejected', 'transfer_proof_pending')
      and (
        pr.customer_id = transfer_proofs.customer_id
        or pr.customer_id = auth.uid()
        or pr.customer_id = public.current_lourex_customer_id()
        or lower(coalesce(pr.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
);

drop policy if exists "Customers can read own transfer proofs" on public.transfer_proofs;
create policy "Customers can read own transfer proofs"
on public.transfer_proofs
for select
to authenticated
using (
  customer_id = auth.uid()
  or customer_id = public.current_lourex_customer_id()
  or exists (
    select 1
    from public.purchase_requests pr
    where pr.id = transfer_proofs.request_id
      and lower(coalesce(pr.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists "Customers can upload own transfer proofs" on storage.objects;
create policy "Customers can upload own transfer proofs"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'transfer-proofs'
  and name ~ '^customer-portal/requests/[0-9a-f-]+/transfer-proof/'
  and exists (
    select 1
    from public.purchase_requests pr
    where pr.id = split_part(storage.objects.name, '/', 3)::uuid
      and pr.status in ('ready_for_conversion', 'transfer_proof_rejected')
      and (
        pr.customer_id = auth.uid()
        or pr.customer_id = public.current_lourex_customer_id()
        or lower(coalesce(pr.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
);

drop policy if exists "Owners can read transfer proof objects" on storage.objects;
drop policy if exists "Authenticated can read transfer proof objects" on storage.objects;
drop policy if exists "Owners and proof owners can read transfer proof objects" on storage.objects;
create policy "Owners and proof owners can read transfer proof objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'transfer-proofs'
  and (
    public.current_lourex_role() in ('owner', 'operations_employee')
    or exists (
      select 1
      from public.transfer_proofs tp
      where tp.storage_bucket = storage.objects.bucket_id
        and tp.file_path = storage.objects.name
        and (
          tp.customer_id = auth.uid()
          or tp.customer_id = public.current_lourex_customer_id()
          or exists (
            select 1
            from public.purchase_requests pr
            where pr.id = tp.request_id
              and lower(coalesce(pr.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
          )
        )
    )
  )
);

create or replace function public.upsert_current_customer_record(
  p_full_name text,
  p_email text,
  p_phone text default '',
  p_country text default '',
  p_city text default ''
)
returns table (customer_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_email text := lower(nullif(btrim(coalesce(p_email, '')), ''));
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if v_email is null then
    raise exception 'Customer email is required';
  end if;

  select role
  into v_role
  from public.profiles
  where id = auth.uid();

  if v_role is null then
    insert into public.profiles (
      id,
      email,
      full_name,
      role,
      partner_type,
      status
    )
    values (
      auth.uid(),
      v_email,
      coalesce(nullif(btrim(p_full_name), ''), ''),
      'customer',
      null,
      'active'
    )
    on conflict (id) do update
    set
      email = excluded.email,
      full_name = coalesce(nullif(btrim(excluded.full_name), ''), public.profiles.full_name),
      role = coalesce(public.profiles.role, 'customer'),
      status = coalesce(public.profiles.status, 'active'),
      updated_at = now();

    v_role := 'customer';
  end if;

  if v_role is distinct from 'customer' then
    raise exception 'Only customers can upsert their customer record';
  end if;

  customer_id := public.upsert_lourex_customer_record(
    auth.uid(),
    v_email,
    p_full_name,
    p_phone,
    p_country,
    p_city
  );

  return next;
end;
$$;

revoke all on function public.upsert_current_customer_record(text, text, text, text, text) from public;
revoke all on function public.upsert_current_customer_record(text, text, text, text, text) from anon;
grant execute on function public.upsert_current_customer_record(text, text, text, text, text) to authenticated;

create or replace function public.submit_transfer_proof_for_purchase_request(
  request_id uuid,
  proof_url text,
  proof_path text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p_request_id alias for $1;
  p_proof_url alias for $2;
  p_proof_path alias for $3;
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_request public.purchase_requests%rowtype;
  v_customer_id uuid;
  v_storage_value text;
  v_file_name text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_request
  from public.purchase_requests
  where id = p_request_id;

  if not found then
    raise exception 'Purchase request not found';
  end if;

  if public.current_lourex_role() is distinct from 'customer' then
    raise exception 'Only customers can upload transfer proofs';
  end if;

  if v_request.status not in ('ready_for_conversion', 'transfer_proof_rejected') then
    raise exception 'Transfer proof can only be uploaded for requests awaiting payment proof';
  end if;

  select customer_id
  into v_customer_id
  from public.upsert_current_customer_record(
    coalesce(v_request.full_name, ''),
    coalesce(nullif(v_email, ''), v_request.email),
    coalesce(v_request.phone, ''),
    coalesce(v_request.country, ''),
    coalesce(v_request.city, '')
  );

  if v_customer_id is null then
    raise exception 'Customer record could not be resolved for transfer proof upload';
  end if;

  if not (
    v_request.customer_id = v_user_id
    or v_request.customer_id = v_customer_id
    or lower(coalesce(v_request.email, '')) = v_email
    or exists (
      select 1
      from public.lourex_customers c
      where c.id = v_request.customer_id
        and lower(c.email) = v_email
    )
  ) then
    raise exception 'You do not have permission to upload a transfer proof for this request';
  end if;

  v_storage_value := coalesce(nullif(trim(p_proof_path), ''), nullif(trim(p_proof_url), ''));
  if v_storage_value is null then
    raise exception 'Transfer proof path is required';
  end if;

  v_file_name := nullif(regexp_replace(v_storage_value, '^.*/', ''), '');

  perform set_config('app.lourex_rpc_action', 'submit_transfer_proof', true);

  update public.purchase_requests
  set
    customer_id = v_customer_id,
    transfer_proof_url = v_storage_value,
    transfer_proof_name = coalesce(v_file_name, 'transfer-proof'),
    transfer_proof_uploaded_at = now(),
    transfer_proof_status = 'pending',
    transfer_rejection_reason = null,
    status = 'transfer_proof_pending',
    updated_at = now()
  where id = p_request_id;

  perform public.log_security_audit_event(
    'transfer_proof_submitted',
    'purchase_request',
    p_request_id,
    jsonb_build_object(
      'proof_path', v_storage_value,
      'proof_file_name', coalesce(v_file_name, 'transfer-proof'),
      'resolved_customer_id', v_customer_id
    )
  );
end;
$$;

revoke all on function public.submit_transfer_proof_for_purchase_request(uuid, text, text) from public;
revoke all on function public.submit_transfer_proof_for_purchase_request(uuid, text, text) from anon;
grant execute on function public.submit_transfer_proof_for_purchase_request(uuid, text, text) to authenticated;
