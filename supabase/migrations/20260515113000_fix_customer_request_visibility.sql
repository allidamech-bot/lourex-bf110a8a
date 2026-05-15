-- Fix customer request visibility after submission.
-- Ensures customer profile/customer records resolve to auth.uid() and RLS matches the frontend ownership model.

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
      coalesce(nullif(p_full_name, ''), ''),
      'customer',
      null,
      'active'
    )
    on conflict (id) do update
    set
      email = excluded.email,
      full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
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

grant execute on function public.upsert_current_customer_record(text, text, text, text, text) to authenticated;

update public.purchase_requests pr
set customer_id = p.id,
    updated_at = now()
from public.profiles p
where pr.customer_id is null
  and lower(pr.email) = lower(p.email)
  and p.role = 'customer';

drop policy if exists "Dashboard internal can select purchase requests" on public.purchase_requests;
create policy "Dashboard internal can select purchase requests"
on public.purchase_requests
for select
to authenticated
using (
  public.current_lourex_role() in ('owner', 'operations_employee', 'saudi_partner', 'turkish_partner')
);

drop policy if exists "Customers can select own purchase requests" on public.purchase_requests;
create policy "Customers can select own purchase requests"
on public.purchase_requests
for select
to authenticated
using (
  public.current_lourex_role() = 'customer'
  and customer_id = auth.uid()
);

drop policy if exists "Customers can insert own purchase requests" on public.purchase_requests;
create policy "Customers can insert own purchase requests"
on public.purchase_requests
for insert
to authenticated
with check (
  public.current_lourex_role() = 'customer'
  and customer_id = auth.uid()
);

drop policy if exists "Dashboard internal can update purchase requests" on public.purchase_requests;
create policy "Dashboard internal can update purchase requests"
on public.purchase_requests
for update
to authenticated
using (
  public.current_lourex_role() in ('owner', 'operations_employee', 'saudi_partner', 'turkish_partner')
)
with check (
  public.current_lourex_role() in ('owner', 'operations_employee', 'saudi_partner', 'turkish_partner')
);
