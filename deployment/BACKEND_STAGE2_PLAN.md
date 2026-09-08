# Crecer Grande Website V9 — Stage 2 Backend Plan

Static V9 is a static, local-preview/admin prototype. The public website can remain on GitHub Pages.

## Stage 2
1. Create a Supabase project under the user's account.
2. Create products, product_variants, enquiries and site_settings tables.
3. Enable Row Level Security.
4. Permit public read access only to published products/variants.
5. Permit public insert to enquiries with validation/rate limits.
6. Create authenticated admin users only.
7. Restrict product/settings writes to admin role.
8. Add image storage bucket with controlled upload policies.
9. Replace browser-local admin with Supabase Auth.
10. Connect public product catalogue and calculator to live database.

## Business Suite
Do not expose GST invoices, supplier costs or accounting data in the public website database. Later integration should use a private API or controlled export/import flow.
