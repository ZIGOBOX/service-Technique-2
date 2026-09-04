import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

type AnyRecord = Record<string, any>
const pad=(n:number)=>String(n).padStart(2,'0')
const iso=(d:Date)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
const esc=(v:any)=>String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]||c))
const splitEmails=(v:string='')=>v.split(/[;,\n]+/).map(x=>x.trim()).filter(Boolean)
const agentName=(data:AnyRecord,id:string)=>{const a=(data.agents||[]).find((x:AnyRecord)=>x.id===id);return a?[a.firstName,a.lastName].filter(Boolean).join(' '):'Agent'}
const isClosed=(s:string='')=>['Terminée','Terminé','Clôturée','Clôturé','Réalisé','Réalisée'].includes(s)

function parisParts(date=new Date(),tz='Europe/Paris'){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',weekday:'short',hour12:false}).formatToParts(date)
 const get=(t:string)=>parts.find(p=>p.type===t)?.value||''
 const wd:{[k:string]:number}={Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:7}
 return {date:`${get('year')}-${get('month')}-${get('day')}`,hour:`${get('hour')}:${get('minute')}`,weekday:wd[get('weekday')]||1}
}
function addDays(s:string,n:number){const [y,m,d]=s.split('-').map(Number);const x=new Date(Date.UTC(y,m-1,d+n));return x.toISOString().slice(0,10)}
function startMonday(s:string){const [y,m,d]=s.split('-').map(Number);const x=new Date(Date.UTC(y,m-1,d));const wd=x.getUTCDay()||7;x.setUTCDate(x.getUTCDate()-wd+1);return x.toISOString().slice(0,10)}
function inRange(v:string,a:string,b:string){return Boolean(v&&v>=a&&v<=b)}

