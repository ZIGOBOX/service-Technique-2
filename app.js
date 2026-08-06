'use strict';

const APP_VERSION='49.0';
const APP_BUILD='07/08/2026 01:35';

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
const fmtHours=n=>`${(Math.round((Number(n)||0)*100)/100).toLocaleString('fr-FR',{maximumFractionDigits:2})} h`;
const inRange=(d,a,b)=>(!a||d>=a)&&(!b||d<=b); const dateMonthMatch=(d,m)=>!m||String(d||'').startsWith(m);
function businessDays(a,b){if(!a||!b)return 0;let d=parseDate(a),e=parseDate(b),n=0;while(d<=e){if(![0,6].includes(d.getDay()))n++;d.setDate(d.getDate()+1)}return n}
function normalizeEmails(v){return String(v||'').split(/[;,\n]+/).map(x=>x.trim()).filter(Boolean).join(',')}
function selectOptions(items,value='',label=x=>x,val=x=>x){return items.map(x=>`<option value="${esc(val(x))}" ${String(val(x))===String(value)?'selected':''}>${esc(label(x))}</option>`).join('')}
function badge(text){const s=String(text||'—');let c='neutral';if(/conforme|terminé|clôturé|validé|actif|réalisé|à jour|présence|matin|prête/i.test(s))c='good';if(/en cours|planifié|à préparer|à reprendre|soir|demandé|bientôt/i.test(s))c='warn';if(/urgent|retard|non conforme|bloqué|refusé|absence|accident|maladie/i.test(s))c='bad';if(/réunion|rendez|formation|information|rtt/i.test(s))c='info';return `<span class="badge ${c}">${esc(s)}</span>`}
const emptyRow=(n,msg='Aucune donnée enregistrée.')=>`<tr><td class="empty" colspan="${n}">${esc(msg)}</td></tr>`;

const initialBuildings=[
 {name:'Extension',floors:['Rez-de-chaussée','1er étage']},{name:'Demi-pension',floors:['Rez-de-chaussée','1er étage']},{name:'Gymnase',floors:['Rez-de-chaussée','1er étage']},
 ...['Bâtiment A','Bâtiment B','Bâtiment H','Bâtiment G','Bâtiment E','Bâtiment F'].map(name=>({name,floors:['Rez-de-chaussée','1er étage','2e étage','3e étage','4e étage']})),{name:'Cour',floors:['Extérieur']}
].map(x=>({id:uid(),...x}));
const defaultLists={
 roles:['Agent polyvalent','Agent d’entretien','Agent de maintenance','Agent d’accueil','Responsable d’équipe','Remplaçant'],
 dayTypes:['Présence','Congé annuel','RTT','Récupération','Maladie','Accident du travail','Enfant malade','Décès / deuil','Mariage / PACS','Naissance / adoption','Autorisation d’absence','Formation','Repos','Grève','Autre absence'],
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
 periodicFamilies:['Incendie / SSI','Électricité','Chauffage / CVC','Gaz / cuisine','Ascenseurs / levage','Eau / légionelles','Qualité de l’air / radon','Portes / accès','Équipements sportifs','Équipements sous pression','Froid / fluides','Sûreté / PPMS','Autre'],
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
function makePeriodic(){return PERIODIC_CATALOG.map((x,i)=>({id:uid(),no:`CP-${String(i+1).padStart(3,'0')}`,name:x[0],family:x[1],intervalMonths:x[2],requirement:x[3],provider:x[4],register:x[5],building:'Tous bâtiments',lastDate:'',nextDate:'',status:'À planifier',notes:'',attachments:[]}))}
function defaultSpaces(buildings){const out=[];for(const b of buildings){for(const f of b.floors){out.push({id:uid(),building:b.name,floor:f,type:b.name==='Gymnase'?'Salle de sport / gymnase':b.name==='Cour'?'Cour / extérieurs':'Circulations / halls / escaliers',name:'Zone entière'});if(!['Cour','Gymnase'].includes(b.name)){out.push({id:uid(),building:b.name,floor:f,type:'Sanitaires / vestiaires',name:'Sanitaires'});if(/^Bâtiment/.test(b.name)||b.name==='Extension')out.push({id:uid(),building:b.name,floor:f,type:'Salle de classe / devoirs / informatique',name:'Salles de classe'})}}}return out}
function clone(x){return structuredClone(x)}
function defaultData(){const buildings=clone(initialBuildings);const agents=[['Mme','Tarrio','Agent d’accueil'],['Mme','Delorme','Agent d’accueil / lingerie'],['Complément','accueil','Agent d’accueil'],['Mme','Berthoux','Agent de restauration'],['Mme','Bozio','Agent d’accueil']].map((n,i)=>({id:uid(),no:`AGT-${String(i+1).padStart(3,'0')}`,firstName:n[0],lastName:n[1],role:n[2],weeklyHours:35,email:'',phone:'',assignment:'',status:'Actif',arrivalDate:'',notes:''}));const monday=startOfWeek(todayISO());const maintenance=IMPORTED_INTERVENTIONS.map((x,i)=>({id:uid(),no:`MAI-2026-${String(i+1).padStart(4,'0')}`,date:todayISO(),title:x[0],family:x[1],priority:x[2],status:x[3],building:x[5]||'',floor:'',room:x[5]||'',requester:'Direction',assigned:'',dueDate:'',cost:'',description:x[4]||'',action:'',attachments:[],importBatch:'excel-2026-08'}));return {version:31,settings:{initialSeedCompleted:true,seedVersion:31,cleaningAlertDays:30,meetingAlertDays:3,
autoDailyEnabled:true,autoWeeklyEnabled:false,autoReportHour:'07:00',autoReportTimezone:'Europe/Paris',autoReportWeekdays:'1,2,3,4,5',autoReportOnlyIfEvents:false,autoReportIncludeAgents:true,autoReportIncludeMaintenance:true,autoReportIncludeCleaning:true,autoReportIncludePeriodic:true,autoReportIncludeMeetings:true,autoReportSignature:'Rapport généré automatiquement par Pilotage Service Technique.',lastDailyEmailDate:'',lastWeeklyEmailKey:'',lastWeeklyArchiveKey:'',lastAnnualResetYear:0,appName:'Pilotage Service Technique',schoolName:'Lycée Jean Puy',schoolZone:'A',academicYear:'2026-2027',defaultLayout:'auto',printOrientation:'landscape',defaultInspector:'',emailsTo:'',emailsCc:'',emailsBcc:'',emailSubjectPrefix:'Pilotage Service Technique',outlookEmail:'',counters:{}},lists:clone(defaultLists),buildings,spaces:defaultSpaces(buildings),agents,weeklyPlans:clone(IMPORTED_WEEKLY_PLANS),rotations:agents.map((a,i)=>({id:uid(),no:`RLT-${String(i+1).padStart(3,'0')}`,agentId:a.id,effectiveFrom:monday,effectiveTo:'',startShift:i%2?'Soir':'Matin',morningWeeks:2,eveningWeeks:2,morningStart:'06:00',morningEnd:'13:30',eveningStart:'13:00',eveningEnd:'20:30',pause:30,weekdays:[1,2,3,4,5],notes:''})),rotationExceptions:[],agentDays:[],personalEvents:[],issues:[],periodic:makePeriodic(),cleaning:[],maintenance,requests:[],works:[],meetings:[],notes:[],vacations:[],documents:[],contacts:[],attachments:[],archives:[]}}
function nextSeedNo(rows){return `MAI-2026-${String((rows?.length||0)+1).padStart(4,'0')}`}
function migrate(raw){
 const base=defaultData();
 if(!raw||typeof raw!=='object')return base;
 const d={...base,...raw,settings:{...base.settings,...(raw.settings||{}),counters:{...base.settings.counters,...(raw.settings?.counters||{})}},lists:{...base.lists,...(raw.lists||{})}};
 for(const k of ['buildings','spaces','agents','weeklyPlans','rotations','rotationExceptions','agentDays','personalEvents','issues','periodic','cleaning','maintenance','requests','works','meetings','notes','vacations','documents','contacts','attachments','archives']){
   if(!Array.isArray(d[k]))d[k]=base[k];
 }
 // Conversion uniquement pour les très anciennes sauvegardes. Aucun agent, planning ou intervention supprimé n'est recréé automatiquement.
 if(!d.agentDays.length){
   (raw.shifts||[]).forEach(s=>d.agentDays.push({id:s.id||uid(),agentId:s.agentId,date:s.date,dayType:'Présence',plannedStart:s.plannedStart,plannedEnd:s.plannedEnd,actualStart:s.actualStart,actualEnd:s.actualEnd,pause:s.pause,overtime:s.overtime||0,note:s.notes||''}));
   for(const a of raw.absences||[]){let day=a.dateFrom;while(day&&day<=a.dateTo){if(![0,6].includes(parseDate(day).getDay()))d.agentDays.push({id:uid(),agentId:a.agentId,date:day,dayType:a.type||'Autre absence',plannedStart:'',plannedEnd:'',actualStart:'',actualEnd:'',pause:0,overtime:0,note:a.notes||'',status:a.status||'Validée'});day=addDays(day,1)}}
 }
 d.version=30;
 return d;
}
function restoreSuppliedData(showMessage=true){
 const base=defaultData();
 // Agents fournis : ajout uniquement s'ils n'existent pas déjà.
 for(const sa of base.agents){
   const key=agentName(sa).toLowerCase().replace(/\s+/g,' ').trim();
   if(!db.agents.some(a=>agentName(a).toLowerCase().replace(/\s+/g,' ').trim()===key)) db.agents.push(sa);
 }
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
 db.settings.cleaningAlertDays=Number(db.settings.cleaningAlertDays||30);db.settings.meetingAlertDays=Number(db.settings.meetingAlertDays||3);db.settings.lastWeeklyArchiveKey=db.settings.lastWeeklyArchiveKey||'';db.settings.lastAnnualResetYear=Number(db.settings.lastAnnualResetYear||0);
 if(!Array.isArray(db.buildings)||!db.buildings.length) db.buildings=clone(initialBuildings);
 if(!Array.isArray(db.spaces)||!db.spaces.length) db.spaces=defaultSpaces(db.buildings);
 db.version=30;
 db.settings.initialSeedCompleted=true;db.settings.seedVersion=31;
 localStorage.setItem(STORAGE_KEY,JSON.stringify(db));try{window.dispatchEvent(new Event('pst:data-saved'))}catch(_){ }
 if(showMessage){renderAll();toast('Toutes les données fournies ont été restaurées')}
}
function loadLocal(){for(const k of [STORAGE_KEY,...OLD_KEYS]){try{const s=localStorage.getItem(k);if(s){return migrate(JSON.parse(s))}}catch(e){console.error(e)}}return defaultData()}
let db=loadLocal(); let teamWeek=startOfWeek(todayISO()),personalWeek=startOfWeek(todayISO()),modalHandler=null,modalDeleteHandler=null,currentView='dashboard';
let supabaseClient=null,currentUser=null,cloudReady=false,cloudSaveTimer=null,cloudRetryTimer=null,cloudBusy=false;
function setSaveState(text,state=''){const s=$('#saveState');if(!s)return;s.textContent=text;s.dataset.state=state}
function withTimeout(promise,ms=9000){return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Délai de connexion dépassé')),ms))])}
function hasUsefulData(x){return !!(x&&((x.agents&&x.agents.length)||(x.maintenance&&x.maintenance.length)||(x.weeklyPlans&&x.weeklyPlans.length)||(x.notes&&x.notes.length)))}
function scheduleCloudRetry(delay=30000){clearTimeout(cloudRetryTimer);cloudRetryTimer=setTimeout(()=>{if(navigator.onLine)cloudLoad({silent:true})},delay)}
function useLocalMode(reason='Connexion momentanément indisponible'){
 cloudReady=false;setSaveState('Mode local — synchronisation automatique en attente','local');
 console.warn(reason);scheduleCloudRetry();
}
async function cloudLoad({silent=false}={}){
 if(!supabaseClient||!currentUser||cloudBusy)return false;
 cloudBusy=true;if(!silent)setSaveState('Connexion au serveur…','loading');
 try{
   const result=await withTimeout(supabaseClient.from('app_state').select('data,updated_at').eq('user_id',currentUser.id).maybeSingle());
   const {data,error}=result||{};if(error)throw error;
   if(data?.data&&hasUsefulData(data.data)){
     db=migrate(data.data);
     // Une migration de référence est exécutée une seule fois par version majeure.
     // Après seedVersion 25, les suppressions et modifications de l'utilisateur sont respectées.
     if(Number(db.settings?.seedVersion||0)<26){
       restoreSuppliedData(false);db.settings.initialSeedCompleted=true;db.settings.seedVersion=31;
       await cloudSaveNow({silent:true});
     }
   }else{
     // Ne jamais effacer les données présentes sur l'appareil quand le cloud est vide.
     db=migrate(db||loadLocal());runAutomaticHousekeeping();
     if(!hasUsefulData(db))db=defaultData();
     restoreSuppliedData(false);db.settings.initialSeedCompleted=true;db.settings.seedVersion=31;
     await cloudSaveNow({silent:true});
   }
   localStorage.setItem(STORAGE_KEY,JSON.stringify(db));cloudReady=true;renderAll();try{window.dispatchEvent(new Event('pst:data-loaded'))}catch(_){ }
   setSaveState(`Synchronisé à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`,'cloud');
   clearTimeout(cloudRetryTimer);return true;
 }catch(error){
   console.error('Supabase indisponible, poursuite locale :',error);
   useLocalMode(error?.message||String(error));
   // L'application reste entièrement utilisable sans afficher de fenêtre bloquante.
   renderAll();try{window.dispatchEvent(new Event('pst:data-loaded'))}catch(_){ }return false;
 }finally{cloudBusy=false}
}
async function cloudSaveNow({silent=false}={}){
 if(!supabaseClient||!currentUser||cloudBusy&&!silent)return false;
 try{
   const payload={user_id:currentUser.id,data:db,updated_at:new Date().toISOString()};
   const {error}=await withTimeout(supabaseClient.from('app_state').upsert(payload,{onConflict:'user_id'}));
   if(error)throw error;
   cloudReady=true;setSaveState(`Synchronisé à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`,'cloud');
   clearTimeout(cloudRetryTimer);return true;
 }catch(error){
   console.error('Sauvegarde cloud différée :',error);useLocalMode(error?.message||String(error));
   if(!silent)toast('Données conservées sur cet appareil — synchronisation différée');return false;
 }
}
function safeRenderAll(){
 const renderers=[
  ['Sélecteurs',hydrateSelects],['Marque',renderBrand],['Tableau de bord',renderDashboard],['Notifications',renderNotifications],['Agenda',renderPersonal],
  ['Agents',renderAgents],['Roulements',renderRotations],['Horaires',renderPlanning],['Absences',renderAbsences],
  ['Vacances',renderVacations],['Sécurité',renderIssues],['Contrôles périodiques',renderPeriodic],['Ménage',renderCleaning],
  ['Maintenance',renderMaintenance],['Demandes',renderRequests],['Chantiers',renderWorks],['Réunions',renderMeetings],
  ['Notes',renderNotes],['Documents',renderDocuments],['Archives',renderArchives],['Outlook',renderOutlook],['Paramètres',renderSettings],['Rapports',renderReportPreview]
 ];
 const errors=[];
 for(const [name,fn] of renderers){try{fn()}catch(error){console.error(`Erreur d’affichage — ${name}`,error);errors.push(name)}}
 if(errors.length)setSaveState(`Enregistré — affichage partiel (${errors.join(', ')})`,'local');
 return errors;
}
function save(render=true){
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify(db))}catch(error){console.error(error);toast('Stockage local presque plein : exportez une sauvegarde')}
 setSaveState(`Enregistré localement à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`,'local');
 clearTimeout(cloudSaveTimer);cloudSaveTimer=setTimeout(()=>cloudSaveNow({silent:true}),700);
 if(render)safeRenderAll();
 return true;
}
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
     if(!supabaseClient)supabaseClient=window.supabase.createClient(cfg.url,cfg.publishableKey);
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
 // Afficher immédiatement la base locale puis synchroniser sans bloquer l'application.
 renderAll();setSaveState('Connexion au serveur…','loading');await cloudLoad();
}
window.addEventListener('online',()=>{if(currentUser)cloudLoad({silent:true})});
window.addEventListener('offline',()=>useLocalMode('Appareil hors connexion'));
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&currentUser&&navigator.onLine)cloudLoad({silent:true})});
function nextNo(type,prefix){db.settings.counters[type]=(db.settings.counters[type]||0)+1;return `${prefix}-${new Date().getFullYear()}-${String(db.settings.counters[type]).padStart(4,'0')}`}
function toast(msg){const e=$('#toast');e.textContent=msg;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),2200)}
function byId(type,id){return db[type]?.find(x=>x.id===id)} function agentById(id){return db.agents.find(a=>a.id===id)} function agentName(a){return a?`${a.firstName||''} ${a.lastName||''}`.trim():'Équipe'}
function agentOptions(v='',team=false){return `${team?'<option value="">Toute l’équipe</option>':'<option value="">Choisir un agent</option>'}${selectOptions(db.agents.filter(a=>a.status!=='Inactif'||a.id===v),v,agentName,a=>a.id)}`}
function buildingOptions(v=''){return selectOptions(db.buildings,v,b=>b.name,b=>b.name)}
function floorOptions(building,v=''){const b=db.buildings.find(x=>x.name===building)||db.buildings[0];return selectOptions(b?.floors||[],v)}
function roomOptions(building,floor,type,v=''){const arr=db.spaces.filter(s=>(!building||s.building===building)&&(!floor||s.floor===floor)&&(!type||s.type===type));const values=[...new Set(['Zone entière',...arr.map(s=>s.name)])];return selectOptions(values,v)}

/* ---------- Pièces jointes synchronisées dans Supabase Storage ---------- */
const STORAGE_BUCKET='documentation';
function safeFileName(name){return String(name||'fichier').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'_')}
async function putFile(file,meta={}){
 if(!supabaseClient||!currentUser)throw new Error('Connexion Supabase requise');
 const id=uid();const path=`${currentUser.id}/${meta.module||'documents'}/${meta.recordId||'general'}/${id}-${safeFileName(file.name)}`;
 const {error}=await supabaseClient.storage.from(STORAGE_BUCKET).upload(path,file,{upsert:false,contentType:file.type||'application/octet-stream'});
 if(error)throw error;
 return {id,name:file.name,type:file.type||'application/octet-stream',size:file.size,createdAt:new Date().toISOString(),storagePath:path,...meta};
}
async function removeFileBlob(id){
 const meta=db.attachments.find(a=>a.id===id);if(!meta?.storagePath||!supabaseClient)return;
 const {error}=await supabaseClient.storage.from(STORAGE_BUCKET).remove([meta.storagePath]);if(error)console.error(error);
}
async function openStoragePath(path,downloadName='document'){
 if(!supabaseClient||!path){toast('Document introuvable');return}
 const {data,error}=await supabaseClient.storage.from(STORAGE_BUCKET).createSignedUrl(path,120);
 if(error||!data?.signedUrl){console.error(error);toast('Impossible d’ouvrir le document');return}
 window.open(data.signedUrl,'_blank','noopener');
}
async function downloadAttachment(id){const rec=db.attachments.find(a=>a.id===id);if(!rec){toast('Fichier introuvable');return}await openStoragePath(rec.storagePath,rec.name)}
function humanSize(n){n=Number(n)||0;if(n<1024)return `${n} o`;if(n<1048576)return `${(n/1024).toFixed(1)} Ko`;return `${(n/1048576).toFixed(1)} Mo`}
function attachmentField(existing=[]){return `<div class="attachment-box"><div class="attachment-actions"><label class="camera-label">📷 Prendre une photo<input type="file" name="cameraPhotos" accept="image/*" capture="environment" multiple></label><label>📎 Ajouter des fichiers<input type="file" name="files" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.eml,.msg,.ods,.odt"></label></div><p class="hint">Les photos et fichiers sont synchronisés dans Supabase et deviennent accessibles sur le téléphone et le PC.</p>${existing.length?`<div class="attachment-list">${existing.map(a=>`<div><span>📎 ${esc(a.name)} <small>${humanSize(a.size)}</small></span><label class="inline-check"><input type="checkbox" name="removeAttachment" value="${esc(a.id)}"> Retirer</label></div>`).join('')}</div>`:''}</div>`}
async function processAttachments(form,record,module){record.attachments=record.attachments||[];const removeIds=[...form.querySelectorAll('[name="removeAttachment"]:checked')].map(x=>x.value);for(const id of removeIds){await removeFileBlob(id);record.attachments=record.attachments.filter(a=>a.id!==id);db.attachments=db.attachments.filter(a=>a.id!==id)}const files=[...(form.elements.files?.files||[]),...(form.elements.cameraPhotos?.files||[])];for(const file of files){try{const meta=await putFile(file,{module,recordId:record.id});record.attachments.push(meta);db.attachments.push(meta)}catch(e){console.error(e);toast(`Impossible d’enregistrer ${file.name}`)}}}
function attachmentButtons(arr=[]){return arr.length?`<div class="attachment-chips">${arr.map(a=>`<button class="chip" data-download="${esc(a.id)}">📎 ${esc(a.name)}</button>`).join('')}</div>`:''}

