(() => {
  'use strict';
  const B=window.CGBackend;
  if(!B) return;
  const OLD={
    company:'Crecer Grande',gstin:'19BBJPB4158H1ZM',udyam:'UDYAM-WB-14-0231207',
    address:'Plot No. LR-645, Mathpara Rd., Rajarhat, West Bengal – 700135, India',
    addressAlt:'Plot No. LR-645, Mathpara Rd., Rajarhat, West Bengal - 700135',
    phone1:'7003301781',phone2:'9073301781',phone3:'6291001781',
    email1:'crecergrande@outlook.com',email2:'crecergrande@outlook.in',instagram:'crecer_grande'
  };
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const absImage=u=>{ if(!u)return ''; if(/^https?:\/\//i.test(u))return u; return new URL(u.replace(/^\.\//,''),location.origin+'/').href; };
  const replaceText=(oldValue,newValue)=>{
    if(!newValue||oldValue===newValue)return;
    const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentElement?.tagName;return ['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','OPTION'].includes(p)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}});
    const nodes=[]; while(w.nextNode())nodes.push(w.currentNode);
    nodes.forEach(n=>{if(n.nodeValue.includes(oldValue))n.nodeValue=n.nodeValue.split(oldValue).join(newValue)});
  };
  function applyMeta(name,value,property=false){ if(!value)return; const sel=property?`meta[property="${name}"]`:`meta[name="${name}"]`; const m=document.querySelector(sel); if(m)m.content=value; }
  async function loadSettings(){
    try{
      const rows=await B.select('site_settings','select=*&id=eq.1&limit=1'); const s=rows?.[0]; if(!s)return null;
      if(s.color_navy)document.documentElement.style.setProperty('--navy',s.color_navy);
      if(s.color_gold)document.documentElement.style.setProperty('--gold',s.color_gold);
      replaceText(OLD.company,s.company_name);
      replaceText(OLD.gstin,s.gstin); replaceText(OLD.udyam,s.udyam);
      if(s.address){replaceText(OLD.address,s.address);replaceText(OLD.addressAlt,s.address);}
      if(s.logo_url)document.querySelectorAll('.brand img,.footer-brand img').forEach(img=>{img.src=s.logo_url;img.alt=s.company_name||OLD.company});
      const phones=[[OLD.phone1,s.phone_primary],[OLD.phone2,s.phone_secondary],[OLD.phone3,s.phone_tertiary]];
      document.querySelectorAll('a[href^="tel:"]').forEach(a=>{for(const [oldv,newv] of phones){if(newv&&a.href.replace(/\D/g,'').endsWith(oldv)){a.href='tel:+91'+newv.replace(/\D/g,'').replace(/^91/,'');a.textContent='+91 '+newv.replace(/\D/g,'').replace(/^91/,'')}}});
      [[OLD.email1,s.email_primary],[OLD.email2,s.email_secondary]].forEach(([oldv,newv])=>{if(!newv)return;document.querySelectorAll(`a[href="mailto:${oldv}"]`).forEach(a=>{a.href='mailto:'+newv;a.textContent=newv});});
      if(s.instagram_handle){document.querySelectorAll('a[href*="instagram.com"]').forEach(a=>{a.href=`https://www.instagram.com/${s.instagram_handle.replace(/^@/,'')}/`;a.textContent='@'+s.instagram_handle.replace(/^@/,'')});}
      if(s.whatsapp){document.querySelectorAll('a[href*="wa.me/"]').forEach(a=>{const msg=(a.href.split('?text=')[1]||'');a.href=`https://wa.me/${s.whatsapp.replace(/\D/g,'')}?text=${msg}`});}
      window.CGSiteSettings=s; return s;
    }catch(e){console.warn('CG settings fallback:',e.message);return null;}
  }
  function pageSlug(){
    const p=location.pathname.replace(/\/+$/,'').split('/').pop()||'index.html';
    const map={'index.html':'home','':'home','about.html':'about','divisions.html':'divisions','products.html':'products','estimate.html':'estimate','projects.html':'projects','resources.html':'resources','contact.html':'contact','privacy.html':'privacy','disclaimer.html':'disclaimer'};
    return map[p]||null;
  }
  async function loadPageContent(){
    const slug=pageSlug(); if(!slug)return;
    try{
      const visible=await B.rpc('is_page_published',{p_slug:slug},false);
      if(visible===false){location.replace('/404.html');return;}
      const rows=await B.select('page_content',`select=*&page_slug=eq.${encodeURIComponent(slug)}&limit=1`); const p=rows?.[0]; if(!p)return;
      if(p.seo_title)document.title=p.seo_title;
      applyMeta('description',p.seo_description);
      applyMeta('og:title',p.seo_title,true); applyMeta('og:description',p.seo_description,true);
      if(p.canonical_url){const c=document.querySelector('link[rel="canonical"]');if(c)c.href=p.canonical_url;applyMeta('og:url',p.canonical_url,true)}
      const hero=document.querySelector('.page-hero')||document.querySelector('.hero');
      if(slug!=='home'&&hero){if(p.title&&hero.querySelector('h1'))hero.querySelector('h1').textContent=p.title;if(p.intro&&hero.querySelector('p'))hero.querySelector('p').textContent=p.intro;}
      if(slug==='home'&&hero){
        const b=p.body||{}; const e=hero.querySelector('.eyebrow'),h=hero.querySelector('h1'),intro=hero.querySelector('p');
        if(e&&b.hero_eyebrow)e.textContent=b.hero_eyebrow;
        if(h&&(b.hero_line_1||b.hero_line_2||b.hero_line_3))h.innerHTML=`${esc(b.hero_line_1||'')}<br>${esc(b.hero_line_2||'')}<br><span>${esc(b.hero_line_3||'')}</span>`;
        if(intro&&(b.hero_intro||p.intro))intro.textContent=b.hero_intro||p.intro;
        const sectionMap={
          divisions:['Our divisions','divisions_heading','divisions_intro'],
          start:['Start with what you have','start_heading','start_intro'],
          featured:['Featured products','featured_heading','featured_intro'],
          why:['Why Crecer Grande','why_heading','why_intro']
        };
        for(const [,arr] of Object.entries(sectionMap)){
          const [label,hk,pk]=arr;const sh=[...document.querySelectorAll('.section-head')].find(x=>x.querySelector('.subhead')?.textContent.trim().toLowerCase()===label.toLowerCase());
          if(sh){if(b[hk]&&sh.querySelector('h2'))sh.querySelector('h2').textContent=b[hk];const ps=[...sh.children].find(x=>x.tagName==='P');if(ps&&b[pk])ps.textContent=b[pk];}
        }
        const proc=[...document.querySelectorAll('.section-head')].find(x=>x.querySelector('h2')?.textContent.toLowerCase().includes('first enquiry'));
        if(proc){if(b.process_heading)proc.querySelector('h2').textContent=b.process_heading;const ps=[...proc.children].find(x=>x.tagName==='P');if(ps&&b.process_intro)ps.textContent=b.process_intro;}
      }
    }catch(e){console.warn('CG page-content fallback:',e.message);}
  }
  const productHref=slug=>{
    const known=['laser-consumables','laser-chiller-pumps','sheet-metal-bending-tooling','plc-iot-housings','laser-chiller-spares','cnc-vmc-spares','custom-obsolete-spares','rapid-prototyping'];
    return known.includes(slug)?`products/${slug}.html`:`product.html?slug=${encodeURIComponent(slug)}`;
  };
  const divisionHref=slug=>{
    if(slug==='industrial-products-spares')return 'products.html';
    const known=['advanced-manufacturing','engineering-design','machine-maintenance','automation-solutions','quality-compliance','tender-gem','inspection-qa'];
    return known.includes(slug)?`divisions/${slug}.html`:`division.html?slug=${encodeURIComponent(slug)}`;
  };
  function imgSrc(u,fallback){return u?absImage(u):fallback;}
  async function dynamicGrids(){
    try{
      const divisions=await B.select('divisions','select=*&published=eq.true&order=sort_order.asc,name.asc');
      document.querySelectorAll('.division-grid').forEach(grid=>{
        if(!divisions?.length)return;
        const nested=location.pathname.includes('/divisions/'); const prefix=nested?'../':'';
        grid.innerHTML=divisions.map((d,i)=>`<a class="division-card" href="${prefix}${divisionHref(d.slug)}"><img loading="lazy" src="${esc(imgSrc(d.image_url,prefix+'assets/images/div-manufacturing.webp'))}" alt="${esc(d.name)}"><div class="content"><div class="division-no">${String(i+1).padStart(2,'0')}</div><h3>${esc(d.name)}</h3><p>${esc(d.short_description||'')}</p><span class="text-link">EXPLORE →</span></div></a>`).join('');
      });
    }catch(e){console.warn('CG divisions fallback:',e.message);}
    try{
      const products=await B.select('products','select=*&published=eq.true&order=sort_order.asc,name.asc');
      const catalog=document.querySelector('.catalog-grid');
      if(catalog&&products?.length){
        catalog.innerHTML=products.map(p=>`<a class="catalog-card" data-category="${esc((p.category||'').toLowerCase())}" href="${productHref(p.slug)}"><img loading="lazy" src="${esc(imgSrc(p.image_url,'assets/images/prod-obsolete.webp'))}" alt="${esc(p.name)}"><div class="body"><div class="badge">${esc(p.category)}</div><h3>${esc(p.name)}</h3><p>${esc(p.short_description||p.description||'')}</p><span class="more">View details →</span></div></a>`).join('');
        window.dispatchEvent(new CustomEvent('cg-catalog-updated'));
      }
      const featuredGrid=document.querySelector('.product-grid');
      if(featuredGrid&&products?.length&&location.pathname.match(/\/?(index\.html)?$/)){
        const feat=products.filter(p=>p.featured).slice(0,4); if(feat.length){featuredGrid.innerHTML=feat.map(p=>`<a class="product-card" href="${productHref(p.slug)}"><div class="image"><img loading="lazy" src="${esc(imgSrc(p.image_url,'assets/images/prod-obsolete.webp'))}" alt="${esc(p.name)}"></div><div class="body"><div class="badge">${esc(p.category)}</div><h3>${esc(p.name)}</h3><p>${esc(p.short_description||p.description||'')}</p><span class="more">View details →</span></div></a>`).join('');}
      }
    }catch(e){console.warn('CG products fallback:',e.message);}
  }
  async function dynamicProjectsResources(){
    try{
      const grid=document.querySelector('#cms-project-grid'); if(grid){const rows=await B.select('projects','select=*&published=eq.true&order=sort_order.asc,title.asc');if(rows?.length)grid.innerHTML=rows.map(p=>`<div class="project-card"><img loading="lazy" src="${esc(imgSrc(p.image_url,'assets/images/project-spares.webp'))}" alt="${esc(p.title)}"><div class="body"><h3>${esc(p.title)}</h3><p>${esc(p.summary||p.details||'')}</p></div></div>`).join('');}
      const rg=document.querySelector('#cms-resource-grid'); if(rg){const rows=await B.select('resources','select=*&published=eq.true&order=sort_order.asc,title.asc');if(rows?.length)rg.innerHTML=rows.map(r=>`<div class="resource"><h3>${esc(r.title)}</h3><p>${esc(r.description||'')}</p><a class="btn dark" target="_blank" rel="noopener" href="${esc(r.file_url)}">Open ${esc((r.resource_type||'PDF').toUpperCase())}</a></div>`).join('');}
    }catch(e){console.warn('CG dynamic content fallback:',e.message);}
  }
  async function dynamicDetail(){
    const path=location.pathname;
    let productSlug=null, divisionSlug=null;
    if(path.endsWith('/product.html')||path.endsWith('product.html')) productSlug=new URLSearchParams(location.search).get('slug');
    else {const m=path.match(/\/products\/([^/]+)\.html$/);if(m)productSlug=m[1];}
    if(path.endsWith('/division.html')||path.endsWith('division.html')) divisionSlug=new URLSearchParams(location.search).get('slug');
    else {const m=path.match(/\/divisions\/([^/]+)\.html$/);if(m)divisionSlug=m[1];}
    if(productSlug){
      try{
        const visible=await B.rpc('is_product_published',{p_slug:productSlug},false);if(visible===false){location.replace('/404.html');return;}
        const rows=await B.select('products',`select=*&slug=eq.${encodeURIComponent(productSlug)}&published=eq.true&limit=1`);const p=rows?.[0];if(!p)return;
        const vars=await B.select('product_variants',`select=*&product_id=eq.${encodeURIComponent(p.id)}&published=eq.true&order=sort_order.asc,variant_name.asc`);
        document.title=`${p.name} | Crecer Grande`; const hero=document.querySelector('.page-hero'); if(hero){hero.querySelector('h1').textContent=p.name;hero.querySelector('p').textContent=p.description||p.short_description||'';}
        document.querySelectorAll('[data-cms-product-name]').forEach(x=>x.textContent=p.name);
        document.querySelectorAll('[data-cms-product-description]').forEach(x=>x.textContent=p.description||p.short_description||'');
        document.querySelectorAll('[data-cms-product-image]').forEach(x=>{x.src=imgSrc(p.image_url,x.src);x.alt=p.name});
        const tbody=document.querySelector('[data-cms-variant-body]'); if(tbody){tbody.innerHTML=(vars||[]).map(v=>`<tr><td><b>${esc(v.variant_name)}</b></td><td>${esc(v.sku||'—')}</td><td>${v.public_price==null?'Formal quotation':'₹'+Number(v.public_price).toLocaleString('en-IN')}</td><td>${Number(v.gst_pct??p.gst_pct??18)}%</td><td>${esc(v.moq??p.moq??1)}</td></tr>`).join('')||'<tr><td colspan="5">Variants / exact configuration confirmed during quotation.</td></tr>';}
        track('product_view',{p_product_slug:p.slug});
      }catch(e){console.warn('CG product detail fallback:',e.message);}
    }
    if(divisionSlug){
      try{const visible=await B.rpc('is_division_published',{p_slug:divisionSlug},false);if(visible===false){location.replace('/404.html');return;}const rows=await B.select('divisions',`select=*&slug=eq.${encodeURIComponent(divisionSlug)}&published=eq.true&limit=1`);const d=rows?.[0];if(!d)return;document.title=`${d.name} | Crecer Grande`;const hero=document.querySelector('.page-hero');if(hero){hero.querySelector('h1').textContent=d.name;hero.querySelector('p').textContent=d.short_description||d.full_description||'';}document.querySelectorAll('[data-cms-division-name]').forEach(x=>x.textContent=d.name);document.querySelectorAll('[data-cms-division-description]').forEach(x=>x.textContent=d.full_description||d.short_description||'');document.querySelectorAll('[data-cms-division-image]').forEach(x=>{x.src=imgSrc(d.image_url,x.src);x.alt=d.name});track('division_view',{p_division_slug:d.slug});}catch(e){console.warn('CG division detail fallback:',e.message);}
    }
  }
  function uuid(){return crypto.randomUUID?crypto.randomUUID():'cg-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}
  function ids(){
    let visitor=localStorage.getItem('cg-visitor-id'); if(!visitor){visitor=uuid();localStorage.setItem('cg-visitor-id',visitor)}
    let s;try{s=JSON.parse(sessionStorage.getItem('cg-session')||'null')}catch{s=null}
    if(!s||!s.id||Date.now()-Number(s.last||0)>30*60*1000)s={id:uuid(),last:Date.now()};else s.last=Date.now();sessionStorage.setItem('cg-session',JSON.stringify(s));return {visitor,session:s.id};
  }
  function sourceInfo(){const u=new URL(location.href),ref=document.referrer;let source=u.searchParams.get('utm_source')||'',medium=u.searchParams.get('utm_medium')||'',campaign=u.searchParams.get('utm_campaign')||'',term=u.searchParams.get('utm_term')||'',content=u.searchParams.get('utm_content')||'';if(!source){if(!ref)source='direct';else{try{const h=new URL(ref).hostname.toLowerCase();source=h.includes('google.')?'google':h.includes('bing.')?'bing':h.includes('instagram.')?'instagram':h.includes('facebook.')?'facebook':h}catch{source='referral'}}}return{source,medium,campaign,term,content,referrer:ref}}
  function device(){const ua=navigator.userAgent;const type=/Mobi|Android/i.test(ua)?'mobile':/Tablet|iPad/i.test(ua)?'tablet':'desktop';let browser='Other';if(/Edg\//.test(ua))browser='Edge';else if(/Chrome\//.test(ua))browser='Chrome';else if(/Firefox\//.test(ua))browser='Firefox';else if(/Safari\//.test(ua))browser='Safari';let os='Other';if(/Windows/i.test(ua))os='Windows';else if(/Android/i.test(ua))os='Android';else if(/iPhone|iPad|iOS/i.test(ua))os='iOS';else if(/Mac OS/i.test(ua))os='macOS';else if(/Linux/i.test(ua))os='Linux';return{type,browser,os}}
  async function track(type,extra={}){try{const i=ids(),s=sourceInfo(),d=device();await B.rpc('track_event',{p_visitor_id:i.visitor,p_session_id:i.session,p_event_type:type,p_page_path:location.pathname+location.search,p_page_title:document.title,p_product_slug:extra.p_product_slug||null,p_division_slug:extra.p_division_slug||null,p_referrer:s.referrer||null,p_source:s.source||null,p_medium:s.medium||null,p_campaign:s.campaign||null,p_term:s.term||null,p_content:s.content||null,p_device_type:d.type,p_browser_family:d.browser,p_os_family:d.os,p_language:navigator.language||null,p_screen_size:`${screen.width}x${screen.height}`,p_metadata:extra.metadata||{}},false)}catch(e){/* analytics must never break the website */}}
  async function submitRfq(form,source){
    try{const f=new FormData(form),i=ids();const v=n=>(f.get(n)||'').toString().trim();const id=await B.rpc('submit_enquiry',{p_name:v('name'),p_company:v('company'),p_phone:v('phone'),p_email:v('email'),p_requirement_type:v('type'),p_product_id:null,p_variant_id:null,p_quantity:v('qty'),p_message:[v('message'),v('machine')?`Machine/Model: ${v('machine')}`:'',v('part')?`Part No.: ${v('part')}`:''].filter(Boolean).join('\n'),p_source:source||'website',p_visitor_id:i.visitor,p_session_id:i.session},false);track('rfq_submit',{metadata:{channel:source||'website'}});return id}catch(e){console.warn('Enquiry storage failed; external contact still available:',e.message);return null}}
  window.CGPublic={track,submitRfq};
  document.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;const h=a.href||'';if(h.includes('wa.me/'))track('click_whatsapp');else if(h.startsWith('tel:'))track('click_phone');else if(h.startsWith('mailto:'))track('click_email');else if(h.includes('instagram.com'))track('outbound_instagram');});
  document.addEventListener('DOMContentLoaded',async()=>{await Promise.allSettled([loadSettings(),loadPageContent(),dynamicGrids(),dynamicProjectsResources(),dynamicDetail()]);track('page_view');});
})();