function buildDaily(data:AnyRecord,date:string){
 const s=data.settings||{};const sections:string[]=[];const improvements:string[]=[];let eventCount=0
 if(s.autoReportIncludeAgents!==false){
  const days=(data.agentDays||[]).filter((x:AnyRecord)=>x.date===date)
  const abs=days.filter((x:AnyRecord)=>x.dayType&&x.dayType!=='Présence')
  eventCount+=days.length
  sections.push(`<h2>Personnel</h2><p><strong>${(data.agents||[]).filter((a:AnyRecord)=>a.status==='Actif').length}</strong> agents actifs · <strong>${abs.length}</strong> absence(s) enregistrée(s).</p>${abs.length?`<ul>${abs.map((x:AnyRecord)=>`<li>${esc(agentName(data,x.agentId))} — ${esc(x.dayType)}${x.replacementAgentId?` — remplacement : ${esc(agentName(data,x.replacementAgentId))}`:''}</li>`).join('')}</ul>`:'<p>Aucune absence enregistrée.</p>'}`)
  abs.filter((x:AnyRecord)=>!x.replacementAgentId&&x.replacementNeeded!==false).forEach((x:AnyRecord)=>improvements.push(`Organiser ou confirmer le remplacement de ${agentName(data,x.agentId)}.`))
 }
 if(s.autoReportIncludeMaintenance!==false){
  const created=(data.maintenance||[]).filter((x:AnyRecord)=>x.date===date)
  const open=(data.maintenance||[]).filter((x:AnyRecord)=>!isClosed(x.status))
  const urgent=open.filter((x:AnyRecord)=>x.priority==='Haute'||x.priority==='Urgente'||(x.dueDate&&x.dueDate<=date))
  eventCount+=created.length
  sections.push(`<h2>Interventions</h2><p><strong>${created.length}</strong> créée(s) hier · <strong>${open.length}</strong> ouverte(s) · <strong>${urgent.length}</strong> urgente(s) ou en retard.</p>${created.length?`<ul>${created.slice(0,12).map((x:AnyRecord)=>`<li>${esc(x.title)} — ${esc(x.building||'')} — ${esc(x.status||'')}</li>`).join('')}</ul>`:''}`)
  urgent.slice(0,5).forEach((x:AnyRecord)=>improvements.push(`Traiter ou replanifier l’intervention « ${x.title} ».`))
 }
 if(s.autoReportIncludeCleaning!==false){
  const controls=(data.cleaning||[]).filter((x:AnyRecord)=>x.date===date)
  const weak=controls.filter((x:AnyRecord)=>x.overallStatus&&x.overallStatus!=='Conforme')
  eventCount+=controls.length
  sections.push(`<h2>Contrôles ménage</h2><p><strong>${controls.length}</strong> contrôle(s) réalisé(s) · <strong>${weak.length}</strong> à reprendre ou non conforme(s).</p>${weak.length?`<ul>${weak.slice(0,10).map((x:AnyRecord)=>`<li>${esc([x.building,x.floor,x.room].filter(Boolean).join(' — '))} — ${esc(x.overallStatus)}</li>`).join('')}</ul>`:''}`)
  weak.slice(0,5).forEach((x:AnyRecord)=>improvements.push(`Prévoir une reprise ménage : ${[x.building,x.floor,x.room].filter(Boolean).join(' — ')}.`))
 }
 if(s.autoReportIncludePeriodic!==false){
  const soon=(data.periodic||[]).filter((x:AnyRecord)=>x.nextDate&&x.nextDate>=date&&x.nextDate<=addDays(date,30))
  const late=(data.periodic||[]).filter((x:AnyRecord)=>x.nextDate&&x.nextDate<date)
  sections.push(`<h2>Contrôles périodiques</h2><p><strong>${soon.length}</strong> dans les 30 jours · <strong>${late.length}</strong> dépassé(s).</p>`)
  late.slice(0,5).forEach((x:AnyRecord)=>improvements.push(`Programmer le contrôle périodique en retard : ${x.name}.`))
 }
 if(s.autoReportIncludeMeetings!==false){
  const meetings=[...(data.meetings||[]),...(data.personalEvents||[])].filter((x:AnyRecord)=>x.date===date)
  eventCount+=meetings.length
  sections.push(`<h2>Réunions et rendez-vous</h2><p><strong>${meetings.length}</strong> élément(s) hier.</p>${meetings.length?`<ul>${meetings.slice(0,10).map((x:AnyRecord)=>`<li>${esc(x.time||x.start||'')} — ${esc(x.title||x.type||'Rendez-vous')}</li>`).join('')}</ul>`:''}`)
 }
 if(!improvements.length)improvements.push('Aucun point d’amélioration prioritaire détecté automatiquement.')
 const html=`<div style="font-family:Arial,sans-serif;color:#183247;max-width:760px;margin:auto"><h1 style="color:#075ca8">Résumé de la veille — ${esc(date)}</h1>${sections.join('')}<div style="background:#fff4d8;border-left:5px solid #e39a13;padding:14px 18px;margin:22px 0"><h2 style="margin-top:0">Points d’amélioration</h2><ul>${improvements.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><p style="color:#607080">${esc(s.autoReportSignature||'Rapport généré automatiquement par Pilotage Service Technique.')}</p></div>`
 return {subject:`${s.emailSubjectPrefix||s.appName||'Pilotage Service Technique'} — Résumé du ${date}`,html,eventCount,improvements}
}

function buildWeekly(data:AnyRecord,start:string,end:string){
 const s=data.settings||{};const maint=(data.maintenance||[]).filter((x:AnyRecord)=>inRange(x.date,start,end));const clean=(data.cleaning||[]).filter((x:AnyRecord)=>inRange(x.date,start,end));const abs=(data.agentDays||[]).filter((x:AnyRecord)=>inRange(x.date,start,end)&&x.dayType&&x.dayType!=='Présence');const meet=[...(data.meetings||[]),...(data.personalEvents||[])].filter((x:AnyRecord)=>inRange(x.date,start,end));const improvements:string[]=[]
 ;(data.maintenance||[]).filter((x:AnyRecord)=>!isClosed(x.status)&&(x.priority==='Haute'||x.priority==='Urgente'||(x.dueDate&&x.dueDate<=end))).slice(0,8).forEach((x:AnyRecord)=>improvements.push(`Intervention à prioriser : ${x.title}.`))
 clean.filter((x:AnyRecord)=>x.overallStatus&&x.overallStatus!=='Conforme').slice(0,8).forEach((x:AnyRecord)=>improvements.push(`Reprise ménage : ${[x.building,x.room].filter(Boolean).join(' — ')}.`))
 if(!improvements.length)improvements.push('Aucun point d’amélioration prioritaire détecté automatiquement.')
 const html=`<div style="font-family:Arial,sans-serif;color:#183247;max-width:760px;margin:auto"><h1 style="color:#075ca8">Bilan hebdomadaire — ${start} au ${end}</h1><table style="border-collapse:collapse;width:100%"><tr><td style="padding:12px;border:1px solid #d6e1e8"><strong>Interventions créées</strong><br>${maint.length}</td><td style="padding:12px;border:1px solid #d6e1e8"><strong>Contrôles ménage</strong><br>${clean.length}</td><td style="padding:12px;border:1px solid #d6e1e8"><strong>Absences</strong><br>${abs.length}</td><td style="padding:12px;border:1px solid #d6e1e8"><strong>Rendez-vous</strong><br>${meet.length}</td></tr></table><div style="background:#fff4d8;border-left:5px solid #e39a13;padding:14px 18px;margin:22px 0"><h2 style="margin-top:0">Points d’amélioration</h2><ul>${improvements.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><p style="color:#607080">${esc(s.autoReportSignature||'Rapport généré automatiquement par Pilotage Service Technique.')}</p></div>`
 return {subject:`${s.emailSubjectPrefix||s.appName||'Pilotage Service Technique'} — Bilan du ${start} au ${end}`,html,eventCount:maint.length+clean.length+abs.length+meet.length,improvements}
}

