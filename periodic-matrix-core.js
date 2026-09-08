/* Pilotage Service Technique V147.175 — Excel authoritative registry and dated lifecycle. */
(() => {
 'use strict';
 const fields=['no','name','family','building','floor','sector','room','intervalMonths','periodicityText','lastDate','nextDate','time','status','provider','register','requirement','oneDriveUrl','notes'];
 const norm=v=>String(v??'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
 const value=(f,v)=>f==='intervalMonths'?(Number(v)||0):String(v??'').trim();
 const canonical=x=>Object.fromEntries(fields.map(f=>[f,value(f,x?.[f])]));
 const snapshot=rows=>new Map((Array.isArray(rows)?rows:[]).filter(x=>x?.id).map(x=>[String(x.id),JSON.stringify(canonical(x))]));
 const snapshotEquals=(a,b)=>a.size===b.size&&[...a].every(([k,v])=>b.get(k)===v);
 const signature=x=>[x?.name,x?.family,x?.building,x?.room,x?.provider].map(norm).join('|');
 const similar=x=>[x?.name,x?.family,x?.building].map(norm).join('|');
 const validDate=v=>{const s=String(v??'').trim(),m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);if(!m)return '';const y=+m[1],mo=+m[2],d=+m[3],dt=new Date(Date.UTC(y,mo-1,d));return dt.getUTCFullYear()===y&&dt.getUTCMonth()===mo-1&&dt.getUTCDate()===d?s:''};
 const addMonths=(s,n)=>{const d=validDate(s),months=Number(n);if(!d||!Number.isInteger(months)||months<=0)return '';const [y,m,day]=d.split('-').map(Number),total=y*12+m-1+months,yy=Math.floor(total/12),mm=total%12+1,last=new Date(Date.UTC(yy,mm,0)).getUTCDate();return `${String(yy).padStart(4,'0')}-${String(mm).padStart(2,'0')}-${String(Math.min(day,last)).padStart(2,'0')}`};
 const localToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
 const inactive=x=>['cloture','cloturee','non applicable','archive','archivee'].includes(norm(x?.status));
 // An explicit earlier deadline is respected. A later one cannot silently extend
 // the periodicity recorded by the user. Missing/invalid dates are never invented.
 function due(x){const derived=addMonths(x?.lastDate,Number(x?.intervalMonths||0)),explicit=validDate(x?.nextDate);return derived&&explicit?(derived<explicit?derived:explicit):derived||explicit||'';}
 function lifecycle(x,at=localToday()){
   const last=validDate(x?.lastDate),deadline=due(x),ref=validDate(at)||localToday();
   if(inactive(x))return {status:x.status||'Clôturé',due:deadline,lastDate:last,valid:false};
   if(last&&last>ref)return {status:'À vérifier',due:deadline,lastDate:last,valid:false};
   if(deadline&&deadline<ref)return {status:'En retard',due:deadline,lastDate:last,valid:false};
   if(last&&deadline&&deadline>=ref)return {status:'Fait',due:deadline,lastDate:last,valid:true};
   if(deadline&&deadline>=ref)return {status:'À planifier',due:deadline,lastDate:last,valid:false};
   return {status:last?'À vérifier':'À planifier',due:'',lastDate:last,valid:false};
 }
 function normalizeLifecycle(x,at){const c={...canonical(x)};c.nextDate=due(c);c.status=lifecycle(c,at).status;return c;}
 const exportState=x=>({...x,...canonical(x),id:String(x?.id||'')});
 const deletionFingerprint=x=>JSON.stringify(canonical(x));
 const hasProtectedData=x=>['history','attachments','files','cameraPhotos','reportIds','sourceDocumentIds'].some(k=>{const v=x?.[k];return Array.isArray(v)?v.length>0:v&&typeof v==='object'&&Object.keys(v).length>0});
 function build({baseline,current,rows,at}={}){
   const result={results:[],operations:[],deletions:[],deletedIds:[],desiredIds:[],desiredRecords:[],conflicts:[],errors:[],warnings:[],fatal:'',stale:false,fullAllowed:false,rebaseRows:[],rebaseIssues:[],newRecords:[]};
   const base=baseline instanceof Map?baseline:new Map(baseline||[]),liveRows=Array.isArray(current)?current:[],fileRows=Array.isArray(rows)?rows:[];
   const live=new Map(liveRows.filter(x=>x?.id).map(x=>[String(x.id),x]));
   result.baselineSnapshot=snapshot(liveRows);
   result.stale=!snapshotEquals(new Map([...base].map(([id,x])=>[String(id),JSON.stringify(canonical(x))])),result.baselineSnapshot);
   if(live.size!==liveRows.length||liveRows.some(x=>!x?.id)){result.fatal='Le registre contient des identifiants absents ou répétés. Réparez le registre avant import.';return result;}
   const seen=new Set(),numbers=new Map(),signatures=new Map();
   for(const row of fileRows){
     const item={...row,id:String(row.id||''),values:canonical(row.values||{}),errors:[...(row.errors||[])],warnings:[...(row.warnings||[])],changes:[],conflicts:[],action:'Identique'};
     if(item.id){if(seen.has(item.id))item.errors.push('Identifiant répété dans le fichier');seen.add(item.id);if(!base.has(item.id)&&!live.has(item.id))item.errors.push('Identifiant inconnu : laissez-le vide pour créer une fiche');}
     if(!item.values.name)item.errors.push('Nom du contrôle manquant');
     const months=Number(item.values.intervalMonths);
     if(!Number.isInteger(months)||months<0)item.errors.push('Périodicité en mois invalide');
     for(const f of ['lastDate','nextDate'])if(item.values[f]&&!validDate(item.values[f]))item.errors.push('Date invalide : '+f);
     if(item.values.lastDate&&item.values.nextDate&&item.values.nextDate<item.values.lastDate)item.warnings.push('Échéance antérieure au dernier passage : vérifier les dates');
     const original=base.get(item.id),previous=live.get(item.id);
     // A last-date/interval edit invalidates an unchanged old calculated deadline.
     // A deliberately edited deadline remains an explicit earlier override.
     if(original&&item.values.lastDate&&Number(item.values.intervalMonths)>0){
       const changedCycle=item.values.lastDate!==canonical(original).lastDate||item.values.intervalMonths!==canonical(original).intervalMonths;
       if(changedCycle&&item.values.nextDate===canonical(original).nextDate)item.values.nextDate=addMonths(item.values.lastDate,item.values.intervalMonths);
     }
     // A manually entered next date may shorten, but never extend, the recorded cycle.
     item.values.nextDate=due(item.values);
     item.values.status=lifecycle(item.values,at).status;
     const before=canonical(previous||original||{});
     for(const f of fields)if(item.values[f]!==before[f])item.changes.push({field:f,from:before[f],to:item.values[f]});
     const no=norm(item.values.no),sig=signature(item.values),key=item.id||'__new'+result.results.length;
     if(no){const ids=numbers.get(no)||[];ids.push(key);numbers.set(no,ids);}
     if(item.values.name){const ids=signatures.get(sig)||[];ids.push(key);signatures.set(sig,ids);}
     item.action=item.id?(item.changes.length?'Modifier':'Identique'):'Créer';
     result.results.push(item);
     result.desiredRecords.push({id:item.id,values:item.values,original:original||null});
     if(item.id)result.desiredIds.push(item.id);
   }
   for(const item of result.results){
     if(item.values.no&&(numbers.get(norm(item.values.no))||[]).length>1)item.errors.push('Numéro de contrôle en double dans le fichier');
     if(item.values.name&&(signatures.get(signature(item.values))||[]).length>1)item.errors.push('Fiche identique en double : vérifier le matériel, le lieu et le prestataire');
     item.errors=[...new Set(item.errors)];item.warnings=[...new Set(item.warnings)];
     if(item.errors.length){item.action='Erreur';result.errors.push(item);}
     if(item.warnings.length)result.warnings.push(item);
   }
   result.deletions=liveRows.filter(x=>!seen.has(String(x.id))).map(x=>({line:'—',id:String(x.id),existing:x,values:canonical(x),changes:[],errors:[],warnings:[],conflicts:[],action:'Supprimer'}));
   result.deletedIds=result.deletions.map(x=>x.id);
   result.deletionBaseline=result.deletions.map(x=>[x.id,deletionFingerprint(x)]);
   result.results.push(...result.deletions);
   result.fullAllowed=!result.fatal&&!result.errors.length;
   if(!result.fullAllowed&&!result.fatal)result.fatal=`${result.errors.length} erreur(s) de saisie à corriger avant import. Aucune donnée n’a été modifiée.`;
   if(result.fullAllowed){for(const item of result.results){if(item.action==='Modifier')result.operations.push({type:'update',id:item.id,values:item.values,changes:item.changes});else if(item.action==='Créer')result.operations.push({type:'create',values:item.values});}}
   result.rebaseRows=result.desiredRecords.map(x=>({...x.values,id:x.id}));
   return result;
 }
 window.PSTPeriodicMatrixCore={fields,canonical,snapshot,snapshotEquals,build,norm,signature,similar,exportState,deletionFingerprint,hasProtectedData,validDate,addMonths,due,lifecycle,normalizeLifecycle};
})();
