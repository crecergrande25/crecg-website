
const cfg=window.CRECG_CONFIG||{};const K={pass:'crecergrande_v9_admin_hash',session:'crecergrande_v9_admin_session'};let catalog=null,currentId=null;
async function sha(s){if(crypto&&crypto.subtle){const b=new TextEncoder().encode(s);const h=await crypto.subtle.digest('SHA-256',b);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return 'local-'+(h>>>0).toString(16)}
async function init(){
 document.getElementById('admin-logo').src='../assets/images/crecer-grande-logo.png';
 const saved=localStorage.getItem(K.pass);document.getElementById(saved?'login-setup':'first-setup').classList.remove('hide');
 if(sessionStorage.getItem(K.session)==='1')showDashboard();
 document.getElementById('setup-form')?.addEventListener('submit',async e=>{e.preventDefault();const p=e.target.pass.value;if(p.length<8)return alert('Use at least 8 characters.');localStorage.setItem(K.pass,await sha(p));sessionStorage.setItem(K.session,'1');showDashboard()});
 document.getElementById('login-form')?.addEventListener('submit',async e=>{e.preventDefault();if(await sha(e.target.pass.value)!==localStorage.getItem(K.pass))return alert('Incorrect passphrase.');sessionStorage.setItem(K.session,'1');showDashboard()});
 document.getElementById('logout')?.addEventListener('click',()=>{sessionStorage.removeItem(K.session);location.reload()});
}
async function showDashboard(){document.getElementById('auth-screen').classList.add('hide');document.getElementById('dashboard').classList.remove('hide');catalog=await CRECG_CATALOG.get();bindNav();renderAll();}
function bindNav(){document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('hide',p.id!==`tab-${b.dataset.tab}`));}));
 document.getElementById('add-product').onclick=()=>openEditor();document.getElementById('export-catalog').onclick=exportCatalog;document.getElementById('import-catalog').onchange=importCatalog;document.getElementById('reset-catalog').onclick=resetCatalog;document.getElementById('product-form').onsubmit=saveProduct;document.getElementById('add-variant').onclick=()=>addVariantRow();document.getElementById('modal-close').onclick=closeEditor;document.getElementById('save-settings').onclick=saveSettings;document.getElementById('reset-settings').onclick=()=>{localStorage.removeItem(cfg.settingsStorageKey);location.reload()};}
