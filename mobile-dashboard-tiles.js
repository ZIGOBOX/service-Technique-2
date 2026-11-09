/*
 * Tableau de bord mobile en tuiles — 2026-11-09
 * La vue PC, les agents, les horaires et les données ne sont pas modifiés.
 * Les cartes du tableau de bord sont simplement masquées/affichées sur mobile.
 */
(function () {
  'use strict';

  const PHONE_WIDTH = 700;
  const items = [
    {kind:'panel', target:'agenda',       icon:'📅', name:'Ma journée',           description:'Agenda du jour',          tone:'sky'},
    {kind:'panel', target:'priorities',   icon:'🚨', name:'Priorités du jour',     description:'Urgences et actions',     tone:'coral'},
    {kind:'panel', target:'reminders',    icon:'🔔', name:'Mes rappels',          description:'À ne pas oublier',       tone:'purple'},
    {kind:'panel', target:'week',         icon:'🗓️', name:'Ma semaine',           description:'Vue de la semaine',      tone:'blue'},
    {kind:'panel', target:'watch',        icon:'📊', name:'À surveiller',         description:'Indicateurs du service', tone:'teal'},
    {kind:'view',  target:'periodic',     icon:'🛡️', name:'Contrôles',            description:'Contrôles périodiques',  tone:'orange'},
    {kind:'view',  target:'cleaning',     icon:'🧹', name:'Contrôle ménage',      description:'Propreté et conformité', tone:'mint'},
    {kind:'view',  target:'maintenance',  icon:'🔧', name:'Interventions',        description:'Maintenance et travaux', tone:'indigo'},
    {kind:'panel', target:'maintenance',  icon:'📈', name:'Bilan maintenance',    description:'Suivi toutes années',    tone:'sand'},
    {kind:'view',  target:'meetings',     icon:'🤝', name:'Rendez-vous',          description:'Réunions et visites',    tone:'rose'},
    {kind:'view',  target:'notes',        icon:'📝', name:'Bloc-notes',           description:'Notes et échéances',     tone:'slate'},
    {kind:'view',  target:'pdfimports',   icon:'⏱️', name:'Chronotime',          description:'Imports et horaires',   tone:'navy'}
  ];

  function start() {
    const dashboard = document.getElementById('dashboard');
    const team = dashboard?.querySelector(':scope > .daily-team-panel-v149');
    if (!dashboard || !team || document.getElementById('pstMobileDashboardTiles')) return;

    const tiles = document.createElement('nav');
    tiles.id = 'pstMobileDashboardTiles';
    tiles.className = 'pst-mobile-dashboard-tiles';
    tiles.setAttribute('aria-label','Accès rapides du tableau de bord sur téléphone');
    const heading = document.createElement('div');
    heading.className = 'pst-mobile-tiles-heading';
    heading.innerHTML = '<strong>Accès rapides</strong><small>Choisissez une rubrique</small>';
    const grid = document.createElement('div');
    grid.className = 'pst-mobile-tiles-grid';

    for (const item of items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pst-mobile-tile pst-mobile-tile--' + item.tone;
      button.dataset.pstTileKind = item.kind;
      button.dataset.pstTileTarget = item.target;
      button.setAttribute('aria-label',item.name + ' : ' + item.description);
      const symbol = document.createElement('span');
      symbol.className = 'pst-mobile-tile-icon';
      symbol.textContent = item.icon;
      symbol.setAttribute('aria-hidden','true');
      const body = document.createElement('span');
      body.className = 'pst-mobile-tile-body';
      const title = document.createElement('strong');
      title.textContent = item.name;
      const description = document.createElement('small');
      description.textContent = item.description;
      body.append(title,description);
      button.append(symbol,body);
      grid.appendChild(button);
    }
    tiles.append(heading,grid);

    const detailBar = document.createElement('div');
    detailBar.id = 'pstMobileDashboardDetailBar';
    detailBar.className = 'pst-mobile-dashboard-detailbar';
    detailBar.innerHTML = '<button type="button" id="pstMobileDashboardBack" class="pst-mobile-return-button" aria-label="Retour au tableau de bord">← Tableau de bord</button><strong id="pstMobileDashboardDetailTitle"></strong>';

    team.after(tiles,detailBar);

    const externalBack = document.createElement('div');
    externalBack.id = 'pstMobileDashboardExternalBack';
    externalBack.className = 'pst-mobile-dashboard-externalback';
    externalBack.innerHTML = '<button type="button" id="pstMobileDashboardExternalBackButton" class="pst-mobile-return-button">← Retour au tableau de bord</button>';
    dashboard.before(externalBack);
    dashboard.classList.add('pst-mobile-tiles-ready');

    function isPhone() { return window.innerWidth <= PHONE_WIDTH; }
    function topOfPage() {
      // Restaurer la position en haut à la fois pour le défilement du document
      // et les configurations éventuelles où le conteneur principal défile.
      window.scrollTo({top:0,behavior:'instant'});
      const main = document.querySelector('main');
      if (main && main.scrollTop) main.scrollTop = 0;
    }
    function closePanel() {
      delete dashboard.dataset.pstMobilePanel;
      document.getElementById('pstMobileDashboardDetailTitle').textContent = '';
      topOfPage();
    }
    function returnHome() {
      document.body.classList.remove('pst-mobile-external-from-tiles');
      closePanel();
      if (typeof window.PSTSetView === 'function') window.PSTSetView('dashboard');
      else window.PSTNavigation?.switchView?.('dashboard');
      topOfPage();
    }
    function openPanel(target, name) {
      if (!isPhone()) return;
      dashboard.dataset.pstMobilePanel = target;
      document.getElementById('pstMobileDashboardDetailTitle').textContent = name;
      topOfPage();
    }
    function openView(target) {
      if (!isPhone()) return;
      document.body.classList.add('pst-mobile-external-from-tiles');
      if (typeof window.PSTSetView === 'function') window.PSTSetView(target);
      else if (!window.PSTNavigation?.switchView?.(target)) {
        document.body.classList.remove('pst-mobile-external-from-tiles');
        return;
      }
      topOfPage();
    }

    grid.addEventListener('click',function(event) {
      const button = event.target.closest('[data-pst-tile-kind]');
      if (!button || !grid.contains(button)) return;
      if (button.dataset.pstTileKind === 'panel') openPanel(button.dataset.pstTileTarget,button.querySelector('strong')?.textContent||'Détail');
      else openView(button.dataset.pstTileTarget);
    });
    document.getElementById('pstMobileDashboardBack').addEventListener('click',closePanel);
    document.getElementById('pstMobileDashboardExternalBackButton').addEventListener('click',returnHome);

    window.addEventListener('resize',function() {
      if (!isPhone()) {
        delete dashboard.dataset.pstMobilePanel;
        document.body.classList.remove('pst-mobile-external-from-tiles');
      }
    },{passive:true});
    document.addEventListener('keydown',function(event) {
      if (event.key !== 'Escape' || !isPhone()) return;
      if (document.querySelector('dialog[open],.modal[open]')) return;
      if (dashboard.classList.contains('active') && dashboard.dataset.pstMobilePanel) closePanel();
      else if (document.body.classList.contains('pst-mobile-external-from-tiles')) returnHome();
    });
    // Si le menu latéral ramène directement au tableau de bord, retrouver les tuiles.
    document.addEventListener('click',function(event){
      const menuHome = event.target.closest('.nav-btn[data-view="dashboard"]');
      if (menuHome) {
        document.body.classList.remove('pst-mobile-external-from-tiles');
        delete dashboard.dataset.pstMobilePanel;
      }
    },true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