const BUILTIN_GUIDES=[
 {title:'Guide d’accueil des lycées 2025',category:'Guide / procédure',storagePath:'guides/Guide_Accueil_Lycees_2025.pdf'},
 {title:'Guide de l’entretien dans les lycées 2023',category:'Guide / procédure',storagePath:'guides/Guide_Entretien_Lycees_2023.pdf'},
 {title:'Guide de maintenance des lycées 2023',category:'Guide / procédure',storagePath:'guides/Guide_Maintenance_Lycees_2023.pdf'}
];
async function openGuide(path){await openStoragePath(path)}
/* ---------- Fenêtres ---------- */
function openModal(title,html,onSave,opts={}){modalHandler=onSave;modalDeleteHandler=opts.onDelete||null;$('#modalTitle').textContent=title;$('#modalBody').innerHTML=html;$('#modalSave').textContent=opts.saveLabel||'Enregistrer';$('#modalDelete').classList.toggle('hidden',!modalDeleteHandler);const d=$('#modal');if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','');setTimeout(()=>$('#modalBody input:not([type="hidden"]),#modalBody select,#modalBody textarea')?.focus(),60)}
function closeModal(){const d=$('#modal');if(d.open)d.close();else d.removeAttribute('open');modalHandler=null;modalDeleteHandler=null}
function openDetail(title,html){$('#detailTitle').textContent=title;$('#detailBody').innerHTML=html;const d=$('#detailModal');if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','')}
function field(label,name,value='',type='text',extra=''){return `<label>${esc(label)}<input name="${esc(name)}" type="${esc(type)}" value="${esc(value)}" ${extra}></label>`}
function selectField(label,name,items,value='',extra=''){return `<label>${esc(label)}<select name="${esc(name)}" ${extra}>${selectOptions(items,value)}</select></label>`}
function textareaField(label,name,value='',rows=3,extra=''){return `<label class="span2">${esc(label)}<textarea name="${esc(name)}" rows="${rows}" ${extra}>${esc(value)}</textarea></label>`}
function formDataObj(form){return Object.fromEntries(new FormData(form).entries())}
function deleteRecord(type,id,label='élément'){if(!confirm(`Supprimer cet ${label} ?`))return;db[type]=db[type].filter(x=>x.id!==id);closeModal();save();toast('Supprimé')}

/* ---------- Navigation ---------- */
const VIEW_TITLES={dashboard:'Tableau de bord',personal:'Agenda personnel',agents:'Agents & recrutements',rotations:'Roulements annuels',planning:'Pilotage des horaires','schedule-import':'Import / export horaires',absences:'Congés, RTT & absences',vacations:'Vacances & fermetures',issues:'Sécurité & qualité',periodic:'Contrôles périodiques',cleaning:'Contrôle ménage',maintenance:'Maintenance',requests:'Demandes direction',works:'Chantiers & GPA',meetings:'Réunions & rendez-vous',notes:'Bloc-notes',documents:'Documents & pièces jointes',archives:'Archives hebdomadaires',reports:'Rapports & impressions',settings:'Paramètres'};
function setView(view){if(!document.getElementById(view))return;currentView=view;$$('.view').forEach(v=>v.classList.toggle('active',v.id===view));$$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===view));if($('#pageTitle'))$('#pageTitle').textContent=VIEW_TITLES[view]||view;document.body.classList.remove('menu-open');window.PSTNavigation?.closeMenu?.();window.scrollTo({top:0,behavior:'auto'});renderAll()}
function applyLayout(mode=db.settings.defaultLayout||'auto'){document.body.dataset.layout=mode;$('#layoutMode').value=mode;localStorage.setItem('pilotage-service-technique-layout',mode)}

/* ---------- Calcul du roulement et du jour agent ---------- */
function activeRotation(agentId,date){return db.rotations.filter(r=>r.agentId===agentId&&r.effectiveFrom<=date&&(!r.effectiveTo||r.effectiveTo>=date)).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0]||null}
function rotationException(agentId,date){return db.rotationExceptions.filter(x=>x.agentId===agentId&&inRange(date,x.dateFrom,x.dateTo)).sort((a,b)=>b.dateFrom.localeCompare(a.dateFrom))[0]||null}

