CRECER GRANDE WEBSITE V1.9.3 — GITHUB PAGES DEPLOYMENT
======================================================

Upload the CONTENTS of this folder to the root of the existing GitHub Pages repository.
Keep:
- CNAME
- .nojekyll
- robots.txt
- sitemap.xml

The custom domain in CNAME is crecergrande.in.

If backend-config.js still says enabled:false, the public site works from bundled fallback content but online Admin Login will show that backend setup is required.
After the private one-time setup, backend-config.js contains only the Supabase Project URL and publishable key; it must never contain a secret key.
