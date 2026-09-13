-- Crecer Grande Website V2.0
-- MASTER BACKEND NORMALIZE + REPAIR + UPGRADE R4 for the EXISTING Supabase project
-- Generated after reconciling the live legacy project with the original V1.9.3 canonical schema on 2026-09-13.
--
-- This script is intentionally additive/idempotent:
--   * preserves existing Auth users and passwords
--   * preserves existing products, projects, resources, enquiries and audit data
--   * creates only missing backend objects / columns
--   * links the two existing Auth users by their current @admin.crecergrande.in identities
--   * installs V2.0 permissions, CMS, analytics, RFQ RPCs and audit support
--
-- Existing Auth identities expected:
--   ramiz.islam@admin.crecergrande.in
--   sourav.bhowmik@admin.crecergrande.in
--
-- Safe to rerun after any failed R1/R2/R3 attempt; all Phase B work is atomic.

-- ---------------------------------------------------------------------------
-- PHASE A — committed safety snapshot of the existing backend before migration.
-- This remains available even if Phase B later rolls back.
-- ---------------------------------------------------------------------------
create schema if not exists cg_v2_backup_20260913_r4;

do $$
declare
  t text;
begin
  foreach t in array array[
    'site_settings','page_content','divisions','products','product_variants','product_internal','variant_internal','estimate_rules',
    'projects','resources','enquiries','analytics_events','audit_log','app_roles','app_permissions','role_permissions','user_profiles','user_permission_overrides'
  ] loop
    if to_regclass('public.' || t) is not null
       and to_regclass('cg_v2_backup_20260913_r4.' || t) is null then
      execute format('create table cg_v2_backup_20260913_r4.%I as table public.%I', t, t);
    end if;
  end loop;
end
$$;

-- Auth users are not copied or altered. The migration only links the two existing identities.

-- ---------------------------------------------------------------------------
-- PHASE B — atomic migration. Any error in this phase rolls back all Phase B changes.
-- ---------------------------------------------------------------------------
begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 0. Pre-flight: preserve the existing two Auth identities. Do not recreate them.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from auth.users
    where lower(email) = 'ramiz.islam@admin.crecergrande.in'
  ) then
    raise exception 'Required existing Auth user ramiz.islam@admin.crecergrande.in was not found.';
  end if;

  if not exists (
    select 1 from auth.users
    where lower(email) = 'sourav.bhowmik@admin.crecergrande.in'
  ) then
    raise exception 'Required existing Auth user sourav.bhowmik@admin.crecergrande.in was not found.';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 1. Core security / permissions tables that are missing in the current project
-- ---------------------------------------------------------------------------
create table if not exists public.app_roles (
  role_key text primary key,
  role_name text not null,
  description text,
  sort_order integer not null default 100,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_permissions (
  permission_key text primary key,
  permission_name text not null,
  module text not null default 'general',
  description text,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_key text not null references public.app_roles(role_key) on update cascade on delete cascade,
  permission_key text not null references public.app_permissions(permission_key) on update cascade on delete cascade,
  allowed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (role_key, permission_key)
);

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  login_slug text not null unique,
  role_key text not null references public.app_roles(role_key) on update cascade,
  is_active boolean not null default true,
  show_on_login boolean not null default true,
  must_change_password boolean not null default false,
  is_root boolean not null default false,
  last_login_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_permission_overrides (
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  permission_key text not null references public.app_permissions(permission_key) on update cascade on delete cascade,
  allowed boolean not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, permission_key)
);

-- ---------------------------------------------------------------------------
-- 2. CMS + analytics tables missing from the current project
-- ---------------------------------------------------------------------------
create table if not exists public.page_content (
  id uuid primary key default gen_random_uuid(),
  page_slug text not null unique,
  page_name text not null,
  title text,
  intro text,
  body jsonb not null default '{}'::jsonb,
  seo_title text,
  seo_description text,
  canonical_url text,
  published boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id bigint generated by default as identity primary key,
  visitor_id text,
  session_id text,
  event_type text not null,
  page_path text,
  page_title text,
  product_slug text,
  division_slug text,
  referrer text,
  source text,
  medium text,
  campaign text,
  term text,
  content text,
  device_type text,
  browser_family text,
  os_family text,
  language text,
  screen_size text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists analytics_events_occurred_at_idx on public.analytics_events(occurred_at desc);
create index if not exists analytics_events_visitor_idx on public.analytics_events(visitor_id);
create index if not exists analytics_events_event_type_idx on public.analytics_events(event_type);

-- ---------------------------------------------------------------------------
-- 3. Ensure all V2.0 public/admin tables exist and contain the columns used by
--    the website manager. Existing data is kept.
-- ---------------------------------------------------------------------------

create table if not exists public.site_settings (
  id bigint primary key,
  company_name text,
  tagline text,
  gstin text,
  udyam text,
  phone_primary text,
  phone_secondary text,
  phone_tertiary text,
  whatsapp text,
  email_primary text,
  email_secondary text,
  instagram_handle text,
  website_url text,
  address text,
  city text,
  state text,
  postal_code text,
  logo_url text,
  favicon_url text,
  social_image_url text,
  color_navy text,
  color_gold text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.site_settings add column if not exists company_name text;
alter table public.site_settings add column if not exists tagline text;
alter table public.site_settings add column if not exists gstin text;
alter table public.site_settings add column if not exists udyam text;
alter table public.site_settings add column if not exists phone_primary text;
alter table public.site_settings add column if not exists phone_secondary text;
alter table public.site_settings add column if not exists phone_tertiary text;
alter table public.site_settings add column if not exists whatsapp text;
alter table public.site_settings add column if not exists email_primary text;
alter table public.site_settings add column if not exists email_secondary text;
alter table public.site_settings add column if not exists instagram_handle text;
alter table public.site_settings add column if not exists website_url text;
alter table public.site_settings add column if not exists address text;
alter table public.site_settings add column if not exists city text;
alter table public.site_settings add column if not exists state text;
alter table public.site_settings add column if not exists postal_code text;
alter table public.site_settings add column if not exists country text not null default 'India';
alter table public.site_settings add column if not exists font_stack text not null default '"Century Gothic", CenturyGothic, AppleGothic, Arial, sans-serif';
alter table public.site_settings add column if not exists logo_url text;
alter table public.site_settings add column if not exists favicon_url text;
alter table public.site_settings add column if not exists social_image_url text;
alter table public.site_settings add column if not exists color_navy text;
alter table public.site_settings add column if not exists color_gold text;
alter table public.site_settings add column if not exists updated_by uuid;
alter table public.site_settings add column if not exists updated_at timestamptz not null default now();

insert into public.site_settings (
  id, company_name, tagline, gstin, udyam,
  phone_primary, phone_secondary, phone_tertiary, whatsapp,
  email_primary, email_secondary, instagram_handle, website_url,
  address, city, state, postal_code,
  logo_url, favicon_url, social_image_url, color_navy, color_gold
)
select
  '1', 'Crecer Grande', 'Engineering • Industrial Services • Business Support',
  '19BBJPB4158H1ZM', 'UDYAM-WB-14-0231207',
  '7003301781', '9073301781', '6291001781', '917003301781',
  'crecergrande@outlook.com', 'crecergrande@outlook.in',
  'crecer_grande', 'https://crecergrande.in/',
  'Plot No. LR-645, Mathpara Rd., Rajarhat', 'Rajarhat', 'West Bengal', '700135',
  '/assets/images/logo.png', '/assets/images/favicon.png', '/assets/images/social-preview.jpg',
  '#071a36', '#f4b000'
where not exists (select 1 from public.site_settings);

create table if not exists public.divisions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  short_description text,
  full_description text,
  image_url text,
  icon text,
  sort_order integer not null default 100,
  published boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.divisions add column if not exists id uuid default gen_random_uuid();
alter table public.divisions add column if not exists name text;
alter table public.divisions add column if not exists slug text;
alter table public.divisions add column if not exists short_description text;
alter table public.divisions add column if not exists full_description text;
alter table public.divisions add column if not exists image_url text;
alter table public.divisions add column if not exists icon text;
alter table public.divisions add column if not exists sort_order integer not null default 100;
alter table public.divisions add column if not exists published boolean not null default true;
alter table public.divisions add column if not exists updated_by uuid;
alter table public.divisions add column if not exists created_at timestamptz not null default now();
alter table public.divisions add column if not exists updated_at timestamptz not null default now();
update public.divisions set name=coalesce(nullif(btrim(name),''),'Division') where name is null or btrim(name)='';
update public.divisions set slug='division-'||substr(md5(ctid::text),1,10) where slug is null or btrim(slug)='';
with ranked as (select ctid,slug,row_number() over(partition by slug order by created_at nulls last,ctid) rn from public.divisions)
update public.divisions d set slug=d.slug||'-'||substr(md5(d.ctid::text),1,8) from ranked r where d.ctid=r.ctid and r.rn>1;
create unique index if not exists divisions_slug_uq on public.divisions(slug);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  category text,
  subcategory text,
  short_description text,
  description text,
  image_url text,
  tags text[] not null default '{}'::text[],
  specifications jsonb not null default '{}'::jsonb,
  compatibility jsonb not null default '{}'::jsonb,
  hsn text,
  gst_pct numeric(6,2),
  unit text,
  moq numeric(14,3),
  public_price numeric(14,2),
  price_mode text not null default 'quote',
  featured boolean not null default false,
  published boolean not null default true,
  sort_order integer not null default 100,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products add column if not exists id uuid default gen_random_uuid();
alter table public.products add column if not exists name text;
alter table public.products add column if not exists slug text;
alter table public.products add column if not exists category text;
alter table public.products add column if not exists subcategory text;
alter table public.products add column if not exists short_description text;
alter table public.products add column if not exists description text;
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists gallery jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists tags text[] not null default '{}'::text[];
alter table public.products add column if not exists specifications jsonb not null default '{}'::jsonb;
alter table public.products add column if not exists compatibility jsonb not null default '{}'::jsonb;
alter table public.products add column if not exists hsn text;
alter table public.products add column if not exists gst_pct numeric(6,2);
alter table public.products add column if not exists unit text;
alter table public.products add column if not exists moq numeric(14,3);
alter table public.products add column if not exists public_price numeric(14,2);
alter table public.products add column if not exists price_mode text not null default 'quote';
alter table public.products add column if not exists featured boolean not null default false;
alter table public.products add column if not exists published boolean not null default true;
alter table public.products add column if not exists sort_order integer not null default 100;
alter table public.products add column if not exists updated_by uuid;
alter table public.products add column if not exists created_at timestamptz not null default now();
alter table public.products add column if not exists updated_at timestamptz not null default now();
update public.products set name=coalesce(nullif(btrim(name),''),'Industrial Product') where name is null or btrim(name)='';
update public.products set category=coalesce(nullif(btrim(category),''),'Industrial Products & Spares') where category is null or btrim(category)='';
update public.products set slug='product-'||substr(md5(ctid::text),1,10) where slug is null or btrim(slug)='';
with ranked as (select ctid,slug,row_number() over(partition by slug order by created_at nulls last,ctid) rn from public.products)
update public.products p set slug=p.slug||'-'||substr(md5(p.ctid::text),1,8) from ranked r where p.ctid=r.ctid and r.rn>1;
create unique index if not exists products_slug_uq on public.products(slug);

-- Create product_variants only if an older project does not already have it.
do $$
declare
  v_product_id_type text;
begin
  if to_regclass('public.product_variants') is null then
    select format_type(a.atttypid, a.atttypmod)
      into v_product_id_type
    from pg_attribute a
    where a.attrelid = 'public.products'::regclass
      and a.attname = 'id'
      and a.attnum > 0
      and not a.attisdropped;

    v_product_id_type := coalesce(v_product_id_type, 'uuid');

    execute format($fmt$
      create table public.product_variants (
        id uuid primary key default gen_random_uuid(),
        product_id %s not null,
        variant_name text not null,
        sku text,
        attributes jsonb not null default '{}'::jsonb,
        unit text,
        moq numeric(14,3),
        public_price numeric(14,2),
        gst_pct numeric(6,2),
        published boolean not null default true,
        sort_order integer not null default 100,
        updated_by uuid,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    $fmt$, v_product_id_type);
  end if;
end
$$;

alter table public.product_variants add column if not exists id uuid default gen_random_uuid();
do $$
declare v_type text;
begin
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='product_variants' and column_name='product_id') then
    select format_type(a.atttypid,a.atttypmod) into v_type from pg_attribute a where a.attrelid='public.products'::regclass and a.attname='id' and a.attnum>0 and not a.attisdropped;
    execute format('alter table public.product_variants add column product_id %s',coalesce(v_type,'uuid'));
  end if;
end $$;
alter table public.product_variants add column if not exists variant_name text;
alter table public.product_variants add column if not exists sku text;
alter table public.product_variants add column if not exists attributes jsonb not null default '{}'::jsonb;
alter table public.product_variants add column if not exists unit text;
alter table public.product_variants add column if not exists moq numeric(14,3);
alter table public.product_variants add column if not exists public_price numeric(14,2);
alter table public.product_variants add column if not exists gst_pct numeric(6,2);
alter table public.product_variants add column if not exists published boolean not null default true;
alter table public.product_variants add column if not exists sort_order integer not null default 100;
alter table public.product_variants add column if not exists updated_by uuid;
alter table public.product_variants add column if not exists created_at timestamptz not null default now();
alter table public.product_variants add column if not exists updated_at timestamptz not null default now();
update public.product_variants set variant_name=coalesce(nullif(btrim(variant_name),''),'Standard') where variant_name is null or btrim(variant_name)='';
create index if not exists product_variants_product_idx on public.product_variants(product_id);

-- Private product pricing table. ID type is matched to the existing products.id.
do $$
declare
  v_product_id_type text;
begin
  if to_regclass('public.product_internal') is null then
    select format_type(a.atttypid, a.atttypmod)
      into v_product_id_type
    from pg_attribute a
    where a.attrelid = 'public.products'::regclass
      and a.attname = 'id'
      and a.attnum > 0
      and not a.attisdropped;

    v_product_id_type := coalesce(v_product_id_type, 'uuid');

    execute format($fmt$
      create table public.product_internal (
        product_id %s primary key,
        purchase_cost numeric(14,2),
        minimum_sell_price numeric(14,2),
        preferred_supplier text,
        supplier_notes text,
        internal_notes text,
        updated_by uuid,
        updated_at timestamptz not null default now()
      )
    $fmt$, v_product_id_type);
  end if;
end
$$;

do $$
declare v_type text;
begin
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='product_internal' and column_name='product_id') then
    select format_type(a.atttypid,a.atttypmod) into v_type from pg_attribute a where a.attrelid='public.products'::regclass and a.attname='id' and a.attnum>0 and not a.attisdropped;
    execute format('alter table public.product_internal add column product_id %s',coalesce(v_type,'uuid'));
  end if;
end $$;
alter table public.product_internal add column if not exists purchase_cost numeric(14,2);
alter table public.product_internal add column if not exists minimum_sell_price numeric(14,2);
alter table public.product_internal add column if not exists preferred_supplier text;
alter table public.product_internal add column if not exists supplier_notes text;
alter table public.product_internal add column if not exists internal_notes text;
alter table public.product_internal add column if not exists updated_by uuid;
alter table public.product_internal add column if not exists updated_at timestamptz not null default now();

-- Optional per-variant private pricing, created because the existing project is missing it.
do $$
declare
  v_variant_id_type text;
begin
  if to_regclass('public.variant_internal') is null then
    select format_type(a.atttypid, a.atttypmod)
      into v_variant_id_type
    from pg_attribute a
    where a.attrelid = 'public.product_variants'::regclass
      and a.attname = 'id'
      and a.attnum > 0
      and not a.attisdropped;

    v_variant_id_type := coalesce(v_variant_id_type, 'uuid');

    execute format($fmt$
      create table public.variant_internal (
        variant_id %s primary key,
        purchase_cost numeric(14,2),
        minimum_sell_price numeric(14,2),
        preferred_supplier text,
        supplier_notes text,
        internal_notes text,
        updated_by uuid,
        updated_at timestamptz not null default now()
      )
    $fmt$, v_variant_id_type);
  end if;
end
$$;

create table if not exists public.estimate_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null,
  name text not null,
  description text,
  rule_type text not null default 'defaults',
  configuration jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.estimate_rules add column if not exists id uuid default gen_random_uuid();
alter table public.estimate_rules add column if not exists rule_key text;
alter table public.estimate_rules add column if not exists name text;
alter table public.estimate_rules add column if not exists description text;
alter table public.estimate_rules add column if not exists rule_type text not null default 'defaults';
alter table public.estimate_rules add column if not exists configuration jsonb not null default '{}'::jsonb;
alter table public.estimate_rules add column if not exists enabled boolean not null default true;
alter table public.estimate_rules add column if not exists updated_by uuid;
alter table public.estimate_rules add column if not exists created_at timestamptz not null default now();
alter table public.estimate_rules add column if not exists updated_at timestamptz not null default now();

-- Legacy estimate_rules compatibility: the existing project contains an older required
-- title column. Keep it, but make all new V2 writes compatible and mirror name -> title.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='estimate_rules' and column_name='title'
  ) then
    execute 'update public.estimate_rules set title = coalesce(title, name, rule_key, ''Estimate Rule'') where title is null';
    execute 'alter table public.estimate_rules alter column title set default ''Estimate Rule''';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='estimate_rules' and column_name='title'
  ) then
    execute $sql$
      create or replace function public.cg_sync_legacy_estimate_title()
      returns trigger language plpgsql as $fn$
      begin
        if new.title is null or btrim(new.title) = '' then
          new.title := coalesce(nullif(new.name,''), nullif(new.rule_key,''), 'Estimate Rule');
        end if;
        return new;
      end
      $fn$
    $sql$;
    execute 'drop trigger if exists cg_sync_legacy_estimate_title on public.estimate_rules';
    execute 'create trigger cg_sync_legacy_estimate_title before insert or update on public.estimate_rules for each row execute function public.cg_sync_legacy_estimate_title()';
  end if;