function normalizeWeeklyPlans(){
 const names=new Map(db.agents.map(a=>[agentName(a).toLowerCase(),a.id]));
 for(const p of db.weeklyPlans||[]){
  if(!p.id)p.id=uid();
  if(!p.agentId)p.agentId=names.get(String(p.agent||'').toLowerCase())||'';
  if(!p.shift)p.shift='Matin';
  if(!p.effectiveFrom)p.effectiveFrom='2026-09-01';
  if(!p.effectiveTo)p.effectiveTo='2027-08-31';
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
function scheduledFor(agentId,date){
 const r=activeRotation(agentId,date);const wd=parseDate(date).getDay();
 if(!r){const p=weeklyProfile(agentId,'Standard',wd,date)||weeklyProfile(agentId,'Matin',wd,date)||anyWeeklyPlanFor(agentId,date)?.dayProfiles?.[wd];return p&&p.start?{shift:'Planning de référence',start:p.start,end:p.end,pause:Number(p.pause||0),missions:p.missions||'',segments:p.segments||[]}:{shift:'Non planifié',start:'',end:'',pause:0,missions:''}}
 if(!(r.weekdays||[1,2,3,4,5]).map(Number).includes(wd))return {shift:'Repos',start:'',end:'',pause:0,missions:''};
 const ex=rotationException(agentId,date);if(ex){if(ex.shift==='Repos')return {shift:'Repos',start:'',end:'',pause:0,missions:ex.note||''};return {shift:ex.shift||'Horaire modifié',start:ex.start||'',end:ex.end||'',pause:Number(ex.pause||0),missions:ex.note||''}}
 const anchor=startOfWeek(r.effectiveFrom),diff=Math.floor((parseDate(startOfWeek(date))-parseDate(anchor))/604800000),mw=Math.max(1,Number(r.morningWeeks)||1),ew=Math.max(1,Number(r.eveningWeeks)||1),cycle=mw+ew;let pos=((diff%cycle)+cycle)%cycle;if(r.startShift==='Soir')pos=(pos+mw)%cycle;const shift=pos<mw?'Matin':'Soir';
 const p=weeklyProfile(agentId,shift,wd,date);
 return {shift,start:p?.start||(shift==='Matin'?r.morningStart:r.eveningStart),end:p?.end||(shift==='Matin'?r.morningEnd:r.eveningEnd),pause:Number(p?.pause??r.pause??0),missions:p?.missions||'',segments:p?.segments||[]};
}
function dayRecord(agentId,date){
  const records=Array.isArray(db.agentDays)?db.agentDays:[];
  return records.find(r=>String(r.agentId)===String(agentId)&&String(r.date)===String(date))||null;
}
function dayInfo(agentId,date){const sched=scheduledFor(agentId,date),rec=dayRecord(agentId,date);if(!rec)return {...sched,dayType:sched.shift==='Repos'?'Repos':'Présence',plannedStart:sched.start,plannedEnd:sched.end,actualStart:'',actualEnd:'',overtime:0,note:'',status:'Prévu'};return {...sched,...rec,plannedStart:rec.plannedStart??sched.start,plannedEnd:rec.plannedEnd??sched.end}}
function isAbsenceType(t){return t&&t!=='Présence'&&t!=='Formation'}
function dayHours(info){const planned=hoursBetween(info.plannedStart,info.plannedEnd,info.pause);const actual=(info.actualStart&&info.actualEnd)?hoursBetween(info.actualStart,info.actualEnd,info.pause):planned;return {planned,actual,total:actual+Number(info.overtime||0),delta:actual+Number(info.overtime||0)-planned}}
function agentState(agent,date=todayISO()){const info=dayInfo(agent.id,date);if(isAbsenceType(info.dayType)||info.dayType==='Repos')return {label:info.dayType,kind:'absent',info};if(info.dayType==='Formation')return {label:'Formation',kind:'info',info};return {label:info.plannedStart&&info.plannedEnd?`${info.plannedStart}–${info.plannedEnd}`:'Présence',kind:'present',info}}

/* ---------- Formulaires agents / planning ---------- */
function openAgent(id){const old=id?byId('agents',id):null;const x=old||{id:uid(),no:nextNo('agent','AGT'),firstName:'',lastName:'',role:db.lists.roles[0],weeklyHours:35,email:'',phone:'',assignment:'',status:'Actif',arrivalDate:'',notes:'',attachments:[]};x.attachments=x.attachments||[];openModal(old?'Modifier l’agent':'Nouvel agent',`<div class="form-grid">${field('Prénom','firstName',x.firstName,'text','required')}${field('Nom','lastName',x.lastName)}<label>Fonction<select name="role">${selectOptions(db.lists.roles,x.role)}</select></label>${field('Temps hebdomadaire (h)','weeklyHours',x.weeklyHours,'number','min="0" step="0.25"')}${field('Téléphone','phone',x.phone,'tel')}${field('E-mail','email',x.email,'email')}${field('Affectation principale','assignment',x.assignment)}<label>Statut<select name="status">${selectOptions(['Actif','Inactif'],x.status)}</select></label>${field('Date d’arrivée','arrivalDate',x.arrivalDate,'date')}${textareaField('Notes','notes',x.notes)}${attachmentField(x.attachments)}</div>`,async form=>{Object.assign(x,formDataObj(form),{weeklyHours:Number(form.elements.weeklyHours.value||0)});await processAttachments(form,x,'agents');if(!old){db.agents.push(x);db.rotations.push({id:uid(),no:nextNo('rotation','RLT'),agentId:x.id,effectiveFrom:startOfWeek(todayISO()),effectiveTo:'',startShift:'Matin',morningWeeks:2,eveningWeeks:2,morningStart:'06:00',morningEnd:'13:30',eveningStart:'13:00',eveningEnd:'20:30',pause:30,weekdays:[1,2,3,4,5],notes:''})}closeModal();save();toast('Agent enregistré')},{onDelete:old?()=>deleteRecord('agents',x.id,'agent'):null})}
function openRotation(id,agentId=''){const old=id?byId('rotations',id):null;const x=old||{id:uid(),no:nextNo('rotation','RLT'),agentId:agentId||db.agents[0]?.id,effectiveFrom:startOfWeek(todayISO()),effectiveTo:'',startShift:'Matin',morningWeeks:2,eveningWeeks:2,morningStart:'06:00',morningEnd:'13:30',eveningStart:'13:00',eveningEnd:'20:30',pause:30,weekdays:[1,2,3,4,5],notes:''};openModal(old?'Modifier le roulement':'Nouveau roulement avec date d’effet',`<div class="form-grid"><label>Agent<select name="agentId" required>${agentOptions(x.agentId)}</select></label>${field('Date d’effet','effectiveFrom',x.effectiveFrom,'date','required')}${field('Date de fin (facultatif)','effectiveTo',x.effectiveTo,'date')}<label>Commence par<select name="startShift">${selectOptions(['Matin','Soir'],x.startShift)}</select></label>${field('Nombre de semaines du matin','morningWeeks',x.morningWeeks,'number','min="1" max="12"')}${field('Nombre de semaines du soir','eveningWeeks',x.eveningWeeks,'number','min="1" max="12"')}${field('Matin — arrivée','morningStart',x.morningStart,'time')}${field('Matin — départ','morningEnd',x.morningEnd,'time')}${field('Soir — arrivée','eveningStart',x.eveningStart,'time')}${field('Soir — départ','eveningEnd',x.eveningEnd,'time')}${field('Pause (minutes)','pause',x.pause,'number','min="0" step="5"')}<fieldset class="span2"><legend>Jours travaillés</legend>${[1,2,3,4,5,6,0].map((d,i)=>`<label class="inline-check"><input type="checkbox" name="weekday" value="${d}" ${(x.weekdays||[]).map(Number).includes(d)?'checked':''}>${['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d]}</label>`).join('')}</fieldset>${textareaField('Notes','notes',x.notes)}</div>`,form=>{const o=formDataObj(form);Object.assign(x,o,{morningWeeks:Number(o.morningWeeks),eveningWeeks:Number(o.eveningWeeks),pause:Number(o.pause),weekdays:[...form.querySelectorAll('[name="weekday"]:checked')].map(e=>Number(e.value))});if(!old)db.rotations.push(x);closeModal();save();toast('Roulement enregistré')},{onDelete:old?()=>deleteRecord('rotations',x.id,'roulement'):null})}
function openRotationException(id){const old=id?byId('rotationExceptions',id):null;const x=old||{id:uid(),agentId:db.agents[0]?.id,dateFrom:todayISO(),dateTo:todayISO(),shift:'Horaire personnalisé',start:'',end:'',pause:30,note:''};openModal(old?'Modifier l’exception':'Exception de roulement',`<div class="form-grid"><label>Agent<select name="agentId">${agentOptions(x.agentId)}</select></label>${field('Du','dateFrom',x.dateFrom,'date','required')}${field('Au','dateTo',x.dateTo,'date','required')}<label>Service<select name="shift">${selectOptions(['Matin','Soir','Horaire personnalisé','Repos'],x.shift)}</select></label>${field('Arrivée','start',x.start,'time')}${field('Départ','end',x.end,'time')}${field('Pause (min)','pause',x.pause,'number','min="0"')}${textareaField('Motif','note',x.note)}</div>`,form=>{const o=formDataObj(form);Object.assign(x,o,{pause:Number(o.pause||0)});if(!old)db.rotationExceptions.push(x);closeModal();save();toast('Exception enregistrée')},{onDelete:old?()=>deleteRecord('rotationExceptions',x.id,'exception'):null})}
function updateDayCalc(){
 const f=$('#modalForm'), box=$('#dayCalc'); if(!f||!box||!f.elements.plannedStart)return;
 const dayType=f.elements.dayType?.value||'Présence';
 if(dayType!=='Présence'){box.innerHTML='<strong>Journée non travaillée</strong><span>Aucun horaire réel nécessaire.</span>';return}
 const plannedStart=f.elements.plannedStart.value, plannedEnd=f.elements.plannedEnd.value;
 const actualStart=f.elements.actualStart.value, actualEnd=f.elements.actualEnd.value;
 const pause=Number(f.elements.pause.value||0), overtime=Number(f.elements.overtime.value||0);
 if(!plannedStart||!plannedEnd){box.innerHTML='<strong>Horaire théorique incomplet</strong><span>Choisissez un horaire de référence ou renseignez arrivée et départ.</span>';return}
 const planned=hoursBetween(plannedStart,plannedEnd,pause);
 const actual=(actualStart&&actualEnd)?hoursBetween(actualStart,actualEnd,pause):planned;
 const total=actual+overtime, delta=total-planned;
 box.innerHTML=`<strong>Calcul de la journée</strong><span>Prévu : ${fmtHours(planned)}</span><span>Réalisé : ${fmtHours(total)}</span><b>Écart : ${delta>=0?'+':''}${fmtHours(delta)}</b>`;
}

function openAgentDay(agentId,date,id){
 const clicked=id?byId('agentDays',id):dayRecord(agentId,date);
 const periodId=clicked?.periodId||'';
 const periodRows=periodId?db.agentDays.filter(x=>x.periodId===periodId):[];
 const old=clicked;
 const initialAgentId=clicked?.agentId||agentId||db.agents[0]?.id;
 const initialDate=clicked?.date||date||todayISO();
 const sched=scheduledFor(initialAgentId,initialDate);
 const x=old||{id:uid(),agentId:initialAgentId,date:initialDate,dayType:'Présence',plannedStart:sched.start,plannedEnd:sched.end,actualStart:'',actualEnd:'',pause:sched.pause,overtime:0,status:'Validée',note:'',replacement:'',noReplacementNeeded:false};
 const dateFrom=periodRows.length?periodRows.map(r=>r.date).sort()[0]:x.date;
 const dateTo=periodRows.length?periodRows.map(r=>r.date).sort().at(-1):x.date;
 openModal(`${agentName(agentById(x.agentId))} — saisie planning`,`<div class="day-shortcuts"><button type="button" data-set-day="Congé annuel">Congé</button><button type="button" data-set-day="RTT">RTT</button><button type="button" data-set-day="Maladie">Maladie</button><button type="button" data-set-day="Présence">Présence</button></div><div class="theoretical-schedule" id="theoreticalSchedule"></div><div class="form-grid"><label>Agent<select name="agentId">${agentOptions(x.agentId)}</select></label><label>Type de journée<select name="dayType">${selectOptions(db.lists.dayTypes,x.dayType)}</select></label>${field('Du','dateFrom',dateFrom,'date','required')}${field('Au','dateTo',dateTo,'date','required')}<label>Statut<select name="status">${selectOptions(['Demandée','Validée','Refusée','Annulée'],x.status||'Validée')}</select></label>${field('Horaire théorique — arrivée','plannedStart',x.plannedStart,'time')}${field('Horaire théorique — départ','plannedEnd',x.plannedEnd,'time')}${field('Horaire réel — arrivée','actualStart',x.actualStart,'time')}${field('Horaire réel — départ','actualEnd',x.actualEnd,'time')}${field('Pause (minutes)','pause',x.pause,'number','min="0" step="5"')}${field('Heures supplémentaires (+) / retirées (-)','overtime',x.overtime,'number','step="0.25"')}<label class="full-width replacement-choice"><span>Gestion du remplacement</span><span class="checkbox-row"><input type="checkbox" name="noReplacementNeeded" ${x.noReplacementNeeded?'checked':''}> Aucun remplacement nécessaire pendant cette période</span></label>${field('Remplacement / relais','replacement',x.replacement||'')}${textareaField('Motif / précision','note',x.note)}</div><p class="hint">Si la case « Aucun remplacement nécessaire » est cochée, aucune notification de remplacement ne sera créée pour toute la période. Tu peux modifier cette décision plus tard.</p><div class="calculation-preview" id="dayCalc"></div>`,form=>{const o=formDataObj(form);
 const from=o.dateFrom, to=o.dateTo;
 if(!o.agentId){toast('Choisissez un agent');return}
 if(!from||!to){toast('Renseignez les dates du et au');return}
 if(to<from){toast('La date de fin doit être après la date de début');return}
 const isPeriod=isAbsenceType(o.dayType)||['Formation','Repos'].includes(o.dayType);
 if(!Array.isArray(db.agentDays))db.agentDays=[];
 if(o.dayType==='Présence'){
   const firstSchedule=scheduledFor(o.agentId,from);
   o.plannedStart=o.plannedStart||firstSchedule.start||'';
   o.plannedEnd=o.plannedEnd||firstSchedule.end||'';
   if(!o.plannedStart||!o.plannedEnd){toast('Aucun horaire théorique trouvé : renseignez arrivée et départ, ou créez les horaires de référence');return}
   if((o.actualStart&&!o.actualEnd)||(!o.actualStart&&o.actualEnd)){toast('Pour un horaire réel, renseignez à la fois l’arrivée et le départ');return}
 }
 if(periodId)db.agentDays=db.agentDays.filter(r=>r.periodId!==periodId);
 else if(old)db.agentDays=db.agentDays.filter(r=>r.id!==old.id);
 const newPeriodId=(isPeriod||from!==to)?uid():'';
 let d=from,added=0;
 while(d<=to){
   const weekday=![0,6].includes(parseDate(d).getDay());
   if(!isPeriod||weekday){
     db.agentDays=db.agentDays.filter(r=>!(String(r.agentId)===String(o.agentId)&&r.date===d));
     const sc=scheduledFor(o.agentId,d), sameStart=d===from;
     const pStart=o.dayType==='Présence'?((from===to?o.plannedStart:'')||sc.start||o.plannedStart||''):'';
     const pEnd=o.dayType==='Présence'?((from===to?o.plannedEnd:'')||sc.end||o.plannedEnd||''):'';
     db.agentDays.push({id:uid(),periodId:newPeriodId,agentId:o.agentId,date:d,dayType:o.dayType,plannedStart:pStart,plannedEnd:pEnd,actualStart:sameStart?(o.actualStart||''):'',actualEnd:sameStart?(o.actualEnd||''):'',pause:Number((from===to&&o.pause!==''?o.pause:sc.pause??o.pause)||0),overtime:Number(sameStart?o.overtime||0:0),status:o.status||'Validée',replacement:o.noReplacementNeeded?'':(o.replacement||''),noReplacementNeeded:!!o.noReplacementNeeded,note:o.note||''});
     added++;
   }
   d=addDays(d,1);
 }
 closeModal();save();toast(`${added} jour(s) enregistré(s)`)},{onDelete:old?()=>{if(!confirm('Supprimer cette saisie ou toute la période associée ?'))return;if(periodId)db.agentDays=db.agentDays.filter(r=>r.periodId!==periodId);else db.agentDays=db.agentDays.filter(r=>r.id!==old.id);closeModal();save();toast('Saisie supprimée')}:null});
 function refreshTheoretical(force=false){
   const f=$('#modalForm');if(!f)return;
   const aid=f.elements.agentId.value, d=f.elements.dateFrom.value||todayISO(), sc=scheduledFor(aid,d);
   const box=$('#theoreticalSchedule');
   if(box)box.innerHTML=`<strong>Horaire théorique du ${fmtDate(d)}</strong><b>${sc.start&&sc.end?`${esc(sc.start)} – ${esc(sc.end)}`:'Aucun horaire défini'}</b>${sc.pause?`<small>Pause : ${sc.pause} min</small>`:''}${sc.missions?`<small>${esc(sc.missions)}</small>`:''}`;
   if(force||(!f.elements.plannedStart.value&&!f.elements.plannedEnd.value)){
     f.elements.plannedStart.value=sc.start||'';f.elements.plannedEnd.value=sc.end||'';f.elements.pause.value=Number(sc.pause||0);
   }
   updateDayCalc();
 }
 $$('[data-set-day]',$('#modalBody')).forEach(b=>b.onclick=()=>{$('#modalBody [name="dayType"]').value=b.dataset.setDay;refreshTheoretical(false)});
 const f=$('#modalForm');
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

/* ---------- Formulaires métier ---------- */
function openPersonalEvent(id,date=todayISO()){const old=id?byId('personalEvents',id):null;const x=old||{id:uid(),no:nextNo('personal','PER'),date,start:'',end:'',type:'Rendez-vous',title:'',location:'',priority:'Normale',status:'À faire',notes:'',attachments:[]};openModal(old?'Modifier l’événement':'Nouvel événement personnel',`<div class="form-grid">${field('Date','date',x.date,'date','required')}${field('Début','start',x.start,'time')}${field('Fin','end',x.end,'time')}<label>Type<select name="type">${selectOptions(db.lists.personalTypes,x.type)}</select></label>${field('Objet','title',x.title,'text','required')}${field('Lieu','location',x.location)}<label>Priorité<select name="priority">${selectOptions(db.lists.priorities,x.priority)}</select></label><label>Statut<select name="status">${selectOptions(db.lists.generalStatuses,x.status)}</select></label>${textareaField('Notes','notes',x.notes)}${attachmentField(x.attachments)}</div>`,async form=>{Object.assign(x,formDataObj(form));await processAttachments(form,x,'personal');if(!old)db.personalEvents.push(x);closeModal();save();toast('Événement enregistré')},{onDelete:old?()=>deleteRecord('personalEvents',x.id,'événement'):null})}
function openIssue(id){const old=id?byId('issues',id):null;const x=old||{id:uid(),no:nextNo('issue','ACT'),date:todayISO(),agentId:'',category:'Sécurité',title:'',description:'',priority:'Haute',status:'À faire',owner:'',dueDate:'',cost:'',action:'',attachments:[]};openModal(old?'Modifier l’action':'Nouvelle action sécurité / qualité',`<div class="form-grid">${field('Date','date',x.date,'date')}<label>Agent concerné<select name="agentId">${agentOptions(x.agentId,true)}</select></label><label>Catégorie<select name="category">${selectOptions(db.lists.issueCategories,x.category)}</select></label><label>Priorité<select name="priority">${selectOptions(db.lists.priorities,x.priority)}</select></label>${field('Problématique','title',x.title,'text','required')}<label>Statut<select name="status">${selectOptions(db.lists.generalStatuses,x.status)}</select></label>${field('Responsable du suivi','owner',x.owner)}${field('Échéance','dueDate',x.dueDate,'date')}${field('Coût éventuel (€)','cost',x.cost,'number','min="0" step="0.01"')}${textareaField('Description','description',x.description)}${textareaField('Action corrective / décision','action',x.action)}${attachmentField(x.attachments)}</div>`,async form=>{Object.assign(x,formDataObj(form),{cost:Number(form.elements.cost.value||0)});await processAttachments(form,x,'issues');if(!old)db.issues.push(x);closeModal();save();toast('Action enregistrée')},{onDelete:old?()=>deleteRecord('issues',x.id,'action'):null})}
function periodicDue(x){if(x.nextDate)return x.nextDate;if(x.lastDate&&Number(x.intervalMonths)>0)return addMonths(x.lastDate,x.intervalMonths);return ''}
function periodicComputed(x){const due=periodicDue(x);if(x.status==='Clôturé'||x.status==='Réalisé')return x.status;if(!due)return x.status||'À planifier';const diff=(parseDate(due)-parseDate(todayISO()))/86400000;if(diff<0)return 'En retard';if(diff<=60)return 'Bientôt';return 'À jour'}
function openPeriodic(id){const old=id?byId('periodic',id):null;const x=old||{id:uid(),no:nextNo('periodic','CP'),name:'',family:db.lists.periodicFamilies[0],intervalMonths:12,requirement:'',provider:'',register:'Registre de sécurité',building:'Tous bâtiments',lastDate:'',nextDate:'',status:'À planifier',notes:'',attachments:[]};openModal(old?'Modifier le contrôle périodique':'Nouveau contrôle périodique',`<div class="form-grid">${field('Contrôle','name',x.name,'text','required')}<label>Famille<select name="family">${selectOptions(db.lists.periodicFamilies,x.family)}</select></label><label>Bâtiment<select name="building"><option>Tous bâtiments</option>${buildingOptions(x.building)}</select></label>${field('Périodicité (mois, 0 = variable)','intervalMonths',x.intervalMonths,'number','min="0"')}${field('Dernier contrôle','lastDate',x.lastDate,'date')}${field('Prochaine échéance','nextDate',periodicDue(x),'date')}<label>Statut<select name="status">${selectOptions(['À planifier','Planifié','Réalisé','Clôturé','En attente','Non applicable'],x.status)}</select></label>${field('Prestataire / responsable','provider',x.provider)}${field('Registre / dossier','register',x.register)}${textareaField('Exigence / contenu','requirement',x.requirement)}${textareaField('Notes','notes',x.notes)}${attachmentField(x.attachments)}</div>`,async form=>{const o=formDataObj(form);Object.assign(x,o,{intervalMonths:Number(o.intervalMonths||0)});await processAttachments(form,x,'periodic');if(!old)db.periodic.push(x);closeModal();save();toast('Contrôle périodique enregistré')},{onDelete:old?()=>deleteRecord('periodic',x.id,'contrôle'):null})}
function cleaningTasks(type,existing=[]){const oldMap=new Map((existing||[]).map(t=>[t.name,t]));return (GUIDE[type]||GUIDE['Autre']||[]).map(([name,freq])=>{const o=oldMap.get(name)||{name,frequency:freq,status:'Non contrôlé',comment:''};return `<div class="clean-task" data-clean-task><div><strong>${esc(name)}</strong><small>${esc(freq)}</small></div><select name="taskStatus">${selectOptions(db.lists.cleaningStatuses,o.status)}</select><input name="taskComment" value="${esc(o.comment||'')}" placeholder="Commentaire rapide"></div>`}).join('')}
function openCleaning(id){const old=id?byId('cleaning',id):null;const b=old?.building||db.buildings[0]?.name||'',floor=old?.floor||db.buildings[0]?.floors?.[0]||'',type=old?.roomType||'Salle de classe / devoirs / informatique';const x=old||{id:uid(),no:nextNo('cleaning','MEN'),date:todayISO(),time:new Date().toTimeString().slice(0,5),inspector:db.settings.defaultInspector||'',agentId:'',building:b,floor,roomType:type,room:'Zone entière',overallStatus:'',score:0,comment:'',tasks:[],attachments:[]};openModal(old?'Modifier le contrôle ménage':'Nouveau contrôle ménage',`<div class="form-grid">${field('Date','date',x.date,'date','required')}${field('Heure','time',x.time,'time')}<label>Agent / secteur contrôlé<select name="agentId">${agentOptions(x.agentId,true)}</select></label>${field('Contrôleur','inspector',x.inspector)}<label>Bâtiment<select name="building" id="mBuilding">${buildingOptions(x.building)}</select></label><label>Étage<select name="floor" id="mFloor">${floorOptions(x.building,x.floor)}</select></label><label>Type de local<select name="roomType" id="mRoomType">${selectOptions(db.lists.roomTypes,x.roomType)}</select></label><label>Local / zone<select name="room" id="mRoom">${roomOptions(x.building,x.floor,x.roomType,x.room)}</select></label>${textareaField('Observation générale','comment',x.comment)}</div><div class="clean-bulk"><span>Tout passer en :</span>${['Conforme','À reprendre','Non conforme','Non applicable'].map(s=>`<button type="button" data-bulk-clean="${s}">${s}</button>`).join('')}</div><div id="cleanTaskEditor" class="clean-task-editor">${cleaningTasks(x.roomType,x.tasks)}</div>${attachmentField(x.attachments)}`,async form=>{const o=formDataObj(form);const rows=$$('[data-clean-task]',form).map((r,i)=>({name:r.querySelector('strong').textContent,frequency:r.querySelector('small').textContent,status:r.querySelector('[name="taskStatus"]').value,comment:r.querySelector('[name="taskComment"]').value}));const rated=rows.filter(r=>!['Non contrôlé','Non applicable'].includes(r.status)),good=rated.filter(r=>r.status==='Conforme').length;Object.assign(x,o,{tasks:rows,score:rated.length?Math.round(good/rated.length*100):0,overallStatus:rows.some(r=>r.status==='Non conforme')?'Non conforme':rows.some(r=>r.status==='À reprendre')?'À reprendre':rated.length?'Conforme':'Non contrôlé'});await processAttachments(form,x,'cleaning');if(!old)db.cleaning.push(x);closeModal();save();toast('Contrôle ménage enregistré')},{onDelete:old?()=>deleteRecord('cleaning',x.id,'contrôle'):null});const updateLocation=()=>{const bb=$('#mBuilding').value,ff=$('#mFloor').value,tt=$('#mRoomType').value;$('#mRoom').innerHTML=roomOptions(bb,ff,tt,$('#mRoom').value)};$('#mBuilding').onchange=()=>{$('#mFloor').innerHTML=floorOptions($('#mBuilding').value);updateLocation()};$('#mFloor').onchange=updateLocation;$('#mRoomType').onchange=()=>{$('#cleanTaskEditor').innerHTML=cleaningTasks($('#mRoomType').value,[]);updateLocation()};$$('[data-bulk-clean]').forEach(btn=>btn.onclick=()=>$$('[name="taskStatus"]',$('#cleanTaskEditor')).forEach(s=>s.value=btn.dataset.bulkClean))}
function openMaintenance(id){const old=id?byId('maintenance',id):null;const x=old||{id:uid(),no:nextNo('maintenance','MAI'),date:todayISO(),title:'',family:'Électricité',priority:'Normale',status:'À faire',building:db.buildings[0]?.name||'',floor:'',room:'Zone entière',requester:'',assigned:'',dueDate:'',description:'',action:'',cost:'',attachments:[]};openModal(old?'Modifier l’intervention':'Nouvelle intervention',`<div class="form-grid">${field('Date de demande','date',x.date,'date','required')}${field('Objet','title',x.title,'text','required')}<label>Famille<select name="family">${selectOptions(db.lists.maintenanceFamilies,x.family)}</select></label><label>Priorité<select name="priority">${selectOptions(db.lists.priorities,x.priority)}</select></label><label>Statut<select name="status">${selectOptions(db.lists.maintenanceStatuses,x.status)}</select></label><label>Bâtiment<select name="building" id="mBuilding">${buildingOptions(x.building)}</select></label><label>Étage<select name="floor" id="mFloor">${floorOptions(x.building,x.floor)}</select></label><label>Local<select name="room" id="mRoom">${roomOptions(x.building,x.floor,'',x.room)}</select></label>${field('Demandeur','requester',x.requester)}${field('Assigné à / prestataire','assigned',x.assigned)}${field('Échéance','dueDate',x.dueDate,'date')}${field('Coût (€)','cost',x.cost,'number','min="0" step="0.01"')}${textareaField('Description / diagnostic','description',x.description)}${textareaField('Action réalisée / suite','action',x.action)}${attachmentField(x.attachments)}</div>`,async form=>{Object.assign(x,formDataObj(form),{cost:Number(form.elements.cost.value||0)});await processAttachments(form,x,'maintenance');if(!old)db.maintenance.push(x);closeModal();save();toast('Intervention enregistrée')},{onDelete:old?()=>deleteRecord('maintenance',x.id,'intervention'):null});$('#mBuilding').onchange=()=>{$('#mFloor').innerHTML=floorOptions($('#mBuilding').value);$('#mRoom').innerHTML=roomOptions($('#mBuilding').value,$('#mFloor').value)};$('#mFloor').onchange=()=>$('#mRoom').innerHTML=roomOptions($('#mBuilding').value,$('#mFloor').value)}
function openRequest(id){const old=id?byId('requests',id):null;const x=old||{id:uid(),no:nextNo('request','DIR'),date:todayISO(),type:'Aménagement de salle',title:'',priority:'Normale',status:'À faire',building:db.buildings[0]?.name||'',room:'',requester:'Direction',dueDate:'',description:'',response:'',attachments:[]};openModal(old?'Modifier la demande':'Nouvelle demande de la direction',`<div class="form-grid">${field('Date','date',x.date,'date')}<label>Type<select name="type">${selectOptions(db.lists.requestTypes,x.type)}</select></label>${field('Objet','title',x.title,'text','required')}<label>Priorité<select name="priority">${selectOptions(db.lists.priorities,x.priority)}</select></label><label>Statut<select name="status">${selectOptions(db.lists.generalStatuses,x.status)}</select></label><label>Bâtiment<select name="building">${buildingOptions(x.building)}</select></label>${field('Salle / lieu','room',x.room)}${field('Demandeur','requester',x.requester)}${field('Échéance','dueDate',x.dueDate,'date')}${textareaField('Demande','description',x.description)}${textareaField('Réponse / réalisation','response',x.response)}${attachmentField(x.attachments)}</div>`,async form=>{Object.assign(x,formDataObj(form));await processAttachments(form,x,'requests');if(!old)db.requests.push(x);closeModal();save();toast('Demande enregistrée')},{onDelete:old?()=>deleteRecord('requests',x.id,'demande'):null})}
function openWork(id){const old=id?byId('works',id):null;const x=old||{id:uid(),no:nextNo('work','CHT'),date:todayISO(),type:'Réunion de chantier',title:'',company:'',architect:'',building:db.buildings[0]?.name||'',priority:'Normale',status:'À faire',dueDate:'',description:'',decision:'',gpaEnd:'',attachments:[]};openModal(old?'Modifier le suivi chantier':'Nouveau suivi chantier / GPA',`<div class="form-grid">${field('Date','date',x.date,'date')}<label>Type<select name="type">${selectOptions(db.lists.workTypes,x.type)}</select></label>${field('Objet / réserve','title',x.title,'text','required')}${field('Entreprise','company',x.company)}${field('Architecte / maîtrise d’œuvre','architect',x.architect)}<label>Bâtiment<select name="building">${buildingOptions(x.building)}</select></label><label>Priorité<select name="priority">${selectOptions(db.lists.priorities,x.priority)}</select></label><label>Statut<select name="status">${selectOptions(db.lists.generalStatuses,x.status)}</select></label>${field('Échéance','dueDate',x.dueDate,'date')}${field('Fin GPA','gpaEnd',x.gpaEnd,'date')}${textareaField('Constat / description','description',x.description)}${textareaField('Décision / suite','decision',x.decision)}${attachmentField(x.attachments)}</div>`,async form=>{Object.assign(x,formDataObj(form));await processAttachments(form,x,'works');if(!old)db.works.push(x);closeModal();save();toast('Suivi chantier enregistré')},{onDelete:old?()=>deleteRecord('works',x.id,'suivi'):null})}
function openMeeting(id,date=todayISO()){const old=id?byId('meetings',id):null;const x=old||{id:uid(),no:nextNo('meeting','RDV'),date,time:'',end:'',type:'Rendez-vous',title:'',location:'',participants:'',status:'Planifié',notes:'',actions:'',attachments:[]};openModal(old?'Modifier le rendez-vous':'Nouvelle réunion / rendez-vous',`<div class="form-grid">${field('Date','date',x.date,'date','required')}${field('Heure','time',x.time,'time')}${field('Fin','end',x.end,'time')}<label>Type<select name="type">${selectOptions(db.lists.meetingTypes,x.type)}</select></label>${field('Objet','title',x.title,'text','required')}${field('Lieu','location',x.location)}${field('Participants','participants',x.participants)}<label>Statut<select name="status">${selectOptions(['Planifié','Réalisé','Reporté','Annulé'],x.status)}</select></label>${textareaField('Compte rendu','notes',x.notes)}${textareaField('Actions décidées','actions',x.actions)}${attachmentField(x.attachments)}</div>`,async form=>{Object.assign(x,formDataObj(form));await processAttachments(form,x,'meetings');if(!old)db.meetings.push(x);closeModal();save();toast('Rendez-vous enregistré')},{onDelete:old?()=>deleteRecord('meetings',x.id,'rendez-vous'):null})}
function noteItemsHTML(items=[]){return `<div id="noteItems">${items.map((i,n)=>`<div class="item-row"><input name="itemText" value="${esc(i.text)}" placeholder="Action ${n+1}"><label class="inline-check"><input name="itemDone" type="checkbox" ${i.done?'checked':''}> Fait</label><button type="button" data-remove-item>×</button></div>`).join('')}</div><button type="button" class="ghost small" id="addNoteItem">＋ Item</button>`}
function openNote(id,category='Autre'){const old=id?byId('notes',id):null;const x=old||{id:uid(),no:nextNo('note','NOT'),date:todayISO(),category,agentId:'',title:'',text:'',priority:'Normale',status:'À faire',dueDate:'',items:[],attachments:[]};openModal(old?'Modifier la note':'Nouvelle note',`<div class="form-grid">${field('Date','date',x.date,'date')}<label>Catégorie<select name="category">${selectOptions(db.lists.noteCategories,x.category)}</select></label><label>Agent concerné<select name="agentId">${agentOptions(x.agentId,true)}</select></label><label>Priorité<select name="priority">${selectOptions(db.lists.priorities,x.priority)}</select></label>${field('Titre','title',x.title,'text','required')}<label>Statut<select name="status">${selectOptions(db.lists.generalStatuses,x.status)}</select></label>${field('Échéance','dueDate',x.dueDate,'date')}${textareaField('Note','text',x.text,5)}</div><fieldset><legend>Liste d’items</legend>${noteItemsHTML(x.items)}</fieldset>${attachmentField(x.attachments)}`,async form=>{const o=formDataObj(form);const rows=$$('.item-row',form).map(r=>({text:r.querySelector('[name="itemText"]').value.trim(),done:r.querySelector('[name="itemDone"]').checked})).filter(i=>i.text);Object.assign(x,o,{items:rows});await processAttachments(form,x,'notes');if(!old)db.notes.push(x);closeModal();save();toast('Note enregistrée')},{onDelete:old?()=>deleteRecord('notes',x.id,'note'):null});function bindItems(){$$('[data-remove-item]',$('#noteItems')).forEach(b=>b.onclick=()=>b.closest('.item-row').remove())}bindItems();$('#addNoteItem').onclick=()=>{$('#noteItems').insertAdjacentHTML('beforeend','<div class="item-row"><input name="itemText" placeholder="Nouvelle action"><label class="inline-check"><input name="itemDone" type="checkbox"> Fait</label><button type="button" data-remove-item>×</button></div>');bindItems()}}
function openVacation(id){const old=id?byId('vacations',id):null;const x=old||{id:uid(),name:'Fermeture / vacances',zone:db.settings.schoolZone,start:todayISO(),end:addDays(todayISO(),7),status:'À préparer',tasks:VACATION_TASKS.map(t=>({text:t,done:false})),notes:'',attachments:[]};openModal(old?'Modifier la période':'Nouvelle période de vacances / fermeture',`<div class="form-grid">${field('Nom','name',x.name,'text','required')}<label>Zone<select name="zone">${selectOptions(['A','B','C','Toutes'],x.zone)}</select></label>${field('Début','start',x.start,'date','required')}${field('Fin','end',x.end,'date','required')}<label>Statut<select name="status">${selectOptions(['À préparer','En préparation','Prête','Terminée'],x.status)}</select></label>${textareaField('Notes','notes',x.notes)}</div><fieldset><legend>Checklist de fermeture / reprise</legend>${noteItemsHTML(x.tasks)}</fieldset>${attachmentField(x.attachments)}`,async form=>{const o=formDataObj(form);const tasks=$$('.item-row',form).map(r=>({text:r.querySelector('[name="itemText"]').value.trim(),done:r.querySelector('[name="itemDone"]').checked})).filter(i=>i.text);Object.assign(x,o,{tasks});await processAttachments(form,x,'vacations');if(!old)db.vacations.push(x);closeModal();save();toast('Période enregistrée')},{onDelete:old?()=>deleteRecord('vacations',x.id,'période'):null});function bind(){$$('[data-remove-item]',$('#noteItems')).forEach(b=>b.onclick=()=>b.closest('.item-row').remove())}bind();$('#addNoteItem').onclick=()=>{$('#noteItems').insertAdjacentHTML('beforeend','<div class="item-row"><input name="itemText" placeholder="Nouvelle action"><label class="inline-check"><input name="itemDone" type="checkbox"> Fait</label><button type="button" data-remove-item>×</button></div>');bind()}}
function openDocument(id){const old=id?byId('documents',id):null;const x=old||{id:uid(),no:nextNo('document','DOC'),date:todayISO(),title:'',category:'Guide / procédure',description:'',linkedModule:'Général',attachments:[]};openModal(old?'Modifier le document':'Ajouter un document',`<div class="form-grid">${field('Date','date',x.date,'date')}<label>Catégorie<select name="category">${selectOptions(db.lists.documentCategories,x.category)}</select></label>${field('Titre','title',x.title,'text','required')}<label>Rattacher à<select name="linkedModule">${selectOptions(['Général','Ménage','Maintenance','Chantier / GPA','Contrôles périodiques','Agents','Vacances','Sécurité / qualité'],x.linkedModule)}</select></label>${textareaField('Description','description',x.description)}${attachmentField(x.attachments)}</div>`,async form=>{Object.assign(x,formDataObj(form));await processAttachments(form,x,'documents');if(!old)db.documents.push(x);closeModal();save();toast('Document enregistré')},{onDelete:old?()=>deleteRecord('documents',x.id,'document'):null})}
function openSpace(id){const old=id?byId('spaces',id):null;const x=old||{id:uid(),building:db.buildings[0]?.name||'',floor:db.buildings[0]?.floors?.[0]||'',type:db.lists.roomTypes[0],name:''};openModal(old?'Modifier le local':'Ajouter un local',`<div class="form-grid"><label>Bâtiment<select name="building" id="mBuilding">${buildingOptions(x.building)}</select></label><label>Étage<select name="floor" id="mFloor">${floorOptions(x.building,x.floor)}</select></label><label>Type<select name="type">${selectOptions(db.lists.roomTypes,x.type)}</select></label>${field('Nom / numéro du local','name',x.name,'text','required')}</div>`,form=>{Object.assign(x,formDataObj(form));if(!old)db.spaces.push(x);closeModal();save();toast('Local enregistré')},{onDelete:old?()=>deleteRecord('spaces',x.id,'local'):null});$('#mBuilding').onchange=()=>$('#mFloor').innerHTML=floorOptions($('#mBuilding').value)}
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
    const rows=agents.map(a=>{
      const info=dayInfo(a.id,date),h=dayHours(info);
      const absent=isAbsenceType(info.dayType);
      const cls=absent?'absence':info.dayType==='Formation'?'training':info.dayType==='Repos'?'rest':info.shift==='Soir'?'evening':info.shift==='Matin'?'morning':'neutral';
      const detail=info.dayType==='Présence'&&info.plannedStart&&info.plannedEnd?`${esc(info.plannedStart)}–${esc(info.plannedEnd)}`:esc(info.dayType==='Repos'?'Repos':info.dayType);
      const mission=info.dayType==='Présence'&&info.missions?`<small class="agent-missions">${esc(info.missions)}</small>`:(info.note?`<small class="agent-missions">${esc(info.note)}</small>`:'');
      const delta=Math.abs(h.delta)>0.001?`<em class="agent-delta ${h.delta>0?'positive':'negative'}">${h.delta>0?'+':''}${h.delta.toFixed(2)} h</em>`:'';
      return `<button class="team-agent-entry ${cls}" data-agent-day="${a.id}" data-date="${date}" title="Modifier ${esc(agentName(a))} le ${fmtDate(date)}"><span class="agent-entry-avatar">${esc((a.firstName||a.lastName||'?').charAt(0).toUpperCase())}</span><span class="agent-entry-main"><strong>${esc(agentName(a))}</strong><small class="agent-hours">${detail||'Horaire non défini'}</small>${mission}</span>${delta}<span class="agent-entry-arrow">›</span></button>`;
    }).join('');
    const present=agents.filter(a=>{const i=dayInfo(a.id,date);return i.dayType==='Présence'}).length;
    return `<section class="team-day-card ${date===todayISO()?'today':''}"><header class="team-day-header"><div><strong>${dateObj.toLocaleDateString('fr-FR',{weekday:'long'})}</strong><span>${dateObj.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}</span></div><small>${present}/${agents.length} prévu${present>1?'s':''}</small></header><div class="team-day-agents">${rows}</div></section>`;
  }).join('');
  $('#teamWeekCalendar').innerHTML=`<div class="team-week-cards">${html}</div>`;
}
function eventsForDate(d){return [...db.personalEvents.filter(x=>x.date===d).map(x=>({...x,source:'personal'})),...db.meetings.filter(x=>x.date===d).map(x=>({...x,title:x.title,source:'meeting'})),...db.notes.filter(x=>x.dueDate===d&&!['Terminé','Clôturé'].includes(x.status)).map(x=>({...x,date:d,start:'',source:'note'}))].sort((a,b)=>(a.start||'99:99').localeCompare(b.start||'99:99'))}
function renderPersonalCalendar(){const days=Array.from({length:7},(_,i)=>addDays(personalWeek,i));$('#personalWeekLabel').textContent=`${fmtDate(days[0])} au ${fmtDate(days[6])}`;$('#personalWeekCalendar').innerHTML=days.map(d=>`<div class="personal-day ${d===todayISO()?'today':''}"><button class="personal-day-head" data-new-personal-date="${d}"><strong>${parseDate(d).toLocaleDateString('fr-FR',{weekday:'long'})}</strong><span>${parseDate(d).getDate()}</span></button><div>${cardList(eventsForDate(d).map(e=>`<button class="mini-event" data-edit-type="${e.source==='meeting'?'meeting':e.source==='note'?'note':'personal'}" data-edit-id="${e.id}"><b>${esc(e.start||'')}</b> ${esc(e.title)}</button>`),'Libre')}</div></div>`).join('')}
function renderAbsenceBoard(){const month=$('#absenceMonth').value||monthISO(),[y,m]=month.split('-').map(Number),count=new Date(y,m,0).getDate(),agents=db.agents.filter(a=>a.status==='Actif');let html='<div class="month-grid"><div class="month-corner">Agent</div>'+Array.from({length:count},(_,i)=>{const d=`${month}-${pad(i+1)}`;return `<div class="month-day-head ${[0,6].includes(parseDate(d).getDay())?'weekend':''}">${i+1}</div>`}).join('');for(const a of agents){html+=`<div class="month-agent">${esc(agentName(a))}</div>`;for(let i=1;i<=count;i++){const d=`${month}-${pad(i)}`,info=dayInfo(a.id,d),short=info.dayType==='Présence'?(info.shift==='Matin'?'M':info.shift==='Soir'?'S':'P'):({'Congé annuel':'C','RTT':'R','Récupération':'RC','Maladie':'MAL','Formation':'F','Repos':'—'}[info.dayType]||'A');html+=`<button class="month-cell ${isAbsenceType(info.dayType)?'absence':info.dayType==='RTT'?'rtt':info.shift==='Soir'?'evening':info.shift==='Matin'?'morning':''}" data-agent-day="${a.id}" data-date="${d}" title="${esc(info.dayType)}">${short}</button>`}}html+='</div>';$('#absenceMonthBoard').innerHTML=html}

/* ---------- Rendu : modules ---------- */
function renderAgents(){const q=($('#agentSearch').value||'').toLowerCase(),status=$('#agentStatus').value;const arr=db.agents.filter(a=>(!status||a.status===status)&&(!q||agentName(a).toLowerCase().includes(q)||String(a.assignment).toLowerCase().includes(q)));$('#agentCards').innerHTML=cardList(arr.map(a=>{const state=agentState(a),month=$('#planningMonth').value||monthISO(),rows=db.agentDays.filter(x=>x.agentId===a.id&&dateMonthMatch(x.date,month)),absence=rows.filter(x=>isAbsenceType(x.dayType)).length,ot=rows.reduce((s,x)=>s+Number(x.overtime||0),0);return `<article class="agent-card"><div class="agent-avatar">${esc((a.firstName||'?')[0])}</div><div class="agent-main"><div class="panel-head"><h3>${esc(agentName(a))}</h3>${badge(a.status)}</div><p>${esc(a.role)} · ${esc(a.assignment||'Sans affectation')}</p><div class="agent-stats"><span>${badge(state.label)}</span><span>${esc(a.weeklyHours)} h/semaine</span><span>${absence} absence(s) ce mois</span><span>${ot>=0?'+':''}${ot} h supp.</span></div><div class="card-actions"><button data-edit-type="agent" data-edit-id="${a.id}">Modifier</button><button data-new-weekly-agent="${a.id}">Horaires annuels</button><button data-new-rotation-agent="${a.id}">Roulement</button><button data-agent-day="${a.id}" data-date="${todayISO()}">Signaler un écart</button></div></div></article>`}),'Aucun agent trouvé.')}
function renderRotations(){const agent=$('#rotationAgent').value;const arr=db.rotations.filter(r=>!agent||r.agentId===agent).sort((a,b)=>a.agentId.localeCompare(b.agentId)||b.effectiveFrom.localeCompare(a.effectiveFrom));$('#rotationsTable').innerHTML=arr.length?arr.map(r=>`<tr><td>${esc(agentName(agentById(r.agentId)))}</td><td>${fmtDate(r.effectiveFrom)}</td><td>${r.morningWeeks} sem. matin / ${r.eveningWeeks} sem. soir</td><td>${esc(r.morningStart)}–${esc(r.morningEnd)}</td><td>${esc(r.eveningStart)}–${esc(r.eveningEnd)}</td><td>${(r.weekdays||[]).map(d=>['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d]).join(', ')}</td><td>${fmtDate(r.effectiveTo)||'En cours'}</td><td>${editButton('rotation',r.id)}</td></tr>`).join(''):emptyRow(8);renderRotationPreview()}
function renderRotationPreview(){const year=Number($('#rotationYear').value)||new Date().getFullYear(),month=$('#rotationMonth').value,agentId=$('#rotationAgent').value||db.agents.find(a=>a.status==='Actif')?.id;if(!agentId){$('#rotationPreview').innerHTML='<p>Aucun agent.</p>';return}const months=month?[Number(month)]:Array.from({length:12},(_,i)=>i+1);$('#rotationPreview').innerHTML=`<h4>${esc(agentName(agentById(agentId)))} — ${year}</h4>`+months.map(m=>{const first=`${year}-${pad(m)}-01`,last=new Date(year,m,0).getDate();return `<div class="rotation-month"><strong>${parseDate(first).toLocaleDateString('fr-FR',{month:'long'})}</strong><div>${Array.from({length:last},(_,i)=>{const d=`${year}-${pad(m)}-${pad(i+1)}`,info=dayInfo(agentId,d),cls=info.dayType!=='Présence'?'off':info.shift==='Matin'?'morning':'evening';return `<button class="rotation-day ${cls}" data-agent-day="${agentId}" data-date="${d}" title="${fmtDate(d)} — ${info.dayType} ${info.shift||''}">${i+1}</button>`}).join('')}</div></div>`}).join('')}

function renderWeeklyPlans(){const box=$('#weeklyPlansBoard');if(!box)return;normalizeWeeklyPlans();const days=['Lundi','Mardi','Mercredi','Jeudi','Vendredi'];box.innerHTML=(db.weeklyPlans||[]).map((p,pi)=>`<article class="weekly-plan-card"><div class="panel-head"><div><h4>${esc(agentName(agentById(p.agentId))||p.agent||'Planning')}</h4>${badge(p.shift||'Standard')}<small>${fmtDate(p.effectiveFrom)} → ${fmtDate(p.effectiveTo)}</small></div><button class="ghost small" data-edit-weekly-plan="${pi}">Modifier</button></div><div class="weekly-day-grid">${days.map((d,i)=>{const x=p.dayProfiles?.[i+1]||{};return `<button class="weekly-day" data-edit-weekly-plan="${pi}"><strong>${d}</strong><span>${x.start&&x.end?`${x.start}–${x.end}`:'Non travaillé'}</span><small>${esc(x.missions||'')}</small></button>`}).join('')}</div></article>`).join('')||'<div class="empty">Aucun horaire de référence. Ajoutez un agent ou un planning.</div>'}
function openWeeklyPlan(i=null,agentId=''){
 normalizeWeeklyPlans();
 const old=i!==null?db.weeklyPlans[i]:null;
 const p=old||{id:uid(),agentId:agentId||db.agents[0]?.id,agent:agentName(agentById(agentId||db.agents[0]?.id)),shift:'Standard',effectiveFrom:'2026-09-01',effectiveTo:'2027-08-31',dayProfiles:{}};
 const days=['Lundi','Mardi','Mercredi','Jeudi','Vendredi'];
 openModal(old?'Modifier les horaires théoriques':'Nouveaux horaires théoriques',`<div class="notice"><strong>Base annuelle théorique :</strong> choisissez la période scolaire (par défaut du 01/09/2026 au 31/08/2027), puis les horaires de chaque jour. Utilisez le profil Standard sans roulement, ou créez les profils Matin et Soir pour un agent en roulement. Le tableau de bord calcule ensuite automatiquement l’horaire de chaque date. Les congés et changements ponctuels restent prioritaires.</div><div class="form-grid"><label>Agent<select name="agentId" required>${agentOptions(p.agentId)}</select></label><label>Profil<select name="shift">${selectOptions(['Standard','Matin','Soir'],p.shift||'Standard')}</select></label>${field('Valable du','effectiveFrom',p.effectiveFrom||'2026-09-01','date','required')}${field('Valable au','effectiveTo',p.effectiveTo||'2027-08-31','date','required')}</div><div class="day-profile-editor">${days.map((d,i)=>{const x=p.dayProfiles?.[i+1]||{};return `<fieldset><legend>${d}</legend><div class="form-grid"><label>Début<input type="time" name="start_${i+1}" value="${esc(x.start||'')}"></label><label>Fin<input type="time" name="end_${i+1}" value="${esc(x.end||'')}"></label><label>Pause (min)<input type="number" min="0" step="5" name="pause_${i+1}" value="${esc(x.pause||0)}"></label><label class="span2">Missions principales<input name="missions_${i+1}" value="${esc(x.missions||'')}"></label></div></fieldset>`}).join('')}</div>`,form=>{
   const o=formDataObj(form);
   if(!o.agentId){toast('Choisissez un agent');return}
   if(!o.effectiveFrom||!o.effectiveTo){toast('Renseignez la période de validité');return}
   if(o.effectiveTo<o.effectiveFrom){toast('La date de fin doit être après la date de début');return}
   p.agentId=o.agentId;p.agent=agentName(agentById(o.agentId));p.shift=o.shift;p.effectiveFrom=o.effectiveFrom;p.effectiveTo=o.effectiveTo;p.dayProfiles={};
   for(let d=1;d<=5;d++){
     const st=o[`start_${d}`]||'',en=o[`end_${d}`]||'';
     if((st&&!en)||(!st&&en)){toast(`${days[d-1]} : renseignez le début et la fin, ou laissez les deux vides`);return}
     p.dayProfiles[d]={start:st,end:en,pause:Number(o[`pause_${d}`]||0),missions:o[`missions_${d}`]||'',segments:[]};
   }
   p.rows=[];if(!old)db.weeklyPlans.push(p);closeModal();save();toast('Horaires théoriques enregistrés et appliqués au tableau de bord');
 },{onDelete:old?()=>{if(confirm('Supprimer ce profil horaire ?')){db.weeklyPlans.splice(i,1);closeModal();save()}}:null});
}
function renderPlanning(){renderWeeklyPlans();const month=$('#planningMonth').value||monthISO(),agent=$('#planningAgent').value,signal=$('#planningSignal').value;const start=`${month}-01`,end=localISO(new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0));const rows=[];for(const a of db.agents.filter(x=>x.status==='Actif'&&(!agent||x.id===agent))){let d=start;while(d<=end){if(![0,6].includes(parseDate(d).getDay())){const info=dayInfo(a.id,d),h=dayHours(info);let sig=isAbsenceType(info.dayType)?'Absence':h.delta>0.01?'Heures supplémentaires':h.delta<-0.01?'Heures manquantes':'Conforme';if(!signal||sig===signal)rows.push({a,d,info,h,sig})}d=addDays(d,1)}}const sums=rows.reduce((s,r)=>{s.p+=r.h.planned;s.a+=r.h.total;s.o+=Number(r.info.overtime||0);return s},{p:0,a:0,o:0});$('#planningSummary').innerHTML=`<article><span>Prévu</span><strong>${fmtHours(sums.p)}</strong></article><article><span>Réalisé</span><strong>${fmtHours(sums.a)}</strong></article><article><span>Écart</span><strong>${sums.a-sums.p>=0?'+':''}${fmtHours(sums.a-sums.p)}</strong></article><article><span>Heures ajoutées</span><strong>${fmtHours(sums.o)}</strong></article>`;$('#planningTable').innerHTML=rows.length?rows.map(r=>`<tr><td>${fmtDate(r.d)}</td><td>${esc(agentName(r.a))}</td><td>${r.info.dayType==='Présence'?`${r.info.plannedStart||'—'}–${r.info.plannedEnd||'—'} (${fmtHours(r.h.planned)})`:badge(r.info.dayType)}</td><td>${r.info.actualStart?`${r.info.actualStart}–${r.info.actualEnd} (${fmtHours(r.h.total)})`:'—'}</td><td>${r.h.delta>=0?'+':''}${fmtHours(r.h.delta)}</td><td>${badge(r.sig)}</td><td><button class="icon-btn" data-agent-day="${r.a.id}" data-date="${r.d}">✎</button></td></tr>`).join(''):emptyRow(7)}
function renderAbsences(){renderAbsenceBoard();const month=$('#absenceMonth').value||monthISO(),agent=$('#absenceAgent').value,type=$('#absenceType').value,status=$('#absenceStatus').value;const rows=db.agentDays.filter(x=>dateMonthMatch(x.date,month)&&isAbsenceType(x.dayType)&&(!agent||x.agentId===agent)&&(!type||x.dayType===type)&&(!status||x.status===status));const groups=new Map();for(const x of rows){const key=x.periodId||x.id;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(x)}const arr=[...groups.values()].map(g=>g.sort((a,b)=>a.date.localeCompare(b.date))).sort((a,b)=>a[0].date.localeCompare(b[0].date));$('#absencesTable').innerHTML=arr.length?arr.map(g=>{const x=g[0],from=g[0].date,to=g.at(-1).date;return `<tr><td>${esc(agentName(agentById(x.agentId)))}</td><td>${fmtDate(from)}</td><td>${fmtDate(to)}</td><td>${badge(x.dayType)}</td><td>${g.length} jour${g.length>1?'s':''}</td><td>${badge(x.status||'Validée')}</td><td>${x.noReplacementNeeded?'<span class="badge good">Sans remplacement</span>':esc(x.replacement||'À décider')}</td><td><button class="icon-btn" data-agent-day="${x.agentId}" data-date="${from}">✎</button></td></tr>`}).join(''):emptyRow(8);renderAbsenceCounters(month)}
function renderAbsenceCounters(month){const agents=db.agents.filter(a=>a.status==='Actif');const types=db.lists.dayTypes.filter(isAbsenceType);const used=types.filter(t=>db.agentDays.some(x=>dateMonthMatch(x.date,month)&&x.dayType===t));const cols=used.length?used:types.slice(0,5);const head=`<table><thead><tr><th>Agent</th>${cols.map(t=>`<th>${esc(t)}</th>`).join('')}<th>Total</th></tr></thead><tbody>`;const body=agents.map(a=>{const rs=db.agentDays.filter(x=>x.agentId===a.id&&dateMonthMatch(x.date,month)&&isAbsenceType(x.dayType));return `<tr><td><strong>${esc(agentName(a))}</strong></td>${cols.map(t=>`<td>${rs.filter(x=>x.dayType===t).length}</td>`).join('')}<td><strong>${rs.length}</strong></td></tr>`}).join('');$('#absenceCounters').innerHTML=head+body+'</tbody></table>'}
function renderVacations(){const zone=$('#vacationZone').value,status=$('#vacationStatus').value;const arr=db.vacations.filter(x=>(!zone||x.zone===zone||x.zone==='Toutes')&&(!status||x.status===status)).sort((a,b)=>a.start.localeCompare(b.start));$('#vacationCards').innerHTML=cardList(arr.map(x=>{const done=(x.tasks||[]).filter(t=>t.done).length,total=(x.tasks||[]).length,pct=total?Math.round(done/total*100):0;return `<article class="vacation-card"><div class="panel-head"><div><h3>${esc(x.name)}</h3><p>${fmtDate(x.start)} → ${fmtDate(x.end)} · Zone ${esc(x.zone)}</p></div>${badge(x.status)}</div><div class="progress"><span style="width:${pct}%"></span></div><p>${done}/${total} actions terminées (${pct} %)</p><ul>${(x.tasks||[]).slice(0,6).map(t=>`<li class="${t.done?'done':''}">${t.done?'✓':'○'} ${esc(t.text)}</li>`).join('')}</ul><div class="card-actions"><button data-edit-type="vacation" data-edit-id="${x.id}">Ouvrir la checklist</button></div></article>`}),'Aucune période chargée.')}
function renderIssues(){const m=$('#issueMonth').value,agent=$('#issueAgent').value,cat=$('#issueCategory').value,status=$('#issueStatus').value;const arr=db.issues.filter(x=>dateMonthMatch(x.date,m)&&(!agent||x.agentId===agent)&&(!cat||x.category===cat)&&(!status||x.status===status)).sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));$('#issuesTable').innerHTML=arr.length?arr.map(x=>`<tr><td>${fmtDate(x.date)}</td><td>${esc(x.category)}</td><td>${esc(agentName(agentById(x.agentId)))}</td><td>${badge(x.priority)}</td><td><strong>${esc(x.title)}</strong><small>${esc(x.description||'')}</small></td><td>${esc(x.action||'—')}</td><td>${fmtDate(x.dueDate)||'—'}</td><td>${badge(x.status)}</td><td>${editButton('issue',x.id)}</td></tr>`).join(''):emptyRow(9)}
function renderPeriodic(){const fam=$('#periodicFamily').value,status=$('#periodicStatus').value,bld=$('#periodicBuilding').value;const arr=db.periodic.filter(x=>(!fam||x.family===fam)&&(!status||periodicComputed(x)===status||x.status===status)&&(!bld||x.building===bld||x.building==='Tous bâtiments')).sort((a,b)=>(periodicDue(a)||'9999').localeCompare(periodicDue(b)||'9999'));$('#periodicCards').innerHTML=cardList(arr.map(x=>{const state=periodicComputed(x);return `<article class="periodic-card ${state==='En retard'?'late':''}"><div class="panel-head"><span>${esc(x.no)}</span>${badge(state)}</div><h3>${esc(x.name)}</h3><p>${esc(x.family)} · ${esc(x.building)}</p><dl><dt>Dernier</dt><dd>${fmtDate(x.lastDate)||'Non renseigné'}</dd><dt>Échéance</dt><dd>${fmtDate(periodicDue(x))||'À définir'}</dd><dt>Responsable</dt><dd>${esc(x.provider||'À définir')}</dd></dl>${attachmentButtons(x.attachments)}<button data-edit-type="periodic" data-edit-id="${x.id}">Modifier / joindre un rapport</button></article>`}),'Aucun contrôle trouvé.')}
function renderCleaningGuide(){const type=$('#cleaningGuideType').value||db.lists.roomTypes.find(x=>GUIDE[x])||Object.keys(GUIDE)[0];$('#cleaningGuideType').value=type;const rows=GUIDE[type]||[];$('#cleaningGuideTable').innerHTML=`<table><thead><tr><th>Opération</th><th>Fréquence préconisée</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</tbody></table>`}
function renderCleaning(){const month=$('#cleanMonth').value,bld=$('#cleanBuilding').value,type=$('#cleanRoomType').value,status=$('#cleanStatus').value;const arr=db.cleaning.filter(x=>dateMonthMatch(x.date,month)&&(!bld||x.building===bld)&&(!type||x.roomType===type)&&(!status||x.overallStatus===status)).sort((a,b)=>b.date.localeCompare(a.date));const all=arr.length,ok=arr.filter(x=>x.overallStatus==='Conforme').length,weak=arr.reduce((s,x)=>s+(x.tasks||[]).filter(t=>['À reprendre','Non conforme'].includes(t.status)).length,0),avg=all?Math.round(arr.reduce((s,x)=>s+Number(x.score||0),0)/all):0;$('#cleaningSummary').innerHTML=`<article><span>Contrôles</span><strong>${all}</strong></article><article><span>Conformes</span><strong>${ok}</strong></article><article><span>Score moyen</span><strong>${avg||'—'}${all?' %':''}</strong></article><article><span>Points faibles</span><strong>${weak}</strong></article>`;$('#cleaningTable').innerHTML=arr.length?arr.map(x=>{const weakTasks=(x.tasks||[]).filter(t=>['À reprendre','Non conforme'].includes(t.status));return `<tr><td>${fmtDate(x.date)} ${esc(x.time||'')}</td><td>${esc([x.building,x.floor,x.room].filter(Boolean).join(' · '))}</td><td>${esc(x.roomType)}</td><td>${esc(agentName(agentById(x.agentId)))}</td><td>${x.score||0} %</td><td>${badge(x.overallStatus)}</td><td>${esc(weakTasks.slice(0,3).map(t=>t.name).join(', ')||'—')}</td><td>${editButton('cleaning',x.id)}</td></tr>`}).join(''):emptyRow(8);renderCleaningGuide()}
function renderMaintenance(){const st=$('#maintenanceStatus').value,p=$('#maintenancePriority').value,f=$('#maintenanceFamily').value;const arr=db.maintenance.filter(x=>(!st||x.status===st)&&(!p||x.priority===p)&&(!f||x.family===f)).sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));$('#maintenanceTable').innerHTML=arr.length?arr.map(x=>`<tr><td>${esc(x.no)}</td><td>${fmtDate(x.date)}</td><td>${esc([x.building,x.floor,x.room].filter(Boolean).join(' · '))}</td><td>${esc(x.family)}</td><td><strong>${esc(x.title)}</strong><small>${esc(x.description||'')}</small></td><td>${badge(x.priority)}</td><td>${esc(x.assigned||'—')}</td><td>${fmtDate(x.dueDate)||'—'}</td><td>${badge(x.status)}</td><td>${editButton('maintenance',x.id)}</td></tr>`).join(''):emptyRow(10)}
function renderRequests(){const st=$('#requestStatus').value,t=$('#requestType').value;const arr=db.requests.filter(x=>(!st||x.status===st)&&(!t||x.type===t)).sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));$('#requestsTable').innerHTML=arr.length?arr.map(x=>`<tr><td>${esc(x.no)}</td><td>${fmtDate(x.date)}</td><td>${esc(x.requester)}</td><td>${esc(x.type)}</td><td>${esc([x.building,x.room].filter(Boolean).join(' · '))}</td><td>${fmtDate(x.dueDate)||'—'}</td><td>${badge(x.priority)}</td><td>${badge(x.status)}</td><td>${editButton('request',x.id)}</td></tr>`).join(''):emptyRow(9)}
function renderWorks(){const st=$('#workStatus').value,t=$('#workType').value;const arr=db.works.filter(x=>(!st||x.status===st)&&(!t||x.type===t)).sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));$('#worksTable').innerHTML=arr.length?arr.map(x=>`<tr><td>${esc(x.no)}</td><td>${esc(x.type)}</td><td><strong>${esc(x.title)}</strong><small>${esc(x.description||'')}</small></td><td>${esc(x.building)}</td><td>${esc(x.company||'—')}</td><td>${fmtDate(x.dueDate)||'—'}</td><td>${badge(x.priority)}</td><td>${badge(x.status)}</td><td>${editButton('work',x.id)}</td></tr>`).join(''):emptyRow(9)}
function renderMeetings(){const m=$('#meetingMonth').value,t=$('#meetingType').value;const arr=db.meetings.filter(x=>dateMonthMatch(x.date,m)&&(!t||x.type===t)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));$('#meetingsTable').innerHTML=arr.length?arr.map(x=>`<tr><td>${fmtDate(x.date)}</td><td>${esc(x.time||'—')}</td><td>${esc(x.type)}</td><td>${esc(x.title)}</td><td>${esc(x.location||'—')}</td><td>${esc(x.participants||'—')}</td><td>${badge(x.status)}</td><td>${editButton('meeting',x.id)}</td></tr>`).join(''):emptyRow(8)}
function renderPersonal(){const m=$('#personalMonth').value,t=$('#personalType').value,s=$('#personalStatus').value;const arr=db.personalEvents.filter(x=>dateMonthMatch(x.date,m)&&(!t||x.type===t)&&(!s||x.status===s)).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));$('#personalTable').innerHTML=arr.length?arr.map(x=>`<tr><td>${fmtDate(x.date)}</td><td>${esc([x.start,x.end].filter(Boolean).join('–')||'—')}</td><td>${esc(x.type)}</td><td>${esc(x.title)}</td><td>${esc(x.location||'—')}</td><td>${badge(x.priority)}</td><td>${badge(x.status)}</td><td>${editButton('personal',x.id)}</td></tr>`).join(''):emptyRow(8);$('#personalCards').innerHTML=cardList(arr.map(x=>`<article class="list-card"><div><strong>${fmtDate(x.date)} ${esc(x.start||'')}</strong>${badge(x.status)}</div><h3>${esc(x.title)}</h3><p>${esc(x.type)} · ${esc(x.location||'Sans lieu')}</p><button data-edit-type="personal" data-edit-id="${x.id}">Modifier</button></article>`))}
function renderNotes(){const cat=$('#noteCategory').value,p=$('#notePriority').value,s=$('#noteStatus').value,q=($('#noteSearch').value||'').toLowerCase();const arr=db.notes.filter(x=>(!cat||x.category===cat)&&(!p||x.priority===p)&&(!s||x.status===s)&&(!q||`${x.title} ${x.text}`.toLowerCase().includes(q))).sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));$('#notesBoard').innerHTML=cardList(arr.map(x=>{const done=(x.items||[]).filter(i=>i.done).length;return `<article class="note-card"><div class="panel-head"><span>${esc(x.category)}</span>${badge(x.priority)}</div><h3>${esc(x.title)}</h3><p>${esc(x.text||'')}</p>${x.agentId?`<p>👤 ${esc(agentName(agentById(x.agentId)))}</p>`:''}<p>Échéance : ${fmtDate(x.dueDate)||'—'} · ${done}/${(x.items||[]).length} items</p><ul>${(x.items||[]).map(i=>`<li class="${i.done?'done':''}">${i.done?'✓':'○'} ${esc(i.text)}</li>`).join('')}</ul>${attachmentButtons(x.attachments)}<div class="card-actions"><span>${badge(x.status)}</span><button data-edit-type="note" data-edit-id="${x.id}">Modifier</button></div></article>`}),'Aucune note.')}
function renderDocuments(){const cat=$('#documentCategory').value,q=($('#documentSearch').value||'').toLowerCase();const arr=db.documents.filter(x=>(!cat||x.category===cat)&&(!q||`${x.title} ${x.description}`.toLowerCase().includes(q))).sort((a,b)=>b.date.localeCompare(a.date));
 const guides=BUILTIN_GUIDES.filter(x=>(!cat||x.category===cat)&&(!q||x.title.toLowerCase().includes(q)));
 $('#documentCards').innerHTML=cardList([
   ...guides.map(g=>`<article class="document-card builtin"><div class="doc-icon">📘</div><h3>${esc(g.title)}</h3><p>Document officiel stocké dans Supabase Storage.</p><button data-guide-path="${esc(g.storagePath)}">Ouvrir le guide</button></article>`),
   ...arr.map(x=>`<article class="document-card"><div class="doc-icon">📄</div><h3>${esc(x.title)}</h3><p>${esc(x.category)} · ${fmtDate(x.date)}</p><p>${esc(x.description||'')}</p>${attachmentButtons(x.attachments)}<button data-edit-type="document" data-edit-id="${x.id}">Modifier</button></article>`)
 ],'Aucun document trouvé.');}
