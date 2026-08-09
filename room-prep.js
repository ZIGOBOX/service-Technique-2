
(()=>{'use strict';
const KEY='pst_room_preps_v106', PRONOTE_KEY='pst_pronote_url_v106';
const $=id=>document.getElementById(id), uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
let editingId='';window.__rpImportedFile=null;

function load(){try{return JSON.parse(localStorage.getItem(KEY))||[]}catch{return[]}}
function saveList(v){localStorage.setItem(KEY,JSON.stringify(v));render()}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function fmtDate(v){if(!v)return'';return new Date(`${v}T12:00:00`).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
function checked(id){return !!$(id)?.checked}
function setChecked(id,v){if($(id))$(id).checked=!!v}

function formData(){
 return {
  id:editingId||uid(),date:$('rpDate').value,time:$('rpTime').value,room:$('rpRoom').value.trim(),requester:$('rpRequester').value.trim(),
  people:Number($('rpPeople').value||0),owner:$('rpOwner').value.trim(),status:$('rpStatus').value,deadlineTime:$('rpDeadlineTime').value,
  layout:$('rpLayout').value,tables:Number($('rpTables').value||0),chairs:Number($('rpChairs').value||0),
  roomSetup:{projector:checked('rpProjector'),screen:checked('rpScreen'),mic:checked('rpMic'),extension:checked('rpExtension'),tablecloth:checked('rpTablecloth'),bins:checked('rpBins'),signage:checked('rpSignage'),pmr:checked('rpPMR')},
  coffee:{coffee:checked('rpCoffee'),decaf:checked('rpDecaf'),tea:checked('rpTea'),water:checked('rpWater'),sugar:checked('rpSugar'),milk:checked('rpMilk'),cups:checked('rpCups'),spoons:checked('rpSpoons'),napkins:checked('rpNapkins'),biscuits:checked('rpBiscuits'),time:$('rpCoffeeTime').value},
  notes:$('rpNotes').value.trim(),sourceDocument:window.__rpImportedFile||null,updatedAt:new Date().toISOString()
 }
}
function reset(){
 editingId='';
 $('rpDate').value=today();$('rpTime').value='';$('rpRoom').value='';$('rpRequester').value='';$('rpPeople').value='10';$('rpOwner').value='';$('rpStatus').value='À préparer';$('rpDeadlineTime').value='';
 $('rpLayout').value='Réunion';$('rpTables').value='0';$('rpChairs').value='0';$('rpCoffeeTime').value='';$('rpNotes').value='';
 ['rpProjector','rpScreen','rpMic','rpExtension','rpTablecloth','rpBins','rpSignage','rpPMR','rpCoffee','rpDecaf','rpTea','rpWater','rpSugar','rpMilk','rpCups','rpSpoons','rpNapkins','rpBiscuits'].forEach(x=>setChecked(x,false));
 const panel=$('roomPrepEditorPanel');panel?.querySelector('h3')&&(panel.querySelector('h3').textContent='Nouvelle préparation');
}
function save(){
 const v=formData();
 if(!v.date||!v.room){alert('Renseignez au minimum la date et la salle / le lieu.');return}
 let arr=load(),i=arr.findIndex(x=>x.id===v.id);
 if(i>=0)arr[i]=v;else arr.push(v);
 arr.sort((a,b)=>`${a.date}T${a.time||'00:00'}`.localeCompare(`${b.date}T${b.time||'00:00'}`));
 saveList(arr);reset();alert('Préparation enregistrée et ajoutée à Agenda personnel.')
}
function edit(id){
 const v=load().find(x=>x.id===id);if(!v)return;editingId=id;
 ['date','time','room','requester','people','owner','status','deadlineTime','layout','tables','chairs','notes'].forEach(k=>{const map={date:'rpDate',time:'rpTime',room:'rpRoom',requester:'rpRequester',people:'rpPeople',owner:'rpOwner',status:'rpStatus',deadlineTime:'rpDeadlineTime',layout:'rpLayout',tables:'rpTables',chairs:'rpChairs',notes:'rpNotes'};if($(map[k]))$(map[k]).value=v[k]??''});
 const rs=v.roomSetup||{},cf=v.coffee||{};
 [['rpProjector','projector'],['rpScreen','screen'],['rpMic','mic'],['rpExtension','extension'],['rpTablecloth','tablecloth'],['rpBins','bins'],['rpSignage','signage'],['rpPMR','pmr']].forEach(([id,k])=>setChecked(id,rs[k]));
 [['rpCoffee','coffee'],['rpDecaf','decaf'],['rpTea','tea'],['rpWater','water'],['rpSugar','sugar'],['rpMilk','milk'],['rpCups','cups'],['rpSpoons','spoons'],['rpNapkins','napkins'],['rpBiscuits','biscuits']].forEach(([id,k])=>setChecked(id,cf[k]));
 $('rpCoffeeTime').value=cf.time||'';
 const panel=$('roomPrepEditorPanel');panel?.querySelector('h3')&&(panel.querySelector('h3').textContent='Modifier la préparation');
 panel?.scrollIntoView({behavior:'smooth'})
}
function del(id){if(!confirm('Supprimer cette préparation ?'))return;saveList(load().filter(x=>x.id!==id))}
function statusClass(s){return s==='Prêt'?'good':s==='Terminé'?'neutral':s==='En préparation'?'warn':'bad'}
function summary(v){
 const roomBits=[v.roomSetup?.projector&&'Vidéoprojecteur',v.roomSetup?.mic&&'Micro',v.tables?`${v.tables} table(s)`:null,v.chairs?`${v.chairs} chaise(s)`:null].filter(Boolean);
 const coffeeBits=[v.coffee?.coffee&&'Café',v.coffee?.tea&&'Thé',v.coffee?.water&&'Eau',v.coffee?.biscuits&&'Biscuits'].filter(Boolean);
 return [roomBits.length?`Salle : ${roomBits.join(', ')}`:'',coffeeBits.length?`Café : ${coffeeBits.join(', ')}`:''].filter(Boolean).join(' · ')
}
function render(){
 const arr=load(),list=$('roomPrepList'),agenda=$('roomPrepAgenda');
 const now=today();
 const upcoming=arr.filter(x=>x.date>=now&&x.status!=='Terminé');
 if(list){
  list.innerHTML=upcoming.length?upcoming.map(v=>`<article class="roomprep-card">
   <div class="roomprep-card-head"><div><strong>${esc(fmtDate(v.date))}${v.time?` · ${esc(v.time)}`:''}</strong><h4>${esc(v.room)}</h4></div><span class="badge ${statusClass(v.status)}">${esc(v.status)}</span></div>
   <p>${esc(v.people)} personne(s)${v.requester?` · Demandeur : ${esc(v.requester)}`:''}${v.owner?` · Responsable : ${esc(v.owner)}`:''}</p>
   <small>${esc(summary(v))}</small>
   <div class="roomprep-card-actions"><button class="ghost small" data-rp-edit="${esc(v.id)}">Modifier</button><button class="ghost small" data-rp-print="${esc(v.id)}">Imprimer</button><button class="danger-lite small" data-rp-del="${esc(v.id)}">Supprimer</button></div>
  </article>`).join(''):'<div class="empty">Aucune préparation à venir.</div>';
  list.querySelectorAll('[data-rp-edit]').forEach(x=>x.onclick=()=>edit(x.dataset.rpEdit));
  list.querySelectorAll('[data-rp-del]').forEach(x=>x.onclick=()=>del(x.dataset.rpDel));
  list.querySelectorAll('[data-rp-print]').forEach(x=>x.onclick=()=>printPrep(x.dataset.rpPrint))
 }
 if(agenda){
  agenda.innerHTML=upcoming.length?upcoming.slice(0,12).map(v=>`<button class="roomprep-agenda-item" data-rp-open="${esc(v.id)}"><span>${esc(v.date)}${v.time?` · ${esc(v.time)}`:''}</span><strong>${esc(v.room)} — ${esc(v.people)} pers.</strong><small>${esc(v.status)}${v.coffee?.coffee?' · ☕ Café':''}</small></button>`).join(''):'<div class="empty">Aucune préparation à venir.</div>';
  agenda.querySelectorAll('[data-rp-open]').forEach(x=>x.onclick=()=>{window.PSTNavigation?.switchView?.('room-prep');setTimeout(()=>edit(x.dataset.rpOpen),50)})
 }
}
function printPrep(id){
 const v=load().find(x=>x.id===id);if(!v)return;
 const w=window.open('','_blank');if(!w)return alert('Autorisez les fenêtres pour imprimer.');
 const yes=x=>x?'✓':'—';
 w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Préparation ${esc(v.room)}</title><style>body{font-family:Arial;margin:28px;color:#152630}h1{margin-bottom:3px}.box{border:1px solid #bbb;border-radius:10px;padding:12px;margin:12px 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}li{margin:5px 0}@media print{button{display:none}}</style></head><body>
 <h1>Préparation de salle & café</h1><p>${esc(fmtDate(v.date))} ${esc(v.time||'')} — <b>${esc(v.room)}</b></p>
 <div class="box"><b>${esc(v.people)} personnes</b> · ${esc(v.status)}<br>Demandeur : ${esc(v.requester||'—')}<br>Responsable : ${esc(v.owner||'—')}</div>
 <div class="grid"><div class="box"><h2>Salle</h2><p>Disposition : ${esc(v.layout)}</p><p>Tables : ${v.tables} · Chaises : ${v.chairs}</p><ul>
 <li>${yes(v.roomSetup?.projector)} Vidéoprojecteur</li><li>${yes(v.roomSetup?.screen)} Écran</li><li>${yes(v.roomSetup?.mic)} Micro</li><li>${yes(v.roomSetup?.extension)} Rallonge</li><li>${yes(v.roomSetup?.tablecloth)} Nappage</li><li>${yes(v.roomSetup?.bins)} Poubelles</li><li>${yes(v.roomSetup?.signage)} Signalétique</li><li>${yes(v.roomSetup?.pmr)} PMR</li></ul></div>
 <div class="box"><h2>Café</h2><p>Mise en place : ${esc(v.coffee?.time||'—')}</p><ul>
 <li>${yes(v.coffee?.coffee)} Café</li><li>${yes(v.coffee?.decaf)} Décaféiné</li><li>${yes(v.coffee?.tea)} Thé</li><li>${yes(v.coffee?.water)} Eau</li><li>${yes(v.coffee?.sugar)} Sucre</li><li>${yes(v.coffee?.milk)} Lait</li><li>${yes(v.coffee?.cups)} Tasses/gobelets</li><li>${yes(v.coffee?.spoons)} Cuillères</li><li>${yes(v.coffee?.napkins)} Serviettes</li><li>${yes(v.coffee?.biscuits)} Biscuits/viennoiseries</li></ul></div></div>
 <div class="box"><h2>Observations</h2><p>${esc(v.notes||'—')}</p></div><script>window.onload=()=>window.print()</script></body></html>`);w.document.close()
}
function pronote(){
 const u=(localStorage.getItem(PRONOTE_KEY)||'').trim()||'https://www.index-education.com/fr/';
 window.open(u,'_blank','noopener')
}

function openRoomPrep(){
 const btn=document.querySelector('.nav-btn[data-view="room-prep"]');
 if(btn){btn.click();setTimeout(()=>{$('roomPrepEditorPanel')?.scrollIntoView({behavior:'smooth'})},80)}
}
async function importRequestFile(file){
 const st=$('rpImportStatus'); if(!file)return;
 if(st)st.textContent=`Document chargé : ${file.name}. Analyse en cours…`;
 // Keep document reference metadata with the draft; browsers cannot persist the file itself safely in localStorage.
 window.__rpImportedFile={name:file.name,type:file.type,size:file.size,lastModified:file.lastModified};
 let text='';
 try{
   if(file.type.startsWith('text/')) text=await file.text();
 }catch(e){}
 // Conservative extraction: only populate obvious date/time/person count patterns from accessible text.
 if(text){
   const dm=text.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](20\d{2})\b/);
   if(dm){$('rpDate').value=`${dm[3]}-${dm[2].padStart(2,'0')}-${dm[1].padStart(2,'0')}`}
   const tm=text.match(/\b([01]?\d|2[0-3])[:h]([0-5]\d)\b/i);
   if(tm)$('rpTime').value=`${tm[1].padStart(2,'0')}:${tm[2]}`;
   const pm=text.match(/\b(\d{1,3})\s*(?:personnes?|pers\.?)\b/i);
   if(pm)$('rpPeople').value=pm[1];
 }
 if(st)st.textContent=`${file.name} chargé. Vérifiez et complétez la fiche avant d’enregistrer. Les informations non détectées ne sont pas inventées.`;
}


function forceOpenRoomPrep(){
 const btn=document.querySelector('.nav-btn[data-view="room-prep"]');
 const target=document.getElementById('room-prep');
 if(btn){ btn.click(); }
 else if(target){
   document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
   target.classList.add('active');
 }
 setTimeout(()=>document.getElementById('roomPrepEditorPanel')?.scrollIntoView({behavior:'smooth'}),60);
}

function init(){
 reset();render();
 const saved=localStorage.getItem(PRONOTE_KEY)||'';
 if($('pronoteUrl'))$('pronoteUrl').value=saved;
 $('pronoteUrl')?.addEventListener('change',e=>localStorage.setItem(PRONOTE_KEY,e.target.value.trim()));

 document.querySelectorAll('[data-quick-roomprep]').forEach(x=>x.addEventListener('click',forceOpenRoomPrep));
 $('rpImportFile')?.addEventListener('change',e=>importRequestFile(e.target.files?.[0]));

 $('openRoomPrepFromAgenda')?.addEventListener('click',forceOpenRoomPrep);
 $('roomPrepPronote')?.addEventListener('click',pronote);
 $('roomPrepSave')?.addEventListener('click',save);
 $('roomPrepReset')?.addEventListener('click',reset);
 $('roomPrepNew')?.addEventListener('click',()=>{reset();$('roomPrepEditorPanel')?.scrollIntoView({behavior:'smooth'})});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.PSTRoomPrep={render,load,pronote};
})();
