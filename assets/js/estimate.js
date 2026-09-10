
document.addEventListener('DOMContentLoaded',()=>{
  const money=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});
  const q=(id)=>document.getElementById(id);
  const price=()=>{const unit=parseFloat(q('unit-price').value)||0,qty=parseFloat(q('qty').value)||0,gst=parseFloat(q('gst').value)||0;const sub=unit*qty,tax=sub*gst/100,total=sub+tax;q('price-result').innerHTML=`<div class="quick-row"><span>Subtotal</span><span>${money(sub)}</span></div><div class="quick-row"><span>GST (${gst}%)</span><span>${money(tax)}</span></div><div class="quick-row"><span>Indicative Total</span><span>${money(total)}</span></div><p class="small">Use this only when a unit rate has been provided or published. Final quotation prevails.</p>`};
  ['unit-price','qty','gst'].forEach(id=>q(id)?.addEventListener('input',price));price();
  const weight=()=>{const L=parseFloat(q('len').value)||0,W=parseFloat(q('wid').value)||0,T=parseFloat(q('thk').value)||0,Q=parseFloat(q('sheet-qty').value)||0,D=parseFloat(q('density').value)||7.93;const kg=L*W*T*D/1000000*Q;q('weight-result').innerHTML=`<strong>${kg.toFixed(3)} kg</strong><p class="small">Approximate theoretical weight for the entered dimensions and density.</p>`};
  ['len','wid','thk','sheet-qty','density'].forEach(id=>q(id)?.addEventListener('input',weight));weight();
  const resin=()=>{const vol=parseFloat(q('volume').value)||0,d=parseFloat(q('resin-density').value)||1.1,waste=parseFloat(q('waste').value)||10,qty=parseFloat(q('print-qty').value)||1;const grams=vol*d*(1+waste/100)*qty;q('resin-result').innerHTML=`<strong>${grams.toFixed(1)} g estimated material</strong><p class="small">Planning estimate only. Supports, hollowing, orientation and process losses affect actual consumption.</p>`};
  ['volume','resin-density','waste','print-qty'].forEach(id=>q(id)?.addEventListener('input',resin));resin();
});

;(()=>{let t;document.addEventListener('input',e=>{if(!e.target.closest('.calc'))return;clearTimeout(t);t=setTimeout(()=>window.CGPublic?.track('estimate_used',{metadata:{calculator:e.target.closest('.calc')?.querySelector('h3')?.textContent||'estimate'}}),1200);});})();

;document.addEventListener('DOMContentLoaded',async()=>{
  const B=window.CGBackend,ps=document.getElementById('est-product'),vs=document.getElementById('est-variant'),qty=document.getElementById('est-product-qty'),out=document.getElementById('product-estimate-result');
  if(!B||!ps||!vs||!qty||!out)return;
  let products=[],variants=[];
  const money=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});
  const render=()=>{
    const p=products.find(x=>x.id===ps.value),v=variants.find(x=>x.id===vs.value),q=Math.max(1,Number(qty.value||1));
    if(!p){out.textContent='Select a product to begin.';return}
    const rate=v?.public_price??p.public_price,gst=Number(v?.gst_pct??p.gst_pct??18),moq=Number(v?.moq??p.moq??1);
    if(rate==null){out.innerHTML='<strong>Formal quotation required</strong><p class="small">No universal public price is configured for this product/variant. Share model, part details and quantity for a formal quote.</p>';return}
    if(q<moq){out.innerHTML=`<strong>MOQ: ${moq}</strong><p class="small">Increase quantity to the configured minimum order quantity.</p>`;return}
    const sub=Number(rate)*q,tax=sub*gst/100,total=sub+tax;
    out.innerHTML=`<div class="quick-row"><span>Reference unit rate</span><span>${money(rate)}</span></div><div class="quick-row"><span>Quantity</span><span>${q}</span></div><div class="quick-row"><span>Subtotal</span><span>${money(sub)}</span></div><div class="quick-row"><span>GST (${gst}%)</span><span>${money(tax)}</span></div><div class="quick-row"><span>Indicative total</span><span>${money(total)}</span></div><p class="small">Indicative website estimate only. Final technical compatibility and formal quotation prevail.</p>`;
  };
  try{
    products=await B.select('products','select=id,slug,name,public_price,price_mode,gst_pct,moq&published=eq.true&order=sort_order.asc,name.asc');
    ps.innerHTML='<option value="">Select product…</option>'+products.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
  }catch(e){ps.innerHTML='<option value="">Product list unavailable</option>';out.textContent='Online product estimate is temporarily unavailable.'}
  ps.addEventListener('change',async()=>{variants=[];vs.innerHTML='<option value="">Base product / no variant</option>';if(ps.value){try{variants=await B.select('product_variants',`select=id,variant_name,public_price,gst_pct,moq&product_id=eq.${encodeURIComponent(ps.value)}&published=eq.true&order=sort_order.asc,variant_name.asc`);vs.innerHTML+=[...variants].map(v=>`<option value="${v.id}">${v.variant_name}</option>`).join('')}catch{}}render();window.CGPublic?.track('estimate_used',{metadata:{calculator:'product estimate',product_id:ps.value}})});
  vs.addEventListener('change',render);qty.addEventListener('input',render);
});