end
$$;

-- Legacy estimate tables may carry extra NOT NULL columns from an earlier calculator.
-- Give only those extra required/no-default columns a neutral insert default so V2 seeds cannot fail.
do $$
declare
  r record;
  v_expr text;
  v_type text;
  v_enum text;
begin
  for r in
    select c.column_name,c.data_type,c.udt_name
    from information_schema.columns c
    where c.table_schema='public' and c.table_name='estimate_rules'
      and c.is_nullable='NO' and c.column_default is null
      and c.column_name not in ('rule_key','name')
  loop
    select format_type(a.atttypid,a.atttypmod) into v_type
    from pg_attribute a where a.attrelid='public.estimate_rules'::regclass and a.attname=r.column_name and a.attnum>0 and not a.attisdropped;
    v_expr := null;
    if r.column_name='id' and r.data_type='uuid' then v_expr := 'gen_random_uuid()';
    elsif r.column_name='id' and r.data_type in ('text','character varying','character') then v_expr := 'gen_random_uuid()::text';
    elsif r.column_name='title' then v_expr := quote_literal('Estimate Rule');
    elsif r.data_type in ('text','character varying','character','citext') then v_expr := quote_literal('');
    elsif r.data_type in ('smallint','integer','bigint','numeric','decimal','real','double precision') then v_expr := '0';
    elsif r.data_type='boolean' then v_expr := 'false';
    elsif r.data_type='jsonb' then v_expr := quote_literal('{}')||'::jsonb';
    elsif r.data_type='json' then v_expr := quote_literal('{}')||'::json';
    elsif r.data_type='ARRAY' then v_expr := quote_literal('{}')||'::'||v_type;
    elsif r.data_type like 'timestamp%' then v_expr := 'now()';
    elsif r.data_type='date' then v_expr := 'current_date';
    elsif r.data_type='uuid' then v_expr := 'gen_random_uuid()';
    elsif r.data_type='USER-DEFINED' then
      select quote_literal(e.enumlabel)||'::'||quote_ident(t.typname) into v_enum
      from pg_type t join pg_enum e on e.enumtypid=t.oid where t.typname=r.udt_name order by e.enumsortorder limit 1;
      v_expr := v_enum;
    end if;
    if v_expr is not null then
      execute format('alter table public.estimate_rules alter column %I set default %s',r.column_name,v_expr);
    end if;
  end loop;
end $$;

update public.estimate_rules
set rule_key = 'legacy-' || coalesce(id::text,substr(md5(ctid::text),1,12))
where rule_key is null or btrim(rule_key) = '';

do $$
begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='estimate_rules' and column_name='title') then
    execute $q$update public.estimate_rules
      set name=coalesce(nullif(btrim(name),''),nullif(btrim(title),''),rule_key,'Estimate Rule')
      where name is null or btrim(name)=''$q$;
  else
    update public.estimate_rules
      set name=coalesce(nullif(btrim(name),''),rule_key,'Estimate Rule')
      where name is null or btrim(name)='';
  end if;
end $$;

with ranked as (
  select ctid, rule_key,
         row_number() over(partition by rule_key order by created_at nulls last, ctid) as rn
  from public.estimate_rules
)
update public.estimate_rules e
set rule_key = e.rule_key || '-legacy-' || ranked.rn::text
from ranked
where e.ctid = ranked.ctid and ranked.rn > 1;

create unique index if not exists estimate_rules_rule_key_uq on public.estimate_rules(rule_key);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  summary text,
  details text,
  image_url text,
  gallery jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}'::text[],
  is_capability_example boolean not null default true,
  published boolean not null default true,
  sort_order integer not null default 100,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.projects add column if not exists id uuid default gen_random_uuid();
alter table public.projects add column if not exists slug text;
alter table public.projects add column if not exists title text;
alter table public.projects add column if not exists summary text;
alter table public.projects add column if not exists details text;
alter table public.projects add column if not exists image_url text;
alter table public.projects add column if not exists gallery jsonb not null default '[]'::jsonb;
alter table public.projects add column if not exists tags text[] not null default '{}'::text[];
alter table public.projects add column if not exists is_capability_example boolean not null default true;
alter table public.projects add column if not exists published boolean not null default true;
alter table public.projects add column if not exists sort_order integer not null default 100;
alter table public.projects add column if not exists updated_by uuid;
alter table public.projects add column if not exists created_at timestamptz not null default now();
alter table public.projects add column if not exists updated_at timestamptz not null default now();
update public.projects set title=coalesce(nullif(btrim(title),''),'Project') where title is null or btrim(title)='';
update public.projects set slug='project-'||substr(md5(ctid::text),1,10) where slug is null or btrim(slug)='';
with ranked as (select ctid,slug,row_number() over(partition by slug order by created_at nulls last,ctid) rn from public.projects) update public.projects p set slug=p.slug||'-'||substr(md5(p.ctid::text),1,8) from ranked r where p.ctid=r.ctid and r.rn>1;
create unique index if not exists projects_slug_uq on public.projects(slug);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  file_url text,
  resource_type text not null default 'pdf',
  published boolean not null default true,
  sort_order integer not null default 100,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.resources add column if not exists id uuid default gen_random_uuid();