function renderOutlook(){const email=db.settings.outlookEmail||'';const label=$('#outlookMailLabel');if(label)label.textContent=email?`Compte repère : ${email}`:'Adresse professionnelle non renseignée';}
/* ---------- Tableau de bord ---------- *//* ---------- Tableau de bord ---------- */
function itemCard(icon,title,meta,editType,id){return `<button class="preview-item" data-edit-type="${editType}" data-edit-id="${id}"><span>${icon}</span><div><strong>${esc(title)}</strong><small>${meta}</small></div><b>›</b></button>`}

function isoWeekKey(dateISO){const d=parseDate(dateISO);d.setHours(0,0,0,0);d.setDate(d.getDate()+3-(d.getDay()+6)%7);const y=d.getFullYear(),w=1+Math.round(((d-new Date(y,0,4))/86400000-3+(new Date(y,0,4).getDay()+6)%7)/7);return `${y}-S${String(w).padStart(2,'0')}`}
function academicYearFor(dateISO){const d=parseDate(dateISO),y=d.getFullYear();return d.getMonth()>=8?`${y}-${y+1}`:`${y-1}-${y}`}
function recordsInRange(arr,start,end,dateFields=['date']){return (arr||[]).filter(x=>dateFields.some(f=>x[f]&&x[f]>=start&&x[f]<=end)).map(clone)}
function createWeeklyArchive(force=false){const end=addDays(startOfWeek(todayISO()),-1),start=addDays(end,-6),key=isoWeekKey(start);if(!force&&db.archives.some(a=>a.kind==='weekly'&&a.key===key))return false;const absent=recordsInRange(db.agentDays,start,end).filter(x=>isAbsenceType(x.dayType));const snapshot={id:uid(),kind:'weekly',key,year:start.slice(0,4),academicYear:academicYearFor(start),start,end,createdAt:new Date().toISOString(),summary:{agents:db.agents.filter(a=>a.status==='Actif').length,absences:absent.length,maintenance:recordsInRange(db.maintenance,start,end,['date','dueDate']).length,cleaning:recordsInRange(db.cleaning,start,end).length,meetings:recordsInRange(db.meetings,start,end).length,notes:recordsInRange(db.notes,start,end,['date','dueDate']).length},data:{agentDays:recordsInRange(db.agentDays,start,end),maintenance:recordsInRange(db.maintenance,start,end,['date','dueDate']),cleaning:recordsInRange(db.cleaning,start,end),meetings:recordsInRange(db.meetings,start,end),personalEvents:recordsInRange(db.personalEvents,start,end),notes:recordsInRange(db.notes,start,end,['date','dueDate']),issues:recordsInRange(db.issues,start,end,['date','dueDate']),requests:recordsInRange(db.requests,start,end,['date','dueDate']),works:recordsInRange(db.works,start,end,['date','dueDate'])}};db.archives.push(snapshot);db.settings.lastWeeklyArchiveKey=key;return true}
function runAnnualReset(){const t=parseDate(todayISO()),y=t.getFullYear(),isCloseDay=t.getMonth()===7&&t.getDate()===31,isAfterClose=t.getMonth()>=8;if(!isCloseDay&&!isAfterClose)return false;const closeYear=y;if(db.settings.lastAnnualResetYear>=closeYear)return false;const prevStart=closeYear-1,from=`${prevStart}-09-01`,to=`${closeYear}-08-31`,key=`${prevStart}-${closeYear}`;if(!db.archives.some(a=>a.kind==='annual'&&a.key===key)){db.archives.push({id:uid(),kind:'annual',key,year:String(closeYear),academicYear:key,start:from,end:to,createdAt:new Date().toISOString(),summary:{leaveDays:db.agentDays.filter(x=>x.date>=from&&x.date<=to&&isAbsenceType(x.dayType)).length,overtime:db.agentDays.filter(x=>x.date>=from&&x.date<=to).reduce((n,x)=>n+Number(x.overtime||0),0)},data:{agentDays:recordsInRange(db.agentDays,from,to),rotations:clone(db.rotations),weeklyPlans:clone(db.weeklyPlans)}})}db.settings.lastAnnualResetYear=closeYear;db.settings.leaveBalances={};db.settings.overtimeBalances={};return true}
function runAutomaticHousekeeping(){let changed=false;try{changed=createWeeklyArchive(false)||changed;changed=runAnnualReset()||changed}catch(e){console.error('Archivage automatique',e)}if(changed){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(db))}catch(e){console.error(e)}}}
function notificationTarget(n){setView(n.view||'dashboard');if(n.type==='agentDay'&&n.id){const r=db.agentDays.find(x=>x.id===n.id);if(r)setTimeout(()=>openAgentDay(r.agentId,r.date),50);return}if(n.type&&n.id)setTimeout(()=>dispatchEdit(n.type,n.id),50)}
function computeNotifications(){
 const out=[],today=todayISO(),active=(db.agents||[]).filter(a=>normalizeText(a.status)==='actif'),days=[0,1,2,3,4,5,6].map(i=>addDays(today,i));
 const push=n=>{if(n&&n.title)out.push(n)};
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
  for(const day of days){
   const abs=[];
   for(const a of active){
    const info=dayInfo(a.id,day)||{},records=(db.agentDays||[]).filter(x=>String(x.agentId)===String(a.id)&&normalizeDateValue(x.date)===day),rec=records[0];
    if(isAbsenceType(info.dayType)){
     abs.push({a,info,rec});
     if(!rec?.noReplacementNeeded&&!String(rec?.replacement||'').trim())push({level:'orange',icon:'⚠️',title:`${agentName(a)} absent${day===today?' aujourd’hui':` le ${fmtDate(day)}`}`,text:`${info.dayType||'Absence'} — remplacement à organiser`,view:'absences',type:rec?'agentDay':null,id:rec?.id||'',date:day});
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
   if(abs.length>=2)push({level:'yellow',icon:'👥',title:`${abs.length} agents absents le ${fmtDate(day)}`,text:'Vérifier la couverture des postes',view:'absences',date:day});
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
   if(isClosedStatus(x.status))continue;
   const due=normalizeDateValue(periodicDue(x));if(!due)continue;
   const diff=daysBetweenDates(today,due);if(diff!==null&&diff<=30){
    const level=diff<=0?'red':diff<=15?'orange':'yellow';
    push({level,icon:'🛡️',title:x.name||x.no||'Contrôle périodique',text:diff<0?`Contrôle dépassé de ${Math.abs(diff)} jour(s)`:diff===0?'Contrôle prévu aujourd’hui':`Contrôle dans ${diff} jour(s)`,view:'periodic',type:'periodic',id:x.id,date:due});
   }
  }
 }catch(error){console.error('Notifications contrôles périodiques',error)}
 try{
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
  if(never.length){const sample=never.slice(0,4).map(sp=>sp.name).join(', ');push({level:'yellow',icon:'🧹',title:`${never.length} local${never.length>1?'x':''} jamais contrôlé${never.length>1?'s':''}`,text:`${sample}${never.length>4?'…':''}`,view:'cleaning',type:'cleaning-summary',id:'never',date:today});}
  if(overdue.length){const max=Math.max(...overdue.map(x=>x.diff));const sample=overdue.slice(0,4).map(x=>x.space.name).join(', ');push({level:'yellow',icon:'🧹',title:`${overdue.length} local${overdue.length>1?'x':''} à contrôler`,text:`Non contrôlé${overdue.length>1?'s':''} depuis plus de ${threshold} jours · ${sample}${overdue.length>4?'…':''}`,view:'cleaning',type:'cleaning-summary',id:'overdue',date:today});}
  if(planned.length){const sample=planned.slice(0,4).map(x=>x.room||x.roomType||'Local').join(', ');push({level:'orange',icon:'🧹',title:`${planned.length} contrôle${planned.length>1?'s':''} ménage non réalisé${planned.length>1?'s':''}`,text:`${sample}${planned.length>4?'…':''}`,view:'cleaning',type:'cleaning-summary',id:'planned',date:today});}
 }catch(error){console.error('Notifications ménage',error)}
 try{
  const meetingDays=Math.max(1,Number(db.settings?.meetingAlertDays||3));
  for(const x of [...(db.meetings||[]),...(db.personalEvents||[])]){
   const date=normalizeDateValue(x.date);if(!date||date<today||isClosedStatus(x.status))continue;
   const diff=daysBetweenDates(today,date);if(diff!==null&&diff<=meetingDays)push({level:'blue',icon:'📅',title:x.title||'Rendez-vous',text:diff===0?`Aujourd’hui ${x.time||x.start||''}`:`Dans ${diff} jour(s) — ${fmtDate(date)}`,view:x.no?.startsWith('PER')?'personal':'meetings',type:x.no?.startsWith('PER')?'personalEvent':'meeting',id:x.id,date});
  }
 }catch(error){console.error('Notifications rendez-vous',error)}
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

function renderArchives(){const year=$('#archiveYear')?.value||'',q=($('#archiveSearch')?.value||'').toLowerCase().trim();const years=[...new Set(db.archives.map(a=>a.year).filter(Boolean))].sort().reverse();if($('#archiveYear')){$('#archiveYear').innerHTML='<option value="">Toutes les années</option>'+years.map(y=>`<option ${y===year?'selected':''}>${y}</option>`).join('')}let arr=db.archives.filter(a=>(!year||a.year===year));if(q)arr=arr.filter(a=>JSON.stringify(a).toLowerCase().includes(q));arr.sort((a,b)=>b.start.localeCompare(a.start));$('#archiveSummary').innerHTML=`<article><span>Archives</span><strong>${db.archives.length}</strong></article><article><span>Semaines</span><strong>${db.archives.filter(a=>a.kind==='weekly').length}</strong></article><article><span>Années clôturées</span><strong>${db.archives.filter(a=>a.kind==='annual').length}</strong></article><article><span>Dernière archive</span><strong>${db.archives.length?fmtDate([...db.archives].sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0].createdAt.slice(0,10)):'—'}</strong></article>`;$('#archiveCards').innerHTML=arr.length?arr.map(a=>`<article class="archive-card"><div class="panel-head"><span>${a.kind==='weekly'?'Semaine':'Année scolaire'}</span>${badge(a.academicYear||a.year)}</div><h3>${esc(a.kind==='weekly'?a.key:a.academicYear)}</h3><p>${fmtDate(a.start)} → ${fmtDate(a.end)}</p><div class="archive-metrics">${Object.entries(a.summary||{}).map(([k,v])=>`<span><strong>${esc(v)}</strong><small>${esc(k)}</small></span>`).join('')}</div><button class="ghost" data-archive-detail="${a.id}">Consulter</button></article>`).join(''):'<div class="empty-state">Aucune archive trouvée.</div>'}
function openArchiveDetail(id){const a=db.archives.find(x=>x.id===id);if(!a)return;$('#detailTitle').textContent=`Archive ${a.kind==='weekly'?a.key:a.academicYear}`;$('#detailBody').innerHTML=`<p><strong>Période :</strong> ${fmtDate(a.start)} au ${fmtDate(a.end)}</p><div class="summary-grid">${Object.entries(a.summary||{}).map(([k,v])=>`<article><span>${esc(k)}</span><strong>${esc(v)}</strong></article>`).join('')}</div><pre class="archive-json">${esc(JSON.stringify(a.data,null,2))}</pre>`;$('#detailModal').showModal()}
function exportArchives(){downloadText(`archives-pilotage-${todayISO()}.json`,JSON.stringify(db.archives,null,2),'application/json')}

function renderDashboard(){const activeAgents=db.agents.filter(a=>a.status==='Actif'),present=activeAgents.filter(a=>!isAbsenceType(dayInfo(a.id,todayISO()).dayType)&&dayInfo(a.id,todayISO()).dayType!=='Repos').length;const openIssues=db.issues.filter(x=>!['Terminé','Clôturé'].includes(x.status)),lateIssues=openIssues.filter(x=>x.dueDate&&x.dueDate<todayISO()),urgent=openIssues.filter(x=>x.priority==='Urgente'||x.dueDate&&x.dueDate<=addDays(todayISO(),3));const openMaint=db.maintenance.filter(x=>!['Terminée','Clôturée'].includes(x.status)),todoMaint=openMaint.filter(x=>['À qualifier','À faire','Planifiée'].includes(x.status));const recentClean=db.cleaning.filter(x=>x.date>=addDays(todayISO(),-30)),comp=recentClean.length?Math.round(recentClean.filter(x=>x.overallStatus==='Conforme').length/recentClean.length*100):null,weak=recentClean.reduce((s,x)=>s+(x.tasks||[]).filter(t=>['À reprendre','Non conforme'].includes(t.status)).length,0);const pLate=db.periodic.filter(x=>periodicComputed(x)==='En retard'),pSoon=db.periodic.filter(x=>periodicComputed(x)==='Bientôt');const notes=db.notes.filter(x=>!['Terminé','Clôturé'].includes(x.status)),notesDue=notes.filter(x=>x.dueDate&&x.dueDate<=addDays(todayISO(),7)).length;$('#kpiAgents').textContent=activeAgents.length;$('#kpiPresent').textContent=`${present} présents aujourd’hui`;$('#kpiUrgentActions').textContent=urgent.length;$('#kpiLate').textContent=`${lateIssues.length} en retard`;$('#kpiMaintenance').textContent=openMaint.length;$('#kpiMaintenanceTodo').textContent=`${todoMaint.length} à faire`;$('#kpiCompliance').textContent=comp==null?'—':`${comp} %`;$('#kpiCleaningWeak').textContent=`${weak} point${weak>1?'s':''} faible${weak>1?'s':''}`;$('#kpiPeriodicLate').textContent=pLate.length;$('#kpiPeriodicSoon').textContent=`${pSoon.length} bientôt`;$('#kpiNotes').textContent=notes.length;$('#kpiNotesDue').textContent=`${notesDue} échéance${notesDue>1?'s':''} proche${notesDue>1?'s':''}`;
 const pri=[...urgent].sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')).slice(0,5);$('#priorityList').innerHTML=cardList(pri.map(x=>itemCard('🔥',x.title,`${badge(x.priority)} · ${fmtDate(x.dueDate)||'Sans échéance'}`,'issue',x.id)),'Aucune urgence.');$('#dashboardNotes').innerHTML=cardList(notes.slice().sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')).slice(0,5).map(x=>itemCard('✎',x.title,`${esc(x.category)} · ${fmtDate(x.dueDate)||'Sans échéance'}`,'note',x.id)),'Aucune note active.');$('#maintenancePreview').innerHTML=cardList(openMaint.filter(x=>['En cours','En attente prestataire','En attente pièce'].includes(x.status)).slice(0,5).map(x=>itemCard('⚙',x.title,`${esc(x.building)} · ${badge(x.status)}`,'maintenance',x.id)),'Aucune intervention en cours.');$('#maintenanceTodoPreview').innerHTML=cardList(todoMaint.slice(0,5).map(x=>itemCard('🧰',x.title,`${badge(x.priority)} · ${fmtDate(x.dueDate)||'Sans échéance'}`,'maintenance',x.id)),'Aucune intervention à faire.');const weakRows=[];recentClean.forEach(c=>(c.tasks||[]).filter(t=>['À reprendre','Non conforme'].includes(t.status)).forEach(t=>weakRows.push({c,t})));$('#cleaningWeakPreview').innerHTML=cardList(weakRows.slice(0,5).map(({c,t})=>itemCard('🧹',t.name,`${esc(c.building)} · ${esc(c.room)} · ${badge(t.status)}`,'cleaning',c.id)),'Aucun point faible récent.');const nextMeet=db.meetings.filter(x=>x.date>=todayISO()&&x.status!=='Annulé').sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,5);$('#meetingPreview').innerHTML=cardList(nextMeet.map(x=>itemCard('📅',x.title,`${fmtDate(x.date)} ${esc(x.time||'')} · ${esc(x.location||'')}`,'meeting',x.id)),'Aucun rendez-vous à venir.');renderTeamCalendar();renderPersonalCalendar()}

/* ---------- Paramètres ---------- */
const LIST_LABELS={roles:'Fonctions agents',dayTypes:'Types de journée / absence',priorities:'Priorités',generalStatuses:'Statuts généraux',issueCategories:'Catégories sécurité / qualité',maintenanceFamilies:'Domaines maintenance',maintenanceStatuses:'Statuts maintenance',requestTypes:'Types de demande',workTypes:'Types chantier / GPA',meetingTypes:'Types réunion',personalTypes:'Types agenda personnel',noteCategories:'Catégories bloc-notes',roomTypes:'Types de locaux',cleaningStatuses:'Résultats ménage',periodicFamilies:'Familles contrôles périodiques',documentCategories:'Catégories documents'};
function renderSettings(){if($('#cleaningAlertDays'))$('#cleaningAlertDays').value=db.settings.cleaningAlertDays||30;if($('#meetingAlertDays'))$('#meetingAlertDays').value=db.settings.meetingAlertDays||3;for(const [k,v] of Object.entries(db.settings)){const e=document.getElementById(k);if(e&&k!=='counters'){if(e.type==='checkbox')e.checked=Boolean(v);else e.value=v??''}}$('#buildingSettings').innerHTML=db.buildings.map(b=>`<div class="building-card" data-building-id="${b.id}"><div class="panel-head"><input value="${esc(b.name)}" data-building-name><button class="danger small" data-remove-building="${b.id}">Supprimer</button></div><div class="floor-chips">${b.floors.map((f,i)=>`<span><input value="${esc(f)}" data-floor-index="${i}"><button data-remove-floor="${i}">×</button></span>`).join('')}</div><button class="ghost small" data-add-floor="${b.id}">＋ Étage / niveau</button></div>`).join('');$('#spaceSettings').innerHTML=db.spaces.slice().sort((a,b)=>(a.building+a.floor+a.name).localeCompare(b.building+b.floor+b.name)).map(s=>`<button class="space-chip" data-edit-type="space" data-edit-id="${s.id}"><strong>${esc(s.name)}</strong><small>${esc(s.building)} · ${esc(s.floor)} · ${esc(s.type)}</small></button>`).join('')||'<p>Aucun local configuré.</p>';const absenceItems=db.lists.dayTypes;$('#absenceTypeSettings').innerHTML=`<div class="list-editor" data-list-key="dayTypes">${absenceItems.map((x,i)=>`<div><input value="${esc(x)}" data-list-index="${i}" ${x==='Présence'?'readonly':''}><button class="danger small" data-remove-list="${i}" ${x==='Présence'?'disabled':''}>×</button></div>`).join('')}<button class="ghost small" data-add-list="dayTypes">＋ Ajouter un motif</button></div>`;$('#listSettings').innerHTML=Object.entries(db.lists).filter(([k])=>k!=='dayTypes').map(([k,items])=>`<details><summary>${esc(LIST_LABELS[k]||k)} <small>${items.length} choix</small></summary><div class="list-editor" data-list-key="${k}">${items.map((x,i)=>`<div><input value="${esc(x)}" data-list-index="${i}"><button class="danger small" data-remove-list="${i}">×</button></div>`).join('')}<button class="ghost small" data-add-list="${k}">＋ Choix</button></div></details>`).join('')}
function saveSettings(){const keys=['appName','schoolName','schoolZone','academicYear','defaultLayout','printOrientation','defaultInspector','emailsTo','emailsCc','emailsBcc','emailSubjectPrefix','outlookEmail','cleaningAlertDays','meetingAlertDays','autoReportHour','autoReportTimezone','autoReportWeekdays','autoReportSignature'];for(const k of keys)db.settings[k]=document.getElementById(k)?.value??db.settings[k];for(const k of ['autoDailyEnabled','autoWeeklyEnabled','autoReportOnlyIfEvents','autoReportIncludeAgents','autoReportIncludeMaintenance','autoReportIncludeCleaning','autoReportIncludePeriodic','autoReportIncludeMeetings']){const e=document.getElementById(k);if(e)db.settings[k]=e.checked}$$('[data-building-id]').forEach(card=>{const b=db.buildings.find(x=>x.id===card.dataset.buildingId);if(!b)return;const old=b.name;b.name=card.querySelector('[data-building-name]').value.trim()||b.name;b.floors=$$('[data-floor-index]',card).map(i=>i.value.trim()).filter(Boolean);if(old!==b.name){db.spaces.forEach(s=>{if(s.building===old)s.building=b.name});for(const type of ['cleaning','maintenance','requests','works','periodic'])db[type].forEach(x=>{if(x.building===old)x.building=b.name})}});$$('[data-list-key]').forEach(ed=>{db.lists[ed.dataset.listKey]=$$('[data-list-index]',ed).map(i=>i.value.trim()).filter(Boolean)});applyLayout(db.settings.defaultLayout);save();toast('Paramètres enregistrés')}
function addBuilding(){const b={id:uid(),name:`Nouveau bâtiment ${db.buildings.length+1}`,floors:['Rez-de-chaussée']};db.buildings.push(b);save();setView('settings')}
function loadSchoolHolidays(){const zone=$('#vacationZone').value||db.settings.schoolZone||'A',periods=SCHOOL_CALENDAR['2026-2027']?.[zone]||[];for(const [name,start,end,notes] of periods){if(!db.vacations.some(x=>x.name===name&&x.start===start)){db.vacations.push({id:uid(),name:`Vacances de ${name}`,zone,start,end,status:'À préparer',tasks:VACATION_TASKS.map(t=>({text:t,done:false})),notes,attachments:[]})}}save();toast(`Vacances zone ${zone} chargées`)}


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
function reportData(type){let title=reportTitle(type),subtitle='',html='';const daily=$('#dailyDate').value||todayISO(),weekly=startOfWeek($('#weeklyDate').value||todayISO()),monthly=$('#monthlyDate').value||monthISO(),teamMonth=$('#teamReportMonth').value||monthISO(),absMonth=$('#absenceReportMonth').value||monthISO(),cleanMonth=$('#cleaningReportMonth').value||monthISO(),maintMonth=$('#maintenanceReportMonth').value||monthISO(),year=$('#periodicReportYear').value||new Date().getFullYear();if(type==='daily'){subtitle=fmtDateLong(daily);const agents=db.agents.filter(a=>a.status==='Actif').map(a=>{const i=dayInfo(a.id,daily),h=dayHours(i);return [esc(agentName(a)),badge(i.dayType),esc(i.shift||''),esc(`${i.plannedStart||'—'}–${i.plannedEnd||'—'}`),esc(fmtHours(h.total))]});html+=`<h2>Équipe</h2>${tableHTML(['Agent','Journée','Service','Horaire','Heures'],agents)}`;const events=[...db.meetings.filter(x=>x.date===daily),...db.personalEvents.filter(x=>x.date===daily)];html+=`<h2>Agenda</h2>${tableHTML(['Heure','Objet','Lieu','Statut'],events.map(x=>[esc(x.time||x.start||''),esc(x.title),esc(x.location||''),badge(x.status)]))}`;html+=`<h2>Interventions</h2>${tableHTML(['N°','Objet','Lieu','Priorité','Statut'],db.maintenance.filter(x=>x.date===daily||x.dueDate===daily).map(x=>[esc(x.no),esc(x.title),esc(x.building),badge(x.priority),badge(x.status)]))}`}
if(type==='weekly'){const end=endOfWeek(weekly);subtitle=`${fmtDate(weekly)} au ${fmtDate(end)}`;const allDays=[];for(const a of db.agents.filter(x=>x.status==='Actif'))for(let d=weekly;d<=end;d=addDays(d,1)){const i=dayInfo(a.id,d);if(![0,6].includes(parseDate(d).getDay()))allDays.push([fmtDate(d),esc(agentName(a)),badge(i.dayType),esc(i.shift||''),esc(`${i.plannedStart||'—'}–${i.plannedEnd||'—'}`)])}html=tableHTML(['Date','Agent','Journée','Service','Horaire'],allDays)+`<h2>Échéances et rendez-vous</h2>`+tableHTML(['Date','Type','Objet','Statut'],[...db.meetings.filter(x=>inRange(x.date,weekly,end)).map(x=>[fmtDate(x.date),esc(x.type),esc(x.title),badge(x.status)]),...db.notes.filter(x=>inRange(x.dueDate,weekly,end)).map(x=>[fmtDate(x.dueDate),'Note',esc(x.title),badge(x.status)])])}
if(type==='monthly'){subtitle=monthly;html=`<h2>Indicateurs</h2>${tableHTML(['Module','Total','Ouverts / faibles'],[['Maintenance',db.maintenance.filter(x=>dateMonthMatch(x.date,monthly)).length,db.maintenance.filter(x=>dateMonthMatch(x.date,monthly)&&!['Terminée','Clôturée'].includes(x.status)).length],['Ménage',db.cleaning.filter(x=>dateMonthMatch(x.date,monthly)).length,db.cleaning.filter(x=>dateMonthMatch(x.date,monthly)&&x.overallStatus!=='Conforme').length],['Actions',db.issues.filter(x=>dateMonthMatch(x.date,monthly)).length,db.issues.filter(x=>dateMonthMatch(x.date,monthly)&&!['Terminé','Clôturé'].includes(x.status)).length]])}<h2>Rendez-vous</h2>${tableHTML(['Date','Objet','Lieu','Statut'],db.meetings.filter(x=>dateMonthMatch(x.date,monthly)).map(x=>[fmtDate(x.date),esc(x.title),esc(x.location),badge(x.status)]))}`}
if(type==='team'){subtitle=teamMonth;const rows=db.agents.filter(a=>a.status==='Actif').map(a=>{let planned=0,actual=0,abs=0,ot=0;const [y,m]=teamMonth.split('-').map(Number),last=new Date(y,m,0).getDate();for(let i=1;i<=last;i++){const d=`${teamMonth}-${pad(i)}`;if([0,6].includes(parseDate(d).getDay()))continue;const info=dayInfo(a.id,d),h=dayHours(info);planned+=h.planned;actual+=h.total;if(isAbsenceType(info.dayType))abs++;ot+=Number(info.overtime||0)}return [esc(agentName(a)),fmtHours(planned),fmtHours(actual),`${actual-planned>=0?'+':''}${fmtHours(actual-planned)}`,abs,fmtHours(ot)]});html=tableHTML(['Agent','Prévu','Réalisé','Écart','Jours absence','Heures ajoutées'],rows)}
if(type==='absence'){subtitle=absMonth;html=tableHTML(['Date','Agent','Motif','Statut','Note'],db.agentDays.filter(x=>dateMonthMatch(x.date,absMonth)&&isAbsenceType(x.dayType)).map(x=>[fmtDate(x.date),esc(agentName(agentById(x.agentId))),badge(x.dayType),badge(x.status||'Validée'),esc(x.note||'')]))}
if(type==='cleaning'){subtitle=cleanMonth;html=tableHTML(['Date','Lieu','Type','Agent','Score','Résultat','Points faibles'],db.cleaning.filter(x=>dateMonthMatch(x.date,cleanMonth)).map(x=>[fmtDate(x.date),esc(`${x.building} ${x.floor} ${x.room}`),esc(x.roomType),esc(agentName(agentById(x.agentId))),`${x.score||0} %`,badge(x.overallStatus),esc((x.tasks||[]).filter(t=>['À reprendre','Non conforme'].includes(t.status)).map(t=>t.name).join(', '))]))}
if(type==='maintenance'){subtitle=maintMonth;html=tableHTML(['N°','Date','Objet','Lieu','Priorité','Assigné','Échéance','Statut'],db.maintenance.filter(x=>dateMonthMatch(x.date,maintMonth)).map(x=>[esc(x.no),fmtDate(x.date),esc(x.title),esc(`${x.building} ${x.room||''}`),badge(x.priority),esc(x.assigned||''),fmtDate(x.dueDate),badge(x.status)]))}
if(type==='periodic'){subtitle=`Année ${year}`;html=tableHTML(['N°','Contrôle','Famille','Bâtiment','Dernier','Échéance','État','Prestataire'],db.periodic.filter(x=>!periodicDue(x)||String(periodicDue(x)).startsWith(String(year))||periodicComputed(x)==='En retard').map(x=>[esc(x.no),esc(x.name),esc(x.family),esc(x.building),fmtDate(x.lastDate),fmtDate(periodicDue(x)),badge(periodicComputed(x)),esc(x.provider)]))}
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
 return `@page{size:A4 ${orientation};margin:11mm 9mm 14mm}*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;color:#172b3f;font-size:10.5px;line-height:1.35;-webkit-print-color-adjust:exact;print-color-adjust:exact}.print-header{display:flex;align-items:center;gap:14px;border-bottom:3px solid #0875c9;padding-bottom:9px;margin-bottom:15px}.print-header img{width:62px;height:62px;object-fit:contain}.print-header h1{color:#075ca8;margin:0 0 3px;font-size:21px}.print-header p{margin:2px 0;color:#475569}.print-footer{position:fixed;left:0;right:0;bottom:-9mm;border-top:1px solid #cbd5e1;padding-top:3px;font-size:8px;color:#64748b;text-align:center}h1,h2,h3{color:#075ca8;break-after:avoid}h2{font-size:15px;margin:18px 0 7px;border-bottom:1px solid #cfe2f1;padding-bottom:4px}h3{font-size:13px}.report-table-wrap{width:100%;overflow:visible;margin:7px 0 16px}.report-table{border-collapse:collapse;width:100%;table-layout:auto}.report-table thead{display:table-header-group}.report-table tr{break-inside:avoid;page-break-inside:avoid}.report-table th,.report-table td{border:1px solid #b7c5d2;padding:5px 6px;vertical-align:top;overflow-wrap:anywhere}.report-table th{background:#dceef9;color:#153c5a;font-weight:700;text-align:left}.report-table tbody tr:nth-child(even) td{background:#f5f9fc}.report-table.cols-7,.report-table.cols-8,.report-table.cols-9,.report-table.cols-10{font-size:8.6px}.badge{display:inline-block;padding:2px 5px;border-radius:6px;background:#e8edf2;white-space:nowrap}.good{background:#dff6e8}.bad{background:#ffe0e0}.warn{background:#fff0c9}.info{background:#dff0ff}.empty-cell{text-align:center;color:#64748b;font-style:italic}.panel{break-inside:avoid}section{break-before:auto}a{color:inherit;text-decoration:none}@media print{button,.filters,.section-actions,.panel-actions,.file-label,input,select,textarea{display:none!important}}`;
}
function waitAndPrint(w){
 const run=()=>{try{w.focus();w.print()}catch(e){console.error(e)}};
 const imgs=[...w.document.images];let pending=imgs.filter(x=>!x.complete).length;
 if(!pending){setTimeout(run,250);return}
 imgs.forEach(img=>{if(!img.complete){img.onload=img.onerror=()=>{pending--;if(pending<=0)setTimeout(run,180)}}});
 setTimeout(run,1600);
}
function printReport(type){
 const r=reportData(type),orientation=db.settings.printOrientation||'landscape',w=window.open('','_blank');
 if(!w){toast('Autorisez les fenêtres contextuelles pour imprimer');return}
 w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(r.title)}</title><style>${reportPrintCSS(orientation)}</style></head><body><header class="print-header"><img src="${new URL('assets/logo-service-technique.png',location.href).href}"><div><h1>${esc(db.settings.appName)}</h1><p>${esc(db.settings.schoolName)}</p><strong>${esc(r.title)} — ${esc(r.subtitle)}</strong></div></header><main>${r.html}</main><footer class="print-footer">${esc(db.settings.appName)} — V${APP_VERSION} — imprimé le ${new Date().toLocaleString('fr-FR')}</footer></body></html>`);
 w.document.close();waitAndPrint(w);
}
function printableViewHTML(view){
 const clone=view.cloneNode(true);
 clone.querySelectorAll('button,.filters,.section-actions,.panel-actions,.file-label,.fab').forEach(x=>x.remove());
 const originals=[...view.querySelectorAll('input,select,textarea')],copies=[...clone.querySelectorAll('input,select,textarea')];
 copies.forEach((el,k)=>{const src=originals[k],span=document.createElement('span');span.className='print-field';span.textContent=src?.tagName==='SELECT'?src.options[src.selectedIndex]?.text||'':(src?.value||'');el.replaceWith(span)});
 clone.querySelectorAll('.hidden').forEach(x=>x.remove());return clone.innerHTML;
}
function printView(viewId){
 const view=document.getElementById(viewId)||document.querySelector('.view.active');if(!view)return;
 const orientation=db.settings.printOrientation||'landscape',w=window.open('','_blank');if(!w){toast('Autorisez les fenêtres contextuelles pour imprimer');return}
 const title=VIEW_TITLES[view.id]||'Impression';
 w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${reportPrintCSS(orientation)}.print-field{display:inline-block;min-width:40px;padding:3px 5px;border:1px solid #d5dde5;border-radius:4px;background:#f8fafc}.table-wrap{overflow:visible}.desktop-table{display:block!important}.mobile-cards{display:none!important}</style></head><body><header class="print-header"><img src="${new URL('assets/logo-service-technique.png',location.href).href}"><div><h1>${esc(db.settings.appName)}</h1><p>${esc(db.settings.schoolName)}</p><strong>${esc(title)}</strong></div></header><main>${printableViewHTML(view)}</main><footer class="print-footer">${esc(db.settings.appName)} — V${APP_VERSION} — imprimé le ${new Date().toLocaleString('fr-FR')}</footer></body></html>`);
 w.document.close();waitAndPrint(w);
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
function exportStyledExcel(module){
 const titles={agents:'Agents',agentDays:'Horaires, congés et absences',rotations:'Roulements',weeklyPlans:'Horaires hebdomadaires',cleaning:'Contrôles ménage',maintenance:'Maintenance',requests:'Demandes direction',works:'Chantiers et GPA',meetings:'Réunions',issues:'Sécurité et qualité',periodic:'Contrôles périodiques',notes:'Bloc-notes',vacations:'Vacances',documents:'Documentation'};
 const map={agents:[['Prénom','firstName'],['Nom','lastName'],['Fonction','role'],['Heures / semaine','weeklyHours'],['Affectation','assignment'],['Statut','status']],agentDays:[['Date','date'],['Agent','agentId'],['Journée','dayType'],['Début prévu','plannedStart'],['Fin prévue','plannedEnd'],['Début réel','actualStart'],['Fin réelle','actualEnd'],['Pause','pause'],['Heures +/-','overtime'],['Statut','status'],['Note','note']],rotations:[['Agent','agentId'],['Date d’effet','effectiveFrom'],['Commence par','startShift'],['Semaines matin','morningWeeks'],['Semaines soir','eveningWeeks'],['Fin','effectiveTo'],['Notes','notes']],cleaning:[['N°','no'],['Date','date'],['Bâtiment','building'],['Étage','floor'],['Zone','roomType'],['Local','room'],['Agent','agentId'],['Score','score'],['Résultat','overallStatus'],['Commentaire','comment']],maintenance:[['N°','no'],['Date','date'],['Titre','title'],['Domaine','family'],['Priorité','priority'],['Statut','status'],['Lieu','room'],['Affecté à','assigned'],['Échéance','dueDate'],['Action','action']],requests:[['N°','no'],['Date','date'],['Type','type'],['Titre','title'],['Priorité','priority'],['Statut','status'],['Lieu','room'],['Demandeur','requester'],['Échéance','dueDate']],works:[['N°','no'],['Date','date'],['Type','type'],['Titre','title'],['Entreprise','company'],['Bâtiment','building'],['Statut','status'],['Échéance','dueDate'],['Fin GPA','gpaEnd']],meetings:[['N°','no'],['Date','date'],['Heure','time'],['Type','type'],['Titre','title'],['Lieu','location'],['Participants','participants'],['Statut','status']],issues:[['N°','no'],['Date','date'],['Catégorie','category'],['Agent','agentId'],['Titre','title'],['Priorité','priority'],['Statut','status'],['Échéance','dueDate'],['Action','action']],periodic:[['N°','no'],['Contrôle','name'],['Famille','family'],['Périodicité (mois)','intervalMonths'],['Bâtiment','building'],['Dernier contrôle','lastDate'],['Prochaine date','nextDate'],['Statut','status'],['Prestataire','provider']],notes:[['N°','no'],['Date','date'],['Catégorie','category'],['Titre','title'],['Priorité','priority'],['Statut','status'],['Échéance','dueDate'],['Texte','text']],vacations:[['Période','name'],['Zone','zone'],['Début','start'],['Fin','end'],['Statut','status'],['Notes','notes']],documents:[['N°','no'],['Date','date'],['Titre','title'],['Catégorie','category'],['Module','linkedModule'],['Description','description']]};
 let defs=map[module]||[],rows=db[module]||[];
 if(module==='weeklyPlans'){defs=[['Agent','agent'],['Profil','shift'],['Lundi','d1'],['Mardi','d2'],['Mercredi','d3'],['Jeudi','d4'],['Vendredi','d5']];rows=(db.weeklyPlans||[]).map(p=>{const r={agent:agentName(agentById(p.agentId))||p.agent,shift:p.shift};for(let d=1;d<=5;d++){const x=p.dayProfiles?.[d]||{};r['d'+d]=x.start&&x.end?`${x.start}-${x.end} — ${x.missions||''}`:'Repos'}return r})}
 const value=(r,k)=>k==='agentId'?agentName(agentById(r[k])):(r[k]??'');
 const aoa=[[titles[module]||module],[`Pilotage Service Technique — export du ${new Date().toLocaleString('fr-FR')}`],[],defs.map(d=>d[0]),...rows.map(r=>defs.map(d=>value(r,d[1])))];
 const filename=`${(titles[module]||module).replace(/\s+/g,'_')}_${todayISO()}.xlsx`;
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
function exportCSV(module){const map={agents:['firstName','lastName','role','weeklyHours','email','phone','assignment','status'],agentDays:['date','agentId','dayType','plannedStart','plannedEnd','actualStart','actualEnd','pause','overtime','status','note'],cleaning:['no','date','time','building','floor','roomType','room','agentId','score','overallStatus','comment'],maintenance:['no','date','title','family','priority','status','building','floor','room','requester','assigned','dueDate','cost','description','action'],requests:['no','date','type','title','priority','status','building','room','requester','dueDate','description','response'],works:['no','date','type','title','company','architect','building','priority','status','dueDate','gpaEnd','description','decision'],meetings:['no','date','time','end','type','title','location','participants','status','notes','actions'],issues:['no','date','category','agentId','title','priority','status','owner','dueDate','cost','description','action'],periodic:['no','name','family','intervalMonths','building','lastDate','nextDate','status','provider','register','requirement','notes'],notes:['no','date','category','agentId','title','priority','status','dueDate','text'],vacations:['name','zone','start','end','status','notes'],documents:['no','date','title','category','linkedModule','description']};const keys=map[module]||Object.keys(db[module]?.[0]||{}).filter(k=>!['id','attachments','tasks','items'].includes(k)),rows=db[module]||[];downloadText(`${module}-${todayISO()}.csv`,[keys.join(';'),...rows.map(r=>keys.map(k=>csvEscape(k==='agentId'?agentName(agentById(r[k])):r[k])).join(';'))].join('\n'),'text/csv;charset=utf-8')}
/* ---------- Initialisation des listes et rendu global ---------- */
function fillSelect(id,items,keep=true){const e=document.getElementById(id);if(!e)return;const old=keep?e.value:'';const first=e.querySelector('option[value=""]')?.outerHTML||'';e.innerHTML=first+selectOptions(items,old)}
function hydrateSelects(){fillSelect('personalType',db.lists.personalTypes);fillSelect('personalStatus',db.lists.generalStatuses);for(const id of ['rotationAgent','planningAgent','absenceAgent','issueAgent']){const e=$(`#${id}`);if(e){const old=e.value;e.innerHTML='<option value="">Tous les agents</option>'+agentOptions(old).replace('<option value="">Choisir un agent</option>','')}}fillSelect('planningSignal',['Conforme','Heures supplémentaires','Heures manquantes','Absence']);fillSelect('absenceType',db.lists.dayTypes.filter(isAbsenceType));fillSelect('absenceStatus',['Demandée','Validée','Refusée','Annulée']);fillSelect('issueCategory',db.lists.issueCategories);fillSelect('issueStatus',db.lists.generalStatuses);fillSelect('periodicFamily',db.lists.periodicFamilies);fillSelect('periodicStatus',['À jour','Bientôt','En retard','À planifier','Planifié','Réalisé','Clôturé','En attente','Non applicable']);const pb=$('#periodicBuilding');if(pb){const old=pb.value;pb.innerHTML='<option value="">Tous les bâtiments</option>'+buildingOptions(old)}const cb=$('#cleanBuilding');if(cb){const old=cb.value;cb.innerHTML='<option value="">Tous les bâtiments</option>'+buildingOptions(old)}fillSelect('cleanRoomType',db.lists.roomTypes);fillSelect('cleanStatus',db.lists.cleaningStatuses);fillSelect('cleaningGuideType',Object.keys(GUIDE));fillSelect('maintenanceStatus',db.lists.maintenanceStatuses);fillSelect('maintenancePriority',db.lists.priorities);fillSelect('maintenanceFamily',db.lists.maintenanceFamilies);fillSelect('requestStatus',db.lists.generalStatuses);fillSelect('requestType',db.lists.requestTypes);fillSelect('workStatus',db.lists.generalStatuses);fillSelect('workType',db.lists.workTypes);fillSelect('meetingType',db.lists.meetingTypes);fillSelect('noteCategory',db.lists.noteCategories);fillSelect('notePriority',db.lists.priorities);fillSelect('noteStatus',db.lists.generalStatuses);fillSelect('documentCategory',db.lists.documentCategories);const vp=$('#vacationReportPeriod');if(vp){const old=vp.value;vp.innerHTML=selectOptions(db.vacations,old,x=>`${x.name} — ${fmtDate(x.start)}`,x=>x.id)}const csv=$('#csvModule');if(csv){const opts=[['agents','Agents'],['agentDays','Horaires, congés et absences'],['cleaning','Contrôles ménage'],['maintenance','Maintenance'],['requests','Demandes direction'],['works','Chantiers / GPA'],['meetings','Réunions'],['issues','Sécurité / qualité'],['periodic','Contrôles périodiques'],['notes','Notes'],['vacations','Vacances'],['documents','Documents']];const old=csv.value;csv.innerHTML=selectOptions(opts,old,x=>x[1],x=>x[0])}}
function renderReportPreview(){if(!$('#reportPreview'))return;const r=reportData('daily');$('#reportPreview').innerHTML=`<h3>${esc(r.title)} — ${esc(r.subtitle)}</h3>${r.html}`}
function renderBrand(){document.title=`${db.settings.appName} — V${APP_VERSION}`;$('#brandAppName').textContent=db.settings.appName;$('#brandSchoolName').textContent=db.settings.schoolName;$('#welcomeTitle').textContent=db.settings.appName;$('#today').textContent=new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});document.documentElement.style.setProperty('--print-orientation',db.settings.printOrientation||'landscape');for(const id of ['authVersion','sidebarVersion','aboutVersion']){const el=document.getElementById(id);if(el)el.textContent=`Version ${APP_VERSION} — ${APP_BUILD}`}}
function renderAll(){return safeRenderAll()}

/* ---------- Actions rapides ---------- */
function openQuickMenu(){openDetail('Ajouter rapidement',`<div class="quick-menu-grid"><button data-quick="agent-day">👤<strong>Jour agent</strong><small>Congé, RTT, horaires, heures supp.</small></button><button data-quick="note">✎<strong>Bloc-notes</strong><small>Note et liste d’actions</small></button><button data-quick="maintenance">⚙<strong>Intervention</strong><small>Maintenance</small></button><button data-quick="cleaning">✓<strong>Contrôle ménage</strong><small>Saisie guidée</small></button><button data-quick="meeting">📅<strong>Rendez-vous</strong><small>Réunion ou visite</small></button><button data-quick="request">↗<strong>Demande direction</strong><small>Aménagement / logistique</small></button><button data-quick="issue">⚠<strong>Action urgente</strong><small>Sécurité / qualité</small></button><button data-quick="document">📎<strong>Document</strong><small>Photo, PDF, mail ou fichier</small></button></div>`)}
function dispatchQuick(q){if($('#detailModal').open)$('#detailModal').close();({note:()=>openNote(),maintenance:()=>openMaintenance(),cleaning:()=>openCleaning(),meeting:()=>openMeeting(),request:()=>openRequest(),issue:()=>openIssue(),document:()=>openDocument(),'agent-day':()=>{const aid=db.agents.find(a=>a.status==='Actif')?.id;if(aid)openAgentDay(aid,todayISO());else toast('Ajoutez d’abord un agent')}}[q]||(()=>{}))()}
function dispatchEdit(type,id){({agent:()=>openAgent(id),rotation:()=>openRotation(id),personal:()=>openPersonalEvent(id),issue:()=>openIssue(id),periodic:()=>openPeriodic(id),cleaning:()=>openCleaning(id),maintenance:()=>openMaintenance(id),request:()=>openRequest(id),work:()=>openWork(id),meeting:()=>openMeeting(id),note:()=>openNote(id),vacation:()=>openVacation(id),document:()=>openDocument(id),space:()=>openSpace(id)}[type]||(()=>{}))()}

/* ---------- Sauvegarde / restauration ---------- */
function exportBackup(){const payload={exportedAt:new Date().toISOString(),data:db,note:'Les fichiers joints sont stockés dans Supabase Storage. La sauvegarde JSON contient leurs références.'};downloadText(`Pilotage_Service_Technique_sauvegarde_${todayISO()}.json`,JSON.stringify(payload,null,2),'application/json')}
async function importBackup(file){try{const obj=JSON.parse(await file.text());db=migrate(obj.data||obj);save();toast('Sauvegarde restaurée')}catch(e){console.error(e);alert('Ce fichier de sauvegarde est invalide.')}}
function resetData(){if(!confirm('Réinitialiser toute la base locale ? Cette action est irréversible.'))return;db=defaultData();restoreSuppliedData(false);save();toast('Base réinitialisée avec les données de référence')}
function restoreReferenceData(){if(!confirm('Restaurer les agents, horaires et interventions fournis ? Vos saisies personnelles seront conservées.'))return;restoreSuppliedData(true)}

/* ---------- Événements ---------- */
function runDiagnostic(){
 const critical=['nav','openMenu','closeMenu','menuBackdrop','modal','modalForm','newAgent','newRotation','newShift','newAbsence','teamWeekCalendar','agentsGrid','rotationsTable','planningTable','restoreReferenceData','notificationBell','notificationModal','notificationList'];
 const missing=critical.filter(id=>!document.getElementById(id));
 const checks=[
  ['Données agents',Array.isArray(db.agents)],['Horaires hebdomadaires',Array.isArray(db.weeklyPlans)],['Roulements',Array.isArray(db.rotations)],
  ['Journées agents',Array.isArray(db.agentDays)],['Interventions',Array.isArray(db.maintenance)],['Contrôles périodiques',Array.isArray(db.periodic)],
  ['Contrôles ménage',Array.isArray(db.cleaning)],['Navigation mobile',!!document.getElementById('openMenu')],['Fenêtres',!!document.getElementById('modal')]
 ];
 const failed=checks.filter(x=>!x[1]).map(x=>x[0]);let notifications=[];try{notifications=computeNotifications()}catch(error){failed.push('Calcul des notifications');console.error(error)}
 const lateTest={status:'À faire',dueDate:addDays(todayISO(),-1),priority:'Normale'};if(isClosedStatus(lateTest.status)||!(recordDueDate(lateTest)<todayISO()))failed.push('Règle intervention en retard');
 if(missing.length||failed.length){console.error('Diagnostic',{missing,failed});toast(`Diagnostic : ${missing.length+failed.length} anomalie(s) détectée(s)`);return false}
 toast(`Diagnostic réussi — ${notifications.length} notification(s) calculée(s)`);return true;
}
function bindEvents(){
 $('#modalForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!modalHandler)return;
  const form=e.currentTarget,btn=$('#modalSave');
  if(!form.checkValidity()){form.reportValidity();toast('Complétez les champs obligatoires indiqués');return}
  btn.disabled=true;
  try{await modalHandler(form)}catch(err){
    console.error('Erreur d’enregistrement du formulaire :',err);
    const msg=err?.message?String(err.message):'Erreur inconnue';
    toast(`Enregistrement impossible : ${msg.slice(0,120)}`);
    setSaveState('Action non enregistrée — données précédentes conservées','local');
  }finally{btn.disabled=false}
 });
 $('#modalCancel').onclick=closeModal;$('#modalClose').onclick=closeModal;$('#modalDelete').onclick=()=>modalDeleteHandler?.();$('#detailClose').onclick=()=>$('#detailModal').close();$('#emailClose').onclick=()=>$('#emailModal').close();
 const openMobileMenu=()=>{document.body.classList.add('menu-open');$('#openMenu')?.setAttribute('aria-expanded','true')};const closeMobileMenu=()=>{document.body.classList.remove('menu-open');$('#openMenu')?.setAttribute('aria-expanded','false')};if($('#openMenu'))$('#openMenu').onclick=openMobileMenu;if($('#closeMenu'))$('#closeMenu').onclick=closeMobileMenu;if($('#menuBackdrop'))$('#menuBackdrop').onclick=closeMobileMenu;
 $('#nav').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b){setView(b.dataset.view);closeMobileMenu()}});$('#layoutMode').onchange=e=>applyLayout(e.target.value);$('#printCurrent').onclick=()=>printView(document.querySelector('.view.active')?.id);
 $('#quickAdd').onclick=$('#quickNoteFab').onclick=openQuickMenu;
 $('#newAgent').onclick=()=>openAgent();const aw=$('#addWeeklyAgent');if(aw)aw.onclick=()=>openAgent();const nw=$('#newWeeklyPlan');if(nw)nw.onclick=()=>openWeeklyPlan();$('#newRotation').onclick=()=>openRotation();$('#newRotationException').onclick=()=>openRotationException();$('#newShift').onclick=()=>{const a=$('#planningAgent').value||db.agents[0]?.id;openAgentDay(a,`${$('#planningMonth').value||monthISO()}-01`)};$('#newAbsence').onclick=openAbsence;$('#newVacation').onclick=()=>openVacation();$('#loadSchoolHolidays').onclick=loadSchoolHolidays;$('#newIssue').onclick=()=>openIssue();$('#newPeriodic').onclick=()=>openPeriodic();$('#newCleaning').onclick=()=>openCleaning();$('#newMaintenance').onclick=()=>openMaintenance();$('#newRequest').onclick=()=>openRequest();$('#newWork').onclick=()=>openWork();$('#newMeeting').onclick=()=>openMeeting();$('#newNote').onclick=()=>openNote();$('#newDocument').onclick=()=>openDocument();$('#newPersonalEvent').onclick=$('#newPersonalEventDash').onclick=()=>openPersonalEvent();$('#addBuilding').onclick=addBuilding;$('#addSpace').onclick=()=>openSpace();
 $('#prevTeamWeek').onclick=()=>{teamWeek=addDays(teamWeek,-7);renderTeamCalendar()};$('#nextTeamWeek').onclick=()=>{teamWeek=addDays(teamWeek,7);renderTeamCalendar()};$('#prevTeamMonth').onclick=()=>{teamWeek=startOfWeek(addMonths(teamWeek,-1));renderTeamCalendar()};$('#nextTeamMonth').onclick=()=>{teamWeek=startOfWeek(addMonths(teamWeek,1));renderTeamCalendar()};$('#todayTeamWeek').onclick=()=>{teamWeek=startOfWeek(todayISO());renderTeamCalendar()};$('#teamDateJump').onchange=e=>{teamWeek=startOfWeek(e.target.value);renderTeamCalendar()};$('#prevPersonalWeek').onclick=()=>{personalWeek=addDays(personalWeek,-7);renderPersonalCalendar()};$('#nextPersonalWeek').onclick=()=>{personalWeek=addDays(personalWeek,7);renderPersonalCalendar()};$('#todayPersonalWeek').onclick=()=>{personalWeek=startOfWeek(todayISO());renderPersonalCalendar()};
 $('#saveSettings').onclick=saveSettings;const wizardOpen=$('#openAutoReportWizard');if(wizardOpen)wizardOpen.onclick=openAutoReportWizard;const wizardClose=$('#autoReportWizardClose');if(wizardClose)wizardClose.onclick=()=>wizardEl().close();const wizardBack=$('#autoReportWizardBack');if(wizardBack)wizardBack.onclick=()=>{saveWizardStep();autoReportWizardStep=Math.max(0,autoReportWizardStep-1);renderAutoReportWizard()};const wizardNext=$('#autoReportWizardNext');if(wizardNext)wizardNext.onclick=()=>{saveWizardStep();if(autoReportWizardStep===3){wizardEl().close();return}autoReportWizardStep=Math.min(3,autoReportWizardStep+1);renderAutoReportWizard()};document.addEventListener('click',e=>{const p=e.target.closest('[data-wizard-provider]');if(p){autoReportWizardData.provider=p.dataset.wizardProvider;renderAutoReportWizard()}});const sart=$('#sendAutomaticReportTest');if(sart)sart.onclick=sendAutomaticReportTest;function openNotificationCenter(){window.PSTNotificationCenter?.open?.()}
