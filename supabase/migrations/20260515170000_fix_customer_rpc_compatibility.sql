-- Phase 10 urgent RPC compatibility repair.
-- Restores the legacy customer helper required by customer-profile and transfer-proof RPCs,
-- and removes the stale upsert_current_customer_record overload that can confuse PostgREST.

drop function if exists public.submit_transfer_proof_for_purchase_request(uuid, text, text);
drop function if exists public.upsert_current_customer_record(text, text, text, text, text);
drop function if exists public.upsert_current_customer_record(uuid, text, text, text, text);
drop function if exists public.upsert_lourex_customer_record(uuid, text, text, text, text, text);

create or replace function public.upsert_lourex_customer_record(
  p_user_id uuid,
  p_email text,
  p_full_name text default '',
  p_phone text default '',
  p_country text default '',
  p_city text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(nullif(btrim(coalesce(p_email, '')), ''));
  v_existing_id uuid;
  v_duplicate public.lourex_customers%rowtype;
begin
  if p_user_id is null then
    raise exception 'Customer user id is required';
  end if;

  if v_email is null then
    raise exception 'Customer email is required';
  end if;

  select id
  into v_existing_id
  from public.lourex_customers
  where id = p_user_id
  limit 1;

  select *
  into v_duplicate
  from public.lourex_customers
  where lower(email) = v_email
    and id <> p_user_id
  order by updated_at desc nulls last, created_at desc nulls last
  limit 1;

  if v_existing_id is null then
    insert into public.lourex_customers (
      id,
      full_name,
      phone,
      email,
      country,
      city
    )
    values (
      p_user_id,
      coalesce(nullif(btrim(p_full_name), ''), v_duplicate.full_name, ''),
      coalesce(nullif(btrim(p_phone), ''), v_duplicate.phone, ''),
      case
        when v_duplicate.id is not null then format('__migrating__%s@lourex.local', p_user_id)
        else v_email
      end,
      coalesce(nullif(btrim(p_country), ''), v_duplicate.country, ''),
      coalesce(nullif(btrim(p_city), ''), v_duplicate.city, '')
    )
    on conflict (id) do update
    set
      full_name = coalesce(nullif(btrim(excluded.full_name), ''), public.lourex_customers.full_name),
      phone = coalesce(nullif(btrim(excluded.phone), ''), public.lourex_customers.phone),
      email = excluded.email,
      country = coalesce(nullif(btrim(excluded.country), ''), public.lourex_customers.country),
      city = coalesce(nullif(btrim(excluded.city), ''), public.lourex_customers.city),
      updated_at = now();
  end if;

  if v_duplicate.id is not null then
    update public.purchase_requests
    set customer_id = p_user_id,
        updated_at = now()
    where customer_id = v_duplicate.id;

    update public.deals
    set customer_id = p_user_id
    where customer_id = v_duplicate.id;

    update public.financial_entries
    set customer_id = p_user_id
    where customer_id = v_duplicate.id;

    update public.financial_edit_requests
    set customer_id = p_user_id
    where customer_id = v_duplicate.id;

    update public.transfer_proofs
    set customer_id = p_user_id
    where customer_id = v_duplicate.id;

    delete from public.lourex_customers
    where id = v_duplicate.id;
  end if;

  update public.lourex_customers
  set
    email = v_email,
    full_name = coalesce(nullif(btrim(p_full_name), ''), full_name),
    phone = coalesce(nullif(btrim(p_phone), ''), phone),
    country = coalesce(nullif(btrim(p_country), ''), country),
    city = coalesce(nullif(btrim(p_city), ''), city),
    updated_at = now()
  where id = p_user_id;

  return p_user_id;
end;
$$;

revoke all on function public.upsert_lourex_customer_record(uuid, text, text, text, text, text) from public;
revoke all on function public.upsert_lourex_customer_record(uuid, text, text, text, text, text) from anon;
grant execute on function public.upsert_lourex_customer_record(uuid, text, text, text, text, text) to authenticated;

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

  return query
  select public.upsert_lourex_customer_record(
    auth.uid(),
    v_email,
    p_full_name,
    p_phone,
    p_country,
    p_city
  );
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

  if not (
    v_request.customer_id = v_user_id
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

  select customer_id
  into v_customer_id
  from public.upsert_current_customer_record(
    coalesce(v_request.full_name, ''),
    coalesce(nullif(v_email, ''), v_request.email),
    coalesce(v_request.phone, ''),
    coalesce(v_request.country, ''),
    coalesce(v_request.city, '')
  );

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
      'proof_file_name', coalesce(v_file_name, 'transfer-proof')
    )
  );
end;
$$;

revoke all on function public.submit_transfer_proof_for_purchase_request(uuid, text, text) from public;
revoke all on function public.submit_transfer_proof_for_purchase_request(uuid, text, text) from anon;
grant execute on function public.submit_transfer_proof_for_purchase_request(uuid, text, text) to authenticated;