async function sendWithGraph(subject:string,html:string,to:string[],cc:string[],bcc:string[]){
 const tenant=Deno.env.get('MS_TENANT_ID')!,client=Deno.env.get('MS_CLIENT_ID')!,secret=Deno.env.get('MS_CLIENT_SECRET')!,sender=Deno.env.get('MS_SENDER_EMAIL')!
 const tokenRes=await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:client,client_secret:secret,scope:'https://graph.microsoft.com/.default',grant_type:'client_credentials'})})
 if(!tokenRes.ok)throw new Error(`Microsoft token: ${await tokenRes.text()}`)
 const token=(await tokenRes.json()).access_token
 const recipients=(a:string[])=>a.map(address=>({emailAddress:{address}}))
 const res=await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({message:{subject,body:{contentType:'HTML',content:html},toRecipients:recipients(to),ccRecipients:recipients(cc),bccRecipients:recipients(bcc)},saveToSentItems:true})})
 if(!res.ok)throw new Error(`Microsoft Graph: ${await res.text()}`)
}
async function sendWithResend(subject:string,html:string,to:string[],cc:string[],bcc:string[]){
 const key=Deno.env.get('RESEND_API_KEY')!,from=Deno.env.get('REPORT_FROM_EMAIL')||'Pilotage Service Technique <onboarding@resend.dev>'
 const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify({from,to,cc,bcc,subject,html})})
 if(!res.ok)throw new Error(`Resend: ${await res.text()}`)
}
function mailProviderStatus(){
 const microsoft=Boolean(Deno.env.get('MS_TENANT_ID')&&Deno.env.get('MS_CLIENT_ID')&&Deno.env.get('MS_CLIENT_SECRET')&&Deno.env.get('MS_SENDER_EMAIL'))
 const resend=Boolean(Deno.env.get('RESEND_API_KEY'))
 return {provider:microsoft?'microsoft':resend?'resend':'none',sender:microsoft?(Deno.env.get('MS_SENDER_EMAIL')||''):(resend?(Deno.env.get('REPORT_FROM_EMAIL')||''):''),cronSecretConfigured:Boolean(Deno.env.get('CRON_SECRET'))}
}

