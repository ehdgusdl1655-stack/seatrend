export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if(req.method==='OPTIONS'){ return res.status(200).json({ok:true}); }

  // Always respond with JSON; never leave the response empty
  try{
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO = process.env.REPO || "ehdgusdl1655-stack/seatrend";
    const FILE_PATH = process.env.FILE_PATH || "products.json";
    const API = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;

    // Helper to read current products from GitHub
    async function readProducts(){
      const r = await fetch(API, { headers: GITHUB_TOKEN ? { Authorization:`token ${GITHUB_TOKEN}` } : {} });
      if(!r.ok){
        return { products: [], ok:false, status:r.status, error:`GitHub read failed (${r.status})` };
      }
      const cur = await r.json();
      const raw = Buffer.from(cur.content||"", "base64").toString("utf8") || "[]";
      let arr=[]; try{ arr = JSON.parse(raw); }catch{ arr=[]; }
      return { products: Array.isArray(arr)?arr:[], ok:true, sha: cur.sha||null };
    }

    if(req.method === "GET"){
      const data = await readProducts();
      // Even on failure, return a JSON object (no empty body)
      return res.status(200).json(data);
    }

    if(req.method === "POST"){
      const body = await (async()=>{
        try{ return req.body && Object.keys(req.body).length ? req.body : await new Promise((resolve)=>{
          let buf=""; req.on('data',chunk=>buf+=chunk); req.on('end',()=>{
            try{ resolve(JSON.parse(buf||"{}")); }catch{ resolve({}); }
          });
        }); }catch{ return {}; }
      })();

      const { products } = body || {};
      if(!GITHUB_TOKEN){
        // Still acknowledge with JSON to avoid blank page
        return res.status(200).json({ ok:false, error:"Missing GITHUB_TOKEN", products: Array.isArray(products)?products:[] });
      }

      // Read current sha (create or update)
      const probe = await fetch(API, { headers:{ Authorization:`token ${GITHUB_TOKEN}` } });
      let sha=null;
      if(probe.ok){
        const cur=await probe.json();
        sha = cur.sha || null;
      }

      const payload = {
        message:'Update products.json via SEATREND admin',
        content: Buffer.from(JSON.stringify(products||[], null, 2)).toString("base64")
      };
      if(sha){ payload.sha = sha; }

      const putRes = await fetch(API, {
        method:'PUT',
        headers:{ Authorization:`token ${GITHUB_TOKEN}`, 'Content-Type':'application/json' },
        body: JSON.stringify(payload)
      });

      if(!putRes.ok){
        const t=await putRes.text();
        return res.status(200).json({ ok:false, error:t || `GitHub PUT failed (${putRes.status})` });
      }
      const upd = await putRes.json();
      return res.status(200).json({ ok:true, success:true, update: upd });
    }

    res.setHeader('Allow','GET, POST');
    return res.status(200).json({ ok:false, error:'Method not allowed' });
  }catch(e){
    // Last-resort JSON response
    return res.status(200).json({ ok:false, error: e?.message || 'Unhandled error', products: [] });
  }
}
