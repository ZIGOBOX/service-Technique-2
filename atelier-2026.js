/* PILOTAGE STUDIO — habillage non destructif + palette de navigation.
   Aucun accès aux secrets ni aux données Supabase ; lecture seule du DOM pour les compteurs. */
(()=>{
  'use strict';
  const $=(s,root=document)=>root.querySelector(s);
  const $$=(s,root=document)=>Array.from(root.querySelectorAll(s));
  const iconPaths={
   home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1z"/>',
   users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
   tool:'<path d="M14.7 6.3a4 4 0 0 0-5.6 5.6l-6.3 6.3a2 2 0 0 0 2.8 2.8l6.3-6.3a4 4 0 0 0 5.6-5.6L15 12l-3-3z"/>',
   shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
   calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
   folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
   settings:'<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34l-.09.04a1.7 1.7 0 0 0-1.06 1.56V21H9.4v-.07a1.7 1.7 0 0 0-1.06-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06a1.7 1.7 0 0 0 .34-1.88 1.7 1.7 0 0 0-1.56-1.06H3V9.4h.07a1.7 1.7 0 0 0 1.56-1.06 1.7 1.7 0 0 0-.34-1.88L4.23 6.4 6.35 4.3l.06.06a1.7 1.7 0 0 0 1.88.34h.04A1.7 1.7 0 0 0 9.4 3.1V3h5.2v.1a1.7 1.7 0 0 0 1.06 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.06H21v5.2h-.1A1.7 1.7 0 0 0 19.4 15z"/>',
   task:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
   clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
   check:'<path d="m4 12 5 5L20 6"/>',
   download:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
   sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
   building:'<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 6h2M15 6h1M9 10h2M15 10h1M9 14h2M15 14h1M10 22v-5h4v5"/>',
   arrows:'<path d="M4 7h16l-4-4M20 17H4l4 4"/>',
   pencil:'<path d="m16 4 4 4L8 20H4v-4zM14 6l4 4"/>',
   alert:'<path d="M12 3 2 21h20zM12 9v5M12 18h.01"/>',
   mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 6 10 7 10-7"/>',
   cloud:'<path d="M20 17a4 4 0 0 0-.8-7.9 7 7 0 0 0-13.8 1.5A3.5 3.5 0 0 0 6 17z"/>',
   help:'<circle cx="12" cy="12" r="10"/><path d="M9 9a3 3 0 1 1 5.5 1.5c-1 1-2.5 1.5-2.5 3M12 17h.01"/>',
   chart:'<path d="M4 20V10m6 10V4m6 16v-7m5 7H2"/>',
   file:'<path d="M7 2h8l5 5v15H7zM15 2v5h5M10 13h7M10 17h7"/>',
   search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
   grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'
  };
  const svg=key=>'<svg class="pst-nav-svg" aria-hidden="true" viewBox="0 0 24 24">'+(iconPaths[key]||iconPaths.grid)+'</svg>';
  const domainIcons={accueil:'home',personnel:'users',maintenance:'tool',securite:'alert',controles:'shield',agenda:'calendar',documents:'folder',outils:'settings'};
  const viewIcons={dashboard:'home',agents:'users','agent-activity':'check',planning:'clock',rotations:'arrows',pdfimports:'download',absences:'sun','schedule-import':'arrows',vacations:'calendar',maintenance:'tool',quotes:'file',requests:'task',issues:'alert',works:'building',contracts:'file',periodic:'shield',cleaning:'check','cleaning-duty-plans':'task','room-prep':'calendar',waste:'folder',personal:'calendar',meetings:'users',notes:'pencil',documents:'folder',archives:'folder',reports:'chart',outlook:'mail',weather:'cloud',connections:'settings',help:'help',settings:'settings'};
  const normalize=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').trim();
  function installIcons(){
    $$('.nav-domain[data-nav-domain]').forEach(el=>{
      const span=$('.nav-domain-icon',el);if(span)span.innerHTML=svg(domainIcons[el.dataset.navDomain]||'grid');
    });
    $$('.nav-btn[data-view]').forEach(el=>{
      const span=$(':scope > span:first-child',el);if(span)span.innerHTML=svg(viewIcons[el.dataset.view]||'grid');
    });
    $$('.pst-favorites-grid button').forEach((el,i)=>{
      const span=$('span',el);if(span)span.innerHTML=svg(({dashboard:'home',maintenance:'tool',agents:'users',absences:'calendar'})[el.dataset.pstShortcut]||'grid');
    });
  }
  function installFavorites(){
    $$('.pst-favorites-grid [data-pst-shortcut]').forEach(btn=>btn.addEventListener('click',()=>{
      const view=btn.dataset.pstShortcut;
      const real=$('.nav-btn[data-view="'+view+'"]');
      if(real)real.click();
      else if(typeof window.PSTSetView==='function')window.PSTSetView(view);
      document.body.classList.remove('menu-open');
    }));
  }
  function installCommand(){
    const trigger=$('#pstCommandTrigger');if(!trigger)return;
    const shell=document.createElement('div');shell.className='pst-command-scrim hidden';shell.id='pstCommandPalette';
    shell.setAttribute('role','presentation');
    shell.innerHTML='<div class="pst-command-dialog" role="dialog" aria-modal="true" aria-label="Accès rapide aux rubriques">'
      +'<div class="pst-command-field">'+svg('search')+'<input class="pst-command-input" id="pstCommandInput" type="search" autocomplete="off" placeholder="Rechercher : maintenance, agents, plannings…" aria-label="Rechercher une rubrique"><button type="button" id="pstCommandClose" class="pst-command-close" aria-label="Fermer">ESC</button></div>'
      +'<div class="pst-command-results" id="pstCommandResults" role="listbox"></div><div class="pst-command-foot"><span>↑ ↓ pour naviguer · Entrée pour ouvrir</span><span>Échap pour fermer</span></div></div>';
    document.body.append(shell);
    const input=$('#pstCommandInput');const results=$('#pstCommandResults');
    const navItems=$$('.nav-btn[data-view]').map(btn=>({btn,label:btn.textContent.trim(),domain:btn.closest('.nav-domain')?.querySelector('summary')?.textContent.trim()||'',icon:viewIcons[btn.dataset.view]||'grid'}));
    let selected=0,shown=[];
    function draw(){
      const term=normalize(input.value);shown=navItems.filter(item=>!term||normalize(item.label+' '+item.domain).includes(term)).slice(0,24);
      selected=Math.max(0,Math.min(selected,shown.length-1));
      results.replaceChildren();
      if(!shown.length){const div=document.createElement('div');div.className='pst-command-empty';div.textContent='Aucune rubrique trouvée';results.append(div);return;}
      shown.forEach((item,i)=>{
        const node=document.createElement('button');node.type='button';node.className='pst-command-item';node.setAttribute('role','option');node.setAttribute('aria-selected',String(i===selected));
        node.innerHTML=svg(item.icon);
        const label=document.createElement('span');label.textContent=item.label;
        const group=document.createElement('small');group.textContent=item.domain;group.style='margin-left:auto;color:#aa9fba;font-size:10px;font-weight:500';
        node.append(label,group);node.addEventListener('click',()=>openItem(item));results.append(node);
      });
    }
    function openItem(item){
      close();
      item.btn.click();
      document.body.classList.remove('menu-open');
    }
    function open(){shell.classList.remove('hidden');input.value='';selected=0;draw();input.focus();}
    function close(){shell.classList.add('hidden');trigger.focus();}
    trigger.addEventListener('click',open);
    $('#pstCommandClose').addEventListener('click',close);
    input.addEventListener('input',()=>{selected=0;draw()});
    input.addEventListener('keydown',e=>{
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();selected=(selected+(e.key==='ArrowDown'?1:-1)+shown.length)%Math.max(1,shown.length);draw();$('.pst-command-item[aria-selected="true"]',results)?.scrollIntoView({block:'nearest'});}
      if(e.key==='Enter'&&shown[selected]){e.preventDefault();openItem(shown[selected]);}
    });
    document.addEventListener('keydown',e=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();shell.classList.contains('hidden')?open():close();}
      if(e.key==='Escape'&&!shell.classList.contains('hidden')){e.preventDefault();close();}
    });
    shell.addEventListener('click',e=>{if(e.target===shell)close()});
  }
  function installMaintenanceInsights(){
    const tb=$('#maintenanceTable');if(!tb)return;
    let scheduled=false;
    function update(){
      scheduled=false;
      // La table affiche les interventions après application des filtres. Lecture seule.
      const rows=Array.from(tb.querySelectorAll('tr')).filter(tr=>tr.querySelectorAll('td').length>=9);
      let open=0,progress=0,done=0;
      for(const row of rows){
        const cells=row.querySelectorAll('td');const status=normalize(cells[8]?.textContent||'');
        if(status.includes('cours'))progress++;
        else if(status.includes('termine')||status.includes('clotur')||status.includes('resolu')||status.includes('realise'))done++;
        else if(status.includes('ouvert')||status.includes('nouveau')||status.includes('attente')||status.includes('faire')||status.includes('planifi'))open++;
      }
      const count=(id,value)=>{const el=$(id);if(el)el.textContent=String(value)};
      count('#pstMaintTotalDesign',rows.length);count('#pstMaintOpenDesign',open);count('#pstMaintProgressDesign',progress);count('#pstMaintDoneDesign',done);
    }
    const observer=new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update)}});
    observer.observe(tb,{childList:true,subtree:true,characterData:true});update();
  }
  function installDashboardCardRouting(){
    const dashboard=$('#dashboard');if(!dashboard)return;
    dashboard.addEventListener('click',event=>{
      const card=event.target.closest('[data-edit-type][data-edit-id], [data-agenda-source][data-agenda-id]');
      if(!card||!dashboard.contains(card)||typeof window.PSTDashboardOpenRecord!=='function')return;
      const kind=card.dataset.editType||card.dataset.agendaSource;
      const id=card.dataset.editId||card.dataset.agendaId;
      // Alarmes, horaires et tâches spéciales gardent leurs actions spécifiques.
      if(!['periodic','issue','maintenance','request','work','note','meeting','personal','cleaning','contract','vacation','document'].includes(kind)||!id)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      window.PSTDashboardOpenRecord(kind,id);
    },true);
  }
  function installTopTools(){
    const toggle=$('#pstToolsToggle');if(!toggle)return;
    toggle.addEventListener('click',()=>{
      const active=document.body.classList.toggle('pst-tools-open');
      toggle.setAttribute('aria-expanded',String(active));
      toggle.setAttribute('aria-label',active?'Masquer les outils et filtres':'Afficher les outils et filtres');
    });
  }
  function init(){installIcons();installFavorites();installCommand();installTopTools();installMaintenanceInsights();installDashboardCardRouting();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
