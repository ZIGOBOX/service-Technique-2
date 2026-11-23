/* Pilotage Service Technique 147.191 — Import direct de fiches GPA .xls/.xlsx.
   Lecture locale via SheetJS déjà présent ; aperçu obligatoire avant écriture dans Supabase.
   Les déclarations du formulaire ne sont pas une preuve de levée de réserve. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const clean=v=>String(v??'').replace(/\r/g,'').replace(/\u00a0/g,' ').trim();
const norm=v=>clean(v).toLocaleLowerCase('fr-FR').replace(/œ/g,'oe').replace(/æ/g,'ae').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’'‘´`\/\-]/g,' ').replace(/\s+/g,' ');
const valid=v=>!!clean(v)&&!/^xx(?:[\s/\-.]*xx)+$/i.test(norm(v))&&!/^\s*(?:xx(?:[\/ .-]*xx)*|x{2,}|n\/?a|sans objet|a renseigner|non renseigne|non precise|—|-|\?+|\d{2}\/\d{2}\/xxxx|jj\/mm\/aaaa)\s*$/i.test(norm(v));
const isoDate=v=>{
 if(!valid(v))return '';
 if(v instanceof Date&&!Number.isNaN(v.getTime()))return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
 if(typeof v==='number'&&v>20000&&v<90000){const date=new Date(Date.UTC(1899,11,30)+Math.round(v)*86400000);return date.toISOString().slice(0,10)}
 const s=clean(v),fr=s.match(/^(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{4})$/);
 if(fr){const date=`${fr[3]}-${fr[2].padStart(2,'0')}-${fr[1].padStart(2,'0')}`;const chk=new Date(date+'T12:00:00Z');return Number.isNaN(chk.getTime())?'':date}
 if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
 return '';
};
const labelKeys={
 number:['fiche d observations gpa n','fiche d observation gpa n','numero gpa','n° gpa'],
 sentDate:['date d envoi','date envoi'],
 location:['localisation','localisation de l observation'],
 disorder:['nature de la malfacon','nature du desordre','nature des dysfonctionnements','nature du dysfonctionnement','nature de la reserve'],
 architect:['maitre d oeuvre','maitrise d oeuvre'],
 company:['entreprise'],
 interventionDate:['date d intervention'],
 interventionNature:['nature de l intervention'],
 observations:['observations complement','observations du maitre d oeuvre'],
 instruction:['instruction du maitre d oeuvre'],
 closureDate:['date de cloture','date de levee de reserve']
};
function isCandidate(v){return valid(v)&&!Object.values(labelKeys).flat().some(k=>norm(v).startsWith(k))&&!/^(?:recue le|envoyee le|rappel du delais|date :|signature|lot :)/.test(norm(v))&&!/:\s*$/.test(clean(v))}
function readValue(grid,keys){
 const matches=v=>keys.some(k=>norm(v).startsWith(k));
 for(let r=0;r<grid.length;r++)for(let c=0;c<(grid[r]||[]).length;c++){
  const cell=grid[r][c],val=norm(cell);
  if(!matches(cell))continue;
  const original=clean(cell),afterColon=original.includes(':')?original.slice(original.indexOf(':')+1).trim():'';
  const inline=afterColon.split(/\n/).map(part=>part.trim()).filter(part=>valid(part)&&!/^lot\s*:/i.test(part));
  if(inline.length&&valid(inline[0])&&!Object.values(labelKeys).flat().some(k=>norm(inline[0]).startsWith(k))){
   // Never return the template value XX, even when the next line contains another label.
   if(!/^xx\b/i.test(inline[0]))return inline.join(' · ');
  }
  // Prefer the adjacent value. In the sample, B4 contains the location, F3 the date.
  for(let step=1;step<=10;step++){
   const candidate=grid[r][c+step];
   if(candidate!==undefined&&isCandidate(candidate))return candidate;
  }
  // Some templates store the value immediately below the label.
  if(grid[r+1] && isCandidate(grid[r+1][c])&&!matches(grid[r+1][c])){
   const down=grid[r+1][c];
   if(!Object.values(labelKeys).flat().some(k=>norm(down).startsWith(k)))return down;
  }
 }
 return '';
}
function readHeaderText(grid,key){
 for(const row of grid)for(const v of row){const s=clean(v);
  if(norm(s).includes(key))return s;
 }
 return '';
}
function parseRows(grid,fileName=''){
 if(!Array.isArray(grid)||!grid.length)return null;
 const numberCell=readValue(grid,labelKeys.number);
 const byHeader=(readHeaderText(grid,'fiche d observations gpa n')||'').match(/gpa\s*n\s*[°o.:]*\s*(\d{1,5})/i);
 const fileMatch=String(fileName||'').match(/gpa\s*[-_ ]*(\d{1,5})/i);
 const documentNumber=Number.isInteger(Number(numberCell))&&Number(numberCell)>0&&Number(numberCell)<=99999?Number(numberCell):(byHeader?Number(byHeader[1]):0);
 const fileNumber=fileMatch?Number(fileMatch[1]):0;
 // Respect the number used in file-based historical dossiers. A few old records
 // have a different number printed inside the template; keep both references.
 const number=fileNumber||documentNumber;
 const disorder=clean(readValue(grid,labelKeys.disorder));
 const location=clean(readValue(grid,labelKeys.location));
 // Strict identification prevents unrelated Excel files from being imported.
 if(!number||(!disorder&&!location))return null;
 const architectCell=clean(readValue(grid,labelKeys.architect));
 const companyCell=clean(readValue(grid,labelKeys.company));
 const interventionDate=isoDate(readValue(grid,labelKeys.interventionDate));
 const interventionNature=clean(readValue(grid,labelKeys.interventionNature));
 const observations=clean(readValue(grid,labelKeys.observations));
 const instruction=clean(readValue(grid,labelKeys.instruction));
 const closureDate=isoDate(readValue(grid,labelKeys.closureDate));
 const company=valid(companyCell)&&!/^xx\b/i.test(companyCell)?companyCell:'';
 const architect=valid(architectCell)&&!/^xx\b/i.test(architectCell)?architectCell:'';
 const evidenceText=[observations,instruction,interventionNature].filter(Boolean).join('\n');
 // Do not mistake printed template labels (“Signature confirmant…”) for a real signature.
 const explicitClosed=/\b(?:gpa|fiche|reserve|observation|desordre)\b.{0,80}\b(?:cloturee?|levee|soldee?)\b|\bcloture (?:confirmee|validee|effectuee)\b/.test(norm(evidenceText));
 const closure=explicitClosed?'Clôturée':'Non clôturée';
 const closureEvidence=explicitClosed?evidenceText.slice(0,400):'Aucune mention explicite de clôture trouvée ; vérification manuelle nécessaire.';
 const title=disorder?(disorder.length>116?disorder.slice(0,113)+'…':disorder):`Observation GPA n° ${number}`;
 return {number,documentNumber:documentNumber||number,fileNumber:fileNumber||number,numberMismatch:!!(documentNumber&&fileNumber&&documentNumber!==fileNumber),title,sentDate:isoDate(readValue(grid,labelKeys.sentDate)),location,disorder,architect,company,interventionDate,interventionNature,observations,instruction,closure,closureEvidence,closureDate,explicitClosed};
}
function parseWorkbook(file,buffer){
 if(!window.XLSX?.read||!window.XLSX?.utils?.sheet_to_json)throw new Error('Le lecteur Excel n’a pas chargé. Vérifiez la connexion Internet et actualisez la page.');
 const workbook=window.XLSX.read(buffer,{type:'array',cellDates:false,cellText:false});
 const results=[];
 for(const name of workbook.SheetNames){
  const rows=window.XLSX.utils.sheet_to_json(workbook.Sheets[name],{header:1,raw:true,defval:''});
  const found=parseRows(rows,file.name);
  if(found)results.push({...found,sourceSheet:name});
 }
 return results;
}
let queue=[],working=false;
function records(){return window.PSTMainState?.get?.()?.works||[]}
function findExisting(no){return records().find(x=>new RegExp('^GPA[-\\s]?0*'+Number(no)+'$','i').test(String(x.no||''))||x.sourceFileNumber!=null&&Number(x.sourceFileNumber)===Number(no));}
function message(text,error=false){const el=$('pstGPAReaderStatus');if(el){el.textContent=text;el.classList.toggle('is-error',error)}}
function display(){
 const target=$('pstGPAReaderPreview');if(!target)return;
 if(!queue.length){target.innerHTML='';target.hidden=true;return;}
 target.hidden=false;
 const seen=new Set();
 target.innerHTML=queue.map((entry,i)=>{
  const g=entry.data,existing=findExisting(g.number),duplicate=seen.has(g.number);seen.add(g.number);
  entry.duplicate=duplicate;entry.existing=existing||null;
  const act=existing?`<option value="skip">Ignorer le doublon</option><option value="enrich">Enrichir la fiche existante, sans effacer ses données</option>`:`<option value="new">Ajouter une nouvelle GPA</option><option value="skip">Ignorer</option>`;
  const action=entry.action&&(existing?['skip','enrich']:['new','skip']).includes(entry.action)?entry.action:(existing?'skip':'new');entry.action=duplicate?'skip':action;
  return `<div class="pst-gpa-preview-card" data-gpa-index="${i}"><div class="pst-gpa-preview-top"><div><h4>📋 GPA n° ${esc(g.number)} — ${esc(g.title)}</h4><small>${esc(entry.file.name)} · Feuille « ${esc(g.sourceSheet)} »</small></div><strong>${g.closure==='Clôturée'?'✅ Clôture détectée':'🟠 Non clôturée — à vérifier'}</strong></div>
  <div class="pst-gpa-preview-grid"><div><small>📅 Date d'envoi</small><strong>${esc(g.sentDate||'Non renseignée')}</strong></div><div><small>📍 Localisation</small><strong>${esc(g.location||'Non renseignée')}</strong></div><div><small>🏢 Entreprise</small><strong>${esc(g.company||'Non renseignée')}</strong></div><div><small>🔧 Intervention</small><strong>${esc(g.interventionDate||'Aucune date')} ${esc(g.interventionNature||'')}</strong></div><div><small>Maîtrise d’œuvre</small><strong>${esc(g.architect||'Non renseignée')}</strong></div><div><small>État GPA</small><strong>${esc(g.closureEvidence)}</strong></div></div>
  <p><strong>Désordre signalé :</strong> ${esc(g.disorder||'Non renseigné')}</p>
  ${g.observations?`<p><strong>Observations :</strong> ${esc(g.observations)}</p>`:''}
  ${duplicate?'<p class="pst-gpa-reader-status is-error">La sélection contient deux fichiers portant le même numéro GPA. Le second est ignoré.</p>':''}
  ${g.numberMismatch?`<p class="pst-gpa-reader-status is-error">⚠️ Numérotation différente : fichier GPA-${esc(g.fileNumber)}, fiche intérieure n° ${esc(g.documentNumber)}. L'import conservera les deux références.</p>`:''}
  ${existing?`<p>⚠️ Une GPA n° ${g.number} existe déjà dans le logiciel : aucune ancienne donnée ne sera remplacée.</p>`:''}
  <div class="pst-gpa-preview-actions"><label>Action à effectuer<select data-gpa-action="${i}">${act.replace(`value="${action}"`,`value="${action}" selected`)}</select></label><label>Clôture — à vérifier avant validation<select data-gpa-closure="${i}"><option value="Non clôturée" ${g.closure!=='Clôturée'?'selected':''}>Non clôturée — à vérifier</option><option value="Clôturée" ${g.closure==='Clôturée'?'selected':''}>Clôturée (justificatif ou validation manuelle)</option></select></label></div></div>`;
 }).join('')+`<div class="pst-gpa-reader-footer"><span>Vérifie les données extraites. Les fiches déjà existantes sont ignorées par défaut.</span><button class="primary" id="pstGPASave" type="button">✓ Confirmer et enregistrer les fiches sélectionnées</button></div>`;
 target.querySelectorAll('[data-gpa-action]').forEach(el=>el.addEventListener('change',()=>{queue[+el.dataset.gpaAction].action=el.value}));
 target.querySelectorAll('[data-gpa-closure]').forEach(el=>el.addEventListener('change',()=>{queue[+el.dataset.gpaClosure].data.closure=el.value}));
 $('pstGPASave')?.addEventListener('click',save,{once:true});
}
async function onFiles(files){
 if(working)return;
 const selected=[...files].filter(f=>/\.xlsx?$/i.test(f.name));
 if(!selected.length){message('Sélectionne des fiches Excel .xls ou .xlsx.',true);return}
 working=true;queue=[];message('Lecture des fiches en cours…');
 const errors=[];
 for(const file of selected){
  try{
   const bytes=await file.arrayBuffer();const list=parseWorkbook(file,bytes);
   if(!list.length){errors.push(`${file.name} : aucune fiche GPA reconnue.`);continue}
   list.forEach(data=>queue.push({file,data,action:''}));
  }catch(e){errors.push(`${file.name} : ${e.message||e}`)}
 }
 working=false;display();
 message(`${queue.length} fiche(s) reconnue(s) dans ${selected.length} fichier(s). ${errors.length?errors.join(' | '):'Vérifie l’aperçu avant import.'}`,!!errors.length);
}
async function save(){
 const button=$('pstGPASave');if(working)return;
 const selected=queue.filter(e=>e.action!=='skip'&&!e.duplicate);
 if(!selected.length){message('Aucune fiche sélectionnée pour import.',true);button?.addEventListener('click',save,{once:true});return}
 for(const entry of selected){
  if(entry.data.closure==='Clôturée'&&!entry.data.explicitClosed){
   const yes=window.confirm(`La fiche GPA n° ${entry.data.number} ne démontre pas explicitement sa clôture. Confirmes-tu la clôture sur la base d'un justificatif ou de ton contrôle ?`);
   if(!yes){message('Import interrompu : la clôture doit être vérifiée, ou choisir « Non clôturée ».',true);button?.addEventListener('click',save,{once:true});return}
   entry.confirmClosed=true;
  }
 }
 if(!window.confirm(`Enregistrer ${selected.length} fiche(s) GPA avec leur fichier Excel original dans Supabase ? Les GPA déjà présentes ne seront pas effacées.`)){button?.addEventListener('click',save,{once:true});return}
 working=true;if(button){button.disabled=true;button.textContent='Enregistrement et sauvegarde des pièces jointes…'}
 try{
  const result=await window.PSTGPAFilePersistence?.saveBatch(selected);
  if(!result?.ok)throw new Error('Enregistrement non confirmé');
  queue=[];display();message(`✓ ${result.touched.length} fiche(s) GPA enregistrée(s) avec leur Excel original. Tu peux les retrouver dans le tableau Chantiers & GPA. ${result.pending?'Synchronisation serveur à contrôler.':''}`);
 }catch(error){
  message(`Échec ou confirmation manquante : ${String(error?.message||error)}. Vérifie la synchronisation et les numéros existants avant de recommencer.`,true);
  if(button){button.disabled=false;button.textContent='Réessayer après vérification';button.addEventListener('click',save,{once:true})}
 }finally{working=false}
}
function init(){
 const input=$('pstGPAFiles'),drop=$('pstGPADropZone');if(!input||!drop)return;
 input.addEventListener('change',e=>{const files=e.target.files;onFiles(files);input.value=''});
 drop.addEventListener('click',()=>input.click());
 drop.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click()}});
 drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('is-drag')});
 drop.addEventListener('dragleave',()=>drop.classList.remove('is-drag'));
 drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('is-drag');onFiles(e.dataTransfer?.files||[])});
}
window.PSTGPAFileImporter={parseRows,parseWorkbook,isoDate,readValue,valid,norm,keys:labelKeys};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
