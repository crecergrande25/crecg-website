(function(){
 const cfg=window.CRECG_CONFIG||{};
 const settingsKey=cfg.settingsStorageKey||'crecergrande_v9_site_settings';
 let override={};try{override=JSON.parse(localStorage.getItem(settingsKey)||'{}')}catch(e){}
 const S=Object.assign({},cfg,override); window.CRECG_SITE=S;
 const page=(document.body.dataset.page||'').trim();
 const header=document.getElementById('site-header'),footer=document.getElementById('site-footer');
 const nav=[['home','index.html','Home'],['about','about.html','About'],['divisions','divisions.html','Divisions'],['products','products.html','Products'],['estimate','estimate.html','Estimate'],['projects','projects.html','Projects'],['contact','contact.html','Contact']];
 if(header){
  header.innerHTML=`<div class="topbar"><div class="container"><div class="topbar-left"><span>GSTIN: ${S.gstin}</span><span>Udyam: ${S.udyam}</span><span>West Bengal, India</span></div><div class="topbar-right"><span>Proudly Indian <img class="flag" src="assets/images/india-flag.svg" alt="India"></span><a href="${S.instagram}" target="_blank" rel="noopener">Instagram ${S.instagramHandle}</a></div></div></div><header class="site-header"><div class="container nav-wrap"><a class="brand" href="index.html" aria-label="${S.brand} home"><img src="assets/images/crecer-grande-logo.png" alt="${S.brand} logo"></a><button class="menu-toggle" aria-label="Toggle navigation">☰</button><nav class="nav">${nav.map(n=>`<a class="${page===n[0]?'active':''}" href="${n[1]}">${n[2]}</a>`).join('')}<a class="quote" href="contact.html">Request a Quote</a><a class="admin-link" href="admin/" aria-label="Admin Login">Admin Login</a></nav></div></header>`;
  header.querySelector('.menu-toggle')?.addEventListener('click',()=>header.querySelector('.nav')?.classList.toggle('open'));
 }
 if(footer){footer.innerHTML=`<section class="cta"><div class="container"><div><h2>Have an engineering or industrial requirement?</h2><p>Send a drawing, photo, part number, sample component, machine details or a simple problem statement.</p></div><a class="btn" href="contact.html">Send Requirement</a></div></section><footer class="footer"><div class="container footer-grid"><div><img class="footer-logo" src="assets/images/crecer-grande-logo.png" alt="${S.brand} logo"><p>Engineering • Manufacturing • Industrial Solutions</p><p>Proudly Indian • Built to support Indian industry.</p><p><b>GSTIN:</b> ${S.gstin}<br><b>Udyam:</b> ${S.udyam}</p></div><div><h4>Explore</h4><div class="footer-links"><a href="divisions.html">Divisions</a><a href="products.html">Products & Spares</a><a href="estimate.html">Quick Estimate</a><a href="projects.html">Capability Examples</a></div></div><div><h4>Contact</h4><p><a href="tel:+91${S.phone}">${S.phone}</a> / <a href="tel:+91${S.phoneAlt}">${S.phoneAlt}</a></p><p><a href="mailto:${S.email}">${S.email}</a></p><p>${S.address}</p><p><a href="${S.instagram}" target="_blank" rel="noopener">Instagram ${S.instagramHandle}</a></p></div><div><h4>Important</h4><div class="footer-links"><a href="privacy.html">Privacy Notice</a><a href="disclaimer.html">Service & Product Disclaimer</a><a href="admin/">Admin Login</a></div><p>Product compatibility and automated estimates remain subject to technical review and final quotation.</p></div></div><div class="container footer-bottom"><span>© 2026 ${S.brand}. All rights reserved.</span><span>crecergrande.in</span></div></footer><div class="floating"><a class="float wa" href="https://wa.me/91${S.phone}?text=${encodeURIComponent('Hello '+S.brand+', I have an industrial requirement.')}" target="_blank" rel="noopener" aria-label="WhatsApp ${S.brand}">WA</a><a class="float mail" href="mailto:${S.email}" aria-label="Email ${S.brand}">@</a></div>`}
})();

window.CRECG_CATALOG = {
 async get(){
  const cfg=window.CRECG_CONFIG||{};
  try{const raw=localStorage.getItem(cfg.catalogStorageKey);if(raw){const parsed=JSON.parse(raw);if(parsed&&Array.isArray(parsed.products)) return parsed;}}catch(e){}
  if(location.protocol!=='file:'){
   try{const r=await fetch('assets/data/catalog.json',{cache:'no-store'});if(r.ok){const j=await r.json();if(j&&Array.isArray(j.products))return j;}}catch(e){}
  }
  return window.CRECG_DEFAULT_CATALOG||{products:[]};
 },
 saveLocal(data){localStorage.setItem((window.CRECG_CONFIG||{}).catalogStorageKey,JSON.stringify(data));}
};

window.CRECG_UTIL={
 money(v){return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(v||0))},
 query(name){return new URLSearchParams(location.search).get(name)||''},
 escape(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))},
 saveEnquiry(enq){const k=(window.CRECG_CONFIG||{}).enquiryStorageKey;let a=[];try{a=JSON.parse(localStorage.getItem(k)||'[]')}catch(e){};a.unshift(enq);localStorage.setItem(k,JSON.stringify(a.slice(0,200)));}
};