function renderAll(){renderStats();renderProducts();renderEnquiries();renderSettings();}
function renderStats(){const p=catalog.products||[],e=getEnquiries();document.getElementById('stats').innerHTML=`<div class="stat"><span>Total products</span><b>${p.length}</b></div><div class="stat"><span>Published</span><b>${p.filter(x=>x.published!==false).length}</b></div><div class="stat"><span>Priced variants</span><b>${p.flatMap(x=>x.variants||[]).filter(v=>v.price!=null).length}</b></div><div class="stat"><span>Local enquiries</span><b>${e.length}</b></div>`}
function renderProducts(){const tbody=document.getElementById('product-rows');tbody.innerHTML=(catalog.products||[]).map(p=>`<tr><td><b>${esc(p.title)}</b><br><span class="muted">${esc(p.id)}</span></td><td>${esc(p.category)}</td><td>${(p.variants||[]).length}</td><td>${p.published!==false?'<span class="status ok">Published</span>':'<span class="status warn">Hidden</span>'}</td><td><button class="btn btn-sm btn-light" onclick="editProduct('${p.id}')">Edit</button> <button class="btn btn-sm btn-light" onclick="togglePublish('${p.id}')">${p.published!==false?'Hide':'Publish'}</button> <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p.id}')">Delete</button></td></tr>`).join('')}
function esc(s){return CRECG_UTIL.escape(s)}
function openEditor(p=null){currentId=p?.id||null;document.getElementById('editor-title').textContent=p?'Edit Product':'Add Product';const f=document.getElementById('product-form');f.reset();f.id.value=p?.id||'';f.title.value=p?.title||'';f.category.value=p?.category||'';f.summary.value=p?.summary||'';f.description.value=p?.description||'';f.image.value=p?.image||'assets/images/products-overview.webp';f.tags.value=(p?.tags||[]).join(', ');f.specs.value=Object.entries(p?.specs||{}).map(([k,v])=>`${k}: ${v}`).join('\n');f.compatibility.value=(p?.compatibility||[]).join('\n');f.published.checked=p?p.published!==false:true;f.featured.checked=!!p?.featured;document.getElementById('variant-editor').innerHTML='';(p?.variants||[{id:'default',name:'Default',sku:'',unit:'pc',price:null,gst:18,minQty:1}]).forEach(addVariantRow);document.getElementById('product-modal').classList.add('open')}
function closeEditor(){document.getElementById('product-modal').classList.remove('open')}
function addVariantRow(v={}){const d=document.createElement('div');d.className='variant-row';d.innerHTML=`<div class="field"><label>Name</label><input class="input v-name" value="${esc(v.name||'')}"></div><div class="field"><label>SKU</label><input class="input v-sku" value="${esc(v.sku||'')}"></div><div class="field"><label>Unit</label><input class="input v-unit" value="${esc(v.unit||'pc')}"></div><div class="field"><label>Price ₹</label><input class="input v-price" type="number" step="0.01" value="${v.price??''}"></div><div class="field"><label>GST %</label><input class="input v-gst" type="number" value="${v.gst??18}"></div><div class="field"><label>Min Qty</label><input class="input v-min" type="number" min="1" value="${v.minQty??1}"></div><button type="button" class="btn btn-danger btn-sm remove-var">Remove</button>`;d.querySelector('.remove-var').onclick=()=>d.remove();document.getElementById('variant-editor').appendChild(d)}
function collectVariants(){return [...document.querySelectorAll('#variant-editor .variant-row')].map((r,i)=>{const name=r.querySelector('.v-name').value.trim();const price=r.querySelector('.v-price').value;return{id:(name||'variant-'+i).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),name,sku:r.querySelector('.v-sku').value.trim(),unit:r.querySelector('.v-unit').value.trim()||'pc',price:price===''?null:Number(price),gst:Number(r.querySelector('.v-gst').value||18),minQty:Number(r.querySelector('.v-min').value||1)}})}
function saveProduct(e){
 e.preventDefault();
 const f=e.target;
 const id=f.id.value.trim()||f.title.value.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 if(!id)return alert('Enter a title.');
 const old=catalog.products.find(x=>x.id===currentId)||{};
 const variants=collectVariants();
 const specs=Object.fromEntries(
  f.specs.value.split('\n').map(x=>x.trim()).filter(Boolean).map(line=>{
   const i=line.indexOf(':');
   return i>0?[line.slice(0,i).trim(),line.slice(i+1).trim()]:[line,''];
  })
 );
 const compatibility=f.compatibility.value.split('\n').map(x=>x.trim()).filter(Boolean);
 const p={...old,id,title:f.title.value.trim(),category:f.category.value.trim(),summary:f.summary.value.trim(),description:f.description.value.trim(),image:f.image.value.trim()||'assets/images/products-overview.webp',tags:f.tags.value.split(',').map(x=>x.trim()).filter(Boolean),specs,compatibility,published:f.published.checked,featured:f.featured.checked,variants,calculator:{...(old.calculator||{}),enabled:variants.some(v=>v.price!=null),mode:variants.some(v=>v.price!=null)?'variant-price':'quote'}};
 if(currentId&&currentId!==id)catalog.products=catalog.products.filter(x=>x.id!==currentId);
 const idx=catalog.products.findIndex(x=>x.id===id);
 if(idx>=0)catalog.products[idx]=p;else catalog.products.unshift(p);
 persist();closeEditor();renderAll();
}
window.editProduct=id=>openEditor(catalog.products.find(x=>x.id===id));window.togglePublish=id=>{const p=catalog.products.find(x=>x.id===id);p.published=!(p.published!==false);persist();renderAll()};window.deleteProduct=id=>{if(confirm('Delete this product from the local catalog draft?')){catalog.products=catalog.products.filter(x=>x.id!==id);persist();renderAll()}};
function persist(){catalog.updated=new Date().toISOString();CRECG_CATALOG.saveLocal(catalog)}
function exportCatalog(){const b=new Blob([JSON.stringify(catalog,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='catalog.json';a.click();URL.revokeObjectURL(a.href)}
function importCatalog(e){const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result);if(!Array.isArray(j.products))throw new Error();catalog=j;persist();renderAll();alert('Catalog imported into this browser draft.')}catch(err){alert('Invalid catalog JSON.')}};r.readAsText(file)}
function resetCatalog(){if(!confirm('Reset local edits and return to packaged catalog?'))return;localStorage.removeItem(cfg.catalogStorageKey);catalog=window.CRECG_DEFAULT_CATALOG;renderAll()}
function getEnquiries(){try{return JSON.parse(localStorage.getItem(cfg.enquiryStorageKey)||'[]')}catch(e){return[]}}
function renderEnquiries(){const e=getEnquiries();document.getElementById('enquiry-rows').innerHTML=e.length?e.map(x=>`<tr><td>${new Date(x.createdAt).toLocaleString()}</td><td>${esc(x.name||'')}</td><td>${esc(x.company||'')}</td><td>${esc(x.product||x.type||'')}</td><td>${esc(x.phone||'')}</td></tr>`).join(''):'<tr><td colspan="5">No browser-local enquiries yet.</td></tr>'}
function renderSettings(){let s={};try{s=JSON.parse(localStorage.getItem(cfg.settingsStorageKey)||'{}')}catch(e){};const f=document.getElementById('settings-form');f.brand.value=s.brand||cfg.brand;f.phone.value=s.phone||cfg.phone;f.email.value=s.email||cfg.email;f.instagramHandle.value=s.instagramHandle||cfg.instagramHandle;f.instagram.value=s.instagram||cfg.instagram;}
function saveSettings(){const f=document.getElementById('settings-form');const s={brand:f.brand.value.trim(),phone:f.phone.value.trim(),email:f.email.value.trim(),instagramHandle:f.instagramHandle.value.trim(),instagram:f.instagram.value.trim()};localStorage.setItem(cfg.settingsStorageKey,JSON.stringify(s));alert('Saved for this browser. Refresh public pages in the same browser to view the draft changes.')}
init();
