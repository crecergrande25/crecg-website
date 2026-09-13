# Crecer Grande Website V2.0 — Changelog

- Integrated six dedicated SEO service pages into the full website and linked them from the homepage/services/relevant divisions.
- Preserved all eight operating divisions and eight downloadable division profiles.
- Restored Estimate in the primary navigation/footer and connected its public defaults to editable Supabase estimate rules.
- Restored/created eight established product detail URLs and a complete product catalogue with live published variants.
- Added dynamic division/product publication controls using the existing Supabase tables.
- Corrected public RFQ submission to use the protected `submit_enquiry()` RPC.
- Expanded analytics tracking for page, product, division, WhatsApp, phone, email and estimate interactions.
- Upgraded Website Manager: settings/branding; Pages & SEO; divisions; products; product variants with product-name selection; private pricing; estimate rules; projects; resources; media; enquiries; analytics; users/access; audit log.
- Added a protected V2.0 `admin-users` Edge Function plus permission-checked SQL helper for secure user creation, role/status changes and temporary-password resets.
- Re-applied login privacy so the public login options expose names/aliases only, not roles.
- Preserved root Super Admin protections and kept Administrator away from privileged user/security controls by default.
- Updated sitemap, migration SQL, resource URLs, deployment notes, runtime configuration comments and QA checks.
- No private admin passwords, Supabase Secret/service-role keys or redistributable font files are bundled in the website package.
- Rebuilt the Supabase upgrade as a legacy-aware normalizer after comparing the live partial backend with the canonical V1.9.3 schema. It handles text `site_settings.id`, legacy required `estimate_rules.title`, missing `estimate_rules.created_at`, blank/duplicate legacy slugs, missing CMS/security/analytics objects and existing `@admin.crecergrande.in` Auth identities before V2 seeding.
- Added a committed pre-upgrade data snapshot schema (`cg_v2_backup_20260913_r4`) and atomic Phase-B migration so a SQL failure does not partially apply the V2 database changes.

