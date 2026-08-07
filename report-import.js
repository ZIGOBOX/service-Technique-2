'use strict';

(function(){
  let chronoPending=null, controlPending=null, pdfjsPromise=null;
  const DAY_LETTER=['D','L','M','M','J','V','S'];
  const DEFAULT_CODE_MAP={CA:'Congé annuel',RTT:'RTT',RH:'Repos',RFE:'Jour férié'};
  const CONTROL_ORGS=['APAVE','SOCOTEC','BUREAU VERITAS','VERITAS','DEKRA','QUALICONSULT','ALPES CONTROLES','ALPES CONTRÔLES','NORISKO','SGS','BUREAU ALPES CONTROLES','BUREAU ALPES CONTRÔLES','AC ENVIRONNEMENT','ANCO','QUALICONSULT EXPLOITATION','GROUPE QUALICONSULT'];
  const CONTROL_KEYWORDS=['non-conform','non conform','anomal','réserve','reserve','observation','écart','ecart','remarque','défaut','defaut','prescription','action corrective','mise en conformité','mise en conformite','à corriger','a corriger','danger','risque','non satisfaisant','non-satisfaisant','défectueux','defectueux','à réparer','a reparer','à remplacer','a remplacer','levée de réserve','levee de reserve'];
  const CONTROL_POSITIVE=['conforme','satisfaisant','sans observation','aucune anomalie','ras'];
  const CHRONO_HINT_WORDS=['gfi chrono time','chronotime','chrono time','synoptique annuel','synoptique','badgeage','pointage','temps de présence','temps de presence','temps de travail','tps prés','tps pres','tps pr','ca pris','référence','reference','écart','ecart','solde','agent','matricule'];
  const GFI_MONTHS=['septembre','octobre','novembre','décembre','janvier','février','mars','avril','mai','juin','juillet','août'];

  function ensureData(){
    db.pdfImports=db.pdfImports||[];
    db.chronotimeDaily=db.chronotimeDaily||[];
    db.chronotimeAnnual=db.chronotimeAnnual||[];
    db.reportNonconformities=db.reportNonconformities||[];
    db.settings=db.settings||{};
    db.settings.chronoCodeMap=Object.assign({},DEFAULT_CODE_MAP,db.settings.chronoCodeMap||{});
    db.settings.chronoAgentHints=db.settings.chronoAgentHints||{};
    db.settings.controlFamilyHints=db.settings.controlFamilyHints||{};
    db.lists=db.lists||{};
    db.lists.dayTypes=db.lists.dayTypes||[];
    for(const v of ['Jour férié']) if(!db.lists.dayTypes.includes(v)) db.lists.dayTypes.push(v);
  }
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const norm=s=>clean(s).toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const basename=s=>String(s||'').replace(/\.[^.]+$/,'');
  const words=s=>norm(s).replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(x=>x.length>1);
  const filenameSignature=name=>words(basename(name)).filter(x=>!['pdf','rapport','controle','control','document','scan','chronotime','chrono'].includes(x)).slice(0,5).join('|');
  function similarity(a,b){const A=new Set(words(a)),B=new Set(words(b));if(!A.size||!B.size)return 0;let n=0;for(const x of A)if(B.has(x))n++;return n/Math.max(A.size,B.size)}
  function confidenceLabel(score){return score>=85?'Très élevée':score>=70?'Élevée':score>=50?'Moyenne':'Faible'}
  const fmtDateTime=v=>v?new Date(v).toLocaleString('fr-FR'):'—';
  const academicFromPeriod=(start,end)=> start&&end?`${start.slice(0,4)}-${end.slice(0,4)}`:'';
  const durationToMinutes=s=>{
    const m=String(s||'').replace(/\s+/g,'').match(/^([+-]?)(\d{1,5})(?::|h)(\d{2})$/i);if(!m)return null;
    const sign=m[1]==='-'?-1:1;return sign*(Number(m[2])*60+Number(m[3]));
  };
  const durationTokens=s=>[...String(s||'').matchAll(/[+-]?\d{1,5}\s*(?::|h)\s*\d{2}/gi)].map(m=>m[0]);
  const dayTokens=s=>[...String(s||'').matchAll(/(\d+)\s*j\s*(\d{2})/gi)].map(m=>Number(m[1])+Number(m[2])/100);
  function footerSlice(text,startRx,endRx){const m=text.match(startRx);if(!m)return '';const from=(m.index||0)+m[0].length;const rest=text.slice(from);if(!endRx)return rest.slice(0,1400);const e=rest.search(endRx);return (e>=0?rest.slice(0,e):rest.slice(0,1400));}
  function parseAnnualFooter(text,allLines){
    let presence=null,reference=null,delta=null,leaveTakenDays=null;
    const candidates=allLines.filter(l=>/(tps\s*pr|temps\s*(de )?pr[ée]sence|pr[ée]sence.*r[ée]f[ée]rence|solde|[ée]cart)/i.test(l));
    for(const l of candidates){const times=durationTokens(l);if(times.length>=3){presence=durationToMinutes(times.at(-3));reference=durationToMinutes(times.at(-2));delta=durationToMinutes(times.at(-1));if(presence!=null&&reference!=null&&delta!=null)break}}
    if(presence==null||reference==null||delta==null){
      const zone=footerSlice(text,/\b(?:tps\s*pr(?:[ée]s)?|temps\s*(?:de\s*)?pr[ée]sence)\b/i,/\bca\s+pris\b/i);
      const times=durationTokens(zone);if(times.length>=3){presence??=durationToMinutes(times.at(-3));reference??=durationToMinutes(times.at(-2));delta??=durationToMinutes(times.at(-1));}
    }
    const caLine=allLines.find(l=>/\bca\s+pris\b/i.test(l));
    if(caLine){const vals=dayTokens(caLine);if(vals.length>=3)leaveTakenDays=vals.at(-3)}
    if(leaveTakenDays==null){const zone=footerSlice(text,/\bca\s+pris\b/i,null);const vals=dayTokens(zone);if(vals.length>=3)leaveTakenDays=vals.at(-3)}
    return {presence,reference,delta,leaveTakenDays};
  }
  const minutesToDuration=m=>{if(m==null||Number.isNaN(m))return '—';const sign=m<0?'-':m>0?'+':'';m=Math.abs(Math.round(m));return `${sign}${Math.floor(m/60)}h${String(m%60).padStart(2,'0')}`};
  async function fileFingerprint(file){try{const buf=await file.arrayBuffer();const hash=await crypto.subtle.digest('SHA-256',buf);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('')}catch(e){return `${file.name}|${file.size}|${file.lastModified||0}`}}

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
  function findAgent(name,fileName=''){
    const sig=filenameSignature(fileName),hint=sig&&db.settings.chronoAgentHints?.[sig];
    if(hint){const a=(db.agents||[]).find(x=>String(x.id)===String(hint));if(a)return a}
    const n=norm(name);const fn=norm(fileName);let best=null,bestScore=0;
    for(const a of (db.agents||[])){
      const full=`${a.lastName||''} ${a.firstName||''}`,rev=`${a.firstName||''} ${a.lastName||''}`,last=norm(a.lastName||'');
      let score=Math.max(similarity(n,full),similarity(n,rev));
      if(n&&(norm(full)===n||norm(rev)===n))score=1;
      if(last&&fn.includes(last))score=Math.max(score,.82);
      if(n&&last&&n.includes(last))score=Math.max(score,.78);
      if(score>bestScore){bestScore=score;best=a}
    }
    return bestScore>=.48?best:null;
  }
  function monthSequence(start){const y=Number(start.slice(0,4));return Array.from({length:12},(_,i)=>{const n=8+i;return {year:y+Math.floor(n/12),month:(n%12)+1}})}
  function validDate(y,m,d,letter){const dt=new Date(y,m-1,d);return dt.getFullYear()===y&&dt.getMonth()===m-1&&dt.getDate()===d&&DAY_LETTER[dt.getDay()]===letter}
  function parseChronotime(extracted,file){
    const text=extracted.text, allLines=extracted.pages.flatMap(p=>p.lines), nt=norm(text), nf=norm(file?.name||'');
    const isGfiAnnual=/gfi\s+chrono\s*time/i.test(text)&&/synoptique\s+annuel/i.test(text);
    const namePatterns=[/Nom\s*(?:de l['’]agent)?\s*[:=-]\s*([^\n]+)/i,/Agent\s*[:=-]\s*([^\n]+)/i,/Collaborateur\s*[:=-]\s*([^\n]+)/i,/Salari[ée]\s*[:=-]\s*([^\n]+)/i,/Employ[ée]\s*[:=-]\s*([^\n]+)/i];
    let agentNameRaw='';for(const rx of namePatterns){const m=text.match(rx);if(m){agentNameRaw=clean(m[1]).replace(/\s{2,}.*/,'');break}}
    const periodPatterns=[/du\s+(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4})\s+(?:au|à)\s+(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4})/i,/p[ée]riode\s*[:=-]?\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4})\s*(?:au|à|-)\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4})/i,/du\s+(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2})\s+(?:au|à)\s+(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2})/i];
    let start='',end='';for(const rx of periodPatterns){const m=text.match(rx);if(m){start=parseFrDate(m[1]);end=parseFrDate(m[2]);if(start&&end)break}}
    if(!start||!end){const ds=[...text.matchAll(/\b(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4})\b/g)].map(m=>parseFrDate(m[1])).filter(Boolean).sort();if(ds.length>=2){start=ds[0];end=ds.at(-1)}}
    const year=academicFromPeriod(start,end), months=start?monthSequence(start):[];
    let totals=parseAnnualFooter(text,allLines);
    const totalSources={presence:totals.presence!=null?'Pied de page PDF':'',reference:totals.reference!=null?'Pied de page PDF':'',delta:totals.delta!=null?'Pied de page PDF':'',leaveTakenDays:totals.leaveTakenDays!=null?'Pied de page PDF':''};
    const records=[],codes=new Set(),seenDates=new Set();
    for(const line of allLines){
      const normalized=line.replace(/(\d)\s*[Hh]\s*(\d{2})/g,'$1h$2');
      const pairs=[...normalized.matchAll(/\b([LMSJVD])\s*(\d{1,2})\s+(\d{1,2}(?:h|:)\d{2}|[A-ZÀ-Ü][A-ZÀ-Ü0-9._-]{1,9})\b/g)];
      if(!pairs.length||!months.length)continue;let mi=0;
      for(const p of pairs){const letter=p[1],day=Number(p[2]),value=p[3].replace(':','h').toUpperCase();let found=-1;for(let k=mi;k<months.length;k++){const x=months[k];if(validDate(x.year,x.month,day,letter)){found=k;break}}if(found<0)continue;mi=found+1;const x=months[found],date=`${x.year}-${String(x.month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;const duration=/h/i.test(value)?durationToMinutes(value.toLowerCase()):null;if(duration==null)codes.add(value);if(!seenDates.has(date)){seenDates.add(date);records.push({date,value,duration});}}
    }
    const ignored=new Set(['GFI','CHRONO','TIME','LYCEE','TOTAL','REFERENCE','ECART','TPS','NOM','AGENT','SOLDE','HEURE','HEURES','PRESENCE','MAT']);[...codes].forEach(c=>{if(ignored.has(c))codes.delete(c)});

    let expectedDays=0;
    if(start&&end){const a=new Date(start+'T12:00:00'),b=new Date(end+'T12:00:00');expectedDays=Math.round((b-a)/86400000)+1}
    const coverage=expectedDays?Math.round(records.length/expectedDays*100):0;
    const codeCounts={};for(const r of records)if(r.duration==null)codeCounts[r.value]=(codeCounts[r.value]||0)+1;
    const durationDays=records.filter(r=>r.duration!=null).length;
    const computedPresence=records.reduce((sum,r)=>sum+(r.duration!=null?r.duration:0),0);
    if(totals.presence==null&&durationDays){totals.presence=computedPresence;totalSources.presence='Somme des durées journalières'}
    if(totals.leaveTakenDays==null&&Number.isFinite(codeCounts.CA)){totals.leaveTakenDays=codeCounts.CA;totalSources.leaveTakenDays='Comptage des journées CA'}
    if(totals.delta==null&&totals.presence!=null&&totals.reference!=null){totals.delta=totals.presence-totals.reference;totalSources.delta='Calcul Présence − Référence'}
    if(totals.reference==null&&totals.presence!=null&&totals.delta!=null){totals.reference=totals.presence-totals.delta;totalSources.reference='Calcul Présence − Δ'}
    const monthly={};for(const r of records){const key=r.date.slice(0,7);const m=monthly[key]||(monthly[key]={days:0,durationMinutes:0,codes:{}});m.days++;if(r.duration!=null)m.durationMinutes+=r.duration;else m.codes[r.value]=(m.codes[r.value]||0)+1}
    const agent=findAgent(agentNameRaw,file?.name||'');
    const requiredInfo=[['Agent',!!(agentNameRaw||agent)],['Période',!!(start&&end)],['Calendrier',!!expectedDays&&records.length===expectedDays],['Présence annuelle',totals.presence!=null],['Référence annuelle',totals.reference!=null],['Écart annuel',totals.delta!=null],['CA pris',totals.leaveTakenDays!=null]];
    const missingInfo=requiredInfo.filter(([,ok])=>!ok).map(([label])=>label);
    const infoCoverage=Math.round(requiredInfo.filter(([,ok])=>ok).length/requiredInfo.length*100);
    const headerMonthHits=GFI_MONTHS.filter(m=>nt.includes(norm(m))).length;
    let score=0;
    if(isGfiAnnual)score+=30;else if(CHRONO_HINT_WORDS.some(w=>nt.includes(norm(w))||nf.includes(norm(w))))score+=20;
    if(agent)score+=20;if(start&&end)score+=15;if(expectedDays&&records.length===expectedDays)score+=20;else if(records.length>=5)score+=10;
    if(totals.delta!=null||totals.presence!=null)score+=10;if(headerMonthHits>=10)score+=5;score=Math.min(100,score);
    const calendarComplete=!!expectedDays&&records.length===expectedDays;
    const informationComplete=missingInfo.length===0;
    const complete=calendarComplete&&informationComplete;
    // Un 100 % n'est accordé que si le calendrier ET toutes les informations annuelles sont présents.
    score=Math.min(score,informationComplete?100:94);
    return {kind:'chronotime',format:isGfiAnnual?'GFI Chrono Time — Synoptique annuel':'Chronotime générique',file,extracted,agentNameRaw,agent,start,end,academicYear:year,totals, totalSources,records,codes:[...codes].sort(),unknownCodes:[...codes].filter(c=>!db.settings.chronoCodeMap[c]),confidence:score,expectedDays,coverage,codeCounts,durationDays,calendarComplete,informationComplete,missingInfo,infoCoverage,monthly,complete};
  }
  function controlOrganization(text){const u=norm(text);for(const x of CONTROL_ORGS){if(u.includes(norm(x)))return x.replace('BUREAU ALPES CONTROLES','ALPES CONTRÔLES').replace('BUREAU ALPES CONTRÔLES','ALPES CONTRÔLES')}const m=text.match(/(?:organisme|soci[ée]t[ée]|bureau de contr[oô]le)\s*[:=-]\s*([^\n]{3,70})/i);return m?clean(m[1]):'Organisme de contrôle'}
  const CONTROL_RULES=[
    ['Électricité',['electri','installation electrique','verification electrique','q18','q19','thermographie','tableau electrique','basse tension','haute tension','prise de terre','disjoncteur','tgbt','cellule ht']],
    ['SSI / Incendie',['ssi','systeme de securite incendie','securite incendie','alarme incendie','desenfumage','sprinkler','coordination ssi','cmsi','ecs incendie','dac','detection incendie']],
    ['Extincteurs',['extincteur','ria','robinet incendie arme','moyens de secours','q4']],
    ['Ascenseurs / Levage',['ascenseur','monte charge','monte-charge','elevateur','appareil de levage','levage','palan','pont roulant','plateforme elevatrice','elevateur pmr']],
    ['Gaz',['installation gaz','chaufferie gaz','gaz combustible','detendeur gaz','vanne gaz']],
    ['VMC / Ventilation',['vmc','ventilation','extraction','aeration','hotte','ventilateur extraction']],
    ['Équipements sportifs',['equipement sportif','but de football','panier de basket','gymnase','agres','agrès','cage de but','equipements de sport']],
    ['Aires de jeux',['aire de jeux','jeu exterieur','toboggan','balancoire','structure de jeu']],
    ['Portes / Portails',['porte automatique','portail','porte coupe feu','porte coupe-feu','barriere automatique','rideau metallique']],
    ['Eau / Sanitaire',['legionell','eau potable','sanitaire','ecs','eau chaude sanitaire','potabilite','analyse eau']],
    ['Chauffage',['chauffage','chaudiere','chaufferie','bruleur','brûleur','pompe a chaleur','pac ']],
    ['Amiante / Plomb',['amiante','dta','dossier technique amiante','plomb','crep','repérage amiante','reperage amiante']],
    ['Radon / Air',['radon','qualite de l air','qualité de l’air','qai','co2','polluants air']],
    ['Foudre',['paratonnerre','foudre','protection foudre','analyse risque foudre','arf']],
    ['Cuisine / Cuisson',['cuisine','appareil de cuisson','grande cuisine','hotte cuisine','extraction cuisine']],
    ['Accessibilité',['accessibilite','accessibilité','pmr','handicap']],
  ];
  function detectControlFamily(text='',fileName=''){
    const sig=filenameSignature(fileName),hint=sig&&db.settings.controlFamilyHints?.[sig];if(hint)return hint;
    const t=norm(`${fileName} ${text}`);let best='Autres contrôles',bestScore=0;
    for(const [family,ws] of CONTROL_RULES){let score=0;for(const w of ws){if(t.includes(norm(w)))score+=norm(w).length>12?3:1}if(score>bestScore){bestScore=score;best=family}}
    return best;
  }
  function detectReportDate(text){const labeled=[/(?:date du rapport|date de visite|date d['’]inspection|date du contr[oô]le|intervention du|v[ée]rification du)\s*[:=-]?\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4})/i,/(?:visit[ée]?|contr[oô]l[ée]?|inspect[ée]?)\s+le\s+(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4})/i];for(const r of labeled){const m=text.match(r);if(m)return parseFrDate(m[1])}const ds=[...text.matchAll(/\b(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4})\b/g)].map(m=>parseFrDate(m[1])).filter(Boolean);return ds[0]||todayISO()}
  function parseControl(extracted,file){
    const lines=extracted.pages.flatMap(p=>p.lines).map(clean).filter(Boolean),text=extracted.text,nt=norm(text),org=controlOrganization(text),reportDate=detectReportDate(text),candidates=[];
    for(let i=0;i<lines.length;i++){
      const l=lines[i],n=norm(l);if(!CONTROL_KEYWORDS.some(k=>n.includes(norm(k))))continue;if(/nombre de|total|sommaire|legende|légende|definition|définition|modele|modèle/.test(n))continue;
      if(CONTROL_POSITIVE.some(k=>n.includes(norm(k)))&&!/(non conform|anomal|reserve|défaut|defaut|ecart|prescription)/.test(n))continue;
      let ctx=[lines[i-1],l,lines[i+1]].filter(Boolean).join(' · ');ctx=clean(ctx).slice(0,700);if(ctx.length<18)continue;
      const nn=norm(ctx);let priority='Normale';if(/danger immediat|danger grave|critique|urgent|mise hors service|risque electrique|risque incendie/.test(nn))priority='Urgente';else if(/majeur|important|prioritaire|non conform|anomalie/.test(nn))priority='Haute';
      if(!candidates.some(x=>similarity(x.text,ctx)>.88))candidates.push({id:uid(),text:ctx,priority,action:'À analyser et corriger',selected:true,page:extracted.pages.find(p=>p.lines.includes(l))?.page||''});
    }
    const controlFamily=detectControlFamily(text,file?.name||'');let score=0;if(org!=='Organisme de contrôle')score+=20;if(controlFamily!=='Autres contrôles')score+=25;if(reportDate)score+=15;if(candidates.length)score+=25;if(/rapport|verification|vérification|controle|contrôle|inspection|reglementaire|réglementaire/.test(nt))score+=15;score=Math.min(100,score);
    return {kind:'control',file,extracted,organization:org,reportDate,controlFamily,candidates:candidates.slice(0,150),confidence:score};
  }

  function status(id,text,kind='info'){const e=document.getElementById(id);if(e)e.innerHTML=`<div class="import-message ${kind}">${esc(text)}</div>`}
  function renderCodeMap(){ensureData();const box=document.getElementById('chronoCodeMap');if(!box)return;box.innerHTML=Object.entries(db.settings.chronoCodeMap).sort().map(([k,v])=>`<span class="code-map-item"><strong>${esc(k)}</strong><span>${esc(v)}</span></span>`).join('')||'<p>Aucun code enregistré.</p>'}
  function renderHistory(){ensureData();const box=document.getElementById('pdfImportHistory');if(!box)return;const arr=[...db.pdfImports].filter(x=>x.kind==='chronotime').sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));box.innerHTML=arr.length?`<table><thead><tr><th>Date</th><th>Type</th><th>Fichier</th><th>Agent / organisme</th><th>Année</th><th>Résumé</th></tr></thead><tbody>${arr.map(x=>`<tr><td>${esc(fmtDateTime(x.createdAt))}</td><td>${esc(x.kind==='chronotime'?'Chronotime':'Rapport contrôle')}</td><td>${esc(x.fileName||'')}</td><td>${esc(x.subject||'')}</td><td>${esc(x.academicYear||'—')}</td><td>${esc(x.summary||'')}</td></tr>`).join('')}</tbody></table>`:'<div class="empty-state">Aucune injection PDF.</div>'}
  function currentAcademic(){return typeof activeAcademicYear==='function'?activeAcademicYear():academicYearFor(todayISO())}
  function renderDashboard(){ensureData();const box=document.getElementById('chronoDashboard');if(!box)return;const year=currentAcademic();const active=(db.agents||[]).filter(a=>normalizeText(a.status)==='actif');const rows=active.map(a=>{const x=[...db.chronotimeAnnual].filter(r=>String(r.agentId)===String(a.id)&&r.academicYear===year).sort((u,v)=>(v.injectedAt||'').localeCompare(u.injectedAt||''))[0];return {a,x}});box.innerHTML=rows.map(({a,x})=>`<button class="chrono-agent-card" data-go="pdfimports"><strong>${esc(agentName(a))}</strong><span class="chrono-delta ${!x?'none':x.deltaMinutes===0?'ok':Math.abs(x.deltaMinutes)<=300?'warn':'bad'}">${x?minutesToDuration(x.deltaMinutes):'Non injecté'}</span><small>${x?`Présence ${minutesToDuration(x.presenceMinutes).replace(/^\+/,'')} · Réf. ${minutesToDuration(x.referenceMinutes).replace(/^\+/,'')}`:'Aucun PDF Chronotime pour '+year}</small></button>`).join('');const last=[...db.pdfImports].filter(x=>x.kind==='chronotime').sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''))[0];const label=document.getElementById('chronoDashboardUpdated');if(label)label.textContent=last?`Année ${year} · dernière injection ${fmtDateTime(last.createdAt)}`:`Année ${year} · aucune injection`;}

  function chronoPreview(p){
    const box=document.getElementById('chronoPreview');if(!box)return;const selectedYear=currentAcademic(),yearMismatch=!!(p.academicYear&&p.academicYear!==selectedYear);if(typeof setAcademicYearMismatch==='function'){if(yearMismatch)setAcademicYearMismatch(p.academicYear,'Document Chronotime');else clearAcademicYearMismatch?.()}
    const agentOptionsHtml=(db.agents||[]).filter(a=>a.status!=='Inactif').map(a=>`<option value="${esc(a.id)}" ${p.agent?.id===a.id?'selected':''}>${esc(agentName(a))}</option>`).join('');
    const unknown=p.unknownCodes.length?`<div class="import-warning"><strong>Nouvelles abréviations détectées</strong>${p.unknownCodes.map(c=>`<label>${esc(c)}<select data-chrono-code="${esc(c)}"><option value="">Choisir…</option>${['Congé annuel','RTT','Repos','Jour férié','Maladie','Formation','Autorisation d’absence','Récupération','Autre'].map(v=>`<option>${esc(v)}</option>`).join('')}</select></label>`).join('')}</div>`:'';
    const counts=Object.entries(p.codeCounts||{}).sort().map(([k,v])=>`${esc(k)} : ${v}`).join(' · ')||'Aucun code';
    const integrity=p.expectedDays?`${p.records.length}/${p.expectedDays} jours (${p.coverage||0} %)`:`${p.records.length} jours`;
    const src=k=>p.totalSources?.[k]?` <small class="muted">(${esc(p.totalSources[k])})</small>`:'';
    const infoState=p.informationComplete?'✅ Toutes les informations annuelles ont été récupérées':`⚠ Informations à compléter : ${esc((p.missingInfo||[]).join(', ')||'inconnues')}`;
    const monthLabels=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
    const monthly=Object.entries(p.monthly||{}).sort().map(([ym,m])=>{const [y,mo]=ym.split('-').map(Number);const cs=Object.entries(m.codes||{}).map(([k,v])=>`${esc(k)} ${v}`).join(' · ');return `<tr><td>${monthLabels[mo-1]} ${y}</td><td>${m.days}</td><td>${minutesToDuration(m.durationMinutes).replace(/^\+/,'')}</td><td>${cs||'—'}</td></tr>`}).join('');
    box.innerHTML=`<div class="import-summary"><strong>${esc(p.file.name)}</strong><span>Format : <b>${esc(p.format||'Chronotime')}</b></span><span>Reconnaissance globale : <b>${p.confidence||0}% — ${confidenceLabel(p.confidence||0)}</b></span><span>Complétude des informations : <b>${p.infoCoverage||0}%</b></span><span>Agent détecté : ${esc(p.agentNameRaw||agentName(p.agent)||'—')}</span><span>Période : ${esc(p.start||'—')} → ${esc(p.end||'—')}</span><span>Année scolaire : ${esc(p.academicYear||'—')}</span><span>Intégrité du calendrier : <b>${integrity}</b></span><span>Codes lus : ${counts}</span><span>Jours avec durée : ${p.durationDays||0}</span><span>Présence : <b>${minutesToDuration(p.totals.presence).replace(/^\+/,'')}</b>${src('presence')}</span><span>Référence : <b>${minutesToDuration(p.totals.reference).replace(/^\+/,'')}</b>${src('reference')}</span><span>Δ annuel : <b>${minutesToDuration(p.totals.delta)}</b>${src('delta')}</span><span>CA pris détecté : <b>${p.totals.leaveTakenDays!=null?`${p.totals.leaveTakenDays} j`:'—'}</b>${src('leaveTakenDays')}</span></div><div class="import-message ${p.informationComplete?'ok':'warning'}">${infoState}</div>${p.expectedDays&&!p.calendarComplete?`<div class="import-message warning">⚠ Calendrier incomplet : ${integrity}. Le logiciel n’annoncera jamais ce document comme complet tant que tous les jours attendus ne sont pas lus.</div>`:''}${monthly?`<details class="chrono-details"><summary>Voir le détail mensuel avant injection</summary><div class="table-wrap"><table><thead><tr><th>Mois</th><th>Jours lus</th><th>Durées cumulées</th><th>Codes</th></tr></thead><tbody>${monthly}</tbody></table></div></details>`:''}<label>Agent à affecter<select id="chronoAgentSelect"><option value="">Choisir…</option>${agentOptionsHtml}</select></label>${unknown}${yearMismatch?`<div class="import-message warning"><strong>⚠ Mauvaise année scolaire.</strong> Le logiciel est sur ${esc(selectedYear)} mais ce PDF appartient à ${esc(p.academicYear)}. <button type="button" class="primary small" id="switchChronoAcademicYear">Basculer sur ${esc(p.academicYear)}</button></div>`:''}<div class="modal-actions inline-actions"><button class="ghost" id="cancelChronoImport">Annuler</button><button class="primary" id="applyChronoImport" ${yearMismatch?'disabled title="Choisissez la bonne année scolaire avant injection"':''}>Valider l’injection</button></div>`;
    document.getElementById('cancelChronoImport').onclick=()=>{chronoPending=null;box.innerHTML='';if(typeof clearAcademicYearMismatch==='function')clearAcademicYearMismatch();status('chronoImportStatus','Import annulé')};const sy=document.getElementById('switchChronoAcademicYear');if(sy)sy.onclick=()=>{setActiveAcademicYear(p.academicYear);chronoPreview(p)};
    document.getElementById('applyChronoImport').onclick=applyChrono;
  }
  async function applyChrono(){
    const p=chronoPending;if(!p)return;if(p.academicYear&&p.academicYear!==currentAcademic()){if(typeof setAcademicYearMismatch==='function')setAcademicYearMismatch(p.academicYear,'Document Chronotime');toast(`Sélectionnez l’année ${p.academicYear} avant l’injection`);return}const aid=document.getElementById('chronoAgentSelect')?.value;if(!aid){toast('Choisissez l’agent concerné');return}
    if(p.expectedDays&&!p.calendarComplete&&!confirm(`Le calendrier n’est pas complet (${p.records.length}/${p.expectedDays} jours). Voulez-vous vraiment l’injecter ?`))return;
    if(!p.informationComplete&&!confirm(`Certaines informations annuelles n’ont pas pu être récupérées : ${(p.missingInfo||[]).join(', ')}. Elles seront clairement signalées comme manquantes. Voulez-vous continuer ?`))return
    const chronoSig=filenameSignature(p.file?.name||'');if(chronoSig)db.settings.chronoAgentHints[chronoSig]=aid;
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
    const annual={id:uid(),agentId:aid,academicYear:p.academicYear,periodStart:p.start,periodEnd:p.end,presenceMinutes:p.totals.presence,referenceMinutes:p.totals.reference,deltaMinutes:p.totals.delta,leaveTakenDays:p.totals.leaveTakenDays,calendarCoverage:p.coverage,informationCoverage:p.infoCoverage,missingInfo:[...(p.missingInfo||[])],codeCounts:{...(p.codeCounts||{})},monthly:p.monthly||{},totalSources:p.totalSources||{},fileName:p.file.name,attachmentId:attachment?.id||'',injectedAt:new Date().toISOString()};
    const oldAnnual=db.chronotimeAnnual.find(x=>String(x.agentId)===String(aid)&&x.academicYear===p.academicYear);if(oldAnnual)Object.assign(oldAnnual,annual,{id:oldAnnual.id});else db.chronotimeAnnual.push(annual);
    db.pdfImports.push({id:uid(),kind:'chronotime',createdAt:new Date().toISOString(),fileName:p.file.name,attachmentId:attachment?.id||'',subject:agentName(agentById(aid)),academicYear:p.academicYear,summary:`${p.records.length}/${p.expectedDays||p.records.length} jours · infos ${p.infoCoverage||0}% · ${absences} absences · ${Object.entries(p.codeCounts||{}).map(([k,v])=>`${k} ${v}`).join(' · ')} · présence ${minutesToDuration(p.totals.presence)} · réf. ${minutesToDuration(p.totals.reference)} · Δ ${minutesToDuration(p.totals.delta)}${p.missingInfo?.length?` · manquant : ${p.missingInfo.join(', ')}`:''}`});
    save();renderCodeMap();renderHistory();renderDashboard();status('chronoImportStatus',`Injection terminée : ${p.records.length} jours, ${absences} absences, ${durations} durées.`, 'ok');document.getElementById('chronoPreview').innerHTML='';chronoPending=null;if(typeof clearAcademicYearMismatch==='function')clearAcademicYearMismatch();
  }
  function controlPreview(p){
    const box=document.getElementById('controlPreview');if(!box)return;const list=p.candidates.length?p.candidates.map((c,i)=>`<label class="control-candidate"><input type="checkbox" data-control-select="${i}" checked><span><strong>Non-conformité ${i+1}</strong><small>${esc(c.text)}</small></span><select data-control-priority="${i}">${['Basse','Normale','Haute','Urgente'].map(v=>`<option ${v===c.priority?'selected':''}>${v}</option>`).join('')}</select></label>`).join(''):'<div class="empty-state">Aucune non-conformité clairement détectée. Vous pouvez archiver le rapport sans créer d’intervention.</div>';
    box.innerHTML=`<div class="import-summary"><strong>${esc(p.file.name)}</strong><span>Reconnaissance : <b>${p.confidence||0}% — ${confidenceLabel(p.confidence||0)}</b></span><span>Organisme : ${esc(p.organization)}</span><span>Classement : <b>${esc(p.controlFamily||'Autres contrôles')}</b></span><span>Date détectée : ${fmtDate(p.reportDate)}</span><span>Non-conformités proposées : ${p.candidates.length}</span></div><label>Famille du contrôle<select id="controlFamilySelect">${['Électricité','SSI / Incendie','Extincteurs','Ascenseurs / Levage','Gaz','VMC / Ventilation','Équipements sportifs','Aires de jeux','Portes / Portails','Eau / Sanitaire','Chauffage','Amiante / Plomb','Radon / Air','Foudre','Cuisine / Cuisson','Accessibilité','Autres contrôles'].map(v=>`<option ${v===p.controlFamily?'selected':''}>${esc(v)}</option>`).join('')}</select></label><label class="inline-check"><input type="checkbox" id="controlCreateMaintenance" checked> Créer une intervention de maintenance pour chaque non-conformité validée</label><div class="control-candidate-list">${list}</div><div class="modal-actions inline-actions"><button class="ghost" id="cancelControlImport">Annuler</button><button class="primary" id="applyControlImport">Valider le rapport</button></div>`;
    document.getElementById('cancelControlImport').onclick=()=>{controlPending=null;box.innerHTML='';status('controlImportStatus','Import annulé')};document.getElementById('applyControlImport').onclick=applyControl;
  }
  async function applyControl(){
    const p=controlPending;if(!p)return;
    const selected=p.candidates.filter((c,i)=>document.querySelector(`[data-control-select="${i}"]`)?.checked);
    const createMaint=document.getElementById('controlCreateMaintenance')?.checked;
    const controlFamily=document.getElementById('controlFamilySelect')?.value||p.controlFamily||'Autres contrôles';
    const controlSig=filenameSignature(p.file?.name||'');if(controlSig)db.settings.controlFamilyHints[controlSig]=controlFamily;
    status('controlImportStatus','Enregistrement du PDF original dans Supabase…');
    const fileHash=await fileFingerprint(p.file);
    const duplicate=(db.pdfImports||[]).find(x=>x.kind==='control'&&x.fileHash===fileHash);
    if(duplicate){status('controlImportStatus',`Ce rapport a déjà été importé le ${fmtDateTime(duplicate.createdAt)}. Aucun doublon créé.`,'error');return}
    const reportId=uid();
    let attachment=null;
    try{
      attachment=await putFile(p.file,{module:'control-report',recordId:reportId});
      db.attachments.push(attachment);
    }catch(e){
      console.error('Archivage rapport contrôle',e);
      const msg=String(e?.message||e||'');
      const detail=/bucket|storage|row-level|policy|not found|unauthorized/i.test(msg)
        ? 'Le stockage Supabase des rapports n’est pas encore configuré. Exécutez le fichier SETUP_STORAGE_RAPPORTS.sql dans Supabase > SQL Editor.'
        : `Impossible d’enregistrer le PDF original : ${msg}`;
      status('controlImportStatus',detail,'error');
      toast?.('Rapport non enregistré : PDF non archivé');
      return;
    }
    let created=0;
    selected.forEach((c,i)=>{
      const pri=document.querySelector(`[data-control-priority="${p.candidates.indexOf(c)}"]`)?.value||c.priority;
      const nc={id:uid(),no:`NC-${String((db.reportNonconformities?.length||0)+1).padStart(4,'0')}`,organization:p.organization,controlFamily,reportDate:p.reportDate,text:c.text,priority:pri,status:'À traiter',sourceFile:p.file.name,attachmentId:attachment.id,createdAt:new Date().toISOString()};
      db.reportNonconformities.push(nc);
      if(createMaint){db.maintenance.push({id:uid(),no:nextNo('maintenance','MAI'),date:p.reportDate||todayISO(),title:`Non-conformité ${p.organization} - ${controlFamily}`,family:controlFamily,priority:pri,status:'À faire',building:'',floor:'',room:'',requester:p.organization,assigned:'',dueDate:'',cost:0,description:c.text,action:'À corriger puis faire lever la non-conformité',attachments:[attachment],sourceNonconformityId:nc.id});created++;}
    });
    db.pdfImports.push({id:reportId,kind:'control',createdAt:new Date().toISOString(),fileName:p.file.name,fileSize:p.file.size,fileHash,attachmentId:attachment.id,subject:p.organization,controlFamily,reportDate:p.reportDate,academicYear:academicYearFor(p.reportDate||todayISO()),summary:`${selected.length} non-conformité(s) validée(s) · ${created} intervention(s)`});
    save();renderHistory();renderControlLibrary();status('controlImportStatus',`Rapport archivé avec son PDF : ${selected.length} non-conformité(s), ${created} intervention(s) créée(s).`,'ok');document.getElementById('controlPreview').innerHTML='';controlPending=null;renderAll();
  }
  const CONTROL_FAMILIES=['Électricité','SSI / Incendie','Extincteurs','Ascenseurs / Levage','Gaz','VMC / Ventilation','Équipements sportifs','Aires de jeux','Portes / Portails','Eau / Sanitaire','Chauffage','Amiante / Plomb','Radon / Air','Foudre','Cuisine / Cuisson','Accessibilité','Autres contrôles'];
  function effectiveControlFamily(x){return x.controlFamily||detectControlFamily(`${x.subject||''} ${x.summary||''}`,x.fileName||'')}
  function renderControlFamilyFilter(){const sel=document.getElementById('controlReportFamily');if(!sel)return;const cur=sel.value;const families=[...new Set([...CONTROL_FAMILIES,...(db.pdfImports||[]).filter(x=>x.kind==='control').map(effectiveControlFamily)])];sel.innerHTML='<option value="">Toutes les familles</option>'+families.map(f=>`<option ${f===cur?'selected':''}>${esc(f)}</option>`).join('')}
  function renderControlLibrary(){ensureData();renderControlFamilyFilter();const box=document.getElementById('controlReportLibrary');if(!box)return;const filter=document.getElementById('controlReportFamily')?.value||'';const reports=[...db.pdfImports].filter(x=>x.kind==='control'&&(!filter||effectiveControlFamily(x)===filter)).sort((a,b)=>(b.reportDate||b.createdAt||'').localeCompare(a.reportDate||a.createdAt||''));if(!reports.length){box.innerHTML='<div class="empty-state">Aucun rapport de contrôle enregistré.</div>';return}const groups={};for(const r of reports){const f=effectiveControlFamily(r);(groups[f]||(groups[f]=[])).push(r)}box.innerHTML=Object.entries(groups).map(([family,arr])=>`<section class="control-report-group"><div class="control-report-group-title"><h4>${esc(family)}</h4><span>${arr.length} rapport(s)</span></div><div class="control-report-cards">${arr.map(r=>`<article class="control-report-card"><div><strong>${esc(r.fileName||'Rapport')}</strong><small>${esc(r.subject||'Organisme non renseigné')} · ${fmtDate(r.reportDate)||fmtDateTime(r.createdAt)}</small><p>${esc(r.summary||'')}</p></div><div class="control-report-actions">${r.attachmentId?`<button class="primary small" data-open-control-report="${esc(r.attachmentId)}">📄 Ouvrir le PDF</button>`:`<label class="ghost small button-link">📎 Rattacher le PDF<input type="file" accept="application/pdf,.pdf" data-reattach-report="${esc(r.id)}" hidden></label><small class="muted">Ancien rapport : PDF à rattacher une seule fois.</small>`}</div></article>`).join('')}</div></section>`).join('')}
  async function openControlReport(id){if(!id)return;try{if(typeof downloadAttachment==='function')await downloadAttachment(id);else{const rec=(db.attachments||[]).find(a=>a.id===id);if(rec&&typeof openStoragePath==='function')await openStoragePath(rec.storagePath,rec.name)}}catch(e){console.error(e);toast?.('Impossible d’ouvrir ce rapport') }}
  async function reattachControlReport(reportId,file){if(!file)return;const report=(db.pdfImports||[]).find(x=>x.id===reportId);if(!report)return;status('controlImportStatus','Rattachement du PDF original…');try{const attachment=await putFile(file,{module:'control-report',recordId:reportId});db.attachments.push(attachment);report.attachmentId=attachment.id;report.fileName=file.name||report.fileName;report.fileSize=file.size;report.fileHash=await fileFingerprint(file);save();renderControlLibrary();status('controlImportStatus','PDF rattaché. Le rapport peut maintenant être rouvert à tout moment.','ok')}catch(e){console.error(e);status('controlImportStatus','Impossible de rattacher le PDF. Vérifiez SETUP_STORAGE_RAPPORTS.sql dans Supabase.','error')}}
  async function onChronoFile(file){if(!file)return;ensureData();status('chronoImportStatus','Lecture du PDF en cours…');try{const ex=await extractPdf(file);chronoPending=parseChronotime(ex,file);status('chronoImportStatus',chronoPending.complete?`Document Chronotime complet : calendrier ${chronoPending.coverage}% et informations ${chronoPending.infoCoverage}%. Vérifiez puis validez.`:chronoPending.confidence>=50?`Document Chronotime reconnu, mais contrôle de complétude requis : calendrier ${chronoPending.coverage||0}% · informations ${chronoPending.infoCoverage||0}%.`:`Document lu, reconnaissance Chronotime faible (${chronoPending.confidence} %). Vérifiez l’agent et la période.`,chronoPending.complete?'ok':'warning');chronoPreview(chronoPending)}catch(e){console.error(e);status('chronoImportStatus',`Impossible de lire ce PDF : ${e.message||e}`,'error')}}
  async function onControlFile(file){if(!file)return;ensureData();status('controlImportStatus','Analyse du rapport en cours…');try{const ex=await extractPdf(file);controlPending=parseControl(ex,file);status('controlImportStatus',`Rapport analysé — reconnaissance ${controlPending.confidence} %. Vérifiez les éléments proposés.`,'ok');controlPreview(controlPending)}catch(e){console.error(e);status('controlImportStatus',`Impossible de lire ce PDF : ${e.message||e}`,'error')}}
  function bind(){const c=document.getElementById('chronoPdfFile'),r=document.getElementById('controlPdfFile'),f=document.getElementById('controlReportFamily');if(c)c.addEventListener('change',e=>onChronoFile(e.target.files?.[0]));if(r)r.addEventListener('change',e=>onControlFile(e.target.files?.[0]));if(f)f.addEventListener('change',renderControlLibrary);document.addEventListener('change',e=>{const input=e.target.closest('[data-reattach-report]');if(input){reattachControlReport(input.dataset.reattachReport,input.files?.[0]);}});document.addEventListener('click',e=>{const open=e.target.closest('[data-open-control-report]');if(open){e.preventDefault();openControlReport(open.dataset.openControlReport);return}const go=e.target.closest('[data-go="pdfimports"]');if(go){e.preventDefault();setView('pdfimports');renderHistory();renderCodeMap();}})}
  function init(){ensureData();bind();renderHistory();renderCodeMap();renderDashboard();renderControlLibrary()}
  window.PDFImportModule={init,renderHistory,renderCodeMap,renderDashboard,renderControlLibrary};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
