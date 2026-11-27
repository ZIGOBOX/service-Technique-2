/* V147.192 — données métier locales, synchronisation explicite et à l'ouverture. */
(() => {
'use strict';
let durable=null, diskQueue=Promise.resolve(), generation=0, syncRunning=false, errorKind='', diskError='', ready=false;
const copy=x=>x===undefined?undefined:deepClone(x);
const same=(a,b)=>eq(a,b);
const account=()=>String(currentUser?.id||'');
function openDisk(){return new Promise((resolve,reject)=>{const r=indexedDB.open('pst-local-sync-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('accounts');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function diskRead(){const d=await openDisk();try{return await new Promise((resolve,reject)=>{const r=d.transaction('accounts').objectStore('accounts').get(account());r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);});}finally{d.close();}}
function diskWrite(state){const id=account();const snapshot=copy(state);diskQueue=diskQueue.catch(()=>{}).then(async()=>{const d=await openDisk();try{await new Promise((resolve,reject)=>{const t=d.transaction('accounts','readwrite');t.objectStore('accounts').put(snapshot,id);t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});diskError='';}finally{d.close();}}).catch(e=>{diskError='Stockage IndexedDB : '+(e?.message||e);refreshDashboardSyncIndicator();throw e;});return diskQueue;}
function persist(dirty=localDirty){if(!account())return Promise.resolve(false);const state={userId:account(),data:copy(db),base:copy(lastCloudData),stamp:lastCloudUpdatedAt,confirmed:lastConfirmedSupabaseAt,dirty,kind:errorKind,error:lastCloudError,savedAt:new Date().toISOString()};durable=state;return diskWrite(state).then(()=>true).catch(()=>false);}
function localSave(reason='Modification locale'){
 if(!account()||!ready)return false;
 generation++;localDirty=true;lastLocalMutationAt=Date.now();
 // Compatibilité avec l'ancien stockage : IndexedDB est la source durable principale.
 const item={userId:account(),savedAt:new Date().toISOString(),baseCloudUpdatedAt:lastCloudUpdatedAt,baseData:lastCloudData,reason,data:db};
 const fallback=writeJson(OFFLINE_CACHE_KEY,item);writeJson(OFFLINE_MIRROR_KEY,{userId:account(),savedAt:item.savedAt,data:db});
 persist(true).then(ok=>{if(!ok&&!fallback)setSaveState('ÉCHEC stockage local — exportez vos données','error');});
 setSaveState('Modifications locales — synchronisation en attente','local');return true;
}
writeOfflinePending=localSave;
writeMirror=()=>{if(!account()||!ready)return false;persist();return writeJson(OFFLINE_MIRROR_KEY,{userId:account(),savedAt:new Date().toISOString(),data:db});};
readOfflinePending=()=>localDirty&&durable?{userId:account(),data:durable.data,baseData:durable.base,savedAt:durable.savedAt,baseCloudUpdatedAt:durable.stamp}:null;
pendingSyncDiagnostics=()=>({dirty:localDirty,pending:localDirty,queueCount:Math.max(pstPendingMutationCount(),localDirty?1:0),pendingSavedAt:Date.parse(durable?.savedAt||'')||0,confirmedAt:lastConfirmedSupabaseAt,cloudBusy:syncRunning,dashboardBusy:syncRunning});
hasLocalSyncPending=()=>localDirty;
function identify(e){const m=[e?.message,e?.details,e?.hint,e?.code,e?.status,String(e)].join(' ');return /quota|egress|bandwidth|exceed|payment required|\b402\b|usage limit/i.test(m)?'quota':!navigator.onLine?'offline':'server';}
refreshDashboardSyncIndicator=()=>{
 const last=lastConfirmedSupabaseAt?'Dernière synchronisation : '+new Date(lastConfirmedSupabaseAt).toLocaleString('fr-FR')+'. ':'Aucune synchronisation confirmée. ';
 const pending=localDirty?'Modifications locales à envoyer. ':'Aucun envoi local en attente. ';
 if(diskError){setDashboardSyncIndicator('red','Stockage local à vérifier',diskError+' — exportez une sauvegarde. '+last);return;}
 if(syncRunning){setDashboardSyncIndicator('orange','Synchronisation en cours',last);return;}
 if(errorKind==='quota'){setDashboardSyncIndicator('red','Quota Supabase dépassé',pending+'Travail local disponible. '+last);return;}
 if(!navigator.onLine){setDashboardSyncIndicator('red','Hors connexion',pending+last);return;}
 if(errorKind==='server'){setDashboardSyncIndicator('red','Supabase indisponible',pending+last+(lastCloudError||''));return;}
 if(localDirty){setDashboardSyncIndicator('orange','Modifications en attente',pending+last);return;}
 setDashboardSyncIndicator(lastConfirmedSupabaseAt?'green':'orange',lastConfirmedSupabaseAt?'Dernière synchronisation réussie':'Mode local — serveur non vérifié',last+'Actualisation à l’ouverture ou sur demande.');
};
// Three-way merge: distinct edits combine; conflicting edits require a choice.
function merge(b,l,r,path='Données'){
 if(same(l,b))return copy(r);if(same(r,b)||same(l,r))return copy(l);
 if(Array.isArray(l)&&Array.isArray(r)&&[...l,...r,...(Array.isArray(b)?b:[])].every(x=>x&&typeof x==='object'&&x.id!=null)){
  const maps=[b||[],l,r].map(a=>new Map((Array.isArray(a)?a:[]).map(x=>[String(x.id),x])));const out=[];
  for(const k of new Set([...maps[2].keys(),...maps[1].keys(),...maps[0].keys()])){const x=merge(maps[0].get(k),maps[1].get(k),maps[2].get(k),path+' / '+k);if(x!==undefined)out.push(x);}return out;
 }
 if(isObj(l)&&isObj(r)&&(b===undefined||isObj(b))){const out={};for(const k of new Set([...Object.keys(b||{}),...Object.keys(l),...Object.keys(r)])){if(['__proto__','constructor','prototype'].includes(k))continue;const v=merge(b?.[k],l[k],r[k],path+' / '+k);if(v!==undefined)out[k]=v;}return out;}
 if(/\/_?\s*(?:_pstVersion|_pstUpdatedAt|_pstDeviceId|_pstSource|updatedAt)$/.test(path.replace(/ /g,'')))return copy(l);
 const fmt=x=>x===undefined?'(supprimé)':JSON.stringify(x).slice(0,500);
 const answer=prompt('Conflit : '+path+'\n\n1 — Cet appareil : '+fmt(l)+'\n\n2 — Serveur : '+fmt(r)+'\n\nSaisissez 1 ou 2. Annuler conserve les deux versions sans envoi.','');
 if(answer!=='1'&&answer!=='2')throw new Error('Conflit non résolu : synchronisation annulée.');return copy(answer==='1'?l:r);
}
async function synchronize(){
 if(!account()||!ready||syncRunning||!supabaseClient)return false;
 if(!navigator.onLine){refreshDashboardSyncIndicator();return false;}
 syncRunning=true;cloudBusy=true;cloudBusySince=Date.now();refreshDashboardSyncIndicator();
 try{
  const start=copy(db),base=copy(lastCloudData),rev=generation,wasDirty=localDirty;
  if(wasDirty&&!await persist(true)&&!readJson(OFFLINE_CACHE_KEY))throw new Error('Sauvegarde locale impossible : envoi annulé.');
  const stampRow=await fetchRemoteStamp();let remoteRow=null;
  if(!base||stampRow?.updated_at!==lastCloudUpdatedAt)remoteRow=await fetchRemote();
  else remoteRow={data:base,updated_at:lastCloudUpdatedAt};
  const remote=remoteRow?.data?migrate(copy(remoteRow.data)):null;
  let merged;
  if(wasDirty){if(remote&&!base)throw new Error('Base commune absente : exportez les données locales avant de résoudre cette ancienne sauvegarde.');merged=remote?merge(base,start,remote):start;}
  else merged=remote||start;
  const changed=!remote||!same(merged,remote);
  let stamp=remoteRow?.updated_at||'';
  if(changed){const next=new Date(Math.max(Date.now(),(Date.parse(stamp)||0)+1)).toISOString();let query;
   if(stamp)query=supabaseClient.from('app_state').update({data:merged,updated_at:next}).eq('user_id',account()).eq('updated_at',stamp).select('updated_at');
   else query=supabaseClient.from('app_state').insert({user_id:account(),data:merged,updated_at:next}).select('updated_at');
   const res=await withTimeout(query,18000);if(res.error)throw res.error;if(res.data?.length!==1)throw new Error('Le serveur a changé entre-temps. Relancez la synchronisation.');stamp=res.data[0].updated_at||next;
  }
  // Edits made during the network request remain pending and are rebased.
  const concurrent=generation!==rev||!same(db,start);const current=copy(db);
  lastCloudData=copy(merged);lastCloudUpdatedAt=stamp;lastConfirmedSupabaseAt=Date.now();errorKind='';lastCloudError='';cloudReady=true;
  if(concurrent){try{db=merge(start,current,merged);}catch(e){db=current;lastCloudData=base;lastCloudUpdatedAt='';throw e;}localDirty=true;}else{db=merged;localDirty=false;}
  if(!await persist(localDirty))throw new Error('Confirmation serveur reçue, mais sauvegarde locale impossible.');
  if(!localDirty){clearOfflinePending();pstSaveSyncQueue([]);}else localSave('Modifications pendant la synchronisation');
  writeJson(OFFLINE_MIRROR_KEY,{userId:account(),savedAt:new Date().toISOString(),data:db});
  safeRenderAll();window.dispatchEvent(new Event('pst:data-loaded'));
  setSaveState(localDirty?'Nouvelles modifications en attente':'Synchronisation réussie',localDirty?'local':'cloud');return true;
 }catch(e){lastCloudError=e?.message||String(e);errorKind=identify(e);await persist(localDirty);setSaveState('Synchronisation non confirmée — données locales conservées','local');return false;}
 finally{syncRunning=false;cloudBusy=false;cloudBusySince=0;refreshDashboardSyncIndicator();}
}
// All ordinary form saves remain local, even when online.
async function localResult(label='Données',verify){if(typeof verify==='function'&&!verify(db))return {ok:false,error:'Contrôle local échoué'};const ok=localSave(label);const written=ok&&await persist(true);const fallback=readJson(OFFLINE_CACHE_KEY);return {ok:!!(written||(ok&&fallback?.userId===account()&&same(fallback.data,db))),offline:true,pending:true};}
save=(render=true)=>{clearTheoreticalScheduleCache();const ok=localSave();if(render)safeRenderAll();return ok;};
cloudSaveNow=async()=>{const r=await localResult();return r.ok;};
window.PSTMainState.persistNow=()=>localResult();
window.PSTMainState.persistStateDirect=({label='Données',verify}={})=>localResult(label,verify);
window.PSTMainState.persistChronotimeDirect=id=>localResult('Chronotime',d=>(d.pdfImports||[]).some(x=>String(x.id)===String(id)));
window.PSTMainState.verifyChronotimeImport=async id=>({ok:true,offline:true,found:(db.pdfImports||[]).some(x=>String(x.id)===String(id))});
pstSyncQueueNow=async()=>{const r=await localResult();return {...r,pending:pstPendingMutationCount()||1};};window.PSTSyncEngine.sync=pstSyncQueueNow;
persistAgentPlanningBackground=async()=>localResult('Planning agent');
startCloudPolling=()=>clearInterval(cloudPollTimer);scheduleCloudRetry=()=>clearTimeout(cloudRetryTimer);autoSyncWhenNetworkReturns=()=>refreshDashboardSyncIndicator();pollCloudChanges=async()=>false;syncOfflinePending=synchronize;cloudLoad=synchronize;
manualSupabasePing=async()=>{const ok=await synchronize();toast(ok?'Synchronisation réussie':'Synchronisation indisponible');return ok;};
dashboardSyncNow=async()=>{const btn=$('#dashboardSyncNow');if(syncRunning)return;if(btn)btn.disabled=true;try{await synchronize();}finally{if(btn)btn.disabled=false;}};
enterApp=async user=>{
 currentUser=user;ready=false;let existing=null;try{existing=await diskRead();}catch(e){diskError='Stockage IndexedDB indisponible';}
 const old=readJson(OFFLINE_CACHE_KEY),mirror=readJson(OFFLINE_MIRROR_KEY);const own=x=>x?.userId===account();
 if(own(old)&&old.data&&(!existing||Date.parse(old.savedAt)>Date.parse(existing.savedAt||'')))existing={data:old.data,base:old.baseData,stamp:old.baseCloudUpdatedAt,dirty:true,savedAt:old.savedAt};
 if(!existing&&own(mirror)&&mirror.data)existing={data:mirror.data,base:mirror.data,stamp:'',dirty:pstPendingMutationCount()>0};
 if(existing){db=migrate(copy(existing.data));lastCloudData=existing.base?migrate(copy(existing.base)):null;lastCloudUpdatedAt=existing.stamp||'';lastConfirmedSupabaseAt=existing.confirmed||0;localDirty=!!existing.dirty;errorKind=existing.kind||'';lastCloudError=existing.error||'';durable=existing;}
 else {db=defaultData();lastCloudData=null;lastCloudUpdatedAt='';localDirty=false;errorKind='';lastCloudError='';}
 ready=true;$('#authScreen').classList.add('hidden');$('#logoutBtn')?.classList.remove('hidden');safeRenderAll();window.dispatchEvent(new Event('pst:data-loaded'));refreshDashboardSyncIndicator();
 await synchronize();
};
// Export a recovery copy, including the baseline needed for a subsequent merge.
window.addEventListener('DOMContentLoaded',()=>{const syncBtn=$('#dashboardSyncNow');if(syncBtn)syncBtn.onclick=dashboardSyncNow;const pingBtn=$('#supabasePingBtn');if(pingBtn)pingBtn.onclick=manualSupabasePing;const b=document.createElement('button');b.type='button';b.className='ghost';b.textContent='Exporter une sauvegarde locale';b.onclick=()=>{if(!account())return;triggerDownloadBlob('Pilotage_sauvegarde_locale_'+new Date().toISOString().slice(0,10)+'.json',new Blob([JSON.stringify({data:db,base:lastCloudData,stamp:lastCloudUpdatedAt,dirty:localDirty},null,2)],{type:'application/json'}));};$('#dashboardSyncPanel')?.append(b);});
})();
