
(() => {
  'use strict';

  const ROANNE = { latitude: 46.0362, longitude: 4.0680 };
  const WASTE_ADDRESSES = ['Rue Noëlas', 'Rue Jean Puy'];

  // Collecte régulière configurée pour les deux rues :
  // vendredi ; semaine impaire = bac jaune ; semaine paire = bac bordeaux.
  const WASTE_RULE = {
    odd: { key:'yellow', label:'Bac jaune', detail:'Emballages et papiers', icon:'🟨' },
    even:{ key:'burgundy', label:'Bac bordeaux', detail:'Ordures ménagères', icon:'🟥' }
  };

  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2,'0');

  function isoWeek(date){
    const d = new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate()+4-day);
    const y0 = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d-y0)/86400000)+1)/7);
  }

  function localISO(date){return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;}
  function parseISO(v){return new Date(`${v}T12:00:00`);}
  function addDaysISO(v,n){const d=parseISO(v);d.setDate(d.getDate()+n);return localISO(d);}
  function easterSundayISO(year){
    const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
    return `${year}-${pad(month)}-${pad(day)}`;
  }
  function holidayName(v){
    const d=String(v||''),y=Number(d.slice(0,4));if(!y)return '';
    const fixed={};fixed[`${y}-01-01`]='Jour de l’an';fixed[`${y}-05-01`]='Fête du Travail';fixed[`${y}-05-08`]='Victoire 1945';fixed[`${y}-07-14`]='Fête nationale';fixed[`${y}-08-15`]='Assomption';fixed[`${y}-11-01`]='Toussaint';fixed[`${y}-11-11`]='Armistice';fixed[`${y}-12-25`]='Noël';
    if(fixed[d])return fixed[d];const easter=easterSundayISO(y),mov={};mov[addDaysISO(easter,1)]='Lundi de Pâques';mov[addDaysISO(easter,39)]='Ascension';mov[addDaysISO(easter,50)]='Lundi de Pentecôte';return mov[d]||'';
  }
  function collectionInfo(fridayDate){
    const friday=new Date(fridayDate.getFullYear(),fridayDate.getMonth(),fridayDate.getDate(),12),monday=new Date(friday);monday.setDate(friday.getDate()-4);
    const holidays=[];
    for(let i=0;i<5;i++){const d=new Date(monday);d.setDate(monday.getDate()+i);const name=holidayName(localISO(d));if(name)holidays.push({date:new Date(d),name});}
    const actual=new Date(friday);if(holidays.length)actual.setDate(actual.getDate()+1);
    return {friday,actual,shifted:holidays.length>0,holidays};
  }

  function nextFriday(from=new Date()){
    const d = new Date(from.getFullYear(),from.getMonth(),from.getDate(),12);
    let add = (5-d.getDay()+7)%7;
    if(add===0 && from.getHours()>=12) add=7;
    d.setDate(d.getDate()+add);
    return d;
  }

  function binForDate(date){
    const week=isoWeek(date);
    const bin=week%2?WASTE_RULE.odd:WASTE_RULE.even;
    return {...bin,week,parity:week%2?'impaire':'paire'};
  }

  function renderWaste(){
    const planned=nextFriday(new Date()),info=collectionInfo(planned),actual=info.actual,b=binForDate(planned);
    if($('wasteNext')){
      const shift=info.shifted?`<div class="waste-holiday-alert"><strong>⚠️ Collecte décalée d’un jour</strong><span>${info.holidays.map(h=>`${h.name} le ${h.date.toLocaleDateString('fr-FR')}`).join(', ')} : passage <b>${actual.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</b> au lieu du vendredi.</span></div>`:'';
      $('wasteNext').innerHTML=`${shift}
        <div class="waste-bin ${b.key}">
          <div class="waste-bin-icon">${b.icon}</div>
          <div>
            <span class="waste-label">${info.shifted?'Collecte décalée':'Collecte'} — ${actual.toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}</span>
            <strong>${b.label}</strong>
            <small>${b.detail} · semaine ${b.week} (${b.parity})${info.shifted?' · vendredi décalé au samedi':''}</small>
          </div>
        </div>
        <div class="waste-streets">${WASTE_ADDRESSES.map(x=>`<span>📍 ${x}</span>`).join('')}</div>`;
    }

    const rows=[];let d=planned;
    for(let i=0;i<10;i++){
      const x=new Date(d),ci=collectionInfo(x),bin=binForDate(x),shown=ci.actual;
      rows.push(`<div class="waste-row ${ci.shifted?'is-shifted':''}">
        <div><strong>${shown.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</strong><small>Semaine ${bin.week} · ${bin.parity}${ci.shifted?' · décalée (+1 jour)':''}</small></div>
        <span class="waste-badge ${bin.key}">${bin.icon} ${bin.label}</span>
        <small>${ci.shifted?'⚠️ '+ci.holidays.map(h=>h.name).join(', ')+' — vendredi décalé au samedi':bin.detail}</small>
      </div>`);
      d=new Date(d); d.setDate(d.getDate()+7);
    }
    if($('wasteCalendar')) $('wasteCalendar').innerHTML=rows.join('');
  }

  const CODES={
    0:['☀️','Ciel dégagé'],1:['🌤️','Peu nuageux'],2:['⛅','Partiellement nuageux'],3:['☁️','Couvert'],
    45:['🌫️','Brouillard'],48:['🌫️','Brouillard givrant'],
    51:['🌦️','Bruine faible'],53:['🌦️','Bruine'],55:['🌧️','Bruine forte'],
    61:['🌦️','Pluie faible'],63:['🌧️','Pluie'],65:['🌧️','Forte pluie'],
    71:['🌨️','Neige faible'],73:['🌨️','Neige'],75:['❄️','Forte neige'],
    80:['🌦️','Averses faibles'],81:['🌧️','Averses'],82:['⛈️','Fortes averses'],
    95:['⛈️','Orage'],96:['⛈️','Orage avec grêle'],99:['⛈️','Orage fort avec grêle']
  };
  const label=c=>CODES[c]||['🌡️','Conditions météo'];

  async function loadWeather(){
    const now=$('weatherNow'), forecast=$('weatherForecast');
    if(!now || !forecast) return;
    now.innerHTML='<div class="empty">Actualisation de la météo…</div>';
    try{
      const url=`https://api.open-meteo.com/v1/forecast?latitude=${ROANNE.latitude}&longitude=${ROANNE.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FParis&forecast_days=15`;
      const res=await fetch(url,{cache:'no-store'});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data=await res.json(), c=data.current||{}, [ico,txt]=label(c.weather_code);
      now.innerHTML=`
        <div class="weather-main"><span class="weather-icon">${ico}</span><div><strong>${Math.round(c.temperature_2m??0)}°C</strong><span>${txt}</span></div></div>
        <div class="weather-stats">
          <span>Ressenti <b>${Math.round(c.apparent_temperature??c.temperature_2m??0)}°C</b></span>
          <span>Humidité <b>${Math.round(c.relative_humidity_2m??0)}%</b></span>
          <span>Vent <b>${Math.round(c.wind_speed_10m??0)} km/h</b></span>
          <span>Précipitations <b>${Number(c.precipitation??0).toLocaleString('fr-FR')} mm</b></span>
        </div>`;
      const d=data.daily||{};
      forecast.innerHTML=(d.time||[]).map((date,i)=>{
        const day=new Date(`${date}T12:00:00`), [di,dt]=label(d.weather_code?.[i]);
        return `<div class="forecast-day">
          <strong>${day.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric'})}</strong>
          <span class="forecast-icon">${di}</span><small>${dt}</small>
          <b>${Math.round(d.temperature_2m_max?.[i]??0)}° / ${Math.round(d.temperature_2m_min?.[i]??0)}°</b>
          <small>💧 ${Math.round(d.precipitation_probability_max?.[i]??0)}%</small>
        </div>`;
      }).join('');
      if($('weatherUpdated')) $('weatherUpdated').textContent=`Mis à jour ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`;
    }catch(e){
      console.error(e);
      now.innerHTML='<div class="empty-state">⚠️ Météo indisponible. Vérifiez la connexion Internet puis appuyez sur Actualiser.</div>';
      forecast.innerHTML='';
      if($('weatherUpdated')) $('weatherUpdated').textContent='Connexion requise';
    }
  }

  function init(){
    renderWaste();
    $('weatherRefresh')?.addEventListener('click',()=>loadWeather());
    $('wasteRefresh')?.addEventListener('click',()=>renderWaste());
    document.querySelector('[data-view="weather"]')?.addEventListener('click',()=>setTimeout(loadWeather,50));
    document.querySelector('[data-view="waste"]')?.addEventListener('click',()=>setTimeout(renderWaste,50));
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();

  window.PSTWeatherWaste={loadWeather,renderWaste,binForDate,nextFriday};
})();
