(function(){
'use strict';
function setupNav(){const btn=document.querySelector('.menu-btn'),nav=document.querySelector('.nav');if(btn&&nav){btn.addEventListener('click',()=>{const open=nav.classList.toggle('open');btn.setAttribute('aria-expanded',String(open));});}}
function setupCatalog(){
 const search=document.querySelector('#product-search');let current='all';
 const bind=()=>{const btns=[...document.querySelectorAll('[data-filter]')];btns.forEach(b=>{b.onclick=()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');current=b.dataset.filter;apply();};});};
 const apply=()=>{const q=(search?.value||'').toLowerCase().trim();document.querySelectorAll('.catalog-card').forEach(c=>{const cat=(c.dataset.category||'').toLowerCase();const text=c.textContent.toLowerCase();c.style.display=((current==='all'||cat===current)&&(q===''||text.includes(q)))?'flex':'none';});};
 bind();search?.addEventListener('input',apply);window.addEventListener('cg:catalog-rendered',()=>{current='all';bind();apply();});
}
function setupRFQ(){
 const form=document.querySelector('#rfq-form');if(!form)return;
 const values=()=>{const f=new FormData(form),v=n=>(f.get(n)||'').toString().trim();return {name:v('name'),company:v('company'),phone:v('phone'),email:v('email'),type:v('type'),machine:v('machine'),part:v('part'),qty:v('qty'),message:v('message')};};
 const build=()=>{const x=values();return `Hello Crecer Grande,\n\nI have an enquiry.\n\nName: ${x.name}\nCompany: ${x.company}\nPhone: ${x.phone}\nEmail: ${x.email}\nRequirement Type: ${x.type}\nMachine / Model: ${x.machine}\nPart No.: ${x.part}\nQuantity: ${x.qty}\n\nRequirement:\n${x.message}\n\nI can share drawings/photos separately.`};
 document.querySelector('#send-wa')?.addEventListener('click',()=>{const s=window.CGCMS?.state?.settings;const d=String(s?.whatsapp||'7003301781').replace(/\D/g,'');window.open('https://wa.me/'+(d.length===10?'91'+d:d)+'?text='+encodeURIComponent(build()),'_blank','noopener');});
 document.querySelector('#send-mail')?.addEventListener('click',()=>{const s=window.CGCMS?.state?.settings;location.href='mailto:'+(s?.email_primary||'crecergrande@outlook.com')+'?subject='+encodeURIComponent('Crecer Grande Website Enquiry')+'&body='+encodeURIComponent(build());});
 document.querySelector('#submit-online')?.addEventListener('click',async()=>{const st=document.querySelector('#rfq-status'),x=values();if(!x.name||!x.phone||!x.message){if(st)st.textContent='Please complete Name, Phone and Requirement.';return;}if(!window.CGBackend?.enabled()){if(st)st.textContent='Online submission is not connected yet. Please use WhatsApp or Email.';return;}try{if(st)st.textContent='Submitting…';await window.CGCMS.submitEnquiry(x);if(st)st.textContent='Enquiry submitted successfully. We will review it.';form.reset();}catch(e){if(st)st.textContent='Could not submit online: '+e.message;}});
}
document.addEventListener('DOMContentLoaded',()=>{setupNav();setupCatalog();setupRFQ();});
})();
