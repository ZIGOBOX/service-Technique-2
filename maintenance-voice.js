/*
 * Pilotage Service Technique — Dictée de panne (mobile)
 * Préremplit uniquement le formulaire de maintenance déjà existant.
 * Reconnaissance vocale du navigateur (aucun service IA ni enregistrement automatique).
 * Le texte reste modifiable ; l'utilisateur vérifie puis appuie sur « Enregistrer ».
 */
(function () {
  'use strict';
  const MAX_WIDTH = 700;
  const SpeechCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  let activeRecognition = null;
  const onPhone = () => window.innerWidth <= MAX_WIDTH;
  const tidy = value => String(value || '').replace(/\s+/g, ' ').trim();
  const ascii = value => tidy(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’]/g, "'").toLowerCase();
  const escapeReg = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const unique = values => Array.from(new Set(values.filter(Boolean)));
  const spellNumber = value => ({premier:1,premiere:1,un:1,une:1,deux:2,deuxieme:2,trois:3,troisieme:3,quatre:4,quatrieme:4, cinq:5,cinquieme:5})[value];

  const CLASSIFIERS = [
    ['Plomberie', /\b(fuite|fuites|ecoulement|infiltration|goutte|gouttes|tuyau|tuyauterie|canalisation|robinet|lavabo|evier|wc|toilette|chasse d'eau|purgeur|degat des eaux|eau froide|eau chaude)\b/],
    ['Chauffage / CVC', /\b(chauffage|radiateur|chaudiere|chauffe|thermostat|temperature|climatisation|clim|ventilation|vmc|cta|reseau de chaleur|echangeur|sonde de temperature|trop froid)\b/],
    ['Électricité', /\b(electricite|electrique|prise|prises|disjoncteur|court-circuit|eclairage|lumiere|luminaire|ampoule|neon|interrupteur|cable|cablage|tableau electrique|baes)\b/],
    ['Serrurerie', /\b(serrure|cle|cles|clef|verrou|barillet|cylindre|fermeture de porte|controle d'acces|badge|tourniquet)\b/],
    ['Menuiserie', /\b(porte|fenetre|volet|charniere|huisserie|vitre|vitrage|menuiserie|poignee de porte)\b/],
    ['SSI / incendie', /\b(ssi|incendie|alarme incendie|detecteur de fumee|desenfumage|declencheur manuel)\b/],
    ['Toiture', /\b(toiture|toit|tuile|gouttiere|solin|couverture|etancheite de toiture)\b/],
    ['Ascenseur', /\b(ascenseur|elevateur|monte-charge)\b/],
    ['Informatique / réseau', /\b(informatique|ordinateur|wifi|wi-fi|internet|reseau informatique|imprimante|switch|serveur)\b/],
    ['Peinture', /\b(peinture|peindre|tag|tags|graffiti|graffitis)\b/],
    ['Maçonnerie', /\b(maconnerie|mur fissure|fissure|beton|carrelage|platre|plafond effondre)\b/],
    ['Espaces extérieurs', /\b(pelouse|arbre|branches|vegetation|desherbage|cour exterieure|espaces verts)\b/],
    ['Mobilier', /\b(table|chaise|bureau casse|meuble|armoire|mobilier)\b/],
    ['Cuisine / demi-pension', /\b(four|lave-vaisselle|plonge|hotte cuisine|self|demi-pension|cuisine)\b/]
  ];
  function detectCategory(raw) {
    const value = ascii(raw);
    // A positive category only when an unambiguous term was spoken.
    const found = CLASSIFIERS.find(([_, pattern]) => pattern.test(value));
    return found ? found[0] : '';
  }
  function detectPriority(raw) {
    const value = ascii(raw);
    if (/\b(pas urgent|non urgent|sans urgence)\b/.test(value)) return 'Normale';
    if (/\b(urgent|urgente|urgence|danger immediat|risque immediat|danger de mort)\b/.test(value)) return 'Urgente';
    if (/\b(priorite haute|haute priorite|prioritaire|tres important)\b/.test(value)) return 'Haute';
    return '';
  }
  function detectBuilding(raw, known) {
    const value = ascii(raw);
    const buildings = known || [];
    let specified = '';
    const m = value.match(/\b(?:batiment|bat\.?|bloc)\s*(?:n[°o]?\s*)?(noelas|noelas|[a-z])\b/);
    if (m) specified = m[1];
    else if (/\b(?:au|dans le)\s+gymnase\b/.test(value)) specified = 'gymnase';
    else if (/\b(?:au|dans le)\s+cdi\b/.test(value)) specified = 'cdi';
    else if (/\bnoelas\b/.test(value)) specified = 'noelas';
    if (!specified) return '';
    const exact = buildings.find(b => ascii(b.name) === specified);
    if (exact) return exact.name;
    const matches = buildings.filter(b => {
      const name = ascii(b.name);
      if (specified.length === 1) return new RegExp('(?:^|\\s)(?:batiment\\s*|bat\\s*|bloc\\s*)?' + escapeReg(specified) + '(?:$|\\s)').test(name);
      return name.includes(specified);
    });
    return matches.length === 1 ? matches[0].name : '';
  }
  function detectRoomNumber(raw) {
    const value = ascii(raw);
    const m = value.match(/\b(?:salle|local|bureau|labo(?:ratoire)?|tp|classe)\s*(?:de\s+(?:classe|tp|svt|physique)\s*)?(?:n(?:umero|°|o)?\s*)?(\d{2,4}[a-z]?)\b/);
    return m ? m[1].toUpperCase() : '';
  }
  function detectFloor(raw) {
    const value = ascii(raw);
    if (/\b(?:rdc|rez(?:[ -]de[ -]chaussee)?)\b/.test(value)) return 0;
    const a = value.match(/\b(\d)\s*(?:er|e|eme|ieme)?\s*etage\b/) || value.match(/\betage\s*(\d)\b/);
    if (a) return Number(a[1]);
    const b = value.match(/\b(premier|premiere|deuxieme|troisieme|quatrieme|cinquieme)\s+etage\b/);
    return b ? spellNumber(b[1]) : null;
  }
  function floorNum(raw) {
    const value=ascii(raw);
    if (/\b(?:rdc|rez(?:[ -]de[ -]chaussee)?)\b/.test(value)) return 0;
    const m=value.match(/\b(\d)(?:er|e|eme|ieme)?\s*(?:etage|niveau)?\b/);
    return m ? Number(m[1]) : null;
  }
  function matchesFloor(name, number) {
    if (number === null || number === undefined) return true;
    const n = ascii(name);
    if (number === 0) return /\b(rdc|rez|0)\b/.test(n);
    const found = floorNum(n);
    return found === number || (number === 1 && /\bpremier\b/.test(n)) || (number === 2 && /\bdeuxieme\b/.test(n));
  }
  function getAvailableLocations() {
    try {
      const r=window.PSTCleaningRooms?.get?.();
      if(Array.isArray(r) && r.length) return r;
    } catch (_) {}
    try { return window.PSTMainState?.get?.()?.buildings || []; } catch (_) { return []; }
  }
  function roomMatches(room, number) {
    const rawNumber = ascii(room.number || '');
    if(rawNumber === ascii(number)) return true;
    const label = tidy([room.number || '',room.name || ''].filter(Boolean).join(' — ')) || room.name || '';
    return new RegExp('^(?:salle\\s*)?' + escapeReg(ascii(number)) + '(?:\\b|\\s|\\W)').test(ascii(label));
  }
  function locationFromSpeech(raw, locations) {
    const building = detectBuilding(raw, locations);
    const number = detectRoomNumber(raw);
    const floor = detectFloor(raw);
    const candidates=[];
    for(const b of locations) {
      if(building && b.name !== building) continue;
      for(const f of (b.floors||[])) for(const sector of (f.sectors||[])) for(const room of (sector.rooms||[])) {
        if(number && roomMatches(room,number) && matchesFloor(f.name,floor))
          candidates.push({building:b.name,floor:f.name,sector:sector.name,room:tidy([room.number||'',room.name||''].filter(Boolean).join(' — '))||room.type||'Local'});
      }
    }
    const sites=unique(candidates.map(c=>[c.building,c.floor,c.sector,c.room].join('|')));
    if(sites.length === 1) return {...candidates[0],number,identified:true};
    // Without a unique indexed room, never guess a floor or room.
    return {building, floor:'',sector:'',room:'',number,identified:!!building, ambiguous:sites.length>1};
  }
  function makeTitle(raw) {
    let t = tidy(raw)
      .replace(/^\s*(?:bonjour[, ]*|je\s+(?:vous\s+)?(?:signale|constate)|il\s+y\s+a|on\s+a|nous\s+avons|j['’]ai\s+(?:constat[eé]|rep[eé]r[eé]))\s*/i,'')
      .replace(/\b(?:dans|au|aux|du|de|en|sur|vers)?\s*(?:le\s+)?b[âa]timent\s+(?:[a-z]|no[eë]las)\b[, :;]*/ig,'')
      .replace(/\b(?:dans|en|au|de|la|le)?\s*(?:la\s+)?salle\s*(?:n[°o]?\s*)?\d{2,4}[a-z]?\b[, :;]*/ig,'')
      .replace(/\b(?:c['’]est|il faut)?\s*(?:une\s+)?intervention\s+urgente?\b[.! ]*/ig,'')
      .replace(/\b(?:c['’]est\s+)?urgent(?:e)?\b[.! ]*/ig,'')
      .replace(/\b(?:au|a|dans le|dans la)\s+(?:\d+(?:er|e|eme|ieme)?|premier|premiere|deuxieme|troisieme)\s+etage\b[ ,:;]*/ig,'')
      .replace(/^[\s,.:;–-]+|[\s,.:;–-]+$/g,'')
      .replace(/\s+(?:à|a|au|dans|sur|de|du|en)\s*$/i,'');
    if(!t) t=tidy(raw);
    t=t.split(/[.!?;]+/)[0].trim().slice(0,110).trim();
    return t ? t[0].toLocaleUpperCase('fr-FR') + t.slice(1) : '';
  }
  function parse(raw, locations=getAvailableLocations()) {
    const description=tidy(raw);
    if(!description) return null;
    return { description:(description[0].toLocaleUpperCase('fr-FR')+description.slice(1)).replace(/([^.!?])$/, '$1.'),
      title:makeTitle(raw), family:detectCategory(raw), priority:detectPriority(raw),
      location:locationFromSpeech(raw,locations) };
  }
  function setField(form,name,value) {
    if(value === undefined || value === null || value === '') return false;
    const e=form.elements.namedItem(name);
    if(!e || !(e instanceof HTMLElement)) return false;
    if(e.tagName === 'SELECT' && ![...e.options].some(o => o.value === String(value))) return false;
    e.value = String(value);
    e.dispatchEvent(new Event('change',{bubbles:true}));
    e.dispatchEvent(new Event('input',{bubbles:true}));
    return true;
  }
  function clearSelect(form,name) {
    const e=form.elements.namedItem(name);
    if(!(e instanceof HTMLSelectElement)) return;
    if(![...e.options].some(o=>o.value==='')) e.add(new Option('⚠ À préciser', '', true, true),0);
    e.value=''; e.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function chooseLocation(form,loc) {
    const b=form.elements.namedItem('building');
    if(!b) return false;
    if(loc.building) {
      setField(form,'building',loc.building);
      if(!loc.floor) {
        clearSelect(form,'floor'); clearSelect(form,'sector');clearSelect(form,'room');
        return true;
      }
      setField(form,'floor',loc.floor);
      setField(form,'sector',loc.sector);
      if(loc.room) setField(form,'room',loc.room);
      else clearSelect(form,'room');
      return true;
    }
    // Clear default central-location values when speech provided no usable location.
    clearSelect(form,'building'); clearSelect(form,'floor');clearSelect(form,'sector');clearSelect(form,'room');
    return false;
  }
  function apply(form,result) {
    if(!result) return null;
    setField(form,'description',result.description);
    setField(form,'title',result.title);
    setField(form,'family',result.family || 'Autre');
    if(result.priority) setField(form,'priority',result.priority);
    const located=chooseLocation(form,result.location);
    const out=[];
    if(result.family) out.push(result.family); else out.push('Domaine à vérifier');
    if(result.priority) out.push('Priorité : '+result.priority); else out.push('Priorité à vérifier');
    if(located) out.push(result.location.building);
    if(result.location.room) out.push(result.location.room);
    if(!located || (result.location.number && !result.location.room)) out.push('Salle / bâtiment à vérifier');
    if(result.location.ambiguous) out.push('Salle présente à plusieurs endroits');
    return out;
  }
  function mount() {
    if(!onPhone()) return;
    const form=document.getElementById('modalForm');
    const mountPoint=document.getElementById('pstMaintenanceVoiceMount');
    if(!form || !mountPoint || mountPoint.dataset.pstVoiceMounted) return;
    mountPoint.dataset.pstVoiceMounted='1';
    mountPoint.innerHTML = `<section class="pst-voice-card" aria-label="Dictée de panne">
      <div class="pst-voice-title">🎙️ <strong>Déclarer une panne à la voix</strong></div>
      <p>Exemple : « Bâtiment B, salle 244, fuite d'eau au plafond, urgent. »</p>
      <button type="button" id="pstVoiceStart" class="pst-voice-start">🎙️ Dicter le problème</button>
      <p id="pstVoiceStatus" class="pst-voice-status" role="status" aria-live="polite">Parlez normalement ; vous pourrez tout corriger.</p>
      <label for="pstVoiceText">Texte entendu (modifiable)</label>
      <textarea id="pstVoiceText" rows="3" placeholder="Le texte reconnu apparaîtra ici. Vous pouvez aussi utiliser le micro de votre clavier."></textarea>
      <button type="button" id="pstVoiceApply" class="pst-voice-apply">✓ Remplir les champs avec ce texte</button>
      <div id="pstVoiceSummary" class="pst-voice-summary" aria-live="polite" hidden></div>
      <small>Vérifiez le lieu, la catégorie et la priorité avant d'enregistrer. La voix peut être traitée en ligne par votre navigateur.</small>
    </section>`;
    const start=mountPoint.querySelector('#pstVoiceStart');
    const status=mountPoint.querySelector('#pstVoiceStatus');
    const text=mountPoint.querySelector('#pstVoiceText');
    const applyButton=mountPoint.querySelector('#pstVoiceApply');
    const summary=mountPoint.querySelector('#pstVoiceSummary');
    function message(value,isError=false) {status.textContent=value;status.classList.toggle('pst-voice-error',isError)}
    function process() {
      const parsed=parse(text.value);
      if(!parsed) {message('Aucun problème à analyser. Dictez ou saisissez une description.',true);return}
      const details=apply(form,parsed);
      summary.hidden=false;
      summary.textContent='✓ Champs préremplis : '+details.join(' · ')+'. Relisez la fiche puis appuyez sur Enregistrer.';
      message('La fiche est prête à être vérifiée. Rien n’a encore été enregistré.');
    }
    applyButton.addEventListener('click',process);
    if(!SpeechCtor) {
      start.disabled=true;
      start.textContent='🎤 Dictée intégrée non disponible';
      message('Utilisez le micro du clavier Android dans « Texte entendu », puis « Remplir les champs ».',true);
    } else {
      start.addEventListener('click',()=>{
        if(activeRecognition) {try {activeRecognition.stop()} catch (_) {} return}
        let recog;
        try {recog = new SpeechCtor()} catch (_) {message('Reconnaissance vocale indisponible sur ce navigateur.',true);return}
        activeRecognition=recog;
        recog.lang='fr-FR';
        recog.interimResults=true;
        recog.continuous=false;
        recog.maxAlternatives=1;
        let stable='',partial='',failed=false;
        start.classList.add('pst-voice-listening');
        start.textContent='■ Arrêter la dictée';
        message('🎙️ Écoute en cours…');
        recog.onresult=event=>{
          stable='';partial='';
          for(let i=0;i<event.results.length;i++){
            const chunk=tidy(event.results[i][0]?.transcript || '');
            if(event.results[i].isFinal)stable += (stable?' ':'')+chunk;
            else partial += (partial?' ':'')+chunk;
          }
          text.value=tidy([stable,partial].filter(Boolean).join(' '));
          if(stable) message('Texte reconnu. Préparation de la fiche…');
        };
        recog.onerror=event=>{
          failed=true;
          const errors={'not-allowed':'Autorisation du micro refusée. Autorisez le microphone dans le navigateur.','service-not-allowed':'Service vocal indisponible. Utilisez le micro du clavier.','audio-capture':'Aucun microphone accessible.','network':'Connexion nécessaire à la dictée sur ce navigateur.','no-speech':'Aucune voix détectée. Réessayez.'};
          message(errors[event.error] || 'Dictée interrompue. Vous pouvez utiliser le micro du clavier.',true);
        };
        recog.onend=()=>{
          if(activeRecognition===recog) activeRecognition=null;
          start.classList.remove('pst-voice-listening');start.textContent='🎙️ Dicter le problème';
          if(!form.isConnected || !mountPoint.isConnected) return;
          // Speech services sometimes stop on their own after a sentence.
          if(stable || (!failed && text.value.trim())) process();
          else if(!failed)message('Aucune phrase reconnue. Réessayez.',true);
        };
        try {recog.start()} catch (_) {activeRecognition=null;start.classList.remove('pst-voice-listening');start.textContent='🎙️ Dicter le problème';message('Le micro n’a pas pu démarrer. Essayez à nouveau.',true)}
      });
    }
    // Reopening/closing the standard modal must stop the microphone.
    const dlg=document.getElementById('modal');
    dlg?.addEventListener('close',()=>{try{if(activeRecognition){const r=activeRecognition;activeRecognition=null;r.abort()}}catch(_){}},{once:true});
  }
  function addShortcut() {
    const target=document.getElementById('newMaintenance');
    if(!target || document.getElementById('pstVoiceMaintenanceShortcut'))return;
    const b=document.createElement('button');
    b.id='pstVoiceMaintenanceShortcut';b.type='button';b.className='pst-voice-maintenance-shortcut';
    b.textContent='🎙️ Déclarer à la voix';
    b.addEventListener('click',()=>target.click());
    target.insertAdjacentElement('afterend',b);
  }
  window.PSTMaintenanceVoice={mount,parse,detectCategory,detectPriority,locationFromSpeech};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addShortcut,{once:true});
  else addShortcut();
})();
