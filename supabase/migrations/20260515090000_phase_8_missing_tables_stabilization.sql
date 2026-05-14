-- Phase 8 production stabilization: restore required operational tables.

create table if not exists public.tracking_updates (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete set null,
  stage_code text not null,
  previous_stage_code text,
  note text not null default '',
  customer_note text not null default '',
  visibility text not null default 'internal',
  updated_by uuid references auth.users(id) on delete set null,
  updated_by_role text not null default '',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.tracking_updates
  add column if not exists shipment_id uuid references public.shipments(id) on delete cascade,
  add column if not exists deal_id uuid references public.deals(id) on delete set null,
  add column if not exists stage_code text,
  add column if not exists previous_stage_code text,
  add column if not exists note text not null default '',
  add column if not exists customer_note text not null default '',
  add column if not exists visibility text not null default 'internal',
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by_role text not null default '',
  add column if not exists occurred_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null,
  message text not null,
  related_reference text,
  source text not null default 'customer_support_widget',
  status text not null default 'new',
  assigned_to uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_conversations
  add column if not exists name text not null default '',
  add column if not exists contact text not null default '',
  add column if not exists message text not null default '',
  add column if not exists related_reference text,
  add column if not exists source text not null default 'customer_support_widget',
  add column if not exists status text not null default 'new',
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists resolved_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  customer_id uuid references public.lourex_customers(id) on delete set null,
  order_id uuid references public.deals(id) on delete set null,
  tracking_id text,
  channel_hint text not null default 'both',
  provider_email_configured boolean not null default false,
  provider_messaging_configured boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'ready',
  created_at timestamptz not null default now()
);

alter table public.notification_events
  add column if not exists event_type text not null default 'customer_update_added',
  add column if not exists customer_id uuid references public.lourex_customers(id) on delete set null,
  add column if not exists order_id uuid references public.deals(id) on delete set null,
  add column if not exists tracking_id text,
  add column if not exists channel_hint text not null default 'both',
  add column if not exists provider_email_configured boolean not null default false,
  add column if not exists provider_messaging_configured boolean not null default false,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists status text not null default 'ready',
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tracking_updates_visibility_check') then
    alter table public.tracking_updates
      add constraint tracking_updates_visibility_check
      check (visibility in ('internal', 'customer_visible'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'tracking_updates_stage_code_check') then
    alter table public.tracking_updates
      add constraint tracking_updates_stage_code_check
      check (
        stage_code in (
          'factory',
          'received_turkey',
          'in_turkey_warehouse',
          'preparing_export',
          'departed_turkey',
          'in_transit',
          'arrived_destination',
          'customs_clearance',
          'out_for_delivery',
          'delivered',
          'closed',
          'deal_accepted',
          'product_preparation',
          'transfer_to_port',
          'origin_port',
          'origin_customs',
          'departed_origin',
          'destination_customs',
          'transfer_to_warehouse'
        )
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'tracking_updates_previous_stage_code_check') then
    alter table public.tracking_updates
      add constraint tracking_updates_previous_stage_code_check
      check (
        previous_stage_code is null
        or previous_stage_code in (
          'factory',
          'received_turkey',
          'in_turkey_warehouse',
          'preparing_export',
          'departed_turkey',
          'in_transit',
          'arrived_destination',
          'customs_clearance',
          'out_for_delivery',
          'delivered',
          'closed',
          'deal_accepted',
          'product_preparation',
          'transfer_to_port',
          'origin_port',
          'origin_customs',
          'departed_origin',
          'destination_customs',
          'transfer_to_warehouse'
        )
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'support_conversations_status_check') then
    alter table public.support_conversations
      add constraint support_conversations_status_check
      check (status in ('new', 'open', 'pending', 'resolved', 'closed'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'notification_events_channel_hint_check') then
    alter table public.notification_events
      add constraint notification_events_channel_hint_check
      check (channel_hint in ('email', 'whatsapp_sms', 'both'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'notification_events_status_check') then
    alter table public.notification_events
      add constraint notification_events_status_check
      check (status in ('ready', 'queued', 'sent', 'skipped', 'failed'));
  end if;
end $$;

create index if not exists idx_tracking_updates_shipment_id on public.tracking_updates(shipment_id);
create index if not exists idx_tracking_updates_deal_id on public.tracking_updates(deal_id);
create index if not exists idx_tracking_updates_occurred_at on public.tracking_updates(occurred_at desc);
create index if not exists idx_tracking_updates_visibility on public.tracking_updates(visibility);
create index if not exists idx_support_conversations_created_at on public.support_conversations(created_at desc);
create index if not exists idx_support_conversations_status on public.support_conversations(status);
create index if not exists idx_support_conversations_related_reference on public.support_conversations(related_reference);
create index if not exists idx_notification_events_created_at on public.notification_events(created_at desc);
create index if not exists idx_notification_events_event_type on public.notification_events(event_type);
create index if not exists idx_notification_events_customer_id on public.notification_events(customer_id);
create index if not exists idx_notification_events_order_id on public.notification_events(order_id);
create index if not exists idx_notification_events_tracking_id on public.notification_events(tracking_id);

alter table public.tracking_updates enable row level security;
alter table public.support_conversations enable row level security;
alter table public.notification_events enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tracking_updates' and policyname = 'Public can view customer visible tracking updates') then
    create policy "Public can view customer visible tracking updates"
      on public.tracking_updates
      for select
      to anon, authenticated
      using (visibility = 'customer_visible');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tracking_updates' and policyname = 'Internal roles can manage tracking updates') then
    create policy "Internal roles can manage tracking updates"
      on public.tracking_updates
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('owner', 'operations_employee')
        )
      )
      with check (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('owner', 'operations_employee')
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tracking_updates' and policyname = 'Assigned partners can insert tracking updates') then
    create policy "Assigned partners can insert tracking updates"
      on public.tracking_updates
      for insert
      to authenticated
      with check (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('turkish_partner', 'saudi_partner')
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'support_conversations' and policyname = 'Public can create support conversations') then
    create policy "Public can create support conversations"
      on public.support_conversations
      for insert
      to anon, authenticated
      with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'support_conversations' and policyname = 'Internal roles can read support conversations') then
    create policy "Internal roles can read support conversations"
      on public.support_conversations
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('owner', 'operations_employee')
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'support_conversations' and policyname = 'Internal roles can update support conversations') then
    create policy "Internal roles can update support conversations"
      on public.support_conversations
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('owner', 'operations_employee')
        )
      )
      with check (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('owner', 'operations_employee')
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notification_events' and policyname = 'Authenticated users can create notification events') then
    create policy "Authenticated users can create notification events"
      on public.notification_events
      for insert
      to authenticated
      with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notification_events' and policyname = 'Internal roles can read notification events') then
    create policy "Internal roles can read notification events"
      on public.notification_events
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('owner', 'operations_employee')
        )
      );
  end if;
end $$;
