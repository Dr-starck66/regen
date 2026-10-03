import { spawn } from 'node:child_process';

const port=4107;
const child=spawn(process.execPath,['server.js'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
const base='http://127.0.0.1:'+port;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function wait(){
  for(let i=0;i<40;i++){ try{const r=await fetch(base+'/health'); if(r.ok)return;}catch{} await sleep(150); }
  throw new Error('server did not become healthy');
}
function count(text,needle){ return text.split(needle).length-1; }

try{
  await wait();
  const health=await (await fetch(base+'/health')).json();
  if(!health.ok||health.service!=='avocat-belgique') throw new Error('bad health contract');

  const routes=['/','/avocat/bruxelles','/avocat/liege','/avocat/charleroi','/avocat/namur','/avocat/mons','/specialites/divorce','/specialites/droit-des-etrangers','/specialites/succession','/specialites/droit-du-travail','/specialites/droit-penal','/methodologie','/a-propos','/politique-editoriale','/sources','/mentions-legales'];
  for(const path of routes){
    const r=await fetch(base+path);
    const html=await r.text();
    if(r.status!==200) throw new Error(path+' not 200');
    if(count(html,'<h1>')!==1) throw new Error(path+' must have one H1');
    if(!html.includes('<link rel="canonical" href="https://avocat-belgique.com')) throw new Error(path+' missing canonical');
    if(!html.includes('application/ld+json')) throw new Error(path+' missing schema');
    if(!html.includes('name="description"')) throw new Error(path+' missing description');
    if(!html.includes('justice-belgique.svg')) throw new Error(path+' missing image');
  }
  const robots=await (await fetch(base+'/robots.txt')).text();
  if(!robots.includes('Sitemap: https://avocat-belgique.com/sitemap.xml')) throw new Error('robots missing sitemap');
  const sitemap=await (await fetch(base+'/sitemap.xml')).text();
  for(const path of routes) if(!sitemap.includes('https://avocat-belgique.com'+(path==='/'?'/':path))) throw new Error('sitemap missing '+path);
  const missing=await fetch(base+'/definitely-missing');
  const mh=await missing.text();
  if(missing.status!==404||!mh.includes('noindex,follow')) throw new Error('404 contract failed');
  console.log('ASTRA_SITE_TEST_PASS',routes.length,'routes');
} finally {
  child.kill('SIGTERM');
}
