/* Import manuel et sécurisé des 31 fiches GPA Excel fournies. */
(function(){
'use strict';
let entries=[];
let loadedFilename='';
const byId=id=>document.getElementById(id);
const html=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normal=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
function isDuplicate(works,item){
 const no=String(item.number).padStart(2,'0');
 return works.some(r=>{
  const sourceNo=Number(r.sourceFileNumber||0);
  if(r.source==='gpa-xls-import'&&sourceNo===item.number)return true;
  const noStr=normal(r.no||'').replace(/[ .]/g,'-');
  if(new RegExp('^gpa-0*'+item.number+'$').test(noStr))return true;
  if(String(r.sourceFilename||'')===item.sourceFilename)return true;
  // A record with the exact original description and submission date is already present.
  if(item.dateSent&&r.date===item.dateSent&&normal(r.description)===normal(item.description)&&normal(r.room||'')===normal(item.location))return true;
  return false;
 });
}
function current(){const db=window.PSTMainState?.get?.();if(!db||!Array.isArray(db.works))return null;const missing=entries.filter(x=>!isDuplicate(db.works,x));return {db,missing,existing:entries.length-missing.length};}
function render(){
 const status=byId('pstGPAImportStatus'),button=byId('pstGPAImportStart');if(!status)return;
 const c=current();
 if(!c){status.textContent='Connectez-vous au logiciel pour importer les fiches GPA.';if(button)button.disabled=true;return;}
 if(button){button.disabled=false;button.textContent='Choisir le fichier privé GPA (.json)';}
 status.dataset.error='false';
 status.textContent=entries.length?(loadedFilename+' : '+c.existing+' / '+entries.length+' fiches déjà reconnues · '+c.missing.length+' à ajouter · aucune fiche existante ne sera remplacée.'):'Pour importer les 31 fiches, sélectionne le fichier JSON privé fourni séparément. Ne mets pas ce JSON sur GitHub.';
}
async function loadPrivateFile(event){
 const file=event.target.files?.[0],status=byId('pstGPAImportStatus');if(!file)return;
 try{
  if(file.size>5*1024*1024)throw new Error('Le fichier JSON dépasse 5 Mo.');
  const parsed=JSON.parse(await file.text());
  if(parsed.format!=='pst-gpa-import-v1'||!Array.isArray(parsed.entries)||parsed.entries.length!==31)throw new Error('Fichier d’import GPA incorrect : les 31 fiches attendues sont absentes.');
  const nums=new Set();
  for(const x of parsed.entries){
   if(!Number.isInteger(x.number)||x.number<1||x.number>999||nums.has(x.number)||typeof x.description!=='string'||typeof x.location!=='string'||typeof x.dateSent!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x.dateSent)||typeof x.sourceFilename!=='string')throw new Error('Une fiche du fichier importé contient des informations manquantes, dupliquées ou invalides.');
   nums.add(x.number);
  }
  entries=parsed.entries;loadedFilename=file.name;render();preview();
 }catch(error){entries=[];loadedFilename='';status.dataset.error='true';status.textContent=String(error?.message||error);}
 finally{event.target.value='';}
}
function preview(){
 const p=byId('pstGPAImportPreview'),c=current();if(!p||!c||!entries.length)return;
 if(!c.missing.length){p.hidden=true;render();return;}
 const lines=c.missing.map(x=>'<li><strong>n° '+String(x.number).padStart(2,'0')+'</strong> — '+html(x.title)+' · '+html(x.dateSent||'date non renseignée')+(x.number!==x.numberInSheet?' <span class="pst-gpa-warning">(n° '+html(x.numberInSheet)+' dans la fiche Excel)</span>':'')+'</li>').join('');
 p.innerHTML='<strong>'+c.missing.length+' fiches à importer</strong><p>La date affichée est la date d’envoi présente dans le fichier Excel. Les états, échéances et priorités ne sont pas renseignés dans les fichiers : ils resteront à qualifier.</p><ul class="pst-gpa-preview-list">'+lines+'</ul><p class="pst-gpa-warning">Attention : le fichier n° 38 contient le n° 35 dans sa cellule de numéro. Les deux références sont conservées.</p><div class="pst-gpa-import-actions"><button type="button" class="primary" id="pstGPAImportConfirm">Importer les '+c.missing.length+' fiches (avec sauvegarde préalable)</button><button type="button" class="ghost" id="pstGPAImportCancel">Annuler</button></div>';
 p.hidden=false;
 byId('pstGPAImportCancel').onclick=()=>{p.hidden=true;};
 byId('pstGPAImportConfirm').onclick=runImport;
}
function saveBackup(db){
 const content=JSON.stringify({exportedAt:new Date().toISOString(),reason:'Avant import des 31 fiches GPA Excel',data:db},null,2);
 const blob=new Blob([content],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='Pilotage_SAUVEGARDE_AVANT_IMPORT_GPA_'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
function recordFor(entry){
 const n=String(entry.number).padStart(2,'0');
 return {
  id:'gpa-xls-'+String(entry.number).padStart(3,'0'),no:'GPA-'+n,date:entry.dateSent||'',time:'',
  type:'GPA',title:entry.title,company:'',architect:entry.architect||'',
  building:entry.building||'',floor:'',sector:'',room:entry.location||'',
  priority:'',status:'',dueDate:'',gpaEnd:'',
  description:entry.description||'',decision:entry.observations||'',attachments:[],
  source:'gpa-xls-import',sourceFileNumber:entry.number,sourceDocumentNumber:entry.numberInSheet,
  sourceFilename:entry.sourceFilename,
  sourceDateSent:entry.dateSent||'',sourceOriginalObservations:entry.observations||'',
  sourceOriginalInstruction:entry.instruction||'',sourceInterventionDate:entry.interventionDate||'',
  sourceInterventionNature:entry.interventionNature||'',sourceSignDate:entry.signedDate||'',
  sourceFileHash:entry.sha256,sourceSheet:entry.sourceSheet||'Fiche GPA'
 };
}
async function runImport(){
 const c=current(),button=byId('pstGPAImportConfirm'),status=byId('pstGPAImportStatus');if(!c||!c.missing.length)return;
 if(!navigator.onLine){status.dataset.error='true';status.textContent='Connexion Internet nécessaire pour confirmer la sauvegarde Supabase avant l’import.';return;}
 if(!window.PSTMainState?.persistStateDirect){status.dataset.error='true';status.textContent='Connexion Supabase non disponible. Réessayez après actualisation.';return;}
 if(!window.confirm('Importer '+c.missing.length+' fiches GPA dans Chantiers & GPA ? Une sauvegarde JSON du logiciel sera d’abord téléchargée. Les fiches déjà présentes resteront inchangées.'))return;
 if(button){button.disabled=true;button.textContent='Import et contrôle en cours…';}
 try{
  saveBackup(c.db);
  const fresh=c.missing.filter(x=>!isDuplicate(c.db.works,x)).map(recordFor);
  const insertedIds=fresh.map(r=>r.id);
  c.db.works.push(...fresh);
  const result=await window.PSTMainState.persistStateDirect({label:'Importation des '+fresh.length+' fiches GPA',verify:remote=>{
   const rows=remote?.works||[];
   return insertedIds.every(id=>rows.some(r=>r.id===id))&&new Set(rows.map(r=>r.id)).size===rows.length;
  }});
  byId('pstGPAImportPreview').hidden=true;
  render();
  if(result?.ok&&!result?.offline){status.dataset.error='false';status.textContent='✓ '+fresh.length+' fiches GPA ajoutées et confirmées dans Supabase. Ouvrez les dossiers pour qualifier leur statut.';}
  else{status.dataset.error='true';status.textContent='Import conservé localement mais non confirmé dans Supabase : '+(result?.error||'synchronisation en attente')+'. Vérifiez la synchronisation avant de relancer.';}
  if(typeof window.PSTSetView==='function')window.PSTSetView('works');
 }catch(error){status.dataset.error='true';status.textContent='Import non confirmé : '+String(error?.message||error);console.error('Import GPA',error);}
 finally{if(button){button.disabled=false;button.textContent='Importer les fiches';}}
}
function init(){const b=byId('pstGPAImportStart'),input=byId('pstGPAImportFile');if(!b||!input)return;b.addEventListener('click',()=>input.click());input.addEventListener('change',loadPrivateFile);window.addEventListener('pst:data-loaded',render);window.addEventListener('focus',render);document.addEventListener('pst:view-changed',e=>{if(e.detail?.view==='works')render()});render();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.PSTGPAImport={count:()=>entries.length,preview:()=>entries.map(x=>({number:x.number,date:x.dateSent,title:x.title})),makeRecord:recordFor};
})();
