document.addEventListener('DOMContentLoaded',()=>{
  const btn=document.querySelector('.menu-btn'),nav=document.querySelector('.nav');
  if(btn&&nav){btn.addEventListener('click',()=>{const open=nav.classList.toggle('open');btn.setAttribute('aria-expanded',String(open));});}
  let search=document.querySelector('#product-search');
  let filterBtns=[...document.querySelectorAll('[data-filter]')];
  let current='all';
  const bindCatalog=()=>{
    search=document.querySelector('#product-search');filterBtns=[...document.querySelectorAll('[data-filter]')];
    const apply=()=>{const cards=[...document.querySelectorAll('.catalog-card')],q=(search?.value||'').toLowerCase().trim();cards.forEach(c=>{const cat=(c.dataset.category||'').toLowerCase(),text=c.textContent.toLowerCase();c.style.display=((current==='all'||cat===current)&&(q===''||text.includes(q)))?'flex':'none';});};
    filterBtns.forEach(b=>{if(b.dataset.cgBound)return;b.dataset.cgBound='1';b.addEventListener('click',()=>{filterBtns.forEach(x=>x.classList.remove('active'));b.classList.add('active');current=b.dataset.filter;apply();});});
    if(search&&!search.dataset.cgBound){search.dataset.cgBound='1';search.addEventListener('input',apply);}apply();
  };
  bindCatalog();window.addEventListener('cg-catalog-updated',bindCatalog);
  const form=document.querySelector('#rfq-form');
  if(form){
    const build=()=>{const f=new FormData(form),v=n=>(f.get(n)||'').toString().trim(),cn=window.CGSiteSettings?.company_name||'Crecer Grande';return `Hello ${cn},\n\nI have an enquiry.\n\nName: ${v('name')}\nCompany: ${v('company')}\nPhone: ${v('phone')}\nEmail: ${v('email')}\nRequirement Type: ${v('type')}\nMachine / Model: ${v('machine')}\nPart No.: ${v('part')}\nQuantity: ${v('qty')}\n\nRequirement:\n${v('message')}\n\nI can share drawings/photos separately.`};
    document.querySelector('#send-wa')?.addEventListener('click',async()=>{await window.CGPublic?.submitRfq(form,'whatsapp');window.open('https://wa.me/'+((window.CGSiteSettings?.whatsapp||'917003301781').replace(/\D/g,''))+'?text='+encodeURIComponent(build()),'_blank','noopener')});
    document.querySelector('#send-mail')?.addEventListener('click',async()=>{await window.CGPublic?.submitRfq(form,'email');location.href='mailto:'+(window.CGSiteSettings?.email_primary||'crecergrande@outlook.com')+'?subject='+encodeURIComponent('Crecer Grande Website Enquiry')+'&body='+encodeURIComponent(build())});
  }
});
