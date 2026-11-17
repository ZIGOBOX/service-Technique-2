/* Pilotage Service Technique — 31 dossiers GPA, activation privée unique.
 * Données métier chiffrées AES-GCM. La clé privée n'est pas incluse dans les fichiers GitHub.
 * Les 31 données ne sont déchiffrées que dans le navigateur après saisie de la clé.
 */
(function(){
'use strict';
const BUNDLE={"version":1,"kdf":"PBKDF2-SHA256","iterations":220000,"salt":"IxJX+ljke0ZnwulselvYig==","nonce":"3W2FGBDlJP/8oXuP","ciphertext":"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","aad":"PST-GPA-31-v1"};
const NUMBERS=[9, 18, 19, 22, 23, 27, 28, 29, 38, 42, 43, 45, 47, 50, 51, 55, 56, 57, 58, 59, 60, 61, 63, 66, 67, 69, 70, 71, 72, 73, 74];
const $=id=>document.getElementById(id);
const escapeHtml=value=>String(value==null?'':value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const normalized=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
let entries=[],unlocked=false,importing=false,completed=false;
const decoded64=value=>Uint8Array.from(atob(value),ch=>ch.charCodeAt(0));
async function decrypt(passphrase){
 if(!globalThis.crypto?.subtle || !window.isSecureContext)throw new Error('Une connexion HTTPS est nécessaire pour activer les dossiers GPA.');
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(passphrase),'PBKDF2',false,['deriveKey']);
 const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:decoded64(BUNDLE.salt),iterations:BUNDLE.iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
 let bytes;
 try{bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:decoded64(BUNDLE.nonce),additionalData:new TextEncoder().encode(BUNDLE.aad),tagLength:128},key,decoded64(BUNDLE.ciphertext));}
 catch(_){throw new Error('Clé privée incorrecte. Vérifie-la et réessaie.');}
 const parsed=JSON.parse(new TextDecoder().decode(bytes));
 if(parsed.format!=='pst-gpa-embedded-v1'||parsed.count!==31||!Array.isArray(parsed.entries)||parsed.entries.length!==31)throw new Error('Données GPA invalides.');
 const seen=new Set();
 for(const entry of parsed.entries){
  if(!Number.isInteger(entry.number)||entry.number<1||entry.number>999||seen.has(entry.number)||typeof entry.description!=='string'||typeof entry.title!=='string'||typeof entry.location!=='string'||typeof entry.dateSent!=='string'||!/^(?:\d{4}-\d{2}-\d{2})$/.test(entry.dateSent)||!Number.isInteger(entry.numberInSheet))throw new Error('Une des fiches GPA est incorrecte.');
  seen.add(entry.number);
 }
 if(NUMBERS.some(n=>!seen.has(n)))throw new Error('Certaines références GPA sont manquantes.');
 return parsed.entries;
}
function isDuplicate(works,item){
 return works.some(record=>{
  const no=normalized(record.no||'').replace(/[ .]/g,'-');
  if(record.source==='gpa-xls-import'&&Number(record.sourceFileNumber)===item.number)return true;
  if(new RegExp('^gpa-0*'+item.number+'$').test(no))return true;
  if(String(record.id||'')==='gpa-xls-'+String(item.number).padStart(3,'0'))return true;
  if(item.dateSent&&record.date===item.dateSent&&normalized(record.description)===normalized(item.description)&&normalized(record.room)===normalized(item.location))return true;
  return false;
 });
}
function state(){
 const db=window.PSTMainState?.get?.();
 if(!db||!Array.isArray(db.works))return null;
 return {db,missing:entries.filter(x=>!isDuplicate(db.works,x)),existing:entries.filter(x=>isDuplicate(db.works,x)).length};
}
function importedCount(){
 const works=window.PSTMainState?.get?.()?.works||[];
 return NUMBERS.filter(n=>works.some(r=>r.source==='gpa-xls-import'&&Number(r.sourceFileNumber)===n||new RegExp('^GPA-0*'+n+'$','i').test(String(r.no||'').trim()))).length;
}
function status(msg,error=false){const el=$('pstGPAImportStatus');if(!el)return;el.dataset.error=error?'true':'false';el.textContent=msg;}
function render(){
 const box=$('pstGPAImportBox'),button=$('pstGPAImportStart'),row=$('pstGPAImportUnlockRow');if(!box)return;
 const count=importedCount();
 if(count===31){
  box.hidden=true;completed=true;entries=[];unlocked=false;
  return;
 }
 box.hidden=false;
 if(importing)return;
 const current=state();
 if(!current){status('Connecte-toi à ton compte Supabase pour retrouver et activer ces dossiers.');if(button)button.disabled=true;return;}
 if(!unlocked){
  status(count+' / 31 dossiers déjà présents. Saisis la clé privée fournie dans cette conversation pour préparer les dossiers manquants.');
  if(button)button.disabled=false;
  if(row)row.hidden=true;
 }else{
  status(current.existing+' / 31 dossiers déjà reconnus. '+current.missing.length+' dossier(s) à ajouter. Aucun dossier existant ne sera remplacé.');
  if(button){button.disabled=false;button.textContent='Vérifier les dossiers';}
  if(row)row.hidden=true;
 }
}
function preview(){
 const p=$('pstGPAImportPreview'),current=state();if(!p||!current||!unlocked)return;
 if(!current.missing.length){p.hidden=true;render();return;}
 p.innerHTML='<strong>'+current.missing.length+' dossiers à ajouter</strong><p>Seules les données textuelles seront enregistrées dans Supabase. La date affichée est la date d’envoi présente dans la fiche, et non la date de création dans le logiciel. Les statuts et priorités non renseignés resteront à qualifier.</p><ul class="pst-gpa-preview-list">'+current.missing.map(x=>'<li><strong>GPA-'+String(x.number).padStart(2,'0')+'</strong> — '+escapeHtml(x.title)+' · '+escapeHtml(x.dateSent)+(x.number!==x.numberInSheet?' <span class="pst-gpa-warning">(n° '+escapeHtml(x.numberInSheet)+' inscrit à l’intérieur)</span>':'')+'</li>').join('')+'</ul><p class="pst-gpa-warning">Le dossier GPA-38 porte le numéro 35 dans la fiche d’origine. Les deux références seront conservées.</p><div class="pst-gpa-import-actions"><button id="pstGPAImportConfirm" type="button" class="primary">Ajouter '+current.missing.length+' dossier(s) à Supabase</button><button id="pstGPAImportCancel" type="button" class="ghost">Annuler</button></div>';
 p.hidden=false;
 $('pstGPAImportConfirm').addEventListener('click',runImport,{once:true});
 $('pstGPAImportCancel').addEventListener('click',()=>{p.hidden=true;});
}
function backup(db){
 const name='Sauvegarde_Pilotage_avant_GPA_'+new Date().toISOString().slice(0,10)+'.json';
 const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),reason:'Avant activation de 31 dossiers GPA',data:db})],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 return name;
}
function makeRecord(entry){
 return {id:'gpa-xls-'+String(entry.number).padStart(3,'0'),no:'GPA-'+String(entry.number).padStart(2,'0'),date:entry.dateSent||'',time:'',type:'GPA',title:entry.title||'',company:'',architect:entry.architect||'',building:entry.building||'',floor:'',sector:'',room:entry.location||'',priority:'',status:'',dueDate:'',gpaEnd:'',description:entry.description||'',decision:entry.observations||'',attachments:[],source:'gpa-xls-import',sourceFileNumber:entry.number,sourceDocumentNumber:entry.numberInSheet,sourceDateSent:entry.dateSent||'',sourceOriginalObservations:entry.observations||'',sourceOriginalInstruction:entry.instruction||'',sourceInterventionDate:entry.interventionDate||'',sourceInterventionNature:entry.interventionNature||'',sourceSignDate:entry.signedDate||''};
}
async function runImport(){
 const current=state(),btn=$('pstGPAImportConfirm');if(!current||!current.missing.length||importing)return;
 if(!navigator.onLine){status('Connexion Internet nécessaire pour enregistrer les dossiers sur Supabase.',true);return;}
 if(typeof window.PSTMainState?.persistStateDirect!=='function'){status('La synchronisation Supabase est indisponible.',true);return;}
 if(!window.confirm('Ajouter '+current.missing.length+' dossiers GPA dans Chantiers & GPA ? Les données existantes seront conservées. Une sauvegarde sera téléchargée avant l’écriture ; attends la confirmation Supabase.'))return;
 importing=true;if(btn){btn.disabled=true;btn.textContent='Sauvegarde et import en cours…';}
 let ids=[];
 try{
  const backupName=backup(current.db);
  const fresh=current.missing.filter(x=>!isDuplicate(current.db.works,x)).map(makeRecord);
  ids=fresh.map(x=>x.id);
  current.db.works.push(...fresh);
  const result=await window.PSTMainState.persistStateDirect({label:'Ajout des '+fresh.length+' dossiers GPA',verify:remote=>{
   const rows=remote?.works||[];return ids.every(id=>rows.some(r=>r.id===id));
  }});
  if(result?.ok&&!result?.offline&&!result?.pending){
   status('✓ '+fresh.length+' dossier(s) ajouté(s) et confirmé(s) dans Supabase. Sauvegarde : '+backupName+'.');
   if($('pstGPAImportPreview'))$('pstGPAImportPreview').hidden=true;
   entries=[];unlocked=false;
   if(typeof window.PSTSetView==='function')window.PSTSetView('works');
   render();
   window.alert?.('Les dossiers GPA ont été ajoutés et confirmés dans Supabase. Tu peux maintenant les retrouver dans Chantiers & GPA.');
  }else{
   status('Ajout non confirmé dans Supabase : '+(result?.error||'synchronisation en attente')+'. Les données ont pu être conservées localement ; vérifie la synchronisation avant de recommencer.',true);
   if($('pstGPAImportPreview'))$('pstGPAImportPreview').hidden=true;
  }
 }catch(error){
  console.error('Activation GPA',error);
  status('Enregistrement non confirmé : '+String(error?.message||error)+'. Vérifie la synchronisation avant de réessayer.',true);
 }finally{importing=false;if(btn){btn.disabled=false;btn.textContent='Ajouter les dossiers';}}
}
async function unlock(){
 const input=$('pstGPAImportKey'),btn=$('pstGPAImportUnlock'),key=input?.value||'';
 if(!key.trim()){status('Saisis la clé d’activation privée.',true);return;}
 if(btn){btn.disabled=true;btn.textContent='Déchiffrement…';}
 try{
  entries=await decrypt(key.trim());unlocked=true;
  if(input)input.value='';
  render();preview();
 }catch(error){entries=[];unlocked=false;status(String(error?.message||error),true);if(input)input.focus();}
 finally{if(btn){btn.disabled=false;btn.textContent='Afficher les dossiers à ajouter';}}
}
function init(){
 const button=$('pstGPAImportStart'),row=$('pstGPAImportUnlockRow'),key=$('pstGPAImportKey'),unlockBtn=$('pstGPAImportUnlock');
 if(!button||!row||!key||!unlockBtn)return;
 button.addEventListener('click',()=>{if(unlocked){preview();return;}row.hidden=!row.hidden;if(!row.hidden)key.focus();});
 unlockBtn.addEventListener('click',unlock);
 key.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();unlock();}});
 window.addEventListener('pst:data-loaded',render);
 window.addEventListener('focus',render);
 document.addEventListener('pst:view-changed',event=>{if(event.detail?.view==='works')render()});
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.PSTGPAImport={getStatus:()=>({total:31,recognized:importedCount(),unlocked})};
})();
