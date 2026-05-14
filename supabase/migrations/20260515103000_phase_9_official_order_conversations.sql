-- Phase 9: official order conversations opened after request approval.

create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  contact text not null default '',
  message text not null default '',
  related_reference text,
  source text not null default 'customer_support_widget',
  status text not null default 'new',
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_conversations
  add column if not exists conversation_type text not null default 'support_request',
  add column if not exists request_id uuid references public.purchase_requests(id) on delete cascade,
  add column if not exists deal_id uuid references public.deals(id) on delete set null,
  add column if not exists customer_id uuid references auth.users(id) on delete cascade,
  add column if not exists assigned_admin_id uuid references auth.users(id) on delete set null,
  add column if not exists opened_at timestamptz;

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  request_id uuid references public.purchase_requests(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete set null,
  customer_id uuid references auth.users(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_type text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'support_conversations_type_check') then
    alter table public.support_conversations
      add constraint support_conversations_type_check
      check (conversation_type in ('support_request', 'official_order_conversation'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'conversation_messages_sender_type_check') then
    alter table public.conversation_messages
      add constraint conversation_messages_sender_type_check
      check (sender_type in ('customer', 'admin', 'system'));
  end if;
end $$;

create unique index if not exists uniq_official_conversation_request
  on public.support_conversations(request_id)
  where conversation_type = 'official_order_conversation' and request_id is not null;

create index if not exists idx_support_conversations_type on public.support_conversations(conversation_type);
create index if not exists idx_support_conversations_request_id on public.support_conversations(request_id);
create index if not exists idx_support_conversations_deal_id on public.support_conversations(deal_id);
create index if not exists idx_support_conversations_customer_id on public.support_conversations(customer_id);
create index if not exists idx_support_conversations_assigned_admin_id on public.support_conversations(assigned_admin_id);
create index if not exists idx_conversation_messages_conversation_id on public.conversation_messages(conversation_id);
create index if not exists idx_conversation_messages_request_id on public.conversation_messages(request_id);
create index if not exists idx_conversation_messages_deal_id on public.conversation_messages(deal_id);
create index if not exists idx_conversation_messages_customer_id on public.conversation_messages(customer_id);
create index if not exists idx_conversation_messages_created_at on public.conversation_messages(created_at);
create index if not exists idx_conversation_messages_unread on public.conversation_messages(conversation_id, sender_type)
  where read_at is null;

create or replace function public.lourex_fill_conversation_message_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation public.support_conversations%rowtype;
begin
  select *
  into v_conversation
  from public.support_conversations
  where id = new.conversation_id;

  if not found then
    return new;
  end if;

  new.request_id := coalesce(new.request_id, v_conversation.request_id);
  new.deal_id := coalesce(new.deal_id, v_conversation.deal_id);
  new.customer_id := coalesce(new.customer_id, v_conversation.customer_id);
  return new;
end;
$$;

drop trigger if exists fill_conversation_message_links on public.conversation_messages;
create trigger fill_conversation_message_links
  before insert on public.conversation_messages
  for each row
  execute function public.lourex_fill_conversation_message_links();

alter table public.support_conversations enable row level security;
alter table public.conversation_messages enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'support_conversations' and policyname = 'Customers can read own official conversations') then
    create policy "Customers can read own official conversations"
      on public.support_conversations
      for select
      to authenticated
      using (
        conversation_type = 'official_order_conversation'
        and customer_id = auth.uid()
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'support_conversations' and policyname = 'Internal roles can create official conversations') then
    create policy "Internal roles can create official conversations"
      on public.support_conversations
      for insert
      to authenticated
      with check (
        conversation_type = 'official_order_conversation'
        and exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.role in ('owner', 'operations_employee')
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'support_conversations' and policyname = 'Internal roles can update official conversations') then
    create policy "Internal roles can update official conversations"
      on public.support_conversations
      for update
      to authenticated
      using (
        conversation_type = 'official_order_conversation'
        and exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.role in ('owner', 'operations_employee')
        )
      )
      with check (
        conversation_type = 'official_order_conversation'
        and exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.role in ('owner', 'operations_employee')
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conversation_messages' and policyname = 'Conversation members can read messages') then
    create policy "Conversation members can read messages"
      on public.conversation_messages
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.support_conversations c
          where c.id = conversation_messages.conversation_id
            and c.conversation_type = 'official_order_conversation'
            and (
              c.customer_id = auth.uid()
              or exists (
                select 1 from public.profiles p
                where p.id = auth.uid()
                  and p.role in ('owner', 'operations_employee')
              )
            )
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conversation_messages' and policyname = 'Conversation members can send messages') then
    create policy "Conversation members can send messages"
      on public.conversation_messages
      for insert
      to authenticated
      with check (
        exists (
          select 1
          from public.support_conversations c
          where c.id = conversation_messages.conversation_id
            and c.conversation_type = 'official_order_conversation'
            and c.status = 'open'
            and (
              (sender_type = 'customer' and c.customer_id = auth.uid())
              or (
                sender_type in ('admin', 'system')
                and exists (
                  select 1 from public.profiles p
                  where p.id = auth.uid()
                    and p.role in ('owner', 'operations_employee')
                )
              )
            )
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conversation_messages' and policyname = 'Conversation members can mark messages read') then
    create policy "Conversation members can mark messages read"
      on public.conversation_messages
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.support_conversations c
          where c.id = conversation_messages.conversation_id
            and c.conversation_type = 'official_order_conversation'
            and (
              c.customer_id = auth.uid()
              or exists (
                select 1 from public.profiles p
                where p.id = auth.uid()
                  and p.role in ('owner', 'operations_employee')
              )
            )
        )
      )
      with check (
        exists (
          select 1
          from public.support_conversations c
          where c.id = conversation_messages.conversation_id
            and c.conversation_type = 'official_order_conversation'
            and (
              c.customer_id = auth.uid()
              or exists (
                select 1 from public.profiles p
                where p.id = auth.uid()
                  and p.role in ('owner', 'operations_employee')
              )
            )
        )
      );
  end if;
end $$;
