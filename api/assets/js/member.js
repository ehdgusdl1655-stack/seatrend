
(function(){
  const API = 'https://sea-trend.com';
  const Q = (s, d=document)=> d.querySelector(s);
  const grid = ()=> Q('#grid');
  const fmt = (n)=> (n===undefined||n===null||n==='')?'-':Number(n).toLocaleString();

  async function getJSON(url){
    try{ const r=await fetch(url,{cache:'no-store'}); if(!r.ok) return null; return await r.json(); }catch(e){ return null; }
  }
  async function loadProducts(){
    let data = await getJSON(API + '/api/products?ts='+Date.now());
    if(!data || !Array.isArray(data.products)){ data = await getJSON('/api/products?ts='+Date.now()); }
    return (data && Array.isArray(data.products)) ? data.products : [];
  }

  function tagChips(tags){
    if(!tags) return '';
    return tags.split(',').map(t=>t.trim()).filter(Boolean).map(t=>`<span class="tag">${t}</span>`).join('');
  }
  function priceButtons(p){
    const arr=[];
    if(p.coupang_url){ arr.push(`<a class="btn" target="_blank" rel="noopener" href="${p.coupang_url}">쿠팡${p.coupang_price? ' '+fmt(p.coupang_price)+'원':''}</a>`); }
    if(p.naver_url){ arr.push(`<a class="btn" target="_blank" rel="noopener" href="${p.naver_url}">네이버${p.naver_price? ' '+fmt(p.naver_price)+'원':''}</a>`); }
    if(p.other_url){ arr.push(`<a class="btn" target="_blank" rel="noopener" href="${p.other_url}">${p.other_label||'타사'}${p.other_price? ' '+fmt(p.other_price)+'원':''}</a>`); }
    return arr.join('');
  }

  function openDetail(p){
    Q('#d_img').src = p.image_url||''; Q('#d_img').alt = p.name||'';
    Q('#d_name').textContent = p.name||'';
    Q('#d_tags').innerHTML = tagChips(p.tags||'');
    Q('#d_cur').textContent = (p.currency||'KRW').toUpperCase();
    Q('#d_amt').textContent = fmt(p.local_price);
    Q('#d_meta').textContent = [p.country||'', p.category||''].filter(Boolean).join(' · ');
    Q('#d_desc').textContent = p.desc||'';
    Q('#d_links').innerHTML = priceButtons(p);
    Q('#detailModal').classList.add('modal','show');
    document.body.style.overflow='hidden';
  }
  function closeDetail(){ Q('#detailModal').classList.remove('show'); document.body.style.overflow=''; }
  document.addEventListener('click',(e)=>{ if(e.target.matches('[data-close]') || e.target.closest('[data-close]')) closeDetail(); });

  function render(list){
    const g=grid(); g.innerHTML='';
    Q('#notice').textContent = `총 ${list.length}개 상품`;
    const sorted = list.slice().sort((a,b)=>(a.rank||999)-(b.rank||999));
    sorted.forEach(p=>{
      const card=document.createElement('article');
      card.className='card product';
      card.innerHTML = `
        <div class="thumb"><img loading="lazy" decoding="async" src="${p.image_url||''}" alt="${p.name||''}"></div>
        <div class="title">${p.name||''}</div>
        <div class="small">${p.category? '· '+p.category:''} ${p.tags? tagChips(p.tags):''}</div>
        <div class="local-price">
          <span class="cur">${(p.currency||'KRW').toUpperCase()}</span>
          <span class="amt">${fmt(p.local_price)}</span>
        </div>
        <div class="price-buttons">${priceButtons(p)}</div>
        <div><a href="#" class="badge" data-detail>제품 상세 설명</a></div>
      `;
      card.querySelector('[data-detail]').addEventListener('click',(e)=>{ e.preventDefault(); openDetail(p); });
      g.appendChild(card);
    });
    if(!sorted.length){
      const div=document.createElement('div'); div.className='muted'; div.style.margin='12px 2px'; div.textContent='등록된 상품이 없습니다.'; g.appendChild(div);
    }
  }

  async function boot(){
    const products = await loadProducts();
    render(products);
    // settings (inquiry button)
    const set = await getJSON(API + '/api/settings') || await getJSON('/api/settings');
    const inquiry = set && set.inquiry ? set.inquiry : null;
    const btn = Q('#inquiryBtn');
    if(btn && inquiry){
      if(inquiry.show===false) btn.style.display='none';
      if(inquiry.url) btn.href=inquiry.url;
      if(inquiry.label) btn.textContent=inquiry.label;
    }
  }
  window.addEventListener('DOMContentLoaded', boot);
})();