function closeNotificationCenter(){window.PSTNotificationCenter?.close?.()}
$('#archiveNow').onclick=()=>{const made=createWeeklyArchive(false);save();toast(made?'Archive créée':'La semaine précédente est déjà archivée')};$('#exportArchives').onclick=exportArchives;$('#exportBackup').onclick=exportBackup;$('#importBackup').onchange=e=>e.target.files[0]&&importBackup(e.target.files[0]);$('#resetData').onclick=resetData;const rr=$('#restoreReferenceData');if(rr)rr.onclick=restoreReferenceData;const dg=$('#runDiagnostic');if(dg)dg.onclick=runDiagnostic;$('#resetPeriodicCatalog').onclick=()=>{if(confirm('Restaurer le catalogue par défaut ? Les contrôles personnalisés actuels seront remplacés.')){db.periodic=makePeriodic();save()}};$('#exportCsv').onclick=()=>exportStyledExcel($('#csvModule').value);$('#exportRotationCsv').onclick=()=>exportStyledExcel('rotations');const ewp=$('#exportWeeklyPlans');if(ewp)ewp.onclick=()=>exportStyledExcel('weeklyPlans');
 $('#copyMail').onclick=async()=>{const text=`À : ${$('#mailTo').value}\nCC : ${$('#mailCc').value}\nCCI : ${$('#mailBcc').value}\nObjet : ${$('#mailSubject').value}\n\n${$('#mailMessage').value}`;try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);else{const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()}toast('Message copié')}catch(e){prompt('Copiez le message :',text)}};$('#openMailClient').onclick=openMailClient;
 $$('[data-report-print]').forEach(b=>b.onclick=()=>printReport(b.dataset.reportPrint));$$('[data-report-email]').forEach(b=>b.onclick=()=>prepareEmail(b.dataset.reportEmail));$('#printFullRegister').onclick=()=>printReport('full');$$('[data-print]').forEach(b=>b.onclick=()=>printView(b.dataset.print));
 document.addEventListener('click',e=>{const b=e.target.closest('[data-edit-weekly-plan]');if(b)openWeeklyPlan(Number(b.dataset.editWeeklyPlan))});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-new-weekly-agent]');if(b)openWeeklyPlan(null,b.dataset.newWeeklyAgent)});
 const filterIds=['personalMonth','personalType','personalStatus','agentSearch','agentStatus','rotationAgent','rotationYear','rotationMonth','planningMonth','planningAgent','planningSignal','absenceMonth','absenceAgent','absenceType','absenceStatus','vacationZone','vacationStatus','issueMonth','issueAgent','issueCategory','issueStatus','periodicFamily','periodicStatus','periodicBuilding','cleanMonth','cleanBuilding','cleanRoomType','cleanStatus','cleaningGuideType','maintenanceStatus','maintenancePriority','maintenanceFamily','requestStatus','requestType','workStatus','workType','meetingMonth','meetingType','noteCategory','notePriority','noteStatus','noteSearch','documentCategory','documentSearch','archiveYear','archiveSearch'];for(const id of filterIds){const e=document.getElementById(id);if(e)e.addEventListener(e.tagName==='INPUT'&&e.type==='text'?'input':'change',()=>{if(id==='cleaningGuideType')renderCleaningGuide();else if(id.startsWith('personal'))renderPersonal();else if(id.startsWith('agent'))renderAgents();else if(id.startsWith('rotation'))renderRotations();else if(id.startsWith('planning'))renderPlanning();else if(id.startsWith('absence'))renderAbsences();else if(id.startsWith('vacation'))renderVacations();else if(id.startsWith('issue'))renderIssues();else if(id.startsWith('periodic'))renderPeriodic();else if(id.startsWith('clean'))renderCleaning();else if(id.startsWith('maintenance'))renderMaintenance();else if(id.startsWith('request'))renderRequests();else if(id.startsWith('work'))renderWorks();else if(id.startsWith('meeting'))renderMeetings();else if(id.startsWith('note'))renderNotes();else if(id.startsWith('document'))renderDocuments();else if(id.startsWith('archive'))renderArchives()})}
 document.addEventListener('click',async e=>{const ni=e.target.closest('[data-notification-index]');if(ni){const n=(window.__notifications||[])[Number(ni.dataset.notificationIndex)];closeNotificationCenter();if(n)notificationTarget(n);return}const ar=e.target.closest('[data-archive-detail]');if(ar){openArchiveDetail(ar.dataset.archiveDetail);return}const go=e.target.closest('[data-go]');if(go){setView(go.dataset.go);return}const quick=e.target.closest('[data-quick]');if(quick){dispatchQuick(quick.dataset.quick);return}const ed=e.target.closest('[data-edit-type]');if(ed){dispatchEdit(ed.dataset.editType,ed.dataset.editId);return}const ad=e.target.closest('[data-agent-day]');if(ad){openAgentDay(ad.dataset.agentDay,ad.dataset.date);return}const np=e.target.closest('[data-new-personal-date]');if(np){openPersonalEvent(null,np.dataset.newPersonalDate);return}const nr=e.target.closest('[data-new-rotation-agent]');if(nr){openRotation(null,nr.dataset.newRotationAgent);return}const dl=e.target.closest('[data-download]');if(dl){await downloadAttachment(dl.dataset.download);return}const gd=e.target.closest('[data-guide-path]');if(gd){await openGuide(gd.dataset.guidePath);return}const rb=e.target.closest('[data-remove-building]');if(rb){if(confirm('Supprimer ce bâtiment et ses niveaux de la liste ?')){const b=db.buildings.find(x=>x.id===rb.dataset.removeBuilding);db.buildings=db.buildings.filter(x=>x.id!==rb.dataset.removeBuilding);db.spaces=db.spaces.filter(s=>s.building!==b?.name);save()}return}const af=e.target.closest('[data-add-floor]');if(af){db.buildings.find(x=>x.id===af.dataset.addFloor)?.floors.push(`Nouvel étage`);renderSettings();return}const rf=e.target.closest('[data-remove-floor]');if(rf){const card=rf.closest('[data-building-id]'),b=db.buildings.find(x=>x.id===card.dataset.buildingId);b?.floors.splice(Number(rf.dataset.removeFloor),1);renderSettings();return}const al=e.target.closest('[data-add-list]');if(al){db.lists[al.dataset.addList].push('Nouveau choix');renderSettings();return}const rl=e.target.closest('[data-remove-list]');if(rl){const ed=rl.closest('[data-list-key]');db.lists[ed.dataset.listKey].splice(Number(rl.dataset.removeList),1);renderSettings();return}})
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

