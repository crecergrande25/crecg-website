
(async()=>{
 const root=document.getElementById('catalog-root'); if(!root)return;
 const catalog=await CRECG_CATALOG.get(); const all=catalog.products.filter(p=>p.published!==false);
 const search=document.getElementById('product-search'),filters=document.getElementById('product-filters');
 const cats=['All',...Array.from(new Set(all.map(p=>p.category))).sort()]; let active='All',term='';
 filters.innerHTML=cats.map(c=>`<button class="filter-btn ${c==='All'?'active':''}" data-cat="${CRECG_UTIL.escape(c)}">${CRECG_UTIL.escape(c)}</button>`).join('');
 filters.addEventListener('click',e=>{const b=e.target.closest('button[data-cat]');if(!b)return;active=b.dataset.cat;filters.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));render();});
 search?.addEventListener('input',e=>{term=e.target.value.toLowerCase().trim();render()});
 function render(){
  const items=all.filter(p=>(active==='All'||p.category===active)&&(!term||[p.title,p.summary,p.category,...(p.tags||[])].join(' ').toLowerCase().includes(term)));
  root.innerHTML=items.length?items.map(card).join(''):'<div class="empty">No matching products. Try another search or category.</div>';
 }
 function card(p){const priced=(p.variants||[]).some(v=>Number.isFinite(Number(v.price))&&v.price!==null);return `<article class="product-card"><img loading="lazy" decoding="async" src="${p.image}" alt="${CRECG_UTIL.escape(p.title)}"><div class="body"><div class="subhead">${CRECG_UTIL.escape(p.category)}</div><h3>${CRECG_UTIL.escape(p.title)}</h3><p>${CRECG_UTIL.escape(p.summary)}</p><div class="tag-row">${(p.tags||[]).slice(0,3).map(t=>`<span class="tag">${CRECG_UTIL.escape(t)}</span>`).join('')}</div>${priced?'<div class="price-badge">Indicative estimate available</div>':'<div class="price-badge" style="color:#607087">Price on request</div>'}<div class="card-actions"><a class="btn btn-dark" href="product.html?id=${encodeURIComponent(p.id)}">View Details</a>${priced?`<a class="btn btn-light" href="estimate.html?product=${encodeURIComponent(p.id)}">Estimate</a>`:`<a class="btn btn-light" href="contact.html?product=${encodeURIComponent(p.title)}">Enquire</a>`}</div></div></article>`}
 render();
})();
