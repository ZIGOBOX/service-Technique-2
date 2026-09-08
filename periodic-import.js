/* Pilotage Service Technique V147.175 — synchronisation complète Excel, suppressions automatiques à la validation. */
(() => {
  'use strict';

  let pending=null, applying=false, reading=false, readSequence=0, loadedWorkbook=null, loadedFileName='', exportOverride=null;
  const status=(message,state='idle')=>{
    const el=$i('periodicImportStatus');if(!el)return;
    el.textContent=message;el.dataset.state=state;
  };
  const clearPreview=()=>{
    pending=null;
    const box=$i('periodicImportPreview'),sum=$i('periodicImportSummary');
    if(box)box.innerHTML='';
    if(sum){sum.className='import-summary empty';sum.textContent='Aucun aperçu en attente.';}
    updateControls();
  };
  const MATRIX_SCHEMA="pst-periodic-matrix", MATRIX_VERSION=4, META_SHEET="_PST_Matrice";
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
  const core=()=>window.PSTPeriodicMatrixCore;
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
  const snapshotRecord=x=>JSON.stringify(core().canonical(x));
  const currentRecords=()=>Array.isArray(db.periodic)?db.periodic:[];
  const currentSnapshot=()=>core().snapshot(currentRecords());
  const snapshotEquals=(a,b)=>a.size===b.size&&[...a].every(([id,value])=>b.get(id)===value);
  const snapshotFromMetadata=meta=>new Map(meta.records.map(([id,value])=>[String(id),JSON.parse(value)]));
  const metadataForExport=()=>({schema:MATRIX_SCHEMA,version:MATRIX_VERSION,exportedAt:new Date().toISOString(),userId:typeof currentUser!=='undefined'?String(currentUser?.id||''):'',records:currentRecords().map(x=>[String(x.id),JSON.stringify(core().exportState(x))])});
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
    if(rows[0]?.[1]!==MATRIX_SCHEMA||![2,3,4].includes(Number(rows[1]?.[1])))throw new Error('Version de matrice incompatible : effectuez un nouvel export.');
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
      meta.records.push([id,JSON.stringify({...value,id,__pstSnapshotComplete:Number(rows[1][1])!==3})]);
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
    const rows=(exportOverride||db.periodic||[]).slice().sort((a,b)=>String(a.no||a.name||'').localeCompare(String(b.no||b.name||''),'fr')).map(x=>({
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
      'Prochaine échéance':computedDue(x)||'',
      'Échéance calculée / affichée':computedDue(x)||'',
      'Heure prévue':x.time||'',
      'Statut':computedState(x)||'',
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
    for(const x of (exportOverride||db.periodic||[]))for(const h of historyRows(x))hist.push({
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
      ['6. Le bouton « Valider les modifications » applique toutes les corrections et supprime automatiquement toutes les fiches absentes du fichier, sans sélection ni confirmation supplémentaire.'],
      ['7. La feuille « Historique - lecture » est fournie pour contrôle visuel. Elle n’est pas utilisée pour supprimer ou réécrire l’historique.'],
      ['8. Si vous modifiez « Dernier contrôle », l’ancienne date est conservée dans l’historique et la nouvelle date y est ajoutée automatiquement.'],
      ['9. « Échéance calculée / affichée », « État calculé », « Historique existant (lecture) » et « Contrôle import » sont des colonnes d’information : elles ne pilotent pas les données.'],
      ['10. Ne supprimez pas la feuille technique masquée _PST_Matrice : elle prouve que le fichier est un export complet et permet de détecter un export devenu obsolète.'],
      ['11. L’Excel est prioritaire même si le registre a évolué. Les erreurs de saisie doivent être corrigées dans l’aperçu. Une nouvelle lecture du serveur et une sauvegarde précèdent chaque écriture.'],
      ['12. Une sauvegarde JSON complète est téléchargée avant l’application des modifications. Les rapports et archives indépendants ne sont pas effacés.'],
      ['13. Une matrice complète vide supprime tous les contrôles à la validation. Les fiches conservées gardent leurs historiques et pièces jointes. Le statut Fait est calculé depuis le dernier passage et la périodicité.']
    ];
    const wsM=XLSX.utils.aoa_to_sheet(instructions);setWidths(wsM,[120]);
    if(wsM.A1)wsM.A1.s={font:{bold:true,color:{rgb:'FFFFFF'},sz:16},fill:{fgColor:{rgb:'1F4E78'}},alignment:{horizontal:'center'}};
    XLSX.utils.book_append_sheet(wb,wsM,'Mode d’emploi');
    XLSX.utils.book_append_sheet(wb,metadataSheet(metadataForExport()),META_SHEET);
    wb.Workbook=wb.Workbook||{};wb.Workbook.Sheets=wb.SheetNames.map(name=>({name,Hidden:name===META_SHEET?1:0}));
    wb.Workbook=wb.Workbook||{};wb.Workbook.Views=[{RTL:false}];
    const fileName=`Matrice_Controles_Periodiques_${new Date().toISOString().slice(0,10)}${exportOverride?'_ACTUALISEE':''}.xlsx`;
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
  const fieldLabels={no:'N° contrôle',name:'Contrôle',family:'Famille',building:'Bâtiment',floor:'Étage / niveau',sector:'Secteur',room:'Local / zone',intervalMonths:'Périodicité (mois)',periodicityText:'Périodicité / précision',lastDate:'Dernier contrôle',nextDate:'Prochaine échéance',time:'Heure prévue',status:'Statut',provider:'Prestataire / responsable',register:'Registre / dossier',requirement:'Exigence / contenu',oneDriveUrl:'Lien OneDrive',notes:'Notes'};
  const sourceKeys={id:'Identifiant contrôle',...fieldLabels};
  const legacyBlank=(v,f,original)=>{
    if((v===28||String(v).trim()==='28')&&f!=='intervalMonths'&&original&&String(original[f]??'').trim()==='')return '';
    return v;
  };
  let draftRows=null,sourceMeta=null,editor=null,editingIndex=-1,editedDue=false;
  const normalizeRow=(row,index,baseline,maps)=>{
    const id=text(get(row,'Identifiant contrôle','ID contrôle','Identifiant'));
    const original=baseline.get(id)||null,errors=[],warnings=[];
    const read=f=>legacyBlank(get(row,sourceKeys[f]),f,original);
    const values={};
    for(const f of core().fields){
      const raw=read(f);
      if(f==='intervalMonths'){values[f]=num(raw);if(!Number.isInteger(values[f])||values[f]<0)errors.push('Périodicité en mois invalide');}
      else if(f==='lastDate'||f==='nextDate'){
        values[f]=String(raw??'').trim()===''?'':isoDate(raw);
        if(String(raw??'').trim()&&!values[f])errors.push((f==='lastDate'?'Date du dernier contrôle':'Date de prochaine échéance')+' invalide');
      }else if(f==='time'){
        values[f]=String(raw??'').trim()===''?'':timeText(raw);
        if(String(raw??'').trim()&&!values[f])errors.push('Heure prévue invalide');
      }else values[f]=text(raw);
    }
    if(!values.name)errors.push('Nom du contrôle manquant');
    if(values.lastDate&&values.lastDate>isoDate(new Date()))warnings.push('La date du dernier passage est dans le futur : vérifier la saisie');
    if(values.lastDate&&values.nextDate&&values.nextDate<values.lastDate)warnings.push('Échéance antérieure au dernier passage');
    if(values.building&&Array.isArray(db.buildings)&&!db.buildings.some(b=>norm(b.name)===norm(values.building))&&norm(values.building)!=='tous batiments')warnings.push('Bâtiment non présent dans le référentiel : valeur conservée');
    if(values.family&&Array.isArray(db.lists?.periodicFamilies)&&!db.lists.periodicFamilies.some(v=>norm(v)===norm(values.family)))warnings.push('Nouvelle famille : elle sera ajoutée au référentiel');
    return {line:index+2,id,values,errors,warnings};
  };
  const buildPreview=()=>{
    if(!sourceMeta)throw new Error('Aucune matrice Excel chargée.');
    const baseline=snapshotFromMetadata(sourceMeta),maps=recordMap();
    const parsed=(draftRows||[]).map((r,i)=>normalizeRow(r,i,baseline,maps));
    const plan=core().build({baseline,current:currentRecords(),rows:parsed});
    return {...plan,baseline,meta:sourceMeta,parsed,valid:plan.fullAllowed?plan.operations:[],sourceSnapshot:core().snapshot(currentRecords()),fileName:loadedFileName};
  };
  function validateWorkbook(wb){
    try{
      const meta=readMetadata(wb),ws=wb.Sheets['Contrôles périodiques']||wb.Sheets['Controles periodiques'];
      if(!ws)throw new Error('Feuille « Contrôles périodiques » introuvable.');
      workbookHeaders(ws);
      sourceMeta=meta;
      draftRows=XLSX.utils.sheet_to_json(ws,{defval:'',raw:true}).filter(r=>Object.values(r).some(v=>String(v??'').trim()!==''));
      return buildPreview();
    }catch(e){return {results:[],operations:[],deletions:[],deletedIds:[],desiredRecords:[],errors:[],warnings:[],valid:[],fatal:e.message||String(e),fileName:loadedFileName};}
  }
  const updateControls=()=>{
    const btn=$i('confirmPeriodicImport'),file=$i('periodicImportFile');
    const ready=!!pending&&!pending.fatal&&Array.isArray(pending.desiredRecords)&&
      (pending.operations.length>0||pending.deletedIds?.length>0);
    if(btn){btn.classList.remove('hidden');btn.disabled=applying||reading||!ready;btn.setAttribute('aria-disabled',String(btn.disabled));}
    if(file)file.disabled=applying||reading;
    for(const id of ['periodicImportAdd','periodicImportDownloadEdited']){const b=$i(id);if(b)b.disabled=applying||reading||!draftRows;}
  };
  const preview=data=>{
    pending=data;
    const box=$i('periodicImportPreview'),sum=$i('periodicImportSummary');if(!box||!sum)return;
    const created=data.results.filter(x=>x.action==='Créer'),updated=data.results.filter(x=>x.action==='Modifier'),deleted=data.deletions||[],same=data.results.filter(x=>x.action==='Identique'),errors=data.errors||[],warnings=data.warnings||[];
    sum.className='import-summary';
    sum.innerHTML=`${data.fatal?`<div class="import-stat error"><strong>À corriger</strong><span>${esc(data.fatal)}</span></div>`:''}<div class="import-stat ok"><strong>${updated.length}</strong><span>à modifier</span></div><div class="import-stat ok"><strong>${created.length}</strong><span>à créer</span></div><div class="import-stat ${deleted.length?'warning':''}"><strong>${deleted.length}</strong><span>à supprimer</span></div><div class="import-stat"><strong>${same.length}</strong><span>identiques</span></div><div class="import-stat error"><strong>${errors.length}</strong><span>erreurs de saisie</span></div><p class="periodic-sync-warning"><strong>Excel prioritaire :</strong> les valeurs du fichier remplacent celles du registre et toutes les fiches absentes sont supprimées à la validation. Vous pouvez corriger les lignes ci-dessous. Une sauvegarde du serveur est téléchargée avant l’écriture.</p>`;
    if(data.fatal)status(`Corrigez les lignes signalées avant de valider. Aucune donnée n’a été modifiée.`,'error');
    else if(data.operations.length||data.deletedIds?.length)status(`${updated.length} modification(s), ${created.length} création(s) et ${deleted.length} suppression(s). L’Excel sera appliqué intégralement à la validation.`, 'ready');
    else status('Le registre correspond déjà à la matrice. Aucune modification à appliquer.','idle');
    updateControls();
    const show=v=>v===0?'0':v===null||v===undefined||v===''?'—':String(v);
    box.innerHTML=data.results.length?`<table><thead><tr><th>État</th><th>Ligne</th><th>N°</th><th>Contrôle</th><th>Modifications</th><th>Avertissements</th><th>Corriger</th></tr></thead><tbody>${data.results.map((x,i)=>{
      const cls=x.errors?.length||x.action==='Supprimer'?'error':x.warnings?.length?'warning':x.action==='Identique'?'':'ok';
      const change=x.action==='Créer'?'Nouvelle fiche':x.action==='Supprimer'?'Absente de l’Excel : suppression à la validation':x.action==='Identique'?'Aucune modification':(x.changes||[]).map(c=>`${fieldLabels[c.field]||c.field} : ${show(c.from)} → ${show(c.to)}`).join(' · ');
      const edit=x.action==='Supprimer'?'':`<button type="button" class="ghost small" data-periodic-edit="${i}">✎ Modifier</button><button type="button" class="ghost small danger-mini" data-periodic-remove="${i}">Retirer</button>`;
      return `<tr class="import-row-${cls||'ok'}"><td><span class="import-badge ${cls||'ok'}">${esc(x.action)}</span></td><td>${esc(x.line)}</td><td>${esc(x.values.no||'—')}</td><td><strong>${esc(x.values.name||'—')}</strong></td><td>${esc(change||'—')}</td><td>${esc([...(x.errors||[]),...(x.warnings||[])].join(' · ')||'—')}</td><td>${edit}</td></tr>`;
    }).join('')}</tbody></table>`:'<div class="empty-state">La matrice est vide. La validation supprimera toutes les fiches du registre.</div>';
  };
  const redraw=()=>{try{preview(buildPreview());}catch(e){status(e.message||String(e),'error');}};
  const editorValues=()=>{const o=Object.fromEntries(new FormData(editor.querySelector('form')).entries());o.intervalMonths=num(o.intervalMonths);return o;};
  const refreshEditor=(changedField='')=>{
    if(!editor)return;
    const v=editorValues(),life=core().lifecycle(v);
    const state=editor.querySelector('[data-periodic-editor-state]');if(state)state.textContent=`État calculé : ${life.status}${life.due?' · échéance '+life.due:''}`;
    const due=editor.querySelector('[name="nextDate"]');
    if(due&&!editedDue&&['lastDate','intervalMonths'].includes(changedField))due.value=core().addMonths(v.lastDate,v.intervalMonths);
  };
  function openEditor(index){
    if(applying||reading||!draftRows||index<0||index>=draftRows.length)return;
    editingIndex=index;editedDue=false;
    const baseline=snapshotFromMetadata(sourceMeta),row=normalizeRow(draftRows[index],index,baseline,recordMap()),v=row.values;
    if(!editor){editor=document.createElement('dialog');editor.id='periodicImportEditor';editor.className='periodic-import-editor';document.body.appendChild(editor);}
    const f=(name,label,type='text')=>`<label>${esc(label)}<input name="${name}" type="${type}" value="${esc(v[name]??'')}" ${name==='name'?'required':''} ${name==='intervalMonths'?'min="0" step="1"':''}></label>`;
    const select=`<label>Statut particulier<select name="status">${['À planifier','Fait','En retard','En attente','Clôturé','Non applicable'].map(s=>`<option value="${esc(s)}" ${s===v.status?'selected':''}>${esc(s)}</option>`).join('')}</select></label>`;
    const inputs=core().fields.filter(x=>!['status','notes','requirement'].includes(x)).map(x=>f(x,fieldLabels[x],['lastDate','nextDate'].includes(x)?'date':x==='time'?'time':x==='intervalMonths'?'number':'text')).join('');
    editor.innerHTML=`<form method="dialog"><div class="periodic-editor-head"><h3>Modifier la ligne ${index+2}</h3><button type="button" class="ghost" data-editor-cancel>✕</button></div><p class="hint">Les corrections restent dans l’aperçu jusqu’à « Valider les modifications ». Identifiant technique conservé : ${esc(row.id||'nouvelle fiche')}.</p><div class="form-grid">${inputs}${select}<label class="span2">Exigence / contenu<textarea name="requirement" rows="3">${esc(v.requirement)}</textarea></label><label class="span2">Notes<textarea name="notes" rows="4">${esc(v.notes)}</textarea></label></div><p class="periodic-editor-state" data-periodic-editor-state></p><p class="hint">« Fait » est calculé à partir du dernier passage et de la périodicité. Une échéance plus courte reste possible. Clôturé et Non applicable sont conservés.</p><div class="periodic-editor-actions"><button type="button" class="ghost" data-editor-cancel>Annuler</button><button type="submit" class="primary">Enregistrer la correction</button></div></form>`;
    editor.querySelectorAll('[data-editor-cancel]').forEach(b=>b.addEventListener('click',()=>editor.close()));
    editor.querySelector('form').addEventListener('input',e=>{if(e.target.name==='nextDate')editedDue=true;refreshEditor(e.target.name);});
    editor.querySelector('form').addEventListener('submit',e=>{
      e.preventDefault();const form=e.currentTarget;if(!form.reportValidity())return;
      const values=editorValues();
      if(!Number.isInteger(values.intervalMonths)||values.intervalMonths<0){status('La périodicité doit être un nombre entier de mois.','error');return;}
      const current=core().canonical(v),old=core().canonical(values);
      if(!editedDue&&(old.lastDate!==current.lastDate||old.intervalMonths!==current.intervalMonths))values.nextDate=core().addMonths(values.lastDate,values.intervalMonths);
      values.nextDate=core().due(values);values.status=core().lifecycle(values).status;
      const raw={...draftRows[editingIndex]};for(const [key,value] of Object.entries(values))raw[sourceKeys[key]]=value;
      draftRows[editingIndex]=raw;editor.close();redraw();
    });
    refreshEditor();editor.showModal();
  }
  const addDraft=()=>{if(!draftRows)return;const r=Object.fromEntries(Object.values(sourceKeys).map(k=>[k,'']));r['Périodicité (mois)']=0;r['Statut']='À planifier';draftRows.push(r);redraw();openEditor(draftRows.length-1);};
  const removeDraft=index=>{if(!draftRows||index<0||index>=draftRows.length)return;draftRows.splice(index,1);redraw();};
  const exportEdited=()=>{
    if(!draftRows||!sourceMeta)return;
    const previous=exportOverride;
    try{
      const baseline=snapshotFromMetadata(sourceMeta),maps=recordMap();
      exportOverride=draftRows.map((r,i)=>{const p=normalizeRow(r,i,baseline,maps),source=maps.byId.get(p.id)||baseline.get(p.id)||{};return {...source,...core().normalizeLifecycle(p.values),id:p.id};});
      exportMatrix();
    }finally{exportOverride=previous;}
  };
  const downloadRecovery=exportEdited;
  const importFile=async file=>{
    if(applying)return;
    const sequence=++readSequence;reading=false;clearPreview();loadedWorkbook=null;draftRows=null;sourceMeta=null;loadedFileName=file.name;
    if(!window.XLSX){status('Le composant Excel ne s’est pas chargé. Aucune donnée n’a été modifiée.','error');return;}
    reading=true;updateControls();status(`Lecture de « ${file.name} »…`,'busy');
    try{const buf=await file.arrayBuffer();if(sequence!==readSequence)return;loadedWorkbook=XLSX.read(buf,{type:'array',cellDates:true});preview(validateWorkbook(loadedWorkbook));}
    catch(e){console.error('Lecture matrice',e);if(sequence===readSequence){clearPreview();status(`Impossible de lire le fichier : ${e.message||String(e)}.`,'error');}}
    finally{if(sequence===readSequence){reading=false;updateControls();}}
  };
  const recheck=()=>{if(applying||reading||!draftRows)return;redraw();};
  const showImportResult=(message,error=false)=>{
    status(message,error?'error':'ready');const sum=$i('periodicImportSummary');if(sum)sum.innerHTML=`<div class="import-stat ${error?'error':'ok'}"><strong>${error?'Import non confirmé':'Import terminé'}</strong><span>${esc(message)}</span></div>`;
    if(typeof toast==='function')toast(message);
  };
  const refreshAfterImport=()=>{if(typeof safeRenderAll==='function')safeRenderAll();else if(typeof renderPeriodic==='function')renderPeriodic();};
  async function applyImport(){
    if(applying||reading||!pending||pending.fatal||!draftRows){updateControls();return;}
    applying=true;updateControls();status('Sauvegarde et synchronisation complète du registre…','busy');
    try{
      const data=buildPreview();if(data.fatal){preview(data);throw new Error(data.fatal);}
      if(!data.operations.length&&!data.deletedIds.length){status('Aucune modification à appliquer.','idle');return;}
      if(!window.PSTMainState?.commitPeriodicMatrix)throw new Error('Écriture sécurisée indisponible : installez le paquet logiciel complet V147.175.');
      const result=await window.PSTMainState.commitPeriodicMatrix({desiredRecords:data.desiredRecords,label:'Synchronisation complète Excel prioritaire'});
      if(!result?.ok)throw new Error(result?.error||'La sauvegarde serveur n’a pas été confirmée.');
      loadedWorkbook=null;draftRows=null;sourceMeta=null;loadedFileName='';clearPreview();
      showImportResult(`${result.updated} fiche(s) modifiée(s), ${result.created} créée(s), ${result.removed} supprimée(s). Synchronisation serveur confirmée. Sauvegarde : ${result.backupName}.`);
      refreshAfterImport();
    }catch(e){console.error('Synchronisation matrice',e);showImportResult(e.message||String(e),true);}
    finally{applying=false;updateControls();}
  }
  window.PSTPeriodicMatrix={exportMatrix,validateWorkbook,applyImport,preview,readMetadata,recheck,importFile,downloadRecovery,buildPreview,openEditor,removeDraft,addDraft,exportEdited};
  function init(){
    const d=$i('downloadPeriodicMatrix'),f=$i('periodicImportFile'),c=$i('confirmPeriodicImport');if(!d||!f||!c)return;
    updateControls();d.addEventListener('click',exportMatrix);
    f.addEventListener('change',e=>{const file=e.target.files?.[0];if(file)importFile(file);e.target.value='';});
    c.addEventListener('click',applyImport);
    $i('periodicImportRecheck')?.addEventListener('click',recheck);
    $i('periodicImportAdd')?.addEventListener('click',addDraft);
    $i('periodicImportDownloadEdited')?.addEventListener('click',exportEdited);
    $i('periodicImportPreview')?.addEventListener('click',e=>{const edit=e.target.closest?.('[data-periodic-edit]'),remove=e.target.closest?.('[data-periodic-remove]');if(edit)openEditor(Number(edit.dataset.periodicEdit));else if(remove)removeDraft(Number(remove.dataset.periodicRemove));});
    window.addEventListener('pst:data-loaded',()=>{if(draftRows&&!applying)recheck();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
