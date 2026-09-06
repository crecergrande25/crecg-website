#!/usr/bin/env python3
"""Finalize CRECG static files for a production domain.
Usage: python deployment/configure_domain.py https://www.example.com
Safe to re-run if the domain changes before upload.
"""
from pathlib import Path
import sys, re, json

root = Path(__file__).resolve().parents[1]
if len(sys.argv) != 2:
    print('Usage: python deployment/configure_domain.py https://www.example.com')
    raise SystemExit(1)
site = sys.argv[1].rstrip('/')
if not site.startswith('https://'):
    raise SystemExit('Use the final HTTPS URL, e.g. https://www.example.com')

html_files = sorted(root.rglob('*.html'))
urls = []
for p in html_files:
    rel = p.relative_to(root).as_posix()
    if rel == '404.html':
        page_url = site + '/404.html'
    elif rel == 'index.html':
        page_url = site + '/'
        urls.append(page_url)
    else:
        page_url = site + '/' + rel
        urls.append(page_url)

    text = p.read_text(encoding='utf-8')
    # Make the script idempotent.
    text = re.sub(r'<link rel="canonical" href="[^"]*">', '', text)
    text = re.sub(r'<meta property="og:url" content="[^"]*">', '', text)
    text = re.sub(r'<meta property="og:image" content="[^"]*">',
                  f'<meta property="og:image" content="{site}/assets/images/hero-laser-cutting.webp">', text)
    marker = '<!-- DOMAIN_META_INSERT -->'
    meta = f'<link rel="canonical" href="{page_url}"><meta property="og:url" content="{page_url}">'
    if marker in text:
        text = text.replace(marker, marker + meta)
    else:
        text = text.replace('</head>', meta + '</head>')

    # Add/refresh URL and logo in Organization JSON-LD where present.
    m = re.search(r'<script type="application/ld\+json">(.*?)</script>', text)
    if m:
        try:
            data = json.loads(m.group(1))
            if data.get('@type') == 'Organization':
                data['url'] = site + '/'
                data['logo'] = site + '/assets/images/logo-crecg.png'
                repl = '<script type="application/ld+json">' + json.dumps(data, separators=(',', ':')) + '</script>'
                text = text[:m.start()] + repl + text[m.end():]
        except Exception:
            pass
    p.write_text(text, encoding='utf-8')

(root / 'robots.txt').write_text(
    f'User-agent: *\nAllow: /\nSitemap: {site}/sitemap.xml\n', encoding='utf-8')
entries = ''.join(f'<url><loc>{u}</loc></url>' for u in urls)
(root / 'sitemap.xml').write_text(
    '<?xml version="1.0" encoding="UTF-8"?>'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + entries + '</urlset>',
    encoding='utf-8')
print(f'Configured {len(html_files)} HTML files for {site}')
