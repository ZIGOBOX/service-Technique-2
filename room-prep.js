(()=>{'use strict';
const $=id=>document.getElementById(id),uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);let editingId='';
const mainDb=()=>window.PSTMainState?.get?.()||null;
const load=()=>{const d=mainDb();return d&&Array.isArray(d.roomPreps)?d.roomPreps.filter(x=>!x?.deletedAt):[]};
const cloneList=()=>load().map(x=>({...x}));
// Ne jamais écraser roomPreps avec uniquement les fiches visibles : les suppressions
// synchronisées (deletedAt) doivent être conservées jusqu'à propagation sur tous les appareils.
const replaceActiveList=v=>{
 const d=mainDb();if(!d){console.warn('État principal indisponible');return false}
 const tombstones=(Array.isArray(d.roomPreps)?d.roomPreps:[]).filter(x=>x?.deletedAt).map(x=>({...x}));
 d.roomPreps=[...(Array.isArray(v)?v:[]),...tombstones];
 return true;
};
const notify=(msg,type='ok')=>{const el=$('roomPrepSaveStatus');if(el){el.textContent=msg;el.dataset.state=type}try{window.toast?.(msg)}catch(_){}};
const setSaving=busy=>{const b=$('roomPrepSave');if(!b)return;b.disabled=busy;b.textContent=busy?'Enregistrement…':(editingId?'Enregistrer les modifications':'Enregistrer la préparation')};
async function persistRoomPrep(){
 const api=window.PSTMainState;if(!api)return {ok:false,offline:false};
 if(api.persistNow)return await api.persistNow();
 const ok=api.save?.(false);return {ok:!!ok,offline:!navigator.onLine};
}
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}, fmtDate=v=>v?new Date(`${v}T12:00:00`).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}):'';
const ref=()=>window.PSTCleaningRooms?.get?.()||[], roomLabel=r=>[r?.number||'',r?.name||''].filter(Boolean).join(' — ')||r?.type||'Local';
function fillB(sel={}){const d=ref(),e=$('rpBuilding');if(!e)return;e.innerHTML=d.map((x,i)=>`<option value="${i}">${esc(x.name)}</option>`).join('');e.value=String(sel.building??0);fillF(sel)}
function fillF(sel={}){const d=ref(),bi=+$('rpBuilding').value,e=$('rpFloor'),a=d[bi]?.floors||[];e.innerHTML=a.map((x,i)=>`<option value="${i}">${esc(x.name)}</option>`).join('');e.value=String(sel.floor??0);fillS(sel)}
function fillS(sel={}){const d=ref(),bi=+$('rpBuilding').value,fi=+$('rpFloor').value,e=$('rpSector'),a=d[bi]?.floors[fi]?.sectors||[];e.innerHTML=a.map((x,i)=>`<option value="${i}">${esc(x.name)}</option>`).join('');e.value=String(sel.sector??0);fillR(sel)}
function fillR(sel={}){const d=ref(),bi=+$('rpBuilding').value,fi=+$('rpFloor').value,si=+$('rpSector').value,e=$('rpRoom'),a=d[bi]?.floors[fi]?.sectors[si]?.rooms||[];e.innerHTML=a.map((x,i)=>`<option value="${i}">${esc(roomLabel(x))}</option>`).join('')+'<option value="other">Autre lieu…</option>';e.value=String(sel.room??0);toggleOther()}
function toggleOther(){$('rpOtherLocationWrap')?.classList.toggle('hidden',$('rpRoom')?.value!=='other')}
function loc(){const d=ref(),bi=+$('rpBuilding').value,fi=+$('rpFloor').value,si=+$('rpSector').value,rv=$('rpRoom').value,b=d[bi],f=b?.floors[fi],s=f?.sectors[si];if(rv==='other')return{building:b?.name||'',floor:f?.name||'',sector:s?.name||'',room:$('rpOtherLocation').value.trim()||'Autre lieu',roomId:'',other:true};const r=s?.rooms?.[+rv];return{building:b?.name||'',floor:f?.name||'',sector:s?.name||'',room:roomLabel(r),roomId:r?.id||'',other:false}}
function data(){const l=loc();return{id:editingId||uid(),date:$('rpDate').value,time:$('rpTime').value,...l,requester:$('rpRequester').value.trim(),people:+$('rpPeople').value||0,owner:$('rpOwner').value.trim(),status:$('rpStatus').value,deadlineTime:$('rpDeadlineTime').value,layout:$('rpLayout').value,tables:+$('rpTables').value||0,chairs:+$('rpChairs').value||0,partition:$('rpPartition').value,otherPrep:$('rpOtherPrep').value,otherPrepComment:$('rpOtherPrepComment').value.trim(),roomSetup:{projector:!!$('rpProjector').checked,screen:!!$('rpScreen').checked,mic:!!$('rpMic').checked,extension:!!$('rpExtension').checked,tablecloth:!!$('rpTablecloth').checked,bins:!!$('rpBins').checked,signage:!!$('rpSignage').checked,pmr:!!$('rpPMR').checked},coffee:{enabled:$('rpCoffee').value==='Oui',people:+$('rpCoffeePeople').value||0,time:$('rpCoffeeTime').value,comment:$('rpCoffeeComment').value.trim()},notes:$('rpNotes').value.trim(),updatedAt:new Date().toISOString()}}
function toggleCoffeeFields(){
 const enabled=$('rpCoffee')?.value==='Oui';
 ['rpCoffeePeople','rpCoffeeTime','rpCoffeeComment'].forEach(id=>{const el=$(id),lab=el?.closest('label');if(lab)lab.classList.toggle('hidden',!enabled);if(el)el.disabled=!enabled});
 if(enabled&&+( $('rpCoffeePeople')?.value||0)<=0&&$('rpPeople'))$('rpCoffeePeople').value=+$('rpPeople').value||0;
}
function updateEditorMode(){
 const title=$('roomPrepEditorTitle');if(title)title.textContent=editingId?'Modifier la préparation':'Nouvelle préparation';
 const b=$('roomPrepSave');if(b&&!b.disabled)b.textContent=editingId?'Enregistrer les modifications':'Enregistrer la préparation';
 const r=$('roomPrepReset');if(r)r.textContent=editingId?'Annuler la modification':'Réinitialiser';
}
function reset(){editingId='';$('rpDate').value=today();$('rpTime').value='';$('rpRequester').value='';$('rpPeople').value=10;$('rpOwner').value='';$('rpStatus').value='À préparer';$('rpDeadlineTime').value='';$('rpLayout').value='Réunion';$('rpTables').value=0;$('rpChairs').value=0;$('rpPartition').value='Non';$('rpOtherPrep').value='Non';$('rpOtherPrepComment').value='';$('rpOtherPrepCommentWrap').classList.add('hidden');$('rpCoffee').value='Non';$('rpCoffeePeople').value=0;$('rpCoffeeTime').value='';$('rpCoffeeComment').value='';$('rpNotes').value='';$('rpOtherLocation').value='';['rpProjector','rpScreen','rpMic','rpExtension','rpTablecloth','rpBins','rpSignage','rpPMR'].forEach(id=>$(id).checked=false);fillB();toggleCoffeeFields();updateEditorMode();const st=$('roomPrepSaveStatus');if(st)st.textContent=''}
async function save(){
 const v=data();
 if(!v.date)return notify('La date est obligatoire.','error');
 if(!v.room)return notify('Le lieu est obligatoire.','error');
 if(v.other&&(!$('rpOtherLocation').value.trim()))return notify('Indiquez le lieu dans « Autre lieu ».','error');
 if(v.coffee.enabled&&v.coffee.people<=0)v.coffee.people=v.people||0;
 let a=cloneList(),i=a.findIndex(x=>String(x.id)===String(v.id));if(i>=0)a[i]=v;else a.push(v);
 a.sort((x,y)=>`${x.date}T${x.time||'00:00'}`.localeCompare(`${y.date}T${y.time||'00:00'}`));
 if(!replaceActiveList(a))return notify('Enregistrement impossible : état principal indisponible.','error');
 setSaving(true);notify(navigator.onLine?'Enregistrement sur le serveur…':'Hors ligne : mise en attente sur ce téléphone.','loading');
 try{
   const result=await persistRoomPrep();
   render();try{window.dispatchEvent(new Event('pst:data-saved'))}catch(_){}
   if(!result?.ok)return notify('La préparation n’a pas pu être enregistrée. Elle reste en attente si le mode hors ligne est disponible.','error');
   const msg=result.offline?'Préparation enregistrée hors ligne — synchronisation automatique au retour d’Internet.':'Préparation enregistrée et synchronisée.';
   reset();notify(msg,result.offline?'offline':'ok');
 }finally{setSaving(false);updateEditorMode()}
}

