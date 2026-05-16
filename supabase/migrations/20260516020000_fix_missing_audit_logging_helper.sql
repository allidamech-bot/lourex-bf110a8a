-- Restore optional security audit helper required by transfer proof and financial RPCs.
--
-- Audit logging must never block customer workflows. This helper inserts into
-- public.security_audit_events when the table exists and has the expected shape;
-- otherwise it safely no-ops. Any unexpected audit insert failure is swallowed.

create or replace function public.log_security_audit_event(
  p_event_type text,
  p_area text,
  p_actor_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if to_regclass('public.security_audit_events') is null then
    return;
  end if;

  begin
    insert into public.security_audit_events (
      actor_id,
      actor_role,
      action,
      entity_type,
      entity_id,
      metadata
    )
    values (
      auth.uid(),
      public.current_lourex_role(),
      p_event_type,
      p_area,
      p_actor_id,
      coalesce(p_payload, '{}'::jsonb)
    );
  exception
    when undefined_table or undefined_column or insufficient_privilege then
      return;
    when others then
      return;
  end;
end;
$$;

revoke all on function public.log_security_audit_event(text, text, uuid, jsonb) from public;
revoke all on function public.log_security_audit_event(text, text, uuid, jsonb) from anon;
revoke all on function public.log_security_audit_event(text, text, uuid, jsonb) from authenticated;
grant execute on function public.log_security_audit_event(text, text, uuid, jsonb) to authenticated;

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
  v_request_customer_email text;
  v_storage_value text;
  v_file_name text;
begin
  if v_user_id is null then
    raise exception using
      message = 'AUTH_REQUIRED: authenticated session is required for transfer proof upload',
      detail = jsonb_build_object(
        'reason', 'AUTH_REQUIRED',
        'auth_uid', null,
        'jwt_email_present', coalesce(auth.jwt() ->> 'email', '') <> '',
        'request_id', p_request_id
      )::text;
  end if;

  select *
  into v_request
  from public.purchase_requests
  where id = p_request_id;

  if not found then
    raise exception using
      message = 'REQUEST_NOT_FOUND: purchase request was not found',
      detail = jsonb_build_object(
        'reason', 'REQUEST_NOT_FOUND',
        'auth_uid', v_user_id,
        'jwt_email', v_email,
        'request_id', p_request_id
      )::text;
  end if;

  if v_request.status not in ('ready_for_conversion', 'transfer_uploaded', 'transfer_proof_rejected') then
    raise exception using
      message = format('INVALID_STATUS: transfer proof cannot be uploaded while request status is %s', coalesce(v_request.status, 'null')),
      detail = jsonb_build_object(
        'reason', 'INVALID_STATUS',
        'auth_uid', v_user_id,
        'jwt_email', v_email,
        'request_id', p_request_id,
        'request_customer_id', v_request.customer_id,
        'request_email', lower(coalesce(v_request.email, '')),
        'request_status', v_request.status,
        'allowed_statuses', jsonb_build_array('ready_for_conversion', 'transfer_uploaded', 'transfer_proof_rejected')
      )::text;
  end if;

  begin
    v_customer_id := public.upsert_lourex_customer_record(
      v_user_id,
      coalesce(nullif(v_email, ''), v_request.email),
      coalesce(v_request.full_name, ''),
      coalesce(v_request.phone, ''),
      coalesce(v_request.country, ''),
      coalesce(v_request.city, '')
    );
  exception
    when others then
      raise exception using
        message = 'CUSTOMER_NOT_RESOLVED: customer record could not be upserted for transfer proof upload',
        detail = jsonb_build_object(
          'reason', 'CUSTOMER_NOT_RESOLVED',
          'auth_uid', v_user_id,
          'jwt_email', v_email,
          'request_id', p_request_id,
          'request_customer_id', v_request.customer_id,
          'request_email', lower(coalesce(v_request.email, '')),
          'request_status', v_request.status,
          'sqlstate', sqlstate,
          'sqlerrm', sqlerrm
        )::text;
  end;

  select lower(c.email)
  into v_request_customer_email
  from public.lourex_customers c
  where c.id = v_request.customer_id
  limit 1;

  if v_customer_id is null then
    raise exception using
      message = 'CUSTOMER_NOT_RESOLVED: customer record could not be resolved for transfer proof upload',
      detail = jsonb_build_object(
        'reason', 'CUSTOMER_NOT_RESOLVED',
        'auth_uid', v_user_id,
        'jwt_email', v_email,
        'request_id', p_request_id,
        'request_customer_id', v_request.customer_id,
        'request_email', lower(coalesce(v_request.email, '')),
        'request_customer_email', v_request_customer_email,
        'request_status', v_request.status,
        'resolved_customer_id', v_customer_id
      )::text;
  end if;

  if not (
    v_request.customer_id = v_user_id
    or v_request.customer_id = v_customer_id
    or lower(coalesce(v_request.email, '')) = v_email
    or v_request_customer_email = v_email
  ) then
    raise exception using
      message = 'NOT_OWNER: transfer proof request ownership did not match the authenticated customer',
      detail = jsonb_build_object(
        'reason', 'NOT_OWNER',
        'auth_uid', v_user_id,
        'jwt_email', v_email,
        'request_id', p_request_id,
        'resolved_customer_id', v_customer_id,
        'request_customer_id', v_request.customer_id,
        'request_email', lower(coalesce(v_request.email, '')),
        'request_customer_email', v_request_customer_email,
        'request_status', v_request.status
      )::text;
  end if;

  v_storage_value := coalesce(nullif(trim(p_proof_path), ''), nullif(trim(p_proof_url), ''));
  if v_storage_value is null then
    raise exception using
      message = 'INSERT_FAILED: transfer proof storage path is required',
      detail = jsonb_build_object(
        'reason', 'INSERT_FAILED',
        'auth_uid', v_user_id,
        'jwt_email', v_email,
        'request_id', p_request_id,
        'resolved_customer_id', v_customer_id,
        'request_customer_id', v_request.customer_id,
        'request_status', v_request.status,
        'proof_path_present', false
      )::text;
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

  begin
    insert into public.transfer_proofs (
      request_id,
      deal_id,
      customer_id,
      uploaded_by,
      file_path,
      file_name,
      file_type,
      file_size,
      storage_bucket,
      status
    )
    values (
      p_request_id,
      v_request.converted_deal_id,
      v_customer_id,
      v_user_id,
      v_storage_value,
      coalesce(v_file_name, 'transfer-proof'),
      '',
      0,
      'transfer-proofs',
      'pending_review'
    );
  exception
    when others then
      raise exception using
        message = 'INSERT_FAILED: transfer proof row could not be created',
        detail = jsonb_build_object(
          'reason', 'INSERT_FAILED',
          'auth_uid', v_user_id,
          'jwt_email', v_email,
          'request_id', p_request_id,
          'resolved_customer_id', v_customer_id,
          'request_customer_id', v_request.customer_id,
          'request_email', lower(coalesce(v_request.email, '')),
          'request_customer_email', v_request_customer_email,
          'request_status', v_request.status,
          'storage_path', v_storage_value,
          'sqlstate', sqlstate,
          'sqlerrm', sqlerrm
        )::text;
  end;

  begin
    perform public.log_security_audit_event(
      'transfer_proof_submitted',
      'purchase_request',
      p_request_id,
      jsonb_build_object(
        'proof_path', v_storage_value,
        'proof_file_name', coalesce(v_file_name, 'transfer-proof'),
        'resolved_customer_id', v_customer_id,
        'request_previous_status', v_request.status
      )
    );
  exception
    when others then
      null;
  end;
end;
$$;

revoke all on function public.submit_transfer_proof_for_purchase_request(uuid, text, text) from public;
revoke all on function public.submit_transfer_proof_for_purchase_request(uuid, text, text) from anon;
grant execute on function public.submit_transfer_proof_for_purchase_request(uuid, text, text) to authenticated;
