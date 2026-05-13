create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null,
  message text not null,
  related_reference text,
  source text not null default 'customer_support_widget',
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  customer_id uuid,
  order_id uuid,
  tracking_id text,
  channel_hint text not null default 'both',
  provider_email_configured boolean not null default false,
  provider_messaging_configured boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'ready',
  created_at timestamptz not null default now()
);

alter table public.support_conversations enable row level security;
alter table public.notification_events enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'support_conversations' and policyname = 'Public can create support conversations') then
    create policy "Public can create support conversations"
      on public.support_conversations
      for insert
      to anon, authenticated
      with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notification_events' and policyname = 'Authenticated users can create notification readiness events') then
    create policy "Authenticated users can create notification readiness events"
      on public.notification_events
      for insert
      to authenticated
      with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'support_conversations' and policyname = 'Owners and operations can read support conversations') then
    create policy "Owners and operations can read support conversations"
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

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notification_events' and policyname = 'Owners and operations can read notification events') then
    create policy "Owners and operations can read notification events"
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
