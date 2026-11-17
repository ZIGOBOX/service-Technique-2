/* Pilotage Service Technique — Google Drive : option facultative, OAuth 2.0 côté navigateur.
 * AUCUN mot de passe, client secret, access token ou refresh token n'est conservé.
 * Scope unique drive.file : accès seulement aux fichiers créés/ouverts avec cette application.
 */
(function () {
  'use strict';
  const SCOPE = 'https://www.googleapis.com/auth/drive.file';
  const API = 'https://www.googleapis.com/drive/v3/files';
  const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
  const KEY = 'pst-google-drive-config-v1';
  const ROOT = 'Pilotage Service Technique';
  const FOLDERS = {maintenance:'Maintenance',works:'Chantiers et GPA',documents:'Documentation',periodic:'Controles periodiques',notes:'Notes',meetings:'Reunions',vacations:'Vacances',requests:'Anciennes demandes',default:'Autres pieces jointes'};
  let accessToken='',expiresAt=0,tokenClient=null,folders=new Map(),pendingLogin=null;
  const qs = s => document.querySelector(s);
  const safe = value => String(value==null?'':value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const selectedAccount = () => config().email;
  const config = () => {
    try {const v=JSON.parse(localStorage.getItem(KEY)||'{}');return {clientId:String(v.clientId||'').trim(),email:String(v.email||'').trim()}}catch(_){return {clientId:'',email:''}}
  };
  const connected = () => !!(accessToken&&Date.now()<expiresAt);
  const status = (message,isError=false) => {
    const node=qs('#pstDriveStatus'); if(node){node.textContent=message;node.dataset.error=isError?'true':'false';}
  };
  const note = message => {
    if(typeof window.toast==='function')window.toast(message);
    else status(message,true);
  };
  function forgetSession(){accessToken='';expiresAt=0;folders.clear();tokenClient=null;render();}
  function saveConfig(){
    const clientId=(qs('#pstDriveClientId')?.value||'').trim();
    const email=(qs('#pstDriveEmail')?.value||'').trim();
    if(clientId&&!/^\d+-[a-z0-9-]+\.apps\.googleusercontent\.com$/i.test(clientId)){
      status('L’identifiant OAuth doit se terminer par .apps.googleusercontent.com',true);return false;
    }
    if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){status('Adresse e-mail invalide.',true);return false}
    const old=config();
    localStorage.setItem(KEY,JSON.stringify({clientId,email}));
    if(old.clientId!==clientId||old.email!==email)forgetSession();
    status('Configuration locale enregistrée. Aucune connexion Google effectuée.');
    render();return true;
  }
  function assertSession(){
    if(!navigator.onLine)throw new Error('Connexion Internet requise pour Google Drive.');
    if(!connected()){forgetSession();throw new Error('Google Drive non connecté ou session expirée. Ouvrez Paramètres → Google Drive et cliquez sur « Se connecter » avant d’enregistrer.');}
  }
  function loadIdentityLibrary(){
    if(window.google?.accounts?.oauth2?.initTokenClient)return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const found=qs('#pstGoogleIdentityScript');
      if(found){const started=Date.now();const poll=()=>{
        if(window.google?.accounts?.oauth2?.initTokenClient)return resolve();
        if(Date.now()-started>15000)return reject(new Error('Impossible de charger la connexion Google.'));
        setTimeout(poll,150);
      };return poll();}
      const s=document.createElement('script');s.id='pstGoogleIdentityScript';s.async=true;s.src='https://accounts.google.com/gsi/client';
      s.onload=()=>window.google?.accounts?.oauth2?.initTokenClient?resolve():reject(new Error('Service Google inaccessible.'));
      s.onerror=()=>reject(new Error('Connexion Google bloquée (réseau ou navigateur).'));
      document.head.append(s);
    });
  }
  // L'ouverture du pop-up doit partir d'un geste utilisateur, pas d'une synchronisation automatique.
  function connect(){
    if(!saveConfig())return;
    const {clientId,email}=config();
    if(!clientId){status('Renseignez d’abord votre ID client OAuth Google Cloud.',true);return;}
    status('Chargement de la connexion Google…');
    try{
      // IMPORTANT : ouvrir le sélecteur Google dans le même geste utilisateur.
      // Un await de chargement réseau ici ferait bloquer le pop-up sur certains mobiles.
      if(!window.google?.accounts?.oauth2?.initTokenClient){
        loadIdentityLibrary().then(()=>status('Google est prêt. Appuyez de nouveau sur « Connecter mon compte Google ».'))
          .catch(e=>status(e.message,true));
        return;
      }
      // Google gère le choix du compte et le consentement ; l'e-mail saisi n'est qu'un indice.
      tokenClient=window.google.accounts.oauth2.initTokenClient({
        client_id:clientId,scope:SCOPE,login_hint:email||undefined,
        callback:(r)=>{
          if(r.error||!r.access_token){forgetSession();status('Accès Google non autorisé : '+(r.error_description||r.error||'aucun jeton reçu'),true);return;}
          accessToken=r.access_token;
          expiresAt=Date.now()+Math.max(60,Number(r.expires_in||3500)-45)*1000;
          folders.clear();render();status('Google Drive connecté pour cette session. Fichiers privés, accessibles depuis ce compte Google.');
        },
        error_callback:e=>status('Fenêtre Google indisponible ('+(e?.type||'erreur')+'). Vérifiez les pop-ups et l’origine autorisée.',true)
      });
      tokenClient.requestAccessToken({prompt:'select_account'});
    }catch(e){status(e.message,true)}
  }
  async function apiRequest(url,options={}){
    assertSession();
    const headers=new Headers(options.headers||{});
    headers.set('Authorization','Bearer '+accessToken);
    const response=await fetch(url,{...options,headers});
    if(!response.ok){
      let explanation='';try{const o=await response.json();explanation=o?.error?.message||''}catch(_){}
      if(response.status===401){forgetSession();throw new Error('Session Google expirée. Reconnectez votre compte dans les paramètres.');}
      throw new Error('Google Drive : '+(explanation||'Erreur HTTP '+response.status));
    }
    return response;
  }
  async function queryFolder(name,parent){
    const escQuery=v=>String(v).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    const q=`name = '${escQuery(name)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and '${escQuery(parent)}' in parents`;
    const url=API+'?fields='+encodeURIComponent('files(id,name),nextPageToken')+'&pageSize=100&q='+encodeURIComponent(q);
    const result=await (await apiRequest(url)).json();
    return result.files?.[0]?.id||'';
  }
  async function folder(name,parent='root'){
    const key=parent+'|'+name;
    if(folders.has(key))return folders.get(key);
    let id=await queryFolder(name,parent);
    if(!id){
      const result=await (await apiRequest(API+'?fields=id,name',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,mimeType:'application/vnd.google-apps.folder',parents:[parent]})})).json();
      id=result.id;
    }
    if(!id)throw new Error('Impossible de créer le dossier Google Drive « '+name+' ».');
    folders.set(key,id);return id;
  }
  async function uploadOne(file,module,record){
    assertSession();
    if(!(file instanceof Blob)||!file.size)throw new Error('Fichier vide ou invalide.');
    const root=await folder(ROOT);
    const sub=await folder(FOLDERS[module]||FOLDERS.default,root);
    const mime=file.type||'application/octet-stream';
    const name=String(file.name||'Fichier').slice(0,190);
    const metadata={name,parents:[sub],description:`Pilotage Service Technique — ${module} — fiche ${record.no||record.id}`};
    let result;
    if(file.size<=5*1024*1024){
      // Envoi multipart conforme à la documentation Google Drive.
      const boundary='pst_'+Math.random().toString(36).slice(2);
      const body=new Blob([
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,JSON.stringify(metadata),
        `\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`,file,`\r\n--${boundary}--\r\n`
      ],{type:'multipart/related; boundary='+boundary});
      result=await (await apiRequest(UPLOAD+'?uploadType=multipart&fields=id,name,mimeType,webViewLink,size',{method:'POST',headers:{'Content-Type':body.type},body})).json();
    }else{
      // Envoi en deux temps pour les PDF/photos volumineux.
      const initiation=await apiRequest(UPLOAD+'?uploadType=resumable&fields=id,name,mimeType,webViewLink,size',{
        method:'POST',headers:{'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Type':mime,'X-Upload-Content-Length':String(file.size)},body:JSON.stringify(metadata)
      });
      const target=initiation.headers.get('Location');
      if(!target||!/^https:\/\/(?:[a-z0-9-]+\.)*(?:googleapis\.com|google\.com)\//i.test(target))throw new Error('URL de transfert sécurisé Google indisponible.');
      result=await (await apiRequest(target,{method:'PUT',headers:{'Content-Type':mime,'Content-Range':`bytes 0-${file.size-1}/${file.size}`},body:file})).json();
    }
    if(!result?.id)throw new Error('Google Drive n’a pas confirmé le fichier.');
    return {id:'gdrive:'+result.id,provider:'google-drive',driveId:result.id,name:result.name||name,size:file.size,type:mime,createdAt:new Date().toISOString(),recordId:record.id,module};
  }
  async function uploadBatch(files,module,record){
    const uploaded=[];
    for(const f of files){
      try{status('Envoi Google Drive : '+f.name+'…');uploaded.push(await uploadOne(f,module,record))}
      catch(e){await cleanup(uploaded);throw e;}
    }
    status(uploaded.length+' fichier(s) envoyé(s) dans Google Drive.');
    return uploaded;
  }
  async function cleanup(items){
    for(const x of items||[]){try{if(x.driveId)await apiRequest(API+'/'+encodeURIComponent(x.driveId),{method:'DELETE'});}catch(e){console.warn('Nettoyage Google Drive',e)}}
  }
  function openFile(id){
    if(!/^[A-Za-z0-9_-]{10,}$/.test(String(id||'')))return;
    window.open('https://drive.google.com/file/d/'+encodeURIComponent(id)+'/view','_blank','noopener,noreferrer');
  }
  function allReferences(){
    const db=window.PSTMainState?.get?.(); if(!db)return [];
    const groups=[['maintenance','Maintenance'],['works','Chantiers & GPA'],['documents','Documentation'],['periodic','Contrôles'],['notes','Notes'],['meetings','Rendez-vous'],['vacations','Vacances']];
    return groups.flatMap(([key,label])=>(Array.isArray(db[key])?db[key]:[]).flatMap(rec=>(rec.attachments||[]).filter(x=>x?.provider==='google-drive'&&x?.driveId).map(x=>({...x,group:label,recordLabel:rec.title||rec.no||'Fiche',recordNo:rec.no||''})))).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  }
  function filesListHtml(){
    const files=allReferences();
    if(!files.length)return '<p class="hint">Aucun fichier Google Drive n’est encore associé à une fiche.</p>';
    return '<div class="pst-drive-file-list">'+files.slice(0,60).map(a=>'<div class="pst-drive-file-row"><span class="pst-drive-file-icon">☁️</span><div><strong>'+safe(a.name)+'</strong><small>'+safe(a.group)+' · '+safe(a.recordLabel)+'</small></div><button type="button" class="ghost small" data-pst-drive-open="'+safe(a.driveId)+'">Ouvrir</button></div>').join('')+'</div>';
  }
  function renderFiles(){const holder=qs('#pstDriveFilesList');if(holder)holder.innerHTML=filesListHtml();}
  function render(){
    const label=qs('#pstDriveConnection');
    if(label){label.textContent=connected()?'● Drive connecté (session en cours)':'○ Drive non connecté';label.classList.toggle('is-connected',connected());}
    const connectBtn=qs('#pstDriveConnect');if(connectBtn)connectBtn.textContent=connected()?'Changer de compte Google':'Connecter mon compte Google';
    renderFiles();
  }
  function mount(){
    const settings=qs('#settings .settings-grid');
    if(settings&&!qs('#pstDriveSettings')){
      const panel=document.createElement('article');panel.className='panel pst-drive-panel';panel.id='pstDriveSettings';
      panel.innerHTML='<h3>☁️ Google Drive — espace documents</h3><p class="hint">Stocker les pièces jointes de maintenance, GPA, contrôles et documents dans le compte Google autorisé. Les fichiers restent privés dans Drive.</p><label>Identifiant client OAuth Google (non secret)<input id="pstDriveClientId" type="text" placeholder="123456…apps.googleusercontent.com" autocomplete="off" spellcheck="false"></label><label>Adresse du compte Google (facultatif)<input id="pstDriveEmail" type="email" placeholder="compte@gmail.com" autocomplete="email"></label><small class="hint">L’adresse sert uniquement à proposer le compte à Google : elle ne suffit pas à établir la connexion.</small><div class="pst-drive-buttons"><button class="ghost" id="pstDriveSave" type="button">Enregistrer les réglages</button><button class="primary" id="pstDriveConnect" type="button">Connecter mon compte Google</button><button class="ghost" id="pstDriveDisconnect" type="button">Déconnecter</button></div><div id="pstDriveConnection" class="pst-drive-connection" aria-live="polite">○ Drive non connecté</div><p id="pstDriveStatus" class="hint" role="status" aria-live="polite">À configurer une fois depuis Google Cloud. Votre mot de passe n’est jamais demandé.</p><p class="hint">La connexion peut expirer lorsque le site est fermé ; il suffira alors de cliquer à nouveau sur « Connecter ». Aucune sauvegarde de la base Supabase n’est créée par ce système.</p>';
      settings.append(panel);
      const v=config();qs('#pstDriveClientId').value=v.clientId;qs('#pstDriveEmail').value=v.email;
      qs('#pstDriveSave').addEventListener('click',saveConfig);
      qs('#pstDriveConnect').addEventListener('click',connect);
      qs('#pstDriveDisconnect').addEventListener('click',()=>{if(accessToken&&window.google?.accounts?.oauth2?.revoke)window.google.accounts.oauth2.revoke(accessToken,()=>{});forgetSession();status('Compte déconnecté sur cet appareil. Les fichiers restent dans Drive.');});
    }
    const documents=qs('#documents');
    if(documents&&!qs('#pstDriveDocuments')){
      const p=document.createElement('article');p.className='panel pst-drive-panel';p.id='pstDriveDocuments';
      p.innerHTML='<div class="panel-head"><div><h3>☁️ Mes fichiers Google Drive</h3><p class="hint">Les fichiers sont classés automatiquement dans Drive par rubrique et liés à leur fiche d’origine.</p></div><button id="pstDriveRefreshFiles" type="button" class="ghost">Actualiser</button></div><div id="pstDriveFilesList"></div>';
      documents.append(p);
      qs('#pstDriveRefreshFiles').addEventListener('click',renderFiles);
    }
    render();
  }
  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-pst-drive-open]');if(btn){e.preventDefault();openFile(btn.dataset.pstDriveOpen);}
  });
  document.addEventListener('pst:data-loaded',renderFiles);
  document.addEventListener('DOMContentLoaded',mount,{once:true});
  if(document.readyState!=='loading')mount();
  window.PSTGoogleDrive={isConnected:connected,uploadBatch,cleanup,openFile,renderFiles,config,connect};
})();
