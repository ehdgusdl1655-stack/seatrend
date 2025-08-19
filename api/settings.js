export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if(req.method==='OPTIONS'){ return res.status(200).json({ok:true}); }

  try{
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO = process.env.REPO || "ehdgusdl1655-stack/seatrend";
    const FILE_PATH = process.env.SETTINGS_PATH || "settings.json";
    const API = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;

    async function readSettings(){
      const r = await fetch(API, { headers: GITHUB_TOKEN ? { Authorization:`token ${GITHUB_TOKEN}` } : {} });
      if(!r.ok){
        return { ok:false, status:r.status, error:`GitHub read failed (${r.status})`, inquiry:{show:true,label:'문의',url:'https://open.kakao.com/o/sCgmH4Mh'} };
      }
      const cur = await r.json();
      const raw = Buffer.from(cur.content||"", "base64").toString("utf8") || "{}";
      let obj={}; try{ obj = JSON.parse(raw); }catch{ obj={}; }
      return { ok:true, data: obj, sha: cur.sha||null };
    }

    if(req.method === "GET"){
      const data = await readSettings();
      return res.status(200).json(data.ok ? data.data : { inquiry:{show:true,label:'문의',url:'https://open.kakao.com/o/sCgmH4Mh'} });
    }

    if(req.method === "POST"){
      const body = await (async()=>{
        try{ return req.body && Object.keys(req.body).length ? req.body : await new Promise((resolve)=>{
          let buf=""; req.on('data',chunk=>buf+=chunk); req.on('end',()=>{
            try{ resolve(JSON.parse(buf||"{}")); }catch{ resolve({}); }
          });
        }); }catch{ return {}; }
      })();

      if(!GITHUB_TOKEN){
        return res.status(200).json({ ok:false, error:"Missing GITHUB_TOKEN" });
      }

      // probe for sha
      const probe = await fetch(API, { headers:{ Authorization:`token ${GITHUB_TOKEN}` } });
      let sha=null;
      if(probe.ok){
        const cur=await probe.json();
        sha = cur.sha || null;
      }

      const payload = {
        message:'Update settings.json via SEATREND admin',
        content: Buffer.from(JSON.stringify(body||{}, null, 2)).toString("base64")
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
    return res.status(200).json({ ok:false, error: e?.message || 'Unhandled error' });
  }
}
