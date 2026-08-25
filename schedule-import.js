/* Pilotage Service Technique V147.144 — import/export horaires + contrôles RH non bloquants */
(() => {
  'use strict';

  function activeSchoolRange(){
    const data=window.PSTMainState?.get?.()||{};
    const raw=String(data.settings?.academicYear||'');
    const m=raw.match(/(\d{4})\s*[-–]\s*(\d{4})/);
    const now=new Date();
    const startYear=(m&&Number(m[2])===Number(m[1])+1)?Number(m[1]):(now.getMonth()>=8?now.getFullYear():now.getFullYear()-1);
    return {start:`${startYear}-09-01`,end:`${startYear+1}-08-31`,label:`${startYear}-${startYear+1}`};
  }
  const DAYS=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
  const DAY_KEYS=[1,2,3,4,5,6,0];
  const PROFILES=['Standard','Matin','Soir'];
  let pending=null;
  const $i=id=>document.getElementById(id);
  const norm=v=>String(v??'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
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
    if(typeof v==='number') {const mins=Math.round(v*24*60)%1440;return `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;}
    const s=String(v).trim();const m=s.match(/^(\d{1,2})[:hH](\d{2})/);return m?`${m[1].padStart(2,'0')}:${m[2]}`:'';
  };
  const minutes=t=>{const m=timeText(t).match(/^(\d{2}):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):null};
  const rhCheck=({start='',end='',pause=0,segments=[]}={})=>{
    const warnings=[];pause=Math.max(0,Number(pause||0));let segs=Array.isArray(segments)?segments.filter(x=>x?.start&&x?.end):[];if(!segs.length&&start&&end)segs=[{start,end}];
    const p=segs.map(x=>({s:minutes(x.start),e:minutes(x.end)})).filter(x=>x.s!==null&&x.e!==null&&x.e>=x.s);if(!p.length)return {warnings,effective:0,amplitude:0,type:'Repos'};
    const first=Math.min(...p.map(x=>x.s)),last=Math.max(...p.map(x=>x.e)),raw=p.reduce((n,x)=>n+x.e-x.s,0),effective=Math.max(0,(raw-pause)/60),amplitude=(last-first)/60;
    const type=effective>=6?'Journée':effective>=3?'Demi-journée':'Durée courte';
    if(amplitude>12)warnings.push('Amplitude supérieure à 12 h');
    if(effective>10)warnings.push('Temps de travail effectif supérieur à 10 h');
    if(effective>0&&effective<3)warnings.push('Durée inférieure à 3 h : repère RH demi-journée non atteint');
    if(first<690&&last>840&&pause<30)warnings.push('Pause méridienne de 30 min prévue lorsque l’horaire couvre 11h30–14h00');
    return {warnings,effective,amplitude,type};
  };
  const excelHhmm=t=>{const m=String(t||'').match(/^(\d{1,2}):(\d{2})$/);return m?Number(m[1])*100+Number(m[2]):''};

  const agentLabel=a=>[a?.title,a?.firstName,a?.lastName].filter(Boolean).join(' ').trim()||a?.name||a?.agent||'';
  const agentMap=()=>{
    const byId=new Map(),byName=new Map();
    (db.agents||[]).forEach(a=>{byId.set(String(a.id),a);byName.set(norm(agentLabel(a)),a)});
    return {byId,byName};
  };
  const cell=(ws,addr,value,style)=>{ws[addr]={t:typeof value==='number'?'n':'s',v:value};if(style)ws[addr].s=style};
  const setWidths=(ws,widths)=>ws['!cols']=widths.map(w=>({wch:w}));
  const addAutoFilter=(ws,range)=>ws['!autofilter']={ref:range};
  const styleSheet=(ws,headerCount,rows)=>{
    ws['!freeze']={xSplit:0,ySplit:1,topLeftCell:'A2',activePane:'bottomLeft',state:'frozen'};
    for(let c=0;c<headerCount;c++){const a=XLSX.utils.encode_cell({r:0,c});if(ws[a])ws[a].s={font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1F4E78'}},alignment:{horizontal:'center',vertical:'center',wrapText:true}}}
    for(let r=1;r<rows;r++)for(let c=0;c<headerCount;c++){const a=XLSX.utils.encode_cell({r,c});if(ws[a])ws[a].s={fill:{fgColor:{rgb:r%2?'F7FAFC':'FFFFFF'}},alignment:{vertical:'top',wrapText:c>7}}}
  };
  const exportMatrix=()=>{
    if(!window.XLSX){alert('Le composant Excel ne s’est pas chargé. Vérifiez la connexion Internet, puis réessayez.');return}
    const wb=XLSX.utils.book_new(), active=(db.agents||[]).filter(a=>norm(a.status||'actif')!=='archive');
    const agentRows=active.map(a=>({
      'Identifiant agent':a.id,'Nom de l’agent':agentLabel(a),'Fonction':a.role||'','Affectation principale':a.assignment||'',Actif:a.status||'Actif',
      'Samedi travaillé':(Array.isArray(a.workdays)?a.workdays:[1,2,3,4,5]).map(Number).includes(6)?'Oui':'Non',
      'Dimanche travaillé':(Array.isArray(a.workdays)?a.workdays:[1,2,3,4,5]).map(Number).includes(0)?'Oui':'Non',
      'Permanence début':a.permanenceSchedule?.start||a.permanenceStart||'',
      'Permanence fin':a.permanenceSchedule?.end||a.permanenceEnd||'',
      'Permanence pause (minutes)':Number(a.permanenceSchedule?.pause??a.permanencePause??0)
    }));
    const wsA=XLSX.utils.json_to_sheet(agentRows.length?agentRows:[{'Identifiant agent':'','Nom de l’agent':'','Fonction':'','Affectation principale':'','Actif':'Oui','Samedi travaillé':'Non','Dimanche travaillé':'Non','Permanence début':'','Permanence fin':'','Permanence pause (minutes)':0}]);
    setWidths(wsA,[25,28,24,28,12,18,20,18,18,24]);addAutoFilter(wsA,wsA['!ref']);styleSheet(wsA,10,agentRows.length+1);XLSX.utils.book_append_sheet(wb,wsA,'Agents');

    const hrows=[];
    active.forEach(a=>{
      const workdays=(Array.isArray(a.workdays)&&a.workdays.length?a.workdays:[1,2,3,4,5]).map(Number);
      const plans=(db.weeklyPlans||[]).filter(p=>String(p.agentId)===String(a.id));
      if(!plans.length){DAYS.forEach((day,i)=>{const key=DAY_KEYS[i],working=workdays.includes(key);hrows.push({'Identifiant agent':a.id,'Nom de l’agent':agentLabel(a),'Date début':activeSchoolRange().start,'Date fin':activeSchoolRange().end,'Profil horaire':'Standard','Jour':day,'Type de journée':working?'Travaillé':'Repos','Heure début':'','Heure fin':'','Pause (minutes)':0,'Plage 1 début':'','Plage 1 fin':'','Plage 2 début':'','Plage 2 fin':'','Interruption non comptabilisée (min)':0,'Type RH':'','Temps effectif (h)':'','Amplitude (h)':'','Avertissement RH':working?'Horaire à compléter':'','Mission principale':'','Commentaire':'','Contrôle':working?'À compléter':'OK'})});return}
      plans.forEach(p=>DAYS.forEach((day,i)=>{const key=DAY_KEYS[i],x=p.dayProfiles?.[key]||{},working=workdays.includes(key)&&!!(x.start&&x.end);(()=>{const seg=(x.segments||[]).filter(z=>z?.start&&z?.end),s1=seg[0]||{start:x.start||'',end:seg.length>1?seg[0]?.end||'':x.end||''},s2=seg[1]||null,rh=working?rhCheck({start:x.start,end:x.end,pause:Number(x.pause||0),segments:seg}):{warnings:[],effective:0,amplitude:0,type:'Repos'};hrows.push({'Identifiant agent':a.id,'Nom de l’agent':agentLabel(a),'Date début':p.effectiveFrom||activeSchoolRange().start,'Date fin':p.effectiveTo||activeSchoolRange().end,'Profil horaire':p.shift||'Standard','Jour':day,'Type de journée':working?'Travaillé':'Repos','Heure début':working?x.start||'':'','Heure fin':working?x.end||'':'','Pause (minutes)':working?Number(x.pause||0):0,'Plage 1 début':working?s1.start||x.start||'':'','Plage 1 fin':working?s1.end||x.end||'':'','Plage 2 début':working?(s2?.start||''):'','Plage 2 fin':working?(s2?.end||''):'','Interruption non comptabilisée (min)':working?Number(x.pause||0):0,'Type RH':working?rh.type:'Repos','Temps effectif (h)':working?Number(rh.effective.toFixed(2)):0,'Amplitude (h)':working?Number(rh.amplitude.toFixed(2)):0,'Avertissement RH':rh.warnings.join(' · '),'Mission principale':working?x.missions||'':'','Commentaire':'','Contrôle':'OK'})})()}));
    });
    const wsH=XLSX.utils.json_to_sheet(hrows);
    const hHeaders=Object.keys(hrows[0]||{});setWidths(wsH,[25,28,13,13,16,13,16,12,12,14,14,14,14,18,14,16,14,16,36,30,28,34]);addAutoFilter(wsH,wsH['!ref']);styleSheet(wsH,hHeaders.length,hrows.length+1);
    // V147.144 — Matrice RH dynamique.
    // Les cellules de calcul se recalculent dans Excel à chaque modification d'horaire.
    // Les anomalies sont des WARNING uniquement : jamais de blocage.
    const idx=Object.fromEntries(hHeaders.map((h,i)=>[h,XLSX.utils.encode_col(i)]));
    const col=name=>idx[name];

    for(let r=2;r<=hrows.length+1;r++){
      const typeDay=col('Type de journée');
      const start=col('Heure début'),end=col('Heure fin'),pause=col('Pause (minutes)');
      const p1s=col('Plage 1 début'),p1e=col('Plage 1 fin'),p2s=col('Plage 2 début'),p2e=col('Plage 2 fin');
      const interrupt=col('Interruption non comptabilisée (min)');
      const typeRh=col('Type RH'),effective=col('Temps effectif (h)'),amplitude=col('Amplitude (h)');
      const warning=col('Avertissement RH'),control=col('Contrôle');
      const current=hrows[r-2]||{};

      wsH[`${start}${r}`]={
        t:'s',v:String(current['Heure début']||''),
        f:`IF(${typeDay}${r}="Repos","",IF(${p1s}${r}<>"",${p1s}${r},${p2s}${r}))`
      };
      wsH[`${end}${r}`]={
        t:'s',v:String(current['Heure fin']||''),
        f:`IF(${typeDay}${r}="Repos","",IF(${p2e}${r}<>"",${p2e}${r},${p1e}${r}))`
      };

      const pauseUsed=`IF(${interrupt}${r}<>"",N(${interrupt}${r}),N(${pause}${r}))`;

      wsH[`${effective}${r}`]={
        t:'n',v:Number(current['Temps effectif (h)']||0),
        f:`IF(${typeDay}${r}="Repos",0,IF(AND(${start}${r}<>"",${end}${r}<>""),MAX(0,(TIMEVALUE(${end}${r})-TIMEVALUE(${start}${r}))*24-${pauseUsed}/60),""))`
      };
      wsH[`${amplitude}${r}`]={
        t:'n',v:Number(current['Amplitude (h)']||0),
        f:`IF(${typeDay}${r}="Repos",0,IF(AND(${start}${r}<>"",${end}${r}<>""),(TIMEVALUE(${end}${r})-TIMEVALUE(${start}${r}))*24,""))`
      };
      wsH[`${typeRh}${r}`]={
        t:'s',v:String(current['Type RH']||''),
        f:`IF(${typeDay}${r}="Repos","Repos",IF(${effective}${r}="","À compléter",IF(${effective}${r}<3,"Durée courte",IF(${effective}${r}<6,"Demi-journée","Journée"))))`
      };

      const incomplete=`OR(AND(${p1s}${r}<>"",${p1e}${r}=""),AND(${p1s}${r}="",${p1e}${r}<>""),AND(${p2s}${r}<>"",${p2e}${r}=""),AND(${p2s}${r}="",${p2e}${r}<>""))`;
      const chronology=`OR(AND(${p1s}${r}<>"",${p1e}${r}<>"",TIMEVALUE(${p1e}${r})<TIMEVALUE(${p1s}${r})),AND(${p2s}${r}<>"",${p2e}${r}<>"",TIMEVALUE(${p2e}${r})<TIMEVALUE(${p2s}${r})),AND(${p1e}${r}<>"",${p2s}${r}<>"",TIMEVALUE(${p2s}${r})<TIMEVALUE(${p1e}${r})))`;
      const coversLunch=`AND(${start}${r}<>"",${end}${r}<>"",TIMEVALUE(${start}${r})<TIME(11,30,0),TIMEVALUE(${end}${r})>TIME(14,0,0))`;
      const lunchGap=`IF(AND(${p1e}${r}<>"",${p2s}${r}<>""),MAX(0,(TIMEVALUE(${p2s}${r})-TIMEVALUE(${p1e}${r}))*1440),${pauseUsed})`;
      const morningDuration=`IF(AND(${p1s}${r}<>"",${p1e}${r}<>""),(TIMEVALUE(${p1e}${r})-TIMEVALUE(${p1s}${r}))*24,0)`;
      const afternoonDuration=`IF(AND(${p2s}${r}<>"",${p2e}${r}<>""),(TIMEVALUE(${p2e}${r})-TIMEVALUE(${p2s}${r}))*24,0)`;

      // Toutes les anomalies de la ligne sont concaténées pour être visibles en même temps.
      const parts=[
        `IF(${incomplete},"⚠ Plages fixes incomplètes · ","")`,
        `IF(${chronology},"⚠ Ordre chronologique des plages à vérifier · ","")`,
        `IF(AND(${amplitude}${r}<>"",${amplitude}${r}>12),"⚠ Amplitude supérieure à 12 h · ","")`,
        `IF(AND(${effective}${r}<>"",${effective}${r}>10),"⚠ Temps de travail effectif supérieur à 10 h · ","")`,
        `IF(AND(${effective}${r}>0,${effective}${r}<3),"⚠ Durée inférieure à 3 h : minimum RH demi-journée non atteint · ","")`,
        `IF(AND(${coversLunch},${lunchGap}<30,${morningDuration}>=6),"⚠ Pause méridienne 30 min obligatoire ; plage du matin ≥ 6 h : pause journalière 20 min à prévoir dans la plage · ","")`,
        `IF(AND(${coversLunch},${lunchGap}<30,${afternoonDuration}>=6),"⚠ Pause méridienne 30 min obligatoire ; plage de l’après-midi ≥ 6 h : pause journalière 20 min à prévoir dans la plage · ","")`,
        `IF(AND(${coversLunch},${lunchGap}<30,${morningDuration}<6,${afternoonDuration}<6),"⚠ Pause méridienne de 30 min minimum à prévoir · ","")`,
        `IF(AND(${start}${r}<>"",${end}${r}<>"",${pauseUsed}>=(TIMEVALUE(${end}${r})-TIMEVALUE(${start}${r}))*1440),"⚠ Pause supérieure ou égale à l’amplitude · ","")`,
        `IF(COUNTIFS($A:$A,A${r},$C:$C,C${r},$D:$D,D${r},$E:$E,E${r},$F:$F,F${r})>1,"⚠ Doublon agent / période / profil / jour · ","")`
      ];
      const joined=parts.join('&');
      const warnFormula=`IF(${typeDay}${r}="Repos","",IF(AND(${start}${r}="",${end}${r}=""),"⚠ Horaire à compléter",IFERROR(IF(RIGHT(${joined},3)=" · ",LEFT(${joined},LEN(${joined})-3),${joined}),"")))`;

      wsH[`${warning}${r}`]={t:'s',v:String(current['Avertissement RH']||''),f:warnFormula};
      wsH[`${control}${r}`]={
        t:'s',v:current['Avertissement RH']?'WARNING':'OK',
        f:`IF(${typeDay}${r}="Repos","OK",IF(${warning}${r}<>"","WARNING — À vérifier","OK — Conforme RH"))`
      };
    }

    wb.Workbook=wb.Workbook||{};
    wb.Workbook.CalcPr={calcMode:'auto',fullCalcOnLoad:true,forceFullCalc:true};

    XLSX.utils.book_append_sheet(wb,wsH,'Horaires annuels');

    const rrows=(db.rotations||[]).map(r=>{const a=(db.agents||[]).find(x=>String(x.id)===String(r.agentId));return {'Identifiant roulement':r.id,'Identifiant agent':r.agentId,'Nom de l’agent':agentLabel(a),'Date d’effet':r.effectiveFrom||'','Date de fin':r.effectiveTo||'','Nom du roulement':r.no||'','Semaines Matin':Number(r.morningWeeks||2),'Semaines Soir':Number(r.eveningWeeks||2),'Commence par':r.startShift||'Matin','Heure matin début':r.morningStart||'','Heure matin fin':r.morningEnd||'','Heure soir début':r.eveningStart||'','Heure soir fin':r.eveningEnd||'','Pause (minutes)':Number(r.pause||0),'Jours travaillés':(r.weekdays||((a&&Array.isArray(a.workdays))?a.workdays:[1,2,3,4,5])).join(','),'Commentaire':r.notes||'','Contrôle':'OK'}});
    if(!rrows.length)active.forEach(a=>rrows.push({'Identifiant roulement':'','Identifiant agent':a.id,'Nom de l’agent':agentLabel(a),'Date d’effet':activeSchoolRange().start,'Date de fin':activeSchoolRange().end,'Nom du roulement':'','Semaines Matin':2,'Semaines Soir':2,'Commence par':'Matin','Heure matin début':'','Heure matin fin':'','Heure soir début':'','Heure soir fin':'','Pause (minutes)':0,'Jours travaillés':(Array.isArray(a.workdays)&&a.workdays.length?a.workdays:[1,2,3,4,5]).join(','),'Commentaire':'','Contrôle':'À compléter'}));
    const wsR=XLSX.utils.json_to_sheet(rrows);setWidths(wsR,[24,25,28,13,13,20,15,15,15,16,16,16,16,15,18,28,32]);addAutoFilter(wsR,wsR['!ref']);styleSheet(wsR,17,rrows.length+1);XLSX.utils.book_append_sheet(wb,wsR,'Roulements');

    const instructions=[
      ['MATRICE HORAIRES ET ROULEMENTS — PILOTAGE SERVICE TECHNIQUE'],
      ['1. Les agents, horaires et roulements actuels sont déjà présents.'],
      ['2. Modifiez les heures, périodes, missions ou cycles. Ne modifiez pas les identifiants.'],
      ['3. Modifiez principalement Plage 1 / Plage 2 et les pauses : Heure début/fin, Type RH, Temps effectif, Amplitude, Avertissement RH et Contrôle se recalculent automatiquement.'],
      ['4. Réimportez ensuite ce même fichier dans l’application.'],
      ['5. Toute non-conformité RH apparaît automatiquement en WARNING dans Excel. Les warnings restent informatifs et ne bloquent jamais le réimport dans Pilotage.'],
      ['6. Les congés, RTT, absences et modifications ponctuelles ne sont pas supprimés.'],
      ['7. Dans l’onglet Agents, indiquez Oui/Non pour le samedi et le dimanche : ces valeurs mettent à jour les jours travaillés.'],['8. Renseignez aussi Permanence début, Permanence fin et Permanence pause (minutes).']
    ];
    const wsM=XLSX.utils.aoa_to_sheet(instructions);setWidths(wsM,[105]);wsM['A1'].s={font:{bold:true,color:{rgb:'FFFFFF'},sz:16},fill:{fgColor:{rgb:'1F4E78'}},alignment:{horizontal:'center'}};XLSX.utils.book_append_sheet(wb,wsM,'Mode d’emploi');
    wb.Workbook={Views:[{RTL:false}]};
    const data=XLSX.write(wb,{bookType:'xlsx',type:'array',compression:true,bookSST:true});const blob=new Blob([data],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});if(typeof triggerDownloadBlob==='function')triggerDownloadBlob(`Horaires_Roulements_${new Date().toISOString().slice(0,10)}.xlsx`,blob);else XLSX.writeFile(wb,`Horaires_Roulements_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const readRows=(wb,name)=>{const ws=wb.Sheets[name];return ws?XLSX.utils.sheet_to_json(ws,{defval:'',raw:true}):[]};
  const get=(row,...names)=>{for(const n of names){if(Object.prototype.hasOwnProperty.call(row,n))return row[n]}const keys=Object.keys(row);for(const n of names){const k=keys.find(k=>norm(k)===norm(n));if(k)return row[k]}return ''};
  const validateWorkbook=wb=>{
    const maps=agentMap(), agentRows=readRows(wb,'Agents'), hours=readRows(wb,'Horaires annuels'), rotations=readRows(wb,'Roulements');
    const results=[], validHours=[], validRot=[], agentSettings=[], duplicate=new Set();
    const yes=v=>['oui','yes','1','true','x'].includes(norm(v));
    agentRows.forEach((row,index)=>{
      if(Object.values(row).every(v=>String(v).trim()===''))return;
      const aid=String(get(row,'Identifiant agent','Agent ID')).trim(),name=String(get(row,"Nom de l’agent",'Nom agent','Agent')).trim(),agent=maps.byId.get(aid)||maps.byName.get(norm(name));
      if(!agent)return;
      const satRaw=get(row,'Samedi travaillé','Samedi'),sunRaw=get(row,'Dimanche travaillé','Dimanche');
       const permStart=timeText(get(row,'Permanence début','Début permanence')),permEnd=timeText(get(row,'Permanence fin','Fin permanence')),permPause=Number(get(row,'Permanence pause (minutes)','Pause permanence')||0);
       const permErrors=[];if((permStart&&!permEnd)||(!permStart&&permEnd))permErrors.push('Permanence début/fin incomplet');
       if(permStart&&permEnd){const sm=minutes(permStart),em=minutes(permEnd);if(sm!==null&&em!==null&&em<=sm)permErrors.push('Permanence : fin avant début');if(sm!==null&&em!==null&&permPause>=em-sm)permErrors.push('Permanence : pause trop longue')}
       if(String(satRaw).trim()!==''||String(sunRaw).trim()!==''||permStart||permEnd||permPause){agentSettings.push({agent,saturday:yes(satRaw),sunday:yes(sunRaw),permanenceStart:permStart,permanenceEnd:permEnd,permanencePause:permPause});results.push({kind:'Jours agent',line:index+2,agent,name:agentLabel(agent),from:'',to:'',profile:'',errors:permErrors,warnings:[],detail:`Samedi : ${yes(satRaw)?'travaillé':'repos'} · Dimanche : ${yes(sunRaw)?'travaillé':'repos'} · Permanence : ${permStart&&permEnd?`${permStart}–${permEnd}`:'non renseignée'}`})}
    });
    hours.forEach((row,index)=>{
      if(Object.values(row).every(v=>String(v).trim()===''))return;
      const aid=String(get(row,'Identifiant agent','Agent ID')).trim(),name=String(get(row,"Nom de l’agent",'Nom agent','Agent')).trim();
      const agent=maps.byId.get(aid)||maps.byName.get(norm(name)); const errors=[], warnings=[];
      const from=isoDate(get(row,'Date début','Début')),to=isoDate(get(row,'Date fin','Fin')),profile=String(get(row,'Profil horaire','Profil')).trim(),day=String(get(row,'Jour')).trim(),type=String(get(row,'Type de journée','Type')).trim()||'Travaillé';
      const p1s=timeText(get(row,'Plage 1 début')),p1e=timeText(get(row,'Plage 1 fin')),p2s=timeText(get(row,'Plage 2 début')),p2e=timeText(get(row,'Plage 2 fin'));
      const start=timeText(get(row,'Heure début','Début horaire'))||p1s,end=timeText(get(row,'Heure fin','Fin horaire'))||p2e||p1e,pause=Number(get(row,'Interruption non comptabilisée (min)','Pause (minutes)','Pause')||0),mission=String(get(row,'Mission principale','Mission')||'');
      const segments=[];if(p1s&&p1e)segments.push({start:p1s,end:p1e,task:'Présence'});if(p2s&&p2e)segments.push({start:p2s,end:p2e,task:'Présence'});
      if(!agent)errors.push('Agent inconnu');if(!from||!to)errors.push('Période invalide');else if(to<from)errors.push('Fin de période avant le début');if(!PROFILES.includes(profile))errors.push('Profil invalide');if(!DAYS.includes(day))errors.push('Jour invalide');
      if(norm(type)!=='repos'){
        if((start&&!end)||(!start&&end))errors.push('Début/fin incomplet');
        if(!start&&!end)warnings.push('Horaire vide : la journée deviendra repos');
        const sm=minutes(start),em=minutes(end);if(sm!==null&&em!==null&&em<=sm)errors.push('Heure de fin avant le début');if(sm!==null&&em!==null&&pause>=em-sm)warnings.push('Pause supérieure ou égale à l’amplitude : à vérifier');const rh=rhCheck({start,end,pause,segments});warnings.push(...rh.warnings.map(x=>`RH : ${x}`));
      }
      const key=agent?`${agent.id}|${from}|${to}|${profile}|${day}`:`row-${index}`;if(duplicate.has(key))warnings.push('Doublon dans le fichier : la dernière ligne sera retenue sans créer de doublon dans Pilotage');duplicate.add(key);
      const item={kind:'Horaire',line:index+2,agent,name:agent?agentLabel(agent):name,from,to,profile,day,type,start,end,pause,segments,mission,errors,warnings,row};results.push(item);if(!errors.length)validHours.push(item);
    });
    rotations.forEach((row,index)=>{
      if(Object.values(row).every(v=>String(v).trim()===''))return;
      const aid=String(get(row,'Identifiant agent')).trim(),name=String(get(row,"Nom de l’agent",'Agent')).trim(),agent=maps.byId.get(aid)||maps.byName.get(norm(name));const errors=[],warnings=[];
      const from=isoDate(get(row,"Date d’effet",'Date effet')),to=isoDate(get(row,'Date de fin')),mw=Number(get(row,'Semaines Matin')||0),ew=Number(get(row,'Semaines Soir')||0),startShift=String(get(row,'Commence par')).trim(),ms=timeText(get(row,'Heure matin début')),me=timeText(get(row,'Heure matin fin')),es=timeText(get(row,'Heure soir début')),ee=timeText(get(row,'Heure soir fin'));
      if(!agent)errors.push('Agent inconnu');if(!from)errors.push('Date d’effet invalide');if(to&&to<from)errors.push('Date de fin avant date d’effet');if(!(mw>=1&&ew>=1))errors.push('Cycle matin/soir invalide');if(!['Matin','Soir'].includes(startShift))errors.push('Départ du roulement invalide');if(!ms||!me||!es||!ee)warnings.push('Heures générales du roulement incomplètes');
      const item={kind:'Roulement',line:index+2,agent,name:agent?agentLabel(agent):name,from,to,mw,ew,startShift,ms,me,es,ee,pause:Number(get(row,'Pause (minutes)')||0),weekdays:String(get(row,'Jours travaillés')||'1,2,3,4,5').split(',').map(Number).filter(n=>n>=0&&n<=6),notes:String(get(row,'Commentaire')||''),rotationId:String(get(row,'Identifiant roulement')||''),errors,warnings,row};results.push(item);if(!errors.length)validRot.push(item);
    });
    // Vérifie que les profils Matin et Soir existent dans le fichier ou déjà dans la base.
    validRot.forEach(r=>{for(const profile of ['Matin','Soir']){const exists=validHours.some(h=>h.agent?.id===r.agent?.id&&h.profile===profile&&h.from<=r.from&&h.to>=r.from)||(db.weeklyPlans||[]).some(p=>String(p.agentId)===String(r.agent?.id)&&p.shift===profile);if(!exists)r.warnings.push(`Profil ${profile} introuvable`)}});
    return {results,validHours,validRot,agentSettings};
  };
  const preview=data=>{
    pending=data;const errors=data.results.filter(x=>x.errors.length),warnings=data.results.filter(x=>!x.errors.length&&x.warnings.length),ok=data.results.filter(x=>!x.errors.length&&!x.warnings.length);
    $i('scheduleImportSummary').className='import-summary';$i('scheduleImportSummary').innerHTML=`<div class="import-stat ok"><strong>${ok.length}</strong><span>lignes correctes</span></div><div class="import-stat warning"><strong>${warnings.length}</strong><span>avertissements</span></div><div class="import-stat error"><strong>${errors.length}</strong><span>erreurs bloquantes</span></div><div class="import-stat"><strong>${new Set(data.validHours.map(x=>x.agent?.id).filter(Boolean)).size}</strong><span>agents concernés</span></div>`;
    $i('confirmScheduleImport').classList.toggle('hidden',data.validHours.length+data.validRot.length===0);
    $i('scheduleImportPreview').innerHTML=`<table><thead><tr><th>État</th><th>Type</th><th>Ligne</th><th>Agent</th><th>Période / date</th><th>Profil / cycle</th><th>Détail</th></tr></thead><tbody>${data.results.map(x=>{const cls=x.errors.length?'error':x.warnings.length?'warning':'ok',state=x.errors.length?'Erreur':x.warnings.length?'À vérifier':'OK',detail=[...x.errors,...x.warnings].join(' · ')||x.detail||(x.kind==='Horaire'?`${x.day} ${x.start||'Repos'}${x.end?'–'+x.end:''} ${x.mission||''}`:`${x.mw||0} sem. matin / ${x.ew||0} sem. soir`);return `<tr class="import-row-${cls}"><td><span class="import-badge ${cls}">${state}</span></td><td>${x.kind}</td><td>${x.line}</td><td>${x.name||'—'}</td><td>${x.from||'—'}${x.to?' → '+x.to:''}</td><td>${x.kind==='Horaire'?x.profile:x.kind==='Roulement'?x.startShift:'Jours travaillés'}</td><td>${detail}</td></tr>`}).join('')}</tbody></table>`;
  };
  const importFile=async file=>{
    if(!window.XLSX){alert('Le composant Excel ne s’est pas chargé. Vérifiez Internet.');return}
    try{const buf=await file.arrayBuffer(),wb=XLSX.read(buf,{type:'array',cellDates:true});preview(validateWorkbook(wb));}
    catch(e){console.error(e);alert(`Impossible de lire le fichier : ${e.message}`)}
  };
  const applyImport=async()=>{
    if(!pending)return;
    for(const item of pending.agentSettings||[]){
      const a=item.agent,current=(Array.isArray(a.workdays)&&a.workdays.length?a.workdays:[1,2,3,4,5]).map(Number).filter(d=>d!==0&&d!==6);
      if(item.saturday)current.push(6);if(item.sunday)current.push(0);a.workdays=[...new Set(current)];
       if(item.permanenceStart||item.permanenceEnd||Number(item.permanencePause||0)){a.permanenceSchedule={start:item.permanenceStart||'',end:item.permanenceEnd||'',pause:Number(item.permanencePause||0)};a.permanenceStart=a.permanenceSchedule.start;a.permanenceEnd=a.permanenceSchedule.end;a.permanencePause=a.permanenceSchedule.pause}
    }
    const groups=new Map();
    pending.validHours.forEach(x=>{const key=`${x.agent.id}|${x.from}|${x.to}|${x.profile}`;if(!groups.has(key))groups.set(key,{id:null,agentId:x.agent.id,agent:agentLabel(x.agent),shift:x.profile,effectiveFrom:x.from,effectiveTo:x.to,dayProfiles:{},rows:[]});const p=groups.get(key),dayIndex=DAY_KEYS[DAYS.indexOf(x.day)],working=norm(x.type)!=='repos'&&x.start&&x.end;p.dayProfiles[dayIndex]={start:working?x.start:'',end:working?x.end:'',pause:working?x.pause:0,missions:x.mission||'',segments:working?(x.segments||[]):[]};});
    let created=0,updated=0;
    groups.forEach(p=>{const idx=(db.weeklyPlans||[]).findIndex(old=>String(old.agentId)===String(p.agentId)&&old.shift===p.shift&&old.effectiveFrom===p.effectiveFrom&&old.effectiveTo===p.effectiveTo);if(idx>=0){p.id=db.weeklyPlans[idx].id||uid();db.weeklyPlans[idx]=p;updated++}else{p.id=uid();db.weeklyPlans.push(p);created++}});
    let rotCreated=0,rotUpdated=0;
    pending.validRot.forEach(x=>{let idx=x.rotationId?(db.rotations||[]).findIndex(r=>String(r.id)===x.rotationId):-1;if(idx<0)idx=(db.rotations||[]).findIndex(r=>String(r.agentId)===String(x.agent.id)&&r.effectiveFrom===x.from);const r={id:idx>=0?db.rotations[idx].id:uid(),no:idx>=0?(db.rotations[idx].no||''):(typeof nextNo==='function'?nextNo('rotation','RLT'):''),agentId:x.agent.id,effectiveFrom:x.from,effectiveTo:x.to,startShift:x.startShift,morningWeeks:x.mw,eveningWeeks:x.ew,morningStart:x.ms,morningEnd:x.me,eveningStart:x.es,eveningEnd:x.ee,pause:x.pause,weekdays:x.weekdays.length?x.weekdays:[1,2,3,4,5],notes:x.notes};if(idx>=0){db.rotations[idx]=r;rotUpdated++}else{db.rotations.push(r);rotCreated++}});
    if(typeof syncStoredChronotimePastilles==='function')syncStoredChronotimePastilles();
    // Les jours de week-end décochés dans l'onglet Agents sont aussi retirés des roulements existants.
    for(const a of db.agents||[]){const allowed=(Array.isArray(a.workdays)&&a.workdays.length?a.workdays:[1,2,3,4,5]).map(Number);for(const r of (db.rotations||[]).filter(r=>String(r.agentId)===String(a.id))){r.weekdays=(r.weekdays||[1,2,3,4,5]).map(Number).filter(d=>allowed.includes(d))}}
    db.scheduleImports=db.scheduleImports||[];
    const importMarker=typeof uid==='function'?uid():String(Date.now());
    db.scheduleImports.push({id:importMarker,date:new Date().toISOString(),created,updated,rotCreated,rotUpdated,errors:pending.results.filter(x=>x.errors.length).length,warnings:pending.results.filter(x=>x.warnings.length).length});

    // Afficher immédiatement les nouvelles données dans tous les modules.
    if(typeof safeRenderAll==='function')safeRenderAll();

    const persisted=window.PSTMainState?.persistStateDirect
      ? await window.PSTMainState.persistStateDirect({
          label:'Import horaires',
          verify:remote=>(remote.scheduleImports||[]).some(x=>String(x.id)===String(importMarker))
        })
      : (window.PSTMainState?.persistNow?await window.PSTMainState.persistNow():{ok:save(),offline:false});

    if(!persisted?.ok){
      $i('scheduleImportSummary').innerHTML=`<div class="import-stat error"><strong>Import appliqué localement — Supabase non confirmé</strong><span>${persisted?.error||'Erreur Supabase non précisée'}. Les modifications restent protégées sur cet appareil.</span></div>`;
      if(typeof safeRenderAll==='function')safeRenderAll();
      if(typeof toast==='function')toast(`Import horaires non confirmé : ${persisted?.error||'erreur Supabase'}`);
      return;
    }

    pending=null;
    $i('confirmScheduleImport').classList.add('hidden');
    $i('scheduleImportSummary').innerHTML=`<div class="import-success"><strong>✅ Import horaires terminé et synchronisé</strong><span>${created} profil(s) créé(s), ${updated} modifié(s), ${rotCreated} roulement(s) créé(s), ${rotUpdated} modifié(s).</span></div>`;
    $i('scheduleImportPreview').innerHTML='';
    if(typeof safeRenderAll==='function')safeRenderAll();
    if(typeof toast==='function')toast('✅ Horaires et roulements mis à jour');
  };
  const init=()=>{
    const d=$i('downloadScheduleMatrix'),f=$i('scheduleImportFile'),c=$i('confirmScheduleImport');if(!d||!f||!c)return;
    d.addEventListener('click',exportMatrix);f.addEventListener('change',e=>{const file=e.target.files?.[0];if(file)importFile(file);e.target.value=''});c.addEventListener('click',applyImport);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
