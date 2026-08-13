(()=>{'use strict';
const $=id=>document.getElementById(id),uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);let editingId='';
const mainDb=()=>window.PSTMainState?.get?.()||null;
const load=()=>{const d=mainDb();return d&&Array.isArray(d.roomPreps)?d.roomPreps:[]};
const saveList=v=>{const d=mainDb();if(!d){console.warn('État principal indisponible');return false}d.roomPreps=Array.isArray(v)?v:[];window.PSTMainState?.save?.(false);render();try{window.dispatchEvent(new Event('pst:data-saved'))}catch(_){}return true};
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
function reset(){editingId='';$('rpDate').value=today();$('rpTime').value='';$('rpRequester').value='';$('rpPeople').value=10;$('rpOwner').value='';$('rpStatus').value='À préparer';$('rpDeadlineTime').value='';$('rpLayout').value='Réunion';$('rpTables').value=0;$('rpChairs').value=0;$('rpPartition').value='Non';$('rpOtherPrep').value='Non';$('rpOtherPrepComment').value='';$('rpOtherPrepCommentWrap').classList.add('hidden');$('rpCoffee').value='Non';$('rpCoffeePeople').value=0;$('rpCoffeeTime').value='';$('rpCoffeeComment').value='';$('rpNotes').value='';['rpProjector','rpScreen','rpMic','rpExtension','rpTablecloth','rpBins','rpSignage','rpPMR'].forEach(id=>$(id).checked=false);fillB()}
function save(){const v=data();if(!v.date||!v.room)return alert('Renseignez la date et le lieu.');let a=load(),i=a.findIndex(x=>x.id===v.id);if(i>=0)a[i]=v;else a.push(v);a.sort((x,y)=>`${x.date}T${x.time||'00:00'}`.localeCompare(`${y.date}T${y.time||'00:00'}`));saveList(a);reset();alert('Préparation enregistrée et ajoutée à Agenda personnel.')}

function editPrep(id){
 const v=load().find(x=>String(x.id)===String(id));if(!v)return;
 editingId=v.id;
 $('rpDate').value=v.date||today();$('rpTime').value=v.time||'';$('rpRequester').value=v.requester||'';$('rpPeople').value=v.people||10;$('rpOwner').value=v.owner||'';$('rpStatus').value=v.status||'À préparer';$('rpDeadlineTime').value=v.deadlineTime||'';$('rpLayout').value=v.layout||'Réunion';$('rpTables').value=v.tables||0;$('rpChairs').value=v.chairs||0;$('rpPartition').value=v.partition||'Non';$('rpOtherPrep').value=v.otherPrep||'Non';$('rpOtherPrepComment').value=v.otherPrepComment||'';$('rpOtherPrepCommentWrap')?.classList.toggle('hidden',(v.otherPrep||'Non')!=='Oui');$('rpCoffee').value=v.coffee?.enabled?'Oui':'Non';$('rpCoffeePeople').value=v.coffee?.people||0;$('rpCoffeeTime').value=v.coffee?.time||'';$('rpCoffeeComment').value=v.coffee?.comment||'';$('rpNotes').value=v.notes||'';
 ['projector','screen','mic','extension','tablecloth','bins','signage','pmr'].forEach(k=>{const id='rp'+k.charAt(0).toUpperCase()+k.slice(1);if($(id))$(id).checked=!!v.roomSetup?.[k]});
 const d=ref();let bi=d.findIndex(b=>b.name===v.building);if(bi<0)bi=0;fillB({building:bi});let b=d[bi],fi=(b?.floors||[]).findIndex(f=>f.name===v.floor);if(fi<0)fi=0;fillF({floor:fi});let f=b?.floors?.[fi],si=(f?.sectors||[]).findIndex(s=>s.name===v.sector);if(si<0)si=0;fillS({sector:si});let s=f?.sectors?.[si],ri=(s?.rooms||[]).findIndex(rr=>rr.id===v.roomId||roomLabel(rr)===v.room);if(ri<0)ri=0;fillR({room:ri});
 $('roomPrepEditorPanel')?.scrollIntoView({behavior:'smooth',block:'start'})
}
function summary(v){return [`${v.tables||0} table(s)`,`${v.chairs||0} chaise(s)`,v.partition==='Oui'?'Cloison ouverte':'',v.coffee?.enabled?`Café ${v.coffee.people||v.people||0} pers.`:''].filter(Boolean).join(' · ')}

function deletePrep(id){
 const v=load().find(x=>String(x.id)===String(id));if(!v)return;
 if(!confirm(`Supprimer la demande ${v.room||'salle / café'} du ${fmtDate(v.date)} ?`))return;
 saveList(load().filter(x=>String(x.id)!==String(id)));
 if(String(editingId)===String(id))reset();
}
function printPrep(id){
 const v=load().find(x=>String(x.id)===String(id));if(!v)return;
 const yes=x=>x?'Oui':'Non';
 const w=window.open('','_blank');
 if(!w){alert("L'impression a été bloquée par le navigateur. Autorisez les fenêtres pour ce site puis réessayez.");return}
 const roomSetup=v.roomSetup||{}, coffee=v.coffee||{};
 const equipment=[
   ['Vidéoprojecteur',roomSetup.projector],['Écran',roomSetup.screen],['Micro',roomSetup.mic],
   ['Rallonge',roomSetup.extension],['Nappe',roomSetup.tablecloth],['Poubelles',roomSetup.bins],
   ['Signalétique',roomSetup.signage],['PMR',roomSetup.pmr]
 ].filter(x=>x[1]).map(x=>x[0]).join(', ')||'Aucun équipement particulier';
 w.document.open();
 w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Préparation salle & café</title>
 <style>
 body{font-family:Arial,sans-serif;color:#183247;margin:28px}h1{margin:0 0 5px;font-size:24px}h2{font-size:16px;margin:18px 0 8px;color:#235b79}
 .head{border-bottom:3px solid #169ad2;padding-bottom:12px}.muted{color:#667b88}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
 .box{border:1px solid #cfdce5;border-radius:10px;padding:12px;background:#f8fbfd}.box p{margin:5px 0}
 .full{grid-column:1/-1}.strong{font-weight:700}.coffee{border-left:5px solid #b77b1b}
 @media print{body{margin:12mm}.no-print{display:none}}
 </style></head><body>
 <div class="head"><h1>Préparation de salle & café</h1><div class="muted">${esc(fmtDate(v.date))}${v.time?` · ${esc(v.time)}`:''}</div></div>
 <div class="grid">
  <div class="box"><h2>Lieu</h2><p><b>${esc(v.room||'—')}</b></p><p>${esc(v.building||'')} ${v.floor?`· ${esc(v.floor)}`:''} ${v.sector?`· ${esc(v.sector)}`:''}</p></div>
  <div class="box"><h2>Demande</h2><p>Demandeur : <b>${esc(v.requester||'—')}</b></p><p>Responsable : ${esc(v.owner||'—')}</p><p>Statut : ${esc(v.status||'—')}</p></div>
  <div class="box"><h2>Mise en place salle</h2><p>Disposition : ${esc(v.layout||'—')}</p><p>Personnes : ${Number(v.people||0)}</p><p>Tables : ${Number(v.tables||0)} · Chaises : ${Number(v.chairs||0)}</p><p>Ouvrir cloison salle polyvalente : <b>${esc(v.partition||'Non')}</b></p><p>Équipements : ${esc(equipment)}</p></div>
  <div class="box coffee"><h2>Café</h2><p>Café à prévoir : <b>${yes(!!coffee.enabled)}</b></p><p>Nombre de personnes : ${Number(coffee.people||0)}</p><p>Heure de mise en place : ${esc(coffee.time||'—')}</p><p>Commentaire : ${esc(coffee.comment||'—')}</p></div>
  <div class="box full"><h2>Autre préparation</h2><p>${esc(v.otherPrep||'Non')}${v.otherPrepComment?` — ${esc(v.otherPrepComment)}`:''}</p></div>
  <div class="box full"><h2>Observations</h2><p>${esc(v.notes||'—')}</p></div>
 </div>
 <script>window.onload=()=>setTimeout(()=>window.print(),150)</script>
 </body></html>`);
 w.document.close();
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
 window.addEventListener('pst:data-loaded',render);
 window.addEventListener('pst:data-saved',render);
reset();render();$('rpBuilding')?.addEventListener('change',()=>fillF());$('rpFloor')?.addEventListener('change',()=>fillS());$('rpSector')?.addEventListener('change',()=>fillR());$('rpRoom')?.addEventListener('change',toggleOther);$('rpOtherPrep')?.addEventListener('change',()=>$('rpOtherPrepCommentWrap').classList.toggle('hidden',$('rpOtherPrep').value!=='Oui'));document.querySelectorAll('[data-quick-roomprep]').forEach(x=>x.addEventListener('click',openPrep));$('openRoomPrepFromAgenda')?.addEventListener('click',openPrep);$('roomPrepPronote')?.addEventListener('click',pronote);document.addEventListener('click',e=>{
 const del=e.target.closest('[data-roomprep-delete]');if(del){e.preventDefault();e.stopPropagation();deletePrep(del.dataset.roomprepDelete);return}
 const pr=e.target.closest('[data-roomprep-print]');if(pr){e.preventDefault();e.stopPropagation();printPrep(pr.dataset.roomprepPrint);return}
 const edit=e.target.closest('[data-roomprep-edit]');if(edit){e.preventDefault();editPrep(edit.dataset.roomprepEdit)}
});$('roomPrepSave')?.addEventListener('click',save);$('roomPrepReset')?.addEventListener('click',reset)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();window.PSTRoomPrep={render,load,pronote,edit:editPrep,print:printPrep,delete:deletePrep};})();