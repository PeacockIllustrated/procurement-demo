-- Persimmon Signage Portal — Supabase Schema
-- Run this in Supabase SQL Editor to create the required tables.

-- Orders table
create table psp_orders (
  id            uuid primary key default gen_random_uuid(),
  order_number  text unique not null,
  status        text not null default 'new' check (status in ('new','in-progress','completed','cancelled')),
  contact_name  text not null,
  email         text not null,
  phone         text not null,
  site_name     text not null,
  site_address  text not null,
  po_number     text,
  notes         text,
  subtotal      numeric(10,2) not null,
  vat           numeric(10,2) not null,
  total         numeric(10,2) not null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Order items table
create table psp_order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references psp_orders(id) on delete cascade,
  code        text not null,
  base_code   text,
  name        text not null,
  size        text,
  material    text,
  price       numeric(10,2) not null,
  quantity    integer not null check (quantity > 0),
  line_total  numeric(10,2) not null
);

-- Indexes for dashboard queries
create index idx_psp_orders_status on psp_orders(status);
create index idx_psp_orders_created_at on psp_orders(created_at desc);
create index idx_psp_order_items_order_id on psp_order_items(order_id);
create index idx_psp_order_items_code on psp_order_items(code);

-- Auto-update updated_at trigger
create or replace function psp_update_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger psp_orders_updated_at
  before update on psp_orders
  for each row execute function psp_update_updated_at();

-- Row Level Security (service role has full access)
alter table psp_orders enable row level security;
alter table psp_order_items enable row level security;

create policy "service_psp_orders" on psp_orders for all using (true) with check (true);
create policy "service_psp_items" on psp_order_items for all using (true) with check (true);
