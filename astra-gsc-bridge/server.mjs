import http from 'node:http';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import dns from 'node:dns/promises';

const PORT=Number(process.env.PORT||3000);
const ORIGIN=()=>String(process.env.PUBLIC_ORIGIN||`http://127.0.0.1:${PORT}`).replace(/\/$/,'');
const STATE_TTL_MS=15*60*1000;
const SCOPES=['https://www.googleapis.com/auth/webmasters','https://www.googleapis.com/auth/siteverification'];
const STORE=process.env.ASTRA_TOKEN_STORE||'/tmp/astra-gsc-google.json';
const REPORT_STORE=process.env.ASTRA_REPORT_STORE||'/tmp/astra-gsc-last-report.json';

const enc=v=>Buffer.from(v).toString('base64url');
const dec=v=>Buffer.from(v,'base64url').toString();
const htmlEsc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json=(res,status,body,headers={})=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store',...headers});res.end(JSON.stringify(body,null,2));};
const page=(res,status,title,body,headers={})=>{res.writeHead(status,{'content-type':'text/html; charset=utf-8','cache-control':'no-store',...headers});res.end(`<!doctype html><meta charset="utf-8"><title>${htmlEsc(title)}</title><main style="font:16px system-ui;max-width:920px;margin:42px auto;line-height:1.45"><h1>${htmlEsc(title)}</h1>${body}</main>`);};
const requireEnv=n=>{const v=String(process.env[n]||'').trim();if(!v)throw new Error(`missing_env:${n}`);return v;};
const oauthReady=()=>Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET);
const key=()=>crypto.createHash('sha256').update(String(process.env.ASTRA_BRIDGE_MASTER_KEY||'ephemeral-not-for-production')).digest();
function seal(obj){const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key(),iv),ct=Buffer.concat([c.update(JSON.stringify(obj)),c.final()]);return [enc(iv),enc(c.getAuthTag()),enc(ct)].join('.');}
function openSeal(s){const [a,b,c]=String(s||'').split('.');if(!a||!b||!c)throw new Error('invalid_sealed_payload');const d=crypto.createDecipheriv('aes-256-gcm',key(),Buffer.from(a,'base64url'));d.setAuthTag(Buffer.from(b,'base64url'));return JSON.parse(Buffer.concat([d.update(Buffer.from(c,'base64url')),d.final()]).toString());}
function state(){const p={iat:Date.now(),nonce:crypto.randomUUID()};const body=enc(JSON.stringify(p));const sig=crypto.createHmac('sha256',key()).update(body).digest('base64url');return `${body}.${sig}`;}
function verifyState(v){const [body,sig]=String(v||'').split('.');if(!body||!sig)throw new Error('bad_state');const expected=crypto.createHmac('sha256',key()).update(body).digest();const got=Buffer.from(sig,'base64url');if(expected.length!==got.length||!crypto.timingSafeEqual(expected,got))throw new Error('bad_state_sig');const p=JSON.parse(dec(body));if(Date.now()-p.iat>STATE_TTL_MS)throw new Error('expired_state');return p;}
async function readJson(path,fallback){try{return JSON.parse(await fs.readFile(path,'utf8'));}catch{return fallback;}}
async function writeJson(path,obj){await fs.writeFile(path,JSON.stringify(obj,null,2),'utf8');}
async function portfolio(){const p=new URL('./portfolio.json',import.meta.url);return JSON.parse(await fs.readFile(p,'utf8'));}
async function storedGoogle(){const data=await readJson(STORE,null);if(!data?.sealed)return null;try{return openSeal(data.sealed);}catch{return null;}}
async function saveGoogle(tokens){await writeJson(STORE,{sealed:seal(tokens),savedAt:new Date().toISOString()});}
async function googleToken(){if(process.env.GOOGLE_ACCESS_TOKEN)return process.env.GOOGLE_ACCESS_TOKEN;let refresh=process.env.GOOGLE_REFRESH_TOKEN;const stored=await storedGoogle();if(!refresh)refresh=stored?.refresh_token;if(!refresh)throw new Error('google_authorization_required');const body=new URLSearchParams({client_id:requireEnv('GOOGLE_CLIENT_ID'),client_secret:requireEnv('GOOGLE_CLIENT_SECRET'),refresh_token:refresh,grant_type:'refresh_token'});const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});const j=await r.json();if(!r.ok||!j.access_token)throw new Error(`google_refresh_failed:${j.error_description||j.error||r.status}`);return j.access_token;}
async function gj(url,token,options={}){const r=await fetch(url,{...options,headers:{authorization:`Bearer ${token}`,'content-type':'application/json',...(options.headers||{})}});const txt=await r.text();let body=null;try{body=txt?JSON.parse(txt):null}catch{body=txt}if(!r.ok){const e=new Error(`google_api_${r.status}:${typeof body==='string'?body:JSON.stringify(body)}`);e.status=r.status;throw e;}return body;}
async function gscSites(token){const j=await gj('https://www.googleapis.com/webmasters/v3/sites',token);return j.siteEntry||[];}
async function addProperty(siteUrl,token){return gj(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}`,token,{method:'PUT'});}
async function getProperty(siteUrl,token){return gj(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}`,token);}
async function submitSitemap(siteUrl,sitemapUrl,token){return gj(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`,token,{method:'PUT'});}
async function searchAnalytics(siteUrl,token,{startDate,endDate,dimensions=['query','page'],rowLimit=25000,startRow=0}={}){
  return gj(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,token,{
    method:'POST',
    body:JSON.stringify({startDate,endDate,dimensions,rowLimit,startRow,dataState:'final'}),
  });
}
async function inspectUrl(siteUrl,inspectionUrl,token){
  return gj('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',token,{
    method:'POST',
    body:JSON.stringify({inspectionUrl,siteUrl,languageCode:'fr-FR'}),
  });
}
function isoDay(ms){return new Date(ms).toISOString().slice(0,10);}
function performanceWindow(days=28){
  const safe=Math.max(1,Math.min(90,Number(days)||28));
  const end=Date.now()-24*60*60*1000;
  return {days:safe,startDate:isoDay(end-(safe-1)*86400000),endDate:isoDay(end)};
}
async function portfolioSiteByInput(raw){
  const value=String(raw||'').trim();
  if(!value)throw new Error('site_required');
  const cfg=await portfolio();
  const hit=(cfg.sites||[]).find(site=>{
    const property=desiredProperty(site);
    return site.mode!=='exclude' && (site.name===value || site.baseUrl===value || property===value || domainOf(site.baseUrl)===value.replace(/^sc-domain:/,''));
  });
  if(!hit)throw new Error('site_not_in_index_portfolio');
  return hit;
}
function opportunityRows(rows=[]){
  return rows.map(row=>{
    const [query='',page='']=row.keys||[];
    const clicks=Number(row.clicks||0),impressions=Number(row.impressions||0),ctr=Number(row.ctr||0),position=Number(row.position||0);
    const positionGain=position>=4&&position<=20?Math.max(0,21-position)/17:0;
    const lowCtr=impressions>=20?Math.max(0,0.08-ctr)/0.08:0;
    const demand=Math.min(1,Math.log10(1+impressions)/3);
    const score=Math.round(100*(0.5*positionGain+0.3*lowCtr+0.2*demand));
    return {query,page,clicks,impressions,ctr:Number(ctr.toFixed(4)),position:Number(position.toFixed(2)),score};
  }).filter(row=>row.impressions>=10&&row.position>0&&row.position<=30).sort((a,b)=>b.score-a.score||b.impressions-a.impressions);
}
async function verificationToken({identifier,type,method,token}){return gj('https://www.googleapis.com/siteVerification/v1/token',token,{method:'POST',body:JSON.stringify({site:{identifier,type},verificationMethod:method})});}
async function verifyOwnership({identifier,type,method,token}){const u=new URL('https://www.googleapis.com/siteVerification/v1/webResource');u.searchParams.set('verificationMethod',method);return gj(u,token,{method:'POST',body:JSON.stringify({site:{identifier,type}})});}
async function dynadotTxt(domain,value){const api=process.env.DYNADOT_API_KEY;if(!api)throw new Error('missing_dns_credentials:dynadot');const u=new URL('https://api.dynadot.com/api3.json');u.searchParams.set('key',api);u.searchParams.set('command','set_dns2');u.searchParams.set('domain',domain);u.searchParams.set('add_dns_to_current_setting','1');u.searchParams.set('main_record_type0','txt');u.searchParams.set('main_record0',value);const r=await fetch(u);const j=await r.json();const root=j?.SetDnsResponse;if(!r.ok||!root||String(root.ResponseCode??root.SuccessCode)!=='0'||String(root.Status).toLowerCase()!=='success')throw new Error('dynadot_dns_failed');}
async function porkbunTxt(domain,value){const apikey=process.env.PORKBUN_API_KEY,secretapikey=process.env.PORKBUN_SECRET_API_KEY;if(!apikey||!secretapikey)throw new Error('missing_dns_credentials:porkbun');const r=await fetch(`https://api.porkbun.com/api/json/v3/dns/create/${encodeURIComponent(domain)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({apikey,secretapikey,name:'',type:'TXT',content:value,ttl:'600'})});const j=await r.json();if(!r.ok||j?.status!=='SUCCESS')throw new Error('porkbun_dns_failed');}
async function waitTxt(domain,value){for(let i=0;i<20;i++){try{const rows=await dns.resolveTxt(domain);if(rows.map(x=>x.join('')).includes(value))return true;}catch{}await new Promise(r=>setTimeout(r,5000));}throw new Error('dns_txt_not_visible');}
async function discoverSitemaps(base){const candidates=['/sitemap.xml','/sitemap_index.xml','/sitemap-index.xml','/wp-sitemap.xml','/news-sitemap.xml','/sitemap-news.xml'];const found=[];for(const path of candidates){const url=new URL(path,base).href;try{const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'ASTRA-GSC-Bridge/2.0'}});const t=await r.text();if(r.ok&&/<(?:urlset|sitemapindex)\b/i.test(t))found.push(url);}catch{}}return [...new Set(found)];}
const domainOf=base=>new URL(base).hostname.replace(/^www\./,'').toLowerCase();
function desiredProperty(site){return site.property||((site.propertyMode||'urlPrefix')==='domain'?`sc-domain:${domainOf(site.baseUrl)}`:new URL(site.baseUrl).origin+'/');}
function isVerified(entries,property){return entries.some(x=>x.siteUrl===property&&x.permissionLevel&&x.permissionLevel!=='siteUnverifiedUser');}
async function autoVerifyDomain(site,token){const domain=domainOf(site.baseUrl),provider=String(site.dnsProvider||process.env.DNS_PROVIDER||'').toLowerCase();if(!provider)throw new Error('dns_provider_missing');const vr=await verificationToken({identifier:domain,type:'INET_DOMAIN',method:'DNS_TXT',token});const value=String(vr.token||'').trim();if(!value)throw new Error('verification_token_missing');if(provider==='dynadot')await dynadotTxt(domain,value);else if(provider==='porkbun')await porkbunTxt(domain,value);else throw new Error(`unsupported_dns_provider:${provider}`);await waitTxt(domain,value);await verifyOwnership({identifier:domain,type:'INET_DOMAIN',method:'DNS_TXT',token});return {method:'DNS_TXT',provider};}
async function reconcileOne(site,token,entries){const property=desiredProperty(site),out={name:site.name,baseUrl:site.baseUrl,property,status:'UNVERIFIED',stages:[]};if(site.mode==='exclude'){out.status='EXCLUDED';return out;}let verified=isVerified(entries,property);if(verified)out.stages.push({stage:'ownership',status:'PASS',reason:'already_verified'});if(!verified){if((site.propertyMode||'urlPrefix')==='domain'){try{const proof=await autoVerifyDomain(site,token);out.stages.push({stage:'ownership',status:'PASS',...proof});await addProperty(property,token);verified=true;}catch(e){out.status='PARTIAL';out.stages.push({stage:'ownership',status:'BLOCKED',error:e.message});return out;}}else{out.status='PARTIAL';out.stages.push({stage:'ownership',status:'BLOCKED',error:'url_prefix_verification_adapter_not_configured'});return out;}}
try{const p=await getProperty(property,token);if(p?.permissionLevel==='siteUnverifiedUser')throw new Error('site_unverified_user');out.stages.push({stage:'gsc-property',status:'PASS',permissionLevel:p?.permissionLevel||null});}catch{await addProperty(property,token);const p=await getProperty(property,token);out.stages.push({stage:'gsc-property',status:p?.permissionLevel==='siteUnverifiedUser'?'FAIL':'PASS',permissionLevel:p?.permissionLevel||null});}
const sitemaps=site.sitemaps?.length?site.sitemaps:await discoverSitemaps(site.baseUrl);if(!sitemaps.length){out.status='PARTIAL';out.stages.push({stage:'sitemaps',status:'PARTIAL',error:'no_reachable_sitemap_found'});return out;}for(const sm of sitemaps)await submitSitemap(property,sm,token);out.stages.push({stage:'sitemaps',status:'PASS',count:sitemaps.length,sitemaps});out.status=out.stages.some(x=>x.status==='FAIL'||x.status==='BLOCKED')?'FAIL':out.stages.some(x=>x.status==='PARTIAL')?'PARTIAL':'PASS';return out;}
async function reconcile(){const cfg=await portfolio();const token=await googleToken();const entries=await gscSites(token);const sites=[];for(const site of cfg.sites||[]){try{sites.push(await reconcileOne(site,token,entries));}catch(e){sites.push({name:site.name,baseUrl:site.baseUrl,status:'FAIL',error:e.message,stages:[]});}}const report={generatedAt:new Date().toISOString(),summary:{pass:sites.filter(x=>x.status==='PASS').length,partial:sites.filter(x=>x.status==='PARTIAL').length,fail:sites.filter(x=>x.status==='FAIL').length,excluded:sites.filter(x=>x.status==='EXCLUDED').length},sites};await writeJson(REPORT_STORE,report);return report;}
async function googleConfigured(){return oauthReady()&&Boolean(process.env.GOOGLE_REFRESH_TOKEN||(await storedGoogle())?.refresh_token||process.env.GOOGLE_ACCESS_TOKEN);}
async function app(req,res){const u=new URL(req.url,ORIGIN());if(u.pathname==='/health'){const cfg=await portfolio();return json(res,200,{ok:true,version:'2.1.0',portfolioSites:cfg.sites.length,oauthClientConfigured:oauthReady(),googleAuthorized:await googleConfigured(),tokenStore:STORE,reportStore:REPORT_STORE});}
if(u.pathname==='/portfolio'){const cfg=await portfolio();return json(res,200,cfg);}
if(u.pathname==='/status'){return json(res,200,await readJson(REPORT_STORE,{status:'NO_REPORT_YET'}));}
if(u.pathname==='/performance'){
  try{
    const site=await portfolioSiteByInput(u.searchParams.get('site'));
    const token=await googleToken();
    const property=desiredProperty(site);
    const window=performanceWindow(u.searchParams.get('days'));
    const data=await searchAnalytics(property,token,{...window,dimensions:['query','page'],rowLimit:Math.min(25000,Math.max(1,Number(u.searchParams.get('limit')||1000)))});
    return json(res,200,{status:'PASS',site:site.name,property,window,rows:data?.rows||[]});
  }catch(e){return json(res,503,{status:'UNVERIFIED',error:e.message});}
}
if(u.pathname==='/opportunities'){
  try{
    const site=await portfolioSiteByInput(u.searchParams.get('site'));
    const token=await googleToken();
    const property=desiredProperty(site);
    const window=performanceWindow(u.searchParams.get('days'));
    const data=await searchAnalytics(property,token,{...window,dimensions:['query','page'],rowLimit:25000});
    const rows=opportunityRows(data?.rows||[]).slice(0,Math.min(1000,Math.max(1,Number(u.searchParams.get('limit')||200))));
    return json(res,200,{status:'PASS',site:site.name,property,window,count:rows.length,rows});
  }catch(e){return json(res,503,{status:'UNVERIFIED',error:e.message});}
}
if(u.pathname==='/inspect'){
  try{
    const inspectionUrl=String(u.searchParams.get('url')||'').trim();
    if(!/^https?:\/\//i.test(inspectionUrl))throw new Error('valid_url_required');
    const site=await portfolioSiteByInput(u.searchParams.get('site')||new URL(inspectionUrl).hostname);
    if(new URL(inspectionUrl).hostname.replace(/^www\./,'')!==domainOf(site.baseUrl))throw new Error('url_outside_portfolio_site');
    const token=await googleToken();
    const property=desiredProperty(site);
    const result=await inspectUrl(property,inspectionUrl,token);
    return json(res,200,{status:'PASS',site:site.name,property,inspectionUrl,result:result?.inspectionResult||result});
  }catch(e){return json(res,503,{status:'UNVERIFIED',error:e.message});}
}
if(u.pathname==='/start'){try{if(!oauthReady())throw new Error('google_oauth_client_not_configured');const q=new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID,redirect_uri:ORIGIN()+'/callback/google',response_type:'code',access_type:'offline',prompt:'consent',include_granted_scopes:'true',scope:SCOPES.join(' '),state:state()});res.writeHead(302,{location:'https://accounts.google.com/o/oauth2/v2/auth?'+q,'cache-control':'no-store'});return res.end();}catch(e){return json(res,503,{status:'CONFIG_PENDING',error:e.message});}}
if(u.pathname==='/callback/google'){try{if(u.searchParams.get('error'))throw new Error('google_denied');verifyState(u.searchParams.get('state'));const code=u.searchParams.get('code');if(!code)throw new Error('google_code_missing');const body=new URLSearchParams({client_id:requireEnv('GOOGLE_CLIENT_ID'),client_secret:requireEnv('GOOGLE_CLIENT_SECRET'),code,redirect_uri:ORIGIN()+'/callback/google',grant_type:'authorization_code'});const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});const j=await r.json();if(!r.ok||!j.access_token)throw new Error(`oauth_token_failed:${j.error_description||j.error||r.status}`);if(!j.refresh_token&&!process.env.GOOGLE_REFRESH_TOKEN)throw new Error('oauth_missing_refresh_token');if(j.refresh_token)await saveGoogle({refresh_token:j.refresh_token,scope:j.scope||SCOPES.join(' '),savedAt:new Date().toISOString()});const report=await reconcile();return page(res,200,'ASTRA GSC Bridge connecté',`<p><strong>OAuth PASS.</strong> Réconciliation portefeuille exécutée.</p><pre>${htmlEsc(JSON.stringify(report.summary,null,2))}</pre><p><a href="/status">Voir le rapport</a></p>`);}catch(e){return page(res,400,'ASTRA GSC Bridge incomplet',`<p><strong>FAIL fermé</strong>: <code>${htmlEsc(e.message)}</code></p>`);}}
if(u.pathname==='/reconcile'&&req.method==='POST'){try{return json(res,200,await reconcile());}catch(e){return json(res,503,{status:'FAIL',error:e.message});}}
if(u.pathname==='/'){const h=await googleConfigured();return page(res,200,'ASTRA GSC Bridge Ω',`<p>Version portefeuille 2.1 · performance GSC + opportunités + inspection URL.</p><p>Google OAuth client: <strong>${oauthReady()?'CONFIGURED':'MISSING'}</strong><br>Autorisation durable: <strong>${h?'READY':'MISSING'}</strong></p><p><a href="/portfolio">Portfolio</a> · <a href="/status">Dernier rapport</a>${oauthReady()?' · <a href="/start">Autoriser Google une fois</a>':''}</p>`);}
return json(res,404,{error:'not_found'});}

http.createServer((req,res)=>app(req,res).catch(e=>{console.error(e);if(!res.headersSent)json(res,500,{error:'internal_error'});else res.end();})).listen(PORT,'0.0.0.0',()=>console.log(`ASTRA GSC Bridge Ω v2 listening on ${PORT}`));

if(process.env.ASTRA_RECONCILE_INTERVAL_MS){const ms=Math.max(3600000,Number(process.env.ASTRA_RECONCILE_INTERVAL_MS)||21600000);setInterval(()=>reconcile().catch(e=>console.error('reconcile',e.message)),ms).unref();}
