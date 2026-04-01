-- =============================================================================
-- Signage Portal — Supabase Schema
-- =============================================================================
-- Run this in Supabase SQL Editor to create the required tables for a new client.
--
-- IMPORTANT: Replace {prefix} below with the client's unique 3-letter prefix.
-- Convention: derive from company name (e.g. bal = Balfour Beatty,
-- kpm = Keepmoat). This MUST match the dbPrefix value in shop/lib/brand.ts.
--
-- All clients share the same Supabase database, so unique prefixes prevent
-- data cross-contamination between portals.
-- =============================================================================

-- Orders table
create table {prefix}_orders (
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
  contact_id    uuid references {prefix}_contacts(id),
  site_id       uuid references {prefix}_sites(id),
  purchaser_name  text,
  purchaser_email text,
  purchaser_id    uuid references {prefix}_purchasers(id),
  po_document_name text,
  dn_document_name text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Order items table
create table {prefix}_order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references {prefix}_orders(id) on delete cascade,
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
create table {prefix}_suggestions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  message     text not null,
  status      text not null default 'new' check (status in ('new','noted','done','dismissed')),
  created_at  timestamptz default now()
);

-- Contacts table
create table {prefix}_contacts (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null unique,
  phone        text not null,
  created_at   timestamptz default now()
);

-- Sites table
create table {prefix}_sites (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  address      text not null,
  created_at   timestamptz default now()
);

-- Purchasers table
create table {prefix}_purchasers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null unique,
  phone        text,
  created_at   timestamptz default now()
);

-- Indexes
create index idx_{prefix}_orders_status on {prefix}_orders(status);
create index idx_{prefix}_orders_created_at on {prefix}_orders(created_at desc);
create index idx_{prefix}_orders_contact_id on {prefix}_orders(contact_id);
create index idx_{prefix}_orders_site_id on {prefix}_orders(site_id);
create index idx_{prefix}_order_items_order_id on {prefix}_order_items(order_id);
create index idx_{prefix}_order_items_code on {prefix}_order_items(code);
create index idx_{prefix}_suggestions_created_at on {prefix}_suggestions(created_at desc);

-- Auto-update updated_at trigger
create or replace function {prefix}_update_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger {prefix}_orders_updated_at
  before update on {prefix}_orders
  for each row execute function {prefix}_update_updated_at();

-- Row Level Security (service role has full access)
alter table {prefix}_orders enable row level security;
alter table {prefix}_order_items enable row level security;
alter table {prefix}_suggestions enable row level security;
alter table {prefix}_contacts enable row level security;
alter table {prefix}_sites enable row level security;
alter table {prefix}_purchasers enable row level security;

create policy "service_{prefix}_orders" on {prefix}_orders for all using (true) with check (true);
create policy "service_{prefix}_items" on {prefix}_order_items for all using (true) with check (true);
create policy "service_{prefix}_suggestions" on {prefix}_suggestions for all using (true) with check (true);
create policy "service_{prefix}_contacts" on {prefix}_contacts for all using (true) with check (true);
create policy "service_{prefix}_sites" on {prefix}_sites for all using (true) with check (true);
create policy "service_{prefix}_purchasers" on {prefix}_purchasers for all using (true) with check (true);