function init(){const storedLayout=localStorage.getItem('pilotage-service-technique-layout')||db.settings.defaultLayout||'auto';const defaults={personalMonth:monthISO(),planningMonth:monthISO(),absenceMonth:monthISO(),issueMonth:monthISO(),cleanMonth:monthISO(),meetingMonth:monthISO(),dailyDate:todayISO(),weeklyDate:todayISO(),monthlyDate:monthISO(),teamReportMonth:monthISO(),absenceReportMonth:monthISO(),cleaningReportMonth:monthISO(),maintenanceReportMonth:monthISO(),periodicReportYear:new Date().getFullYear(),rotationYear:new Date().getFullYear()};for(const [id,v] of Object.entries(defaults))if(document.getElementById(id))document.getElementById(id).value=v;for(let i=1;i<=12;i++)$('#rotationMonth').insertAdjacentHTML('beforeend',`<option value="${i}">${new Date(2026,i-1,1).toLocaleDateString('fr-FR',{month:'long'})}</option>`);applyLayout(storedLayout);runAutomaticHousekeeping();bindEvents();renderAll();setView('dashboard')}
window.addEventListener('DOMContentLoaded',init);

document.addEventListener('DOMContentLoaded',()=>initAuth().catch(console.error),{once:true});
window.addEventListener('load',()=>initAuth().catch(console.error),{once:true});
