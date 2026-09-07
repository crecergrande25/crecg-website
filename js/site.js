
document.addEventListener('DOMContentLoaded',()=>{
 const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('.nav');
 if(menu&&nav)menu.addEventListener('click',()=>nav.classList.toggle('open'));
 document.querySelectorAll('.filter-btn').forEach(btn=>btn.addEventListener('click',()=>{
   document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
   const f=btn.dataset.filter;document.querySelectorAll('[data-category]').forEach(card=>{card.style.display=(f==='all'||card.dataset.category===f)?'flex':'none';});
 }));
 const params=new URLSearchParams(location.search);const type=params.get('type');if(type){const s=document.querySelector('[name="type"]');if(s){[...s.options].forEach(o=>{if(o.value.toLowerCase()===type.toLowerCase()||o.text.toLowerCase().includes(type.toLowerCase()))s.value=o.value;});}}
 const form=document.getElementById('rfq-form');
 if(form){
   const build=()=>{const f=new FormData(form),v=n=>(f.get(n)||'').toString().trim();return `Hello CRECG,\n\nI have an enquiry.\n\nName: ${v('name')}\nCompany: ${v('company')}\nPhone: ${v('phone')}\nEmail: ${v('email')}\nRequirement Type: ${v('type')}\nMachine / Model: ${v('machine')}\nPart No. / Head Model: ${v('part')}\nLaser Power / Capacity: ${v('power')}\nQuantity: ${v('qty')}\n\nRequirement:\n${v('message')}\n\nI can share drawings/photos separately.`};
   document.getElementById('send-wa')?.addEventListener('click',e=>{e.preventDefault();window.open('https://wa.me/917003301781?text='+encodeURIComponent(build()),'_blank','noopener');});
   document.getElementById('send-mail')?.addEventListener('click',e=>{e.preventDefault();window.location.href='mailto:crecergrande@outlook.com?subject='+encodeURIComponent('CRECG Website Enquiry')+'&body='+encodeURIComponent(build());});
 }
});
