
document.addEventListener('DOMContentLoaded',()=>{
  const btn=document.querySelector('.menu-btn'),nav=document.querySelector('.nav');
  if(btn&&nav){btn.addEventListener('click',()=>{const open=nav.classList.toggle('open');btn.setAttribute('aria-expanded',String(open));});}
  const search=document.querySelector('#product-search');
  const filterBtns=[...document.querySelectorAll('[data-filter]')];
  const cards=[...document.querySelectorAll('.catalog-card')];
  let current='all';
  const apply=()=>{const q=(search?.value||'').toLowerCase().trim();cards.forEach(c=>{const cat=(c.dataset.category||'').toLowerCase();const text=c.textContent.toLowerCase();c.style.display=((current==='all'||cat===current)&&(q===''||text.includes(q)))?'flex':'none';});};
  filterBtns.forEach(b=>b.addEventListener('click',()=>{filterBtns.forEach(x=>x.classList.remove('active'));b.classList.add('active');current=b.dataset.filter;apply();}));
  search?.addEventListener('input',apply);
  const form=document.querySelector('#rfq-form');
  if(form){
    const build=()=>{const f=new FormData(form);const v=n=>(f.get(n)||'').toString().trim();return `Hello Crecer Grande,\n\nI have an enquiry.\n\nName: ${v('name')}\nCompany: ${v('company')}\nPhone: ${v('phone')}\nEmail: ${v('email')}\nRequirement Type: ${v('type')}\nMachine / Model: ${v('machine')}\nPart No.: ${v('part')}\nQuantity: ${v('qty')}\n\nRequirement:\n${v('message')}\n\nI can share drawings/photos separately.`};
    document.querySelector('#send-wa')?.addEventListener('click',()=>window.open('https://wa.me/916291001781?text='+encodeURIComponent(build()),'_blank','noopener'));
    document.querySelector('#send-mail')?.addEventListener('click',()=>location.href='mailto:crecergrande@outlook.com?subject='+encodeURIComponent('Crecer Grande Website Enquiry')+'&body='+encodeURIComponent(build()));
  }
});
