/* Pilotage Service Technique V147.172 — synchronisation complète et validation visible de la matrice des contrôles périodiques */
(() => {
  'use strict';

  let pending=null, applying=false, reading=false, readSequence=0;
  const status=(message,state='idle')=>{
    const el=$i('periodicImportStatus');if(!el)return;
    el.textContent=message;el.dataset.state=state;
  };
  const updateControls=()=>{
    const btn=$i('confirmPeriodicImport'),file=$i('periodicImportFile');
    const ready=!!pending&&!pending.fatal&&Array.isArray(pending.valid)&&pending.valid.length>0;
    if(btn){btn.classList.remove('hidden');btn.disabled=applying||reading||!ready;btn.setAttribute('aria-disabled',String(btn.disabled));}
    if(file)file.disabled=applying||reading;
  };
  const clearPreview=()=>{
    pending=null;
    const box=$i('periodicImportPreview'),sum=$i('periodicImportSummary');
    if(box)box.innerHTML='';
    if(sum){sum.className='import-summary empty';sum.textContent='Aucun aperçu en attente.';}
    updateControls();
  };
  const MATRIX_SCHEMA="pst-periodic-matrix", MATRIX_VERSION=2, META_SHEET="_PST_Matrice";
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
    if(v===null||v===undefined||v==='')return '';
    if(v instanceof Date&&!isNaN(v))return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
    if(typeof v==='number'&&window.XLSX?.SSF){const d=XLSX.SSF.parse_date_code(v);if(d)return isoDate(`${d.y}-${d.m}-${d.d}`);}
    const s=String(v).trim();
    let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);let y,month,day;
    if(m){[,y,month,day]=m;}
    else{m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);if(!m)return '';[,day,month,y]=m;}
    y=Number(y);month=Number(month);day=Number(day);
    const d=new Date(Date.UTC(y,month-1,day));
    if(d.getUTCFullYear()!==y||d.getUTCMonth()!==month-1||d.getUTCDate()!==day)return '';
    return `${String(y).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  };
  const timeText=v=>{
    if(v===null||v===undefined||v==='')return '';
    if(typeof v==='number'){
      if(v>=0&&v<1){const mins=Math.round(v*24*60)%1440;return `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;}
      if(v<0||v>2359||!Number.isInteger(v))return '';
      const s=String(v).padStart(4,'0');return timeText(`${s.slice(0,2)}:${s.slice(-2)}`);
    }
    const s=String(v).trim(),m=s.match(/^(\d{1,2})[:hH](\d{2})$/);
    if(!m||Number(m[1])>23||Number(m[2])>59)return '';
    return `${m[1].padStart(2,'0')}:${m[2]}`;
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
  const stableValue=v=>{
    if(Array.isArray(v))return v.map(stableValue);
    if(v&&typeof v==='object'){
      const out={};for(const k of Object.keys(v).sort()){
        if(k.startsWith('_pst')||['createdAt','updatedAt','modifiedAt'].includes(k))continue;
        if(v[k]!==undefined)out[k]=stableValue(v[k]);
      }return out;
    }
    return v;
  };
  const snapshotRecord=x=>JSON.stringify(stableValue(x));
  const currentRecords=()=>Array.isArray(db.periodic)?db.periodic:[];
  const currentSnapshot=()=>new Map(currentRecords().map(x=>[String(x.id),snapshotRecord(x)]));
  const snapshotEquals=(a,b)=>a.size===b.size&&[...a].every(([id,value])=>b.get(id)===value);
  const snapshotFromMetadata=meta=>new Map(meta.records.map(([id,value])=>[String(id),value]));
  const metadataForExport=()=>({schema:MATRIX_SCHEMA,version:MATRIX_VERSION,exportedAt:new Date().toISOString(),userId:typeof currentUser!=='undefined'?String(currentUser?.id||''):'',records:[...currentSnapshot()]});
  const metadataSheet=meta=>{
    const chunks=[];
    for(const [id,value] of meta.records){
      const parts=String(value).match(/[\s\S]{1,30000}/g)||[''];
      parts.forEach((part,i)=>chunks.push([id,i+1,part]));
    }
    const ws=XLSX.utils.aoa_to_sheet([
      ['Format',MATRIX_SCHEMA],['Version',MATRIX_VERSION],['Exporté le',meta.exportedAt],['Utilisateur',meta.userId],
      ['Identifiant contrôle','Partie','État complet à l’export'],...chunks
    ]);
    ws['!cols']=[{wch:27},{wch:12},{wch:80}];return ws;
  };
  const readMetadata=wb=>{
    const ws=wb.Sheets[META_SHEET];if(!ws)throw new Error('Matrice complète non reconnue. Téléchargez une nouvelle matrice depuis cette version du logiciel.');
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true});
    if(rows[0]?.[1]!==MATRIX_SCHEMA||Number(rows[1]?.[1])!==MATRIX_VERSION)throw new Error('Version de matrice incompatible : effectuez un nouvel export.');
    const meta={schema:MATRIX_SCHEMA,version:MATRIX_VERSION,exportedAt:String(rows[2]?.[1]||''),userId:String(rows[3]?.[1]||''),records:[]};
    if(meta.userId&&typeof currentUser!=='undefined'&&currentUser?.id&&meta.userId!==String(currentUser.id))throw new Error('Cette matrice appartient à un autre compte.');
    const groups=new Map();
    for(const row of rows.slice(5)){
      const id=text(row[0]);if(!id&&!text(row[2]))continue;
      const part=Number(row[1]);
      if(!id||!Number.isInteger(part)||part<1||typeof row[2]!=='string')throw new Error('Instantané de matrice incomplet ou endommagé.');
      if(!groups.has(id))groups.set(id,new Map());
      if(groups.get(id).has(part))throw new Error('Parties de matrice en double.');
      groups.get(id).set(part,row[2]);
    }
    for(const [id,parts] of groups){
      if(parts.size!==Math.max(...parts.keys()))throw new Error('Une partie de l’instantané de matrice est manquante.');
      let value;try{value=JSON.parse([...parts].sort((a,b)=>a[0]-b[0]).map(x=>x[1]).join(''));}catch(_){throw new Error('Instantané de matrice endommagé : effectuez un nouvel export.');}
      if(!value||typeof value!=='object'||Array.isArray(value)||String(value.id)!==id)throw new Error('Instantané de matrice invalide.');
      meta.records.push([id,snapshotRecord(value)]);
    }
    return meta;
  };
  const requiredHeaders=['Identifiant contrôle','N° contrôle','Contrôle','Famille','Bâtiment','Étage / niveau','Secteur','Local / zone','Périodicité (mois)','Périodicité / précision','Dernier contrôle','Prochaine échéance','Heure prévue','Statut','Prestataire / responsable','Registre / dossier','Exigence / contenu','Lien OneDrive','Notes'];
  const workbookHeaders=ws=>{
    const first=XLSX.utils.sheet_to_json(ws,{header:1,range:0,blankrows:false,defval:''})[0]||[];
    const headers=first.map(x=>norm(x));
    const missing=requiredHeaders.filter(h=>!headers.includes(norm(h)));
    if(missing.length)throw new Error(`Colonnes obligatoires manquantes : ${missing.join(', ')}. Utilisez la matrice complète, sans supprimer de colonnes.`);
    if(new Set(headers.filter(Boolean)).size!==headers.filter(Boolean).length)throw new Error('En-têtes en double : corrigez les colonnes du fichier.');
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
    const data=rows.length?rows:[];
    const headers=Object.keys(blank);
    const ws=XLSX.utils.json_to_sheet(data,{header:headers});
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
      ['5. La feuille est une photographie complète : une ligne supprimée dans Excel supprime le contrôle correspondant du logiciel après validation.'],
      ['6. Avant validation, Pilotage affiche les lignes identiques, modifiées, nouvelles et supprimées. Les suppressions doivent être confirmées explicitement.'],
      ['7. La feuille « Historique - lecture » est fournie pour contrôle visuel. Elle n’est pas utilisée pour supprimer ou réécrire l’historique.'],
      ['8. Si vous modifiez « Dernier contrôle », l’ancienne date est conservée dans l’historique et la nouvelle date y est ajoutée automatiquement.'],
      ['9. « Échéance calculée / affichée », « État calculé », « Historique existant (lecture) » et « Contrôle import » sont des colonnes d’information : elles ne pilotent pas les données.'],
      ['10. Ne supprimez pas la feuille technique masquée _PST_Matrice : elle prouve que le fichier est un export complet et permet de détecter un export devenu obsolète.'],
      ['11. Si le registre a changé depuis l’export, effectuez un nouvel export. Une ancienne matrice ou un fichier partiel ne peut pas déclencher de suppressions.'],
      ['12. Une sauvegarde JSON complète est téléchargée avant l’application des modifications. Les rapports et archives indépendants ne sont pas effacés.'],
      ['13. Même un fichier sans aucune ligne de contrôle est accepté : il propose de vider le registre après une confirmation spéciale.']
    ];
    const wsM=XLSX.utils.aoa_to_sheet(instructions);setWidths(wsM,[120]);
    if(wsM.A1)wsM.A1.s={font:{bold:true,color:{rgb:'FFFFFF'},sz:16},fill:{fgColor:{rgb:'1F4E78'}},alignment:{horizontal:'center'}};
    XLSX.utils.book_append_sheet(wb,wsM,'Mode d’emploi');
    XLSX.utils.book_append_sheet(wb,metadataSheet(metadataForExport()),META_SHEET);
    wb.Workbook=wb.Workbook||{};wb.Workbook.Sheets=wb.SheetNames.map(name=>({name,Hidden:name===META_SHEET?1:0}));
    wb.Workbook=wb.Workbook||{};wb.Workbook.Views=[{RTL:false}];
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
    if(!id){
      if(no&&maps.byNo.has(norm(no)))errors.push('Numéro déjà utilisé : conservez l’identifiant exporté pour modifier ce contrôle');
      if(name&&maps.bySignature.has([name,family,building].map(norm).join('|')))warnings.push('Contrôle similaire existant : vérifiez qu’il ne s’agit pas d’un doublon');
    }
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
    try{
      const meta=readMetadata(wb),baseline=snapshotFromMetadata(meta);
      const ws=wb.Sheets['Contrôles périodiques']||wb.Sheets['Controles periodiques'];
      if(!ws)throw new Error('Feuille « Contrôles périodiques » introuvable.');
      workbookHeaders(ws);
      const rows=XLSX.utils.sheet_to_json(ws,{defval:'',raw:true});
      const maps=recordMap(),results=[],seenIds=new Set(),seenNos=new Map();
      rows.forEach((row,index)=>{
        if(Object.values(row).every(v=>String(v).trim()===''))return;
        const item=normalizedRecordFromRow(row,index,maps);
        // Un identifiant manquant ne doit pas transformer un ancien contrôle en création.
        if(item.id){
          if(seenIds.has(item.id))item.errors.push('Identifiant répété dans le fichier');
          seenIds.add(item.id);
          if(!baseline.has(item.id))item.errors.push('Identifiant absent de la matrice d’origine : effectuez un nouvel export');
        }
        const no=norm(item.values.no);
        if(no){
          if(seenNos.has(no)){
            item.errors.push('Numéro de contrôle en double');
            seenNos.get(no).errors.push('Numéro de contrôle en double');
          }else seenNos.set(no,item);
        }
        if(item.errors.length)item.action='Erreur';
        results.push(item);
      });
      const usedIds=new Set(results.filter(x=>x.id).map(x=>x.id));
      const deleted=currentRecords().filter(x=>!usedIds.has(String(x.id))).map(x=>({
        line:'—',id:String(x.id),existing:x,values:{no:x.no||'',name:x.name||''},changes:[],errors:[],warnings:[],action:'Supprimer'
      }));
      results.push(...deleted);
      const stale=!snapshotEquals(baseline,currentSnapshot());
      const errors=results.filter(x=>x.errors.length);
      const fatal=stale?'Le registre a changé depuis cet export. Pour éviter toute perte de données, téléchargez une nouvelle matrice et reportez vos corrections avant de réimporter.':errors.length?`${errors.length} ligne(s) contiennent des erreurs. Corrigez tout le fichier avant de valider.`:'';
      const valid=fatal?[]:results.filter(x=>!['Identique','Erreur'].includes(x.action));
      return {results,valid,fatal,meta,baseline};
    }catch(e){return {results:[],valid:[],fatal:e.message||String(e)};}
  }
  const fieldLabels={no:'N° contrôle',name:'Contrôle',family:'Famille',building:'Bâtiment',floor:'Étage / niveau',sector:'Secteur',room:'Local / zone',intervalMonths:'Périodicité',periodicityText:'Précision',lastDate:'Dernier contrôle',nextDate:'Prochaine échéance',time:'Heure',status:'Statut',provider:'Prestataire',register:'Registre',requirement:'Exigence',oneDriveUrl:'OneDrive',notes:'Notes'};
  const preview=data=>{
    pending=data;
    const box=$i('periodicImportPreview'),sum=$i('periodicImportSummary'),btn=$i('confirmPeriodicImport');if(!box||!sum||!btn)return;
    const created=data.results.filter(x=>x.action==='Créer'),updated=data.results.filter(x=>x.action==='Modifier'),deleted=data.results.filter(x=>x.action==='Supprimer'),same=data.results.filter(x=>x.action==='Identique'),errors=data.results.filter(x=>x.errors.length),warnings=data.results.filter(x=>!x.errors.length&&x.warnings.length);
    sum.className='import-summary';
    sum.innerHTML=`${data.fatal?`<div class="import-stat error"><strong>Import bloqué</strong><span>${esc(data.fatal)}</span></div>`:''}<div class="import-stat ok"><strong>${updated.length}</strong><span>à modifier</span></div><div class="import-stat ok"><strong>${created.length}</strong><span>à créer</span></div><div class="import-stat error"><strong>${deleted.length}</strong><span>à supprimer</span></div><div class="import-stat"><strong>${same.length}</strong><span>identiques</span></div><div class="import-stat warning"><strong>${warnings.length}</strong><span>à vérifier</span></div><div class="import-stat error"><strong>${errors.length}</strong><span>erreurs bloquantes</span></div>${deleted.length?'<p class="periodic-sync-warning"><strong>⚠️ Synchronisation complète :</strong> les contrôles absents du fichier seront supprimés du registre après confirmation. Une sauvegarde sera téléchargée avant application.</p>':''}`;
    if(data.fatal)status(`Import bloqué : ${data.fatal} Aucune donnée n’a été modifiée.`,'error');
    else if(data.valid.length)status(`${data.fileName?data.fileName+' — ':''}${data.valid.length} changement(s) prêt(s) : ${updated.length} modification(s), ${created.length} création(s), ${deleted.length} suppression(s). Vérifiez le tableau, puis cliquez sur « Valider les modifications ».`, 'ready');
    else status('Matrice vérifiée : aucune modification détectée. Le registre est déjà identique au fichier ; il n’y a rien à valider.','idle');
    updateControls();
    box.innerHTML=data.results.length?`<table><thead><tr><th>État</th><th>Ligne</th><th>N°</th><th>Contrôle</th><th>Changements détectés</th><th>Avertissements / erreurs</th></tr></thead><tbody>${data.results.map(x=>{
      const cls=x.errors.length||x.action==='Supprimer'?'error':x.warnings.length?'warning':x.action==='Identique'?'':'ok';
      const change=x.action==='Créer'?'Nouveau contrôle':x.action==='Supprimer'?'Absent de la matrice : suppression du registre':x.action==='Identique'?'Aucune modification':x.changes.map(c=>`${fieldLabels[c.field]||c.field} : ${String(c.from||'—')} → ${String(c.to||'—')}`).join(' · ');
      const msg=[...x.errors,...x.warnings].join(' · ');
      return `<tr class="import-row-${cls||'ok'}"><td><span class="import-badge ${cls||'ok'}">${esc(x.action)}</span></td><td>${x.line}</td><td>${esc(x.values.no||'—')}</td><td><strong>${esc(x.values.name||'—')}</strong></td><td>${esc(change)}</td><td>${esc(msg||'—')}</td></tr>`;
    }).join('')}</tbody></table>`:'<div class="empty-state">Aucun contrôle dans le fichier. Le registre sera vide après validation.</div>';
  };
  const importFile=async file=>{
    if(applying)return;
    const sequence=++readSequence;
    reading=false;clearPreview();
    if(!window.XLSX){status('Le composant Excel ne s’est pas chargé. Vérifiez la connexion Internet, puis réessayez. Aucune donnée n’a été modifiée.','error');return;}
    reading=true;updateControls();status(`Lecture de « ${file.name} » et comparaison avec le registre…`,'busy');
    try{
      const buf=await file.arrayBuffer();
      if(sequence!==readSequence)return;
      const wb=XLSX.read(buf,{type:'array',cellDates:true});
      const result=validateWorkbook(wb);
      result.fileName=file.name;
      preview(result);
    }catch(e){
      console.error('Lecture matrice contrôles périodiques',e);
      if(sequence===readSequence){clearPreview();status(`Impossible de lire le fichier : ${e.message||String(e)}. Choisissez une matrice Excel valide. Aucune donnée n’a été modifiée.`,'error');}
    }finally{if(sequence===readSequence){reading=false;updateControls();}}
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

  const backupBeforeImport=()=>{
    const payload={exportedAt:new Date().toISOString(),note:'Sauvegarde complète avant synchronisation de la matrice des contrôles périodiques. Les fichiers joints restent dans leur stockage externe.',data:deepClone(db)};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const name=`Pilotage_sauvegarde_avant_matrice_${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
    if(typeof triggerDownloadBlob==='function')triggerDownloadBlob(name,blob);
    else{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    return name;
  };
  const refreshAfterImport=()=>{if(typeof safeRenderAll==='function')safeRenderAll();else if(typeof renderPeriodic==='function')renderPeriodic();};
  const showImportResult=(message,error=false)=>{
    status(message,error?'error':'ready');
    const sum=$i('periodicImportSummary');if(sum)sum.innerHTML=`<div class="import-stat ${error?'error':'ok'}"><strong>${error?'Import non confirmé':'Import terminé'}</strong><span>${esc(message)}</span></div>`;
    if(typeof toast==='function')toast(message);
  };
  const verifyResult=(remote,expectedIds,deletedIds)=>{
    const rows=Array.isArray(remote?.periodic)?remote.periodic:[];
    const ids=new Set(rows.map(x=>String(x.id)));
    if(ids.size!==expectedIds.size||[...expectedIds].some(id=>!ids.has(id)))return false;
    const tombstones=deletedIdsFor('periodic',remote);
    return [...deletedIds].every(id=>!ids.has(id)&&tombstones.has(id));
  };
  async function applyImport(){
    if(applying||reading||!pending||pending.fatal||!pending.valid.length){updateControls();return;}
    applying=true;const btn=$i('confirmPeriodicImport');updateControls();
    status('Validation en cours : vérification du registre et sauvegarde avant application…','busy');
    try{
      const data=pending;
      // Never apply a preview against a registry that changed after the preview.
      if(!snapshotEquals(data.baseline,currentSnapshot()))throw new Error('Le registre a changé depuis l’export. Réexportez une matrice à jour avant de poursuivre.');
      const deleted=data.valid.filter(x=>x.action==='Supprimer');
      if(deleted.length){
        const names=deleted.map(x=>`${x.values.no||'—'} — ${x.values.name}`).join('\n');
        if(!confirm(`SUPPRESSION DE ${deleted.length} CONTRÔLE(S)\n\n${names}\n\nLes contrôles ci-dessus et leur historique intégré seront retirés du registre. Les autres données du logiciel et les archives indépendantes sont conservées. Une sauvegarde complète sera téléchargée.\n\nConfirmer ces suppressions ?`)){status('Suppression annulée. Le registre n’a pas été modifié ; vous pouvez vérifier le tableau ou choisir un autre fichier.','idle');return;}
        if(deleted.length===currentRecords().length&&deleted.length){
          if(prompt('Vous allez vider entièrement le registre des contrôles périodiques. Pour confirmer, écrivez SUPPRIMER TOUS :')!=='SUPPRIMER TOUS'){status('Vidage du registre annulé. Aucune donnée n’a été modifiée.','idle');return;}
        }
      }
      // Check the remote state before a destructive replacement: stale exports cannot erase newer work.
      if(typeof waitForCloudIdle==='function'&&!(await waitForCloudIdle(18000)))throw new Error('Une synchronisation est en cours. Réessayez après sa fin.');
      if(!snapshotEquals(data.baseline,currentSnapshot()))throw new Error('Des données ont changé pendant la préparation. Import annulé.');
      if(typeof currentUser!=='undefined'&&currentUser&&navigator.onLine){
        if(typeof fetchRemote!=='function')throw new Error('Lecture de contrôle du serveur indisponible.');
        const remote=await fetchRemote();
        if(remote?.data){
          const remoteState=migrate(remote.data);
          const remoteSnapshot=new Map((remoteState.periodic||[]).map(x=>[String(x.id),snapshotRecord(x)]));
          if(!snapshotEquals(data.baseline,remoteSnapshot))throw new Error('Le registre du serveur a changé depuis l’export. Réexportez une matrice à jour pour conserver les modifications récentes.');
        }
      }
      // Download the recovery backup BEFORE modifying even a single record.
      const backupName=backupBeforeImport();
      let created=0,updated=0,removed=0;
      for(const item of data.valid){
        if(item.action==='Supprimer')continue;
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
      const deletedIds=new Set(deleted.map(x=>x.id));
      for(const item of deleted){
        markRecordDeleted('periodic',item.id);
        if(typeof pstQueueMutation==='function')pstQueueMutation('periodic',{id:item.id,_pstVersion:Date.now()},{deleted:true,label:'Suppression par matrice contrôles périodiques'});
        removed++;
      }
      db.periodic=currentRecords().filter(x=>!deletedIds.has(String(x.id)));
      if(typeof enforceStableCollection==='function')enforceStableCollection('periodic','Synchronisation matrice complète');
      if(typeof enforceAllDeletedRecords==='function')enforceAllDeletedRecords('Synchronisation matrice complète');
      const expectedIds=new Set(currentRecords().map(x=>String(x.id)));
      if(typeof pstMutationStamp==='function')pstMutationStamp();
      if(typeof writeMirror==='function')writeMirror();
      if(typeof writeOfflinePending==='function')writeOfflinePending('Synchronisation complète des contrôles périodiques');
      refreshAfterImport();
      let persisted={ok:false,error:'Sauvegarde indisponible'};
      if(window.PSTMainState?.persistStateDirect)persisted=await window.PSTMainState.persistStateDirect({
        label:'Synchronisation complète des contrôles périodiques',
        verify:remote=>verifyResult(remote,expectedIds,deletedIds)
      });
      else if(window.PSTMainState?.persistNow)persisted=await window.PSTMainState.persistNow();
      else if(typeof save==='function')persisted={ok:save(false),offline:!navigator.onLine};
      if(!persisted?.ok||persisted.offline||persisted.pending){
        pending=null;updateControls();
        showImportResult(`Modifications appliquées localement (${updated} modifié(s), ${created} créé(s), ${removed} supprimé(s)). Synchronisation serveur non confirmée : ${persisted?.error||'en attente de connexion'}. Sauvegarde : ${backupName}.`,true);
        return;
      }
      pending=null;updateControls();
      if($i('periodicImportPreview'))$i('periodicImportPreview').innerHTML='';
      showImportResult(`${updated} contrôle(s) modifié(s), ${created} créé(s), ${removed} supprimé(s). Registre synchronisé. Sauvegarde : ${backupName}.`);
      refreshAfterImport();
    }catch(e){console.error('Synchronisation matrice contrôles périodiques',e);showImportResult(e.message||String(e),true);}
    finally{applying=false;updateControls();}
  }
  window.PSTPeriodicMatrix={exportMatrix,validateWorkbook,applyImport,preview,readMetadata};
  function init(){
    const d=$i('downloadPeriodicMatrix'),f=$i('periodicImportFile'),c=$i('confirmPeriodicImport');if(!d||!f||!c)return;
    updateControls();
    d.addEventListener('click',exportMatrix);
    f.addEventListener('change',e=>{const file=e.target.files?.[0];if(file)importFile(file);e.target.value='';});
    c.addEventListener('click',applyImport);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
