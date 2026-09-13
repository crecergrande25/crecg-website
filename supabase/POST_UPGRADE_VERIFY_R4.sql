-- Crecer Grande Website V2.0 R4 - POST UPGRADE VERIFY (READ ONLY)
-- Run only after V2.0_MASTER_BACKEND_UPGRADE_R4.sql returns SUCCESS / 2.0-R4.

select 'AUTH USERS' section, email as item, 'EXISTS' status
from auth.users where lower(email) in ('ramiz.islam@admin.crecergrande.in','sourav.bhowmik@admin.crecergrande.in')
union all
select 'ADMIN PROFILE', login_slug || ' | ' || display_name || ' | ' || role_key,
       case when is_active then 'ACTIVE' else 'INACTIVE' end
from public.user_profiles
where login_slug in ('ramiz.islam','sourav.bhowmik');

with req(name) as (values
('app_roles'),('app_permissions'),('role_permissions'),('user_profiles'),('user_permission_overrides'),
('site_settings'),('page_content'),('divisions'),('products'),('product_variants'),('product_internal'),
('variant_internal'),('estimate_rules'),('projects'),('resources'),('enquiries'),('analytics_events'),('audit_log'))
select 'TABLE' object_type, name object_name,
       case when to_regclass('public.'||name) is not null then 'EXISTS' else 'MISSING' end status
from req order by name;

with req(name) as (values
('has_permission'),('current_admin_name'),('get_login_options'),('get_my_permissions'),
('complete_password_change'),('log_admin_event'),('submit_enquiry'),('track_event'),
('get_analytics_summary'),('admin_set_user_profile'))
select 'FUNCTION' object_type, name object_name,
       case when exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=req.name) then 'EXISTS' else 'MISSING' end status
from req order by name;

with required(tbl,col) as (values
('site_settings','company_name'),('site_settings','updated_at'),
('divisions','slug'),('divisions','name'),('divisions','published'),('divisions','created_at'),
('products','slug'),('products','name'),('products','category'),('products','published'),('products','created_at'),
('product_variants','product_id'),('product_variants','variant_name'),('product_variants','published'),('product_variants','created_at'),
('estimate_rules','rule_key'),('estimate_rules','name'),('estimate_rules','configuration'),('estimate_rules','enabled'),('estimate_rules','created_at'),('estimate_rules','updated_at'),
('projects','slug'),('projects','title'),('projects','published'),('projects','created_at'),
('resources','title'),('resources','file_url'),('resources','published'),('resources','created_at'),
('enquiries','submitted_at'),('enquiries','product_id'),('enquiries','variant_id'),('enquiries','status'),
('audit_log','occurred_at'),('audit_log','action'),('audit_log','module'))
select 'COLUMN' object_type, tbl||'.'||col object_name,
       case when exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=required.tbl and c.column_name=required.col) then 'EXISTS' else 'MISSING' end status
from required order by tbl,col;

select 'CONTENT COUNTS' section,
       jsonb_build_object(
         'pages',(select count(*) from public.page_content),
         'divisions',(select count(*) from public.divisions),
         'products',(select count(*) from public.products),
         'projects',(select count(*) from public.projects),
         'resources',(select count(*) from public.resources),
         'estimate_rules',(select count(*) from public.estimate_rules)
       ) result;

select 'ESTIMATE RULES' section, rule_key, name, enabled, configuration
from public.estimate_rules
where rule_key in ('gst-reference','sheet-metal-weight','3d-print-material')
order by rule_key;

select 'RLS' section, relname table_name, relrowsecurity enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and relname in (
'app_roles','app_permissions','role_permissions','user_profiles','user_permission_overrides','site_settings','page_content',
'divisions','products','product_variants','product_internal','variant_internal','estimate_rules','projects','resources',
'enquiries','analytics_events','audit_log')
order by relname;

select 'BACKUP' section,
       case when to_regnamespace('cg_v2_backup_20260913_r4') is not null then 'cg_v2_backup_20260913_r4 EXISTS' else 'MISSING' end status;

select 'FINAL' section,
       case
         when (select count(*) from auth.users where lower(email) in ('ramiz.islam@admin.crecergrande.in','sourav.bhowmik@admin.crecergrande.in'))=2
          and (select count(*) from public.user_profiles where login_slug in ('ramiz.islam','sourav.bhowmik') and is_active)=2
          and (select count(*) from public.user_profiles where is_root=true and login_slug='ramiz.islam')=1
          and (select count(*) from public.user_profiles where is_root=true)=1
          and (select count(*) from public.page_content)>=20
          and (select count(*) from public.estimate_rules where rule_key in ('gst-reference','sheet-metal-weight','3d-print-material'))=3
          and to_regclass('public.analytics_events') is not null
          and to_regclass('public.variant_internal') is not null
          and exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='has_permission')
          and exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='submit_enquiry')
          and exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='track_event')
         then 'PASS'
         else 'CHECK RESULTS ABOVE'
       end status;
