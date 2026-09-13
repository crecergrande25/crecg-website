# Crecer Grande Website V2.0

Complete GitHub-ready successor to V1.9.3 for `https://crecergrande.in/`.

## Included
- Full public website: Home, About, Divisions, Services, Products, Estimates, Projects, Industries, Resources, Contact, Privacy and Disclaimer.
- All 8 division pages and 8 downloadable division-profile PDFs.
- 6 dedicated local/service SEO pages: Laser Marking, 3D Printing, Reverse Engineering, Custom Machine Spares, Industrial Machine Maintenance and Laser Cutting.
- 8 product-detail pages preserving the established product URLs and catalogue groups.
- SS304 QR laser-marking case-study page.
- Strong internal linking between the homepage, service pages and relevant divisions, plus canonical URLs, sitemap, robots.txt, Open Graph/Twitter metadata and relevant Organization / Service / FAQ / Product structured data.
- Responsive mobile navigation, WhatsApp paths, RFQ form, estimate tools and accessibility basics.
- Website Manager V2.0 admin for global settings/branding, Pages & SEO, divisions, products, product variants, private pricing, estimate defaults, projects, resources, media, enquiries, analytics, user/access management and audit history.
- Included protected `admin-users` Supabase Edge Function for secure creation, access changes and password resets without exposing a service-role key to the public browser.
- Existing V1.9.3 Supabase roles/RLS/audit/analytics model is preserved. The V2.0 user-management helper keeps identity mutations server-side and root-account protection intact.
- `supabase/V2.0_MASTER_BACKEND_UPGRADE_R4.sql` adds/updates V2 content and user-management support; it does not delete existing users, passwords, enquiries, analytics or audit history.

## Required one-time configuration
Copy the existing browser-safe V1.9.3 Supabase **Project URL** and **publishable browser key** into `assets/js/runtime-config.js`. Never put a Secret key, `service_role` key, database password or admin password in GitHub.

Run the V2.0 migration and deploy the included Edge Function as `admin-users` before using Website Manager → Users & Access. Full deployment steps are in `DEPLOY_V2.0.md`.

## Brand font
The Crecer Grande logo artwork is included. The Pirulen font file is not redistributed in this package. Display text falls back safely when a licensed webfont is not separately deployed.

See `DEPLOY_V2.0.md`, `QA_REPORT.txt`, `FILE_MANIFEST.txt` and `CHANGELOG.md`.


## Existing Supabase project compatibility
The live Crecer Grande project was inspected on 2026-09-13 and found to have a partial V1.x backend: content tables existed, while the role/profile/permission layer and several RPCs were missing. Use `supabase/V2.0_MASTER_BACKEND_UPGRADE_R4.sql` for this project. It preserves the existing `@admin.crecergrande.in` Auth identities.
