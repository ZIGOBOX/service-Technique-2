/* Pilotage Service Technique V49 — centre unique, masquage et diagnostic */
(() => {
 'use strict';
 const byId=id=>document.getElementById(id),STORE='pst-notification-dismissals-v49';let opened=false,lastNotifications=[];
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const key=n=>[n.type||'',n.id||'',n.date||'',n.title||'',n.text||''].join('|');
 const load=()=>{try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch{return{}}};
 const save=x=>localStorage.setItem(STORE,JSON.stringify(x));
 function prune(store){const now=Date.now();for(const [k,v] of Object.entries(store))if(!v||Number(v)<=now)delete store[k];return store}
 function compute(){try{const raw=window.PSTNotifications?.compute?.()||[],store=prune(load());save(store);return{all:Array.isArray(raw)?raw:[],list:(Array.isArray(raw)?raw:[]).filter(n=>!store[key(n)]),error:''}}catch(e){return{all:[],list:[],error:e?.message||String(e)}}}
 function diagnostic(){try{return window.PSTDiagnostics?.notificationSummary?.()||null}catch{return null}}
 function diagnosticHtml(){const d=diagnostic();if(!d)return'';return `<details class="notification-diagnostic"><summary>Diagnostic notifications</summary><div class="diagnostic-grid"><span>Interventions lues <b>${esc(d.maintenanceTotal)}</b></span><span>Interventions en retard <b>${esc(d.maintenanceLate)}</b></span><span>Notifications calculées <b>${esc(d.notifications)}</b></span><span>Agents lus <b>${esc(d.agents)}</b></span></div></details>`}
 function render(){const result=compute(),list=result.list;lastNotifications=list;window.__notifications=list;const count=byId('notificationCount'),subtitle=byId('notificationSubtitle'),box=byId('notificationList');if(count){count.textContent=String(list.length);count.classList.toggle('hidden',!list.length)}if(subtitle)subtitle.textContent=result.error?'Erreur de calcul':list.length?`${list.length} notification${list.length>1?'s':''} à consulter`:'Aucune notification visible';if(!box)return list;
  const toolbar=`<div class="notification-toolbar"><button type="button" data-dismiss-all>Effacer les notifications affichées</button><button type="button" data-restore-dismissed>Réafficher les masquées</button></div>`;
  const items=list.map((n,i)=>`<article class="notification-item ${esc(n.level||'blue')}"><button type="button" class="notification-main" data-open-notification="${i}"><span class="notification-icon">${esc(n.icon||'🔔')}</span><span><strong>${esc(n.title||'Notification')}</strong><small>${esc(n.text||'')}</small></span><span class="go-arrow">›</span></button><button type="button" class="notification-dismiss" data-dismiss-notification="${i}" aria-label="Masquer cette notification">×</button></article>`).join('');
  box.innerHTML=toolbar+(items||'<div class="empty-state">✓ Aucune notification à traiter.</div>')+diagnosticHtml();return list}
 function dismiss(index,days=7){const n=lastNotifications[index];if(!n)return;const store=load();store[key(n)]=Date.now()+days*86400000;save(store);render()}
 function dismissAll(){const store=load(),until=Date.now()+86400000;for(const n of lastNotifications)store[key(n)]=until;save(store);render()}
 function restore(){localStorage.removeItem(STORE);render()}
 function open(e){e?.preventDefault?.();e?.stopPropagation?.();const m=byId('notificationModal');if(!m)return;render();m.classList.remove('hidden');m.classList.add('is-open');m.setAttribute('aria-hidden','false');document.body.classList.add('notifications-open');opened=true}
 function close(e){e?.preventDefault?.();const m=byId('notificationModal');if(!m)return;m.classList.remove('is-open');m.classList.add('hidden');m.setAttribute('aria-hidden','true');document.body.classList.remove('notifications-open');opened=false}
 function activate(i){const n=lastNotifications[i];close();if(n)window.PSTNotifications?.target?.(n)}
 function init(){const bell=byId('notificationBell');if(bell){bell.removeAttribute('href');bell.addEventListener('click',open,{passive:false});bell.addEventListener('touchend',open,{passive:false})}byId('notificationClose')?.addEventListener('click',close);byId('notificationBackdrop')?.addEventListener('click',close);document.addEventListener('click',e=>{let x=e.target.closest('[data-open-notification]');if(x)return activate(Number(x.dataset.openNotification));x=e.target.closest('[data-dismiss-notification]');if(x)return dismiss(Number(x.dataset.dismissNotification));if(e.target.closest('[data-dismiss-all]'))return dismissAll();if(e.target.closest('[data-restore-dismissed]'))return restore()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened)close(e)});['pst:data-loaded','pst:data-saved','online'].forEach(n=>window.addEventListener(n,render));render();setInterval(render,60000)}
 window.PSTNotificationCenter={open,close,render,restore};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
