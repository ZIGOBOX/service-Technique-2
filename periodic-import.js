/* Pilotage Service Technique V147.169 — matrice import/export des contrôles périodiques */
(() => {
  'use strict';

  let pending=null;
  const $i=id=>document.getElementById(id);
  const norm=v=>String(v??'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const text=v=>String(v??'').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>{
    if(v===null||v===undefined||String(v).trim()==='')return 0;
    const n=Number(String(v).replace(',','.'));
    return Number.isFinite(n)?n:NaN;
  };
  const isoDate=v=>{
    if(!v)return '';
    if(v instanceof Date&&!isNaN(v))return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
    if(typeof v==='number'&&window.XLSX?.SSF){const d=XLSX.SSF.parse_date_code(v);if(d)return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;}
    const s=String(v).trim();
    let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
    m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);if(m)return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    return '';
  };
  const timeText=v=>{
    if(v===null||v===undefined||v==='')return '';
    if(typeof v==='number'){
      if(v>=0&&v<1){const mins=Math.round(v*24*60)%1440;return `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;}
      const s=String(Math.round(v)).padStart(4,'0');return `${s.slice(0,2)}:${s.slice(-2)}`;
    }
    const s=String(v).trim();const m=s.match(/^(\d{1,2})[:hH](\d{2})/);return m?`${m[1].padStart(2,'0')}:${m[2]}`:'';
  };
  const get=(row,...names)=>{
    for(const n of names)if(Object.prototype.hasOwnProperty.call(row,n))return row[n];
    const keys=Object.keys(row);
    for(const n of names){const k=keys.find(k=>norm(k)===norm(n));if(k)return row[k];}
    return '';
  };
  const setWidths=(ws,widths)=>ws['!cols']=widths.map(w=>({wch:w}));
  const styleSheet=(ws,headerCount,rows)=>{
    ws['!freeze']={xSplit:0,ySplit:1,topLeftCell:'A2',activePane:'bottomLeft',state:'frozen'};
    for(let c=0;c<headerCount;c++){
      const a=XLSX.utils.encode_cell({r:0,c});
      if(ws[a])ws[a].s={font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1F4E78'}},alignment:{horizontal:'center',vertical:'center',wrapText:true}};
    }
    for(let r=1;r<rows;r++)for(let c=0;c<headerCount;c++){
      const a=XLSX.utils.encode_cell({r,c});
      if(ws[a])ws[a].s={fill:{fgColor:{rgb:r%2?'F7FAFC':'FFFFFF'}},alignment:{vertical:'top',wrapText:c>=14}};
    }
  };
  const computedDue=x=>{
    try{return typeof periodicDue==='function'?periodicDue(x):(x.nextDate||'');}catch(_){return x.nextDate||'';}
  };
  const computedState=x=>{
    try{return typeof periodicComputed==='function'?periodicComputed(x):(x.status||'');}catch(_){return x.status||'';}
  };
  const historyRows=x=>{
    try{return typeof periodicHistoryRows==='function'?periodicHistoryRows(x):(Array.isArray(x.history)?x.history:[]);}catch(_){return Array.isArray(x.history)?x.history:[];}
  };
  const historySummary=x=>historyRows(x).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).map(h=>[h.date,h.provider].filter(Boolean).join(' · ')).join(' | ');

  function exportMatrix(){
    if(!window.XLSX){alert('Le composant Excel ne s’est pas chargé. Vérifiez la connexion Internet, puis réessayez.');return;}
    const wb=XLSX.utils.book_new();
    const rows=(db.periodic||[]).slice().sort((a,b)=>String(a.no||a.name||'').localeCompare(String(b.no||b.name||''),'fr')).map(x=>({
      'Identifiant contrôle':x.id||'',
      'N° contrôle':x.no||'',
      'Contrôle':x.name||'',
      'Famille':x.family||'',
      'Bâtiment':x.building||'',
      'Étage / niveau':x.floor||'',
      'Secteur':x.sector||'',
      'Local / zone':x.room||'',
      'Périodicité (mois)':Number(x.intervalMonths||0),
      'Périodicité / précision':x.periodicityText||'',
      'Dernier contrôle':x.lastDate||'',
      'Prochaine échéance':x.nextDate||'',
      'Échéance calculée / affichée':computedDue(x)||'',
      'Heure prévue':x.time||'',
      'Statut':x.status||'',
      'Prestataire / responsable':x.provider||'',
      'Registre / dossier':x.register||'',
      'Exigence / contenu':x.requirement||'',
      'Lien OneDrive':x.oneDriveUrl||'',
      'Notes':x.notes||'',
      'État calculé':computedState(x)||'',
      'Historique existant (lecture)':historySummary(x),
      'Contrôle import':'OK'
    }));
    const blank={
      'Identifiant contrôle':'','N° contrôle':'','Contrôle':'','Famille':'','Bâtiment':'','Étage / niveau':'','Secteur':'','Local / zone':'',
      'Périodicité (mois)':12,'Périodicité / précision':'','Dernier contrôle':'','Prochaine échéance':'','Échéance calculée / affichée':'','Heure prévue':'','Statut':'À planifier',
      'Prestataire / responsable':'','Registre / dossier':'Registre de sécurité','Exigence / contenu':'','Lien OneDrive':'','Notes':'','État calculé':'','Historique existant (lecture)':'','Contrôle import':'À compléter'
    };
    const data=rows.length?rows:[blank];
    const ws=XLSX.utils.json_to_sheet(data);
    const headers=Object.keys(data[0]);
    setWidths(ws,[26,17,42,26,24,18,22,22,20,28,17,18,23,15,18,30,28,45,42,45,18,60,20]);
    ws['!autofilter']={ref:ws['!ref']};styleSheet(ws,headers.length,data.length+1);
    XLSX.utils.book_append_sheet(wb,ws,'Contrôles périodiques');

    const hist=[];
    for(const x of (db.periodic||[]))for(const h of historyRows(x))hist.push({
      'Identifiant contrôle':x.id||'',
      'N° contrôle':x.no||'',
      'Contrôle':x.name||'',
      'Date passage':h.date||'',
      'Prestataire':h.provider||'',
      'Source':h.source||'',
      'Note':h.note||''
    });
    const wsH=XLSX.utils.json_to_sheet(hist.length?hist:[{'Identifiant contrôle':'','N° contrôle':'','Contrôle':'','Date passage':'','Prestataire':'','Source':'','Note':''}]);
    setWidths(wsH,[26,17,42,17,30,34,55]);wsH['!autofilter']={ref:wsH['!ref']};styleSheet(wsH,7,hist.length+1);XLSX.utils.book_append_sheet(wb,wsH,'Historique - lecture');

    const instructions=[
      ['MATRICE DES CONTRÔLES PÉRIODIQUES — PILOTAGE SERVICE TECHNIQUE'],
      ['1. La feuille « Contrôles périodiques » contient automatiquement les contrôles actuellement enregistrés dans le logiciel.'],
      ['2. Corrigez directement les informations nécessaires dans cette feuille puis réimportez le même fichier.'],
      ['3. Ne modifiez pas la colonne « Identifiant contrôle » pour une ligne existante : elle permet de mettre à jour exactement le bon contrôle.'],
      ['4. Vous pouvez laisser l’identifiant vide uniquement pour AJOUTER un nouveau contrôle.'],
      ['5. Une ligne supprimée du fichier Excel ne supprime jamais un contrôle déjà présent dans le logiciel.'],
      ['6. Avant validation, Pilotage affiche les lignes identiques, modifiées, nouvelles et les éventuelles erreurs. Aucune donnée n’est appliquée avant votre validation.'],
      ['7. La feuille « Historique - lecture » est fournie pour contrôle visuel. Elle n’est pas utilisée pour supprimer ou réécrire l’historique.'],
      ['8. Si vous modifiez « Dernier contrôle », l’ancienne date est conservée dans l’historique et la nouvelle date y est ajoutée automatiquement.'],
      ['9. « Échéance calculée / affichée », « État calculé », « Historique existant (lecture) » et « Contrôle import » sont des colonnes d’information : elles ne pilotent pas les données.']
    ];
    const wsM=XLSX.utils.aoa_to_sheet(instructions);setWidths(wsM,[120]);
    if(wsM.A1)wsM.A1.s={font:{bold:true,color:{rgb:'FFFFFF'},sz:16},fill:{fgColor:{rgb:'1F4E78'}},alignment:{horizontal:'center'}};
    XLSX.utils.book_append_sheet(wb,wsM,'Mode d’emploi');
    wb.Workbook={Views:[{RTL:false}]};
    const fileName=`Matrice_Controles_Periodiques_${new Date().toISOString().slice(0,10)}.xlsx`;
    const dataOut=XLSX.write(wb,{bookType:'xlsx',type:'array',compression:true,bookSST:true});
    const blob=new Blob([dataOut],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    if(typeof triggerDownloadBlob==='function')triggerDownloadBlob(fileName,blob);else XLSX.writeFile(wb,fileName);
  }

  const recordMap=()=>{
    const byId=new Map(),byNo=new Map(),bySignature=new Map();
    for(const x of (db.periodic||[])){
      if(x.id)byId.set(String(x.id),x);
      if(text(x.no))byNo.set(norm(x.no),x);
      const sig=[x.name,x.family,x.building].map(norm).join('|');if(norm(x.name))bySignature.set(sig,x);
    }
    return {byId,byNo,bySignature};
  };
  const normalizedRecordFromRow=(row,index,maps)=>{
    const errors=[],warnings=[];
    const id=text(get(row,'Identifiant contrôle','ID contrôle','Identifiant'));
    const no=text(get(row,'N° contrôle','No contrôle','Numéro contrôle','Numero controle'));
    const name=text(get(row,'Contrôle','Controle','Nom du contrôle','Nom du controle'));
    const family=text(get(row,'Famille'));
    const building=text(get(row,'Bâtiment','Batiment'));
    const floor=text(get(row,'Étage / niveau','Etage / niveau','Étage','Etage'));
    const sector=text(get(row,'Secteur'));
    const room=text(get(row,'Local / zone','Local','Zone'));
    const intervalRaw=get(row,'Périodicité (mois)','Periodicite (mois)','Périodicité mois','Periodicite mois');
    const intervalMonths=num(intervalRaw);
    const periodicityText=text(get(row,'Périodicité / précision','Periodicite / precision','Périodicité','Periodicite'));
    const lastRaw=get(row,'Dernier contrôle','Dernier controle');
    const nextRaw=get(row,'Prochaine échéance','Prochaine echeance');
    const lastDate=String(lastRaw).trim()===''?'':isoDate(lastRaw);
    const nextDate=String(nextRaw).trim()===''?'':isoDate(nextRaw);
    const timeRaw=get(row,'Heure prévue','Heure prevue','Heure');
    const time=String(timeRaw).trim()===''?'':timeText(timeRaw);
    const status=text(get(row,'Statut'))||'À planifier';
    const provider=text(get(row,'Prestataire / responsable','Prestataire','Responsable'));
    const register=text(get(row,'Registre / dossier','Registre','Dossier'));
    const requirement=text(get(row,'Exigence / contenu','Exigence','Contenu'));
    const oneDriveUrl=text(get(row,'Lien OneDrive','OneDrive','Lien'));
    const notes=text(get(row,'Notes','Commentaire'));

    let existing=null;
    if(id){existing=maps.byId.get(id)||null;if(!existing)errors.push('Identifiant de contrôle inconnu : ne modifiez pas l’identifiant exporté');}
    if(!existing&&no)existing=maps.byNo.get(norm(no))||null;
    if(!existing&&name){existing=maps.bySignature.get([name,family,building].map(norm).join('|'))||null;}
    if(!name)errors.push('Nom du contrôle manquant');
    if(Number.isNaN(intervalMonths)||intervalMonths<0)errors.push('Périodicité en mois invalide');
    if(String(lastRaw).trim()&&!lastDate)errors.push('Date du dernier contrôle invalide');
    if(String(nextRaw).trim()&&!nextDate)errors.push('Date de prochaine échéance invalide');
    if(String(timeRaw).trim()&&!time)errors.push('Heure prévue invalide');
    if(lastDate&&nextDate&&nextDate<lastDate)warnings.push('La prochaine échéance est antérieure au dernier contrôle');
    if(building&&Array.isArray(db.buildings)&&!db.buildings.some(b=>norm(b.name)===norm(building))&&norm(building)!=='tous batiments')warnings.push('Bâtiment non présent dans le référentiel : valeur conservée');
    if(family&&Array.isArray(db.lists?.periodicFamilies)&&!db.lists.periodicFamilies.some(v=>norm(v)===norm(family)))warnings.push('Nouvelle famille : elle sera ajoutée au référentiel');

    const values={
      no,name,family,building,floor,sector,room,
      intervalMonths:Number.isNaN(intervalMonths)?0:intervalMonths,periodicityText,lastDate,nextDate,time,status,provider,register,requirement,oneDriveUrl,notes
    };
    const fields=['no','name','family','building','floor','sector','room','intervalMonths','periodicityText','lastDate','nextDate','time','status','provider','register','requirement','oneDriveUrl','notes'];
    const changes=[];
    if(existing){for(const f of fields){const a=f==='intervalMonths'?Number(existing[f]||0):String(existing[f]??'').trim();const b=f==='intervalMonths'?Number(values[f]||0):String(values[f]??'').trim();if(a!==b)changes.push({field:f,from:a,to:b});}}
    const action=errors.length?'Erreur':existing?(changes.length?'Modifier':'Identique'):'Créer';
    return {line:index+2,id,existing,values,changes,errors,warnings,action};
  };

  function validateWorkbook(wb){
    const ws=wb.Sheets['Contrôles périodiques']||wb.Sheets['Controles periodiques']||wb.Sheets[wb.SheetNames[0]];
    if(!ws)return {results:[],valid:[],fatal:'Feuille « Contrôles périodiques » introuvable.'};
    const rows=XLSX.utils.sheet_to_json(ws,{defval:'',raw:true});const maps=recordMap();
    const results=[];
    rows.forEach((row,index)=>{
      if(Object.values(row).every(v=>String(v).trim()===''))return;
      results.push(normalizedRecordFromRow(row,index,maps));
    });
    const valid=results.filter(x=>!x.errors.length&&x.action!=='Identique');
    return {results,valid,fatal:''};
  }
  const fieldLabels={no:'N° contrôle',name:'Contrôle',family:'Famille',building:'Bâtiment',floor:'Étage / niveau',sector:'Secteur',room:'Local / zone',intervalMonths:'Périodicité',periodicityText:'Précision',lastDate:'Dernier contrôle',nextDate:'Prochaine échéance',time:'Heure',status:'Statut',provider:'Prestataire',register:'Registre',requirement:'Exigence',oneDriveUrl:'OneDrive',notes:'Notes'};
  const preview=data=>{
    pending=data;
    const box=$i('periodicImportPreview'),sum=$i('periodicImportSummary'),btn=$i('confirmPeriodicImport');if(!box||!sum||!btn)return;
    if(data.fatal){sum.className='import-summary';sum.innerHTML=`<div class="import-stat error"><strong>Erreur</strong><span>${data.fatal}</span></div>`;box.innerHTML='';btn.classList.add('hidden');return;}
    const created=data.results.filter(x=>x.action==='Créer'),updated=data.results.filter(x=>x.action==='Modifier'),same=data.results.filter(x=>x.action==='Identique'),errors=data.results.filter(x=>x.errors.length),warnings=data.results.filter(x=>!x.errors.length&&x.warnings.length);
    sum.className='import-summary';sum.innerHTML=`<div class="import-stat ok"><strong>${updated.length}</strong><span>à modifier</span></div><div class="import-stat ok"><strong>${created.length}</strong><span>à créer</span></div><div class="import-stat"><strong>${same.length}</strong><span>identiques</span></div><div class="import-stat warning"><strong>${warnings.length}</strong><span>à vérifier</span></div><div class="import-stat error"><strong>${errors.length}</strong><span>erreurs bloquantes</span></div>`;
    btn.classList.toggle('hidden',data.valid.length===0);
    box.innerHTML=data.results.length?`<table><thead><tr><th>État</th><th>Ligne</th><th>N°</th><th>Contrôle</th><th>Changements détectés</th><th>Avertissements / erreurs</th></tr></thead><tbody>${data.results.map(x=>{
      const cls=x.errors.length?'error':x.warnings.length?'warning':x.action==='Identique'?'':'ok';
      const change=x.action==='Créer'?'Nouveau contrôle':x.action==='Identique'?'Aucune modification':x.changes.map(c=>`${fieldLabels[c.field]||c.field} : ${String(c.from||'—')} → ${String(c.to||'—')}`).join(' · ');
      const msg=[...x.errors,...x.warnings].join(' · ');
      return `<tr class="import-row-${cls||'ok'}"><td><span class="import-badge ${cls||'ok'}">${esc(x.action)}</span></td><td>${x.line}</td><td>${esc(x.values.no||'—')}</td><td><strong>${esc(x.values.name||'—')}</strong></td><td>${esc(change)}</td><td>${esc(msg||'—')}</td></tr>`;
    }).join('')}</tbody></table>`:'<div class="empty-state">Aucune ligne exploitable dans le fichier.</div>';
  };
  const importFile=async file=>{
    if(!window.XLSX){alert('Le composant Excel ne s’est pas chargé. Vérifiez Internet.');return;}
    try{const buf=await file.arrayBuffer(),wb=XLSX.read(buf,{type:'array',cellDates:true});preview(validateWorkbook(wb));}
    catch(e){console.error(e);alert(`Impossible de lire le fichier : ${e.message}`);}
  };

  function rememberDate(record,date,provider,source){
    if(!date)return;
    try{
      if(typeof mergePeriodicHistoryEntry==='function')mergePeriodicHistoryEntry(record,{date,provider:provider||'',source:source||'Import matrice'});
      else{
        record.history=Array.isArray(record.history)?record.history:[];
        const i=record.history.findIndex(h=>String(h.date||'')===date);
        if(i>=0)record.history[i]={...record.history[i],date,provider:record.history[i].provider||provider||'',source:record.history[i].source||source||''};
        else record.history.push({date,provider:provider||'',source:source||''});
      }
    }catch(_){/* historique secondaire : ne bloque jamais l'import principal */}
  }
  const stampRecord=record=>{
    const now=new Date().toISOString();if(!record.createdAt)record.createdAt=now;record.updatedAt=now;
    try{if(typeof pstMutationStamp==='function')pstMutationStamp();if(typeof pstNormalizeMutationRecord==='function')pstNormalizeMutationRecord(record,{source:'import-periodic-matrix'});if(typeof pstQueueMutation==='function')pstQueueMutation('periodic',record,{label:'Import matrice contrôles périodiques'});}catch(e){console.warn('Marquage synchronisation contrôle périodique',e);}
  };

  async function applyImport(){
    if(!pending||!pending.valid.length)return;
    let created=0,updated=0;
    for(const item of pending.valid){
      let record=item.existing;
      if(record){
        const oldLast=isoDate(record.lastDate||''),oldProvider=record.provider||'';
        if(oldLast&&oldLast!==item.values.lastDate)rememberDate(record,oldLast,oldProvider,'Import matrice — ancienne date');
        Object.assign(record,item.values);
        if(record.lastDate)rememberDate(record,record.lastDate,record.provider||'','Import matrice contrôles périodiques');
        stampRecord(record);updated++;
      }else{
        record={id:typeof uid==='function'?uid():`CP-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,history:[],attachments:[],...item.values};
        if(!record.no&&typeof nextNo==='function')record.no=nextNo('periodic','CP');
        if(!record.family)record.family=db.lists?.periodicFamilies?.[0]||'Autre';
        if(!record.building)record.building='Tous bâtiments';
        if(!record.register)record.register='Registre de sécurité';
        if(record.lastDate)rememberDate(record,record.lastDate,record.provider||'','Import matrice contrôles périodiques');
        db.periodic.push(record);stampRecord(record);created++;
      }
      if(record.oneDriveUrl&&typeof savePeriodicOneDriveLink==='function')try{savePeriodicOneDriveLink(record,record.oneDriveUrl);}catch(_){}
      if(record.family&&Array.isArray(db.lists?.periodicFamilies)&&!db.lists.periodicFamilies.some(v=>norm(v)===norm(record.family)))db.lists.periodicFamilies.push(record.family);
    }
    if(typeof enforceStableCollection==='function')try{enforceStableCollection('periodic','Import matrice contrôles périodiques');}catch(_){}
    if(typeof safeRenderAll==='function')safeRenderAll();else if(typeof renderPeriodic==='function')renderPeriodic();

    let persisted={ok:true,offline:false};
    try{
      if(window.PSTMainState?.persistNow)persisted=await window.PSTMainState.persistNow();
      else if(typeof save==='function')persisted={ok:save(false),offline:!navigator.onLine};
    }catch(e){persisted={ok:false,error:e?.message||String(e)};}
    if(!persisted?.ok){
      pending=null;$i('confirmPeriodicImport')?.classList.add('hidden');
      if($i('periodicImportPreview'))$i('periodicImportPreview').innerHTML='';
      $i('periodicImportSummary').innerHTML=`<div class="import-stat error"><strong>Import appliqué localement — synchronisation non confirmée</strong><span>${esc(persisted?.error||'Les modifications restent conservées sur cet appareil et seront resynchronisées.')}</span></div>`;
      if(typeof toast==='function')toast('Import des contrôles appliqué localement — synchronisation en attente');
      return;
    }
    pending=null;$i('confirmPeriodicImport')?.classList.add('hidden');
    $i('periodicImportSummary').innerHTML=`<div class="import-success"><strong>✅ Import des contrôles périodiques terminé et synchronisé</strong><span>${updated} contrôle(s) modifié(s), ${created} nouveau(x) contrôle(s). Les autres contrôles sont restés inchangés.</span></div>`;
    if($i('periodicImportPreview'))$i('periodicImportPreview').innerHTML='';
    if(typeof safeRenderAll==='function')safeRenderAll();
    if(typeof toast==='function')toast('✅ Contrôles périodiques mis à jour');
  }

  function init(){
    const d=$i('downloadPeriodicMatrix'),f=$i('periodicImportFile'),c=$i('confirmPeriodicImport');if(!d||!f||!c)return;
    d.addEventListener('click',exportMatrix);
    f.addEventListener('change',e=>{const file=e.target.files?.[0];if(file)importFile(file);e.target.value='';});
    c.addEventListener('click',applyImport);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
