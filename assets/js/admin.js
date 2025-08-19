
(function(){
  const KEY='seatrend_products_v2';
  const Q=(s,d=document)=>d.querySelector(s);
  const toast=(msg)=>{ const t=Q('#toast'); if(!t) return; t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 1400); };
  const fmt=(n)=> (n===undefined||n===null||n==='')?'-':Number(n).toLocaleString();

  function read(){ try{ return JSON.parse(localStorage.getItem(KEY)||'[]'); }catch(e){ return []; } }
  function write(arr){ localStorage.setItem(KEY, JSON.stringify(arr)); }

  function formToObj(){
    return {
      rank: Number(Q('#rank').value||0),
      name: Q('#name').value.trim(),
      image_url: Q('#image_url').value.trim(),
      local_price: Number(Q('#local_price').value||0),
      currency: Q('#currency').value.trim(),
      krw_price: Number(Q('#krw_price')?.value||0) || '',
      category: Q('#category')?.value.trim() || '',
      country: Q('#country')?.value.trim() || '',
      tags: Q('#tags')?.value.trim() || '',
      desc: Q('#desc')?.value.trim() || '',
      product_url: Q('#product_url')?.value.trim() || '',
      coupang_price: Number(Q('#coupang_price')?.value||0) || '',
      coupang_url: Q('#coupang_url')?.value.trim() || '',
      naver_price: Number(Q('#naver_price')?.value||0) || '',
      naver_url: Q('#naver_url')?.value.trim() || '',
      other_label: Q('#other_label')?.value.trim() || '',
      other_price: Number(Q('#other_price')?.value||0) || '',
      other_url: Q('#other_url')?.value.trim() || '',
    };
  }
  function fillForm(p){
    ['rank','name','image_url','local_price','currency','category','country','tags','desc','product_url','coupang_price','coupang_url','naver_price','naver_url','other_label','other_price','other_url'].concat(['krw_price'])
    .forEach(id=>{ if(Q('#'+id)) Q('#'+id).value = (p[id]!==undefined&&p[id]!==null)? p[id] : ''; });
  }
  function clearForm(){ Q('#form').reset(); }

  // ---- Reliable server commit queue (from previous build) ----
  let __commitLock = false;
  let __pending = null;

  async function refreshFromServer(){
    try{
      const r = await fetch('https://sea-trend.com/api/products', { cache:'no-store' });
      const o = await r.json();
      if(o && Array.isArray(o.products)){
        write(o.products); render();
      }
    }catch(e){ /* ignore */ }
  }

  async function commitProducts(products){
    __pending = products;
    if(__commitLock) return;
    __commitLock = true;
    try{
      while(__pending){
        const snap = __pending; __pending = null;
        const r = await fetch('https://sea-trend.com/api/products', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ products: snap }) });
        const o = await r.json().catch(()=>({}));
        if(!(r.ok && (o.success || o.ok))){
          throw new Error((o && (o.error||o.message)) || ('HTTP '+r.status));
        }
        await refreshFromServer();
        try{ const bc = new BroadcastChannel('seatrend_sync'); bc.postMessage({type:'products_updated', ts: Date.now()}); }catch(e){}
      }
    }catch(err){
      toast('서버 반영 실패'); console.log(err);
    }finally{
      __commitLock = false;
    }
  }

  function render(){
    const list = read().slice().sort((a,b)=> (a.rank||999)-(b.rank||999));
    const tb=Q('#table tbody'); tb.innerHTML='';
    list.forEach((p,i)=>{
      const tr=document.createElement('tr');
      tr.innerHTML = `<td>${p.rank||''}</td><td>${p.name||''}</td><td>${fmt(p.local_price)}</td><td>${p.currency||''}</td>
        <td><button class="btn" data-edit="${i}">수정</button> <button class="btn" data-del="${i}">삭제</button></td>`;
      tb.appendChild(tr);
    });
    tb.querySelectorAll('[data-edit]').forEach(b=> b.addEventListener('click', (e)=>{
      const idx=Number(e.currentTarget.getAttribute('data-edit'));
      const p=read()[idx]; if(p) fillForm(p);
      window.scrollTo({ top: 0, behavior:'smooth' });
    }));
    tb.querySelectorAll('[data-del]').forEach(b=> b.addEventListener('click', (e)=>{
      const idx=Number(e.currentTarget.getAttribute('data-del'));
      const arr=read(); arr.splice(idx,1); write(arr); render(); toast('삭제 완료'); commitProducts(arr);
    }));
  }

  Q('#form').addEventListener('submit', (e)=>{
    e.preventDefault();
    const p=formToObj();
    if(!p.name || !p.image_url || !p.local_price || !p.currency){ toast('필수값을 입력하세요'); return; }
    const arr=read();
    const existIdx = arr.findIndex(x=> x.name===p.name && x.image_url===p.image_url);
    if(existIdx>=0){ arr[existIdx]=p; write(arr); render(); toast('수정 완료'); commitProducts(arr); }
    else { arr.push(p); write(arr); render(); toast('등록 완료'); commitProducts(arr); }
  });
  Q('#resetBtn').addEventListener('click', ()=>{ clearForm(); });

  window.addEventListener('DOMContentLoaded', ()=>{ render(); refreshFromServer(); });
})();