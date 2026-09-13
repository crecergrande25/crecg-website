# Deploy Crecer Grande Website V2.0

## 1. Preserve the working V1.9.3 infrastructure
1. Back up the current V1.9.3 GitHub repository.
2. Do **not** change HostingRaja DNS, the `CNAME`, or the current domain.
3. Do **not** delete/recreate the existing Supabase project. V2.0 reuses the current Auth users, data, enquiries, analytics and audit history.

## 2. Configure the browser-safe Supabase values
From the currently working V1.9.3 frontend configuration, copy only the Supabase **Project URL** and **publishable/anon browser key** into `assets/js/runtime-config.js`.

Leave `adminUsersFunctionUrl` blank when the function is deployed under the standard name `admin-users`; Website Manager will call it through the Supabase client. Use the custom URL field only if you intentionally deploy it elsewhere.

Never put a Secret key, `service_role` key, database password or admin password in the website/GitHub files.

## 3. Repair and upgrade the existing Supabase backend
Your live project is a partial V1.x backend, so **do not use an older V2.0 migration copy**.

In Supabase → SQL Editor, open a new query and run:

`supabase/V2.0_MASTER_BACKEND_UPGRADE_R4.sql`

This R4 master migration preserves the existing Auth users (`ramiz.islam@admin.crecergrande.in` and `sourav.bhowmik@admin.crecergrande.in`), existing products/projects/resources/enquiries/audit data, and creates only the missing V2.0 security/CMS/analytics objects. It also:
- re-applies the private login-list rule (name + alias only, no public role label);
- keeps Administrator away from user/security administration by default;
- adds the permission-checked helper used by the protected user-management function;
- adds the 6 SEO pages, product page records, resource URLs and configurable estimate defaults.

After it succeeds, run `supabase/POST_UPGRADE_VERIFY_R4.sql` and confirm the two linked admin profiles and missing objects are now present.

## 4. Deploy/update the protected `admin-users` Edge Function
Deploy the included source at:

`supabase/functions/admin-users/index.ts`

under the function name:

`admin-users`

The function requires the standard Supabase server environment values `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. The service-role key stays in the Edge Function environment only; never copy it into `runtime-config.js` or GitHub Pages code.

This function enables Website Manager → Users & Access to create users, change role/active/login visibility, and reset temporary passwords. The root Super Admin cannot be demoted, disabled or hidden from the login list.

## 5. Deploy the website
1. Replace the GitHub website files with the **contents** of this V2.0 folder.
2. Keep `index.html`, `CNAME`, `.nojekyll`, `robots.txt` and `sitemap.xml` at repository root.
3. Commit and push. Suggested commit: `Deploy Crecer Grande Website V2.0 R4`.
4. Wait for GitHub Pages to redeploy.

## 6. Post-deployment verification
Test `/`, `/products.html`, all 8 `/products/*.html` pages, `/estimate.html`, all 8 division pages, the 6 SEO service pages, `/resources.html`, `/contact.html` and `/admin/`.

Then verify:
1. Admin login dropdown shows enabled names/aliases without exposing roles.
2. Existing Ramiz Islam root Super Admin and Sourav Bhowmik Administrator accounts still work; V2.0 does not embed or reset their passwords.
3. Create a temporary test user from Website Manager → Users & Access, confirm first-login password change, then disable that test user.
4. Submit one harmless contact enquiry and confirm it appears in Website Manager → Enquiries. The public form uses the protected `submit_enquiry()` RPC.
5. Edit one harmless Page/SEO field, save, and confirm the public page reflects the update.
6. Edit one product variant and verify the public product page updates.
7. Change one estimate-rule default and verify the public Estimate page loads the new default.
8. Upload one test image to Media Library and confirm its public URL works; then delete it.
9. Check Analytics and Audit Log. Confirm changes are attributed to the logged-in administrator.
10. Confirm Internal Pricing is visible only to permitted admins and never appears on the public product pages.

## 7. Search Console
Resubmit `https://crecergrande.in/sitemap.xml`. Request indexing once for the 6 new service pages, 8 product-detail pages and QR case-study page. Do not repeatedly request indexing for unchanged URLs.
