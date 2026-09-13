(() => {
  const cfg = window.CG_CONFIG || {};
  const loginPane = document.getElementById('login');
  const appPane = document.getElementById('app');
  const content = document.getElementById('content');
  const viewTitle = document.getElementById('view-title');
  const configWarning = document.getElementById('config-warning');

  let client = null;
  let profile = null;
  let perms = {};
  let currentView = 'dashboard';
  let productOptions = [];

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
  const can = (key) => !!perms[key];
  const configured = () => !!(window.supabase && cfg.supabaseUrl && cfg.supabasePublishableKey);
  const boolKeys = new Set(['published', 'featured', 'enabled', 'is_capability_example']);
  const jsonKeys = new Set(['body', 'gallery', 'specifications', 'compatibility', 'attributes', 'configuration']);
  const numberKeys = new Set(['sort_order', 'gst_pct', 'moq', 'public_price', 'purchase_cost', 'minimum_sell_price']);

  async function uid() {
    return ((await client.auth.getUser()).data.user || {}).id;
  }

  async function boot() {
    if (!configured()) {
      configWarning.classList.remove('hidden');
      document.getElementById('login-user').innerHTML = '<option value="">Backend configuration required</option>';
      return;
    }
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey);
    const { data: { session } } = await client.auth.getSession();
    if (session) return enter();
    await loadLogins();
  }

  async function loadLogins() {
    const { data, error } = await client.rpc('get_login_options');
    const sel = document.getElementById('login-user');
    if (error) {
      sel.innerHTML = '<option value="ramiz.islam">Ramiz Islam</option><option value="sourav.bhowmik">Sourav Bhowmik</option>';
      return;
    }
    sel.innerHTML = '<option value="">Choose user</option>' + (data || [])
      .map((x) => `<option value="${esc(x.login_slug)}">${esc(x.display_name)}</option>`).join('');
  }

  async function enter() {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;
    const r = await client.from('user_profiles')
      .select('display_name,role_key,is_root,must_change_password')
      .eq('user_id', user.id).maybeSingle();
    if (!r.data) {
      await client.auth.signOut();
      return;
    }
    profile = r.data;
    perms = {};
    const p = await client.rpc('get_my_permissions');
    (p.data || []).forEach((x) => { perms[x.permission_key] = x.allowed; });
    loginPane.style.display = 'none';
    appPane.style.display = 'block';
    document.getElementById('who').textContent = `${profile.display_name} • ${profile.role_key}`;
    filterNav();
    try {
      await client.rpc('log_admin_event', {
        p_action: 'LOGIN', p_module: 'auth', p_record_label: profile.display_name
      });
    } catch (_) {}
    if (profile.must_change_password) location.href = 'reset-password.html';
    else view('dashboard');
  }

  function filterNav() {
    const map = {
      settings: 'website.edit', pages: 'pages.edit', divisions: 'divisions.edit', products: 'products.edit',
      variants: 'products.edit', pricing: 'products.pricing', estimates: 'estimates.edit', projects: 'projects.edit',
      resources: 'resources.edit', media: 'media.edit', enquiries: 'enquiries.view', analytics: 'analytics.view',
      users: 'users.view', audit: 'audit.view'
    };
    document.querySelectorAll('[data-view]').forEach((b) => {
      const p = map[b.dataset.view];
      if (p && !can(p) && !(b.dataset.view === 'pages' && can('seo.edit'))) b.style.display = 'none';
    });
  }

  document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const slug = document.getElementById('login-user').value;
    const pw = document.getElementById('login-pass').value;
    const st = document.getElementById('login-status');
    st.classList.remove('hidden');
    st.textContent = 'Signing in…';
    const authDomain = cfg.adminAuthDomain || 'admin.crecergrande.in';
    const r = await client.auth.signInWithPassword({ email: `${slug}@${authDomain}`, password: pw });
    if (r.error) { st.textContent = r.error.message; return; }
    enter();
  };
  document.getElementById('logout').onclick = async () => { await client.auth.signOut(); location.reload(); };
  document.getElementById('refresh').onclick = () => view(currentView);
  document.querySelectorAll('[data-view]').forEach((b) => { b.onclick = () => view(b.dataset.view); });

  function navActive(v) {
    document.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
  }

  async function view(v) {
    currentView = v;
    navActive(v);
    viewTitle.textContent = ({
      dashboard: 'Dashboard', settings: 'Website Settings', pages: 'Pages & SEO', divisions: 'Divisions',
      products: 'Products', variants: 'Product Variants', pricing: 'Internal Pricing', estimates: 'Estimate Rules',
      projects: 'Projects', resources: 'Resources', media: 'Media Library', enquiries: 'Enquiries',
      analytics: 'Analytics', users: 'Users & Access', audit: 'Audit Log'
    })[v] || v;
    content.innerHTML = '<div class="card">Loading…</div>';
    try {
      if (v === 'dashboard') return dashboard();
      if (v === 'settings') return settings();
      if (v === 'analytics') return analytics();
      if (v === 'media') return media();
      if (v === 'pricing') return pricing();
      if (v === 'users') return users();
      if (v === 'enquiries') return enquiries();
      if (['pages', 'divisions', 'products', 'variants', 'estimates', 'projects', 'resources', 'audit'].includes(v)) return tableView(v);
    } catch (e) {
      content.innerHTML = `<div class="card"><b>Error:</b> ${esc(e.message || e)}</div>`;
    }
  }

  async function dashboard() {
    let a = {};
    if (can('analytics.view')) {
      try { a = (await client.rpc('get_analytics_summary', { p_days: 30 })).data || {}; } catch (_) {}
    }
    let newEnquiries = 0;
    if (can('enquiries.view')) {
      const en = await client.from('enquiries').select('id', { count: 'exact', head: true }).eq('status', 'new');
      newEnquiries = en.count || 0;
    }
    content.innerHTML = `
      <div class="stats">
        <div class="stat"><span>Page views / 30d</span><b>${a.page_views || 0}</b></div>
        <div class="stat"><span>Visitors / 30d</span><b>${a.unique_visitors || 0}</b></div>
        <div class="stat"><span>WhatsApp clicks</span><b>${a.whatsapp_clicks || 0}</b></div>
        <div class="stat"><span>New enquiries</span><b>${newEnquiries}</b></div>
      </div>
      <div class="card"><h2>Website V2.0</h2><p>Manage content, SEO, divisions, products, variants, private pricing, estimate defaults, projects, downloads, media, enquiries, analytics, users and audit history. Identity creation/password changes remain protected by the server-side <code>admin-users</code> Edge Function.</p></div>`;
  }

  async function settings() {
    if (!can('website.edit')) return noPerm();
    const r = await client.from('site_settings').select('*').limit(1).maybeSingle();
    const d = r.data || {};
    const fields = ['company_name', 'tagline', 'gstin', 'udyam', 'phone_primary', 'phone_secondary', 'phone_tertiary', 'whatsapp', 'email_primary', 'email_secondary', 'instagram_handle', 'website_url', 'address', 'city', 'state', 'postal_code', 'logo_url', 'favicon_url', 'social_image_url', 'color_navy', 'color_gold'];
    content.innerHTML = `<form id="setform" class="card"><div class="grid2">${fields.map((k) => fieldHtml(k, d[k])).join('')}</div><button class="primary">Save settings</button></form>`;
    document.getElementById('setform').onsubmit = async (e) => {
      e.preventDefault();
      const x = Object.fromEntries(new FormData(e.target).entries());
      x.updated_by = await uid();
      const q = d.id == null ? { error: new Error('Site settings row not found') } : await client.from('site_settings').update(x).eq('id', d.id);
      alert(q.error ? q.error.message : 'Saved');
    };
  }

  const defs = {
    pages: { t: 'page_content', label: 'page_name', key: 'id', perm: 'pages.edit', cols: ['page_name', 'page_slug', 'seo_title', 'published'], edit: ['page_name', 'page_slug', 'title', 'intro', 'seo_title', 'seo_description', 'canonical_url', 'published', 'body'], create: { page_name: 'New Page', page_slug: 'new-page', title: 'New Page', intro: '', body: {}, seo_title: '', seo_description: '', canonical_url: '', published: false } },
    divisions: { t: 'divisions', label: 'name', key: 'id', perm: 'divisions.edit', cols: ['name', 'slug', 'short_description', 'published', 'sort_order'], edit: ['name', 'slug', 'short_description', 'full_description', 'image_url', 'icon', 'sort_order', 'published'], create: { name: 'New Division', slug: 'new-division', short_description: '', full_description: '', sort_order: 99, published: false } },
    products: { t: 'products', label: 'name', key: 'id', perm: 'products.edit', cols: ['name', 'slug', 'category', 'price_mode', 'featured', 'published'], edit: ['name', 'slug', 'category', 'subcategory', 'short_description', 'description', 'image_url', 'tags', 'specifications', 'compatibility', 'hsn', 'gst_pct', 'unit', 'moq', 'public_price', 'price_mode', 'featured', 'published', 'sort_order'], create: { name: 'New Product', slug: 'new-product', category: 'Industrial', short_description: '', description: '', gst_pct: 18, unit: 'Nos', moq: 1, price_mode: 'quote', featured: false, published: false, sort_order: 99 } },
    variants: { t: 'product_variants', label: 'variant_name', key: 'id', perm: 'products.edit', cols: ['variant_name', 'sku', 'product_id', 'moq', 'public_price', 'published'], edit: ['product_id', 'variant_name', 'sku', 'attributes', 'unit', 'moq', 'public_price', 'gst_pct', 'published', 'sort_order'], create: { product_id: '', variant_name: 'New Variant', sku: '', attributes: {}, unit: 'Nos', moq: 1, gst_pct: 18, published: false, sort_order: 99 } },
    estimates: { t: 'estimate_rules', label: 'name', key: 'id', perm: 'estimates.edit', cols: ['name', 'rule_key', 'rule_type', 'enabled'], edit: ['rule_key', 'name', 'description', 'rule_type', 'configuration', 'enabled'], create: { rule_key: 'new-rule', name: 'New Estimate Rule', description: '', rule_type: 'defaults', configuration: {}, enabled: false } },
    projects: { t: 'projects', label: 'title', key: 'id', perm: 'projects.edit', cols: ['title', 'slug', 'summary', 'published', 'sort_order'], edit: ['title', 'slug', 'summary', 'details', 'image_url', 'gallery', 'tags', 'is_capability_example', 'published', 'sort_order'], create: { slug: 'new-project', title: 'New Project', summary: '', details: '', gallery: [], tags: [], is_capability_example: true, published: false, sort_order: 99 } },
    resources: { t: 'resources', label: 'title', key: 'id', perm: 'resources.edit', cols: ['title', 'resource_type', 'file_url', 'published', 'sort_order'], edit: ['title', 'description', 'file_url', 'resource_type', 'published', 'sort_order'], create: { title: 'New Resource', description: '', file_url: 'https://crecergrande.in/', resource_type: 'pdf', published: false, sort_order: 99 } },
    audit: { t: 'audit_log', label: 'record_label', key: 'id', perm: 'audit.view', cols: ['occurred_at', 'actor_display_name', 'action', 'module', 'record_label'], readonly: true }
  };

  function noPerm() { content.innerHTML = '<div class="card">No permission.</div>'; }

  async function ensureProductOptions() {
    if (productOptions.length) return productOptions;
    const r = await client.from('products').select('id,name,slug').order('name');
    productOptions = r.data || [];
    return productOptions;
  }

  function displayCell(v, col, viewName) {
    if (viewName === 'variants' && col === 'product_id') {
      return productOptions.find((p) => p.id === v)?.name || v || '';
    }
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (typeof v === 'object' && v !== null) return JSON.stringify(v);
    return v ?? '';
  }

  async function tableView(v) {
    const d = defs[v];
    if (!d) return;
    if (!can(d.perm) && !(v === 'pages' && can('seo.edit'))) return noPerm();
    if (v === 'variants') await ensureProductOptions();

    let q = client.from(d.t).select('*').limit(250);
    if (v === 'audit') q = q.order('occurred_at', { ascending: false });
    else if (v === 'pages') q = q.order('page_name');
    else if (v === 'variants') q = q.order('sort_order');
    else if (['divisions', 'products', 'projects', 'resources'].includes(v)) q = q.order('sort_order');
    else q = q.order(d.label);
    const r = await q;
    if (r.error) throw r.error;
    const rows = r.data || [];
    const add = d.create && can(d.perm) ? '<button class="primary" id="add-record">+ Add</button>' : '';
    content.innerHTML = `<div class="card"><div class="toolbar">${add}</div><div class="table-wrap">${rows.length ? `<table><thead><tr>${d.cols.map((c) => `<th>${esc(c)}</th>`).join('')}<th></th></tr></thead><tbody>${rows.map((x, i) => `<tr>${d.cols.map((c) => `<td>${esc(displayCell(x[c], c, v))}</td>`).join('')}<td>${d.readonly ? '' : `<button class="primary small" data-edit="${i}">Edit</button>`}</td></tr>`).join('')}</tbody></table>` : 'No records.'}</div></div><div id="editor"></div>`;
    content.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => editRecord(v, d, rows[+b.dataset.edit]); });
    document.getElementById('add-record')?.addEventListener('click', () => editRecord(v, d, { ...d.create }, true));
  }

  function parseField(k, val, orig) {
    if (boolKeys.has(k)) return val === 'true';
    if (jsonKeys.has(k)) {
      try { return JSON.parse(val || (k === 'gallery' ? '[]' : '{}')); }
      catch (_) { throw new Error(`${k} must be valid JSON`); }
    }
    if (k === 'tags') {
      try { return JSON.parse(val || '[]'); }
      catch (_) { return String(val || '').split(',').map((x) => x.trim()).filter(Boolean); }
    }
    if (numberKeys.has(k)) return val === '' ? null : Number(val);
    return val === '' && orig == null ? null : val;
  }

  function optionSelect(k, val) {
    const opts = {
      price_mode: ['quote', 'fixed', 'from', 'range'],
      rule_type: ['defaults', 'formula'],
      resource_type: ['pdf', 'link', 'document', 'image']
    }[k];
    if (!opts) return null;
    return `<label class="field">${esc(k)}<select name="${k}">${opts.map((o) => `<option value="${esc(o)}" ${String(val) === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
  }

  function fieldHtml(k, val) {
    if (boolKeys.has(k)) return `<label class="field">${esc(k)}<select name="${k}"><option value="true" ${val === true ? 'selected' : ''}>true</option><option value="false" ${val !== true ? 'selected' : ''}>false</option></select></label>`;
    if (k === 'product_id' && productOptions.length) {
      return `<label class="field">Product<select name="${k}" required><option value="">Choose product</option>${productOptions.map((p) => `<option value="${esc(p.id)}" ${p.id === val ? 'selected' : ''}>${esc(p.name)} (${esc(p.slug)})</option>`).join('')}</select></label>`;
    }
    const special = optionSelect(k, val);
    if (special) return special;
    if (typeof val === 'object' && val !== null) val = JSON.stringify(val, null, 2);
    const big = String(val ?? '').length > 90 || ['body', 'description', 'short_description', 'full_description', 'details', 'admin_notes', 'supplier_notes', 'internal_notes', 'seo_description', 'configuration', 'specifications', 'compatibility', 'attributes', 'gallery', 'tags'].includes(k);
    return `<label class="field">${esc(k)}${big ? `<textarea name="${k}" rows="5">${esc(val ?? '')}</textarea>` : `<input name="${k}" value="${esc(val ?? '')}">`}</label>`;
  }

  async function editRecord(v, d, row, isNew = false) {
    if (v === 'variants') await ensureProductOptions();
    const ed = document.getElementById('editor');
    ed.innerHTML = `<form id="editform" class="card"><h2>${isNew ? 'Add' : 'Edit'} ${esc(row[d.label] || 'record')}</h2><div class="grid2">${d.edit.map((k) => fieldHtml(k, row[k])).join('')}</div><div class="toolbar"><button class="primary">${isNew ? 'Create' : 'Save'}</button>${!isNew ? '<button type="button" class="danger" id="delete-record">Delete</button>' : ''}</div></form>`;
    document.getElementById('editform').onsubmit = async (e) => {
      e.preventDefault();
      try {
        const raw = Object.fromEntries(new FormData(e.target).entries());
        const x = {};
        for (const k of d.edit) x[k] = parseField(k, raw[k], row[k]);
        if (d.t !== 'enquiries') x.updated_by = await uid();
        const result = isNew ? await client.from(d.t).insert(x) : await client.from(d.t).update(x).eq(d.key, row[d.key]);
        alert(result.error ? result.error.message : (isNew ? 'Created' : 'Saved'));
        if (!result.error) { productOptions = []; view(v); }
      } catch (err) { alert(err.message); }
    };
    document.getElementById('delete-record')?.addEventListener('click', async () => {
      if (!confirm('Delete this record? This cannot be undone.')) return;
      const result = await client.from(d.t).delete().eq(d.key, row[d.key]);
      alert(result.error ? result.error.message : 'Deleted');
      if (!result.error) { productOptions = []; view(v); }
    });
  }

  async function pricing() {
    if (!can('products.pricing')) return noPerm();
    const pr = (await client.from('products').select('id,name,slug').order('name')).data || [];
    const pi = (await client.from('product_internal').select('*')).data || [];
    const by = Object.fromEntries(pi.map((x) => [x.product_id, x]));
    content.innerHTML = `<div class="card"><p class="muted">Internal pricing is private and never rendered on public pages. Select a product to maintain purchase cost, minimum sell price and supplier notes.</p><div class="table-wrap"><table><thead><tr><th>Product</th><th>Purchase cost</th><th>Minimum sell</th><th>Supplier</th><th></th></tr></thead><tbody>${pr.map((p, i) => { const x = by[p.id] || {}; return `<tr><td>${esc(p.name)}</td><td>${esc(x.purchase_cost ?? '')}</td><td>${esc(x.minimum_sell_price ?? '')}</td><td>${esc(x.preferred_supplier || '')}</td><td><button class="primary small" data-price="${i}">Edit</button></td></tr>`; }).join('')}</tbody></table></div></div><div id="editor"></div>`;
    content.querySelectorAll('[data-price]').forEach((b) => { b.onclick = () => priceEdit(pr[+b.dataset.price], by[pr[+b.dataset.price].id] || {}); });
  }

  function priceEdit(p, x) {
    const ed = document.getElementById('editor');
    ed.innerHTML = `<form id="priceform" class="card"><h2>${esc(p.name)} — internal pricing</h2>${['purchase_cost', 'minimum_sell_price', 'preferred_supplier', 'supplier_notes', 'internal_notes'].map((k) => fieldHtml(k, x[k])).join('')}<button class="primary">Save private pricing</button></form>`;
    document.getElementById('priceform').onsubmit = async (e) => {
      e.preventDefault();
      const r = Object.fromEntries(new FormData(e.target).entries());
      const data = {
        product_id: p.id,
        purchase_cost: r.purchase_cost ? Number(r.purchase_cost) : null,
        minimum_sell_price: r.minimum_sell_price ? Number(r.minimum_sell_price) : null,
        preferred_supplier: r.preferred_supplier || null,
        supplier_notes: r.supplier_notes || null,
        internal_notes: r.internal_notes || null,
        updated_by: await uid()
      };
      const q = await client.from('product_internal').upsert(data);
      alert(q.error ? q.error.message : 'Saved');
      if (!q.error) pricing();
    };
  }

  async function enquiries() {
    if (!can('enquiries.view')) return noPerm();
    const r = await client.from('enquiries').select('*').order('submitted_at', { ascending: false }).limit(250);
    if (r.error) throw r.error;
    const rows = r.data || [];
    let assignees = [];
    if (can('users.view')) assignees = (await client.from('user_profiles').select('user_id,display_name').eq('is_active', true).order('display_name')).data || [];
    const statusOpts = ['new', 'contacted', 'quoted', 'won', 'lost', 'closed', 'spam'];
    content.innerHTML = `<div class="card"><div class="table-wrap">${rows.length ? `<table><thead><tr><th>Date</th><th>Name / company</th><th>Contact</th><th>Requirement</th><th>Status</th><th></th></tr></thead><tbody>${rows.map((x, i) => `<tr><td>${esc(x.submitted_at || '')}</td><td><b>${esc(x.name || '')}</b><br><small>${esc(x.company || '')}</small></td><td>${esc(x.phone || '')}<br>${esc(x.email || '')}</td><td>${esc(x.requirement_type || '')}<br><small>${esc((x.message || '').slice(0, 140))}</small></td><td>${esc(x.status)}</td><td><button class="primary small" data-enq="${i}">Open</button></td></tr>`).join('')}</tbody></table>` : 'No enquiries.'}</div></div><div id="editor"></div>`;
    content.querySelectorAll('[data-enq]').forEach((b) => {
      b.onclick = () => {
        const x = rows[+b.dataset.enq];
        const ed = document.getElementById('editor');
        ed.innerHTML = `<form id="enqform" class="card"><h2>${esc(x.name || 'Enquiry')}</h2><p><b>Company:</b> ${esc(x.company || '—')}<br><b>Phone:</b> ${esc(x.phone || '—')}<br><b>Email:</b> ${esc(x.email || '—')}<br><b>Quantity:</b> ${esc(x.quantity || '—')}<br><b>Source:</b> ${esc(x.source || '—')}</p><p><b>Message</b><br>${esc(x.message || '—')}</p><div class="grid2"><label class="field">Status<select name="status">${statusOpts.map((s) => `<option value="${s}" ${x.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>${assignees.length ? `<label class="field">Assigned to<select name="assigned_to"><option value="">Unassigned</option>${assignees.map((u) => `<option value="${esc(u.user_id)}" ${x.assigned_to === u.user_id ? 'selected' : ''}>${esc(u.display_name)}</option>`).join('')}</select></label>` : ''}</div><label class="field">Admin notes<textarea name="admin_notes" rows="6">${esc(x.admin_notes || '')}</textarea></label>${can('enquiries.manage') ? '<button class="primary">Save enquiry</button>' : ''}</form>`;
        if (can('enquiries.manage')) document.getElementById('enqform').onsubmit = async (e) => {
          e.preventDefault();
          const f = Object.fromEntries(new FormData(e.target).entries());
          const data = { status: f.status, admin_notes: f.admin_notes || null, updated_by: await uid() };
          if (assignees.length) data.assigned_to = f.assigned_to || null;
          const q = await client.from('enquiries').update(data).eq('id', x.id);
          alert(q.error ? q.error.message : 'Saved');
          if (!q.error) enquiries();
        };
      };
    });
  }

  async function adminUserAction(body) {
    if (cfg.adminUsersFunctionUrl) {
      const session = (await client.auth.getSession()).data.session;
      const response = await fetch(cfg.adminUsersFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'apikey': cfg.supabasePublishableKey
        },
        body: JSON.stringify(body)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `User function returned ${response.status}`);
      return data;
    }
    const r = await client.functions.invoke('admin-users', { body });
    if (r.error) {
      let msg = r.error.message || 'User function failed';
      try {
        const bodyText = await r.error.context?.text();
        if (bodyText) msg = JSON.parse(bodyText).error || bodyText;
      } catch (_) {}
      throw new Error(msg);
    }
    if (r.data?.error) throw new Error(r.data.error);
    return r.data;
  }

  function randomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const bytes = new Uint32Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (n) => chars[n % chars.length]).join('');
  }

  async function users() {
    if (!can('users.view')) return noPerm();
    const u = (await client.from('user_profiles').select('user_id,display_name,login_slug,role_key,is_active,show_on_login,must_change_password,is_root,last_login_at').order('is_root', { ascending: false }).order('display_name')).data || [];
    const roles = (await client.from('app_roles').select('role_key,role_name').order('role_name')).data || [];
    const manage = can('users.manage');
    content.innerHTML = `<div class="card"><div class="toolbar"><div><h2>Users & Access</h2><p class="muted">Roles and visibility are database-controlled. Password creation/reset is handled only by the protected <code>admin-users</code> Edge Function; no service key is exposed in this browser.</p></div>${manage ? '<button class="primary" id="add-user">+ Create user</button>' : ''}</div><div class="table-wrap"><table><thead><tr><th>Name</th><th>Login</th><th>Role</th><th>Active</th><th>Shown at login</th><th>Root</th><th>Last login</th><th></th></tr></thead><tbody>${u.map((x, i) => `<tr><td>${esc(x.display_name)}</td><td>${esc(x.login_slug)}</td><td>${esc(x.role_key)}</td><td>${x.is_active ? 'Yes' : 'No'}</td><td>${x.show_on_login ? 'Yes' : 'No'}</td><td>${x.is_root ? 'Yes' : 'No'}</td><td>${esc(x.last_login_at || '')}</td><td>${manage ? `<button class="primary small" data-user="${i}">Manage</button>` : ''}</td></tr>`).join('')}</tbody></table></div></div><div id="editor"></div>`;
    if (manage) {
      document.getElementById('add-user').onclick = () => userCreateEditor(roles);
      content.querySelectorAll('[data-user]').forEach((b) => { b.onclick = () => userEditEditor(u[+b.dataset.user], roles); });
    }
  }

  function roleSelect(roles, value, disabled = false) {
    return `<select name="role_key" ${disabled ? 'disabled' : ''}>${roles.map((r) => `<option value="${esc(r.role_key)}" ${r.role_key === value ? 'selected' : ''}>${esc(r.role_name)}</option>`).join('')}</select>`;
  }

  function userCreateEditor(roles) {
    const ed = document.getElementById('editor');
    const pw = randomPassword();
    ed.innerHTML = `<form id="usercreate" class="card"><h2>Create user</h2><p class="muted">The login alias becomes an internal authentication identifier ending in <code>@admin.crecergrande.in</code>. It does not need to be a real mailbox.</p><div class="grid2"><label class="field">Display name<input name="display_name" required></label><label class="field">Login alias<input name="login_slug" placeholder="firstname.lastname" pattern="[a-z0-9._-]+" required></label><label class="field">Role${roleSelect(roles, 'administrator')}</label><label class="field">Show on login<select name="show_on_login"><option value="true">Yes</option><option value="false">No</option></select></label><label class="field">Temporary password<input id="new-user-password" name="temporary_password" value="${esc(pw)}" minlength="10" required></label></div><div class="toolbar"><button class="primary">Create user</button><button type="button" id="regen-password">Generate another password</button></div><div class="status">Give the temporary password securely to the user. V2.0 forces a password change on first login.</div></form>`;
    document.getElementById('regen-password').onclick = () => { document.getElementById('new-user-password').value = randomPassword(); };
    document.getElementById('usercreate').onsubmit = async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target).entries());
      try {
        await adminUserAction({ action: 'create', display_name: f.display_name, login_slug: f.login_slug, role_key: f.role_key, show_on_login: f.show_on_login === 'true', temporary_password: f.temporary_password });
        alert('User created. Copy the temporary password before leaving this screen.');
        users();
      } catch (err) { alert(err.message); }
    };
  }

  function userEditEditor(u, roles) {
    const ed = document.getElementById('editor');
    ed.innerHTML = `<div class="card"><h2>Manage ${esc(u.display_name)}</h2><form id="useredit"><div class="grid2"><label class="field">Display name<input name="display_name" value="${esc(u.display_name)}" required></label><label class="field">Login alias<input value="${esc(u.login_slug)}" disabled></label><label class="field">Role${roleSelect(roles, u.role_key, u.is_root)}</label><label class="field">Active<select name="is_active" ${u.is_root ? 'disabled' : ''}><option value="true" ${u.is_active ? 'selected' : ''}>Yes</option><option value="false" ${!u.is_active ? 'selected' : ''}>No</option></select></label><label class="field">Show on login<select name="show_on_login" ${u.is_root ? 'disabled' : ''}><option value="true" ${u.show_on_login ? 'selected' : ''}>Yes</option><option value="false" ${!u.show_on_login ? 'selected' : ''}>No</option></select></label></div><button class="primary">Save access settings</button></form></div><form id="pwreset" class="card"><h2>Reset temporary password</h2><p class="muted">This forces the user to choose a new password at the next login.</p><div class="toolbar"><input id="reset-user-password" name="temporary_password" value="${esc(randomPassword())}" minlength="10" required><button type="button" id="regen-reset">Generate</button><button class="danger">Reset password</button></div></form>`;
    document.getElementById('useredit').onsubmit = async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target).entries());
      try {
        await adminUserAction({ action: 'update', user_id: u.user_id, display_name: f.display_name, role_key: u.is_root ? u.role_key : f.role_key, is_active: u.is_root ? true : f.is_active === 'true', show_on_login: u.is_root ? true : f.show_on_login === 'true' });
        alert('User settings saved.'); users();
      } catch (err) { alert(err.message); }
    };
    document.getElementById('regen-reset').onclick = () => { document.getElementById('reset-user-password').value = randomPassword(); };
    document.getElementById('pwreset').onsubmit = async (e) => {
      e.preventDefault();
      if (!confirm(`Reset the password for ${u.display_name}?`)) return;
      const f = Object.fromEntries(new FormData(e.target).entries());
      try {
        await adminUserAction({ action: 'reset_password', user_id: u.user_id, temporary_password: f.temporary_password });
        alert('Temporary password reset. Copy it securely before closing this screen.');
      } catch (err) { alert(err.message); }
    };
  }

  async function media() {
    if (!can('media.edit')) return noPerm();
    const r = await client.storage.from('site-assets').list('', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });
    const files = r.data || [];
    content.innerHTML = `<div class="card"><h2>Media Library</h2><form id="uploadform" class="toolbar"><input type="file" id="media-file" accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf" required><button class="primary">Upload</button></form><p class="muted">Public bucket: site-assets. Maximum size and allowed file types are controlled by the existing Supabase storage policy.</p></div><div class="media-grid">${files.map((f, i) => { const url = client.storage.from('site-assets').getPublicUrl(f.name).data.publicUrl; return `<div class="media-card"><b>${esc(f.name)}</b><small>${esc(f.metadata?.mimetype || '')}</small><a href="${esc(url)}" target="_blank" rel="noopener">Open public URL</a><button class="danger" data-delmedia="${i}">Delete</button></div>`; }).join('') || '<div class="card">No root-level media files yet.</div>'}</div>`;
    document.getElementById('uploadform').onsubmit = async (e) => {
      e.preventDefault();
      const file = document.getElementById('media-file').files[0];
      if (!file) return;
      const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
      const name = `${Date.now()}-${safe}`;
      const q = await client.storage.from('site-assets').upload(name, file, { upsert: false });
      alert(q.error ? q.error.message : 'Uploaded');
      if (!q.error) { await log('UPLOAD', 'media', name, name); media(); }
    };
    content.querySelectorAll('[data-delmedia]').forEach((b) => {
      b.onclick = async () => {
        const f = files[+b.dataset.delmedia];
        if (!confirm(`Delete ${f.name}?`)) return;
        const q = await client.storage.from('site-assets').remove([f.name]);
        alert(q.error ? q.error.message : 'Deleted');
        if (!q.error) { await log('DELETE', 'media', f.name, f.name); media(); }
      };
    });
  }

  async function analytics() {
    if (!can('analytics.view')) return noPerm();
    const r = await client.rpc('get_analytics_summary', { p_days: 30 });
    const a = r.data || {};
    content.innerHTML = `<div class="stats"><div class="stat"><span>Page views</span><b>${a.page_views || 0}</b></div><div class="stat"><span>Visitors</span><b>${a.unique_visitors || 0}</b></div><div class="stat"><span>Sessions</span><b>${a.sessions || 0}</b></div><div class="stat"><span>Active now</span><b>${a.active_visitors || 0}</b></div></div><div class="grid2"><div class="card"><h2>Conversions</h2><table><tr><td>WhatsApp clicks</td><td>${a.whatsapp_clicks || 0}</td></tr><tr><td>Phone clicks</td><td>${a.phone_clicks || 0}</td></tr><tr><td>Estimate uses</td><td>${a.estimate_uses || 0}</td></tr><tr><td>Enquiries</td><td>${a.enquiries || 0}</td></tr></table></div><div class="card"><h2>Top pages</h2><table>${(a.top_pages || []).map((x) => `<tr><td>${esc(x.page)}</td><td>${x.count}</td></tr>`).join('')}</table></div></div><div class="grid2"><div class="card"><h2>Top sources</h2><table>${(a.top_sources || []).map((x) => `<tr><td>${esc(x.source)}</td><td>${x.count}</td></tr>`).join('')}</table></div><div class="card"><h2>Recent visitors</h2><table><tr><th>Visitor</th><th>Pages</th><th>Source</th></tr>${(a.recent_visitors || []).slice(0, 20).map((x) => `<tr><td>${esc(String(x.visitor_id).slice(0, 14))}…</td><td>${x.page_views}</td><td>${esc(x.source)}</td></tr>`).join('')}</table></div></div>`;
  }

  async function log(action, module, id, label, metadata = {}) {
    try {
      await client.rpc('log_admin_event', { p_action: action, p_module: module, p_record_id: id || null, p_record_label: label || null, p_metadata: metadata });
    } catch (_) {}
  }

  boot();
})();
