/* Pilotage Service Technique V147.174 — Excel authoritative, atomic full synchronization. */
(() => {
 'use strict';
 const fields=['no','name','family','building','floor','sector','room','intervalMonths','periodicityText','lastDate','nextDate','time','status','provider','register','requirement','oneDriveUrl','notes'];
 const protectedFields=['history','attachments','files','cameraPhotos','reportIds','sourceDocumentIds'];
 const norm=v=>String(v??'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
 const value=(f,v)=>f==='intervalMonths'?(Number(v)||0):String(v??'').trim();
 const canonical=x=>Object.fromEntries(fields.map(f=>[f,value(f,x?.[f])]));
 const snapshot=rows=>new Map((Array.isArray(rows)?rows:[]).filter(x=>x?.id).map(x=>[String(x.id),JSON.stringify(canonical(x))]));
 const snapshotEquals=(a,b)=>a.size===b.size&&[...a].every(([k,v])=>b.get(k)===v);
 const signature=x=>[x?.name,x?.family,x?.building,x?.room,x?.provider].map(norm).join('|');
 const similar=x=>[x?.name,x?.family,x?.building].map(norm).join('|');
 const stable=x=>{
   if(Array.isArray(x))return x.map(stable);
   if(x&&typeof x==='object'){
     const out={};for(const k of Object.keys(x).sort()){
       if(k.startsWith('_pst')||['createdAt','updatedAt','modifiedAt'].includes(k))continue;
       if(x[k]!==undefined)out[k]=stable(x[k]);
     }return out;
   }
   return x;
 };
 const protectedState=x=>Object.fromEntries(protectedFields.map(k=>[k,stable(x?.[k]??(k==='history'||k==='attachments'||k==='reportIds'||k==='sourceDocumentIds'?[]:{}))]));
 const exportState=x=>({...x,...canonical(x),id:String(x?.id||'')});
 const deletionFingerprint=x=>JSON.stringify({...canonical(x),...protectedState(x)});
 const hasProtectedData=x=>protectedFields.some(k=>{const v=protectedState(x)[k];return Array.isArray(v)?v.length>0:Object.keys(v).length>0;});
 const empty=()=>({results:[],operations:[],deletions:[],deletedIds:[],desiredIds:[],deletionBaseline:[],conflicts:[],errors:[],warnings:[],fatal:'',stale:false,fullAllowed:false,rebaseRows:[],rebaseIssues:[],newRecords:[]});
 function build({baseline,current,rows}={}){
   const result=empty(),base=baseline instanceof Map?baseline:new Map(baseline||[]);
   const liveRows=Array.isArray(current)?current:[],fileRows=Array.isArray(rows)?rows:[];
   const live=new Map(liveRows.filter(x=>x?.id).map(x=>[String(x.id),x]));
   result.baselineSnapshot=snapshot(liveRows);
   result.stale=!snapshotEquals(new Map([...base].map(([id,x])=>[String(id),JSON.stringify(canonical(x))])),result.baselineSnapshot);
   const seen=new Set(),desiredRows=[],pendingCreates=[];
   const rebase=new Map(liveRows.filter(x=>x?.id).map(x=>[String(x.id),exportState(x)]));
   const issue=(item,message,kind='concurrent')=>{item.conflicts.push(message);result.rebaseIssues.push({kind,id:item.id||'',name:item.values?.name||'',message});};
   if(live.size!==liveRows.length)result.fatal='Le registre actuel contient des identifiants absents ou répétés. Import annulé.';
   for(const row of fileRows){
     const item={...row,id:String(row.id||''),values:canonical(row.values||{}),errors:[...(row.errors||[])],warnings:[...(row.warnings||[])],changes:[],conflicts:[],safeValues:{},action:'Identique'};
     if(!item.values.name)item.errors.push('Nom du contrôle manquant');
     if(item.id){
       if(seen.has(item.id))item.errors.push('Identifiant répété dans le fichier');
       seen.add(item.id);
       if(!base.has(item.id))item.errors.push('Identifiant absent de l’export d’origine : ne modifiez pas les identifiants');
       const original=base.get(item.id),currentRecord=live.get(item.id);
       if(original&&!currentRecord)issue(item,'Cette fiche a été supprimée du registre depuis l’export. Une nouvelle matrice est nécessaire.');
       if(original&&currentRecord){
         const before=canonical(original),now=canonical(currentRecord),wanted=item.values;
         for(const f of fields){
           if(wanted[f]===before[f]||wanted[f]===now[f])continue;
           if(now[f]===before[f]){item.safeValues[f]=wanted[f];item.changes.push({field:f,from:now[f],to:wanted[f]});}
           else issue(item,{field:f,original:before[f],current:now[f],requested:wanted[f]},'field');
         }
         item.values={...now,...item.safeValues};
         if(!item.errors.length)rebase.set(item.id,{...exportState(currentRecord),...item.safeValues});
       }
       desiredRows.push(item);
     }else{
       pendingCreates.push(item);
       if(!item.errors.length)item.action='Créer';
     }
     if(item.errors.length)item.action='Erreur';
     else if(item.conflicts.length)item.action='Conflit';
     else if(item.changes.length)item.action='Modifier';
     result.results.push(item);
   }
   // The complete Excel file is authoritative: every omitted original ID is
   // deleted. A record created or materially changed after export requires a
   // fresh snapshot, never an unreviewed deletion of someone else's work.
   for(const [id,record] of live){
     if(seen.has(id))continue;
     const original=base.get(id);
     const item={line:'—',id,existing:record,values:canonical(record),changes:[],errors:[],warnings:[],conflicts:[],safeValues:{},action:'Supprimer'};
     if(!original){
       item.action='Conflit';issue(item,'Fiche ajoutée depuis l’export : actualisez la matrice pour décider de sa suppression.','new');result.newRecords.push(item);
     }else{
       // V2/V4 contain the complete original state. V3 stored only editable
       // fields, so it cannot authorize deletion of unknown attached history.
       const incomplete=original.__pstSnapshotComplete===false&&hasProtectedData(record);
       const changed=original.__pstSnapshotComplete===false?
         JSON.stringify(canonical(original))!==JSON.stringify(canonical(record)):
         deletionFingerprint(original)!==deletionFingerprint(record);
       if(incomplete||changed){
         item.action='Conflit';issue(item,incomplete?'Ancien instantané incomplet : exportez une nouvelle matrice avant de supprimer cette fiche.':'Cette fiche a changé depuis l’export : actualisez la matrice avant de la supprimer.','delete');
       }else{result.deletions.push(item);rebase.delete(id);}
     }
     result.results.push(item);
   }
   // Check the exact final registry, not the current registry with only some
   // proposed changes. A number swap and deletion/replacement are permitted.
   const effective=new Map(liveRows.map(x=>[String(x.id),canonical(x)]));
   for(const item of desiredRows)if(item.id&&live.has(item.id)&&!item.errors.length)effective.set(item.id,item.values);
   for(const item of result.deletions)effective.delete(item.id);
   for(let i=0;i<pendingCreates.length;i++)effective.set('__new'+i,pendingCreates[i].values);
   const numbers=new Map(),signatures=new Map();
   for(const [id,x] of effective){
     const n=norm(x.no),sig=signature(x);
     if(n){const ids=numbers.get(n)||[];ids.push(id);numbers.set(n,ids);}
     if(x.name){const ids=signatures.get(sig)||[];ids.push(id);signatures.set(sig,ids);}
   }
   for(const item of [...desiredRows,...pendingCreates]){
     if(!item.errors.length){
       const n=norm(item.values.no),sig=signature(item.values);
       if(n&&(numbers.get(n)||[]).length>1)item.errors.push('Numéro déjà utilisé par une autre fiche du registre final');
       if(item.values.name&&(signatures.get(sig)||[]).length>1)item.errors.push('Fiche identique existante : vérifiez matériel, lieu et prestataire');
       else if(!item.id&&item.values.name&&[...effective].some(([id,x])=>id!=='__new'+pendingCreates.indexOf(item)&&similar(x)===similar(item.values)))item.warnings.push('Contrôle similaire : vérifiez matériel, lieu et prestataire.');
     }
   }
   for(const item of result.results){
     item.errors=[...new Set(item.errors)];item.warnings=[...new Set(item.warnings)];
     if(item.errors.length){item.action='Erreur';result.errors.push(item);}
     if(item.conflicts.length)result.conflicts.push(item);
     if(item.warnings.length)result.warnings.push(item);
   }
   result.fullAllowed=!result.fatal&&!result.errors.length&&!result.conflicts.length;
   if(!result.fullAllowed&&!result.fatal)result.fatal=`${result.errors.length} erreur(s) et ${result.conflicts.length} conflit(s) à résoudre. Aucune modification ni suppression ne sera appliquée. Téléchargez une matrice actualisée pour reprendre vos corrections.`;
   result.deletedIds=result.deletions.map(x=>x.id);
   result.desiredIds=desiredRows.map(x=>x.id).filter(Boolean);
   result.deletionBaseline=result.deletions.map(x=>[x.id,deletionFingerprint(live.get(x.id))]);
   if(result.fullAllowed){
     for(const item of desiredRows)if(item.changes.length)result.operations.push({type:'update',id:item.id,values:item.safeValues,changes:item.changes});
     for(const item of pendingCreates)result.operations.push({type:'create',values:item.values});
   }
   // Recovery is a separate download, never a partial write. It starts from
   // the current registry and carries forward safe edits and intended safe
   // omissions. Conflicted records remain present until a fresh authorization.
   result.rebaseRows=[...rebase.values(),...pendingCreates.map(x=>({...x.values,id:''}))];
   return result;
 }
 window.PSTPeriodicMatrixCore={fields,canonical,snapshot,snapshotEquals,build,norm,signature,similar,exportState,deletionFingerprint,hasProtectedData};
})();
