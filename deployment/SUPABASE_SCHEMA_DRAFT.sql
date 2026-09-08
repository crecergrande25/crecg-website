-- Crecer Grande Website V9 - Stage 2 starter schema (do not run until backend setup)
create table if not exists products (
 id uuid primary key default gen_random_uuid(),
 slug text unique not null, title text not null, category text not null, summary text, description text, image_url text, published boolean default false, featured boolean default false, specs jsonb default '{}'::jsonb, compatibility jsonb default '[]'::jsonb, tags jsonb default '[]'::jsonb, created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists product_variants (
 id uuid primary key default gen_random_uuid(), product_id uuid references products(id) on delete cascade, name text not null, sku text, unit text default 'pc', price numeric, gst numeric default 18, min_qty numeric default 1, price_note text, published boolean default true
);
create table if not exists enquiries (
 id uuid primary key default gen_random_uuid(), created_at timestamptz default now(), name text not null, company text, phone text, email text, requirement_type text, product_id uuid references products(id), product_text text, variant_text text, quantity text, estimate_text text, machine_model text, part_no text, message text, status text default 'New'
);
create table if not exists site_settings (
 key text primary key, value jsonb not null, updated_at timestamptz default now()
);
-- Stage 2 must add Row Level Security policies before production use.