alter table public.resources add column if not exists title text;
alter table public.resources add column if not exists description text;
alter table public.resources add column if not exists file_url text;
alter table public.resources add column if not exists resource_type text not null default 'pdf';
alter table public.resources add column if not exists published boolean not null default true;
alter table public.resources add column if not exists sort_order integer not null default 100;
alter table public.resources add column if not exists updated_by uuid;
alter table public.resources add column if not exists created_at timestamptz not null default now();
alter table public.resources add column if not exists updated_at timestamptz not null default now();
update public.resources set title=coalesce(nullif(btrim(title),''),'Resource') where title is null or btrim(title)='';
update public.resources set file_url=coalesce(nullif(btrim(file_url),''),'#') where file_url is null or btrim(file_url)='';


-- Neutral defaults for any extra legacy required columns on resources, if an older table carried them.
do $$
declare r record; v_expr text; v_type text; v_enum text;
begin
  for r in select c.column_name,c.data_type,c.udt_name from information_schema.columns c
           where c.table_schema='public' and c.table_name='resources' and c.is_nullable='NO' and c.column_default is null
             and c.column_name not in ('title','file_url')
  loop
    select format_type(a.atttypid,a.atttypmod) into v_type from pg_attribute a where a.attrelid='public.resources'::regclass and a.attname=r.column_name and a.attnum>0 and not a.attisdropped;
    v_expr:=null;
    if r.column_name='id' and r.data_type='uuid' then v_expr:='gen_random_uuid()';
    elsif r.column_name='id' and r.data_type in ('text','character varying','character') then v_expr:='gen_random_uuid()::text';
    elsif r.data_type in ('text','character varying','character','citext') then v_expr:=quote_literal('');
    elsif r.data_type in ('smallint','integer','bigint','numeric','decimal','real','double precision') then v_expr:='0';
    elsif r.data_type='boolean' then v_expr:='false';
    elsif r.data_type='jsonb' then v_expr:=quote_literal('{}')||'::jsonb';
    elsif r.data_type='json' then v_expr:=quote_literal('{}')||'::json';
    elsif r.data_type='ARRAY' then v_expr:=quote_literal('{}')||'::'||v_type;
    elsif r.data_type like 'timestamp%' then v_expr:='now()';
    elsif r.data_type='date' then v_expr:='current_date';
    elsif r.data_type='uuid' then v_expr:='gen_random_uuid()';
    elsif r.data_type='USER-DEFINED' then
      select quote_literal(e.enumlabel)||'::'||quote_ident(t.typname) into v_enum from pg_type t join pg_enum e on e.enumtypid=t.oid where t.typname=r.udt_name order by e.enumsortorder limit 1; v_expr:=v_enum;
    end if;
    if v_expr is not null then execute format('alter table public.resources alter column %I set default %s',r.column_name,v_expr); end if;
  end loop;
end $$;

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  submitted_at timestamptz not null default now(),
  name text,
  company text,
  phone text,
  email text,
  requirement_type text,
  quantity text,
  message text,
  source text,
  visitor_id text,
  session_id text,
  status text not null default 'new',
  assigned_to uuid references auth.users(id) on delete set null,
  admin_notes text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.enquiries add column if not exists id uuid default gen_random_uuid();
alter table public.enquiries add column if not exists submitted_at timestamptz not null default now();
alter table public.enquiries add column if not exists name text;
alter table public.enquiries add column if not exists company text;
alter table public.enquiries add column if not exists phone text;
alter table public.enquiries add column if not exists email text;
alter table public.enquiries add column if not exists requirement_type text;
do $$
declare v_type text;
begin
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='enquiries' and column_name='product_id') then
    select format_type(a.atttypid,a.atttypmod) into v_type from pg_attribute a where a.attrelid='public.products'::regclass and a.attname='id' and a.attnum>0 and not a.attisdropped; execute format('alter table public.enquiries add column product_id %s',coalesce(v_type,'uuid'));
  end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='enquiries' and column_name='variant_id') then
    select format_type(a.atttypid,a.atttypmod) into v_type from pg_attribute a where a.attrelid='public.product_variants'::regclass and a.attname='id' and a.attnum>0 and not a.attisdropped; execute format('alter table public.enquiries add column variant_id %s',coalesce(v_type,'uuid'));
  end if;
end $$;
alter table public.enquiries add column if not exists quantity text;
alter table public.enquiries add column if not exists message text;
alter table public.enquiries add column if not exists source text;
alter table public.enquiries add column if not exists visitor_id text;
alter table public.enquiries add column if not exists session_id text;
alter table public.enquiries add column if not exists status text not null default 'new';
alter table public.enquiries add column if not exists assigned_to uuid;
alter table public.enquiries add column if not exists admin_notes text;
alter table public.enquiries add column if not exists updated_by uuid;
alter table public.enquiries add column if not exists updated_at timestamptz not null default now();

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_display_name text,
  action text not null,
  module text not null,
  record_id text,
  record_label text,
  metadata jsonb not null default '{}'::jsonb
);
alter table public.audit_log add column if not exists occurred_at timestamptz not null default now();
alter table public.audit_log add column if not exists actor_user_id uuid;
alter table public.audit_log add column if not exists actor_display_name text;
alter table public.audit_log add column if not exists action text;
alter table public.audit_log add column if not exists module text;
alter table public.audit_log add column if not exists record_id text;
alter table public.audit_log add column if not exists record_label text;
alter table public.audit_log add column if not exists old_data jsonb;
alter table public.audit_log add column if not exists new_data jsonb;
alter table public.audit_log add column if not exists metadata jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- 3B. Canonical-column guard: fail here with a single consolidated message only
-- if a required V2 column could not be normalized.
-- ---------------------------------------------------------------------------
do $$
declare v_missing text;
begin
  select string_agg(x.tbl||'.'||x.col, ', ' order by x.tbl,x.col) into v_missing
  from (values
    ('site_settings','company_name'),('site_settings','updated_at'),
    ('divisions','slug'),('divisions','name'),('divisions','published'),('divisions','created_at'),
    ('products','slug'),('products','name'),('products','category'),('products','published'),('products','created_at'),
    ('product_variants','product_id'),('product_variants','variant_name'),('product_variants','published'),('product_variants','created_at'),
    ('estimate_rules','rule_key'),('estimate_rules','name'),('estimate_rules','configuration'),('estimate_rules','created_at'),('estimate_rules','updated_at'),
    ('projects','slug'),('projects','title'),('projects','published'),('projects','created_at'),
    ('resources','title'),('resources','file_url'),('resources','published'),('resources','created_at'),
    ('enquiries','submitted_at'),('enquiries','product_id'),('enquiries','variant_id'),('enquiries','status'),
    ('audit_log','occurred_at'),('audit_log','action'),('audit_log','module')
  ) as x(tbl,col)
  where not exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=x.tbl and c.column_name=x.col);
  if v_missing is not null then raise exception 'V2.0-R4 normalization could not create required columns: %',v_missing; end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Roles and permissions
-- ---------------------------------------------------------------------------
insert into public.app_roles(role_key, role_name, description, sort_order, is_system) values
('super_admin', 'Super Admin', 'Full access including security, users, roles and audit.', 1, true),
('administrator', 'Administrator', 'Broad website administration without root identity/security controls.', 2, true),
('content_editor', 'Content Editor', 'Pages, divisions, projects, resources and SEO.', 3, true),
('product_manager', 'Product Manager', 'Products, variants, pricing and estimates.', 4, true),
('sales_enquiries', 'Sales / Enquiries', 'Enquiries and customer follow-up.', 5, true),
('analytics_viewer', 'Analytics Viewer', 'Read-only website analytics.', 6, true),
('viewer', 'Viewer', 'Read-only admin dashboard.', 7, true),
('custom', 'Custom', 'Permissions set individually by Super Admin.', 8, true)
on conflict(role_key) do update set
  role_name = excluded.role_name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_system = excluded.is_system,
  updated_at = now();

insert into public.app_permissions(permission_key, permission_name, module, description, sort_order) values
('dashboard.view', 'View dashboard', 'dashboard', 'Open the admin dashboard.', 1),
('website.edit', 'Edit website settings', 'website', 'Edit public company/website settings.', 10),
('branding.edit', 'Edit branding', 'website', 'Edit logo, colours and branding.', 11),
('pages.edit', 'Edit pages', 'pages', 'Create and edit CMS page content.', 20),
('seo.edit', 'Edit SEO', 'pages', 'Edit titles, descriptions and canonical page metadata.', 21),
('divisions.edit', 'Edit divisions', 'divisions', 'Edit division content and publication.', 30),
('products.edit', 'Edit products', 'products', 'Edit public products and variants.', 40),
('products.pricing', 'Edit private pricing', 'products', 'View and edit internal purchase/minimum-sell pricing.', 41),
('estimates.edit', 'Edit estimate rules', 'estimates', 'Edit public estimate defaults/rules.', 50),
('projects.edit', 'Edit projects', 'projects', 'Edit project/capability examples.', 60),
('resources.edit', 'Edit resources', 'resources', 'Edit resource/download records.', 70),
('media.edit', 'Manage media', 'media', 'Upload/delete public site media.', 80),
('enquiries.view', 'View enquiries', 'enquiries', 'View website enquiries.', 90),
('enquiries.manage', 'Manage enquiries', 'enquiries', 'Change enquiry status, assignment and notes.', 91),
('analytics.view', 'View analytics', 'analytics', 'View first-party website analytics.', 100),
('users.view', 'View users', 'users', 'View administrator identities and access.', 110),
('users.manage', 'Manage users', 'users', 'Create users and change access.', 111),
('audit.view', 'View audit log', 'audit', 'View administrative change history.', 120),
('settings.manage', 'Manage privileged settings', 'security', 'Manage privileged security settings.', 130)
on conflict(permission_key) do update set
  permission_name = excluded.permission_name,
  module = excluded.module,
  description = excluded.description,
  sort_order = excluded.sort_order;

-- Root gets everything.
insert into public.role_permissions(role_key, permission_key, allowed)
select 'super_admin', permission_key, true
from public.app_permissions
on conflict(role_key, permission_key) do update set allowed = excluded.allowed, updated_at = now();

-- Administrator gets operational/content access but not identity/security administration.
insert into public.role_permissions(role_key, permission_key, allowed)
select
  'administrator',
  permission_key,
  case when permission_key in ('users.view','users.manage','settings.manage') then false else true end
from public.app_permissions
on conflict(role_key, permission_key) do update set allowed = excluded.allowed, updated_at = now();


insert into public.role_permissions(role_key, permission_key, allowed)
select 'content_editor', permission_key,
       permission_key in ('dashboard.view','website.edit','branding.edit','pages.edit','seo.edit','divisions.edit','projects.edit','resources.edit','media.edit')
from public.app_permissions
on conflict(role_key, permission_key) do update set allowed=excluded.allowed, updated_at=now();

