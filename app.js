'use strict';

function appLogoURL(){
  try{return window.APP_LOGO_DATA_URI||new URL('./assets/logo-service-technique.png?v=138.0',document.baseURI||location.href).href}
  catch(e){return window.APP_LOGO_DATA_URI||'./assets/logo-service-technique.png?v=138.0'}
}
function secureAppLogos(){
  const src=appLogoURL();
  document.querySelectorAll('[data-app-logo],.auth-logo,.brand-logo,.welcome-logo').forEach(img=>{
    if(!img)return;img.removeAttribute('srcset');
    img.onerror=()=>{if(window.APP_LOGO_DATA_URI){img.onerror=null;img.src=window.APP_LOGO_DATA_URI}};
    img.src=src;
    if(img.complete&&img.naturalWidth===0&&window.APP_LOGO_DATA_URI)img.src=window.APP_LOGO_DATA_URI;
  });
}

const APP_VERSION='147.166';
const APP_BUILD='28/08/2026';

// V25 : les erreurs techniques sont journalisées sans bloquer l'utilisateur.
window.addEventListener('error',event=>{
  console.error('Erreur applicative :',event.error||event.message);
  const s=document.querySelector('#saveState');
  if(s){s.textContent='Une action a échoué — vos données restent conservées';s.dataset.state='local'}
});
window.addEventListener('unhandledrejection',event=>{
  console.error('Promesse rejetée :',event.reason);
  const s=document.querySelector('#saveState');
  if(s){s.textContent='Synchronisation différée — travail local conservé';s.dataset.state='local'}
});

const $=(s,r=document)=>r.querySelector(s); const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const STORAGE_KEY='pilotage-service-technique-v25'; const OLD_KEYS=['pilotage-service-technique-v10','pilotage-service-technique-v9','jean-puy-pilote-v3','jp-pilote'];
const pad=n=>String(n).padStart(2,'0'); const uid=()=>`${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function localISO(d){d=new Date(d);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
const todayISO=()=>localISO(new Date()); const monthISO=()=>todayISO().slice(0,7); const parseDate=v=>new Date(`${v}T12:00:00`);
function addDays(v,n){const d=typeof v==='string'?parseDate(v):new Date(v);d.setDate(d.getDate()+n);return localISO(d)}
function addMonths(v,n){const d=parseDate(v);d.setMonth(d.getMonth()+Number(n));return localISO(d)}
function startOfWeek(v){const d=typeof v==='string'?parseDate(v):new Date(v);d.setDate(d.getDate()-((d.getDay()+6)%7));return localISO(d)}
const endOfWeek=v=>addDays(startOfWeek(v),6); const fmtDate=v=>v?parseDate(v).toLocaleDateString('fr-FR'):'';
const fmtDateLong=v=>v?parseDate(v).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}):'';
function normalizeDateValue(value){
 const s=String(value||'').trim();if(!s)return '';
 if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
 let m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);if(m)return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
 const d=new Date(s);return Number.isNaN(d.getTime())?'':localISO(d);
}
function normalizeText(value){return String(value||'').trim().toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function isClosedStatus(value){const s=normalizeText(value);return ['termine','terminee','cloture','cloturee','annule','annulee','archive','archivee','realise','realisee','non applicable'].includes(s)}
function recordDueDate(record){
 const direct=record?.dueDate||record?.deadline||record?.echeance||record?.endDate||record?.targetDate||record?.dateLimite||record?.date_limit||record?.delai||record?.delay||'';
 const normalized=normalizeDateValue(direct);if(normalized)return normalized;
 // Compatibilité avec les anciennes données où l'échéance était écrite en texte, ex. « avant le 4/08 ».
 const text=[record?.description,record?.action,record?.notes,record?.comment,record?.comments,record?.suivi,direct].filter(Boolean).join(' ');
 let m=String(text).match(/(?:avant\s+le|pour\s+le|échéance\s*[:\-]?|echeance\s*[:\-]?|au plus tard\s+le)?\s*(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?/i);
 if(!m)return '';
 let year=m[3]?Number(m[3]):Number(todayISO().slice(0,4));if(year<100)year+=2000;
 const candidate=`${year}-${pad(m[2])}-${pad(m[1])}`;return normalizeDateValue(candidate);
}
function isUrgentPriority(value){const s=normalizeText(value);return s==='urgente'||s==='urgent'}
function daysBetweenDates(fromISO,toISO){const a=normalizeDateValue(fromISO),b=normalizeDateValue(toISO);if(!a||!b)return null;return Math.round((parseDate(b)-parseDate(a))/86400000)}

function weekNumber(v){const d=parseDate(v);d.setDate(d.getDate()+3-((d.getDay()+6)%7));const w1=new Date(d.getFullYear(),0,4,12);return 1+Math.round(((d-w1)/86400000-3+((w1.getDay()+6)%7))/7)}
function minutes(t){if(!t)return null;const [h,m]=t.split(':').map(Number);return h*60+m}
function hoursBetween(a,b,p=0){a=minutes(a);b=minutes(b);if(a==null||b==null)return 0;let d=b-a;if(d<0)d+=1440;return Math.max(0,(d-Number(p||0))/60)}
const fmtHours=n=>{
 const value=Number(n)||0,totalMinutes=Math.round(Math.abs(value)*60),hours=Math.floor(totalMinutes/60),minutes=totalMinutes%60;
 const sign=value<0?'-':'';
 return `${sign}${hours} h${minutes?` ${String(minutes).padStart(2,'0')}`:''}`;
};
const fmtSignedHours=n=>`${Number(n)>0?'+':''}${fmtHours(n)}`;
const inRange=(d,a,b)=>(!a||d>=a)&&(!b||d<=b); const dateMonthMatch=(d,m)=>!m||String(d||'').startsWith(m);
function businessDays(a,b){if(!a||!b)return 0;let d=parseDate(a),e=parseDate(b),n=0;while(d<=e){if(![0,6].includes(d.getDay()))n++;d.setDate(d.getDate()+1)}return n}
function normalizeEmails(v){return String(v||'').split(/[;,\n]+/).map(x=>x.trim()).filter(Boolean).join(',')}
function selectOptions(items,value='',label=x=>x,val=x=>x){return items.map(x=>`<option value="${esc(val(x))}" ${String(val(x))===String(value)?'selected':''}>${esc(label(x))}</option>`).join('')}
function badge(text){const s=String(text||'—');let c='neutral';if(/conforme|terminé|clôturé|validé|actif|réalisé|à jour|présence|matin|prête/i.test(s))c='good';if(/en cours|planifié|à préparer|à reprendre|soir|demandé|bientôt/i.test(s))c='warn';if(/urgent|retard|non conforme|bloqué|refusé|absence|accident|maladie/i.test(s))c='bad';if(/réunion|rendez|formation|information|rtt/i.test(s))c='info';return `<span class="badge ${c}">${esc(s)}</span>`}
const emptyRow=(n,msg='Aucune donnée enregistrée.')=>`<tr><td class="empty" colspan="${n}">${esc(msg)}</td></tr>`;

const initialBuildings=[
 {name:'Extension',floors:['Locaux','Rez-de-chaussée','1er étage']},{name:'Demi-pension',floors:['Locaux','Rez-de-chaussée','1er étage']},{name:'Gymnase',floors:['Rez-de-chaussée','1er étage']},
 ...['Bâtiment A','Bâtiment B','Bâtiment H','Bâtiment G','Bâtiment E','Bâtiment F'].map(name=>({name,floors:['Rez-de-chaussée','1er étage','2e étage','3e étage','4e étage']})),{name:'Cour',floors:['Extérieur']}
].map(x=>({id:uid(),...x}));
const defaultLists={
 roles:['Agent polyvalent','Agent d’entretien','Agent de maintenance','Agent d’accueil','Responsable d’équipe','Remplaçant'],
 dayTypes:['Présence','Congé annuel','RTT','Récupération','Maladie','Accident du travail','Enfant malade','Décès / deuil','Mariage / PACS','Naissance / adoption','Autorisation d’absence','Formation','Absence temps partiel','Repos','Jour férié','Grève','Autre absence'],
 priorities:['Basse','Normale','Haute','Urgente'],
 generalStatuses:['À faire','Planifié','En cours','En attente','Terminé','Clôturé','Bloqué'],
 issueCategories:['Sécurité','Qualité','Organisation','Matériel','Comportement','Absentéisme','Formation','Coût','Autre'],
 maintenanceFamilies:['Électricité','Plomberie','Chauffage / CVC','Serrurerie','Menuiserie','Peinture','Maçonnerie','Toiture','Ascenseur','SSI / incendie','Cuisine / demi-pension','Informatique / réseau','Espaces extérieurs','Mobilier','Autre'],
 maintenanceStatuses:['À qualifier','À faire','Planifiée','En cours','En attente prestataire','En attente pièce','Terminée','Clôturée','Bloquée'],
 requestTypes:['Aménagement de salle','Déménagement','Événement','Ouverture / fermeture','Accès / clés','Mobilier','Logistique','Sécurité','Autre'],
 workTypes:['Réunion de chantier','Réserve','GPA','Levée de réserve','Visite architecte','Intervention entreprise','Réception','Autre'],
 meetingTypes:['Direction','Réunion équipe','Architecte','Entreprise','Prestataire','Rendez-vous','Commission de sécurité','Formation','Autre'],
 personalTypes:['Rendez-vous','Réunion','Tâche','Rappel','Déplacement','Appel','Échéance','Autre'],
 noteCategories:['Préparation de salle','Réunion','Rendez-vous','Maintenance','Chantier / GPA','Contrôle ménage','Agent / équipe','Demande direction','Sécurité / qualité','Vacances / fermeture','Contrôle périodique','Personnel','Autre'],
 roomTypes:['Sanitaires / vestiaires','Circulations / halls / escaliers','Salle de classe / devoirs / informatique','CDI','Salle des personnels','Bureaux / administration','Locaux techniques','Dortoirs internat','Infirmerie','Salle de sport / gymnase','Demi-pension / restaurant','Cuisine','Cour / extérieurs','Atelier','Autre'],
 cleaningStatuses:['Conforme','À reprendre','Non conforme','Non contrôlé','Non applicable'],
 periodicFamilies:['Incendie / SSI','Électricité','Chauffage / CVC','Gaz / cuisine','Ascenseurs / levage','Travail en hauteur','Eau / légionelles','Qualité de l’air / radon','Portes / accès','Équipements sportifs','Sécurité / secours','Cuisine / hygiène','Matériels / logiciels','Prestations / services','Contrats / assurances','Équipements sous pression','Froid / fluides','Sûreté / PPMS','Autre'],
 documentCategories:['Guide / procédure','Réglementation','Plan','Contrat','Rapport de contrôle','Compte rendu','Photo','Courriel','Feuille de calcul','Fichier texte','Autre']
};

const GUIDE={
 'Sanitaires / vestiaires':[
 ['Préparation du matériel','Journalière (1 fois)'],['Aération','Journalière (1 fois)'],['Élimination des toiles d’araignées','Si nécessaire'],['Vidage des poubelles','Journalière (1 fois)'],['Changement du sac poubelle','Journalière (1 fois)'],['Réapprovisionnement savon et papier','Journalière (1 fois)'],['Détartrage des sanitaires','Journalière (1 fois)'],['Dépoussiérage des luminaires','À chaque permanence'],['Nettoyage miroirs et distributeurs','Journalière (1 fois)'],['Nettoyage/désinfection lavabos, douches et robinetteries','Journalière (1 fois)'],['Nettoyage/désinfection WC, urinoirs et cloisons','Journalière (2 fois)'],['Désinfection poignées et interrupteurs','Journalière (1 fois)'],['Lessivage faïences, portes, murs et cloisons','Hebdomadaire (1 fois)'],['Nettoyage des siphons de sols','Hebdomadaire (1 fois)'],['Nettoyage des bouches de VMC','Annuelle (1 fois)'],['Dépoussiérage dessus de vestiaires','À chaque permanence'],['Dépoussiérage plinthes, radiateurs, tuyauteries','Annuelle (1 fois)'],['Balayage des sols','Journalière (1 fois)'],['Lavage des sols','Journalière (1 fois)'],['Lavage mécanisé du sol','Si nécessaire'],['Nettoyage vitrerie accessible','Si nécessaire'],['Nettoyage du matériel','Journalière (1 fois)']],
 'Circulations / halls / escaliers':[
 ['Préparation du matériel','Journalière (1 fois)'],['Aération','Journalière (1 fois)'],['Élimination des toiles d’araignées','Si nécessaire'],['Dépoussiérage du mobilier dégagé','Hebdomadaire (1 fois)'],['Essuyage interrupteurs, rampes, poignées et entourage','Hebdomadaire (1 fois)'],['Traces sur surfaces vitrées à hauteur d’homme','Si nécessaire'],['Dépoussiérage plinthes, radiateurs et rebords de fenêtre','Annuelle (1 fois)'],['Vidage corbeilles / poubelles','Journalière (1 fois)'],['Changement du sac poubelle','Si nécessaire'],['Aspiration des tapis d’entrée','Hebdomadaire (1 fois)'],['Balayage des sols','Journalière (1 fois)'],['Lavage des sols / autolaveuse si possible','Hebdomadaire (1 fois)'],['Spray méthode des sols thermoplastiques cirés','À chaque permanence'],['Décapage et mise en cire des sols','Si nécessaire'],['Aspiration rainures ascenseur','Mensuelle (1 fois)'],['Nettoyage du matériel','Journalière (1 fois)']],
 'Salle de classe / devoirs / informatique':[
 ['Préparation du matériel','Journalière (1 fois)'],['Aération','Journalière (1 fois)'],['Élimination des toiles d’araignées','Si nécessaire'],['Nettoyage du tableau','À chaque permanence'],['Lavage des tables','Hebdomadaire (3 fois)'],['Détachage des tables','Si nécessaire'],['Essuyage humide des chaises','Si nécessaire'],['Lavage des chaises','À chaque permanence'],['Élimination des chewing-gums','À chaque permanence'],['Lavage du point d’eau hors paillasses','Hebdomadaire (1 fois)'],['Radiateurs, plinthes, dessus d’armoires, rebords de fenêtres','À chaque permanence'],['Essuyage des équipements informatiques','Hebdomadaire (1 fois)'],['Traces de doigts poignées, interrupteurs, portes vitrées','Hebdomadaire (1 fois)'],['Vidage des poubelles','Journalière (1 fois)'],['Changement du sac poubelle','Si nécessaire'],['Balayage des sols','Journalière (1 fois)'],['Lavage manuel ou mécanisé des sols','Hebdomadaire (1 fois)'],['Spray méthode des sols thermoplastiques cirés','À chaque permanence'],['Décapage et mise en cire des sols','Si nécessaire'],['Nettoyage du matériel','Journalière (1 fois)']],
 'CDI':[
 ['Préparation du matériel','Journalière (1 fois)'],['Aération','Journalière (1 fois)'],['Élimination des toiles d’araignées','Si nécessaire'],['Lavage des tables','Hebdomadaire (1 fois)'],['Détachage des tables','Si nécessaire'],['Essuyage humide des chaises','Si nécessaire'],['Lavage des chaises','À chaque permanence'],['Dépoussiérage matériel informatique','Hebdomadaire (1 fois)'],['Dépoussiérage des étagères sans sortir les livres','Hebdomadaire (1 fois)'],['Dépoussiérage du mobilier dégagé','Hebdomadaire (1 fois)'],['Interrupteurs, poignées et entourage','Hebdomadaire (1 fois)'],['Plinthes, radiateurs, rebords de fenêtres','À chaque permanence'],['Traces sur vitrages à hauteur d’homme','Si nécessaire'],['Vidage corbeilles / poubelles','Journalière (1 fois)'],['Changement du sac poubelle','Si nécessaire'],['Balayage des sols','Hebdomadaire (1 fois)'],['Lavage des sols / autolaveuse','Hebdomadaire (1 fois)'],['Spray méthode sols thermoplastiques','À chaque permanence'],['Décapage et mise en cire','Si nécessaire'],['Nettoyage du matériel','Journalière (1 fois)']],
 'Salle des personnels':[
 ['Préparation du matériel','Journalière (1 fois)'],['Aération','Journalière (1 fois)'],['Élimination des toiles d’araignées','Si nécessaire'],['Lavage des tables','Hebdomadaire (1 fois)'],['Détachage des tables','Hebdomadaire (1 fois)'],['Essuyage humide des chaises','Hebdomadaire (1 fois)'],['Dépoussiérage matériel informatique / photocopieurs','Hebdomadaire (1 fois)'],['Dépoussiérage mobilier dégagé','Hebdomadaire (1 fois)'],['Interrupteurs, poignées et entourage','Hebdomadaire (1 fois)'],['Traces sur vitrages à hauteur d’homme','Si nécessaire'],['Radiateurs, plinthes et rebords de fenêtres','À chaque permanence'],['Vidage corbeilles / poubelles','Journalière (1 fois)'],['Changement du sac poubelle','Si nécessaire'],['Balayage des sols','Journalière (1 fois)'],['Lavage des sols','Hebdomadaire (1 fois)'],['Spray méthode sols thermoplastiques','À chaque permanence'],['Décapage et mise en cire','Si nécessaire'],['Nettoyage du matériel','Journalière (1 fois)']],
 'Bureaux / administration':[
 ['Préparation du matériel','Journalière (1 fois)'],['Aération','Journalière (1 fois)'],['Élimination des toiles d’araignées','Si nécessaire'],['Lavage des tables','Hebdomadaire (1 fois)'],['Essuyage humide des chaises','Hebdomadaire (1 fois)'],['Dépoussiérage matériel informatique / photocopieur','Hebdomadaire (1 fois)'],['Dépoussiérage mobilier dégagé','Hebdomadaire (1 fois)'],['Interrupteurs, poignées et entourage','Hebdomadaire (1 fois)'],['Traces sur vitrages à hauteur d’homme','Si nécessaire'],['Plinthes, radiateurs et rebords de fenêtre','À chaque permanence'],['Vidage corbeilles / poubelles','Hebdomadaire (3 fois)'],['Changement du sac poubelle','Si nécessaire'],['Balayage des sols','Hebdomadaire (2 fois)'],['Lavage des sols','Hebdomadaire (1 fois)'],['Spray méthode sols thermoplastiques','À chaque permanence'],['Décapage et mise en cire','Si nécessaire'],['Nettoyage du matériel','Journalière (1 fois)']],
 'Locaux techniques':[
 ['Préparation du matériel','Hebdomadaire (1 fois)'],['Aération','Journalière (1 fois)'],['Élimination des toiles d’araignées','Si nécessaire'],['Lavage/désinfection des containers','Hebdomadaire (1 fois)'],['Nettoyage positionneurs et rouleur de bacs','Hebdomadaire (1 fois)'],['Dépoussiérage étagères et mobilier','Mensuelle (1 fois)'],['Interrupteurs, poignées et entourage','Hebdomadaire (1 fois)'],['Nettoyage du vide-seaux','Si nécessaire'],['Balayage des sols','Hebdomadaire (1 fois)'],['Lavage des sols','Hebdomadaire (1 fois)'],['Nettoyage du matériel','Hebdomadaire (1 fois)']],
 'Dortoirs internat':[
 ['Préparation du matériel','Journalière (1 fois)'],['Aération','Journalière (1 fois)'],['Élimination des toiles d’araignées','Si nécessaire'],['Essuyage humide du mobilier dégagé','Hebdomadaire (1 fois)'],['Détachage tables / bureaux','Si nécessaire'],['Essuyage humide des chaises','Hebdomadaire (1 fois)'],['Dépoussiérage du mobilier dégagé','Hebdomadaire (1 fois)'],['Blocs sanitaires collectifs WC + douches','Journalière (1 fois)'],['WC à l’intérieur des chambres','Journalière (1 fois)'],['Douches à l’intérieur des chambres','Hebdomadaire (1 fois)'],['Interrupteurs, poignées et entourage','À chaque permanence'],['Traces sur vitrages à hauteur d’homme','Si nécessaire'],['Plinthes et rebords de fenêtres','À chaque permanence'],['Vidage corbeilles / poubelles','Journalière (1 fois)'],['Changement du sac poubelle','Si nécessaire'],['Balayage des sols','Hebdomadaire (1 fois)'],['Lavage des sols / autolaveuse','Hebdomadaire (1 fois)'],['Spray méthode sols thermoplastiques','À chaque permanence'],['Décapage et mise en cire','Si nécessaire'],['Nettoyage du matériel','Journalière (1 fois)']],
 'Infirmerie':[
 ['Préparation du matériel','Journalière (1 fois)'],['Aération','Journalière (1 fois)'],['Élimination des toiles d’araignées','Si nécessaire'],['Nettoyage/désinfection mobilier et lavabos','Journalière (1 fois)'],['Dépoussiérage du matériel informatique','Hebdomadaire (1 fois)'],['Plinthes, radiateurs et rebords de fenêtres','Si nécessaire'],['Désinfection interrupteurs, poignées et entourage','Journalière (1 fois)'],['Traces sur vitrages à hauteur d’homme','Si nécessaire'],['Vidage corbeilles / poubelles','Journalière (1 fois)'],['Changement du sac poubelle','Hebdomadaire (1 fois)'],['Balayage des sols','Journalière (1 fois)'],['Lavage des sols','Journalière (1 fois)'],['Spray méthode sols thermoplastiques','À chaque permanence'],['Décapage et mise en cire','Si nécessaire'],['Nettoyage du matériel','Journalière (1 fois)']],
 'Salle de sport / gymnase':[
 ['Préparation du matériel','Journalière (1 fois)'],['Aération','Journalière (1 fois)'],['Élimination des toiles d’araignées','Si nécessaire'],['Vidage des poubelles','Journalière (1 fois)'],['Traces de doigts sur les portes','Hebdomadaire (1 fois)'],['Points de contact poignées et interrupteurs','Hebdomadaire (1 fois)'],['Balayage manuel ou mécanisé du sol','Hebdomadaire (2 fois)'],['Lavage mécanisé du sol','Hebdomadaire (1 fois)'],['Nettoyage du matériel','Journalière (1 fois)']]
};

const IMPORTED_WEEKLY_PLANS=[
 {agent:'Mme Tarrio',rows:[
  ['06:00-07:15','Ménage','Ménage','','Ménage','Ménage'],
  ['07:15-08:20','Loge','Loge','','Loge','Loge'],
  ['08:40-12:30','Loge + courrier','Loge + courrier','','Loge + courrier','Loge + courrier'],
  ['12:30-13:00','Pause','Pause','','Pause','Pause'],
  ['13:00-14:45','Loge','Loge','','Loge','Loge']]},
 {agent:'Mme Delorme',rows:[
  ['06:00-08:00','Ménage','Ménage','Lingerie','Ménage','Ménage'],
  ['08:20-10:30','Loge + courrier','Loge + courrier','Loge + courrier','Loge + courrier','Loge + courrier'],
  ['10:30-11:45','Lingerie','Lingerie','Loge 11:30-12:00','Lingerie','Lingerie'],
  ['11:45-12:15','Pause','Pause','','Pause','Pause'],
  ['12:15-13:00','Loge','Loge','','Loge','Loge'],
  ['13:00-15:10','Lingerie','Lingerie','','Lingerie','Lingerie']]},
 {agent:'Complément accueil',rows:[
  ['06:00-09:30','Ménage','Ménage','','Ménage','Ménage'],
  ['09:30-11:00','Loge + courrier','Loge + courrier','','Loge + courrier','Loge + courrier'],
  ['08:40-12:30','Loge + courrier','Loge + courrier','','Loge + courrier','Loge + courrier'],
  ['13:00-14:45','Loge','Loge','','Loge','Loge']]},
 {agent:'Mme Berthoux',rows:[
  ['06:00-08:00','Ménage','Ménage','Ménage','Ménage','Ménage'],
  ['08:00-10:50','Cuisine','Cuisine','Cuisine','Cuisine','Cuisine'],
  ['10:50-11:20','Pause','Pause','Pause','Pause','Pause'],
  ['11:20-15:00','Cuisine','Cuisine','Ménage 13:00-14:30','Cuisine','Cuisine']]},
 {agent:'Mme Bozio',rows:[
  ['14:30-18:15','Loge','Loge','Loge 12:00-16:00','Loge','Loge'],
  ['18:35-19:30','Fermeture','Fermeture','Fermeture 16:00-17:15','Fermeture','Fermeture']]}
];
const IMPORTED_INTERVENTIONS=[
 ['BAES à vérifier','SSI / incendie','Haute','À faire','',''],
 ['Travaux lingerie','Autre','Basse','À faire','Devis en cours',''],
 ['Interrupteur à clé gymnase à changer','Électricité','Normale','À faire','Devis en cours à l’intendance','Gymnase'],
 ['Conciergerie à ranger','Autre','Basse','À faire','Stand-by','Conciergerie'],
 ['Modification du support produit chimique','Autre','Basse','À faire','',''],
 ['Mettre cale de douche appartement Bozio','Plomberie','Normale','À faire','','Logement Bozio'],
 ['Changer les robinets d’arrivée d’eau logement','Plomberie','Haute','À faire','','Logement'],
 ['Fixer l’armoire sous la paillasse labo 3','Mobilier','Basse','À faire','','Laboratoire 3'],
 ['Repeindre vers ancien emplacement DAE','Peinture','Haute','À faire','',''],
 ['Enlever les roulettes en 129','Mobilier','Normale','À faire','','Salle 129'],
 ['Roulette à visser en 116','Mobilier','Normale','À faire','','Salle 116'],
 ['Fixer poubelles extérieures','Espaces extérieurs','Haute','À faire','','Cour'],
 ['Fixer attrape-chewing-gum','Mobilier','Haute','À faire','','']
];

const GENERIC_CLEANING=[['Poussière / mobilier','Selon plan local'],['Lavage des sols','Selon plan local'],['Points de contact','Selon plan local'],['Vitres / miroirs','Selon besoin'],['Poubelles / consommables','Selon plan local'],['Murs / portes','Selon besoin'],['Odeurs / aération','À chaque passage'],['Rangement général','À chaque passage']];
const VACATION_TASKS=['Vérifier et programmer les alarmes / intrusion','Vérifier les accès, clés et badges','Adapter ou arrêter le chauffage selon consignes','Adapter la ventilation et la climatisation','Sécuriser l’eau et programmer la remise en service ECS','Prévoir surveillance légionelles / températures si nécessaire','Éteindre les éclairages non indispensables','Sécuriser informatique, réseau et équipements audiovisuels','Contrôler chambres froides, cuisine et demi-pension','Prévoir surveillance des chantiers et entreprises','Informer les personnes d’astreinte et prestataires','Programmer la remise en service avant la rentrée','Effectuer une ronde de fermeture','Effectuer une ronde de réouverture'];
const SCHOOL_CALENDAR={
 '2026-2027':{
  A:[['Toussaint','2026-10-18','2026-11-01','Fin des cours 17/10 — reprise 02/11'],['Noël','2026-12-20','2027-01-03','Fin des cours 19/12 — reprise 04/01'],['Hiver','2027-02-14','2027-02-28','Fin des cours 13/02 — reprise 01/03'],['Printemps','2027-04-11','2027-04-25','Fin des cours 10/04 — reprise 26/04'],['Été','2027-07-04','2027-08-31','Fin des cours 03/07 — date de fin à adapter']],
  B:[['Toussaint','2026-10-18','2026-11-01','Fin des cours 17/10 — reprise 02/11'],['Noël','2026-12-20','2027-01-03','Fin des cours 19/12 — reprise 04/01'],['Hiver','2027-02-21','2027-03-07','Fin des cours 20/02 — reprise 08/03'],['Printemps','2027-04-18','2027-05-02','Fin des cours 17/04 — reprise 03/05'],['Été','2027-07-04','2027-08-31','Fin des cours 03/07 — date de fin à adapter']],
  C:[['Toussaint','2026-10-18','2026-11-01','Fin des cours 17/10 — reprise 02/11'],['Noël','2026-12-20','2027-01-03','Fin des cours 19/12 — reprise 04/01'],['Hiver','2027-02-07','2027-02-21','Fin des cours 06/02 — reprise 22/02'],['Printemps','2027-04-04','2027-04-18','Fin des cours 03/04 — reprise 19/04'],['Été','2027-07-04','2027-08-31','Fin des cours 03/07 — date de fin à adapter']]
 }
};
const PERIODIC_CATALOG=[
 ['Installations électriques ERP','Électricité',12,'Vérification périodique des installations et de l’éclairage de sécurité','Organisme / technicien compétent','Registre de sécurité'],
 ['SSI, alarme, détection et dispositifs associés','Incendie / SSI',12,'Maintenance et essais selon contrat, constructeur et règlement ERP','Prestataire SSI','Registre de sécurité'],
 ['Extincteurs et moyens de secours','Incendie / SSI',12,'Maintenance régulière et traçabilité des interventions','Prestataire incendie','Registre de sécurité'],
 ['Éclairage de sécurité / BAES — essai fonctionnel','Incendie / SSI',1,'Essais d’exploitation et consignation','Agent compétent','Registre de sécurité'],
 ['Éclairage de sécurité / BAES — autonomie','Incendie / SSI',6,'Essai d’autonomie et consignation','Agent compétent / prestataire','Registre de sécurité'],
 ['Désenfumage, clapets et portes coupe-feu','Incendie / SSI',12,'Vérification et essais des dispositifs','Prestataire qualifié','Registre de sécurité'],
 ['Exercices incendie','Sûreté / PPMS',6,'Au moins deux exercices dans l’année scolaire','Établissement','Compte rendu exercice'],
 ['Exercices PPMS','Sûreté / PPMS',6,'Un exercice en septembre-octobre et un avant les vacances d’hiver','Établissement','Compte rendu exercice'],
 ['Commission de sécurité ERP','Incendie / SSI',0,'Périodicité selon catégorie ERP et prescription de la commission','Commission de sécurité','Procès-verbal'],
 ['Chaudières et installations de chauffage','Chauffage / CVC',12,'Entretien, contrôle et réglages selon puissance et contrat','Exploitant chauffage','Carnet chaufferie'],
 ['Ventilation / CTA / VMC','Chauffage / CVC',12,'Maintenance des équipements, filtres et débits','Exploitant CVC','Carnet maintenance'],
 ['Installations gaz et organes de coupure','Gaz / cuisine',12,'Vérification selon règlement ERP et contrat','Prestataire qualifié','Registre sécurité'],
 ['Appareils de cuisson, hottes et conduits','Gaz / cuisine',12,'Entretien et nettoyage des appareils, hottes, filtres et conduits','Prestataire cuisine','Registre / rapport'],
 ['Ascenseur — contrôle technique','Ascenseurs / levage',60,'Contrôle technique quinquennal, en plus de l’entretien courant','Contrôleur indépendant','Rapport ascenseur'],
 ['Ascenseur — entretien contractuel','Ascenseurs / levage',1,'Visites et opérations selon contrat réglementaire','Ascensoriste','Carnet d’entretien'],
 ['Portes et portails automatiques','Portes / accès',6,'Maintenance et vérification des sécurités selon installation','Prestataire portes','Carnet entretien'],
 ['Appareils de levage / monte-charge','Ascenseurs / levage',12,'Vérification générale périodique selon le type d’équipement','Organisme compétent','Rapport VGP'],
 ['Températures eau chaude sanitaire','Eau / légionelles',1,'Surveillance régulière des températures du réseau ECS','Exploitant / agent','Carnet sanitaire'],
 ['Analyses légionelles','Eau / légionelles',12,'Campagne d’analyses selon installations et points à risque','Laboratoire accrédité','Carnet sanitaire'],
 ['Qualité de l’air intérieur','Qualité de l’air / radon',0,'Évaluation et plan d’actions selon réglementation applicable','Prestataire / collectivité','Dossier QAI'],
 ['Mesurage radon si établissement concerné','Qualité de l’air / radon',120,'Mesurage périodique dans les zones et établissements concernés','Organisme agréé','Rapport radon'],
 ['Équipements sportifs et ancrages','Équipements sportifs',12,'Contrôle visuel régulier et contrôle approfondi selon fabricant','Prestataire / agent compétent','Registre équipements'],
 ['Équipements sous pression','Équipements sous pression',0,'Inspection et requalification selon catégorie, dossier et plan d’inspection','Personne / organisme compétent','Dossier exploitation'],
 ['Installations frigorifiques / recherche de fuite','Froid / fluides',0,'Périodicité selon charge, fluide et dispositif de détection','Opérateur attesté','Registre fluides'],
 ['Protection contre la foudre / paratonnerre','Électricité',12,'Contrôle si installation présente et selon étude / norme','Organisme compétent','Rapport contrôle']
];
function makePeriodic(){return PERIODIC_CATALOG.map((x,i)=>({id:uid(),no:`CP-${String(i+1).padStart(3,'0')}`,name:x[0],family:x[1],intervalMonths:x[2],requirement:x[3],provider:x[4],register:x[5],building:'Tous bâtiments',lastDate:'',nextDate:'',time:'',floor:'',sector:'',room:'',status:'À planifier',notes:'',history:[],attachments:[]}))}

const CONTRACT_CONTROLS_V14723=[["gaz", "Contrôle des installations de gaz", "Gaz / cuisine", 12, "annuelle", "2026-06-13", "APAVE", "Tous bâtiments", "Contrôle périodique des installations de gaz.", ""], ["electricite", "Contrôle des installations électriques", "Électricité", 12, "annuelle", "2026-07-10", "APAVE", "Tous bâtiments", "Contrôle périodique des installations électriques.", ""], ["electricite-algeco", "Contrôle des installations électriques ALGECO", "Électricité", 12, "annuelle", "2025-05-28", "", "Algeco", "Contrôle périodique des installations électriques de l'ALGECO.", ""], ["ssi-desenfumage", "Contrôle du SSI + désenfumage", "Incendie / SSI", 36, "triennale", "2026-07-20", "TSA", "Tous bâtiments", "Contrôle du SSI et du désenfumage.", ""], ["colonne-seche", "Contrôle colonne sèche incendie", "Incendie / SSI", 12, "annuelle + contrôle approfondi tous les 5 ans", "2024-12-20", "", "Tous bâtiments", "Contrôle annuel de la colonne sèche.", "Contrôle approfondi tous les 5 ans ; le tableau source indiquait : à prévoir en 2025."], ["installations-thermiques", "Contrôle installations thermiques (efficacité énergétique chaudières et émissions polluantes)", "Chauffage / CVC", 36, "triennale", "2024-12-11", "", "Tous bâtiments", "Contrôle efficacité énergétique chaudières et émissions polluantes.", ""], ["ascenseur-rvre", "Vérification de l'ascenseur — contrôle technique + RVRE incendie", "Ascenseurs / levage", 60, "tous les 5 ans", "2026-04-23", "BUREAU VERITAS", "Bâtiment Noëlas", "Contrôle technique ascenseur + RVRE incendie.", "Mise en service à Noëlas : janvier 2022. Contrôle fait le 23/04/2026."], ["ligne-vie-gym-dp", "Contrôle des lignes de vie en toiture — gymnase + demi-pension", "Travail en hauteur", 12, "annuelle", "2026-01-22", "APAVE", "Gymnase", "Contrôle des lignes de vie en toiture gymnase + demi-pension.", ""], ["ligne-vie-noelas", "Contrôle des lignes de vie en toiture — bâtiment Noëlas", "Travail en hauteur", 12, "annuelle", "2026-04-28", "APAVE", "Bâtiment Noëlas", "Contrôle des lignes de vie en toiture bâtiment Noëlas.", ""], ["porte-automatique", "Contrôle porte automatique", "Portes / accès", 6, "semestrielle", "", "RECORD", "Tous bâtiments", "Contrôle périodique de la porte automatique.", "Dernière prestation non renseignée."], ["eps-espaliers", "Contrôle EPS : 2 espaliers + 1 barre de traction", "Équipements sportifs", 24, "biennale", "2025-12-02", "APAVE", "Gymnase", "Contrôle de 2 espaliers + 1 barre de traction.", "Historique : 04/10/2023 ; 01/10/2024 ; 02/12/2025 contrôle fait avec les poids."], ["eps-gymnase", "Contrôle EPS : gymnase (basket + hand)", "Équipements sportifs", 0, "à définir", "", "", "Gymnase", "Contrôle des équipements basket + hand.", "Périodicité et dernière prestation à compléter."], ["filtres-hottes-armoires", "Contrôle des filtres de hottes et armoires chimiques", "Gaz / cuisine", 12, "annuelle", "", "DALKIA marché Région", "Tous bâtiments", "Contrôle des filtres de hottes et armoires chimiques.", "Dernière prestation non renseignée."]];
function makeContractControls14723(){
 return CONTRACT_CONTROLS_V14723.map((x,i)=>({
   id:uid(),no:`CP-${String(i+1).padStart(3,'0')}`,contractControlKey:x[0],contractSource:'suivi des contrats bis',
   name:x[1],family:x[2],intervalMonths:Number(x[3]||0),periodicityText:x[4]||'',lastDate:x[5]||'',
   nextDate:x[5]&&Number(x[3])>0?addMonthsClamped(x[5],Number(x[3])):'',provider:x[6]||'',building:x[7]||'Tous bâtiments',
   requirement:x[8]||'',notes:x[9]||'',register:'Registre de sécurité',time:'',floor:'',sector:'',room:'',status:'À planifier',history:[],attachments:[]
 }))
}
function mergeContractControls14723(d){
 d.settings=d.settings||{};
 if(String(d.settings.contractControlsVersion||'')==='147.23')return;
 d.periodic=Array.isArray(d.periodic)?d.periodic:[];
 const norm=s=>normalizeText(s);
 const aliases={
  gaz:['installation','gaz'],electricite:['installation','electri'], 'electricite-algeco':['electri','algeco'],
  'ssi-desenfumage':['ssi','desenfum'], 'colonne-seche':['colonne','seche'], 'installations-thermiques':['thermique'],
  'porte-automatique':['porte','automatique']
 };
 const taken=new Set();
 for(const src of makeContractControls14723()){
   let found=d.periodic.find(x=>String(x.contractControlKey||'')===src.contractControlKey);
   if(!found){
     const words=aliases[src.contractControlKey]||[];
     if(words.length)found=d.periodic.find(x=>!taken.has(x.id)&&words.every(w=>norm(x.name).includes(w)));
   }
   if(!found){d.periodic.push(src);taken.add(src.id);continue}
   taken.add(found.id);
   const keepAttachments=Array.isArray(found.attachments)?found.attachments:[];
   const keepStatus=found.status||'À planifier';
   const keepNo=found.no||src.no;
   Object.assign(found,src,{id:found.id,no:keepNo,status:keepStatus,attachments:keepAttachments});
 }
 d.settings.contractControlsVersion='147.23';
}


// V147.161 — mise à jour des contrôles périodiques à partir du fichier Excel « suivi des contrats (2).xlsx », onglet Contrats 2026.
// Règle terrain : la date la plus récente connue gagne. Une échéance réellement saisie à la main reste protégée.
const PERIODIC_EXCEL_2026_V147161=[
 {key:'gaz',tokens:['installation','gaz'],lastDate:'2026-06-13',nextDate:'2027-06-13',oldLast:'2025-02-25',provider:'APAVE'},
 {key:'electricite',tokens:['installation','electri'],exclude:['algeco'],lastDate:'2026-07-10',nextDate:'2027-07-10',oldLast:'2025-06-17',provider:'APAVE'},
 {key:'ssi-desenfumage',tokens:['ssi','desenfum'],lastDate:'2026-07-20',nextDate:'2029-07-20',oldLast:'2024-05-02',provider:'TSA'}
];
function migratePeriodicExcel2026V147161(d){
 d.settings=d.settings||{};
 if(String(d.settings.periodicExcel2026Version||'')==='147.161')return;
 d.periodic=Array.isArray(d.periodic)?d.periodic:[];
 const norm=s=>normalizeText(s);
 for(const spec of PERIODIC_EXCEL_2026_V147161){
  let p=d.periodic.find(x=>String(x.contractControlKey||'')===spec.key);
  if(!p){
   p=d.periodic.find(x=>{
    const n=norm(x?.name||'');
    return spec.tokens.every(t=>n.includes(t))&&!(spec.exclude||[]).some(t=>n.includes(t));
   });
  }
  if(!p)continue;
  const curLast=/^\d{4}-\d{2}-\d{2}$/.test(String(p.lastDate||''))?String(p.lastDate):'';
  const curNext=/^\d{4}-\d{2}-\d{2}$/.test(String(p.nextDate||''))?String(p.nextDate):'';
  const interval=Number(p.intervalMonths||0);
  const oldAuto=spec.oldLast&&interval>0?addMonthsClamped(spec.oldLast,interval):'';
  const syncManaged=String(p.contractSyncNextDate||'');
  // Mettre à jour si l'application possède encore une date ancienne. Une date de contrôle plus récente que l'Excel est conservée.
  if(!curLast||curLast<=spec.lastDate)p.lastDate=spec.lastDate;
  // L'échéance est mise à jour seulement si elle est vide, issue de l'ancien calcul automatique, gérée par la synchro,
  // ou devenue incohérente (antérieure/égale au dernier contrôle Excel). Une autre date manuelle reste intacte.
  const nextLooksManaged=!curNext||curNext===oldAuto||(syncManaged&&curNext===syncManaged)||curNext<=spec.lastDate;
  if(nextLooksManaged)p.nextDate=spec.nextDate;
  if(spec.provider){
   const current=String(p.provider||'').trim();
   const previousManaged=String(p.contractSyncProvider||'').trim();
   if(!current||current===previousManaged)p.provider=spec.provider;
  }
  p.contractSyncLastDate=spec.lastDate;
  p.contractSyncSource='excel-2026-v147.161';
  p.updatedAt=new Date().toISOString();
 }
 d.settings.periodicExcel2026Version='147.161';
}


// V147.162 — historique technique des contrôles périodiques reconstitué depuis les onglets 2024, 2025 et 2026
// du classeur « suivi des contrats (2).xlsx ». L'onglet 2023 ne possède pas de colonne « Date de la dernière prestation » :
// seules les dates 2023 explicitement écrites dans les onglets suivants sont intégrées (ex. EPS 04/10/2023).
const PERIODIC_EXCEL_HISTORY_V147162=[
 {key:'gaz',tokens:['installation','gaz'],entries:[
   {date:'2024-03-29',provider:'DEKRA',source:'Excel — Contrats 2024'},
   {date:'2025-02-25',provider:'DEKRA',source:'Excel — Contrats 2025'},
   {date:'2026-06-13',provider:'APAVE',source:'Excel — Contrats 2026'}]},
 {key:'electricite',tokens:['installation','electri'],exclude:['algeco'],entries:[
   {date:'2024-11-06',provider:'APAVE',source:'Excel — Contrats 2024'},
   {date:'2025-06-17',provider:'APAVE',source:'Excel — Contrats 2025'},
   {date:'2026-07-10',provider:'APAVE',source:'Excel — Contrats 2026'}]},
 {key:'electricite-algeco',tokens:['electri','algeco'],entries:[
   {date:'2025-05-28',provider:'BUREAU VERITAS',source:'Excel — Contrats 2025'}]},
 {key:'ssi-desenfumage',tokens:['ssi','desenfum'],entries:[
   {date:'2024-05-02',provider:'BUREAU VERITAS',source:'Excel — Contrats 2024'},
   {date:'2026-07-20',provider:'',source:'Excel — Contrats 2026'}]},
 {key:'colonne-seche',tokens:['colonne','seche'],entries:[
   {date:'2024-12-20',provider:'LIS',source:'Excel — Contrats 2024',note:'Contrôle annuel ; contrôle approfondi tous les 5 ans indiqué à prévoir en 2025.'}]},
 {key:'installations-thermiques',tokens:['thermique'],entries:[
   {date:'2024-12-11',provider:'BUREAU VERITAS',source:'Excel — Contrats 2024'}]},
 {key:'ascenseur-rvre',tokens:['ascenseur'],entries:[
   {date:'2026-04-23',provider:'BUREAU VERITAS',source:'Excel — Contrats 2026',note:'Contrôle technique + RVRE incendie.'}]},
 {key:'ligne-vie-gym-dp',tokens:['ligne','vie'],entries:[
   {date:'2024-12-06',provider:'APAVE',source:'Excel — Contrats 2024'},
   {date:'2026-01-22',provider:'APAVE',source:'Excel — Contrats 2026'}]},
 {key:'ligne-vie-noelas',tokens:['ligne','vie','noelas'],entries:[
   {date:'2026-04-28',provider:'APAVE',source:'Excel — Contrats 2026'}]},
 {key:'eps-espaliers',tokens:['eps','espalier'],intervalMonths:24,entries:[
   {date:'2023-10-04',provider:'APAVE',source:'Excel — historique repris dans Contrats 2024/2026'},
   {date:'2024-10-01',provider:'APAVE',source:'Excel — Contrats 2024'},
   {date:'2025-12-02',provider:'APAVE',source:'Excel — Contrats 2026',note:'Contrôle fait avec les poids.'}]},
 {key:'eps-gymnase',tokens:['eps','gymnase'],intervalMonths:24,entries:[
   {date:'2023-10-04',provider:'APAVE',source:'Excel — Contrats 2024'},
   {date:'2024-10-01',provider:'APAVE',source:'Excel — Contrats 2024',note:'Contrôle fait sans les poids ; fichier Excel indiquait à refaire en 2025.'}]}
];
function periodicHistoryRows(x){
 const rows=Array.isArray(x?.history)?x.history:[];
 const byDate=new Map();
 for(const r of rows){
  const date=normalizeDateValue(r?.date||r?.controlDate||'');if(!date)continue;
  const old=byDate.get(date)||{};
  byDate.set(date,{...old,...r,date,provider:r?.provider||old.provider||'',source:r?.source||old.source||'',note:r?.note||old.note||''});
 }
 return [...byDate.values()].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}
function mergePeriodicHistoryEntry(x,entry){
 x.history=periodicHistoryRows(x);
 const date=normalizeDateValue(entry?.date||'');if(!date)return;
 const i=x.history.findIndex(r=>r.date===date);
 const row={date,provider:entry.provider||'',source:entry.source||'',note:entry.note||''};
 if(i>=0)x.history[i]={...x.history[i],date,provider:x.history[i].provider||row.provider||'',source:x.history[i].source||row.source||'',note:x.history[i].note||row.note||''};
 else x.history.push(row);
 x.history=periodicHistoryRows(x);
}
function migratePeriodicExcelHistoryV147162(d){
 d.settings=d.settings||{};
 if(String(d.settings.periodicExcelHistoryVersion||'')==='147.162')return;
 d.periodic=Array.isArray(d.periodic)?d.periodic:[];
 const norm=s=>normalizeText(s);
 for(const spec of PERIODIC_EXCEL_HISTORY_V147162){
  let p=d.periodic.find(x=>String(x.contractControlKey||'')===spec.key);
  if(!p){
   p=d.periodic.find(x=>{const n=norm(x?.name||'');return spec.tokens.every(t=>n.includes(t))&&!(spec.exclude||[]).some(t=>n.includes(t))});
  }
  if(!p)continue;
  for(const entry of spec.entries)mergePeriodicHistoryEntry(p,entry);
  // Toujours conserver le dernier contrôle courant dans l'historique, même s'il vient d'une saisie manuelle plus récente.
  if(p.lastDate)mergePeriodicHistoryEntry(p,{date:p.lastDate,provider:p.provider||'',source:p.contractSyncSource?'Synchronisation application':'Application'});
  const hist=periodicHistoryRows(p);
  const newest=hist[0];
  const curLast=normalizeDateValue(p.lastDate||'');
  if(newest?.date&&(!curLast||newest.date>curLast)){
   p.lastDate=newest.date;
   if(!p.provider&&newest.provider)p.provider=newest.provider;
  }
  if(Number(p.intervalMonths||0)<=0&&Number(spec.intervalMonths||0)>0)p.intervalMonths=Number(spec.intervalMonths);
  if(!p.periodicityText&&Number(spec.intervalMonths||0)===24)p.periodicityText='biennale';
  if(p.lastDate&&Number(p.intervalMonths||0)>0&&!normalizeDateValue(p.nextDate||''))p.nextDate=addMonthsClamped(p.lastDate,Number(p.intervalMonths));
 }
 d.settings.periodicExcelHistoryVersion='147.162';
}


// V147.163 — tous les suivis récurrents du classeur Excel deviennent des contrôles périodiques.
// Objectif terrain : ne rien oublier. Les éléments non utiles peuvent ensuite être modifiés, clôturés ou supprimés par l'utilisateur.
// Les dates de prestation réelles alimentent l'historique ; les dates de contrat ne sont jamais transformées artificiellement en dates de contrôle.
const PERIODIC_EXCEL_FULL_V147163=[{"key":"gaz","name":"Contrôle des installations de gaz","family":"Gaz / cuisine","intervalMonths":12,"periodicityText":"annuelle","lastDate":"2026-06-13","provider":"APAVE","sector":"ALO","sourceNames":["Contrôle des installations de gaz"],"history":[{"date":"2024-03-29","provider":"DEKRA","source":"Excel — Contrats 2024"},{"date":"2025-02-25","provider":"DEKRA","source":"Excel — Contrats 2025"},{"date":"2026-06-13","provider":"APAVE","source":"Excel — Contrats 2026"}],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Prestataires retrouvés : DEKRA → APAVE. Service : ALO.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"electricite","name":"Contrôle des installations électriques","family":"Électricité","intervalMonths":12,"periodicityText":"annuelle","lastDate":"2026-07-10","provider":"APAVE","sector":"ALO","sourceNames":["Contrôle des installations électriques"],"history":[{"date":"2024-11-06","provider":"APAVE","source":"Excel — Contrats 2024"},{"date":"2025-06-17","provider":"APAVE","source":"Excel — Contrats 2025"},{"date":"2026-07-10","provider":"APAVE","source":"Excel — Contrats 2026"}],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Remarques Excel : ajouter ALGECO futur contrat | algéco 516 € Service : ALO.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"ssi-desenfumage","name":"Contrôle SSI + désenfumage","family":"Incendie / SSI","intervalMonths":36,"periodicityText":"triennale","lastDate":"2026-07-20","provider":"TSA","sector":"ALO","sourceNames":["Contrôle du SSI +  désenfumage","Contrôle du SSI + désenfumage"],"history":[{"date":"2024-05-02","provider":"BUREAU VERITAS","source":"Excel — Contrats 2024"},{"date":"2026-07-20","provider":"TSA","source":"Excel — Contrats 2026 + confirmation utilisateur"}],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Indication prestataire Excel : CONTRAT A REFAIRE en déc 2026 pour janv 2027. Service : ALO.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"colonne-seche","name":"Contrôle colonne sèche incendie","family":"Incendie / SSI","intervalMonths":12,"periodicityText":"annuelle \n+\nune fois tous les 5 ans : contrôle plus approfondi (à prévoir en 2025)","lastDate":"2024-12-20","provider":"","sector":"ALO","sourceNames":["contrôle colonne sèche incendie"],"history":[{"date":"2024-12-20","provider":"LIS","source":"Excel — Contrats 2024"}],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Indication prestataire Excel : pas de contrat. Prestataires retrouvés : LOIRE INCENDIE → LIS. Service : ALO.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"installations-thermiques","name":"Contrôle installations thermiques — chaudières / émissions polluantes","family":"Chauffage / CVC","intervalMonths":36,"periodicityText":"triennale","lastDate":"2024-12-11","provider":"","sector":"ALO","sourceNames":["contrôle installations thermiques (efficacité énergétique chaudières et émissions polluantes)"],"history":[{"date":"2024-12-11","provider":"BUREAU VERITAS","source":"Excel — Contrats 2024"}],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Indication prestataire Excel : CONTRAT A REFAIRE en déc 2026 pour janv 2027. Service : ALO.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"ascenseur-rvre","name":"Vérification ascenseur — contrôle technique + RVRE incendie","family":"Ascenseurs / levage","intervalMonths":60,"periodicityText":"tous les 5 ans\n\nascenseur bât Noëlas","lastDate":"2026-04-23","provider":"BUREAU VERITAS","sector":"ALO","sourceNames":["Vérification de l'ascenseur :\n - contrôle technique de l'ascenseur : tous les 5 ans - contrôle fait par la Région (incombe au propriétaire)\n - contrôle : rapport de vérifications périodiques règlementaires en exploitation = RVRE (incendie de l'ascenseur)  : tous les 5 ans - contrôle à faire par le lycée"],"history":[{"date":"2026-04-23","provider":"BUREAU VERITAS","source":"Excel — Contrats 2026"}],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Mise en service Noëlas : janvier 2022 ; contrôle fait le 23/04/2026. Service : ALO.","building":"Bâtiment Noëlas","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"ligne-vie-gym-dp","name":"Contrôle lignes de vie toiture — gymnase + demi-pension","family":"Travail en hauteur","intervalMonths":12,"periodicityText":"annuelle","lastDate":"2026-01-22","provider":"SOCOTEC","sector":"","sourceNames":["contrôle des lignes de vie en toiture","contrôle des lignes de vie en toiture \nbât gymnase+demie-pension"],"history":[{"date":"2024-12-06","provider":"APAVE","source":"Excel — Contrats 2024"},{"date":"2026-01-22","provider":"APAVE","source":"Excel — Contrats 2026"}],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Prestataires retrouvés : APAVE → SOCOTEC. Remarques Excel : ajouter bâtiment noëlas | faire nouveau contrat\n sur 3 ans à compter du ,,,,","building":"Gymnase","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"porte-automatique","name":"Contrôle / maintenance porte automatique","family":"Portes / accès","intervalMonths":6,"periodicityText":"semestrielle","lastDate":"","provider":"RECORD","sector":"ALO","sourceNames":["Maintenance porte automatique","contrôle porte automatique"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Service : ALO.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"eps-espaliers","name":"Contrôle EPS — 2 espaliers + 1 barre de traction","family":"Équipements sportifs","intervalMonths":24,"periodicityText":"biennale","lastDate":"2025-12-02","provider":"APAVE","sector":"ALO","sourceNames":["Contrôle EPS : 2 espaliers + 1 barre de traction"],"history":[{"date":"2023-10-04","provider":"APAVE","source":"Excel — Contrats 2026"},{"date":"2024-10-01","provider":"APAVE","source":"Excel — Contrats 2024"},{"date":"2025-12-02","provider":"APAVE","source":"Excel — Contrats 2026"}],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Service : ALO.","building":"Gymnase","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"eps-gymnase","name":"Contrôle EPS — gymnase basket + hand","family":"Équipements sportifs","intervalMonths":24,"periodicityText":"biennale","lastDate":"2024-10-01","provider":"APAVE","sector":"ALO","sourceNames":["contrôle EPS : gymnase (basket + hand)"],"history":[{"date":"2023-10-04","provider":"APAVE","source":"Excel — Contrats 2024"},{"date":"2024-10-01","provider":"APAVE","source":"Excel — Contrats 2024"}],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Service : ALO.","building":"Gymnase","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"filtres-hottes-armoires","name":"Contrôle filtres de hottes et armoires chimiques","family":"Cuisine / hygiène","intervalMonths":12,"periodicityText":"annuelle","lastDate":"","provider":"DALKIA marché Région","sector":"ALO","sourceNames":["contrôle des filtres de hottes et armoires chimiques"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Service : ALO.","building":"Demi-pension","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"maintenance-chauffage-cvc","name":"Maintenance chauffage / CVC","family":"Chauffage / CVC","intervalMonths":12,"periodicityText":"annuelle","lastDate":"","provider":"DALKIA","sector":"ALO","sourceNames":["Maintenance chauffage CVC"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Prestataires retrouvés : BEALEM → DALKIA. Service : ALO.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"maintenance-rsw","name":"Maintenance équipements RSW — optimisation électrique","family":"Électricité","intervalMonths":0,"periodicityText":"à vérifier si dans le contrat DALKIA","lastDate":"","provider":"","sector":"ALO","sourceNames":["maintenance équipements RSW servant à l'optimisation électrique"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Service : ALO.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"maintenance-ssi","name":"Maintenance SSI — nouvelle centrale","family":"Incendie / SSI","intervalMonths":12,"periodicityText":"annuelle","lastDate":"2023-12-27","provider":"TSA","sector":"ALO","sourceNames":["Maintenance SSI\non a un contrat pour la nouvelle centrale\nattention : pour l'ancienne, demander une intervention annuelle sur devis et bon de commande","Maintenane SSI"],"history":[{"date":"2023-12-27","provider":"TSA","source":"Excel — Contrats 2024"}],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Service : ALO.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"maintenance-ancien-ssi","name":"Maintenance ancien SSI + désenfumage","family":"Incendie / SSI","intervalMonths":12,"periodicityText":"annuelle","lastDate":"2024-10-03","provider":"TSA","sector":"ALO","sourceNames":["Maintenance ancien SSI +  désenfumage"],"history":[{"date":"2024-10-03","provider":"TSA","source":"Excel — Contrats 2024"}],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Service : ALO.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"maintenance-desenfumage","name":"Maintenance désenfumage asservie au SSI","family":"Incendie / SSI","intervalMonths":12,"periodicityText":"annuelle","lastDate":"2023-12-27","provider":"TSA","sector":"ALO","sourceNames":["maintenance désenfumage","maintenance désenfumage :\nTSA fait vérif des instal. désenfumage asservies au SSI\nsi dysfonctionnement il nous le signale pour que l'on fasse intervenir une entreprise"],"history":[{"date":"2023-12-27","provider":"TSA","source":"Excel — Contrats 2024"}],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Service : ALO.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"maintenance-skydome","name":"Maintenance skydômes de désenfumage","family":"Incendie / SSI","intervalMonths":12,"periodicityText":"annuelle","lastDate":"2026-06-23","provider":"A.P.S.","sector":"ALO","sourceNames":["maintenance skydôme de désenfumage"],"history":[{"date":"2024-08-24","provider":"LIS","source":"Excel — Contrats 2024"},{"date":"2025-09-05","provider":"AML GRANGER","source":"Excel — Contrats 2025"},{"date":"2026-06-23","provider":"A.P.S.","source":"Excel — Contrats 2026"}],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Prestataires retrouvés : LIS → AML GRANGER → A.P.S.. Service : ALO.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"maintenance-extincteurs","name":"Maintenance extincteurs","family":"Incendie / SSI","intervalMonths":12,"periodicityText":"annuelle","lastDate":"2026-08-28","provider":"L.I.S.","sector":"ALO","sourceNames":["maintenance extincteurs","maintenance extincteurs\npas de contrat car LIS fournit les extincteurs pour la restructuration\nj'attends la fin de la restructuration"],"history":[{"date":"2024-08-24","provider":"LIS","source":"Excel — Contrats 2024"},{"date":"2026-08-28","provider":"L.I.S.","source":"Excel — Contrats 2026"}],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Prestataires retrouvés : LIS → L.I.S.. Service : ALO.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"maintenance-defibrillateur","name":"Maintenance défibrillateur","family":"Sécurité / secours","intervalMonths":36,"periodicityText":"maintenance une fois tous les trois ans","lastDate":"2026-06-16","provider":"D-SECURITE GROUPE","sector":"ALO","sourceNames":["Entretien et maintenance du défibrillateur","Maintenance défibrilateur","maintenance du défibrillateur"],"history":[{"date":"2026-06-16","provider":"D-SECURITE GROUPE","source":"Excel — Contrats 2026"}],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Prestataires retrouvés : SCHILLER → D-SECURITE → D-SECURITE GROUPE. Remarques Excel : 178,80 € 2026-2027-2028 | changement des électrodes - 2026 Service : ALO.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"maintenance-autolaveuse","name":"Maintenance autolaveuse","family":"Matériels / logiciels","intervalMonths":0,"periodicityText":"","lastDate":"","provider":"KARCHER","sector":"ALO","sourceNames":["Maintenance Autolaveuse"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Service : ALO.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"maintenance-ascenseurs","name":"Maintenance ascenseurs","family":"Ascenseurs / levage","intervalMonths":0,"periodicityText":"","lastDate":"","provider":"AUVERGNE ASCENSEURS","sector":"ALO","sourceNames":["Maintenance ascenseurs :\nmarché régional en direct"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Service : ALO.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"maintenance-musculation","name":"Maintenance matériel de musculation","family":"Équipements sportifs","intervalMonths":12,"periodicityText":"annuel","lastDate":"","provider":"ESTHEFIT","sector":"ALO","sourceNames":["maintenance sur matériel musculation","maintenance sur matériel musculation\npas de contrat\nfaire bon de commande chaque année"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Remarques Excel : 342 € en 2025 Service : ALO.","building":"Gymnase","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"marche-gaz-ugap","name":"Fourniture gaz — marché UGAP","family":"Chauffage / CVC","intervalMonths":0,"periodicityText":"","lastDate":"","provider":"GAZ de BORDEAUX","sector":"ALO","sourceNames":["Marché gaz par l'UGAP"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Service : ALO.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"marche-electricite-ugap","name":"Fourniture d’électricité — UGAP","family":"Électricité","intervalMonths":0,"periodicityText":"","lastDate":"","provider":"ENGIE","sector":"ALO","sourceNames":["Marché pour la fourniture d'électricité UGAP"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Prestataires retrouvés : TOTAL ENERGIES → ENGIE. Service : ALO.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"telesurveillance","name":"Télésurveillance du lycée","family":"Sûreté / PPMS","intervalMonths":0,"periodicityText":"","lastDate":"","provider":"AIS","sector":"ALO","sourceNames":["Télésurveillance du lycée"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Service : ALO.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"telephone-fixe","name":"Téléphonie fixe","family":"Prestations / services","intervalMonths":0,"periodicityText":"","lastDate":"","provider":"SFR BUSINESS TEAM","sector":"ALO","sourceNames":["Marché téléphonique fixe"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Service : ALO.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"telephone-mobile-responsable","name":"Téléphone mobile — responsable équipe","family":"Prestations / services","intervalMonths":12,"periodicityText":"reconduction express\nchaque année faire courrier de reconduction en juin","lastDate":"","provider":"TSA","sector":"","sourceNames":["contrat téléphone mobile\nresponsable équipe"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ».","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"telephone-mobile-proviseur","name":"Téléphone mobile — proviseur","family":"Prestations / services","intervalMonths":0,"periodicityText":"résiliation au 01/10/2024","lastDate":"","provider":"TSA","sector":"","sourceNames":["contrat téléphone mobile\nproviseur"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ».","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"telephone-mobile-maintenance","name":"Téléphone mobile — agent maintenance","family":"Prestations / services","intervalMonths":0,"periodicityText":"","lastDate":"","provider":"pris en charge directement par la Région","sector":"","sourceNames":["contrat téléphone mobile\nagent maintenance"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ».","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"affranchir","name":"Machine à affranchir","family":"Prestations / services","intervalMonths":0,"periodicityText":"","lastDate":"","provider":"PITNEY BOWLES","sector":"ALO","sourceNames":["Location de la machine à affranchir"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Prestataires retrouvés : QUADIENT → PITNEY BOWLES. Remarques Excel : 407,33 € PITNEY BOWLES du 07,01,25 au 31,12,2027 Service : ALO.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"photocopieurs","name":"Photocopieurs","family":"Matériels / logiciels","intervalMonths":0,"periodicityText":"","lastDate":"","provider":"RBI","sector":"ALO","sourceNames":["Photocopieurs"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Service : ALO.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"droits-reproduction","name":"Droits de reproduction des œuvres protégées","family":"Prestations / services","intervalMonths":0,"periodicityText":"","lastDate":"","provider":"CFC","sector":"ALO","sourceNames":["Droits de reproduction des œuvres protégées"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Service : ALO.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"enlevement-papier","name":"Enlèvement papier et cartons","family":"Prestations / services","intervalMonths":0,"periodicityText":"","lastDate":"","provider":"VALORISE","sector":"ALO","sourceNames":["Enlèvement du papier","Enlèvement du papier et des cartons"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Service : ALO.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"analyses-sanitaires","name":"Analyses sanitaires","family":"Cuisine / hygiène","intervalMonths":1,"periodicityText":"tous les mois","lastDate":"","provider":"SAVOIE LABO","sector":"SRH","sourceNames":["Analyses sanitaires"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Service : SRH.","building":"Demi-pension","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"collecte-huiles","name":"Collecte huiles usagées","family":"Cuisine / hygiène","intervalMonths":0,"periodicityText":"intervient gratuitement","lastDate":"","provider":"ONDAINE AGRO","sector":"SRH","sourceNames":["Collecte huiles usagées"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Prestataires retrouvés : ECOVALIM → ONDAINE AGRO. Service : SRH.","building":"Demi-pension","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"plafond-filtrant","name":"Entretien plafond filtrant","family":"Cuisine / hygiène","intervalMonths":0,"periodicityText":"","lastDate":"2024-07-08","provider":"ASEPTI AIR","sector":"SRH","sourceNames":["Entretien plafond filtrant"],"history":[{"date":"2024-07-08","provider":"ASEPTI AIR","source":"Excel — Contrats 2024"}],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Service : SRH.","building":"Demi-pension","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"tunnel-lavage","name":"Maintenance tunnel de lavage","family":"Cuisine / hygiène","intervalMonths":0,"periodicityText":"","lastDate":"","provider":"HOBART","sector":"SRH","sourceNames":["Maintenance tunnel de lavage"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Service : SRH.","building":"Demi-pension","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"materiel-cuisine","name":"Entretien matériel de cuisine","family":"Cuisine / hygiène","intervalMonths":0,"periodicityText":"","lastDate":"","provider":"","sector":"SRH","sourceNames":["Entretien matériel de cuisine"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Indication prestataire Excel : A FAIRE. Service : SRH.","building":"Demi-pension","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"deratisation","name":"Dératisation","family":"Cuisine / hygiène","intervalMonths":3,"periodicityText":"trimestriel","lastDate":"","provider":"PLANETE ENVIRONNEMENT","sector":"SRH","sourceNames":["dératisation"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Remarques Excel : 600 € en 2025 Service : SRH.","building":"Demi-pension","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"bac-graisses","name":"Bac à graisses","family":"Cuisine / hygiène","intervalMonths":0,"periodicityText":"","lastDate":"","provider":"OSIS","sector":"SRH","sourceNames":["bac à graisses"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Service : SRH.","building":"Demi-pension","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"maintenance-turbo-self","name":"Maintenance matériels TURBO SELF — TEAM V2","family":"Matériels / logiciels","intervalMonths":12,"periodicityText":"durée du contrat 1 an, renouvelable 1 an","lastDate":"","provider":"TURBO SELF","sector":"SRH","sourceNames":["Maintenance sur matériels TURBO SELF\nContrat TEAM V2"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Service : SRH.","building":"Demi-pension","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"licence-turbo-self","name":"Licence Turbo Self","family":"Matériels / logiciels","intervalMonths":12,"periodicityText":"annuelle / renouvellement annuel","lastDate":"","provider":"TURBO SELF","sector":"SRH","sourceNames":["Licence Turbo Self"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Remarques Excel : 792 € TTC en 2025 Service : SRH.","building":"Demi-pension","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"licence-turbo-selfair","name":"Licence Turbo Self Air — contrôle d’accès","family":"Matériels / logiciels","intervalMonths":12,"periodicityText":"annuelle / renouvellement annuel","lastDate":"","provider":"SELF AIR","sector":"SRH","sourceNames":["Licence Turbo Self Air pour contrôle d' accès","Licence Turbo Selfair pour contrôle d' accès"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Remarques Excel : 505,56 TTC en 2025 Service : SRH.","building":"Demi-pension","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"easilys","name":"Easilys — logiciel GPAO restauration","family":"Matériels / logiciels","intervalMonths":12,"periodicityText":"commande annuelle","lastDate":"","provider":"commande chaque année par la centrale d'achat régionale","sector":"SRH","sourceNames":["Easilys\nlogiciel GPAO restauration"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Service : SRH.","building":"Demi-pension","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"easilys-assistance","name":"Easilys — assistance GPAO / déchets / PMS","family":"Matériels / logiciels","intervalMonths":0,"periodicityText":"","lastDate":"","provider":"","sector":"SRH","sourceNames":["Easilys - assistance\nlogiciel GPAO : collecte déchets et PMS","Easilys - assistance\nlogiciel GPAO restauration"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Remarques Excel : 337,26 TTC en 2025 Service : SRH.","building":"Demi-pension","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"interventions-cav","name":"Interventions pour le CAV","family":"Prestations / services","intervalMonths":0,"periodicityText":"","lastDate":"","provider":"ERIC CARJOT","sector":"","sourceNames":["Interventions pour le CAV"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ».","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"assurance-autolaveuse","name":"Assurance autolaveuse autoportée","family":"Contrats / assurances","intervalMonths":0,"periodicityText":"","lastDate":"","provider":"assurance Région\nde 2021 à 2026","sector":"","sourceNames":["Assurance Autolaveuse autoportée"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ».","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"assurance-eleves","name":"Assurance élèves + voiture + remorque","family":"Contrats / assurances","intervalMonths":0,"periodicityText":"","lastDate":"","provider":"MAIF","sector":"ALO","sourceNames":["assurance des élèves + voiture + remorque"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Remarques Excel : 1354,69 TTC en 2025 Service : ALO.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"vente-viennoiseries","name":"Vente de viennoiseries","family":"Prestations / services","intervalMonths":36,"periodicityText":"contrat triennal\nde sept 2026 à juin 2030","lastDate":"","provider":"LES PTITS BOUCHONS","sector":"","sourceNames":["vente de viennoiseries"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Prestataires retrouvés : UNICEF → LES PTITS BOUCHONS.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"ecrans-self","name":"Écrans dynamiques — Self (2 écrans)","family":"Matériels / logiciels","intervalMonths":60,"periodicityText":"Abonnement compris : 5 ans\n(nov 2030)","lastDate":"","provider":"","sector":"","sourceNames":["- self : 2 écrans\ninstallation : 11/03/2024"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Installation : 11/03/2024. Abonnement indiqué jusqu’en novembre 2030.","building":"Demi-pension","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"ecrans-gymnase","name":"Écran dynamique — Gymnase","family":"Matériels / logiciels","intervalMonths":60,"periodicityText":"Abonnement compris : 5 ans\n(nov 2030)","lastDate":"","provider":"","sector":"","sourceNames":["- gymnase : 1 écran\ninstallation : 07/06/2024"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Installation : 07/06/2024. Abonnement indiqué jusqu’en novembre 2030.","building":"Gymnase","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"portails-automatiques-note","name":"Portails automatiques — contrôle / maintenance","family":"Portes / accès","intervalMonths":6,"periodicityText":"semestrielle","lastDate":"","provider":"DEKRA","sector":"","sourceNames":["portes et portails automatiques :\nVu avec Daniel Bousquet, inspecteur hygiène et sécurité du rectorat :\ninutile d'avoir 1 contrat maintenance + 1 contrat vérification :\n\"la vérification assurée par un technicien compétent se fait tous les 6 mois selon les contraintes réglementaires. Si tu prends une entreprise, dans la même visite ils te font la vérification du bon fonctionnement de toutes les sécurités ainsi que la maintenance\".\n - pour la porte automatique du préau : je prends RECORD (ils feront contrôle + maintenance)\n - pour les portails : je fais un contrôle par DEKRA, si il y a une panne, je fais une demande d'intervention à VERVAS METAL"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Porte automatique du préau : RECORD contrôle + maintenance. Portails : contrôle DEKRA ; panne : VERVAS METAL.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"electricite-algeco","name":"Contrôle des installations électriques — ALGECO","family":"Électricité","intervalMonths":12,"periodicityText":"annuelle","lastDate":"2025-05-28","provider":"BUREAU VERITAS","sector":"ALO","sourceNames":["Contrôle des installations électriques ALGECO"],"history":[{"date":"2025-05-28","provider":"BUREAU VERITAS","source":"Excel — Contrats 2025"}],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Service : ALO.","building":"Algeco","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"ligne-vie-noelas","name":"Contrôle lignes de vie toiture — Noëlas","family":"Travail en hauteur","intervalMonths":12,"periodicityText":"annuelle","lastDate":"2026-04-28","provider":"APAVE","sector":"ALO","sourceNames":["contrôle des lignes de vie en toiture \nbât Noëlas"],"history":[{"date":"2026-04-28","provider":"APAVE","source":"Excel — Contrats 2026"}],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Service : ALO.","building":"Bâtiment Noëlas","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"marche-gaz-dalkia","name":"Fourniture gaz — DALKIA","family":"Chauffage / CVC","intervalMonths":0,"periodicityText":"","lastDate":"","provider":"","sector":"ALO","sourceNames":["Marché gaz DALKIA"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Service : ALO.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"ecrans-cdi-vs","name":"Écrans dynamiques — CDI + Vie scolaire","family":"Matériels / logiciels","intervalMonths":0,"periodicityText":"","lastDate":"","provider":"","sector":"","sourceNames":["- CDI + VIE SCOLAIRE : 2 écrans\ninstallation : 09/2025"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ». Installation : 09/2025.","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"},{"key":"logique-tranquille","name":"Logique Tranquille — Bac à stages","family":"Matériels / logiciels","intervalMonths":0,"periodicityText":"","lastDate":"","provider":"Logique Tranquille","sector":"","sourceNames":["Logique Tranquille\nBac à stages"],"history":[],"notes":"Source : fichier Excel « suivi des contrats (2).xlsx ».","building":"Tous bâtiments","requirement":"Suivi périodique issu du fichier Excel. Mettre à jour la date après chaque passage / prestation et joindre le rapport ou le lien OneDrive si disponible.","register":"Suivi périodique"}];

function migratePeriodicExcelFullV147163(d){
 d.settings=d.settings||{};
 if(String(d.settings.periodicExcelFullVersion||'')==='147.163')return;
 d.periodic=Array.isArray(d.periodic)?d.periodic:[];
 d.lists=d.lists||clone(defaultLists);
 d.lists.periodicFamilies=Array.isArray(d.lists.periodicFamilies)?d.lists.periodicFamilies:[];
 for(const fam of defaultLists.periodicFamilies)if(!d.lists.periodicFamilies.includes(fam))d.lists.periodicFamilies.push(fam);
 const norm=s=>normalizeText(s);
 const usedNos=new Set((d.periodic||[]).map(x=>String(x.no||'')));
 let maxNo=0;
 for(const n of usedNos){const m=n.match(/^CP-(\d+)$/);if(m)maxNo=Math.max(maxNo,Number(m[1]));}
 const allocNo=()=>{let no='';do{maxNo++;no=`CP-${String(maxNo).padStart(3,'0')}`;}while(usedNos.has(no));usedNos.add(no);return no;};
 const findExisting=spec=>{
   let p=d.periodic.find(x=>String(x.excelPeriodicKey||'')===spec.key||String(x.contractControlKey||'')===spec.key);
   if(p)return p;
   const names=(spec.sourceNames||[]).map(norm).filter(Boolean);
   return d.periodic.find(x=>names.includes(norm(x?.name||'')))||null;
 };
 for(const spec of PERIODIC_EXCEL_FULL_V147163){
   let p=findExisting(spec);
   const isNew=!p;
   if(!p){
     p={id:uid(),no:allocNo(),name:spec.name||'Suivi périodique',family:spec.family||'Autre',intervalMonths:Number(spec.intervalMonths||0),
       periodicityText:spec.periodicityText||'',lastDate:'',nextDate:'',provider:spec.provider||'',building:spec.building||'Tous bâtiments',
       requirement:spec.requirement||'',register:spec.register||'Suivi périodique',time:'',floor:'',sector:spec.sector||'',room:'',
       status:'À planifier',notes:spec.notes||'',oneDriveUrl:'',history:[],attachments:[]};
     d.periodic.push(p);
   }
   p.excelPeriodicKey=spec.key;
   p.excelSourceNames=[...(spec.sourceNames||[])];
   p.excelPeriodicVersion='147.163';
   if(isNew){
     p.name=spec.name||p.name;p.family=spec.family||p.family;p.intervalMonths=Number(spec.intervalMonths||0);
     p.periodicityText=spec.periodicityText||'';p.provider=spec.provider||'';p.building=spec.building||'Tous bâtiments';
     p.requirement=spec.requirement||'';p.register=spec.register||'Suivi périodique';p.sector=spec.sector||'';p.notes=spec.notes||'';
   }else{
     if(!p.family||p.family==='Autre')p.family=spec.family||p.family;
     if(Number(p.intervalMonths||0)<=0&&Number(spec.intervalMonths||0)>0)p.intervalMonths=Number(spec.intervalMonths);
     if(!String(p.periodicityText||'').trim()&&spec.periodicityText)p.periodicityText=spec.periodicityText;
     if(!String(p.requirement||'').trim())p.requirement=spec.requirement||'';
     if(!String(p.register||'').trim())p.register=spec.register||'Suivi périodique';
     if(!String(p.sector||'').trim()&&spec.sector)p.sector=spec.sector;
     if((!p.building||p.building==='Tous bâtiments')&&spec.building&&spec.building!=='Tous bâtiments')p.building=spec.building;
     if(spec.notes&&!String(p.notes||'').includes('suivi des contrats (2).xlsx'))p.notes=[p.notes,spec.notes].filter(Boolean).join('\n');
   }
   for(const h of (spec.history||[]))mergePeriodicHistoryEntry(p,h);
   if(p.lastDate)mergePeriodicHistoryEntry(p,{date:p.lastDate,provider:p.provider||'',source:p.contractSyncSource?'Synchronisation application':'Application'});
   const hist=periodicHistoryRows(p);
   const newest=hist[0];
   const curLast=normalizeDateValue(p.lastDate||'');
   const specLast=normalizeDateValue(spec.lastDate||'');
   const targetLast=(newest?.date&&(!curLast||newest.date>curLast))?newest.date:(specLast&&(!curLast||specLast>curLast)?specLast:curLast);
   const interval=Number(p.intervalMonths||spec.intervalMonths||0);
   const oldAuto=curLast&&interval>0?addMonthsClamped(curLast,interval):'';
   const curNext=normalizeDateValue(p.nextDate||'');
   const managedNext=normalizeDateValue(p.excelPeriodicManagedNext||p.contractSyncNextDate||'');
   const nextWasManaged=!curNext||(managedNext&&curNext===managedNext)||(oldAuto&&curNext===oldAuto)||curNext<=curLast;
   if(targetLast&&(!curLast||targetLast>=curLast))p.lastDate=targetLast;
   const newAuto=p.lastDate&&interval>0?addMonthsClamped(p.lastDate,interval):'';
   if(newAuto&&nextWasManaged){p.nextDate=newAuto;p.excelPeriodicManagedNext=newAuto;}
   const knownProviders=new Set([...(spec.history||[]).map(h=>String(h.provider||'').trim()),String(spec.provider||'').trim()].filter(Boolean));
   const curProvider=String(p.provider||'').trim(),prevManaged=String(p.excelPeriodicManagedProvider||'').trim();
   const providerWasManaged=!curProvider||(prevManaged&&curProvider===prevManaged)||knownProviders.has(curProvider);
   if(providerWasManaged){
     if(spec.provider)p.provider=spec.provider;
     else if(prevManaged&&curProvider===prevManaged)p.provider='';
     p.excelPeriodicManagedProvider=spec.provider||'';
   }
   p.updatedAt=p.updatedAt||new Date().toISOString();
 }
 d.settings.periodicExcelFullVersion='147.163';
}


// V147.164 — correction des doublons de cartes et du contrôle SSI de juillet 2026.
// Le contrôle SSI + désenfumage du 20/07/2026 a été réalisé par TSA (confirmation utilisateur).
// Les doublons techniques certains (même clé d'import ou même nom/famille/périodicité) sont fusionnés
// sans supprimer l'historique, les pièces jointes ni les liens OneDrive.
function migratePeriodicFixesV147164(d){
 d.settings=d.settings||{};
 if(String(d.settings.periodicFixesVersion||'')==='147.164')return;
 d.periodic=Array.isArray(d.periodic)?d.periodic:[];
 const norm=s=>normalizeText(String(s||'')).replace(/[^a-z0-9]+/g,' ').trim();
 const mergeInto=(target,src)=>{
  if(!target||!src||target===src)return target;
  for(const h of periodicHistoryRows(src))mergePeriodicHistoryEntry(target,h);
  if(src.lastDate)mergePeriodicHistoryEntry(target,{date:src.lastDate,provider:src.provider||'',source:'Ancienne carte fusionnée'});
  const td=normalizeDateValue(target.lastDate||''),sd=normalizeDateValue(src.lastDate||'');
  if(sd&&(!td||sd>td)){target.lastDate=sd;if(src.provider)target.provider=src.provider;}
  if(!target.nextDate&&src.nextDate)target.nextDate=src.nextDate;
  if(!target.provider&&src.provider)target.provider=src.provider;
  if(!target.oneDriveUrl&&src.oneDriveUrl)target.oneDriveUrl=src.oneDriveUrl;
  if(!target.requirement&&src.requirement)target.requirement=src.requirement;
  if(!target.register&&src.register)target.register=src.register;
  if(!target.building&&src.building)target.building=src.building;
  if(!target.floor&&src.floor)target.floor=src.floor;
  if(!target.sector&&src.sector)target.sector=src.sector;
  if(!target.room&&src.room)target.room=src.room;
  if(!target.notes&&src.notes)target.notes=src.notes;
  else if(src.notes&&target.notes!==src.notes&&!String(target.notes).includes(src.notes))target.notes=`${target.notes}\n${src.notes}`;
  const ta=Array.isArray(target.attachments)?target.attachments:[];
  const sa=Array.isArray(src.attachments)?src.attachments:[];
  const seen=new Set(ta.map(a=>String(a?.id||a?.name||JSON.stringify(a))));
  for(const a of sa){const k=String(a?.id||a?.name||JSON.stringify(a));if(!seen.has(k)){ta.push(a);seen.add(k)}}
  target.attachments=ta;
  return target;
 };
 // 1) Même clé technique => une seule carte.
 const byKey=new Map();
 const remove=new Set();
 for(const p of d.periodic){
  const key=String(p.excelPeriodicKey||p.contractControlKey||'').trim();
  if(!key)continue;
  if(!byKey.has(key)){byKey.set(key,p);continue;}
  const target=byKey.get(key);mergeInto(target,p);remove.add(p.id);
 }
 // 2) Même nom + même famille + même périodicité => doublon certain.
 const bySig=new Map();
 for(const p of d.periodic){
  if(remove.has(p.id))continue;
  const sig=[norm(p.name),norm(p.family),String(Number(p.intervalMonths||0))].join('|');
  if(!norm(p.name))continue;
  if(!bySig.has(sig)){bySig.set(sig,p);continue;}
  const target=bySig.get(sig);mergeInto(target,p);remove.add(p.id);
 }
 if(remove.size)d.periodic=d.periodic.filter(p=>!remove.has(p.id));
 // 3) Correction SSI juillet 2026 : TSA.
 let ssi=d.periodic.find(p=>String(p.excelPeriodicKey||p.contractControlKey||'')==='ssi-desenfumage');
 if(!ssi)ssi=d.periodic.find(p=>norm(p.name).includes('ssi')&&norm(p.name).includes('desenfum'));
 if(ssi){
  mergePeriodicHistoryEntry(ssi,{date:'2026-07-20',provider:'TSA',source:'Excel — Contrats 2026 + confirmation utilisateur'});
  const cur=normalizeDateValue(ssi.lastDate||'');
  if(!cur||cur<='2026-07-20'){
   ssi.lastDate='2026-07-20';
   ssi.provider='TSA';
   const interval=Number(ssi.intervalMonths||36);
   if(interval>0){ssi.nextDate=addMonthsClamped('2026-07-20',interval);ssi.excelPeriodicManagedNext=ssi.nextDate;}
  }else if(cur==='2026-07-20'&&!String(ssi.provider||'').trim())ssi.provider='TSA';
  ssi.excelPeriodicManagedProvider='TSA';
 }
 d.settings.periodicFixesVersion='147.164';
}

const CANONICAL_FACILITY_SPACES={
 'Extension':[
  ['Gymnase','Salle de sport / gymnase'],['Salle de musculation','Salle de sport / gymnase'],['Sanitaires','Sanitaires / vestiaires'],['Circulation','Circulations / halls / escaliers'],
  ['Vestiaires','Sanitaires / vestiaires'],['Salle des professeurs','Salle des personnels'],['Rangement','Locaux techniques'],['Atelier','Atelier'],['Chaufferie','Locaux techniques']
 ],
 'Demi-pension':[
  ['Self','Demi-pension / restaurant'],['Cuisine','Cuisine'],['Côté technique eau chaude','Locaux techniques'],['Sanitaires filles','Sanitaires / vestiaires'],['Sanitaires garçons','Sanitaires / vestiaires'],
  ['Hall du self','Circulations / halls / escaliers'],['Laverie','Cuisine'],['Circulation cuisine','Circulations / halls / escaliers'],['Espace détente','Salle des personnels'],
  ['Vestiaire agents filles','Sanitaires / vestiaires'],['Vestiaire agents garçons','Sanitaires / vestiaires'],['Bureau','Bureaux / administration'],['Lingerie','Locaux techniques']
 ]
};
function defaultSpaces(buildings){
 const out=[];
 for(const b of buildings){
  for(const f of b.floors){
   out.push({id:uid(),building:b.name,floor:f,type:b.name==='Gymnase'?'Salle de sport / gymnase':b.name==='Cour'?'Cour / extérieurs':'Circulations / halls / escaliers',name:'Zone entière'});
   if(!['Cour','Gymnase'].includes(b.name)){
    out.push({id:uid(),building:b.name,floor:f,type:'Sanitaires / vestiaires',name:'Sanitaires'});
    if(/^Bâtiment/.test(b.name))out.push({id:uid(),building:b.name,floor:f,type:'Salle de classe / devoirs / informatique',name:'Salles de classe'});
   }
  }
 }
 for(const [building,items] of Object.entries(CANONICAL_FACILITY_SPACES))for(const [name,type] of items)out.push({id:uid(),building,floor:'Locaux',type,name});
 return out;
}
function ensureCanonicalFacilitySpaces(d){
 if(!Array.isArray(d.buildings))d.buildings=[];
 if(!Array.isArray(d.spaces))d.spaces=[];
 const key=v=>normalizeText(v).replace(/[^a-z0-9]+/g,' ').trim();
 for(const building of ['Extension','Demi-pension']){
  let b=d.buildings.find(x=>key(x?.name)===key(building));
  if(!b){b={id:uid(),name:building,floors:['Locaux']};d.buildings.push(b)}
  if(!Array.isArray(b.floors))b.floors=[];
  if(!b.floors.some(f=>key(f)==='locaux'))b.floors.unshift('Locaux');
  for(const [name,type] of CANONICAL_FACILITY_SPACES[building]){
   const exists=d.spaces.some(x=>key(x?.building)===key(building)&&key(x?.name)===key(name));
   if(!exists)d.spaces.push({id:uid(),building,floor:'Locaux',type,name});
  }
 }
}
function clone(x){return structuredClone(x)}

const BUNDLED_CONTROL_REPORTS=[{"key":"apave-135054046-001-1-rvre","title":"RVRE — Installations électriques et éclairages","org":"APAVE","family":"Électricité","date":"2025-07-07","ref":"135054046-001-1","summary":"RVRE ERP — aucune non-conformité identifiée dans le périmètre de la vérification.","observations":0,"subtype":"RVRE ERP","sha256":"fbcc7667636c65c9a134f6421ab4056fd9fcaedb586bd58f9aa34410dd89759a","size":1344942,"path":"reports/2025-07-07_APAVE_RVRE_Electricite_Eclairages.pdf","file":"2025-07-07_APAVE_RVRE_Electricite_Eclairages.pdf"},{"key":"apave-135054046-001-1-rvp","title":"Vérification périodique des installations électriques","org":"APAVE","family":"Électricité","date":"2025-07-07","ref":"135054046-001-1","summary":"Vérification périodique des installations électriques — 23 observations signalées dans le rapport.","observations":23,"subtype":"Vérification périodique","sha256":"cda549f71a666baaf27efddd3fa653b5a7725910497e2c81403eadc7438fcc01","size":3680309,"path":"reports/2025-07-07_APAVE_Verification_Installations_Electriques.pdf","file":"2025-07-07_APAVE_Verification_Installations_Electriques.pdf"},{"key":"apave-135046511-001-1-gaz","title":"Installations thermiques / réseau gaz","org":"APAVE","family":"Gaz","date":"2025-09-05","ref":"135046511-001-1","summary":"Vérification des installations thermiques fluide / réseau gaz — 1 observation.","observations":1,"subtype":"Thermique / Gaz","sha256":"f5ffc7006ae754c35ce9dbd4a82611eeb6d2e64878f6583e31112cf051588906","size":1497083,"path":"reports/2025-09-05_APAVE_Installations_Thermiques_Gaz.pdf","file":"2025-09-05_APAVE_Installations_Thermiques_Gaz.pdf"},{"key":"apave-a513283837-004-1-sport","title":"Vérification périodique des équipements sportifs","org":"APAVE","family":"Équipements sportifs","date":"2025-12-05","ref":"A513283837-004-1","summary":"Vérification visuelle et manuelle des équipements sportifs — 26 observations.","observations":26,"subtype":"Équipements sportifs","sha256":"423aa2fd3840deafbd2daab0dae3df00f449f40a1b9f3f314f1b44bbdc249f9e","size":4445518,"path":"reports/2025-12-05_APAVE_Equipements_Sportifs.pdf","file":"2025-12-05_APAVE_Equipements_Sportifs.pdf"},{"key":"apave-a513283836-004-1-ancrage","title":"Vérification des dispositifs d’ancrage pour EPI","org":"APAVE","family":"Autres contrôles","date":"2026-02-02","ref":"A513283836-004-1","summary":"Vérification générale périodique des dispositifs d’ancrage pour EPI — 5 observations.","observations":5,"subtype":"Ancrages / EPI","sha256":"fcf149dfb1e45c0e1dab938b86dbee07fcf9839d3b8180734abb92155c2f3e50","size":135938,"path":"reports/2026-02-02_APAVE_Dispositifs_Ancrage_EPI.pdf","file":"2026-02-02_APAVE_Dispositifs_Ancrage_EPI.pdf"},{"key":"bv-28016576-155-1-1-cta-vmc","title":"Contrôle des CTA et VMC sanitaires","org":"Bureau Veritas","family":"VMC / Ventilation","date":"2026-03-20","ref":"28016576/155.1.1.RAP","summary":"Contrôle des installations d’aération/assainissement — CTA et VMC sanitaires — écarts et non-conformités présents dans le rapport.","observations":null,"subtype":"CTA / VMC sanitaires","sha256":"aadb4258da54a155ca98194d8602d3bef1ff46a26236911f82388766f39fdb96","size":5246665,"path":"reports/2026-03-20_BureauVeritas_CTA_VMC_Sanitaires.pdf","file":"2026-03-20_BureauVeritas_CTA_VMC_Sanitaires.pdf"},{"key":"bv-28016576-152-1-1-hottes","title":"Contrôle des hottes de cuisines","org":"Bureau Veritas","family":"Cuisine / Cuisson","date":"2026-03-20","ref":"28016576/152.1.1.RAP","summary":"Contrôle des installations d’aération/assainissement — hottes de cuisines — observations présentes dans le rapport.","observations":null,"subtype":"Hottes de cuisines","sha256":"144566b4d982b7a241b3400b91f0ce4396b13f1026dbfeabd91b4aa024c3b912","size":3374751,"path":"reports/2026-03-20_BureauVeritas_Hottes_Cuisines.pdf","file":"2026-03-20_BureauVeritas_Hottes_Cuisines.pdf"}];

function defaultData(){const buildings=clone(initialBuildings);const agents=[['Mme','Tarrio','Agent d’accueil'],['Mme','Delorme','Agent d’accueil / lingerie'],['Complément','accueil','Agent d’accueil'],['Mme','Berthoux','Agent de restauration'],['Mme','Bozio','Agent d’accueil']].map((n,i)=>({id:uid(),no:`AGT-${String(i+1).padStart(3,'0')}`,firstName:n[0],lastName:n[1],role:n[2],weeklyHours:35,email:'',phone:'',assignment:'',status:'Actif',arrivalDate:'',workdays:[1,2,3,4,5],notes:''}));const monday=startOfWeek(todayISO());const maintenance=IMPORTED_INTERVENTIONS.map((x,i)=>({id:uid(),no:`MAI-2026-${String(i+1).padStart(4,'0')}`,date:todayISO(),title:x[0],family:x[1],priority:x[2],status:x[3],building:x[5]||'',floor:'',room:x[5]||'',requester:'Direction',assigned:'',dueDate:'',cost:'',description:x[4]||'',action:'',attachments:[],importBatch:'excel-2026-08'}));return {version:31,settings:{initialSeedCompleted:true,seedVersion:31,cleaningAlertDays:30,cleaningNotificationsEnabled:true,cleaningNotifyNever:true,cleaningNotifyOverdue:true,cleaningNotifyPlanned:true,meetingAlertDays:3,
autoDailyEnabled:true,autoWeeklyEnabled:false,autoReportHour:'07:00',autoReportTimezone:'Europe/Paris',autoReportWeekdays:'1,2,3,4,5',autoReportOnlyIfEvents:false,autoReportIncludeAgents:true,autoReportIncludeMaintenance:true,autoReportIncludeCleaning:true,autoReportIncludePeriodic:true,autoReportIncludeMeetings:true,autoReportSignature:'Rapport généré automatiquement par Pilotage Service Technique.',lastDailyEmailDate:'',lastWeeklyEmailKey:'',lastWeeklyArchiveKey:'',lastAnnualResetYear:0,appName:'Pilotage Service Technique',schoolName:'Lycée Jean Puy',schoolZone:'A',academicYear:academicYearFor(todayISO()),defaultLayout:'auto',printOrientation:'landscape',defaultInspector:'',emailsTo:'',emailsCc:'',emailsBcc:'',emailSubjectPrefix:'Pilotage Service Technique',outlookEmail:'',counters:{}},lists:clone(defaultLists),buildings,spaces:defaultSpaces(buildings),agents,weeklyPlans:clone(IMPORTED_WEEKLY_PLANS),rotations:[],rotationExceptions:[],agentDays:[],personalEvents:[],roomPreps:[],agentActivities:[],issues:[],periodic:makeContractControls14723(),cleaning:[],maintenance,requests:[],works:[],meetings:[],notes:[],vacations:[],documents:[],oneDriveLinks:[],contracts:[],contacts:[],attachments:[],archives:[],importArchives:[],cleaningRoomsConfig:null,cleaningRoomChecks:[],cleaningDeletedIds:[],notificationDismissals:{},importOriginalBindings:{}}}
function nextSeedNo(rows){return `MAI-2026-${String((rows?.length||0)+1).padStart(4,'0')}`}

function normalizedReportFileKey(name=''){
 return normalizeText(String(name||''))
   .replace(/\bcopy\b|\bcopie\b/g,' ')
   .replace(/\s+/g,' ').trim();
}
function mergeBundledControlReports(d){
 if(!Array.isArray(d.pdfImports))d.pdfImports=[];
 if(!Array.isArray(d.importArchives))d.importArchives=[];
 // 1) Supprimer seulement les doublons certains déjà présents : même empreinte SHA-256.
 const seenHash=new Set();
 d.pdfImports=d.pdfImports.filter(x=>{
   const h=String(x.fileHash||'').trim().toLowerCase();
   if(!h)return true;
   if(seenHash.has(h))return false;
   seenHash.add(h);return true;
 });
 // 2) Ajouter / enrichir les rapports fournis. Deux documents partageant un même n° de rapport
 // mais un objet différent (ex. RVRE et vérification périodique électrique) restent distincts.
 for(const b of BUNDLED_CONTROL_REPORTS){
   const existing=d.pdfImports.find(x=>
      String(x.bundledKey||'')===b.key ||
      (x.fileHash&&String(x.fileHash).toLowerCase()===String(b.sha256).toLowerCase()) ||
      normalizedReportFileKey(x.fileName)===normalizedReportFileKey(b.file)
   );
   const base={kind:'control',importType:'report',bundled:true,bundledKey:b.key,bundledPath:b.path,
      fileName:b.file,fileSize:b.size,fileHash:b.sha256,subject:b.org,controlFamily:b.family,
      reportDate:b.date,reportReference:b.ref,reportSubtype:b.subtype,academicYear:academicYearFor(b.date),
      summary:b.summary,observationCount:b.observations,readOnlyBundled:true};
   let rec=existing;
   if(rec){Object.assign(rec,base,{id:rec.id||`bundled-${b.key}`,createdAt:rec.createdAt||`${b.date}T12:00:00.000Z`});}
   else{rec={id:`bundled-${b.key}`,createdAt:`${b.date}T12:00:00.000Z`,...base};d.pdfImports.push(rec);}
   const ar=d.importArchives.find(x=>String(x.sourceId||'')===String(rec.id)||String(x.bundledKey||'')===b.key);
   const archiveData={sourceId:rec.id,bundled:true,bundledKey:b.key,bundledPath:b.path,type:'Rapport de contrôle',
      createdAt:rec.createdAt,fileHash:b.sha256,fileName:b.file,subject:b.org,academicYear:rec.academicYear,
      summary:b.summary,module:'periodic',analysisSnapshot:{type:'Rapport de contrôle',fileName:b.file,subject:b.org,
      organization:b.org,controlFamily:b.family,reportDate:b.date,reportReference:b.ref,reportSubtype:b.subtype,
      observationCount:b.observations,summary:b.summary,bundled:true}};
   if(ar)Object.assign(ar,archiveData);
   else d.importArchives.push({id:`archive-bundled-${b.key}`,...archiveData});
 }
 // 3) Dédupliquer les archives correspondantes par empreinte, sans toucher aux autres archives métier.
 const ah=new Set();
 d.importArchives=d.importArchives.filter(x=>{
   const h=String(x.fileHash||'').trim().toLowerCase();
   if(!h)return true;
   const k=`${x.type||''}|${h}`;
   if(ah.has(k))return false;ah.add(k);return true;
 });
}

function migrate(raw){
 const base=defaultData();
 if(!raw||typeof raw!=='object'){mergeContractControls14723(base);migratePeriodicExcel2026V147161(base);migratePeriodicExcelHistoryV147162(base);migratePeriodicExcelFullV147163(base);migratePeriodicFixesV147164(base);ensureCanonicalFacilitySpaces(base);mergeBundledControlReports(base);return base;}
 const d={...base,...raw,settings:{...base.settings,...(raw.settings||{}),counters:{...base.settings.counters,...(raw.settings?.counters||{})}},lists:{...base.lists,...(raw.lists||{})}};
 for(const k of ['buildings','spaces','agents','weeklyPlans','rotations','rotationExceptions','agentDays','personalEvents','roomPreps','agentActivities','issues','periodic','contracts','cleaning','maintenance','requests','works','meetings','notes','vacations','documents','contacts','attachments','archives','importArchives','pdfImports','chronotimeDaily','chronotimeAnnual','reportNonconformities','oneDriveLinks']){
   if(!Array.isArray(d[k]))d[k]=base[k];
 }
 mergeContractControls14723(d);
 migratePeriodicExcel2026V147161(d);
 migratePeriodicExcelHistoryV147162(d);
 migratePeriodicExcelFullV147163(d);
 migratePeriodicFixesV147164(d);
 ensureCanonicalFacilitySpaces(d);
 d.agentDays=normalizeAgentDaysStable(d.agentDays);
 d.maintenance=normalizeMaintenanceStable(d.maintenance);
 ensureDeletedRecordsStore(d);
 for(const c of STABLE_FORM_COLLECTIONS){
   d[c]=applyDeletedRecordsToCollection(c,normalizeStableCollection(d[c]),d);
 }
 for(const x of d.agentActivities||[]){
   if(!Array.isArray(x.agentIds)||!x.agentIds.length)x.agentIds=x.agentId?[String(x.agentId)]:[];
   x.agentIds=[...new Set(x.agentIds.map(String).filter(Boolean))];
   if(!x.agentId&&x.agentIds.length)x.agentId=x.agentIds[0];
   if(!['hours','full-day','half-day'].includes(String(x.durationMode||'')))x.durationMode='hours';
 }
 if(!Array.isArray(d.cleaningRoomChecks))d.cleaningRoomChecks=[];
 if(!Array.isArray(d.cleaningDeletedIds))d.cleaningDeletedIds=[];
 mergeBundledControlReports(d);
 if(!d.notificationDismissals||typeof d.notificationDismissals!=='object'||Array.isArray(d.notificationDismissals))d.notificationDismissals={};
 if(!d.importOriginalBindings||typeof d.importOriginalBindings!=='object'||Array.isArray(d.importOriginalBindings))d.importOriginalBindings={};
 if(d.cleaningRoomsConfig!==null&&!Array.isArray(d.cleaningRoomsConfig))d.cleaningRoomsConfig=null;
 // V147.32 — correction des anciens roulements automatiques fictifs.
 // Un vrai roulement saisi par l'utilisateur n'est jamais supprimé.
 if(Number(raw.version||0)<=31 && Array.isArray(d.rotations)){
   d.rotations=d.rotations.filter(r=>{
     const fake=/^RLT-\d{3}$/.test(String(r.no||'')) &&
       Number(r.morningWeeks)===2 && Number(r.eveningWeeks)===2 &&
       r.morningStart==='06:00' && r.morningEnd==='13:30' &&
       r.eveningStart==='13:00' && r.eveningEnd==='20:30' &&
       Number(r.pause)===30 && !String(r.notes||'').trim();
     return !fake;
   });
 }
 for(const p of d.weeklyPlans||[]){
   const agent=d.agents.find(x=>String(x.id)===String(p.agentId));
   const supplied=IMPORTED_WEEKLY_PLANS.some(sp=>normalizeText(sp.agent||'')===normalizeText(p.agent||agentName(agent)||'')&&Array.isArray(p.rows)&&p.rows.length);
   if(supplied&&(!p.shift||p.shift==='Matin'))p.shift='Standard';
 }
 // Jours travaillés : par défaut lundi à vendredi. Les anciens agents sont migrés automatiquement.
 for(const a of d.agents){
   if(!Array.isArray(a.workdays)||!a.workdays.length)a.workdays=[1,2,3,4,5];
   else a.workdays=[...new Set(a.workdays.map(Number).filter(n=>n>=0&&n<=6))];
 }
 ensureMamessierThellyShiftProfiles(d);
 // Conversion uniquement pour les très anciennes sauvegardes. Aucun agent, planning ou intervention supprimé n'est recréé automatiquement.
 if(!d.agentDays.length){
   (raw.shifts||[]).forEach(s=>d.agentDays.push({id:s.id||uid(),agentId:s.agentId,date:s.date,dayType:'Présence',plannedStart:s.plannedStart,plannedEnd:s.plannedEnd,actualStart:s.actualStart,actualEnd:s.actualEnd,pause:s.pause,overtime:s.overtime||0,note:s.notes||''}));
   for(const a of raw.absences||[]){let day=a.dateFrom;while(day&&day<=a.dateTo){if(![0,6].includes(parseDate(day).getDay()))d.agentDays.push({id:uid(),agentId:a.agentId,date:day,dayType:a.type||'Autre absence',plannedStart:'',plannedEnd:'',actualStart:'',actualEnd:'',pause:0,overtime:0,note:a.notes||'',status:a.status||'Validée'});day=addDays(day,1)}}
 }
 d.version=32;
 return d;
}

// V147.148 — profils horaires fournis par l'utilisateur (photo du 24/08/2026).
// Matin et Soir pour Mamessier et Thelly, année scolaire 2026-2027.
// Idempotent : même agent + même profil + même date d'effet = mise à jour, jamais doublon.
function ensureMamessierThellyShiftProfiles(target=db){
  if(!target||!Array.isArray(target.agents))return 0;
  target.weeklyPlans=Array.isArray(target.weeklyPlans)?target.weeklyPlans:[];
  const from='2026-09-01',to='2027-08-31',marker='photo-horaires-2026-08-24';
  const targets=target.agents.filter(a=>{
    const n=normalizeText(agentName(a)||`${a.firstName||''} ${a.lastName||''}`);
    return n.includes('mamessier')||n.includes('thelly');
  });
  if(!targets.length)return 0;

  const profiles={
    Matin:{
      1:{start:'07:00',end:'16:00',pause:10,missions:'Horaire Matin',segments:[{start:'07:00',end:'12:00',task:'Présence'},{start:'12:10',end:'16:00',task:'Présence'}]},
      2:{start:'07:00',end:'16:00',pause:10,missions:'Horaire Matin',segments:[{start:'07:00',end:'12:00',task:'Présence'},{start:'12:10',end:'16:00',task:'Présence'}]},
      3:{start:'07:00',end:'16:00',pause:10,missions:'Horaire Matin',segments:[{start:'07:00',end:'12:00',task:'Présence'},{start:'12:10',end:'16:00',task:'Présence'}]},
      4:{start:'07:00',end:'16:00',pause:10,missions:'Horaire Matin',segments:[{start:'07:00',end:'12:00',task:'Présence'},{start:'12:10',end:'16:00',task:'Présence'}]},
      5:{start:'07:00',end:'13:00',pause:0,missions:'Horaire Matin',segments:[{start:'07:00',end:'13:00',task:'Présence'}]},
      6:{start:'',end:'',pause:0,missions:'',segments:[]},0:{start:'',end:'',pause:0,missions:'',segments:[]}
    },
    Soir:{
      1:{start:'08:30',end:'18:00',pause:10,missions:'Horaire Soir',segments:[{start:'08:30',end:'12:00',task:'Présence'},{start:'12:10',end:'18:00',task:'Présence'}]},
      2:{start:'08:30',end:'18:00',pause:10,missions:'Horaire Soir',segments:[{start:'08:30',end:'12:00',task:'Présence'},{start:'12:10',end:'18:00',task:'Présence'}]},
      3:{start:'07:00',end:'16:00',pause:10,missions:'Horaire Soir',segments:[{start:'07:00',end:'12:00',task:'Présence'},{start:'12:10',end:'16:00',task:'Présence'}]},
      4:{start:'08:30',end:'18:00',pause:10,missions:'Horaire Soir',segments:[{start:'08:30',end:'12:00',task:'Présence'},{start:'12:10',end:'18:00',task:'Présence'}]},
      5:{start:'13:00',end:'18:00',pause:0,missions:'Horaire Soir',segments:[{start:'13:00',end:'18:00',task:'Présence'}]},
      6:{start:'',end:'',pause:0,missions:'',segments:[]},0:{start:'',end:'',pause:0,missions:'',segments:[]}
    }
  };

  let changed=0;
  for(const agent of targets){
    for(const shift of ['Matin','Soir']){
      let p=target.weeklyPlans.find(x=>
        String(x.agentId)===String(agent.id)&&x.shift===shift&&x.effectiveFrom===from
      );
      const next={
        agentId:agent.id,agent:agentName(agent),shift,effectiveFrom:from,effectiveTo:to,
        dayProfiles:deepClone(profiles[shift]),rows:[],source:marker,userProvided:true
      };
      if(!p){
        target.weeklyPlans.push({id:uid(),...next,createdAt:new Date().toISOString()});
        changed++;
      }else{
        const before=JSON.stringify([p.agent,p.shift,p.effectiveFrom,p.effectiveTo,p.dayProfiles,p.source]);
        Object.assign(p,next,{id:p.id||uid(),updatedAt:new Date().toISOString()});
        const after=JSON.stringify([p.agent,p.shift,p.effectiveFrom,p.effectiveTo,p.dayProfiles,p.source]);
        if(before!==after)changed++;
      }
    }
  }
  return changed;
}

function restoreSuppliedData(showMessage=true){
 const base=defaultData();
 // Agents fournis : ajout uniquement s'ils n'existent pas déjà.
 for(const sa of base.agents){
   const key=agentName(sa).toLowerCase().replace(/\s+/g,' ').trim();
   if(!db.agents.some(a=>agentName(a).toLowerCase().replace(/\s+/g,' ').trim()===key)) db.agents.push(sa);
 }
 ensureMamessierThellyShiftProfiles(db);
 // Horaires hebdomadaires fournis : restaure chaque fiche absente sans écraser les modifications existantes.
 for(const sp of clone(IMPORTED_WEEKLY_PLANS)){
   const key=String(sp.agent||'').toLowerCase().replace(/\s+/g,' ').trim();
   const i=db.weeklyPlans.findIndex(p=>String(p.agent||agentName(agentById(p.agentId))||'').toLowerCase().replace(/\s+/g,' ').trim()===key);
   if(i<0) db.weeklyPlans.push(sp);
   else if(!Array.isArray(db.weeklyPlans[i].rows)||!db.weeklyPlans[i].rows.length) db.weeklyPlans[i]=sp;
 }
 // Interventions/consignes fournies : ajout de tout élément manquant, sans supprimer les saisies personnelles.
 for(const x of IMPORTED_INTERVENTIONS){
   const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
   if(!db.maintenance.some(m=>norm(m.title)===norm(x[0]))){
     db.maintenance.push({id:uid(),no:nextSeedNo(db.maintenance),date:todayISO(),title:x[0],family:x[1],priority:x[2],status:x[3],building:x[5]||'',floor:'',room:x[5]||'',requester:'Direction',assigned:'',dueDate:'',cost:'',description:x[4]||'',action:'',attachments:[],importBatch:'excel-2026-08'});
   }
 }
 // Contrôles périodiques et bâtiments de référence si absents.
 if(!Array.isArray(db.periodic)||!db.periodic.length) db.periodic=makePeriodic();
 if(!Array.isArray(db.archives))db.archives=[];
 db.settings.cleaningAlertDays=Number(db.settings.cleaningAlertDays||30);db.settings.cleaningNotificationsEnabled=db.settings.cleaningNotificationsEnabled!==false;db.settings.cleaningNotifyNever=db.settings.cleaningNotifyNever!==false;db.settings.cleaningNotifyOverdue=db.settings.cleaningNotifyOverdue!==false;db.settings.cleaningNotifyPlanned=db.settings.cleaningNotifyPlanned!==false;db.settings.meetingAlertDays=Number(db.settings.meetingAlertDays||3);db.changeHistory=db.changeHistory||[];db.settings.lastWeeklyArchiveKey=db.settings.lastWeeklyArchiveKey||'';db.settings.lastAnnualResetYear=Number(db.settings.lastAnnualResetYear||0);
 if(!Array.isArray(db.buildings)||!db.buildings.length) db.buildings=clone(initialBuildings);
 if(!Array.isArray(db.spaces)||!db.spaces.length) db.spaces=defaultSpaces(db.buildings);
 db.version=30;
 db.settings.initialSeedCompleted=true;db.settings.seedVersion=31;
 try{window.dispatchEvent(new Event('pst:data-saved'))}catch(_){ }
 if(showMessage){renderAll();toast('Toutes les données fournies ont été restaurées')}
}
let db=defaultData(); let teamWeek=startOfWeek(todayISO()),personalWeek=startOfWeek(todayISO()),modalHandler=null,modalDeleteHandler=null,currentView='dashboard',modalAuditInitial=null,modalAuditTitle='',modalAuditContext=null;
let supabaseClient=null,currentUser=null,cloudReady=false,cloudSaveTimer=null,cloudRetryTimer=null,cloudBusy=false,cloudPollTimer=null,lastCloudUpdatedAt='',localDirty=false,lastCloudData=null,lastCloudError='';
const OFFLINE_CACHE_KEY='pst_offline_pending_v130';
const OFFLINE_MIRROR_KEY='pst_offline_mirror_v130';
let saveStateChangedAt=0;

let lastConfirmedSupabaseAt=0;
let lastLocalMutationAt=0;
let dashboardSyncBusy=false;
let dashboardSyncBusySince=0;
let cloudBusySince=0;


function healStaleSyncBusyFlags(){
  const now=Date.now();
  const pending=typeof pstPendingMutationCount==='function'?pstPendingMutationCount():0;

  // Un voyant "en cours" ne doit jamais rester figé si aucune mutation n'est en attente.
  if(dashboardSyncBusy && dashboardSyncBusySince && now-dashboardSyncBusySince>15000 && pending===0){
    console.warn('Réinitialisation dashboardSyncBusy figé');
    dashboardSyncBusy=false;dashboardSyncBusySince=0;
  }
  if(cloudBusy && cloudBusySince && now-cloudBusySince>20000 && pending===0){
    console.warn('Réinitialisation cloudBusy figé');
    cloudBusy=false;cloudBusySince=0;
  }
}
function pendingSyncDiagnostics(){
 healStaleSyncBusyFlags();
 let pending=null;
 try{pending=readOfflinePending()}catch(_){}
 const pendingSavedAt=pending?.savedAt?Date.parse(pending.savedAt)||0:0;
 const confirmedAt=Number(lastConfirmedSupabaseAt||0);
 const queueCount=typeof pstPendingMutationCount==='function'?pstPendingMutationCount():0;

 // V147.148 — la file centrale de mutations est la référence absolue.
 // Si elle est vide, un ancien localDirty/offlinePending ne doit plus afficher
 // une modification fantôme "non confirmée".
 if(queueCount===0){
   if(localDirty){
     console.warn('Nettoyage localDirty fantôme : file centrale vide');
     localDirty=false;
   }
   if(pending){
     try{clearOfflinePending()}catch(_){}
     pending=null;
   }
 }

 return {
   dirty:queueCount>0,
   pending:queueCount>0,
   queueCount,
   pendingSavedAt,
   confirmedAt,
   cloudBusy:!!cloudBusy,
   dashboardBusy:!!dashboardSyncBusy
 };
}
function hasLocalSyncPending(){
 const d=pendingSyncDiagnostics();
 return Number(d.queueCount||0)>0;
}
function setDashboardSyncIndicator(state,title,detail=''){
 const panel=$('#dashboardSyncPanel'),led=$('#dashboardSyncLed'),t=$('#dashboardSyncTitle'),d=$('#dashboardSyncDetail');
 if(panel)panel.dataset.state=state;
 if(led)led.className=`sync-led ${state}`;
 if(t)t.textContent=title;
 if(d)d.textContent=detail;
}
function refreshDashboardSyncIndicator(){
 const diag=pendingSyncDiagnostics();
 if(!navigator.onLine){
   setDashboardSyncIndicator('red','Hors connexion','Les données restent enregistrées sur cet appareil. Elles seront synchronisées au retour du réseau.');
   return;
 }
 if((diag.dashboardBusy||diag.cloudBusy) && (diag.dirty||diag.pending||pstPendingMutationCount()>0)){
   setDashboardSyncIndicator('orange','Synchronisation en cours','Envoi et vérification des données avec Supabase…');
   return;
 }
 if(Number(diag.queueCount||0)>0){
   setDashboardSyncIndicator('orange','Données à synchroniser',`${diag.queueCount} modification(s) locale(s) en attente de confirmation Supabase.`);
   return;
 }
 if(lastConfirmedSupabaseAt){
   setDashboardSyncIndicator('green','Tout est synchronisé',`Supabase confirmé à ${new Date(lastConfirmedSupabaseAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}.`);
   return;
 }
 setDashboardSyncIndicator('red','Supabase non confirmé','Aucune synchronisation Supabase confirmée depuis l’ouverture de l’application.');
}
async function confirmSupabaseReachable(){
 if(!navigator.onLine||!supabaseClient||!currentUser)return false;
 try{
   // fetchRemote peut renvoyer null si aucune ligne n'existe encore.
   // Ce n'est pas une panne Supabase : l'absence de ligne est une réponse serveur valide.
   await fetchRemote();
   lastCloudError='';
   lastConfirmedSupabaseAt=Date.now();
   return true;
 }catch(error){
   lastCloudError=error?.message||String(error)||'Erreur Supabase inconnue';
   console.warn('Vérification Supabase tableau de bord',error);
   return false;
 }
}
async function dashboardSyncNow(){
 if(dashboardSyncBusy)return;
 dashboardSyncBusy=true;
 dashboardSyncBusySince=Date.now();
 refreshDashboardSyncIndicator();
 const btn=$('#dashboardSyncNow');
 const oldText=btn?.textContent||'↻ Synchroniser maintenant';
 if(btn){btn.disabled=true;btn.textContent='Synchronisation…'}
 try{
   if(!currentUser){
     setDashboardSyncIndicator('red','Non connecté','Connectez-vous à l’application pour synchroniser avec Supabase.');
     return;
   }
   if(!navigator.onLine){
     try{writeOfflinePending('appareil hors connexion')}catch(_){}
     setDashboardSyncIndicator('red','Hors connexion','Les données sont conservées sur cet appareil.');
     return;
   }

   // La file centrale est l'unique source de vérité pour les données à envoyer.
   if(hasLocalSyncPending()){
     const result=await window.PSTMainState.persistNow();
     if(!result?.ok||result?.offline||result?.pending){
       setDashboardSyncIndicator('orange','Synchronisation en attente',result?.error||'Les données restent conservées localement.');
       return;
     }
   }

   const reachable=await confirmSupabaseReachable();
   if(!reachable){
     setDashboardSyncIndicator('red','Supabase inaccessible',lastCloudError?`Erreur : ${lastCloudError}`:'Le réseau est présent mais Supabase ne répond pas correctement.');
     return;
   }

   if(hasLocalSyncPending()){
     setDashboardSyncIndicator('orange','Synchronisation incomplète','Il reste encore des données locales à envoyer.');
     return;
   }

   setDashboardSyncIndicator('green','Tout est synchronisé',`Supabase confirmé à ${new Date(lastConfirmedSupabaseAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}.`);
   setSaveState(`Synchronisé à ${new Date(lastConfirmedSupabaseAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`,'cloud');
   toast('✅ Données synchronisées avec Supabase');
 }catch(error){
   console.error('Synchronisation manuelle tableau de bord',error);
   setDashboardSyncIndicator(hasLocalSyncPending()?'orange':'red',hasLocalSyncPending()?'Synchronisation en attente':'Erreur Supabase',error?.message||String(error));
 }finally{
   dashboardSyncBusy=false;dashboardSyncBusySince=0;
   if(btn){btn.disabled=false;btn.textContent=oldText}
   const diag=pendingSyncDiagnostics();
   if(navigator.onLine&&lastConfirmedSupabaseAt&&!diag.dirty&&!diag.pending&&!cloudBusy){
     setDashboardSyncIndicator('green','Tout est synchronisé',`Supabase confirmé à ${new Date(lastConfirmedSupabaseAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}.`);
   }else{
     refreshDashboardSyncIndicator();
   }
 }
}
function setSaveState(text,state=''){
 const el=$('#saveState');if(!el)return;
 el.textContent=text;el.dataset.state=state;saveStateChangedAt=Date.now();
;setTimeout(refreshDashboardSyncIndicator,0)}
function syncStatusText(){
 const pending=readOfflinePending();
 if(localDirty||pending)return {text:'Synchronisation en attente','state':'local'};
 return {text:`Synchronisé à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`,'state':'cloud'};
}
function ensureSaveStateNotStuck(){
 const el=$('#saveState');if(!el)return;
 if(el.dataset.state!=='loading')return;
 if(Date.now()-saveStateChangedAt<18000)return;
 const st=syncStatusText();
 setSaveState(st.text,st.state);
}
function classifyCloudError(message=''){
 const m=String(message||'').toLowerCase();
 if(!navigator.onLine)return 'internet';
 if(m.includes('délai')||m.includes('timeout'))return 'timeout';
 if(m.includes('row-level')||m.includes('rls')||m.includes('permission')||m.includes('not allowed')||m.includes('policy')||m.includes('42501'))return 'permission';
 if(m.includes('jwt')||m.includes('token')||m.includes('auth')||m.includes('session')||m.includes('401')||m.includes('403'))return 'auth';
 if(m.includes('network')||m.includes('fetch')||m.includes('failed to fetch'))return 'network';
 if(m.includes('occupé')||m.includes('busy'))return 'busy';
 return 'supabase';
}
function cloudFailureText(message=''){
 const kind=classifyCloudError(message);
 const msg=String(message||'Erreur inconnue');
 if(kind==='internet')return 'Pas de connexion Internet.';
 if(kind==='timeout')return `Supabase ne répond pas assez vite : ${msg}`;
 if(kind==='permission')return `Supabase refuse l’écriture (droits/RLS) : ${msg}`;
 if(kind==='auth')return `Session Supabase non valide ou expirée : ${msg}`;
 if(kind==='network')return `Internet fonctionne mais la requête Supabase a échoué : ${msg}`;
 if(kind==='busy')return `Supabase est occupé par une autre synchronisation : ${msg}`;
 return `Supabase n’a pas confirmé l’écriture : ${msg}`;
}
function withTimeout(promise,ms=9000){return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Délai de connexion dépassé')),ms))])}
function hasUsefulData(x){return !!(x&&((x.agents&&x.agents.length)||(x.maintenance&&x.maintenance.length)||(x.weeklyPlans&&x.weeklyPlans.length)||(x.notes&&x.notes.length)))}
function deepClone(x){try{return structuredClone(x)}catch(_){return JSON.parse(JSON.stringify(x))}}
function eq(a,b){try{return JSON.stringify(a)===JSON.stringify(b)}catch(_){return a===b}}
function isObj(x){return !!x&&typeof x==='object'&&!Array.isArray(x)}
function mergeThreeWay(base,local,remote){
 if(eq(local,base))return deepClone(remote);
 if(eq(remote,base))return deepClone(local);
 if(eq(local,remote))return deepClone(local);
 if(Array.isArray(local)&&Array.isArray(remote)){
   const b=Array.isArray(base)?base:[];
   const objectIds=[...local,...remote,...b].filter(x=>isObj(x)).every(x=>x.id!=null);
   if(objectIds){
     const bm=new Map(b.map(x=>[String(x.id),x])),lm=new Map(local.map(x=>[String(x.id),x])),rm=new Map(remote.map(x=>[String(x.id),x]));
     const order=[];for(const arr of [b,remote,local])for(const x of arr){const id=String(x.id);if(!order.includes(id))order.push(id)}
     const out=[];
     for(const id of order){const B=bm.get(id),L=lm.get(id),R=rm.get(id);
       if(B!==undefined){
         if(L===undefined&&R===undefined)continue;
         if(L===undefined){if(eq(R,B))continue;continue} // suppression locale prioritaire en conflit
         if(R===undefined){if(eq(L,B))continue;out.push(deepClone(L));continue}
         out.push(mergeThreeWay(B,L,R));
       }else{
         if(L!==undefined&&R!==undefined)out.push(mergeThreeWay(undefined,L,R));
         else if(L!==undefined)out.push(deepClone(L));
         else if(R!==undefined)out.push(deepClone(R));
       }
     }
     return out;
   }
   return deepClone(local); // tableaux simples : la modification locale est prioritaire
 }
 if(isObj(local)&&isObj(remote)){
   const B=isObj(base)?base:{};const out={};
   const keys=new Set([...Object.keys(B),...Object.keys(local),...Object.keys(remote)]);
   for(const k of keys){
     const hasB=Object.prototype.hasOwnProperty.call(B,k),hasL=Object.prototype.hasOwnProperty.call(local,k),hasR=Object.prototype.hasOwnProperty.call(remote,k);
     if(hasB){
       if(!hasL&&!hasR)continue;
       if(!hasL){if(eq(remote[k],B[k]))continue;continue}
       if(!hasR){if(eq(local[k],B[k]))continue;out[k]=deepClone(local[k]);continue}
       out[k]=mergeThreeWay(B[k],local[k],remote[k]);
     }else{
       if(hasL&&hasR)out[k]=mergeThreeWay(undefined,local[k],remote[k]);
       else if(hasL)out[k]=deepClone(local[k]);
       else if(hasR)out[k]=deepClone(remote[k]);
     }
   }
   return out;
 }
 return deepClone(local);
}
function readJson(key){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null}catch(error){console.warn('Lecture locale impossible',error);return null}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(error){console.error('Écriture locale impossible',error);return false}}
function readOfflinePending(){return readJson(OFFLINE_CACHE_KEY)}
function writeMirror(){if(!currentUser)return false;return writeJson(OFFLINE_MIRROR_KEY,{userId:currentUser.id,savedAt:new Date().toISOString(),data:db})}
function loadMirrorIntoMemory(){const m=readJson(OFFLINE_MIRROR_KEY);if(!m?.data)return false;if(currentUser?.id&&m.userId&&m.userId!==currentUser.id)return false;db=migrate(m.data);safeRenderAll();try{window.dispatchEvent(new Event('pst:data-loaded'))}catch(_){}return true}
function writeOfflinePending(reason='hors ligne'){
 try{
   lastLocalMutationAt=Date.now();
   let previous=readOfflinePending();
   const baseData=previous?.baseData||lastCloudData||db;
   const item={userId:currentUser?.id||'',savedAt:new Date().toISOString(),baseCloudUpdatedAt:previous?.baseCloudUpdatedAt||lastCloudUpdatedAt||'',baseData:deepClone(baseData),reason,data:deepClone(db)};
   localStorage.setItem(OFFLINE_CACHE_KEY,JSON.stringify(item));writeMirror();localDirty=true;setSaveState('Hors ligne — modifications gardées sur cet appareil','local');return true
 }catch(error){console.error('Sauvegarde hors ligne impossible',error);setSaveState('Hors ligne — stockage local impossible','error');return false}
}
function clearOfflinePending(){try{localStorage.removeItem(OFFLINE_CACHE_KEY)}catch(_){}}
function loadOfflinePendingIntoMemory(){const pending=readOfflinePending();if(!pending?.data)return false;if(currentUser?.id&&pending.userId&&pending.userId!==currentUser.id)return false;db=migrate(pending.data);lastCloudData=pending.baseData?migrate(pending.baseData):lastCloudData;localDirty=true;safeRenderAll();try{window.dispatchEvent(new Event('pst:data-loaded'))}catch(_){}setSaveState('Hors ligne — modifications en attente de synchronisation','local');return true}
function scheduleCloudRetry(delay=12000){clearTimeout(cloudRetryTimer);cloudRetryTimer=setTimeout(()=>{if(navigator.onLine&&currentUser){if(localDirty||readOfflinePending())syncOfflinePending();else pollCloudChanges()}},delay)}
function useLocalMode(reason='Connexion momentanément indisponible'){cloudReady=false;console.warn(reason);if(!loadOfflinePendingIntoMemory()&&!loadMirrorIntoMemory())setSaveState('Hors ligne — les nouvelles modifications seront gardées sur cet appareil','local');else setSaveState('Hors ligne — données locales disponibles','local');scheduleCloudRetry()}
async function fetchRemote(){
 const result=await withTimeout(supabaseClient.from('app_state').select('data,updated_at').eq('user_id',currentUser.id).maybeSingle());
 const {data,error}=result||{};if(error)throw error;return data||null;
}
async function syncOfflinePending(){
 if(!supabaseClient||!currentUser||!navigator.onLine)return false;
 const pending=readOfflinePending();
 if(pending?.userId&&pending.userId!==currentUser.id)return false;
 if(pending?.data){const currentAgentDays=deepClone(db.agentDays||[]),currentMaintenance=deepClone(db.maintenance||[]),currentStable=stableCollectionSnapshots(),currentDeleted=deepClone(ensureDeletedRecordsStore(db));db=migrate(pending.data);db.deletedRecords=mergeDeletedRecordsSafe(db.deletedRecords,currentDeleted);db.agentDays=mergeAgentDaysSafe(db.agentDays,currentAgentDays);db.maintenance=mergeMaintenanceSafe(db.maintenance,currentMaintenance);mergeStableCollectionsInto(db,currentStable,currentDeleted);lastCloudData=pending.baseData?migrate(pending.baseData):lastCloudData;localDirty=true}
 if(!localDirty)return true;
 setSaveState('Connexion revenue — fusion et synchronisation…','loading');
 const ok=await cloudSaveNow({silent:true,mergeRemote:true});
 if(ok){clearOfflinePending();setSaveState(`Synchronisé à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`,'cloud')}
 return ok;
}
async function cloudLoad({silent=false}={}){
 if(!supabaseClient||!currentUser||cloudBusy)return false;
 cloudBusy=true;if(!silent)setSaveState('Connexion au serveur…','loading');
 try{
   const data=await fetchRemote();
   if(data?.data&&hasUsefulData(data.data)){
     db=migrate(data.data);lastCloudData=deepClone(db);lastCloudUpdatedAt=data.updated_at||lastCloudUpdatedAt;
     if(Number(db.settings?.seedVersion||0)<26){restoreSuppliedData(false);db.settings.initialSeedCompleted=true;db.settings.seedVersion=31;localDirty=true}
   }else{
     db=defaultData();runAutomaticHousekeeping();restoreSuppliedData(false);db.settings.initialSeedCompleted=true;db.settings.seedVersion=31;lastCloudData=null;localDirty=true;
   }
   cloudBusy=false;
   if(localDirty){const ok=await cloudSaveNow({silent:true,mergeRemote:true});if(!ok)return false}
   cloudReady=true;lastConfirmedSupabaseAt=Date.now();lastCloudError='';writeMirror();renderAll();try{window.dispatchEvent(new Event('pst:data-loaded'))}catch(_){ }
   setSaveState(`Synchronisé à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`,'cloud');
setTimeout(()=>{
  const diag=pendingSyncDiagnostics();
  if(!diag.dirty&&!diag.pending&&!diag.cloudBusy&&!diag.dashboardBusy){
    refreshDashboardSyncIndicator();
  }
},700);clearTimeout(cloudRetryTimer);return true;
 }catch(error){console.error('Supabase indisponible :',error);useLocalMode(error?.message||String(error));try{window.dispatchEvent(new CustomEvent('pst:cloud-error',{detail:{message:error?.message||String(error)}}))}catch(_){ }return false}
 finally{cloudBusy=false}
}
async function cloudSaveNow({silent=false,mergeRemote=true}={}){
 if(!supabaseClient||!currentUser)return false;
 if(cloudBusy){
   clearTimeout(cloudSaveTimer);
   cloudSaveTimer=setTimeout(()=>{if(localDirty&&currentUser){if(navigator.onLine)cloudSaveNow({silent:true,mergeRemote:true});else writeOfflinePending('appareil hors connexion')}},700);
   if($('#saveState')?.dataset?.state==='loading' && !localDirty){
     const st=syncStatusText();setSaveState(st.text,st.state);
   }
   return false;
 }
 cloudBusy=true;cloudBusySince=Date.now();
 try{
   if(!silent)setSaveState('Envoi au serveur…','loading');
   let toSave=deepClone(db),remoteRow=null;
   if(mergeRemote){
     remoteRow=await fetchRemote();
     if(remoteRow?.data){
       const remote=migrate(remoteRow.data),base=lastCloudData||remote;
       toSave=migrate(mergeThreeWay(base,toSave,remote));
       toSave.changeHistory=mergeChangeHistorySafe(remote.changeHistory,db.changeHistory);
       toSave.agentDays=mergeAgentDaysSafe(remote.agentDays,db.agentDays);
       toSave.maintenance=mergeMaintenanceSafe(remote.maintenance,db.maintenance);
       mergeStableCollectionsInto(toSave,stableCollectionSnapshots(),deepClone(ensureDeletedRecordsStore(db)));
     }else{
       toSave.changeHistory=mergeChangeHistorySafe(toSave.changeHistory,db.changeHistory);
       toSave.agentDays=mergeAgentDaysSafe(toSave.agentDays,db.agentDays);
       toSave.maintenance=mergeMaintenanceSafe(toSave.maintenance,db.maintenance);
       mergeStableCollectionsInto(toSave,stableCollectionSnapshots(),deepClone(ensureDeletedRecordsStore(db)));
     }
   }
   const stamp=new Date().toISOString();
   const payload={user_id:currentUser.id,data:toSave,updated_at:stamp};
   const {error}=await withTimeout(supabaseClient.from('app_state').upsert(payload,{onConflict:'user_id'}));if(error)throw error;
   // Une suppression peut avoir eu lieu pendant que cette sauvegarde réseau était en cours.
   // On fusionne donc les tombstones ACTUELS juste avant de remplacer db.
   toSave.deletedRecords=mergeDeletedRecordsSafe(toSave.deletedRecords,deepClone(ensureDeletedRecordsStore(db)));
   for(const c of STABLE_FORM_COLLECTIONS)toSave[c]=applyDeletedRecordsToCollection(c,toSave[c],toSave);
   toSave.maintenance=applyDeletedRecordsToCollection('maintenance',toSave.maintenance,toSave);
   db=pstMergeRemoteWithoutOverwritingLocal(toSave,db);
   enforceAllDeletedRecords('fin cloudSaveNow');
   lastCloudData=deepClone(db);lastCloudUpdatedAt=stamp;localDirty=false;cloudReady=true;lastCloudError='';clearOfflinePending();lastConfirmedSupabaseAt=Date.now();writeMirror();
   setSaveState(`Synchronisé à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`,'cloud');
setTimeout(()=>{
  const diag=pendingSyncDiagnostics();
  if(!diag.dirty&&!diag.pending&&!diag.cloudBusy&&!diag.dashboardBusy){
    refreshDashboardSyncIndicator();
  }
},700);clearTimeout(cloudRetryTimer);safeRenderAll();try{window.dispatchEvent(new Event('pst:data-loaded'))}catch(_){}return true;
  }catch(error){
    lastCloudError=error?.message||String(error)||'Erreur Supabase inconnue';
    console.error('Sauvegarde cloud différée :',error);
    writeOfflinePending(lastCloudError);
    const detail=cloudFailureText(lastCloudError);
    setSaveState(detail,'error');
    if(!silent)toast(detail);
    scheduleCloudRetry();
    return false
  }
 finally{cloudBusy=false}
}
function save(render=true){
 clearTheoreticalScheduleCache();
 localDirty=true;
 if(!currentUser){setSaveState('Non connecté — non enregistré','error');if(render)safeRenderAll();return false}
 if(!navigator.onLine){writeOfflinePending('appareil hors connexion');if(render)safeRenderAll();return true}
 if(render)setSaveState('Envoi au serveur…','loading');
 clearTimeout(cloudSaveTimer);
 cloudSaveTimer=setTimeout(()=>{if(localDirty&&currentUser){if(navigator.onLine)cloudSaveNow({silent:!render,mergeRemote:true});else writeOfflinePending('appareil hors connexion')}},350);
 if(render)safeRenderAll();return true;
}

function mergeChangeHistorySafe(remoteHistory,localHistory){
 const out=[],seen=new Set();
 for(const arr of [Array.isArray(remoteHistory)?remoteHistory:[],Array.isArray(localHistory)?localHistory:[]]){
   for(const h of arr){
     if(!h||!h.id)continue;
     const id=String(h.id);
     if(seen.has(id)){
       const i=out.findIndex(x=>String(x.id)===id);
       if(i>=0)out[i]=Object.assign({},out[i],deepClone(h));
       continue;
     }
     seen.add(id);out.push(deepClone(h));
   }
 }
 return out.sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
}
function preserveLocalHistoryInRemote(remote,localSnapshot){
 const r=remote&&typeof remote==='object'?remote:{};
 r.changeHistory=mergeChangeHistorySafe(r.changeHistory,localSnapshot||[]);
 return r;
}

function agentDayKey(r){return `${String(r?.agentId||'')}|${String(r?.date||'')}`}
function agentDayTime(r){
 const t=Date.parse(r?.updatedAt||r?.createdAt||r?.chronotimeImportedAt||'');
 return Number.isFinite(t)?t:0;
}
function isManualAgentDay(r){return String(r?.source||'').toLowerCase()==='manual'}
function mergeAgentDaysSafe(remoteDays,localDays){
 const remote=Array.isArray(remoteDays)?remoteDays:[];
 const local=Array.isArray(localDays)?localDays:[];
 const byKey=new Map();
 const add=(r,origin)=>{
   if(!r?.agentId||!r?.date)return;
   const k=agentDayKey(r),cur=byKey.get(k);
   if(!cur){byKey.set(k,{row:deepClone(r),origin});return}
   const a=cur.row,b=r,am=isManualAgentDay(a),bm=isManualAgentDay(b);
   if(am!==bm){if(bm)byKey.set(k,{row:deepClone(b),origin});return}
   const at=agentDayTime(a),bt=agentDayTime(b);
   if(bt>at){byKey.set(k,{row:deepClone(b),origin});return}
   if(bt<at)return;
   if(origin==='local')byKey.set(k,{row:deepClone(b),origin});
 };
 for(const r of remote)add(r,'remote');
 for(const r of local)add(r,'local');
 return [...byKey.values()].map(x=>x.row);
}
function preserveLocalManualAgentDays(remote,localSnapshot){
 const r=remote&&typeof remote==='object'?remote:{};
 r.agentDays=mergeAgentDaysSafe(r.agentDays,localSnapshot||[]);
 return r;
}

function normalizeAgentDaysStable(list){
 return mergeAgentDaysSafe([],Array.isArray(list)?list:[]);
}
function enforceAgentDaysStable(reason=''){
 try{
   const before=Array.isArray(db.agentDays)?db.agentDays.length:0;
   db.agentDays=normalizeAgentDaysStable(db.agentDays);
   const after=db.agentDays.length;
   if(before!==after)console.info(`AgentDays stabilisés (${reason}) : ${before} → ${after}`);
   return true;
 }catch(error){
   console.error('Stabilisation agentDays',reason,error);
   return false;
 }
}

function maintenanceTime(r){
 const t=Date.parse(r?.updatedAt||r?.createdAt||'');
 return Number.isFinite(t)?t:0;
}
function mergeMaintenanceSafe(remoteRows,localRows){
 const remote=Array.isArray(remoteRows)?remoteRows:[];
 const local=Array.isArray(localRows)?localRows:[];
 const byId=new Map();

 const add=(r,origin)=>{
   if(!r?.id)return;
   const id=String(r.id),cur=byId.get(id);
   if(!cur){byId.set(id,{row:deepClone(r),origin});return}

   const a=cur.row,b=r;
   const at=maintenanceTime(a),bt=maintenanceTime(b);

   if(bt>at){byId.set(id,{row:deepClone(b),origin});return}
   if(bt<at)return;

   // En cas d'égalité ou d'absence d'horodatage, la copie locale est prioritaire.
   if(origin==='local')byId.set(id,{row:deepClone(b),origin});
 };

 for(const r of remote)add(r,'remote');
 for(const r of local)add(r,'local');

 return [...byId.values()].map(x=>x.row);
}
function normalizeMaintenanceStable(list){
 return mergeMaintenanceSafe([],Array.isArray(list)?list:[]);
}
function enforceMaintenanceStable(reason=''){
 try{
   const before=Array.isArray(db.maintenance)?db.maintenance.length:0;
   db.maintenance=normalizeMaintenanceStable(db.maintenance);
   const after=db.maintenance.length;
   if(before!==after)console.info(`Interventions stabilisées (${reason}) : ${before} → ${after}`);
   return true;
 }catch(error){
   console.error('Stabilisation interventions',reason,error);
   return false;
 }
}


function ensureDeletedRecordsStore(target=db){
 if(!target.deletedRecords||typeof target.deletedRecords!=='object'||Array.isArray(target.deletedRecords))target.deletedRecords={};
 return target.deletedRecords;
}
function deletedIdsFor(collection,target=db){
 const store=ensureDeletedRecordsStore(target);
 const arr=Array.isArray(store[collection])?store[collection]:[];
 return new Set(arr.map(x=>String(typeof x==='object'?x.id:x)));
}
function markRecordDeleted(collection,id){
 if(!collection||id===null||id===undefined)return;
 const store=ensureDeletedRecordsStore(db);
 const arr=Array.isArray(store[collection])?store[collection]:[];
 const sid=String(id),now=new Date().toISOString();
 const existing=arr.find(x=>String(typeof x==='object'?x.id:x)===sid);
 if(existing&&typeof existing==='object')existing.deletedAt=now;
 else arr.push({id:sid,deletedAt:now});
 store[collection]=arr;
}
function mergeDeletedRecordsSafe(remoteDeleted,localDeleted){
 const out={};
 const cols=new Set([...Object.keys(remoteDeleted||{}),...Object.keys(localDeleted||{})]);
 for(const c of cols){
   const map=new Map();
   for(const src of [remoteDeleted?.[c]||[],localDeleted?.[c]||[]]){
     for(const item of src){
       const obj=typeof item==='object'&&item?item:{id:item,deletedAt:''};
       if(obj.id===null||obj.id===undefined)continue;
       const id=String(obj.id),cur=map.get(id);
       const ct=Date.parse(cur?.deletedAt||'')||0,nt=Date.parse(obj.deletedAt||'')||0;
       if(!cur||nt>=ct)map.set(id,{id,deletedAt:obj.deletedAt||cur?.deletedAt||''});
     }
   }
   out[c]=[...map.values()];
 }
 return out;
}
function applyDeletedRecordsToCollection(collection,rows,target=db){
 const deleted=deletedIdsFor(collection,target);
 return (Array.isArray(rows)?rows:[]).filter(r=>!deleted.has(String(r?.id)));
}
function enforceAllDeletedRecords(reason=''){
 try{
   ensureDeletedRecordsStore(db);
   for(const c of STABLE_FORM_COLLECTIONS){
     db[c]=applyDeletedRecordsToCollection(c,db[c],db);
   }
   // maintenance utilise sa propre fusion mais peut aussi être supprimée via deleteRecord.
   db.maintenance=applyDeletedRecordsToCollection('maintenance',db.maintenance,db);
   if(reason)console.info('Suppressions réappliquées :',reason);
 }catch(error){console.error('Réapplication suppressions',reason,error)}
}
async function waitForCloudIdle(maxMs=18000){
 const start=Date.now();
 while(cloudBusy && Date.now()-start<maxMs){
   await new Promise(resolve=>setTimeout(resolve,150));
 }
 return !cloudBusy;
}

const STABLE_FORM_COLLECTIONS=['requests','works','meetings','notes','issues','periodic','contracts','cleaning','vacations','personalEvents','agentActivities','documents','agents','rotations','weeklyPlans','spaces'];

function stableRecordTime(r){
 const t=Date.parse(r?.updatedAt||r?.createdAt||r?.modifiedAt||'');
 return Number.isFinite(t)?t:0;
}
function mergeRecordsByIdSafe(remoteRows,localRows){
 const remote=Array.isArray(remoteRows)?remoteRows:[];
 const local=Array.isArray(localRows)?localRows:[];
 const byId=new Map();
 const add=(r,origin)=>{
   if(!r?.id)return;
   const id=String(r.id),cur=byId.get(id);
   if(!cur){byId.set(id,{row:deepClone(r),origin});return}
   const a=cur.row,b=r,at=stableRecordTime(a),bt=stableRecordTime(b);
   if(bt>at){byId.set(id,{row:deepClone(b),origin});return}
   if(bt<at)return;
   if(origin==='local')byId.set(id,{row:deepClone(b),origin});
 };
 for(const r of remote)add(r,'remote');
 for(const r of local)add(r,'local');
 return [...byId.values()].map(x=>x.row);
}
function normalizeStableCollection(list){return mergeRecordsByIdSafe([],Array.isArray(list)?list:[])}
function enforceStableCollection(collection,reason=''){
 try{
   if(!STABLE_FORM_COLLECTIONS.includes(collection))return true;
   const before=Array.isArray(db[collection])?db[collection].length:0;
   db[collection]=normalizeStableCollection(db[collection]);
   const after=db[collection].length;
   if(before!==after)console.info(`${collection} stabilisé (${reason}) : ${before} → ${after}`);
   return true;
 }catch(error){
   console.error(`Stabilisation ${collection}`,reason,error);
   return false;
 }
}
function stableCollectionSnapshots(){
 const out={};
 for(const c of STABLE_FORM_COLLECTIONS)out[c]=deepClone(db[c]||[]);
 return out;
}
function mergeStableCollectionsInto(target,snapshots,deletedSnapshot=null){
 if(!target||typeof target!=='object')return target;
 if(deletedSnapshot)target.deletedRecords=mergeDeletedRecordsSafe(target.deletedRecords,deletedSnapshot);
 ensureDeletedRecordsStore(target);
 for(const c of STABLE_FORM_COLLECTIONS){
   const remoteRows=applyDeletedRecordsToCollection(c,target[c],target);
   const localRows=applyDeletedRecordsToCollection(c,snapshots?.[c]||[],target);
   target[c]=applyDeletedRecordsToCollection(c,mergeRecordsByIdSafe(remoteRows,localRows),target);
 }
 return target;
}
window.PSTMainState={
 get:()=>db,
 save:(render=true)=>save(render),
 // Sauvegarde immédiate utilisée par les formulaires sensibles (ex. salle/café).
 // En ligne : attend la confirmation Supabase. Hors ligne : met explicitement en attente locale.
 persistNow:async()=>{
   localDirty=true;
   if(!currentUser){setSaveState('Non connecté — non enregistré','error');return {ok:false,offline:false,error:'Non connecté'}}
   if(!navigator.onLine){const ok=writeOfflinePending('appareil hors connexion');return {ok:!!ok,offline:true,pending:true}}

   // Le Wi‑Fi est présent : une sauvegarde déjà en cours n'est PAS un état hors ligne.
   setSaveState(cloudBusy?'Synchronisation précédente en cours…':'Test et envoi réel vers Supabase…','loading');
   const idle=await waitForCloudIdle(18000);
   if(!idle){
     const ok=writeOfflinePending('serveur occupé — synchronisation à reprendre');
     setSaveState('Synchronisation en attente','local');
     return {ok:!!ok,offline:false,pending:true,error:'Synchronisation précédente encore en cours'};
   }

   const ok=await cloudSaveNow({silent:false,mergeRemote:true});
   if(ok){
     localDirty=false;
     clearOfflinePending();
     lastConfirmedSupabaseAt=Date.now();
     refreshDashboardSyncIndicator();
     return {ok:true,offline:false};
   }
   // Échec serveur ≠ absence de Wi‑Fi.
   const queued=!!readOfflinePending();
   return {ok:queued,offline:false,pending:queued,error:lastCloudError||'Synchronisation Supabase impossible'};
 },
  persistStateDirect:async({label='Données',verify}={})=>{
    if(!currentUser){
      return {ok:false,offline:false,error:'Utilisateur non connecté.'};
    }
    if(!supabaseClient||!navigator.onLine){
      localDirty=true;const ok=writeOfflinePending(!navigator.onLine?'appareil hors connexion':'client Supabase indisponible');safeRenderAll();
      return {ok:!!ok,offline:true,pending:true,error:ok?'':'Sauvegarde locale impossible.'};
    }
    const timeoutMs=15000;
    const withTimeout=(promise,step)=>Promise.race([
      promise,
      new Promise((_,reject)=>setTimeout(()=>reject(new Error(`${step} : délai dépassé après 15 s`)),timeoutMs))
    ]);
    try{
      localDirty=true;
      setSaveState(`${label} : écriture directe Supabase…`,'loading');
      const localHistorySnapshot=deepClone(db.changeHistory||[]);
      const localAgentDaysSnapshot=deepClone(db.agentDays||[]);
      const localMaintenanceSnapshot=deepClone(db.maintenance||[]);
      const localStableSnapshots=stableCollectionSnapshots();
      const localDeletedSnapshot=deepClone(ensureDeletedRecordsStore(db));
      const payload=migrate(deepClone(db));
      payload.agentDays=mergeAgentDaysSafe(payload.agentDays,localAgentDaysSnapshot);
      payload.maintenance=mergeMaintenanceSafe(payload.maintenance,localMaintenanceSnapshot);
      mergeStableCollectionsInto(payload,localStableSnapshots,localDeletedSnapshot);
      payload.changeHistory=mergeChangeHistorySafe(payload.changeHistory,localHistorySnapshot);
      const nowIso=new Date().toISOString();
      const write=await withTimeout(
        supabaseClient.from('app_state')
          .upsert({user_id:currentUser.id,data:payload,updated_at:nowIso},{onConflict:'user_id'})
          .select('updated_at').single(),
        'Écriture Supabase'
      );
      if(write?.error)throw write.error;

      setSaveState(`${label} : relecture de contrôle…`,'loading');
      const read=await withTimeout(
        supabaseClient.from('app_state').select('data,updated_at').eq('user_id',currentUser.id).single(),
        'Relecture Supabase'
      );
      if(read?.error)throw read.error;

      let remote=migrate(read?.data?.data||{});
      remote=preserveLocalHistoryInRemote(remote,localHistorySnapshot);
      remote=preserveLocalManualAgentDays(remote,localAgentDaysSnapshot);
      remote.agentDays=normalizeAgentDaysStable(remote.agentDays);
      remote.maintenance=mergeMaintenanceSafe(remote.maintenance,localMaintenanceSnapshot);
      remote.maintenance=normalizeMaintenanceStable(remote.maintenance);
      mergeStableCollectionsInto(remote,localStableSnapshots,localDeletedSnapshot);
      if(typeof verify==='function' && !verify(remote)){
        throw new Error(`${label} écrit mais non retrouvé lors de la relecture Supabase.`);
      }

      const remoteHistoryIds=new Set(((read?.data?.data?.changeHistory)||[]).map(h=>String(h?.id||'')));
      const historyWasMissing=localHistorySnapshot.some(h=>h?.id&&!remoteHistoryIds.has(String(h.id)));
      if(historyWasMissing){
        try{
          const repairStamp=new Date().toISOString();
          const repair=await withTimeout(
            supabaseClient.from('app_state')
              .upsert({user_id:currentUser.id,data:remote,updated_at:repairStamp},{onConflict:'user_id'})
              .select('updated_at').single(),
            'Réparation historique Supabase'
          );
          if(repair?.error)throw repair.error;
        }catch(historyRepairError){
          console.warn('Historique conservé localement, réparation Supabase différée',historyRepairError);
          localDirty=true;
          writeOfflinePending('historique à resynchroniser');
        }
      }
      remote.deletedRecords=mergeDeletedRecordsSafe(remote.deletedRecords,deepClone(ensureDeletedRecordsStore(db)));
      for(const c of STABLE_FORM_COLLECTIONS)remote[c]=applyDeletedRecordsToCollection(c,remote[c],remote);
      remote.maintenance=applyDeletedRecordsToCollection('maintenance',remote.maintenance,remote);
      db=pstMergeRemoteWithoutOverwritingLocal(remote,db);
      enforceAllDeletedRecords('fin persistStateDirect');
      lastCloudData=deepClone(db);
      lastCloudUpdatedAt=read?.data?.updated_at||write?.data?.updated_at||nowIso;
      lastCloudError='';
      localDirty=false;
      cloudReady=true;
      clearOfflinePending();
      lastConfirmedSupabaseAt=Date.now();
      writeMirror();
      safeRenderAll();
      try{window.dispatchEvent(new Event('pst:data-loaded'))}catch(_){}
      setSaveState(`Synchronisé à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`,'cloud');
setTimeout(()=>{
  const diag=pendingSyncDiagnostics();
  if(!diag.dirty&&!diag.pending&&!diag.cloudBusy&&!diag.dashboardBusy){
    refreshDashboardSyncIndicator();
  }
},700);
      return {ok:true,offline:false};
    }catch(error){
      lastCloudError=error?.message||String(error)||'Erreur Supabase inconnue';
      localDirty=true;
      writeOfflinePending(lastCloudError);
      safeRenderAll();
      setSaveState(`Erreur Supabase : ${lastCloudError}`,'error');
      console.error(`${label} — sauvegarde directe Supabase`,error);
      // La saisie reste conservée localement et sera resynchronisée automatiquement.
      return {ok:true,offline:true,pending:true,error:lastCloudError};
    }
  },
  persistChronotimeDirect:async(importId)=>{
    if(!supabaseClient||!currentUser)return {ok:false,offline:false,error:'Client Supabase ou utilisateur non disponible.'};
    const timeoutMs=15000;
    const withTimeout=(promise,label)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(`${label} : délai dépassé après 15 s`)),timeoutMs))]);
    try{
      localDirty=true;
      setSaveState('Chronotime : écriture directe Supabase…','loading');
      const payload=migrate(deepClone(db)), nowIso=new Date().toISOString();
      const write=await withTimeout(supabaseClient.from('app_state').upsert({user_id:currentUser.id,data:payload,updated_at:nowIso},{onConflict:'user_id'}).select('updated_at').single(),'Écriture Supabase');
      if(write?.error)throw write.error;
      setSaveState('Chronotime : relecture de contrôle…','loading');
      const read=await withTimeout(supabaseClient.from('app_state').select('data,updated_at').eq('user_id',currentUser.id).single(),'Relecture Supabase');
      if(read?.error)throw read.error;
      const remote=migrate(read?.data?.data||{}), id=String(importId||'');
      const found=(remote.pdfImports||[]).some(x=>String(x.id||'')===id)||(remote.chronotimeAnnual||[]).some(x=>String(x.id||'')===id||String(x.sourceId||'')===id);
      if(!found)throw new Error('Écriture réussie mais nouvel import absent lors de la relecture Supabase.');
      lastCloudData=deepClone(remote); lastCloudUpdatedAt=read?.data?.updated_at||nowIso; lastCloudError=''; localDirty=false; cloudReady=true;
      clearOfflinePending(); writeMirror();
      setSaveState(`Synchronisé à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`,'cloud');
setTimeout(()=>{
  const diag=pendingSyncDiagnostics();
  if(!diag.dirty&&!diag.pending&&!diag.cloudBusy&&!diag.dashboardBusy){
    refreshDashboardSyncIndicator();
  }
},700);
      return {ok:true,offline:false,found:true};
    }catch(error){
      lastCloudError=error?.message||String(error)||'Erreur Supabase inconnue'; localDirty=true; writeOfflinePending(lastCloudError);
      setSaveState(`Erreur Supabase : ${lastCloudError}`,'error');
      console.error('Chronotime direct Supabase',error);
      return {ok:false,offline:false,error:lastCloudError};
    }
  },
  verifyChronotimeImport:async(importId)=>{
    if(!supabaseClient||!currentUser)return {ok:false,found:false};
    try{
      const row=await fetchRemote();
      const remote=migrate(row?.data||{});
      const id=String(importId||'');
      const found=!!(
        (remote.pdfImports||[]).some(x=>String(x.id||'')===id) ||
        (remote.chronotimeAnnual||[]).some(x=>String(x.id||'')===id||String(x.sourceId||'')===id)
      );
      if(found){
        lastCloudData=deepClone(remote);
        lastCloudUpdatedAt=row?.updated_at||lastCloudUpdatedAt;
        localDirty=false;
        cloudReady=true;
        clearOfflinePending();
        writeMirror();
        setSaveState(`Synchronisé à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`,'cloud');
setTimeout(()=>{
  const diag=pendingSyncDiagnostics();
  if(!diag.dirty&&!diag.pending&&!diag.cloudBusy&&!diag.dashboardBusy){
    refreshDashboardSyncIndicator();
  }
},700);
        return {ok:true,found:true};
      }
      localDirty=true;
      return {ok:true,found:false};
    }catch(error){
      console.error('Vérification Chronotime Supabase',error);
      localDirty=true;
      return {ok:false,found:false,error:error?.message||String(error)};
    }
  }
};
async function pollCloudChanges(){
 if(!supabaseClient||!currentUser||!navigator.onLine||cloudBusy||localDirty)return;
 try{
   const data=await fetchRemote();
   lastConfirmedSupabaseAt=Date.now();lastCloudError='';
   if(!data?.data){refreshDashboardSyncIndicator();return}
   const remoteStamp=data.updated_at||'';
   if(remoteStamp&&remoteStamp!==lastCloudUpdatedAt){
     clearTheoreticalScheduleCache();
     const localHistorySnapshot=deepClone(db.changeHistory||[]);
     const localAgentDaysSnapshot=deepClone(db.agentDays||[]);
     const localMaintenanceSnapshot=deepClone(db.maintenance||[]);
     const localStableSnapshots=stableCollectionSnapshots();
     const localDeletedSnapshot=deepClone(ensureDeletedRecordsStore(db));
     db=migrate(data.data);
     db.deletedRecords=mergeDeletedRecordsSafe(db.deletedRecords,localDeletedSnapshot);
     db.changeHistory=mergeChangeHistorySafe(db.changeHistory,localHistorySnapshot);
     db.agentDays=mergeAgentDaysSafe(db.agentDays,localAgentDaysSnapshot);
     db.maintenance=mergeMaintenanceSafe(db.maintenance,localMaintenanceSnapshot);
     mergeStableCollectionsInto(db,localStableSnapshots,localDeletedSnapshot);
     enforceAgentDaysStable('poll Supabase');
     enforceMaintenanceStable('poll Supabase');
     for(const c of STABLE_FORM_COLLECTIONS)enforceStableCollection(c,'poll Supabase');
     enforceAllDeletedRecords('poll Supabase');
     lastCloudData=deepClone(db);lastCloudUpdatedAt=remoteStamp;writeMirror();safeRenderAll();
     try{window.dispatchEvent(new Event('pst:data-loaded'))}catch(_){ }
     setSaveState(`Synchronisé à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`,'cloud')
   }
 }catch(error){console.warn('Vérification cloud différée',error);scheduleCloudRetry()}
}
function startCloudPolling(){clearInterval(cloudPollTimer);cloudPollTimer=setInterval(pollCloudChanges,8000)}
setInterval(()=>{
 refreshDashboardSyncIndicator();
 if(navigator.onLine&&currentUser&&!hasLocalSyncPending()&&!cloudBusy&&!dashboardSyncBusy&&(!lastConfirmedSupabaseAt||Date.now()-lastConfirmedSupabaseAt>30000)){
   confirmSupabaseReachable().then(()=>refreshDashboardSyncIndicator());
 }
},4000);
setInterval(ensureSaveStateNotStuck,3000);
function safeRenderAll(){
 clearTheoreticalScheduleCache();
 capturePlanningScroll();

 // V147.36 : ne plus recalculer les 20+ écrans cachés à chaque sauvegarde.
 // L'écran actif est rendu immédiatement ; les autres seront recalculés à leur ouverture.
 const common=[
   ['Sélecteurs',hydrateSelects],
   ['Marque',renderBrand],
   ['Notifications',renderNotifications]
 ];
 const byView={
   dashboard:['Tableau de bord',renderDashboard],
   personal:['Agenda',renderPersonal],
   agents:['Agents',renderAgents],
   rotations:['Roulements',renderRotations],
   planning:['Horaires',renderPlanning],
   absences:['Absences',renderAbsences],
   vacations:['Vacances',renderVacations],
   issues:['Sécurité',renderIssues],
   periodic:['Contrôles périodiques',renderPeriodic],
   contracts:['Suivi des contrats',()=>window.PSTContracts?.render?.()],
   cleaning:['Ménage',renderCleaning],
   maintenance:['Maintenance',renderMaintenance],
   'agent-activity':['Activité agents',renderAgentActivities],
   requests:['Demandes',renderRequests],
   works:['Chantiers',renderWorks],
   meetings:['Réunions',renderMeetings],
   notes:['Notes',renderNotes],
   documents:['Documents',renderDocuments],
   archives:['Archives',renderArchives],
   settings:['Paramètres',renderSettings],
   reports:['Rapports',renderReportPreview],
   connections:['Connexions',()=>{updateLiveConnectionLocalStates();renderLiveConnections();refreshDashboardSyncIndicator()}],
   help:['FAQ / Aide',()=>{renderHelp();setTimeout(bindHelpCenter,0)}]
 };
 const errors=[];
 const active=document.querySelector('.view.active')?.id||((typeof currentView!=='undefined'&&currentView)?currentView:'dashboard');
 if(typeof currentView!=='undefined')currentView=active;
 const jobs=[...common];
 if(byView[active])jobs.push(byView[active]);
 for(const [name,fn] of jobs){
   try{fn()}catch(error){console.error(`Erreur d’affichage — ${name}`,error);errors.push(name)}
 }
 if(errors.length)setSaveState(`Enregistré — affichage partiel (${errors.join(', ')})`,'local');
 try{enhanceTableFilters(document.querySelector('.view.active')||document)}catch(error){console.warn('Filtres colonnes',error)}
 restorePlanningScroll();
 return errors;
}

// ===== V147.148 — moteur central de synchronisation =====
const PST_SYNC_QUEUE_KEY='pst-sync-queue-v147136';
const PST_DEVICE_ID_KEY='pst-device-id-v147136';

function pstDeviceId(){
  try{
    let id=localStorage.getItem(PST_DEVICE_ID_KEY);
    if(!id){id=`dev-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;localStorage.setItem(PST_DEVICE_ID_KEY,id)}
    return id;
  }catch(_){return 'dev-local'}
}
function pstLoadSyncQueue(){
  try{const q=JSON.parse(localStorage.getItem(PST_SYNC_QUEUE_KEY)||'[]');return Array.isArray(q)?q:[]}catch(_){return []}
}
function pstSaveSyncQueue(q){
  try{localStorage.setItem(PST_SYNC_QUEUE_KEY,JSON.stringify(Array.isArray(q)?q:[]));return true}catch(_){return false}
}
function pstRecordVersion(record){return Number(record?._pstVersion||0)||0}
function pstMutationStamp(){
  const now=Date.now();
  lastLocalMutationAt=Math.max(Number(lastLocalMutationAt||0),now);
  return lastLocalMutationAt;
}
function pstNormalizeMutationRecord(record,{source='manual'}={}){
  if(!record||typeof record!=='object')return record;
  record._pstVersion=Math.max(pstRecordVersion(record)+1,Date.now());
  record._pstUpdatedAt=new Date().toISOString();
  record._pstDeviceId=pstDeviceId();
  record._pstSource=source;
  return record;
}
function pstQueueMutation(collection,record,{deleted=false,label='Modification'}={}){
  const q=pstLoadSyncQueue();
  const recordId=String(record?.id||record?.recordId||'');
  const item={
    mutationId:`mut-${Date.now()}-${Math.random().toString(36).slice(2,9)}`,
    collection,recordId,deleted:Boolean(deleted),
    version:Number(record?._pstVersion||Date.now()),
    payload:deleted?null:deepClone(record),
    createdAt:new Date().toISOString(),deviceId:pstDeviceId(),label,attempts:0
  };
  const filtered=q.filter(x=>!(x.collection===collection&&String(x.recordId)===recordId));
  filtered.push(item);pstSaveSyncQueue(filtered);localDirty=true;return item;
}
function pstPendingMutationCount(){return pstLoadSyncQueue().length}
function pstHasPendingMutation(collection,recordId){
  return pstLoadSyncQueue().some(x=>x.collection===collection&&String(x.recordId)===String(recordId))
}
function pstApplyQueuedMutationsToPayload(payload){
  const out=migrate(deepClone(payload||db));
  for(const m of pstLoadSyncQueue()){
    if(!m.collection)continue;
    out[m.collection]=Array.isArray(out[m.collection])?out[m.collection]:[];
    if(m.deleted){
      out[m.collection]=out[m.collection].filter(r=>String(r.id)!==String(m.recordId));
      continue;
    }
    const incoming=deepClone(m.payload);
    const i=out[m.collection].findIndex(r=>String(r.id)===String(m.recordId));
    if(i<0)out[m.collection].push(incoming);
    else if(pstRecordVersion(incoming)>=pstRecordVersion(out[m.collection][i]))out[m.collection][i]=incoming;
  }
  return out;
}
function pstMergeRemoteWithoutOverwritingLocal(remote,local=db){
  const out=migrate(deepClone(remote||{})),loc=migrate(deepClone(local||{}));
  const collections=['agentDays','personalEvents','agents','rotations','weeklyPlans','vacations','issues','periodic','cleaning','maintenance','requests','works','meetings','notes','documents','oneDriveLinks','contracts','spaces','roomPreps'];
  for(const c of collections){
    const map=new Map((Array.isArray(out[c])?out[c]:[]).map(r=>[String(r.id),r]));
    for(const lr of (Array.isArray(loc[c])?loc[c]:[])){
      const k=String(lr.id),rr=map.get(k);
      if(!rr||pstRecordVersion(lr)>=pstRecordVersion(rr)||pstHasPendingMutation(c,k))map.set(k,deepClone(lr));
    }
    out[c]=[...map.values()];
  }
  for(const m of pstLoadSyncQueue()){
    if(m.deleted&&Array.isArray(out[m.collection]))out[m.collection]=out[m.collection].filter(r=>String(r.id)!==String(m.recordId));
  }
  return out;
}
async function pstSyncQueueNow({silent=false}={}){
  if(!currentUser||!supabaseClient||!navigator.onLine)return {ok:false,offline:true,pending:pstPendingMutationCount()};
  const q=pstLoadSyncQueue();if(!q.length)return {ok:true,pending:0};
  if(cloudBusy)return {ok:false,busy:true,pending:q.length};
  cloudBusy=true;cloudBusySince=Date.now();
  try{
    if(!silent)setSaveState(`Synchronisation de ${q.length} modification(s)…`,'loading');
    const remoteRow=await fetchRemote();
    let payload=pstMergeRemoteWithoutOverwritingLocal(remoteRow?.data||{},db);
    payload=pstApplyQueuedMutationsToPayload(payload);
    payload.changeHistory=mergeChangeHistorySafe(remoteRow?.data?.changeHistory,db.changeHistory);
    payload.deletedRecords=mergeDeletedRecordsSafe(remoteRow?.data?.deletedRecords,deepClone(ensureDeletedRecordsStore(db)));
    for(const c of STABLE_FORM_COLLECTIONS)payload[c]=applyDeletedRecordsToCollection(c,payload[c],payload);
    payload.maintenance=applyDeletedRecordsToCollection('maintenance',payload.maintenance,payload);

    const stamp=new Date().toISOString();
    const write=await withTimeout(supabaseClient.from('app_state').upsert({user_id:currentUser.id,data:payload,updated_at:stamp},{onConflict:'user_id'}),18000);
    if(write?.error)throw write.error;

    const check=await withTimeout(supabaseClient.from('app_state').select('data,updated_at').eq('user_id',currentUser.id).single(),18000);
    if(check?.error)throw check.error;
    const confirmed=migrate(check?.data?.data||{});
    const still=[];
    for(const m of q){
      const rows=Array.isArray(confirmed[m.collection])?confirmed[m.collection]:[];
      if(m.deleted){
        if(rows.some(r=>String(r.id)===String(m.recordId)))still.push(m);
      }else{
        const got=rows.find(r=>String(r.id)===String(m.recordId));
        if(!got||pstRecordVersion(got)<Number(m.version||0))still.push(m);
      }
    }
    pstSaveSyncQueue(still);
    lastCloudData=deepClone(confirmed);lastCloudUpdatedAt=check?.data?.updated_at||stamp;
    lastConfirmedSupabaseAt=Date.now();cloudReady=true;lastCloudError='';
    pstSetLiveConnection('write','green','Écriture Supabase confirmée');

    localDirty=still.length>0;
    if(localDirty)try{writeOfflinePending(`${still.length} mutation(s) en attente`)}catch(_){}
    else clearOfflinePending();
    refreshDashboardSyncIndicator();
    setSaveState(localDirty?`${still.length} modification(s) encore en attente`:`Synchronisé à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`,localDirty?'local':'cloud');
    return {ok:!localDirty,pending:still.length};
  }catch(error){
    lastCloudError=error?.message||String(error);localDirty=true;
    pstSetLiveConnection('write','red',lastCloudError||'Écriture Supabase non confirmée');

    try{writeOfflinePending(lastCloudError)}catch(_){}
    setSaveState(`Synchronisation en attente — ${pstPendingMutationCount()} modification(s)`,'local');
    console.error('pstSyncQueueNow',error);
    return {ok:false,error:lastCloudError,pending:pstPendingMutationCount()};
  }finally{cloudBusy=false;cloudBusySince=0;refreshDashboardSyncIndicator()}
}
window.PSTSyncEngine={queue:pstQueueMutation,sync:pstSyncQueueNow,pending:pstPendingMutationCount,mergeRemote:pstMergeRemoteWithoutOverwritingLocal};

window.addEventListener('online',()=>setTimeout(()=>pstSyncQueueNow({silent:true}),600));
setInterval(()=>{if(navigator.onLine&&currentUser&&pstPendingMutationCount()>0&&!cloudBusy)pstSyncQueueNow({silent:true})},12000);
let authInitPromise=null;
async function initAuth(){
 if(authInitPromise)return authInitPromise;
 authInitPromise=(async()=>{
   const loginBtn=$('#authLogin'),errorEl=$('#authError'),emailEl=$('#authEmail'),passwordEl=$('#authPassword');
   if(!loginBtn||!emailEl||!passwordEl)return;
   const setBusy=busy=>{loginBtn.disabled=busy;loginBtn.textContent=busy?'Connexion…':'Se connecter'};
   const loadScript=url=>new Promise((resolve,reject)=>{
     const existing=[...document.scripts].find(s=>s.src===url);
     if(existing){if(window.supabase)return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}
     const script=document.createElement('script');script.src=url;script.async=true;script.onload=resolve;script.onerror=()=>reject(new Error(`Chargement impossible : ${url}`));document.head.appendChild(script);
   });
   const ensureClient=async()=>{
     const cfg=window.SUPABASE_CONFIG||{};
     if(!cfg.url||!cfg.publishableKey)throw new Error('Configuration Supabase absente.');
     if(!window.supabase){
       const fallbacks=[
         'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js',
         'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js'
       ];
       let loaded=false;
       for(const url of fallbacks){try{await loadScript(url);if(window.supabase){loaded=true;break}}catch(error){console.warn(error)}}
       if(!loaded)throw new Error('Le composant de connexion ne s’est pas chargé. Vérifiez Internet puis rechargez la page.');
     }
     if(!supabaseClient)supabaseClient=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
     return supabaseClient;
   };
   const doLogin=async()=>{
     if(loginBtn.disabled)return;
     const email=emailEl.value.trim(),password=passwordEl.value;
     if(!email){errorEl.textContent='Saisissez votre adresse e-mail.';emailEl.focus();return}
     if(!password){errorEl.textContent='Saisissez votre mot de passe.';passwordEl.focus();return}
     setBusy(true);errorEl.textContent='';
     try{
       const client=await ensureClient();
       const {data,error}=await client.auth.signInWithPassword({email,password});
       if(error)throw error;
       if(!data?.user)throw new Error('Connexion non confirmée.');
       await enterApp(data.user);
     }catch(error){
       console.error('Erreur de connexion',error);
       errorEl.textContent=error?.message==='Invalid login credentials'?'Adresse ou mot de passe incorrect.':(error?.message||'Connexion impossible.');
     }finally{setBusy(false)}
   };
   // Affectation directe et indépendante des autres modules.
   loginBtn.onclick=doLogin;
   passwordEl.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();doLogin()}};
   try{
     const client=await ensureClient();
     const {data:{session}}=await client.auth.getSession();
     if(session?.user)await enterApp(session.user);
   }catch(error){
     console.error('Initialisation Supabase',error);
     errorEl.textContent=error?.message||'Configuration Supabase indisponible.';
   }
   $('#logoutBtn')?.addEventListener('click',async()=>{try{await supabaseClient?.auth.signOut()}finally{location.reload()}});
 })();
 return authInitPromise;
}
async function enterApp(user){
 currentUser=user;$('#authScreen').classList.add('hidden');$('#logoutBtn')?.classList.remove('hidden');
 const pending=readOfflinePending();
 if(!navigator.onLine){
   if(!loadOfflinePendingIntoMemory()&&!loadMirrorIntoMemory())setSaveState('Hors ligne — aucune donnée locale disponible','local');
 }else if(pending?.data){
   loadOfflinePendingIntoMemory();await syncOfflinePending();
 }else{setSaveState('Connexion au serveur…','loading');await cloudLoad()}
 startCloudPolling();
}
async function manualSupabasePing(){
 const b=$('#supabasePingBtn');if(b){b.disabled=true;b.textContent='↻ Requête…'}
 try{
   if(!currentUser)throw new Error('Connectez-vous d’abord.');
   if(!navigator.onLine)throw new Error('Pas de connexion Internet.');
   setSaveState('Requête Supabase…','loading');
   const row=await fetchRemote();
   if(!row)throw new Error('Aucune réponse Supabase.');
   setSaveState(`Supabase actif — ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`,'cloud');
   toast('Requête Supabase OK');
   return true;
 }catch(e){console.error('Requête Supabase',e);setSaveState(`Supabase : ${e?.message||e}`,'error');toast(`Supabase : ${e?.message||e}`);return false}
 finally{if(b){b.disabled=false;b.textContent='↻ Requête Supabase'}}
}

let autoReconnectSyncTimer=null;
async function autoSyncWhenNetworkReturns(reason='retour réseau'){
 clearTimeout(autoReconnectSyncTimer);
 autoReconnectSyncTimer=setTimeout(async()=>{
   if(!currentUser)return;
   if(!navigator.onLine){refreshDashboardSyncIndicator();return}

   try{
     dashboardSyncBusy=true;
     refreshDashboardSyncIndicator();

     if(hasLocalSyncPending()){
       const ok=await syncOfflinePending();
       if(!ok && hasLocalSyncPending()){
         const forced=await window.PSTMainState.persistNow();
         if(!forced?.ok){
           setDashboardSyncIndicator('orange','Synchronisation en attente','Le réseau est revenu mais Supabase n’a pas encore confirmé les données.');
           return;
         }
       }
     }

     if(!hasLocalSyncPending()){
       await pollCloudChanges();
       const reachable=await confirmSupabaseReachable();
       if(reachable&&!hasLocalSyncPending()){
         setDashboardSyncIndicator('green','Tout est synchronisé',`Supabase confirmé à ${new Date(lastConfirmedSupabaseAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}.`);
         setSaveState(`Synchronisé à ${new Date(lastConfirmedSupabaseAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`,'cloud');
       }
     }
   }catch(error){
     console.warn(`Synchronisation automatique (${reason})`,error);
   }finally{
     dashboardSyncBusy=false;
     refreshDashboardSyncIndicator();
   }
 },250);
}
window.addEventListener('online',()=>{
 refreshDashboardSyncIndicator();
 autoSyncWhenNetworkReturns('événement online');
 startCloudPolling()
});
try{
 const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
 if(connection?.addEventListener){
   connection.addEventListener('change',()=>{
     refreshDashboardSyncIndicator();
     if(navigator.onLine)autoSyncWhenNetworkReturns(`changement réseau ${connection.type||connection.effectiveType||''}`.trim());
   });
 }
}catch(_){}

window.addEventListener('offline',()=>{
 if(currentUser){writeMirror();if(localDirty)writeOfflinePending('appareil hors connexion');setSaveState('Hors ligne — données disponibles sur cet appareil','local')}
 refreshDashboardSyncIndicator();
});
document.addEventListener('visibilitychange',()=>{
 if(!document.hidden&&currentUser){
   if(navigator.onLine)autoSyncWhenNetworkReturns('retour application au premier plan');
   else{try{writeMirror()}catch(_){}refreshDashboardSyncIndicator()}
 }
});
function nextNo(type,prefix){db.settings.counters[type]=(db.settings.counters[type]||0)+1;return `${prefix}-${new Date().getFullYear()}-${String(db.settings.counters[type]).padStart(4,'0')}`}
function toast(msg){const e=$('#toast');e.textContent=msg;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),2200)}
function byId(type,id){return db[type]?.find(x=>x.id===id)} function agentById(id){
 if(id===null||id===undefined||id==='')return null;
 return (db.agents||[]).find(a=>String(a.id)===String(id))||null;
} function agentName(a){return a?`${a.firstName||''} ${a.lastName||''}`.trim():'Équipe'}
function agentWorkdays(agentId){const a=agentById(agentId);return Array.isArray(a?.workdays)&&a.workdays.length?a.workdays.map(Number):[1,2,3,4,5]}
function agentOptions(v='',team=false){return `${team?'<option value="">Toute l’équipe</option>':'<option value="">Choisir un agent</option>'}${selectOptions(db.agents.filter(a=>a.status!=='Inactif'||a.id===v),v,agentName,a=>a.id)}`}

function centralLocationRef(){return window.PSTCleaningRooms?.get?.()||[]}
function centralRoomLabel(x){return [x?.number||'',x?.name||''].filter(Boolean).join(' — ')||x?.type||'Local'}
function centralFind(building,floor,sector,room){const d=centralLocationRef();let bi=d.findIndex(x=>x.name===building);if(bi<0)bi=0;const b=d[bi];let fi=(b?.floors||[]).findIndex(x=>x.name===floor);if(fi<0)fi=0;const f=b?.floors?.[fi];let si=(f?.sectors||[]).findIndex(x=>x.name===sector);if(si<0)si=0;const s=f?.sectors?.[si];let ri=(s?.rooms||[]).findIndex(x=>centralRoomLabel(x)===room);if(ri<0)ri=0;return{d,b,f,s,r:s?.rooms?.[ri]}}
function centralLocationFields(x={},prefix='loc'){const d=centralLocationRef();if(!d.length)return `<label>Bâtiment<select name="building">${buildingOptions(x.building||'')}</select></label>${field('Salle / lieu','room',x.room||'')}`;const q=centralFind(x.building,x.floor,x.sector,x.room),op=(v,t,sel)=>`<option value="${esc(v)}" ${v===sel?'selected':''}>${esc(t)}</option>`;return `<label>Bâtiment<select name="building" id="${prefix}Building">${d.map(b=>op(b.name,b.name,q.b?.name)).join('')}</select></label><label>Étage<select name="floor" id="${prefix}Floor">${(q.b?.floors||[]).map(f=>op(f.name,f.name,q.f?.name)).join('')}</select></label><label>Secteur<select name="sector" id="${prefix}Sector">${(q.f?.sectors||[]).map(s=>op(s.name,s.name,q.s?.name)).join('')}</select></label><label>Salle / local<select name="room" id="${prefix}Room">${(q.s?.rooms||[]).map(rr=>op(centralRoomLabel(rr),centralRoomLabel(rr),x.room||centralRoomLabel(q.r))).join('')}<option value="Autre lieu">Autre lieu…</option></select></label><label id="${prefix}OtherWrap" class="hidden">Autre lieu<input name="otherLocation" value="${esc(x.otherLocation||'')}"></label>`}
function bindCentralLocation(prefix='loc'){const B=document.getElementById(prefix+'Building'),F=document.getElementById(prefix+'Floor'),S=document.getElementById(prefix+'Sector'),R=document.getElementById(prefix+'Room'),W=document.getElementById(prefix+'OtherWrap');if(!B||!F||!S||!R)return;const op=(v,t)=>`<option value="${esc(v)}">${esc(t)}</option>`,d=()=>centralLocationRef();const rooms=()=>{const b=d().find(x=>x.name===B.value),f=b?.floors?.find(x=>x.name===F.value),s=f?.sectors?.find(x=>x.name===S.value);R.innerHTML=(s?.rooms||[]).map(x=>op(centralRoomLabel(x),centralRoomLabel(x))).join('')+'<option value="Autre lieu">Autre lieu…</option>';W?.classList.add('hidden')};const sectors=()=>{const b=d().find(x=>x.name===B.value),f=b?.floors?.find(x=>x.name===F.value);S.innerHTML=(f?.sectors||[]).map(x=>op(x.name,x.name)).join('');rooms()};const floors=()=>{const b=d().find(x=>x.name===B.value);F.innerHTML=(b?.floors||[]).map(x=>op(x.name,x.name)).join('');sectors()};B.onchange=floors;F.onchange=sectors;S.onchange=rooms;R.onchange=()=>W?.classList.toggle('hidden',R.value!=='Autre lieu')}

function buildingOptions(v=''){return selectOptions(db.buildings,v,b=>b.name,b=>b.name)}
function floorOptions(building,v=''){const b=db.buildings.find(x=>x.name===building)||db.buildings[0];return selectOptions(b?.floors||[],v)}
function centralCleaningRoomOptions(building,floor,type=''){
 const ref=window.PSTCleaningRooms?.get?.()||[];
 const nb=normalizeText(building),nf=normalizeText(floor),nt=normalizeText(type);
 const b=ref.find(x=>normalizeText(x.name)===nb)||ref.find(x=>normalizeText(x.name).includes(nb)||nb.includes(normalizeText(x.name)));
 if(!b)return [];
 const f=(b.floors||[]).find(x=>{
   const n=normalizeText(x.name);
   return n===nf||n.startsWith(nf)||nf.startsWith(n);
 })||(b.floors||[])[0];
 if(!f)return [];
 const rooms=(f.sectors||[]).flatMap(s=>(s.rooms||[]).map(r=>({...r,sector:s.name})));
 const preferred=r=>{
   const rt=normalizeText(r.type);
   if(!nt)return 1;
   if(nt.includes('dortoir')||nt.includes('internat'))return ['chambre','internat','foyer'].some(x=>rt.includes(x))?0:1;
   if(nt.includes('salle'))return rt.includes('salle')?0:1;
   if(nt.includes('sanitaire'))return rt.includes('sanitaire')?0:1;
   if(nt.includes('circulation'))return rt.includes('circulation')?0:1;
   if(nt.includes('escalier'))return rt.includes('escalier')?0:1;
   if(nt.includes('bureau'))return rt.includes('bureau')?0:1;
   return 1;
 };
 return rooms.sort((x,y)=>preferred(x)-preferred(y)).map(r=>{
   const num=String(r.number||'').trim(),name=String(r.name||'').trim();
   return num&&name?`${num} — ${name}`:num||name||r.type||'Local';
 }).filter(Boolean);
}
function roomOptions(building,floor,type,v=''){
 const legacy=db.spaces.filter(s=>(!building||s.building===building)&&(!floor||s.floor===floor)&&(!type||s.type===type)).map(s=>s.name);
 const central=centralCleaningRoomOptions(building,floor,type);
 const values=[...new Set(['Zone entière',...central,...legacy,'Autre local'])];
 return selectOptions(values,v);
}

/* ---------- Pièces jointes : Supabase Storage uniquement ---------- */
const STORAGE_BUCKET='documentation';
// V87 : le lien archive <-> original est conservé séparément du gros état applicatif.
// Ainsi, un rechargement cloud plus ancien ne peut plus faire revenir un PDF à « Original absent ».
function safeFileName(name){return String(name||'fichier').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'_')}
function loadImportOriginalBindings(){db.importOriginalBindings=db.importOriginalBindings||{};return db.importOriginalBindings}
function saveImportOriginalBindings(map){db.importOriginalBindings=map||{};save(false);return true}
function archiveBindingKeys(x){const a=[];if(x?.id)a.push(`archive:${x.id}`);if(x?.sourceId)a.push(`source:${x.sourceId}`);if(!a.length&&x?.fileName)a.push(`file:${normalizeText(x.fileName)}`);return a}
function rememberImportOriginalBinding(x,meta){if(!x||!meta)return false;const map=loadImportOriginalBindings(),payload={attachment:{...meta},savedAt:new Date().toISOString(),archiveId:x.id||'',sourceId:x.sourceId||'',fileName:x.fileName||meta.name||''};for(const k of archiveBindingKeys(x))map[k]=payload;return saveImportOriginalBindings(map)}
function restoreImportOriginalBinding(x){if(!x)return null;const map=loadImportOriginalBindings();let b=null;for(const k of archiveBindingKeys(x)){if(map[k]?.attachment){b=map[k];break}}if(!b?.attachment)return null;const meta=b.attachment;db.attachments=db.attachments||[];let changed=false,rec=db.attachments.find(a=>String(a.id)===String(meta.id));if(!rec){rec={...meta};db.attachments.push(rec);changed=true}else Object.assign(rec,meta);if(!x.attachmentId){x.attachmentId=rec.id;changed=true}const src=(db.pdfImports||[]).find(r=>String(r.id)===String(x.sourceId));if(src&&!src.attachmentId){src.attachmentId=rec.id;changed=true}const stored=(db.importArchives||[]).find(r=>String(r.id)===String(x.id)||x.sourceId&&String(r.sourceId)===String(x.sourceId));if(stored&&!stored.attachmentId){stored.attachmentId=rec.id;changed=true}if(changed)save(false);return rec}
function resolveArchiveAttachment(x){if(!x)return null;let rec=(db.attachments||[]).find(a=>String(a.id)===String(x.attachmentId));if(rec)return rec;return restoreImportOriginalBinding(x)}
function registerImportOriginal(archive,attachment){if(!archive||!attachment)return false;archive.attachmentId=attachment.id||archive.attachmentId||'';archive.fileName=attachment.name||archive.fileName||'';archive.originalStoredAt=archive.originalStoredAt||new Date().toISOString();archive.originalStorageMode=attachment.storageMode||archive.originalStorageMode||'';rememberImportOriginalBinding(archive,attachment);return true}
window.PSTImportOriginals={remember:registerImportOriginal,resolve:resolveArchiveAttachment,restore:restoreImportOriginalBinding};
window.PSTBundledReports={open:path=>{try{window.open(new URL(path,window.location.href).href,'_blank','noopener');return true}catch(e){console.error(e);return false}}};

// V89 — Détection de doublons pour TOUS les imports.
async function importFileFingerprint(file){
 if(!file)return '';
 try{const buf=await file.arrayBuffer();const hash=await crypto.subtle.digest('SHA-256',buf);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('')}
 catch(_){return `${normalizeText(file.name)}|${file.size||0}|${file.lastModified||0}`}
}
function importDuplicateCandidates(fileName,fileHash=''){
 const n=normalizeText(fileName||'');
 const rows=typeof importedArchiveRows==='function'?importedArchiveRows():(db.importArchives||[]);
 const out=[];
 for(const x of rows){
  const sameName=n&&normalizeText(x.fileName||'')===n;
  const sameHash=fileHash&&x.fileHash&&String(x.fileHash)===String(fileHash);
  if(sameName||sameHash)out.push({...x,duplicateReason:sameHash?'Empreinte identique':'Même nom de fichier'});
 }
 for(const x of (db.pdfImports||[])){
  const sameName=n&&normalizeText(x.fileName||'')===n;
  const sameHash=fileHash&&x.fileHash&&String(x.fileHash)===String(fileHash);
  if((sameName||sameHash)&&!out.some(y=>String(y.sourceId||'')===String(x.id)))out.push({id:`pdf-${x.id}`,sourceId:x.id,fileName:x.fileName,createdAt:x.createdAt,type:x.kind==='chronotime'?'Chronotime':'Rapport de contrôle',subject:x.subject||'',duplicateReason:sameHash?'Empreinte identique':'Même nom de fichier'});
 }
 return out;
}
async function inspectImportDuplicate(file){const fileHash=await importFileFingerprint(file);return {fileHash,matches:importDuplicateCandidates(file?.name||'',fileHash)}}
function duplicateWarningHtml(info){if(!info?.matches?.length)return '';const rows=info.matches.slice(0,5).map(x=>`<li><strong>${esc(x.fileName||'Document')}</strong> — ${esc(x.type||'Import')} · ${x.createdAt?new Date(x.createdAt).toLocaleString('fr-FR'):'date inconnue'} · ${esc(x.duplicateReason||'Doublon possible')}</li>`).join('');return `<div class="import-message warning duplicate-warning"><strong>⚠️ Doublon possible</strong><p>Un fichier portant le même nom ou la même empreinte existe déjà dans Archivage.</p><ul>${rows}</ul><p>Vous pourrez continuer si cet import est volontaire.</p></div>`}
function confirmDuplicateImport(info){if(!info?.matches?.length)return true;const first=info.matches[0];return confirm(`⚠️ DOUBLON POSSIBLE\n\nLe fichier « ${first.fileName||'document'} » existe déjà (${first.type||'import'}, ${first.createdAt?new Date(first.createdAt).toLocaleString('fr-FR'):'date inconnue'}).\n\nVoulez-vous quand même créer un nouvel import ?`)}
window.PSTImportDuplicates={fingerprint:importFileFingerprint,inspect:inspectImportDuplicate,candidates:importDuplicateCandidates,confirm:confirmDuplicateImport,warningHtml:duplicateWarningHtml};
async function verifyStoragePathExists(path){
 if(!path)return {ok:false,reason:'Chemin cloud absent'};
 if(!navigator.onLine)return {ok:false,reason:'Hors ligne'};
 if(!supabaseClient||!currentUser)return {ok:false,reason:'Cloud non connecté'};
 try{
  // V147 : vérification via le SDK Supabase, sans requête HTTP Range depuis la WebView.
  const {data,error}=await supabaseClient.storage.from(STORAGE_BUCKET).download(path);
  if(error||!data)return {ok:false,reason:error?.message||'Document cloud indisponible'};
  return {ok:true,size:data.size||0};
 }catch(e){return {ok:false,reason:e?.message||String(e)}}
}
async function loadTusClient(){
 if(window.tus?.Upload)return window.tus;
 const urls=[
  'https://cdn.jsdelivr.net/npm/tus-js-client@4/dist/tus.min.js',
  'https://unpkg.com/tus-js-client@4/dist/tus.min.js'
 ];
 let lastErr=null;
 for(const url of urls){
  try{
   await new Promise((resolve,reject)=>{
    const existing=[...document.scripts].find(x=>x.src===url);
    if(existing){
      if(window.tus?.Upload)return resolve();
      existing.addEventListener('load',resolve,{once:true});
      existing.addEventListener('error',reject,{once:true});
      return;
    }
    const sc=document.createElement('script');
    sc.src=url;sc.async=true;
    sc.onload=resolve;
    sc.onerror=()=>reject(new Error('Chargement TUS impossible'));
    document.head.appendChild(sc);
   });
   if(window.tus?.Upload)return window.tus;
  }catch(e){lastErr=e}
 }
 throw lastErr||new Error('Client d’envoi résumable indisponible');
}

async function uploadViaTus(file,path){
 const cfg=window.SUPABASE_CONFIG||{};
 const {data:{session}}=await supabaseClient.auth.getSession();
 if(!session?.access_token)throw new Error('Session Supabase expirée');
 const projectId=String(cfg.url||'').replace(/^https?:\/\//,'').split('.')[0];
 if(!projectId)throw new Error('Identifiant Supabase introuvable');
 const tus=await loadTusClient();
 const endpoint=`https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;
 return await new Promise(async(resolve,reject)=>{
  try{
   const upload=new tus.Upload(file,{
    endpoint,
    retryDelays:[0,1500,3000,5000,10000],
    headers:{authorization:`Bearer ${session.access_token}`,'x-upsert':'false'},
    uploadDataDuringCreation:true,
    removeFingerprintOnSuccess:true,
    metadata:{
      bucketName:STORAGE_BUCKET,
      objectName:path,
      contentType:file.type||'application/octet-stream',
      cacheControl:'3600'
    },
    chunkSize:6*1024*1024,
    onError:error=>reject(error),
    onSuccess:()=>resolve({path})
   });
   try{
    const prev=await upload.findPreviousUploads();
    if(prev?.length)upload.resumeFromPreviousUpload(prev[0]);
   }catch(_){}
   upload.start();
  }catch(e){reject(e)}
 });
}

async function putFile(file,meta={}){
 if(!supabaseClient||!currentUser)throw new Error('Connexion Supabase requise.');
 const id=uid(),base={id,name:file.name,type:file.type||'application/octet-stream',size:file.size,createdAt:new Date().toISOString(),...meta};
 const path=`${currentUser.id}/${meta.module||'documents'}/${meta.recordId||'general'}/${id}-${safeFileName(file.name)}`;
 const contentType=file.type||'application/octet-stream';
 let lastError=null;

 // Méthode 1 : upload standard avec ArrayBuffer (plus fiable sur certaines WebView Android).
 try{
  const body=await file.arrayBuffer();
  const {data,error}=await supabaseClient.storage.from(STORAGE_BUCKET).upload(path,body,{upsert:false,contentType});
  if(!error){
   const confirmedPath=data?.path||path;
   return {...base,storagePath:confirmedPath,storageMode:'supabase',cloudVerified:true,cloudVerifiedAt:new Date().toISOString(),cloudError:'',uploadConfirmed:true,uploadMethod:'arraybuffer'};
  }
  lastError=error;
 }catch(e){lastError=e}

 // Méthode 2 : URL d’upload signée Supabase.
 try{
  const {data:signed,error:signedError}=await supabaseClient.storage.from(STORAGE_BUCKET).createSignedUploadUrl(path,{upsert:false});
  if(signedError)throw signedError;
  if(!signed?.token)throw new Error('Jeton d’upload Supabase absent');
  const body=await file.arrayBuffer();
  const {data,error}=await supabaseClient.storage.from(STORAGE_BUCKET).uploadToSignedUrl(path,signed.token,body,{contentType,upsert:false});
  if(error)throw error;
  const confirmedPath=data?.path||path;
  return {...base,storagePath:confirmedPath,storageMode:'supabase',cloudVerified:true,cloudVerifiedAt:new Date().toISOString(),cloudError:'',uploadConfirmed:true,uploadMethod:'signed'};
 }catch(e){lastError=e}

 // Méthode 3 : upload résumable TUS via le hostname Storage direct.
 try{
  const data=await uploadViaTus(file,path);
  const confirmedPath=data?.path||path;
  return {...base,storagePath:confirmedPath,storageMode:'supabase',cloudVerified:true,cloudVerifiedAt:new Date().toISOString(),cloudError:'',uploadConfirmed:true,uploadMethod:'tus'};
 }catch(e){lastError=e}

 const msg=lastError?.message||String(lastError||'Erreur inconnue');
 throw new Error(`Envoi Supabase impossible après 3 méthodes : ${msg}`);
}
async function verifyAttachmentCloud(id,{silent=false}={}){
 const rec=(db.attachments||[]).find(a=>String(a.id)===String(id));
 if(!rec){if(!silent)toast('Pièce jointe introuvable');return false}
 if(!rec.storagePath){rec.cloudVerified=false;rec.cloudError='Aucune copie cloud';rec.cloudCheckedAt=new Date().toISOString();save(false);renderImportArchives();return false}
 if(!navigator.onLine){if(!silent)toast('Connexion Internet nécessaire pour vérifier le cloud');return false}
 const check=await verifyStoragePathExists(rec.storagePath);
 rec.cloudVerified=!!check.ok;rec.cloudCheckedAt=new Date().toISOString();rec.cloudVerifiedAt=check.ok?rec.cloudCheckedAt:'';rec.cloudError=check.ok?'':(check.reason||'Fichier non confirmé sur le cloud');
 if(check.ok)rec.storageMode='supabase';
 save(false);renderImportArchives();
 if(!silent)toast(check.ok?'☁️ Document confirmé sur le cloud':'⚠️ Document non confirmé sur le cloud');
 return check.ok;
}
async function syncAttachmentToCloud(id){
 const rec=(db.attachments||[]).find(a=>String(a.id)===String(id));
 if(!rec)return toast('Pièce jointe introuvable');
 if(!rec.storagePath)return toast('Aucune copie cloud : rattachez le document original.');
 await verifyAttachmentCloud(id);
}
async function removeFileBlob(id){
 const meta=db.attachments.find(a=>a.id===id);if(!meta)return;
 if(meta.storagePath&&supabaseClient){const {error}=await supabaseClient.storage.from(STORAGE_BUCKET).remove([meta.storagePath]);if(error)console.error(error)}
}
function forgetImportOriginalBinding(x){
 if(!x)return;const map=loadImportOriginalBindings();for(const k of archiveBindingKeys(x))delete map[k];saveImportOriginalBindings(map);
}
async function deleteImportedArchive(archiveId){
 const x=importedArchiveRows().find(r=>String(r.id)===String(archiveId));if(!x)return toast('Archive introuvable');
 const att=resolveArchiveAttachment(x);
 const linked=x.recordId?'La fiche métier liée sera conservée, mais son document original sera retiré.':'Les données métier déjà injectées (Chronotime, contrôle, etc.) seront conservées.';
 const cloud=att?.storagePath?'\n☁️ La copie cloud sera également supprimée.':'';
 if(!confirm(`⚠️ SUPPRESSION DÉFINITIVE DU FICHIER\n\n${x.fileName||x.subject||'Document'}\nType : ${x.type||'Import'}\n\n${linked}${cloud}\n\nSupprimer ce fichier de l’Archivage ?`))return;
 try{
  if(att?.id)await removeFileBlob(att.id);
  if(att?.id)db.attachments=(db.attachments||[]).filter(a=>String(a.id)!==String(att.id));
  // Retirer l'archive explicite et la source PDF pour éviter sa reconstruction automatique.
  db.importArchives=(db.importArchives||[]).filter(a=>String(a.id)!==String(x.id)&&!(x.sourceId&&String(a.sourceId)===String(x.sourceId)));
  if(x.sourceId)db.pdfImports=(db.pdfImports||[]).filter(r=>String(r.id)!==String(x.sourceId));
  // Enlever la pièce jointe de la fiche métier, sans supprimer la fiche elle-même.
  if(x.recordId&&x.module&&Array.isArray(db[x.module])){const rec=db[x.module].find(r=>String(r.id)===String(x.recordId));if(rec&&Array.isArray(rec.attachments)&&att?.id)rec.attachments=rec.attachments.filter(a=>String(a.id)!==String(att.id))}
  forgetImportOriginalBinding(x);
  save(false);renderAll();renderImportArchives();
  try{if(currentUser&&navigator.onLine)await cloudSaveNow({silent:true})}catch(e){console.warn('Synchronisation suppression différée',e)}
  toast('Fichier supprimé de l’Archivage');
 }catch(e){console.error('Suppression import',e);toast(`Suppression impossible : ${e?.message||String(e)}`)}
}
async function openStoragePath(path,downloadName='document'){
 if(!supabaseClient||!path)return false;
 const {data,error}=await supabaseClient.storage.from(STORAGE_BUCKET).createSignedUrl(path,120);
 if(error||!data?.signedUrl){console.error(error);return false}
 window.open(data.signedUrl,'_blank','noopener');return true;
}
function ensurePdfViewer(){
 let dlg=document.getElementById('supabasePdfViewer');
 if(dlg)return dlg;
 dlg=document.createElement('dialog');dlg.id='supabasePdfViewer';dlg.className='modal pdf-viewer-modal';
 dlg.innerHTML=`<div class="modal-head"><div><h3 id="pdfViewerTitle">Document PDF</h3><p class="muted" id="pdfViewerStatus">Chargement…</p></div><button type="button" class="icon-btn" id="pdfViewerClose">×</button></div><div class="pdf-viewer-toolbar"><button class="ghost small" id="pdfPrevPage">‹ Page précédente</button><strong id="pdfPageInfo">—</strong><button class="ghost small" id="pdfNextPage">Page suivante ›</button></div><div class="pdf-viewer-canvas-wrap"><canvas id="pdfViewerCanvas"></canvas></div>`;
 document.body.appendChild(dlg);
 dlg.querySelector('#pdfViewerClose').onclick=()=>dlg.close();
 return dlg;
}
let __pdfViewerDoc=null,__pdfViewerPage=1,__pdfViewerRendering=false;
async function renderPdfViewerPage(pageNo){
 if(!__pdfViewerDoc||__pdfViewerRendering)return;
 __pdfViewerRendering=true;
 const dlg=ensurePdfViewer(),status=dlg.querySelector('#pdfViewerStatus'),canvas=dlg.querySelector('#pdfViewerCanvas');
 try{
  const page=await __pdfViewerDoc.getPage(pageNo);const base=page.getViewport({scale:1});
  const maxW=Math.max(280,Math.min(window.innerWidth-36,1000));const scale=Math.max(.7,Math.min(2,maxW/base.width));const vp=page.getViewport({scale});
  canvas.width=Math.floor(vp.width);canvas.height=Math.floor(vp.height);canvas.style.width='100%';canvas.style.height='auto';
  await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
  __pdfViewerPage=pageNo;dlg.querySelector('#pdfPageInfo').textContent=`Page ${pageNo} / ${__pdfViewerDoc.numPages}`;
  dlg.querySelector('#pdfPrevPage').disabled=pageNo<=1;dlg.querySelector('#pdfNextPage').disabled=pageNo>=__pdfViewerDoc.numPages;status.textContent='PDF chargé depuis Supabase';
 }catch(e){console.error('Lecture PDF',e);status.textContent='Impossible d’afficher cette page.'}
 finally{__pdfViewerRendering=false}
}
async function openPdfFromSupabasePath(path,name='Document PDF'){
 const dlg=ensurePdfViewer();
 dlg.querySelector('#pdfViewerTitle').textContent=name||'Document PDF';
 dlg.querySelector('#pdfViewerStatus').textContent='Chargement direct depuis Supabase…';
 dlg.querySelector('#pdfViewerCanvas').getContext('2d').clearRect(0,0,10,10);
 dlg.querySelector('#pdfPrevPage').onclick=()=>renderPdfViewerPage(Math.max(1,__pdfViewerPage-1));
 dlg.querySelector('#pdfNextPage').onclick=()=>renderPdfViewerPage(Math.min(__pdfViewerDoc?.numPages||1,__pdfViewerPage+1));
 if(!dlg.open)dlg.showModal();
 try{
  if(!window.pdfjsLib)throw new Error('Lecteur PDF indisponible');
  if(!supabaseClient||!path)throw new Error('Chemin Supabase indisponible');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const {data,error}=await supabaseClient.storage.from(STORAGE_BUCKET).download(path);
  if(error||!data)throw error||new Error('Téléchargement Supabase impossible');
  const buf=await data.arrayBuffer();
  __pdfViewerDoc=await window.pdfjsLib.getDocument({data:buf}).promise;
  __pdfViewerPage=1;
  await renderPdfViewerPage(1);
  return true;
 }catch(e){
  console.error('Ouverture PDF Supabase directe',e);
  dlg.querySelector('#pdfViewerStatus').textContent='Lecture intégrée impossible — ouverture externe…';
  try{
   const {data,error}=await supabaseClient.storage.from(STORAGE_BUCKET).createSignedUrl(path,900);
   if(!error&&data?.signedUrl){window.location.assign(data.signedUrl);return true}
  }catch(_){}
  return false;
 }
}

async function openPdfInApp(url,name='Document PDF'){
 const dlg=ensurePdfViewer();dlg.querySelector('#pdfViewerTitle').textContent=name||'Document PDF';dlg.querySelector('#pdfViewerStatus').textContent='Chargement depuis Supabase…';dlg.querySelector('#pdfViewerCanvas').getContext('2d').clearRect(0,0,10,10);
 dlg.querySelector('#pdfPrevPage').onclick=()=>renderPdfViewerPage(Math.max(1,__pdfViewerPage-1));dlg.querySelector('#pdfNextPage').onclick=()=>renderPdfViewerPage(Math.min(__pdfViewerDoc?.numPages||1,__pdfViewerPage+1));
 if(!dlg.open)dlg.showModal();
 try{
  if(!window.pdfjsLib)throw new Error('Lecteur PDF indisponible');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  // V147 : on télécharge d'abord le PDF signé Supabase en mémoire. Cela évite les blocages CORS/WebView Android.
  const response=await fetch(url,{cache:'no-store',credentials:'omit'});
  if(!response.ok)throw new Error('Téléchargement PDF impossible ('+response.status+')');
  const buf=await response.arrayBuffer();
  __pdfViewerDoc=await window.pdfjsLib.getDocument({data:buf}).promise;__pdfViewerPage=1;await renderPdfViewerPage(1);return true;
 }catch(e){console.error('Ouverture PDF intégrée',e);dlg.querySelector('#pdfViewerStatus').textContent='Lecture intégrée impossible — ouverture externe…';
  try{window.open(url,'_blank','noopener');return true}catch(_){try{window.location.assign(url);return true}catch(__){return false}}
 }
}

async function downloadAttachment(id){
 let rec=(db.attachments||[]).find(a=>String(a.id)===String(id));
 // V141 : secours ciblé pour les pièces jointes de contrôles périodiques.
 if(!rec){
  for(const row of (db.periodic||[])){
   const found=(row.attachments||[]).find(a=>String(a.id)===String(id));
   if(found){rec={...found};break}
  }
 }
 if(!rec){const map=loadImportOriginalBindings();for(const b of Object.values(map)){if(String(b?.attachment?.id)===String(id)){rec={...b.attachment};db.attachments=db.attachments||[];db.attachments.push(rec);break}}}
 if(!rec){const st=$('#importArchiveStatus');if(st){st.textContent='❌ Le lien du document original est introuvable. Rattachez l’original.';st.className='import-archive-status error'}toast('Fichier introuvable dans l’archive');return}
 try{
  // Android/Chrome : navigation dans l’onglet courant = pas de popup bloquée.
  // Le bouton Retour du téléphone ramène ensuite directement à l’application.
  if(rec.storagePath&&supabaseClient){
   const {data,error}=await supabaseClient.storage.from(STORAGE_BUCKET).createSignedUrl(rec.storagePath,900);
   if(!error&&data?.signedUrl){const st=$('#importArchiveStatus');if(st){st.textContent='☁️ Ouverture du document depuis le cloud…';st.className='import-archive-status ok'}const isPdf=/\.pdf(?:$|[?#])/i.test(rec.name||'')||String(rec.type||rec.mimeType||'').toLowerCase().includes('pdf');if(isPdf){const ok=await openPdfFromSupabasePath(rec.storagePath,rec.name||'Rapport PDF');if(ok)return;}window.location.assign(data.signedUrl);return}
   if(error)console.warn('Ouverture Supabase impossible',error);
  }
 }catch(e){console.error('Ouverture du document',e)}
 toast('Impossible d’ouvrir ce PDF depuis Supabase.');
}

function humanSize(n){n=Number(n)||0;if(n<1024)return `${n} o`;if(n<1048576)return `${(n/1024).toFixed(1)} Ko`;return `${(n/1048576).toFixed(1)} Mo`}

function noteItemsHTML(items=[]){
 const rows=(items||[]).map((i,index)=>`<div class="item-row">
   <input name="itemText" value="${esc(i?.text||'')}" placeholder="Action / item">
   <label class="inline-check"><input name="itemDone" type="checkbox" ${i?.done?'checked':''}> Fait</label>
   <button type="button" data-remove-item aria-label="Supprimer cet item">×</button>
 </div>`).join('');
 return `<div id="noteItems">${rows}</div><button type="button" id="addNoteItem">+ Ajouter un item</button>`;
}

function attachmentField(existing=[]){return `<div class="attachment-box"><div class="attachment-actions"><label class="camera-label">📷 Prendre une photo<input type="file" name="cameraPhotos" accept="image/*" capture="environment" multiple></label><label>📎 Ajouter des fichiers<input type="file" name="files" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.eml,.msg,.ods,.odt"></label></div><p class="hint">Les photos et fichiers sont synchronisés dans Supabase et deviennent accessibles sur le téléphone et le PC.</p>${existing.length?`<div class="attachment-list">${existing.map(a=>`<div><span>📎 ${esc(a.name)} <small>${humanSize(a.size)}</small></span><label class="inline-check"><input type="checkbox" name="removeAttachment" value="${esc(a.id)}"> Retirer</label></div>`).join('')}</div>`:''}</div>`}
async function processAttachments(form,record,module){
 record.attachments=record.attachments||[];
 const removeIds=[...form.querySelectorAll('[name="removeAttachment"]:checked')].map(x=>x.value);
 const files=[...(form.elements.files?.files||[]),...(form.elements.cameraPhotos?.files||[])];
 const uploadedMeta=[],failed=[];
 for(const file of files){
  try{
   const meta=await putFile(file,{module,recordId:record.id});
   uploadedMeta.push(meta);
  }catch(e){
   console.error('Upload pièce jointe',e);
   failed.push({name:file.name,error:e?.message||String(e)});
  }
 }
 if(failed.length){
   for(const meta of uploadedMeta){
    try{await removeFileBlob(meta.id||'',meta.storagePath||'')}catch(_){}
   }
   const names=failed.map(x=>x.name).join(', ');
   setSaveState(`Fichier non synchronisé : ${names}`,'error');
   toast(`Enregistrement annulé : ${names}`);
   return {ok:false,failed,uploaded:0,total:files.length};
 }
 for(const meta of uploadedMeta){record.attachments.push(meta);db.attachments.push(meta)}
 for(const id of removeIds){
  try{await removeFileBlob(id)}catch(e){console.warn('Suppression pièce jointe',e)}
  record.attachments=record.attachments.filter(a=>a.id!==id);
  db.attachments=db.attachments.filter(a=>a.id!==id);
 }
 return {ok:true,failed:[],uploaded:uploadedMeta.length,total:files.length};
}
function attachmentButtons(arr=[]){return arr.length?`<div class="attachment-chips">${arr.map(a=>a?.storagePath?`<button class="chip" data-download="${esc(a.id)}">📎 ${esc(a.name)}</button>`:`<span class="chip attachment-missing" title="Le fichier doit être rattaché">⚠️ ${esc(a?.name||'Original indisponible')}</span>`).join('')}</div>`:''}

const BUILTIN_GUIDES=[
 {title:'Guide d’accueil des lycées 2025',category:'Guide / procédure',storagePath:'guides/Guide_Accueil_Lycees_2025.pdf'},
 {title:'Guide de l’entretien dans les lycées 2023',category:'Guide / procédure',storagePath:'guides/Guide_Entretien_Lycees_2023.pdf'},
 {title:'Guide de maintenance des lycées 2023',category:'Guide / procédure',storagePath:'guides/Guide_Maintenance_Lycees_2023.pdf'}
];
async function openGuide(path){await openStoragePath(path)}
/* ---------- Fenêtres ---------- */
function openModal(title,html,onSave,opts={}){modalHandler=onSave;modalDeleteHandler=opts.onDelete||null;modalAuditTitle=title;modalAuditContext=opts.audit||null;$('#modalTitle').textContent=title;$('#modalBody').innerHTML=html;const saveBtn=$('#modalSave');saveBtn.textContent=opts.saveLabel||'Enregistrer';saveBtn.disabled=false;saveBtn.dataset.directSave=opts.directSave?'1':'';saveBtn.dataset.directSaving='';$('#modalDelete').classList.toggle('hidden',!modalDeleteHandler);const d=$('#modal');if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','');setTimeout(()=>{const f=$('#modalForm');modalAuditInitial={};if(f)for(const e of [...f.elements])if(e.name&&e.type!=='file'&&e.type!=='button'&&e.type!=='submit')modalAuditInitial[e.name]=e.type==='checkbox'?e.checked:e.value;$('#modalBody input:not([type="hidden"]),#modalBody select,#modalBody textarea')?.focus()},60)}
function closeModal(){stopNoteSpeechDictation();const d=$('#modal');if(d.open)d.close();else d.removeAttribute('open');const b=$('#modalSave');if(b){b.disabled=false;b.dataset.directSave='';b.dataset.directSaving='';b.textContent='Enregistrer'}modalHandler=null;modalDeleteHandler=null;modalAuditInitial=null;modalAuditTitle='';modalAuditContext=null}
function openDetail(title,html){$('#detailTitle').textContent=title;$('#detailBody').innerHTML=html;const d=$('#detailModal');if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','')}
function field(label,name,value='',type='text',extra=''){return `<label>${esc(label)}<input name="${esc(name)}" type="${esc(type)}" value="${esc(value)}" ${extra}></label>`}
function selectField(label,name,items,value='',extra=''){return `<label>${esc(label)}<select name="${esc(name)}" ${extra}>${selectOptions(items,value)}</select></label>`}
function textareaField(label,name,value='',rows=3,extra=''){return `<label class="span2">${esc(label)}<textarea name="${esc(name)}" rows="${rows}" ${extra}>${esc(value)}</textarea></label>`}

/* ---------- Dictée vocale des notes (V147.168) ---------- */
let noteSpeechRecognition=null;
let noteSpeechListening=false;
function noteSpeechCtor(){return window.SpeechRecognition||window.webkitSpeechRecognition||null}
function noteSpeechJoin(base,spoken){
 const a=String(base||'').trimEnd(),b=String(spoken||'').trim();
 if(!a)return b;
 if(!b)return a;
 return `${a} ${b}`;
}
function stopNoteSpeechDictation(){
 noteSpeechListening=false;
 if(noteSpeechRecognition){try{noteSpeechRecognition.stop()}catch(_){}}
 noteSpeechRecognition=null;
 const btn=document.querySelector('[data-note-dictate]');
 const status=document.querySelector('[data-note-dictate-status]');
 if(btn){btn.classList.remove('is-listening');btn.setAttribute('aria-pressed','false');btn.innerHTML='🎤 Dicter la note'}
 if(status&&!status.dataset.keepMessage)status.textContent='Appuyez sur le micro puis parlez normalement.';
}
function bindNoteSpeechDictation(){
 const btn=document.querySelector('[data-note-dictate]');
 const textarea=document.querySelector('#modalForm textarea[name="text"]');
 const status=document.querySelector('[data-note-dictate-status]');
 if(!btn||!textarea)return;
 const Recognition=noteSpeechCtor();
 if(!Recognition){
  btn.disabled=true;btn.classList.add('is-unavailable');
  if(status){status.textContent='Dictée vocale non disponible dans ce navigateur. Essayez Chrome ou Edge et autorisez le microphone.';status.dataset.keepMessage='1'}
  return;
 }
 btn.onclick=()=>{
  if(noteSpeechListening){stopNoteSpeechDictation();return}
  const recognition=new Recognition();
  noteSpeechRecognition=recognition;
  recognition.lang='fr-FR';
  recognition.continuous=true;
  recognition.interimResults=true;
  recognition.maxAlternatives=1;
  const base=textarea.value;
  noteSpeechListening=true;
  btn.classList.add('is-listening');btn.setAttribute('aria-pressed','true');btn.innerHTML='⏹ Arrêter la dictée';
  if(status){status.textContent='🔴 Écoute en cours… Parlez, le texte apparaît ci-dessous.';delete status.dataset.keepMessage}
  recognition.onresult=e=>{
   let finalText='',interim='';
   for(let i=0;i<e.results.length;i++){
    const transcript=String(e.results[i][0]?.transcript||'').trim();
    if(!transcript)continue;
    if(e.results[i].isFinal)finalText=noteSpeechJoin(finalText,transcript);else interim=noteSpeechJoin(interim,transcript);
   }
   const spoken=noteSpeechJoin(finalText,interim);
   textarea.value=noteSpeechJoin(base,spoken);
   textarea.dispatchEvent(new Event('input',{bubbles:true}));
  };
  recognition.onerror=e=>{
   const code=String(e?.error||'');
   let msg='La dictée vocale a été interrompue.';
   if(code==='not-allowed'||code==='service-not-allowed')msg='Microphone non autorisé. Autorisez le micro pour cette application puis réessayez.';
   else if(code==='no-speech')msg='Aucune voix détectée. Appuyez de nouveau sur le micro pour recommencer.';
   else if(code==='audio-capture')msg='Aucun microphone disponible ou accessible.';
   if(status){status.textContent=msg;status.dataset.keepMessage='1'}
  };
  recognition.onend=()=>{
   const keep=status?.dataset.keepMessage;
   noteSpeechListening=false;noteSpeechRecognition=null;
   btn.classList.remove('is-listening');btn.setAttribute('aria-pressed','false');btn.innerHTML='🎤 Dicter la note';
   if(status&&!keep)status.textContent='Dictée terminée. Vous pouvez corriger le texte ou relancer le micro.';
  };
  try{recognition.start()}catch(e){
   console.warn('Dictée vocale',e);stopNoteSpeechDictation();
   if(status){status.textContent='Impossible de démarrer le microphone. Vérifiez son autorisation.';status.dataset.keepMessage='1'}
  }
 };
}
function noteVoiceField(value=''){
 return `<label class="span2 note-voice-field"><span>Note</span><div class="note-voice-toolbar"><button type="button" class="note-voice-button" data-note-dictate aria-pressed="false">🎤 Dicter la note</button><small data-note-dictate-status>Appuyez sur le micro puis parlez normalement.</small></div><textarea name="text" rows="5" spellcheck="true" placeholder="Écrivez votre note ou utilisez le micro…">${esc(value)}</textarea></label>`;
}
function formDataObj(form){return Object.fromEntries(new FormData(form).entries())}
async function deleteRecord(type,id,label='élément'){
 if(!confirm(`Supprimer cet ${label} ?`))return;

 const sid=String(id);
 markRecordDeleted(type,sid);
 db[type]=(db[type]||[]).filter(x=>String(x.id)!==sid);
 if(STABLE_FORM_COLLECTIONS.includes(type))enforceStableCollection(type,'suppression');
 enforceAllDeletedRecords('suppression locale');

 localDirty=true;
 try{writeMirror()}catch(_){}
 try{writeOfflinePending(`suppression ${label} à synchroniser`)}catch(_){}

 // Le formulaire se ferme et l'écran est rafraîchi AVANT tout appel serveur.
 closeModal();
 refreshCollectionView(type);
 if(type==='periodic')renderPeriodic();

 const stillLocal=(db[type]||[]).some(x=>String(x.id)===sid);
 if(stillLocal){
   console.error('Suppression locale non appliquée',type,sid);
   toast(`⚠️ Le ${label} n’a pas pu être retiré localement`);
   return;
 }

 if(!currentUser){
   setSaveState('Suppression locale — non connecté','local');
   toast(`${label} supprimé sur cet appareil — connexion requise pour synchroniser`);
   return;
 }
 if(!navigator.onLine){
   setSaveState('Suppression en attente de synchronisation','local');
   toast(`${label} supprimé sur cet appareil — synchronisation au retour du réseau`);
   return;
 }

 setSaveState(cloudBusy?'Suppression enregistrée — attente de la synchro en cours…':'Suppression envoyée au serveur…','loading');

 // Important : attendre une éventuelle ancienne sauvegarde qui pourrait contenir encore l'élément.
 const idle=await waitForCloudIdle(18000);
 if(!idle){
   writeOfflinePending(`suppression ${label} en attente — serveur occupé`);
   setSaveState('Suppression en attente de synchronisation','local');
   refreshCollectionView(type);
   return;
 }

 try{
   const result=await window.PSTMainState.persistStateDirect({
     label:`Suppression ${label}`,
     verify:remote=>{
       const absent=!(Array.isArray(remote?.[type])&&remote[type].some(x=>String(x.id)===sid));
       const deleted=deletedIdsFor(type,remote).has(sid);
       return absent&&deleted;
     }
   });

   enforceAllDeletedRecords('confirmation suppression');
   refreshCollectionView(type);
   if(type==='periodic')renderPeriodic();

   if(result?.ok && !result?.offline){
     setSaveState(`Synchronisé à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`,'cloud');
     toast(`${label} supprimé et synchronisé`);
   }else if(result?.ok){
     setSaveState('Suppression en attente de synchronisation','local');
     toast(`${label} supprimé — synchronisation en attente`);
   }else{
     writeOfflinePending(`suppression ${label} à resynchroniser`);
     setSaveState('Suppression en attente de synchronisation','local');
     toast(`${label} supprimé localement — synchronisation à reprendre`);
   }
 }catch(error){
   console.error('Suppression vérifiée',error);
   enforceAllDeletedRecords('erreur suppression serveur');
   refreshCollectionView(type);
   if(type==='periodic')renderPeriodic();
   writeOfflinePending(error?.message||`suppression ${label} à resynchroniser`);
   setSaveState('Suppression en attente de synchronisation','local');
   toast(`${label} supprimé localement — synchronisation à reprendre`);
 }
}


/* ---------- V147.148 : Centre d’aide / FAQ local ---------- */
const PST_HELP_ENTRIES=[
 {category:'Horaires',q:'Pourquoi Prévu et Réalisé sont différents mais Écart vaut 0 h ?',keys:'prévu réalisé différence écart zéro maladie congé 0h',answer:'Prévu et Réalisé sont deux totaux bruts. Écart comptabilisé applique les règles métier : certaines journées ne doivent pas créer de débit.',checks:['Regardez le type de journée concerné.','Une Maladie compte 7 h en Réalisé mais ne génère pas d’écart.','Une règle réglée à 0 h ne doit pas créer de débit.','Pour une Présence avec horaire réel différent, un écart doit en revanche apparaître.'],rule:'Écart comptabilisé ≠ forcément Réalisé − Prévu. Les exceptions métier restent à 0 h d’écart.'},
 {category:'Horaires',q:'Comment sont calculées les heures d’un agent entre deux dates ?',keys:'calculette heures dates période total réalisé prévu',answer:'Dans Pilotage des horaires, choisissez l’agent, la date de début et la date de fin. Le calcul additionne jour par jour les règles réellement applicables.',checks:['Prévu vient de l’horaire théorique applicable à la date.','Réalisé reprend l’horaire réel lorsqu’il existe.','Sinon le réalisé suit la règle du type de journée.','Les heures ajoutées ou retirées sont intégrées.'],rule:'Le calcul utilise le moteur dayHours, identique à celui du tableau de Pilotage.'},
 {category:'Horaires',q:'Pourquoi un horaire théorique est différent selon la date ?',keys:'horaire théorique date roulement standard matin soir permanence',answer:'L’horaire théorique est résolu selon la date et la priorité des profils.',checks:['Permanence si la journée est une permanence.','Sinon roulement Matin/Soir lorsqu’un roulement est actif.','Sinon horaire Standard applicable à la période.','Un jour non travaillé est Repos.'],rule:'Priorité : Permanence > Roulement > Standard > Repos / aucun.'},
 {category:'Horaires',q:'Pourquoi un horaire RH affiche WARNING ?',keys:'rh warning non conforme amplitude pause 12h 10h 3h excel',answer:'WARNING signale une règle RH à vérifier mais ne bloque jamais la saisie.',checks:['Amplitude supérieure à 12 h.','Travail effectif supérieur à 10 h.','Durée inférieure à 3 h pour une demi-journée.','Pause méridienne / ordre des plages / plages incomplètes / doublon.'],rule:'Les contrôles RH sont informatifs uniquement, conformément au choix de Pilotage.'},
 {category:'Agents',q:'Pourquoi un agent apparaît en Repos ?',keys:'agent repos jour travail weekend samedi dimanche horaire',answer:'Le calendrier personnel de l’agent est prioritaire. Un jour décoché dans ses jours travaillés habituels est automatiquement considéré comme Repos.',checks:['Ouvrez la fiche Agent.','Vérifiez les jours travaillés habituels.','Vérifiez ensuite le roulement et ses jours actifs.','Enfin vérifiez une éventuelle exception de roulement.'],rule:'Un jour non travaillé dans la fiche Agent ne reçoit pas automatiquement un horaire Standard.'},
 {category:'Agents',q:'Pourquoi mon jour agent revient ou disparaît après enregistrement ?',keys:'formulaire agent congé présence revient disparaît supabase synchronisation',answer:'Une saisie agent doit rester locale immédiatement puis être confirmée par Supabase. Une réponse serveur ancienne ne doit pas l’écraser.',checks:['Regardez Connexions > File locale.','Vérifiez Écriture / synchro.','Si une mutation est en attente, laissez la synchronisation se terminer.','Une saisie manuelle reste prioritaire sur Chronotime.'],rule:'Depuis le moteur central de synchro, la dernière modification locale est prioritaire.'},
 {category:'Absences',q:'Comment est comptée une Maladie ?',keys:'maladie 7 heures écart zéro',answer:'Une journée Maladie est comptabilisée à 7 h dans Réalisé. On n’ajoute pas 7 h à l’horaire initial : la journée vaut 7 h.',checks:['Le réalisé doit afficher 7 h.','L’écart comptabilisé doit rester à 0 h.','L’horaire théorique peut rester visible comme référence.'],rule:'Maladie = 7 h réalisées, écart comptabilisé = 0 h.'},
 {category:'Absences',q:'Comment est compté un congé ou un RTT ?',keys:'congé rtt absence prévu heures',answer:'Le comportement dépend de la règle du type de journée. Lorsqu’elle est sur Horaires prévus, le logiciel reprend les heures théoriques applicables.',checks:['Vérifiez la date et l’horaire théorique.','Vérifiez le type exact de journée.','Une règle à 0 h ne doit pas produire un débit automatique.'],rule:'Les types sans règle spéciale utilisent par défaut les horaires prévus.'},
 {category:'Chronotime',q:'Pourquoi Chronotime ne remplace pas ma saisie manuelle ?',keys:'chronotime manuel priorité écraser congé présence',answer:'C’est volontaire : une saisie manuelle explicitement différente est prioritaire sur une information Chronotime importée.',checks:['Vérifiez la journée dans le formulaire Agent.','Regardez la source de la journée.','Si Chronotime est différent, l’application doit signaler la différence sans écraser silencieusement le manuel.'],rule:'Saisie manuelle prioritaire sur Chronotime.'},
 {category:'Chronotime',q:'Pourquoi L1 M1 D1 ne sont pas pris comme codes ?',keys:'l1 m1 d1 repère code chronotime',answer:'L1, M1, M2, J1, V1, S1, D1 sont traités comme repères calendaires, pas comme codes métier.',checks:['Les vrais codes peuvent être CA, RTT, RH, RFE, etc.','Les durées comme 7h00 ou 9h50 sont lues comme durées.'],rule:'Les repères de ligne/jour sont volontairement ignorés comme codes.'},
 {category:'Contrôle ménage',q:'Pourquoi mon contrôle ménage ne se voit pas dans l’historique ?',keys:'contrôle ménage historique bâtiment étage secteur local invisible',answer:'L’historique dépend du rattachement du contrôle au bâtiment, à l’étage/secteur et au local sélectionné.',checks:['Vérifiez le bâtiment du contrôle.','Vérifiez l’étage / secteur : des libellés différents peuvent empêcher un rattachement direct.','Un contrôle Zone entière / Secteur entier doit être visible dans tous les locaux concernés.','Vérifiez les filtres de période et de local.'],rule:'Le contrôle est rattaché par bâtiment puis par zone/local ; les contrôles de zone doivent être propagés aux locaux concernés.'},
 {category:'Maintenance',q:'Pourquoi une intervention ne se voit pas dans le tableau ?',keys:'maintenance intervention invisible filtre statut année',answer:'Le plus souvent, un filtre, le statut ou l’année scolaire active masque la fiche.',checks:['Videz les filtres du tableau.','Vérifiez l’année scolaire en haut de l’application.','Vérifiez le statut de l’intervention.','Contrôlez la date et la date d’échéance.'],rule:'Les écrans filtrent leurs données selon le contexte et l’année scolaire active.'},
 {category:'Contrôles périodiques',q:'Pourquoi un contrôle périodique est en retard ?',keys:'contrôle périodique retard échéance date intervalle',answer:'Le statut dépend de la dernière date connue, de la périodicité et de la prochaine échéance calculée ou saisie.',checks:['Vérifiez Dernier contrôle.','Vérifiez la périodicité / intervalle.','Vérifiez Prochaine date.','Vérifiez si le contrôle est Non applicable ou clôturé.'],rule:'Une échéance passée non clôturée est signalée en retard.'},
 {category:'Import / export',q:'Pourquoi l’Excel exporté affiche une non-conformité RH ?',keys:'excel export warning rh formule',answer:'L’Excel recalcule les contrôles RH quand vous modifiez les plages. Une alerte est informative et n’empêche pas le réimport.',checks:['Regardez Avertissement RH.','Regardez Contrôle.','Corrigez les plages si nécessaire ou conservez-les volontairement.'],rule:'WARNING uniquement, jamais bloquant.'},
 {category:'Import / export',q:'Pourquoi un horaire importé n’est pas créé en double ?',keys:'import doublon horaire période remplacer',answer:'Pilotage évite volontairement deux horaires théoriques sur la même date/période pour un même agent.',checks:['Vérifiez l’horaire déjà applicable.','Si une période se chevauche, Pilotage doit demander avant remplacement.'],rule:'Pas de doublon silencieux d’horaire théorique.'},
 {category:'Connexions',q:'Pourquoi Supabase est orange ou rouge ?',keys:'supabase orange rouge connexion écriture lecture file locale',answer:'Les voyants séparent Internet, session, lecture, écriture et file locale. Un voyant rouge indique précisément le maillon en échec.',checks:['Internet doit être vert.','Session Supabase doit être verte.','Lecture Supabase teste la base.','Écriture / synchro doit être verte si aucune mutation n’est en attente.','File locale indique le nombre réel de modifications à envoyer.'],rule:'La file centrale de mutations est la référence pour savoir s’il reste des données à synchroniser.'},
 {category:'Connexions',q:'Pourquoi l’IA est rouge alors que Supabase est vert ?',keys:'ia edge function gemini openai rouge supabase vert',answer:'La base Supabase et l’IA sont deux chemins distincts. Supabase peut être joignable alors que l’Edge Function ou le fournisseur IA ne l’est pas.',checks:['Vérifiez Edge Function IA.','Vérifiez le fournisseur IA.','Une absence de crédits ou de clé API concerne l’IA, pas les formulaires métier.'],rule:'Une panne IA ne doit pas empêcher l’enregistrement des données métier.'},
 {category:'Archivage',q:'Pourquoi un document importé ne se voit pas dans Archivage ?',keys:'document import archivage original cloud invisible',answer:'L’archivage a besoin de la fiche d’import et, selon le cas, du lien vers l’original cloud.',checks:['Vérifiez le type de document.','Vérifiez l’année scolaire.','Videz les filtres d’Archivage.','Vérifiez si l’original cloud est rattaché.'],rule:'La fiche peut exister même si l’original cloud est à vérifier ; les deux états sont affichés séparément.'},
 {category:'Navigation',q:'Pourquoi l’année scolaire change les données visibles ?',keys:'année scolaire filtre haut global écran',answer:'L’année scolaire affichée dans la barre du haut est le contexte global de Pilotage. Elle s’applique aux écrans qui utilisent une période scolaire.',checks:['Regardez le sélecteur en haut.','Changez l’année si vous cherchez une donnée ancienne.','Les filtres mensuels sont replacés dans l’année sélectionnée si nécessaire.'],rule:'Le sélecteur global est la source unique du contexte scolaire.'},
 {category:'Navigation',q:'Quand dois-je faire le relevé des compteurs ?',keys:'compteurs relevé logements dernier jour ouvré mois agenda',answer:'Le relevé des compteurs apparaît automatiquement dans l’Agenda personnel le dernier jour ouvré de chaque mois.',checks:['Regardez Agenda personnel.','La section Compteurs à relever affiche toutes les échéances de l’année scolaire.','La tâche apparaît aussi dans le calendrier de la semaine correspondant à cette date.'],rule:'Relevé des compteurs = dernier jour ouvré de chaque mois, hors week-end et jours fériés connus par l’application.'},
 {category:'Maintenance',q:'Comment tracer ce que les agents ont réellement fait ?',keys:'activité agents travail réalisé intervention imprévu débouchage trace date heure journée demi journée plusieurs agents',answer:'Utilisez Activité des agents ou le raccourci Ajout activité agent. Une même activité peut concerner un ou plusieurs agents et être saisie en heures précises, journée complète ou demi-journée.',checks:['Sélectionnez un ou plusieurs agents.','Choisissez la date et la durée : heures, journée complète ou demi-journée.','Décrivez le travail réellement effectué et le résultat.','Si vous liez une intervention ou une demande, vous pouvez la clôturer automatiquement.'],rule:'Une seule fiche peut tracer un travail collectif ; la durée peut être déclarée sans horaire précis.'},
 {category:'Navigation',q:'Pourquoi la barre de défilement remonte pendant que je travaille ?',keys:'curseur scroll barre défilement remonte pc',answer:'Ce comportement ne doit plus se produire. Pilotage mémorise maintenant la position de chaque écran et de chaque tableau pendant les rafraîchissements.',checks:['Si le problème réapparaît, notez l’écran précis.','Vérifiez s’il s’agit de la page entière ou d’un tableau horizontal/vertical.'],rule:'Un rafraîchissement de données ne doit pas modifier la position de lecture sur PC.'}
];

function normalizeHelpText(v){return normalizeText(String(v||'')).replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim()}
function helpScore(entry,query){
 const q=normalizeHelpText(query);if(!q)return 0;
 const words=q.split(' ').filter(w=>w.length>2);
 const hay=normalizeHelpText(`${entry.q} ${entry.keys||''} ${entry.answer||''} ${entry.category||''}`);
 let score=0;
 if(hay.includes(q))score+=40;
 for(const w of words)if(hay.includes(w))score+=3;
 return score;
}
function helpAnswerHtml(entry){
 if(!entry)return `<div class="pst-help-answer"><h4>Aucune réponse exacte trouvée</h4><p>Essayez avec des mots comme horaire, congé, maladie, Chronotime, ménage, Supabase, Excel ou archivage.</p></div>`;
 return `<div class="pst-help-answer"><span class="help-category">${esc(entry.category)}</span><h4>${esc(entry.q)}</h4><p>${esc(entry.answer)}</p>${entry.checks?.length?`<strong>À vérifier :</strong><ol>${entry.checks.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`:''}<div class="pst-help-rule"><strong>Règle utilisée :</strong> ${esc(entry.rule||'')}</div></div>`;
}
function renderHelp(){
 const list=$('#pstHelpFaqList');if(list){
   const category=$('#pstHelpCategory')?.value||'';
   const rows=PST_HELP_ENTRIES.filter(x=>!category||x.category===category);
   list.innerHTML=rows.map(x=>`<details><summary>${esc(x.q)}</summary><p>${esc(x.answer)}</p><button type="button" class="ghost small" data-help-query="${esc(x.q)}">Voir le diagnostic</button></details>`).join('');
 }
}
function searchHelp(query){
 const q=String(query||$('#pstHelpSearch')?.value||'').trim();
 const cat=$('#pstHelpCategory')?.value||'';
 const candidates=PST_HELP_ENTRIES.filter(x=>!cat||x.category===cat)
   .map(x=>({x,score:helpScore(x,q)})).sort((a,b)=>b.score-a.score);
 const found=candidates[0]?.score>0?candidates[0].x:null;
 const box=$('#pstHelpResult');if(box)box.innerHTML=helpAnswerHtml(found);
}
function bindHelpCenter(){
 const input=$('#pstHelpSearch'),btn=$('#pstHelpSearchBtn'),cat=$('#pstHelpCategory');
 if(btn)btn.onclick=()=>searchHelp();
 if(input)input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();searchHelp()}};
 if(cat)cat.onchange=()=>{renderHelp();if(input?.value)searchHelp(input.value)};
 document.querySelectorAll('[data-help-query]').forEach(b=>b.onclick=()=>{if(input)input.value=b.dataset.helpQuery||'';searchHelp(b.dataset.helpQuery||'')});
 renderHelp();
}
window.PSTHelp={search:searchHelp,render:renderHelp,entries:PST_HELP_ENTRIES};

/* ---------- Navigation ---------- */
const VIEW_TITLES={dashboard:'Tableau de bord',personal:'Agenda personnel',agents:'Agents & recrutements',rotations:'Roulements annuels',planning:'Pilotage des horaires','schedule-import':'Import / export horaires',pdfimports:'Imports PDF & Chronotime',absences:'Congés, RTT & absences',vacations:'Vacances & fermetures',issues:'Sécurité & qualité',periodic:'Contrôles périodiques',contracts:'Suivi des contrats',cleaning:'Contrôle ménage','room-prep':'Préparation salle & café',maintenance:'Maintenance','agent-activity':'Activité des agents',requests:'Demandes direction',works:'Chantiers & GPA',meetings:'Réunions & rendez-vous',notes:'Bloc-notes',documents:'Documents & pièces jointes',archives:'Archives hebdomadaires',weather:'Météo',waste:'Poubelles',reports:'Rapports & impressions',connections:'Connexions',help:'FAQ / Aide',settings:'Paramètres'};
function setView(view){
 if(!document.getElementById(view))return;
 const previous=document.querySelector('.view.active')?.id||currentView||'dashboard';
 capturePlanningScroll();
 currentView=view;
 $$('.view').forEach(v=>v.classList.toggle('active',v.id===view));
 $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
 const activeNav=document.querySelector(`.nav-btn[data-view="${view}"]`);
 const activeDomain=activeNav?.closest('.nav-domain');
 if(activeDomain)activeDomain.open=true;

 if($('#pageTitle'))$('#pageTitle').textContent=VIEW_TITLES[view]||view;
 document.body.classList.remove('menu-open');window.PSTNavigation?.closeMenu?.();
 safeRenderAll();
 // Chaque écran retrouve sa propre position. Un écran jamais visité commence naturellement en haut.
 if(previous!==view && !pstPlanningScrollMemory[`page:${view}`]){
   pstPlanningScrollMemory[`page:${view}`]={left:0,top:0};
 }
 restorePlanningScroll();
}
window.PSTSetView=setView;

document.addEventListener('pst:view-changed',e=>{
 const view=e?.detail?.view;
 if(view&&document.getElementById(view)){
   currentView=view;
   safeRenderAll();
 }
});

function applyLayout(mode=db.settings.defaultLayout||'auto'){document.body.dataset.layout=mode;$('#layoutMode').value=mode}

/* ---------- Calcul du roulement et du jour agent ---------- */
function activeRotation(agentId,date){return db.rotations.filter(r=>r.agentId===agentId&&r.effectiveFrom<=date&&(!r.effectiveTo||r.effectiveTo>=date)).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0]||null}
function rotationException(agentId,date){return db.rotationExceptions.filter(x=>x.agentId===agentId&&inRange(date,x.dateFrom,x.dateTo)).sort((a,b)=>b.dateFrom.localeCompare(a.dateFrom))[0]||null}

function normalizeWeeklyPlans(){
 const names=new Map(db.agents.map(a=>[agentName(a).toLowerCase(),a.id]));
 for(const p of db.weeklyPlans||[]){
  if(!p.id)p.id=uid();
  if(!p.agentId)p.agentId=names.get(String(p.agent||'').toLowerCase())||'';
  if(!p.shift)p.shift='Standard';
  const supplied=IMPORTED_WEEKLY_PLANS.some(sp=>normalizeText(sp.agent||'')===normalizeText(p.agent||agentName(agentById(p.agentId))||'')&&Array.isArray(p.rows)&&p.rows.length);
  if(supplied&&p.shift==='Matin')p.shift='Standard';
  if(!p.effectiveFrom){const r=academicYearRange(activeAcademicYear());p.effectiveFrom=r.start;}
  if(!p.effectiveTo){const r=academicYearRange(activeAcademicYear());p.effectiveTo=r.end;}
  if(!p.dayProfiles)p.dayProfiles=deriveDayProfiles(p.rows||[]);
 }
}
function deriveDayProfiles(rows){
 const out={};
 for(let day=1;day<=5;day++){
  const seg=[];
  for(const r of rows||[]){
   const txt=String(r[day]||'').trim(); if(!txt)continue;
   const m=String(r[0]||'').match(/(\d{1,2})h?(\d{2})?\s*[-–]\s*(\d{1,2})h?(\d{2})?/i);
   if(m){const st=`${pad(+m[1])}:${m[2]||'00'}`,en=`${pad(+m[3])}:${m[4]||'00'}`;seg.push({start:st,end:en,task:txt});}
  }
  const work=seg.filter(x=>!/pause/i.test(x.task));
  const pause=seg.filter(x=>/pause/i.test(x.task)).reduce((n,x)=>n+Math.round(hoursBetween(x.start,x.end)*60),0);
  out[day]={start:work[0]?.start||'',end:work.at(-1)?.end||'',pause,missions:work.map(x=>x.task).filter((v,i,a)=>a.indexOf(v)===i).join(' · '),segments:seg};
 }
 return out;
}
function weeklyPlanFor(agentId,shift,date=''){
 normalizeWeeklyPlans();
 const plans=(db.weeklyPlans||[])
   .filter(p=>String(p.agentId)===String(agentId))
   .filter(p=>!date||((!p.effectiveFrom||p.effectiveFrom<=date)&&(!p.effectiveTo||p.effectiveTo>=date)))
   .sort((a,b)=>(b.effectiveFrom||'').localeCompare(a.effectiveFrom||''));
 return plans.find(p=>p.shift===shift)||plans.find(p=>p.shift==='Standard')||null;
}
function anyWeeklyPlanFor(agentId,date=''){normalizeWeeklyPlans();return (db.weeklyPlans||[]).filter(p=>String(p.agentId)===String(agentId)&&(!date||((!p.effectiveFrom||p.effectiveFrom<=date)&&(!p.effectiveTo||p.effectiveTo>=date)))).sort((a,b)=>(b.effectiveFrom||'').localeCompare(a.effectiveFrom||''))[0]||null}
function weeklyProfile(agentId,shift,weekday,date=''){const p=weeklyPlanFor(agentId,shift,date);return p?.dayProfiles?.[weekday]||null}
function exactWeeklyProfile(agentId,shift,weekday,date=''){normalizeWeeklyPlans();const p=(db.weeklyPlans||[]).filter(x=>String(x.agentId)===String(agentId)&&x.shift===shift&&(!date||((!x.effectiveFrom||x.effectiveFrom<=date)&&(!x.effectiveTo||x.effectiveTo>=date)))).sort((a,b)=>(b.effectiveFrom||'').localeCompare(a.effectiveFrom||''))[0];return p?.dayProfiles?.[weekday]||null}

function standardScheduleForAgent(agentId,date=todayISO()){
 const agent=agentById(agentId)||{};
 const wd=parseDate(date).getDay();
 normalizeWeeklyPlans();

 const plan=(db.weeklyPlans||[])
   .filter(x=>String(x.agentId)===String(agentId)&&x.shift==='Standard')
   .filter(x=>(!x.effectiveFrom||x.effectiveFrom<=date)&&(!x.effectiveTo||x.effectiveTo>=date))
   .sort((x,y)=>(y.effectiveFrom||'').localeCompare(x.effectiveFrom||''))[0]||null;

 if(plan){
   const p=plan.dayProfiles?.[wd]||{};
   if(p.start&&p.end)return {
     start:p.start,end:p.end,pause:Number(p.pause||0),missions:p.missions||'',
     source:'standard-plan',effectiveFrom:plan.effectiveFrom||'',effectiveTo:plan.effectiveTo||''
   };
   return {
     start:'',end:'',pause:0,missions:'',source:'standard-plan-rest',
     effectiveFrom:plan.effectiveFrom||'',effectiveTo:plan.effectiveTo||''
   };
 }

 const direct=agent.standardSchedule||{};
 return {
   start:String(direct.start||agent.standardStart||'').trim(),
   end:String(direct.end||agent.standardEnd||'').trim(),
   pause:Number(direct.pause??agent.standardPause??0)||0,
   missions:String(direct.missions||agent.standardMissions||'').trim(),
   source:'standard-agent-legacy'
 };
}
function syncAgentStandardPlan(agent,effectiveFrom=''){
 if(!agent?.id)return;
 const s=agent.standardSchedule||{};
 const start=String(s.start||'').trim(),end=String(s.end||'').trim();
 if(!start||!end)return;

 const range=academicYearRange(activeAcademicYear());
 const from=normalizeDateValue(effectiveFrom||s.effectiveFrom||range.start)||range.start;
 const workdays=(Array.isArray(agent.workdays)&&agent.workdays.length?agent.workdays:[1,2,3,4,5]).map(Number);

 db.weeklyPlans=Array.isArray(db.weeklyPlans)?db.weeklyPlans:[];
 const standards=db.weeklyPlans
   .filter(x=>String(x.agentId)===String(agent.id)&&x.shift==='Standard')
   .sort((x,y)=>(x.effectiveFrom||'').localeCompare(y.effectiveFrom||''));

 // Fermer uniquement la période Standard immédiatement précédente.
 const prev=standards.filter(x=>(x.effectiveFrom||'')<from).sort((x,y)=>(y.effectiveFrom||'').localeCompare(x.effectiveFrom||''))[0];
 if(prev){
   const prevEnd=addDays(from,-1);
   if(!prev.effectiveTo || prev.effectiveTo>=from)prev.effectiveTo=prevEnd;
 }

 // Si une période commence déjà exactement à cette date, on la met à jour.
 let p=standards.find(x=>x.effectiveFrom===from);
 if(!p){
   // Déterminer la fin : veille de la prochaine période, sinon fin d'année scolaire.
   const next=standards.filter(x=>(x.effectiveFrom||'')>from).sort((x,y)=>(x.effectiveFrom||'').localeCompare(y.effectiveFrom||''))[0];
   p={
     id:uid(),agentId:agent.id,agent:agentName(agent),shift:'Standard',
     effectiveFrom:from,
     effectiveTo:next?.effectiveFrom?addDays(next.effectiveFrom,-1):range.end,
     dayProfiles:{},rows:[],historyCreatedAt:new Date().toISOString()
   };
   db.weeklyPlans.push(p);
 }else{
   p.historyUpdatedAt=new Date().toISOString();
 }

 p.agent=agentName(agent);
 p.dayProfiles=p.dayProfiles||{};
 for(const wd of [1,2,3,4,5,6,0]){
   p.dayProfiles[wd]=workdays.includes(wd)
     ? {start,end,pause:Number(s.pause||0),missions:s.missions||'',segments:[]}
     : {start:'',end:'',pause:0,missions:'',segments:[]};
 }

 // Garder la fiche agent comme raccourci vers la valeur courante, sans supprimer l'historique.
 agent.standardSchedule={
   start,end,pause:Number(s.pause||0),missions:s.missions||'',effectiveFrom:from
 };
 agent.standardStart=start;agent.standardEnd=end;agent.standardPause=Number(s.pause||0);agent.standardMissions=s.missions||'';
}

function scheduledFor(agentId,date){
 const wd=parseDate(date).getDay();
 // Le calendrier personnel de l'agent est prioritaire : samedi/dimanche sont en repos par défaut.
 if(!agentWorkdays(agentId).includes(wd))return {shift:'Repos',start:'',end:'',pause:0,missions:''};
 const r=activeRotation(agentId,date);
 if(!r){
   const p=standardScheduleForAgent(agentId,date);
   if(p?.source==='standard-plan-rest')return {shift:'Repos',start:'',end:'',pause:0,missions:'',source:'standard-plan'};
   return p&&p.start&&p.end
     ? {shift:'Standard',start:p.start,end:p.end,pause:Number(p.pause||0),missions:p.missions||'',segments:p.segments||[],source:p.source||'standard'}
     : {shift:'Non planifié',start:'',end:'',pause:0,missions:''};
 }
 if(!(r.weekdays||[1,2,3,4,5]).map(Number).includes(wd))return {shift:'Repos',start:'',end:'',pause:0,missions:''};
 const ex=rotationException(agentId,date);if(ex){if(ex.shift==='Repos')return {shift:'Repos',start:'',end:'',pause:0,missions:ex.note||''};return {shift:ex.shift||'Horaire modifié',start:ex.start||'',end:ex.end||'',pause:Number(ex.pause||0),missions:ex.note||''}}
 const anchor=startOfWeek(r.effectiveFrom),diff=Math.floor((parseDate(startOfWeek(date))-parseDate(anchor))/604800000),mw=Math.max(1,Number(r.morningWeeks)||1),ew=Math.max(1,Number(r.eveningWeeks)||1),cycle=mw+ew;let pos=((diff%cycle)+cycle)%cycle;if(r.startShift==='Soir')pos=(pos+mw)%cycle;const shift=pos<mw?'Matin':'Soir';
 const p=exactWeeklyProfile(agentId,shift,wd,date);
 // Agent en roulement : aucune référence Standard ne doit être utilisée.
 // Le profil Matin/Soir exact du roulement est prioritaire, puis les heures portées par le roulement lui-même.
 if(!p?.start||!p?.end)return {shift,start:'',end:'',pause:0,missions:'Horaire à définir dans Pilotage des horaires',segments:[],source:'rotation-missing'};
 return {shift,start:p.start,end:p.end,pause:Number(p.pause||0),missions:p.missions||'',segments:p.segments||[],source:'rotation'};
}
function resolvedTheoreticalSchedule(agentId,date,dayType='Présence'){
 // Ordre unique : Permanence > Roulement > Standard > Repos/aucun.
 return cachedTheoreticalSchedule(agentId,date,dayType);
}
let theoreticalScheduleCache=new Map();
function clearTheoreticalScheduleCache(){theoreticalScheduleCache.clear()}
function cachedTheoreticalSchedule(agentId,date,dayType='Présence'){
 const key=`${agentId}|${date}|${dayType}`;
 if(theoreticalScheduleCache.has(key))return theoreticalScheduleCache.get(key);
 const value=theoreticalScheduleFor(agentId,date,dayType);
 theoreticalScheduleCache.set(key,value);
 return value;
}

function theoreticalScheduleFor(agentId,date,dayType='Présence'){
 const type=normalizeText(dayType||'Présence');
 if(type.includes('perman')){
   const p=permanenceScheduleForAgent(agentId);
   return {shift:'Permanence',start:p.start||'',end:p.end||'',pause:Number(p.pause||0),missions:'Horaire fixe de permanence',source:'permanence'};
 }
 return scheduledFor(agentId,date);
}
function dayRecord(agentId,date,preferredDayType=''){
  const records=(Array.isArray(db.agentDays)?db.agentDays:[]).filter(r=>String(r.agentId)===String(agentId)&&String(r.date)===String(date));
  if(!records.length)return null;
  // V147.82 — une saisie refusée/annulée ne doit jamais masquer le planning réel.
  // En cas d'anciens doublons, une saisie manuelle validée/demandée est prioritaire sur Chronotime.
  const effective=records.filter(r=>!['refusee','annulee'].includes(normalizeText(r.status||'')));
  const pool=effective.length?effective:records;
  const preferred=normalizeText(preferredDayType||'');
  const rank=r=>{
    let n=0;
    if(String(r.source||'').toLowerCase()==='manual'||r.manualOverride===true)n+=1000;
    if(isAbsenceType(r.dayType)||r.dayType==='Formation'||r.dayType==='Repos')n+=30;
    if(normalizeText(r.status||'')==='validee')n+=20;
    else if(normalizeText(r.status||'')==='demandee')n+=10;
    if(String(r.source||'').toLowerCase()==='chronotime')n+=5;
    return n;
  };
  const ordered=pool.slice().sort((a,b)=>rank(b)-rank(a)||String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')));
  if(preferred){const exact=ordered.find(r=>normalizeText(r.dayType||'')===preferred);if(exact)return exact}
  return ordered[0]||null;
}
function dayTypeOptions(current=''){
  const items=[...(db.lists?.dayTypes||[])];
  const value=String(current||'').trim();
  // Une pastille peut provenir d'un import (Chronotime ou ancienne donnée) avec un libellé
  // qui n'existe pas encore dans la liste standard. On l'ajoute au menu au lieu de laisser
  // le navigateur retomber silencieusement sur « Présence ».
  if(value&&!items.some(x=>String(x)===value))items.unshift(value);
  return selectOptions(items,value||'Présence');
}

// V147.11 — Reconstruit les pastilles du planning à partir des Chronotime déjà injectés.
// Cela permet aux anciens CA / RTT / RH / RFE / maladie / formation de réapparaître
// dans le roulement annuel, sans modifier la logique d'état des agents du tableau de bord.

// V147.19 — Permanences pendant les vacances scolaires.
// Chronotime fait foi : une durée de présence pendant une date de vacances = permanence.
function permanenceScheduleForAgent(agentId){
  const agent=(db.agents||[]).find(x=>String(x.id)===String(agentId))||{};
  const p=agent.permanenceSchedule||{};
  return {
    start:String(p.start||agent.permanenceStart||'').trim(),
    end:String(p.end||agent.permanenceEnd||'').trim(),
    pause:Number(p.pause??agent.permanencePause??0)||0
  };
}
function dateIsSchoolVacation(date){
  if(!date)return false;
  const active=activeAcademicYear();
  const range=academicYearRange(active);
  if(date<range.start||date>range.end)return false;
  return (db.vacations||[]).some(v=>{
    if(!v?.start||!v?.end)return false;
    const zoneOk=!v.zone||v.zone==='Toutes'||v.zone===(db.settings?.vacationZone||$('#vacationZone')?.value||'Zone A');
    return zoneOk&&date>=v.start&&date<=v.end;
  });
}
function upsertChronotimePermanence(c){
  if(!c?.agentId||!c?.date||!dateIsSchoolVacation(c.date))return 0;
  if(c.durationMinutes===null||c.durationMinutes===undefined)return 0;
  db.agentDays=Array.isArray(db.agentDays)?db.agentDays:[];
  const sched=permanenceScheduleForAgent(c.agentId);
  const rows=db.agentDays.filter(x=>String(x.agentId)===String(c.agentId)&&String(x.date)===String(c.date));
  const manualDay=rows.find(x=>String(x.source||'').toLowerCase()==='manual');
  if(manualDay)return 0;
  let day=rows.find(x=>x.source==='chronotime'||/Chronotime/i.test(String(x.note||'')))||rows[0]||null;

  // V147.148 — toute saisie manuelle reste prioritaire, y compris Présence + horaire réel.
  // Chronotime ne peut plus réécrire silencieusement une journée corrigée manuellement.
  if(day && String(day.source||'').toLowerCase()!=='chronotime' && !/Chronotime/i.test(String(day.note||''))) return 0;

  const values={
    dayType:'Permanence',
    plannedStart:sched.start,
    plannedEnd:sched.end,
    pause:sched.pause,
    status:'Validée',
    source:'chronotime',
    chronotimeType:'Permanence',
    note:`Permanence détectée par Chronotime pendant les vacances scolaires${c.sourceFile?' — '+c.sourceFile:''}`,
    noReplacementNeeded:false
  };
  if(!day){
    db.agentDays.push(Object.assign({
      id:uid(),agentId:c.agentId,date:c.date,
      actualStart:'',actualEnd:'',overtime:0,replacement:''
    },values));
    return 1;
  }
  const before=JSON.stringify([day.dayType,day.plannedStart,day.plannedEnd,day.pause,day.source]);
  Object.assign(day,values);
  const after=JSON.stringify([day.dayType,day.plannedStart,day.plannedEnd,day.pause,day.source]);
  return before===after?0:1;
}

function syncStoredChronotimePastilles(){
  if(!Array.isArray(db.chronotimeDaily)||!db.chronotimeDaily.length)return 0;
  db.agentDays=Array.isArray(db.agentDays)?db.agentDays:[];
  db.settings=db.settings||{};
  db.settings.chronoCodeMap=Object.assign({},db.settings.chronoCodeMap||{},{
    CA:'Congé annuel',RTT:'RTT',RH:'Repos',RFE:'Jour férié'
  });
  const canonicalCode=value=>{
    const raw=String(value||'').trim().toUpperCase().replace(/\s+/g,'');
    if(/^[LMSJVD](?:[1-9]|[12]\d|3[01])$/.test(raw))return '';
    if(/^CA(?:[-_]?\d+)?$/.test(raw))return 'CA';
    if(/^RTT(?:[-_]?\d+)?$/.test(raw))return 'RTT';
    if(/^RH(?:[-_]?\d+)?$/.test(raw))return 'RH';
    if(/^RFE(?:[-_]?\d+)?$/.test(raw))return 'RFE';
    return raw;
  };
  const canonicalType={CA:'Congé annuel',RTT:'RTT',RH:'Repos',RFE:'Jour férié'};
  let changed=0;

  for(const c of db.chronotimeDaily){
    if(!c?.agentId||!c?.date)continue;
    // Une durée pendant les vacances scolaires = journée de permanence.
    // Hors vacances, elle reste une présence normale et ne crée pas de pastille spéciale.
    if(c.durationMinutes!==null && c.durationMinutes!==undefined){
      changed+=upsertChronotimePermanence(c);
      continue;
    }

    const code=canonicalCode(c.value);
    if(!code)continue;
    // Pour les codes standards, le code GFI a priorité absolue sur un ancien dayType erroné.
    const mapped=canonicalType[code] || String(c.dayType||db.settings.chronoCodeMap?.[code]||'').trim();
    if(!mapped||mapped==='Présence')continue;

    if(c.value!==code && canonicalType[code]){c.value=code;changed++}
    if(c.dayType!==mapped){c.dayType=mapped;changed++}

    const rows=db.agentDays.filter(x=>String(x.agentId)===String(c.agentId)&&String(x.date)===String(c.date));
    const manualDay=rows.find(x=>String(x.source||'').toLowerCase()==='manual');
    if(manualDay)continue;
    let day=rows.find(x=>x.source==='chronotime'||/Chronotime/i.test(String(x.note||'')))||rows[0]||null;

    // V147.148 — ne jamais écraser automatiquement une saisie manuelle.
    // Cela protège aussi Présence, horaire réel, heures ajoutées/retirées, RTT, congé, maladie, etc.
    // Une divergence doit être traitée par l'écran de validation Chronotime.
    if(day && String(day.source||'').toLowerCase()!=='chronotime' &&
       !/Chronotime/i.test(String(day.note||''))) continue;

    if(!day){
      db.agentDays.push({
        id:uid(),agentId:c.agentId,date:c.date,dayType:mapped,
        plannedStart:'',plannedEnd:'',actualStart:'',actualEnd:'',
        pause:0,overtime:0,status:'Validée',replacement:'',
        noReplacementNeeded:['Repos','Jour férié'].includes(mapped),
        note:`Type de journée issu du Chronotime : ${c.sourceFile||''}`.trim(),
        source:'chronotime',chronotimeType:mapped,chronotimeImportedAt:c.importedAt||new Date().toISOString()
      });
      changed++;
    }else{
      const before=JSON.stringify([day.dayType,day.source,day.chronotimeType,day.noReplacementNeeded]);
      day.dayType=mapped;
      day.source='chronotime';
      day.chronotimeType=mapped;
      day.status='Validée';
      day.note=`Type de journée issu du Chronotime : ${c.sourceFile||''}`.trim();
      day.noReplacementNeeded=['Repos','Jour férié'].includes(mapped);
      const after=JSON.stringify([day.dayType,day.source,day.chronotimeType,day.noReplacementNeeded]);
      if(before!==after)changed++;
    }
  }
  return changed;
}
function dayInfo(agentId,date){
 const rec=dayRecord(agentId,date),type=rec?.dayType||'Présence',sched=resolvedTheoreticalSchedule(agentId,date,type);
 if(!rec)return {...sched,dayType:sched.shift==='Repos'?'Repos':'Présence',plannedStart:sched.start,plannedEnd:sched.end,actualStart:'',actualEnd:'',overtime:0,note:'',status:'Prévu'};
 return {...sched,...rec,plannedStart:sched.start||rec.plannedStart||'',plannedEnd:sched.end||rec.plannedEnd||'',pause:Number(sched.pause??rec.pause??0),theoreticalSource:sched.source||sched.shift||''};
}
function isAbsenceType(t){return t&&t!=='Présence'&&t!=='Formation'}
function dayCountingRule(dayType){
 const rules=db.settings?.chronoDayRules||{};
 if(dayType==='Maladie')return {mode:'fixed',hours:7};
 return rules[dayType]||{mode:'planned',hours:null};
}
function dayCountingLabel(dayType){
 const r=dayCountingRule(dayType);
 if(r.mode==='fixed')return `${fmtHours(r.hours||0)} fixes`;
 if(r.mode==='zero')return '0 h';
 return 'Horaires prévus';
}
function easterSundayISO(year){
 const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
 return `${year}-${pad(month)}-${pad(day)}`;
}
function frenchPublicHolidayName(date){
 const d=normalizeDateValue(date);if(!d)return'';const y=Number(d.slice(0,4));
 const fixed={
  [`${y}-01-01`]:'Jour de l’an',[`${y}-05-01`]:'Fête du Travail',[`${y}-05-08`]:'Victoire 1945',[`${y}-07-14`]:'Fête nationale',[`${y}-08-15`]:'Assomption',[`${y}-11-01`]:'Toussaint',[`${y}-11-11`]:'Armistice',[`${y}-12-25`]:'Noël'
 };
 if(fixed[d])return fixed[d];
 const easter=easterSundayISO(y),movable={};movable[addDays(easter,1)]='Lundi de Pâques';movable[addDays(easter,39)]='Ascension';movable[addDays(easter,50)]='Lundi de Pentecôte';
 return movable[d]||'';
}
function replacementNotificationAllowed(rec,date){
 const d=normalizeDateValue(date);if(!d)return false;const wd=parseDate(d).getDay();
 if(wd===0||wd===6)return false;
 if(frenchPublicHolidayName(d))return false;
 if(rec?.noReplacementNeeded===true)return false;
 const st=normalizeText(rec?.status||'');if(st==='refusee'||st==='annulee')return false;
 return true;
}
function dayHours(info){
 const planned=hoursBetween(info.plannedStart,info.plannedEnd,info.pause);
 const rule=dayCountingRule(info.dayType);
 let actual;
 if(rule?.mode==='fixed')actual=Math.max(0,Number(rule.hours||0));
 else if(rule?.mode==='zero')actual=0;
 else actual=(info.actualStart&&info.actualEnd)?hoursBetween(info.actualStart,info.actualEnd,info.pause):planned;
 // Règle métier : une journée Maladie compte 7 h au total dans « Réalisé ».
 if(info.dayType==='Maladie')actual=7;
 const total=actual+Number(info.overtime||0);
 // Une journée à 0 h ne crée pas de débit.
 // Une journée Maladie compte 7 h dans Réalisé mais ne génère AUCUN écart.
 const delta=info.dayType==='Maladie'?0:(Math.abs(total)<0.001?0:total-planned);
 return {planned,actual,total,delta}
}
function agentState(agent,date=todayISO()){const info=dayInfo(agent.id,date);if(isAbsenceType(info.dayType)||info.dayType==='Repos')return {label:info.dayType,kind:'absent',info};if(info.dayType==='Formation')return {label:'Formation',kind:'info',info};if(!info.plannedStart||!info.plannedEnd)return {label:'Non planifié',kind:'info',info};return {label:`${info.plannedStart}–${info.plannedEnd}`,kind:'present',info}}

/* ---------- Formulaires agents / planning ---------- */

function openAgentPermanence(agentId){
 const agent=byId('agents',agentId);if(!agent)return;
 const p=permanenceScheduleForAgent(agentId);
 openModal(`Horaire de permanence — ${agentName(agent)}`,`<div class="form-grid">
   <div class="span2 permanence-info"><strong>🟠 Horaire unique de permanence</strong><p class="hint">Cet horaire sera utilisé automatiquement pour les journées travaillées détectées par Chronotime pendant les vacances scolaires.</p></div>
   ${field('Début','permanenceStart',p.start||'','time','required')}
   ${field('Fin','permanenceEnd',p.end||'','time','required')}
   ${field('Pause (minutes)','permanencePause',p.pause||0,'number','min="0" step="5"')}
 </div>`,async form=>{
   agent.permanenceSchedule={
     start:String(form.elements.permanenceStart.value||'').trim(),
     end:String(form.elements.permanenceEnd.value||'').trim(),
     pause:Number(form.elements.permanencePause.value||0)
   };
   agent.permanenceStart=agent.permanenceSchedule.start;
   agent.permanenceEnd=agent.permanenceSchedule.end;
   agent.permanencePause=agent.permanenceSchedule.pause;
   syncStoredChronotimePastilles();
   const persisted=await commitFormRecordVerified('Horaire de permanence','agents',agent);if(!persisted.ok)return;
   closeModal();
   toast(`✅ Permanence ${agent.permanenceSchedule.start}–${agent.permanenceSchedule.end} enregistrée`);
 });
}

function openAgent(id){
 const old=id?byId('agents',id):null;
 const x=old||{id:uid(),no:nextNo('agent','AGT'),firstName:'',lastName:'',role:db.lists.roles[0],weeklyHours:35,email:'',phone:'',assignment:'',status:'Actif',arrivalDate:'',workdays:[1,2,3,4,5],notes:'',attachments:[]};
 x.attachments=x.attachments||[];x.workdays=Array.isArray(x.workdays)&&x.workdays.length?x.workdays.map(Number):[1,2,3,4,5];
 const range=academicYearRange(activeAcademicYear());
 const refDate=todayISO()>=range.start&&todayISO()<=range.end?todayISO():range.start;
 const stdExisting=standardScheduleForAgent(x.id,refDate);
 const stdPlans=(db.weeklyPlans||[]).filter(p=>String(p.agentId)===String(x.id)&&p.shift==='Standard').sort((p,q)=>(p.effectiveFrom||'').localeCompare(q.effectiveFrom||''));
 const currentPlan=stdPlans.filter(p=>(!p.effectiveFrom||p.effectiveFrom<=refDate)&&(!p.effectiveTo||p.effectiveTo>=refDate)).sort((p,q)=>(q.effectiveFrom||'').localeCompare(p.effectiveFrom||''))[0];
 x.standardSchedule={start:stdExisting.start||'',end:stdExisting.end||'',pause:Number(stdExisting.pause||0),missions:stdExisting.missions||'',effectiveFrom:currentPlan?.effectiveFrom||range.start};
 const standardHistoryHtml=stdPlans.length?`<div class="standard-history-list">${stdPlans.map(p=>{const wd=Object.values(p.dayProfiles||{}).find(v=>v?.start&&v?.end)||{};return `<div class="standard-history-row"><strong>${fmtDate(p.effectiveFrom)||'—'} → ${fmtDate(p.effectiveTo)||'—'}</strong><span>${wd.start&&wd.end?`${esc(wd.start)}–${esc(wd.end)}`:'Repos'}</span>${wd.pause?`<small>Pause ${Number(wd.pause)} min</small>`:''}<button type="button" class="ghost small" data-delete-standard-plan="${esc(p.id)}">🗑 Supprimer</button></div>`}).join('')}</div>`:'<p class="hint">Aucun historique Standard enregistré.</p>';
 const dayLabels=[['Lundi',1],['Mardi',2],['Mercredi',3],['Jeudi',4],['Vendredi',5],['Samedi',6],['Dimanche',0]];
 openModal(old?'Modifier l’agent':'Nouvel agent',`<div class="form-grid">${field('Prénom','firstName',x.firstName,'text','required')}${field('Nom','lastName',x.lastName)}<label>Fonction<select name="role">${selectOptions(db.lists.roles,x.role)}</select></label>${field('Temps hebdomadaire (h)','weeklyHours',x.weeklyHours,'number','min="0" step="0.25"')}${field('Téléphone','phone',x.phone,'tel')}${field('E-mail','email',x.email,'email')}${field('Affectation principale','assignment',x.assignment)}<label>Statut<select name="status">${selectOptions(['Actif','Inactif'],x.status)}</select></label>${field('Date d’arrivée','arrivalDate',x.arrivalDate,'date')}<fieldset class="span2 standard-config"><legend>🔵 Horaire standard théorique</legend><p class="hint">Utilisé quand l’agent n’est ni en permanence ni en roulement. Toute modification crée une nouvelle période et conserve l’ancien horaire.</p><div class="form-grid">${field('Date d’effet','standardEffectiveFrom',x.standardSchedule?.effectiveFrom||range.start,'date','required')}${field('Début standard','standardStart',x.standardSchedule?.start||'','time')}${field('Fin standard','standardEnd',x.standardSchedule?.end||'','time')}${field('Pause standard (min)','standardPause',x.standardSchedule?.pause??0,'number','min="0" step="5"')}${field('Mission standard','standardMissions',x.standardSchedule?.missions||'')}</div><details class="standard-history"><summary>Historique des horaires Standard (${stdPlans.length})</summary>${standardHistoryHtml}</details></fieldset><fieldset class="span2 permanence-config"><legend>🟠 Horaire de permanence</legend><p class="hint">Horaire fixe utilisé automatiquement lorsque Chronotime détecte une journée travaillée pendant les vacances scolaires.</p><div class="form-grid">${field('Début permanence','permanenceStart',x.permanenceSchedule?.start||x.permanenceStart||'','time')}${field('Fin permanence','permanenceEnd',x.permanenceSchedule?.end||x.permanenceEnd||'','time')}${field('Pause permanence (min)','permanencePause',x.permanenceSchedule?.pause??x.permanencePause??0,'number','min="0" step="5"')}</div></fieldset><fieldset class="span2"><legend>Jours travaillés habituels</legend><p class="hint">Par défaut : lundi à vendredi. Décoche un jour pour qu'il apparaisse automatiquement en Repos.</p>${dayLabels.map(([label,d])=>`<label class="inline-check"><input type="checkbox" name="agentWorkday" value="${d}" ${x.workdays.includes(d)?'checked':''}>${label}</label>`).join('')}</fieldset>${textareaField('Notes','notes',x.notes)}${attachmentField(x.attachments)}</div>`,async form=>{
   Object.assign(x,formDataObj(form),{weeklyHours:Number(form.elements.weeklyHours.value||0),workdays:[...form.querySelectorAll('[name="agentWorkday"]:checked')].map(e=>Number(e.value))});
   x.standardSchedule={
     start:String(form.elements.standardStart?.value||'').trim(),
     end:String(form.elements.standardEnd?.value||'').trim(),
     pause:Number(form.elements.standardPause?.value||0),
     missions:String(form.elements.standardMissions?.value||'').trim(),
     effectiveFrom:normalizeDateValue(form.elements.standardEffectiveFrom?.value||'')||range.start
   };
   x.standardStart=x.standardSchedule.start;
   x.standardEnd=x.standardSchedule.end;
   x.standardPause=x.standardSchedule.pause;
   x.standardMissions=x.standardSchedule.missions;
   if((x.standardSchedule.start&&!x.standardSchedule.end)||(!x.standardSchedule.start&&x.standardSchedule.end)){toast('Horaire standard : renseignez le début et la fin');return}
   x.permanenceSchedule={
     start:String(form.elements.permanenceStart?.value||'').trim(),
     end:String(form.elements.permanenceEnd?.value||'').trim(),
     pause:Number(form.elements.permanencePause?.value||0)
   };
   x.permanenceStart=x.permanenceSchedule.start;
   x.permanenceEnd=x.permanenceSchedule.end;
   x.permanencePause=x.permanenceSchedule.pause;
   const attachmentCheck=await processAttachments(form,x,'agents');if(!attachmentCheck?.ok)return;
   if(old){for(const r of db.rotations.filter(r=>String(r.agentId)===String(x.id))){r.weekdays=(r.weekdays||[]).map(Number).filter(d=>x.workdays.includes(d))}}

   // V147.148 — La fiche Agent ne peut plus créer silencieusement un deuxième
   // horaire théorique sur une date déjà couverte.
   const standardFrom=x.standardSchedule.effectiveFrom;
   const exactStandard=(db.weeklyPlans||[]).find(q=>
     String(q.agentId)===String(x.id)&&q.shift==='Standard'&&String(q.effectiveFrom||'')===String(standardFrom)
   );
   const coveringPlans=(db.weeklyPlans||[]).filter(q=>
     String(q.agentId)===String(x.id) &&
     (!exactStandard||String(q.id)!==String(exactStandard.id)) &&
     weeklyPlanRangeOverlap(standardFrom,standardFrom,q.effectiveFrom,q.effectiveTo)
   );

   if(coveringPlans.length){
     const details=coveringPlans.map(q=>`• ${fmtDate(q.effectiveFrom)} → ${fmtDate(q.effectiveTo)} (${q.shift||'Standard'})`).join('\n');
     if(!confirm(`⚠️ Un horaire théorique existe déjà pour ${agentName(x)} à la date du ${fmtDate(standardFrom)}.\n\n${details}\n\nVoulez-vous le remplacer à partir de cette date ?`)){
       toast('Horaire théorique inchangé');
       return {ok:false};
     }
     // À partir de la date d'effet jusqu'à la fin de la période existante,
     // on laisse syncAgentStandardPlan créer/mettre à jour la nouvelle période
     // après avoir coupé les chevauchements à cette date.
     const rangeEnd=academicYearRange(activeAcademicYear()).end;
     removeWeeklyPlanOverlap(x.id,standardFrom,rangeEnd,exactStandard?.id||'');
   }

   syncAgentStandardPlan(x,x.standardSchedule.effectiveFrom);
   refreshAgentStandardShortcut(x.id,x.standardSchedule.effectiveFrom);
   clearTheoreticalScheduleCache();
   syncStoredChronotimePastilles();
   const persisted=await commitFormRecordVerified('Agent','agents',x);if(!persisted.ok)return;
   closeModal();toast(`✅ Agent enregistré — horaire Standard applicable à partir du ${fmtDate(x.standardSchedule.effectiveFrom)}`);
 },{audit:{track:!!old,type:'Agent',recordId:x.id,agentId:x.id,agentName:agentName(x),entity:(form)=>[form?.elements?.firstName?.value||x.firstName,form?.elements?.lastName?.value||x.lastName].filter(Boolean).join(' '),date:x.arrivalDate||todayISO()},onDelete:old?()=>deleteRecord('agents',x.id,'agent'):null})

 setTimeout(()=>{
   $$('[data-delete-standard-plan]',$('#modalBody')).forEach(btn=>{
     btn.onclick=async()=>{
       const planId=btn.dataset.deleteStandardPlan;
       await deleteWeeklyPlanById(planId);
     };
   });
 },0);
}
function applyWeekendRestToAll(){
 if(!confirm('Mettre le samedi et le dimanche en repos pour tous les agents ? Les horaires du lundi au vendredi seront conservés.'))return;
 for(const a of db.agents){a.workdays=(Array.isArray(a.workdays)&&a.workdays.length?a.workdays:[1,2,3,4,5]).map(Number).filter(d=>d!==0&&d!==6);if(!a.workdays.length)a.workdays=[1,2,3,4,5]}
 for(const r of db.rotations||[])r.weekdays=(r.weekdays||[1,2,3,4,5]).map(Number).filter(d=>d!==0&&d!==6);
 for(const p of db.weeklyPlans||[]){if(p.dayProfiles){p.dayProfiles[6]={start:'',end:'',pause:0,missions:'',segments:[]};p.dayProfiles[0]={start:'',end:'',pause:0,missions:'',segments:[]}}}
 save();renderAll();toast('Samedi et dimanche mis en repos pour tous les agents');
}
function openRotation(id,agentId=''){const old=id?byId('rotations',id):null;const x=old||{id:uid(),no:nextNo('rotation','RLT'),agentId:agentId||db.agents[0]?.id,effectiveFrom:startOfWeek(todayISO()),effectiveTo:'',startShift:'Matin',morningWeeks:2,eveningWeeks:2,pause:30,weekdays:[1,2,3,4,5],notes:''};openModal(old?'Modifier le roulement':'Nouveau roulement avec date d’effet',`<div class="notice"><strong>Horaires synchronisés :</strong> les heures Matin et Soir ne se règlent plus ici. Elles sont reprises exclusivement depuis <b>Pilotage des horaires</b> pour éviter toute différence entre les deux écrans.</div><div class="form-grid"><label>Agent<select name="agentId" required>${agentOptions(x.agentId)}</select></label>${field('Date d’effet','effectiveFrom',x.effectiveFrom,'date','required')}${field('Date de fin (facultatif)','effectiveTo',x.effectiveTo,'date')}<label>Commence par<select name="startShift">${selectOptions(['Matin','Soir'],x.startShift)}</select></label>${field('Nombre de semaines du matin','morningWeeks',x.morningWeeks,'number','min="1" max="12"')}${field('Nombre de semaines du soir','eveningWeeks',x.eveningWeeks,'number','min="1" max="12"')}<fieldset class="span2"><legend>Jours travaillés</legend>${[1,2,3,4,5,6,0].map((d,i)=>`<label class="inline-check"><input type="checkbox" name="weekday" value="${d}" ${(x.weekdays||[]).map(Number).includes(d)?'checked':''}>${['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d]}</label>`).join('')}</fieldset>${textareaField('Notes','notes',x.notes)}</div>`,async form=>{const o=formDataObj(form);const weekdays=[...form.querySelectorAll('[name="weekday"]:checked')].map(e=>Number(e.value));if(!o.agentId){toast('Choisissez un agent');return}const missing=[];for(const shift of ['Matin','Soir']){if(!weekdays.some(wd=>{const p=exactWeeklyProfile(o.agentId,shift,wd,o.effectiveFrom);return p?.start&&p?.end}))missing.push(shift)}if(missing.length){toast(`Créez d’abord le profil ${missing.join(' et ')} dans Pilotage des horaires`);return}Object.assign(x,o,{morningWeeks:Number(o.morningWeeks),eveningWeeks:Number(o.eveningWeeks),weekdays});const persisted=await commitFormRecordVerified('Roulement','rotations',x);if(!persisted.ok)return;closeModal();toast('✅ Roulement enregistré — horaires synchronisés avec Pilotage des horaires')},{onDelete:old?()=>deleteRecord('rotations',x.id,'roulement'):null})}

function openRotationException(id){const old=id?byId('rotationExceptions',id):null;const x=old||{id:uid(),agentId:db.agents[0]?.id,dateFrom:todayISO(),dateTo:todayISO(),shift:'Horaire personnalisé',start:'',end:'',pause:30,note:''};openModal(old?'Modifier l’exception':'Exception de roulement',`<div class="form-grid"><label>Agent<select name="agentId">${agentOptions(x.agentId)}</select></label>${field('Du','dateFrom',x.dateFrom,'date','required')}${field('Au','dateTo',x.dateTo,'date','required')}<label>Service<select name="shift">${selectOptions(['Matin','Soir','Horaire personnalisé','Repos'],x.shift)}</select></label>${field('Arrivée','start',x.start,'time')}${field('Départ','end',x.end,'time')}${field('Pause (min)','pause',x.pause,'number','min="0"')}${textareaField('Motif','note',x.note)}</div>`,async form=>{const o=formDataObj(form);Object.assign(x,o,{pause:Number(o.pause||0)});const persisted=await commitFormRecordVerified('Exception de roulement','rotationExceptions',x);if(!persisted.ok)return;closeModal();toast('✅ Exception enregistrée')},{onDelete:old?()=>deleteRecord('rotationExceptions',x.id,'exception'):null})}
function updateDayCalc(){
 const f=$('#modalForm'), box=$('#dayCalc'); if(!f||!box||!f.elements.plannedStart)return;
 const dayType=f.elements.dayType?.value||'Présence';
 const rule=dayCountingRule(dayType);
 const plannedStart=f.elements.plannedStart.value, plannedEnd=f.elements.plannedEnd.value;
 const actualStart=f.elements.actualStart.value, actualEnd=f.elements.actualEnd.value;
 const pause=Number(f.elements.pause.value||0), overtime=Number(f.elements.overtime.value||0);
 const planned=(plannedStart&&plannedEnd)?hoursBetween(plannedStart,plannedEnd,pause):0;
 let actual=planned;
 if(rule.mode==='fixed')actual=Math.max(0,Number(rule.hours||0));
 else if(rule.mode==='zero')actual=0;
 else if(actualStart&&actualEnd)actual=hoursBetween(actualStart,actualEnd,pause);
 const total=actual+overtime, delta=total-planned;
 if(rule.mode==='fixed'){
   box.innerHTML=`<strong>Comptabilisation — ${esc(dayType)}</strong><span>Règle : ${esc(dayCountingLabel(dayType))}</span>${plannedStart&&plannedEnd?`<span>Horaire prévu conservé : ${esc(plannedStart)}–${esc(plannedEnd)}</span>`:''}<b>Comptabilisé : ${fmtHours(total)}</b>`;return;
 }
 if(rule.mode==='zero'){
   box.innerHTML=`<strong>Comptabilisation — ${esc(dayType)}</strong><span>Règle : 0 h</span><b>Comptabilisé : ${fmtHours(total)}</b>`;return;
 }
 if(!plannedStart||!plannedEnd){box.innerHTML=`<strong>Horaires prévus à définir</strong><span>La règle « ${esc(dayType)} » conserve les horaires prévus. Définissez-les dans Pilotage des horaires ou renseignez-les ici.</span>`;return}
 box.innerHTML=`<strong>Comptabilisation — ${esc(dayType)}</strong><span>Règle : Horaires prévus</span><span>Prévu : ${fmtHours(planned)}</span><span>Comptabilisé : ${fmtHours(total)}</span><b>Écart : ${delta>=0?'+':''}${fmtHours(delta)}</b>`;
}


function agentAnnualScheduleSummary(agentId,focusDate=''){
 normalizeWeeklyPlans();
 const aid=String(agentId||'');
 const plans=(db.weeklyPlans||[]).filter(p=>String(p.agentId)===aid).sort((a,b)=>(a.effectiveFrom||'').localeCompare(b.effectiveFrom||''));
 if(!plans.length)return `<div class="annual-theoretical-card empty"><strong>Horaires théoriques enregistrés</strong><span>Aucun planning annuel enregistré pour cet agent.</span></div>`;
 const dayNames={1:'Lundi',2:'Mardi',3:'Mercredi',4:'Jeudi',5:'Vendredi',6:'Samedi',0:'Dimanche'};
 const today=focusDate||todayISO();
 return `<div class="annual-theoretical-card"><div class="annual-theoretical-head"><div><strong>🕒 Horaires théoriques enregistrés</strong><small>Ils proviennent de « Pilotage des horaires ».</small></div></div>${plans.map(p=>{
   const active=(!p.effectiveFrom||p.effectiveFrom<=today)&&(!p.effectiveTo||p.effectiveTo>=today);
   const future=!active&&p.effectiveFrom&&p.effectiveFrom>today;
   const rows=[1,2,3,4,5,6,0].map(d=>{const x=p.dayProfiles?.[d]||{};return `<div class="annual-theoretical-day"><span>${dayNames[d]}</span><b>${x.start&&x.end?`${esc(x.start)} – ${esc(x.end)}`:'Repos / non travaillé'}</b>${x.pause?`<small>Pause ${Number(x.pause)} min</small>`:''}${x.missions?`<small>${esc(x.missions)}</small>`:''}</div>`}).join('');
   return `<section class="annual-theoretical-period ${active?'is-active':future?'is-future':''}"><div class="annual-theoretical-period-head"><span>${badge(p.shift||'Standard')}</span><strong>${fmtDate(p.effectiveFrom)||'—'} → ${fmtDate(p.effectiveTo)||'—'}</strong><small>${active?'Applicable à la date sélectionnée':future?'Prochain planning enregistré':'Planning archivé / hors période'}</small>${p.shift==='Standard'?`<button type="button" class="danger small delete-standard-period" data-delete-standard-period="${esc(p.id)}">🗑️ Supprimer cette période</button>`:''}</div><div class="annual-theoretical-grid">${rows}</div></section>`;
 }).join('')}</div>`;
}


function deleteStandardSchedulePeriod(planId){
 const plan=(db.weeklyPlans||[]).find(p=>String(p.id)===String(planId));
 if(!plan||plan.shift!=='Standard'){toast('Période Standard introuvable');return false}
 const ag=agentById(plan.agentId);
 const label=`${fmtDate(plan.effectiveFrom)||'—'} → ${fmtDate(plan.effectiveTo)||'—'}`;
 if(!confirm(`Supprimer uniquement cette période Standard ?\n\n${agentName(ag)}\n${label}\n\nLes autres périodes et les anciens horaires resteront conservés.`))return false;

 const deletedEnd=plan.effectiveTo||'';
 db.weeklyPlans=(db.weeklyPlans||[]).filter(p=>String(p.id)!==String(planId));

 // Recoller proprement l'historique Standard autour de la période supprimée.
 const standards=(db.weeklyPlans||[])
   .filter(p=>String(p.agentId)===String(plan.agentId)&&p.shift==='Standard')
   .sort((x,y)=>(x.effectiveFrom||'').localeCompare(y.effectiveFrom||''));

 for(let i=0;i<standards.length;i++){
   const cur=standards[i],next=standards[i+1];
   if(next?.effectiveFrom){
     cur.effectiveTo=addDays(next.effectiveFrom,-1);
   }
 }
 const previous=standards.filter(p=>(p.effectiveFrom||'')<(plan.effectiveFrom||'')).at(-1);
 const next=standards.find(p=>(p.effectiveFrom||'')>(plan.effectiveFrom||''));
 if(previous&&!next&&deletedEnd)previous.effectiveTo=deletedEnd;

 // Recalculer le raccourci Standard de la fiche agent sans recréer la période supprimée.
 if(ag){
   const ref=todayISO();
   const active=standards.filter(p=>(!p.effectiveFrom||p.effectiveFrom<=ref)&&(!p.effectiveTo||p.effectiveTo>=ref))
     .sort((x,y)=>(y.effectiveFrom||'').localeCompare(x.effectiveFrom||''))[0]||standards.at(-1)||null;
   const profile=active ? Object.values(active.dayProfiles||{}).find(x=>x?.start&&x?.end) : null;
   if(profile){
     ag.standardSchedule={start:profile.start||'',end:profile.end||'',pause:Number(profile.pause||0),missions:profile.missions||'',effectiveFrom:active.effectiveFrom||''};
     ag.standardStart=profile.start||'';ag.standardEnd=profile.end||'';ag.standardPause=Number(profile.pause||0);ag.standardMissions=profile.missions||'';
   }else{
     ag.standardSchedule={start:'',end:'',pause:0,missions:'',effectiveFrom:''};
     ag.standardStart='';ag.standardEnd='';ag.standardPause=0;ag.standardMissions='';
   }
 }

 save(true);
 safeRenderAll();

 const annualBox=$('#annualTheoreticalSummary');
 const form=$('#modalForm');
 if(annualBox&&form?.elements?.agentId){
   annualBox.innerHTML=agentAnnualScheduleSummary(form.elements.agentId.value,form.elements.dateFrom?.value||todayISO());
 }
 if(typeof refreshTheoretical==='function'){
   try{refreshTheoretical(true)}catch(_){}
 }
 toast('✅ Période Standard supprimée — historique recalculé');
 return true;
}


function agentDayAuditBaseline(x,dateFrom,dateTo){
 return {
   agentId:String(x?.agentId||''),
   dayType:String(x?.dayType||'Présence'),
   dateFrom:String(dateFrom||x?.date||''),
   dateTo:String(dateTo||x?.date||''),
   status:String(x?.status||'Validée'),
   plannedStart:String(x?.plannedStart||''),
   plannedEnd:String(x?.plannedEnd||''),
   // S'il n'existait pas encore d'horaire réel, l'horaire théorique est la référence "Avant".
   actualStart:String(x?.actualStart||x?.plannedStart||''),
   actualEnd:String(x?.actualEnd||x?.plannedEnd||''),
   pause:String(x?.pause??''),
   overtime:String(x?.overtime??0),
   replacement:String(x?.replacement||''),
   noReplacementNeeded:!!x?.noReplacementNeeded,
   note:String(x?.note||'')
 };
}
function agentDayAuditChanges(before,o){
 const after={
   agentId:String(o.agentId||''),
   dayType:String(o.dayType||'Présence'),
   dateFrom:String(o.dateFrom||''),
   dateTo:String(o.dateTo||''),
   status:String(o.status||'Validée'),
   plannedStart:String(o.plannedStart||''),
   plannedEnd:String(o.plannedEnd||''),
   actualStart:String(o.actualStart||o.plannedStart||''),
   actualEnd:String(o.actualEnd||o.plannedEnd||''),
   pause:String(o.pause??''),
   overtime:String(o.overtime??0),
   replacement:String(o.replacement||''),
   noReplacementNeeded:!!o.noReplacementNeeded,
   note:String(o.note||'')
 };
 const fields=['agentId','dayType','dateFrom','dateTo','status','plannedStart','plannedEnd',
   'actualStart','actualEnd','pause','overtime','replacement','noReplacementNeeded','note'];
 return fields.filter(f=>historyComparable(before[f])!==historyComparable(after[f]))
   .map(f=>({field:f,oldValue:before[f],newValue:after[f]}));
}
function removeAgentDayHistoryForReset(agentId,date){
 db.changeHistory=Array.isArray(db.changeHistory)?db.changeHistory:[];
 db.changeHistory=db.changeHistory.filter(h=>{
   if(changeHistoryType(h)!=='Agent')return true;
   const sameAgent=String(h.agentId||'')===String(agentId||'') ||
      changeHistoryEntity(h)===agentName(agentById(agentId));
   const sameDate=(h.pastDates||[]).includes(date);
   if(!sameAgent||!sameDate)return true;
   const fs=new Set((h.changes||[]).map(c=>c.field));
   return !(fs.has('actualStart')||fs.has('actualEnd')||fs.has('overtime'));
 });
}
function verifyAgentDaySaved(agentId,date,expected={}){
 const rec=dayRecord(agentId,date,expected.dayType||'');
 if(!rec)return {ok:false,reason:'Journée introuvable après enregistrement'};
 const fields=['dayType','plannedStart','plannedEnd','actualStart','actualEnd','note','status','replacement'];
 for(const f of fields){
   if(expected[f]!==undefined && String(rec[f]??'')!==String(expected[f]??'')){
     return {ok:false,reason:`${f} non conservé`};
   }
 }
 for(const f of ['pause','overtime']){
   if(expected[f]!==undefined && Math.abs(Number(rec[f]||0)-Number(expected[f]||0))>0.0001){
     return {ok:false,reason:`${f} non conservé`};
   }
 }
 if(expected.manualOverride!==undefined && Boolean(rec.manualOverride)!==Boolean(expected.manualOverride)){
   return {ok:false,reason:'priorité manuelle non conservée'};
 }
 if(expected.realScheduleReset!==undefined && Boolean(rec.realScheduleReset)!==Boolean(expected.realScheduleReset)){
   return {ok:false,reason:'réinitialisation horaire réel non conservée'};
 }
 if(String(rec.source||'').toLowerCase()!=='manual')return {ok:false,reason:'source manuelle non conservée'};
 return {ok:true,record:rec};
}
function openAgentDay(agentId,date,id,preferredDayType=''){
 const clicked=id?byId('agentDays',id):dayRecord(agentId,date,preferredDayType);
 const periodId=clicked?.periodId||'';
 const periodRows=periodId?db.agentDays.filter(x=>x.periodId===periodId):[];
 const old=clicked;
 const initialAgentId=clicked?.agentId||agentId||db.agents[0]?.id;
 const initialDate=clicked?.date||date||todayISO();
 const initialType=clicked?.dayType||preferredDayType||'Présence';
 const sched=resolvedTheoreticalSchedule(initialAgentId,initialDate,initialType);
 const x=old?Object.assign({},old,{plannedStart:sched.start||old.plannedStart||'',plannedEnd:sched.end||old.plannedEnd||'',pause:Number(sched.pause??old.pause??0),theoreticalSource:sched.source||sched.shift||''}):{id:uid(),agentId:initialAgentId,date:initialDate,dayType:initialType,plannedStart:sched.start,plannedEnd:sched.end,actualStart:'',actualEnd:'',pause:sched.pause,overtime:0,status:'Validée',note:'',replacement:'',noReplacementNeeded:false,theoreticalSource:sched.source||sched.shift||''};
 const dateFrom=periodRows.length?periodRows.map(r=>r.date).sort()[0]:x.date;
 const dateTo=periodRows.length?periodRows.map(r=>r.date).sort().at(-1):x.date;
 const agentDayAuditBefore=agentDayAuditBaseline(x,dateFrom,dateTo);
 openModal(`${agentName(agentById(x.agentId))} — saisie planning`,`<div id="annualTheoreticalSummary">${agentAnnualScheduleSummary(x.agentId,initialDate)}</div><div class="day-shortcuts"><button type="button" data-set-day="Congé annuel">Congé</button><button type="button" data-set-day="RTT">RTT</button><button type="button" data-set-day="Maladie">Maladie</button><button type="button" data-set-day="Présence">Présence</button></div><div class="theoretical-schedule" id="theoreticalSchedule"></div><div class="form-grid"><label>Agent<select name="agentId">${agentOptions(x.agentId)}</select></label><label>Type de journée<select name="dayType">${dayTypeOptions(x.dayType)}</select></label>${field('Du','dateFrom',dateFrom,'date','required')}${field('Au','dateTo',dateTo,'date','required')}<label>Statut<select name="status">${selectOptions(['Demandée','Validée','Refusée','Annulée'],x.status||'Validée')}</select></label>${field('Horaire théorique — arrivée','plannedStart',x.plannedStart,'time')}${field('Horaire théorique — départ','plannedEnd',x.plannedEnd,'time')}${field('Horaire réel — arrivée','actualStart',x.actualStart,'time')}${field('Horaire réel — départ','actualEnd',x.actualEnd,'time')}<div class="full-width"><button type="button" class="ghost" id="resetRealSchedule">↩ Réinitialiser l’horaire réel</button><p class="hint">Efface uniquement l’horaire réel et remet l’affichage sur l’horaire théorique de cette journée.</p></div>${field('Pause (minutes)','pause',x.pause,'number','min="0" step="5"')}${field('Heures supplémentaires (+) / retirées (-)','overtime',x.overtime,'number','step="0.25"')}<label class="full-width replacement-choice"><span>Gestion du remplacement</span><span class="checkbox-row"><input type="checkbox" name="noReplacementNeeded" ${x.noReplacementNeeded?'checked':''}> Aucun remplacement nécessaire pendant cette période</span></label>${field('Remplacement / relais','replacement',x.replacement||'')}<div class="full-width manual-info-box"><strong>ⓘ Informations / Motif</strong><p class="hint">Informations facultatives pour préciser une modification manuelle : RTT, congé, maladie, ajout/retrait d’heures ou changement d’horaire.</p>${textareaField('Informations / Motif','note',x.note)}</div></div><p class="hint">Aucune notification de remplacement n’est créée le samedi, le dimanche ou un jour férié. Si la case « Aucun remplacement nécessaire » est cochée, aucune notification de remplacement ne sera créée pour toute la période.</p><div class="calculation-preview" id="dayCalc"></div>`,async form=>{const o=formDataObj(form);
 const from=o.dateFrom, to=o.dateTo;
 if(!o.agentId){toast('Choisissez un agent');return}
 if(!from||!to){toast('Renseignez les dates du et au');return}
 if(to<from){toast('La date de fin doit être après la date de début');return}
 if(from!==to && (o.actualStart||o.actualEnd||Math.abs(Number(o.overtime||0))>0.0001)){
   toast('Les horaires réels et heures ajoutées/retirées se saisissent sur une seule journée. Choisissez la même date dans Du et Au.');
   return;
 }
 const activeYear=activeAcademicYear();
 if(!academicYearContains(activeYear,from)||!academicYearContains(activeYear,to)){
   toast(`⚠️ Cette période n’appartient pas à l’année scolaire ${activeYear}. Changez l’année scolaire du tableau de bord avant de l’enregistrer.`);
   return;
 }
 const isPeriod=isAbsenceType(o.dayType)||['Formation','Repos'].includes(o.dayType);
 // V147.148 — le champ Informations / Motif reste disponible mais ne bloque jamais l'enregistrement.
 const manualHoursChanged=Math.abs(Number(o.overtime||0))>0.0001;
 const manualActualChanged=!!(o.actualStart||o.actualEnd);
 const manualTypeChanged=String(o.dayType||'Présence')!=='Présence';
 if((manualHoursChanged||manualActualChanged||manualTypeChanged)&&!String(o.note||'').trim()){
   // On conserve volontairement une note vide : aucune justification fictive n'est créée.
 }
 if(!Array.isArray(db.agentDays))db.agentDays=[];
 const countingRule=dayCountingRule(o.dayType);
 // Congé, RTT, formation et autres types doivent toujours pouvoir être enregistrés.
 // Quand la règle vaut « Horaires prévus », on conserve/reprend le Pilotage des horaires.
 if(countingRule.mode==='planned'){
   const firstSchedule=resolvedTheoreticalSchedule(o.agentId,from,o.dayType);
   o.plannedStart=o.plannedStart||firstSchedule.start||'';
   o.plannedEnd=o.plannedEnd||firstSchedule.end||'';
   if(o.dayType==='Présence'&&(!o.plannedStart||!o.plannedEnd)){toast('Aucun horaire théorique trouvé : renseignez arrivée et départ, ou créez les horaires de référence');return}
   if((o.actualStart&&!o.actualEnd)||(!o.actualStart&&o.actualEnd)){toast('Pour un horaire réel, renseignez à la fois l’arrivée et le départ');return}
 }
 if(periodId)db.agentDays=db.agentDays.filter(r=>r.periodId!==periodId);
 else if(old)db.agentDays=db.agentDays.filter(r=>r.id!==old.id);
 const newPeriodId=(isPeriod||from!==to)?uid():'';
 let d=from,added=0;
 while(d<=to){
   const weekday=![0,6].includes(parseDate(d).getDay());
   const shouldSaveDay=(from===to)||!isPeriod||weekday;
   if(shouldSaveDay){
     db.agentDays=db.agentDays.filter(r=>!(String(r.agentId)===String(o.agentId)&&r.date===d));
     const sc=resolvedTheoreticalSchedule(o.agentId,d,o.dayType), sameStart=d===from;
     const rule=dayCountingRule(o.dayType);
     const pStart=rule.mode==='planned'?((from===to?o.plannedStart:'')||sc.start||o.plannedStart||''):(from===to?(o.plannedStart||''):'');
     const pEnd=rule.mode==='planned'?((from===to?o.plannedEnd:'')||sc.end||o.plannedEnd||''):(from===to?(o.plannedEnd||''):'');
     const rec={id:uid(),periodId:newPeriodId,agentId:o.agentId,date:d,dayType:o.dayType,plannedStart:pStart,plannedEnd:pEnd,actualStart:sameStart?(o.actualStart||''):'',actualEnd:sameStart?(o.actualEnd||''):'',pause:Number((from===to&&o.pause!==''?o.pause:sc.pause??o.pause)||0),overtime:Number(sameStart?o.overtime||0:0),status:o.status||'Validée',replacement:o.noReplacementNeeded?'':(o.replacement||''),noReplacementNeeded:!!o.noReplacementNeeded,note:o.note||'',source:'manual',manualOverride:true,realScheduleReset:(!o.actualStart&&!o.actualEnd),academicYear:academicYearFor(d),updatedAt:new Date().toISOString()};
     pstMutationStamp();pstNormalizeMutationRecord(rec,{source:'manual'});db.agentDays.push(rec);pstQueueMutation('agentDays',rec,{label:'Planning agent'});
     added++;
   }
   d=addDays(d,1);
 }
 if(added===0 && from===to){
   const sc=resolvedTheoreticalSchedule(o.agentId,from,o.dayType);
   db.agentDays=db.agentDays.filter(r=>!(String(r.agentId)===String(o.agentId)&&r.date===from));
   const rec={
     id:uid(),periodId:'',agentId:o.agentId,date:from,dayType:o.dayType,
     plannedStart:o.plannedStart||sc.start||'',plannedEnd:o.plannedEnd||sc.end||'',
     actualStart:o.actualStart||'',actualEnd:o.actualEnd||'',
     pause:Number(o.pause||sc.pause||0),overtime:Number(o.overtime||0),
     status:o.status||'Validée',replacement:o.noReplacementNeeded?'':(o.replacement||''),
     noReplacementNeeded:!!o.noReplacementNeeded,note:o.note||'',source:'manual',manualOverride:true,realScheduleReset:(!o.actualStart&&!o.actualEnd),
     academicYear:academicYearFor(from),updatedAt:new Date().toISOString()
   };
   pstMutationStamp();pstNormalizeMutationRecord(rec,{source:'manual'});db.agentDays.push(rec);pstQueueMutation('agentDays',rec,{label:'Planning agent'});
   added=1;
 }
 const expectedDays=db.agentDays.filter(r=>String(r.agentId)===String(o.agentId)&&r.date>=from&&r.date<=to).map(r=>deepClone(r));

 // V147.148 — PRIORITÉ ABSOLUE À LA SAUVEGARDE DU FORMULAIRE.
 // Aucune erreur d'historique ne doit pouvoir empêcher Enregistrer.
 localDirty=true;
 clearTheoreticalScheduleCache();
 try{writeMirror()}catch(error){console.warn('Miroir local planning agent',error)}
 try{writeOfflinePending('modification planning agent à synchroniser')}catch(error){console.warn('File locale planning agent',error)}

 // Historique traité ensuite dans un bloc totalement isolé.
 try{
   const directAgent=agentById(o.agentId);
   const directAgentName=directAgent?agentName(directAgent):'Agent';
   const directChanges=agentDayAuditChanges(agentDayAuditBefore,o);
   const resetReal=(!o.actualStart&&!o.actualEnd) &&
     (!!x.actualStart||!!x.actualEnd||Math.abs(Number(x.overtime||0))>0.0001);

   if(resetReal){
     removeAgentDayHistoryForReset(o.agentId,from);
   }else if(directChanges.length){
     pushModificationHistory({
       type:'Agent',
       entity:directAgentName,
       date:from,
       changes:directChanges,
       user:currentUser?.email||'Utilisateur',
       agentId:o.agentId,
       agentNameValue:directAgentName,
       title:directAgentName,
       recordId:expectedDays[0]?.id||x.id||''
     });
   }

   // Le miroir est réécrit une seconde fois pour inclure l'historique,
   // sans jamais remettre en cause la sauvegarde de la journée.
   try{writeMirror()}catch(_){}
   try{writeOfflinePending('planning agent + historique à synchroniser')}catch(_){}
 }catch(historyError){
   console.error('Historique agent non bloquant',historyError);
 }

 enforceAgentDaysStable('enregistrement formulaire agent');
 const savedIntegrity=verifyAgentDaySaved(o.agentId,from,{
   dayType:o.dayType,
   plannedStart:expectedDays.find(r=>r.date===from)?.plannedStart||'',
   plannedEnd:expectedDays.find(r=>r.date===from)?.plannedEnd||'',
   actualStart:o.actualStart||'',actualEnd:o.actualEnd||'',
   pause:Number(expectedDays.find(r=>r.date===from)?.pause||0),
   overtime:Number(o.overtime||0),
   note:o.note||'',status:o.status||'Validée',
   replacement:o.noReplacementNeeded?'':(o.replacement||''),
   manualOverride:true,
   realScheduleReset:(!o.actualStart&&!o.actualEnd)
 });
 if(!savedIntegrity.ok){
   console.error('Contrôle sauvegarde journée agent',savedIntegrity);
   toast(`⚠️ Enregistrement incomplet : ${savedIntegrity.reason}`);
   return {ok:false};
 }
 refreshCollectionView('agentDays');
 closeModal();
 toast(`✅ ${added} jour(s) enregistré(s) — planning mis à jour`);

 // Synchronisation serveur ensuite, sans bloquer le formulaire ni faire disparaître la saisie.
 setTimeout(async()=>{
   try{
     const persisted=await pstSyncQueueNow({silent:true});
     if(persisted?.offline)setSaveState('Planning agent enregistré localement — synchronisation en attente','local');
   }catch(error){
     console.error('Synchronisation planning agent différée',error);
     setSaveState('Planning agent conservé localement — synchronisation à reprendre','local');
   }
 },0);
 return {ok:true};},{
  directSave:true,
  audit:{track:false,type:'Agent',recordId:x.id,agentId:x.agentId,agentName:agentName(agentById(x.agentId)),entity:(form)=>{const a=agentById(form?.elements?.agentId?.value||x.agentId);return a?agentName(a):agentName(agentById(x.agentId))},date:initialDate},
  onDelete:old?()=>{if(!confirm('Supprimer cette saisie ou toute la période associée ?'))return;const deletedDates=periodId?db.agentDays.filter(r=>r.periodId===periodId).map(r=>r.date):[old.date];
 const deletedAgentId=old.agentId;
 const deletedRows=periodId?db.agentDays.filter(r=>r.periodId===periodId):db.agentDays.filter(r=>r.id===old.id);
 db.agentDays=periodId?db.agentDays.filter(r=>r.periodId!==periodId):db.agentDays.filter(r=>r.id!==old.id);
 for(const dr of deletedRows){pstMutationStamp();pstQueueMutation('agentDays',{id:dr.id,_pstVersion:Date.now()},{deleted:true,label:'Suppression planning agent'})}
 db.changeHistory=(db.changeHistory||[]).filter(h=>!(h.title===modalAuditTitle&&(h.pastDates||[]).some(d=>deletedDates.includes(d))));
 enforceAgentDaysStable('suppression planning agent');
 localDirty=true;
 clearTheoreticalScheduleCache();
 try{writeMirror()}catch(_){}
 try{writeOfflinePending('suppression planning agent à synchroniser')}catch(_){}
 refreshCollectionView('agentDays');
 closeModal();
 toast('Saisie supprimée');
 setTimeout(()=>pstSyncQueueNow({silent:true}),0)}:null});
 function refreshTheoretical(force=false){
   const f=$('#modalForm');if(!f)return;
   const aid=f.elements.agentId.value, d=f.elements.dateFrom.value||todayISO(), currentType=f.elements.dayType.value||'Présence', sc=resolvedTheoreticalSchedule(aid,d,currentType);
   const box=$('#theoreticalSchedule');
   const annualBox=$('#annualTheoreticalSummary');if(annualBox)annualBox.innerHTML=agentAnnualScheduleSummary(aid,d);
   const rule=dayCountingRule(currentType);
   if(box){
     if(currentType!=='Présence')box.innerHTML=`<strong>Pastille du calendrier — ${fmtDate(d)}</strong><b>${esc(currentType)}</b><small>Comptabilisation : ${esc(dayCountingLabel(currentType))}</small>${rule.mode==='planned'&&sc.start&&sc.end?`<small>Horaire prévu : ${esc(sc.start)} – ${esc(sc.end)}</small>`:''}`;
     else {
       const nextPlan=(db.weeklyPlans||[]).filter(p=>String(p.agentId)===String(aid)&&p.effectiveFrom&&p.effectiveFrom>d).sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom))[0];
       const label=sc.shift==='Repos'?'Repos / non travaillé':(sc.start&&sc.end?`${esc(sc.start)} – ${esc(sc.end)}`:'Aucun horaire applicable à cette date');
       const src=sc.shift==='Permanence'?'Permanence':sc.source==='rotation'?(sc.shift||'Roulement'):sc.shift==='Standard'?'Standard':(sc.source||'');
       box.innerHTML=`<strong>Horaire théorique du ${fmtDate(d)}</strong><b>${label}</b>${src?`<small>Source : ${esc(src)}</small>`:''}${sc.pause?`<small>Pause : ${sc.pause} min</small>`:''}${sc.missions?`<small>${esc(sc.missions)}</small>`:''}${!sc.start&&sc.shift!=='Repos'&&nextPlan?`<small>Prochain planning enregistré à partir du ${fmtDate(nextPlan.effectiveFrom)}.</small>`:''}`;
     }
   }
   if(rule.mode==='planned'&&(force||normalizeText(currentType).includes('perman')||(!f.elements.plannedStart.value&&!f.elements.plannedEnd.value))){
     f.elements.plannedStart.value=sc.start||'';f.elements.plannedEnd.value=sc.end||'';f.elements.pause.value=Number(sc.pause||0);
   }
   updateDayCalc();
 }
 $$('[data-set-day]',$('#modalBody')).forEach(b=>b.onclick=()=>{$('#modalBody [name="dayType"]').value=b.dataset.setDay;refreshTheoretical(false)});
 const f=$('#modalForm');
 const resetReal=$('#resetRealSchedule');
 if(resetReal)resetReal.onclick=()=>{
   if(f.elements.actualStart)f.elements.actualStart.value='';
   if(f.elements.actualEnd)f.elements.actualEnd.value='';
   if(f.elements.overtime)f.elements.overtime.value='0';
   updateDayCalc();
   toast('Horaire réel réinitialisé — enregistrez pour revenir au théorique');
 };
 const noReplacement=f.elements.noReplacementNeeded;
 const replacementField=f.elements.replacement;
 const syncReplacementChoice=()=>{if(!noReplacement||!replacementField)return;replacementField.disabled=noReplacement.checked;if(noReplacement.checked)replacementField.value='';};
 noReplacement?.addEventListener('change',syncReplacementChoice);
 syncReplacementChoice();
 f.elements.agentId.addEventListener('change',()=>refreshTheoretical(true));
 f.elements.dateFrom.addEventListener('change',()=>{if(!old)f.elements.dateTo.value=f.elements.dateFrom.value;refreshTheoretical(true)});
 f.elements.dayType.addEventListener('change',()=>refreshTheoretical(false));
 $$('#modalBody input,#modalBody select').forEach(e=>e.addEventListener('change',updateDayCalc));
 refreshTheoretical(!old);
}


function openAbsence(){const agentId=$('#absenceAgent')?.value||db.agents[0]?.id;const date=($('#absenceMonth')?.value||monthISO())+'-01';openAgentDay(agentId,date)}



async function persistAgentPlanningBackground({label='Planning agent',expectedDays=[],deletedKeys=[]}={}){
  // Cette fonction ne bloque jamais le formulaire et ne remplace JAMAIS db
  // avec une relecture Supabase. L'écran local reste donc la source visuelle
  // de vérité pendant et après la sauvegarde.
  if(!currentUser){
    localDirty=true;
    try{writeOfflinePending(`${label} — utilisateur non connecté`)}catch(_){}
    return {ok:true,offline:true,pending:true};
  }
  if(!supabaseClient||!navigator.onLine){
    localDirty=true;
    try{writeOfflinePending(`${label} — hors connexion`)}catch(_){}
    return {ok:true,offline:true,pending:true};
  }

  const startedMutationAt=Number(lastLocalMutationAt||0);
  const localSnapshot=migrate(deepClone(db));
  const localHistorySnapshot=deepClone(localSnapshot.changeHistory||[]);
  const localAgentDaysSnapshot=deepClone(localSnapshot.agentDays||[]);
  const localMaintenanceSnapshot=deepClone(localSnapshot.maintenance||[]);
  const localStableSnapshots={};
  for(const c of STABLE_FORM_COLLECTIONS)localStableSnapshots[c]=deepClone(localSnapshot[c]||[]);
  const localDeletedSnapshot=deepClone(ensureDeletedRecordsStore(localSnapshot));

  try{
    setSaveState(`${label} : synchronisation…`,'loading');

    // Fusionner d'abord avec le serveur pour ne pas écraser d'autres données.
    const remoteRow=await fetchRemote();
    let payload=localSnapshot;
    if(remoteRow?.data){
      const remote=migrate(remoteRow.data);
      const base=lastCloudData||remote;
      payload=migrate(mergeThreeWay(base,localSnapshot,remote));
      payload.changeHistory=mergeChangeHistorySafe(remote.changeHistory,localHistorySnapshot);
      payload.agentDays=mergeAgentDaysSafe(remote.agentDays,localAgentDaysSnapshot);
      payload.maintenance=mergeMaintenanceSafe(remote.maintenance,localMaintenanceSnapshot);
      mergeStableCollectionsInto(payload,localStableSnapshots,localDeletedSnapshot);
    }

    payload.deletedRecords=mergeDeletedRecordsSafe(payload.deletedRecords,localDeletedSnapshot);
    for(const c of STABLE_FORM_COLLECTIONS)payload[c]=applyDeletedRecordsToCollection(c,payload[c],payload);
    payload.maintenance=applyDeletedRecordsToCollection('maintenance',payload.maintenance,payload);

    const stamp=new Date().toISOString();
    const write=await withTimeout(
      supabaseClient.from('app_state')
        .upsert({user_id:currentUser.id,data:payload,updated_at:stamp},{onConflict:'user_id'}),
      15000
    );
    if(write?.error)throw write.error;

    // Relecture de contrôle seulement : NE JAMAIS affecter db avec cette réponse.
    const read=await withTimeout(
      supabaseClient.from('app_state').select('data,updated_at').eq('user_id',currentUser.id).single(),
      15000
    );
    if(read?.error)throw read.error;

    const check=migrate(read?.data?.data||{});
    check.agentDays=normalizeAgentDaysStable(check.agentDays);

    const expectedOk=(expectedDays||[]).every(exp=>{
      const got=(check.agentDays||[]).find(r=>
        String(r.agentId)===String(exp.agentId) &&
        String(r.date)===String(exp.date) &&
        (String(r.source||'').toLowerCase()==='manual'||r.manualOverride===true)
      );
      return recordMatchesExpected(exp,got);
    });

    const deletedOk=(deletedKeys||[]).every(k=>
      !(check.agentDays||[]).some(r=>
        String(r.agentId)===String(k.agentId) &&
        String(r.date)===String(k.date) &&
        (String(r.source||'').toLowerCase()==='manual'||r.manualOverride===true)
      )
    );

    if(!expectedOk||!deletedOk)throw new Error(`${label} non confirmé lors de la relecture Supabase`);

    // Si aucune nouvelle saisie n'est apparue pendant l'envoi, tout est confirmé.
    const newerLocalMutation=Number(lastLocalMutationAt||0)>startedMutationAt;
    lastCloudData=deepClone(payload);
    lastCloudUpdatedAt=read?.data?.updated_at||stamp;
    lastCloudError='';
    cloudReady=true;
    lastConfirmedSupabaseAt=Date.now();

    if(newerLocalMutation){
      localDirty=true;
      try{writeOfflinePending(`${label} — nouvelle saisie locale en attente`)}catch(_){}
      setSaveState('Nouvelle saisie conservée — prochaine synchronisation en attente','local');
    }else{
      localDirty=false;
      clearOfflinePending();
      writeMirror();
      setSaveState(`Synchronisé à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`,'cloud');
    }

    refreshDashboardSyncIndicator();
    return {ok:true,offline:false,pending:newerLocalMutation};
  }catch(error){
    lastCloudError=error?.message||String(error);
    localDirty=true;
    try{writeOfflinePending(`${label} — ${lastCloudError}`)}catch(_){}
    setSaveState(`${label} conservé localement — synchronisation à reprendre`,'local');
    console.error(`${label} — synchronisation non bloquante`,error);
    return {ok:true,offline:true,pending:true,error:lastCloudError};
  }
}

async function persistFormRecordVerified(label='Donnée',collection='',id=''){
 try{
   localDirty=true;
   if(typeof clearTheoreticalScheduleCache==='function')clearTheoreticalScheduleCache();

   // Hors ligne : conservation locale explicite.
   if(!navigator.onLine){
     const ok=writeOfflinePending('appareil hors connexion');
     safeRenderAll();
     setSaveState(`${label} conservé localement — synchronisation au retour du réseau`,'local');
     return {ok:!!ok,offline:true};
   }

   // En ligne : écriture réelle Supabase + relecture de contrôle.
   if(window.PSTMainState?.persistStateDirect){
     const result=await window.PSTMainState.persistStateDirect({
       label,
       verify:remote=>!collection||!id||(Array.isArray(remote?.[collection])&&remote[collection].some(x=>String(x.id)===String(id)))
     });
     if(result?.ok){
       return {ok:true,offline:false};
     }
     throw new Error(result?.error||`${label} non confirmé par Supabase`);
   }

   // Secours.
   const ok=save(false);
   if(!ok)throw new Error(`${label} non enregistré`);
   safeRenderAll();
   return {ok:true,offline:false};
 }catch(error){
   console.error(`${label} — enregistrement vérifié impossible`,error);
   setSaveState(`${label} non confirmé : ${error?.message||error}`,'error');
   toast(`⚠️ ${label} non confirmé — le formulaire reste ouvert`);
   return {ok:false,offline:false,error:error?.message||String(error)};
 }
}

function recordComparableSnapshot(record){
 const skip=new Set(['attachments','historyCreatedAt','historyUpdatedAt']);
 const out={};
 for(const [k,v] of Object.entries(record||{})){
   if(skip.has(k)||typeof v==='function'||v===undefined)continue;
   out[k]=v;
 }
 return out;
}
function samePersistedValue(expected,actual){
 if(expected===undefined)return true;
 if(expected===null)return actual===null||actual===undefined||actual==='';
 if(typeof expected==='number')return Number(actual)===expected;
 if(typeof expected==='boolean')return Boolean(actual)===expected;
 if(Array.isArray(expected)||typeof expected==='object'){
   try{return JSON.stringify(actual??null)===JSON.stringify(expected)}
   catch(_){return false}
 }
 return String(actual??'')===String(expected);
}
function recordMatchesExpected(expectedRecord,actualRecord){
 if(!actualRecord)return false;
 const expected=recordComparableSnapshot(expectedRecord);
 return Object.entries(expected).every(([k,v])=>samePersistedValue(v,actualRecord[k]));
}
function upsertDbRecord(collection,record){
 if(!collection||!record?.id)return false;
 if(!Array.isArray(db[collection]))db[collection]=[];
 const i=db[collection].findIndex(x=>String(x.id)===String(record.id));
 const copy=deepClone(record);
 if(i>=0)db[collection][i]=copy;
 else db[collection].push(copy);
 return true;
}
function refreshCollectionView(collection){
 capturePlanningScroll();
 const map={
   maintenance:renderMaintenance,agentActivities:renderAgentActivities,requests:renderRequests,works:renderWorks,meetings:renderMeetings,
   notes:renderNotes,issues:renderIssues,periodic:renderPeriodic,contracts:()=>window.PSTContracts?.render?.(),cleaning:renderCleaning,
   vacations:renderVacations,personalEvents:renderPersonal,documents:renderDocuments,
   agents:renderAgents,rotations:renderRotations,weeklyPlans:renderPlanning,
   agentDays:()=>{renderPlanning();renderAbsences();renderTeamCalendar();renderPersonalCalendar();renderAgents();},
   spaces:renderSettings
 };
 try{map[collection]?.()}catch(error){console.warn('Rafraîchissement collection',collection,error)} restorePlanningScroll();
}
async function commitFormRecordVerified(label,collection,record){
 if(!record?.id)return {ok:false,error:'Identifiant manquant'};

 const nowIso=new Date().toISOString();
 if(!record.createdAt)record.createdAt=nowIso;
 record.updatedAt=nowIso;
 if(STABLE_FORM_COLLECTIONS.includes(collection) && !record.source)record.source='manual';

 // La copie locale devient immédiatement la référence.
 pstMutationStamp();
 pstNormalizeMutationRecord(record,{source:'manual'});
 upsertDbRecord(collection,record);
 pstQueueMutation(collection,record,{label});
 if(STABLE_FORM_COLLECTIONS.includes(collection))enforceStableCollection(collection,`${label} local`);
 const expected=recordComparableSnapshot(record);

 try{
   localDirty=true;
   if(typeof clearTheoreticalScheduleCache==='function')clearTheoreticalScheduleCache();
   try{writeMirror()}catch(_){}
   try{writeOfflinePending(`${label} à synchroniser`)}catch(_){}
   refreshCollectionView(collection);

   if(!navigator.onLine){
     setSaveState(`${label} conservé localement — synchronisation au retour du réseau`,'local');
     return {ok:true,offline:true};
   }

   const result=await pstSyncQueueNow({silent:true});
   if(!result?.ok)setSaveState(`${label} enregistré localement — synchronisation en attente`,'local');
   if(STABLE_FORM_COLLECTIONS.includes(collection))enforceStableCollection(collection,`${label} local final`);
   refreshCollectionView(collection);
   return {ok:true,offline:!result?.ok,pending:result?.pending||0};
 }catch(error){
   console.error(`${label} — commit direct impossible`,error);
   const reason=error?.message||String(error)||'Erreur Supabase';
   const queued=writeOfflinePending(reason);
   refreshCollectionView(collection);
   if(queued){
     setSaveState(`${label} enregistré sur cet appareil — synchronisation en attente`,'local');
     return {ok:true,offline:true,pending:true,error:reason};
   }
   setSaveState(`${label} non enregistré : ${reason}`,'error');
   toast(`⚠️ ${label} non enregistré — réessayez`);
   return {ok:false,offline:false,error:reason};
 }
}

/* ---------- Formulaires métier ---------- */
function openPersonalEvent(id,date=todayISO()){const old=id?byId('personalEvents',id):null;const x=old||{id:uid(),no:nextNo('personal','PER'),date,start:'',end:'',type:'Rendez-vous',title:'',location:'',priority:'Normale',status:'À faire',notes:'',attachments:[]};openModal(old?'Modifier l’événement':'Nouvel événement personnel',`<div class="form-grid">${field('Date','date',x.date,'date','required')}${field('Début','start',x.start,'time')}${field('Fin','end',x.end,'time')}<label>Type<select name="type">${selectOptions(db.lists.personalTypes,x.type)}</select></label>${field('Objet','title',x.title,'text','required')}${field('Lieu','location',x.location)}<label>Priorité<select name="priority">${selectOptions(db.lists.priorities,x.priority)}</select></label><label>Statut<select name="status">${selectOptions(db.lists.generalStatuses,x.status)}</select></label>${textareaField('Notes','notes',x.notes)}${attachmentField(x.attachments)}</div>`,async form=>{Object.assign(x,formDataObj(form));const attachmentCheck=await processAttachments(form,x,'personal');if(!attachmentCheck?.ok)return;const persisted=await commitFormRecordVerified('Événement','personalEvents',x);if(!persisted.ok)return;closeModal();toast('✅ Événement enregistré')},{onDelete:old?()=>deleteRecord('personalEvents',x.id,'événement'):null})}
function openIssue(id,defaults={}){const old=id?byId('issues',id):null;const x=old||{id:uid(),no:nextNo('issue','ACT'),date:todayISO(),time:'',agentId:'',category:'Sécurité',title:'',description:'',priority:defaults.priority||'Haute',status:'À faire',owner:'',building:'',floor:'',sector:'',room:'',dueDate:'',cost:'',action:'',attachments:[]};openModal(old?'Modifier l’action':'Nouvelle action sécurité / qualité',`<div class="form-grid">${field('Date','date',x.date,'date')}${field('Heure','time',x.time,'time')}<label>Agent concerné<select name="agentId">${agentOptions(x.agentId,true)}</select></label><label>Catégorie<select name="category">${selectOptions(db.lists.issueCategories,x.category)}</select></label><label>Priorité<select name="priority">${selectOptions(db.lists.priorities,x.priority)}</select></label>${field('Problématique','title',x.title,'text','required')}<label>Statut<select name="status">${selectOptions(db.lists.generalStatuses,x.status)}</select></label>${centralLocationFields(x,'issueLoc')}${field('Responsable du suivi','owner',x.owner)}${field('Échéance','dueDate',x.dueDate,'date')}${field('Coût éventuel (€)','cost',x.cost,'number','min="0" step="0.01"')}${textareaField('Description','description',x.description)}${textareaField('Action corrective / décision','action',x.action)}${attachmentField(x.attachments)}</div>`,async form=>{Object.assign(x,formDataObj(form),{cost:Number(form.elements.cost.value||0)});const attachmentCheck=await processAttachments(form,x,'issues');if(!attachmentCheck?.ok)return;const persisted=await commitFormRecordVerified('Action sécurité / qualité','issues',x);if(!persisted.ok)return;closeModal();const issueMonth=document.getElementById('issueMonth'),issueAgent=document.getElementById('issueAgent'),issueCategory=document.getElementById('issueCategory'),issueStatus=document.getElementById('issueStatus');if(issueMonth&&x.date)issueMonth.value=String(x.date).slice(0,7);if(issueAgent)issueAgent.value='';if(issueCategory)issueCategory.value='';if(issueStatus)issueStatus.value='';setView('issues');renderIssues();toast('✅ Problématique confirmée et affichée dans la liste')},{onDelete:old?()=>deleteRecord('issues',x.id,'action'):null});bindCentralLocation('issueLoc')}
// Les contrôles périodiques sont indépendants de l'année scolaire : leur cycle suit leur vraie échéance, même plusieurs années plus tard.
function addMonthsClamped(dateISO,months){
 const d=parseDate(dateISO),day=d.getDate(),target=new Date(d.getFullYear(),d.getMonth()+Number(months||0),1,12,0,0,0);
 const last=new Date(target.getFullYear(),target.getMonth()+1,0,12,0,0,0).getDate();target.setDate(Math.min(day,last));return localISO(target)
}
function periodicIsInactive(x){const s=normalizeText(x?.status);return s==='cloture'||s==='cloturee'||s==='non applicable'||s==='archive'||s==='archivee'}
function periodicDue(x){if(x.nextDate)return normalizeDateValue(x.nextDate);if(x.lastDate&&Number(x.intervalMonths)>0)return addMonthsClamped(x.lastDate,x.intervalMonths);return ''}
function periodicComputed(x){const due=periodicDue(x);if(periodicIsInactive(x))return x.status||'Clôturé';if(!due)return x.status||'À planifier';const diff=(parseDate(due)-parseDate(todayISO()))/86400000;if(diff<0)return 'En retard';if(diff<=60)return 'Bientôt';return 'À jour'}

// V147.166 — lecture des contrôles par année scolaire et continuité du cycle réel.
// Un contrôle réalisé avant le 1er septembre reste valable tant que sa vraie prochaine échéance n'est pas atteinte.
// Exemple : contrôle annuel réalisé le 10/07/2026 => en 2026-2027 il est "À jour" jusqu'à l'approche du 10/07/2027,
// jamais "Non renseigné" simplement parce que le passage a eu lieu avant la rentrée.
function periodicAcademicYearInfoV165(x,label=activeAcademicYear()){
 const year=normalizeAcademicYear(label)||activeAcademicYear(),range=academicYearRange(year),today=todayISO(),currentYear=academicYearFor(today);
 const hist=periodicHistoryRows(x).filter(h=>h.date).slice().sort((a,b)=>a.date.localeCompare(b.date));
 const actual=hist.filter(h=>h.date>=range.start&&h.date<=range.end);
 const actualLast=actual.length?actual[actual.length-1]:null;
 const before=hist.filter(h=>h.date<range.start),beforeLast=before.length?before[before.length-1]:null;
 const throughEnd=hist.filter(h=>h.date<=range.end),lastKnown=throughEnd.length?throughEnd[throughEnd.length-1]:beforeLast;
 const interval=Math.max(0,Number(x.intervalMonths||0));
 let due='',coverageEnd='';
 const explicit=normalizeDateValue(x.nextDate||'');
 // L'échéance explicite n'est utilisée pour l'année affichée que si elle appartient à cette année.
 if(explicit&&explicit>=range.start&&explicit<=range.end)due=explicit;
 // Le cycle est projeté à partir du dernier passage réellement connu avant ou dans l'année.
 if(interval>0){
   const anchor=(actualLast?.date||beforeLast?.date||normalizeDateValue(x.lastDate||''));
   if(anchor){
     let projected=addMonthsClamped(anchor,interval),guard=0;
     while(projected&&projected<range.start&&guard++<240)projected=addMonthsClamped(projected,interval);
     coverageEnd=projected||'';
     if(!due&&projected&&projected<=range.end)due=projected;
   }
 }
 let state='Non renseigné',tone='neutral';
 const isPast=range.end<today,isCurrent=year===currentYear,isFuture=range.start>today;
 if(periodicIsInactive(x)){state=x.status||'Clôturé';tone='neutral';}
 else if(isPast){
   // Une ancienne année est uniquement de l'historique : aucune alerte "en retard" aujourd'hui.
   if(actualLast){state='Réalisé';tone='done';}
   else if(due){state='Non renseigné';tone='neutral';}
   else if(beforeLast&&coverageEnd&&coverageEnd>range.end){state='À jour';tone='done';}
   else if(beforeLast){state='À jour';tone='done';}
 }
 else if(isCurrent){
   if(due){
     const diff=(parseDate(due)-parseDate(today))/86400000;
     if(diff<0){state='À faire';tone='todo';}
     else if(diff<=60){state='À prévoir';tone='soon';}
     else {state='À jour';tone='done';}
   }else if(actualLast||beforeLast){state='À jour';tone='done';}
 }
 else if(isFuture){
   // Pour une année à venir : "Prévu" signifie qu'une échéance tombe dans l'année,
   // pas que le contrôle précédent n'a pas été réalisé.
   if(due){state='Prévu';tone='soon';}
   else if(actualLast||beforeLast){state='À jour';tone='done';}
 }
 const provider=(lastKnown?.provider||x.provider||'').trim();
 return {year,range,actual,actualLast,lastKnown,beforeLast,due,coverageEnd,state,tone,provider};
}
function periodicAcademicYearRowsV165(label=activeAcademicYear()){

 return (db.periodic||[]).map(x=>({x,info:periodicAcademicYearInfoV165(x,label)}));
}
function periodicEventsForDateV165(d){
 const y=academicYearFor(d),rows=[];
 for(const {x,info} of periodicAcademicYearRowsV165(y)){
   if(info.actual.some(h=>h.date===d))rows.push({...x,date:d,start:x.time||'',source:'periodic',title:`Contrôle réalisé · ${x.name||x.title||x.family||'Contrôle'}`});
   else if(info.due===d&&!periodicIsInactive(x))rows.push({...x,date:d,start:x.time||'',source:'periodic',title:`Contrôle à prévoir · ${x.name||x.title||x.family||'Contrôle'}`});
 }
 return rows;
}
function periodicHistoryHtml(x,compact=false){
 const rows=periodicHistoryRows(x);
 if(!rows.length)return compact?'':'<p class="hint">Aucun historique de passage renseigné.</p>';
 const current=normalizeDateValue(x?.lastDate||'');
 const items=rows.map(r=>`<li class="periodic-history-item"><span><strong>${fmtDate(r.date)||esc(r.date)}</strong>${r.date===current?'<em>Dernier</em>':''}</span><span>${esc(r.provider||'Prestataire non renseigné')}</span>${r.note?`<small>${esc(r.note)}</small>`:''}${r.source?`<small class="muted">${esc(r.source)}</small>`:''}</li>`).join('');
 if(compact)return `<details class="periodic-history"><summary>🕘 Historique des contrôles (${rows.length})</summary><ul>${items}</ul></details>`;
 return `<section class="periodic-history-form"><h4>🕘 Historique des contrôles (${rows.length})</h4><p class="hint">Historique reconstitué depuis le fichier Excel et complété automatiquement lors des prochains contrôles.</p><ul>${items}</ul></section>`;
}
function periodicRememberDate(x,date,provider='',source='Application',note=''){
 const d=normalizeDateValue(date||'');if(!d)return;
 mergePeriodicHistoryEntry(x,{date:d,provider:provider||'',source,note});
}
function openPeriodic(id){const old=id?byId('periodic',id):null;const x=old||{id:uid(),no:nextNo('periodic','CP'),name:'',family:db.lists.periodicFamilies[0],intervalMonths:12,requirement:'',provider:'',register:'Registre de sécurité',building:'Tous bâtiments',lastDate:'',nextDate:'',status:'À planifier',notes:'',oneDriveUrl:'',history:[],attachments:[]};const previousLast=normalizeDateValue(x.lastDate||''),previousProvider=String(x.provider||'');openModal(old?'Modifier le contrôle périodique':'Nouveau contrôle périodique',`<div class="form-grid">${field('N° contrôle','no',x.no||'')}${field('Contrôle','name',x.name,'text','required')}<label>Famille<select name="family">${selectOptions(db.lists.periodicFamilies,x.family)}</select></label><label>Bâtiment<select name="building"><option>Tous bâtiments</option>${buildingOptions(x.building)}</select></label>${field('Périodicité (mois, 0 = variable)','intervalMonths',x.intervalMonths,'number','min="0"')}${field('Périodicité / précision','periodicityText',x.periodicityText||'')}${field('Dernier contrôle','lastDate',x.lastDate,'date')}${field('Prochaine échéance','nextDate',periodicDue(x),'date')}${field('Heure prévue','time',x.time,'time')}${field('Étage / niveau','floor',x.floor)}${field('Secteur','sector',x.sector||'')}${field('Local / zone','room',x.room)}<label>Statut<select name="status">${selectOptions(['À planifier','Planifié','Réalisé','Clôturé','En attente','Non applicable'],x.status)}</select></label>${field('Prestataire / responsable','provider',x.provider)}${field('Registre / dossier','register',x.register)}${textareaField('Exigence / contenu','requirement',x.requirement)}${field('Lien OneDrive','oneDriveUrl',periodicOneDriveUrl(x),'url','placeholder="https://..."')}${textareaField('Notes','notes',x.notes)}</div>${periodicHistoryHtml(x,false)}<div class="form-grid"><p class="form-hint span2"><strong>Suivi par année scolaire :</strong> chaque date de passage est conservée dans l’historique. L’année choisie dans le tableau de bord permet de relire les contrôles réalisés et ceux prévus sur cette période.</p>${attachmentField(x.attachments)}</div>`,async form=>{const o=formDataObj(form),intervalMonths=Number(o.intervalMonths||0);Object.assign(x,o,{intervalMonths});if(x.lastDate&&intervalMonths>0&&!o.nextDate)x.nextDate=addMonthsClamped(x.lastDate,intervalMonths);if(previousLast&&previousLast!==normalizeDateValue(x.lastDate||''))periodicRememberDate(x,previousLast,previousProvider, 'Application — ancien dernier contrôle');if(x.lastDate)periodicRememberDate(x,x.lastDate,x.provider||'',old?'Application — modification':'Application — création');
const oneDriveUrl=String(o.oneDriveUrl||'').trim();
if(oneDriveUrl){
 x.oneDriveUrl=oneDriveUrl;
 savePeriodicOneDriveLink(x,oneDriveUrl);
}
const attachResult=await processAttachments(form,x,'periodic');
if(!attachResult?.ok){
 toast('Le contrôle n’est pas enregistré : au moins un fichier n’a pas été chargé dans Supabase.');
 setSaveState('PDF non chargé — corrigez avant d’enregistrer','error');
 return;
}
const persisted=await commitFormRecordVerified('Contrôle périodique','periodic',x);
if(!persisted?.ok){
 toast('Le contrôle n’est pas confirmé dans Supabase. Le formulaire reste ouvert.');
 return;
}
closeModal();
toast(persisted?.offline?'Contrôle enregistré hors ligne — synchronisation automatique':'✅ Contrôle périodique et fichiers confirmés dans Supabase')},{onDelete:old?()=>deleteRecord('periodic',x.id,'contrôle'):null})}
function cleaningTasks(type,existing=[]){const oldMap=new Map((existing||[]).map(t=>[t.name,t]));return (GUIDE[type]||GUIDE['Autre']||[]).map(([name,freq])=>{const o=oldMap.get(name)||{name,frequency:freq,status:'Non contrôlé',comment:''};return `<div class="clean-task" data-clean-task><div><strong>${esc(name)}</strong><small>${esc(freq)}</small></div><select name="taskStatus">${selectOptions(db.lists.cleaningStatuses,o.status)}</select><input name="taskComment" value="${esc(o.comment||'')}" placeholder="Commentaire rapide"></div>`}).join('')}
function consumeCleaningScopeContext(){
 if(arguments.length)return null;
 try{
  const k='pst_cleaning_pending_scope_v147_57',raw=localStorage.getItem(k);
  localStorage.removeItem(k);
  return raw?JSON.parse(raw):null;
 }catch(e){console.warn('Contexte contrôle ménage',e);return null}
}
function centralCleaningSectorNames(building,floor){
 try{
  const cfg=window.PSTCleaningRooms?.get?.()||[];
  const nb=normalizeText(building),nf=normalizeText(floor);
  const b=cfg.find(x=>normalizeText(x?.name)===nb)||cfg[0];
  const f=(b?.floors||[]).find(x=>normalizeText(x?.name)===nf)||(b?.floors||[])[0];
  return (f?.sectors||[]).map(x=>x.name).filter(Boolean);
 }catch(_){return []}
}
function cleaningSectorOptions(building,floor,v=''){
 const vals=centralCleaningSectorNames(building,floor);
 return '<option value="">Tous les secteurs</option>'+selectOptions(vals,v);
}

function openCleaning(id){
 if(!id&&window.PSTCleaningRooms?.openTactileControl){window.PSTCleaningRooms.openTactileControl();return}
 const old=id?byId('cleaning',id):null;
 const pending=old?null:consumeCleaningScopeContext();
 const b=old?.building||pending?.building||db.buildings[0]?.name||'';
 const floor=old?.floor||pending?.floor||db.buildings[0]?.floors?.[0]||'';
 const type=old?.roomType||'Salle de classe / devoirs / informatique';
 const selectedScopeRooms=Array.isArray(pending?.roomScopeRooms)?pending.roomScopeRooms:[];
 const selectedRoomLabel=selectedScopeRooms.length===1?[selectedScopeRooms[0].number,selectedScopeRooms[0].name].filter(Boolean).join(' — '):'';
 const x=old||{id:uid(),no:nextNo('cleaning','MEN'),date:todayISO(),time:new Date().toTimeString().slice(0,5),inspector:db.settings.defaultInspector||'',agentId:'',building:b,floor,sector:pending?.sector||'',roomType:type,room:pending?.mode==='single'&&selectedRoomLabel?selectedRoomLabel:'Zone entière',scopeMode:pending?.mode||'',roomScopeIds:Array.isArray(pending?.roomScopeIds)?pending.roomScopeIds:[],overallStatus:'',score:0,comment:'',tasks:[],attachments:[]};
 const initialScope={building:x.building,floor:x.floor,sector:x.sector};
 openModal(old?'Modifier le contrôle ménage':'Nouveau contrôle ménage',`<div class="form-grid">${field('Date','date',x.date,'date','required')}${field('Heure','time',x.time,'time')}<label>Agent / secteur contrôlé<select name="agentId">${agentOptions(x.agentId,true)}</select></label>${field('Contrôleur','inspector',x.inspector)}<label>Bâtiment<select name="building" id="mBuilding">${buildingOptions(x.building)}</select></label><label>Étage<select name="floor" id="mFloor">${floorOptions(x.building,x.floor)}</select></label><label>Secteur<select name="sector" id="mSector">${cleaningSectorOptions(x.building,x.floor,x.sector)}</select></label><label>Type de local<select name="roomType" id="mRoomType">${selectOptions(db.lists.roomTypes,x.roomType)}</select></label><label>Local / zone<select name="room" id="mRoom">${roomOptions(x.building,x.floor,x.roomType,x.room)}</select></label><label id="mOtherRoomWrap" class="${x.room==='Autre local'?'':'hidden'}">Autre local<input name="otherRoom" id="mOtherRoom" value="${esc(x.otherRoom||'')}"></label>${textareaField('Observation générale','comment',x.comment)}</div><div class="clean-bulk"><span>Tout passer en :</span>${['Conforme','À reprendre','Non conforme','Non applicable'].map(s=>`<button type="button" data-bulk-clean="${s}">${s}</button>`).join('')}</div><div id="cleanTaskEditor" class="clean-task-editor">${cleaningTasks(x.roomType,x.tasks)}</div>${attachmentField(x.attachments)}`,async form=>{
  const o=formDataObj(form);
  const rows=$$('[data-clean-task]',form).map((r,i)=>({name:r.querySelector('strong').textContent,frequency:r.querySelector('small').textContent,status:r.querySelector('[name="taskStatus"]').value,comment:r.querySelector('[name="taskComment"]').value}));
  const rated=rows.filter(r=>!['Non contrôlé','Non applicable'].includes(r.status)),good=rated.filter(r=>r.status==='Conforme').length;
  if(o.room==='Autre local'&&o.otherRoom)o.room=o.otherRoom;
  const scopeStillValid=Array.isArray(x.roomScopeIds)&&x.roomScopeIds.length&&o.building===initialScope.building&&o.floor===initialScope.floor&&(!initialScope.sector||o.sector===initialScope.sector)&&o.room==='Zone entière';
  const scopeSingleValid=Array.isArray(x.roomScopeIds)&&x.roomScopeIds.length===1&&o.building===initialScope.building&&o.floor===initialScope.floor;
  Object.assign(x,o,{room:o.room,tasks:rows,score:rated.length?Math.round(good/rated.length*100):0,overallStatus:rows.some(r=>r.status==='Non conforme')?'Non conforme':rows.some(r=>r.status==='À reprendre')?'À reprendre':rated.length?'Conforme':'Non contrôlé'});
  if(!(scopeStillValid||scopeSingleValid)){x.roomScopeIds=[];x.scopeMode=o.room==='Zone entière'?'sector':'single'}
  else if(o.room==='Zone entière'&&x.roomScopeIds.length>1)x.scopeMode='sector';
  const attachmentCheck=await processAttachments(form,x,'cleaning');if(!attachmentCheck?.ok)return;
  const persisted=await commitFormRecordVerified('Contrôle ménage','cleaning',x);if(!persisted.ok)return {ok:false};
  // Vérification supplémentaire : le contrôle doit être présent dans l'état principal
  // avant de fermer le formulaire, puis répercuté dans l'historique par local.
  const savedMain=Array.isArray(db.cleaning)&&db.cleaning.some(c=>String(c.id)===String(x.id));
  if(!savedMain){toast('⚠️ Contrôle non retrouvé après enregistrement — formulaire conservé');return {ok:false}}
  let historySaved=true;
  try{const r=await window.PSTCleaningRooms?.recordMainControl?.(x);historySaved=(r!==false)}catch(e){historySaved=false;console.warn('Historique ménage par local',e)}
  if(!historySaved){
    // Le contrôle principal est déjà sauvegardé. L'historique sera reconstruit depuis db.cleaning,
    // mais on le signale pour éviter un faux message de réussite totale.
    console.warn('Contrôle enregistré, synchronisation historique différée',x.id);
  }
  closeModal();
  try{renderCleaning()}catch(_){}
  try{window.dispatchEvent(new Event('pst:data-loaded'))}catch(_){}
  toast(persisted.offline?`✅ Contrôle enregistré sur cet appareil — synchronisation en attente`:`✅ Contrôle ménage enregistré — résultat : ${x.overallStatus||'—'}`)
  return {ok:true};
 },{audit:{track:!!old,type:'Contrôle ménage',recordId:x.id,no:x.no,agentId:x.agentId||'',entity:(form)=>[x.no,[form?.elements?.building?.value||x.building,form?.elements?.floor?.value||x.floor,form?.elements?.room?.value||x.room].filter(Boolean).join(' ')].filter(Boolean).join(' — '),date:x.date},onDelete:old?()=>deleteRecord('cleaning',x.id,'contrôle'):null});
 const updateOtherRoom=()=>$('#mOtherRoomWrap')?.classList.toggle('hidden',$('#mRoom')?.value!=='Autre local');
 const updateSector=()=>{const e=$('#mSector');if(e)e.innerHTML=cleaningSectorOptions($('#mBuilding').value,$('#mFloor').value,e.value)};
 const updateLocation=()=>{const bb=$('#mBuilding').value,ff=$('#mFloor').value,tt=$('#mRoomType').value,oldRoom=$('#mRoom').value;$('#mRoom').innerHTML=roomOptions(bb,ff,tt,oldRoom);updateOtherRoom()};
 $('#mBuilding').onchange=()=>{$('#mFloor').innerHTML=floorOptions($('#mBuilding').value);updateSector();updateLocation()};
 $('#mFloor').onchange=()=>{updateSector();updateLocation()};
 $('#mRoomType').onchange=()=>{$('#cleanTaskEditor').innerHTML=cleaningTasks($('#mRoomType').value,[]);updateLocation()};
 $('#mRoom').onchange=updateOtherRoom;
 updateOtherRoom();
 $$('[data-bulk-clean]').forEach(btn=>btn.onclick=()=>$$('[name="taskStatus"]',$('#cleanTaskEditor')).forEach(s=>s.value=btn.dataset.bulkClean))
}

function openMaintenance(id){const old=id?byId('maintenance',id):null;const x=old||{id:uid(),no:nextNo('maintenance','MAI'),date:todayISO(),time:'',title:'',family:'Électricité',priority:'Normale',status:'À faire',building:'',floor:'',sector:'',room:'',requester:'',assigned:'',dueDate:'',description:'',action:'',cost:'',attachments:[]};openModal(old?'Modifier l’intervention':'Nouvelle intervention',`<div class="form-grid">${field('Date de demande','date',x.date,'date','required')}${field('Heure prévue','time',x.time,'time')}${field('Objet','title',x.title,'text','required')}<label>Famille<select name="family">${selectOptions(db.lists.maintenanceFamilies,x.family)}</select></label><label>Priorité<select name="priority">${selectOptions(db.lists.priorities,x.priority)}</select></label><label>Statut<select name="status">${selectOptions(db.lists.maintenanceStatuses,x.status)}</select></label>${centralLocationFields(x,'maintLoc')}${field('Demandeur','requester',x.requester)}${field('Assigné à / prestataire','assigned',x.assigned)}${field('Échéance','dueDate',x.dueDate,'date')}${textareaField('Description / diagnostic','description',x.description)}${textareaField('Action réalisée / suite','action',x.action)}${attachmentField(x.attachments)}</div>`,async form=>{
 const wasExisting=!!old;
 Object.assign(x,formDataObj(form));
 if(x.room==='Autre lieu'&&x.otherLocation)x.room=x.otherLocation;
 const nowIso=new Date().toISOString();
 if(!x.createdAt)x.createdAt=old?.createdAt||nowIso;
 x.updatedAt=nowIso;
 x.source='manual';

 const attachmentCheck=await processAttachments(form,x,'maintenance');
 if(!attachmentCheck?.ok)return {ok:false};

 // La copie locale devient immédiatement la référence.
 upsertDbRecord('maintenance',x);
 enforceMaintenanceStable(wasExisting?'modification intervention':'création intervention');
 localDirty=true;
 try{writeMirror()}catch(_){}
 try{writeOfflinePending('intervention à synchroniser')}catch(_){}
 refreshCollectionView('maintenance');

 const persisted=await commitFormRecordVerified('Intervention','maintenance',x);
 if(!persisted.ok)return {ok:false};

 // Contrôle réel après relecture.
 const confirmed=(db.maintenance||[]).find(r=>String(r.id)===String(x.id));
 const expected=recordComparableSnapshot(x);
 if(!confirmed||!recordMatchesExpected(expected,confirmed)){
   toast('⚠️ Intervention non confirmée après relecture');
   return {ok:false};
 }

 enforceMaintenanceStable('confirmation intervention');
 closeModal();
 refreshCollectionView('maintenance');
 toast(`✅ Intervention ${wasExisting?'modifiée':'créée'} — statut : ${x.status}`);
 return {ok:true};
},{audit:{track:!!old,type:'Intervention',recordId:x.id,no:x.no,title:x.title,entity:(form)=>[x.no,form?.elements?.title?.value||x.title].filter(Boolean).join(' — '),date:x.date},onDelete:old?()=>deleteRecord('maintenance',x.id,'intervention'):null});bindCentralLocation('maintLoc')}
function openRequest(id){const old=id?byId('requests',id):null;const x=old||{id:uid(),no:nextNo('request','DIR'),date:todayISO(),time:'',type:'Aménagement de salle',title:'',priority:'Normale',status:'À faire',building:'',floor:'',sector:'',room:'',requester:'Direction',dueDate:'',description:'',response:'',attachments:[]};openModal(old?'Modifier la demande':'Nouvelle demande de la direction',`<div class="form-grid">${field('Date','date',x.date,'date')}${field('Heure prévue','time',x.time,'time')}<label>Type<select name="type">${selectOptions(db.lists.requestTypes,x.type)}</select></label>${field('Objet','title',x.title,'text','required')}<label>Priorité<select name="priority">${selectOptions(db.lists.priorities,x.priority)}</select></label><label>Statut<select name="status">${selectOptions(db.lists.generalStatuses,x.status)}</select></label>${centralLocationFields(x,'reqLoc')}${field('Demandeur','requester',x.requester)}${field('Échéance','dueDate',x.dueDate,'date')}${textareaField('Demande','description',x.description)}${textareaField('Réponse / réalisation','response',x.response)}${attachmentField(x.attachments)}</div>`,async form=>{Object.assign(x,formDataObj(form));if(x.room==='Autre lieu'&&x.otherLocation)x.room=x.otherLocation;const attachmentCheck=await processAttachments(form,x,'requests');if(!attachmentCheck?.ok)return;const persisted=await commitFormRecordVerified('Demande','requests',x);if(!persisted.ok)return;closeModal();toast(`✅ Demande enregistrée — statut : ${x.status||'—'}`)},{audit:{track:!!old,type:'Demande',recordId:x.id,no:x.no,title:x.title,entity:(form)=>[x.no,form?.elements?.title?.value||x.title].filter(Boolean).join(' — '),date:x.date},onDelete:old?()=>deleteRecord('requests',x.id,'demande'):null});bindCentralLocation('reqLoc')}
function openWork(id){const old=id?byId('works',id):null;const x=old||{id:uid(),no:nextNo('work','CHT'),date:todayISO(),time:'',type:'Réunion de chantier',title:'',company:'',architect:'',building:'',floor:'',sector:'',room:'',priority:'Normale',status:'À faire',dueDate:'',description:'',decision:'',gpaEnd:'',attachments:[]};openModal(old?'Modifier le suivi chantier':'Nouveau suivi chantier / GPA',`<div class="form-grid">${field('Date','date',x.date,'date')}${field('Heure prévue','time',x.time,'time')}<label>Type<select name="type">${selectOptions(db.lists.workTypes,x.type)}</select></label>${field('Objet / réserve','title',x.title,'text','required')}${field('Entreprise','company',x.company)}${field('Architecte / maîtrise d’œuvre','architect',x.architect)}${centralLocationFields(x,'workLoc')}<label>Priorité<select name="priority">${selectOptions(db.lists.priorities,x.priority)}</select></label><label>Statut<select name="status">${selectOptions(db.lists.generalStatuses,x.status)}</select></label>${field('Échéance','dueDate',x.dueDate,'date')}${field('Fin GPA','gpaEnd',x.gpaEnd,'date')}${textareaField('Constat / description','description',x.description)}${textareaField('Décision / suite','decision',x.decision)}${attachmentField(x.attachments)}</div>`,async form=>{Object.assign(x,formDataObj(form));if(x.room==='Autre lieu'&&x.otherLocation)x.room=x.otherLocation;const attachmentCheck=await processAttachments(form,x,'works');if(!attachmentCheck?.ok)return;const persisted=await commitFormRecordVerified('Chantier / GPA','works',x);if(!persisted.ok)return;closeModal();toast(`✅ Suivi chantier enregistré — statut : ${x.status||'—'}`)},{onDelete:old?()=>deleteRecord('works',x.id,'suivi'):null});bindCentralLocation('workLoc')}
function openMeeting(id,date=todayISO()){const old=id?byId('meetings',id):null;const x=old||{id:uid(),no:nextNo('meeting','RDV'),date,time:'',end:'',type:'Rendez-vous',title:'',building:'',floor:'',sector:'',room:'',participants:'',status:'Planifié',notes:'',actions:'',attachments:[]};openModal(old?'Modifier le rendez-vous':'Nouvelle réunion / rendez-vous',`<div class="form-grid">${field('Date','date',x.date,'date','required')}${field('Heure','time',x.time,'time')}${field('Fin','end',x.end,'time')}<label>Type<select name="type">${selectOptions(db.lists.meetingTypes,x.type)}</select></label>${field('Objet','title',x.title,'text','required')}${centralLocationFields(x,'meetLoc')}${field('Participants','participants',x.participants)}<label>Statut<select name="status">${selectOptions(['Planifié','Réalisé','Reporté','Annulé'],x.status)}</select></label>${textareaField('Compte rendu','notes',x.notes)}${textareaField('Actions décidées','actions',x.actions)}${attachmentField(x.attachments)}</div>`,async form=>{Object.assign(x,formDataObj(form));if(x.room==='Autre lieu'&&x.otherLocation)x.room=x.otherLocation;x.location=[x.building,x.floor,x.sector,x.room].filter(Boolean).join(' · ');const attachmentCheck=await processAttachments(form,x,'meetings');if(!attachmentCheck?.ok)return;const persisted=await commitFormRecordVerified('Réunion / rendez-vous','meetings',x);if(!persisted.ok)return;closeModal();toast(`✅ Rendez-vous enregistré — statut : ${x.status||'—'}`)},{onDelete:old?()=>deleteRecord('meetings',x.id,'rendez-vous'):null});bindCentralLocation('meetLoc')}
function openNote(id,category='Autre'){const old=id?byId('notes',id):null;const x=old||{id:uid(),no:nextNo('note','NOT'),date:todayISO(),time:'',category,agentId:'',title:'',text:'',priority:'Normale',status:'À faire',building:'',floor:'',sector:'',room:'',dueDate:'',items:[],attachments:[]};openModal(old?'Modifier la note':'Nouvelle note',`<div class="form-grid">${field('Date','date',x.date,'date')}${field('Heure','time',x.time,'time')}<label>Catégorie<select name="category">${selectOptions(db.lists.noteCategories,x.category)}</select></label><label>Agent concerné<select name="agentId">${agentOptions(x.agentId,true)}</select></label><label>Priorité<select name="priority">${selectOptions(db.lists.priorities,x.priority)}</select></label>${field('Titre','title',x.title,'text','required')}<label>Statut<select name="status">${selectOptions(db.lists.generalStatuses,x.status)}</select></label>${field('Échéance','dueDate',x.dueDate,'date')}${centralLocationFields(x,'noteLoc')}${noteVoiceField(x.text)}</div><fieldset><legend>Liste d’items</legend>${noteItemsHTML(x.items)}</fieldset>${attachmentField(x.attachments)}`,async form=>{const o=formDataObj(form);const rows=$$('.item-row',form).map(r=>({text:r.querySelector('[name="itemText"]').value.trim(),done:r.querySelector('[name="itemDone"]').checked})).filter(i=>i.text);Object.assign(x,o,{items:rows});const attachmentCheck=await processAttachments(form,x,'notes');if(!attachmentCheck?.ok)return;if(x.room==='Autre lieu'&&x.otherLocation)x.room=x.otherLocation;const persisted=await commitFormRecordVerified('Note','notes',x);if(!persisted.ok)return;closeModal();toast(`✅ Note enregistrée — statut : ${x.status||'—'}`)},{onDelete:old?()=>deleteRecord('notes',x.id,'note'):null});bindCentralLocation('noteLoc');bindNoteSpeechDictation();function bindItems(){const box=$('#noteItems');if(!box)return;$$('[data-remove-item]',box).forEach(b=>b.onclick=()=>b.closest('.item-row')?.remove())}bindItems();const add=$('#addNoteItem');if(add)add.onclick=()=>{const box=$('#noteItems');if(!box)return;box.insertAdjacentHTML('beforeend','<div class="item-row"><input name="itemText" placeholder="Nouvelle action"><label class="inline-check"><input name="itemDone" type="checkbox"> Fait</label><button type="button" data-remove-item>×</button></div>');bindItems()}}
function openVacation(id){const old=id?byId('vacations',id):null;const x=old||{id:uid(),name:'Fermeture / vacances',zone:db.settings.schoolZone,start:todayISO(),end:addDays(todayISO(),7),status:'À préparer',tasks:VACATION_TASKS.map(t=>({text:t,done:false})),notes:'',attachments:[]};openModal(old?'Modifier la période':'Nouvelle période de vacances / fermeture',`<div class="form-grid">${field('Nom','name',x.name,'text','required')}<label>Zone<select name="zone">${selectOptions(['A','B','C','Toutes'],x.zone)}</select></label>${field('Début','start',x.start,'date','required')}${field('Fin','end',x.end,'date','required')}<label>Statut<select name="status">${selectOptions(['À préparer','En préparation','Prête','Terminée'],x.status)}</select></label>${textareaField('Notes','notes',x.notes)}</div><fieldset><legend>Checklist de fermeture / reprise</legend>${noteItemsHTML(x.tasks)}</fieldset>${attachmentField(x.attachments)}`,async form=>{const o=formDataObj(form);const tasks=$$('.item-row',form).map(r=>({text:r.querySelector('[name="itemText"]').value.trim(),done:r.querySelector('[name="itemDone"]').checked})).filter(i=>i.text);Object.assign(x,o,{tasks});const attachmentCheck=await processAttachments(form,x,'vacations');if(!attachmentCheck?.ok)return;const persisted=await commitFormRecordVerified('Vacances / fermeture','vacations',x);if(!persisted.ok)return;closeModal();toast(`✅ Période enregistrée — statut : ${x.status||'—'}`)},{onDelete:old?()=>deleteRecord('vacations',x.id,'période'):null});function bind(){const box=$('#noteItems');if(!box)return;$$('[data-remove-item]',box).forEach(b=>b.onclick=()=>b.closest('.item-row')?.remove())}bind();const add=$('#addNoteItem');if(add)add.onclick=()=>{const box=$('#noteItems');if(!box)return;box.insertAdjacentHTML('beforeend','<div class="item-row"><input name="itemText" placeholder="Nouvelle action"><label class="inline-check"><input name="itemDone" type="checkbox"> Fait</label><button type="button" data-remove-item>×</button></div>');bind()}}
function openDocument(id){const old=id?byId('documents',id):null;const x=old||{id:uid(),no:nextNo('document','DOC'),date:todayISO(),title:'',category:'Guide / procédure',description:'',linkedModule:'Général',attachments:[]};openModal(old?'Modifier le document':'Ajouter un document',`<div class="form-grid">${field('Date','date',x.date,'date')}<label>Catégorie<select name="category">${selectOptions(db.lists.documentCategories,x.category)}</select></label>${field('Titre','title',x.title,'text','required')}<label>Rattacher à<select name="linkedModule">${selectOptions(['Général','Ménage','Maintenance','Chantier / GPA','Contrôles périodiques','Agents','Vacances','Sécurité / qualité'],x.linkedModule)}</select></label>${textareaField('Description','description',x.description)}${attachmentField(x.attachments)}</div>`,async form=>{Object.assign(x,formDataObj(form));const attachmentCheck=await processAttachments(form,x,'documents');if(!attachmentCheck?.ok)return;const persisted=await commitFormRecordVerified('Document','documents',x);if(!persisted.ok)return;closeModal();toast('✅ Document enregistré')},{onDelete:old?()=>deleteRecord('documents',x.id,'document'):null})}
function openSpace(id){const old=id?byId('spaces',id):null;const x=old||{id:uid(),building:db.buildings[0]?.name||'',floor:db.buildings[0]?.floors?.[0]||'',type:db.lists.roomTypes[0],name:''};openModal(old?'Modifier le local':'Ajouter un local',`<div class="form-grid"><label>Bâtiment<select name="building" id="mBuilding">${buildingOptions(x.building)}</select></label><label>Étage<select name="floor" id="mFloor">${floorOptions(x.building,x.floor)}</select></label><label>Type<select name="type">${selectOptions(db.lists.roomTypes,x.type)}</select></label>${field('Nom / numéro du local','name',x.name,'text','required')}</div>`,async form=>{Object.assign(x,formDataObj(form));const persisted=await commitFormRecordVerified('Local','spaces',x);if(!persisted.ok)return;closeModal();toast('✅ Local enregistré')},{onDelete:old?()=>deleteRecord('spaces',x.id,'local'):null});$('#mBuilding').onchange=()=>$('#mFloor').innerHTML=floorOptions($('#mBuilding').value)}
/* ---------- Rendu : calendriers ---------- */
function editButton(type,id,label='Modifier'){return `<button class="icon-btn row-edit" data-edit-type="${type}" data-edit-id="${esc(id)}" title="${label}">✎</button>`}
function cardList(items,empty='Aucun élément.'){return items.length?items.join(''):`<p class="empty-card">${esc(empty)}</p>`}
function renderTeamCalendar(){
  const days=Array.from({length:7},(_,i)=>addDays(teamWeek,i));
  $('#teamWeekLabel').textContent=`Semaine ${weekNumber(teamWeek)} · ${fmtDate(days[0])} au ${fmtDate(days[6])}`;
  $('#teamDateJump').value=teamWeek;
  const agents=db.agents.filter(a=>a.status==='Actif');
  if(!agents.length){$('#teamWeekCalendar').innerHTML='<div class="empty">Ajoutez un agent pour afficher le planning de la semaine.</div>';return}

  const html=days.map(date=>{
    const dateObj=parseDate(date);
    let present=0;
    const rows=agents.map(a=>{
      const info=dayInfo(a.id,date),h=dayHours(info),display=planningDisplayFor(a,date);
      if(info.dayType==='Présence')present++;

      const absent=isAbsenceType(info.dayType);
      const cls=absent?'absence':info.dayType==='Formation'?'training':info.dayType==='Repos'?'rest':info.shift==='Soir'?'evening':info.shift==='Matin'?'morning':'neutral';

      const theoreticalText=info.plannedStart&&info.plannedEnd
        ?`${info.plannedStart}–${info.plannedEnd}`
        :(info.shift==='Repos'?'Repos / non travaillé':'Horaire non défini');

      let mainLine='',secondaryLine='';
      if(info.dayType!=='Présence'){
        // Congé, RTT, maladie, formation, repos… : le statut saisi est l'information principale.
        mainLine=`<small class="agent-effective-day"><b>${esc(info.dayType)}</b></small>`;
        secondaryLine=theoreticalText&&theoreticalText!=='Horaire non défini'
          ?`<small class="agent-theoretical muted">Théorique : ${esc(theoreticalText)}</small>`:'';
      }else if(display.realChanged){
        // Un horaire réel différent remplace l'horaire théorique dans le quadrillage.
        mainLine=`<small class="agent-effective-day"><b>Réel : ${esc(display.real)}</b></small>`;
        secondaryLine=`<small class="agent-theoretical muted">Théorique : ${esc(display.theoretical)}</small>`;
      }else{
        // Pas de changement réel : on reste sur le théorique.
        mainLine=`<small class="agent-effective-day"><b>Horaire : ${esc(theoreticalText)}</b></small>`;
        const sourceLabel=info.shift==='Permanence'?'Permanence':info.source==='rotation'?(info.shift||'Roulement'):info.shift==='Standard'?'Standard':info.shift==='Repos'?'Repos':'';
        secondaryLine=sourceLabel?`<small class="agent-theoretical muted">${esc(sourceLabel)}</small>`:'';
      }

      const motive=info.source==='manual'&&info.note
        ?`<small class="agent-missions">ⓘ ${esc(info.note)}</small>`
        :(info.dayType==='Présence'&&info.missions?`<small class="agent-missions">${esc(info.missions)}</small>`:'');

      const delta=Math.abs(h.delta)>0.001
        ?`<em class="agent-delta ${h.delta>0?'positive':'negative'}">${fmtSignedHours(h.delta)}</em>`:'';

      return `<button class="team-agent-entry ${cls}" data-agent-day="${a.id}" data-date="${date}" title="Modifier ${esc(agentName(a))} le ${fmtDate(date)}"><span class="agent-entry-avatar">${esc((a.firstName||a.lastName||'?').charAt(0).toUpperCase())}</span><span class="agent-entry-main"><strong>${esc(agentName(a))}</strong>${mainLine}${secondaryLine}${motive}</span>${delta}<span class="agent-entry-arrow">›</span></button>`;
    }).join('');

    return `<section class="team-day-card ${date===todayISO()?'today':''}"><header class="team-day-header"><div><strong>${dateObj.toLocaleDateString('fr-FR',{weekday:'long'})}</strong><span>${dateObj.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}</span></div><small>${present}/${agents.length} prévu${present>1?'s':''}</small></header><div class="team-day-agents">${rows}</div></section>`;
  }).join('');

  $('#teamWeekCalendar').innerHTML=`<div class="team-week-cards">${html}</div>`;
}
function roomPrepAgendaItems(){
 return Array.isArray(db.roomPreps)?db.roomPreps.filter(x=>!x?.deletedAt):[];
}
function wasteAgendaItemForDate(d){
 const api=window.PSTWeatherWaste;if(!api?.collectionInfo||!api?.binForDate||!api?.localISO)return null;
 const day=parseDate(d),wd=day.getDay();let friday=null;
 if(wd===5)friday=new Date(day);
 else if(wd===6){friday=new Date(day);friday.setDate(friday.getDate()-1)}
 else return null;
 const ci=api.collectionInfo(friday),actual=api.localISO(ci.actual);
 if(actual!==d)return null;
 const bin=api.binForDate(friday);
 return {id:`waste-${d}`,date:d,start:'',title:`${bin.icon} Sortir / passage ${bin.label}`,source:'waste',view:'waste',meta:`Rue Noëlas · Rue Jean Puy${ci.shifted?' · collecte décalée':''}`};
}

/* ---------- V147.148 : relevé mensuel des compteurs ---------- */
function lastWorkingDayOfMonth(year,month){
  // month = 1..12. Jour ouvré = lundi à vendredi, hors jours fériés français connus par l'application.
  const last=new Date(Number(year),Number(month),0);
  for(let day=last.getDate();day>=1;day--){
    const iso=`${year}-${pad(month)}-${pad(day)}`,wd=parseDate(iso).getDay();
    if(wd!==0&&wd!==6&&!frenchPublicHolidayName(iso))return iso;
  }
  return `${year}-${pad(month)}-01`;
}
function meterReadingItemForDate(date){
  const d=normalizeDateValue(date);if(!d)return null;
  const y=Number(d.slice(0,4)),m=Number(d.slice(5,7));
  const due=lastWorkingDayOfMonth(y,m);
  if(d!==due)return null;
  return {
    id:`meter-reading-${d}`,date:d,start:'',time:'',type:'Tâche',priority:'Normale',status:'À faire',
    title:'Relevé des compteurs',location:'Logements',source:'meter-reading',view:'personal',
    meta:'Dernier jour ouvré du mois',readOnlyRecurring:true
  };
}
function meterReadingItemsForMonth(month){
  const ym=String(month||'').slice(0,7);if(!/^\d{4}-\d{2}$/.test(ym))return [];
  const [y,m]=ym.split('-').map(Number),d=lastWorkingDayOfMonth(y,m);
  const item=meterReadingItemForDate(d);
  return item?[item]:[];
}
function meterReadingItemsForAcademicYear(label=activeAcademicYear()){
  const range=academicYearRange(label),out=[];
  let d=range.start.slice(0,7)+'-01';
  while(d<=range.end){
    const [y,m]=d.slice(0,7).split('-').map(Number);
    const due=lastWorkingDayOfMonth(y,m);
    if(due>=range.start&&due<=range.end){
      const item=meterReadingItemForDate(due);if(item)out.push(item);
    }
    d=addMonths(d,1).slice(0,7)+'-01';
  }
  return out;
}
function renderMeterReadingsAgenda(){
  const el=$('#meterReadingsAgenda');if(!el)return;
  const today=todayISO(),items=meterReadingItemsForAcademicYear();
  el.innerHTML=items.length?items.map(x=>{
    const month=parseDate(x.date).toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
    const cls=x.date<today?'past':(x.date.slice(0,7)===today.slice(0,7)?'current':'');
    return `<div class="meter-reading-row ${cls}">
      <strong>${esc(month.charAt(0).toUpperCase()+month.slice(1))}</strong>
      <small>${fmtDateLong(x.date)} — Relevé des compteurs</small>
      <span class="meter-reading-chip">Dernier jour ouvré</span>
    </div>`;
  }).join(''):'<div class="empty">Aucune échéance dans l’année scolaire sélectionnée.</div>';
}

function eventsForDate(d){
 const sameDay=(x)=>normalizeDateValue(x)===d;
 const active=(x)=>!isClosedStatus(x.status)&&normalizeText(x.status)!=='annule';
 const onDateOrDue=(x)=>sameDay(x.date)||sameDay(recordDueDate(x));
 const rows=[
  ...(db.personalEvents||[]).filter(x=>sameDay(x.date)&&active(x)).map(x=>({...x,source:'personal',start:x.start||''})),
  ...(db.meetings||[]).filter(x=>sameDay(x.date)&&active(x)).map(x=>({...x,source:'meeting',start:x.time||'',title:x.title||'Rendez-vous'})),
  ...(db.notes||[]).filter(x=>onDateOrDue(x)&&active(x)).map(x=>({...x,date:d,start:x.time||'',source:'note',title:`Note · ${x.title||'À traiter'}`})),
  ...(db.maintenance||[]).filter(x=>onDateOrDue(x)&&active(x)).map(x=>({...x,date:d,start:x.time||'',source:'maintenance',title:`Maintenance · ${x.title||'Intervention'}`})),
  ...(db.requests||[]).filter(x=>onDateOrDue(x)&&active(x)).map(x=>({...x,date:d,start:x.time||'',source:'request',title:`Direction · ${x.title||x.description||'Demande'}`})),
  ...(db.works||[]).filter(x=>onDateOrDue(x)&&active(x)).map(x=>({...x,date:d,start:x.time||'',source:'work',title:`Chantier/GPA · ${x.title||'Action'}`})),
  ...(db.issues||[]).filter(x=>onDateOrDue(x)&&active(x)).map(x=>({...x,date:d,start:x.time||'',source:'issue',title:`${normalizeText(x.priority)==='urgente'?'⚠️ ':''}Sécurité/qualité · ${x.title||x.description||'Action'}`})),
  ...periodicEventsForDateV165(d),
  ...roomPrepAgendaItems().filter(x=>sameDay(x.date)&&normalizeText(x.status)!=='termine').map(x=>({...x,start:x.time||x.coffee?.time||'',source:'roomprep',title:`Préparation salle${x.coffee?.enabled?' + café':''} · ${x.room||'Salle'}`})),
  ...(db.vacations||[]).filter(x=>sameDay(x.start)&&normalizeText(x.status)!=='cloturee').map(x=>({...x,date:d,start:'',source:'vacation',title:`Vacances / fermeture · ${x.name||'Période'}`})),
  ...([meterReadingItemForDate(d)].filter(Boolean))
 ];
 // V147.167 — tout horaire réel complet apparaît dans l'agenda.
 // S'il diffère du théorique, le changement est signalé visuellement et le théorique reste rappelé.
 for(const r of (db.agentDays||[]).filter(x=>String(x.date||'')===d && x.actualStart && x.actualEnd)){
   const info=dayInfo(r.agentId,d);
   const thStart=String(info.plannedStart||'').trim(), thEnd=String(info.plannedEnd||'').trim();
   const realStart=String(r.actualStart||'').trim(), realEnd=String(r.actualEnd||'').trim();
   if(realStart && realEnd){
     const changed=Boolean(thStart&&thEnd&&(realStart!==thStart || realEnd!==thEnd));
     const realAgentName=agentName(agentById(r.agentId))||'Agent';
     rows.push({id:r.id,date:d,start:realStart,time:realStart,source:'agent-real-schedule',
       title:changed?`⚠ ${realAgentName} · Horaire modifié : ${realStart}–${realEnd}`:`${realAgentName} · Horaire réel : ${realStart}–${realEnd}`,
       location:'',note:r.note||'',agentId:r.agentId,scheduleChanged:changed,
       calendarInfo:[changed&&thStart&&thEnd?`Prévu ${thStart}–${thEnd}`:'',r.note?`ⓘ ${r.note}`:''].filter(Boolean).join(' · ')});
   }
 }
 const waste=wasteAgendaItemForDate(d);if(waste)rows.push(waste);
 return rows.sort((x,y)=>`${x.start||'99:99'}${x.title||''}`.localeCompare(`${y.start||'99:99'}${y.title||''}`));
}
function agendaPlace(e){
 if(e.location)return e.location;
 const parts=[e.room,e.sector,e.floor,e.building].filter(Boolean);
 return [...new Set(parts)].join(' · ');
}
function agendaTime(e){return e.start||e.time||e.deadlineTime||''}
function agendaMeta(e){
 const parts=[];const place=agendaPlace(e);
 if(place)parts.push(`📍 ${place}`);
 if(e.meta)parts.push(e.meta);
 return parts.join(' · ');
}
function personalEventButton(e){
 const tm=agendaTime(e),meta=agendaMeta(e);
 return `<button class="mini-event agenda-action ${esc(e.source||'personal')}" data-agenda-source="${esc(e.source||'personal')}" data-agenda-id="${esc(e.id||'')}"><b>${tm?`🕒 ${esc(tm)}`:'🕒 —'}</b><span>${esc(e.title||'Événement')}</span>${meta?`<small>${esc(meta)}</small>`:''}${e.calendarInfo?`<small class="calendar-info">${esc(e.calendarInfo)}</small>`:''}</button>`;
}
function renderDashboardTodayAgenda(){
 const el=$('#dashboardTodayAgenda');if(!el)return;
 const rows=eventsForDate(todayISO());
 el.innerHTML=rows.length?rows.map(e=>{const tm=agendaTime(e),place=agendaPlace(e);return `<button class="today-agenda-row agenda-action ${esc(e.source||'personal')}" data-agenda-source="${esc(e.source||'personal')}" data-agenda-id="${esc(e.id||'')}"><span class="today-agenda-time">${esc(tm||'—')}</span><span class="today-agenda-main"><strong>${esc(e.title||'Événement')}</strong><small>${place?`📍 ${esc(place)}`:'📍 Lieu non renseigné'}</small></span><span class="today-agenda-arrow">›</span></button>`}).join(''):'<div class="empty">Aucun événement prévu aujourd’hui.</div>';
}
function renderPersonalCalendar(){
 const days=Array.from({length:7},(_,i)=>addDays(personalWeek,i));
 $('#personalWeekLabel').textContent=`${fmtDate(days[0])} au ${fmtDate(days[6])}`;
 $('#personalWeekCalendar').innerHTML=days.map(d=>`<div class="personal-day ${d===todayISO()?'today':''}"><button class="personal-day-head" data-new-personal-date="${d}"><strong>${parseDate(d).toLocaleDateString('fr-FR',{weekday:'long'})}</strong><span>${parseDate(d).getDate()}</span></button><div>${cardList(eventsForDate(d).map(personalEventButton),'Libre')}</div></div>`).join('');
}
window.PSTRefreshPersonalAgenda=()=>{try{renderPersonalCalendar()}catch(e){console.warn('Actualisation agenda',e)}};

document.addEventListener('click',e=>{
 const b=e.target.closest?.('.agenda-action[data-agenda-source="meter-reading"]');if(!b)return;
 e.preventDefault();e.stopPropagation();
 openDetail('Relevé des compteurs',`<div class="notice"><strong>À faire :</strong> Relevé des compteurs des logements.</div><p>Cette tâche revient automatiquement le dernier jour ouvré de chaque mois.</p>`);
},true);

function calendarDayVisual(info){
 const raw=info.dayType||'Présence',day=normalizeText(raw),shift=normalizeText(info.shift||'Standard'),disp=db.settings?.chronoDayDisplay?.[raw]||{};
 let v;
 if(/maladie/.test(day))v={cls:'sick',code:'MAL',label:'Maladie'};
 else if(/rtt/.test(day))v={cls:'rtt',code:'RTT',label:'RTT'};
 else if(/congé|conge/.test(day))v={cls:'leave',code:'CA',label:'Congé annuel'};
 else if(/férié|ferie|rfe/.test(day))v={cls:'holiday',code:'RFE',label:'Jour férié'};
 else if(/repos/.test(day))v={cls:'off',code:'RH',label:'Repos'};
 else if(/absence temps partiel/.test(day))v={cls:'other',code:'RTP',label:'Absence temps partiel'};
 else if(day!=='presence')v={cls:'other',code:day==='formation'?'F':'ABS',label:raw||'Absence'};
 else if(shift==='matin')v={cls:'morning',code:'M',label:'Matin'};
 else if(shift==='soir')v={cls:'evening',code:'S',label:'Soir'};
 else v={cls:'standard',code:'ST',label:'Standard'};
 if(day!=='presence'&&disp.abbr)v.code=(raw==='Absence temps partiel'&&disp.abbr==='ATP')?'RTP':disp.abbr;
 if(day!=='presence'&&disp.color)v.color=disp.color;
 return v;
}
function renderAbsenceBoard(){const month=$('#absenceMonth').value||monthISO(),[y,m]=month.split('-').map(Number),count=new Date(y,m,0).getDate(),agents=db.agents.filter(a=>a.status==='Actif'),gridWidth=150+(count*42);let html=`<div class="month-grid" style="grid-template-columns:150px repeat(${count},42px);min-width:${gridWidth}px"><div class="month-corner">Agent</div>`+Array.from({length:count},(_,i)=>{const d=`${month}-${pad(i+1)}`;return `<div class="month-day-head ${[0,6].includes(parseDate(d).getDay())?'weekend':''}">${i+1}</div>`}).join('');for(const a of agents){html+=`<div class="month-agent">${esc(agentName(a))}</div>`;for(let i=1;i<=count;i++){const d=`${month}-${pad(i)}`,info=dayInfo(a.id,d),v=calendarDayVisual(info),hours=info.plannedStart&&info.plannedEnd?` ${info.plannedStart}–${info.plannedEnd}`:'';html+=`<button class="month-cell day-state ${v.cls}" ${v.color?`style="background:${esc(v.color)}!important"`:``} data-agent-day="${a.id}" data-date="${d}" data-day-type="${esc(info.dayType||'Présence')}" title="${fmtDate(d)} — ${esc(v.label)}${esc(hours)}"><span>${v.code}</span></button>`}}html+='</div>';$('#absenceMonthBoard').innerHTML=html}

/* ---------- Rendu : modules ---------- */
function renderAgents(){const q=($('#agentSearch').value||'').toLowerCase(),status=$('#agentStatus').value;const arr=db.agents.filter(a=>(!status||a.status===status)&&(!q||agentName(a).toLowerCase().includes(q)||String(a.assignment).toLowerCase().includes(q)));$('#agentCards').innerHTML=cardList(arr.map(a=>{const state=agentState(a),month=$('#planningMonth').value||monthISO(),rows=db.agentDays.filter(x=>x.agentId===a.id&&dateMonthMatch(x.date,month)),absence=rows.filter(x=>isAbsenceType(x.dayType)).length,ot=rows.reduce((s,x)=>s+Number(x.overtime||0),0);return `<article class="agent-card"><div class="agent-avatar">${esc((a.firstName||'?')[0])}</div><div class="agent-main"><div class="panel-head"><h3>${esc(agentName(a))}</h3>${badge(a.status)}</div><p>${esc(a.role)} · ${esc(a.assignment||'Sans affectation')}</p><div class="agent-stats"><span>${badge(state.label)}</span><span>${fmtHours(a.weeklyHours)} / semaine</span>${(()=>{const p=permanenceScheduleForAgent(a.id);return p.start&&p.end?`<span class="perm-summary">🟠 Permanence ${esc(p.start)}–${esc(p.end)}</span>`:''})()}${(()=>{if(activeRotation(a.id,todayISO()))return '';const s=standardScheduleForAgent(a.id,todayISO());return s.start&&s.end?`<span class="std-summary">🔵 Standard ${esc(s.start)}–${esc(s.end)}</span>`:''})()}<span>${absence} absence(s) ce mois</span><span>${fmtSignedHours(ot)} supp.</span></div><div class="card-actions"><button type="button" data-edit-type="agent" data-edit-id="${a.id}">Modifier</button><button data-new-weekly-agent="${a.id}">Horaires annuels</button><button data-permanence-agent="${a.id}" class="permanence-button">Permanence</button><button data-new-rotation-agent="${a.id}">Roulement</button><button data-agent-day="${a.id}" data-date="${todayISO()}">Signaler un écart</button></div></div></article>`}),'Aucun agent trouvé.')}
function rotationPilotageSummary(agentId,shift,r){
 const labels=['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'],days=(r.weekdays||[1,2,3,4,5]).map(Number),rows=[];
 for(const wd of days){const p=exactWeeklyProfile(agentId,shift,wd,r.effectiveFrom);if(p?.start&&p?.end)rows.push({wd,start:p.start,end:p.end})}
 if(!rows.length)return '<span class="schedule-missing">À définir dans Pilotage des horaires</span>';
 const unique=[...new Set(rows.map(x=>`${x.start}–${x.end}`))];
 if(unique.length===1)return `<strong class="schedule-source ${shift==='Matin'?'morning':'evening'}">${esc(unique[0])}</strong>`;
 return `<div class="rotation-hours-detail">${rows.map(x=>`<small><b>${labels[x.wd]}</b> ${esc(x.start)}–${esc(x.end)}</small>`).join('')}</div>`;
}
function dashboardAcademicStartYear(){
  const academic=(typeof activeAcademicYear==='function'
    ? activeAcademicYear()
    : (db.settings?.academicYear||academicYearFor(todayISO())||''));
  const y=Number(String(academic||'').split('-')[0]);
  return Number.isFinite(y)&&y>2000?y:new Date().getFullYear();
}
function syncRotationYearWithDashboard(){
  const el=$('#rotationYear');
  if(el)el.value=String(dashboardAcademicStartYear());
}

function renderRotations(){syncRotationYearWithDashboard();const agent=$('#rotationAgent').value;const arr=db.rotations.filter(r=>periodOverlapsAcademicYear(r)&&(!agent||r.agentId===agent)).sort((a,b)=>a.agentId.localeCompare(b.agentId)||b.effectiveFrom.localeCompare(a.effectiveFrom));$('#rotationsTable').innerHTML=arr.length?arr.map(r=>`<tr><td>${esc(agentName(agentById(r.agentId)))}</td><td>${fmtDate(r.effectiveFrom)}</td><td>${r.morningWeeks} sem. matin / ${r.eveningWeeks} sem. soir</td><td>${rotationPilotageSummary(r.agentId,'Matin',r)}</td><td>${rotationPilotageSummary(r.agentId,'Soir',r)}</td><td>${(r.weekdays||[]).map(d=>['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d]).join(', ')}</td><td>${fmtDate(r.effectiveTo)||'En cours'}</td><td>${editButton('rotation',r.id)}</td></tr>`).join(''):emptyRow(8);renderRotationPreview()}
function latestChronotimeAcademicStartYear(){
 const rows=[...(db.chronotimeAnnual||[])].filter(x=>/^\d{4}-\d{4}$/.test(String(x.academicYear||'')));
 rows.sort((x,y)=>String(y.importedAt||y.date||'').localeCompare(String(x.importedAt||x.date||'')));
 const raw=rows[0]?.academicYear||'';
 const y=Number(String(raw).split('-')[0]);
 return Number.isFinite(y)&&y>2000?y:null;
}
function renderRotationPreview(){syncRotationYearWithDashboard();const startYear=dashboardAcademicStartYear(),month=$('#rotationMonth').value,agentId=$('#rotationAgent').value||db.agents.find(a=>a.status==='Actif')?.id;if(!agentId){$('#rotationPreview').innerHTML='<p>Aucun agent.</p>';return}const months=month?[Number(month)]:[9,10,11,12,1,2,3,4,5,6,7,8];const academicLabel=`${startYear}–${startYear+1}`;$('#rotationPreview').innerHTML=`<div class="rotation-schoolyear-title"><h4>${esc(agentName(agentById(agentId)))} — année scolaire ${academicLabel}</h4><small>1er septembre ${startYear} → 31 août ${startYear+1}</small></div>`+months.map(m=>{const y=m>=9?startYear:startYear+1,first=`${y}-${pad(m)}-01`,last=new Date(y,m,0).getDate();return `<div class="rotation-month"><strong>${parseDate(first).toLocaleDateString('fr-FR',{month:'long',year:'numeric'})}</strong><div>${Array.from({length:last},(_,i)=>{const d=`${y}-${pad(m)}-${pad(i+1)}`,info=dayInfo(agentId,d),shift=normalizeText(info.shift||'standard'),day=String(info.dayType||'Présence'),cls=/maladie/i.test(day)?'sick':/congé|conge/i.test(day)?'leave':/rtt/i.test(day)?'rtt':/férié|ferie|rfe/i.test(day)?'holiday':day!=='Présence'?'off':shift==='matin'?'morning':shift==='soir'?'evening':'standard',label=day!=='Présence'?day:(info.shift||'Standard');return `<button class="rotation-day ${cls}" data-agent-day="${agentId}" data-date="${d}" title="${fmtDate(d)} — ${label}${info.plannedStart&&info.plannedEnd?` ${info.plannedStart}–${info.plannedEnd}`:''}"><span>${i+1}</span><small>${cls==='morning'?'M':cls==='evening'?'S':cls==='standard'?'STD':cls==='leave'?'CA':cls==='rtt'?'RTT':cls==='sick'?'MAL':cls==='holiday'?'JF':'—'}</small></button>`}).join('')}</div></div>`}).join('')}

function renderWeeklyPlans(){const box=$('#weeklyPlansBoard');if(!box)return;normalizeWeeklyPlans();const cleaned=cleanupExistingWeeklyPlanOverlaps();if(cleaned>0){localDirty=true;try{writeMirror()}catch(_){};if(currentUser&&navigator.onLine&&!cloudBusy)setTimeout(()=>window.PSTMainState.persistNow(),400)}const days=['Lundi','Mardi','Mercredi','Jeudi','Vendredi'];box.innerHTML=(db.weeklyPlans||[]).map((p,pi)=>({p,pi})).filter(({p})=>periodOverlapsAcademicYear(p)).map(({p,pi})=>`<article class="weekly-plan-card"><div class="panel-head"><div><h4>${esc(agentName(agentById(p.agentId))||p.agent||'Planning')}</h4>${badge(p.shift||'Standard')}<small>${fmtDate(p.effectiveFrom)} → ${fmtDate(p.effectiveTo)}</small></div><button class="ghost small" data-edit-weekly-plan="${pi}">Modifier</button></div><div class="weekly-day-grid">${days.map((d,i)=>{const x=p.dayProfiles?.[i+1]||{};return `<button class="weekly-day" data-edit-weekly-plan="${pi}"><strong>${d}</strong><span>${x.start&&x.end?`${x.start}–${x.end}`:'Non travaillé'}</span><small>${esc(x.missions||'')}</small></button>`}).join('')}</div></article>`).join('')||'<div class="empty">Aucun horaire de référence. Ajoutez un agent ou un planning.</div>'}

function weeklyPlanRangeOverlap(aFrom,aTo,bFrom,bTo){
 const af=String(aFrom||'0000-01-01'),at=String(aTo||'9999-12-31');
 const bf=String(bFrom||'0000-01-01'),bt=String(bTo||'9999-12-31');
 return af<=bt&&bf<=at;
}
function weeklyPlanConflicts(agentId,from,to,excludeId=''){
 return (db.weeklyPlans||[]).filter(q=>
   String(q.agentId)===String(agentId) &&
   (!excludeId||String(q.id)!==String(excludeId)) &&
   weeklyPlanRangeOverlap(from,to,q.effectiveFrom,q.effectiveTo)
 );
}
function weeklyPlanConflictText(agentId,from,to,excludeId=''){
 const rows=weeklyPlanConflicts(agentId,from,to,excludeId);
 if(!rows.length)return '';
 const agent=agentName(agentById(agentId))||'cet agent';
 const details=rows
   .sort((a,b)=>String(a.effectiveFrom||'').localeCompare(String(b.effectiveFrom||'')))
   .map(q=>`• ${fmtDate(q.effectiveFrom)||'Début non défini'} → ${fmtDate(q.effectiveTo)||'Fin non définie'} (${q.shift||'Standard'})`)
   .join('\n');
 return `⚠️ ${agent} possède déjà un horaire théorique sur tout ou partie de cette période.\n\n${details}\n\nIl ne peut y avoir qu’UN SEUL horaire théorique par date.\n\nVoulez-vous remplacer l’horaire existant sur la période ${fmtDate(from)} → ${fmtDate(to)} ?`;
}
function cloneWeeklyPlanForRange(plan,from,to){
 const c=deepClone(plan);
 c.id=uid();
 c.effectiveFrom=from;
 c.effectiveTo=to;
 c.historyCreatedAt=new Date().toISOString();
 c.historySourcePlanId=plan.id||'';
 return c;
}
function removeWeeklyPlanOverlap(agentId,from,to,excludeId=''){
 const source=Array.isArray(db.weeklyPlans)?db.weeklyPlans:[];
 const out=[];
 for(const q of source){
   if(String(q.agentId)!==String(agentId) ||
      (excludeId&&String(q.id)===String(excludeId)) ||
      !weeklyPlanRangeOverlap(from,to,q.effectiveFrom,q.effectiveTo)){
     out.push(q);continue;
   }

   const qFrom=String(q.effectiveFrom||'0000-01-01');
   const qTo=String(q.effectiveTo||'9999-12-31');

   // La nouvelle période est au milieu de l'ancienne : conserver avant + après.
   if(qFrom<from && qTo>to){
     const left=deepClone(q);
     left.effectiveTo=addDays(from,-1);
     const right=cloneWeeklyPlanForRange(q,addDays(to,1),qTo);
     out.push(left,right);
     continue;
   }

   // Chevauchement à droite de l'ancienne : conserver uniquement la partie avant.
   if(qFrom<from && qTo>=from && qTo<=to){
     const left=deepClone(q);
     left.effectiveTo=addDays(from,-1);
     if(left.effectiveTo>=left.effectiveFrom)out.push(left);
     continue;
   }

   // Chevauchement à gauche de l'ancienne : conserver uniquement la partie après.
   if(qFrom>=from && qFrom<=to && qTo>to){
     const right=deepClone(q);
     right.effectiveFrom=addDays(to,1);
     if(right.effectiveTo>=right.effectiveFrom)out.push(right);
     continue;
   }

   // Sinon l'ancienne période est entièrement couverte : elle est remplacée.
 }
 db.weeklyPlans=out;
}

function weeklyPlanPriority(plan){
 const updated=Date.parse(plan?.updatedAt||plan?.historyUpdatedAt||plan?.createdAt||plan?.historyCreatedAt||'')||0;
 const from=Date.parse(plan?.effectiveFrom||'')||0;
 return updated*10000000000000+from;
}
function cleanupExistingWeeklyPlanOverlaps(){
 normalizeWeeklyPlans();
 const source=(db.weeklyPlans||[]).map(x=>deepClone(x));
 if(source.length<2)return 0;

 const byAgent=new Map();
 for(const p of source){
   const key=String(p.agentId||'');
   if(!byAgent.has(key))byAgent.set(key,[]);
   byAgent.get(key).push(p);
 }

 const final=[];
 let changed=0;

 for(const [agentId,plans] of byAgent){
   // Traiter du plus prioritaire au moins prioritaire.
   const ordered=plans.slice().sort((a,b)=>{
     const pa=weeklyPlanPriority(a),pb=weeklyPlanPriority(b);
     if(pb!==pa)return pb-pa;
     return String(b.effectiveFrom||'').localeCompare(String(a.effectiveFrom||''));
   });

   const accepted=[];
   for(const p of ordered){
     let fragments=[deepClone(p)];

     // Tout plan déjà accepté est prioritaire : retirer son chevauchement du plan courant.
     for(const high of accepted){
       const next=[];
       for(const f of fragments){
         if(!weeklyPlanRangeOverlap(f.effectiveFrom,f.effectiveTo,high.effectiveFrom,high.effectiveTo)){
           next.push(f);continue;
         }

         const ff=String(f.effectiveFrom||'0000-01-01');
         const ft=String(f.effectiveTo||'9999-12-31');
         const hf=String(high.effectiveFrom||'0000-01-01');
         const ht=String(high.effectiveTo||'9999-12-31');

         // Partie avant non chevauchée.
         if(ff<hf){
           const left=deepClone(f);
           left.effectiveTo=addDays(hf,-1);
           if(left.effectiveTo>=left.effectiveFrom)next.push(left);
         }
         // Partie après non chevauchée.
         if(ft>ht){
           const right=cloneWeeklyPlanForRange(f,addDays(ht,1),ft);
           if(right.effectiveTo>=right.effectiveFrom)next.push(right);
         }
         changed++;
       }
       fragments=next;
       if(!fragments.length)break;
     }

     for(const f of fragments)accepted.push(f);
   }

   final.push(...accepted);
 }

 // Déduplication finale stricte par id/range/profile.
 const seen=new Set(),clean=[];
 for(const p of final.sort((a,b)=>
   String(a.agentId||'').localeCompare(String(b.agentId||''))||
   String(a.effectiveFrom||'').localeCompare(String(b.effectiveFrom||''))
 )){
   const key=[
     p.agentId,p.effectiveFrom,p.effectiveTo,p.shift,
     JSON.stringify(p.dayProfiles||{})
   ].join('|');
   if(seen.has(key)){changed++;continue}
   seen.add(key);clean.push(p);
 }

 db.weeklyPlans=clean;

 // Vérification de sécurité : aucune paire agent/date ne doit se chevaucher.
 for(const [agentId] of byAgent){
   const rows=(db.weeklyPlans||[]).filter(p=>String(p.agentId)===String(agentId));
   for(let i=0;i<rows.length;i++){
     for(let j=i+1;j<rows.length;j++){
       if(weeklyPlanRangeOverlap(rows[i].effectiveFrom,rows[i].effectiveTo,rows[j].effectiveFrom,rows[j].effectiveTo)){
         console.error('Chevauchement théorique résiduel après nettoyage',rows[i],rows[j]);
       }
     }
   }
 }
 return changed;
}
function refreshAgentStandardShortcut(agentId,referenceDate=todayISO()){
 const ag=agentById(agentId);if(!ag)return;
 normalizeWeeklyPlans();
 const standards=(db.weeklyPlans||[])
   .filter(q=>String(q.agentId)===String(agentId)&&q.shift==='Standard')
   .sort((a,b)=>String(a.effectiveFrom||'').localeCompare(String(b.effectiveFrom||'')));

 let plan=standards
   .filter(q=>(!q.effectiveFrom||q.effectiveFrom<=referenceDate)&&(!q.effectiveTo||q.effectiveTo>=referenceDate))
   .sort((a,b)=>String(b.effectiveFrom||'').localeCompare(String(a.effectiveFrom||'')))[0];

 if(!plan)plan=standards.slice().sort((a,b)=>String(b.effectiveFrom||'').localeCompare(String(a.effectiveFrom||'')))[0];

 if(!plan){
   ag.standardSchedule={start:'',end:'',pause:0,missions:'',effectiveFrom:''};
   ag.standardStart='';ag.standardEnd='';ag.standardPause=0;ag.standardMissions='';
   clearTheoreticalScheduleCache();
   return;
 }

 const first=Object.values(plan.dayProfiles||{}).find(x=>x?.start&&x?.end)||{};
 ag.standardSchedule={
   start:first.start||'',end:first.end||'',pause:Number(first.pause||0),
   missions:first.missions||'',effectiveFrom:plan.effectiveFrom||''
 };
 ag.standardStart=first.start||'';
 ag.standardEnd=first.end||'';
 ag.standardPause=Number(first.pause||0);
 ag.standardMissions=first.missions||'';
 clearTheoreticalScheduleCache();
}
async function deleteWeeklyPlanById(planId){
 const plan=(db.weeklyPlans||[]).find(q=>String(q.id)===String(planId));
 if(!plan)return;
 if(!confirm(`Supprimer cet horaire théorique ?\n\n${fmtDate(plan.effectiveFrom)} → ${fmtDate(plan.effectiveTo)}\n\nCette suppression retirera réellement cette période du planning de l’agent.`))return;

 const agentId=plan.agentId;
 db.weeklyPlans=(db.weeklyPlans||[]).filter(q=>String(q.id)!==String(planId));
 cleanupExistingWeeklyPlanOverlaps();
 refreshAgentStandardShortcut(agentId,plan.effectiveFrom||todayISO());
 clearTheoreticalScheduleCache();
 localDirty=true;
 try{writeMirror()}catch(_){}
 renderWeeklyPlans();
 renderTeamCalendar();
 renderPlanning();

 const result=await window.PSTMainState.persistNow();
 if(!result?.ok||result?.offline||result?.pending){
   toast('Horaire théorique supprimé localement — synchronisation en attente');
   return;
 }
 closeModal();
 toast('✅ Horaire théorique supprimé et confirmé dans Supabase');
}
function rhMinutes(t){const m=String(t||'').match(/^(\d{1,2}):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):null}
function rhScheduleCheck({start='',end='',pause=0,segments=[]}={}){
 const warnings=[];pause=Math.max(0,Number(pause||0));
 let segs=Array.isArray(segments)?segments.filter(x=>x?.start&&x?.end):[];
 if(!segs.length&&start&&end)segs=[{start,end}];
 if(!segs.length)return {warnings,effective:0,amplitude:0,type:'Repos / non travaillé'};
 const parsed=segs.map(x=>({s:rhMinutes(x.start),e:rhMinutes(x.end)})).filter(x=>x.s!==null&&x.e!==null&&x.e>=x.s);
 if(!parsed.length)return {warnings:['Horaire à vérifier : format horaire incomplet.'],effective:0,amplitude:0,type:'À vérifier'};
 const first=Math.min(...parsed.map(x=>x.s)),last=Math.max(...parsed.map(x=>x.e));
 const raw=parsed.reduce((n,x)=>n+(x.e-x.s),0),effective=Math.max(0,(raw-pause)/60),amplitude=(last-first)/60;
 const type=effective>=6?'Journée':effective>=3?'Demi-journée':'Durée courte';
 if(amplitude>12)warnings.push(`Amplitude ${fmtHours(amplitude)} : protocole RH à vérifier (> 12 h).`);
 if(effective>10)warnings.push(`Travail effectif ${fmtHours(effective)} : protocole RH à vérifier (> 10 h).`);
 if(effective>0&&effective<3)warnings.push(`Travail effectif ${fmtHours(effective)} : inférieur au repère RH de 3 h pour une demi-journée.`);
 if(effective>=3&&effective<6)warnings.push(`Classification RH conseillée : demi-journée (${fmtHours(effective)}).`);
 if(effective>=6&&effective<=10)warnings.push(`Classification RH : journée (${fmtHours(effective)}).`);
 // La matrice entreprise exige une pause méridienne de 30 min quand la journée couvre toute la plage 11:30–14:00.
 if(first<690&&last>840&&pause<30)warnings.push(`Pause méridienne : l’horaire couvre 11h30–14h00 ; le protocole prévoit 30 min. Saisie autorisée.`);
 return {warnings,effective,amplitude,type};
}
function rhWarningsHtml(check){
 if(!check?.warnings?.length)return '<div class="import-success"><strong>✓ Aucun avertissement RH</strong><span>La saisie reste toujours modifiable.</span></div>';
 return `<div class="rh-warning-box"><strong>⚠ Avertissements RH — non bloquants</strong><ul>${check.warnings.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><small>Ces contrôles sont informatifs : Pilotage n’empêche jamais l’enregistrement pour une règle RH.</small></div>`;
}
function openWeeklyPlan(i=null,agentId=''){
 normalizeWeeklyPlans();
 const old=i!==null?db.weeklyPlans[i]:null;
 const oldSnapshot=old?deepClone(old):null;
 const activeRange=academicYearRange(activeAcademicYear());
 const p=old||{id:uid(),agentId:agentId||db.agents[0]?.id,agent:agentName(agentById(agentId||db.agents[0]?.id)),shift:'Standard',effectiveFrom:activeRange.start,effectiveTo:activeRange.end,dayProfiles:{}};
 const days=[['Lundi',1],['Mardi',2],['Mercredi',3],['Jeudi',4],['Vendredi',5],['Samedi',6],['Dimanche',0]];

 openModal(old?'Modifier les horaires théoriques':'Nouveaux horaires théoriques',
 `<div class="notice"><strong>Base annuelle théorique :</strong> la période proposée reprend automatiquement l’année scolaire active, puis les horaires de chaque jour. <strong>Un agent ne peut avoir qu’un seul horaire théorique par date.</strong> Si la période choisie chevauche un horaire existant, l’application vous demandera l’autorisation de le remplacer.</div>
 <div class="form-grid"><label>Agent<select name="agentId" required>${agentOptions(p.agentId)}</select></label><label>Profil<select name="shift">${selectOptions(['Standard','Matin','Soir'],p.shift||'Standard')}</select></label>${field('Valable du','effectiveFrom',p.effectiveFrom||activeRange.start,'date','required')}${field('Valable au','effectiveTo',p.effectiveTo||activeRange.end,'date','required')}</div>
 <div class="day-profile-editor">${days.map(([label,key])=>{const x=p.dayProfiles?.[key]||{};return `<fieldset><legend>${label}</legend><div class="form-grid"><label>Début<input type="time" name="start_${key}" value="${esc(x.start||'')}"></label><label>Fin<input type="time" name="end_${key}" value="${esc(x.end||'')}"></label><label>Pause (min)<input type="number" min="0" step="5" name="pause_${key}" value="${esc(x.pause||0)}"></label><label class="span2">Missions principales<input name="missions_${key}" value="${esc(x.missions||'')}"></label></div></fieldset>`}).join('')}</div><div id="weeklyRhWarnings" class="span2"></div>`,
 async form=>{
   const o=formDataObj(form);
   if(!o.agentId){toast('Choisissez un agent');return {ok:false}}
   if(!o.effectiveFrom||!o.effectiveTo){toast('Renseignez la période de validité');return {ok:false}}
   if(o.effectiveTo<o.effectiveFrom){toast('La date de fin doit être après la date de début');return {ok:false}}

   // Construire d'abord un brouillon : aucune donnée existante n'est modifiée avant validation.
   const draft=deepClone(p);
   draft.agentId=o.agentId;
   draft.agent=agentName(agentById(o.agentId));
   draft.shift=o.shift;
   draft.effectiveFrom=o.effectiveFrom;
   draft.effectiveTo=o.effectiveTo;
   draft.dayProfiles={};
   for(const [label,key] of days){
     const st=o[`start_${key}`]||'',en=o[`end_${key}`]||'';
     if((st&&!en)||(!st&&en)){
       toast(`${label} : renseignez le début et la fin, ou laissez les deux vides`);
       return {ok:false};
     }
     draft.dayProfiles[key]={start:st,end:en,pause:Number(o[`pause_${key}`]||0),missions:o[`missions_${key}`]||'',segments:[]};
   }
   draft.rows=[];
   const rhAll=[];
   for(const [label,key] of days){const x=draft.dayProfiles[key]||{};if(x.start&&x.end){const c=rhScheduleCheck(x);for(const w of c.warnings)rhAll.push(`${label} : ${w}`)}}
   if(rhAll.length)toast(`⚠️ ${rhAll.length} avertissement(s) RH — enregistrement autorisé`);

   const conflicts=weeklyPlanConflicts(draft.agentId,draft.effectiveFrom,draft.effectiveTo,old?.id||'');
   if(conflicts.length){
     const msg=weeklyPlanConflictText(draft.agentId,draft.effectiveFrom,draft.effectiveTo,old?.id||'');
     if(!confirm(msg)){
       toast('Aucun changement effectué');
       return {ok:false};
     }
   }

   // Autorisation obtenue : retirer uniquement les parties chevauchées.
   if(conflicts.length){
     removeWeeklyPlanOverlap(draft.agentId,draft.effectiveFrom,draft.effectiveTo,old?.id||'');
   }

   if(old){
     const target=(db.weeklyPlans||[]).find(q=>String(q.id)===String(old.id));
     if(target)Object.assign(target,draft,{updatedAt:new Date().toISOString()});
     else db.weeklyPlans.push({...draft,updatedAt:new Date().toISOString()});
   }else{
     draft.createdAt=draft.createdAt||new Date().toISOString();
     draft.updatedAt=new Date().toISOString();
     db.weeklyPlans.push(draft);
   }

   normalizeWeeklyPlans();
   cleanupExistingWeeklyPlanOverlaps();

   // Sécurité finale : aucune paire agent/date ne doit rester en chevauchement.
   const remaining=weeklyPlanConflicts(draft.agentId,draft.effectiveFrom,draft.effectiveTo,draft.id);
   if(remaining.length){
     console.error('Chevauchement théorique résiduel',remaining);
     // Revenir à l'état précédent pour l'élément édité si nécessaire.
     if(oldSnapshot){
       db.weeklyPlans=(db.weeklyPlans||[]).filter(q=>String(q.id)!==String(draft.id));
       db.weeklyPlans.push(oldSnapshot);
     }
     toast('⚠️ Horaire non enregistré : chevauchement détecté');
     return {ok:false};
   }

   const ag=agentById(draft.agentId);
   if(ag){
     const working=new Set();
     for(const plan of (db.weeklyPlans||[]).filter(q=>String(q.agentId)===String(draft.agentId))){
       for(const [,key] of days)if(plan.dayProfiles?.[key]?.start&&plan.dayProfiles?.[key]?.end)working.add(key);
     }
     ag.workdays=working.size?[...working]:[1,2,3,4,5];
     refreshAgentStandardShortcut(draft.agentId,draft.effectiveFrom);
   }

   clearTheoreticalScheduleCache();
   localDirty=true;
   try{writeMirror()}catch(_){}
   renderWeeklyPlans();
   renderTeamCalendar();
   renderPlanning();

   const persisted=await window.PSTMainState.persistStateDirect({
     label:'Horaires théoriques',
     verify:remote=>{
       const rows=Array.isArray(remote?.weeklyPlans)?remote.weeklyPlans:[];
       const saved=rows.find(q=>String(q.id)===String(draft.id));
       const overlaps=rows.filter(q=>String(q.agentId)===String(draft.agentId)&&String(q.id)!==String(draft.id)&&weeklyPlanRangeOverlap(draft.effectiveFrom,draft.effectiveTo,q.effectiveFrom,q.effectiveTo));
       return !!saved&&overlaps.length===0;
     }
   });
   if(!persisted?.ok){
     toast('Horaire enregistré localement mais non confirmé par Supabase');
     return {ok:false};
   }

   closeModal();
   toast(conflicts.length?'✅ Horaire théorique remplacé sans doublon':'✅ Horaire théorique enregistré sans doublon');
   return {ok:true};
 },
 {onDelete:old?()=>deleteWeeklyPlanById(old.id):null});
 const modalForm=$('#modalForm');
 const refreshRh=()=>{
   const box=$('#weeklyRhWarnings');if(!box||!modalForm)return;
   const all=[];
   for(const [label,key] of days){const st=modalForm.elements[`start_${key}`]?.value||'',en=modalForm.elements[`end_${key}`]?.value||'',pause=Number(modalForm.elements[`pause_${key}`]?.value||0);if(st&&en){const c=rhScheduleCheck({start:st,end:en,pause});for(const w of c.warnings)all.push(`${label} : ${w}`)}}
   box.innerHTML=rhWarningsHtml({warnings:all});
 };
 modalForm?.addEventListener('input',refreshRh);modalForm?.addEventListener('change',refreshRh);refreshRh();
}
function calculateAgentHoursBetween(agentId,from,to){
 if(!agentId||!from||!to||to<from)return null;
 let d=from,planned=0,realized=0,delta=0,days=0,workedDays=0;
 while(d<=to){
  const info=dayInfo(agentId,d),h=dayHours(info);
  planned+=Number(h.planned||0);realized+=Number(h.total||0);delta+=Number(h.delta||0);days++;
  if(Math.abs(Number(h.total||0))>0.001)workedDays++;
  d=addDays(d,1);
 }
 return {planned,realized,delta,days,workedDays};
}
function renderHoursRangeControls(){
 const sel=$('#hoursRangeAgent');if(!sel)return;
 const current=sel.value;sel.innerHTML=(db.agents||[]).filter(a=>a.status==='Actif').map(a=>`<option value="${a.id}">${esc(agentName(a))}</option>`).join('');if(current&&[...sel.options].some(o=>o.value===current))sel.value=current;
 const range=academicYearRange(activeAcademicYear());if($('#hoursRangeFrom')&&!$('#hoursRangeFrom').value)$('#hoursRangeFrom').value=range.start;if($('#hoursRangeTo')&&!$('#hoursRangeTo').value)$('#hoursRangeTo').value=range.end;
}
function updateHoursRangeResult(){
 const agentId=$('#hoursRangeAgent')?.value,from=$('#hoursRangeFrom')?.value,to=$('#hoursRangeTo')?.value,box=$('#hoursRangeResult');if(!box)return;
 const r=calculateAgentHoursBetween(agentId,from,to);if(!r){box.innerHTML='<article><span>Résultat</span><strong>Dates à vérifier</strong></article>';return}
 box.innerHTML=`<article><span>Réalisé</span><strong>${fmtHours(r.realized)}</strong></article><article><span>Prévu</span><strong>${fmtHours(r.planned)}</strong></article><article><span>Écart</span><strong>${r.delta>=0?'+':''}${fmtHours(r.delta)}</strong></article><article><span>Jours comptabilisés</span><strong>${r.workedDays}</strong><small>${r.days} jours calendaires analysés</small></article>`;
}
function renderPlanning(){renderWeeklyPlans();renderHoursRangeControls();const month=$('#planningMonth').value||monthISO(),agent=$('#planningAgent').value,signal=$('#planningSignal').value;const start=`${month}-01`,end=localISO(new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0));const rows=[];for(const a of db.agents.filter(x=>x.status==='Actif'&&(!agent||x.id===agent))){let d=start;while(d<=end){if(![0,6].includes(parseDate(d).getDay())){const info=dayInfo(a.id,d),h=dayHours(info);let sig=isAbsenceType(info.dayType)?'Absence':h.delta>0.01?'Heures supplémentaires':h.delta<-0.01?'Heures manquantes':'Conforme';if(!signal||sig===signal)rows.push({a,d,info,h,sig})}d=addDays(d,1)}}const sums=rows.reduce((s,r)=>{s.p+=r.h.planned;s.a+=r.h.total;s.o+=Number(r.info.overtime||0);s.d+=Number(r.h.delta||0);return s},{p:0,a:0,o:0,d:0});$('#planningSummary').innerHTML=`<article><span>Prévu</span><strong>${fmtHours(sums.p)}</strong></article><article><span>Réalisé</span><strong>${fmtHours(sums.a)}</strong></article><article><span>Écart</span><strong>${sums.d>=0?'+':''}${fmtHours(sums.d)}</strong></article><article><span>Heures ajoutées</span><strong>${fmtHours(sums.o)}</strong></article>`;$('#planningTable').innerHTML=rows.length?rows.map(r=>{const disp=planningDisplayFor(r.a,r.d);return `<tr><td>${fmtDate(r.d)}</td><td>${esc(agentName(r.a))}</td><td>${r.info.dayType==='Présence'?`${r.info.plannedStart||'—'}–${r.info.plannedEnd||'—'} (${fmtHours(r.h.planned)})`:badge(r.info.dayType)}</td><td>${r.info.dayType==='Présence'&&disp.realChanged?`${esc(disp.real)} · <strong>${fmtHours(r.h.total)}</strong>`:r.info.dayType!=='Présence'?`${badge(r.info.dayType)} · <strong>${fmtHours(r.h.total)}</strong>`:`<strong>${fmtHours(r.h.total)}</strong>`}</td><td>${r.h.delta>=0?'+':''}${fmtHours(r.h.delta)}</td><td>${badge(r.sig)}</td><td>${r.info.source==='manual'&&r.info.note?`<button class="icon-btn manual-info-trigger" type="button" data-show-day-info="${r.a.id}" data-date="${r.d}" title="${esc(r.info.note)}">ⓘ</button>`:''}<button class="icon-btn" data-agent-day="${r.a.id}" data-date="${r.d}">✎</button></td></tr>`}).join(''):emptyRow(7)}
function renderAbsences(){renderAbsenceBoard();const month=$('#absenceMonth').value||monthISO(),agent=$('#absenceAgent').value,type=$('#absenceType').value,status=$('#absenceStatus').value;const rows=db.agentDays.filter(x=>dateMonthMatch(x.date,month)&&isAbsenceType(x.dayType)&&(!agent||x.agentId===agent)&&(!type||x.dayType===type)&&(!status||x.status===status));const groups=new Map();for(const x of rows){const key=x.periodId||x.id;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(x)}const arr=[...groups.values()].map(g=>g.sort((a,b)=>a.date.localeCompare(b.date))).sort((a,b)=>a[0].date.localeCompare(b[0].date));$('#absencesTable').innerHTML=arr.length?arr.map(g=>{const x=g[0],from=g[0].date,to=g.at(-1).date;return `<tr><td>${esc(agentName(agentById(x.agentId)))}</td><td>${fmtDate(from)}</td><td>${fmtDate(to)}</td><td>${badge(x.dayType)}</td><td>${g.length} jour${g.length>1?'s':''}</td><td>${badge(x.status||'Validée')}</td><td>${x.noReplacementNeeded?'<span class="badge good">Sans remplacement</span>':esc(x.replacement||'À décider')}</td><td><button class="icon-btn" data-agent-day="${x.agentId}" data-date="${from}">✎</button></td></tr>`}).join(''):emptyRow(8);renderAbsenceCounters(month)}
function renderAbsenceCounters(month){const agents=db.agents.filter(a=>a.status==='Actif');const types=db.lists.dayTypes.filter(isAbsenceType);const used=types.filter(t=>db.agentDays.some(x=>dateMonthMatch(x.date,month)&&x.dayType===t));const cols=used.length?used:types.slice(0,5);const head=`<table><thead><tr><th>Agent</th>${cols.map(t=>`<th>${esc(t)}</th>`).join('')}<th>Total</th></tr></thead><tbody>`;const body=agents.map(a=>{const rs=db.agentDays.filter(x=>x.agentId===a.id&&dateMonthMatch(x.date,month)&&isAbsenceType(x.dayType));return `<tr><td><strong>${esc(agentName(a))}</strong></td>${cols.map(t=>`<td>${rs.filter(x=>x.dayType===t).length}</td>`).join('')}<td><strong>${rs.length}</strong></td></tr>`}).join('');$('#absenceCounters').innerHTML=head+body+'</tbody></table>'}
function renderVacations(){
 const zone=$('#vacationZone').value,status=$('#vacationStatus').value,year=activeAcademicYear(),range=academicYearRange(year);
 const arr=db.vacations.filter(x=>
   (!zone||x.zone===zone||x.zone==='Toutes')&&
   (!status||x.status===status)&&
   (!x.start||!x.end||(x.end>=range.start&&x.start<=range.end))
 ).sort((a,b)=>a.start.localeCompare(b.start));$('#vacationCards').innerHTML=cardList(arr.map(x=>{const done=(x.tasks||[]).filter(t=>t.done).length,total=(x.tasks||[]).length,pct=total?Math.round(done/total*100):0;return `<article class="vacation-card"><div class="panel-head"><div><h3>${esc(x.name)}</h3><p>${fmtDate(x.start)} → ${fmtDate(x.end)} · Zone ${esc(x.zone)}</p></div>${badge(x.status)}</div><div class="progress"><span style="width:${pct}%"></span></div><p>${done}/${total} actions terminées (${pct} %)</p><ul>${(x.tasks||[]).slice(0,6).map(t=>`<li class="${t.done?'done':''}">${t.done?'✓':'○'} ${esc(t.text)}</li>`).join('')}</ul><div class="card-actions"><button type="button" data-edit-type="vacation" data-edit-id="${x.id}">Ouvrir la checklist</button></div></article>`}),'Aucune période chargée.')}
function renderIssues(){const m=$('#issueMonth').value,agent=$('#issueAgent').value,cat=$('#issueCategory').value,status=$('#issueStatus').value;let arr=db.issues.filter(x=>dateMonthMatch(x.date,m)&&(!agent||x.agentId===agent)&&(!cat||x.category===cat)&&(!status||x.status===status)).sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));if(window.__dashboardUrgentOnly)arr=arr.filter(x=>!isClosedStatus(x.status)&&isUrgentPriority(x.priority));$('#issuesTable').innerHTML=arr.length?arr.map(x=>`<tr><td>${fmtDate(x.date)}</td><td>${esc(x.category)}</td><td>${esc(agentName(agentById(x.agentId)))}</td><td>${badge(x.priority)}</td><td><strong>${esc(x.title)}</strong>${x.sourceNonconformityId?`<small>📋 Plan d’action issu d’un rapport de contrôle${x.sourceReportDate?` · rapport du ${fmtDate(x.sourceReportDate)}`:''}</small>`:''}<small>${esc(x.description||'')}</small>${(()=>{const n=(db.agentActivities||[]).filter(a=>String(a.maintenanceId||'')===String(x.id)).length;return n?`<small>✓ ${n} activité${n>1?'s':''} agent tracée${n>1?'s':''}</small>`:''})()}</td><td>${esc(x.action||'—')}</td><td>${fmtDate(x.dueDate)||'—'}</td><td>${badge(x.status)}</td><td>${editButton('issue',x.id)}</td></tr>`).join(''):emptyRow(9)}
function renderPeriodic(){
 const fam=$('#periodicFamily')?.value||'',status=$('#periodicStatus')?.value||'',bld=$('#periodicBuilding')?.value||'',year=activeAcademicYear();
 const yr=$('#periodicAcademicYearLabelV165');if(yr)yr.textContent=`Année scolaire affichée : ${year}`;
 let rows=periodicAcademicYearRowsV165(year).filter(({x,info})=>(!fam||x.family===fam)&&(!status||info.state===status||x.status===status)&&(!bld||x.building===bld||x.building==='Tous bâtiments'));
 const rank={"À faire":0,"À prévoir":1,"Prévu":2,"À jour":3,"Réalisé":4,"Non renseigné":5,"Pas prévu":6,"Clôturé":7,"Non applicable":8};
 rows.sort((a,b)=>(rank[a.info.state]??9)-(rank[b.info.state]??9)||(a.info.due||a.info.lastKnown?.date||'9999').localeCompare(b.info.due||b.info.lastKnown?.date||'9999')||String(a.x.name||'').localeCompare(String(b.x.name||''),'fr'));
 const el=$('#periodicCards');if(!el)return;
 const statusHtml=info=>`<span class="periodic-year-status-v165 ${esc(info.tone)}">${esc(info.state)}</span>`;
 el.innerHTML=rows.length?`<div class="periodic-list-wrap-v165"><table class="periodic-list-v165"><thead><tr><th>Contrôle</th><th>Prestataire</th><th>Périodicité</th><th>Dernier contrôle connu</th><th>Échéance ${esc(year)}</th><th>État</th><th aria-label="Modifier"></th></tr></thead><tbody>${rows.map(({x,info})=>{
   const last=info.lastKnown?`<span class="periodic-done-date-v165">${fmtDate(info.lastKnown.date)}${info.lastKnown.provider?` · ${esc(info.lastKnown.provider)}`:''}</span>${info.lastKnown.date<info.range.start?'<small>Réalisé avant cette année scolaire · cycle conservé</small>':info.lastKnown.date<=info.range.end?'<small>Réalisé dans cette année scolaire</small>':''}`:'—';
   const provider=info.provider||x.provider||'—';
   const due=info.due?fmtDate(info.due):(info.coverageEnd&&info.coverageEnd>info.range.end?`Après ${esc(year)} · ${fmtDate(info.coverageEnd)}`:'—');
   const place=[x.family,x.building&&x.building!=='Tous bâtiments'?x.building:'',x.sector,x.room].filter(Boolean).join(' · ');
   return `<tr class="periodic-list-row-v165 ${info.tone}"><td><strong>${esc(x.name||'Contrôle')}</strong><small>${esc(x.no||'')}${place?` · ${esc(place)}`:''}</small></td><td>${esc(provider)}</td><td>${esc(x.periodicityText||((Number(x.intervalMonths||0)>0)?`${x.intervalMonths} mois`:'À définir'))}</td><td>${last}</td><td>${due}</td><td>${statusHtml(info)}</td><td class="periodic-edit-cell-v165"><button type="button" class="periodic-pencil-v165" data-edit-type="periodic" data-edit-id="${esc(x.id)}" title="Modifier ${esc(x.name||'le contrôle')}" aria-label="Modifier ${esc(x.name||'le contrôle')}">✏️</button></td></tr>`;
 }).join('')}</tbody></table></div>`:'<div class="empty-state">Aucun contrôle trouvé pour ces filtres.</div>';
}
function renderCleaningGuide(){const type=$('#cleaningGuideType').value||db.lists.roomTypes.find(x=>GUIDE[x])||Object.keys(GUIDE)[0];$('#cleaningGuideType').value=type;const rows=GUIDE[type]||[];$('#cleaningGuideTable').innerHTML=`<table><thead><tr><th>Opération</th><th>Fréquence préconisée</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</tbody></table>`}

/* V147.78 — Dashboard qualité intégré à l'onglet Contrôle ménage. */
function ensureCleaningDashboard(){
 const summary=$('#cleaningSummary');if(!summary)return null;
 let root=$('#cleaningQualityDashboard');
 if(!root){
  root=document.createElement('section');root.id='cleaningQualityDashboard';root.className='cleaning-quality-dashboard';
  summary.parentNode.insertBefore(root,summary);
 }
 if(!$('#cleaningDashboardStyle')){
  const st=document.createElement('style');st.id='cleaningDashboardStyle';st.textContent=`
  .cleaning-quality-dashboard{margin:0 0 20px;display:grid;gap:14px}.clean-dash-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap}.clean-dash-head h2{margin:0;font-size:1.25rem}.clean-dash-head p{margin:4px 0 0;color:var(--muted,#667085);font-size:.88rem}.clean-dash-kpis{display:grid;grid-template-columns:repeat(5,minmax(135px,1fr));gap:10px}.clean-dash-card,.clean-dash-panel{border:1px solid var(--border,#dfe3eb);background:var(--card,#fff);border-radius:14px;padding:14px;box-shadow:0 4px 16px rgba(15,23,42,.05)}.clean-dash-card span{display:block;color:var(--muted,#667085);font-size:.76rem;font-weight:700;text-transform:uppercase;letter-spacing:.02em}.clean-dash-card strong{display:block;margin-top:5px;font-size:1.65rem;line-height:1}.clean-dash-card small{display:block;margin-top:7px;color:var(--muted,#667085)}.clean-dash-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:12px}.clean-dash-grid.three{grid-template-columns:1fr 1fr 1fr}.clean-dash-panel h3{margin:0 0 3px;font-size:1rem}.clean-dash-panel>.sub{color:var(--muted,#667085);font-size:.78rem;margin-bottom:12px}.clean-bars{display:grid;gap:9px}.clean-bar-row{display:grid;grid-template-columns:minmax(100px,1.15fr) 2fr 54px;align-items:center;gap:9px;font-size:.82rem}.clean-bar-track{height:10px;border-radius:999px;background:#eef1f6;overflow:hidden}.clean-bar-fill{height:100%;border-radius:999px;background:#2563eb}.clean-bar-fill.warn{background:#f59e0b}.clean-bar-fill.bad{background:#dc2626}.clean-status-wrap{display:flex;gap:18px;align-items:center;flex-wrap:wrap}.clean-donut{width:126px;height:126px;border-radius:50%;position:relative;flex:0 0 auto}.clean-donut:after{content:'';position:absolute;inset:25px;border-radius:50%;background:var(--card,#fff)}.clean-status-list{display:grid;gap:7px;flex:1;min-width:155px}.clean-status-line{display:flex;justify-content:space-between;gap:10px;font-size:.84rem}.clean-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:7px}.clean-dot.good{background:#16a34a}.clean-dot.warn{background:#f59e0b}.clean-dot.bad{background:#dc2626}.clean-dot.neutral{background:#94a3b8}.clean-list{display:grid;gap:7px}.clean-list-item{display:grid;grid-template-columns:1fr auto;gap:10px;padding:8px 0;border-bottom:1px solid var(--border,#e6e8ee);font-size:.82rem}.clean-list-item:last-child{border-bottom:0}.clean-list-item small{display:block;color:var(--muted,#667085);margin-top:2px}.clean-score-pill{font-weight:800;white-space:nowrap}.clean-score-pill.good{color:#15803d}.clean-score-pill.warn{color:#b45309}.clean-score-pill.bad{color:#b91c1c}.clean-trend-svg{width:100%;height:150px;display:block}.clean-trend-grid{stroke:#e5e7eb;stroke-width:1}.clean-trend-line{fill:none;stroke:#2563eb;stroke-width:3}.clean-trend-dot{fill:#2563eb}.clean-dash-empty{padding:20px;text-align:center;color:var(--muted,#667085);border:1px dashed var(--border,#dfe3eb);border-radius:12px}.clean-dash-note{padding:10px 12px;border-radius:10px;background:#eff6ff;color:#1e40af;font-size:.82rem}.clean-priority{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid var(--border,#e6e8ee)}.clean-priority:last-child{border-bottom:0}.clean-priority b{font-size:.82rem}.clean-priority small{display:block;color:var(--muted,#667085);margin-top:2px}.clean-priority .flag{font-size:.72rem;font-weight:800;border-radius:999px;padding:4px 8px;background:#fee2e2;color:#b91c1c;white-space:nowrap}@media(max-width:1050px){.clean-dash-kpis{grid-template-columns:repeat(3,1fr)}.clean-dash-grid,.clean-dash-grid.three{grid-template-columns:1fr 1fr}}@media(max-width:720px){.clean-dash-kpis{grid-template-columns:repeat(2,1fr)}.clean-dash-grid,.clean-dash-grid.three{grid-template-columns:1fr}.clean-bar-row{grid-template-columns:minmax(90px,1fr) 1.5fr 48px}}`;
  document.head.appendChild(st);
 }
 return root;
}
function cleaningScore5(x){const n=Number(x?.score||0);return Number.isFinite(n)?Math.max(0,Math.min(5,n/20)):0}
function cleaningDashboardData(arr){
 const total=arr.length, conformes=arr.filter(x=>normalizeText(x.overallStatus)==='conforme').length;
 const reprendre=arr.filter(x=>['a reprendre','non conforme'].includes(normalizeText(x.overallStatus))).length;
 const nonConformes=arr.filter(x=>normalizeText(x.overallStatus)==='non conforme').length;
 const avgPct=total?arr.reduce((s,x)=>s+Number(x.score||0),0)/total:0,avg5=avgPct/20;
 const weakTasks=new Map(),buildingMap=new Map(),roomMap=new Map();
 for(const x of arr){
  const bn=x.building||'Sans bâtiment',b=buildingMap.get(bn)||{name:bn,count:0,sum:0,bad:0};b.count++;b.sum+=Number(x.score||0);if(['a reprendre','non conforme'].includes(normalizeText(x.overallStatus)))b.bad++;buildingMap.set(bn,b);
  const rk=[x.building,x.floor,x.sector,x.room].filter(Boolean).join(' · ')||'Zone non renseignée',r=roomMap.get(rk)||{name:rk,count:0,bad:0,sum:0,last:''};r.count++;r.sum+=Number(x.score||0);if(['a reprendre','non conforme'].includes(normalizeText(x.overallStatus)))r.bad++;if(!r.last||String(x.date||'')>r.last)r.last=x.date||'';roomMap.set(rk,r);
  for(const t of x.tasks||[]){if(!['a reprendre','non conforme'].includes(normalizeText(t.status)))continue;const k=t.name||'Point à reprendre';const o=weakTasks.get(k)||{name:k,count:0,bad:0};o.count++;if(normalizeText(t.status)==='non conforme')o.bad++;weakTasks.set(k,o)}
 }
 const buildings=[...buildingMap.values()].map(b=>({...b,avg:b.count?b.sum/b.count:0})).sort((a,b)=>b.count-a.count);
 const weak=[...weakTasks.values()].sort((a,b)=>b.count-a.count||b.bad-a.bad).slice(0,6);
 const recurrent=[...roomMap.values()].filter(x=>x.bad>=2).sort((a,b)=>b.bad-a.bad||a.sum/a.count-b.sum/b.count).slice(0,5);
 const priority=arr.filter(x=>['a reprendre','non conforme'].includes(normalizeText(x.overallStatus))).sort((a,b)=>(Number(a.score||100)-Number(b.score||100))||String(b.date||'').localeCompare(String(a.date||''))).slice(0,5);
 const months=new Map();for(const x of arr){const m=String(x.date||'').slice(0,7);if(!m)continue;const o=months.get(m)||{m,count:0,sum:0};o.count++;o.sum+=Number(x.score||0);months.set(m,o)}
 const trend=[...months.values()].sort((a,b)=>a.m.localeCompare(b.m)).slice(-6).map(x=>({...x,avg:x.sum/x.count}));
 return {total,conformes,reprendre,nonConformes,avgPct,avg5,weak,buildings,recurrent,priority,trend};
}
function cleaningTrendSvg(points){
 if(!points.length)return '<div class="clean-dash-empty">Pas assez de données pour afficher une évolution.</div>';
 const W=520,H=145,L=28,R=14,T=14,B=28,min=0,max=100;const px=i=>L+(points.length===1?(W-L-R)/2:i*(W-L-R)/(points.length-1));const py=v=>T+(max-v)*(H-T-B)/(max-min);
 const line=points.map((p,i)=>`${i?'L':'M'} ${px(i).toFixed(1)} ${py(p.avg).toFixed(1)}`).join(' ');
 return `<svg class="clean-trend-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution du score moyen des contrôles ménage">${[0,25,50,75,100].map(v=>`<line class="clean-trend-grid" x1="${L}" x2="${W-R}" y1="${py(v)}" y2="${py(v)}"/><text x="2" y="${py(v)+4}" font-size="10" fill="#667085">${v}</text>`).join('')}<path class="clean-trend-line" d="${line}"/>${points.map((p,i)=>`<circle class="clean-trend-dot" cx="${px(i)}" cy="${py(p.avg)}" r="4"/><text x="${px(i)}" y="${H-7}" text-anchor="middle" font-size="10" fill="#667085">${esc(p.m.slice(5))}/${esc(p.m.slice(2,4))}</text>`).join('')}</svg>`;
}
function renderCleaningDashboard(arr){
 const root=ensureCleaningDashboard();if(!root)return;const d=cleaningDashboardData(arr),pct=n=>d.total?Math.round(n*100/d.total):0;
 const status={good:pct(d.conformes),bad:pct(d.nonConformes),warn:pct(Math.max(0,d.reprendre-d.nonConformes))};status.neutral=Math.max(0,100-status.good-status.warn-status.bad);
 const donut=`conic-gradient(#16a34a 0 ${status.good}%,#f59e0b ${status.good}% ${status.good+status.warn}%,#dc2626 ${status.good+status.warn}% ${status.good+status.warn+status.bad}%,#94a3b8 ${status.good+status.warn+status.bad}% 100%)`;
 const target=85,quality5=(d.avgPct/20).toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:2});
 const buildingRows=d.buildings.slice(0,8).map(b=>{const cls=b.avg>=85?'':b.avg>=70?'warn':'bad';return `<div class="clean-bar-row"><span title="${esc(b.name)}">${esc(b.name)}</span><div class="clean-bar-track"><div class="clean-bar-fill ${cls}" style="width:${Math.max(2,Math.min(100,b.avg))}%"></div></div><strong>${Math.round(b.avg)} %</strong></div>`}).join('')||'<div class="clean-dash-empty">Aucun contrôle sur la période.</div>';
 const weakRows=d.weak.map(x=>`<div class="clean-list-item"><div><strong>${esc(x.name)}</strong><small>${x.bad?`${x.bad} non-conformité${x.bad>1?'s':''}`:'Point à améliorer'}</small></div><b>${x.count}×</b></div>`).join('')||'<div class="clean-dash-empty">Aucun point faible détecté.</div>';
 const recRows=d.recurrent.map(x=>`<div class="clean-list-item"><div><strong>${esc(x.name)}</strong><small>${x.bad} contrôle${x.bad>1?'s':''} à reprendre · dernier ${fmtDate(x.last)||'—'}</small></div><span class="clean-score-pill ${x.sum/x.count>=70?'warn':'bad'}">${Math.round(x.sum/x.count)} %</span></div>`).join('')||'<div class="clean-dash-empty">Aucune récidive détectée.</div>';
 const prioRows=d.priority.map(x=>`<div class="clean-priority"><div><b>${esc([x.building,x.floor,x.sector,x.room].filter(Boolean).join(' · ')||'Lieu non renseigné')}</b><small>${fmtDate(x.date)} · ${esc((x.tasks||[]).filter(t=>['a reprendre','non conforme'].includes(normalizeText(t.status))).slice(0,2).map(t=>t.name).join(', ')||x.comment||'À reprendre')}</small></div><span class="flag">${Math.round(Number(x.score||0))} %</span></div>`).join('')||'<div class="clean-dash-empty">Aucune priorité sur la période.</div>';
 root.innerHTML=`<div class="clean-dash-head"><div><h2>📊 Dashboard qualité ménage — Lycée Jean Puy</h2><p>Analyse automatique des contrôles affichés avec les filtres actuels.</p></div><div class="clean-dash-note">Objectif qualité : <strong>≥ ${target}%</strong> · soit ≥ 4,25 / 5</div></div>
 <div class="clean-dash-kpis"><article class="clean-dash-card"><span>Note moyenne</span><strong>${d.total?quality5:'—'} / 5</strong><small>${d.total?`${Math.round(d.avgPct)} % de qualité`:'Aucune donnée'}</small></article><article class="clean-dash-card"><span>Contrôles</span><strong>${d.total}</strong><small>Sur la sélection actuelle</small></article><article class="clean-dash-card"><span>Conformes</span><strong>${pct(d.conformes)} %</strong><small>${d.conformes} contrôle${d.conformes>1?'s':''}</small></article><article class="clean-dash-card"><span>À reprendre</span><strong>${d.reprendre}</strong><small>Dont ${d.nonConformes} non conforme${d.nonConformes>1?'s':''}</small></article><article class="clean-dash-card"><span>Points faibles</span><strong>${d.weak.reduce((s,x)=>s+x.count,0)}</strong><small>${d.weak.length} critère${d.weak.length>1?'s':''} concerné${d.weak.length>1?'s':''}</small></article></div>
 <div class="clean-dash-grid"><article class="clean-dash-panel"><h3>Qualité moyenne par bâtiment</h3><div class="sub">Score calculé à partir des contrôles de la période</div><div class="clean-bars">${buildingRows}</div></article><article class="clean-dash-panel"><h3>Répartition des contrôles</h3><div class="sub">Conformes, à améliorer et non conformes</div><div class="clean-status-wrap"><div class="clean-donut" style="background:${donut}"></div><div class="clean-status-list"><div class="clean-status-line"><span><i class="clean-dot good"></i>Conformes</span><b>${d.conformes} (${status.good} %)</b></div><div class="clean-status-line"><span><i class="clean-dot warn"></i>À reprendre</span><b>${Math.max(0,d.reprendre-d.nonConformes)} (${status.warn} %)</b></div><div class="clean-status-line"><span><i class="clean-dot bad"></i>Non conformes</span><b>${d.nonConformes} (${status.bad} %)</b></div><div class="clean-status-line"><span><i class="clean-dot neutral"></i>Autres</span><b>${Math.max(0,d.total-d.conformes-d.reprendre)} (${status.neutral} %)</b></div></div></div></article></div>
 <div class="clean-dash-grid"><article class="clean-dash-panel"><h3>Évolution de la note moyenne</h3><div class="sub">6 derniers mois présents dans la sélection</div>${cleaningTrendSvg(d.trend)}</article><article class="clean-dash-panel"><h3>Top des points faibles</h3><div class="sub">Critères revenant le plus souvent</div><div class="clean-list">${weakRows}</div></article></div>
 <div class="clean-dash-grid three"><article class="clean-dash-panel"><h3>À reprendre — priorités</h3><div class="sub">Contrôles les moins bien notés</div>${prioRows}</article><article class="clean-dash-panel"><h3>Récidives par local</h3><div class="sub">Même lieu à reprendre au moins deux fois</div><div class="clean-list">${recRows}</div></article><article class="clean-dash-panel"><h3>Indicateurs de pilotage</h3><div class="sub">Lecture rapide pour le suivi</div><div class="clean-list"><div class="clean-list-item"><span>Objectif qualité atteint</span><b>${d.avgPct>=target?'✅ Oui':'⚠️ Non'}</b></div><div class="clean-list-item"><span>Bâtiments suivis</span><b>${d.buildings.length}</b></div><div class="clean-list-item"><span>Locaux en récidive</span><b>${d.recurrent.length}</b></div><div class="clean-list-item"><span>Non-conformités</span><b>${d.nonConformes}</b></div><div class="clean-list-item"><span>Contrôles à reprendre</span><b>${d.reprendre}</b></div></div></article></div>`;
}
function renderCleaning(){const month=$('#cleanMonth').value,bld=$('#cleanBuilding').value,type=$('#cleanRoomType').value,status=$('#cleanStatus').value;const arr=db.cleaning.filter(x=>dateMonthMatch(x.date,month)&&(!bld||x.building===bld)&&(!type||x.roomType===type)&&(!status||x.overallStatus===status)).sort((a,b)=>b.date.localeCompare(a.date));const all=arr.length,ok=arr.filter(x=>x.overallStatus==='Conforme').length,weak=arr.reduce((s,x)=>s+(x.tasks||[]).filter(t=>['À reprendre','Non conforme'].includes(t.status)).length,0),avg=all?Math.round(arr.reduce((s,x)=>s+Number(x.score||0),0)/all):0;$('#cleaningSummary').innerHTML=`<article><span>Contrôles</span><strong>${all}</strong></article><article><span>Conformes</span><strong>${ok}</strong></article><article><span>Score moyen</span><strong>${avg||'—'}${all?' %':''}</strong></article><article><span>Points faibles</span><strong>${weak}</strong></article>`;$('#cleaningTable').innerHTML=arr.length?arr.map(x=>{const weakTasks=(x.tasks||[]).filter(t=>['À reprendre','Non conforme'].includes(t.status));return `<tr><td>${fmtDate(x.date)} ${esc(x.time||'')}</td><td>${esc([x.building,x.floor,x.room].filter(Boolean).join(' · '))}</td><td>${esc(x.roomType)}</td><td>${esc(agentName(agentById(x.agentId)))}</td><td>${x.score||0} %</td><td>${badge(x.overallStatus)}</td><td>${esc(weakTasks.slice(0,3).map(t=>t.name).join(', ')||'—')}</td><td>${editButton('cleaning',x.id)}</td></tr>`}).join(''):emptyRow(8);renderCleaningDashboard(arr);renderCleaningGuide()}

const AGENT_ACTIVITY_TYPES=[
 'Maintenance','Plomberie / débouchage','Entretien courant','Ménage ponctuel','Logistique / manutention',
 'Sécurité','Préparation de salle','Espaces extérieurs','Accueil / service','Autre'
];
const AGENT_ACTIVITY_DURATION_MODES=[
 ['hours','Heures précises'],
 ['full-day','Journée complète'],
 ['half-day','Demi-journée']
];

function agentActivityAgentIds(x){
 const raw=Array.isArray(x?.agentIds)?x.agentIds:(x?.agentId?[x.agentId]:[]);
 return [...new Set(raw.map(String).filter(Boolean))];
}
function agentActivityAgentNames(x){
 const names=agentActivityAgentIds(x).map(id=>agentName(agentById(id))).filter(Boolean);
 return names.length?names.join(', '):'Agent non renseigné';
}
function agentActivityDurationMode(x){
 const mode=String(x?.durationMode||'').trim();
 return ['hours','full-day','half-day'].includes(mode)?mode:'hours';
}
function agentActivityDuration(x){
 if(agentActivityDurationMode(x)!=='hours'||!x?.start||!x?.end)return 0;
 return Math.max(0,hoursBetween(x.start,x.end,0));
}
function agentActivityPeriodLabel(x){
 const mode=agentActivityDurationMode(x);
 if(mode==='full-day')return 'Journée complète';
 if(mode==='half-day')return 'Demi-journée';
 return [x?.start,x?.end].filter(Boolean).join('–')||'Heures non précisées';
}
function agentActivityDurationLabel(x){
 const mode=agentActivityDurationMode(x);
 if(mode==='full-day')return '1 journée';
 if(mode==='half-day')return '½ journée';
 return x?.start&&x?.end?fmtHours(agentActivityDuration(x)):'Heures à préciser';
}
function agentActivityDurationSummary(rows){
 let full=0,half=0,hours=0;
 for(const x of rows||[]){
   const mode=agentActivityDurationMode(x);
   if(mode==='full-day')full++;
   else if(mode==='half-day')half++;
   else hours+=agentActivityDuration(x);
 }
 const parts=[];
 if(full)parts.push(`${full} j`);
 if(half)parts.push(`${half} demi-j`);
 if(hours>0.001)parts.push(fmtHours(hours));
 return parts.join(' · ')||'0';
}
function agentActivityPeriodBounds(mode,reference){
 const ref=normalizeDateValue(reference)||todayISO();
 if(mode==='week'){const start=startOfWeek(ref);return {start,end:endOfWeek(start),label:`Semaine du ${fmtDate(start)} au ${fmtDate(endOfWeek(start))}`}}
 if(mode==='month'){const ym=ref.slice(0,7),start=`${ym}-01`,end=endOfMonthISO(start);return {start,end,label:parseDate(start).toLocaleDateString('fr-FR',{month:'long',year:'numeric'})}}
 return {start:ref,end:ref,label:fmtDateLong(ref)};
}
function agentActivityLinkedLabel(x){
 if(x?.maintenanceId){const m=byId('maintenance',x.maintenanceId);return m?`Intervention ${m.no||''} — ${m.title||''}`:'Intervention liée'}
 if(x?.requestId){const r=byId('requests',x.requestId);return r?`Demande ${r.no||''} — ${r.title||''}`:'Demande liée'}
 return 'Activité spontanée';
}
function selectedActivityFilterAgentIds(){
 return [...document.querySelectorAll('#activityAgentFilterChecks input[type="checkbox"][data-agent-filter]:checked')].map(x=>String(x.value)).filter(Boolean);
}
function updateActivityAgentFilterSummary(){
 const ids=selectedActivityFilterAgentIds(),summary=$('#activityAgentFilterSummary');
 if(!summary)return;
 if(!ids.length){summary.textContent='Agents : tous';return}
 const names=ids.map(id=>agentName(agentById(id))).filter(Boolean);
 summary.textContent=names.length===1?`Agent : ${names[0]}`:`Agents : ${names.length} sélectionnés`;
}
function renderActivityAgentFilter(){
 const box=$('#activityAgentFilterChecks');if(!box)return;
 const selected=new Set(selectedActivityFilterAgentIds());
 const agents=(db.agents||[]).filter(a=>a.status!=='Inactif'||selected.has(String(a.id)));
 box.innerHTML=`<div class="activity-agent-filter-actions"><button type="button" class="ghost small" data-activity-filter-all="1">Tous</button><button type="button" class="ghost small" data-activity-filter-none="1">Aucun</button></div>`+
   agents.map(a=>`<label><input type="checkbox" data-agent-filter value="${esc(a.id)}" ${selected.has(String(a.id))?'checked':''}> ${esc(agentName(a))}</label>`).join('');
 updateActivityAgentFilterSummary();
}
function filteredAgentActivities(){
 const mode=$('#activityPeriodMode')?.value||'day';
 const ref=$('#activityReferenceDate')?.value||todayISO();
 const range=agentActivityPeriodBounds(mode,ref);
 const aids=selectedActivityFilterAgentIds();
 const type=$('#activityTypeFilter')?.value||'';
 const rows=(db.agentActivities||[])
   .filter(x=>recordInAcademicYear(x,['date']))
   .filter(x=>x.date>=range.start&&x.date<=range.end)
   .filter(x=>!aids.length||agentActivityAgentIds(x).some(id=>aids.includes(String(id))))
   .filter(x=>!type||x.type===type)
   .sort((a,b)=>`${b.date||''} ${b.start||''}`.localeCompare(`${a.date||''} ${a.start||''}`));
 return {rows,range};
}
function renderAgentActivities(){
 const table=$('#agentActivityTable');if(!table)return;
 const ref=$('#activityReferenceDate');if(ref&&!ref.value)ref.value=todayISO();
 renderActivityAgentFilter();
 const tf=$('#activityTypeFilter');if(tf){
   const old=tf.value;tf.innerHTML='<option value="">Tous les types</option>'+selectOptions(AGENT_ACTIVITY_TYPES,old);tf.value=old;
 }
 const {rows,range}=filteredAgentActivities();
 const linked=rows.filter(x=>x.maintenanceId||x.requestId).length;
 const spontaneous=rows.length-linked;
 if($('#activityCount'))$('#activityCount').textContent=rows.length;
 if($('#activityHours'))$('#activityHours').textContent=agentActivityDurationSummary(rows);
 if($('#activityLinked'))$('#activityLinked').textContent=linked;
 if($('#activitySpontaneous'))$('#activitySpontaneous').textContent=spontaneous;
 if($('#activityPeriodLabel'))$('#activityPeriodLabel').textContent=`Période affichée : ${range.label}`;
 table.innerHTML=rows.length?rows.map(x=>{
   const linkedLabel=agentActivityLinkedLabel(x);
   const spontaneous=!(x.maintenanceId||x.requestId);
   return `<tr>
    <td>${fmtDate(x.date)}</td>
    <td>${esc(agentActivityPeriodLabel(x))}</td>
    <td><strong>${esc(agentActivityAgentNames(x))}</strong></td>
    <td>${esc(x.type||'Autre')}</td>
    <td><strong>${esc(x.title||'')}</strong>${x.details?`<small>${esc(x.details)}</small>`:''}${x.result?`<small>Résultat : ${esc(x.result)}</small>`:''}</td>
    <td>${esc([x.building,x.floor,x.sector,x.room].filter(Boolean).join(' · ')||'—')}</td>
    <td><span class="activity-link-badge ${spontaneous?'activity-spontaneous':''}">${esc(linkedLabel)}</span></td>
    <td>${esc(agentActivityDurationLabel(x))}</td>
    <td>${editButton('agentActivity',x.id)}</td>
   </tr>`;
 }).join(''):emptyRow(9);
}
function appendActivityToLinkedText(existing,x){
 const stamp=[fmtDate(x.date),agentActivityPeriodLabel(x)].filter(Boolean).join(' ');
 const line=`${stamp} — ${agentActivityAgentNames(x)} : ${x.title}${x.result?` — ${x.result}`:''}`;
 return [String(existing||'').trim(),line].filter(Boolean).join('\n');
}
async function updateLinkedItemFromActivity(x,closeLinked){
 if(x.maintenanceId){
   const m=byId('maintenance',x.maintenanceId);
   if(m){
     m.action=appendActivityToLinkedText(m.action,x);
     if(!m.assigned)m.assigned=agentActivityAgentNames(x);
     m.completedDate=x.date;m.completedTime=agentActivityDurationMode(x)==='hours'?(x.end||x.start||''):'';
     if(closeLinked)m.status='Clôturée';
     const res=await commitFormRecordVerified('Intervention liée','maintenance',m);
     if(!res?.ok)return false;
   }
 }
 if(x.requestId){
   const r=byId('requests',x.requestId);
   if(r){
     r.response=appendActivityToLinkedText(r.response,x);
     r.completedDate=x.date;r.completedTime=agentActivityDurationMode(x)==='hours'?(x.end||x.start||''):'';
     if(closeLinked)r.status='Clôturé';
     const res=await commitFormRecordVerified('Demande liée','requests',r);
     if(!res?.ok)return false;
   }
 }
 return true;
}
function activityAgentPickerHtml(selectedIds=[]){
 const selected=new Set((selectedIds||[]).map(String));
 const agents=(db.agents||[]).filter(a=>a.status!=='Inactif'||selected.has(String(a.id)));
 return `<div class="activity-agent-picker"><strong>Agent(s) ayant réalisé l’activité</strong><div class="activity-agent-picker-grid">${
   agents.map(a=>`<label><input type="checkbox" name="agentIds" value="${esc(a.id)}" ${selected.has(String(a.id))?'checked':''}> ${esc(agentName(a))}</label>`).join('')
 }</div><small>Vous pouvez sélectionner plusieurs agents pour une même activité.</small></div>`;
}
function bindAgentActivityLinks(){
 const f=$('#modalForm');if(!f)return;
 const m=f.elements.maintenanceId,r=f.elements.requestId,c=f.elements.closeLinked;
 const sync=source=>{
   if(source==='maintenance'&&m?.value&&r)r.value='';
   if(source==='request'&&r?.value&&m)m.value='';
   if(c)c.checked=!!(m?.value||r?.value);
 }
 if(m)m.onchange=()=>sync('maintenance');
 if(r)r.onchange=()=>sync('request');
}
function bindAgentActivityDuration(){
 const f=$('#modalForm');if(!f)return;
 const mode=f.elements.durationMode;
 const wrap=f.querySelector('[data-activity-hours-fields]');
 const note=f.querySelector('[data-activity-duration-note]');
 const refresh=()=>{
   const precise=(mode?.value||'hours')==='hours';
   if(wrap)wrap.style.display=precise?'contents':'none';
   if(note){
     note.textContent=mode?.value==='full-day'
       ?'La durée sera enregistrée comme une journée complète, sans obligation de saisir des heures.'
       :mode?.value==='half-day'
         ?'La durée sera enregistrée comme une demi-journée, sans obligation de saisir des heures.'
         :'Renseignez les heures de début et de fin si vous souhaitez comptabiliser une durée précise.';
   }
 }
 if(mode)mode.onchange=refresh;refresh();
}
function openAgentActivity(id,defaults={}){
 const old=id?byId('agentActivities',id):null;
 const selectedIds=old?agentActivityAgentIds(old):(defaults.agentIds||[defaults.agentId].filter(Boolean));
 const x=old||{id:uid(),no:nextNo('agentActivity','ACT'),date:todayISO(),start:'',end:'',agentId:selectedIds[0]||'',agentIds:selectedIds,durationMode:'hours',type:'Entretien courant',title:'',details:'',result:'',building:'',floor:'',sector:'',room:'',maintenanceId:defaults.maintenanceId||'',requestId:defaults.requestId||'',notes:''};
 if(!Array.isArray(x.agentIds)||!x.agentIds.length)x.agentIds=agentActivityAgentIds(x);
 if(!x.durationMode)x.durationMode='hours';
 const openMaint=(db.maintenance||[]).filter(m=>!['cloturee','terminee'].includes(normalizeText(m.status||''))).sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));
 const openReq=(db.requests||[]).filter(r=>!['cloture','termine'].includes(normalizeText(r.status||''))).sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));
 const maintOptions='<option value="">Aucune intervention liée</option>'+selectOptions(openMaint.concat(x.maintenanceId&&!openMaint.some(m=>m.id===x.maintenanceId)?[byId('maintenance',x.maintenanceId)].filter(Boolean):[]),x.maintenanceId,m=>`${m.no||''} — ${m.title||''}`,m=>m.id);
 const reqOptions='<option value="">Aucune demande liée</option>'+selectOptions(openReq.concat(x.requestId&&!openReq.some(r=>r.id===x.requestId)?[byId('requests',x.requestId)].filter(Boolean):[]),x.requestId,r=>`${r.no||''} — ${r.title||''}`,r=>r.id);
 openModal(old?'Modifier l’activité réalisée':'Ajout activité agent',`<div class="form-grid">
   ${activityAgentPickerHtml(x.agentIds)}
   ${field('Date','date',x.date,'date','required')}
   <label class="activity-duration-mode">Durée de l’activité<select name="durationMode">${selectOptions(AGENT_ACTIVITY_DURATION_MODES,x.durationMode,v=>v[1],v=>v[0])}</select></label>
   <div class="activity-hours-fields" data-activity-hours-fields>${field('Début','start',x.start,'time')}${field('Fin','end',x.end,'time')}</div>
   <div class="activity-duration-note" data-activity-duration-note></div>
   <label>Type d’activité<select name="type">${selectOptions(AGENT_ACTIVITY_TYPES,x.type)}</select></label>
   ${field('Travail réalisé','title',x.title,'text','required')}
   ${centralLocationFields(x,'actLoc')}
   ${textareaField('Détail de l’intervention / de la tâche','details',x.details)}
   ${textareaField('Résultat / suite donnée','result',x.result)}
   <div class="activity-modal-link">
    <strong>Lier à un travail déjà prévu (facultatif)</strong>
    <label>Intervention maintenance<select name="maintenanceId">${maintOptions}</select></label>
    <label>Demande direction<select name="requestId">${reqOptions}</select></label>
    <label class="linked-close-line"><input type="checkbox" name="closeLinked" value="1" ${(x.maintenanceId||x.requestId)?'checked':''}> Marquer l’élément lié comme terminé / clôturé</label>
    <small>Si aucun élément n’est choisi, l’activité reste une trace spontanée.</small>
   </div>
   ${textareaField('Commentaire complémentaire','notes',x.notes)}
 </div>`,async form=>{
   const fd=new FormData(form),o=formDataObj(form);
   const ids=[...new Set(fd.getAll('agentIds').map(String).filter(Boolean))];
   Object.assign(x,o,{agentIds:ids,agentId:ids[0]||'',durationMode:o.durationMode||'hours',maintenanceId:o.maintenanceId||'',requestId:o.requestId||''});
   if(x.durationMode!=='hours'){x.start='';x.end=''}
   if(x.room==='Autre lieu'&&x.otherLocation)x.room=x.otherLocation;
   if(!ids.length||!x.date||!String(x.title||'').trim()){toast('Choisissez au moins un agent, la date et le travail réalisé');return {ok:false}}
   if(x.durationMode==='hours'){
     if((x.start&&!x.end)||(!x.start&&x.end)){toast('Pour des heures précises, renseignez le début et la fin');return {ok:false}}
     if(x.start&&x.end&&agentActivityDuration(x)<=0){toast('L’heure de fin doit être après l’heure de début');return {ok:false}}
   }
   const persisted=await commitFormRecordVerified('Activité agent','agentActivities',x);
   if(!persisted?.ok)return {ok:false};
   const linkedOk=await updateLinkedItemFromActivity(x,!!form.elements.closeLinked?.checked);
   if(!linkedOk){toast('⚠️ Activité enregistrée, mais l’élément lié reste à vérifier');return {ok:true}}
   closeModal();renderAgentActivities();
   toast(x.maintenanceId||x.requestId?'✅ Activité tracée — élément lié mis à jour':'✅ Activité agent tracée');
   return {ok:true};
 },{audit:{track:!!old,type:'Activité agent',recordId:x.id,no:x.no,title:x.title,entity:()=>[agentActivityAgentNames(x),x.title].filter(Boolean).join(' — '),date:x.date},onDelete:old?()=>deleteRecord('agentActivities',x.id,'activité agent'):null});
 bindCentralLocation('actLoc');bindAgentActivityLinks();bindAgentActivityDuration();
}
function printAgentActivityRegister(){
 const view=$('#agent-activity');if(!view)return;
 printView('agent-activity');
}

function renderMaintenance(){const st=$('#maintenanceStatus').value,p=$('#maintenancePriority').value,f=$('#maintenanceFamily').value;const arr=db.maintenance.filter(x=>recordInAcademicYear(x,['date','dueDate'])&&(!st||x.status===st)&&(!p||x.priority===p)&&(!f||x.family===f)).sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));$('#maintenanceTable').innerHTML=arr.length?arr.map(x=>`<tr><td>${esc(x.no)}</td><td>${fmtDate(x.date)}</td><td>${esc([x.building,x.floor,x.room].filter(Boolean).join(' · '))}</td><td>${esc(x.family)}</td><td><strong>${esc(x.title)}</strong>${x.sourceNonconformityId?`<small>📋 Plan d’action issu d’un rapport de contrôle${x.sourceReportDate?` · rapport du ${fmtDate(x.sourceReportDate)}`:''}</small>`:''}<small>${esc(x.description||'')}</small></td><td>${badge(x.priority)}</td><td>${esc(x.assigned||'—')}</td><td>${fmtDate(x.dueDate)||'—'}</td><td>${badge(x.status)}</td><td>${editButton('maintenance',x.id)}</td></tr>`).join(''):emptyRow(10)}
function renderRequests(){const st=$('#requestStatus').value,t=$('#requestType').value;const arr=db.requests.filter(x=>recordInAcademicYear(x,['date','dueDate'])&&(!st||x.status===st)&&(!t||x.type===t)).sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));$('#requestsTable').innerHTML=arr.length?arr.map(x=>`<tr><td>${esc(x.no)}</td><td>${fmtDate(x.date)}</td><td>${esc(x.requester)}</td><td>${esc(x.type)}</td><td>${esc([x.building,x.room].filter(Boolean).join(' · '))}</td><td>${fmtDate(x.dueDate)||'—'}</td><td>${badge(x.priority)}</td><td>${badge(x.status)}</td><td>${editButton('request',x.id)}</td></tr>`).join(''):emptyRow(9)}
function renderWorks(){const st=$('#workStatus').value,t=$('#workType').value;const arr=db.works.filter(x=>recordInAcademicYear(x,['date','dueDate','gpaEnd'])&&(!st||x.status===st)&&(!t||x.type===t)).sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));$('#worksTable').innerHTML=arr.length?arr.map(x=>`<tr><td>${esc(x.no)}</td><td>${esc(x.type)}</td><td><strong>${esc(x.title)}</strong>${x.sourceNonconformityId?`<small>📋 Plan d’action issu d’un rapport de contrôle${x.sourceReportDate?` · rapport du ${fmtDate(x.sourceReportDate)}`:''}</small>`:''}<small>${esc(x.description||'')}</small></td><td>${esc(x.building)}</td><td>${esc(x.company||'—')}</td><td>${fmtDate(x.dueDate)||'—'}</td><td>${badge(x.priority)}</td><td>${badge(x.status)}</td><td>${editButton('work',x.id)}</td></tr>`).join(''):emptyRow(9)}
function renderMeetings(){const m=$('#meetingMonth').value,t=$('#meetingType').value;const arr=db.meetings.filter(x=>dateMonthMatch(x.date,m)&&(!t||x.type===t)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));$('#meetingsTable').innerHTML=arr.length?arr.map(x=>`<tr><td>${fmtDate(x.date)}</td><td>${esc(x.time||'—')}</td><td>${esc(x.type)}</td><td>${esc(x.title)}</td><td>${esc(x.location||'—')}</td><td>${esc(x.participants||'—')}</td><td>${badge(x.status)}</td><td>${editButton('meeting',x.id)}</td></tr>`).join(''):emptyRow(8)}
function personalMonthEventClass(x){
 const type=normalizeText(x?.type||''),title=normalizeText(x?.title||''),status=normalizeText(x?.status||'');
 if(type.includes('outlook')||title.includes('outlook'))return 'outlook';
 if(type.includes('tache')||type.includes('echeance'))return 'task';
 if(type.includes('rappel')||type.includes('appel'))return 'reminder';
 if(status.includes('clotur')||status.includes('termine'))return 'done';
 return 'appointment';
}
function personalMonthEventHTML(x){
 const cls=personalMonthEventClass(x),tm=[x.start,x.end].filter(Boolean).join('–'),place=x.location||'';
 const body=`<span class="personal-cal-event-time">${esc(tm||'Toute la journée')}</span><strong>${esc(x.title||'Événement')}</strong>${place?`<small>📍 ${esc(place)}</small>`:''}`;
 if(x.readOnlyRecurring)return `<button type="button" class="personal-cal-event ${cls} recurring" data-agenda-source="meter-reading" data-agenda-id="${esc(x.id||'')}" title="${esc(x.title||'Relevé des compteurs')}">${body}</button>`;
 return `<button type="button" class="personal-cal-event ${cls}" data-edit-type="personal" data-edit-id="${esc(x.id||'')}" title="Modifier : ${esc(x.title||'Événement')}">${body}</button>`;
}
function renderPersonalMonthCalendar(arr,m){
 const host=$('#personalMonthCalendar');if(!host)return;
 const ym=/^\d{4}-\d{2}$/.test(String(m||''))?m:monthISO(),[y,mo]=ym.split('-').map(Number);
 const first=`${ym}-01`,daysInMonth=new Date(y,mo,0).getDate(),offset=(parseDate(first).getDay()+6)%7;
 const cells=Math.ceil((offset+daysInMonth)/7)*7,start=addDays(first,-offset),byDate=new Map();
 for(const x of arr){const d=normalizeDateValue(x.date);if(!d)continue;if(!byDate.has(d))byDate.set(d,[]);byDate.get(d).push(x)}
 const monthName=new Date(y,mo-1,1).toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
 const title=$('#personalMonthTitle');if(title)title.textContent=monthName.charAt(0).toUpperCase()+monthName.slice(1);
 const summary=$('#personalMonthSummary');if(summary)summary.textContent=`${arr.length} élément${arr.length>1?'s':''} affiché${arr.length>1?'s':''} ce mois`;
 host.innerHTML=Array.from({length:cells},(_,i)=>{
   const d=addDays(start,i),inside=d.slice(0,7)===ym,today=d===todayISO(),items=(byDate.get(d)||[]).slice().sort((a,b)=>`${a.start||'99:99'}${a.title||''}`.localeCompare(`${b.start||'99:99'}${b.title||''}`));
   const dayHead=inside
     ?`<button type="button" class="personal-month-day-head" data-new-personal-date="${d}" title="Ajouter un événement le ${fmtDate(d)}"><span>${parseDate(d).toLocaleDateString('fr-FR',{weekday:'short'})}</span><strong>${parseDate(d).getDate()}</strong>${today?'<em>Aujourd’hui</em>':''}</button>`
     :`<div class="personal-month-day-head"><span>${parseDate(d).toLocaleDateString('fr-FR',{weekday:'short'})}</span><strong>${parseDate(d).getDate()}</strong></div>`;
   return `<section class="personal-month-day ${inside?'':'outside'} ${today?'today':''}" data-calendar-date="${d}">
     ${dayHead}
     <div class="personal-month-events">${items.length?items.map(personalMonthEventHTML).join(''):(inside?'<button type="button" class="personal-month-empty" data-new-personal-date="'+d+'">＋</button>':'')}</div>
   </section>`;
 }).join('');
}
function renderPersonal(){
 const m=$('#personalMonth').value||monthISO(),t=$('#personalType').value,st=$('#personalStatus').value;
 const regular=(db.personalEvents||[]).filter(x=>dateMonthMatch(x.date,m)&&(!t||x.type===t)&&(!st||x.status===st));
 const recurring=meterReadingItemsForMonth(m).filter(x=>(!t||x.type===t)&&(!st||x.status===st));
 const arr=[...regular,...recurring].sort((a,b)=>(a.date+(a.start||'')).localeCompare(b.date+(b.start||'')));
 const personalTable=$('#personalTable');if(personalTable)personalTable.innerHTML=arr.length?arr.map(x=>`<tr>
   <td>${fmtDate(x.date)}</td>
   <td>${esc([x.start,x.end].filter(Boolean).join('–')||'—')}</td>
   <td>${esc(x.type)}</td>
   <td><strong>${esc(x.title)}</strong>${x.readOnlyRecurring?'<small>Récurrence automatique mensuelle</small>':''}</td>
   <td>${esc(x.location||'—')}</td>
   <td>${badge(x.priority)}</td>
   <td>${badge(x.status)}</td>
   <td>${x.readOnlyRecurring?'<span class="meter-reading-chip">Automatique</span>':editButton('personal',x.id)}</td>
  </tr>`).join(''):emptyRow(8);
 const personalCards=$('#personalCards');if(personalCards)personalCards.innerHTML=cardList(arr.map(x=>`<article class="list-card">
   <div><strong>${fmtDate(x.date)} ${esc(x.start||'')}</strong>${badge(x.status)}</div>
   <h3>${esc(x.title)}</h3>
   <p>${esc(x.type)} · ${esc(x.location||'Sans lieu')}</p>
   ${x.readOnlyRecurring?'<span class="meter-reading-chip">Dernier jour ouvré du mois</span>':`<button type="button" data-edit-type="personal" data-edit-id="${x.id}">Modifier</button>`}
  </article>`));
 renderPersonalMonthCalendar(arr,m);
 renderMeterReadingsAgenda();
}
function renderNotes(){const cat=$('#noteCategory').value,p=$('#notePriority').value,s=$('#noteStatus').value,q=($('#noteSearch').value||'').toLowerCase();const arr=db.notes.filter(x=>recordInAcademicYear(x,['date','dueDate'])&&(!cat||x.category===cat)&&(!p||x.priority===p)&&(!s||x.status===s)&&(!q||`${x.title} ${x.text}`.toLowerCase().includes(q))).sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));$('#notesBoard').innerHTML=cardList(arr.map(x=>{const done=(x.items||[]).filter(i=>i.done).length;return `<article class="note-card"><div class="panel-head"><span>${esc(x.category)}</span>${badge(x.priority)}</div><h3>${esc(x.title)}</h3><p>${esc(x.text||'')}</p>${x.agentId?`<p>👤 ${esc(agentName(agentById(x.agentId)))}</p>`:''}<p>Échéance : ${fmtDate(x.dueDate)||'—'} · ${done}/${(x.items||[]).length} items</p><ul>${(x.items||[]).map(i=>`<li class="${i.done?'done':''}">${i.done?'✓':'○'} ${esc(i.text)}</li>`).join('')}</ul>${attachmentButtons(x.attachments)}<div class="card-actions"><span>${badge(x.status)}</span><button type="button" class="note-edit-button" data-edit-type="note" data-edit-id="${x.id}" aria-label="Modifier la note ${esc(x.title)}">Modifier</button></div></article>`}),'Aucune note.')}
function renderDocuments(){const cat=$('#documentCategory').value,q=($('#documentSearch').value||'').toLowerCase();const arr=db.documents.filter(x=>recordInAcademicYear(x,['date'])&&(!cat||x.category===cat)&&(!q||`${x.title} ${x.description}`.toLowerCase().includes(q))).sort((a,b)=>b.date.localeCompare(a.date));
 const guides=BUILTIN_GUIDES.filter(x=>(!cat||x.category===cat)&&(!q||x.title.toLowerCase().includes(q)));
 $('#documentCards').innerHTML=cardList([
   ...guides.map(g=>`<article class="document-card builtin"><div class="doc-icon">📘</div><h3>${esc(g.title)}</h3><p>Document officiel stocké dans Supabase Storage.</p><button data-guide-path="${esc(g.storagePath)}">Ouvrir le guide</button></article>`),
   ...arr.map(x=>`<article class="document-card"><div class="doc-icon">📄</div><h3>${esc(x.title)}</h3><p>${esc(x.category)} · ${fmtDate(x.date)}</p><p>${esc(x.description||'')}</p>${attachmentButtons(x.attachments)}${oneDriveLinkButtons('documents',x.id)}<button type="button" data-edit-type="document" data-edit-id="${x.id}">Modifier</button></article>`)
 ],'Aucun document trouvé.');}
function renderOutlook(){const email=db.settings.outlookEmail||'';const label=$('#outlookMailLabel');if(label)label.textContent=email?`Compte repère : ${email}`:'Adresse professionnelle non renseignée';}
/* ---------- Tableau de bord ---------- *//* ---------- Tableau de bord ---------- */
function itemCard(icon,title,meta,editType,id){return `<button type="button" class="preview-item" data-edit-type="${editType}" data-edit-id="${id}"><span>${icon}</span><div><strong>${esc(title)}</strong><small>${meta}</small></div><b>›</b></button>`}

function isoWeekKey(dateISO){const d=parseDate(dateISO);d.setHours(0,0,0,0);d.setDate(d.getDate()+3-(d.getDay()+6)%7);const y=d.getFullYear(),w=1+Math.round(((d-new Date(y,0,4))/86400000-3+(new Date(y,0,4).getDay()+6)%7)/7);return `${y}-S${String(w).padStart(2,'0')}`}
function academicYearFor(dateISO){const d=parseDate(dateISO),y=d.getFullYear();return d.getMonth()>=8?`${y}-${y+1}`:`${y-1}-${y}`}
function normalizeAcademicYear(value){
 const m=String(value||'').match(/(\d{4})\s*[-–]\s*(\d{4})/);if(!m)return '';
 const a=Number(m[1]),b=Number(m[2]);return b===a+1?`${a}-${b}`:'';
}
function activeAcademicYear(){return normalizeAcademicYear(window.PSTActiveAcademicYear)||normalizeAcademicYear(db?.settings?.academicYear)||academicYearFor(todayISO())}
function academicYearStart(label){return Number((normalizeAcademicYear(label)||academicYearFor(todayISO())).slice(0,4))}
function academicYearRange(label){const y=academicYearStart(label);return {start:`${y}-09-01`,end:`${y+1}-08-31`,startYear:y,endYear:y+1}}
function shiftAcademicYear(label,delta){const y=academicYearStart(label)+Number(delta||0);return `${y}-${y+1}`}
function academicYearContains(label,dateISO){if(!dateISO)return false;const r=academicYearRange(label),d=normalizeDateValue(dateISO);return !!d&&d>=r.start&&d<=r.end}
function recordInAcademicYear(record,dateFields=['date'],label=activeAcademicYear()){
 const y=normalizeAcademicYear(label)||activeAcademicYear(),r=academicYearRange(y);
 if(normalizeAcademicYear(record?.academicYear))return normalizeAcademicYear(record.academicYear)===y;
 for(const f of dateFields){const d=normalizeDateValue(record?.[f]);if(d&&d>=r.start&&d<=r.end)return true}
 return !dateFields.some(f=>normalizeDateValue(record?.[f]));
}
function periodOverlapsAcademicYear(record,startField='effectiveFrom',endField='effectiveTo',label=activeAcademicYear()){
 const r=academicYearRange(label),start=normalizeDateValue(record?.[startField]),end=normalizeDateValue(record?.[endField]);
 if(!start&&!end)return true;
 return (!start||start<=r.end)&&(!end||end>=r.start);
}
window.PSTAcademicMismatch=null;
function setAcademicYearMismatch(year,source='Données'){const y=normalizeAcademicYear(year);window.PSTAcademicMismatch=y&&y!==activeAcademicYear()?{year:y,source}:null;renderGlobalAcademicYear()}
function clearAcademicYearMismatch(){window.PSTAcademicMismatch=null;renderGlobalAcademicYear()}
function buildAcademicYearOptions(select,centerLabel){if(!select)return;const center=academicYearStart(centerLabel);const previous=select.value;select.innerHTML='';for(let y=center-5;y<=center+5;y++){const label=`${y}-${y+1}`;select.insertAdjacentHTML('beforeend',`<option value="${label}">${label}</option>`)}select.value=normalizeAcademicYear(centerLabel)||previous||academicYearFor(todayISO())}
function syncAcademicYearFilters(label){
 const y=normalizeAcademicYear(label)||activeAcademicYear(),r=academicYearRange(y),fallbackMonth=`${r.startYear}-09`;
 const monthIds=['personalMonth','planningMonth','absenceMonth','issueMonth','cleanMonth','meetingMonth','monthlyDate','teamReportMonth','absenceReportMonth','cleaningReportMonth','maintenanceReportMonth'];
 for(const id of monthIds){
   const e=document.getElementById(id);
   if(e&&(!e.value||!academicYearContains(y,`${e.value}-01`)))e.value=fallbackMonth;
 }
 const dateIds=['dailyDate','weeklyDate','collectivePlanningDate','individualPlanningFrom','individualPlanningTo','teamDateJump'];
 for(const id of dateIds){
   const e=document.getElementById(id);
   if(e&&(!e.value||!academicYearContains(y,e.value)))e.value=r.start;
 }
 const ry=document.getElementById('rotationYear');if(ry){buildAcademicYearOptions(ry,y);ry.value=String(r.startYear)}
 const vy=document.getElementById('vacationYear');if(vy){buildAcademicYearOptions(vy,y);vy.value=y}
 const ay=document.getElementById('archiveYear');
 if(ay){
   const values=[...ay.options].map(o=>o.value);
   if(!values.includes(y))ay.insertAdjacentHTML('beforeend',`<option value="${y}">${y}</option>`);
   ay.value=y;
 }
 const pr=document.getElementById('periodicReportYear');if(pr)pr.value=String(r.startYear);
 const set=document.getElementById('academicYear');if(set)set.value=y;

 // Les calendriers hebdomadaires n'ont plus leur propre année cachée.
 if(typeof teamWeek!=='undefined'&&!academicYearContains(y,teamWeek))teamWeek=startOfWeek(r.start);
 if(typeof personalWeek!=='undefined'&&!academicYearContains(y,personalWeek))personalWeek=startOfWeek(r.start);
}
function setActiveAcademicYear(year,{render=true,persist=true}={}){
 const y=normalizeAcademicYear(year);if(!y)return false;
 // V147.80 — le choix du tableau de bord est la source unique du contexte scolaire.
 window.PSTActiveAcademicYear=y;
 db.settings.academicYear=y;
 syncAcademicYearFilters(y);
 const mismatch=window.PSTAcademicMismatch;if(mismatch?.year===y)window.PSTAcademicMismatch=null;
 if(persist)save(false);
 if(render)safeRenderAll();
 renderGlobalAcademicYear();
 try{window.dispatchEvent(new CustomEvent('pst:academic-year-changed',{detail:{year:y,source:'dashboard'}}))}catch(_){}
 return true
}
function renderGlobalAcademicYear(){
 const y=activeAcademicYear(),sel=document.getElementById('globalAcademicYear');if(sel){buildAcademicYearOptions(sel,y);sel.value=y}
 const wrap=document.getElementById('globalAcademicYearWrap'),warn=document.getElementById('academicYearWarning'),m=window.PSTAcademicMismatch;
 const bad=!!(m&&m.year&&m.year!==y);if(wrap)wrap.classList.toggle('mismatch',bad);
 if(warn){warn.classList.toggle('hidden',!bad);warn.innerHTML=bad?`⚠ ${esc(m.source||'Données')} : année ${esc(m.year)} — sélection actuelle ${esc(y)} <button type="button" id="switchAcademicYearWarning">Basculer sur ${esc(m.year)}</button>`:'';const b=document.getElementById('switchAcademicYearWarning');if(b)b.onclick=()=>setActiveAcademicYear(m.year)}
}
function recordsInRange(arr,start,end,dateFields=['date']){return (arr||[]).filter(x=>dateFields.some(f=>x[f]&&x[f]>=start&&x[f]<=end)).map(clone)}
function createWeeklyArchive(force=false){const end=addDays(startOfWeek(todayISO()),-1),start=addDays(end,-6),key=isoWeekKey(start);if(!force&&db.archives.some(a=>a.kind==='weekly'&&a.key===key))return false;const absent=recordsInRange(db.agentDays,start,end).filter(x=>isAbsenceType(x.dayType));const snapshot={id:uid(),kind:'weekly',key,year:start.slice(0,4),academicYear:academicYearFor(start),start,end,createdAt:new Date().toISOString(),summary:{agents:db.agents.filter(a=>a.status==='Actif').length,absences:absent.length,maintenance:recordsInRange(db.maintenance,start,end,['date','dueDate']).length,cleaning:recordsInRange(db.cleaning,start,end).length,meetings:recordsInRange(db.meetings,start,end).length,notes:recordsInRange(db.notes,start,end,['date','dueDate']).length},data:{agentDays:recordsInRange(db.agentDays,start,end),maintenance:recordsInRange(db.maintenance,start,end,['date','dueDate']),cleaning:recordsInRange(db.cleaning,start,end),meetings:recordsInRange(db.meetings,start,end),personalEvents:recordsInRange(db.personalEvents,start,end),notes:recordsInRange(db.notes,start,end,['date','dueDate']),issues:recordsInRange(db.issues,start,end,['date','dueDate']),requests:recordsInRange(db.requests,start,end,['date','dueDate']),works:recordsInRange(db.works,start,end,['date','dueDate'])}};db.archives.push(snapshot);db.settings.lastWeeklyArchiveKey=key;return true}
function runAnnualReset(){const t=parseDate(todayISO()),y=t.getFullYear(),isCloseDay=t.getMonth()===7&&t.getDate()===31,isAfterClose=t.getMonth()>=8;if(!isCloseDay&&!isAfterClose)return false;const closeYear=y;if(db.settings.lastAnnualResetYear>=closeYear)return false;const prevStart=closeYear-1,from=`${prevStart}-09-01`,to=`${closeYear}-08-31`,key=`${prevStart}-${closeYear}`;if(!db.archives.some(a=>a.kind==='annual'&&a.key===key)){db.archives.push({id:uid(),kind:'annual',key,year:String(closeYear),academicYear:key,start:from,end:to,createdAt:new Date().toISOString(),summary:{leaveDays:db.agentDays.filter(x=>x.date>=from&&x.date<=to&&isAbsenceType(x.dayType)).length,overtime:db.agentDays.filter(x=>x.date>=from&&x.date<=to).reduce((n,x)=>n+Number(x.overtime||0),0)},data:{agentDays:recordsInRange(db.agentDays,from,to),rotations:clone(db.rotations),weeklyPlans:clone(db.weeklyPlans)}})}db.settings.lastAnnualResetYear=closeYear;db.settings.leaveBalances={};db.settings.overtimeBalances={};return true}
function runAutomaticHousekeeping(){let changed=false;try{changed=createWeeklyArchive(false)||changed;changed=runAnnualReset()||changed}catch(e){console.error('Archivage automatique',e)}return changed}
function notificationTarget(n){setView(n.view||'dashboard');if(n.type==='agentDay'&&n.id){const r=db.agentDays.find(x=>x.id===n.id);if(r)setTimeout(()=>openAgentDay(r.agentId,r.date),50);return}if(n.type&&n.id)setTimeout(()=>dispatchEdit(n.type,n.id),50)}
function wasteCollectionShiftInfo(referenceDate=todayISO()){
 const ref=normalizeDateValue(referenceDate)||todayISO(),d=parseDate(ref),day=d.getDay();
 // Semaine lundi -> dimanche contenant la date de référence.
 const monday=addDays(ref,-((day+6)%7)),friday=addDays(monday,4);
 const holidays=[];
 for(let x=monday;x<=friday;x=addDays(x,1)){
  const name=frenchPublicHolidayName(x);if(name)holidays.push({date:x,name});
 }
 const shifted=holidays.length>0,actualDate=shifted?addDays(friday,1):friday;
 return {monday,friday,actualDate,shifted,holidays};
}
function computeNotifications(){
 const out=[],today=todayISO(),replacementUntil=addMonths(today,1),active=(db.agents||[]).filter(a=>normalizeText(a.status)==='actif'),days=[0,1,2,3,4,5,6].map(i=>addDays(today,i));
 const push=n=>{if(n&&n.title)out.push(n)};
 // Poubelles : le jeudi, avertir si un jour férié de la semaine décale la collecte du vendredi au samedi.
 try{
  const shift=wasteCollectionShiftInfo(today),wd=parseDate(today).getDay();
  if(wd===4&&shift.shifted){
   const names=shift.holidays.map(h=>`${h.name} (${fmtDate(h.date)})`).join(', ');
   push({level:'orange',icon:'🗑️',title:'Collecte des poubelles décalée d’un jour',text:`Jour férié cette semaine : ${names}. Passage samedi ${fmtDate(shift.actualDate)} au lieu du vendredi ${fmtDate(shift.friday)}.`,view:'waste',type:'waste-holiday-shift',id:shift.friday,date:today});
  }
 }catch(error){console.error('Notification collecte déchets',error)}
 const openMaintenanceStatus=value=>{
  const s=normalizeText(value);
  return s==='a faire'||s==='en cours'||s.startsWith('en attente')||s==='a qualifier'||s==='planifiee'||s==='planifie'||s==='bloquee'||s==='bloque';
 };
 const timeOrderInvalid=(start,end)=>{
  const a=minutes(start),b=minutes(end);return a!=null&&b!=null&&b<=a;
 };
 const overlap=(a,b)=>{
  const as=minutes(a?.start),ae=minutes(a?.end),bs=minutes(b?.start),be=minutes(b?.end);
  if([as,ae,bs,be].some(v=>v==null))return false;
  return as<be&&bs<ae;
 };
 try{
  // Remplacements : alerter à partir d'un mois avant l'absence, pour tous les agents actifs.
  // Au-delà d'un mois, aucune notification de remplacement n'est affichée. Les exclusions
  // (week-end, férié, non-remplacement, refus/annulation) sont centralisées dans replacementNotificationAllowed().
  const activeIds=new Set(active.map(a=>String(a.id)));
  const futureAbsences=(db.agentDays||[])
   .filter(rec=>{const d=normalizeDateValue(rec.date);return activeIds.has(String(rec.agentId))&&d>=today&&d<=replacementUntil&&isAbsenceType(rec.dayType)})
   .sort((a,b)=>normalizeDateValue(a.date).localeCompare(normalizeDateValue(b.date)));
  for(const rec of futureAbsences){
   const day=normalizeDateValue(rec.date),a=agentById(rec.agentId);
   if(a&&replacementNotificationAllowed(rec,day)&&!String(rec.replacement||'').trim()){
    push({level:'orange',icon:'⚠️',title:`${agentName(a)} absent${day===today?' aujourd’hui':` le ${fmtDate(day)}`}`,text:`${rec.dayType||'Absence'} — remplacement à organiser`,view:'absences',type:'agentDay',id:rec.id||'',date:day});
   }
  }
  // Alertes de cohérence horaire : surveillance rapprochée sur les 7 prochains jours.
  for(const day of days){
   const abs=[];
   for(const a of active){
    const info=dayInfo(a.id,day)||{},records=(db.agentDays||[]).filter(x=>String(x.agentId)===String(a.id)&&normalizeDateValue(x.date)===day),rec=records[0];
    if(isAbsenceType(info.dayType)){
     abs.push({a,info,rec});
     if((rec?.actualStart||rec?.actualEnd||Number(rec?.overtime||0)>0))push({level:'red',icon:'🕒',title:`Horaire incohérent — ${agentName(a)}`,text:`${fmtDate(day)} : absence avec horaire réel ou heures supplémentaires`,view:'planning',type:rec?'agentDay':null,id:rec?.id||'',date:day});
    }
    if(records.length>1)push({level:'red',icon:'🕒',title:`Horaire incohérent — ${agentName(a)}`,text:`${fmtDate(day)} : plusieurs saisies existent pour la même journée`,view:'planning',type:rec?'agentDay':null,id:rec?.id||'',date:day});
    if(!isAbsenceType(info.dayType)&&info.dayType!=='Repos'){
     if((info.plannedStart&&!info.plannedEnd)||(!info.plannedStart&&info.plannedEnd))push({level:'red',icon:'🕒',title:`Horaire incomplet — ${agentName(a)}`,text:`${fmtDate(day)} : début ou fin théorique manquant`,view:'planning',type:rec?'agentDay':null,id:rec?.id||'',date:day});
     if(timeOrderInvalid(info.plannedStart,info.plannedEnd))push({level:'red',icon:'🕒',title:`Horaire incohérent — ${agentName(a)}`,text:`${fmtDate(day)} : fin théorique antérieure ou égale au début`,view:'planning',type:rec?'agentDay':null,id:rec?.id||'',date:day});
     if((info.actualStart&&!info.actualEnd)||(!info.actualStart&&info.actualEnd))push({level:'orange',icon:'🕒',title:`Saisie réelle incomplète — ${agentName(a)}`,text:`${fmtDate(day)} : arrivée ou départ réel manquant`,view:'planning',type:rec?'agentDay':null,id:rec?.id||'',date:day});
     if(info.actualStart&&info.actualEnd&&timeOrderInvalid(info.actualStart,info.actualEnd))push({level:'red',icon:'🕒',title:`Horaire réel incohérent — ${agentName(a)}`,text:`${fmtDate(day)} : départ réel antérieur ou égal à l’arrivée`,view:'planning',type:rec?'agentDay':null,id:rec?.id||'',date:day});
     const duration=info.plannedStart&&info.plannedEnd?Math.max(0,(minutes(info.plannedEnd)-minutes(info.plannedStart)+1440)%1440):0;
     if(duration&&Number(info.pause||0)>=duration)push({level:'red',icon:'🕒',title:`Pause incohérente — ${agentName(a)}`,text:`${fmtDate(day)} : la pause est supérieure ou égale à la présence`,view:'planning',type:rec?'agentDay':null,id:rec?.id||'',date:day});
    }
   }
  }
  // Alerte collective de remplacement sur la même fenêtre d'un mois.
  for(let day=today;day<=replacementUntil;day=addDays(day,1)){
   const absToCover=(db.agentDays||[]).filter(rec=>activeIds.has(String(rec.agentId))&&normalizeDateValue(rec.date)===day&&isAbsenceType(rec.dayType)&&replacementNotificationAllowed(rec,day)&&!String(rec.replacement||'').trim());
   if(absToCover.length>=2)push({level:'yellow',icon:'👥',title:`${absToCover.length} agents à remplacer le ${fmtDate(day)}`,text:'Vérifier la couverture des postes',view:'absences',date:day});
  }
  // Vérification des profils annuels : segments qui se chevauchent et horaires invalides.
  for(const p of db.weeklyPlans||[]){
   const agent=agentById(p.agentId),name=agentName(agent)||p.agent||'Agent';
   for(const [weekday,profile] of Object.entries(p.dayProfiles||{})){
    if(!profile)continue;
    if(timeOrderInvalid(profile.start,profile.end))push({level:'red',icon:'🕒',title:`Horaire annuel incohérent — ${name}`,text:`Jour ${weekday} : fin antérieure ou égale au début`,view:'planning',date:p.effectiveFrom||today});
    const seg=(profile.segments||[]).filter(x=>x.start&&x.end&&!/pause/i.test(x.task||''));
    for(let i=0;i<seg.length;i++)for(let j=i+1;j<seg.length;j++)if(overlap(seg[i],seg[j]))push({level:'red',icon:'🕒',title:`Créneaux superposés — ${name}`,text:`Jour ${weekday} : ${seg[i].start}–${seg[i].end} chevauche ${seg[j].start}–${seg[j].end}`,view:'planning',date:p.effectiveFrom||today});
   }
  }
  // Plusieurs roulements actifs simultanément pour le même agent.
  for(const a of active){
   for(const day of days){
    const rs=(db.rotations||[]).filter(r=>String(r.agentId)===String(a.id)&&(!r.effectiveFrom||r.effectiveFrom<=day)&&(!r.effectiveTo||r.effectiveTo>=day));
    if(rs.length>1)push({level:'red',icon:'🔄',title:`Roulements incohérents — ${agentName(a)}`,text:`${fmtDate(day)} : ${rs.length} roulements actifs en même temps`,view:'rotations',type:'rotation',id:rs[0]?.id||'',date:day});
   }
  }
 }catch(error){console.error('Notifications agents et horaires',error)}
 try{
  for(const x of db.maintenance||[]){
   if(isClosedStatus(x.status)||!openMaintenanceStatus(x.status))continue;
   const due=recordDueDate(x),late=!!due&&due<today,urgent=isUrgentPriority(x.priority);
   if(late||urgent)push({level:late?'red':'orange',icon:'🔧',title:x.title||x.no||'Intervention',text:late?`En retard depuis le ${fmtDate(due)} · statut ${x.status||'—'}`:`Intervention urgente · statut ${x.status||'—'}`,view:'maintenance',type:'maintenance',id:x.id,date:due||normalizeDateValue(x.date)||today});
  }
 }catch(error){console.error('Notifications maintenance',error)}
 try{
  for(const x of db.periodic||[]){
   if(periodicIsInactive(x))continue;
   const due=normalizeDateValue(periodicDue(x));if(!due)continue;
   const diff=daysBetweenDates(today,due);if(diff!==null&&diff<=30){
    const level=diff<=0?'red':diff<=15?'orange':'yellow';
    push({level,icon:'🛡️',title:x.name||x.no||'Contrôle périodique',text:diff<0?`Contrôle dépassé de ${Math.abs(diff)} jour(s)`:diff===0?'Contrôle prévu aujourd’hui':`Contrôle dans ${diff} jour(s)`,view:'periodic',type:'periodic',id:x.id,date:due});
   }
  }
 }catch(error){console.error('Notifications contrôles périodiques',error)}
 try{
  if(db.settings?.cleaningNotificationsEnabled!==false){
  const threshold=Math.max(1,Number(db.settings?.cleaningAlertDays||30));
  const never=[],overdue=[],planned=[];
  for(const sp of db.spaces||[]){
   const arr=(db.cleaning||[]).filter(c=>c.building===sp.building&&c.floor===sp.floor&&(c.room===sp.name||c.room==='Zone entière')).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
   if(!arr.length)never.push(sp);
   else{
    const last=normalizeDateValue(arr[0].date),diff=last?daysBetweenDates(last,today):null;
    if(diff!==null&&diff>threshold)overdue.push({space:sp,last,diff,id:arr[0].id});
   }
  }
  for(const x of (db.cleaning||[]).filter(c=>normalizeDateValue(c.date)<=today&&normalizeText(c.overallStatus)==='non controle'))planned.push(x);
  if(db.settings?.cleaningNotifyNever!==false&&never.length){const sample=never.slice(0,4).map(sp=>sp.name).join(', ');push({level:'yellow',icon:'🧹',title:`${never.length} local${never.length>1?'x':''} jamais contrôlé${never.length>1?'s':''}`,text:`${sample}${never.length>4?'…':''}`,details:never.map(sp=>`${sp.building||'Bâtiment'} · ${sp.floor||'Niveau'} · ${sp.name}`),view:'cleaning',type:'cleaning-summary',id:'never',date:today});}
  if(db.settings?.cleaningNotifyOverdue!==false&&overdue.length){const max=Math.max(...overdue.map(x=>x.diff));const sample=overdue.slice(0,4).map(x=>x.space.name).join(', ');push({level:'yellow',icon:'🧹',title:`${overdue.length} local${overdue.length>1?'x':''} à contrôler`,text:`Non contrôlé${overdue.length>1?'s':''} depuis plus de ${threshold} jours · ${sample}${overdue.length>4?'…':''}`,details:overdue.map(x=>`${x.space.building||'Bâtiment'} · ${x.space.floor||'Niveau'} · ${x.space.name} — dernier contrôle ${fmtDate(x.last)}`),view:'cleaning',type:'cleaning-summary',id:'overdue',date:today});}
  if(db.settings?.cleaningNotifyPlanned!==false&&planned.length){const sample=planned.slice(0,4).map(x=>x.room||x.roomType||'Local').join(', ');push({level:'orange',icon:'🧹',title:`${planned.length} contrôle${planned.length>1?'s':''} ménage non réalisé${planned.length>1?'s':''}`,text:`${sample}${planned.length>4?'…':''}`,details:planned.map(x=>`${x.building||'Bâtiment'} · ${x.floor||'Niveau'} · ${x.room||x.roomType||'Local'} — ${fmtDate(x.date)}`),view:'cleaning',type:'cleaning-summary',id:'planned',date:today});}
  }
 }catch(error){console.error('Notifications ménage',error)}
 try{
  const meetingDays=Math.max(1,Number(db.settings?.meetingAlertDays||3));
  for(const x of [...(db.meetings||[]),...(db.personalEvents||[])]){
   const date=normalizeDateValue(x.date);if(!date||date<today||isClosedStatus(x.status))continue;
   const diff=daysBetweenDates(today,date);if(diff!==null&&diff<=meetingDays)push({level:'blue',icon:'📅',title:x.title||'Rendez-vous',text:diff===0?`Aujourd’hui ${x.time||x.start||''}`:`Dans ${diff} jour(s) — ${fmtDate(date)}`,view:x.no?.startsWith('PER')?'personal':'meetings',type:x.no?.startsWith('PER')?'personalEvent':'meeting',id:x.id,date});
  }
 }catch(error){console.error('Notifications rendez-vous',error)}
 try{
  const nc=(db.reportNonconformities||[]).filter(x=>!['levee','leve','conforme','cloturee','cloture','archivee','archive'].includes(normalizeText(x.status)));
  if(nc.length)push({level:'orange',icon:'🛡️',title:`${nc.length} non-conformité${nc.length>1?'s':''} de contrôle à traiter`,text:'Rapports APAVE / organismes de contrôle — ouvrir les imports PDF pour le suivi',view:'pdfimports',type:'control-summary',id:'nonconformities',date:today});
 }catch(error){console.error('Notifications rapports de contrôle',error)}
 const seen=new Set(),dedup=out.filter(n=>{const k=[n.level,n.title,n.text,n.id,n.date].join('|');if(seen.has(k))return false;seen.add(k);return true});
 const order={red:0,orange:1,yellow:2,blue:3,green:4};return dedup.sort((a,b)=>(order[a.level]-order[b.level])||String(a.date||'').localeCompare(String(b.date||''))).slice(0,100)
}
function renderNotifications(){const arr=computeNotifications(),count=arr.length,b=$('#notificationCount');if(b){b.textContent=count;b.classList.toggle('hidden',!count)}const sub=$('#notificationSubtitle');if(sub)sub.textContent=count?`${count} notification${count>1?'s':''} à consulter`:'Aucune notification';const list=$('#notificationList');if(list)list.innerHTML=arr.length?arr.map((n,i)=>`<button class="notification-item ${n.level}" data-notification-index="${i}"><span class="notification-icon">${n.icon}</span><span><strong>${esc(n.title)}</strong><small>${esc(n.text)}</small></span><span class="go-arrow">›</span></button>`).join(''):'<div class="empty-state">✓ Aucune notification à traiter.</div>';window.__notifications=arr}
window.PSTNotifications={compute:computeNotifications,render:renderNotifications,target:notificationTarget};
window.PSTDiagnostics={
 getDb:()=>db,
 notificationSummary:()=>{
  const today=todayISO();
  const openStatuses=new Set(['a faire','en cours','en attente']);
  const maintenance=(db.maintenance||[]).map(x=>({
   id:x.id||'',title:x.title||x.no||'Intervention',status:x.status||'',statusNormalized:normalizeText(x.status),
   due:recordDueDate(x),priority:x.priority||'',closed:isClosedStatus(x.status)
  }));
  const maintenanceOpen=maintenance.filter(x=>!x.closed&&[...openStatuses].some(s=>x.statusNormalized===s||x.statusNormalized.startsWith(s+' ')));
  const maintenanceLate=maintenanceOpen.filter(x=>x.due&&x.due<today);
  let notifications=[];let error='';try{notifications=computeNotifications()}catch(e){error=e?.message||String(e)}
  return {today,agents:(db.agents||[]).length,agentDays:(db.agentDays||[]).length,maintenanceTotal:maintenance.length,maintenanceOpen:maintenanceOpen.length,maintenanceLate:maintenanceLate.length,maintenanceLateDetails:maintenanceLate,periodicTotal:(db.periodic||[]).length,cleaningTotal:(db.cleaning||[]).length,meetingsTotal:(db.meetings||[]).length,notifications:notifications.length,error};
 }
};

function importedArchiveRows(){
 const explicit=(db.importArchives||[]).map(x=>({...x}));
 const seen=new Set(explicit.map(x=>x.sourceId||x.id));
 for(const x of (db.pdfImports||[])){
  if(seen.has(x.id))continue;
  explicit.push({id:`pdf-${x.id}`,sourceId:x.id,createdAt:x.createdAt||'',type:x.kind==='chronotime'?'Chronotime':'Rapport de contrôle',fileName:x.fileName||'PDF',attachmentId:x.attachmentId||'',bundledPath:x.bundledPath||'',bundledKey:x.bundledKey||'',subject:x.subject||'',academicYear:x.academicYear||'',summary:x.summary||'',module:x.kind==='chronotime'?'pdfimports':'periodic'});
 }
 for(const n of (db.notes||[]).filter(n=>n.source==='scan'||n.importedScan)){
  if(seen.has(n.id))continue;
  const a=(n.attachments||[])[0];explicit.push({id:`note-${n.id}`,sourceId:n.id,createdAt:n.importedAt||`${n.date||todayISO()}T00:00:00`,type:'Note scannée',fileName:a?.name||n.title||'Note scannée',attachmentId:a?.id||'',subject:n.title||'',summary:(n.text||'').slice(0,180),module:'notes',recordId:n.id});
 }
 return explicit.sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
}
function archiveAttachmentMeta(attachmentId){return (db.attachments||[]).find(a=>String(a.id)===String(attachmentId))||null}
function cloudStatusHtml(rec){
 if(!rec)return '<span class="cloud-status missing">⚪ Original absent</span>';
 if(rec.cloudVerified===true)return `<span class="cloud-status synced" title="Vérifié ${esc(rec.cloudVerifiedAt?new Date(rec.cloudVerifiedAt).toLocaleString('fr-FR'):'')}">☁️ Cloud — Synchronisé</span>`;
 if(rec.storagePath){
  const err=rec.cloudError?` title="${esc(rec.cloudError)}"`:'';
  return `<span class="cloud-status checking"${err}>☁️ Cloud — À vérifier</span>`;
 }
 return '<span class="cloud-status error">⚠️ Original indisponible</span>';
}
function cloudActionHtml(rec){
 if(!rec)return '';
 if(rec.cloudVerified===true)return '';
 if(rec.storagePath)return `<button class="ghost small" data-verify-import-cloud="${esc(rec.id)}">🔎 Vérifier le cloud</button>`;
 return '';
}
function renderImportArchives(){
 const box=$('#importArchiveCards'),sum=$('#importArchiveSummary');if(!box||!sum)return;
 const type=$('#importArchiveType')?.value||'',q=normalizeText($('#importArchiveSearch')?.value||'');let rows=importedArchiveRows();
 if(type)rows=rows.filter(x=>x.type===type);if(q)rows=rows.filter(x=>normalizeText(`${x.fileName} ${x.subject} ${x.summary} ${x.academicYear} ${x.type}`).includes(q));
 const all=importedArchiveRows(),resolved=all.map(x=>({x,a:resolveArchiveAttachment(x)})),withOriginal=resolved.filter(o=>!!o.a?.storagePath).length,cloudSynced=resolved.filter(o=>o.a?.cloudVerified===true).length,cloudPending=resolved.filter(o=>o.a?.storagePath&&o.a?.cloudVerified!==true).length;
 sum.innerHTML=`<article><span>Imports conservés</span><strong>${all.length}</strong></article><article><span>Originaux cloud</span><strong>${withOriginal}</strong></article><article><span>☁️ Cloud vérifié</span><strong>${cloudSynced}</strong></article><article><span>☁️ À vérifier</span><strong>${cloudPending}</strong></article>`;
 box.innerHTML=rows.length?rows.map(x=>{const att=resolveArchiveAttachment(x);if(att)rememberImportOriginalBinding(x,att);const attachmentId=att?.id||x.attachmentId||'';return `<article class="import-archive-card"><div class="import-archive-icon">${x.type==='Chronotime'?'⏱':x.type==='Note scannée'?'📝':x.type.includes('Contrôle')||x.type.includes('Rapport')?'🛡':'📄'}</div><div class="import-archive-main"><div class="panel-head"><div><strong>${esc(x.fileName||x.subject||'Document importé')}</strong><small>${esc(x.type||'Document')} · ${x.createdAt?new Date(x.createdAt).toLocaleString('fr-FR'):'—'}</small></div>${x.academicYear?badge(x.academicYear):''}</div><p>${esc(x.subject||'')}</p><small>${esc(x.summary||'')}</small><div class="import-cloud-line">${cloudStatusHtml(att)}</div><div class="import-archive-actions">${att?.storagePath?`<button class="primary small" data-download="${esc(attachmentId)}">📄 Relire l’original</button>`:`<label class="primary small button-link">📎 Rattacher le PDF<input type="file" accept="application/pdf,.pdf" data-reattach-import="${esc(x.id)}" hidden></label>`}${cloudActionHtml(att)}<button class="ghost small" data-open-import-analysis="${esc(x.id)}">📊 Relire l’analyse</button>${x.recordId?`<button class="ghost small" data-open-import-record="${esc(x.recordId)}" data-import-module="${esc(x.module||'')}">✎ Relire la fiche</button>`:''}${x.module?`<button class="ghost small" data-go="${esc(x.module)}">Ouvrir le module</button>`:''}<button class="ghost small danger-mini" data-delete-import="${esc(x.id)}">🗑 Supprimer</button></div></div></article>`}).join(''):'<div class="empty-state">Aucun import ne correspond à ces filtres.</div>';
}

async function reattachImportOriginal(archiveId,file){
 if(!file)return;
 let x=(db.importArchives||[]).find(a=>String(a.id)===String(archiveId));
 if(!x){
  const row=importedArchiveRows().find(a=>String(a.id)===String(archiveId));
  if(row){x={...row,id:uid(),analysisSnapshot:row.analysisSnapshot||row.analysis||null};db.importArchives=db.importArchives||[];db.importArchives.push(x)}
 }
 if(!x){const st=$('#importArchiveStatus');if(st){st.textContent='❌ Archive introuvable.';st.className='import-archive-status error'}toast('Archive introuvable');return}
 try{
  const st=$('#importArchiveStatus');if(st){st.textContent='⏳ Enregistrement du document original…';st.className='import-archive-status working'}
  const meta=await putFile(file,{module:'imports',recordId:x.sourceId||x.id});
  db.attachments=db.attachments||[];
  const oldIndex=db.attachments.findIndex(a=>String(a.id)===String(meta.id));
  if(oldIndex>=0)db.attachments[oldIndex]=meta;else db.attachments.push(meta);
  x.attachmentId=meta.id;x.fileName=file.name||x.fileName;x.originalStoredAt=new Date().toISOString();x.originalStorageMode=meta.storageMode||'';x.cloudVerified=meta.cloudVerified===true;x.cloudVerifiedAt=meta.cloudVerifiedAt||'';
  // Le lien archive ↔ original est conservé dans l’état Supabase commun.
  rememberImportOriginalBinding(x,meta);
  const src=(db.pdfImports||[]).find(r=>String(r.id)===String(x.sourceId));
  if(src){src.attachmentId=meta.id;src.fileName=file.name||src.fileName}
  // V147 : réparer aussi la fiche métier du contrôle pour que l’original soit relisible partout.
  const periodicId=x.recordId||src?.periodicControlId||x.analysisSnapshot?.periodicControlId||'';
  if(periodicId){
   const periodic=(db.periodic||[]).find(p=>String(p.id)===String(periodicId));
   if(periodic){
    periodic.attachments=periodic.attachments||[];
    const sameIndex=periodic.attachments.findIndex(a=>String(a.id)===String(x.attachmentId||'') || (!a?.storagePath && normalizeText(a?.name||'')===normalizeText(x.fileName||file.name||'')));
    if(sameIndex>=0)periodic.attachments[sameIndex]=meta;
    else if(!periodic.attachments.some(a=>String(a.id)===String(meta.id)))periodic.attachments.push(meta);
   }
  }
  x.attachmentId=meta.id;
  const annual=(db.chronotimeAnnual||[]).find(r=>String(r.sourceId||'')===String(x.sourceId)||String(r.fileName||'')===String(x.fileName));
  if(annual)annual.attachmentId=meta.id;

  // Sauvegarder l’état applicatif dans Supabase puis rafraîchir.
  const persisted=window.PSTMainState?.persistNow?await window.PSTMainState.persistNow():{ok:save(false),offline:!navigator.onLine};
  renderImportArchives();renderPeriodic();
  if(persisted?.ok){
   if(st){st.textContent=`✅ ${file.name} est rattaché, sauvegardé et confirmé dans Supabase.`;st.className='import-archive-status ok'}
   toast('Original rattaché et confirmé — « Relire l’original » est disponible');
  }else if(persisted?.offline){
   if(st){st.textContent='⚠️ Fichier chargé mais état applicatif en attente de synchronisation.';st.className='import-archive-status working'}
   toast('Rattachement en attente de synchronisation');
  }else{
   throw new Error('Le fichier est dans Storage mais la fiche n’a pas pu être confirmée dans app_state');
  }
 }catch(e){console.error(e);const st=$('#importArchiveStatus');if(st){st.textContent=`❌ Rattachement impossible : ${e?.message||String(e)}`;st.className='import-archive-status error'}toast(`Impossible de rattacher ce document${e?.message?` : ${e.message}`:''}`)}
}

function openImportAnalysis(id){
 const x=importedArchiveRows().find(r=>String(r.id)===String(id));if(!x)return;
 let a=x.analysisSnapshot||x.analysis||null;
 if(!a&&x.sourceId){
  const pdf=(db.pdfImports||[]).find(r=>String(r.id)===String(x.sourceId));
  if(pdf)a={type:x.type,fileName:x.fileName,subject:x.subject,academicYear:x.academicYear,summary:x.summary,legacy:true};
 }
 const rows=[];
 const add=(label,value)=>{if(value!==undefined&&value!==null&&String(value)!=='')rows.push([label,value])};
 if(a){
  add('Type',a.type||x.type);add('Fichier',a.fileName||x.fileName);add('Sujet / agent / organisme',a.subject||x.subject);add('Année scolaire',a.academicYear||x.academicYear);add('Période',a.period||a.periodLabel);
  add('Jours reconnus',a.daysRead!=null?`${a.daysRead}/${a.daysExpected||a.daysRead}`:'');add('Jours avec durée',a.durationDays);add('Présence',a.presence);add('Référence',a.reference);add('Écart annuel',a.delta);add('CA',a.ca);add('RTT',a.rtt);add('RH',a.rh);add('RFE',a.rfe);add('Organisme',a.organization);add('Famille',a.controlFamily);add('Date du rapport',a.reportDate?fmtDate(a.reportDate):'');add('Non-conformités',a.nonconformities);add('Résumé',a.summary||x.summary);add('Confiance',a.confidence!=null?`${a.confidence}%`:'');
 }
 $('#detailTitle').textContent=`Analyse import — ${x.fileName||x.subject||'Document'}`;
 const cards=rows.length?`<div class="summary-grid">${rows.map(([k,v])=>`<article><span>${esc(k)}</span><strong>${esc(String(v))}</strong></article>`).join('')}</div>`:'<div class="empty-state">Cet ancien import ne possède pas encore d’analyse détaillée enregistrée.</div>';
 const tech=a&&!a.legacy?`<details class="archive-tech-details"><summary>Détail technique de l’analyse</summary><pre class="archive-json">${esc(JSON.stringify(a,null,2))}</pre></details>`:'';
 $('#detailBody').innerHTML=`${cards}<div class="archive-detail-actions">${x.attachmentId?`<button class="primary" data-download="${esc(x.attachmentId)}">📄 Relire l’original</button>`:''}${x.recordId?`<button class="ghost" data-open-import-record="${esc(x.recordId)}" data-import-module="${esc(x.module||'')}">✎ Ouvrir la fiche</button>`:''}</div>${tech}`;
 $('#detailModal').showModal();
}

function changeHistoryFieldLabel(field){
 const labels={
  firstName:'Prénom',lastName:'Nom',role:'Fonction',weeklyHours:'Temps hebdomadaire',
  email:'E-mail',phone:'Téléphone',assignment:'Affectation',arrivalDate:'Date d’arrivée',
  agentId:'Agent',dayType:'Type de journée',date:'Date',dateFrom:'Début de période',dateTo:'Fin de période',
  status:'Statut',plannedStart:'Début horaire théorique',plannedEnd:'Fin horaire théorique',
  actualStart:'Début horaire réel',actualEnd:'Fin horaire réel',
  pause:'Pause',overtime:'Écart d’heures',replacement:'Remplacement / relais',
  noReplacementNeeded:'Remplacement nécessaire',note:'Information / motif',
  time:'Heure',title:'Objet',family:'Famille',priority:'Priorité',
  building:'Bâtiment',floor:'Étage',sector:'Secteur',room:'Local / zone',
  requester:'Demandeur',assigned:'Agent / prestataire affecté',dueDate:'Échéance',
  description:'Description / diagnostic',action:'Action réalisée / suite',
  type:'Type',response:'Réponse / réalisation',inspector:'Contrôleur',
  roomType:'Type de local',comment:'Observation générale',
  overallStatus:'Résultat du contrôle',score:'Note / score'
 };
 return labels[field]||String(field||'Information modifiée').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,x=>x.toUpperCase());
}
function historyLooksLikeDateField(field){
 return ['date','dateFrom','dateTo','dueDate','arrivalDate','effectiveFrom','createdAt','updatedAt'].includes(String(field||''));
}
function historyLooksLikeTimeField(field){
 return ['time','plannedStart','plannedEnd','actualStart','actualEnd','start','end'].includes(String(field||''));
}
function historySignedHours(value){
 const n=Number(value);
 if(!Number.isFinite(n))return String(value||'—');
 return fmtSignedHours(n);
}
function changeHistoryValue(field,value){
 if(value===null||value===undefined||String(value).trim()==='')return 'Non renseigné';
 const raw=String(value).trim();
 if(value===true||raw==='true'||raw==='on')return field==='noReplacementNeeded'?'Non':'Oui';
 if(value===false||raw==='false')return field==='noReplacementNeeded'?'Oui':'Non';
 if(field==='agentId'||field==='assigned'||field==='replacement'){
   const a=agentById(value);if(a)return agentName(a);
 }
 if(historyLooksLikeDateField(field)){
   const d=normalizeDateValue(raw);if(d)return fmtDate(d);
 }
 if(field==='pause'){
   const n=Number(value);return Number.isFinite(n)?`${n} min`:raw;
 }
 if(field==='overtime')return historySignedHours(value);
 if(field==='weeklyHours'){
   const n=Number(value);return Number.isFinite(n)?`${fmtHours(n)} / semaine`:raw;
 }
 if(historyLooksLikeTimeField(field)&&/^\d{1,2}:\d{2}/.test(raw))return raw.slice(0,5);
 return raw;
}
function historyMeaningfulChange(c){
 if(!c||!c.field)return false;
 return historyComparable(c.oldValue)!==historyComparable(c.newValue);
}
function historyDisplayChanges(entry){
 const src=Array.isArray(entry?.changes)?entry.changes.filter(historyMeaningfulChange):[];
 if(changeHistoryType(entry)==='Agent'){
   const map=new Map(src.map(c=>[c.field,c]));
   const pairs=[
     ['plannedStart','plannedEnd','Horaire théorique'],
     ['actualStart','actualEnd','Horaire réel']
   ];
   const used=new Set(),out=[];
   for(const [sf,ef,label] of pairs){
     if(map.has(sf)||map.has(ef)){
       const sc=map.get(sf),ec=map.get(ef);
       const oldS=sc?.oldValue??'',oldE=ec?.oldValue??'',newS=sc?.newValue??oldS,newE=ec?.newValue??oldE;
       const fmt=(a,b)=>a&&b?`${String(a).slice(0,5)}–${String(b).slice(0,5)}`:(a||b?String(a||b).slice(0,5):'Non renseigné');
       out.push({fieldLabel:label,before:fmt(oldS,oldE),after:fmt(newS,newE)});
       used.add(sf);used.add(ef);
     }
   }
   for(const c of src){
     if(used.has(c.field))continue;
     out.push({fieldLabel:changeHistoryFieldLabel(c.field),before:changeHistoryValue(c.field,c.oldValue),after:changeHistoryValue(c.field,c.newValue)});
   }
   return out;
 }
 return src.map(c=>({fieldLabel:changeHistoryFieldLabel(c.field),before:changeHistoryValue(c.field,c.oldValue),after:changeHistoryValue(c.field,c.newValue)}));
}
function changeHistoryAgentName(entry){
 if(entry?.agentName && !/^Modification d[’']une donnée passée$/i.test(String(entry.agentName)))return String(entry.agentName);
 if(entry?.agentId){
   const a=agentById(entry.agentId);if(a)return agentName(a);
 }
 const c=(entry?.changes||[]).find(x=>x.field==='agentId');
 const aid=c?.newValue||c?.oldValue||'';
 if(aid){
   const a=agentById(aid);if(a)return agentName(a);
 }
 const t=String(entry?.title||'');
 const m=t.match(/^(.+?)\s+—\s+saisie planning/i);
 if(m)return m[1].trim();
 return '';
}
function historyComparable(v){
 if(v===true||String(v)==='true'||String(v)==='on')return 'true';
 if(v===false||String(v)==='false')return 'false';
 if(v===null||v===undefined)return '';
 return String(v).trim();
}
function legacyHistoryCandidateScore(entry,record){
 let score=0,matched=0;
 for(const c of (entry?.changes||[])){
   let field=c.field;
   if(field==='dateFrom'||field==='dateTo')field='date';
   if(!(field in record))continue;
   matched++;
   if(historyComparable(record[field])===historyComparable(c.newValue))score+=4;
   else if(historyComparable(record[field])===historyComparable(c.oldValue))score+=1;
 }
 const target=(entry?.pastDates||[])[0]||'';
 if(target&&record.date===target)score+=3;
 return {score,matched};
}
function resolveLegacyHistoryEntry(entry){
 if(entry?.__resolvedLegacy)return entry.__resolvedLegacy;
 const generic=/^modification d[’']une donnée passée$/i;
 const title=String(entry?.title||'');
 const placeholder=/^(agent concerné|élément à identifier|element a identifier|élément concerné|element concerne)$/i;
 const needs=!entry?.type||entry.type==='Autre'||generic.test(title)||!entry?.entity||
   generic.test(String(entry.entity))||placeholder.test(String(entry.entity).trim());
 if(!needs)return entry.__resolvedLegacy={type:entry.type||'Autre',entity:entry.entity||title||'Élément'};
 const date=(entry?.pastDates||[])[0]||'';
 const sets=[
   ['Agent',db.agentDays||[],r=>agentName(agentById(r.agentId))||'Agent'],
   ['Intervention',db.maintenance||[],r=>[r.no,r.title].filter(Boolean).join(' — ')||'Intervention'],
   ['Demande',db.requests||[],r=>[r.no,r.title].filter(Boolean).join(' — ')||'Demande'],
   ['Contrôle ménage',db.cleaning||[],r=>[r.no,[r.building,r.floor,r.room].filter(Boolean).join(' ')].filter(Boolean).join(' — ')||'Contrôle ménage']
 ];
 const candidates=[];
 for(const [type,arr,label] of sets){
   for(const r of arr){
     if(date&&r.date&&r.date!==date)continue;
     const sc=legacyHistoryCandidateScore(entry,r);
     if(sc.matched>0||date&&r.date===date)candidates.push({type,record:r,entity:label(r),score:sc.score,matched:sc.matched});
   }
 }
 candidates.sort((a,b)=>b.score-a.score||b.matched-a.matched);
 const best=candidates[0],second=candidates[1];
 if(best && best.score>0 && (!second||best.score>second.score)){
   if(best.type==='Agent'){
     entry.agentId=entry.agentId||best.record.agentId||'';
     entry.agentName=entry.agentName||agentName(agentById(best.record.agentId))||'';
   }
   return entry.__resolvedLegacy={type:best.type,entity:best.entity};
 }
 // Strong field-based inference even if a unique record cannot be identified.
 const fields=new Set((entry?.changes||[]).map(c=>c.field));
 if(['actualStart','actualEnd','plannedStart','plannedEnd','overtime','dayType','replacement','noReplacementNeeded'].some(f=>fields.has(f))){
   return entry.__resolvedLegacy={type:'Agent',entity:changeHistoryAgentName(entry)||'Agent concerné'};
 }
 if(['family','assigned','action'].some(f=>fields.has(f)))return entry.__resolvedLegacy={type:'Intervention',entity:'Intervention concernée'};
 if(fields.has('response'))return entry.__resolvedLegacy={type:'Demande',entity:'Demande concernée'};
 if(['inspector','roomType','comment'].some(f=>fields.has(f)))return entry.__resolvedLegacy={type:'Contrôle ménage',entity:'Contrôle ménage concerné'};
 return entry.__resolvedLegacy={type:entry.type||'Autre',entity:(!generic.test(String(entry.entity||''))&&entry.entity)?String(entry.entity):(!generic.test(title)&&title?title:'Élément à identifier')};
}
function changeHistoryType(entry){
 if(entry?.type && entry.type!=='Autre')return String(entry.type);
 return resolveLegacyHistoryEntry(entry).type||'Autre';
}
function changeHistoryEntity(entry){
 const type=changeHistoryType(entry);
 const generic=/^modification d[’']une donnée passée$/i;
 if(type==='Agent'){
   const a=changeHistoryAgentName(entry);if(a)return a;
 }
 const placeholder=/^(agent concerné|élément à identifier|element a identifier|élément concerné|element concerne)$/i;
 if(entry?.entity && !generic.test(String(entry.entity)) && !placeholder.test(String(entry.entity).trim()) &&
    !['Agent','Équipe','Element','Élément'].includes(String(entry.entity)))return String(entry.entity);
 if(entry?.recordId){
   const maps={
     'Agent':db.agents||[],
     'Intervention':db.maintenance||[],
     'Demande':db.requests||[],
     'Contrôle ménage':db.cleaning||[]
   };
   const r=(maps[type]||[]).find(x=>String(x.id)===String(entry.recordId));
   if(r){
     if(type==='Agent')return agentName(r);
     if(type==='Intervention'||type==='Demande')return [r.no,r.title].filter(Boolean).join(' — ');
     if(type==='Contrôle ménage')return [r.no,[r.building,r.floor,r.room].filter(Boolean).join(' ')].filter(Boolean).join(' — ');
   }
 }
 if(type==='Intervention'){
   const label=[entry?.no,entry?.itemTitle].filter(Boolean).join(' — ');if(label)return label;
 }
 if(type==='Demande'){
   const label=[entry?.no,entry?.itemTitle].filter(Boolean).join(' — ');if(label)return label;
 }
 if(type==='Contrôle ménage'){
   const label=[entry?.no,entry?.location].filter(Boolean).join(' — ');if(label)return label;
 }
 const legacy=resolveLegacyHistoryEntry(entry);
 if(legacy?.entity && !generic.test(String(legacy.entity)))return legacy.entity;
 const title=String(entry?.title||'');
 return title&&!generic.test(title)?title:'Élément à identifier';
}
function changeHistoryTypeLabel(entry){
 const t=changeHistoryType(entry);
 if(t==='Agent')return 'Agent';
 if(t==='Intervention')return 'Intervention';
 if(t==='Demande')return 'Demande';
 if(t==='Contrôle ménage')return 'Contrôle ménage';
 return 'Information';
}
function changeHistoryConcernedDate(entry){
 const dates=(entry?.pastDates||[]).filter(Boolean);
 return dates.length?dates.map(fmtDate).join(', '):'Date non renseignée';
}
function changeHistoryAcademicYear(entry){
 const d=(entry?.pastDates||[])[0]||String(entry?.date||'').slice(0,10);
 return d?academicYearFor(d):'';
}

function isConcreteHistoryEntity(entry){
 const type=changeHistoryType(entry);
 const entity=String(changeHistoryEntity(entry)||'').trim();
 if(!entity)return false;
 if(/^(agent concerné|élément à identifier|element a identifier|élément concerné|element concerne|information|autre|élément à identifier)$/i.test(entity))return false;
 if(type==='Agent'){
   return !!changeHistoryAgentName(entry) && !/^(agent|équipe)$/i.test(changeHistoryAgentName(entry));
 }
 return !['Autre','Information'].includes(type);
}
function usableChangeHistoryEntries(){
 return (db.changeHistory||[]).filter(h=>{
   if(h?.deleted||/^suppression\b/i.test(String(h?.title||''))||String(h?.action||'').toLowerCase()==='delete')return false;
   if(Number(h?.historyVersion||0)>=2)return isConcreteHistoryEntity(h);
   // Anciennes entrées : on ne garde que celles qui sont déjà clairement identifiables.
   return isConcreteHistoryEntity(h);
 });
}
function clearHistoryLegacyResolutionCache(){
 for(const h of (db.changeHistory||[]))try{delete h.__resolvedLegacy}catch(_){}
}
function filteredChangeHistoryEntries(){
 db.changeHistory=Array.isArray(db.changeHistory)?db.changeHistory:[];
 clearHistoryLegacyResolutionCache();
 const active=activeAcademicYear(),yearEl=$('#changeHistoryYear'),typeEl=$('#changeHistoryType'),searchEl=$('#changeHistorySearch');
 const year=yearEl?.value||active,type=typeEl?.value||'',q=String(searchEl?.value||'').trim().toLowerCase();
 let entries=usableChangeHistoryEntries()
   .filter(x=>!year||changeHistoryAcademicYear(x)===year)
   .filter(x=>!type||changeHistoryType(x)===type);
 if(q)entries=entries.filter(x=>{
   const hay=[JSON.stringify(x),changeHistoryType(x),changeHistoryEntity(x),changeHistoryAgentName(x)].join(' ').toLowerCase();
   return hay.includes(q);
 });
 return entries.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
}
function printChangeHistory(){
 const entries=filteredChangeHistoryEntries();
 const year=$('#changeHistoryYear')?.value||activeAcademicYear();
 const type=$('#changeHistoryType')?.value||'Tous les types';
 const q=String($('#changeHistorySearch')?.value||'').trim();
 const rows=[];
 for(const h of entries){
   const modDate=h.date?new Date(h.date):null;
   const stamp=modDate&&!isNaN(modDate)?modDate.toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'}):'—';
   const concerned=changeHistoryConcernedDate(h);
   const hType=changeHistoryTypeLabel(h),entity=changeHistoryEntity(h);
   const changes=historyDisplayChanges(h);
   for(const c of changes){
     rows.push(`<tr><td>${esc(stamp)}</td><td>${esc(hType)}</td><td>${esc(concerned)}</td><td>${esc(entity)}</td><td>${esc(c.fieldLabel)}</td><td>${esc(c.before)}</td><td>${esc(c.after)}</td><td>${esc(h.user||'Utilisateur')}</td></tr>`);
   }
 }
 const filters=[`Année scolaire : ${year||'Toutes'}`,`Type : ${type}`];
 if(q)filters.push(`Recherche : ${q}`);
 const body=`<div class="service-title"><h1>Récapitulatif des modifications</h1><p>${esc(filters.join(' · '))}</p></div>
 <table class="individual-grid"><thead><tr><th>Date / heure modification</th><th>Type</th><th>Date concernée</th><th>Élément concerné</th><th>Champ modifié</th><th>Avant</th><th>Après</th><th>Utilisateur</th></tr></thead>
 <tbody>${rows.length?rows.join(''):'<tr><td colspan="8">Aucune modification pour les filtres sélectionnés.</td></tr>'}</tbody></table>`;
 openPlanningPrint('Récapitulatif des modifications',filters.join(' · '),body,'landscape');
}
function renderChangeHistory(){
 const table=$('#changeHistoryTable');if(!table)return;
 db.changeHistory=Array.isArray(db.changeHistory)?db.changeHistory:[];
 const active=activeAcademicYear(),yearEl=$('#changeHistoryYear'),typeEl=$('#changeHistoryType'),searchEl=$('#changeHistorySearch');
 const years=[...new Set(usableChangeHistoryEntries().map(changeHistoryAcademicYear).filter(Boolean))].sort().reverse();
 if(yearEl){
   const current=yearEl.value||active;
   yearEl.innerHTML='<option value="">Toutes les années scolaires</option>'+[...new Set([active,...years])].map(y=>`<option value="${esc(y)}">${esc(y)}</option>`).join('');
   yearEl.value=[...yearEl.options].some(o=>o.value===current)?current:active;
 }
 const year=yearEl?.value||active,type=typeEl?.value||'',q=String(searchEl?.value||'').trim().toLowerCase();
 let entries=filteredChangeHistoryEntries();
 const rows=[];
 for(const h of entries){
   const modDate=h.date?new Date(h.date):null;
   const stamp=modDate&&!isNaN(modDate)?modDate.toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'}):'—';
   const concerned=changeHistoryConcernedDate(h);
   const hType=changeHistoryTypeLabel(h),entity=changeHistoryEntity(h);
   const changes=historyDisplayChanges(h);
   for(const c of changes){
     rows.push(`<tr><td>${esc(stamp)}</td><td>${esc(hType)}</td><td>${esc(concerned)}</td><td><strong>${esc(entity)}</strong></td><td>${esc(c.fieldLabel)}</td><td>${esc(c.before)}</td><td><strong>${esc(c.after)}</strong></td><td>${esc(h.user||'Utilisateur')}</td></tr>`);
   }
 }
 const totalChanges=entries.reduce((n,h)=>n+historyDisplayChanges(h).length,0);
 const entities=new Set(entries.map(changeHistoryEntity).filter(Boolean));
 const types=new Set(entries.map(changeHistoryType).filter(Boolean));
 $('#changeHistorySummary').innerHTML=`<article><span>Saisies modifiées</span><strong>${entries.length}</strong></article><article><span>Champs modifiés</span><strong>${totalChanges}</strong></article><article><span>Éléments concernés</span><strong>${entities.size}</strong></article><article><span>Types concernés</span><strong>${types.size}</strong></article>`;
 table.innerHTML=rows.length?rows.join(''):'<tr><td colspan="8"><div class="empty">Aucune modification enregistrée pour cette sélection.</div></td></tr>';
}
function renderArchives(){renderImportArchives();renderChangeHistory();const year=$('#archiveYear')?.value||activeAcademicYear(),q=($('#archiveSearch')?.value||'').toLowerCase().trim();const years=[...new Set(db.archives.map(a=>a.year).filter(Boolean))].sort().reverse();if($('#archiveYear')){
 const active=activeAcademicYear(),allYears=[...new Set([active,...years])];
 $('#archiveYear').innerHTML='<option value="">Toutes les années</option>'+allYears.map(y=>`<option value="${esc(y)}" ${y===year?'selected':''}>${esc(y)}</option>`).join('')
}let arr=db.archives.filter(a=>(!year||a.academicYear===year||a.year===year));if(q)arr=arr.filter(a=>JSON.stringify(a).toLowerCase().includes(q));arr.sort((a,b)=>b.start.localeCompare(a.start));$('#archiveSummary').innerHTML=`<article><span>Archives de pilotage</span><strong>${db.archives.length}</strong></article><article><span>Semaines</span><strong>${db.archives.filter(a=>a.kind==='weekly').length}</strong></article><article><span>Années clôturées</span><strong>${db.archives.filter(a=>a.kind==='annual').length}</strong></article><article><span>Dernière archive</span><strong>${db.archives.length?fmtDate([...db.archives].sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0].createdAt.slice(0,10)):'—'}</strong></article>`;$('#archiveCards').innerHTML=arr.length?arr.map(a=>`<article class="archive-card"><div class="panel-head"><span>${a.kind==='weekly'?'Semaine':'Année scolaire'}</span>${badge(a.academicYear||a.year)}</div><h3>${esc(a.kind==='weekly'?a.key:a.academicYear)}</h3><p>${fmtDate(a.start)} → ${fmtDate(a.end)}</p><div class="archive-metrics">${Object.entries(a.summary||{}).map(([k,v])=>`<span><strong>${esc(v)}</strong><small>${esc(k)}</small></span>`).join('')}</div><button class="ghost" data-archive-detail="${a.id}">Consulter</button></article>`).join(''):'<div class="empty-state">Aucune archive trouvée.</div>'}

function archiveSection(title,rows,cols){if(!rows?.length)return `<section class="archive-readable-section"><h4>${esc(title)}</h4><div class="empty-state compact">Aucune donnée sur cette période.</div></section>`;return `<section class="archive-readable-section"><h4>${esc(title)} <span class="muted">(${rows.length})</span></h4><div class="archive-readable-list">${rows.map(r=>`<article class="archive-readable-item">${cols.map(c=>{const val=typeof c.value==='function'?c.value(r):r[c.value];return val!==undefined&&val!==null&&val!==''?`<div><small>${esc(c.label)}</small><strong>${esc(String(val))}</strong></div>`:''}).join('')}</article>`).join('')}</div></section>`}
function openArchiveDetail(id){const a=db.archives.find(x=>x.id===id);if(!a)return;const d=a.data||{};$('#detailTitle').textContent=`Archive ${a.kind==='weekly'?a.key:a.academicYear}`;const sections=[archiveSection('Journées agents',d.agentDays,[{label:'Date',value:r=>fmtDate(r.date)},{label:'Agent',value:r=>agentName(r.agentId)},{label:'Type',value:'dayType'},{label:'Prévu',value:r=>r.startPlanned||r.plannedStart||''},{label:'Fin',value:r=>r.endPlanned||r.plannedEnd||''}]),archiveSection('Maintenance',d.maintenance,[{label:'N°',value:'no'},{label:'Date',value:r=>fmtDate(r.date)},{label:'Objet',value:'title'},{label:'Lieu',value:r=>[r.building,r.room].filter(Boolean).join(' · ')},{label:'Statut',value:'status'}]),archiveSection('Contrôles ménage',d.cleaning,[{label:'Date',value:r=>fmtDate(r.date)},{label:'Lieu',value:r=>[r.building,r.room].filter(Boolean).join(' · ')},{label:'Résultat',value:r=>r.result||r.status||''},{label:'Agent',value:r=>agentName(r.agentId)}]),archiveSection('Réunions',d.meetings,[{label:'Date',value:r=>fmtDate(r.date)},{label:'Objet',value:'title'},{label:'Lieu',value:'location'},{label:'Statut',value:'status'}]),archiveSection('Notes',d.notes,[{label:'Date',value:r=>fmtDate(r.date||r.dueDate)},{label:'Titre',value:r=>r.title||r.subject||''},{label:'Priorité',value:'priority'},{label:'Statut',value:'status'}]),archiveSection('Demandes',d.requests,[{label:'Date',value:r=>fmtDate(r.date)},{label:'Objet',value:r=>r.title||r.subject||''},{label:'Statut',value:'status'}]),archiveSection('Chantiers / travaux',d.works,[{label:'Date',value:r=>fmtDate(r.date||r.dueDate)},{label:'Objet',value:r=>r.title||r.subject||''},{label:'Statut',value:'status'}])].join('');$('#detailBody').innerHTML=`<div class="archive-readable-head"><p><strong>Période :</strong> ${fmtDate(a.start)} au ${fmtDate(a.end)}</p><div class="summary-grid">${Object.entries(a.summary||{}).map(([k,v])=>`<article><span>${esc(k)}</span><strong>${esc(v)}</strong></article>`).join('')}</div><div class="archive-detail-actions"><button class="ghost" onclick="window.print()">🖨 Imprimer</button></div></div>${sections}<details class="archive-tech-details"><summary>Données techniques de sauvegarde</summary><pre class="archive-json">${esc(JSON.stringify(a.data,null,2))}</pre></details>`;$('#detailModal').showModal()}
function exportArchives(){const exportAcademicYear=activeAcademicYear();downloadText(`archives-pilotage-${todayISO()}.json`,JSON.stringify(db.archives,null,2),'application/json')}

function collectUrgentDashboardActions(){
 const sources=[
  ['issues','Sécurité / qualité','⚠','issue'],
  ['maintenance','Maintenance','🔧','maintenance'],
  ['requests','Demande direction','↗','request'],
  ['works','Chantier / GPA','🏗','work'],
  ['notes','Note','✎','note'],
  ['personalEvents','Agenda personnel','📅','personal']
 ];
 const rows=[];
 for(const [key,label,icon,editType] of sources){
  for(const x of (db[key]||[])){
   if(!recordInAcademicYear(x,['date','dueDate','start','end'])||isClosedStatus(x.status)||!isUrgentPriority(x.priority))continue;
   rows.push({label,icon,editType,id:x.id,title:x.title||x.subject||x.no||label,due:recordDueDate(x)});
  }
 }
 const linkedNc=new Set((db.maintenance||[]).filter(x=>!isClosedStatus(x.status)&&x.sourceNonconformityId).map(x=>String(x.sourceNonconformityId)));
 for(const x of (db.reportNonconformities||[])){
  const closed=['levee','leve','conforme','cloturee','cloture','archivee','archive'].includes(normalizeText(x.status));
  if(closed||!isUrgentPriority(x.priority)||linkedNc.has(String(x.id)))continue;
  rows.push({label:'Non-conformité rapport',icon:'🛡️',editType:'reportNonconformity',id:x.id,title:x.text||x.title||x.no||'Non-conformité urgente',due:recordDueDate(x)});
 }
 return rows;
}
function collectLateDashboardActions(today=todayISO()){
 const sources=['issues','maintenance','requests','works','notes'];
 const rows=[];
 for(const key of sources){
  for(const x of (db[key]||[])){
   if(!recordInAcademicYear(x,['date','dueDate']))continue;
   const due=recordDueDate(x);
   if(!isClosedStatus(x.status)&&due&&due<today)rows.push({module:key,record:x,due});
  }
 }
 return rows;
}
let dashboardWeatherCacheV149={at:0,text:'Consulter la météo',detail:'Roanne et alentours'};
async function renderDashboardWeatherV149(){
 const title=$('#dashboardWeatherTitle'),detail=$('#dashboardWeatherDetail');if(!title||!detail)return;
 const now=Date.now();
 if(now-dashboardWeatherCacheV149.at<15*60*1000){title.textContent=dashboardWeatherCacheV149.text;detail.textContent=dashboardWeatherCacheV149.detail;return}
 title.textContent='Météo du jour';detail.textContent='Actualisation…';
 try{
  const url='https://api.open-meteo.com/v1/forecast?latitude=46.0362&longitude=4.0680&current=temperature_2m,weather_code,wind_speed_10m,precipitation&daily=precipitation_probability_max&timezone=Europe%2FParis&forecast_days=1';
  const res=await fetch(url,{cache:'no-store'});if(!res.ok)throw new Error(`HTTP ${res.status}`);const data=await res.json(),c=data.current||{},rain=Math.round(data.daily?.precipitation_probability_max?.[0]??0),code=Number(c.weather_code??-1);
  const weatherText=code===0?'Ciel dégagé':code<=2?'Éclaircies':code===3?'Couvert':code<=48?'Brouillard':code<=57?'Bruine':code<=67?'Pluie':code<=77?'Neige':code<=82?'Averses':'Orage';
  dashboardWeatherCacheV149={at:now,text:`${Math.round(c.temperature_2m??0)}°C · ${weatherText}`,detail:`Pluie ${rain}% · vent ${Math.round(c.wind_speed_10m??0)} km/h`};
 }catch(e){dashboardWeatherCacheV149={at:now,text:'Météo indisponible',detail:'Appuyez pour ouvrir la page météo'};}
 title.textContent=dashboardWeatherCacheV149.text;detail.textContent=dashboardWeatherCacheV149.detail;
}
function renderDashboardTeamTodayV149(){
 const el=$('#dashboardTeamToday');if(!el)return;const today=todayISO(),nowTime=new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
 const agents=(db.agents||[]).filter(a=>normalizeText(a.status)==='actif');
 el.innerHTML=agents.length?agents.map(a=>{
  const info=dayInfo(a.id,today),type=String(info.dayType||'Présence'),norm=normalizeText(type),start=String(info.plannedStart||''),end=String(info.plannedEnd||'');let status='Présent',cls='',schedule=start&&end?`${start} – ${end}`:'Horaire non défini';
  if(norm==='repos'){status='Repos';cls='rest';schedule='Journée';}
  else if(isAbsenceType(type)){status=type;cls='absent';schedule='Journée';}
  else if(start&&start>nowTime){status='À venir';cls='future';schedule=`Prend à ${start}`;}
  return `<button class="dashboard-team-row-v149" data-agent-day="${a.id}" data-date="${today}"><span class="dashboard-team-avatar-v149">${esc((a.firstName||a.lastName||'?').charAt(0).toUpperCase())}</span><strong>${esc(agentName(a))}</strong><small>${esc(schedule)}</small><span class="dashboard-team-status-v149 ${cls}">${esc(status)}</span></button>`;
 }).join(''):'<div class="empty-card">Aucun agent actif.</div>';
}
function dashboardAgentWeekDatesV150(offset=0){
 const monday=addDays(startOfWeek(todayISO()),Number(offset||0)*7);
 return Array.from({length:5},(_,i)=>addDays(monday,i));
}
let dashboardAgentWeekOffsetV150=0;
function dashboardAgentWeekCellV150(agent,date){
 const info=dayInfo(agent.id,date),type=String(info.dayType||'Présence'),norm=normalizeText(type),plannedStart=String(info.plannedStart||''),plannedEnd=String(info.plannedEnd||''),realStart=String(info.actualStart||''),realEnd=String(info.actualEnd||''),hasReal=Boolean(realStart&&realEnd),changed=Boolean(hasReal&&plannedStart&&plannedEnd&&(realStart!==plannedStart||realEnd!==plannedEnd)),start=hasReal?realStart:plannedStart,end=hasReal?realEnd:plannedEnd;
 let cls='',main='—',sub='Horaire non défini';
 if(norm==='repos'){cls='rest';main='Repos';sub='';}
 else if(isAbsenceType(type)){cls='absent';main=type;sub='';}
 else if(start&&end){main=`${start}–${end}`;if(changed){cls='schedule-changed';sub=`⚠ Réel · prévu ${plannedStart}–${plannedEnd}`;}else if(hasReal)sub='Horaire réel';else sub=info.shift&&normalizeText(info.shift)!=='standard'?String(info.shift):'';}
 return {html:`<button type="button" class="agent-week-cell-v150 ${cls} ${date===todayISO()?'today':''}" data-agent-day="${agent.id}" data-date="${date}" title="${esc(agentName(agent))} — ${fmtDate(date)}"><span>${esc(main)}</span>${sub?`<small>${esc(sub)}</small>`:''}</button>`,hours:norm==='repos'||isAbsenceType(type)?0:Number(dayHours(info).total||0)};
}
function openDashboardAgentWeekV150(offset=0){
 dashboardAgentWeekOffsetV150=Number(offset||0);const days=dashboardAgentWeekDatesV150(dashboardAgentWeekOffsetV150),agents=(db.agents||[]).filter(a=>normalizeText(a.status)==='actif').slice().sort((a,b)=>agentName(a).localeCompare(agentName(b),'fr'));
 const first=days[0],last=days.at(-1),isCurrent=dashboardAgentWeekOffsetV150===0;
 $('#detailTitle').textContent=`Horaires des agents — ${isCurrent?'semaine en cours':'semaine'}`;
 const head=days.map(d=>{const dt=parseDate(d),label=dt.toLocaleDateString('fr-FR',{weekday:'short'}).replace('.','');return `<th>${esc(label.charAt(0).toUpperCase()+label.slice(1))}<br><small>${esc(dt.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}))}</small></th>`}).join('');
 const rows=agents.map(a=>{let total=0;const cells=days.map(d=>{const c=dashboardAgentWeekCellV150(a,d);total+=c.hours;return `<td>${c.html}</td>`}).join('');return `<tr><td><div class="agent-week-agent-v150"><span class="agent-week-avatar-v150">${esc((a.firstName||a.lastName||'?').charAt(0).toUpperCase())}</span><strong>${esc(agentName(a))}</strong></div></td>${cells}<td class="agent-week-total-v150">${esc(fmtHours(total))}</td></tr>`}).join('');
 $('#detailBody').innerHTML=`<div class="agent-week-toolbar-v150"><div><strong>Du ${fmtDate(first)} au ${fmtDate(last)}</strong><div class="muted">Horaires théoriques réellement applicables, absences et repos inclus.</div></div><div class="agent-week-toolbar-actions-v150"><button type="button" class="ghost small" data-agent-week-nav="-1">‹ Semaine précédente</button>${!isCurrent?'<button type="button" class="ghost small" data-agent-week-nav="0">Cette semaine</button>':''}<button type="button" class="ghost small" data-agent-week-nav="1">Semaine suivante ›</button></div></div><div class="agent-week-table-wrap-v150"><table class="agent-week-table-v150"><thead><tr><th>Agent</th>${head}<th>Total</th></tr></thead><tbody>${rows||'<tr><td colspan="7">Aucun agent actif.</td></tr>'}</tbody></table></div><p class="agent-week-legend-v150">Clique sur une case pour ouvrir le détail de la journée de l’agent. Les horaires affichés tiennent compte des roulements et des saisies de journée.</p>`;
 $('#detailModal').showModal();
}
function dashboardSourceEditTypeV149(source){return ({note:'note',maintenance:'maintenance',request:'request',work:'work',issue:'issue',periodic:'periodic',meeting:'meeting',personal:'personal'})[source]||''}
function renderDashboardPrioritiesV149(urgentActions,lateActions){
 const el=$('#priorityList');if(!el)return;const today=todayISO(),seen=new Set(),rows=[];
 const add=(r)=>{const key=`${r.editType||r.source||''}:${r.id||r.title}`;if(seen.has(key))return;seen.add(key);rows.push(r)};
 urgentActions.filter(x=>!x.due||x.due<=today).forEach(x=>add({...x,level:'URGENT'}));
 lateActions.forEach(x=>{const source=({issues:'issue',maintenance:'maintenance',requests:'request',works:'work',notes:'note'})[x.module]||x.module,rec=x.record;add({icon:'⏰',title:rec.title||rec.subject||rec.no||'Échéance en retard',label:'En retard',editType:source,id:rec.id,due:x.due,level:'RETARD'});});
 eventsForDate(today).filter(e=>['issue','maintenance','request','work','note','periodic'].includes(e.source)).forEach(e=>add({icon:e.source==='maintenance'?'🔧':e.source==='periodic'?'📋':e.source==='issue'?'⚠':'•',title:e.title||'Action du jour',label:'Aujourd’hui',editType:dashboardSourceEditTypeV149(e.source),id:e.id,due:recordDueDate(e)||today,level:isUrgentPriority(e.priority)?'URGENT':'AUJOURD’HUI'}));
 rows.sort((a,b)=>(a.level==='URGENT'?-2:a.level==='RETARD'?-1:0)-(b.level==='URGENT'?-2:b.level==='RETARD'?-1:0)||String(a.due||'9999').localeCompare(String(b.due||'9999')));
 el.innerHTML=cardList(rows.slice(0,7).map(x=>itemCard(x.icon||'•',x.title,`${badge(x.level==='URGENT'?'Urgente':x.level==='RETARD'?'En retard':'Aujourd’hui')} · ${esc(x.label||'Action')} · ${fmtDate(x.due)||'À traiter'}`,x.editType,x.id)),'Aucune priorité particulière aujourd’hui.');
}
function renderDashboardRemindersV149(notes,pSoon){
 const el=$('#dashboardReminders');if(!el)return;const today=todayISO(),tomorrow=addDays(today,1),cards=[];
 cards.push(`<button class="dashboard-reminder-v149" data-go="weather"><span class="icon">🌦️</span><div><strong id="dashboardWeatherTitle">Météo du jour</strong><small id="dashboardWeatherDetail">Actualisation…</small></div></button>`);
 const dueTomorrow=notes.filter(x=>recordDueDate(x)===tomorrow).sort((a,b)=>String(a.priority||'').localeCompare(String(b.priority||'')))[0];
 if(dueTomorrow)cards.push(`<button class="dashboard-reminder-v149" data-edit-type="note" data-edit-id="${dueTomorrow.id}"><span class="icon">✎</span><div><strong>${esc(dueTomorrow.title||'Note à traiter')}</strong><small>Échéance demain · ${esc(dueTomorrow.category||'Bloc-notes')}</small></div></button>`);
 else cards.push(`<button class="dashboard-reminder-v149" data-go="notes"><span class="icon">✎</span><div><strong>Notes</strong><small>Aucune note n’arrive à échéance demain.</small></div></button>`);
 const meter=meterReadingItemForDate(today)||meterReadingItemForDate(tomorrow);if(meter)cards.push(`<button class="dashboard-reminder-v149 agenda-action" data-agenda-source="meter-reading" data-agenda-id="${meter.id}"><span class="icon">📊</span><div><strong>Relevé des compteurs</strong><small>${meter.date===today?'À faire aujourd’hui':'Échéance demain'} · logements</small></div></button>`);
 else if(pSoon[0])cards.push(`<button class="dashboard-reminder-v149" data-edit-type="periodic" data-edit-id="${pSoon[0].id}"><span class="icon">📋</span><div><strong>${esc(pSoon[0].name||pSoon[0].title||'Contrôle périodique')}</strong><small>Contrôle à surveiller prochainement</small></div></button>`);
 else cards.push(`<button class="dashboard-reminder-v149" data-go="periodic"><span class="icon">📋</span><div><strong>Contrôles périodiques</strong><small>Aucune alerte proche.</small></div></button>`);
 const wasteToday=wasteAgendaItemForDate(today),wasteTomorrow=wasteAgendaItemForDate(tomorrow);if(wasteToday||wasteTomorrow){const w=wasteToday||wasteTomorrow;cards.push(`<button class="dashboard-reminder-v149" data-go="waste"><span class="icon">🗑️</span><div><strong>${esc(w.title||'Collecte des déchets')}</strong><small>${wasteToday?'Aujourd’hui':'Demain'} · ${esc(w.meta||'')}</small></div></button>`)}
 else cards.push(`<button class="dashboard-reminder-v149" data-go="waste"><span class="icon">🗑️</span><div><strong>Déchets / bacs</strong><small>Voir la prochaine collecte programmée.</small></div></button>`);
 el.innerHTML=cards.slice(0,4).join('');renderDashboardWeatherV149();
}
function renderDashboardWeekV149(){
 const el=$('#dashboardWeekStrip');if(!el)return;const today=todayISO(),monday=startOfWeek(today),days=Array.from({length:5},(_,i)=>addDays(monday,i));
 const label=$('#dashboardWeekLabel');if(label)label.textContent=`Du ${fmtDate(days[0])} au ${fmtDate(days[4])}`;
 el.innerHTML=days.map(d=>{const date=parseDate(d),events=eventsForDate(d).slice(0,3);return `<section class="dashboard-week-day-v149 ${d===today?'today':''}"><header class="dashboard-week-head-v149"><strong>${esc(date.toLocaleDateString('fr-FR',{weekday:'long'}))} ${date.getDate()}</strong><small>${events.length} élément${events.length>1?'s':''}</small></header><div class="dashboard-week-events-v149">${events.length?events.map(e=>`<button class="dashboard-week-event-v149 agenda-action" data-agenda-source="${esc(e.source||'personal')}" data-agenda-id="${esc(e.id||'')}"><time>${esc(agendaTime(e)||'—')}</time><span title="${esc(e.title||'Événement')}">${esc(e.title||'Événement')}</span></button>`).join(''):'<div class="dashboard-week-empty-v149">Rien de prévu</div>'}</div></section>`}).join('');
}
function renderDashboard(){updateLiveConnectionLocalStates();renderLiveConnections();
 renderGlobalAcademicYear();
 const today=todayISO(),activeRange=academicYearRange(activeAcademicYear()),todayInActive=academicYearContains(activeAcademicYear(),today),refDate=todayInActive?today:activeRange.start,soon7=addDays(refDate,7);
 const activeAgents=(db.agents||[]).filter(a=>normalizeText(a.status)==='actif');
 const present=todayInActive?activeAgents.filter(a=>{const info=dayInfo(a.id,today);return !isAbsenceType(info.dayType)&&normalizeText(info.dayType)!=='repos'}).length:0;
 const absent=todayInActive?activeAgents.filter(a=>isAbsenceType(dayInfo(a.id,today).dayType)).length:0;
 const meetingsToday=(db.meetings||[]).filter(x=>normalizeDateValue(x.date)===today&&!isClosedStatus(x.status)&&normalizeText(x.status)!=='annule').length;
 const urgentActions=collectUrgentDashboardActions();const lateActions=collectLateDashboardActions(today);const urgentToday=urgentActions.filter(x=>!x.due||x.due<=today).length;
 const allMaint=(db.maintenance||[]).filter(x=>recordInAcademicYear(x,['date','dueDate']));const closedMaint=allMaint.filter(x=>isClosedStatus(x.status));const openMaint=allMaint.filter(x=>!isClosedStatus(x.status));const todoMaint=allMaint.filter(x=>normalizeText(x.status)==='a faire');
 const maintCounts={total:allMaint.length,todo:todoMaint.length,open:openMaint.length,closed:closedMaint.length,byStatus:allMaint.reduce((acc,x)=>{const k=String(x.status||'Sans statut').trim()||'Sans statut';acc[k]=(acc[k]||0)+1;return acc},{})};window.PSTMaintenanceCounts=maintCounts;
 const recentClean=(db.cleaning||[]).filter(x=>recordInAcademicYear(x,['date']));const comp=recentClean.length?Math.round(recentClean.filter(x=>normalizeText(x.overallStatus)==='conforme').length/recentClean.length*100):null;const weak=recentClean.reduce((sum,x)=>sum+(x.tasks||[]).filter(t=>['a reprendre','non conforme'].includes(normalizeText(t.status))).length,0);
 const periodicYearRows=periodicAcademicYearRowsV165(activeAcademicYear()),pLate=periodicYearRows.filter(r=>r.info.state==='À faire').map(r=>r.x),pSoon=periodicYearRows.filter(r=>r.info.state==='À prévoir'&&r.info.due&&activeAcademicYear()===academicYearFor(todayISO())&&r.info.due<=addDays(todayISO(),60)).map(r=>r.x);
 const notes=(db.notes||[]).filter(x=>recordInAcademicYear(x,['date','dueDate'])&&!isClosedStatus(x.status)),notesDue=notes.filter(x=>{const due=recordDueDate(x);return due&&due<=soon7}).length;
 // Informations strictement journalières en haut du tableau de bord.
 const dayLabel=parseDate(today).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});const hero=$('#dailyHeroDate');if(hero)hero.textContent=dayLabel.charAt(0).toUpperCase()+dayLabel.slice(1);
 const heroSummary=$('#dailyHeroSummary');if(heroSummary)heroSummary.textContent=`${present} présent${present>1?'s':''} · ${eventsForDate(today).length} élément${eventsForDate(today).length>1?'s':''} aujourd’hui · ${urgentToday} urgence${urgentToday>1?'s':''} à traiter`;
 if($('#todayKpiPresent'))$('#todayKpiPresent').textContent=present;if($('#todayKpiAbsent'))$('#todayKpiAbsent').textContent=absent;if($('#todayKpiMeetings'))$('#todayKpiMeetings').textContent=meetingsToday;if($('#todayKpiUrgent'))$('#todayKpiUrgent').textContent=urgentToday;
 // Indicateurs globaux, déplacés dans « À surveiller ».
 $('#kpiAgents').textContent=activeAgents.length;$('#kpiPresent').textContent=todayInActive?`${present} présents aujourd’hui`:`Année ${activeAcademicYear()}`;$('#kpiUrgentActions').textContent=urgentActions.length;$('#kpiLate').textContent=`${lateActions.length} en retard`;
 $('#kpiMaintenance').textContent=maintCounts.open;$('#kpiMaintenanceTodo').textContent=`${maintCounts.todo} à faire`;$('#kpiCompliance').textContent=comp==null?'—':`${comp} %`;$('#kpiCleaningWeak').textContent=`${weak} point${weak>1?'s':''} faible${weak>1?'s':''}`;{const _pRows=periodicAcademicYearRowsV165(activeAcademicYear()),_pDone=_pRows.filter(r=>r.info.actual?.length).length,_pMissing=_pRows.filter(r=>r.info.state==='Non renseigné').length,_pOk=_pRows.filter(r=>r.info.state==='À jour').length,_pPlanned=_pRows.filter(r=>r.info.due).length,_pSoonCount=_pRows.filter(r=>r.info.state==='À prévoir').length,_currentAy=activeAcademicYear()===academicYearFor(todayISO()),_pastAy=academicYearRange(activeAcademicYear()).end<todayISO();const _pl=$('#kpiPeriodicLabelV165');if(_pl)_pl.textContent=_pastAy?'Contrôles de l’année':(_currentAy?'Contrôles à surveiller':'Contrôles prévus');$('#kpiPeriodicLate').textContent=_pastAy?_pDone:(_currentAy?pLate.length:_pPlanned);$('#kpiPeriodicSoon').textContent=_pastAy?`${_pDone} réalisés · ${_pMissing} non renseignés`:_currentAy?`${_pSoonCount} bientôt · ${_pOk} à jour`:`${_pOk} couverts par un contrôle antérieur`; }$('#kpiNotes').textContent=notes.length;$('#kpiNotesDue').textContent=`${notesDue} échéance${notesDue>1?'s':''} proche${notesDue>1?'s':''}`;
 // Les anciens aperçus restent alimentés mais sont masqués pour préserver la compatibilité.
 $('#dashboardNotes').innerHTML=cardList(notes.slice().sort((a,b)=>(recordDueDate(a)||'9999').localeCompare(recordDueDate(b)||'9999')).slice(0,5).map(x=>itemCard('✎',x.title,`${esc(x.category)} · ${fmtDate(recordDueDate(x))||'Sans échéance'}`,'note',x.id)),'Aucune note active.');
 $('#maintenancePreview').innerHTML=cardList(openMaint.filter(x=>{const st=normalizeText(x.status);return st==='en cours'||st.startsWith('en attente')}).slice(0,5).map(x=>itemCard('⚙',x.title,`${esc(x.building)} · ${badge(x.status)}`,'maintenance',x.id)),'Aucune intervention en cours.');
 $('#maintenanceTodoPreview').innerHTML=cardList(todoMaint.slice(0,5).map(x=>itemCard('🧰',x.title,`${badge(x.priority)} · ${fmtDate(recordDueDate(x))||'Sans échéance'}`,'maintenance',x.id)),'Aucune intervention à faire.');
 const weakRows=[];recentClean.forEach(c=>(c.tasks||[]).filter(t=>['a reprendre','non conforme'].includes(normalizeText(t.status))).forEach(t=>weakRows.push({c,t})));$('#cleaningWeakPreview').innerHTML=cardList(weakRows.slice(0,5).map(({c,t})=>itemCard('🧹',t.name,`${esc(c.building)} · ${esc(c.room)} · ${badge(t.status)}`,'cleaning',c.id)),'Aucun point faible récent.');
 const nextMeet=(db.meetings||[]).filter(x=>recordInAcademicYear(x,['date'])&&normalizeDateValue(x.date)>=refDate&&!isClosedStatus(x.status)&&normalizeText(x.status)!=='annule').sort((a,b)=>`${normalizeDateValue(a.date)}${a.time||''}`.localeCompare(`${normalizeDateValue(b.date)}${b.time||''}`)).slice(0,5);$('#meetingPreview').innerHTML=cardList(nextMeet.map(x=>itemCard('📅',x.title,`${fmtDate(normalizeDateValue(x.date))} ${esc(x.time||'')} · ${esc(x.location||'')}`,'meeting',x.id)),'Aucun rendez-vous à venir.');
 renderDashboardTeamTodayV149();renderDashboardTodayAgenda();renderDashboardPrioritiesV149(urgentActions,lateActions);renderDashboardRemindersV149(notes,pSoon);renderDashboardWeekV149();
 // Ces calendriers sont encore rendus dans une zone masquée pour ne casser aucune liaison historique.
 renderTeamCalendar();renderPersonalCalendar();window.PDFImportModule?.renderDashboard?.();
}


/* V147.160 — Tableau de bord journée / semaine recentré sur le pilotage technique.
   Le fichier contrats reste un outil de synchronisation en arrière-plan ; ses échéances administratives ne remontent plus sur le tableau de bord. */
let dashboardPeriodModeV159='day';
let dashboardPeriodDateV159=todayISO();
function dashboardPeriodRangeV159(){
 const ref=dashboardPeriodDateV159||todayISO();
 if(dashboardPeriodModeV159==='week'){
  const start=startOfWeek(ref);return {start,end:addDays(start,4),dates:Array.from({length:5},(_,i)=>addDays(start,i))};
 }
 return {start:ref,end:ref,dates:[ref]};
}
function dashboardDateInRangeV159(d,range=dashboardPeriodRangeV159()){d=normalizeDateValue(d);return !!d&&d>=range.start&&d<=range.end}
function dashboardPeriodTextV159(range=dashboardPeriodRangeV159()){
 if(dashboardPeriodModeV159==='week')return `Semaine du ${fmtDate(range.start)} au ${fmtDate(range.end)}`;
 return fmtDateLong(range.start);
}
function dashboardContractEventsForDateV159(d){
 const rows=[],api=window.PSTContracts;
 for(const c of (db.contracts||[])){
  if(!c||!c.id)continue;
  if(normalizeDateValue(c.contractEndDate)===d)rows.push({...c,date:d,start:'',source:'contract',title:`Contrat · fin · ${c.object||'Contrat'}`,dashboardContractKind:'end'});
  if(normalizeDateValue(c.noticeDate)===d)rows.push({...c,date:d,start:'',source:'contract',title:`Contrat · préavis / renouvellement · ${c.object||'Contrat'}`,dashboardContractKind:'notice'});
  const next=api?.nextServiceDate?.(c)||normalizeDateValue(c.nextServiceDateOverride);
  if(next===d && !(c.linkedPeriodicIds||[]).length)rows.push({...c,date:d,start:'',source:'contract',title:`Contrat · prestation prévue · ${c.object||'Contrat'}`,dashboardContractKind:'service'});
 }
 return rows;
}
function dashboardEventsForDateV159(d){
 // V147.167 — les horaires réels des agents font partie de « Ma journée ».
 // Pilotage terrain : les échéances administratives des contrats ne remontent pas ici.
 const rows=[...eventsForDate(d)],seen=new Set();
 return rows.filter(e=>{const k=`${e.source||''}:${e.id||''}:${e.title||''}`;if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>`${agendaTime(a)||'99:99'}${a.title||''}`.localeCompare(`${agendaTime(b)||'99:99'}${b.title||''}`));
}
function renderDashboardTeamTodayV149(){
 const el=$('#dashboardTeamToday');if(!el)return;const range=dashboardPeriodRangeV159(),agents=(db.agents||[]).filter(a=>normalizeText(a.status)==='actif');
 if(dashboardPeriodModeV159==='week'){
  el.innerHTML=agents.length?agents.map(a=>{
   let presence=0,absence=0,total=0,changes=0;const reasons=[];
   for(const d of range.dates){const info=dayInfo(a.id,d),type=String(info.dayType||'Présence'),norm=normalizeText(type);if(norm==='repos')continue;if(isAbsenceType(type)){absence++;reasons.push(type)}else{presence++;total+=Number(dayHours(info).total||0);const rs=String(info.actualStart||''),re=String(info.actualEnd||''),ps=String(info.plannedStart||''),pe=String(info.plannedEnd||'');if(rs&&re&&ps&&pe&&(rs!==ps||re!==pe))changes++;}}
   const baseDetail=absence?`${absence} absence${absence>1?'s':''} · ${[...new Set(reasons)].slice(0,2).join(', ')}`:`${presence} jour${presence>1?'s':''} planifié${presence>1?'s':''}`;
   const detail=changes?`⚠ ${changes} horaire${changes>1?'s':''} modifié${changes>1?'s':''} · ${baseDetail}`:baseDetail;
   return `<button class="dashboard-team-row-v149 week-summary-v159 ${changes?'schedule-changed':''}" data-agent-week-open="1"><span class="dashboard-team-avatar-v149">${esc((a.firstName||a.lastName||'?').charAt(0).toUpperCase())}</span><strong>${esc(agentName(a))}</strong><small>${esc(detail)}</small><span class="dashboard-team-status-v149 ${changes?'changed':absence?'absent':''}">${changes?'MODIFIÉ':esc(fmtHours(total))}</span></button>`;
  }).join(''):'<div class="empty-card">Aucun agent actif.</div>';return;
 }
 const d=range.start,nowTime=new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),isToday=d===todayISO();
 el.innerHTML=agents.length?agents.map(a=>{
  const info=dayInfo(a.id,d),type=String(info.dayType||'Présence'),norm=normalizeText(type),plannedStart=String(info.plannedStart||''),plannedEnd=String(info.plannedEnd||''),realStart=String(info.actualStart||''),realEnd=String(info.actualEnd||''),hasReal=Boolean(realStart&&realEnd),changed=Boolean(hasReal&&plannedStart&&plannedEnd&&(realStart!==plannedStart||realEnd!==plannedEnd)),start=hasReal?realStart:plannedStart,end=hasReal?realEnd:plannedEnd;
  let status=hasReal?'Réel':'Présent',cls=hasReal?'real':'',rowCls=changed?'schedule-changed':'',schedule=start&&end?(hasReal?`Réel ${start} – ${end}`:`${start} – ${end}`):'Horaire non défini';
  if(norm==='repos'){status='Repos';cls='rest';rowCls='';schedule='Journée';}
  else if(isAbsenceType(type)){status=type;cls='absent';rowCls='';schedule='Journée';}
  else if(changed){status='HORAIRE MODIFIÉ';cls='changed';schedule=`⚠ Réel ${realStart}–${realEnd} · prévu ${plannedStart}–${plannedEnd}`;}
  else if(isToday&&start&&start>nowTime){status=hasReal?'Réel · à venir':'À venir';cls=hasReal?'real':'future';schedule=hasReal?`Réel · prend à ${start}`:`Prend à ${start}`;}
  return `<button class="dashboard-team-row-v149 ${rowCls}" data-agent-day="${a.id}" data-date="${d}"><span class="dashboard-team-avatar-v149">${esc((a.firstName||a.lastName||'?').charAt(0).toUpperCase())}</span><strong>${esc(agentName(a))}</strong><small>${esc(schedule)}</small><span class="dashboard-team-status-v149 ${cls}">${esc(status)}</span></button>`;
 }).join(''):'<div class="empty-card">Aucun agent actif.</div>';
}
function renderDashboardTodayAgenda(){
 const el=$('#dashboardTodayAgenda');if(!el)return;const range=dashboardPeriodRangeV159();
 const rows=range.dates.flatMap(d=>dashboardEventsForDateV159(d).map(e=>({...e,__dashboardDate:d})));
 const visible=rows.slice(0,dashboardPeriodModeV159==='week'?18:40);
 el.innerHTML=visible.length?visible.map(e=>{const tm=agendaTime(e),place=agendaPlace(e),day=dashboardPeriodModeV159==='week'?parseDate(e.__dashboardDate).toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit'}):'';return `<button class="today-agenda-row agenda-action ${esc(e.source||'personal')}" data-agenda-source="${esc(e.source||'personal')}" data-agenda-id="${esc(e.id||'')}">${day?`<span class="today-agenda-day-v159">${esc(day)}</span>`:`<span class="today-agenda-time">${esc(tm||'—')}</span>`}<span class="today-agenda-main"><strong>${esc(e.title||'Événement')}</strong><small>${day&&tm?`🕒 ${esc(tm)}${place?` · 📍 ${esc(place)}`:''}`:(place?`📍 ${esc(place)}`:'📍 Lieu non renseigné')}</small></span><span class="today-agenda-arrow">›</span></button>`}).join(''):`<div class="empty">Aucun événement prévu ${dashboardPeriodModeV159==='week'?'cette semaine':'ce jour'}.</div>`;
}
function dashboardAgentWeekDatesV150(offset=0){
 const base=startOfWeek(dashboardPeriodDateV159||todayISO()),monday=addDays(base,Number(offset||0)*7);return Array.from({length:5},(_,i)=>addDays(monday,i));
}
function openDashboardAgentWeekV150(offset=0){
 dashboardAgentWeekOffsetV150=Number(offset||0);const days=dashboardAgentWeekDatesV150(dashboardAgentWeekOffsetV150),agents=(db.agents||[]).filter(a=>normalizeText(a.status)==='actif').slice().sort((a,b)=>agentName(a).localeCompare(agentName(b),'fr'));
 const first=days[0],last=days.at(-1),isSelected=dashboardAgentWeekOffsetV150===0;
 $('#detailTitle').textContent=`Horaires des agents — ${isSelected?'semaine sélectionnée':'semaine'}`;
 const head=days.map(d=>{const dt=parseDate(d),label=dt.toLocaleDateString('fr-FR',{weekday:'short'}).replace('.','');return `<th>${esc(label.charAt(0).toUpperCase()+label.slice(1))}<br><small>${esc(dt.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}))}</small></th>`}).join('');
 const rows=agents.map(a=>{let total=0;const cells=days.map(d=>{const c=dashboardAgentWeekCellV150(a,d);total+=c.hours;return `<td>${c.html}</td>`}).join('');return `<tr><td><div class="agent-week-agent-v150"><span class="agent-week-avatar-v150">${esc((a.firstName||a.lastName||'?').charAt(0).toUpperCase())}</span><strong>${esc(agentName(a))}</strong></div></td>${cells}<td class="agent-week-total-v150">${esc(fmtHours(total))}</td></tr>`}).join('');
 $('#detailBody').innerHTML=`<div class="agent-week-toolbar-v150"><div><strong>Du ${fmtDate(first)} au ${fmtDate(last)}</strong><div class="muted">Horaires théoriques réellement applicables, absences et repos inclus.</div></div><div class="agent-week-toolbar-actions-v150"><button type="button" class="ghost small" data-agent-week-nav="-1">‹ Semaine précédente</button>${!isSelected?'<button type="button" class="ghost small" data-agent-week-nav="0">Semaine sélectionnée</button>':''}<button type="button" class="ghost small" data-agent-week-nav="1">Semaine suivante ›</button></div></div><div class="agent-week-table-wrap-v150"><table class="agent-week-table-v150"><thead><tr><th>Agent</th>${head}<th>Total</th></tr></thead><tbody>${rows||'<tr><td colspan="7">Aucun agent actif.</td></tr>'}</tbody></table></div><p class="agent-week-legend-v150">Clique sur une case pour ouvrir le détail de la journée de l’agent. Les horaires affichés tiennent compte des roulements et des saisies de journée.</p>`;
 $('#detailModal').showModal();
}
function dashboardSourceEditTypeV149(source){return ({note:'note',maintenance:'maintenance',request:'request',work:'work',issue:'issue',periodic:'periodic',meeting:'meeting',personal:'personal',contract:'contract'})[source]||''}
function renderDashboardPrioritiesV149(urgentActions,lateActions){
 const el=$('#priorityList');if(!el)return;const range=dashboardPeriodRangeV159(),seen=new Set(),rows=[];
 const add=r=>{const key=`${r.editType||r.source||''}:${r.id||r.title}:${r.due||''}`;if(seen.has(key))return;seen.add(key);rows.push(r)};
 urgentActions.filter(x=>!x.due||x.due<=range.end).forEach(x=>add({...x,level:'URGENT'}));
 lateActions.forEach(x=>{const source=({issues:'issue',maintenance:'maintenance',requests:'request',works:'work',notes:'note'})[x.module]||x.module,rec=x.record;add({icon:'⏰',title:rec.title||rec.subject||rec.no||'Échéance en retard',label:'En retard',editType:source,id:rec.id,due:x.due,level:'RETARD'})});
 range.dates.forEach(d=>dashboardEventsForDateV159(d).filter(e=>['issue','maintenance','request','work','note','periodic','contract'].includes(e.source)).forEach(e=>add({icon:e.source==='maintenance'?'🔧':e.source==='periodic'?'📋':e.source==='contract'?'📑':e.source==='issue'?'⚠':'•',title:e.title||'Action',label:dashboardPeriodModeV159==='week'?fmtDate(d):'À traiter',editType:dashboardSourceEditTypeV149(e.source),id:e.id,due:recordDueDate(e)||d,level:isUrgentPriority(e.priority)?'URGENT':'PÉRIODE'})));
 rows.sort((a,b)=>(a.level==='URGENT'?-2:a.level==='RETARD'?-1:0)-(b.level==='URGENT'?-2:b.level==='RETARD'?-1:0)||String(a.due||'9999').localeCompare(String(b.due||'9999')));
 const periodWord=dashboardPeriodModeV159==='week'?'cette semaine':'ce jour';
 el.innerHTML=cardList(rows.slice(0,8).map(x=>itemCard(x.icon||'•',x.title,`${badge(x.level==='URGENT'?'Urgente':x.level==='RETARD'?'En retard':'À traiter')} · ${esc(x.label||'Action')} · ${fmtDate(x.due)||'À traiter'}`,x.editType,x.id)),`Aucune priorité particulière ${periodWord}.`);
}
function renderDashboardRemindersV149(notes,pSoon){
 const el=$('#dashboardReminders');if(!el)return;const range=dashboardPeriodRangeV159(),after=addDays(range.end,1),cards=[];
 cards.push(`<button class="dashboard-reminder-v149" data-go="weather"><span class="icon">🌦️</span><div><strong id="dashboardWeatherTitle">Météo du jour</strong><small id="dashboardWeatherDetail">Actualisation…</small></div></button>`);
 const dueNote=notes.filter(x=>{const d=recordDueDate(x);return d&&d>=range.start&&d<=after}).sort((a,b)=>String(recordDueDate(a)).localeCompare(String(recordDueDate(b))))[0];
 if(dueNote)cards.push(`<button class="dashboard-reminder-v149" data-edit-type="note" data-edit-id="${dueNote.id}"><span class="icon">✎</span><div><strong>${esc(dueNote.title||'Note à traiter')}</strong><small>Échéance ${fmtDate(recordDueDate(dueNote))} · ${esc(dueNote.category||'Bloc-notes')}</small></div></button>`);else cards.push(`<button class="dashboard-reminder-v149" data-go="notes"><span class="icon">✎</span><div><strong>Notes</strong><small>Aucune échéance de note sur la période.</small></div></button>`);
 const meter=range.dates.map(meterReadingItemForDate).find(Boolean)||meterReadingItemForDate(after);if(meter)cards.push(`<button class="dashboard-reminder-v149 agenda-action" data-agenda-source="meter-reading" data-agenda-id="${meter.id}"><span class="icon">📊</span><div><strong>Relevé des compteurs</strong><small>${fmtDate(meter.date)} · logements</small></div></button>`);else if(pSoon[0])cards.push(`<button class="dashboard-reminder-v149" data-edit-type="periodic" data-edit-id="${pSoon[0].id}"><span class="icon">📋</span><div><strong>${esc(pSoon[0].name||pSoon[0].title||'Contrôle périodique')}</strong><small>Contrôle à surveiller prochainement</small></div></button>`);else cards.push(`<button class="dashboard-reminder-v149" data-go="periodic"><span class="icon">📋</span><div><strong>Contrôles périodiques</strong><small>Aucune alerte proche.</small></div></button>`);
 const waste=range.dates.map(wasteAgendaItemForDate).find(Boolean)||wasteAgendaItemForDate(after);if(waste)cards.push(`<button class="dashboard-reminder-v149" data-go="waste"><span class="icon">🗑️</span><div><strong>${esc(waste.title||'Collecte des déchets')}</strong><small>${fmtDate(waste.date)} · ${esc(waste.meta||'')}</small></div></button>`);else cards.push(`<button class="dashboard-reminder-v149" data-go="waste"><span class="icon">🗑️</span><div><strong>Déchets / bacs</strong><small>Voir la prochaine collecte programmée.</small></div></button>`);
 el.innerHTML=cards.slice(0,4).join('');renderDashboardWeatherV149();
}
function renderDashboardWeekV149(){
 const el=$('#dashboardWeekStrip');if(!el)return;const range=dashboardPeriodRangeV159(),monday=startOfWeek(range.start),days=Array.from({length:5},(_,i)=>addDays(monday,i)),today=todayISO();
 const label=$('#dashboardWeekLabel');if(label)label.textContent=`Du ${fmtDate(days[0])} au ${fmtDate(days[4])}`;
 el.innerHTML=days.map(d=>{const date=parseDate(d),events=dashboardEventsForDateV159(d).slice(0,4),selected=d>=range.start&&d<=range.end;return `<section class="dashboard-week-day-v149 ${d===today?'today':''} ${selected?'selected':''}"><header class="dashboard-week-head-v149"><strong>${esc(date.toLocaleDateString('fr-FR',{weekday:'long'}))} ${date.getDate()}</strong><small>${events.length} élément${events.length>1?'s':''}</small></header><div class="dashboard-week-events-v149">${events.length?events.map(e=>`<button class="dashboard-week-event-v149 agenda-action" data-agenda-source="${esc(e.source||'personal')}" data-agenda-id="${esc(e.id||'')}"><time>${esc(agendaTime(e)||'—')}</time><span title="${esc(e.title||'Événement')}">${esc(e.title||'Événement')}</span></button>`).join(''):'<div class="dashboard-week-empty-v149">Rien de prévu</div>'}</div></section>`}).join('');
}
function renderDashboardPeriodicNextV160(){
 const n=$('#kpiPeriodicNextCountV160'),d=$('#kpiPeriodicNextDetailV160'),label=$('#kpiPeriodicPeriodLabelV165');if(!n||!d)return;
 const year=activeAcademicYear(),current=academicYearFor(todayISO()),rows=periodicAcademicYearRowsV165(year).filter(r=>!periodicIsInactive(r.x));
 if(label)label.textContent=`Contrôles ${year}`;
 if(year<current){
   const done=rows.filter(r=>r.info.actual.length);n.textContent=done.length;d.textContent=`réalisés dans l’année · historique`;
   return;
 }
 if(year>current){
   const planned=rows.filter(r=>r.info.due).sort((a,b)=>a.info.due.localeCompare(b.info.due));n.textContent=planned.length;
   d.textContent=planned.length?`1er prévu : ${fmtDate(planned[0].info.due)} · ${planned[0].x.name||'contrôle'}`:'aucune échéance calculée';return;
 }
 const pending=rows.filter(r=>['À faire','À prévoir'].includes(r.info.state)&&r.info.due).sort((a,b)=>a.info.due.localeCompare(b.info.due));
 n.textContent=pending.length;
 d.textContent=pending.length?`prochain : ${fmtDate(pending[0].info.due)} · ${pending[0].x.name||'contrôle'}`:'aucun contrôle restant calculé dans l’année';
}
function renderDashboard(){updateLiveConnectionLocalStates();renderLiveConnections();renderGlobalAcademicYear();
 const range=dashboardPeriodRangeV159(),activeAgents=(db.agents||[]).filter(a=>normalizeText(a.status)==='actif'),dates=range.dates;
 let present=0,absent=0;for(const d of dates){for(const a of activeAgents){const info=dayInfo(a.id,d),norm=normalizeText(info.dayType);if(isAbsenceType(info.dayType))absent++;else if(norm!=='repos')present++;}}
 const meetingsPeriod=(db.meetings||[]).filter(x=>dashboardDateInRangeV159(x.date,range)&&!isClosedStatus(x.status)&&normalizeText(x.status)!=='annule').length;
 const urgentActions=collectUrgentDashboardActions(),lateActions=collectLateDashboardActions(range.start),urgentPeriod=urgentActions.filter(x=>!x.due||x.due<=range.end).length;
 const allMaint=(db.maintenance||[]).filter(x=>recordInAcademicYear(x,['date','dueDate'])),closedMaint=allMaint.filter(x=>isClosedStatus(x.status)),openMaint=allMaint.filter(x=>!isClosedStatus(x.status)),todoMaint=allMaint.filter(x=>normalizeText(x.status)==='a faire'),maintCounts={total:allMaint.length,todo:todoMaint.length,open:openMaint.length,closed:closedMaint.length,byStatus:allMaint.reduce((acc,x)=>{const k=String(x.status||'Sans statut').trim()||'Sans statut';acc[k]=(acc[k]||0)+1;return acc},{})};window.PSTMaintenanceCounts=maintCounts;
 const recentClean=(db.cleaning||[]).filter(x=>recordInAcademicYear(x,['date'])),comp=recentClean.length?Math.round(recentClean.filter(x=>normalizeText(x.overallStatus)==='conforme').length/recentClean.length*100):null,weak=recentClean.reduce((sum,x)=>sum+(x.tasks||[]).filter(t=>['a reprendre','non conforme'].includes(normalizeText(t.status))).length,0);
 const periodicYearRows=periodicAcademicYearRowsV165(activeAcademicYear()),pLate=periodicYearRows.filter(r=>r.info.state==='À faire').map(r=>r.x),pSoon=periodicYearRows.filter(r=>r.info.state==='À prévoir'&&r.info.due&&activeAcademicYear()===academicYearFor(todayISO())&&r.info.due<=addDays(todayISO(),60)).map(r=>r.x),notes=(db.notes||[]).filter(x=>recordInAcademicYear(x,['date','dueDate'])&&!isClosedStatus(x.status)),notesDue=notes.filter(x=>{const due=recordDueDate(x);return due&&due<=addDays(todayISO(),7)}).length;
 const eventCount=dates.reduce((sum,d)=>sum+dashboardEventsForDateV159(d).length,0),hero=$('#dailyHeroDate'),heroSummary=$('#dailyHeroSummary'),kicker=document.querySelector('#dashboard .daily-hero-kicker-v149');
 if(kicker)kicker.textContent=dashboardPeriodModeV159==='week'?'CETTE SEMAINE':'JOURNÉE';if(hero)hero.textContent=dashboardPeriodModeV159==='week'?`Semaine du ${fmtDate(range.start)} au ${fmtDate(range.end)}`:parseDate(range.start).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}).replace(/^./,c=>c.toUpperCase());
 if(heroSummary)heroSummary.textContent=dashboardPeriodModeV159==='week'?`${present} présence${present>1?'s':''} planifiée${present>1?'s':''} · ${eventCount} élément${eventCount>1?'s':''} · ${urgentPeriod} priorité${urgentPeriod>1?'s':''} urgente${urgentPeriod>1?'s':''}`:`${present} présent${present>1?'s':''} · ${eventCount} élément${eventCount>1?'s':''} · ${urgentPeriod} urgence${urgentPeriod>1?'s':''} à traiter`;
 const periodLabel=$('#dashboardPeriodLabelV159'),dateInput=$('#dashboardPeriodDateV159');if(periodLabel)periodLabel.textContent=dashboardPeriodTextV159(range);if(dateInput&&document.activeElement!==dateInput)dateInput.value=dashboardPeriodDateV159;
 $$('[data-dashboard-period]').forEach(b=>b.classList.toggle('active',b.dataset.dashboardPeriod===dashboardPeriodModeV159));
 const weekly=dashboardPeriodModeV159==='week';
 if($('#todayKpiPresentLabel'))$('#todayKpiPresentLabel').textContent=weekly?'Présences planifiées':'Présents';if($('#todayKpiPresentMeta'))$('#todayKpiPresentMeta').textContent=weekly?'sur 5 jours':'sur la journée';
 if($('#todayKpiAbsentLabel'))$('#todayKpiAbsentLabel').textContent=weekly?'Absences':'Absents';if($('#todayKpiAbsentMeta'))$('#todayKpiAbsentMeta').textContent=weekly?'journées d’absence':'sur la journée';
 if($('#todayKpiMeetingsMeta'))$('#todayKpiMeetingsMeta').textContent=weekly?'dans la semaine':'sur la journée';if($('#todayKpiUrgentMeta'))$('#todayKpiUrgentMeta').textContent=weekly?'à traiter avant vendredi':'à traiter';
 if($('#todayKpiPresent'))$('#todayKpiPresent').textContent=present;if($('#todayKpiAbsent'))$('#todayKpiAbsent').textContent=absent;if($('#todayKpiMeetings'))$('#todayKpiMeetings').textContent=meetingsPeriod;if($('#todayKpiUrgent'))$('#todayKpiUrgent').textContent=urgentPeriod;
 if($('#dashboardTeamTitleV159'))$('#dashboardTeamTitleV159').textContent=weekly?'Équipe de la semaine':'Équipe du jour';if($('#dashboardAgendaKickerV159'))$('#dashboardAgendaKickerV159').textContent=weekly?'HEBDOMADAIRE':'JOURNALIER';if($('#dashboardAgendaTitleV159'))$('#dashboardAgendaTitleV159').textContent=weekly?'Agenda de la semaine':'Ma journée';if($('#dashboardPriorityTitleV159'))$('#dashboardPriorityTitleV159').textContent=weekly?'Priorités de la semaine':'Priorités du jour';
 $('#kpiAgents').textContent=activeAgents.length;$('#kpiPresent').textContent=`${present} présence${present>1?'s':''}`;$('#kpiUrgentActions').textContent=urgentActions.length;$('#kpiLate').textContent=`${lateActions.length} en retard`;$('#kpiMaintenance').textContent=maintCounts.open;$('#kpiMaintenanceTodo').textContent=`${maintCounts.todo} à faire`;$('#kpiCompliance').textContent=comp==null?'—':`${comp} %`;$('#kpiCleaningWeak').textContent=`${weak} point${weak>1?'s':''} faible${weak>1?'s':''}`;{const _pRows=periodicAcademicYearRowsV165(activeAcademicYear()),_pDone=_pRows.filter(r=>r.info.actual?.length).length,_pMissing=_pRows.filter(r=>r.info.state==='Non renseigné').length,_pOk=_pRows.filter(r=>r.info.state==='À jour').length,_pPlanned=_pRows.filter(r=>r.info.due).length,_pSoonCount=_pRows.filter(r=>r.info.state==='À prévoir').length,_currentAy=activeAcademicYear()===academicYearFor(todayISO()),_pastAy=academicYearRange(activeAcademicYear()).end<todayISO();const _pl=$('#kpiPeriodicLabelV165');if(_pl)_pl.textContent=_pastAy?'Contrôles de l’année':(_currentAy?'Contrôles à surveiller':'Contrôles prévus');$('#kpiPeriodicLate').textContent=_pastAy?_pDone:(_currentAy?pLate.length:_pPlanned);$('#kpiPeriodicSoon').textContent=_pastAy?`${_pDone} réalisés · ${_pMissing} non renseignés`:_currentAy?`${_pSoonCount} bientôt · ${_pOk} à jour`:`${_pOk} couverts par un contrôle antérieur`; }$('#kpiNotes').textContent=notes.length;$('#kpiNotesDue').textContent=`${notesDue} échéance${notesDue>1?'s':''} proche${notesDue>1?'s':''}`;
 $('#dashboardNotes').innerHTML=cardList(notes.slice().sort((a,b)=>(recordDueDate(a)||'9999').localeCompare(recordDueDate(b)||'9999')).slice(0,5).map(x=>itemCard('✎',x.title,`${esc(x.category)} · ${fmtDate(recordDueDate(x))||'Sans échéance'}`,'note',x.id)),'Aucune note active.');$('#maintenancePreview').innerHTML=cardList(openMaint.filter(x=>{const st=normalizeText(x.status);return st==='en cours'||st.startsWith('en attente')}).slice(0,5).map(x=>itemCard('⚙',x.title,`${esc(x.building)} · ${badge(x.status)}`,'maintenance',x.id)),'Aucune intervention en cours.');$('#maintenanceTodoPreview').innerHTML=cardList(todoMaint.slice(0,5).map(x=>itemCard('🧰',x.title,`${badge(x.priority)} · ${fmtDate(recordDueDate(x))||'Sans échéance'}`,'maintenance',x.id)),'Aucune intervention à faire.');
 const weakRows=[];recentClean.forEach(c=>(c.tasks||[]).filter(t=>['a reprendre','non conforme'].includes(normalizeText(t.status))).forEach(t=>weakRows.push({c,t})));$('#cleaningWeakPreview').innerHTML=cardList(weakRows.slice(0,5).map(({c,t})=>itemCard('🧹',t.name,`${esc(c.building)} · ${esc(c.room)} · ${badge(t.status)}`,'cleaning',c.id)),'Aucun point faible récent.');const nextMeet=(db.meetings||[]).filter(x=>normalizeDateValue(x.date)>=todayISO()&&!isClosedStatus(x.status)&&normalizeText(x.status)!=='annule').sort((a,b)=>`${normalizeDateValue(a.date)}${a.time||''}`.localeCompare(`${normalizeDateValue(b.date)}${b.time||''}`)).slice(0,5);$('#meetingPreview').innerHTML=cardList(nextMeet.map(x=>itemCard('📅',x.title,`${fmtDate(normalizeDateValue(x.date))} ${esc(x.time||'')} · ${esc(x.location||'')}`,'meeting',x.id)),'Aucun rendez-vous à venir.');
 renderDashboardPeriodicNextV160();renderDashboardTeamTodayV149();renderDashboardTodayAgenda();renderDashboardPrioritiesV149(urgentActions,lateActions);renderDashboardRemindersV149(notes,pSoon);renderDashboardWeekV149();renderTeamCalendar();renderPersonalCalendar();window.PDFImportModule?.renderDashboard?.();
}


/* ---------- Paramètres ---------- */
const LIST_LABELS={roles:'Fonctions agents',dayTypes:'Types de journée / absence',priorities:'Priorités',generalStatuses:'Statuts généraux',issueCategories:'Catégories sécurité / qualité',maintenanceFamilies:'Domaines maintenance',maintenanceStatuses:'Statuts maintenance',requestTypes:'Types de demande',workTypes:'Types chantier / GPA',meetingTypes:'Types réunion',personalTypes:'Types agenda personnel',noteCategories:'Catégories bloc-notes',roomTypes:'Types de locaux',cleaningStatuses:'Résultats ménage',periodicFamilies:'Familles contrôles périodiques',documentCategories:'Catégories documents'};
function renderSettings(){if($('#cleaningAlertDays'))$('#cleaningAlertDays').value=db.settings.cleaningAlertDays||30;if($('#meetingAlertDays'))$('#meetingAlertDays').value=db.settings.meetingAlertDays||3;for(const [k,v] of Object.entries(db.settings)){const e=document.getElementById(k);if(e&&k!=='counters'){if(e.type==='checkbox')e.checked=Boolean(v);else e.value=v??''}}$('#buildingSettings').innerHTML=db.buildings.map(b=>`<div class="building-card" data-building-id="${b.id}"><div class="panel-head"><input value="${esc(b.name)}" data-building-name><button class="danger small" data-remove-building="${b.id}">Supprimer</button></div><div class="floor-chips">${b.floors.map((f,i)=>`<span><input value="${esc(f)}" data-floor-index="${i}"><button data-remove-floor="${i}">×</button></span>`).join('')}</div><button class="ghost small" data-add-floor="${b.id}">＋ Étage / niveau</button></div>`).join('');$('#spaceSettings').innerHTML=db.spaces.slice().sort((a,b)=>(a.building+a.floor+a.name).localeCompare(b.building+b.floor+b.name)).map(s=>`<button class="space-chip" data-edit-type="space" data-edit-id="${s.id}"><strong>${esc(s.name)}</strong><small>${esc(s.building)} · ${esc(s.floor)} · ${esc(s.type)}</small></button>`).join('')||'<p>Aucun local configuré.</p>';const absenceItems=db.lists.dayTypes;if($('#absenceTypeSettings'))$('#absenceTypeSettings').innerHTML=`<div class="list-editor" data-list-key="dayTypes">${absenceItems.map((x,i)=>`<div><input value="${esc(x)}" data-list-index="${i}" ${x==='Présence'?'readonly':''}><button class="danger small" data-remove-list="${i}" ${x==='Présence'?'disabled':''}>×</button></div>`).join('')}<button class="ghost small" data-add-list="dayTypes">＋ Ajouter un motif</button></div>`;$('#listSettings').innerHTML=Object.entries(db.lists).filter(([k])=>k!=='dayTypes').map(([k,items])=>`<details><summary>${esc(LIST_LABELS[k]||k)} <small>${items.length} choix</small></summary><div class="list-editor" data-list-key="${k}">${items.map((x,i)=>`<div><input value="${esc(x)}" data-list-index="${i}"><button class="danger small" data-remove-list="${i}">×</button></div>`).join('')}<button class="ghost small" data-add-list="${k}">＋ Choix</button></div></details>`).join('')}
function saveSettings(){const keys=['appName','schoolName','schoolZone','defaultLayout','printOrientation','defaultInspector','emailsTo','emailsCc','emailsBcc','emailSubjectPrefix','outlookEmail','cleaningAlertDays','meetingAlertDays','autoReportHour','autoReportTimezone','autoReportWeekdays','autoReportSignature'];for(const k of keys)db.settings[k]=document.getElementById(k)?.value??db.settings[k];db.settings.academicYear=activeAcademicYear();for(const k of ['autoDailyEnabled','autoWeeklyEnabled','autoReportOnlyIfEvents','autoReportIncludeAgents','autoReportIncludeMaintenance','autoReportIncludeCleaning','autoReportIncludePeriodic','autoReportIncludeMeetings','cleaningNotificationsEnabled','cleaningNotifyNever','cleaningNotifyOverdue','cleaningNotifyPlanned']){const e=document.getElementById(k);if(e)db.settings[k]=e.checked}$$('[data-building-id]').forEach(card=>{const b=db.buildings.find(x=>x.id===card.dataset.buildingId);if(!b)return;const old=b.name;b.name=card.querySelector('[data-building-name]').value.trim()||b.name;b.floors=$$('[data-floor-index]',card).map(i=>i.value.trim()).filter(Boolean);if(old!==b.name){db.spaces.forEach(s=>{if(s.building===old)s.building=b.name});for(const type of ['cleaning','maintenance','requests','works','periodic'])db[type].forEach(x=>{if(x.building===old)x.building=b.name})}});$$('[data-list-key]').forEach(ed=>{db.lists[ed.dataset.listKey]=$$('[data-list-index]',ed).map(i=>i.value.trim()).filter(Boolean)});applyLayout(db.settings.defaultLayout);save();toast('Paramètres enregistrés')}
function addBuilding(){const b={id:uid(),name:`Nouveau bâtiment ${db.buildings.length+1}`,floors:['Rez-de-chaussée']};db.buildings.push(b);save();setView('settings')}
function loadSchoolHolidays(){const zone=$('#vacationZone').value||db.settings.schoolZone||'A',year=activeAcademicYear(),periods=SCHOOL_CALENDAR[year]?.[zone]||[];if(!periods.length){toast(`Calendrier officiel non intégré pour ${year}. Le logiciel reste utilisable : ajoutez les périodes manuellement.`);return}for(const [name,start,end,notes] of periods){if(!db.vacations.some(x=>x.name===name&&x.start===start)){db.vacations.push({id:uid(),name:`Vacances de ${name}`,zone,start,end,status:'À préparer',tasks:VACATION_TASKS.map(t=>({text:t,done:false})),notes,attachments:[]})}}save();toast(`Vacances zone ${zone} chargées`)}


async function sendAutomaticReportTest(){
 const btn=$('#sendAutomaticReportTest');if(btn)btn.disabled=true;
 try{
  saveSettings();
  if(!supabaseClient)throw new Error('Connexion Supabase indisponible');
  const {data,error}=await supabaseClient.functions.invoke('automatic-report',{body:{mode:'test'}});
  if(error)throw error;
  toast(data?.message||'Rapport test envoyé');
 }catch(e){console.error(e);toast(`Envoi test impossible : ${e?.message||e}`)}finally{if(btn)btn.disabled=false}
}

/* ---------- Rapports / impression / e-mail ---------- */
function reportTitle(type){return {daily:'Rapport quotidien',weekly:'Rapport hebdomadaire',monthly:'Rapport mensuel général',team:'Bilan mensuel des agents',absence:'Congés et absences',cleaning:'Contrôles ménage',maintenance:'Maintenance',periodic:'Contrôles périodiques',vacation:'Vacances et fermeture',full:'Registre complet'}[type]||'Rapport'}
function tableHTML(headers,rows){return `<div class="report-table-wrap"><table class="report-table cols-${headers.length}" data-cols="${headers.length}"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr>${r.map(c=>`<td>${c??''}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}" class="empty-cell">Aucune donnée.</td></tr>`}</tbody></table></div>`}
function reportData(type){let title=reportTitle(type),subtitle='',html='';const daily=$('#dailyDate').value||todayISO(),weekly=startOfWeek($('#weeklyDate').value||todayISO()),monthly=$('#monthlyDate').value||monthISO(),teamMonth=$('#teamReportMonth').value||monthISO(),absMonth=$('#absenceReportMonth').value||monthISO(),cleanMonth=$('#cleaningReportMonth').value||monthISO(),maintMonth=$('#maintenanceReportMonth').value||monthISO(),year=$('#periodicReportYear').value||new Date().getFullYear();if(type==='daily'){subtitle=fmtDateLong(daily);const agents=db.agents.filter(a=>a.status==='Actif').map(a=>{const i=dayInfo(a.id,daily),h=dayHours(i),x=planningDisplayFor(a,daily);return [esc(agentName(a)),badge(i.dayType),esc(i.shift||''),esc(x.text),esc(fmtHours(h.total)),esc(i.note||'')]});html+=`<h2>Équipe</h2>${tableHTML(['Agent','Journée','Service','Horaire applicable','Heures','Information / motif'],agents)}`;const events=eventsForDate(daily);html+=`<h2>Agenda journalier — toutes les actions</h2>${tableHTML(['Heure','Objet','Lieu','Statut'],events.map(x=>[esc(agendaTime(x)||'—'),esc(x.title||'Événement'),esc(agendaPlace(x)||'Lieu non renseigné'),badge(x.status||x.overallStatus||'À faire')]))}`;html+=`<h2>Interventions</h2>${tableHTML(['N°','Objet','Lieu','Priorité','Statut'],db.maintenance.filter(x=>x.date===daily||x.dueDate===daily).map(x=>[esc(x.no),esc(x.title),esc(x.building),badge(x.priority),badge(x.status)]))}`};const acts=(db.agentActivities||[]).filter(x=>x.date===daily);html+=`<h2>Activité réalisée par les agents</h2>${tableHTML(['Période','Agent(s)','Type','Travail réalisé','Lieu','Durée'],acts.map(x=>[esc(agentActivityPeriodLabel(x)),esc(agentActivityAgentNames(x)),esc(x.type||''),esc(x.title||''),esc([x.building,x.floor,x.room].filter(Boolean).join(' · ')||'—'),esc(agentActivityDurationLabel(x))]))}`
if(type==='weekly'){const end=endOfWeek(weekly);subtitle=`${fmtDate(weekly)} au ${fmtDate(end)}`;const allDays=[];for(const a of db.agents.filter(x=>x.status==='Actif'))for(let d=weekly;d<=end;d=addDays(d,1)){const i=dayInfo(a.id,d),x=planningDisplayFor(a,d);if(![0,6].includes(parseDate(d).getDay()))allDays.push([fmtDate(d),esc(agentName(a)),badge(i.dayType),esc(i.shift||''),esc(x.text),esc(i.note||'')])}html=tableHTML(['Date','Agent','Journée','Service','Horaire applicable','Information / motif'],allDays)+`<h2>Échéances et rendez-vous</h2>`+tableHTML(['Date','Type','Objet','Statut'],[...db.meetings.filter(x=>inRange(x.date,weekly,end)).map(x=>[fmtDate(x.date),esc(x.type),esc(x.title),badge(x.status)]),...db.notes.filter(x=>inRange(x.dueDate,weekly,end)).map(x=>[fmtDate(x.dueDate),'Note',esc(x.title),badge(x.status)])])}
const weeklyActs=(db.agentActivities||[]).filter(x=>inRange(x.date,weekly,endOfWeek(weekly)));if(type==='weekly')html+=`<h2>Activité réalisée par les agents</h2>${tableHTML(['Date','Période','Agent(s)','Type','Travail réalisé','Durée'],weeklyActs.map(x=>[fmtDate(x.date),esc(agentActivityPeriodLabel(x)),esc(agentActivityAgentNames(x)),esc(x.type||''),esc(x.title||''),esc(agentActivityDurationLabel(x))]))}`;
if(type==='monthly'){subtitle=monthly;html=`<h2>Indicateurs</h2>${tableHTML(['Module','Total','Ouverts / faibles'],[['Maintenance',db.maintenance.filter(x=>dateMonthMatch(x.date,monthly)).length,db.maintenance.filter(x=>dateMonthMatch(x.date,monthly)&&!['Terminée','Clôturée'].includes(x.status)).length],['Ménage',db.cleaning.filter(x=>dateMonthMatch(x.date,monthly)).length,db.cleaning.filter(x=>dateMonthMatch(x.date,monthly)&&x.overallStatus!=='Conforme').length],['Actions',db.issues.filter(x=>dateMonthMatch(x.date,monthly)).length,db.issues.filter(x=>dateMonthMatch(x.date,monthly)&&!['Terminé','Clôturé'].includes(x.status)).length]])}<h2>Rendez-vous</h2>${tableHTML(['Date','Objet','Lieu','Statut'],db.meetings.filter(x=>dateMonthMatch(x.date,monthly)).map(x=>[fmtDate(x.date),esc(x.title),esc(x.location),badge(x.status)]))}`}
const monthActs=(db.agentActivities||[]).filter(x=>dateMonthMatch(x.date,monthly));if(type==='monthly')html+=`<h2>Activité réalisée par les agents</h2>${tableHTML(['Date','Agent(s)','Type','Travail réalisé','Lieu','Durée'],monthActs.map(x=>[fmtDate(x.date),esc(agentActivityAgentNames(x)),esc(x.type||''),esc(x.title||''),esc([x.building,x.floor,x.room].filter(Boolean).join(' · ')||'—'),esc(agentActivityDurationLabel(x))]))}`;
if(type==='team'){subtitle=teamMonth;const rows=db.agents.filter(a=>a.status==='Actif').map(a=>{let planned=0,actual=0,abs=0,ot=0;const [y,m]=teamMonth.split('-').map(Number),last=new Date(y,m,0).getDate();for(let i=1;i<=last;i++){const d=`${teamMonth}-${pad(i)}`;if([0,6].includes(parseDate(d).getDay()))continue;const info=dayInfo(a.id,d),h=dayHours(info);planned+=h.planned;actual+=h.total;if(isAbsenceType(info.dayType))abs++;ot+=Number(info.overtime||0)}return [esc(agentName(a)),fmtHours(planned),fmtHours(actual),`${actual-planned>=0?'+':''}${fmtHours(actual-planned)}`,abs,fmtHours(ot)]});html=tableHTML(['Agent','Prévu','Réalisé','Écart','Jours absence','Heures ajoutées'],rows)}
if(type==='absence'){subtitle=absMonth;html=tableHTML(['Date','Agent','Motif','Statut','Note'],db.agentDays.filter(x=>dateMonthMatch(x.date,absMonth)&&isAbsenceType(x.dayType)).map(x=>[fmtDate(x.date),esc(agentName(agentById(x.agentId))),badge(x.dayType),badge(x.status||'Validée'),esc(x.note||'')]))}
if(type==='cleaning'){subtitle=cleanMonth;html=tableHTML(['Date','Lieu','Type','Agent','Score','Résultat','Points faibles'],db.cleaning.filter(x=>dateMonthMatch(x.date,cleanMonth)).map(x=>[fmtDate(x.date),esc(`${x.building} ${x.floor} ${x.room}`),esc(x.roomType),esc(agentName(agentById(x.agentId))),`${x.score||0} %`,badge(x.overallStatus),esc((x.tasks||[]).filter(t=>['À reprendre','Non conforme'].includes(t.status)).map(t=>t.name).join(', '))]))}
if(type==='maintenance'){subtitle=maintMonth;html=tableHTML(['N°','Date','Objet','Lieu','Priorité','Assigné','Échéance','Statut'],db.maintenance.filter(x=>dateMonthMatch(x.date,maintMonth)).map(x=>[esc(x.no),fmtDate(x.date),esc(x.title),esc(`${x.building} ${x.room||''}`),badge(x.priority),esc(x.assigned||''),fmtDate(x.dueDate),badge(x.status)]))}
if(type==='periodic'){const ay=activeAcademicYear();subtitle=`Année scolaire ${ay}`;html=tableHTML(['N°','Contrôle','Famille','Bâtiment','Dernier contrôle connu','Échéance de l’année','État','Prestataire'],periodicAcademicYearRowsV165(ay).map(({x,info})=>[esc(x.no),esc(x.name),esc(x.family),esc(x.building),info.lastKnown?fmtDate(info.lastKnown.date):'—',fmtDate(info.due)||(info.coverageEnd&&info.coverageEnd>info.range.end?`Après ${ay} · ${fmtDate(info.coverageEnd)}`:'—'),esc(info.state),esc(info.provider||x.provider||'')]))}
if(type==='vacation'){const id=$('#vacationReportPeriod').value,x=byId('vacations',id)||db.vacations[0];subtitle=x?`${x.name} · ${fmtDate(x.start)} au ${fmtDate(x.end)}`:'Aucune période';html=x?tableHTML(['État','Action'],(x.tasks||[]).map(t=>[t.done?'✓ Fait':'○ À faire',esc(t.text)])):'<p>Aucune période.</p>'}
if(type==='full'){subtitle=`Édité le ${fmtDate(todayISO())}`;html=['team','absence','cleaning','maintenance','periodic','vacation'].map(t=>`<section><h1>${reportTitle(t)}</h1>${reportData(t).html}</section>`).join('')}return {title,subtitle,html,text:stripHTML(html)}}
function stripHTML(h){const d=document.createElement('div');d.innerHTML=h;return d.innerText}
function reportPlainText(report){
 const box=document.createElement('div');box.innerHTML=report.html;
 const lines=[report.title,report.subtitle,''];
 const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
 [...box.children].forEach(node=>{
  if(/^H[1-6]$/.test(node.tagName)){const t=clean(node.textContent);if(t)lines.push('',`=== ${t.toUpperCase()} ===`);return}
  if(node.tagName==='SECTION'){
   const title=clean(node.querySelector('h1,h2,h3')?.textContent);if(title)lines.push('',`=== ${title.toUpperCase()} ===`);
   node.querySelectorAll('table').forEach(table=>appendTable(table));return;
  }
  if(node.tagName==='TABLE'){appendTable(node);return}
  const t=clean(node.textContent);if(t)lines.push(t);
 });
 function appendTable(table){
  const headers=[...table.querySelectorAll('thead th')].map(x=>clean(x.textContent));
  const rows=[...table.querySelectorAll('tbody tr')];
  if(!rows.length){lines.push('Aucune donnée.');return}
  rows.forEach(row=>{
   const cells=[...row.querySelectorAll('td')].map(x=>clean(x.textContent));
   if(cells.length===1&&cells[0]==='Aucune donnée.'){lines.push('Aucune donnée.');return}
   const parts=cells.map((v,k)=>v?`${headers[k]||`Champ ${k+1}`} : ${v}`:'').filter(Boolean);
   if(parts.length)lines.push(`• ${parts.join(' | ')}`);
  });
 }
 return lines.join('\n').replace(/\n{3,}/g,'\n\n').trim();
}
function reportPrintCSS(orientation='landscape'){
 return `@page{size:A4 ${orientation};margin:10mm 8mm 14mm}
 *{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;color:#172b3f;font-size:10px;line-height:1.3;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;background:#fff}
 .print-header{display:flex;align-items:center;gap:12px;border-bottom:3px solid #0875c9;padding-bottom:8px;margin-bottom:12px;break-inside:avoid}.print-header img{width:54px;height:54px;object-fit:contain}.print-header h1{color:#075ca8;margin:0 0 2px;font-size:19px}.print-header p{margin:1px 0;color:#475569}.print-header strong{font-size:11px}.print-subtitle{margin:-5px 0 10px;padding:6px 9px;background:#eef7fd;border:1px solid #cfe6f7;border-radius:7px;color:#31536d;font-size:9px}
 .print-footer{position:fixed;left:0;right:0;bottom:-9mm;border-top:1px solid #cbd5e1;padding-top:3px;font-size:7.5px;color:#64748b;text-align:center}
 h1,h2,h3{color:#075ca8;break-after:avoid}h2{font-size:14px;margin:15px 0 6px;border-bottom:1px solid #cfe2f1;padding-bottom:4px}h3{font-size:12.5px;margin:0 0 6px}p{margin:3px 0}.muted,.hint,small{color:#64748b}
 .panel{border:1px solid #d5e2eb;border-radius:9px;padding:9px;margin:0 0 10px;background:#fff;box-shadow:none;break-inside:auto}.panel-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:6px}.panel-head>p{max-width:55%}
 .summary-grid,.mini-kpis,.team-summary,.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:6px 0}.summary-grid article,.mini-kpis article,.team-summary article,.kpi{border:1px solid #dbe5ed;border-radius:7px;padding:6px;background:#f8fbfd;break-inside:avoid}.summary-grid strong,.mini-kpis strong,.team-summary strong,.kpi strong{display:block;font-size:14px;color:#075ca8}
 .report-table-wrap,.table-wrap{width:100%;overflow:visible!important;margin:6px 0 12px}.report-table,table{border-collapse:collapse;width:100%;table-layout:auto}.report-table thead,table thead{display:table-header-group}.report-table tr,table tr{break-inside:avoid;page-break-inside:avoid}.report-table th,.report-table td,th,td{border:1px solid #b7c5d2;padding:4px 5px;vertical-align:top;overflow-wrap:anywhere}.report-table th,th{background:#dceef9;color:#153c5a;font-weight:700;text-align:left}.report-table tbody tr:nth-child(even) td,tbody tr:nth-child(even) td{background:#f7fafc}.report-table.cols-7,.report-table.cols-8,.report-table.cols-9,.report-table.cols-10{font-size:8.2px}
 /* V147.42 — largeur des colonnes calculée selon le contenu, avec limites A4. */
 .report-table,table{table-layout:auto!important}
 .report-table th,.report-table td,th,td{width:auto!important;max-width:58mm;white-space:normal;overflow-wrap:anywhere;word-break:normal}
 .report-table th:first-child,.report-table td:first-child,table th:first-child,table td:first-child{white-space:nowrap;width:1%;max-width:30mm}
 .report-table th:has(.badge),.report-table td:has(.badge){white-space:nowrap;width:1%}

 .print-maintenance-table .print-col-action{display:none!important}
 .pst-auto-sized-print-table th,.pst-auto-sized-print-table td{white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important;max-width:none!important}

 .badge{display:inline-block;padding:2px 5px;border-radius:6px;background:#e8edf2;white-space:nowrap}.good{background:#dff6e8!important}.bad{background:#ffe0e0!important}.warn{background:#fff0c9!important}.info{background:#dff0ff!important}.empty-cell{text-align:center;color:#64748b;font-style:italic}
 /* Calendrier Congés / RTT / absences */
 .month-board{width:100%;overflow:visible!important;margin:4px 0 10px}.month-grid{display:grid!important;align-items:stretch;width:100%!important;min-width:0!important;gap:0;border-left:1px solid #cbd5e1;border-top:1px solid #cbd5e1}.month-corner,.month-day-head,.month-agent,.month-cell.day-state{border-right:1px solid #cbd5e1!important;border-bottom:1px solid #cbd5e1!important;min-width:0!important;max-width:none!important;width:auto!important;margin:0!important;border-radius:0!important;display:flex!important;align-items:center;justify-content:center;min-height:24px!important;padding:2px!important}.month-corner,.month-agent{justify-content:flex-start!important;text-align:left!important;padding-left:4px!important;background:#f3f7fa!important;font-weight:700;font-size:7.5px;position:static!important}.month-day-head{background:#dceef9!important;font-weight:700;font-size:7px;position:static!important}.month-day-head.weekend{background:#edf2f6!important}.month-cell.day-state{font-size:7px;font-weight:700}.month-cell.day-state span{font-size:7px!important}.month-cell.day-state.standard{background:#dbeafe!important;color:#275a9b!important}.month-cell.day-state.morning{background:#dcfce7!important;color:#166534!important}.month-cell.day-state.evening{background:#ffedd5!important;color:#9a3412!important}.month-cell.day-state.leave{background:#bbf7d0!important;color:#166534!important}.month-cell.day-state.rtt{background:#93c5fd!important;color:#1e3a8a!important}.month-cell.day-state.sick{background:#fecaca!important;color:#991b1b!important}.month-cell.day-state.holiday{background:#fef08a!important;color:#854d0e!important}.month-cell.day-state.off{background:#eef1f4!important;color:#6b7280!important}.month-cell.day-state.other{background:#ede9fe!important;color:#5b21b6!important}
 /* Roulements */
 .rotation-preview{display:grid;gap:7px}.rotation-month{display:block;border:1px solid #dbe5ed;border-radius:7px;padding:6px;margin-bottom:7px;break-inside:avoid}.rotation-month>strong{display:block;margin-bottom:4px;text-transform:capitalize}.rotation-month>div{display:grid!important;grid-template-columns:repeat(31,1fr)!important;gap:1px!important;overflow:visible!important}.rotation-day{min-width:0!important;min-height:25px!important;padding:1px!important;border:1px solid #d8e1e8;border-radius:3px!important;font-size:6.5px!important;display:flex;flex-direction:column;align-items:center;justify-content:center}.rotation-day small{font-size:5.5px}.rotation-day.standard{background:#dbeafe!important}.rotation-day.morning{background:#dcfce7!important}.rotation-day.evening{background:#ffedd5!important}.rotation-day.leave{background:#bbf7d0!important}.rotation-day.rtt{background:#93c5fd!important}.rotation-day.sick{background:#fecaca!important}.rotation-day.holiday{background:#fef08a!important}.rotation-day.off{background:#eef1f4!important}
 /* Calendriers et cartes */
 .personal-calendar{display:grid!important;grid-template-columns:repeat(7,1fr)!important;gap:4px!important;overflow:visible!important}.personal-day{min-height:70px!important;border:1px solid #dbe5ed;border-radius:5px;padding:4px;break-inside:avoid}.cal-event{display:block;border-left:3px solid #7758b3;background:#f0eaff!important;border-radius:4px;padding:3px;margin:2px 0;font-size:7px}.cal-event.task{background:#fff3df!important}.cal-event.urgent{background:#ffe9ec!important}
 .team-week-cards{display:grid!important;grid-template-columns:repeat(7,1fr)!important;gap:3px!important;min-width:0!important}.team-day-card{border:1px solid #dbe5ed;border-radius:5px;padding:4px;min-height:0!important;break-inside:avoid}.team-agent-entry{display:block!important;border-left:2px solid #2a9d6c;padding:3px;font-size:7px}.agent-entry-avatar,.agent-entry-arrow,.agent-delta{display:none!important}
 .vacation-grid,.periodic-grid,.document-grid,.notes-board,.dashboard-grid,.agent-grid,.report-grid,.settings-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}.card,.vacation-card,.note-card,.document-card,.periodic-card{break-inside:avoid;border:1px solid #dbe5ed;border-radius:7px;padding:7px}
 .desktop-table{display:block!important}.mobile-cards{display:none!important}.print-field{display:inline-block;min-width:40px;padding:2px 4px;border:1px solid #d5dde5;border-radius:4px;background:#f8fafc}
 section{break-before:auto}a{color:inherit;text-decoration:none}img{max-width:100%}
 @media print{.filters,.section-actions,.panel-actions,.file-label,.fab,.no-print,input,select,textarea,button:not(.print-data-cell){display:none!important}.panel{box-shadow:none!important}}
 `;
}

function autoSizePrintTables(w){
 try{
  const doc=w.document;
  [...doc.querySelectorAll('table')].forEach(table=>{
   const rows=[...table.rows];
   if(!rows.length)return;
   const colCount=Math.max(...rows.map(r=>r.cells.length||0));
   if(!colCount)return;

   // Colonnes réellement imprimées.
   const visibleCols=[];
   for(let c=0;c<colCount;c++){
    const cells=rows.map(r=>r.cells[c]).filter(Boolean);
    if(cells.some(cell=>w.getComputedStyle(cell).display!=='none'))visibleCols.push(c);
   }
   if(!visibleCols.length)return;

   const scores=visibleCols.map(c=>{
    const cells=rows.slice(0,80).map(r=>r.cells[c]).filter(Boolean);
    const lengths=cells.map(cell=>{
      const text=(cell.innerText||cell.textContent||'').replace(/\s+/g,' ').trim();
      // longueur utile plafonnée : évite qu'une description très longue écrase toutes les colonnes.
      return Math.min(60,Math.max(2,text.length));
    });
    const max=Math.max(2,...lengths);
    const avg=lengths.length?lengths.reduce((s,n)=>s+n,0)/lengths.length:2;
    return Math.max(3,Math.min(32,avg*.65+max*.35));
   });
   const minPct=visibleCols.length>=9?5:visibleCols.length>=7?6:7;
   let widths=scores.map(s=>Math.max(minPct,s));
   const sum=widths.reduce((s,n)=>s+n,0);
   widths=widths.map(n=>n/sum*100);

   // Rééquilibrage : aucune colonne ne peut monopoliser la page.
   const maxPct=visibleCols.length>=9?26:visibleCols.length>=7?30:38;
   let excess=0;
   widths=widths.map(n=>{if(n>maxPct){excess+=n-maxPct;return maxPct}return n});
   if(excess>0){
    const receivers=widths.map((n,i)=>n<maxPct?i:-1).filter(i=>i>=0);
    const capacity=receivers.reduce((s,i)=>s+(maxPct-widths[i]),0);
    if(capacity>0)receivers.forEach(i=>{widths[i]+=excess*((maxPct-widths[i])/capacity)});
   }

   table.style.tableLayout='fixed';
   table.style.width='100%';
   let cg=table.querySelector(':scope > colgroup.pst-auto-print-cols');
   if(!cg){
    cg=doc.createElement('colgroup');cg.className='pst-auto-print-cols';
    table.insertBefore(cg,table.firstChild);
   }
   cg.innerHTML='';
   for(let c=0;c<colCount;c++){
    const col=doc.createElement('col');
    const vi=visibleCols.indexOf(c);
    if(vi>=0)col.style.width=`${widths[vi].toFixed(2)}%`;
    else col.style.width='0';
    cg.appendChild(col);
   }
   table.classList.add('pst-auto-sized-print-table');
  });
 }catch(error){console.warn('Largeur automatique impression',error)}
}

function waitAndPrint(w){
 const run=()=>{try{autoSizePrintTables(w);w.focus();setTimeout(()=>w.print(),80)}catch(e){console.error(e)}};
 const imgs=[...w.document.images];let pending=imgs.filter(x=>!x.complete).length;
 if(!pending){setTimeout(run,250);return}
 imgs.forEach(img=>{if(!img.complete){img.onload=img.onerror=()=>{pending--;if(pending<=0)setTimeout(run,180)}}});
 setTimeout(run,1600);
}
function printReport(type){
 const r=reportData(type),orientation=db.settings.printOrientation||'landscape',w=window.open('','_blank');
 if(!w){toast('Autorisez les fenêtres contextuelles pour imprimer');return}
 w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(r.title)}</title><style>${reportPrintCSS(orientation)}</style></head><body><header class="print-header"><img src="${appLogoURL()}"><div><h1>${esc(db.settings.appName)}</h1><p>${esc(db.settings.schoolName)}</p><strong>${esc(r.title)} — ${esc(r.subtitle)}</strong></div></header><main>${r.html}</main><footer class="print-footer">${esc(db.settings.appName)} — V${APP_VERSION} — imprimé le ${new Date().toLocaleString('fr-FR')}</footer></body></html>`);
 w.document.close();waitAndPrint(w);
}
function printableViewHTML(view){
 const clone=view.cloneNode(true);
 if(view.id==='maintenance'){
   const table=clone.querySelector('table');
   if(table){
     table.classList.add('print-maintenance-table');
     const widths=['no','date','location','family','subject','priority','assigned','due','status','action'];
     table.querySelectorAll('tr').forEach(row=>[...row.cells].forEach((cell,i)=>cell.classList.add(`print-col-${widths[i]||i}`)));
   }
 }
 // Les cases de calendriers sont des <button> à l'écran : en impression on les convertit
 // en cellules statiques afin qu'elles ne disparaissent jamais avec les contrôles interactifs.
 clone.querySelectorAll('.month-cell.day-state,.rotation-day,.personal-cal-event,.personal-month-day-head').forEach(btn=>{
  if(btn.tagName==='BUTTON'){
   const div=document.createElement('div');div.className=btn.className+' print-data-cell';div.innerHTML=btn.innerHTML;
   for(const a of [...btn.attributes]){if(a.name==='style'||a.name.startsWith('data-'))div.setAttribute(a.name,a.value)}
   btn.replaceWith(div);
  }
 });
 clone.querySelectorAll('button,.filters,.section-actions,.panel-actions,.file-label,.fab').forEach(x=>x.remove());
 const originals=[...view.querySelectorAll('input,select,textarea')],copies=[...clone.querySelectorAll('input,select,textarea')];
 copies.forEach((el,k)=>{const src=originals[k],span=document.createElement('span');span.className='print-field';span.textContent=src?.tagName==='SELECT'?src.options[src.selectedIndex]?.text||'':(src?.value||'');el.replaceWith(span)});
 clone.querySelectorAll('.hidden').forEach(x=>x.remove());return clone.innerHTML;
}
function printView(viewId){
 const view=document.getElementById(viewId)||document.querySelector('.view.active');if(!view)return;
 const orientation=db.settings.printOrientation||'landscape',w=window.open('','_blank');if(!w){toast('Autorisez les fenêtres contextuelles pour imprimer');return}
 const title=VIEW_TITLES[view.id]||'Impression';
 const filterLabels=[...view.querySelectorAll('.filters input,.filters select')].map(el=>{if(el.tagName==='SELECT')return el.options[el.selectedIndex]?.text||'';if(el.type==='month'&&el.value){const [y,m]=el.value.split('-');return new Date(Number(y),Number(m)-1,1).toLocaleDateString('fr-FR',{month:'long',year:'numeric'})}if(el.type==='date'&&el.value)return fmtDate(el.value);return el.value||''}).filter(Boolean);
 const subtitle=filterLabels.length?filterLabels.join(' · '):'';
 const days=view.id==='absences'?new Date(Number(($('#absenceMonth').value||monthISO()).slice(0,4)),Number(($('#absenceMonth').value||monthISO()).slice(5,7)),0).getDate():31;
 const specialCss=view.id==='absences'?`.month-grid{grid-template-columns:26mm repeat(${days},1fr)!important}.month-corner,.month-agent{font-size:6.6px!important}.month-day-head,.month-cell.day-state,.month-cell.day-state span{font-size:6px!important;min-height:22px!important}`:'';
 w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${reportPrintCSS(orientation)}${specialCss}</style></head><body><header class="print-header"><img src="${appLogoURL()}"><div><h1>${esc(db.settings.appName)}</h1><p>${esc(db.settings.schoolName)}</p><strong>${esc(title)}</strong></div></header>${subtitle?`<div class="print-subtitle"><strong>Filtres imprimés :</strong> ${esc(subtitle)}</div>`:''}<main>${printableViewHTML(view)}</main><footer class="print-footer">${esc(db.settings.appName)} — V${APP_VERSION} — imprimé le ${new Date().toLocaleString('fr-FR')}</footer></body></html>`);
 w.document.close();waitAndPrint(w);
}

/* ---------- V58 : PDF planning collectif / individuel ---------- */
function planningDisplayFor(agent,date){
 const info=dayInfo(agent.id,date),day=String(info.dayType||'Présence'),shift=String(info.shift||'').replace('Planning de référence','Standard');
 if(/maladie/i.test(day))return {text:day,shift:day,kind:'sick'};
 if(/congé|conge/i.test(day))return {text:day,shift:day,kind:'leave'};
 if(/rtt/i.test(day))return {text:day,shift:day,kind:'rtt'};
 if(/férié|ferie|rfe/i.test(day))return {text:day,shift:day,kind:'holiday'};
 if(day==='Repos'||isAbsenceType(day))return {text:day||'Repos',shift:day||'Repos',kind:'off'};
 if(day==='Formation')return {text:'Formation',shift:'Formation',kind:'info'};
 const theoretical=(info.plannedStart&&info.plannedEnd)?`${info.plannedStart}–${info.plannedEnd}`:'Non planifié';
 const hasCompleteReal=!!(info.actualStart&&info.actualEnd);
 const realChanged=hasCompleteReal&&(info.actualStart!==info.plannedStart||info.actualEnd!==info.plannedEnd);
 const hours=realChanged?`${info.actualStart}–${info.actualEnd}`:theoretical;
 return {text:hours,shift:shift||'Standard',kind:shift==='Matin'?'morning':shift==='Soir'?'evening':'standard',
   realChanged,theoretical,real:hasCompleteReal?`${info.actualStart}–${info.actualEnd}`:'',note:info.note||''};
}
function planningPrintCSS(){
 return `${reportPrintCSS('landscape')}.service-title{text-align:center;margin:0 0 12px}.service-title h1{font-size:18px;margin:0;color:#1f2937}.service-title p{margin:3px 0;color:#475569}.service-grid{border-collapse:collapse;width:100%;table-layout:fixed;font-size:9.5px}.service-grid th,.service-grid td{border:1px solid #6b7280;padding:5px 4px;text-align:center;vertical-align:middle}.service-grid th{background:#e5e7eb;color:#111827}.service-grid .agent-col{text-align:left;font-weight:700;width:18%}.service-grid td.shift-morning{background:#dcfce7}.service-grid td.shift-evening{background:#ffedd5}.service-grid td.shift-standard{background:#dbeafe}.service-grid td.shift-off{background:#f3f4f6;color:#6b7280}.legend{display:flex;gap:12px;justify-content:center;margin:8px 0 12px;font-size:9px}.legend span{padding:3px 8px;border-radius:999px;border:1px solid #cbd5e1}.legend .m{background:#dcfce7}.legend .s{background:#ffedd5}.legend .std{background:#dbeafe}.legend .leave{background:#bbf7d0}.legend .rtt{background:#93c5fd}.legend .sick{background:#fecaca}.legend .holiday{background:#fef08a}.legend .off{background:#f3f4f6}.service-grid td.shift-leave{background:#bbf7d0}.service-grid td.shift-rtt{background:#93c5fd}.service-grid td.shift-sick{background:#fecaca}.service-grid td.shift-holiday{background:#fef08a}.individual-grid{border-collapse:collapse;width:100%;font-size:10.5px}.individual-grid th,.individual-grid td{border:1px solid #9ca3af;padding:6px}.individual-grid th{background:#e5e7eb}.agent-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0 14px}.agent-summary div{border:1px solid #cbd5e1;border-radius:6px;padding:7px}.agent-summary small{display:block;color:#64748b}.agent-summary strong{display:block;margin-top:2px}.individual-grid tr.shift-morning td{background:#dcfce7}.individual-grid tr.shift-evening td{background:#ffedd5}.individual-grid tr.shift-standard td{background:#dbeafe}.individual-grid tr.shift-leave td{background:#bbf7d0}.individual-grid tr.shift-rtt td{background:#93c5fd}.individual-grid tr.shift-sick td{background:#fecaca}.individual-grid tr.shift-holiday td{background:#fef08a}.individual-grid tr.shift-off td{background:#f3f4f6;color:#6b7280}`;
}
function openPlanningPrint(title,subtitle,body,orientation='landscape'){
 const w=window.open('','_blank'); if(!w){toast('Autorisez les fenêtres contextuelles pour générer le PDF');return}
 w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${planningPrintCSS()}</style></head><body><header class="print-header"><img src="${appLogoURL()}"><div><h1>${esc(db.settings.schoolName||db.settings.appName)}</h1><p>${esc(db.settings.appName)}</p><strong>${esc(title)}</strong><p>${esc(subtitle)}</p></div></header>${body}<footer class="print-footer">${esc(db.settings.appName)} — V${APP_VERSION} — généré le ${new Date().toLocaleString('fr-FR')} — année scolaire ${esc(activeAcademicYear())}</footer></body></html>`);
 w.document.close();waitAndPrint(w);
}
function generateCollectivePlanningPDF(){
 const picked=$('#collectivePlanningDate')?.value||todayISO(),start=startOfWeek(picked);
 const active=db.agents.filter(a=>a.status==='Actif');
 // Lundi-vendredi par défaut ; on ajoute samedi/dimanche uniquement si au moins un agent y travaille réellement.
 let dates=[0,1,2,3,4].map(i=>addDays(start,i));
 const weekend=[addDays(start,5),addDays(start,6)];
 for(const d of weekend){if(active.some(a=>{const x=planningDisplayFor(a,d);return x.kind!=='off'&&x.text!=='Non planifié'}))dates.push(d)}
 const head=dates.map(d=>`<th>${parseDate(d).toLocaleDateString('fr-FR',{weekday:'long'})}<br><small>${fmtDate(d)}</small></th>`).join('');
 const rows=active.map(a=>`<tr><td class="agent-col">${esc(agentName(a))}</td>${dates.map(d=>{const x=planningDisplayFor(a,d);return `<td class="shift-${x.kind}"><strong>${esc(x.text)}</strong><br><small>${esc(x.shift)}</small></td>`}).join('')}</tr>`).join('');
 const body=`<div class="service-title"><h1>Service général — Maintenance — Accueil</h1><p>Planning collectif — semaine type</p></div><div class="legend"><span class="std">Standard</span><span class="m">Matin</span><span class="s">Soir</span><span class="leave">Congé</span><span class="rtt">RTT</span><span class="sick">Maladie</span><span class="holiday">Jour férié</span><span class="off">Repos</span></div><table class="service-grid"><thead><tr><th class="agent-col">Agent</th>${head}</tr></thead><tbody>${rows||'<tr><td colspan="8">Aucun agent actif.</td></tr>'}</tbody></table>`;
 openPlanningPrint('Planning collectif',`Du ${fmtDate(dates[0])} au ${fmtDate(dates.at(-1))}`,body,'landscape');
}
function generateIndividualPlanningPDF(){
 const agentId=$('#individualPlanningAgent')?.value,agent=agentById(agentId);if(!agent){toast('Choisissez un agent');return}
 const from=$('#individualPlanningFrom')?.value,to=$('#individualPlanningTo')?.value;if(!from||!to){toast('Choisissez les dates du et au');return}if(to<from){toast('La date de fin doit être après la date de début');return}
 const dates=[];for(let d=from;d<=to;d=addDays(d,1)){dates.push(d);if(dates.length>400)break}
 const rows=dates.map(d=>{const info=dayInfo(agent.id,d),x=planningDisplayFor(agent,d),detail=x.realChanged?`Réel : ${x.real} · Théorique : ${x.theoretical}`:x.text;return `<tr class="shift-${x.kind}"><td>${fmtDate(d)}</td><td>${parseDate(d).toLocaleDateString('fr-FR',{weekday:'long'})}</td><td>${esc(x.shift)}</td><td>${esc(detail)}</td><td>${esc(info.dayType||'Présence')}</td><td>${esc(info.note||'')}</td></tr>`}).join('');
 const activeR=(db.rotations||[]).filter(r=>String(r.agentId)===String(agent.id)&&(!r.effectiveTo||r.effectiveTo>=from)&&(!r.effectiveFrom||r.effectiveFrom<=to));
 const mode=activeR.length?'Roulement':'Standard';
 const body=`<div class="service-title"><h1>Planning individuel</h1><p>Document à remettre à l’agent</p></div><div class="agent-summary"><div><small>Agent</small><strong>${esc(agentName(agent))}</strong></div><div><small>Période</small><strong>${fmtDate(from)} → ${fmtDate(to)}</strong></div><div><small>Mode horaire</small><strong>${esc(mode)}</strong></div></div><table class="individual-grid"><thead><tr><th>Date</th><th>Jour</th><th>Profil / roulement</th><th>Horaire applicable</th><th>Situation</th><th>Observation</th></tr></thead><tbody>${rows}</tbody></table><p style="margin-top:18px;font-size:9px;color:#64748b">Pour un agent en roulement, seuls les horaires du roulement réellement applicables à chaque date sont utilisés. Aucun horaire Standard de secours n’est substitué.</p>`;
 openPlanningPrint(`Planning individuel — ${agentName(agent)}`,`Du ${fmtDate(from)} au ${fmtDate(to)} · année scolaire ${activeAcademicYear()}`,body,'landscape');
}

function prepareEmail(type){
 const r=reportData(type),plain=reportPlainText(r);
 $('#mailTo').value=db.settings.emailsTo||'';$('#mailCc').value=db.settings.emailsCc||'';$('#mailBcc').value=db.settings.emailsBcc||'';
 $('#mailSubject').value=`${db.settings.emailSubjectPrefix||db.settings.appName} — ${r.title} — ${r.subtitle}`;
 $('#mailMessage').value=`Bonjour,\n\nVoici le compte rendu préparé depuis ${db.settings.appName}.\n\n${plain}\n\nCordialement.`;
 const d=$('#emailModal');if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','');
}
async function openMailClient(){
 const to=normalizeEmails($('#mailTo').value),cc=normalizeEmails($('#mailCc').value),bcc=normalizeEmails($('#mailBcc').value),subject=$('#mailSubject').value,body=$('#mailMessage').value;
 const params=new URLSearchParams();if(to)params.set('to',to);if(cc)params.set('cc',cc);if(bcc)params.set('bcc',bcc);params.set('subject',subject);
 // Outlook Web accepte mieux les longs rapports lorsqu'ils sont collés dans le corps après ouverture.
 if(body.length>5000){try{await navigator.clipboard.writeText(body);toast('Message copié : collez-le dans Outlook');window.open(`https://outlook.office.com/mail/deeplink/compose?${params.toString()}`,'_blank','noopener');return}catch(e){console.warn(e)}}
 location.href=`mailto:${encodeURIComponent(to)}?cc=${encodeURIComponent(cc)}&bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
function csvEscape(v){v=String(v??'');return /[;"\n]/.test(v)?`"${v.replace(/"/g,'""')}"`:v}
function triggerDownloadBlob(name,blob){
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=name;a.rel='noopener';a.target='_blank';a.style.display='none';document.body.appendChild(a);
 let automatic=false;try{a.click();automatic=true}catch(error){console.warn('Téléchargement automatique bloqué',error)}
 let box=document.getElementById('downloadFallbackBox');
 if(!box){box=document.createElement('div');box.id='downloadFallbackBox';box.className='download-ready-panel';document.body.appendChild(box)}
 box.innerHTML='';
 const text=document.createElement('div');text.className='download-ready-text';text.innerHTML=`<strong>Fichier prêt</strong><small>${esc(name)}</small>`;
 const actions=document.createElement('div');actions.className='download-ready-actions';
 const link=document.createElement('a');link.href=url;link.download=name;link.target='_blank';link.rel='noopener';link.className='download-ready-link';link.textContent='⬇️ Télécharger maintenant';
 actions.appendChild(link);
 if(navigator.share&&typeof File!=='undefined'){
  const share=document.createElement('button');share.type='button';share.className='download-share';share.textContent='Partager / enregistrer';
  share.onclick=async()=>{try{const file=new File([blob],name,{type:blob.type||'application/octet-stream'});if(!navigator.canShare||navigator.canShare({files:[file]}))await navigator.share({files:[file],title:name})}catch(error){if(error?.name!=='AbortError')console.warn('Partage impossible',error)}};
  actions.appendChild(share);
 }
 const close=document.createElement('button');close.type='button';close.className='download-ready-close';close.textContent='×';close.onclick=()=>box.remove();
 box.append(text,actions,close);
 setTimeout(()=>a.remove(),1000);
 // L'URL reste disponible 10 minutes afin que l'utilisateur puisse toucher le bouton sur mobile.
 setTimeout(()=>{URL.revokeObjectURL(url);if(document.body.contains(box))box.remove()},600000);
 return automatic;
}
function downloadText(name,text,type='text/plain;charset=utf-8'){
 const blob=new Blob(['\ufeff',text],{type});return triggerDownloadBlob(name,blob);
}

function exportAcademicRange(){
  return academicYearRange(activeAcademicYear());
}
function exportDateOfRecord(x){
  return normalizeDateValue(
    x?.date || x?.start || x?.dateFrom || x?.dueDate || x?.createdAt ||
    x?.injectedAt || x?.reportDate || x?.effectiveFrom || x?.updatedAt || ''
  );
}
function exportRecordInActiveAcademicYear(x){
  const r=exportAcademicRange();
  const d=exportDateOfRecord(x);
  if(!d)return true;
  return d>=r.start&&d<=r.end;
}
function exportRowsForAcademicYear(rows){
  return (Array.isArray(rows)?rows:[]).filter(exportRecordInActiveAcademicYear);
}

function exportStyledExcel(module){
 const titles={agents:'Agents',agentDays:'Horaires, congés et absences',rotations:'Roulements',weeklyPlans:'Horaires hebdomadaires',cleaning:'Contrôles ménage',maintenance:'Maintenance',requests:'Demandes direction',works:'Chantiers et GPA',meetings:'Réunions',issues:'Sécurité et qualité',periodic:'Contrôles périodiques',notes:'Bloc-notes',vacations:'Vacances',documents:'Documentation'};
 const map={agents:[['Prénom','firstName'],['Nom','lastName'],['Fonction','role'],['Heures / semaine','weeklyHours'],['Affectation','assignment'],['Statut','status']],agentDays:[['Date','date'],['Agent','agentId'],['Journée','dayType'],['Début prévu','plannedStart'],['Fin prévue','plannedEnd'],['Début réel','actualStart'],['Fin réelle','actualEnd'],['Pause','pause'],['Heures +/-','overtime'],['Statut','status'],['Note','note']],rotations:[['Agent','agentId'],['Date d’effet','effectiveFrom'],['Commence par','startShift'],['Semaines matin','morningWeeks'],['Semaines soir','eveningWeeks'],['Fin','effectiveTo'],['Notes','notes']],cleaning:[['N°','no'],['Date','date'],['Bâtiment','building'],['Étage','floor'],['Zone','roomType'],['Local','room'],['Agent','agentId'],['Score','score'],['Résultat','overallStatus'],['Commentaire','comment']],maintenance:[['N°','no'],['Date','date'],['Titre','title'],['Domaine','family'],['Priorité','priority'],['Statut','status'],['Lieu','room'],['Affecté à','assigned'],['Échéance','dueDate'],['Action','action']],requests:[['N°','no'],['Date','date'],['Type','type'],['Titre','title'],['Priorité','priority'],['Statut','status'],['Lieu','room'],['Demandeur','requester'],['Échéance','dueDate']],works:[['N°','no'],['Date','date'],['Type','type'],['Titre','title'],['Entreprise','company'],['Bâtiment','building'],['Statut','status'],['Échéance','dueDate'],['Fin GPA','gpaEnd']],meetings:[['N°','no'],['Date','date'],['Heure','time'],['Type','type'],['Titre','title'],['Lieu','location'],['Participants','participants'],['Statut','status']],issues:[['N°','no'],['Date','date'],['Catégorie','category'],['Agent','agentId'],['Titre','title'],['Priorité','priority'],['Statut','status'],['Échéance','dueDate'],['Action','action']],periodic:[['N°','no'],['Contrôle','name'],['Famille','family'],['Périodicité (mois)','intervalMonths'],['Périodicité / précision','periodicityText'],['Bâtiment','building'],['Dernier contrôle','lastDate'],['Prochaine date','nextDate'],['Statut','status'],['Prestataire','provider']],notes:[['N°','no'],['Date','date'],['Catégorie','category'],['Titre','title'],['Priorité','priority'],['Statut','status'],['Échéance','dueDate'],['Texte','text']],vacations:[['Période','name'],['Zone','zone'],['Début','start'],['Fin','end'],['Statut','status'],['Notes','notes']],documents:[['N°','no'],['Date','date'],['Titre','title'],['Catégorie','category'],['Module','linkedModule'],['Description','description']]};
 let defs=map[module]||[],rows=db[module]||[];
 if(module==='weeklyPlans'){defs=[['Agent','agent'],['Profil','shift'],['Lundi','d1'],['Mardi','d2'],['Mercredi','d3'],['Jeudi','d4'],['Vendredi','d5']];rows=(db.weeklyPlans||[]).map(p=>{const r={agent:agentName(agentById(p.agentId))||p.agent,shift:p.shift};for(let d=1;d<=5;d++){const x=p.dayProfiles?.[d]||{};r['d'+d]=x.start&&x.end?`${x.start}-${x.end} — ${x.missions||''}`:'Repos'}return r})}
 const value=(r,k)=>k==='agentId'?agentName(agentById(r[k])):(r[k]??'');
 const aoa=[[titles[module]||module],[`Pilotage Service Technique — export du ${new Date().toLocaleString('fr-FR')}`],[],defs.map(d=>d[0]),...rows.map(r=>defs.map(d=>value(r,d[1])))];
 const filename=`${(titles[module]||module).replace(/\s+/g,'_')}_${todayISO()}.xlsx_${activeAcademicYear()}`;
 if(window.XLSX){
  const wb=XLSX.utils.book_new(),ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols']=defs.map((d,i)=>({wch:Math.min(45,Math.max(12,d[0].length+4,...rows.slice(0,100).map(r=>String(value(r,d[1])??'').length+2)))}));
  ws['!autofilter']={ref:`A4:${XLSX.utils.encode_col(Math.max(0,defs.length-1))}${Math.max(4,rows.length+4)}`};
  XLSX.utils.book_append_sheet(wb,ws,(titles[module]||'Rapport').slice(0,31));
  const data=XLSX.write(wb,{bookType:'xlsx',type:'array',compression:true});
  triggerDownloadBlob(filename,new Blob([data],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
 }else{
  const csv=aoa.map(row=>row.map(csvEscape).join(';')).join('\n');downloadText(filename.replace('.xlsx','.csv'),csv,'text/csv;charset=utf-8');
 }
 toast('Fichier prêt — touchez « Télécharger maintenant »');
}
function exportCSV(module){
 const map={
  agents:['firstName','lastName','role','weeklyHours','email','phone','assignment','status'],
  agentDays:['date','agentId','dayType','plannedStart','plannedEnd','actualStart','actualEnd','pause','overtime','status','note'],
  cleaning:['no','date','time','building','floor','roomType','room','agentId','score','overallStatus','comment'],
  maintenance:['no','date','title','family','priority','status','building','floor','room','requester','assigned','dueDate','cost','description','action'],
  requests:['no','date','type','title','priority','status','building','room','requester','dueDate','description','response'],
  works:['no','date','type','title','company','architect','building','priority','status','dueDate','gpaEnd','description','decision'],
  meetings:['no','date','time','end','type','title','location','participants','status','notes','actions'],
  issues:['no','date','category','agentId','title','priority','status','owner','dueDate','cost','description','action'],
  periodic:['no','name','family','intervalMonths','periodicityText','building','floor','sector','room','lastDate','nextDate','status','provider','register','requirement','notes'],
  notes:['no','date','category','agentId','title','priority','status','dueDate','text'],
  vacations:['name','zone','start','end','status','notes'],
  agentActivities:['no','date','durationMode','start','end','agentIds','type','title','building','floor','sector','room','details','result','maintenanceId','requestId','notes'],
  documents:['no','date','title','category','linkedModule','description']
 };
 const keys=map[module]||Object.keys(db[module]?.[0]||{}).filter(k=>!['id','attachments','tasks','items'].includes(k));
 const rows=db[module]||[];
 const cell=(r,k)=>{
   if(k==='agentId')return agentName(agentById(r[k]));
   if(module==='agentActivities'&&k==='agentIds')return agentActivityAgentNames(r);
   if(module==='agentActivities'&&k==='durationMode')return agentActivityDurationLabel(r);
   return r[k];
 };
 downloadText(`${module}-${todayISO()}.csv`,[keys.join(';'),...rows.map(r=>keys.map(k=>csvEscape(cell(r,k))).join(';'))].join('\n'),'text/csv;charset=utf-8');
}
/* ---------- Initialisation des listes et rendu global ---------- */
function fillSelect(id,items,keep=true){const e=document.getElementById(id);if(!e)return;const old=keep?e.value:'';const first=e.querySelector('option[value=""]')?.outerHTML||'';e.innerHTML=first+selectOptions(items,old)}
function hydrateSelects(){fillSelect('personalType',db.lists.personalTypes);fillSelect('personalStatus',db.lists.generalStatuses);for(const id of ['rotationAgent','planningAgent','absenceAgent','issueAgent']){const e=$(`#${id}`);if(e){const old=e.value;e.innerHTML='<option value="">Tous les agents</option>'+agentOptions(old).replace('<option value="">Choisir un agent</option>','')}}renderActivityAgentFilter();
fillSelect('activityTypeFilter',AGENT_ACTIVITY_TYPES);
fillSelect('planningSignal',['Conforme','Heures supplémentaires','Heures manquantes','Absence']);fillSelect('absenceType',db.lists.dayTypes.filter(isAbsenceType));fillSelect('absenceStatus',['Demandée','Validée','Refusée','Annulée']);fillSelect('issueCategory',db.lists.issueCategories);fillSelect('issueStatus',db.lists.generalStatuses);fillSelect('periodicFamily',db.lists.periodicFamilies);fillSelect('periodicStatus',['Réalisé','À jour','À faire','À prévoir','Prévu','Non renseigné','Pas prévu','À planifier','Planifié','Clôturé','En attente','Non applicable']);const pb=$('#periodicBuilding');if(pb){const old=pb.value;pb.innerHTML='<option value="">Tous les bâtiments</option>'+buildingOptions(old)}const cb=$('#cleanBuilding');if(cb){const old=cb.value;cb.innerHTML='<option value="">Tous les bâtiments</option>'+buildingOptions(old)}fillSelect('cleanRoomType',db.lists.roomTypes);fillSelect('cleanStatus',db.lists.cleaningStatuses);fillSelect('cleaningGuideType',Object.keys(GUIDE));fillSelect('maintenanceStatus',db.lists.maintenanceStatuses);fillSelect('maintenancePriority',db.lists.priorities);fillSelect('maintenanceFamily',db.lists.maintenanceFamilies);fillSelect('requestStatus',db.lists.generalStatuses);fillSelect('requestType',db.lists.requestTypes);fillSelect('workStatus',db.lists.generalStatuses);fillSelect('workType',db.lists.workTypes);fillSelect('meetingType',db.lists.meetingTypes);fillSelect('noteCategory',db.lists.noteCategories);fillSelect('notePriority',db.lists.priorities);fillSelect('noteStatus',db.lists.generalStatuses);fillSelect('documentCategory',db.lists.documentCategories);const vp=$('#vacationReportPeriod');if(vp){const old=vp.value;vp.innerHTML=selectOptions(db.vacations,old,x=>`${x.name} — ${fmtDate(x.start)}`,x=>x.id)}const csv=$('#csvModule');if(csv){const opts=[['agents','Agents'],['agentDays','Horaires, congés et absences'],['agentActivities','Activité des agents'],['cleaning','Contrôles ménage'],['maintenance','Maintenance'],['requests','Demandes direction'],['works','Chantiers / GPA'],['meetings','Réunions'],['issues','Sécurité / qualité'],['periodic','Contrôles périodiques'],['notes','Notes'],['vacations','Vacances'],['documents','Documents']];const old=csv.value;csv.innerHTML=selectOptions(opts,old,x=>x[1],x=>x[0])}}
function renderReportPreview(){if(!$('#reportPreview'))return;const r=reportData('daily');$('#reportPreview').innerHTML=`<h3>${esc(r.title)} — ${esc(r.subtitle)}</h3>${r.html}`}

const DAILY_MOTIVATION_SAYINGS=["Chaque jour fait avancer quand on garde le cap.","Chaque jour simplifie le chemin quand on ne lâche pas l’objectif.","Chaque jour construit du solide quand on apprend de chaque étape.","Un petit pas ouvre la voie quand on avance avec méthode.","Un petit pas transforme l’effort quand on transforme les difficultés en étapes.","Un petit pas fait gagner du temps quand on choisit d’avancer.","La constance renforce le résultat quand on reste concentré sur l’essentiel.","La constance prépare la réussite quand on fait simplement le prochain pas utile.","La constance rend l’objectif plus proche quand on travaille avec soin.","Le courage simplifie le chemin quand on agit avec régularité.","Le courage construit du solide quand on garde le cap.","La patience fait avancer quand on ne lâche pas l’objectif.","La patience transforme l’effort quand on apprend de chaque étape.","La patience fait gagner du temps quand on avance avec méthode.","L’attention ouvre la voie quand on transforme les difficultés en étapes.","L’attention prépare la réussite quand on choisit d’avancer.","L’attention rend l’objectif plus proche quand on reste concentré sur l’essentiel.","Une bonne méthode renforce le résultat quand on fait simplement le prochain pas utile.","Une bonne méthode donne de l’élan quand on travaille avec soin.","Le travail régulier fait avancer quand on agit avec régularité.","Le travail régulier transforme l’effort quand on garde le cap.","Le travail régulier construit du solide quand on ne lâche pas l’objectif.","La persévérance ouvre la voie quand on apprend de chaque étape.","La persévérance prépare la réussite quand on avance avec méthode.","La persévérance fait gagner du temps quand on transforme les difficultés en étapes.","Une priorité claire renforce le résultat quand on choisit d’avancer.","Une priorité claire donne de l’élan quand on reste concentré sur l’essentiel.","Une priorité claire rend l’objectif plus proche quand on fait simplement le prochain pas utile.","Le calme simplifie le chemin quand on travaille avec soin.","Le calme construit du solide quand on agit avec régularité.","L’organisation ouvre la voie quand on garde le cap.","L’organisation transforme l’effort quand on ne lâche pas l’objectif.","L’organisation fait gagner du temps quand on apprend de chaque étape.","Chaque effort renforce le résultat quand on avance avec méthode.","Chaque effort prépare la réussite quand on transforme les difficultés en étapes.","Chaque effort rend l’objectif plus proche quand on choisit d’avancer.","Une solution simplifie le chemin quand on reste concentré sur l’essentiel.","Une solution donne de l’élan quand on fait simplement le prochain pas utile.","Le progrès fait avancer quand on travaille avec soin.","Le progrès transforme l’effort quand on agit avec régularité.","Le progrès fait gagner du temps quand on garde le cap.","Chaque jour ouvre la voie quand on ne lâche pas l’objectif.","Chaque jour prépare la réussite quand on apprend de chaque étape.","Chaque jour rend l’objectif plus proche quand on avance avec méthode.","Un petit pas renforce le résultat quand on transforme les difficultés en étapes.","Un petit pas donne de l’élan quand on choisit d’avancer.","La constance fait avancer quand on reste concentré sur l’essentiel.","La constance simplifie le chemin quand on fait simplement le prochain pas utile.","La constance construit du solide quand on travaille avec soin.","Le courage ouvre la voie quand on agit avec régularité.","Le courage prépare la réussite quand on garde le cap.","Le courage fait gagner du temps quand on ne lâche pas l’objectif.","La patience renforce le résultat quand on apprend de chaque étape.","La patience donne de l’élan quand on avance avec méthode.","La patience rend l’objectif plus proche quand on transforme les difficultés en étapes.","L’attention simplifie le chemin quand on choisit d’avancer.","L’attention construit du solide quand on reste concentré sur l’essentiel.","Une bonne méthode fait avancer quand on fait simplement le prochain pas utile.","Une bonne méthode transforme l’effort quand on travaille avec soin.","Une bonne méthode fait gagner du temps quand on agit avec régularité.","Le travail régulier renforce le résultat quand on garde le cap.","Le travail régulier prépare la réussite quand on ne lâche pas l’objectif.","Le travail régulier rend l’objectif plus proche quand on apprend de chaque étape.","La persévérance simplifie le chemin quand on avance avec méthode.","La persévérance donne de l’élan quand on transforme les difficultés en étapes.","Une priorité claire fait avancer quand on choisit d’avancer.","Une priorité claire transforme l’effort quand on reste concentré sur l’essentiel.","Une priorité claire construit du solide quand on fait simplement le prochain pas utile.","Le calme ouvre la voie quand on travaille avec soin.","Le calme prépare la réussite quand on agit avec régularité.","Le calme rend l’objectif plus proche quand on garde le cap.","L’organisation renforce le résultat quand on ne lâche pas l’objectif.","L’organisation donne de l’élan quand on apprend de chaque étape.","Chaque effort fait avancer quand on avance avec méthode.","Chaque effort simplifie le chemin quand on transforme les difficultés en étapes.","Chaque effort construit du solide quand on choisit d’avancer.","Une solution ouvre la voie quand on reste concentré sur l’essentiel.","Une solution transforme l’effort quand on fait simplement le prochain pas utile.","Une solution fait gagner du temps quand on travaille avec soin.","Le progrès renforce le résultat quand on agit avec régularité.","Le progrès donne de l’élan quand on garde le cap.","Le progrès rend l’objectif plus proche quand on ne lâche pas l’objectif.","Chaque jour simplifie le chemin quand on apprend de chaque étape.","Chaque jour construit du solide quand on avance avec méthode.","Un petit pas fait avancer quand on transforme les difficultés en étapes.","Un petit pas transforme l’effort quand on choisit d’avancer.","Un petit pas fait gagner du temps quand on reste concentré sur l’essentiel.","La constance ouvre la voie quand on fait simplement le prochain pas utile.","La constance prépare la réussite quand on travaille avec soin.","La constance rend l’objectif plus proche quand on agit avec régularité.","Le courage simplifie le chemin quand on garde le cap.","Le courage donne de l’élan quand on ne lâche pas l’objectif.","La patience fait avancer quand on apprend de chaque étape.","La patience transforme l’effort quand on avance avec méthode.","La patience construit du solide quand on transforme les difficultés en étapes.","L’attention ouvre la voie quand on choisit d’avancer.","L’attention prépare la réussite quand on reste concentré sur l’essentiel.","L’attention fait gagner du temps quand on fait simplement le prochain pas utile.","Une bonne méthode renforce le résultat quand on travaille avec soin.","Une bonne méthode donne de l’élan quand on agit avec régularité.","Le travail régulier fait avancer quand on garde le cap.","Le travail régulier simplifie le chemin quand on ne lâche pas l’objectif.","Le travail régulier construit du solide quand on apprend de chaque étape.","La persévérance ouvre la voie quand on avance avec méthode.","La persévérance transforme l’effort quand on transforme les difficultés en étapes.","La persévérance fait gagner du temps quand on choisit d’avancer.","Une priorité claire renforce le résultat quand on reste concentré sur l’essentiel.","Une priorité claire prépare la réussite quand on fait simplement le prochain pas utile.","Une priorité claire rend l’objectif plus proche quand on travaille avec soin.","Le calme simplifie le chemin quand on agit avec régularité.","Le calme construit du solide quand on garde le cap.","L’organisation fait avancer quand on ne lâche pas l’objectif.","L’organisation transforme l’effort quand on apprend de chaque étape.","L’organisation fait gagner du temps quand on avance avec méthode.","Chaque effort ouvre la voie quand on transforme les difficultés en étapes.","Chaque effort prépare la réussite quand on choisit d’avancer.","Chaque effort rend l’objectif plus proche quand on reste concentré sur l’essentiel.","Une solution renforce le résultat quand on fait simplement le prochain pas utile.","Une solution donne de l’élan quand on travaille avec soin.","Le progrès fait avancer quand on agit avec régularité.","Le progrès transforme l’effort quand on garde le cap.","Le progrès construit du solide quand on ne lâche pas l’objectif.","Chaque jour ouvre la voie quand on apprend de chaque étape.","Chaque jour prépare la réussite quand on avance avec méthode.","Chaque jour fait gagner du temps quand on transforme les difficultés en étapes.","Un petit pas renforce le résultat quand on choisit d’avancer.","Un petit pas donne de l’élan quand on reste concentré sur l’essentiel.","Un petit pas rend l’objectif plus proche quand on fait simplement le prochain pas utile.","La constance simplifie le chemin quand on travaille avec soin.","La constance construit du solide quand on agit avec régularité.","Le courage ouvre la voie quand on garde le cap.","Le courage transforme l’effort quand on ne lâche pas l’objectif.","Le courage fait gagner du temps quand on apprend de chaque étape.","La patience renforce le résultat quand on avance avec méthode.","La patience prépare la réussite quand on transforme les difficultés en étapes.","La patience rend l’objectif plus proche quand on choisit d’avancer.","L’attention simplifie le chemin quand on reste concentré sur l’essentiel.","L’attention donne de l’élan quand on fait simplement le prochain pas utile.","Une bonne méthode fait avancer quand on travaille avec soin.","Une bonne méthode transforme l’effort quand on agit avec régularité.","Une bonne méthode fait gagner du temps quand on garde le cap.","Le travail régulier ouvre la voie quand on ne lâche pas l’objectif.","Le travail régulier prépare la réussite quand on apprend de chaque étape.","Le travail régulier rend l’objectif plus proche quand on avance avec méthode.","La persévérance renforce le résultat quand on transforme les difficultés en étapes.","La persévérance donne de l’élan quand on choisit d’avancer.","Une priorité claire fait avancer quand on reste concentré sur l’essentiel.","Une priorité claire simplifie le chemin quand on fait simplement le prochain pas utile.","Une priorité claire construit du solide quand on travaille avec soin.","Le calme ouvre la voie quand on agit avec régularité.","Le calme prépare la réussite quand on garde le cap.","Le calme fait gagner du temps quand on ne lâche pas l’objectif.","L’organisation renforce le résultat quand on apprend de chaque étape.","L’organisation donne de l’élan quand on avance avec méthode.","L’organisation rend l’objectif plus proche quand on transforme les difficultés en étapes.","Chaque effort simplifie le chemin quand on choisit d’avancer.","Chaque effort construit du solide quand on reste concentré sur l’essentiel.","Une solution fait avancer quand on fait simplement le prochain pas utile.","Une solution transforme l’effort quand on travaille avec soin.","Une solution fait gagner du temps quand on agit avec régularité.","Le progrès renforce le résultat quand on garde le cap.","Le progrès prépare la réussite quand on ne lâche pas l’objectif.","Le progrès rend l’objectif plus proche quand on apprend de chaque étape.","Chaque jour simplifie le chemin quand on avance avec méthode.","Chaque jour donne de l’élan quand on transforme les difficultés en étapes.","Un petit pas fait avancer quand on choisit d’avancer.","Un petit pas transforme l’effort quand on reste concentré sur l’essentiel.","Un petit pas construit du solide quand on fait simplement le prochain pas utile.","La constance ouvre la voie quand on travaille avec soin.","La constance prépare la réussite quand on agit avec régularité.","La constance rend l’objectif plus proche quand on garde le cap.","Le courage renforce le résultat quand on ne lâche pas l’objectif.","Le courage donne de l’élan quand on apprend de chaque étape.","La patience fait avancer quand on avance avec méthode.","La patience simplifie le chemin quand on transforme les difficultés en étapes.","La patience construit du solide quand on choisit d’avancer.","L’attention ouvre la voie quand on reste concentré sur l’essentiel.","L’attention transforme l’effort quand on fait simplement le prochain pas utile.","L’attention fait gagner du temps quand on travaille avec soin.","Une bonne méthode renforce le résultat quand on agit avec régularité.","Une bonne méthode donne de l’élan quand on garde le cap.","Une bonne méthode rend l’objectif plus proche quand on ne lâche pas l’objectif.","Le travail régulier simplifie le chemin quand on apprend de chaque étape.","Le travail régulier construit du solide quand on avance avec méthode.","La persévérance fait avancer quand on transforme les difficultés en étapes.","La persévérance transforme l’effort quand on choisit d’avancer.","La persévérance fait gagner du temps quand on reste concentré sur l’essentiel.","Une priorité claire ouvre la voie quand on fait simplement le prochain pas utile.","Une priorité claire prépare la réussite quand on travaille avec soin.","Une priorité claire rend l’objectif plus proche quand on agit avec régularité.","Le calme simplifie le chemin quand on garde le cap.","Le calme donne de l’élan quand on ne lâche pas l’objectif.","L’organisation fait avancer quand on apprend de chaque étape.","L’organisation transforme l’effort quand on avance avec méthode.","L’organisation construit du solide quand on transforme les difficultés en étapes.","Chaque effort ouvre la voie quand on choisit d’avancer.","Chaque effort prépare la réussite quand on reste concentré sur l’essentiel.","Chaque effort fait gagner du temps quand on fait simplement le prochain pas utile.","Une solution renforce le résultat quand on travaille avec soin.","Une solution donne de l’élan quand on agit avec régularité.","Le progrès fait avancer quand on garde le cap.","Le progrès simplifie le chemin quand on ne lâche pas l’objectif.","Le progrès construit du solide quand on apprend de chaque étape.","Chaque jour ouvre la voie quand on avance avec méthode.","Chaque jour transforme l’effort quand on transforme les difficultés en étapes.","Chaque jour fait gagner du temps quand on choisit d’avancer.","Un petit pas renforce le résultat quand on reste concentré sur l’essentiel.","Un petit pas prépare la réussite quand on fait simplement le prochain pas utile.","Un petit pas rend l’objectif plus proche quand on travaille avec soin.","La constance simplifie le chemin quand on agit avec régularité.","La constance construit du solide quand on garde le cap.","Le courage fait avancer quand on ne lâche pas l’objectif.","Le courage transforme l’effort quand on apprend de chaque étape.","Le courage fait gagner du temps quand on avance avec méthode.","La patience ouvre la voie quand on transforme les difficultés en étapes.","La patience prépare la réussite quand on choisit d’avancer.","La patience rend l’objectif plus proche quand on reste concentré sur l’essentiel.","L’attention renforce le résultat quand on fait simplement le prochain pas utile.","L’attention donne de l’élan quand on travaille avec soin.","Une bonne méthode fait avancer quand on agit avec régularité.","Une bonne méthode transforme l’effort quand on garde le cap.","Une bonne méthode construit du solide quand on ne lâche pas l’objectif.","Le travail régulier ouvre la voie quand on apprend de chaque étape.","Le travail régulier prépare la réussite quand on avance avec méthode.","Le travail régulier fait gagner du temps quand on transforme les difficultés en étapes.","La persévérance renforce le résultat quand on choisit d’avancer.","La persévérance donne de l’élan quand on reste concentré sur l’essentiel.","La persévérance rend l’objectif plus proche quand on fait simplement le prochain pas utile.","Une priorité claire simplifie le chemin quand on travaille avec soin.","Une priorité claire construit du solide quand on agit avec régularité.","Le calme ouvre la voie quand on garde le cap.","Le calme transforme l’effort quand on ne lâche pas l’objectif.","Le calme fait gagner du temps quand on apprend de chaque étape.","L’organisation renforce le résultat quand on avance avec méthode.","L’organisation prépare la réussite quand on transforme les difficultés en étapes.","L’organisation rend l’objectif plus proche quand on choisit d’avancer.","Chaque effort simplifie le chemin quand on reste concentré sur l’essentiel.","Chaque effort donne de l’élan quand on fait simplement le prochain pas utile.","Une solution fait avancer quand on travaille avec soin.","Une solution transforme l’effort quand on agit avec régularité.","Une solution fait gagner du temps quand on garde le cap.","Le progrès ouvre la voie quand on ne lâche pas l’objectif.","Le progrès prépare la réussite quand on apprend de chaque étape.","Le progrès rend l’objectif plus proche quand on avance avec méthode.","Chaque jour renforce le résultat quand on transforme les difficultés en étapes.","Chaque jour donne de l’élan quand on choisit d’avancer.","Un petit pas fait avancer quand on reste concentré sur l’essentiel.","Un petit pas simplifie le chemin quand on fait simplement le prochain pas utile.","Un petit pas construit du solide quand on travaille avec soin.","La constance ouvre la voie quand on agit avec régularité.","La constance prépare la réussite quand on garde le cap.","La constance fait gagner du temps quand on ne lâche pas l’objectif.","Le courage renforce le résultat quand on apprend de chaque étape.","Le courage donne de l’élan quand on avance avec méthode.","Le courage rend l’objectif plus proche quand on transforme les difficultés en étapes.","La patience simplifie le chemin quand on choisit d’avancer.","La patience construit du solide quand on reste concentré sur l’essentiel.","L’attention fait avancer quand on fait simplement le prochain pas utile.","L’attention transforme l’effort quand on travaille avec soin.","L’attention fait gagner du temps quand on agit avec régularité.","Une bonne méthode renforce le résultat quand on garde le cap.","Une bonne méthode prépare la réussite quand on ne lâche pas l’objectif.","Une bonne méthode rend l’objectif plus proche quand on apprend de chaque étape.","Le travail régulier simplifie le chemin quand on avance avec méthode.","Le travail régulier donne de l’élan quand on transforme les difficultés en étapes.","La persévérance fait avancer quand on choisit d’avancer.","La persévérance transforme l’effort quand on reste concentré sur l’essentiel.","La persévérance construit du solide quand on fait simplement le prochain pas utile.","Une priorité claire ouvre la voie quand on travaille avec soin.","Une priorité claire prépare la réussite quand on agit avec régularité.","Une priorité claire rend l’objectif plus proche quand on garde le cap.","Le calme renforce le résultat quand on ne lâche pas l’objectif.","Le calme donne de l’élan quand on apprend de chaque étape.","L’organisation fait avancer quand on avance avec méthode.","L’organisation simplifie le chemin quand on transforme les difficultés en étapes.","L’organisation construit du solide quand on choisit d’avancer.","Chaque effort ouvre la voie quand on reste concentré sur l’essentiel.","Chaque effort transforme l’effort quand on fait simplement le prochain pas utile.","Chaque effort fait gagner du temps quand on travaille avec soin.","Une solution renforce le résultat quand on agit avec régularité.","Une solution donne de l’élan quand on garde le cap.","Une solution rend l’objectif plus proche quand on ne lâche pas l’objectif.","Le progrès simplifie le chemin quand on apprend de chaque étape.","Le progrès construit du solide quand on avance avec méthode.","Chaque jour fait avancer quand on transforme les difficultés en étapes.","Chaque jour transforme l’effort quand on choisit d’avancer.","Chaque jour fait gagner du temps quand on reste concentré sur l’essentiel.","Un petit pas ouvre la voie quand on fait simplement le prochain pas utile.","Un petit pas prépare la réussite quand on travaille avec soin.","Un petit pas rend l’objectif plus proche quand on agit avec régularité.","La constance simplifie le chemin quand on garde le cap.","La constance donne de l’élan quand on ne lâche pas l’objectif.","Le courage fait avancer quand on apprend de chaque étape.","Le courage transforme l’effort quand on avance avec méthode.","Le courage construit du solide quand on transforme les difficultés en étapes.","La patience ouvre la voie quand on choisit d’avancer.","La patience prépare la réussite quand on reste concentré sur l’essentiel.","La patience fait gagner du temps quand on fait simplement le prochain pas utile.","L’attention renforce le résultat quand on travaille avec soin.","L’attention donne de l’élan quand on agit avec régularité."];
function renderDailyMotivation(){
 const el=document.getElementById('dailyMotivation');
 if(!el||!DAILY_MOTIVATION_SAYINGS.length)return;
 const now=new Date();
 // Index basé sur la date locale : même dicton toute la journée, changement à minuit.
 const dayKey=Math.floor(new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime()/86400000);
 const index=((dayKey%DAILY_MOTIVATION_SAYINGS.length)+DAILY_MOTIVATION_SAYINGS.length)%DAILY_MOTIVATION_SAYINGS.length;
 el.textContent=DAILY_MOTIVATION_SAYINGS[index];
 el.title='Dicton motivation du jour';
}

function renderBrand(){renderDailyMotivation();secureAppLogos();document.title=`${db.settings.appName} — V${APP_VERSION}`;const brandApp=$('#brandAppName');if(brandApp)brandApp.textContent=db.settings.appName;const brandSchool=$('#brandSchoolName');if(brandSchool)brandSchool.textContent=db.settings.schoolName;const welcomeTitle=$('#welcomeTitle');if(welcomeTitle)welcomeTitle.textContent=db.settings.appName;const today=$('#today');if(today)today.textContent=new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});document.documentElement.style.setProperty('--print-orientation',db.settings.printOrientation||'landscape');for(const id of ['authVersion','sidebarVersion','aboutVersion']){const el=document.getElementById(id);if(el)el.textContent=`Version ${APP_VERSION} — ${APP_BUILD}`}}

// V147.15 — mémoire réelle des positions horizontales, y compris si le DOM est recréé.
const pstPlanningScrollMemory={};

function pstScrollKey(el,index=0){
  if(!el)return '';
  if(el===document.scrollingElement||el===document.documentElement||el===document.body){
    const view=document.querySelector('.view.active')?.id||currentView||'global';
    return `page:${view}`;
  }
  if(el.dataset?.scrollKey)return `data:${el.dataset.scrollKey}`;
  if(el.id)return `id:${el.id}`;
  const parts=[];
  let node=el;
  while(node&&node!==document.body&&parts.length<6){
    if(node.id){parts.unshift(`#${node.id}`);break}
    const tag=(node.tagName||'div').toLowerCase();
    const cls=[...(node.classList||[])].filter(c=>c!=='active').sort().slice(0,3).join('.');
    let nth=1,p=node;
    while((p=p.previousElementSibling))if(p.tagName===node.tagName)nth++;
    parts.unshift(`${tag}${cls?'.'+cls:''}:nth${nth}`);
    node=node.parentElement;
  }
  const view=el.closest?.('.view')?.id||'global';
  return `${view}:${parts.join('>')||index}`;
}

function pstIsScrollable(el){
  if(!el)return false;
  return (el.scrollWidth>el.clientWidth+2)||(el.scrollHeight>el.clientHeight+2);
}

function pstRememberScroll(el,index=0){
  if(!el)return;
  if(el!==document.scrollingElement&&!pstIsScrollable(el)&&!(el.scrollLeft||el.scrollTop))return;
  const key=pstScrollKey(el,index);
  if(!key)return;
  pstPlanningScrollMemory[key]={
    left:Number(el.scrollLeft||0),
    top:Number(el.scrollTop||0)
  };
}

function pstScrollableCandidates(){
  const active=document.querySelector('.view.active');
  const roots=[active,document.querySelector('#detailModal'),document.querySelector('#modal')].filter(Boolean);
  const set=new Set();
  if(document.scrollingElement)set.add(document.scrollingElement);
  for(const root of roots){
    set.add(root);
    root.querySelectorAll('*').forEach(el=>{
      if(el instanceof HTMLElement && (pstIsScrollable(el)||el.scrollLeft||el.scrollTop))set.add(el);
    });
  }
  document.querySelectorAll(
    '#teamWeekCalendar,#personalWeekCalendar,#rotationPreview,#absenceMonthBoard,'+
    '#weeklyPlansBoard,#scheduleImportPreview,.table-wrap,.month-grid,.card-list,'+
    '.team-calendar,.personal-calendar,.modal-body,#modalBody,#detailBody'
  ).forEach(el=>set.add(el));
  return [...set].filter(Boolean);
}

function capturePlanningScroll(){
  pstScrollableCandidates().forEach((el,i)=>pstRememberScroll(el,i));
}

let pstRestoreScrollRaf=0;
function restorePlanningScroll(){
  cancelAnimationFrame(pstRestoreScrollRaf);
  pstRestoreScrollRaf=requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      pstScrollableCandidates().forEach((el,i)=>{
        const mem=pstPlanningScrollMemory[pstScrollKey(el,i)];
        if(!mem)return;
        if(Number.isFinite(mem.left)&&el.scrollWidth>=el.clientWidth)el.scrollLeft=Math.min(mem.left,Math.max(0,el.scrollWidth-el.clientWidth));
        if(Number.isFinite(mem.top)&&el.scrollHeight>=el.clientHeight)el.scrollTop=Math.min(mem.top,Math.max(0,el.scrollHeight-el.clientHeight));
      });
    });
  });
}

document.addEventListener('scroll',e=>{
  const el=e.target;
  if(el instanceof HTMLElement)pstRememberScroll(el);
  else if(e.target===document&&document.scrollingElement)pstRememberScroll(document.scrollingElement);
},true);

window.addEventListener('scroll',()=>{
  if(document.scrollingElement)pstRememberScroll(document.scrollingElement);
},{passive:true});

// V147.148 — pas de MutationObserver qui force la position pendant que l'utilisateur défile.
// La restauration est déclenchée uniquement autour des rendus explicites de l'application.



function auditMaintenanceCounts(){
 const rows=db.maintenance||[];
 const byStatus=rows.reduce((acc,x)=>{const k=String(x.status||'Sans statut').trim()||'Sans statut';acc[k]=(acc[k]||0)+1;return acc},{});
 const result={afficheTableauDeBord:rows.filter(x=>!isClosedStatus(x.status)).length,totalBase:rows.length,aFaire:rows.filter(x=>normalizeText(x.status)==='a faire').length,exclusTerminesClotures:rows.filter(x=>isClosedStatus(x.status)).length,byStatus};
 console.table(byStatus);console.log('Maintenance',result);return result;
}
window.PSTMaintenanceAudit={run:auditMaintenanceCounts};

function auditFormPersistence(){
 const collections=['personalEvents','agents','rotations','weeklyPlans','agentDays','vacations','issues','periodic','cleaning','maintenance','requests','works','meetings','notes','documents'];
 const state={};
 for(const c of collections)state[c]=Array.isArray(db?.[c])?db[c].length:0;
 console.table(state);
 return state;
}
window.PSTFormAudit={run:auditFormPersistence};


const PST_TABLE_FILTERS={};
function normalizeTableFilterValue(v){
 return normalizeText(String(v??'')).replace(/\s+/g,' ').trim();
}
function tableFilterKey(table,index){
 return table.id||table.closest('.view')?.id||`table-${index}`;
}
function enhanceTableFilters(root=document){
 const host=root?.classList?.contains('view')?root:document.querySelector('.view.active');
 if(host && host.querySelector('.table-wrap table') && !host.querySelector('.pst-clear-table-filters')){
   const actions=host.querySelector('.filters')||host.querySelector('.section-actions');
   if(actions){
     const b=document.createElement('button');
     b.type='button';b.className='ghost small pst-clear-table-filters';
     b.textContent='Effacer filtres colonnes';
     b.addEventListener('click',clearCurrentTableFilters);
     actions.appendChild(b);
   }
 }

 const tables=[...root.querySelectorAll('.table-wrap table')];
 tables.forEach((table,tableIndex)=>{
   const thead=table.tHead;
   const tbody=table.tBodies?.[0];
   if(!thead||!tbody)return;

   const headerRow=[...thead.rows].find(r=>!r.classList.contains('pst-column-filters'));
   if(!headerRow)return;
   const colCount=headerRow.cells.length;
   if(!colCount)return;

   let filterRow=thead.querySelector('tr.pst-column-filters');
   if(!filterRow){
     filterRow=document.createElement('tr');
     filterRow.className='pst-column-filters';
     const key=tableFilterKey(table,tableIndex);
     const saved=PST_TABLE_FILTERS[key]||{};

     [...headerRow.cells].forEach((th,col)=>{
       const cell=document.createElement('th');
       const title=String(th.textContent||'').trim();
       // La dernière colonne "action" est généralement vide : pas besoin de filtre.
       if(title||col<colCount-1){
         const input=document.createElement('input');
         input.type='search';
         input.className='pst-column-filter-input';
         input.dataset.filterCol=String(col);
         input.placeholder=title?`Filtrer ${title}`:'Filtrer';
         input.setAttribute('aria-label',input.placeholder);
         input.autocomplete='off';
         input.value=saved[col]||'';
         input.addEventListener('input',()=>applyTableColumnFilters(table));
         cell.appendChild(input);
       }
       filterRow.appendChild(cell);
     });
     thead.appendChild(filterRow);
   }
   applyTableColumnFilters(table);
 });
}
function applyTableColumnFilters(table){
 const tbody=table.tBodies?.[0];
 const thead=table.tHead;
 if(!tbody||!thead)return;
 const inputs=[...thead.querySelectorAll('.pst-column-filter-input')];
 const tableIndex=[...document.querySelectorAll('.table-wrap table')].indexOf(table);
 const key=tableFilterKey(table,tableIndex);
 const state={};
 inputs.forEach(i=>state[i.dataset.filterCol]=i.value||'');
 PST_TABLE_FILTERS[key]=state;

 let visible=0,total=0;
 [...tbody.rows].forEach(row=>{
   // Ne pas casser les lignes "Aucun résultat" avec colspan.
   if(row.cells.length<=1 && row.cells[0]?.colSpan>1){
     row.style.display='';
     return;
   }
   total++;
   const ok=inputs.every(input=>{
     const wanted=normalizeTableFilterValue(input.value);
     if(!wanted)return true;
     const col=Number(input.dataset.filterCol);
     const cell=row.cells[col];
     const actual=normalizeTableFilterValue(cell?.innerText||cell?.textContent||'');
     return actual.includes(wanted);
   });
   row.style.display=ok?'':'none';
   if(ok)visible++;
 });

 // Compteur discret ajouté à proximité du tableau.
 let counter=table.parentElement?.querySelector(':scope > .pst-filter-result-count');
 if(!counter && table.parentElement){
   counter=document.createElement('div');
   counter.className='pst-filter-result-count';
   table.parentElement.insertBefore(counter,table);
 }
 if(counter)counter.textContent=inputs.some(i=>i.value.trim())?`${visible} / ${total} ligne${total>1?'s':''}`:'';
}
function clearCurrentTableFilters(){
 const view=document.querySelector('.view.active');
 if(!view)return;
 view.querySelectorAll('.pst-column-filter-input').forEach(i=>i.value='');
 view.querySelectorAll('.table-wrap table').forEach(t=>applyTableColumnFilters(t));
}
window.PSTTableFilters={
 enhance:enhanceTableFilters,
 clear:clearCurrentTableFilters,
 state:PST_TABLE_FILTERS
};

function renderAll(){return safeRenderAll()}

/* ---------- Actions rapides ---------- */
function openQuickMenu(){openDetail('Ajouter rapidement',`<div class="quick-menu-grid"><button data-quick="agent-day">👤<strong>Jour agent</strong><small>Congé, RTT, horaires, heures supp.</small></button><button data-quick="note">✎<strong>Bloc-notes</strong><small>Note et liste d’actions</small></button><button data-quick="maintenance">⚙<strong>Intervention</strong><small>Maintenance</small></button><button data-quick="agent-activity">✓<strong>Ajout activité agent</strong><small>Tracer le travail réellement effectué</small></button><button data-quick="cleaning">✓<strong>Contrôle ménage</strong><small>Saisie guidée</small></button><button data-quick="meeting">📅<strong>Rendez-vous</strong><small>Réunion ou visite</small></button><button data-quick="room-prep">☕<strong>Préparation salle & café</strong><small>Préparer une salle / demande café</small></button><button data-quick="request">↗<strong>Demande direction</strong><small>Aménagement / logistique</small></button><button data-quick="issue-urgent">⚠<strong>Urgence</strong><small>Sécurité / qualité · priorité Urgente</small></button><button data-quick="issue-problem">❗<strong>Problématique</strong><small>Sécurité / qualité · priorité Normale</small></button><button data-quick="document">📎<strong>Document</strong><small>Créer une fiche documentaire</small></button><button data-quick="import-hub" class="quick-import-main">📥<strong>Importer / Scanner</strong><small>Scan manuscrit ou PDF · détection automatique</small></button></div>`)}
const QUICK_ACTION_KEYS=['agent-day','note','maintenance','agent-activity','cleaning','meeting','request','issue-urgent','issue-problem','document','room-prep'];
function dispatchQuick(q){if($('#detailModal').open)$('#detailModal').close();({note:()=>openNote(),maintenance:()=>openMaintenance(),'agent-activity':()=>openAgentActivity(),cleaning:()=>openCleaning(),meeting:()=>openMeeting(),request:()=>openRequest(),'issue-urgent':()=>openIssue(null,{priority:'Urgente'}),'issue-problem':()=>openIssue(null,{priority:'Normale'}),document:()=>openDocument(),'room-prep':()=>{const b=document.querySelector('.nav-btn[data-view="room-prep"]');if(b)b.click();else setView('room-prep')},'import-hub':()=>openCentralImportHub(),'agent-day':()=>{const aid=db.agents.find(a=>normalizeText(a.status)==='actif')?.id;if(aid)openAgentDay(aid,todayISO());else toast('Ajoutez d’abord un agent')}}[q]||(()=>{console.warn('Action rapide inconnue',q);toast('Cette action rapide n’est pas disponible')}))()}
function dashboardShortcut(target){
 const view=target||'dashboard';
 if(view==='issues-urgent'){
  setView('issues');
  if($('#issueMonth'))$('#issueMonth').value='';
  if($('#issueStatus'))$('#issueStatus').value='';
  window.__dashboardUrgentOnly=true;renderIssues();return;
 }
 window.__dashboardUrgentOnly=false;
 setView(view);
 if(view==='maintenance'&&$('#maintenanceStatus'))$('#maintenanceStatus').value='';
 if(view==='periodic'&&$('#periodicStatus'))$('#periodicStatus').value='';
}
function dispatchEdit(type,id){({agent:()=>openAgent(id),rotation:()=>openRotation(id),personal:()=>openPersonalEvent(id),issue:()=>openIssue(id),periodic:()=>openPeriodic(id),cleaning:()=>openCleaning(id),maintenance:()=>openMaintenance(id),agentActivity:()=>openAgentActivity(id),request:()=>openRequest(id),work:()=>openWork(id),meeting:()=>openMeeting(id),note:()=>openNote(id),vacation:()=>openVacation(id),document:()=>openDocument(id),space:()=>openSpace(id),reportNonconformity:()=>setView('pdfimports'),contract:()=>window.PSTContracts?.open?.(id)}[type]||(()=>{}))()}

/* ---------- Sauvegarde / restauration ---------- */
function exportBackup(){const exportAcademicYear=activeAcademicYear();const payload={exportedAt:new Date().toISOString(),data:db,note:'Les fichiers joints sont stockés dans Supabase Storage. La sauvegarde JSON contient leurs références.'};downloadText(`Pilotage_Service_Technique_sauvegarde_${todayISO()}.json`,JSON.stringify(payload,null,2),'application/json')}
async function importBackup(file){try{
 const obj=JSON.parse(await file.text()),previous=deepClone(db);db=migrate(obj.data||obj);
 const persisted=window.PSTMainState?.persistNow?await window.PSTMainState.persistNow():{ok:save(),offline:false};
 if(!persisted?.ok){db=previous;safeRenderAll();throw new Error(persisted?.error||'Supabase n’a pas confirmé la restauration')}
 safeRenderAll();toast('✅ Sauvegarde restaurée et confirmée dans Supabase')
}catch(e){console.error(e);alert(`Restauration impossible : ${e?.message||e}`)}}
function resetData(){if(!confirm('Réinitialiser toute la base locale ? Cette action est irréversible.'))return;db=defaultData();restoreSuppliedData(false);save();toast('Base réinitialisée avec les données de référence')}
function restoreReferenceData(){if(!confirm('Restaurer les agents, horaires et interventions fournis ? Vos saisies personnelles seront conservées.'))return;restoreSuppliedData(true)}

/* ---------- Événements ---------- */


const pstLiveConnections={
  internet:{state:'gray',detail:'Non vérifié'},
  auth:{state:'gray',detail:'Non vérifiée'},
  read:{state:'gray',detail:'Non vérifiée'},
  write:{state:'gray',detail:'Aucune confirmation récente'},
  queue:{state:'gray',detail:'Non vérifiée'},
  edge:{state:'gray',detail:'Non vérifiée'},
  openai:{state:'gray',detail:'Non vérifié'},
  lastProbeAt:0,lastOpenAIProbeAt:0,busy:false,errors:[]
};
function pstSetLiveConnection(key,state,detail=''){
  pstLiveConnections[key]={state,detail};
  const row=document.querySelector(`[data-live-connection="${key}"]`);
  if(row){
    const dot=row.querySelector('.live-dot'),small=row.querySelector('small');
    if(dot)dot.className=`live-dot ${state}`;
    if(small)small.textContent=detail;
  }
}
function renderLiveConnections(){
  for(const key of ['internet','auth','read','write','queue','edge','openai']){
    const x=pstLiveConnections[key]||{};
    pstSetLiveConnection(key,x.state||'gray',x.detail||'Non vérifié');
  }
  const updated=$('#liveConnectionsUpdated');
  if(updated){
    updated.textContent=pstLiveConnections.lastProbeAt
      ? `Dernier contrôle : ${new Date(pstLiveConnections.lastProbeAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`
      : 'Initialisation…';
  }
  const err=$('#liveConnectionsError');
  if(err){
    const txt=(pstLiveConnections.errors||[]).filter(Boolean).join(' · ');
    err.textContent=txt;
    err.classList.toggle('hidden',!txt);
  }
}
function updateLiveConnectionLocalStates(){
  pstSetLiveConnection('internet',navigator.onLine?'green':'red',navigator.onLine?'Réseau disponible':'Hors connexion');
  pstSetLiveConnection('auth',currentUser&&supabaseClient?'green':(navigator.onLine?'red':'orange'),currentUser&&supabaseClient?`Connecté${currentUser.email?' : '+currentUser.email:''}`:'Session Supabase absente');
  const pending=typeof pstPendingMutationCount==='function'?pstPendingMutationCount():0;
  pstSetLiveConnection('queue',pending===0?'green':'orange',pending===0?'Aucune modification en attente':`${pending} modification(s) en attente`);
  healStaleSyncBusyFlags();

  if(pending>0){
    pstSetLiveConnection('write',(cloudBusy||dashboardSyncBusy)?'orange':'orange',
      (cloudBusy||dashboardSyncBusy)?`Synchronisation de ${pending} modification(s)…`:`${pending} modification(s) en attente de confirmation`);
  }else if(lastConfirmedSupabaseAt){
    pstSetLiveConnection('write','green',`Aucune modification en attente · dernière confirmation ${new Date(lastConfirmedSupabaseAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`);
  }else if(pstLiveConnections.read?.state==='green'){
    pstSetLiveConnection('write','green','Aucune modification en attente');
  }else{
    pstSetLiveConnection('write','green','Aucune modification en attente');
  }
}
async function probeLiveConnections({forceOpenAI=false}={}){
  if(pstLiveConnections.busy)return;
  pstLiveConnections.busy=true;
  pstLiveConnections.errors=[];
  updateLiveConnectionLocalStates();
  try{
    if(!navigator.onLine){
      pstSetLiveConnection('read','red','Impossible hors connexion');
      pstSetLiveConnection('edge','red','Impossible hors connexion');
      pstSetLiveConnection('openai','red','Impossible hors connexion');
      return;
    }
    if(!currentUser||!supabaseClient){
      pstSetLiveConnection('read','red','Session Supabase absente');
      pstSetLiveConnection('edge','red','Session Supabase absente');
      pstSetLiveConnection('openai','red','Session Supabase absente');
      return;
    }

    try{
      const read=await withTimeout(supabaseClient.from('app_state').select('updated_at').eq('user_id',currentUser.id).single(),8000);
      if(read?.error)throw read.error;
      pstSetLiveConnection('read','green',read?.data?.updated_at?`Réponse ${new Date(read.data.updated_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`:'Base joignable');
      if(typeof pstPendingMutationCount==='function'&&pstPendingMutationCount()===0){
        localDirty=false;
        try{clearOfflinePending()}catch(_){}
      }
    }catch(e){
      pstSetLiveConnection('read','red',e?.message||'Lecture impossible');
      pstLiveConnections.errors.push(`Base : ${e?.message||e}`);
    }

    const now=Date.now();
    const shouldProbeOpenAI=forceOpenAI||!pstLiveConnections.lastOpenAIProbeAt||(now-pstLiveConnections.lastOpenAIProbeAt>60000);
    try{
      const call=await pstEdgeFunctionRequest('swift-function',{ping:true,probeOpenAI:shouldProbeOpenAI},{timeoutMs:12000});
      const data=call?.data||{};
      if(data?.edge===true||data?.pong===true||data?.ok===true){
        pstSetLiveConnection('edge','green',`Fonction joignable (${call.via==='direct'?'HTTP direct':'SDK'})`);
      }else{
        pstSetLiveConnection('edge','red',data?.error||'Réponse invalide');
      }
      if(shouldProbeOpenAI){
        pstLiveConnections.lastOpenAIProbeAt=now;
        if(data?.openai===true)pstSetLiveConnection('openai','green','API OpenAI joignable');
        else if(data?.openai===false)pstSetLiveConnection('openai','red',data?.openaiError||'OpenAI non joignable');
        else pstSetLiveConnection('openai','orange','État OpenAI non confirmé');
      }
    }catch(e){
      const msg=e?.message||String(e);
      pstSetLiveConnection('edge','red',msg);
      pstSetLiveConnection('openai','red','Non testable : Edge Function inaccessible');
      pstLiveConnections.errors.push(`IA : ${msg}`);
    }
  }finally{
    pstLiveConnections.lastProbeAt=Date.now();
    pstLiveConnections.busy=false;
    updateLiveConnectionLocalStates();
    renderLiveConnections();
  }
}
function bindLiveConnectionsPanel(){
  $('#liveConnectionsTestNow')?.addEventListener('click',()=>probeLiveConnections({forceOpenAI:true}));
  updateLiveConnectionLocalStates();renderLiveConnections();
}
window.PSTLiveConnections={probe:probeLiveConnections,state:pstLiveConnections,render:renderLiveConnections};
window.addEventListener('online',()=>{updateLiveConnectionLocalStates();probeLiveConnections({forceOpenAI:true})});
window.addEventListener('offline',()=>{updateLiveConnectionLocalStates();renderLiveConnections()});
document.addEventListener('DOMContentLoaded',bindLiveConnectionsPanel,{once:true});
setInterval(()=>{updateLiveConnectionLocalStates();renderLiveConnections()},2000);
setInterval(()=>{if(document.querySelector('#connections.view.active'))probeLiveConnections()},10000);

async function runSupabaseConnectionDiagnostic(){
  const result={online:navigator.onLine,authenticated:Boolean(currentUser),databaseRead:false,databaseWrite:false,edgeFunction:false,pending:pstPendingMutationCount(),errors:[]};
  if(!navigator.onLine){result.errors.push('Appareil hors connexion');return result}
  if(!currentUser||!supabaseClient){result.errors.push('Session Supabase absente');return result}
  try{
    const read=await withTimeout(supabaseClient.from('app_state').select('updated_at').eq('user_id',currentUser.id).single(),10000);
    if(read?.error)throw read.error;result.databaseRead=true;
  }catch(e){result.errors.push(`Lecture base : ${e?.message||e}`)}
  try{
    const payload=pstApplyQueuedMutationsToPayload(db);
    const wr=await withTimeout(supabaseClient.from('app_state').upsert({user_id:currentUser.id,data:payload,updated_at:new Date().toISOString()},{onConflict:'user_id'}),12000);
    if(wr?.error)throw wr.error;result.databaseWrite=true;
  }catch(e){result.errors.push(`Écriture base : ${e?.message||e}`)}
  try{
    const {data,error}=await supabaseClient.functions.invoke('swift-function',{body:{ping:true}});
    if(error)throw error;result.edgeFunction=Boolean(data?.ok||data?.pong);
    if(!result.edgeFunction)result.errors.push(data?.error||'Edge Function sans réponse valide');
  }catch(e){result.errors.push(`IA Edge Function : ${e?.message||e}`)}
  return result;
}
window.PSTSupabaseDiagnostic={run:runSupabaseConnectionDiagnostic};

function runDiagnostic(){
 const critical=['nav','openMenu','closeMenu','menuBackdrop','modal','modalForm','newAgent','newRotation','newShift','newAbsence','teamWeekCalendar','agentsGrid','rotationsTable','planningTable','restoreReferenceData','notificationBell','notificationModal','notificationList','kpiAgents','kpiPresent','kpiUrgentActions','kpiLate','kpiMaintenance','kpiMaintenanceTodo','kpiCompliance','kpiCleaningWeak','kpiPeriodicLate','kpiPeriodicSoon','kpiNotes','kpiNotesDue','priorityList','dashboardNotes','maintenancePreview','maintenanceTodoPreview','cleaningWeakPreview','meetingPreview'];
 const missing=critical.filter(id=>!document.getElementById(id));
 const checks=[
  ['Données agents',Array.isArray(db.agents)],['Horaires hebdomadaires',Array.isArray(db.weeklyPlans)],['Roulements',Array.isArray(db.rotations)],
  ['Journées agents',Array.isArray(db.agentDays)],['Interventions',Array.isArray(db.maintenance)],['Contrôles périodiques',Array.isArray(db.periodic)],
  ['Contrôles ménage',Array.isArray(db.cleaning)],['Navigation mobile',!!document.getElementById('openMenu')],['Fenêtres',!!document.getElementById('modal')]
 ];
 const failed=checks.filter(x=>!x[1]).map(x=>x[0]);let notifications=[];try{notifications=computeNotifications()}catch(error){failed.push('Calcul des notifications');console.error(error)}
 const lateTest={status:'À faire',dueDate:addDays(todayISO(),-1),priority:'Normale'};if(isClosedStatus(lateTest.status)||!(recordDueDate(lateTest)<todayISO()))failed.push('Règle intervention en retard');
 const urgentIssueTest={status:'À faire',priority:'Urgent',dueDate:''};if(isClosedStatus(urgentIssueTest.status)||!isUrgentPriority(urgentIssueTest.priority))failed.push('Règle action urgente Sécurité & qualité');
 const urgentProblemTest={status:'À faire',priority:'Urgente',title:'Test problématique'};if(!isUrgentPriority(urgentProblemTest.priority))failed.push('Câblage problématique urgente → tableau de bord');
 const dueSoonIssueTest={status:'En cours',priority:'Normale',dueDate:addDays(todayISO(),2)};if(isClosedStatus(dueSoonIssueTest.status)||!(recordDueDate(dueSoonIssueTest)<=addDays(todayISO(),3)))failed.push('Règle échéance proche Sécurité & qualité');
 if(missing.length||failed.length){console.error('Diagnostic',{missing,failed});toast(`Diagnostic : ${missing.length+failed.length} anomalie(s) détectée(s)`);return false}
 toast(`Diagnostic réussi — ${notifications.length} notification(s) calculée(s)`);return true;
}



document.addEventListener('pointerup',e=>{
 const b=e.target.closest?.('.note-edit-button');
 if(!b)return;
 const now=Date.now();
 if(Number(b.dataset.lastOpen||0)+500>now)return;
 b.dataset.lastOpen=String(now);
 dispatchEdit('note',b.dataset.editId);
},{passive:true});

function bindReliableDynamicActions(){
 if(window.__pstDynamicActionsBound)return;
 window.__pstDynamicActionsBound=true;
 document.addEventListener('click',e=>{
   const edit=e.target.closest?.('[data-edit-type]');
   if(edit){
     const type=edit.dataset.editType,id=edit.dataset.editId;
     if(edit.classList.contains('note-edit-button')&&Number(edit.dataset.lastOpen||0)+500>Date.now())return;
     if(type&&id){dispatchEdit(type,id)}
   }
   const rpCard=e.target.closest?.('[data-roomprep-edit]');
   if(rpCard&&window.PSTRoomPrep?.edit){
     window.PSTRoomPrep.edit(rpCard.dataset.roomprepEdit);
   }
 });
}


function auditDateFromForm(form,ctx={}){
 const candidates=[form?.elements?.date?.value,form?.elements?.dateFrom?.value,ctx.date].filter(Boolean);
 return normalizeDateValue(candidates[0]||todayISO())||todayISO();
}
function auditEntityFromForm(form,ctx={}){
 if(typeof ctx.entity==='function'){try{return ctx.entity(form)||ctx.label||'Élément'}catch(_){}}
 if(ctx.entity)return ctx.entity;
 if(ctx.type==='Agent'){
   const aid=form?.elements?.agentId?.value||ctx.agentId||'';
   const a=aid?agentById(aid):null;return a?agentName(a):(ctx.label||'Agent');
 }
 const no=form?.elements?.no?.value||ctx.no||'';
 const title=form?.elements?.title?.value||ctx.title||ctx.label||'';
 return [no,title].filter(Boolean).join(' — ')||ctx.type||'Élément';
}
function auditFieldLabel(field){
 const labels={
  firstName:'Prénom',lastName:'Nom',role:'Fonction',weeklyHours:'Temps hebdomadaire',
  email:'E-mail',phone:'Téléphone',assignment:'Affectation',arrivalDate:'Date d’arrivée',
  agentId:'Agent',dayType:'Type de journée',date:'Date',dateFrom:'Du',dateTo:'Au',
  status:'Statut',plannedStart:'Horaire théorique — arrivée',plannedEnd:'Horaire théorique — départ',
  actualStart:'Horaire réel — arrivée',actualEnd:'Horaire réel — départ',pause:'Pause',
  overtime:'Heures +/-',replacement:'Remplacement / relais',noReplacementNeeded:'Aucun remplacement nécessaire',
  note:'Informations / Motif',time:'Heure',title:'Objet',family:'Famille',priority:'Priorité',
  building:'Bâtiment',floor:'Étage',sector:'Secteur',room:'Local / zone',requester:'Demandeur',
  assigned:'Assigné à / prestataire',dueDate:'Échéance',description:'Description / diagnostic',
  action:'Action réalisée / suite',type:'Type',response:'Réponse / réalisation',
  inspector:'Contrôleur',roomType:'Type de local',comment:'Observation générale'
 };
 return labels[field]||changeHistoryFieldLabel?.(field)||field||'Modification';
}
function pushModificationHistory({
 type,entity,date,changes,user,agentId='',agentNameValue='',title='',
 recordId='',no='',itemTitle='',location=''
}) {
 if(!Array.isArray(changes)||!changes.length)return;
 db.changeHistory=Array.isArray(db.changeHistory)?db.changeHistory:[];
 const cleanChanges=changes.map(c=>({field:c.field,oldValue:c.oldValue,newValue:c.newValue}));
 const concreteEntity=String(entity||'').trim();
 db.changeHistory.push({
   id:uid(),date:new Date().toISOString(),
   type:type||'Autre',
   entity:concreteEntity||title||'Élément',
   title:(title&&!/^Modification d[’']une donnée passée$/i.test(String(title)))?title:(concreteEntity||'Modification'),
   pastDates:[date||todayISO()],
   changes:cleanChanges,
   recordId:String(recordId||''),
   no:String(no||''),
   itemTitle:String(itemTitle||''),
   location:String(location||''),
   agentId:String(agentId||''),
   agentName:String(agentNameValue||''),
   user:user||currentUser?.email||'Utilisateur',
   historyVersion:2
 });
 localDirty=true;
 try{writeMirror()}catch(_){}
 try{writeOfflinePending('historique modification à synchroniser')}catch(_){}
 try{
   if(document.querySelector('.view.active')?.id==='archives')renderChangeHistory();
 }catch(_){}

 // Si l'historique est créé hors d'un formulaire alors qu'Internet est présent,
 // programmer son envoi automatique. Le submit des formulaires fait sa propre
 // confirmation immédiate ci-dessus.
 if(currentUser&&navigator.onLine){
   clearTimeout(cloudSaveTimer);
   cloudSaveTimer=setTimeout(()=>{
     if(localDirty&&!cloudBusy)cloudSaveNow({silent:true,mergeRemote:true});
   },900);
 }
}
function bindEvents(){
 $('#modalForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!modalHandler)return;
  const form=e.currentTarget,btn=$('#modalSave');
  if(btn?.dataset?.directSaving==='1'){btn.dataset.directSaving='';return}
  if(btn?.dataset?.directSave==='1')return;
  if(!form.checkValidity()){form.reportValidity();toast('Complétez les champs obligatoires indiqués');return}
  const pastDates=[...form.querySelectorAll('input[type="date"]')].map(e=>e.value).filter(Boolean).filter(v=>v<todayISO());
  const changed=[];if(modalAuditInitial){for(const e of [...form.elements]){if(!e.name||e.type==='file'||e.type==='button'||e.type==='submit')continue;const nv=e.type==='checkbox'?e.checked:e.value,ov=modalAuditInitial[e.name];if(String(nv)!==String(ov))changed.push({field:e.name,oldValue:ov,newValue:nv})}}
  if(pastDates.length&&changed.length&&!confirm('⚠️ Cette donnée concerne une date passée.\n\nLa modification sera enregistrée dans l’historique.\n\nContinuer ?'))return;
  const oldBtnText=btn.textContent;
  let auditCtx=null,auditTitle='',formAgentId='',formAgent=null,auditDate=todayISO(),auditEntity='',auditType='Autre',auditNo='',auditItemTitle='',auditLocation='',auditRecordId='',auditAgentName='';
  try{
    auditCtx=modalAuditContext?Object.assign({},modalAuditContext):null;
    auditTitle=modalAuditTitle||'';
    formAgentId=form.elements?.agentId?.value||auditCtx?.agentId||'';
    formAgent=formAgentId?agentById(formAgentId):null;
    auditDate=auditDateFromForm(form,auditCtx||{});
    auditEntity=auditEntityFromForm(form,auditCtx||{});
    auditType=auditCtx?.type||'Autre';
    auditNo=String(auditCtx?.no||form.elements?.no?.value||'');
    auditItemTitle=String(form.elements?.title?.value||auditCtx?.title||'');
    auditLocation=[form.elements?.building?.value,form.elements?.floor?.value,form.elements?.room?.value].filter(Boolean).join(' ');
    auditRecordId=String(auditCtx?.recordId||'');
    auditAgentName=formAgent?agentName(formAgent):String(auditCtx?.agentName||'');
    if(auditType==='Agent'&&!auditAgentName){
      auditAgentName=[form.elements?.firstName?.value||'',form.elements?.lastName?.value||''].filter(Boolean).join(' ').trim();
    }
  }catch(auditPrepError){
    console.warn('Préparation historique ignorée pour ne pas bloquer le formulaire',auditPrepError);
    auditCtx=null;
  }
  btn.disabled=true;btn.textContent='Enregistrement…';
  try{
    const handlerResult=await modalHandler(form);
    if(handlerResult===false||handlerResult?.ok===false)return;
    if(changed.length&&auditCtx?.track){
      try{
        pushModificationHistory({
          type:auditType,entity:auditEntity,date:auditDate,changes,
          user:currentUser?.email||'Utilisateur',
          agentId:formAgentId,agentNameValue:auditAgentName,
          title:auditTitle||auditEntity,
          recordId:auditRecordId,no:auditNo,itemTitle:auditItemTitle,location:auditLocation
        });

        // V147.148 — l'historique est créé APRÈS la sauvegarde principale du formulaire.
        // Il faut donc synchroniser cette dernière écriture elle aussi, sinon localDirty
        // reste vrai et le voyant reste orange indéfiniment.
        if(currentUser&&navigator.onLine){
          const auditSync=await window.PSTMainState.persistNow();
          if(!auditSync?.ok||auditSync?.offline||auditSync?.pending){
            console.warn('Historique créé mais synchronisation Supabase en attente',auditSync);
          }
        }
      }catch(auditWriteError){
        console.error('Historique non bloquant',auditWriteError);
      }
    }
  }catch(err){
    console.error('Erreur d’enregistrement du formulaire :',err);
    const msg=err?.message?String(err.message):'Erreur inconnue';
    toast(`Enregistrement impossible : ${msg.slice(0,120)}`);
    setSaveState('Action non enregistrée — données précédentes conservées','local');
  }finally{btn.disabled=false;btn.textContent=oldBtnText||'Enregistrer'}
 });
 $('#modalSave').addEventListener('click',async e=>{
  const btn=e.currentTarget;
  if(btn?.dataset?.directSave!=='1')return;
  e.preventDefault();e.stopPropagation();
  const form=$('#modalForm');
  if(!form||!modalHandler)return;
  if(!form.checkValidity()){form.reportValidity();toast('Complétez les champs obligatoires indiqués');return}
  if(btn.disabled)return;
  const oldText=btn.textContent;
  btn.disabled=true;btn.dataset.directSaving='1';btn.textContent='Enregistrement…';
  try{
    const result=await modalHandler(form);
    if(result===false||result?.ok===false){
      toast('La fiche n’a pas été enregistrée : vérifiez les champs');
      return;
    }
  }catch(error){
    console.error('Enregistrement direct formulaire agent',error);
    toast(`Enregistrement impossible : ${(error?.message||String(error)).slice(0,140)}`);
    setSaveState('Action non enregistrée','error');
  }finally{
    btn.disabled=false;btn.dataset.directSaving='';btn.textContent=oldText||'Enregistrer';
  }
 });
 $('#modalCancel').onclick=closeModal;$('#modalClose').onclick=closeModal;$('#modalDelete').onclick=()=>modalDeleteHandler?.();$('#detailClose').onclick=()=>$('#detailModal').close();$('#emailClose').onclick=()=>$('#emailModal').close();
 // Navigation mobile gérée uniquement par navigation.js pour éviter les doubles événements.
 $('#nav').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b){setView(b.dataset.view)}});
 document.addEventListener('click',e=>{const b=e.target.closest?.('[data-help-query]');if(!b)return;const q=b.dataset.helpQuery||'';const input=$('#pstHelpSearch');if(input)input.value=q;searchHelp(q)});
$('#layoutMode').onchange=e=>applyLayout(e.target.value);$('#printCurrent').onclick=()=>printView(document.querySelector('.view.active')?.id);
 const gay=$('#globalAcademicYear');if(gay)gay.onchange=e=>setActiveAcademicYear(e.target.value);const pay=$('#prevAcademicYear');if(pay)pay.onclick=()=>setActiveAcademicYear(shiftAcademicYear(activeAcademicYear(),-1));const nay=$('#nextAcademicYear');if(nay)nay.onclick=()=>setActiveAcademicYear(shiftAcademicYear(activeAcademicYear(),1));
 {const q=$('#quickAdd');if(q)q.onclick=openQuickMenu;const f=$('#quickNoteFab');if(f)f.onclick=openQuickMenu;}
 document.addEventListener('change',e=>{
   if(e.target?.matches?.('#activityAgentFilterChecks input[data-agent-filter]')){updateActivityAgentFilterSummary();renderAgentActivities()}
 });
 document.addEventListener('click',e=>{
   const all=e.target.closest?.('[data-activity-filter-all]'),none=e.target.closest?.('[data-activity-filter-none]');
   if(!all&&!none)return;
   e.preventDefault();
   document.querySelectorAll('#activityAgentFilterChecks input[data-agent-filter]').forEach(c=>c.checked=!!all);
   updateActivityAgentFilterSummary();renderAgentActivities();
 });
 const naa=$('#newAgentActivity');if(naa)naa.onclick=()=>openAgentActivity();
 const paa=$('#printAgentActivity');if(paa)paa.onclick=printAgentActivityRegister;
 for(const id of ['activityPeriodMode','activityReferenceDate','activityTypeFilter']){const e=$(`#${id}`);if(e)e.onchange=renderAgentActivities}
 $('#newAgent').onclick=()=>openAgent();const wr=$('#weekendRestAll');if(wr)wr.onclick=applyWeekendRestToAll;const aw=$('#addWeeklyAgent');if(aw)aw.onclick=()=>openAgent();const nw=$('#newWeeklyPlan');if(nw)nw.onclick=()=>openWeeklyPlan();$('#newRotation').onclick=()=>openRotation();$('#newRotationException').onclick=()=>openRotationException();$('#newShift').onclick=()=>{const a=$('#planningAgent').value||db.agents[0]?.id;openAgentDay(a,`${$('#planningMonth').value||monthISO()}-01`)};$('#newAbsence').onclick=openAbsence;$('#newVacation').onclick=()=>openVacation();$('#loadSchoolHolidays').onclick=loadSchoolHolidays;$('#newIssue').onclick=()=>openIssue();$('#newPeriodic').onclick=()=>openPeriodic();$('#newCleaning').onclick=()=>openCleaning();$('#newMaintenance').onclick=()=>openMaintenance();$('#newRequest').onclick=()=>openRequest();$('#newWork').onclick=()=>openWork();$('#newMeeting').onclick=()=>openMeeting();$('#newNote').onclick=()=>openNote();$('#newDocument').onclick=()=>openDocument();$('#newPersonalEvent').onclick=$('#newPersonalEventDash').onclick=()=>openPersonalEvent();$('#addBuilding').onclick=addBuilding;$('#addSpace').onclick=()=>openSpace();
 const ppm=$('#personalPrevMonth'),ptm=$('#personalTodayMonth'),pnm=$('#personalNextMonth');if(ppm)ppm.onclick=()=>{const e=$('#personalMonth');e.value=addMonths(`${e.value||monthISO()}-01`,-1).slice(0,7);renderPersonal()};if(ptm)ptm.onclick=()=>{const e=$('#personalMonth');e.value=monthISO();renderPersonal()};if(pnm)pnm.onclick=()=>{const e=$('#personalMonth');e.value=addMonths(`${e.value||monthISO()}-01`,1).slice(0,7);renderPersonal()};
 $('#prevTeamWeek').onclick=()=>{teamWeek=addDays(teamWeek,-7);renderTeamCalendar()};$('#nextTeamWeek').onclick=()=>{teamWeek=addDays(teamWeek,7);renderTeamCalendar()};$('#prevTeamMonth').onclick=()=>{teamWeek=startOfWeek(addMonths(teamWeek,-1));renderTeamCalendar()};$('#nextTeamMonth').onclick=()=>{teamWeek=startOfWeek(addMonths(teamWeek,1));renderTeamCalendar()};$('#todayTeamWeek').onclick=()=>{teamWeek=startOfWeek(todayISO());renderTeamCalendar()};$('#teamDateJump').onchange=e=>{teamWeek=startOfWeek(e.target.value);renderTeamCalendar()};$('#prevPersonalWeek').onclick=()=>{personalWeek=addDays(personalWeek,-7);renderPersonalCalendar()};$('#nextPersonalWeek').onclick=()=>{personalWeek=addDays(personalWeek,7);renderPersonalCalendar()};$('#todayPersonalWeek').onclick=()=>{personalWeek=startOfWeek(todayISO());renderPersonalCalendar()};
 $('#saveSettings').onclick=saveSettings;const wizardOpen=$('#openAutoReportWizard');if(wizardOpen)wizardOpen.onclick=openAutoReportWizard;const wizardClose=$('#autoReportWizardClose');if(wizardClose)wizardClose.onclick=()=>wizardEl().close();const wizardBack=$('#autoReportWizardBack');if(wizardBack)wizardBack.onclick=()=>{saveWizardStep();autoReportWizardStep=Math.max(0,autoReportWizardStep-1);renderAutoReportWizard()};const wizardNext=$('#autoReportWizardNext');if(wizardNext)wizardNext.onclick=()=>{saveWizardStep();if(autoReportWizardStep===3){wizardEl().close();return}autoReportWizardStep=Math.min(3,autoReportWizardStep+1);renderAutoReportWizard()};document.addEventListener('click',e=>{const p=e.target.closest('[data-wizard-provider]');if(p){autoReportWizardData.provider=p.dataset.wizardProvider;renderAutoReportWizard()}});const sart=$('#sendAutomaticReportTest');if(sart)sart.onclick=sendAutomaticReportTest;function openNotificationCenter(){window.PSTNotificationCenter?.open?.()}
function closeNotificationCenter(){window.PSTNotificationCenter?.close?.()}
const dsn=$('#dashboardSyncNow');if(dsn)dsn.onclick=dashboardSyncNow;
 refreshDashboardSyncIndicator();
 if(navigator.onLine&&currentUser)setTimeout(()=>autoSyncWhenNetworkReturns('ouverture application'),600);
 const chr=$('#changeHistoryReset');if(chr)chr.onclick=()=>{const y=$('#changeHistoryYear'),t=$('#changeHistoryType'),q=$('#changeHistorySearch');if(y)y.value=activeAcademicYear();if(t)t.value='';if(q)q.value='';renderChangeHistory()};
 const chp=$('#changeHistoryPrint');if(chp)chp.onclick=printChangeHistory;
 const chc=$('#changeHistoryClean');if(chc)chc.onclick=()=>{
   const before=(db.changeHistory||[]).length;
   db.changeHistory=(db.changeHistory||[]).filter(h=>Number(h?.historyVersion||0)>=2||isConcreteHistoryEntity(h));
   const removed=before-db.changeHistory.length;
   localDirty=true;try{writeMirror()}catch(_){}try{writeOfflinePending('nettoyage historique à synchroniser')}catch(_){}
   renderChangeHistory();
   toast(removed?`🧹 ${removed} ancienne(s) ligne(s) illisible(s) supprimée(s)`:'Historique déjà propre');
 };
 $('#archiveNow').onclick=()=>{const made=createWeeklyArchive(false);save();toast(made?'Archive créée':'La semaine précédente est déjà archivée')};$('#exportArchives').onclick=exportArchives;$('#exportBackup').onclick=exportBackup;$('#importBackup').onchange=e=>e.target.files[0]&&importBackup(e.target.files[0]);$('#resetData').onclick=resetData;const rr=$('#restoreReferenceData');if(rr)rr.onclick=restoreReferenceData;const dg=$('#runDiagnostic');if(dg)dg.onclick=runDiagnostic;const sp=$('#supabasePingBtn');if(sp)sp.onclick=manualSupabasePing;$('#resetPeriodicCatalog').onclick=()=>{if(confirm('Restaurer le catalogue par défaut ? Les contrôles personnalisés actuels seront remplacés.')){db.periodic=makePeriodic();save()}};$('#exportCsv').onclick=()=>exportStyledExcel($('#csvModule').value);$('#exportRotationCsv').onclick=()=>exportStyledExcel('rotations');const ewp=$('#exportWeeklyPlans');if(ewp)ewp.onclick=()=>exportStyledExcel('weeklyPlans');
 $('#copyMail').onclick=async()=>{const text=`À : ${$('#mailTo').value}\nCC : ${$('#mailCc').value}\nCCI : ${$('#mailBcc').value}\nObjet : ${$('#mailSubject').value}\n\n${$('#mailMessage').value}`;try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);else{const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()}toast('Message copié')}catch(e){prompt('Copiez le message :',text)}};$('#openMailClient').onclick=openMailClient;
 $$('[data-report-print]').forEach(b=>b.onclick=()=>printReport(b.dataset.reportPrint));$$('[data-report-email]').forEach(b=>b.onclick=()=>prepareEmail(b.dataset.reportEmail));$('#printFullRegister').onclick=()=>printReport('full');$$('[data-print]').forEach(b=>b.onclick=()=>printView(b.dataset.print)); const pc=$('#printCollectivePlanning');if(pc)pc.onclick=generateCollectivePlanningPDF;const pi=$('#printIndividualPlanning');if(pi)pi.onclick=generateIndividualPlanningPDF;
 document.addEventListener('click',e=>{const b=e.target.closest('[data-edit-weekly-plan]');if(b)openWeeklyPlan(Number(b.dataset.editWeeklyPlan))});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-new-weekly-agent]');if(b)openWeeklyPlan(null,b.dataset.newWeeklyAgent)});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-delete-standard-period]');if(b){e.preventDefault();e.stopPropagation();deleteStandardSchedulePeriod(b.dataset.deleteStandardPeriod)}});

 document.addEventListener('click',e=>{if(e.target.closest('#calculateHoursRange')){updateHoursRangeResult();return}const b=e.target.closest('[data-show-day-info]');if(!b)return;const rec=dayRecord(b.dataset.showDayInfo,b.dataset.date);if(!rec)return;openModal(`Informations — ${agentName(agentById(b.dataset.showDayInfo))} · ${fmtDate(b.dataset.date)}`,`<div class="manual-info-box"><strong>ⓘ Informations / Motif</strong><p>${esc(rec.note||'Aucune information renseignée.')}</p><small>Source : ${rec.source==='manual'?'Saisie manuelle':'Chronotime'}</small></div>`,()=>{});});
 const filterIds=['personalMonth','personalType','personalStatus','agentSearch','agentStatus','rotationAgent','rotationYear','rotationMonth','planningMonth','planningAgent','planningSignal','absenceMonth','absenceAgent','absenceType','absenceStatus','vacationZone','vacationStatus','issueMonth','issueAgent','issueCategory','issueStatus','periodicFamily','periodicStatus','periodicBuilding','cleanMonth','cleanBuilding','cleanRoomType','cleanStatus','cleaningGuideType','maintenanceStatus','maintenancePriority','maintenanceFamily','requestStatus','requestType','workStatus','workType','meetingMonth','meetingType','noteCategory','notePriority','noteStatus','noteSearch','documentCategory','documentSearch','archiveYear','archiveSearch','changeHistoryYear','changeHistoryType','changeHistorySearch','importArchiveType','importArchiveSearch'];for(const id of filterIds){const e=document.getElementById(id);if(e)e.addEventListener(e.tagName==='INPUT'&&e.type==='text'?'input':'change',()=>{if(id==='cleaningGuideType')renderCleaningGuide();else if(id.startsWith('personal'))renderPersonal();else if(id.startsWith('agent'))renderAgents();else if(id.startsWith('rotation'))renderRotations();else if(id.startsWith('planning'))renderPlanning();else if(id.startsWith('absence'))renderAbsences();else if(id.startsWith('vacation'))renderVacations();else if(id.startsWith('issue'))renderIssues();else if(id.startsWith('periodic'))renderPeriodic();else if(id.startsWith('clean'))renderCleaning();else if(id.startsWith('maintenance'))renderMaintenance();else if(id.startsWith('request'))renderRequests();else if(id.startsWith('work'))renderWorks();else if(id.startsWith('meeting'))renderMeetings();else if(id.startsWith('note'))renderNotes();else if(id.startsWith('document'))renderDocuments();else if(id.startsWith('archive')||id.startsWith('importArchive'))renderArchives()})}
 document.addEventListener('keydown',e=>{const go=e.target.closest?.('#dashboard [data-go]');if(go&&(e.key==='Enter'||e.key===' ')){e.preventDefault();dashboardShortcut(go.dataset.go)}});
 document.addEventListener('click',e=>{const mode=e.target.closest('[data-dashboard-period]');if(mode){dashboardPeriodModeV159=mode.dataset.dashboardPeriod==='week'?'week':'day';renderDashboard();return}const nav=e.target.closest('[data-dashboard-period-nav]');if(nav){const step=Number(nav.dataset.dashboardPeriodNav||0);dashboardPeriodDateV159=addDays(dashboardPeriodDateV159||todayISO(),step*(dashboardPeriodModeV159==='week'?7:1));renderDashboard();return}const today=e.target.closest('[data-dashboard-period-today]');if(today){dashboardPeriodDateV159=todayISO();const cy=academicYearFor(dashboardPeriodDateV159);if(activeAcademicYear()!==cy){setActiveAcademicYear(cy);return}renderDashboard();return}});
 document.addEventListener('change',e=>{if(e.target?.id==='dashboardPeriodDateV159'&&e.target.value){dashboardPeriodDateV159=e.target.value;renderDashboard();}});
 document.addEventListener('click',e=>{const open=e.target.closest('[data-agent-week-open]');if(open){openDashboardAgentWeekV150(0);return}const nav=e.target.closest('[data-agent-week-nav]');if(nav){const step=Number(nav.dataset.agentWeekNav||0);openDashboardAgentWeekV150(step===0?0:dashboardAgentWeekOffsetV150+step);return}});
document.addEventListener('click',async e=>{const ni=e.target.closest('[data-notification-index]');if(ni){const n=(window.__notifications||[])[Number(ni.dataset.notificationIndex)];closeNotificationCenter();if(n)notificationTarget(n);return}const ar=e.target.closest('[data-archive-detail]');if(ar){openArchiveDetail(ar.dataset.archiveDetail);return}const iana=e.target.closest('[data-open-import-analysis]');if(iana){openImportAnalysis(iana.dataset.openImportAnalysis);return}const irec=e.target.closest('[data-open-import-record]');if(irec){const id=irec.dataset.openImportRecord,m=irec.dataset.importModule;({notes:()=>openNote(id),issues:()=>openIssue(id),maintenance:()=>openMaintenance(id),requests:()=>openRequest(id),works:()=>openWork(id),meetings:()=>openMeeting(id),periodic:()=>openPeriodic(id),documents:()=>openDocument(id)}[m]||(()=>setView(m||'archives')))();return}const go=e.target.closest('[data-go]');if(go){if(go.closest('#dashboard'))dashboardShortcut(go.dataset.go);else setView(go.dataset.go);return}const quick=e.target.closest('[data-quick]');if(quick){dispatchQuick(quick.dataset.quick);return}const ae=e.target.closest('[data-agenda-source]');if(ae){
 const source=ae.dataset.agendaSource,id=ae.dataset.agendaId;
 if(source==='personal')openPersonalEvent(id);
 else if(source==='meeting')openMeeting(id);
 else if(source==='note')openNote(id);
 else if(source==='maintenance')openMaintenance(id);
 else if(source==='request')openRequest(id);
 else if(source==='work')openWork(id);
 else if(source==='issue')openIssue(id);
 else if(source==='cleaning')openCleaning(id);
 else if(source==='periodic')openPeriodic(id);
 else if(source==='contract')window.PSTContracts?.open?.(id);
 else if(source==='vacation')openVacation(id);
 else if(source==='roomprep'){setView('room-prep');setTimeout(()=>window.PSTRoomPrep?.edit?.(id),60)}
 else if(source==='agent-real-schedule'){const rec=byId('agentDays',id);if(rec)openAgentDay(rec.agentId,rec.date,null,rec.dayType||'Présence')}
 else if(source==='waste')setView('waste');
 return
}const perm=e.target.closest('[data-permanence-agent]');if(perm){openAgentPermanence(perm.dataset.permanenceAgent);return}const ed=e.target.closest('[data-edit-type]');if(ed){dispatchEdit(ed.dataset.editType,ed.dataset.editId);return}const ad=e.target.closest('[data-agent-day]');if(ad){openAgentDay(ad.dataset.agentDay,ad.dataset.date,null,ad.dataset.dayType||'');return}const np=e.target.closest('[data-new-personal-date]');if(np){openPersonalEvent(null,np.dataset.newPersonalDate);return}const nr=e.target.closest('[data-new-rotation-agent]');if(nr){openRotation(null,nr.dataset.newRotationAgent);return}const sc=e.target.closest('[data-sync-import-cloud]');if(sc){await syncAttachmentToCloud(sc.dataset.syncImportCloud);return}const vc=e.target.closest('[data-verify-import-cloud]');if(vc){await verifyAttachmentCloud(vc.dataset.verifyImportCloud);return}const di=e.target.closest('[data-delete-import]');if(di){await deleteImportedArchive(di.dataset.deleteImport);return}const dl=e.target.closest('[data-download]');if(dl){await downloadAttachment(dl.dataset.download);return}const gd=e.target.closest('[data-guide-path]');if(gd){await openGuide(gd.dataset.guidePath);return}const rb=e.target.closest('[data-remove-building]');if(rb){if(confirm('Supprimer ce bâtiment et ses niveaux de la liste ?')){const b=db.buildings.find(x=>x.id===rb.dataset.removeBuilding);db.buildings=db.buildings.filter(x=>x.id!==rb.dataset.removeBuilding);db.spaces=db.spaces.filter(s=>s.building!==b?.name);save()}return}const af=e.target.closest('[data-add-floor]');if(af){db.buildings.find(x=>x.id===af.dataset.addFloor)?.floors.push(`Nouvel étage`);renderSettings();return}const rf=e.target.closest('[data-remove-floor]');if(rf){const card=rf.closest('[data-building-id]'),b=db.buildings.find(x=>x.id===card.dataset.buildingId);b?.floors.splice(Number(rf.dataset.removeFloor),1);renderSettings();return}const al=e.target.closest('[data-add-list]');if(al){db.lists[al.dataset.addList].push('Nouveau choix');renderSettings();return}const rl=e.target.closest('[data-remove-list]');if(rl){const ed=rl.closest('[data-list-key]');db.lists[ed.dataset.listKey].splice(Number(rl.dataset.removeList),1);renderSettings();return}})
}


// V32 — Assistant de configuration des rapports automatiques
let autoReportWizardStep=0;
let autoReportWizardData={provider:'microsoft',tenantId:'',clientId:'',senderEmail:'',cronSecret:''};
function wizardEl(){return document.getElementById('autoReportWizard')}
function wizardBody(){return document.getElementById('autoReportWizardBody')}
function randomWizardSecret(){const a=new Uint8Array(24);crypto.getRandomValues(a);return Array.from(a,b=>b.toString(16).padStart(2,'0')).join('')}
function renderAutoReportWizard(){
 const steps=[...document.querySelectorAll('#autoReportWizard .wizard-progress span')];steps.forEach((x,i)=>{x.classList.toggle('active',i===autoReportWizardStep);x.classList.toggle('done',i<autoReportWizardStep)});
 const back=document.getElementById('autoReportWizardBack'),next=document.getElementById('autoReportWizardNext');if(back)back.hidden=autoReportWizardStep===0;if(next)next.textContent=autoReportWizardStep===3?'Fermer':'Suivant';
 if(autoReportWizardStep===0){wizardBody().innerHTML=`<div class="wizard-step"><h4>1. Choisir le mode d’envoi</h4><p>Pour envoyer depuis votre boîte Outlook professionnelle, choisissez Microsoft 365. Aucun mot de passe Outlook ne sera enregistré.</p><div class="wizard-choice-grid"><button type="button" class="wizard-choice ${autoReportWizardData.provider==='microsoft'?'selected':''}" data-wizard-provider="microsoft"><strong>Microsoft 365 / Outlook</strong><small>Envoi avec Microsoft Graph. Recommandé pour votre compte professionnel.</small></button><button type="button" class="wizard-choice ${autoReportWizardData.provider==='resend'?'selected':''}" data-wizard-provider="resend"><strong>Service Resend</strong><small>Alternative plus simple, mais l’expéditeur n’est pas directement votre boîte Outlook.</small></button></div><div class="wizard-status warn">L’assistant prépare et vérifie la configuration. Microsoft exige toutefois une autorisation administrateur dans Entra ID pour l’envoi automatique serveur.</div></div>`}
 if(autoReportWizardStep===1){
  if(autoReportWizardData.provider==='microsoft')wizardBody().innerHTML=`<div class="wizard-step"><h4>2. Informations Microsoft 365</h4><div class="form-grid"><label>Tenant ID Microsoft<input id="wizTenant" value="${esc(autoReportWizardData.tenantId)}" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"></label><label>Client ID de l’application<input id="wizClient" value="${esc(autoReportWizardData.clientId)}" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"></label><label class="span2">Adresse Outlook expéditrice<input id="wizSender" type="email" value="${esc(autoReportWizardData.senderEmail||db.settings.outlookEmail||'')}" placeholder="prenom.nom@etablissement.fr"></label></div><div class="wizard-checklist"><div class="wizard-check">① Dans Microsoft Entra ID, créer une inscription d’application.</div><div class="wizard-check">② Ajouter la permission d’application <strong>Mail.Send</strong>.</div><div class="wizard-check">③ Un administrateur Microsoft 365 doit accorder le consentement.</div><div class="wizard-check">④ Créer un secret client et le garder pour l’étape Supabase.</div></div><p class="hint">Le secret client ne doit jamais être saisi dans cette application.</p></div>`;
  else wizardBody().innerHTML=`<div class="wizard-step"><h4>2. Service Resend</h4><p>Créez un compte Resend et récupérez une clé API. La clé sera ajoutée uniquement dans les secrets Supabase.</p><div class="wizard-status warn">Pour envoyer à plusieurs destinataires avec votre propre adresse, un domaine de messagerie doit généralement être vérifié dans Resend.</div></div>`
 }
 if(autoReportWizardStep===2){
  if(!autoReportWizardData.cronSecret)autoReportWizardData.cronSecret=randomWizardSecret();
  const ms=autoReportWizardData.provider==='microsoft';
  const cmds=ms?`supabase secrets set MS_TENANT_ID="${autoReportWizardData.tenantId||'VOTRE_TENANT_ID'}"\nsupabase secrets set MS_CLIENT_ID="${autoReportWizardData.clientId||'VOTRE_CLIENT_ID'}"\nsupabase secrets set MS_CLIENT_SECRET="COLLEZ_ICI_LE_SECRET_CLIENT"\nsupabase secrets set MS_SENDER_EMAIL="${autoReportWizardData.senderEmail||'adresse@etablissement.fr'}"\nsupabase secrets set CRON_SECRET="${autoReportWizardData.cronSecret}"\nsupabase functions deploy automatic-report --no-verify-jwt`:`supabase secrets set RESEND_API_KEY="COLLEZ_ICI_LA_CLE_RESEND"\nsupabase secrets set REPORT_FROM_EMAIL="Pilotage Service Technique <adresse-verifiee@domaine.fr>"\nsupabase secrets set CRON_SECRET="${autoReportWizardData.cronSecret}"\nsupabase functions deploy automatic-report --no-verify-jwt`;
  wizardBody().innerHTML=`<div class="wizard-step"><h4>3. Installer la fonction Supabase</h4><p>Depuis un ordinateur où Supabase CLI est installé, ouvrez un terminal dans le dossier V32 et exécutez les commandes suivantes.</p><pre class="wizard-code" id="wizardCommands">${esc(cmds)}</pre><button type="button" class="ghost" id="copyWizardCommands">Copier les commandes</button><div class="wizard-status warn">Après le déploiement, exécutez aussi <strong>SETUP_CRON_EXEMPLE.sql</strong> dans SQL Editor en remplaçant le secret du cron par celui affiché ci-dessus.</div></div>`;
  setTimeout(()=>{const b=document.getElementById('copyWizardCommands');if(b)b.onclick=async()=>{await navigator.clipboard.writeText(document.getElementById('wizardCommands').innerText);toast('Commandes copiées')}},0)
 }
 if(autoReportWizardStep===3){wizardBody().innerHTML=`<div class="wizard-step"><h4>4. Vérifier et tester</h4><div class="wizard-checklist"><div class="wizard-check">Destinataires configurés : <strong>${esc(db.settings.emailsTo||'Aucun')}</strong></div><div class="wizard-check">Heure choisie : <strong>${esc(db.settings.autoReportHour||'07:00')}</strong></div><div class="wizard-check">Résumé quotidien : <strong>${db.settings.autoDailyEnabled?'Activé':'Désactivé'}</strong></div><div class="wizard-check">Bilan hebdomadaire : <strong>${db.settings.autoWeeklyEnabled?'Activé':'Désactivé'}</strong></div></div><div id="wizardTestStatus" class="wizard-status warn">Cliquez sur « Tester maintenant ». Si le serveur est correctement installé, un mail de test sera envoyé.</div><button type="button" class="primary" id="wizardRunTest">Tester maintenant</button></div>`;setTimeout(()=>{const b=document.getElementById('wizardRunTest');if(b)b.onclick=async()=>{const st=document.getElementById('wizardTestStatus');st.className='wizard-status warn';st.textContent='Test en cours…';try{if(!supabaseClient)throw new Error('Supabase non connecté');const {data,error}=await supabaseClient.functions.invoke('automatic-report',{body:{mode:'test'}});if(error)throw error;if(!data?.ok)throw new Error(data?.error||'Échec du test');st.className='wizard-status ok';st.textContent='Mail test envoyé. Vérifiez votre boîte de réception et les courriers indésirables.'}catch(e){st.className='wizard-status bad';st.textContent=`Test impossible : ${e.message||e}. La fonction ou le fournisseur d’e-mail n’est pas encore configuré côté Supabase.`}}},0)}
}
function openAutoReportWizard(){autoReportWizardStep=0;renderAutoReportWizard();const d=wizardEl();if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','')}
function saveWizardStep(){if(autoReportWizardStep===1&&autoReportWizardData.provider==='microsoft'){autoReportWizardData.tenantId=document.getElementById('wizTenant')?.value.trim()||'';autoReportWizardData.clientId=document.getElementById('wizClient')?.value.trim()||'';autoReportWizardData.senderEmail=document.getElementById('wizSender')?.value.trim()||''}}

document.addEventListener('change',e=>{const s=e.target.closest?.('[data-nc-status]');if(!s)return;const n=(db.reportNonconformities||[]).find(x=>String(x.id)===String(s.dataset.ncStatus));if(!n)return;const before=n.status;n.status=s.value;n.updatedAt=new Date().toISOString();n.statusHistory=n.statusHistory||[];n.statusHistory.push({at:n.updatedAt,from:before,to:n.status});const closed=['FAIT','Levée'].includes(n.status);for(const x of (db.issues||[]).filter(x=>String(x.sourceNonconformityId||'')===String(n.id))){x.status=closed?'Clôturé':'À faire';x.updatedAt=n.updatedAt;}for(const x of (db.maintenance||[]).filter(x=>String(x.sourceNonconformityId||'')===String(n.id))){x.status=closed?'Clôturé':'À faire';x.updatedAt=n.updatedAt;}save();renderPeriodic();renderIssues();renderMaintenance();toast(`Observation ${n.observationNo||''} : ${n.status} — plan d’action ${closed?'clôturé':'rouvert'}`)});
function init(){secureAppLogos();
 // V147.80 — à chaque ouverture, le contexte temporel repart de la date du jour.
 // L'année scolaire court du 1er septembre au 31 août. Le sélecteur du dashboard pilote ensuite toute l'application.
 window.PSTActiveAcademicYear=academicYearFor(todayISO());db.settings.academicYear=window.PSTActiveAcademicYear;const storedLayout=db.settings.defaultLayout||'auto';const academicStart=academicYearStart(activeAcademicYear());const defaults={personalMonth:monthISO(),planningMonth:monthISO(),absenceMonth:monthISO(),issueMonth:monthISO(),cleanMonth:monthISO(),meetingMonth:monthISO(),dailyDate:todayISO(),weeklyDate:todayISO(),monthlyDate:monthISO(),teamReportMonth:monthISO(),absenceReportMonth:monthISO(),cleaningReportMonth:monthISO(),maintenanceReportMonth:monthISO(),periodicReportYear:new Date().getFullYear(),collectivePlanningDate:todayISO(),individualPlanningFrom:todayISO(),individualPlanningTo:addDays(todayISO(),6)};for(const [id,v] of Object.entries(defaults))if(document.getElementById(id))document.getElementById(id).value=v;const ipa=$('#individualPlanningAgent');if(ipa){ipa.innerHTML=db.agents.filter(a=>a.status==='Actif').map(a=>`<option value="${a.id}">${esc(agentName(a))}</option>`).join('')}const ry=$('#rotationYear');if(ry){ry.innerHTML='';for(let y=academicStart-5;y<=academicStart+5;y++)ry.insertAdjacentHTML('beforeend',`<option value="${y}" ${y===academicStart?'selected':''}>${y}–${y+1}</option>`)}const rm=$('#rotationMonth');if(rm){rm.innerHTML='<option value="">Année scolaire entière</option>';for(const i of [9,10,11,12,1,2,3,4,5,6,7,8])rm.insertAdjacentHTML('beforeend',`<option value="${i}">${new Date(2026,i-1,1).toLocaleDateString('fr-FR',{month:'long'})}</option>`)}applyLayout(storedLayout);syncAcademicYearFilters(activeAcademicYear());runAutomaticHousekeeping();bindEvents();bindReliableDynamicActions();renderAll();renderGlobalAcademicYear();setView('dashboard')}
window.addEventListener('DOMContentLoaded',init);

document.addEventListener('DOMContentLoaded',()=>initAuth().catch(console.error),{once:true});
window.addEventListener('load',()=>initAuth().catch(console.error),{once:true});


const ONEDRIVE_PILOTAGE_ROOT='https://crrhonealpes-my.sharepoint.com/my?id=%2Fpersonal%2Fadelin%5Fvignal%5Fauvergnerhonealpes%5Ffr%2FDocuments%2FPilotage%20Service%20Technique&viewid=152cef09%2D9d18%2D493a%2D887f%2D4a1eefbc049f';
// ===== V147.24 — OneDrive = coffre documentaire ; Supabase = index + liens =====
function oneDriveLinksFor(module,recordId=''){
 return (db.oneDriveLinks||[]).filter(x=>x.module===module&&(!recordId||String(x.recordId||'')===String(recordId)));
}
function oneDriveLinkButtons(module,recordId=''){
 const rows=oneDriveLinksFor(module,recordId);if(!rows.length)return '';
 return `<div class="onedrive-links">${rows.map(x=>`<a class="ghost small onedrive-link" href="${esc(x.url)}" target="_blank" rel="noopener">☁️ ${esc(x.fileName||x.title||'Ouvrir dans OneDrive')}</a>`).join('')}</div>`;
}
function periodicOneDriveUrl(record){
 if(!record)return '';
 const linked=oneDriveLinksFor('periodic',record.id).find(x=>String(x.url||'').trim());
 return String(linked?.url||record.oneDriveUrl||'').trim();
}
function periodicOneDriveButtons(record){
 if(!record)return '';
 const rows=oneDriveLinksFor('periodic',record.id).filter(x=>String(x.url||'').trim());
 const urls=new Set(rows.map(x=>String(x.url||'').trim()));
 const fallback=String(record.oneDriveUrl||'').trim();
 const links=rows.map(x=>({
   url:String(x.url||'').trim(),
   label:x.fileName||x.title||'Ouvrir dans OneDrive'
 }));
 if(fallback&&!urls.has(fallback))links.push({url:fallback,label:'Ouvrir le document OneDrive'});
 if(!links.length)return '';
 return `<div class="onedrive-links">${links.map(x=>`<a class="ghost small onedrive-link" href="${esc(x.url)}" target="_blank" rel="noopener">☁️ ${esc(x.label)}</a>`).join('')}</div>`;
}
function savePeriodicOneDriveLink(record,url){
 const clean=String(url||'').trim();
 if(!record||!clean)return null;
 db.oneDriveLinks=Array.isArray(db.oneDriveLinks)?db.oneDriveLinks:[];
 const rows=oneDriveLinksFor('periodic',record.id);
 const existing=rows[0]||null;
 const meta={
   module:'periodic',
   recordId:record.id,
   category:record.family||'Contrôles périodiques',
   title:record.name||record.no||'Contrôle périodique',
   fileName:existing?.fileName||record.name||'Document OneDrive',
   url:clean,
   source:existing?.source||'periodic-form',
   updatedAt:new Date().toISOString(),
   academicYear:activeAcademicYear()
 };
 if(existing){Object.assign(existing,meta);return existing}
 return saveOneDriveIndex(meta);
}

function saveOneDriveIndex(meta){
 db.oneDriveLinks=Array.isArray(db.oneDriveLinks)?db.oneDriveLinks:[];
 const x={id:uid(),createdAt:new Date().toISOString(),academicYear:activeAcademicYear(),...meta};
 db.oneDriveLinks.push(x);return x;
}
function oneDriveClassificationFor(type,a){
 if(type==='chronotime')return {module:'chronotime',category:'Chronotime'};
 if(type==='periodic'||type==='control')return {module:'periodic',category:a?.control?.controlFamily||'Contrôles périodiques'};
 if(type==='administrative')return {module:'documents',category:'Document administratif'};
 return {module:'documents',category:'Autre document'};
}
function centralOneDrivePanel(){
 const type=$('#centralImportType')?.value||centralImportAnalysis?.detectedType||'other';
 const box=$('#centralOneDrivePanel');if(!box)return;
 if(type==='chronotime'){box.innerHTML='<div class="import-message"><strong>Chronotime</strong><p>Traitement Chronotime conservé tel quel. Aucun classement OneDrive imposé ici.</p></div>';return}
 const cls=oneDriveClassificationFor(type,centralImportAnalysis);
 const periodicOptions=(db.periodic||[]).map(x=>`<option value="${esc(x.id)}">${esc(x.no)} — ${esc(x.name)}</option>`).join('');
 const already=(db.oneDriveLinks||[]).find(x=>String(x.id)===String(centralImportAnalysis?.oneDriveLinkId||''));
 box.innerHTML=`<section class="onedrive-classifier"><h4>☁️ Classement OneDrive</h4><p class="hint"><strong>1.</strong> Préparez le PDF et ouvrez OneDrive. <strong>2.</strong> Chargez-le dans le dossier voulu. <strong>3.</strong> Dans OneDrive faites Partager → Copier le lien. <strong>4.</strong> Revenez ici et cliquez sur « J’ai enregistré dans OneDrive ».</p><div class="form-grid"><label>Rubrique détectée<input id="centralOneDriveCategory" value="${esc(already?.category||cls.category)}"></label>${cls.module==='periodic'?`<label>Contrôle concerné<select id="centralOneDriveRecord"><option value="">À choisir…</option>${periodicOptions}</select></label>`:''}<label class="span2">Lien OneDrive du fichier<input id="centralOneDriveUrl" type="url" value="${esc(already?.url||'')}" placeholder="Collez ici le lien copié depuis OneDrive"></label></div><div class="card-actions"><button type="button" class="primary" id="centralSavePdfOneDrive">☁️ Préparer le PDF + ouvrir OneDrive</button><button type="button" class="ghost" id="centralOpenOneDrive">Ouvrir Pilotage Service Technique</button><button type="button" class="ghost" id="centralPasteOneDriveLink">📋 Coller le lien copié</button><button type="button" class="primary onedrive-done" id="centralConfirmOneDriveSaved" disabled>✅ J’ai enregistré dans OneDrive</button></div><div id="centralOneDriveSaveHelp" class="import-message ${already?'':'hidden'}">${already?`<strong>✅ Lien OneDrive déjà classé</strong><p>${esc(already.fileName||already.title||'Document')} est rattaché à ${esc(already.category||cls.category)}.</p>`:''}</div></section>`;
 const record=$('#centralOneDriveRecord');if(record&&already?.recordId)record.value=String(already.recordId);
 $('#centralSavePdfOneDrive')?.addEventListener('click',()=>downloadCentralPdfForOneDrive());
 $('#centralOpenOneDrive')?.addEventListener('click',()=>window.open(ONEDRIVE_PILOTAGE_ROOT,'_blank','noopener'));
 $('#centralPasteOneDriveLink')?.addEventListener('click',()=>pasteOneDriveLinkFromClipboard());
 $('#centralConfirmOneDriveSaved')?.addEventListener('click',()=>confirmCentralOneDriveSaved());
 $('#centralOneDriveUrl')?.addEventListener('input',updateCentralOneDriveValidationState);
 $('#centralOneDriveRecord')?.addEventListener('change',updateCentralOneDriveValidationState);
 updateCentralOneDriveValidationState();
}

function updateCentralOneDriveValidationState(){
 const type=$('#centralImportType')?.value||centralImportAnalysis?.detectedType||'other';
 const url=String($('#centralOneDriveUrl')?.value||'').trim();
 const urlOk=type==='chronotime'||!validateOneDriveDocumentUrl(url);
 const recordOk=type==='chronotime'||!['periodic','control'].includes(type)||!!$('#centralOneDriveRecord')?.value;
 const saved=type==='chronotime'||!!(db.oneDriveLinks||[]).find(x=>String(x.id)===String(centralImportAnalysis?.oneDriveLinkId||''));
 const oneDriveBtn=$('#centralConfirmOneDriveSaved');
 if(oneDriveBtn){
   oneDriveBtn.disabled=type!=='chronotime'&&!(urlOk&&recordOk);
   oneDriveBtn.title=oneDriveBtn.disabled?'Collez d’abord un lien OneDrive valide'+(recordOk?'':' et choisissez le contrôle concerné'):'Lien valide — vous pouvez confirmer';
 }
 const finalBtn=$('#centralImportConfirm');
 if(finalBtn){
   finalBtn.disabled=type!=='chronotime'&&!saved;
   finalBtn.title=finalBtn.disabled?'Le lien OneDrive doit être enregistré avant de continuer':'';
 }
 const input=$('#centralOneDriveUrl');
 if(input){
   input.setAttribute('required','required');
   input.setAttribute('aria-invalid',url&& !urlOk?'true':'false');
 }
}

function downloadCentralPdfForOneDrive(){
 const file=centralImportAnalysis?.file;if(!file)return toast('Aucun PDF à enregistrer');
 try{
   const url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download=file.name||'document.pdf';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
   const help=$('#centralOneDriveSaveHelp');if(help){help.classList.remove('hidden');help.innerHTML=`<strong>PDF préparé : ${esc(file.name||'document.pdf')}</strong><p>Le navigateur vient de télécharger le PDF. Le dossier racine « Pilotage Service Technique » va s’ouvrir directement : allez dans le sous-dossier voulu puis utilisez <b>Ajouter / Charger → Fichiers</b> et sélectionnez ce PDF. Ensuite copiez son lien et revenez le coller dans l’application.</p>`}
   setTimeout(()=>window.open(ONEDRIVE_PILOTAGE_ROOT,'_blank','noopener'),250);
 }catch(e){console.error(e);toast('Impossible de préparer le PDF pour OneDrive')}
}
async function pasteOneDriveLinkFromClipboard(){
 const input=$('#centralOneDriveUrl');if(!input)return;
 try{
   if(!navigator.clipboard?.readText)throw new Error('Lecture du presse-papiers indisponible');
   const text=String(await navigator.clipboard.readText()||'').trim();
   if(!text)throw new Error('Presse-papiers vide');
   input.value=text;input.dispatchEvent(new Event('input',{bubbles:true}));
   updateCentralOneDriveValidationState();
   toast('Lien OneDrive collé');
 }catch(e){
   input.focus();toast('Collez le lien OneDrive dans le champ puis validez');
 }
}
function validateOneDriveDocumentUrl(url){
 const u=String(url||'').trim();if(!/^https:\/\//i.test(u))return 'Le lien doit commencer par https://';
 if(!/(sharepoint\.com|1drv\.ms|onedrive\.live\.com)/i.test(u))return 'Ce lien ne ressemble pas à un lien OneDrive / SharePoint';
 if(u===ONEDRIVE_PILOTAGE_ROOT)return 'Copiez le lien du fichier, pas le lien du dossier racine';
 return '';
}
function confirmCentralOneDriveSaved(){
 if(!centralImportAnalysis)return toast('Aucun document analysé');
 const type=$('#centralImportType')?.value||centralImportAnalysis.detectedType||'other';
 const file=centralImportAnalysis.file;
 const url=String($('#centralOneDriveUrl')?.value||'').trim();
 const err=validateOneDriveDocumentUrl(url);if(err){toast(err);$('#centralOneDriveUrl')?.focus();return false}
 const cls=oneDriveClassificationFor(type,centralImportAnalysis),recordId=$('#centralOneDriveRecord')?.value||'';
 if(cls.module==='periodic'&&!recordId){toast('Choisissez le contrôle périodique concerné');$('#centralOneDriveRecord')?.focus();return false}
 const existing=(db.oneDriveLinks||[]).find(x=>String(x.id)===String(centralImportAnalysis.oneDriveLinkId||''));
 const meta={module:cls.module,recordId,category:String($('#centralOneDriveCategory')?.value||cls.category).trim(),title:file?.name?.replace(/\.pdf$/i,'')||'',fileName:file?.name||'',url,detectedType:type,source:'import-central'};
 let saved;
 if(existing){Object.assign(existing,meta,{updatedAt:new Date().toISOString(),academicYear:activeAcademicYear()});saved=existing}
 else saved=saveOneDriveIndex(meta);
 centralImportAnalysis.oneDriveLinkId=saved.id;
 save(false);
 const help=$('#centralOneDriveSaveHelp');if(help){help.classList.remove('hidden');help.innerHTML=`<strong>✅ Lien OneDrive enregistré et classé</strong><p>${esc(saved.fileName||'Document')} → ${esc(saved.category||'Documents')}${saved.module==='periodic'?'. Il sera rattaché au contrôle sélectionné.':'.'}</p>`}
 updateCentralOneDriveValidationState();
 toast('✅ Lien OneDrive classé dans l’application');
 return saved;
}
function captureCentralOneDriveLink(type,file){
 if(type==='chronotime')return null;
 const existing=(db.oneDriveLinks||[]).find(x=>String(x.id)===String(centralImportAnalysis?.oneDriveLinkId||''));
 if(existing)return existing;
 const url=String($('#centralOneDriveUrl')?.value||'').trim();
 if(!url){toast('Lien OneDrive obligatoire avant validation');$('#centralOneDriveUrl')?.focus();updateCentralOneDriveValidationState();return false;}
 const err=validateOneDriveDocumentUrl(url);if(err){toast(err);return false}
 return confirmCentralOneDriveSaved()||false;
}

// ===== V80 — Import centralisé + archivage des originaux =====
let centralImportAnalysis=null,centralImportDuplicateInfo=null;
function resetCentralImport(){centralImportAnalysis=null;centralImportDuplicateInfo=null;const f=$('#centralPdfFile');if(f)f.value='';$('#centralImportStart')?.classList.remove('hidden');$('#centralImportAnalysis')?.classList.add('hidden');$('#centralImportConfirm')?.classList.add('hidden');if($('#centralImportMeta'))$('#centralImportMeta').innerHTML='';if($('#centralImportPreview'))$('#centralImportPreview').innerHTML='';const c=$('#centralImportConfirm');if(c){c.disabled=false;c.title=''}}
function openCentralImportHub(){const d=$('#centralImportModal');if(!d)return toast('Import central indisponible');resetCentralImport();d.showModal()}
async function genericImportedDocument(file,type){
 const labels={administrative:'Document administratif',other:'Autre document'},label=labels[type]||'Autre document';
 const id=uid();let attachment=null;const od=(db.oneDriveLinks||[]).find(x=>String(x.id)===String(centralImportAnalysis?.oneDriveLinkId||''));
 if(!od){try{attachment=await putFile(file,{module:'imports',recordId:id});db.attachments.push(attachment)}catch(e){console.error(e);toast('Impossible d’archiver le PDF original');return false}}
 const doc={id,no:nextNo('document','DOC'),date:todayISO(),title:file.name.replace(/\.pdf$/i,''),category:label==='Document administratif'?'Administratif':'Autre',description:od?'Original classé dans OneDrive. Supabase conserve le lien et les données.':'Document importé depuis le moteur central.',linkedModule:'Général',attachments:attachment?[attachment]:[],oneDriveLinkId:od?.id||'',importedAt:new Date().toISOString()};
 if(od){od.recordId=id;od.module='documents'}
 db.documents.push(doc);db.importArchives=db.importArchives||[];const archive={id:uid(),sourceId:doc.id,createdAt:doc.importedAt,type:label,fileName:file.name,attachmentId:attachment?.id||'',subject:doc.title,summary:'Document original conservé dans Documentation',module:'documents',recordId:doc.id,fileHash:centralImportAnalysis?.fileHash||'',analysisSnapshot:{type:label,fileName:file.name,subject:doc.title,summary:'Document original conservé dans Documentation',confidence:centralImportAnalysis?Math.max(centralImportAnalysis.chronoConfidence||0,centralImportAnalysis.controlConfidence||0):0}};db.importArchives.push(archive);if(attachment)registerImportOriginal(archive,attachment);await save();renderAll();return true;
}

function centralImportValidationHtml(a){
 const c=a?.chrono||{},r=a?.control||{},type=$('#centralImportType')?.value||a?.detectedType||'other';
 const item=(k,v,ok=true)=>`<article><span>${esc(k)}</span><strong>${esc(v==null||v===''?'À vérifier':String(v))}</strong><small>${ok?'✅':'⚠️'}</small></article>`;
 let cards=[];
 if(type==='chronotime'){
  const counts=c.codeCounts||{};
  cards=[item('Agent',c.agentNameRaw||c.agent?.name||a.details||'',!!(c.agentNameRaw||c.agent)),item('Période',c.start&&c.end?`${c.start} → ${c.end}`:'',!!(c.start&&c.end)),item('Année scolaire',c.academicYear||'',!!c.academicYear),item('Jours reconnus',c.expectedDays?`${c.records?.length||0}/${c.expectedDays}`:`${c.records?.length||0}`,!!(c.records?.length)),item('Jours avec durée',c.durationDays||0,true),item('Présence',c.totals?.presence==null?'Manquante':`${Math.trunc(Math.abs(c.totals.presence)/60)}h${String(Math.abs(c.totals.presence)%60).padStart(2,'0')}`,c.totals?.presence!=null),item('Référence',c.totals?.reference==null?'Manquante':`${Math.trunc(Math.abs(c.totals.reference)/60)}h${String(Math.abs(c.totals.reference)%60).padStart(2,'0')}`,c.totals?.reference!=null),item('Écart annuel',c.totals?.delta==null?'Manquant':`${c.totals.delta<0?'-':c.totals.delta>0?'+':''}${Math.trunc(Math.abs(c.totals.delta)/60)}h${String(Math.abs(c.totals.delta)%60).padStart(2,'0')}`,c.totals?.delta!=null),item('CA',counts.CA||0,true),item('RTT',counts.RTT||0,true),item('RH',counts.RH||0,true),item('RFE',counts.RFE||0,true),item('Informations complètes',c.informationComplete?'Oui':`Non — ${(c.missingInfo||[]).join(', ')||'à vérifier'}`,!!c.informationComplete)];
 }else if(type==='control'||type==='periodic'){
  cards=[item('Organisme',r.organization||'',!!r.organization),item('Famille',r.controlFamily||'',!!r.controlFamily),item('Date du rapport',r.reportDate||'',!!r.reportDate),item('Non-conformités détectées',r.candidates?.length||0,true),item('Confiance',`${r.confidence||0}%`,(r.confidence||0)>=50)];
 }else cards=[item('Type proposé',a.detectedLabel||type,true),item('Confiance Chronotime',`${a.chronoConfidence||0}%`,true),item('Confiance contrôle',`${a.controlConfidence||0}%`,true)];
 return `${duplicateWarningHtml(centralImportDuplicateInfo)}<div class="import-validation-sheet"><h4>Contrôle avant validation</h4><div class="summary-grid">${cards.join('')}</div><p class="hint">Vérifiez ces informations. Rien n’est enregistré avant votre validation finale dans le module concerné.</p></div>`;
}
function refreshCentralImportValidation(){if(!centralImportAnalysis)return;$('#centralImportMeta').innerHTML=centralImportValidationHtml(centralImportAnalysis);centralOneDrivePanel()}
function bindCentralImportV80(){
 $('#centralImportClose')?.addEventListener('click',()=>$('#centralImportModal').close());
 $('#centralImportBack')?.addEventListener('click',resetCentralImport);
 $('#centralScanChoice')?.addEventListener('click',()=>{$('#centralImportModal').close();openScanCameraDirect()});
 $('#centralImportType')?.addEventListener('change',refreshCentralImportValidation);
 $('#centralPdfFile')?.addEventListener('change',async e=>{
   const file=e.target.files?.[0];if(!file)return;
   centralImportDuplicateInfo=await inspectImportDuplicate(file);
   $('#centralImportStart').classList.add('hidden');
   $('#centralImportAnalysis').classList.remove('hidden');
   $('#centralImportProgress').textContent='Analyse du PDF en cours…';
   $('#centralImportConfirm').classList.add('hidden');
   try{
     if(!window.PDFImportModule?.centralAnalyze)throw new Error('Moteur PDF indisponible');

     // Analyse métier déterministe en premier (notamment Chronotime).
     centralImportAnalysis=await window.PDFImportModule.centralAnalyze(file);
     const a=centralImportAnalysis;

     // Analyse IA en complément. Elle ne remplace jamais les données Chronotime structurées :
     // elle sert à comprendre le document, les notes, dates, noms, tableaux et zones incertaines.
     try{
       $('#centralImportProgress').textContent='Analyse métier terminée — lecture IA du PDF…';
       const ai=await analyzeDocumentWithAI(file,{mode:a.detectedType==='chronotime'?'chronotime_pdf':'document'});
       a.aiAnalysis=ai;
       if(a.detectedType!=='chronotime' && ai?.documentType){
         const t=normalizeText(ai.documentType);
         if(t.includes('controle'))a.detectedType='control';
         else if(t.includes('administr'))a.detectedType='administrative';
       }
     }catch(aiError){
       console.warn('Analyse IA PDF indisponible',aiError);
       a.aiError=aiError?.message||String(aiError);
     }

     $('#centralImportType').value=a.detectedType;
     refreshCentralImportValidation();
     const url=URL.createObjectURL(file);
     const aiBlock=a.aiAnalysis?aiReviewHtml(a.aiAnalysis):(a.aiError?`<div class="import-message warning">Analyse IA non disponible : ${esc(a.aiError)}. Le moteur PDF classique reste actif.</div>`:'');
     $('#centralImportPreview').innerHTML=`${aiBlock}<details open><summary>📄 Aperçu du PDF original</summary><iframe src="${url}" title="Aperçu PDF" style="width:100%;height:360px;border:1px solid #d9e2ec;border-radius:12px;background:#fff"></iframe></details>`;
     $('#centralImportProgress').textContent='Analyse terminée — vérifiez toutes les informations avant de continuer.';
     $('#centralImportConfirm').classList.remove('hidden');
     updateCentralOneDriveValidationState();
   }catch(err){
     console.error(err);
     // Même si le parseur classique échoue, essayer l'IA avant de rendre la main.
     let ai=null,aiError='';
     try{ai=await analyzeDocumentWithAI(file,{mode:'document'})}catch(e2){aiError=e2?.message||String(e2)}
     centralImportAnalysis={file,detectedType:'other',detectedLabel:'Autre document',chronoConfidence:0,controlConfidence:0,aiAnalysis:ai,aiError};
     if(ai?.documentType){
       const t=normalizeText(ai.documentType);
       if(t.includes('controle'))centralImportAnalysis.detectedType='control';
       else if(t.includes('administr'))centralImportAnalysis.detectedType='administrative';
     }
     $('#centralImportType').value=centralImportAnalysis.detectedType;
     refreshCentralImportValidation();
     $('#centralImportPreview').innerHTML=ai?aiReviewHtml(ai):`<div class="import-message warning">Analyse automatique limitée. Classement manuel possible.</div>`;
     $('#centralImportProgress').textContent=ai?'Lecture IA terminée — vérifiez avant validation.':'Impossible d’analyser automatiquement ce PDF. Classement manuel disponible.';
     $('#centralImportConfirm').classList.remove('hidden');
     updateCentralOneDriveValidationState();
   }
 });
 $('#centralImportConfirm')?.addEventListener('click',async()=>{if(!centralImportAnalysis)return;if(!confirmDuplicateImport(centralImportDuplicateInfo))return;const type=$('#centralImportType').value,file=centralImportAnalysis.file;if(type!=='chronotime'&&!centralImportAnalysis.oneDriveLinkId){toast('Lien OneDrive obligatoire : enregistrez d’abord le lien du fichier');updateCentralOneDriveValidationState();$('#centralOneDriveUrl')?.focus();return}const oneDriveSaved=captureCentralOneDriveLink(type,file);if(oneDriveSaved===false)return;centralImportAnalysis.oneDriveLinkId=oneDriveSaved?.id||'';centralImportAnalysis.fileHash=centralImportDuplicateInfo?.fileHash||'';centralImportAnalysis.duplicateConfirmed=true;if(centralImportAnalysis.chrono)centralImportAnalysis.chrono.duplicateConfirmed=true;if(centralImportAnalysis.control)centralImportAnalysis.control.duplicateConfirmed=true;$('#centralImportModal').close();if(['chronotime','periodic','control'].includes(type)){window.PDFImportModule?.routeCentral?.(centralImportAnalysis,type);if(type==='control'||type==='periodic')toast('Étape 2/2 : validez maintenant le rapport dans Contrôles périodiques');return}if(await genericImportedDocument(file,type)){setView('archives');toast('Document importé et archivé')}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindCentralImportV80);else bindCentralImportV80();


// V147.11 : après chargement de la base, analyser aussi les Chronotime historiques.
window.addEventListener('pst:data-loaded',()=>{
  try{
    const n=syncStoredChronotimePastilles();
    enforceAgentDaysStable('relecture données / Chronotime');
    syncRotationYearWithDashboard();

    // IMPORTANT : pst:data-loaded est déclenché après une synchro Supabase réussie.
    // Ne jamais rappeler save(false) ici : save() remet localDirty=true et créait
    // une boucle "synchronisé -> données en attente -> resynchronisation".
    // Les pastilles Chronotime reconstruites sont conservées dans le miroir local.
    if(n>0){
      try{writeMirror()}catch(_){}
      console.info(`Chronotime : ${n} pastille(s) reconstruite(s) sans relancer une sauvegarde cloud`);
    }
    safeRenderAll();
    refreshDashboardSyncIndicator();
  }catch(e){console.warn('Reconstruction pastilles Chronotime',e)}
});


// ===== V147.148 — Analyse IA sécurisée photo/PDF =====
// Aucune clé OpenAI n'est stockée dans le navigateur.
// L'application appelle une Edge Function Supabase authentifiée.
async function fileToBase64Payload(file){
  const data=await file.arrayBuffer();
  const bytes=new Uint8Array(data);
  let binary='';
  const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
  return btoa(binary);
}
function aiDestinationValue(v=''){
  const n=normalizeText(v);
  const map={
    'bloc notes':'notes','bloc-notes':'notes','notes':'notes',
    'securite qualite':'issues','securite':'issues','qualite':'issues',
    'maintenance':'maintenance','intervention':'maintenance',
    'demandes direction':'requests','demande direction':'requests','requests':'requests',
    'chantiers gpa':'works','chantier':'works','travaux':'works',
    'reunions rendez vous':'meetings','reunion':'meetings','rendez vous':'meetings',
    'controles periodiques':'periodic','controle periodique':'periodic',
    'documents':'documents','document':'documents'
  };
  return map[n]||'notes';
}

async function pstEdgeFunctionRequest(functionName,body,{timeoutMs=25000}={}){
  if(!supabaseClient||!currentUser)throw new Error('Session Supabase absente');

  // 1) Chemin SDK Supabase.
  try{
    const sdkPromise=supabaseClient.functions.invoke(functionName,{body});
    const sdk=await withTimeout(sdkPromise,timeoutMs);
    if(!sdk?.error){
      return {data:sdk?.data||{},via:'sdk'};
    }
    console.warn(`Edge Function ${functionName} via SDK`,sdk.error);
  }catch(error){
    console.warn(`Edge Function ${functionName} via SDK indisponible`,error);
  }

  // 2) Secours : appel HTTP direct à l'URL officielle des Edge Functions.
  const cfg=window.SUPABASE_CONFIG||{};
  const base=String(cfg.url||'').replace(/\/+$/,'');
  if(!base)throw new Error('URL Supabase absente');

  const sessionResult=await supabaseClient.auth.getSession();
  const token=sessionResult?.data?.session?.access_token;
  if(!token)throw new Error('Session Supabase expirée : reconnectez-vous');

  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const res=await fetch(`${base}/functions/v1/${encodeURIComponent(functionName)}`,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization':`Bearer ${token}`,
        'apikey':String(cfg.publishableKey||'')
      },
      body:JSON.stringify(body||{}),
      signal:controller.signal
    });
    let data=null;
    const raw=await res.text();
    try{data=raw?JSON.parse(raw):{}}catch(_){data={raw}}
    if(!res.ok){
      if(res.status===404)throw new Error(`Edge Function "${functionName}" non déployée dans Supabase`);
      if(res.status===401||res.status===403)throw new Error('Edge Function refusée : session ou autorisation Supabase invalide');
      throw new Error(data?.error||data?.message||`Edge Function HTTP ${res.status}`);
    }
    return {data:data||{},via:'direct'};
  }catch(error){
    if(error?.name==='AbortError')throw new Error('Edge Function trop lente ou injoignable (délai dépassé)');
    throw error;
  }finally{
    clearTimeout(timer);
  }
}

async function analyzeDocumentWithAI(file,{mode='document'}={}){
  if(!file)throw new Error('Document absent');
  if(!navigator.onLine)throw new Error('Analyse IA disponible lorsque le réseau est revenu');
  if(!supabaseClient||!currentUser)throw new Error('Connexion Supabase requise pour l’analyse IA');

  const maxBytes=18*1024*1024;
  if(Number(file.size||0)>maxBytes)throw new Error('Document trop volumineux pour l’analyse IA (18 Mo maximum)');
  const base64=await fileToBase64Payload(file);

  const call=await pstEdgeFunctionRequest('swift-function',{
    fileName:file.name||'document',
    mimeType:file.type||(/\.pdf$/i.test(file.name||'')?'application/pdf':'application/octet-stream'),
    base64,
    mode
  },{timeoutMs:45000});

  const data=call?.data||{};
  if(!data?.ok)throw new Error(data?.error||'Analyse IA non disponible');
  if(data?.analysis&&typeof data.analysis==='object'){
    data.analysis._transport=call.via;
  }
  return data.analysis||{};
}
function aiReviewHtml(ai){
  if(!ai||typeof ai!=='object')return '';
  const uncertain=Array.isArray(ai.uncertain)?ai.uncertain:[];
  const items=uncertain.map(x=>`<li>${esc(typeof x==='string'?x:(x.text||x.value||'Zone incertaine'))}</li>`).join('');
  return `<div class="ai-review-box"><strong>✨ Analyse IA</strong>
    <span>Confiance : <b>${Number.isFinite(Number(ai.confidence))?Math.round(Number(ai.confidence)):'—'}%</b></span>
    ${ai.date?`<span>Date détectée : <b>${esc(ai.date)}</b></span>`:''}
    ${ai.title?`<span>Objet proposé : <b>${esc(ai.title)}</b></span>`:''}
    ${items?`<details open><summary>⚠️ À vérifier (${uncertain.length})</summary><ul>${items}</ul></details>`:'<span class="badge good">Aucune zone incertaine signalée</span>'}
  </div>`;
}

// ===== V81 — Scanner / OCR avec destination métier configurable =====
let scannedNoteAttachment=null;
function scanSetProgress(pct,title,text=''){
 const wrap=$('#scanProgress'); if(!wrap)return;
 wrap.classList.toggle('hidden',pct===null);
 if(pct===null)return;
 $('#scanProgressBar').style.width=`${Math.max(0,Math.min(100,pct))}%`;
 $('#scanProgressTitle').textContent=title||'Traitement en cours…';
 $('#scanProgressText').textContent=text||'';
}
function scanReset(){
 const f=$('#scanNoteFile'); if(f)f.value='';
 const t=$('#scanNoteText'); if(t)t.value='';
 const title=$('#scanNoteTitle'); if(title)title.value='';
 const img=$('#scanImagePreview'); if(img){img.src='';img.classList.remove('hidden')}
 const cv=$('#scanPdfCanvas'); if(cv)cv.classList.add('hidden');
 $('#scanPreviewWrap')?.classList.add('hidden');
 if($('#scanQuality'))$('#scanQuality').innerHTML='';
 scannedNoteAttachment=null; scanSetProgress(null);
}
function openScanNote(){
 const d=$('#scanNoteModal'); if(!d)return toast('Scanner indisponible');
 scanReset();
 const cat=$('#scanNoteCategory'), pri=$('#scanNotePriority'), dest=$('#scanDestination');
 if(cat)cat.innerHTML=selectOptions(db.lists.noteCategories||['Autre'],'Autre');
 if(pri)pri.innerHTML=selectOptions(db.lists.priorities||['Normale'],'Normale');
 if(dest)dest.value='notes';
 d.showModal();
}
function localCleanFrenchText(raw){
 let s=String(raw||'').replace(/\r/g,'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n');
 s=s.split('\n').map(x=>x.trim().replace(/\s+/g,' ')).join('\n');
 s=s.replace(/\s+([,.;!?…:])/g,'$1').replace(/([,.;!?…:])(?=[A-Za-zÀ-ÿ])/g,'$1 ');
 s=s.replace(/\b([Jj])\s['’]\s/g,"$1’").replace(/\b([LlDdMmTtSsCcNn])\s['’]\s/g,'$1’');
 s=s.replace(/\b([0-9]{1,2})\s*h\s*([0-9]{2})\b/gi,'$1h$2');
 // Common OCR / writing normalization without changing meaning.
 const fixes=[[/\bca\b/gi,'ça'],[/\bC est\b/g,"C’est"],[/\bc est\b/g,"c’est"],[/\bd accord\b/gi,"d’accord"],[/\baujourd hui\b/gi,"aujourd’hui"],[/\bn est\b/gi,"n’est"],[/\bqu il\b/gi,"qu’il"],[/\bj ai\b/gi,"j’ai"],[/\bil y a\s+a\b/gi,'il y a']];
 for(const [r,v] of fixes)s=s.replace(r,v);
 s=s.split('\n').map(line=>{if(!line)return '';const m=line.match(/^(?:[-•]|\d+[.)])\s*/);const prefix=m?m[0]:'';let body=m?line.slice(prefix.length):line;if(body)body=body.charAt(0).toUpperCase()+body.slice(1);return prefix+body}).join('\n');
 return s.trim();
}
function formatScannedNote(raw){
 let s=localCleanFrenchText(raw);
 const lines=s.split('\n').map(x=>x.trim()).filter(Boolean);
 if(lines.length<=1){
   // Split long OCR blocks on sentence boundaries to improve readability.
   s=s.replace(/([.!?])\s+(?=[A-ZÀ-ÖØ-Þ])/g,'$1\n');
 }else{
   s=lines.join('\n');
 }
 return s.replace(/\n{3,}/g,'\n\n').trim();
}
async function languageToolCorrect(text){
 const cleaned=formatScannedNote(text); if(!cleaned)return '';
 const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),12000);
 try{
   const body=new URLSearchParams({text:cleaned,language:'fr-FR'});
   const res=await fetch('https://api.languagetool.org/v2/check',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body,signal:controller.signal});
   if(!res.ok)throw new Error('LanguageTool '+res.status);
   const data=await res.json(); let out=cleaned;
   const matches=(data.matches||[]).filter(m=>m.replacements&&m.replacements[0]&&Number.isFinite(m.offset)&&Number.isFinite(m.length)).sort((a,b)=>b.offset-a.offset);
   for(const m of matches){const rep=m.replacements[0].value;if(rep&&rep.length<80)out=out.slice(0,m.offset)+rep+out.slice(m.offset+m.length)}
   return formatScannedNote(out);
 }finally{clearTimeout(timer)}
}
async function imageSourceFromFile(file){
 if(file.type==='application/pdf'||/\.pdf$/i.test(file.name)){
   if(!window.pdfjsLib)throw new Error('Lecteur PDF indisponible');
   window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
   const buf=await file.arrayBuffer(), pdf=await window.pdfjsLib.getDocument({data:buf}).promise;
   const page=await pdf.getPage(1), vp=page.getViewport({scale:2.2});
   const canvas=$('#scanPdfCanvas'); canvas.width=vp.width;canvas.height=vp.height;canvas.classList.remove('hidden');$('#scanImagePreview').classList.add('hidden');
   await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
   if(pdf.numPages>1)toast(`PDF de ${pdf.numPages} pages : reconnaissance de la première page pour cette note`);
   return canvas;
 }
 const url=URL.createObjectURL(file), img=$('#scanImagePreview'); img.src=url;img.classList.remove('hidden');$('#scanPdfCanvas').classList.add('hidden');
 await new Promise((ok,ko)=>{img.onload=ok;img.onerror=ko});
 return img;
}
function suggestScannedDestination(text){
 const t=normalizeText(text||'');
 const scores={notes:1,issues:0,maintenance:0,requests:0,works:0,meetings:0,periodic:0,documents:0};
 const add=(key,words,pts=2)=>{for(const w of words)if(t.includes(normalizeText(w)))scores[key]+=pts};
 add('periodic',['controle periodique','verification periodique','apave','socotec','dekra','bureau veritas','qualiconsult','rapport de controle','registre de securite'],4);
 add('issues',['securite','danger','incident','non conformite','non-conformite','anomalie','risque','qualite'],3);
 add('maintenance',['panne','reparer','reparation','fuite','maintenance','intervention','defaut','hors service'],3);
 add('requests',['direction','demande de la direction','demande direction','amenagement','demande'],2);
 add('works',['chantier','gpa','architecte','maitrise d oeuvre','reserve','travaux'],3);
 add('meetings',['reunion','rendez vous','rendez-vous','compte rendu','participants','ordre du jour'],3);
 add('documents',['procedure','notice','attestation','courrier','certificat','document administratif'],2);
 return Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0];
}
async function recognizeScannedNote(file){
 if(!file)return;
 $('#scanPreviewWrap')?.classList.remove('hidden');
 scanSetProgress(5,'Préparation du document',file.name||'Document');
 scannedNoteAttachment={name:file.name||`scan-${todayISO()}`,type:file.type||'application/octet-stream',file};

 if(!navigator.onLine){
   scanSetProgress(null);
   $('#scanQuality').innerHTML='<div class="import-message warning">Analyse IA obligatoire : aucun réseau disponible. Le document n’est pas interprété.</div>';
   return;
 }
 if(!supabaseClient||!currentUser){
   scanSetProgress(null);
   $('#scanQuality').innerHTML='<div class="import-message warning">Analyse IA obligatoire : session Supabase absente.</div>';
   return;
 }

 try{
   scanSetProgress(15,'Analyse IA du document','Lecture de l’écriture, de la structure, des dates, noms et échéances…');
   const ai=await analyzeDocumentWithAI(file,{mode:'handwritten_note'});
   const text=formatScannedNote(ai.transcription||ai.text||'');
   if(!text)throw new Error('L’IA n’a retourné aucun texte exploitable');
   $('#scanNoteText').value=text;
   const suggested=aiDestinationValue(ai.destination||suggestScannedDestination(text));
   if($('#scanDestination'))$('#scanDestination').value=suggested;
   if(!$('#scanNoteTitle').value)$('#scanNoteTitle').value=String(ai.title||text.split('\n').find(Boolean)||'Document scanné').slice(0,80);
   $('#scanQuality').innerHTML=`${aiReviewHtml(ai)}<span class="badge good">Lecture : IA obligatoire</span><span class="badge">${text.trim()?text.trim().split(/\s+/).length:0} mots</span><p class="hint">Relisez les éléments signalés « à vérifier » avant d’enregistrer.</p>`;
   scanSetProgress(100,'Analyse IA terminée','Le texte reste modifiable avant validation.');
   setTimeout(()=>scanSetProgress(null),700);
 }catch(error){
   console.error('Analyse IA obligatoire',error);
   scanSetProgress(null);
   const msg=error?.message||String(error);
   $('#scanQuality').innerHTML=`<div class="import-message warning"><strong>IA indisponible.</strong><br>${esc(msg)}<br><small>Aucun OCR de secours n’a été utilisé. Réessayez après correction de la connexion.</small></div>`;
   pstSetLiveConnection?.('edge','red',msg);
   renderLiveConnections?.();
 }
}
async function correctScannedNote(){
 const box=$('#scanNoteText');
 const file=scannedNoteAttachment?.file;
 if(!file)return toast('Aucun document à relire par l’IA');
 if(!navigator.onLine||!supabaseClient||!currentUser)return toast('IA indisponible : vérifiez les voyants de connexion');
 try{
   scanSetProgress(20,'Relecture IA','Correction de forme sans inventer les mots incertains…');
   const ai=await analyzeDocumentWithAI(file,{mode:'handwritten_note'});
   const text=formatScannedNote(ai.transcription||ai.text||'');
   if(!text)throw new Error('Aucun texte retourné par l’IA');
   if(box)box.value=text;
   $('#scanQuality').innerHTML=aiReviewHtml(ai)+`<span class="badge good">Relecture IA terminée</span>`;
   scanSetProgress(null);
 }catch(e){
   scanSetProgress(null);
   toast(`IA indisponible : ${e?.message||e}`);
 }
}
async function saveScannedNote(){
 const text=($('#scanNoteText')?.value||'').trim(), title=($('#scanNoteTitle')?.value||'').trim(), destination=$('#scanDestination')?.value||'notes';
 if(!text)return toast('Le texte reconnu est vide');
 let scanDuplicateInfo=null;if(scannedNoteAttachment?.file){scanDuplicateInfo=await inspectImportDuplicate(scannedNoteAttachment.file);if(!confirmDuplicateImport(scanDuplicateInfo))return}
 const id=uid(), importedAt=new Date().toISOString(), priority=$('#scanNotePriority')?.value||'Normale', category=$('#scanNoteCategory')?.value||'Autre';
 let attachment=null;
 if(scannedNoteAttachment?.file){
   const f=scannedNoteAttachment.file;
   try{
     attachment=await putFile(f,{module:`scan-${destination}`,recordId:id});
     db.attachments.push(attachment);
   }catch(e){
     console.error('Stockage Supabase du scan impossible',e);
     setSaveState(`Scan non envoyé dans Supabase : ${e?.message||e}`,'error');
     toast('Scan non enregistré : le fichier original n’a pas été synchronisé dans Supabase');
     return;
   }
 }
 const attachments=attachment?[attachment]:[]; let record=null, archiveType='Document scanné', view=destination;
 if(destination==='notes'){
   record={id,no:nextNo('note','NOT'),date:todayISO(),category,agentId:'',title:title||'Note scannée',text,priority,status:'À faire',dueDate:'',items:[],attachments,source:'scan',importedScan:true,importedAt};db.notes.push(record);archiveType='Note scannée';
 }else if(destination==='issues'){
   record={id,no:nextNo('issue','ACT'),date:todayISO(),agentId:'',category:'Sécurité',title:title||'Problématique scannée',description:text,priority,status:'À faire',owner:'',dueDate:'',cost:'',action:'',attachments,source:'scan',importedAt};db.issues.push(record);archiveType='Scan → Sécurité & qualité';
 }else if(destination==='maintenance'){
   record={id,no:nextNo('maintenance','MAI'),date:todayISO(),title:title||'Intervention issue d’un scan',family:db.lists.maintenanceFamilies?.[0]||'Autre',priority,status:'À faire',building:db.buildings[0]?.name||'',floor:'',room:'Zone entière',requester:'Scan document',assigned:'',dueDate:'',description:text,action:'',cost:0,attachments,source:'scan',importedAt};db.maintenance.push(record);archiveType='Scan → Maintenance';
 }else if(destination==='requests'){
   record={id,no:nextNo('request','DIR'),date:todayISO(),type:db.lists.requestTypes?.[0]||'Autre',title:title||'Demande scannée',priority,status:'À faire',building:db.buildings[0]?.name||'',room:'',requester:'Direction',dueDate:'',description:text,response:'',attachments,source:'scan',importedAt};db.requests.push(record);archiveType='Scan → Demande direction';
 }else if(destination==='works'){
   record={id,no:nextNo('work','CHT'),date:todayISO(),type:db.lists.workTypes?.[0]||'Réunion de chantier',title:title||'Document chantier scanné',company:'',architect:'',building:db.buildings[0]?.name||'',priority,status:'À faire',dueDate:'',description:text,decision:'',gpaEnd:'',attachments,source:'scan',importedAt};db.works.push(record);archiveType='Scan → Chantier / GPA';
 }else if(destination==='meetings'){
   record={id,no:nextNo('meeting','RDV'),date:todayISO(),time:'',end:'',type:'Rendez-vous',title:title||'Compte rendu scanné',location:'',participants:'',status:'Planifié',notes:text,actions:'',attachments,source:'scan',importedAt};db.meetings.push(record);archiveType='Scan → Réunion / rendez-vous';
 }else if(destination==='periodic'){
   record={id,no:nextNo('periodic','CP'),name:title||'Contrôle périodique scanné',family:db.lists.periodicFamilies?.[0]||'Autre',intervalMonths:12,requirement:text,provider:'',register:'Registre de sécurité',building:'Tous bâtiments',lastDate:todayISO(),nextDate:addMonthsClamped(todayISO(),12),status:'Réalisé',notes:'Importé depuis un scan. Vérifier la périodicité et la prochaine échéance.',attachments,source:'scan',importedAt};db.periodic.push(record);archiveType='Scan → Contrôle périodique';
 }else{
   record={id,no:nextNo('document','DOC'),date:todayISO(),title:title||'Document scanné',category:'Autre',description:text,linkedModule:'Général',attachments,source:'scan',importedAt};db.documents.push(record);archiveType='Document scanné';view='documents';
 }
 db.importArchives=db.importArchives||[];
 const scanArchive={id:uid(),sourceId:record.id,createdAt:importedAt,type:archiveType,fileHash:scanDuplicateInfo?.fileHash||'',fileName:attachment?.name||scannedNoteAttachment?.name||record.title||record.name||'Scan',attachmentId:attachment?.id||'',subject:record.title||record.name||'',summary:text.slice(0,220),module:view,recordId:record.id,analysisSnapshot:{type:archiveType,correctedOrthography:true,fileName:attachment?.name||scannedNoteAttachment?.name||record.title||record.name||'Scan',subject:record.title||record.name||'',summary:text.slice(0,220),destination:view,category,priority,text,createdAt:importedAt}};db.importArchives.push(scanArchive);if(attachment)registerImportOriginal(scanArchive,attachment);
 await save();renderAll();$('#scanNoteModal')?.close();setView(view);toast(`Scan enregistré dans ${$('#scanDestination')?.selectedOptions?.[0]?.textContent||'le module choisi'} et Archivage`);
}

function openScanCameraDirect(){
 openScanNote();
 // Sur téléphone/tablette, capture="environment" demande directement l'appareil photo arrière.
 // Petit délai pour laisser le dialog s'ouvrir avant le sélecteur natif.
 setTimeout(()=>{
   const camera=$('#scanCameraInput')||$('#scanNoteFile');
   if(camera)camera.click();
   else toast('Appareil photo indisponible');
 },80);
}
function bindScanNoteV77(){
 const b=$('#scanNoteBtn');if(b)b.onclick=openScanCameraDirect;
 const fb=$('#scanNoteFab');if(fb)fb.onclick=openScanCameraDirect;
 const c=$('#scanNoteClose');if(c)c.onclick=()=>$('#scanNoteModal').close();
 const r=$('#scanRetry');if(r)r.onclick=scanReset;
 const f=$('#scanNoteFile');if(f)f.onchange=()=>recognizeScannedNote(f.files?.[0]);
 const corr=$('#scanCorrect');if(corr)corr.onclick=correctScannedNote;
 const saveBtn=$('#scanSaveNote');if(saveBtn)saveBtn.onclick=saveScannedNote;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindScanNoteV77);else bindScanNoteV77();

document.addEventListener('change',async e=>{const inp=e.target.closest?.('[data-reattach-import]');if(inp&&inp.files?.[0]){await reattachImportOriginal(inp.dataset.reattachImport,inp.files[0]);inp.value=''}});


// V147.9 — Sources du scanner : appareil photo, galerie ou PDF.
(function initScannerSources(){
  const byId=id=>document.getElementById(id);
  const sourceInput=()=>{
    const candidates=[
      document.querySelector('input[type="file"][id*="scan" i]:not(#scanCameraInput):not(#scanGalleryInput):not(#scanPdfInput)'),
      document.querySelector('input[type="file"][name*="scan" i]')
    ];
    return candidates.find(Boolean)||null;
  };
  const forwardFile=(file)=>{
    if(!file)return;
    const target=sourceInput();
    if(!target){toast?.('Entrée du scanner introuvable');return}
    try{
      const dt=new DataTransfer();
      dt.items.add(file);
      target.files=dt.files;
      target.dispatchEvent(new Event('change',{bubbles:true}));
    }catch(e){
      console.error('Transmission fichier scanner',e);
      toast?.('Impossible de transmettre la photo au scanner');
    }
  };
  const bind=()=>{
    const camera=byId('scanCameraInput'), gallery=byId('scanGalleryInput'), pdf=byId('scanPdfInput');
    const cameraBtn=byId('scanTakePhotoBtn'), galleryBtn=byId('scanGalleryBtn'), pdfBtn=byId('scanPdfBtn');
    if(cameraBtn&&!cameraBtn.dataset.bound){cameraBtn.dataset.bound='1';cameraBtn.addEventListener('click',()=>camera?.click())}
    if(galleryBtn&&!galleryBtn.dataset.bound){galleryBtn.dataset.bound='1';galleryBtn.addEventListener('click',()=>gallery?.click())}
    if(pdfBtn&&!pdfBtn.dataset.bound){pdfBtn.dataset.bound='1';pdfBtn.addEventListener('click',()=>pdf?.click())}
    [camera,gallery,pdf].forEach(input=>{
      if(input&&!input.dataset.bound){
        input.dataset.bound='1';
        input.addEventListener('change',()=>forwardFile(input.files?.[0]));
      }
    });
  };
  document.addEventListener('DOMContentLoaded',bind);
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-open-scan],#openScanner,.openScanner'))setTimeout(bind,50);
  });
  setTimeout(bind,500);
})();






window.addEventListener('pst:academic-year-changed',()=>{
 try{
   syncAcademicYearFilters(activeAcademicYear());
   const _ayRangeV165=academicYearRange(activeAcademicYear());
   if(typeof dashboardPeriodDateV159!=='undefined'&&!academicYearContains(activeAcademicYear(),dashboardPeriodDateV159))dashboardPeriodDateV159=_ayRangeV165.start;
   safeRenderAll();
   renderGlobalAcademicYear();
 }catch(e){console.warn('Synchronisation globale année scolaire',e)}
});




