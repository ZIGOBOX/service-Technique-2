(()=>{'use strict';
const KEY='pst-consignes-validees-2026-10-08-v2';
const maintenance=[
['Remplacer un spot dans les WC filles — valet self','Électricité','WC filles, valet self',''],
['Refaire la peinture de l’infirmerie','Peinture','Infirmerie','2026-10-14'],
['Installer une butée de porte vers les sanitaires de la salle polyvalente','Menuiserie','Sanitaires, salle polyvalente',''],
['Ranger les câbles dans le bureau de M. Nuge','Électricité','Bureau de M. Nuge',''],
['Poser 1 m de bande aimantée au fond des salles 101, 102, 103 et 104','Aménagement','Salles 101, 102, 103, 104',''],
['Terminer la fixation des affiches Marianne au fond des salles du bâtiment B','Aménagement','Bâtiment B, salles',''],
['Remplacer la prise à l’entrée du gymnase','Électricité','Entrée du gymnase',''],
['Terminer les travaux d’électricité dans l’appartement de l’infirmière','Électricité','Appartement de l’infirmière',''],
['Terminer les travaux de plomberie dans l’appartement de l’infirmière','Plomberie','Appartement de l’infirmière',''],
['Remplacer le robinet dans les WC du self','Plomberie','WC du self',''],
['Remplacer les arrivées d’eau dans les logements','Plomberie','Logements','']
];
const preps=[
['2026-10-08','13:00','Salle polyvalente','Installer 70 chaises'],
['2026-10-08','18:00','Salle de réunion de la vie scolaire','Installer 1 isoloir et 1 urne'],
['2026-10-08','18:00','Bureau du Psy EN','Installer 1 isoloir et 1 urne'],
['2026-10-12','14:00','Salle d’étude 2','Installer un rectangle de 15 places'],
['2026-10-12','14:00','Salle polyvalente','Installer tables et chaises pour 70 personnes en configuration devoir ; ouvrir la cloison'],
['2026-10-16','18:00','Salle polyvalente','Remise des diplômes ; voir Stéphanie pour la préparation']
];
const agenda=[
['2026-10-15','','PGA — élagage de l’arbre de la cour d’honneur','Cour d’honneur','Intervention entreprise PGA'],
['2026-10-16','','Artisan du Bois — portes et fenêtres de l’internat','Internat','Intervention du 16 au 20 octobre 2026 (inclus)']
];
const same=(a,b)=>String(a||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()===String(b||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
async function apply(){const api=window.PSTMainState,d=api?.get?.();if(!d){alert('Données non chargées : reconnectez-vous et réessayez.');return}if(!confirm('Ajouter les consignes validées du 8 octobre 2026 dans le logiciel ? Les entrées déjà présentes ne seront pas dupliquées.'))return;
const counts={maintenance:0,preps:0,agenda:0,organisation:0};
for(const [title,family,room,dueDate] of maintenance){if(d.maintenance.some(x=>same(x.title,title)))continue;d.maintenance.push({id:crypto.randomUUID(),date:'2026-10-08',title,family,room,building:'',floor:'',priority:'Normale',status:'À faire',dueDate,requester:'Service technique',assigned:'',description:room,action:'',attachments:[],sourceBatch:KEY});counts.maintenance++}
for(const [date,time,room,description] of preps){if(d.roomPreps.some(x=>x.date===date&&x.time===time&&same(x.room,room)))continue;d.roomPreps.push({id:crypto.randomUUID(),date,time,room,title:description,notes:description,description,people:room==='Salle polyvalente'&&description.includes('70')?70:room==='Salle d’étude 2'?15:0,status:'À préparer',sourceBatch:KEY});counts.preps++}
for(const [date,start,title,location,notes] of agenda){if(d.personalEvents.some(x=>x.date===date&&same(x.title,title)))continue;d.personalEvents.push({id:crypto.randomUUID(),date,start,end:'',type:'Rendez-vous',title,location,priority:'Normale',status:'À faire',notes,attachments:[],sourceBatch:KEY});counts.agenda++}
if(!d.personalEvents.some(x=>x.date==='2026-10-12'&&same(x.title,'Remplacement à la loge — organisation équipe'))){d.personalEvents.push({id:crypto.randomUUID(),date:'2026-10-12',start:'13:50',end:'',type:'Organisation équipe',title:'Remplacement à la loge — organisation équipe',location:'Loge',priority:'Normale',status:'À faire',notes:'Prévoir et affecter un agent pour le remplacement à la loge.',attachments:[],sourceBatch:KEY});counts.organisation++}
const result=await api.persistNow?.();if(result?.ok){document.getElementById('pst-consignes-import').textContent='✓ Consignes enregistrées';alert(`Enregistrement confirmé : ${counts.maintenance} maintenances, ${counts.preps} préparations, ${counts.agenda} rendez-vous, ${counts.organisation} organisation équipe. Actualisez pour consulter.`)}else{alert('Les consignes sont ajoutées en mémoire, mais leur sauvegarde serveur n’a pas été confirmée. Vérifiez votre connexion et réessayez avant de quitter la page.')}}
function install(){if(document.getElementById('pst-consignes-import'))return;const b=document.createElement('button');b.id='pst-consignes-import';b.type='button';b.textContent='📋 Intégrer les consignes validées du 8 octobre';b.style.cssText='position:fixed;right:16px;bottom:16px;z-index:9000;background:#174d79;color:white;border:0;border-radius:12px;padding:12px 16px;font:600 14px system-ui;box-shadow:0 3px 14px #0003;max-width:calc(100vw - 32px);cursor:pointer';b.addEventListener('click',()=>apply().catch(e=>alert('Erreur : '+e.message)));document.body.appendChild(b)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