insert into public.role_permissions(role_key, permission_key, allowed)
select 'product_manager', permission_key,
       permission_key in ('dashboard.view','products.edit','products.pricing','estimates.edit','media.edit')
from public.app_permissions
on conflict(role_key, permission_key) do update set allowed=excluded.allowed, updated_at=now();

insert into public.role_permissions(role_key, permission_key, allowed)
select 'sales_enquiries', permission_key,
       permission_key in ('dashboard.view','enquiries.view','enquiries.manage')
from public.app_permissions
on conflict(role_key, permission_key) do update set allowed=excluded.allowed, updated_at=now();

insert into public.role_permissions(role_key, permission_key, allowed)
select 'analytics_viewer', permission_key,
       permission_key in ('dashboard.view','analytics.view')
from public.app_permissions
on conflict(role_key, permission_key) do update set allowed=excluded.allowed, updated_at=now();

insert into public.role_permissions(role_key, permission_key, allowed)
select 'viewer', permission_key, permission_key='dashboard.view'
from public.app_permissions
on conflict(role_key, permission_key) do update set allowed=excluded.allowed, updated_at=now();

insert into public.role_permissions(role_key, permission_key, allowed)
select 'custom', permission_key, permission_key='dashboard.view'
from public.app_permissions
on conflict(role_key, permission_key) do update set allowed=excluded.allowed, updated_at=now();

-- ---------------------------------------------------------------------------
-- 5. Link the existing Auth users. No password is changed.
-- ---------------------------------------------------------------------------
insert into public.user_profiles(
  user_id, display_name, login_slug, role_key,
  is_active, show_on_login, must_change_password, is_root,
  last_login_at, created_by
)
select
  u.id, 'Ramiz Islam', 'ramiz.islam', 'super_admin',
  true, true, false, true,
  u.last_sign_in_at, u.id
from auth.users u
where lower(u.email) = 'ramiz.islam@admin.crecergrande.in'
on conflict(user_id) do update set
  display_name = excluded.display_name,
  login_slug = excluded.login_slug,
  role_key = 'super_admin',
  is_root = true,
  last_login_at = coalesce(public.user_profiles.last_login_at, excluded.last_login_at),
  updated_at = now();

insert into public.user_profiles(
  user_id, display_name, login_slug, role_key,
  is_active, show_on_login, must_change_password, is_root,
  last_login_at, created_by
)
select
  u.id, 'Sourav Bhowmik', 'sourav.bhowmik', 'administrator',
  true, true, false, false,
  u.last_sign_in_at,
  (select id from auth.users where lower(email)='ramiz.islam@admin.crecergrande.in' limit 1)
from auth.users u
where lower(u.email) = 'sourav.bhowmik@admin.crecergrande.in'
on conflict(user_id) do update set
  display_name = excluded.display_name,
  login_slug = excluded.login_slug,
  role_key = case when public.user_profiles.is_root then public.user_profiles.role_key else 'administrator' end,
  is_root = public.user_profiles.is_root,
  last_login_at = coalesce(public.user_profiles.last_login_at, excluded.last_login_at),
  updated_at = now();

-- Enforce exactly one root account (Ramiz) before creating the canonical root index.
update public.user_profiles
set is_root = false,
    role_key = case when role_key='super_admin' then 'administrator' else role_key end,
    updated_at = now()
where user_id <> (select id from auth.users where lower(email)='ramiz.islam@admin.crecergrande.in' limit 1)
  and is_root = true;

create unique index if not exists user_profiles_one_root_idx
  on public.user_profiles ((is_root)) where is_root = true;

-- ---------------------------------------------------------------------------
-- 6. Security-definer helper functions
-- ---------------------------------------------------------------------------
-- Remove policies that can depend on the RPC helpers before replacing old function overloads.
-- This makes the upgrade safe to rerun after a successful R4 deployment.
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where (schemaname='public' and tablename = any(array[
      'app_roles','app_permissions','role_permissions','user_profiles','user_permission_overrides',
      'site_settings','page_content','divisions','products','product_variants','product_internal',
      'variant_internal','estimate_rules','projects','resources','enquiries','analytics_events','audit_log'
    ]))
    or (schemaname='storage' and tablename='objects' and policyname like 'cg_v2_%')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end
$$;

-- Remove old overloads first so PostgREST RPC resolution is deterministic.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname = any(array[
        'has_permission','current_admin_name','get_login_options','get_my_permissions',
        'complete_password_change','log_admin_event','submit_enquiry','track_event',
        'get_analytics_summary','admin_set_user_profile'
      ])
  loop
    execute 'drop function if exists ' || r.sig;
  end loop;
end
$$;

