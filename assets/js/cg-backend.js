(() => {
  'use strict';
  const cfg = window.CG_SUPABASE_CONFIG || {};
  const SESSION_KEY = 'cg-v193-auth-session';
  let refreshInFlight = null;

  class CGError extends Error {
    constructor(message, status=0, details=null){ super(message); this.name='CGError'; this.status=status; this.details=details; }
  }
  const nowSec = () => Math.floor(Date.now()/1000);
  const parseJSON = text => { try { return text ? JSON.parse(text) : null; } catch { return text; } };
  function getSession(){ try { return JSON.parse(localStorage.getItem(SESSION_KEY)||'null'); } catch { return null; } }
  function saveSession(s){
    if(!s){ localStorage.removeItem(SESSION_KEY); return; }
    const next = {...s};
    if(next.expires_in && !next.expires_at) next.expires_at = nowSec()+Number(next.expires_in)-10;
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  }
  function clearSession(){ localStorage.removeItem(SESSION_KEY); }

  async function raw(path,{method='GET',body=null,auth=false,headers={},prefer=null,contentType='application/json'}={}){
    if(!cfg.url || !cfg.publishableKey) throw new CGError('Website backend is not configured.');
    const h = {'apikey': cfg.publishableKey, ...headers};
    if(contentType) h['Content-Type'] = contentType;
    if(prefer) h['Prefer'] = prefer;
    if(auth){
      const token = await getAccessToken();
      if(!token) throw new CGError('Authentication required.',401);
      h['Authorization'] = `Bearer ${token}`;
    }
    const opt={method,headers:h,cache:'no-store'};
    if(body !== null) opt.body = (contentType==='application/json' && typeof body!=='string') ? JSON.stringify(body) : body;
    const res=await fetch(cfg.url+path,opt);
    const text=await res.text();
    const data=parseJSON(text);
    if(!res.ok){
      const msg=(data && (data.message||data.msg||data.error_description||data.error)) || text || `Request failed (${res.status})`;
      throw new CGError(msg,res.status,data);
    }
    return data;
  }

  async function refreshSession(){
    if(refreshInFlight) return refreshInFlight;
    refreshInFlight=(async()=>{
      const s=getSession();
      if(!s?.refresh_token) return null;
      try{
        const data=await raw('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:s.refresh_token}});
        saveSession(data); return data;
      }catch(e){ clearSession(); return null; }
      finally{ refreshInFlight=null; }
    })();
    return refreshInFlight;
  }
  async function getAccessToken(){
    let s=getSession();
    if(!s) return null;
    if(!s.expires_at || Number(s.expires_at) <= nowSec()+60) s=await refreshSession();
    return s?.access_token || null;
  }
  async function signIn(loginSlug,password){
    const slug=String(loginSlug||'').trim().toLowerCase();
    if(!/^[a-z0-9._-]+$/.test(slug)) throw new CGError('Invalid account selection.');
    const email=`${slug}@${cfg.authDomain}`;
    const data=await raw('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
    saveSession(data);
    const profile=await currentProfile();
    if(!profile?.is_active){ await signOut(); throw new CGError('This account is disabled.',403); }
    try{ await rpc('log_admin_event',{p_action:'LOGIN',p_module:'auth',p_record_id:profile.user_id,p_record_label:profile.display_name,p_metadata:{version:cfg.version}},true); }catch{}
    return {session:data,profile};
  }
  async function signOut(){
    try{
      const p=await currentProfile();
      if(p) await rpc('log_admin_event',{p_action:'LOGOUT',p_module:'auth',p_record_id:p.user_id,p_record_label:p.display_name,p_metadata:{}},true);
    }catch{}
    try{ if(await getAccessToken()) await raw('/auth/v1/logout',{method:'POST',auth:true}); }catch{}
    clearSession();
  }
  async function currentUser(){ try{return await raw('/auth/v1/user',{auth:true});}catch{return null;} }
  async function currentProfile(){
    const user=await currentUser(); if(!user?.id) return null;
    const rows=await select('user_profiles',`select=*&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,true);
    return rows?.[0]||null;
  }
  async function updatePassword(password){
    if(String(password||'').length<10) throw new CGError('Use at least 10 characters for the new password.');
    await raw('/auth/v1/user',{method:'PUT',body:{password},auth:true});
    await rpc('complete_password_change',{},true);
    try{ await rpc('log_admin_event',{p_action:'PASSWORD_CHANGE',p_module:'auth',p_record_id:null,p_record_label:null,p_metadata:{}},true); }catch{}
    return true;
  }
  async function select(table,query='',auth=false){ return raw(`/rest/v1/${table}${query?'?'+query:''}`,{auth}); }
  async function insert(table,row,auth=true){ return raw(`/rest/v1/${table}`,{method:'POST',body:row,auth,prefer:'return=representation'}); }
  async function update(table,query,row,auth=true){ return raw(`/rest/v1/${table}?${query}`,{method:'PATCH',body:row,auth,prefer:'return=representation'}); }
  async function remove(table,query,auth=true){ return raw(`/rest/v1/${table}?${query}`,{method:'DELETE',auth,prefer:'return=representation'}); }
  async function rpc(name,params={},auth=false){ return raw(`/rest/v1/rpc/${name}`,{method:'POST',body:params,auth}); }
  async function invoke(name,body={}){
    const result=await raw(`/functions/v1/${name}`,{method:'POST',body,auth:true});
    if(result && result.ok===false) throw new CGError(result.error||'Function request failed.',400,result);
    if(result && result.ok===true && Object.prototype.hasOwnProperty.call(result,'data')) return result.data;
    return result;
  }
  async function upload(file,folder='media'){
    if(!file) throw new CGError('Choose a file first.');
    const safe=(file.name||'file').replace(/[^a-zA-Z0-9._-]+/g,'-');
    const path=`${folder}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safe}`;
    const token=await getAccessToken(); if(!token) throw new CGError('Authentication required.',401);
    const segments=path.split('/').map(encodeURIComponent).join('/');
    const res=await fetch(`${cfg.url}/storage/v1/object/${encodeURIComponent(cfg.storageBucket)}/${segments}`,{
      method:'POST',headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${token}`,'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file
    });
    const text=await res.text(); const data=parseJSON(text);
    if(!res.ok) throw new CGError((data&&data.message)||text||'Upload failed',res.status,data);
    return `${cfg.url}/storage/v1/object/public/${cfg.storageBucket}/${segments}`;
  }
  window.CGBackend={cfg,CGError,getSession,getAccessToken,refreshSession,signIn,signOut,currentUser,currentProfile,updatePassword,select,insert,update,remove,rpc,invoke,upload,clearSession};
})();
