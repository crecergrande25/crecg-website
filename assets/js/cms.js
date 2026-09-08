(function(){
'use strict';
const B=()=>window.CGBackend;
let state={settings:null,home:null,pageTexts:{},divisions:[],products:[],variants:[],projects:[],resources:[],estimateRules:[]};
function txt(el,v){ if(el && v!==undefined && v!==null) el.textContent=String(v); }
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function assetUrl(v){
  const s=String(v||'').trim(); if(!s)return s;
  if(/^(https?:|data:|blob:)/i.test(s))return s;
  if(s.startsWith('/'))return s;
  const script=[...document.scripts].find(x=>/\/assets\/js\/cms\.js(?:\?|$)/.test(x.src));
  const base=script?new URL('../../',script.src):new URL('./',location.href);
  try{return new URL(s.replace(/^\.\//,''),base).href;}catch{return s;}
}
function phoneHref(v){const d=String(v||'').replace(/\D/g,'');return 'tel:'+(d.length===10?'+91'+d:'+'+d);}
function waHref(v,msg='Hello Crecer Grande, I have an industrial requirement.'){const d=String(v||'').replace(/\D/g,'');return 'https://wa.me/'+(d.length===10?'91'+d:d)+'?text='+encodeURIComponent(msg);}
function setMeta(name,content,attr='name'){
  if(!content)return; let el=document.head.querySelector(`meta[${attr}="${name}"]`); if(!el){el=document.createElement('meta');el.setAttribute(attr,name);document.head.appendChild(el);} el.setAttribute('content',content);
}
function updateCompanySettings(s){
  if(!s)return;
  document.documentElement.style.setProperty('--navy',s.theme_navy||'#071a36');
  document.documentElement.style.setProperty('--gold',s.theme_gold||'#f5b51b');
  document.querySelectorAll('[data-cg-field]').forEach(el=>{const k=el.dataset.cgField; if(s[k]!=null) txt(el,s[k]);});
  document.querySelectorAll('[data-cg-image="logo_url"],.brand img,.footer-brand img').forEach(img=>{if(s.logo_url)img.src=assetUrl(s.logo_url); img.alt=s.company_name||'Crecer Grande';});
  const fav=document.querySelector('link[rel="icon"]'); if(fav&&s.favicon_url)fav.href=assetUrl(s.favicon_url);
  const apple=document.querySelector('link[rel="apple-touch-icon"]'); if(apple&&s.favicon_url)apple.href=assetUrl(s.favicon_url);
  if(s.domain){const domain=String(s.domain).replace(/\/$/,'');const path=location.pathname||'/';const generic=['product-detail','division-detail'].includes(document.body.dataset.page);const full=domain+path+(generic?location.search:'');const can=document.querySelector('link[rel=canonical]');if(can)can.href=full;setMeta('og:url',full,'property');}
  document.querySelectorAll('[data-cg-phone="primary"]').forEach(a=>{a.textContent='+91 '+(s.phone_primary||'');a.href=phoneHref(s.phone_primary);});
  document.querySelectorAll('[data-cg-phone="secondary"]').forEach(a=>{a.textContent='+91 '+(s.phone_secondary||'');a.href=phoneHref(s.phone_secondary);});
  document.querySelectorAll('[data-cg-phone="third"]').forEach(a=>{a.textContent='+91 '+(s.phone_third||'');a.href=phoneHref(s.phone_third);});
  document.querySelectorAll('[data-cg-email="primary"]').forEach(a=>{a.textContent=s.email_primary||'';a.href='mailto:'+(s.email_primary||'');});
  document.querySelectorAll('[data-cg-email="secondary"]').forEach(a=>{a.textContent=s.email_secondary||'';a.href='mailto:'+(s.email_secondary||'');});
  document.querySelectorAll('[data-cg-instagram]').forEach(a=>{a.textContent=(a.closest('.topbar')?'Instagram ':'')+'@'+(s.instagram_handle||'');a.href=s.instagram_url||'#';});
  document.querySelectorAll('[data-cg-address]').forEach(el=>txt(el,s.address));
  document.querySelectorAll('[data-cg-gstin]').forEach(el=>txt(el,(el.closest('.topbar')?'GSTIN: ':'')+(s.gstin||'')));
  document.querySelectorAll('[data-cg-udyam]').forEach(el=>txt(el,(el.closest('.topbar')?'Udyam: ':'')+(s.udyam||'')));
  document.querySelectorAll('[data-cg-whatsapp]').forEach(a=>a.href=waHref(s.whatsapp));
  const aw=document.querySelector('[data-contact-address-wrap]'); if(aw) aw.innerHTML='<b>Address</b><br>'+esc(s.address||'');
  const gw=document.querySelector('[data-contact-gstin-wrap]'); if(gw) gw.innerHTML='<b>GSTIN</b><br>'+esc(s.gstin||'');
  const uw=document.querySelector('[data-contact-udyam-wrap]'); if(uw) uw.innerHTML='<b>Udyam</b><br>'+esc(s.udyam||'');
  const copyright=document.querySelector('[data-cg-copyright]'); if(copyright) copyright.textContent='© '+new Date().getFullYear()+' '+(s.company_name||'Crecer Grande')+'. All rights reserved.';
}
function applyPageText(){
  const key=document.body.dataset.page; if(!key)return; const p=state.pageTexts[key]; if(!p)return;
  const hero=document.querySelector('.page-hero'); if(hero){txt(hero.querySelector('h1'),p.h1);txt(hero.querySelector('p'),p.intro);}
  if(p.title)document.title=p.title.replace(/&amp;/g,'&');
  if(p.meta_description)setMeta('description',p.meta_description);
}
function applyHomepage(){
  if(document.body.dataset.page!=='home'||!state.home)return;
  const h=state.home;
  const map={
    hero_eyebrow:'.hero .eyebrow',hero_description:'.hero .inner>p',
    divisions_heading:'#home-divisions-heading',divisions_description:'#home-divisions-description',
    start_heading:'#home-start-heading',start_description:'#home-start-description',
    featured_heading:'#home-featured-heading',featured_description:'#home-featured-description',
    process_heading:'#home-process-heading',process_description:'#home-process-description',
    estimate_heading:'#home-estimate-heading',estimate_description:'#home-estimate-description',
    why_heading:'#home-why-heading',why_description:'#home-why-description',
    cta_heading:'#home-cta-heading',cta_description:'#home-cta-description'
  };
  Object.entries(map).forEach(([k,sel])=>txt(document.querySelector(sel),h[k]));
  const h1=document.querySelector('.hero h1'); if(h1){h1.innerHTML=`${esc(h.hero_line1)}<br>${esc(h.hero_line2)}<br><span>${esc(h.hero_line3)}</span>`;}
}
function divisionCard(d,prefix=''){
  const href=d.slug==='industrial-products-spares'?prefix+'products.html':(KNOWN_DIVISIONS.has(d.slug)?prefix+'divisions/'+d.slug+'.html':prefix+'division.html?slug='+encodeURIComponent(d.slug));
  return `<a class="division-card" href="${href}"><img loading="lazy" src="${esc(assetUrl(d.image_url||prefix+'assets/images/div-manufacturing.webp'))}" alt="${esc(d.title)}"><div class="content"><div class="division-no">${esc(d.number_label||'')}</div><h3>${esc(d.title)}</h3><p>${esc(d.summary||'')}</p><span class="text-link">EXPLORE →</span></div></a>`;
}
function productCard(p,prefix=''){
  const href=KNOWN_PRODUCTS.has(p.slug)?prefix+'products/'+p.slug+'.html':prefix+'product.html?slug='+encodeURIComponent(p.slug);
  return `<a class="catalog-card" data-category="${esc((p.category||'').toLowerCase())}" href="${href}"><img loading="lazy" src="${esc(assetUrl(p.image_url||prefix+'assets/images/prod-obsolete.webp'))}" alt="${esc(p.title)}"><div class="body"><div class="badge">${esc(p.category)}</div><h3>${esc(p.title)}</h3><p>${esc(p.description||'')}</p><span class="more">View details →</span></div></a>`;
}
function featuredCard(p){
  const href=KNOWN_PRODUCTS.has(p.slug)?'products/'+p.slug+'.html':'product.html?slug='+encodeURIComponent(p.slug);
  return `<a class="product-card" href="${href}"><img loading="lazy" src="${esc(assetUrl(p.image_url||'assets/images/prod-obsolete.webp'))}" alt="${esc(p.title)}"><div class="body"><div class="badge">${esc(p.category)}</div><h3>${esc(p.title)}</h3><p>${esc(p.description||'')}</p><span class="more">VIEW DETAILS →</span></div></a>`;
}
function renderCollections(){
  const page=document.body.dataset.page;
  if(page==='home'){
    const dg=document.querySelector('#home-division-grid'); if(dg&&state.divisions.length)dg.innerHTML=state.divisions.map(d=>divisionCard(d)).join('');
    const pg=document.querySelector('#home-featured-grid'); const fs=state.products.filter(p=>p.featured).slice(0,4); if(pg&&fs.length)pg.innerHTML=fs.map(featuredCard).join('');
  }
  if(page==='divisions'){
    const dg=document.querySelector('#division-grid-live'); if(dg&&state.divisions.length)dg.innerHTML=state.divisions.map(d=>divisionCard(d)).join('');
  }
  if(page==='products'){
    const grid=document.querySelector('#catalog-grid-live'); if(grid&&state.products.length){grid.innerHTML=state.products.map(p=>productCard(p)).join('');rebuildFilters();}
  }
  if(page==='projects'){
    const pg=document.querySelector('#project-grid-live'); if(pg&&state.projects.length){pg.innerHTML=state.projects.map(p=>`<div class="project-card"><img loading="lazy" src="${esc(assetUrl(p.image_url||'assets/images/project-spares.webp'))}" alt="${esc(p.title)}"><div class="body"><h3>${esc(p.title)}</h3><p>${esc(p.summary||'')}</p></div></div>`).join('');}
  }
  if(page==='resources'){
    const rg=document.querySelector('#resource-grid-live'); if(rg&&state.resources.length){rg.innerHTML=state.resources.map(r=>`<div class="resource"><h3>${esc(r.title)}</h3><p>${esc(r.description||'')}</p><a class="btn dark" target="_blank" rel="noopener" href="${esc(assetUrl(r.file_url||'#'))}">Open Resource</a></div>`).join('');}
  }
}
function rebuildFilters(){
  const wrap=document.querySelector('#product-filters'); if(!wrap)return; const cats=[...new Set(state.products.map(p=>p.category).filter(Boolean))];
  wrap.innerHTML='<button class="filter-btn active" data-filter="all">All</button>'+cats.map(c=>`<button class="filter-btn" data-filter="${esc(c.toLowerCase())}">${esc(c)}</button>`).join('');
  window.dispatchEvent(new CustomEvent('cg:catalog-rendered'));
}

function renderEstimateRules(){
  if(document.body.dataset.page!=='estimate')return;
  const host=document.querySelector('#estimate-rule-host'); if(!host)return;
  const rules=state.estimateRules.filter(r=>r.active&&r.base_price!=null);
  if(!rules.length)return;
  host.innerHTML=`<div class="field-grid"><div class="field"><label>Product / reference rule</label><select id="live-rule-select">${rules.map(r=>`<option value="${r.id}">${esc(r.title)}</option>`).join('')}</select></div><div class="field"><label>Quantity</label><input id="live-rule-qty" type="number" min="1" step="1" value="1"></div></div><div id="live-rule-result" class="result"></div><p class="small">Indicative only. Final specification, availability, freight, taxes and formal quotation prevail.</p>`;
  const calc=()=>{const r=rules.find(x=>x.id===document.querySelector('#live-rule-select').value)||rules[0];let q=Math.max(Number(document.querySelector('#live-rule-qty').value)||0,Number(r.min_qty)||1);let rate=Number(r.base_price)||0;const ds=Array.isArray(r.qty_discounts)?r.qty_discounts:[];let pct=0;ds.forEach(d=>{if(q>=Number(d.min_qty||0))pct=Math.max(pct,Number(d.percent||0));});const netRate=rate*(1-pct/100),taxable=netRate*q,gst=taxable*(Number(r.gst||0)/100),total=taxable+gst;document.querySelector('#live-rule-result').innerHTML=`<div class="quick-row"><span>Reference rate</span><span>₹${rate.toLocaleString('en-IN',{maximumFractionDigits:2})}/${esc(r.unit||'pc')}</span></div><div class="quick-row"><span>Quantity</span><span>${q}</span></div><div class="quick-row"><span>Quantity discount</span><span>${pct}%</span></div><div class="quick-row"><span>Taxable</span><span>₹${taxable.toLocaleString('en-IN',{maximumFractionDigits:2})}</span></div><div class="quick-row"><span>GST ${Number(r.gst||0)}%</span><span>₹${gst.toLocaleString('en-IN',{maximumFractionDigits:2})}</span></div><div class="quick-row"><span><b>Indicative total</b></span><span><b>₹${total.toLocaleString('en-IN',{maximumFractionDigits:2})}</b></span></div>${r.public_note?`<p class="small">${esc(r.public_note)}</p>`:''}`;};
  document.querySelector('#live-rule-select').addEventListener('change',calc);document.querySelector('#live-rule-qty').addEventListener('input',calc);calc();
}
function pathAsset(url,prefix=''){if(!url)return prefix+'assets/images/prod-obsolete.webp';return /^(https?:|\/)/i.test(url)?url:prefix+url;}
function productDetailMarkup(p,vs,prefix=''){
  return `<section class="page-hero"><div class="container"><div class="eyebrow">${esc(p.category)}</div><h1>${esc(p.title)}</h1><p>${esc(p.description||'')}</p></div></section><section class="section"><div class="container detail-hero"><img src="${esc(pathAsset(p.image_url,prefix))}" alt="${esc(p.title)}"><div><div class="subhead">Product overview</div><h2>${esc(p.title)}</h2><p>${esc(p.description||'')}</p>${p.lead_time?`<p><b>Typical lead time:</b> ${esc(p.lead_time)}</p>`:''}${Array.isArray(p.compatibility)&&p.compatibility.length?`<div class="note"><b>Compatibility information</b><ul>${p.compatibility.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}<div class="actions"><a class="btn primary" href="${prefix}contact.html?product=${encodeURIComponent(p.title)}">Request Quote</a><a class="btn dark" href="${prefix}estimate.html?product=${encodeURIComponent(p.slug)}">Estimate</a></div></div></div></section>${vs.length?`<section class="section soft"><div class="container"><div class="section-head"><div><div class="subhead">Variants</div><h2>Available / configured variants</h2></div><p>Final compatibility and availability are confirmed before quotation.</p></div><div class="table-wrap"><table class="detail-table"><thead><tr><th>Variant</th><th>SKU</th><th>Unit</th><th>MOQ</th><th>Price</th><th>GST</th></tr></thead><tbody>${vs.map(v=>`<tr><td>${esc(v.name)}</td><td>${esc(v.sku||'—')}</td><td>${esc(v.unit||'pc')}</td><td>${esc(v.moq??1)}</td><td>${v.price==null?'On quotation':'₹'+Number(v.price).toLocaleString('en-IN')}</td><td>${esc(v.gst??p.gst??18)}%</td></tr>`).join('')}</tbody></table></div></div></section>`:''}`;
}
async function renderProductDetail(){
  const pg=document.body.dataset.page;if(!['product-detail','static-product'].includes(pg))return;
  const prefix=pg==='static-product'?'../':'';
  const slug=pg==='product-detail'?new URLSearchParams(location.search).get('slug'):(location.pathname.split('/').pop()||'').replace(/\.html$/,'');
  if(!slug)return;const p=state.products.find(x=>x.slug===slug);if(!p)return;
  document.title=p.title+' | Crecer Grande';
  setMeta('description',p.description||'Crecer Grande industrial product details.');
  if(pg==='product-detail'){const domain=(state.settings?.domain||'https://crecergrande.in').replace(/\/$/,'');const u=domain+'/product.html?slug='+encodeURIComponent(slug);let c=document.querySelector('link[rel=canonical]');if(c)c.href=u;setMeta('og:url',u,'property');}
  const vs=state.variants.filter(v=>v.product_id===p.id&&v.published!==false);
  const host=pg==='product-detail'?document.querySelector('#dynamic-product'):document.querySelector('main'); if(!host)return;
  host.innerHTML=productDetailMarkup(p,vs,prefix);
}
function divisionDetailMarkup(d,prefix=''){
  const bullets=Array.isArray(d.bullets)?d.bullets:[];
  return `<section class="page-hero"><div class="container"><div class="eyebrow">Our divisions</div><h1>${esc(d.title)}</h1><p>${esc(d.summary||'')}</p></div></section><section class="section"><div class="container detail-hero"><img src="${esc(pathAsset(d.image_url,prefix).replace('prod-obsolete.webp','div-manufacturing.webp'))}" alt="${esc(d.title)}"><div><div class="subhead">Division overview</div><h2>${esc(d.title)}</h2><p>${esc(d.description||d.summary||'')}</p>${bullets.length?`<ul>${bullets.map(b=>`<li>${esc(b)}</li>`).join('')}</ul>`:''}<div class="actions"><a class="btn primary" href="${prefix}contact.html?type=${encodeURIComponent(d.title)}">Discuss Requirement</a></div></div></div></section>`;
}
async function renderDivisionDetail(){
  const pg=document.body.dataset.page;if(!['division-detail','static-division'].includes(pg))return;
  const prefix=pg==='static-division'?'../':'';
  const slug=pg==='division-detail'?new URLSearchParams(location.search).get('slug'):(location.pathname.split('/').pop()||'').replace(/\.html$/,'');
  if(!slug)return;const d=state.divisions.find(x=>x.slug===slug);if(!d)return;
  document.title=d.title+' | Crecer Grande';setMeta('description',d.summary||'Crecer Grande division details.');if(pg==='division-detail'){const domain=(state.settings?.domain||'https://crecergrande.in').replace(/\/$/,'');const u=domain+'/division.html?slug='+encodeURIComponent(slug);let c=document.querySelector('link[rel=canonical]');if(c)c.href=u;setMeta('og:url',u,'property');}const host=pg==='division-detail'?document.querySelector('#dynamic-division'):document.querySelector('main');if(!host)return;host.innerHTML=divisionDetailMarkup(d,prefix);
}
async function submitEnquiry(payload){
  if(!B()?.enabled())return null;
  const row={name:payload.name,company:payload.company||null,phone:payload.phone,email:payload.email||null,requirement_type:payload.type||null,quantity:payload.qty||null,machine_model:payload.machine||null,part_number:payload.part||null,message:payload.message,source_url:location.href,status:'new'};
  return B().insert('enquiries',row,false);
}
async function load(){
  if(!B()?.enabled())return;
  try{
    const [settings,home,pages,divs,products,variants,projects,resources,rules]=await Promise.all([
      B().select('site_settings',{select:'*',id:'eq.main'}),
      B().select('homepage_content',{select:'*',id:'eq.main'}),
      B().select('page_texts',{select:'*'}),
      B().select('divisions',{select:'*',published:'eq.true',order:'sort_order.asc'}),
      B().select('products',{select:'*',published:'eq.true',order:'sort_order.asc'}),
      B().select('product_variants',{select:'*',published:'eq.true',order:'sort_order.asc'}),
      B().select('projects',{select:'*',published:'eq.true',order:'sort_order.asc'}),
      B().select('resources',{select:'*',published:'eq.true',order:'sort_order.asc'}),
      B().select('estimate_rules',{select:'*',active:'eq.true'})
    ]);
    state.settings=settings?.[0]||null;state.home=home?.[0]||null;state.pageTexts=Object.fromEntries((pages||[]).map(p=>[p.page_key,p]));state.divisions=divs||[];state.products=products||[];state.variants=variants||[];state.projects=projects||[];state.resources=resources||[];state.estimateRules=rules||[];
    updateCompanySettings(state.settings);applyPageText();applyHomepage();renderCollections();renderEstimateRules();await renderProductDetail();await renderDivisionDetail();
    document.dispatchEvent(new CustomEvent('cg:cms-ready',{detail:state}));
  }catch(e){console.warn('Crecer Grande CMS fallback mode:',e.message);document.documentElement.dataset.cmsFallback='true';}
}
window.CGCMS={state,load,submitEnquiry};
document.addEventListener('DOMContentLoaded',load);
})();
