
(function(){
  const KEY='seatrend_products_v2';
  const API_ABS = 'https://sea-trend.com';
  const Q=(s,d=document)=>d.querySelector(s);
  const fmt=(n)=> (n===undefined||n===null||n==='')?'-':Number(n).toLocaleString();
  const state={ list:[], settings:null };

  async function tryFetch(url){
    try{
      const r = await fetch(url, { cache:'no-store' });
      if(!r.ok) return null;
      const d = await r.json().catch(()=>null);
      return d;
    }catch(e){ return null; }
  }

  async function loadProducts(){
    // 1) absolute server
    let d = await tryFetch(API_ABS + '/api/products');
    if(d && Array.isArray(d.products) && d.products.length){ state.list = d.products; localStorage.setItem(KEY, JSON.stringify(state.list)); return; }
    // 2) same-origin relative (in case we're on sea-trend.com already)
    d = await tryFetch('/api/products');
    if(d && Array.isArray(d.products) && d.products.length){ state.list = d.products; localStorage.setItem(KEY, JSON.stringify(state.list)); return; }
    // 3) localStorage
    try{
      const raw = localStorage.getItem(KEY);
      if(raw){ const arr = JSON.parse(raw); if(Array.isArray(arr) && arr.length){ state.list = arr; return; } }
    }catch(e){}
    // 4) embedded
    try{
      const el = Q('#PRODUCTS_EMBED');
      if(el && el.textContent.trim()){ const arr = JSON.parse(el.textContent); if(Array.isArray(arr) && arr.length){ state.list = arr; return; } }
    }catch(e){}
    // nothing found → keep empty
    state.list = [];
  }

  async function loadSettings(){
    let d = await tryFetch(API_ABS + '/api/settings');
    if(!(d && d.inquiry)){ d = await tryFetch('/api/settings'); }
    state.settings = d || null;
  }

  function applySettings(){
    const s = state.settings || {};
    const btn = Q('#inquiryBtn');
    if(!btn) return;
    if(s.inquiry && s.inquiry.show===false){ btn.style.display='none'; }
    if(s.inquiry && s.inquiry.url){ btn.href = s.inquiry.url; }
    if(s.inquiry && s.inquiry.label){ btn.textContent = s.inquiry.label; }
  }

  function openDetail(p){
    const body=Q('#detailBody');
    const goto = p.product_url || p.coupang_url || p.naver_url || p.other_url || '';
    body.innerHTML = `
      <div class="detail-grid">
        <div class="thumb" style="height:260px"><img src="${p.image_url||''}" alt="${p.name||''}"/></div>
        <div>
          <div class="title" style="font-size:20px">${p.name||''}</div>
          <div class="muted">${p.country||''} · ${p.category||''}</div>
          <div class="local-row">
            <div class="local-label">현지 판매가</div>
            <div class="local-price pro"><span class="cur">${(p.currency||'KRW').toUpperCase()}</span><span class="amount">${fmt(p.local_price)}</span> ${p.krw_price? `<span class="krw">· ₩${fmt(p.krw_price)}</span>`:""}</div>
          </div>
          <div class="labels">
            ${p.tags? p.tags.split(',').map(t=>`<span class="tag">${t.trim()}</span>`).join(''): ''}
          </div>
        </div>
      </div>
      <div class="detail-section">
        <h3 class="detail-title">상세 설명</h3>
        <div class="muted" style="white-space:pre-line">${p.desc||'상세 설명이 없습니다.'}</div>
      </div>
      <div class="detail-section">
        <h3 class="detail-title">가격 & 바로가기</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px">
          ${p.coupang_url? `<a class="badge link" href="${p.coupang_url}" target="_blank">쿠팡 ${p.coupang_price?fmt(p.coupang_price)+'원':''}</a>`:''}
          ${p.naver_url? `<a class="badge link" href="${p.naver_url}" target="_blank">네이버 ${p.naver_price?fmt(p.naver_price)+'원':''}</a>`:''}
          ${p.other_url? `<a class="badge link" href="${p.other_url}" target="_blank">${p.other_label||'타사'} ${p.other_price?fmt(p.other_price)+'원':''}</a>`:''}
          ${goto? `<a class="btn" target="_blank" href="${goto}">바로가기</a>`:''}
        </div>
        <div class="disclosure">* 일부 링크는 파트너스 링크일 수 있으며, 이를 통해 구매 시 SEATREND가 일정 수수료를 받을 수 있습니다.</div>
      </div>`;
    Q('#detailModal').classList.add('show');
    document.body.style.overflow='hidden';
  }
  function closeDetail(){ Q('#detailModal').classList.remove('show'); document.body.style.overflow=''; }
  window.ST = { openDetail, closeDetail };

  function render(){
    const grid=Q('#grid'); if(!grid) return;
    grid.innerHTML='';
    \1.filter(passCategory);
    const notice=Q('#notice'); if(notice) notice.textContent = `총 ${list.length}개 상품`;
    if(!list.length){
      // show friendly empty state instead of blank page
      const div=document.createElement('div');
      div.className='muted'; div.style.margin='8px 2px';
      div.textContent='등록된 상품이 없습니다.';
      grid.parentElement && grid.parentElement.insertBefore(div, grid.nextSibling);
      return;
    }
    list.forEach(p=>{
      const card=document.createElement('article'); card.className='card product';
      card.innerHTML = `
        <div class="thumb"><img src="${p.image_url||''}" alt="${p.name||''}"></div>
        <div class="title">${p.name||''}</div>
        <div class="muted">· ${p.category||''}</div>
        <div class="local-row"><div class="local-label">현지 판매가</div>
          <div class="local-price pro"><span class="cur">${(p.currency||'KRW').toUpperCase()}</span><span class="amount">${fmt(p.local_price)}</span> ${p.krw_price? `<span class="krw">· ₩${fmt(p.krw_price)}</span>`:""}</div>
        </div>
        <div class="labels">
          ${p.tags? p.tags.split(',').map(t=>`<span class="tag">${t.trim()}</span>`).join(''): ''}
        </div>
        <div class="row"><a href="#" class="badge link detail">제품 상세 설명</a></div>`;
      card.querySelector('.detail').addEventListener('click', (e)=>{ e.preventDefault(); openDetail(p); });
      grid.appendChild(card);
    });
  }

  async function boot(){
    await loadProducts();
    await loadSettings();
    applySettings();
    buildCategoryFilter(state.list);
    render();
  }

  window.addEventListener('DOMContentLoaded', async ()=>{
    await boot();
    // if still empty after 1s, try again (covers CDN/edge latency)
    setTimeout(()=>{ if(!state.list || !state.list.length){ boot(); } }, 1000);
  });

  // live sync from admin
  try{
    const bc = new BroadcastChannel('seatrend_sync');
    bc.onmessage = (msg)=>{ if(msg && msg.data && msg.data.type==='products_updated'){ boot(); } };
  }catch(e){}
  document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible'){ boot(); }});
})();

  function uniq(arr){ return Array.from(new Set(arr.filter(Boolean))); }
  function buildCategoryFilter(list){
    const el = document.querySelector('#flt_category'); const bar = document.querySelector('#catBar');
    if(!el || !bar) return;
    const cats = uniq((list||[]).map(p=>p.category));
    if(!cats.length){ bar.style.display='none'; return; }
    el.innerHTML = '<option value="">전체</option>' + cats.map(c=>`<option>${c}</option>`).join('');
    bar.style.display='block';
    el.addEventListener('change', render);
  }
  function passCategory(p){
    const el = document.querySelector('#flt_category'); if(!el) return true;
    const v = el.value||''; if(!v) return true;
    return (p.category||'')===v;
  }

  function uniq(arr){ return Array.from(new Set(arr.filter(Boolean))); }
  function buildFilters(list){
    const elC = document.querySelector('#flt_category');
    const elN = document.querySelector('#flt_country');
    const bar = document.querySelector('#catBar');
    if(!bar) return;
    const cats = uniq((list||[]).map(p=>p.category));
    const countries = uniq((list||[]).map(p=>p.country));
    if(elC){ elC.innerHTML = '<option value="">전체</option>' + cats.map(c=>`<option>${c}</option>`).join(''); }
    if(elN){ elN.innerHTML = '<option value="">전체</option>' + countries.map(c=>`<option>${c}</option>`).join(''); }
    bar.style.display='block';
    ['flt_category','flt_country','flt_tags','flt_name'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.addEventListener('input', render);
      if(el && el.tagName==='SELECT') el.addEventListener('change', render);
    });
  }
  function passFilters(p){
    const cat = (document.getElementById('flt_category')?.value||'').trim();
    const cty = (document.getElementById('flt_country')?.value||'').trim();
    const tag = (document.getElementById('flt_tags')?.value||'').trim().toLowerCase();
    const nam = (document.getElementById('flt_name')?.value||'').trim().toLowerCase();
    if(cat && (p.category||'')!==cat) return false;
    if(cty && (p.country||'')!==cty) return false;
    if(tag && !(p.tags||'').toLowerCase().includes(tag)) return false;
    if(nam){
      const target = ((p.name||'') + ' ' + (p.desc||'')).toLowerCase();
      if(!target.includes(nam)) return false;
    }
    return true;
  }
  async function copyText(t){
    try{ await navigator.clipboard.writeText(String(t)); toast('복사되었습니다'); }catch(e){ alert('복사 실패'); }
  }
