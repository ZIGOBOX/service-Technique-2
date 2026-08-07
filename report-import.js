'use strict';

(function(){
  let chronoPending=null, controlPending=null, pdfjsPromise=null;
  const DAY_LETTER=['D','L','M','M','J','V','S'];
  const DEFAULT_CODE_MAP={CA:'Congé annuel',RTT:'RTT',RH:'Repos',RFE:'Jour férié'};
  const CONTROL_ORGS=['APAVE','SOCOTEC','BUREAU VERITAS','VERITAS','DEKRA','QUALICONSULT'];
  const CONTROL_KEYWORDS=['non-conform','non conform','anomal','réserve','reserve','observation','écart','ecart','remarque','défaut','defaut'];

  function ensureData(){
    db.pdfImports=db.pdfImports||[];
    db.chronotimeDaily=db.chronotimeDaily||[];
    db.chronotimeAnnual=db.chronotimeAnnual||[];
    db.reportNonconformities=db.reportNonconformities||[];
    db.settings=db.settings||{};
    db.settings.chronoCodeMap=Object.assign({},DEFAULT_CODE_MAP,db.settings.chronoCodeMap||{});
    db.lists=db.lists||{};
    db.lists.dayTypes=db.lists.dayTypes||[];
    for(const v of ['Jour férié']) if(!db.lists.dayTypes.includes(v)) db.lists.dayTypes.push(v);
  }
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const norm=s=>clean(s).toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const fmtDateTime=v=>v?new Date(v).toLocaleString('fr-FR'):'—';
  const academicFromPeriod=(start,end)=> start&&end?`${start.slice(0,4)}-${end.slice(0,4)}`:'';
  const durationToMinutes=s=>{
    const m=String(s||'').match(/^([+-]?)(\d{1,5})[:h](\d{2})$/i);if(!m)return null;
    const sign=m[1]==='-'?-1:1;return sign*(Number(m[2])*60+Number(m[3]));
  };
  const minutesToDuration=m=>{if(m==null||Number.isNaN(m))return '—';const sign=m<0?'-':m>0?'+':'';m=Math.abs(Math.round(m));return `${sign}${Math.floor(m/60)}h${String(m%60).padStart(2,'0')}`};

  async function pdfjs(){
    if(!pdfjsPromise) pdfjsPromise=import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs').then(lib=>{
      lib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';return lib;
    });
    return pdfjsPromise;
  }
  async function extractPdf(file){
    const lib=await pdfjs();
    const buf=await file.arrayBuffer(), doc=await lib.getDocument({data:buf}).promise;
    const pages=[];
    for(let p=1;p<=doc.numPages;p++){
      const page=await doc.getPage(p), content=await page.getTextContent();
      const rows=new Map();
      for(const it of content.items){
        const str=clean(it.str);if(!str)continue;
        const x=it.transform?.[4]||0,y=it.transform?.[5]||0,key=Math.round(y*2)/2;
        if(!rows.has(key))rows.set(key,[]);rows.get(key).push({x,str});
      }
      const lines=[...rows.entries()].sort((a,b)=>b[0]-a[0]).map(([,items])=>items.sort((a,b)=>a.x-b.x).map(i=>i.str).join(' '));
      pages.push({page:p,lines,text:lines.join('\n')});
    }
    return {pages,text:pages.map(x=>x.text).join('\n')};
  }
  function parseFrDate(s){const m=String(s||'').match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);return m?`${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`:''}
  function findAgent(name){
    const n=norm(name);if(!n)return null;
    return (db.agents||[]).find(a=>{const full=norm(`${a.lastName||''} ${a.firstName||''}`),rev=norm(`${a.firstName||''} ${a.lastName||''}`);return full===n||rev===n||n.includes(norm(a.lastName))||full.includes(n)})||null;
  }
  function monthSequence(start){const y=Number(start.slice(0,4));return Array.from({length:12},(_,i)=>{const n=8+i;return {year:y+Math.floor(n/12),month:(n%12)+1}})}
  function validDate(y,m,d,letter){const dt=new Date(y,m-1,d);return dt.getFullYear()===y&&dt.getMonth()===m-1&&dt.getDate()===d&&DAY_LETTER[dt.getDay()]===letter}
  function parseChronotime(extracted,file){
    const text=extracted.text;
    const nm=text.match(/Nom\s*:\s*([^\n]+)/i);const agentNameRaw=nm?clean(nm[1]):'';
    const pm=text.match(/du\s+(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4})\s+au\s+(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4})/i);
    const start=pm?parseFrDate(pm[1]):'',end=pm?parseFrDate(pm[2]):'';
    const year=academicFromPeriod(start,end), months=start?monthSequence(start):[];
    let totals={presence:null,reference:null,delta:null};
    const totalLine=extracted.pages.flatMap(p=>p.lines).find(l=>/Tps\s*pr/i.test(l));
    if(totalLine){const times=[...totalLine.matchAll(/[+-]?\d{1,5}:\d{2}/g)].map(m=>m[0]);if(times.length>=3){totals.presence=durationToMinutes(times.at(-3));totals.reference=durationToMinutes(times.at(-2));totals.delta=durationToMinutes(times.at(-1));}}
    const records=[];const codes=new Set();
    for(const line of extracted.pages.flatMap(p=>p.lines)){
      const pairs=[...line.matchAll(/\b([LMSJVD])(\d{1,2})\s+(\d{1,2}h\d{2}|[A-ZÀ-Ü]{2,6})\b/g)];
      if(pairs.length<2||!months.length)continue;
      let mi=0;
      for(const p of pairs){const letter=p[1],day=Number(p[2]),value=p[3].toUpperCase();let found=-1;for(let k=mi;k<months.length;k++){const x=months[k];if(validDate(x.year,x.month,day,letter)){found=k;break}}if(found<0)continue;mi=found+1;const x=months[found],date=`${x.year}-${String(x.month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;const duration=/h/i.test(value)?durationToMinutes(value.toLowerCase()):null;if(duration==null)codes.add(value);records.push({date,value,duration});}
    }
    const ignored=new Set(['GFI','CHRONO','TIME','LYCEE','TOTAL','REFERENCE','ECART','TPS','NOM']);
    [...codes].forEach(c=>{if(ignored.has(c))codes.delete(c)});
    return {kind:'chronotime',file,extracted,agentNameRaw,agent:findAgent(agentNameRaw),start,end,academicYear:year,totals,records,codes:[...codes].sort(),unknownCodes:[...codes].filter(c=>!db.settings.chronoCodeMap[c])};
  }
  function controlOrganization(text){const u=text.toUpperCase();return CONTROL_ORGS.find(x=>u.includes(x))||'Organisme de contrôle'}
  function detectControlFamily(text=''){
    const t=normalizeText(text);
    const rules=[
      ['Électricité',['electri','installation electrique','tableau electrique','basse tension','bt ','haute tension','ht ','terre','disjoncteur']],
      ['SSI / Incendie',['ssi','systeme de securite incendie','incendie','alarme incendie','desenfumage','sprinkler']],
      ['Extincteurs',['extincteur','ria','robinet incendie arme']],
      ['Ascenseurs / Levage',['ascenseur','monte charge','elevateur','appareil de levage','levage']],
      ['Gaz',['gaz','chaufferie gaz','installation gaz']],
      ['VMC / Ventilation',['vmc','ventilation','extraction','aeration']],
      ['Équipements sportifs',['equipement sportif','but de football','panier de basket','gymnase','agrès','agres']],
      ['Aires de jeux',['aire de jeux','jeu exterieur','toboggan','balancoire']],
      ['Portes / Portails',['porte automatique','portail','porte coupe feu','porte coupe-feu']],
      ['Eau / Sanitaire',['legionell','eau potable','sanitaire','ecs','eau chaude sanitaire']],
      ['Chauffage',['chauffage','chaudiere','chaufferie','bruleur']],
    ];
    for(const [family,words] of rules){if(words.some(w=>t.includes(normalizeText(w))))return family}
    return 'Autres contrôles';
  }
  function parseControl(extracted,file){
    const lines=extracted.pages.flatMap(p=>p.lines).map(clean).filter(Boolean),text=extracted.text,org=controlOrganization(text);
    const dates=[...text.matchAll(/\b(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4})\b/g)].map(m=>parseFrDate(m[1]));
    const reportDate=dates[0]||todayISO();
    const candidates=[];
    for(let i=0;i<lines.length;i++){
      const l=lines[i],n=norm(l);if(!CONTROL_KEYWORDS.some(k=>n.includes(norm(k))))continue;
      if(/nombre de|total|sommaire|legende|légende/.test(n))continue;
      let txt=l;if(txt.length<70&&lines[i+1]&&!CONTROL_KEYWORDS.some(k=>norm(lines[i+1]).includes(norm(k))))txt+=` ${lines[i+1]}`;
      txt=clean(txt).slice(0,600);if(txt.length<18)continue;if(!candidates.some(x=>norm(x.text)===norm(txt)))candidates.push({id:uid(),text:txt,priority:/danger|grave|urgent|majeur|critique/.test(n)?'Haute':'Normale',action:'À analyser et corriger',selected:true});
    }
    const controlFamily=detectControlFamily(`${file?.name||''} ${extracted?.text||''}`);
    return {kind:'control',file,extracted,organization:org,reportDate,controlFamily,candidates:candidates.slice(0,100)};
  }

  function status(id,text,kind='info'){const e=document.getElementById(id);if(e)e.innerHTML=`<div class="import-message ${kind}">${esc(text)}</div>`}
  function renderCodeMap(){ensureData();const box=document.getElementById('chronoCodeMap');if(!box)return;box.innerHTML=Object.entries(db.settings.chronoCodeMap).sort().map(([k,v])=>`<span class="code-map-item"><strong>${esc(k)}</strong><span>${esc(v)}</span></span>`).join('')||'<p>Aucun code enregistré.</p>'}
  function renderHistory(){ensureData();const box=document.getElementById('pdfImportHistory');if(!box)return;const arr=[...db.pdfImports].filter(x=>x.kind==='chronotime').sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));box.innerHTML=arr.length?`<table><thead><tr><th>Date</th><th>Type</th><th>Fichier</th><th>Agent / organisme</th><th>Année</th><th>Résumé</th></tr></thead><tbody>${arr.map(x=>`<tr><td>${esc(fmtDateTime(x.createdAt))}</td><td>${esc(x.kind==='chronotime'?'Chronotime':'Rapport contrôle')}</td><td>${esc(x.fileName||'')}</td><td>${esc(x.subject||'')}</td><td>${esc(x.academicYear||'—')}</td><td>${esc(x.summary||'')}</td></tr>`).join('')}</tbody></table>`:'<div class="empty-state">Aucune injection PDF.</div>'}
  function currentAcademic(){return academicYearFor(todayISO())}
  function renderDashboard(){ensureData();const box=document.getElementById('chronoDashboard');if(!box)return;const year=currentAcademic();const active=(db.agents||[]).filter(a=>normalizeText(a.status)==='actif');const rows=active.map(a=>{const x=[...db.chronotimeAnnual].filter(r=>String(r.agentId)===String(a.id)&&r.academicYear===year).sort((u,v)=>(v.injectedAt||'').localeCompare(u.injectedAt||''))[0];return {a,x}});box.innerHTML=rows.map(({a,x})=>`<button class="chrono-agent-card" data-go="pdfimports"><strong>${esc(agentName(a))}</strong><span class="chrono-delta ${!x?'none':x.deltaMinutes===0?'ok':Math.abs(x.deltaMinutes)<=300?'warn':'bad'}">${x?minutesToDuration(x.deltaMinutes):'Non injecté'}</span><small>${x?`Présence ${minutesToDuration(x.presenceMinutes).replace(/^\+/,'')} · Réf. ${minutesToDuration(x.referenceMinutes).replace(/^\+/,'')}`:'Aucun PDF Chronotime pour '+year}</small></button>`).join('');const last=[...db.pdfImports].filter(x=>x.kind==='chronotime').sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''))[0];const label=document.getElementById('chronoDashboardUpdated');if(label)label.textContent=last?`Année ${year} · dernière injection ${fmtDateTime(last.createdAt)}`:`Année ${year} · aucune injection`;}

  function chronoPreview(p){
    const box=document.getElementById('chronoPreview');if(!box)return;
    const agentOptionsHtml=(db.agents||[]).filter(a=>a.status!=='Inactif').map(a=>`<option value="${esc(a.id)}" ${p.agent?.id===a.id?'selected':''}>${esc(agentName(a))}</option>`).join('');
    const unknown=p.unknownCodes.length?`<div class="import-warning"><strong>Nouvelles abréviations détectées</strong>${p.unknownCodes.map(c=>`<label>${esc(c)}<select data-chrono-code="${esc(c)}"><option value="">Choisir…</option>${['Congé annuel','RTT','Repos','Jour férié','Maladie','Formation','Autorisation d’absence','Récupération','Autre'].map(v=>`<option>${esc(v)}</option>`).join('')}</select></label>`).join('')}</div>`:'';
    box.innerHTML=`<div class="import-summary"><strong>${esc(p.file.name)}</strong><span>Agent détecté : ${esc(p.agentNameRaw||'—')}</span><span>Période : ${esc(p.start||'—')} → ${esc(p.end||'—')}</span><span>Année scolaire : ${esc(p.academicYear||'—')}</span><span>Jours reconnus : ${p.records.length}</span><span>Présence : ${minutesToDuration(p.totals.presence).replace(/^\+/,'')}</span><span>Référence : ${minutesToDuration(p.totals.reference).replace(/^\+/,'')}</span><span>Δ annuel : <b>${minutesToDuration(p.totals.delta)}</b></span></div><label>Agent à affecter<select id="chronoAgentSelect"><option value="">Choisir…</option>${agentOptionsHtml}</select></label>${unknown}<div class="modal-actions inline-actions"><button class="ghost" id="cancelChronoImport">Annuler</button><button class="primary" id="applyChronoImport">Valider l’injection</button></div>`;
    document.getElementById('cancelChronoImport').onclick=()=>{chronoPending=null;box.innerHTML='';status('chronoImportStatus','Import annulé')};
    document.getElementById('applyChronoImport').onclick=applyChrono;
  }
  async function applyChrono(){
    const p=chronoPending;if(!p)return;const aid=document.getElementById('chronoAgentSelect')?.value;if(!aid){toast('Choisissez l’agent concerné');return}
    for(const c of p.unknownCodes){const v=document.querySelector(`[data-chrono-code="${CSS.escape(c)}"]`)?.value;if(!v){toast(`Définissez l’abréviation ${c}`);return}db.settings.chronoCodeMap[c]=v;}
    const past=p.records.some(r=>r.date<todayISO());if(past&&!confirm('Attention : cet import contient des journées passées. Elles sont normalement verrouillées. Confirmer cette modification exceptionnelle ?'))return;
    let attachment=null;try{attachment=await putFile(p.file,{module:'chronotime',recordId:uid()});db.attachments.push(attachment)}catch(e){console.warn('Archivage PDF Chronotime',e)}
    let absences=0,durations=0;
    for(const r of p.records){
      const mapped=r.duration==null?db.settings.chronoCodeMap[r.value]:'';
      const daily={id:uid(),agentId:aid,date:r.date,value:r.value,durationMinutes:r.duration,dayType:mapped||'',academicYear:p.academicYear,sourceFile:p.file.name,importedAt:new Date().toISOString()};
      const oldDaily=db.chronotimeDaily.find(x=>String(x.agentId)===String(aid)&&x.date===r.date&&x.academicYear===p.academicYear);if(oldDaily)Object.assign(oldDaily,daily,{id:oldDaily.id});else db.chronotimeDaily.push(daily);
      if(r.duration!=null){durations++;continue}
      if(mapped){absences++;let day=db.agentDays.find(x=>String(x.agentId)===String(aid)&&x.date===r.date);if(!day){day={id:uid(),agentId:aid,date:r.date};db.agentDays.push(day)}day.dayType=mapped;day.status='Validée';day.note=`Import Chronotime ${p.file.name}`;day.source='chronotime';if(['Repos','Jour férié'].includes(mapped))day.noReplacementNeeded=true;}
    }
    const annual={id:uid(),agentId:aid,academicYear:p.academicYear,periodStart:p.start,periodEnd:p.end,presenceMinutes:p.totals.presence,referenceMinutes:p.totals.reference,deltaMinutes:p.totals.delta,fileName:p.file.name,attachmentId:attachment?.id||'',injectedAt:new Date().toISOString()};
    const oldAnnual=db.chronotimeAnnual.find(x=>String(x.agentId)===String(aid)&&x.academicYear===p.academicYear);if(oldAnnual)Object.assign(oldAnnual,annual,{id:oldAnnual.id});else db.chronotimeAnnual.push(annual);
    db.pdfImports.push({id:uid(),kind:'chronotime',createdAt:new Date().toISOString(),fileName:p.file.name,attachmentId:attachment?.id||'',subject:agentName(agentById(aid)),academicYear:p.academicYear,summary:`${p.records.length} jours · ${absences} absences · Δ ${minutesToDuration(p.totals.delta)}`});
    save();renderCodeMap();renderHistory();renderDashboard();status('chronoImportStatus',`Injection terminée : ${p.records.length} jours, ${absences} absences, ${durations} durées.`, 'ok');document.getElementById('chronoPreview').innerHTML='';chronoPending=null;
  }
  function controlPreview(p){
    const box=document.getElementById('controlPreview');if(!box)return;const list=p.candidates.length?p.candidates.map((c,i)=>`<label class="control-candidate"><input type="checkbox" data-control-select="${i}" checked><span><strong>Non-conformité ${i+1}</strong><small>${esc(c.text)}</small></span><select data-control-priority="${i}">${['Basse','Normale','Haute','Urgente'].map(v=>`<option ${v===c.priority?'selected':''}>${v}</option>`).join('')}</select></label>`).join(''):'<div class="empty-state">Aucune non-conformité clairement détectée. Vous pouvez archiver le rapport sans créer d’intervention.</div>';
    box.innerHTML=`<div class="import-summary"><strong>${esc(p.file.name)}</strong><span>Organisme : ${esc(p.organization)}</span><span>Classement : <b>${esc(p.controlFamily||'Autres contrôles')}</b></span><span>Date détectée : ${fmtDate(p.reportDate)}</span><span>Non-conformités proposées : ${p.candidates.length}</span></div><label>Famille du contrôle<select id="controlFamilySelect">${['Électricité','SSI / Incendie','Extincteurs','Ascenseurs / Levage','Gaz','VMC / Ventilation','Équipements sportifs','Aires de jeux','Portes / Portails','Eau / Sanitaire','Chauffage','Autres contrôles'].map(v=>`<option ${v===p.controlFamily?'selected':''}>${esc(v)}</option>`).join('')}</select></label><label class="inline-check"><input type="checkbox" id="controlCreateMaintenance" checked> Créer une intervention de maintenance pour chaque non-conformité validée</label><div class="control-candidate-list">${list}</div><div class="modal-actions inline-actions"><button class="ghost" id="cancelControlImport">Annuler</button><button class="primary" id="applyControlImport">Valider le rapport</button></div>`;
    document.getElementById('cancelControlImport').onclick=()=>{controlPending=null;box.innerHTML='';status('controlImportStatus','Import annulé')};document.getElementById('applyControlImport').onclick=applyControl;
  }
  async function applyControl(){
    const p=controlPending;if(!p)return;const selected=p.candidates.filter((c,i)=>document.querySelector(`[data-control-select="${i}"]`)?.checked);const createMaint=document.getElementById('controlCreateMaintenance')?.checked;const controlFamily=document.getElementById('controlFamilySelect')?.value||p.controlFamily||'Autres contrôles';
    let attachment=null;try{attachment=await putFile(p.file,{module:'control-report',recordId:uid()});db.attachments.push(attachment)}catch(e){console.warn('Archivage rapport contrôle',e)}
    let created=0;
    selected.forEach((c,i)=>{const pri=document.querySelector(`[data-control-priority="${p.candidates.indexOf(c)}"]`)?.value||c.priority;const nc={id:uid(),no:`NC-${String((db.reportNonconformities?.length||0)+1).padStart(4,'0')}`,organization:p.organization,controlFamily,reportDate:p.reportDate,text:c.text,priority:pri,status:'À traiter',sourceFile:p.file.name,attachmentId:attachment?.id||'',createdAt:new Date().toISOString()};db.reportNonconformities.push(nc);if(createMaint){db.maintenance.push({id:uid(),no:nextNo('maintenance','MAI'),date:p.reportDate||todayISO(),title:`Non-conformité ${p.organization} - ${controlFamily}`,family:controlFamily,priority:pri,status:'À faire',building:'',floor:'',room:'',requester:p.organization,assigned:'',dueDate:'',cost:0,description:c.text,action:'À corriger puis faire lever la non-conformité',attachments:attachment?[attachment]:[],sourceNonconformityId:nc.id});created++;}});
    db.pdfImports.push({id:uid(),kind:'control',createdAt:new Date().toISOString(),fileName:p.file.name,attachmentId:attachment?.id||'',subject:p.organization,controlFamily,reportDate:p.reportDate,academicYear:academicYearFor(p.reportDate||todayISO()),summary:`${selected.length} non-conformité(s) validée(s) · ${created} intervention(s)`});save();renderHistory();renderControlLibrary();status('controlImportStatus',`Rapport validé : ${selected.length} non-conformité(s), ${created} intervention(s) créée(s).`,'ok');document.getElementById('controlPreview').innerHTML='';controlPending=null;renderAll();
  }
  const CONTROL_FAMILIES=['Électricité','SSI / Incendie','Extincteurs','Ascenseurs / Levage','Gaz','VMC / Ventilation','Équipements sportifs','Aires de jeux','Portes / Portails','Eau / Sanitaire','Chauffage','Autres contrôles'];
  function effectiveControlFamily(x){return x.controlFamily||detectControlFamily(`${x.fileName||''} ${x.subject||''} ${x.summary||''}`)}
  function renderControlFamilyFilter(){const sel=document.getElementById('controlReportFamily');if(!sel)return;const cur=sel.value;const families=[...new Set([...CONTROL_FAMILIES,...(db.pdfImports||[]).filter(x=>x.kind==='control').map(effectiveControlFamily)])];sel.innerHTML='<option value="">Toutes les familles</option>'+families.map(f=>`<option ${f===cur?'selected':''}>${esc(f)}</option>`).join('')}
  function renderControlLibrary(){ensureData();renderControlFamilyFilter();const box=document.getElementById('controlReportLibrary');if(!box)return;const filter=document.getElementById('controlReportFamily')?.value||'';const reports=[...db.pdfImports].filter(x=>x.kind==='control'&&(!filter||effectiveControlFamily(x)===filter)).sort((a,b)=>(b.reportDate||b.createdAt||'').localeCompare(a.reportDate||a.createdAt||''));if(!reports.length){box.innerHTML='<div class="empty-state">Aucun rapport de contrôle enregistré.</div>';return}const groups={};for(const r of reports){const f=effectiveControlFamily(r);(groups[f]||(groups[f]=[])).push(r)}box.innerHTML=Object.entries(groups).map(([family,arr])=>`<section class="control-report-group"><div class="control-report-group-title"><h4>${esc(family)}</h4><span>${arr.length} rapport(s)</span></div><div class="control-report-cards">${arr.map(r=>`<article class="control-report-card"><div><strong>${esc(r.fileName||'Rapport')}</strong><small>${esc(r.subject||'Organisme non renseigné')} · ${fmtDate(r.reportDate)||fmtDateTime(r.createdAt)}</small><p>${esc(r.summary||'')}</p></div><div class="control-report-actions">${r.attachmentId?`<button class="primary small" data-open-control-report="${esc(r.attachmentId)}">📄 Ouvrir le PDF</button>`:'<span class="muted">PDF non disponible</span>'}</div></article>`).join('')}</div></section>`).join('')}
  async function openControlReport(id){if(!id)return;try{if(typeof downloadAttachment==='function')await downloadAttachment(id);else{const rec=(db.attachments||[]).find(a=>a.id===id);if(rec&&typeof openStoragePath==='function')await openStoragePath(rec.storagePath,rec.name)}}catch(e){console.error(e);toast?.('Impossible d’ouvrir ce rapport') }}
  async function onChronoFile(file){if(!file)return;ensureData();status('chronoImportStatus','Lecture du PDF en cours…');try{const ex=await extractPdf(file);chronoPending=parseChronotime(ex,file);status('chronoImportStatus',chronoPending.agentNameRaw?'PDF Chronotime reconnu. Vérifiez puis validez.':'PDF lu, mais le nom de l’agent n’a pas été reconnu.','ok');chronoPreview(chronoPending)}catch(e){console.error(e);status('chronoImportStatus',`Impossible de lire ce PDF : ${e.message||e}`,'error')}}
  async function onControlFile(file){if(!file)return;ensureData();status('controlImportStatus','Analyse du rapport en cours…');try{const ex=await extractPdf(file);controlPending=parseControl(ex,file);status('controlImportStatus',`Rapport ${controlPending.organization} analysé. Vérifiez les éléments proposés.`,'ok');controlPreview(controlPending)}catch(e){console.error(e);status('controlImportStatus',`Impossible de lire ce PDF : ${e.message||e}`,'error')}}
  function bind(){const c=document.getElementById('chronoPdfFile'),r=document.getElementById('controlPdfFile'),f=document.getElementById('controlReportFamily');if(c)c.addEventListener('change',e=>onChronoFile(e.target.files?.[0]));if(r)r.addEventListener('change',e=>onControlFile(e.target.files?.[0]));if(f)f.addEventListener('change',renderControlLibrary);document.addEventListener('click',e=>{const open=e.target.closest('[data-open-control-report]');if(open){e.preventDefault();openControlReport(open.dataset.openControlReport);return}const go=e.target.closest('[data-go="pdfimports"]');if(go){e.preventDefault();setView('pdfimports');renderHistory();renderCodeMap();}})}
  function init(){ensureData();bind();renderHistory();renderCodeMap();renderDashboard();renderControlLibrary()}
  window.PDFImportModule={init,renderHistory,renderCodeMap,renderDashboard,renderControlLibrary};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