async function sendMail(subject:string,html:string,to:string[],cc:string[],bcc:string[]){
 if(!to.length)throw new Error('Aucun destinataire configuré')
 if(Deno.env.get('MS_TENANT_ID')&&Deno.env.get('MS_CLIENT_ID')&&Deno.env.get('MS_CLIENT_SECRET')&&Deno.env.get('MS_SENDER_EMAIL'))return sendWithGraph(subject,html,to,cc,bcc)
 if(Deno.env.get('RESEND_API_KEY'))return sendWithResend(subject,html,to,cc,bcc)
 throw new Error('Aucun fournisseur e-mail configuré côté serveur')
}

Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders})
 try{
  const url=Deno.env.get('SUPABASE_URL')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin=createClient(url,service,{auth:{persistSession:false}})
  const body=await req.json().catch(()=>({}))
  const cronSecret=req.headers.get('x-cron-secret')||body.cron_secret||''
  const isCron=Boolean(Deno.env.get('CRON_SECRET')&&cronSecret===Deno.env.get('CRON_SECRET'))
  let userId:string|undefined
  if(!isCron){
   const auth=req.headers.get('Authorization')||''
   const token=auth.replace(/^Bearer\s+/i,'')
   const {data,error}=await admin.auth.getUser(token);if(error||!data.user)throw new Error('Utilisateur non authentifié')
   userId=data.user.id
  }
  const providerInfo=mailProviderStatus()
  if(body.mode==='status')return new Response(JSON.stringify({ok:true,...providerInfo}),{headers:{...corsHeaders,'content-type':'application/json'}})
  let q=admin.from('app_state').select('user_id,data')
  if(userId)q=q.eq('user_id',userId)
  const {data:rows,error}=await q;if(error)throw error
  const results:any[]=[]
  for(const row of rows||[]){
   const data=row.data||{},s=data.settings||{},now=parisParts(new Date(),s.autoReportTimezone||'Europe/Paris')
   const to=splitEmails(s.autoReportTo||s.emailsTo||'adelin.vignal.running@outlook.fr'),cc=splitEmails(s.autoReportCc||s.emailsCc),bcc=splitEmails(s.autoReportBcc||s.emailsBcc)
   const targetHour=(s.autoReportHour||'07:00').slice(0,2)
   const dueHour=body.mode==='test'||now.hour.slice(0,2)===targetHour
   let sent=false
   if(body.mode==='test'){
    const r=buildDaily(data,addDays(now.date,-1));await sendMail(`[TEST] ${r.subject}`,r.html,to,cc,bcc);sent=true;s.lastAutoReportType='test';s.lastAutoReportStatus='ok';s.lastAutoReportError='';s.lastAutoReportSentAt=new Date().toISOString();s.lastAutoReportTestAt=s.lastAutoReportSentAt;results.push({user_id:row.user_id,type:'test'})
   }else if(dueHour){
    const allowed=String(s.autoReportWeekdays||'1,2,3,4,5').split(',').map((x:string)=>Number(x.trim())).includes(now.weekday)
    if(s.autoDailyEnabled&&allowed&&s.lastDailyEmailDate!==now.date){
     const r=buildDaily(data,addDays(now.date,-1));if(!s.autoReportOnlyIfEvents||r.eventCount>0){await sendMail(r.subject,r.html,to,cc,bcc);sent=true;s.lastAutoReportType='daily';s.lastAutoReportStatus='ok';s.lastAutoReportError='';s.lastAutoReportSentAt=new Date().toISOString();results.push({user_id:row.user_id,type:'daily'})}s.lastDailyEmailDate=now.date
    }
    const weekStart=startMonday(now.date),previousStart=addDays(weekStart,-7),previousEnd=addDays(weekStart,-1),key=previousStart
    if(s.autoWeeklyEnabled&&now.weekday===1&&s.lastWeeklyEmailKey!==key){
     const r=buildWeekly(data,previousStart,previousEnd);if(!s.autoReportOnlyIfEvents||r.eventCount>0){await sendMail(r.subject,r.html,to,cc,bcc);sent=true;s.lastAutoReportType='weekly';s.lastAutoReportStatus='ok';s.lastAutoReportError='';s.lastAutoReportSentAt=new Date().toISOString();results.push({user_id:row.user_id,type:'weekly'})}s.lastWeeklyEmailKey=key
    }
   }
   if(sent||body.mode!=='test')await admin.from('app_state').update({data:{...data,settings:s},updated_at:new Date().toISOString()}).eq('user_id',row.user_id)
  }
  return new Response(JSON.stringify({ok:true,message:body.mode==='test'?'Rapport test envoyé':'Traitement terminé',results,provider:providerInfo.provider,sender:providerInfo.sender,cronSecretConfigured:providerInfo.cronSecretConfigured,sentAt:results.length?new Date().toISOString():''}),{headers:{...corsHeaders,'content-type':'application/json'}})
 }catch(e){return new Response(JSON.stringify({ok:false,error:String(e?.message||e)}),{status:400,headers:{...corsHeaders,'content-type':'application/json'}})}
})
