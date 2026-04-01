-- =============================================================================
-- Kier Signage Portal — Supabase Schema (prefix: ker)
-- =============================================================================
-- Run order: contacts & sites & purchasers first (referenced by orders FK).
-- =============================================================================

-- Contacts table
create table ker_contacts (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null unique,
  phone        text not null,
  created_at   timestamptz default now()
);

-- Sites table
create table ker_sites (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  address      text not null,
  created_at   timestamptz default now()
);

-- Purchasers table
create table ker_purchasers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null unique,
  phone        text,
  created_at   timestamptz default now()
);

-- Orders table
create table ker_orders (
  id            uuid primary key default gen_random_uuid(),
  order_number  text unique not null,
  status        text not null default 'new' check (status in ('new','awaiting_po','in-progress','completed','cancelled')),
  contact_name  text not null,
  email         text not null,
  phone         text not null,
  site_name     text not null,
  site_address  text not null,
  po_number     text,
  notes         text,
  subtotal      numeric(10,2) not null,
  delivery_fee  numeric(10,2) not null default 0,
  vat           numeric(10,2) not null,
  total         numeric(10,2) not null,
  contact_id    uuid references ker_contacts(id),
  site_id       uuid references ker_sites(id),
  purchaser_name  text,
  purchaser_email text,
  purchaser_id    uuid references ker_purchasers(id),
  po_document_name text,
  dn_document_name text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Order items table
create table ker_order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references ker_orders(id) on delete cascade,
  code        text not null,
  base_code   text,
  name        text not null,
  size        text,
  material    text,
  price       numeric(10,2) not null,
  quantity    integer not null check (quantity > 0),
  line_total  numeric(10,2) not null,
  custom_data jsonb default null
);

-- Suggestions table
create table ker_suggestions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  message     text not null,
  status      text not null default 'new' check (status in ('new','noted','done','dismissed')),
  created_at  timestamptz default now()
);

-- Indexes
create index idx_ker_orders_status on ker_orders(status);
create index idx_ker_orders_created_at on ker_orders(created_at desc);
create index idx_ker_orders_contact_id on ker_orders(contact_id);
create index idx_ker_orders_site_id on ker_orders(site_id);
create index idx_ker_order_items_order_id on ker_order_items(order_id);
create index idx_ker_order_items_code on ker_order_items(code);
create index idx_ker_suggestions_created_at on ker_suggestions(created_at desc);

-- Auto-update updated_at trigger
create or replace function ker_update_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger ker_orders_updated_at
  before update on ker_orders
  for each row execute function ker_update_updated_at();

-- Row Level Security (service role has full access)
alter table ker_orders enable row level security;
alter table ker_order_items enable row level security;
alter table ker_suggestions enable row level security;
alter table ker_contacts enable row level security;
alter table ker_sites enable row level security;
alter table ker_purchasers enable row level security;

create policy "service_ker_orders" on ker_orders for all using (true) with check (true);
create policy "service_ker_items" on ker_order_items for all using (true) with check (true);
create policy "service_ker_suggestions" on ker_suggestions for all using (true) with check (true);
create policy "service_ker_contacts" on ker_contacts for all using (true) with check (true);
create policy "service_ker_sites" on ker_sites for all using (true) with check (true);
create policy "service_ker_purchasers" on ker_purchasers for all using (true) with check (true);