create or replace function public.has_permission(p_permission text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_root boolean := false;
  v_role text;
  v_allowed boolean;
begin
  if v_user is null then
    return false;
  end if;

  select is_root, role_key
    into v_root, v_role
  from public.user_profiles
  where user_id = v_user
    and is_active = true;

  if not found then
    return false;
  end if;

  if coalesce(v_root, false) then
    return true;
  end if;

  select allowed
    into v_allowed
  from public.user_permission_overrides
  where user_id = v_user
    and permission_key = p_permission;

  if found then
    return coalesce(v_allowed, false);
  end if;

  select allowed
    into v_allowed
  from public.role_permissions
  where role_key = v_role
    and permission_key = p_permission;

  return coalesce(v_allowed, false);
end;
$$;

create or replace function public.current_admin_name()
returns text
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select display_name
  from public.user_profiles
  where user_id = auth.uid()
    and is_active = true
  limit 1;
$$;

create or replace function public.get_login_options()
returns table(login_slug text, display_name text)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select u.login_slug, u.display_name
  from public.user_profiles u
  where u.is_active = true
    and u.show_on_login = true
  order by u.is_root desc, u.display_name asc;
$$;

create or replace function public.get_my_permissions()
returns table(permission_key text, allowed boolean)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    p.permission_key,
    case
      when u.is_root then true
      else coalesce(o.allowed, rp.allowed, false)
    end as allowed
  from public.app_permissions p
  join public.user_profiles u
    on u.user_id = auth.uid()
   and u.is_active = true
  left join public.role_permissions rp
    on rp.role_key = u.role_key
   and rp.permission_key = p.permission_key
  left join public.user_permission_overrides o
    on o.user_id = u.user_id
   and o.permission_key = p.permission_key
  order by p.sort_order, p.permission_key;
$$;

create or replace function public.complete_password_change()
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.user_profiles
  set must_change_password = false,
      last_login_at = now(),
      updated_at = now()
  where user_id = auth.uid()
    and is_active = true;
end;
$$;

create function public.log_admin_event(
  p_action text,
  p_module text,
  p_record_id text default null,
  p_record_label text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select display_name into v_name
  from public.user_profiles
  where user_id = v_uid
    and is_active = true;

  if v_name is null then
    raise exception 'Active administrator profile required';
  end if;

  insert into public.audit_log(
    occurred_at, actor_user_id, actor_display_name,
    action, module, record_id, record_label, metadata
  ) values (
    now(), v_uid, v_name,
    left(coalesce(p_action,''), 80),
    left(coalesce(p_module,''), 80),
    nullif(left(coalesce(p_record_id,''), 200),''),
    nullif(left(coalesce(p_record_label,''), 300),''),
    coalesce(p_metadata, '{}'::jsonb)
  );

  if upper(coalesce(p_action,'')) = 'LOGIN' then
    update public.user_profiles
    set last_login_at = now(), updated_at = now()
    where user_id = v_uid;
  end if;
end;
$$;

create or replace function public.submit_enquiry(
  p_name text default null,
  p_company text default null,
  p_phone text default null,
  p_email text default null,
  p_requirement_type text default null,
  p_product_id text default null,
  p_variant_id text default null,
  p_quantity text default null,
  p_message text default null,
  p_source text default 'website',
  p_visitor_id text default null,
  p_session_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if coalesce(length(trim(p_name)),0) = 0 then
    raise exception 'Name is required';
  end if;

  if coalesce(length(trim(p_phone)),0) = 0
     and coalesce(length(trim(p_email)),0) = 0 then
    raise exception 'Phone or email is required';
  end if;

  insert into public.enquiries(
    submitted_at, name, company, phone, email,
    requirement_type, quantity, message, source,
    visitor_id, session_id, status
  ) values (
    now(),
    left(trim(p_name),150),
    nullif(left(trim(coalesce(p_company,'')),180),''),
    nullif(left(trim(coalesce(p_phone,'')),60),''),
    nullif(left(trim(coalesce(p_email,'')),180),''),
    nullif(left(trim(coalesce(p_requirement_type,'')),120),''),
    nullif(left(trim(coalesce(p_quantity,'')),120),''),
    nullif(left(trim(coalesce(p_message,'')),5000),''),
    nullif(left(trim(coalesce(p_source,'website')),80),''),
    nullif(left(trim(coalesce(p_visitor_id,'')),160),''),
    nullif(left(trim(coalesce(p_session_id,'')),160),''),
    'new'
  );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.track_event(
  p_visitor_id text default null,
  p_session_id text default null,
  p_event_type text default 'page_view',
  p_page_path text default null,
  p_page_title text default null,
  p_product_slug text default null,
  p_division_slug text default null,
  p_referrer text default null,
  p_source text default null,
  p_medium text default null,
  p_campaign text default null,
  p_term text default null,
  p_content text default null,
  p_device_type text default null,
  p_browser_family text default null,
  p_os_family text default null,
  p_language text default null,
  p_screen_size text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if coalesce(length(trim(p_visitor_id)),0)=0
     or coalesce(length(trim(p_session_id)),0)=0 then
    raise exception 'visitor_id and session_id are required';
  end if;

  if p_event_type not in (
    'page_view','product_view','division_view','click_whatsapp','click_phone',
    'click_email','outbound_instagram','estimate_used','rfq_submit'
  ) then
    raise exception 'Unsupported analytics event';
  end if;

  if length(coalesce(p_metadata::text,'')) > 8000 then
    raise exception 'Analytics metadata too large';
  end if;

  insert into public.analytics_events(
    visitor_id, session_id, event_type, page_path, page_title,
    product_slug, division_slug, referrer, source, medium, campaign,
    term, content, device_type, browser_family, os_family, language,
    screen_size, metadata, occurred_at
  ) values (
    nullif(left(coalesce(p_visitor_id,''),160),''),
    nullif(left(coalesce(p_session_id,''),160),''),
    left(coalesce(nullif(p_event_type,''),'page_view'),80),
    nullif(left(coalesce(p_page_path,''),500),''),
    nullif(left(coalesce(p_page_title,''),500),''),
    nullif(left(coalesce(p_product_slug,''),180),''),
    nullif(left(coalesce(p_division_slug,''),180),''),
    nullif(left(coalesce(p_referrer,''),1000),''),
    nullif(left(coalesce(p_source,''),200),''),
    nullif(left(coalesce(p_medium,''),200),''),
    nullif(left(coalesce(p_campaign,''),300),''),
    nullif(left(coalesce(p_term,''),300),''),
    nullif(left(coalesce(p_content,''),300),''),
    nullif(left(coalesce(p_device_type,''),80),''),
    nullif(left(coalesce(p_browser_family,''),160),''),
    nullif(left(coalesce(p_os_family,''),160),''),
    nullif(left(coalesce(p_language,''),50),''),
    nullif(left(coalesce(p_screen_size,''),80),''),
    coalesce(p_metadata,'{}'::jsonb),
    now()
  );
end;
$$;

create or replace function public.get_analytics_summary(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days,30),365));
  v_since timestamptz;
  v_result jsonb;
begin
  if not public.has_permission('analytics.view') then
    raise exception 'Permission denied';
  end if;

  v_since := now() - make_interval(days => v_days);

  select jsonb_build_object(
    'page_views',
      (select count(*) from public.analytics_events
       where occurred_at >= v_since and event_type = 'page_view'),
    'unique_visitors',
      (select count(distinct visitor_id) from public.analytics_events
       where occurred_at >= v_since and visitor_id is not null),
    'sessions',
      (select count(distinct session_id) from public.analytics_events
       where occurred_at >= v_since and session_id is not null),
    'active_visitors',
      (select count(distinct visitor_id) from public.analytics_events
       where occurred_at >= now() - interval '5 minutes'
         and visitor_id is not null),
    'whatsapp_clicks',
      (select count(*) from public.analytics_events
       where occurred_at >= v_since and event_type = 'click_whatsapp'),
    'phone_clicks',
      (select count(*) from public.analytics_events
       where occurred_at >= v_since and event_type = 'click_phone'),
    'estimate_uses',
      (select count(*) from public.analytics_events
       where occurred_at >= v_since and event_type = 'estimate_used'),
    'enquiries',
      (select count(*) from public.enquiries
       where submitted_at >= v_since),
    'top_pages',
      coalesce((
        select jsonb_agg(jsonb_build_object('page', q.page_path, 'count', q.cnt) order by q.cnt desc)
        from (
          select coalesce(page_path,'/') as page_path, count(*) as cnt
          from public.analytics_events
          where occurred_at >= v_since and event_type = 'page_view'
          group by coalesce(page_path,'/')
          order by count(*) desc
          limit 10
        ) q
      ), '[]'::jsonb),
    'top_sources',
      coalesce((
        select jsonb_agg(jsonb_build_object('source', q.source_name, 'count', q.cnt) order by q.cnt desc)
        from (
          select coalesce(nullif(source,''),'Direct / Unknown') as source_name, count(*) as cnt
          from public.analytics_events
          where occurred_at >= v_since
          group by coalesce(nullif(source,''),'Direct / Unknown')
          order by count(*) desc
          limit 10
        ) q
      ), '[]'::jsonb),
    'recent_visitors',
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'visitor_id', q.visitor_id,
            'page_views', q.page_views,
            'source', q.source_name,
            'last_seen', q.last_seen
          ) order by q.last_seen desc
        )
        from (
          select
            visitor_id,
            count(*) filter (where event_type='page_view') as page_views,
            max(coalesce(nullif(source,''),'Direct / Unknown')) as source_name,
            max(occurred_at) as last_seen
          from public.analytics_events
          where occurred_at >= v_since
            and visitor_id is not null
          group by visitor_id
          order by max(occurred_at) desc
          limit 20
        ) q
      ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.admin_set_user_profile(
  p_user_id uuid,
  p_display_name text default null,
  p_login_slug text default null,
  p_role_key text default null,
  p_is_active boolean default null,
  p_show_on_login boolean default null,
  p_must_change_password boolean default null,
  p_insert_if_missing boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_caller uuid := auth.uid();
  v_caller_root boolean := false;
  v_target public.user_profiles%rowtype;
  v_role text;
begin
  if v_caller is null or not public.has_permission('users.manage') then
    raise exception 'Permission denied';
  end if;

  select is_root into v_caller_root
  from public.user_profiles
  where user_id = v_caller and is_active = true;

  if coalesce(p_role_key,'') = 'super_admin' and not coalesce(v_caller_root,false) then
    raise exception 'Only the root Super Admin can assign the Super Admin role';
  end if;

  if p_role_key is not null then
    select role_key into v_role from public.app_roles where role_key = p_role_key;
    if v_role is null then raise exception 'Invalid role'; end if;
  end if;

  if p_insert_if_missing then
    if coalesce(length(trim(p_display_name)),0) = 0 then raise exception 'Display name is required'; end if;
    if coalesce(p_login_slug,'') !~ '^[a-z0-9._-]+$' then raise exception 'Invalid login alias'; end if;

    insert into public.user_profiles(
      user_id, display_name, login_slug, role_key, is_active, show_on_login,
      must_change_password, is_root, created_by
    ) values (
      p_user_id, trim(p_display_name), p_login_slug, coalesce(p_role_key,'administrator'),
      coalesce(p_is_active,true), coalesce(p_show_on_login,true),
      coalesce(p_must_change_password,true), false, v_caller
    );
    return;
  end if;

  select * into v_target
  from public.user_profiles
  where user_id = p_user_id
  for update;

  if not found then raise exception 'User profile not found'; end if;

  if p_user_id = v_caller and p_is_active = false then
    raise exception 'You cannot disable your own account';
  end if;

  if v_target.is_root then
    if p_is_active = false then raise exception 'The root Super Admin cannot be disabled'; end if;
    if p_role_key is not null and p_role_key <> 'super_admin' then raise exception 'The root Super Admin cannot be demoted'; end if;
    if p_show_on_login = false then raise exception 'The root Super Admin cannot be hidden from the login list'; end if;
  end if;

  update public.user_profiles
  set display_name = coalesce(nullif(trim(p_display_name),''), display_name),
      role_key = coalesce(p_role_key, role_key),
      is_active = coalesce(p_is_active, is_active),
      show_on_login = coalesce(p_show_on_login, show_on_login),
      must_change_password = coalesce(p_must_change_password, must_change_password),
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Grants for RPC functions
-- ---------------------------------------------------------------------------
revoke all on function public.has_permission(text) from public;
revoke all on function public.current_admin_name() from public;
revoke all on function public.get_login_options() from public;
revoke all on function public.get_my_permissions() from public;
revoke all on function public.complete_password_change() from public;
revoke all on function public.log_admin_event(text,text,text,text,jsonb) from public;
revoke all on function public.submit_enquiry(text,text,text,text,text,text,text,text,text,text,text,text) from public;
revoke all on function public.track_event(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,jsonb) from public;
revoke all on function public.get_analytics_summary(integer) from public;
revoke all on function public.admin_set_user_profile(uuid,text,text,text,boolean,boolean,boolean,boolean) from public;

grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.current_admin_name() to authenticated;
grant execute on function public.get_login_options() to anon, authenticated;
grant execute on function public.get_my_permissions() to authenticated;
grant execute on function public.complete_password_change() to authenticated;
grant execute on function public.log_admin_event(text,text,text,text,jsonb) to authenticated;
grant execute on function public.submit_enquiry(text,text,text,text,text,text,text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.track_event(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,jsonb) to anon, authenticated;
grant execute on function public.get_analytics_summary(integer) to authenticated;
grant execute on function public.admin_set_user_profile(uuid,text,text,text,boolean,boolean,boolean,boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. RLS + table privileges
-- ---------------------------------------------------------------------------
alter table public.app_roles enable row level security;
alter table public.app_permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_permission_overrides enable row level security;
alter table public.page_content enable row level security;
alter table public.site_settings enable row level security;
alter table public.divisions enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_internal enable row level security;
alter table public.variant_internal enable row level security;
alter table public.estimate_rules enable row level security;
alter table public.projects enable row level security;
alter table public.resources enable row level security;
alter table public.enquiries enable row level security;
alter table public.analytics_events enable row level security;
alter table public.audit_log enable row level security;

-- Least privilege: remove legacy grants before adding the exact V2 grants.
revoke all on table public.app_roles, public.app_permissions, public.role_permissions, public.user_profiles,
  public.user_permission_overrides, public.site_settings, public.page_content, public.divisions, public.products,
  public.product_variants, public.product_internal, public.variant_internal, public.estimate_rules,
  public.projects, public.resources, public.enquiries, public.analytics_events, public.audit_log
from anon, authenticated;

-- Remove legacy policies on the managed tables so an older broad policy cannot bypass V2 rules.
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname='public'
      and tablename = any(array[
        'app_roles','app_permissions','role_permissions','user_profiles','user_permission_overrides',
        'site_settings','page_content','divisions','products','product_variants','product_internal',
        'variant_internal','estimate_rules','projects','resources','enquiries','analytics_events','audit_log'
      ])
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end
$$;

grant select on public.site_settings, public.page_content, public.divisions, public.products,
  public.product_variants, public.projects, public.resources
to anon, authenticated;

-- The legacy estimate_rules table can contain old internal calculator columns.
-- Anonymous visitors receive only the three fields the public calculators actually use.
grant select(rule_key, configuration, enabled) on public.estimate_rules to anon;
grant select on public.estimate_rules to authenticated;

grant update on public.site_settings to authenticated;

grant select, insert, update, delete on public.page_content, public.divisions, public.products,
  public.product_variants, public.product_internal, public.variant_internal,
  public.estimate_rules, public.projects, public.resources
to authenticated;

grant select, update on public.enquiries to authenticated;
grant select on public.audit_log, public.app_roles, public.app_permissions,
  public.role_permissions, public.user_profiles, public.user_permission_overrides
to authenticated;

grant usage, select on all sequences in schema public to authenticated;

-- Create the V2 policy set after legacy policies have been removed.
drop policy if exists cg_v2_site_settings_public_read on public.site_settings;
create policy cg_v2_site_settings_public_read
on public.site_settings for select
to anon, authenticated
using (true);

drop policy if exists cg_v2_site_settings_admin_update on public.site_settings;
create policy cg_v2_site_settings_admin_update
on public.site_settings for update
to authenticated
using (public.has_permission('website.edit'))
with check (public.has_permission('website.edit'));

drop policy if exists cg_v2_page_content_public_read on public.page_content;
create policy cg_v2_page_content_public_read
on public.page_content for select
to anon
using (published = true);

drop policy if exists cg_v2_page_content_admin_read on public.page_content;
create policy cg_v2_page_content_admin_read
on public.page_content for select
to authenticated
using (exists(select 1 from public.user_profiles u where u.user_id=auth.uid() and u.is_active=true));

drop policy if exists cg_v2_page_content_admin_insert on public.page_content;
create policy cg_v2_page_content_admin_insert
on public.page_content for insert
to authenticated
with check (public.has_permission('pages.edit') or public.has_permission('seo.edit'));

drop policy if exists cg_v2_page_content_admin_update on public.page_content;
create policy cg_v2_page_content_admin_update
on public.page_content for update
to authenticated
using (public.has_permission('pages.edit') or public.has_permission('seo.edit'))
with check (public.has_permission('pages.edit') or public.has_permission('seo.edit'));

drop policy if exists cg_v2_page_content_admin_delete on public.page_content;
create policy cg_v2_page_content_admin_delete
on public.page_content for delete
to authenticated
using (public.has_permission('pages.edit'));

-- Reusable public/admin policies for core content tables.
drop policy if exists cg_v2_divisions_public_read on public.divisions;
create policy cg_v2_divisions_public_read on public.divisions for select to anon using (published=true);
drop policy if exists cg_v2_divisions_admin_read on public.divisions;
create policy cg_v2_divisions_admin_read on public.divisions for select to authenticated using (true);
drop policy if exists cg_v2_divisions_admin_write on public.divisions;
create policy cg_v2_divisions_admin_write on public.divisions for all to authenticated
using (public.has_permission('divisions.edit')) with check (public.has_permission('divisions.edit'));

drop policy if exists cg_v2_products_public_read on public.products;
create policy cg_v2_products_public_read on public.products for select to anon using (published=true);
drop policy if exists cg_v2_products_admin_read on public.products;
create policy cg_v2_products_admin_read on public.products for select to authenticated using (true);
drop policy if exists cg_v2_products_admin_write on public.products;
create policy cg_v2_products_admin_write on public.products for all to authenticated
using (public.has_permission('products.edit')) with check (public.has_permission('products.edit'));

drop policy if exists cg_v2_variants_public_read on public.product_variants;
create policy cg_v2_variants_public_read on public.product_variants for select to anon using (published=true);
drop policy if exists cg_v2_variants_admin_read on public.product_variants;
create policy cg_v2_variants_admin_read on public.product_variants for select to authenticated using (true);
drop policy if exists cg_v2_variants_admin_write on public.product_variants;
create policy cg_v2_variants_admin_write on public.product_variants for all to authenticated
using (public.has_permission('products.edit')) with check (public.has_permission('products.edit'));

drop policy if exists cg_v2_product_internal_read on public.product_internal;
create policy cg_v2_product_internal_read on public.product_internal for select to authenticated
using (public.has_permission('products.pricing'));
drop policy if exists cg_v2_product_internal_write on public.product_internal;
create policy cg_v2_product_internal_write on public.product_internal for all to authenticated
using (public.has_permission('products.pricing')) with check (public.has_permission('products.pricing'));

drop policy if exists cg_v2_variant_internal_read on public.variant_internal;
create policy cg_v2_variant_internal_read on public.variant_internal for select to authenticated
using (public.has_permission('products.pricing'));
drop policy if exists cg_v2_variant_internal_write on public.variant_internal;
create policy cg_v2_variant_internal_write on public.variant_internal for all to authenticated
using (public.has_permission('products.pricing')) with check (public.has_permission('products.pricing'));

drop policy if exists cg_v2_estimate_rules_public_read on public.estimate_rules;
create policy cg_v2_estimate_rules_public_read on public.estimate_rules for select to anon using (enabled=true);
drop policy if exists cg_v2_estimate_rules_admin_read on public.estimate_rules;
create policy cg_v2_estimate_rules_admin_read on public.estimate_rules for select to authenticated using (true);
drop policy if exists cg_v2_estimate_rules_admin_write on public.estimate_rules;
create policy cg_v2_estimate_rules_admin_write on public.estimate_rules for all to authenticated
using (public.has_permission('estimates.edit')) with check (public.has_permission('estimates.edit'));

drop policy if exists cg_v2_projects_public_read on public.projects;
create policy cg_v2_projects_public_read on public.projects for select to anon using (published=true);
drop policy if exists cg_v2_projects_admin_read on public.projects;
create policy cg_v2_projects_admin_read on public.projects for select to authenticated using (true);
drop policy if exists cg_v2_projects_admin_write on public.projects;
create policy cg_v2_projects_admin_write on public.projects for all to authenticated
using (public.has_permission('projects.edit')) with check (public.has_permission('projects.edit'));

drop policy if exists cg_v2_resources_public_read on public.resources;
create policy cg_v2_resources_public_read on public.resources for select to anon using (published=true);
drop policy if exists cg_v2_resources_admin_read on public.resources;
create policy cg_v2_resources_admin_read on public.resources for select to authenticated using (true);
drop policy if exists cg_v2_resources_admin_write on public.resources;
create policy cg_v2_resources_admin_write on public.resources for all to authenticated
using (public.has_permission('resources.edit')) with check (public.has_permission('resources.edit'));

drop policy if exists cg_v2_enquiries_admin_read on public.enquiries;
create policy cg_v2_enquiries_admin_read on public.enquiries for select to authenticated
using (public.has_permission('enquiries.view'));
drop policy if exists cg_v2_enquiries_admin_update on public.enquiries;
create policy cg_v2_enquiries_admin_update on public.enquiries for update to authenticated
using (public.has_permission('enquiries.manage')) with check (public.has_permission('enquiries.manage'));

drop policy if exists cg_v2_audit_admin_read on public.audit_log;
create policy cg_v2_audit_admin_read on public.audit_log for select to authenticated
using (public.has_permission('audit.view'));

drop policy if exists cg_v2_user_profiles_self_or_manage on public.user_profiles;
create policy cg_v2_user_profiles_self_or_manage on public.user_profiles for select to authenticated
using (user_id = auth.uid() or public.has_permission('users.view'));

drop policy if exists cg_v2_roles_read on public.app_roles;
create policy cg_v2_roles_read on public.app_roles for select to authenticated
using (public.has_permission('users.view'));

drop policy if exists cg_v2_permissions_read on public.app_permissions;
create policy cg_v2_permissions_read on public.app_permissions for select to authenticated
using (public.has_permission('users.view'));

drop policy if exists cg_v2_role_permissions_read on public.role_permissions;
create policy cg_v2_role_permissions_read on public.role_permissions for select to authenticated
using (public.has_permission('users.view'));

drop policy if exists cg_v2_overrides_read on public.user_permission_overrides;
create policy cg_v2_overrides_read on public.user_permission_overrides for select to authenticated
using (user_id = auth.uid() or public.has_permission('users.view'));

-- No direct analytics_events access is granted. Public tracking uses the security-definer RPC only.

-- ---------------------------------------------------------------------------
-- 9. Automatic audit trail for Website Manager data changes
-- ---------------------------------------------------------------------------
create or replace function public.cg_audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_row jsonb;
  v_id text;
  v_label text;
begin
  if v_uid is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  select display_name into v_name
  from public.user_profiles
  where user_id = v_uid and is_active = true;

  if v_name is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_id := coalesce(v_row->>'id', v_row->>'user_id', v_row->>'product_id', v_row->>'variant_id');
  v_label := coalesce(
    v_row->>'page_name',
    v_row->>'name',
    v_row->>'title',
    v_row->>'variant_name',
    v_row->>'display_name',
    v_row->>'rule_key',
    v_row->>'record_label',
    v_id
  );

  insert into public.audit_log(
    occurred_at, actor_user_id, actor_display_name,
    action, module, record_id, record_label, metadata
  ) values (
    now(), v_uid, v_name,
    tg_op, tg_table_name,
    v_id, v_label,
    jsonb_build_object('table', tg_table_name)
  );

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'site_settings','page_content','divisions','products','product_variants',
    'product_internal','variant_internal','estimate_rules','projects','resources',
    'enquiries','user_profiles'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists cg_v2_audit_change on public.%I', t);
      execute format(
        'create trigger cg_v2_audit_change after insert or update or delete on public.%I for each row execute function public.cg_audit_row_change()',
        t
      );
    end if;
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 10. Media bucket used by Website Manager
-- ---------------------------------------------------------------------------
insert into storage.buckets(id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do update set public = true;

drop policy if exists cg_site_assets_select on storage.objects;
drop policy if exists cg_site_assets_insert on storage.objects;
drop policy if exists cg_site_assets_update on storage.objects;
drop policy if exists cg_site_assets_delete on storage.objects;
drop policy if exists cg_v2_site_assets_public_read on storage.objects;
create policy cg_v2_site_assets_public_read
on storage.objects for select
to public
using (bucket_id = 'site-assets');

drop policy if exists cg_v2_site_assets_admin_insert on storage.objects;
create policy cg_v2_site_assets_admin_insert
on storage.objects for insert
to authenticated
with check (bucket_id = 'site-assets' and public.has_permission('media.edit'));

drop policy if exists cg_v2_site_assets_admin_update on storage.objects;
create policy cg_v2_site_assets_admin_update
on storage.objects for update
to authenticated
using (bucket_id = 'site-assets' and public.has_permission('media.edit'))
with check (bucket_id = 'site-assets' and public.has_permission('media.edit'));

drop policy if exists cg_v2_site_assets_admin_delete on storage.objects;
create policy cg_v2_site_assets_admin_delete
on storage.objects for delete
to authenticated
using (bucket_id = 'site-assets' and public.has_permission('media.edit'));

-- Keep the existing singleton site_settings row regardless of whether its legacy id is text or integer.
-- The frontend V2.0 also reads the first settings row rather than assuming a numeric key.
with target as (
  select ctid from public.site_settings order by ctid limit 1
)
update public.site_settings s
set company_name='Crecer Grande',
    tagline='Engineering • Industrial Services • Business Support',
    gstin='19BBJPB4158H1ZM',
    udyam='UDYAM-WB-14-0231207',
    phone_primary='7003301781', phone_secondary='9073301781', phone_tertiary='6291001781',
    whatsapp='917003301781',
    email_primary='crecergrande@outlook.com', email_secondary='crecergrande@outlook.in',
    instagram_handle='crecer_grande', website_url='https://crecergrande.in/',
    address='Plot No. LR-645, Mathpara Rd., Rajarhat, West Bengal - 700135',
    city='Rajarhat', state='West Bengal', postal_code='700135', country='India',
    logo_url='/assets/images/logo.png', favicon_url='/assets/images/favicon.png',
    social_image_url='/assets/images/social-preview.jpg',
    color_navy='#071a36', color_gold='#f4b000', updated_at=now()
from target
where s.ctid=target.ctid;

-- ---------------------------------------------------------------------------
-- 11. Seed Pages & SEO from the exact V2.0 static pages
-- ---------------------------------------------------------------------------
insert into public.page_content(
  page_slug, page_name, title, intro, body,
  seo_title, seo_description, canonical_url, published
) values
('3d-printing-kolkata','3D Printing & Rapid Prototyping Services in Kolkata','3D Printing & Rapid Prototyping Services in Kolkata','Rapid prototyping and low-volume component support for engineering validation, fixtures, housings, custom parts and product-development requirements.','{}'::jsonb,'3D Printing Service Kolkata | FDM & Resin Printing | Crecer Grande','FDM and resin 3D printing for prototypes, functional parts, fixtures, housings and low-volume industrial components in Kolkata. Send STL, STEP or your requirement.','https://crecergrande.in/3d-printing-kolkata.html',true),
('about','Engineering-led. Flexible. Built around practical industrial requirements.','Engineering-led. Flexible. Built around practical industrial requirements.','Crecer Grande is an Indian engineering and industrial-solutions venture supporting manufacturing and engineering businesses with design, manufacturing, maintenance, products, automation, quality and business-support capabilities.','{}'::jsonb,'About Crecer Grande | Engineering & Industrial Solutions','Learn about Crecer Grande, a West Bengal-based engineering and industrial solutions venture supporting manufacturing businesses through technical, manufacturing and business-support divisions.','https://crecergrande.in/about.html',true),
('contact','Send the requirement you have — even if the information is incomplete.','Send the requirement you have — even if the information is incomplete.','Use the form to prepare a structured enquiry. When the Supabase backend is connected, the enquiry is also recorded in the Admin Center; otherwise WhatsApp/email still works.','{}'::jsonb,'Contact Crecer Grande | Industrial Enquiry & RFQ','Contact Crecer Grande for manufacturing, engineering design, machine maintenance, automation, industrial spares, inspection, ISO, laser services and tender support.','https://crecergrande.in/contact.html',true),
('custom-machine-spares','Custom & Obsolete Machine Spare Development','Custom & Obsolete Machine Spare Development','A practical engineering route to replacement parts when an original spare is unavailable, discontinued, imported, damaged or commercially difficult to source.','{}'::jsonb,'Custom & Obsolete Machine Spares | Crecer Grande Kolkata','Custom replacement and obsolete machine spare development for brackets, bushes, shafts, rollers, guards, fixtures and hard-to-source industrial parts.','https://crecergrande.in/custom-machine-spares.html',true),
('disclaimer','Service & Product Disclaimer','Service & Product Disclaimer','Clear scope boundaries for technical services, sourced products and certification / inspection support.','{}'::jsonb,'Service & Product Disclaimer | Crecer Grande','Important scope, compatibility, certification, inspection and representative-content disclaimers for Crecer Grande.','https://crecergrande.in/disclaimer.html',true),
('division-advanced-manufacturing','Advanced Manufacturing & Components','Advanced Manufacturing & Components','3D printing, laser cutting, laser welding, laser marking, fabrication, machining and custom components.','{}'::jsonb,'Advanced Manufacturing & Components | Crecer Grande Kolkata','3D printing, laser cutting, laser welding, laser marking, fabrication, machining and custom components. Crecer Grande, West Bengal, India.','https://crecergrande.in/divisions/advanced-manufacturing.html',true),
('division-automation-solutions','Automation Solutions','Automation Solutions','PLC, HMI, industrial connectivity, sensors, controls, panel modifications, retrofit and troubleshooting support.','{}'::jsonb,'Automation Solutions | Crecer Grande Kolkata','PLC, HMI, industrial connectivity, sensors, controls, panel modifications, retrofit and troubleshooting support. Crecer Grande, West Bengal, India.','https://crecergrande.in/divisions/automation-solutions.html',true),
('division-engineering-design','Engineering & Design','Engineering & Design','Mechanical design, 3D CAD, manufacturing drawings, DFM, reverse engineering, BOM and technical documentation.','{}'::jsonb,'Engineering & Design | Crecer Grande Kolkata','Mechanical design, 3D CAD, manufacturing drawings, DFM, reverse engineering, BOM and technical documentation. Crecer Grande, West Bengal, India.','https://crecergrande.in/divisions/engineering-design.html',true),
('division-industrial-products-spares','Industrial Products & Spares','Industrial Products & Spares','Laser consumables, chiller spares, automation hardware, press-brake tooling, CNC/VMC selected spares and custom replacements.','{}'::jsonb,'Industrial Products & Spares | Crecer Grande Kolkata','Laser consumables, chiller spares, automation hardware, press-brake tooling, CNC/VMC selected spares and custom replacements. Crecer Grande, West Bengal, India.','https://crecergrande.in/divisions/industrial-products-spares.html',true),
('division-inspection-qa','Inspection & QA Support','Inspection & QA Support','Dimensional and visual inspection, PDI support, FAI, drawing/BOM review, vendor QA and NCR/CAPA support.','{}'::jsonb,'Inspection & QA Support | Crecer Grande Kolkata','Dimensional and visual inspection, PDI support, FAI, drawing/BOM review, vendor QA and NCR/CAPA support. Crecer Grande, West Bengal, India.','https://crecergrande.in/divisions/inspection-qa.html',true),
('division-machine-maintenance','Industrial Machine Maintenance','Industrial Machine Maintenance','Breakdown support, preventive maintenance, troubleshooting, installation and relocation support for industrial machinery.','{}'::jsonb,'Industrial Machine Maintenance | Crecer Grande Kolkata','Breakdown support, preventive maintenance, troubleshooting, installation and relocation support for industrial machinery. Crecer Grande, West Bengal, India.','https://crecergrande.in/divisions/machine-maintenance.html',true),
('division-quality-compliance','Quality, Certification & Business Compliance','Quality, Certification & Business Compliance','ISO and management-system implementation, MSME improvement readiness, documentation and selected compliance coordination.','{}'::jsonb,'Quality, Certification & Business Compliance | Crecer Grande Kolkata','ISO and management-system implementation, MSME improvement readiness, documentation and selected compliance coordination. Crecer Grande, West Bengal, India.','https://crecergrande.in/divisions/quality-compliance.html',true),
('division-tender-gem','Tender & GeM Support','Tender & GeM Support','Tender discovery, eligibility review, compliance matrices, bid documentation, GeM bid / RA and post-award documentation support.','{}'::jsonb,'Tender & GeM Support | Crecer Grande Kolkata','Tender discovery, eligibility review, compliance matrices, bid documentation, GeM bid / RA and post-award documentation support. Crecer Grande, West Bengal, India.','https://crecergrande.in/divisions/tender-gem.html',true),
('divisions','Eight focused capability areas under one industrial-support platform.','Eight focused capability areas under one industrial-support platform.','Choose the division closest to your requirement, or send the requirement directly and we will route it appropriately.','{}'::jsonb,'Crecer Grande Divisions | Manufacturing, Design, Maintenance, Automation & More','Explore Crecer Grande divisions covering manufacturing, engineering design, industrial products, machine maintenance, automation, quality, tender support and inspection.','https://crecergrande.in/divisions.html',true),
('estimate','Useful planning calculations — without inventing selling prices.','Useful planning calculations — without inventing selling prices.','These calculators are indicative. Formal quotation and technical confirmation always prevail.','{}'::jsonb,'Estimate & Planning Tools | Crecer Grande','Use Crecer Grande planning tools for GST totals, sheet-metal theoretical weight and 3D-print material estimation. Formal commercial quotation prevails.','https://crecergrande.in/estimate.html',true),
('home','ENGINEERING. MANUFACTURING. INDUSTRIAL SOLUTIONS.','ENGINEERING. MANUFACTURING. INDUSTRIAL SOLUTIONS.','From design and custom components to machine maintenance, automation, industrial spares, quality systems and business support — Crecer Grande helps manufacturing and engineering businesses solve practical industrial requirements.','{}'::jsonb,'Engineering & Manufacturing Services Kolkata | Crecer Grande','Crecer Grande provides engineering design, 3D printing, laser cutting & marking, reverse engineering, custom machine spares, machine maintenance, automation and quality support from Kolkata, West Bengal.','https://crecergrande.in/',true),
('industrial-machine-maintenance-kolkata','Industrial Machine Breakdown & Maintenance Support','Industrial Machine Breakdown & Maintenance Support','Breakdown response, troubleshooting, preventive maintenance and technical coordination for industrial machinery and supporting systems.','{}'::jsonb,'Industrial Machine Maintenance & Repair Kolkata | Crecer Grande','Industrial machine maintenance and repair support in Kolkata for CNC, VMC, laser cutting machines, electrical systems, PLC/HMI, hydraulics and pneumatics.','https://crecergrande.in/industrial-machine-maintenance-kolkata.html',true),
('industries','Industrial sectors where our capabilities can be applied.','Industrial sectors where our capabilities can be applied.','Applicability depends on the actual technical scope, site conditions, required standards and project-specific competence.','{}'::jsonb,'Industries We Support | Crecer Grande','Crecer Grande supports general engineering, sheet metal, CNC/VMC, laser processing, industrial machinery, automation, renewable energy, material handling and manufacturing MSMEs.','https://crecergrande.in/industries.html',true),
('laser-cutting-kolkata','Precision Laser Cutting Services in Kolkata','Precision Laser Cutting Services in Kolkata','Precision cutting support for sheet and plate components, from one-off prototypes to small and repeat production requirements.','{}'::jsonb,'Laser Cutting Service Kolkata | SS, MS & Aluminium | Crecer Grande','Laser cutting service in Kolkata for SS, MS and aluminium sheet/plate components, brackets, guards, enclosures, mounting plates, profiles and prototypes.','https://crecergrande.in/laser-cutting-kolkata.html',true),
('laser-marking-kolkata','Industrial Laser Marking Services in Kolkata','Industrial Laser Marking Services in Kolkata','Permanent identification and traceability support for industrial components — including QR codes, serial numbers, part numbers, logos, Data Matrix codes and customised marking requirements.','{}'::jsonb,'Laser Marking Service Kolkata | QR, Serial & Part Marking | Crecer Grande','Industrial laser marking for QR codes, serial numbers, part numbers, logos, Data Matrix codes and traceability on suitable metal components. Crecer Grande, Kolkata.','https://crecergrande.in/laser-marking-kolkata.html',true),
('privacy','Privacy Notice','Privacy Notice','How information submitted through the Crecer Grande website is handled.','{}'::jsonb,'Privacy Notice | Crecer Grande','Privacy information for visitors using the Crecer Grande website and enquiry forms.','https://crecergrande.in/privacy.html',true),
('product-cnc-vmc-spares','CNC / VMC & Machine Spares','CNC / VMC & Machine Spares','Selected switches, sensors, belts, lubrication parts, electrical spares and maintenance-related machine components.','{}'::jsonb,'CNC / VMC & Machine Spares | Crecer Grande','Selected switches, sensors, belts, lubrication parts, electrical spares and maintenance-related machine components. Crecer Grande, West Bengal, India.','https://crecergrande.in/products/cnc-vmc-spares.html',true),
('product-custom-obsolete-spares','Custom / Obsolete Machine Spares','Custom / Obsolete Machine Spares','Identification, reverse engineering, sourcing or manufacture of hard-to-find industrial parts where technically feasible.','{}'::jsonb,'Custom / Obsolete Machine Spares | Crecer Grande','Identification, reverse engineering, sourcing or manufacture of hard-to-find industrial parts where technically feasible. Crecer Grande, West Bengal, India.','https://crecergrande.in/products/custom-obsolete-spares.html',true),
('product-laser-chiller-pumps','Laser Chiller Pumps','Laser Chiller Pumps','Replacement pump sourcing for 1500 W, 2000 W, 3000 W and 6000 W-class laser systems — matched by the actual chiller duty.','{}'::jsonb,'Laser Chiller Pumps | Crecer Grande','Replacement pump sourcing for 1500 W, 2000 W, 3000 W and 6000 W-class laser systems — matched by the actual chiller duty. Crecer Grande, West Bengal, India.','https://crecergrande.in/products/laser-chiller-pumps.html',true),
('product-laser-chiller-spares','Laser Chiller Service Spares','Laser Chiller Service Spares','Filters, flow devices, temperature sensors, hoses, valves, fittings, fans and selected service parts.','{}'::jsonb,'Laser Chiller Service Spares | Crecer Grande','Filters, flow devices, temperature sensors, hoses, valves, fittings, fans and selected service parts. Crecer Grande, West Bengal, India.','https://crecergrande.in/products/laser-chiller-spares.html',true),
('product-laser-consumables','Laser Cutting, Welding & Marking Components','Laser Cutting, Welding & Marking Components','Nozzles, protective / cover glass, ceramic parts, holders and selected laser-head wear parts.','{}'::jsonb,'Laser Cutting, Welding & Marking Components | Crecer Grande','Nozzles, protective / cover glass, ceramic parts, holders and selected laser-head wear parts. Crecer Grande, West Bengal, India.','https://crecergrande.in/products/laser-consumables.html',true),
('product-plc-iot-housings','PLC, I/O, Industrial IoT & Housings','PLC, I/O, Industrial IoT & Housings','PLCs, HMIs, I/O modules, gateways, sensors, control components, DIN-rail hardware and industrial housings.','{}'::jsonb,'PLC, I/O, Industrial IoT & Housings | Crecer Grande','PLCs, HMIs, I/O modules, gateways, sensors, control components, DIN-rail hardware and industrial housings. Crecer Grande, West Bengal, India.','https://crecergrande.in/products/plc-iot-housings.html',true),
('product-rapid-prototyping','3D Printing & Rapid Prototyping','3D Printing & Rapid Prototyping','Resin and FDM prototyping, design-validation parts, low-volume components and inserts / finishing where applicable.','{}'::jsonb,'3D Printing & Rapid Prototyping | Crecer Grande','Resin and FDM prototyping, design-validation parts, low-volume components and inserts / finishing where applicable. Crecer Grande, West Bengal, India.','https://crecergrande.in/products/rapid-prototyping.html',true),
('product-sheet-metal-bending-tooling','Sheet-Metal Bending Tooling','Sheet-Metal Bending Tooling','Press-brake punches, V-dies, segmented / special tooling and related bending components.','{}'::jsonb,'Sheet-Metal Bending Tooling | Crecer Grande','Press-brake punches, V-dies, segmented / special tooling and related bending components. Crecer Grande, West Bengal, India.','https://crecergrande.in/products/sheet-metal-bending-tooling.html',true),
('products','Model-dependent components, consumables and replacement parts.','Model-dependent components, consumables and replacement parts.','We source and coordinate supply only after reviewing the information needed for compatibility. No unverified cross-reference is presented as exact equivalence.','{}'::jsonb,'Industrial Products & Spares | Crecer Grande','Browse Crecer Grande industrial products and spares including laser consumables, chiller pumps, automation hardware, press-brake tooling, selected CNC/VMC spares, rapid prototyping and custom replacements.','https://crecergrande.in/products.html',true),
('project-ss304-qr','SS304 QR Code Laser Marking & Identification Plates','SS304 QR Code Laser Marking & Identification Plates','Laser cutting, permanent company-name marking, 60 individual QR codes and QR readability verification.','{}'::jsonb,'SS304 QR Code Laser Marking | Crecer Grande','Case study: SS304 laser-cut identification plates with individual QR code marking, company name and readability verification.','https://crecergrande.in/projects/ss304-qr-code-laser-marking.html',true),
('projects','Real requirements and representative workflows.','Real requirements and representative workflows.','Examples are used to show capability and project structure. Customer names are omitted unless public use is approved.','{}'::jsonb,'Projects & Capability Examples | Crecer Grande','Representative Crecer Grande project examples including QR identification plates, chiller pump replacement, 3D-print FAI workflow and reverse-engineered machine spares.','https://crecergrande.in/projects.html',true),
('resources','Profiles, checklists and practical preparation guidance.','Profiles, checklists and practical preparation guidance.','Download Crecer Grande division profiles and use the service pages to prepare an enquiry.','{}'::jsonb,'Resources & Division Profiles | Crecer Grande','Download Crecer Grande division profiles for manufacturing, engineering design, products, maintenance, automation, quality, tender support and inspection.','https://crecergrande.in/resources.html',true),
('reverse-engineering-kolkata','Reverse Engineering of Industrial & Machine Components','Reverse Engineering of Industrial & Machine Components','Convert an existing component into reusable engineering data when original drawings are unavailable, outdated or incomplete.','{}'::jsonb,'Reverse Engineering Services Kolkata | Machine Parts | Crecer Grande','Reverse engineering services in Kolkata for obsolete, damaged and hard-to-source machine parts using samples, measurements, CAD models and manufacturing drawings.','https://crecergrande.in/reverse-engineering-kolkata.html',true),
('services','Service pages built around the way industrial buyers search.','Service pages built around the way industrial buyers search.','Each page explains the scope, the information required for quotation, typical applications and related Crecer Grande capabilities.','{}'::jsonb,'Industrial Services Kolkata | Crecer Grande','Focused Crecer Grande service pages for laser marking, 3D printing, reverse engineering, custom machine spares, industrial machine maintenance and laser cutting in Kolkata.','https://crecergrande.in/services.html',true)
on conflict(page_slug) do update set
  page_name = excluded.page_name,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  canonical_url = excluded.canonical_url,
  updated_at = now();

-- V2 homepage CMS keys used by the static fallback.
update public.page_content
set seo_title='Engineering & Manufacturing Services Kolkata | Crecer Grande',
    seo_description='Crecer Grande provides engineering design, 3D printing, laser cutting & marking, reverse engineering, custom machine spares, machine maintenance, automation and quality support from Kolkata, West Bengal.',
    body=coalesce(body,'{}'::jsonb) || '{
      "hero_eyebrow":"Proudly Indian • Engineering-led industrial support",
      "divisions_heading":"Eight capability areas. One point of coordination.",
      "start_heading":"That is not always a blocker.",
      "featured_heading":"Consumables, spares and industrial products."
    }'::jsonb,
    updated_at=now()
where page_slug='home';

-- ---------------------------------------------------------------------------
-- 12. V2.0 resource/profile URLs and estimate defaults
-- ---------------------------------------------------------------------------
update public.resources
set file_url='https://crecergrande.in/resources/division-profiles/Advanced-Manufacturing-Components.pdf',
    description='3D printing, laser processing, fabrication, machining and custom spares.'
where title='Advanced Manufacturing & Components Profile';

update public.resources
set file_url='https://crecergrande.in/resources/division-profiles/Engineering-Design.pdf'
where title='Engineering & Design Profile';

update public.resources
set file_url='https://crecergrande.in/resources/division-profiles/Industrial-Machine-Maintenance.pdf'
where title='Industrial Machine Maintenance Profile';

update public.resources
set file_url='https://crecergrande.in/resources/division-profiles/Quality-Certification-Business-Compliance.pdf'
where title in ('Quality, Certification & Compliance Profile','Quality, Certification & Business Compliance Profile');

insert into public.resources(title,description,file_url,resource_type,published,sort_order)
select 'Industrial Products & Spares Profile',
       'Laser consumables, chiller spares, tooling, automation hardware and custom replacements.',
       'https://crecergrande.in/resources/division-profiles/Industrial-Products-Spares.pdf',
       'pdf', true, 3
where not exists(select 1 from public.resources where title='Industrial Products & Spares Profile');

insert into public.resources(title,description,file_url,resource_type,published,sort_order)
select 'Automation Solutions Profile',
       'PLC/HMI, I/O, connectivity, Industrial IoT and retrofit-oriented support.',
       'https://crecergrande.in/resources/division-profiles/Automation-Solutions.pdf',
       'pdf', true, 5
where not exists(select 1 from public.resources where title='Automation Solutions Profile');

insert into public.resources(title,description,file_url,resource_type,published,sort_order)
select 'Tender & GeM Support Profile',
       'Tender discovery, eligibility review, compliance matrices, bid/RA and submission assistance.',
       'https://crecergrande.in/resources/division-profiles/Tender-GeM-Support.pdf',
       'pdf', true, 7
where not exists(select 1 from public.resources where title='Tender & GeM Support Profile');

insert into public.resources(title,description,file_url,resource_type,published,sort_order)
select 'Inspection & QA Support Profile',
       'PDI, dimensional and visual inspection, FAI, drawing/BOM review and NCR/CAPA support.',
       'https://crecergrande.in/resources/division-profiles/Inspection-QA-Support.pdf',
       'pdf', true, 8
where not exists(select 1 from public.resources where title='Inspection & QA Support Profile');

do $$
begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='estimate_rules' and column_name='title') then
    execute $seed$
      insert into public.estimate_rules(rule_key,title,name,description,rule_type,configuration,enabled) values
      ('gst-reference','GST Reference Default','GST Reference Default','Default GST percentage shown in the public reference calculator.','defaults','{"default_rate":18}'::jsonb,true),
      ('sheet-metal-weight','Sheet-Metal Weight Default','Sheet-Metal Weight Default','Default density shown in the public theoretical sheet-metal calculator.','defaults','{"default_density":7.93}'::jsonb,true),
      ('3d-print-material','3D Print Planning Default','3D Print Planning Default','Default process allowance shown in the public 3D-print material planning calculator.','defaults','{"default_allowance_pct":10}'::jsonb,true)
      on conflict(rule_key) do update set name=excluded.name,description=excluded.description,rule_type=excluded.rule_type,configuration=excluded.configuration,enabled=excluded.enabled
    $seed$;
  else
    insert into public.estimate_rules(rule_key,name,description,rule_type,configuration,enabled) values
    ('gst-reference','GST Reference Default','Default GST percentage shown in the public reference calculator.','defaults','{"default_rate":18}'::jsonb,true),
    ('sheet-metal-weight','Sheet-Metal Weight Default','Default density shown in the public theoretical sheet-metal calculator.','defaults','{"default_density":7.93}'::jsonb,true),
    ('3d-print-material','3D Print Planning Default','Default process allowance shown in the public 3D-print material planning calculator.','defaults','{"default_allowance_pct":10}'::jsonb,true)
    on conflict(rule_key) do update set name=excluded.name,description=excluded.description,rule_type=excluded.rule_type,configuration=excluded.configuration,enabled=excluded.enabled;
  end if;
end $$;

update public.resources set sort_order=1 where title='Advanced Manufacturing & Components Profile';
update public.resources set sort_order=2 where title='Engineering & Design Profile';
update public.resources set sort_order=4 where title='Industrial Machine Maintenance Profile';
update public.resources set sort_order=6 where title in ('Quality, Certification & Compliance Profile','Quality, Certification & Business Compliance Profile');

-- ---------------------------------------------------------------------------
-- 13. Verification guardrails before COMMIT
-- ---------------------------------------------------------------------------
do $$
declare
  v_profiles integer;
  v_pages integer;
begin
  select count(*) into v_profiles
  from public.user_profiles
  where login_slug in ('ramiz.islam','sourav.bhowmik');

  if v_profiles <> 2 then
    raise exception 'User profile repair did not produce the expected two linked admin profiles.';
  end if;

  select count(*) into v_pages from public.page_content;
  if v_pages < 20 then
    raise exception 'Page-content seed is unexpectedly incomplete (% rows).', v_pages;
  end if;

  if not public.has_permission('users.manage') then
    -- SQL Editor has no auth.uid(), so this should normally be false here.
    -- The check is intentionally not used as a failure condition.
    null;
  end if;
end
$$;

commit;

-- ---------------------------------------------------------------------------
-- POST-RUN CHECK (read-only): run this separately after this script succeeds.
-- ---------------------------------------------------------------------------
-- select login_slug, display_name, role_key, is_root, is_active, show_on_login
-- from public.user_profiles
-- order by is_root desc, display_name;
--
-- select object_name, status from (
--   select 'user_profiles' object_name, case when to_regclass('public.user_profiles') is not null then 'EXISTS' else 'MISSING' end status
--   union all select 'page_content', case when to_regclass('public.page_content') is not null then 'EXISTS' else 'MISSING' end
--   union all select 'analytics_events', case when to_regclass('public.analytics_events') is not null then 'EXISTS' else 'MISSING' end
-- ) x;


-- R4 completion report (read-only result shown in SQL Editor)
select jsonb_build_object(
  'status','SUCCESS',
  'version','2.0-R4',
  'admin_profiles',(select count(*) from public.user_profiles where login_slug in ('ramiz.islam','sourav.bhowmik')),
  'pages',(select count(*) from public.page_content),
  'divisions',(select count(*) from public.divisions),
  'products',(select count(*) from public.products),
  'projects',(select count(*) from public.projects),
  'resources',(select count(*) from public.resources),
  'estimate_rules',(select count(*) from public.estimate_rules),
  'backup_schema','cg_v2_backup_20260913_r4'
) as crecer_grande_v2_upgrade;
