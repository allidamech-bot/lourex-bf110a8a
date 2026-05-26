-- Phase 2: Notification Engine foundation
-- Adds a provider-neutral notification queue, templates, and runtime settings.
-- This does not send external messages by itself; delivery providers remain opt-in.

alter table public.notification_events
  add column if not exists severity text not null default 'info',
  add column if not exists template_key text,
  add column if not exists delivery_status text not null default 'logged',
  add column if not exists queued_at timestamptz,
  add column if not exists processed_at timestamptz,
  add column if not exists error_message text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.notification_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  channel text not null default 'system',
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  event_type text not null,
  channel text not null default 'email',
  audience text not null default 'customer',
  locale text not null default 'en',
  subject text,
  body text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_templates_channel_check check (channel in ('email', 'whatsapp_sms', 'in_app', 'system')),
  constraint notification_templates_locale_check check (locale in ('en', 'ar'))
);

create table if not exists public.notification_delivery_queue (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.notification_events(id) on delete set null,
  event_type text not null,
  channel text not null default 'in_app',
  recipient_type text not null default 'customer',
  recipient_id uuid,
  recipient_contact text,
  template_key text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  provider text,
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  last_error text,
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_delivery_queue_channel_check check (channel in ('email', 'whatsapp_sms', 'in_app', 'system')),
  constraint notification_delivery_queue_status_check check (status in ('queued', 'provider_not_configured', 'processing', 'sent', 'failed', 'cancelled', 'skipped'))
);

create index if not exists idx_notification_events_created_at on public.notification_events(created_at desc);
create index if not exists idx_notification_events_delivery_status on public.notification_events(delivery_status);
create index if not exists idx_notification_settings_key on public.notification_settings(setting_key);
create index if not exists idx_notification_templates_event_channel on public.notification_templates(event_type, channel, locale);
create index if not exists idx_notification_delivery_queue_status on public.notification_delivery_queue(status, scheduled_for);
create index if not exists idx_notification_delivery_queue_event on public.notification_delivery_queue(event_type, created_at desc);

create or replace function public.set_lourex_notification_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_notification_events_updated_at on public.notification_events;
create trigger trg_notification_events_updated_at
  before update on public.notification_events
  for each row execute function public.set_lourex_notification_updated_at();

drop trigger if exists trg_notification_settings_updated_at on public.notification_settings;
create trigger trg_notification_settings_updated_at
  before update on public.notification_settings
  for each row execute function public.set_lourex_notification_updated_at();

drop trigger if exists trg_notification_templates_updated_at on public.notification_templates;
create trigger trg_notification_templates_updated_at
  before update on public.notification_templates
  for each row execute function public.set_lourex_notification_updated_at();

drop trigger if exists trg_notification_delivery_queue_updated_at on public.notification_delivery_queue;
create trigger trg_notification_delivery_queue_updated_at
  before update on public.notification_delivery_queue
  for each row execute function public.set_lourex_notification_updated_at();

alter table public.notification_settings enable row level security;
alter table public.notification_templates enable row level security;
alter table public.notification_delivery_queue enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notification_events' and policyname = 'Owners and operations can update notification events') then
    create policy "Owners and operations can update notification events"
      on public.notification_events
      for update
      to authenticated
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.role in ('owner', 'operations_employee')
        )
      )
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.role in ('owner', 'operations_employee')
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notification_settings' and policyname = 'Owners and operations can read notification settings') then
    create policy "Owners and operations can read notification settings"
      on public.notification_settings
      for select
      to authenticated
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.role in ('owner', 'operations_employee')
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notification_settings' and policyname = 'Owners can manage notification settings') then
    create policy "Owners can manage notification settings"
      on public.notification_settings
      for all
      to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notification_templates' and policyname = 'Owners and operations can read notification templates') then
    create policy "Owners and operations can read notification templates"
      on public.notification_templates
      for select
      to authenticated
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.role in ('owner', 'operations_employee')
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notification_templates' and policyname = 'Owners can manage notification templates') then
    create policy "Owners can manage notification templates"
      on public.notification_templates
      for all
      to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notification_delivery_queue' and policyname = 'Owners and operations can read notification delivery queue') then
    create policy "Owners and operations can read notification delivery queue"
      on public.notification_delivery_queue
      for select
      to authenticated
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.role in ('owner', 'operations_employee')
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notification_delivery_queue' and policyname = 'Owners and operations can enqueue notifications') then
    create policy "Owners and operations can enqueue notifications"
      on public.notification_delivery_queue
      for insert
      to authenticated
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.role in ('owner', 'operations_employee')
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notification_delivery_queue' and policyname = 'Owners can update notification delivery queue') then
    create policy "Owners can update notification delivery queue"
      on public.notification_delivery_queue
      for update
      to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));
  end if;
end $$;

insert into public.notification_settings (setting_key, channel, enabled, config)
values
  ('email.provider.enabled', 'email', false, '{"mode":"provider_required","note":"Enable only after configuring an email provider secret."}'::jsonb),
  ('whatsapp_sms.provider.enabled', 'whatsapp_sms', false, '{"mode":"provider_required","note":"Enable only after configuring WhatsApp/SMS provider credentials."}'::jsonb),
  ('notifications.queue.enabled', 'system', true, '{"mode":"safe_queue","external_delivery":false}'::jsonb),
  ('notifications.retry.max_attempts', 'system', true, '{"max_attempts":3}'::jsonb)
on conflict (setting_key) do nothing;

insert into public.notification_templates (template_key, event_type, channel, audience, locale, subject, body, enabled)
values
  ('order_stage_changed_email_en', 'order_stage_changed', 'email', 'customer', 'en', 'Your Lourex order was updated', 'Your order stage has been updated. Please sign in to your Lourex portal for details.', true),
  ('order_stage_changed_email_ar', 'order_stage_changed', 'email', 'customer', 'ar', 'تم تحديث طلبك في لوركس', 'تم تحديث مرحلة طلبك. يرجى الدخول إلى بوابة لوركس لمعرفة التفاصيل.', true),
  ('shipment_status_changed_email_en', 'shipment_status_changed', 'email', 'customer', 'en', 'Shipment status updated', 'Your shipment status has changed. Please check your Lourex tracking page.', true),
  ('shipment_status_changed_email_ar', 'shipment_status_changed', 'email', 'customer', 'ar', 'تم تحديث حالة الشحنة', 'تم تحديث حالة شحنتك. يرجى مراجعة صفحة التتبع في لوركس.', true),
  ('transfer_receipt_reviewed_email_en', 'transfer_receipt_reviewed', 'email', 'customer', 'en', 'Transfer proof reviewed', 'Your transfer proof review status has been updated.', true),
  ('transfer_receipt_reviewed_email_ar', 'transfer_receipt_reviewed', 'email', 'customer', 'ar', 'تمت مراجعة إثبات التحويل', 'تم تحديث حالة مراجعة إثبات التحويل الخاص بك.', true),
  ('admin_message_sent_in_app_en', 'admin_message_sent', 'in_app', 'customer', 'en', null, 'You have a new official message in your Lourex portal.', true),
  ('admin_message_sent_in_app_ar', 'admin_message_sent', 'in_app', 'customer', 'ar', null, 'لديك رسالة رسمية جديدة داخل بوابة لوركس.', true)
on conflict (template_key) do update set
  event_type = excluded.event_type,
  channel = excluded.channel,
  audience = excluded.audience,
  locale = excluded.locale,
  subject = excluded.subject,
  body = excluded.body,
  updated_at = now();