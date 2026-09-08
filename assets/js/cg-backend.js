(function(){
  'use strict';
  const cfg = window.CG_BACKEND || {};
  const SESSION_KEY = 'cg_admin_session_v193';
  function enabled(){ return !!(cfg.enabled && cfg.url && cfg.publishableKey); }
  function baseHeaders(token){
    const h = {'apikey': cfg.publishableKey, 'Content-Type':'application/json'};
    if(token) h.Authorization = 'Bearer ' + token;
    return h;
  }
  async function parseResponse(r){
    const t = await r.text();
    let data = null;
    if(t){ try{ data = JSON.parse(t); } catch{ data = t; } }
    if(!r.ok){
      const msg = (data && (data.message||data.msg||data.error_description||data.error)) || (typeof data==='string'?data:'Request failed');
      const e = new Error(msg); e.status=r.status; e.detail=data; throw e;
    }
    return data;
  }
  async function publicRequest(path, opts={}){
    if(!enabled()) throw new Error('Backend is not configured.');
    const r = await fetch(cfg.url.replace(/\/$/,'') + path, {
      ...opts,
      headers:{...baseHeaders(opts.token), ...(opts.headers||{})}
    });
    return parseResponse(r);
  }
  function getStoredSession(){
    try{ return JSON.parse(localStorage.getItem(SESSION_KEY)||'null'); }catch{return null;}
  }
  function setStoredSession(s){ if(s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); }
  function tokenExpired(s){
    if(!s || !s.access_token) return true;
    if(!s.expires_at) return false;
    return Date.now()/1000 > Number(s.expires_at)-30;
  }
  async function refreshSession(){
    const s=getStoredSession();
    if(!s?.refresh_token) return null;
    try{
      const data=await publicRequest('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:s.refresh_token})});
      if(data?.access_token){
        data.expires_at = data.expires_at || Math.floor(Date.now()/1000)+(data.expires_in||3600);
        setStoredSession(data); return data;
      }
    }catch(e){ setStoredSession(null); }
    return null;
  }
  async function session(){
    let s=getStoredSession();
    if(tokenExpired(s)) s=await refreshSession();
    return s;
  }
  async function signIn(email,password){
    const data=await publicRequest('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
    if(data?.access_token){
      data.expires_at=data.expires_at||Math.floor(Date.now()/1000)+(data.expires_in||3600);
      setStoredSession(data);
    }
    return data;
  }
  async function signOut(){
    const s=await session();
    if(s?.access_token){ try{ await publicRequest('/auth/v1/logout',{method:'POST',token:s.access_token}); }catch{} }
    setStoredSession(null);
  }
  async function changePassword(password){
    const s=await session(); if(!s) throw new Error('Not signed in.');
    return publicRequest('/auth/v1/user',{method:'PUT',token:s.access_token,body:JSON.stringify({password})});
  }
  function encodeQuery(params={}){
    const q=new URLSearchParams();
    for(const [k,v] of Object.entries(params)){
      if(v===undefined||v===null||v==='') continue;
      if(Array.isArray(v)) q.set(k,v.join(',')); else q.set(k,String(v));
    }
    const s=q.toString(); return s?'?'+s:'';
  }
  async function select(table, params={}, authenticated=false){
    const s=authenticated?await session():null;
    return publicRequest('/rest/v1/'+table+encodeQuery(params),{method:'GET',token:s?.access_token,headers:{Accept:'application/json'}});
  }
  async function insert(table, rows, authenticated=true, onConflict=''){
    const s=authenticated?await session():null;
    const qs=onConflict?'?on_conflict='+encodeURIComponent(onConflict):'';
    return publicRequest('/rest/v1/'+table+qs,{method:'POST',token:s?.access_token,body:JSON.stringify(Array.isArray(rows)?rows:[rows]),headers:{Prefer:'return=representation'+(onConflict?',resolution=merge-duplicates':'')}});
  }
  async function update(table, values, filter, authenticated=true){
    const s=authenticated?await session():null;
    return publicRequest('/rest/v1/'+table+'?'+filter,{method:'PATCH',token:s?.access_token,body:JSON.stringify(values),headers:{Prefer:'return=representation'}});
  }
  async function remove(table, filter, authenticated=true){
    const s=authenticated?await session():null;
    return publicRequest('/rest/v1/'+table+'?'+filter,{method:'DELETE',token:s?.access_token,headers:{Prefer:'return=representation'}});
  }
  async function rpc(name,args={}){
    const s=await session(); if(!s) throw new Error('Not signed in.');
    return publicRequest('/rest/v1/rpc/'+name,{method:'POST',token:s.access_token,body:JSON.stringify(args)});
  }
  async function uploadMedia(file, path){
    const s=await session(); if(!s) throw new Error('Not signed in.');
    if(file.size>10*1024*1024) throw new Error('File exceeds 10 MB.');
    const allowed=['image/png','image/jpeg','image/webp','image/gif','application/pdf'];
    if(file.type && !allowed.includes(file.type)) throw new Error('Unsupported file type.');
    const clean=path.replace(/^\/+/, '').replace(/[^A-Za-z0-9._\/-]+/g,'-');
    const r=await fetch(cfg.url.replace(/\/$/,'')+'/storage/v1/object/website-media/'+encodeURI(clean),{
      method:'POST',body:file,
      headers:{'apikey':cfg.publishableKey,'Authorization':'Bearer '+s.access_token,'Content-Type':file.type||'application/octet-stream','x-upsert':'true'}
    });
    await parseResponse(r);
    return cfg.url.replace(/\/$/,'')+'/storage/v1/object/public/website-media/'+clean.split('/').map(encodeURIComponent).join('/');
  }

  async function deleteMedia(path){
    const s=await session(); if(!s) throw new Error('Not signed in.');
    const clean=String(path||'').replace(/^\/+/, '').replace(/[^A-Za-z0-9._\/-]+/g,'-');
    if(!clean) throw new Error('Invalid media path.');
    const r=await fetch(cfg.url.replace(/\/$/,'')+'/storage/v1/object/website-media/'+clean.split('/').map(encodeURIComponent).join('/'),{
      method:'DELETE',
      headers:{'apikey':cfg.publishableKey,'Authorization':'Bearer '+s.access_token}
    });
    return parseResponse(r);
  }

  window.CGBackend={config:cfg,enabled,publicRequest,session,signIn,signOut,changePassword,select,insert,update,remove,rpc,uploadMedia,deleteMedia,getStoredSession};
})();
