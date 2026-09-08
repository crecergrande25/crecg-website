
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
