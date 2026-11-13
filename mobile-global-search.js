/* Recherche générale — téléphone uniquement.
 * Lecture directe de l'état chargé par Pilotage Service Technique, sans appel réseau
 * ni modification des données Supabase. Les cinq dernières requêtes restent sur l'appareil.
 */
(function () {
  'use strict';
  const MOBILE_MAX = 700;
  const STORAGE = 'pst-mobile-search-recent-v1';
  const MAX_RESULTS = 80;
  const PAGE_RESULTS = 20;
  const groups = [
    { key:'agents', label:'Agents', icon:'👥', type:'agent', view:'agents', fields:['firstName','lastName','name','role','assignment','status','sector','building'], title:r=>[r.firstName,r.lastName].filter(Boolean).join(' ')||r.name||'Agent', meta:r=>[r.role,r.assignment,r.status].filter(Boolean).join(' · ')},
    { key:'spaces', label:'Salles et locaux', icon:'🏫', type:'space', view:'settings', fields:['name','building','floor','type'], title:r=>/^\d+[a-z]?$/i.test(String(r.name||'').trim())?'Salle '+r.name:r.name||'Local', meta:r=>[r.building,r.floor,r.type].filter(Boolean).join(' · ')},
    { key:'maintenance', label:'Interventions', icon:'🔧', type:'maintenance', view:'maintenance', fields:['no','title','family','building','floor','sector','room','description','action','assigned','requester','status','priority','dueDate'], title:r=>r.title||r.no||'Intervention', meta:r=>[r.no,r.building,r.room,r.status].filter(Boolean).join(' · ')},
    { key:'periodic', label:'Contrôles périodiques', icon:'🛡️', type:'periodic', view:'periodic', fields:['no','name','family','building','floor','sector','room','provider','requirement','notes','status','nextDate'], title:r=>r.name||r.no||'Contrôle', meta:r=>[r.building,r.room,r.provider,r.nextDate].filter(Boolean).join(' · ')},
    { key:'cleaning', label:'Contrôles ménage', icon:'🧹', type:'cleaning', view:'cleaning', fields:['no','building','floor','room','roomType','comment','status','overallStatus','date'], title:r=>[r.room||r.roomType||r.building||'Contrôle ménage',r.date||''].filter(Boolean).join(' — '), meta:r=>[r.building,r.floor,r.overallStatus||r.status].filter(Boolean).join(' · ')},
    { key:'meetings', label:'Rendez-vous', icon:'📅', type:'meeting', view:'meetings', fields:['no','title','type','location','building','floor','room','participants','notes','actions','date','status'], title:r=>r.title||r.no||'Rendez-vous', meta:r=>[r.date,r.location||r.building,r.status].filter(Boolean).join(' · ')},
    { key:'notes', label:'Bloc-notes', icon:'📝', type:'note', view:'notes', fields:['no','title','text','category','building','room','status','priority','dueDate'], title:r=>r.title||r.no||'Note', meta:r=>[r.category,r.room,r.dueDate,r.status].filter(Boolean).join(' · ')},
    { key:'issues', label:'Sécurité et qualité', icon:'⚠️', type:'issue', view:'issues', fields:['no','title','category','building','floor','room','description','action','status','priority','dueDate'], title:r=>r.title||r.no||'Signalement', meta:r=>[r.category,r.room,r.status].filter(Boolean).join(' · ')},
    { key:'requests', label:'Demandes direction', icon:'↗️', type:'request', view:'requests', fields:['no','title','type','requester','building','floor','room','description','response','status','dueDate'], title:r=>r.title||r.no||'Demande', meta:r=>[r.type,r.room,r.status].filter(Boolean).join(' · ')},
    { key:'works', label:'Chantiers et GPA', icon:'🏗️', type:'work', view:'works', fields:['no','title','company','architect','building','floor','room','description','decision','status','dueDate'], title:r=>r.title||r.no||'Chantier', meta:r=>[r.company,r.building,r.room,r.status].filter(Boolean).join(' · ')},
    { key:'personalEvents', label:'Agenda personnel', icon:'🗓️', type:'personal', view:'personal', fields:['no','title','type','location','notes','date','status'], title:r=>r.title||r.type||'Événement', meta:r=>[r.date,r.type,r.location].filter(Boolean).join(' · ')},
    { key:'documents', label:'Documents', icon:'📚', type:'document', view:'documents', fields:['no','title','category','description','linkedModule'], title:r=>r.title||'Document', meta:r=>[r.category,r.linkedModule].filter(Boolean).join(' · ')},
    { key:'vacations', label:'Vacances et fermetures', icon:'🏫', type:'vacation', view:'vacations', fields:['name','zone','notes','start','end','status'], title:r=>r.name||'Vacances', meta:r=>[r.start,r.end,r.status].filter(Boolean).join(' · ')}
  ];
  const destinations = [
    { label:'Planning des agents', subtitle:'Consulter les horaires', icon:'🕒', view:'planning', terms:'planning horaires agent semaine roulement' },
    { label:'Agents et recrutements', subtitle:'Gérer les fiches des agents', icon:'👥', view:'agents', terms:'agent equipe personnel recrutement' },
    { label:'Chronotime', subtitle:'Imports et horaires', icon:'⏱️', view:'pdfimports', terms:'chronotime pdf import horaire' },
    { label:'Planning entretien et loge', subtitle:'Affectations et salles', icon:'🧹', view:'cleaning-duty-plans', terms:'planning entretien menage loge locaux salles' },
    { label:'Agenda personnel', subtitle:'Événements et rappels', icon:'📅', view:'personal', terms:'agenda evenement rappel calendrier' },
    { label:'Contrôles périodiques', subtitle:'Registre et échéances', icon:'🛡️', view:'periodic', terms:'controle periodique extincteur securite' },
    { label:'Interventions', subtitle:'Maintenance et travaux', icon:'🔧', view:'maintenance', terms:'intervention maintenance panne chauffage plomberie travaux' },
    { label:'Salles et locaux', subtitle:'Configuration des locaux', icon:'🏫', view:'settings', terms:'salle local piece bâtiment etage local' }
  ];
  const normalize = value=>String(value??'').toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/\s+/g,' ').trim();
  const truncate=(value,n=135)=>{const str=String(value||'');return str.length>n?str.slice(0,n-1)+'…':str;};
  const mobile = ()=>window.innerWidth<=MOBILE_MAX;
  const getData=()=>{
    try{return window.PSTMainState?.get?.()||{};}
    catch(_){return {};}
  };
  function readRecents(){
    try{const parsed=JSON.parse(window.localStorage.getItem(STORAGE)||'[]');return Array.isArray(parsed)?parsed.filter(x=>typeof x==='string'&&x.length<=120).slice(0,5):[];}
    catch(_){return [];}
  }
  function saveRecent(query){
    const clean=String(query||'').trim().slice(0,120);
    if(clean.length<2)return;
    const all=[clean,...readRecents().filter(x=>normalize(x)!==normalize(clean))].slice(0,5);
    try{window.localStorage.setItem(STORAGE,JSON.stringify(all));}catch(_){}
  }
  function score(text,title,tokens){
    const search=normalize(text), top=normalize(title);
    if(!tokens.every(t=>search.includes(t)))return 0;
    let result=1;
    for(const token of tokens){
      if(top===token)result+=18;
      else if(top.startsWith(token))result+=10;
      else if(top.includes(token))result+=7;
      else if(search.includes(' '+token))result+=2;
    }
    return result;
  }
  function findMatches(query){
    const tokens=normalize(query).split(' ').filter(Boolean);
    if(!tokens.length)return [];
    const db=getData(), all=[];
    for(const group of groups){
      const entries=Array.isArray(db[group.key])?db[group.key]:[];
      for(const record of entries){
        if(!record || record.id==null)continue;
        const title=String(group.title(record)||'');
        const meta=String(group.meta(record)||'');
        const fields=group.fields.map(f=>String(record[f]??''));
        // Utilisation des données réelles et non des tableaux HTML filtrés par période.
        const full=[title,meta,group.label,...fields].join(' ');
        const s=score(full,title,tokens);
        if(!s)continue;
        all.push({group:group.label,icon:group.icon,title,meta:truncate(meta),type:group.type,view:group.view,id:String(record.id),score:s});
      }
    }
    for(const route of destinations){
      const s=score([route.label,route.subtitle,route.terms].join(' '),route.label,tokens);
      if(s)all.push({group:'Accès aux rubriques',icon:route.icon,title:route.label,meta:route.subtitle,view:route.view,score:s-2});
    }
    all.sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title,'fr'));
    return all.slice(0,MAX_RESULTS);
  }
  function el(tag,cls,text){
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(text!==undefined)node.textContent=text;
    return node;
  }
  function init(){
    const dashboard=document.getElementById('dashboard');
    const hero=dashboard?.querySelector(':scope > .daily-hero-v149');
    if(!hero||document.getElementById('pstMobileGlobalSearch'))return;
    const box=el('section','pst-mobile-global-search');
    box.id='pstMobileGlobalSearch';
    box.setAttribute('aria-label','Recherche générale du logiciel');
    const label=el('label','pst-search-label','🔎 Recherche générale');
    label.htmlFor='pstGlobalSearchInput';
    const field=el('div','pst-search-field');
    const input=el('input','pst-search-input');
    input.id='pstGlobalSearchInput'; input.type='search';
    input.autocomplete='off'; input.spellcheck=false;
    input.placeholder='Salle, agent, intervention, contrôle…';
    input.maxLength=120;
    input.setAttribute('aria-controls','pstGlobalSearchResults');
    const clear=el('button','pst-search-clear','Effacer');
    clear.type='button'; clear.setAttribute('aria-label','Effacer la recherche');
    const results=el('div','pst-search-results');
    results.id='pstGlobalSearchResults';
    const count=el('p','pst-search-count');count.setAttribute('aria-live','polite');
    const content=el('div','pst-search-content');
    results.append(count,content);field.append(input,clear);box.append(label,field,results);
    hero.after(box);

    const externalBack=document.getElementById('pstMobileDashboardExternalBackButton');
    const defaultBack=externalBack?.textContent||'← Retour au tableau de bord';
    let lastQuery='',allMatches=[],shown=PAGE_RESULTS,focused=false,debounce=0;
    function setReturnContext(active){
      const wasSearch=document.body.classList.contains('pst-search-from-results');
      document.body.classList.toggle('pst-search-from-results',active);
      if(externalBack)externalBack.textContent=active?'← Retour aux résultats':defaultBack;
      if(active)document.body.classList.add('pst-mobile-external-from-tiles');
      else if(wasSearch)document.body.classList.remove('pst-mobile-external-from-tiles');
    }
    function restoreSearch(){
      setReturnContext(false);
      (window.PSTSetView||window.PSTNavigation?.switchView)?.('dashboard');
      dashboard.removeAttribute('data-pst-mobile-panel');
      window.scrollTo({top:0,behavior:'instant'});
      render(true);
      box.scrollIntoView({block:'start',behavior:'instant'});
    }
    if(externalBack){
      // Capture : empêche le bouton de retour des tuiles de forcer la fermeture de la recherche.
      externalBack.addEventListener('click',function(e){
        if(!document.body.classList.contains('pst-search-from-results'))return;
        e.preventDefault();e.stopImmediatePropagation();
        restoreSearch();
      },true);
    }
    document.addEventListener('click',e=>{
      if(e.target.closest('.pst-mobile-tile,[data-view="dashboard"]') && document.body.classList.contains('pst-search-from-results'))setReturnContext(false);
    },true);
    function render(forceOpen=false){
      if(!mobile()){results.hidden=true;return;}
      const query=input.value.trim();
      clear.hidden=!query;
      const opened=forceOpen || focused || Boolean(query);
      results.hidden=!opened;
      if(!opened)return;
      content.replaceChildren();
      if(!query){
        count.textContent='Recherche dans les fiches existantes du logiciel';
        const recents=readRecents();
        if(recents.length){
          const recentHeader=el('div','pst-search-recent-header');
          recentHeader.append(el('strong','','Recherches récentes'));
          const erase=el('button','pst-search-recent-erase','Effacer l’historique');erase.type='button';
          erase.addEventListener('click',()=>{try{localStorage.removeItem(STORAGE);}catch(_){}render(true);});
          recentHeader.append(erase);content.append(recentHeader);
          const chips=el('div','pst-search-recent-list');
          for(const term of recents){
            const chip=el('button','pst-search-recent-chip','↗ '+term);chip.type='button';
            chip.addEventListener('click',()=>{input.value=term;input.focus();render(true);});chips.append(chip);
          }
          content.append(chips);
        }else content.append(el('p','pst-search-hint','Exemples : 244, chauffage, Berthoux, Dalkia, extincteur…'));
        return;
      }
      if(normalize(query).length<2){count.textContent='Saisissez au moins 2 caractères.';return;}
      if(query!==lastQuery){allMatches=findMatches(query);lastQuery=query;shown=PAGE_RESULTS;}
      count.textContent=allMatches.length?`${allMatches.length}${allMatches.length===MAX_RESULTS?' ou plus':''} résultat${allMatches.length>1?'s':''} trouvé${allMatches.length>1?'s':''}`:'Aucun résultat trouvé. Essayez un autre mot.';
      const visible=allMatches.slice(0,shown),orderedGroups=[...new Set(visible.map(item=>item.group))];
      for(const name of orderedGroups){
        const section=el('div','pst-search-result-group');
        section.append(el('h3','pst-search-group-name',name));
        for(const item of visible.filter(x=>x.group===name)){
          const button=el('button','pst-search-hit');button.type='button';
          const ico=el('span','pst-search-hit-icon',item.icon);ico.setAttribute('aria-hidden','true');
          const words=el('span','pst-search-hit-text');
          words.append(el('strong','',item.title),el('small','',item.meta));
          button.append(ico,words,el('span','pst-search-hit-arrow','›'));
          button.setAttribute('aria-label','Ouvrir : '+item.title+' ('+name+')');
          button.addEventListener('click',()=>{
            const current=input.value.trim();
            saveRecent(current);
            focused=false;
            setReturnContext(true);
            let ok=false;
            if(item.type){ok=window.PSTSearchOpenRecord?.(item.type,item.id)===true;}
            else if(document.getElementById(item.view)){
              (window.PSTSetView||window.PSTNavigation?.switchView)?.(item.view);ok=true;
            }
            if(!ok){setReturnContext(false);count.textContent='Impossible d’ouvrir cette fiche. Réessayez après synchronisation.';return;}
            window.scrollTo({top:0,behavior:'instant'});
          });
          section.append(button);
        }
        content.append(section);
      }
      if(allMatches.length>shown){
        const more=el('button','pst-search-more','Afficher d’autres résultats');more.type='button';
        more.addEventListener('click',()=>{shown+=PAGE_RESULTS;render(true);});content.append(more);
      }
    }
    input.addEventListener('focus',()=>{focused=true;render(true);});
    input.addEventListener('input',()=>{window.clearTimeout(debounce);debounce=window.setTimeout(()=>render(true),90);});
    input.addEventListener('keydown',e=>{
      if(e.key==='Enter'){
        e.preventDefault();saveRecent(input.value);input.blur();focused=false;
        render(true);
      }else if(e.key==='Escape'){
        e.preventDefault();input.value='';focused=false;lastQuery='';render();input.blur();
      }
    });
    clear.addEventListener('click',()=>{input.value='';lastQuery='';focused=false;render();input.blur();});
    document.addEventListener('pointerdown',e=>{
      if(!box.contains(e.target) && !document.body.classList.contains('pst-search-from-results')){
        focused=false;
        if(!input.value.trim())render();
      }
    },{passive:true});
    window.addEventListener('resize',()=>{
      if(!mobile()){
        focused=false;setReturnContext(false);
      }
      render();
    },{passive:true});
    window.addEventListener('pst:data-loaded',()=>{lastQuery='';if(input.value.trim())render(true);});
    window.PSTMobileGlobalSearch={open:()=>{if(!mobile())return;restoreSearch();input.focus();},search:term=>{if(!mobile())return;input.value=String(term||'');restoreSearch();}};
    render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