function editPrep(id){
 const v=load().find(x=>String(x.id)===String(id));if(!v)return;
 editingId=v.id;
 $('rpDate').value=v.date||today();$('rpTime').value=v.time||'';$('rpRequester').value=v.requester||'';$('rpPeople').value=v.people||10;$('rpOwner').value=v.owner||'';$('rpStatus').value=v.status||'À préparer';$('rpDeadlineTime').value=v.deadlineTime||'';$('rpLayout').value=v.layout||'Réunion';$('rpTables').value=v.tables||0;$('rpChairs').value=v.chairs||0;$('rpPartition').value=v.partition||'Non';$('rpOtherPrep').value=v.otherPrep||'Non';$('rpOtherPrepComment').value=v.otherPrepComment||'';$('rpOtherPrepCommentWrap')?.classList.toggle('hidden',(v.otherPrep||'Non')!=='Oui');$('rpCoffee').value=v.coffee?.enabled?'Oui':'Non';$('rpCoffeePeople').value=v.coffee?.people||0;$('rpCoffeeTime').value=v.coffee?.time||'';$('rpCoffeeComment').value=v.coffee?.comment||'';$('rpNotes').value=v.notes||'';
 ['projector','screen','mic','extension','tablecloth','bins','signage','pmr'].forEach(k=>{const id='rp'+k.charAt(0).toUpperCase()+k.slice(1);if($(id))$(id).checked=!!v.roomSetup?.[k]});
 const d=ref();let bi=d.findIndex(b=>b.name===v.building);if(bi<0)bi=0;fillB({building:bi});let b=d[bi],fi=(b?.floors||[]).findIndex(f=>f.name===v.floor);if(fi<0)fi=0;fillF({floor:fi});let f=b?.floors?.[fi],si=(f?.sectors||[]).findIndex(s=>s.name===v.sector);if(si<0)si=0;fillS({sector:si});let s=f?.sectors?.[si],ri=(s?.rooms||[]).findIndex(rr=>rr.id===v.roomId||roomLabel(rr)===v.room);
 if(v.other){fillR({room:'other'});$('rpRoom').value='other';$('rpOtherLocation').value=v.room||'';toggleOther()}else{if(ri<0)ri=0;fillR({room:ri})}
 toggleCoffeeFields();updateEditorMode();const st=$('roomPrepSaveStatus');if(st)st.textContent='Modification en cours';
 $('roomPrepEditorPanel')?.scrollIntoView({behavior:'smooth',block:'start'})
}
function summary(v){return [`${v.tables||0} table(s)`,`${v.chairs||0} chaise(s)`,v.partition==='Oui'?'Cloison ouverte':'',v.coffee?.enabled?`Café ${v.coffee.people||v.people||0} pers.`:''].filter(Boolean).join(' · ')}

