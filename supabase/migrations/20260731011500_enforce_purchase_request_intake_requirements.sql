-- Enforce contact and destination requirements for all newly submitted purchase requests.
-- Existing legacy rows remain untouched so management can continue reviewing them.
-- Product images are enforced by createPurchaseRequestWithAttachments, which rejects an empty upload set
-- and cancels the incomplete request if image upload fails.

create or replace function public.validate_purchase_request_intake_requirements()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_phone_digits text := regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g');
begin
  if nullif(btrim(coalesce(new.full_name, '')), '') is null then
    raise exception 'Customer full name is required';
  end if;

  if nullif(btrim(coalesce(new.email, '')), '') is null
     or new.email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'A valid customer email is required';
  end if;

  if length(v_phone_digits) < 7 then
    raise exception 'A valid customer phone number is required';
  end if;

  if nullif(btrim(coalesce(new.country, '')), '') is null then
    raise exception 'Customer country is required';
  end if;

  if nullif(btrim(coalesce(new.destination, '')), '') is null then
    raise exception 'Purchase request destination is required';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_purchase_request_intake_requirements on public.purchase_requests;

create trigger trg_validate_purchase_request_intake_requirements
before insert on public.purchase_requests
for each row
execute function public.validate_purchase_request_intake_requirements();

comment on function public.validate_purchase_request_intake_requirements() is
  'Rejects new purchase requests that do not include a full name, valid email, usable phone number, customer country, and destination.';