async function deletePrep(id){
 const d=mainDb();
 const v=d&&Array.isArray(d.roomPreps)?d.roomPreps.find(x=>String(x.id)===String(id)):null;if(!v||v.deletedAt)return;
 if(!confirm(`Supprimer la demande ${v.room||'salle / café'} du ${fmtDate(v.date)} ?`))return;
 // IMPORTANT : on conserve une pierre tombale synchronisable au lieu de retirer l'objet.
 // Cela empêche une ancienne copie PC/Android/Supabase de recréer la fiche après fusion.
 const stamp=new Date().toISOString();
 v.deletedAt=stamp;v.updatedAt=stamp;v.deletedByDevice=true;
 render();try{window.dispatchEvent(new Event('pst:data-saved'))}catch(_){}
 const result=await persistRoomPrep();
 if(String(editingId)===String(id))reset();
 if(result?.ok)notify(result.offline?'Préparation supprimée hors ligne — synchronisation automatique au retour d’Internet.':'Préparation supprimée et synchronisée.',result.offline?'offline':'ok');
 else notify('Suppression en attente : synchronisation serveur non confirmée.','error');
}
function printPrep(id){
 const v=load().find(x=>String(x.id)===String(id));if(!v)return;
 const yes=x=>x?'Oui':'Non';
 const roomSetup=v.roomSetup||{}, coffee=v.coffee||{};
 const equipment=[
   ['Vidéoprojecteur',roomSetup.projector],['Écran',roomSetup.screen],['Micro',roomSetup.mic],
   ['Rallonge',roomSetup.extension],['Nappe',roomSetup.tablecloth],['Poubelles',roomSetup.bins],
   ['Signalétique',roomSetup.signage],['PMR',roomSetup.pmr]
 ].filter(x=>x[1]).map(x=>x[0]).join(', ')||'Aucun équipement particulier';
 const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Préparation salle & café</title>
 <style>
 *{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#183247;margin:0;background:#eef5f9}.sheet{max-width:900px;margin:0 auto;background:#fff;min-height:100vh;padding:22px}.toolbar{position:sticky;top:0;z-index:5;display:flex;gap:10px;justify-content:center;padding:12px;background:#123c5a;border-radius:0 0 14px 14px;margin:-22px -22px 20px}.toolbar button{border:0;border-radius:10px;padding:13px 18px;font-size:16px;font-weight:700;cursor:pointer}.toolbar .print{background:#0d9bd7;color:#fff}.toolbar .close{background:#fff;color:#183247}
 h1{margin:0 0 5px;font-size:24px}h2{font-size:16px;margin:0 0 8px;color:#235b79}.head{border-bottom:3px solid #169ad2;padding-bottom:12px;margin-bottom:14px}.muted{color:#667b88}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.box{border:1px solid #cfdce5;border-radius:10px;padding:12px;background:#f8fbfd;overflow-wrap:anywhere}.box p{margin:5px 0}.full{grid-column:1/-1}.coffee{border-left:5px solid #b77b1b}.print-help{font-size:13px;color:#5c7180;text-align:center;margin:0 0 14px}
 @media(max-width:680px){.sheet{padding:14px}.toolbar{margin:-14px -14px 14px;flex-direction:column}.toolbar button{width:100%}.grid{grid-template-columns:1fr}.full{grid-column:auto}.box{padding:14px}h1{font-size:21px}}
 @media print{body{background:#fff}.sheet{max-width:none;padding:0;min-height:0}.toolbar,.print-help{display:none!important}.grid{grid-template-columns:1fr 1fr}.full{grid-column:1/-1}@page{size:A4 portrait;margin:12mm}}
 </style></head><body><main class="sheet">
 <div class="toolbar"><button class="print" onclick="window.print()">🖨 Imprimer / Enregistrer en PDF</button><button class="close" onclick="window.close();history.back()">← Retour</button></div>
 <p class="print-help">Sur Android, appuyez sur « Imprimer / Enregistrer en PDF ». L’impression automatique est volontairement désactivée car certaines WebView la bloquent.</p>
 <div class="head"><h1>Préparation de salle & café</h1><div class="muted">${esc(fmtDate(v.date))}${v.time?` · 🕒 ${esc(v.time)}`:''} · 📍 ${esc([v.room,v.building,v.floor].filter(Boolean).join(' · '))}</div></div>
 <div class="grid">
  <div class="box"><h2>Lieu</h2><p><b>${esc(v.room||'—')}</b></p><p>${esc(v.building||'')} ${v.floor?`· ${esc(v.floor)}`:''} ${v.sector?`· ${esc(v.sector)}`:''}</p><p>Heure : <b>${esc(v.time||'—')}</b></p></div>
  <div class="box"><h2>Demande</h2><p>Demandeur : <b>${esc(v.requester||'—')}</b></p><p>Responsable : ${esc(v.owner||'—')}</p><p>Statut : ${esc(v.status||'—')}</p></div>
  <div class="box"><h2>Mise en place salle</h2><p>Disposition : ${esc(v.layout||'—')}</p><p>Personnes : ${Number(v.people||0)}</p><p>Tables : ${Number(v.tables||0)} · Chaises : ${Number(v.chairs||0)}</p><p>Ouvrir cloison salle polyvalente : <b>${esc(v.partition||'Non')}</b></p><p>Équipements : ${esc(equipment)}</p></div>
  <div class="box coffee"><h2>Café</h2><p>Café à prévoir : <b>${yes(!!coffee.enabled)}</b></p>${coffee.enabled?`<p>Nombre de personnes : ${Number(coffee.people||0)}</p><p>Heure de mise en place : <b>${esc(coffee.time||'—')}</b></p><p>Commentaire : ${esc(coffee.comment||'—')}</p>`:'<p>Aucune préparation café.</p>'}</div>
  <div class="box full"><h2>Autre préparation</h2><p>${esc(v.otherPrep||'Non')}${v.otherPrepComment?` — ${esc(v.otherPrepComment)}`:''}</p></div>
  <div class="box full"><h2>Observations</h2><p>${esc(v.notes||'—')}</p></div>
 </div></main></body></html>`;
 const w=window.open('','_blank');
 if(!w){
   const blob=new Blob([html],{type:'text/html;charset=utf-8'});const url=URL.createObjectURL(blob);window.location.href=url;setTimeout(()=>URL.revokeObjectURL(url),60000);return;
 }
 w.document.open();w.document.write(html);w.document.close();
}

function render(){
 const now=today(),items=load().filter(x=>x.date>=now&&x.status!=='Terminé'),list=$('roomPrepList'),ag=$('roomPrepAgenda');
 if(list){
   list.innerHTML=items.length?items.map(v=>`<article class="roomprep-card roomprep-card-action" data-roomprep-edit="${esc(v.id)}">
     <div class="roomprep-card-head"><div><strong>${esc(fmtDate(v.date))}${v.time?` · ${esc(v.time)}`:''}</strong><h4>${esc(v.room)}</h4><small>${esc(v.building||'')} ${v.floor?`· ${esc(v.floor)}`:''}</small></div><span class="badge">${esc(v.status)}</span></div>
     <p>${v.people} personne(s)</p><small>${esc(summary(v))}</small>
     <div class="roomprep-card-actions">
       <button type="button" class="ghost small" data-roomprep-edit="${esc(v.id)}">Modifier</button>
       <button type="button" class="ghost small" data-roomprep-print="${esc(v.id)}">Imprimer</button>
       <button type="button" class="danger-lite small" data-roomprep-delete="${esc(v.id)}">Supprimer</button>
     </div>
   </article>`).join(''):'<div class="empty">Aucune préparation à venir.</div>';
 }
 if(ag){
   ag.innerHTML=items.length?items.slice(0,12).map(v=>`<button type="button" class="roomprep-agenda-item" data-roomprep-edit="${esc(v.id)}"><span>${esc(v.date)}${v.time?` · ${esc(v.time)}`:''}</span><strong>${esc(v.room)} — ${v.people} pers.</strong><small>${esc(v.status)}${v.coffee?.enabled?' · ☕ Café':''}</small></button>`).join(''):'<div class="empty">Aucune préparation à venir.</div>';
 }
}
function openPrep(){document.querySelector('.nav-btn[data-view="room-prep"]')?.click();setTimeout(()=>$('roomPrepEditorPanel')?.scrollIntoView({behavior:'smooth'}),50)}
function pronote(){const d=mainDb();window.open(String(d?.settings?.pronoteUrl||'').trim()||'https://www.index-education.com/fr/','_blank','noopener')}
function init(){
 $('rpOtherPrep')?.addEventListener('change',()=>$('rpOtherPrepCommentWrap')?.classList.toggle('hidden',$('rpOtherPrep').value!=='Oui'));
 $('rpCoffee')?.addEventListener('change',toggleCoffeeFields);
 $('rpPeople')?.addEventListener('change',()=>{if($('rpCoffee')?.value==='Oui'&&+($('rpCoffeePeople')?.value||0)<=0)$('rpCoffeePeople').value=+$('rpPeople').value||0});
 window.addEventListener('pst:data-loaded',render);
 window.addEventListener('pst:data-saved',render);
reset();render();$('rpBuilding')?.addEventListener('change',()=>fillF());$('rpFloor')?.addEventListener('change',()=>fillS());$('rpSector')?.addEventListener('change',()=>fillR());$('rpRoom')?.addEventListener('change',toggleOther);$('rpOtherPrep')?.addEventListener('change',()=>$('rpOtherPrepCommentWrap').classList.toggle('hidden',$('rpOtherPrep').value!=='Oui'));document.querySelectorAll('[data-quick-roomprep]').forEach(x=>x.addEventListener('click',openPrep));$('openRoomPrepFromAgenda')?.addEventListener('click',openPrep);$('roomPrepPronote')?.addEventListener('click',pronote);document.addEventListener('click',e=>{
 const del=e.target.closest('[data-roomprep-delete]');if(del){e.preventDefault();e.stopPropagation();deletePrep(del.dataset.roomprepDelete);return}
 const pr=e.target.closest('[data-roomprep-print]');if(pr){e.preventDefault();e.stopPropagation();printPrep(pr.dataset.roomprepPrint);return}
 const edit=e.target.closest('[data-roomprep-edit]');if(edit){e.preventDefault();editPrep(edit.dataset.roomprepEdit)}
});$('roomPrepSave')?.addEventListener('click',save);$('roomPrepReset')?.addEventListener('click',reset)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();window.PSTRoomPrep={render,load,pronote,edit:editPrep,print:printPrep,delete:deletePrep};})();