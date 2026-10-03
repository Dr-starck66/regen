import { spawn } from 'node:child_process';

const port=4107;
const child=spawn(process.execPath,['server.js'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
const base='http://127.0.0.1:'+port;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const articleSlugs=[
  'divorce-belgique','aide-juridique-pro-deo-belgique','avocat-droit-des-etrangers-belgique',
  'licenciement-droit-travail-belgique','succession-avocat-belgique','avocat-droit-penal-belgique',
  'avocat-droit-roulage-belgique','avocat-droit-immobilier-belgique','avocat-bail-location-belgique',
  'avocat-droit-affaires-belgique','mediation-belgique','avocat-construction-belgique',
  'avocat-marches-publics-belgique','avocat-accident-route-assurance-belgique',
  'adoption-filiation-avocat-belgique','avocat-droit-famille-belgique'
];
const citySlugs=['bruxelles','liege','charleroi','namur','mons'];
const legacy={
  '/liste/avocat-au-barreau-de-bruxelles-me-souade-atori/':'/articles/avocat-droit-famille-belgique',
  '/liste/me-atori-avocat-en-droit-de-la-famille-a-bruxelles/':'/articles/divorce-belgique',
  '/liste/maitre-caroline-crappe-avocat-mediateur-au-barreau-de-namur/':'/articles/mediation-belgique',
  '/liste/avocats-huysmans-en-droit-de-la-famille-a-malines-pres-de-bruxelles-anvers/':'/articles/avocat-droit-famille-belgique',
  '/liste/cabinet-davocat-de-me-alexandris-a-schaerbeek/':'/articles/avocat-droit-penal-belgique',
  '/liste/maitre-balapukayi-kamba-avocat-en-droit-des-etrangers-a-bruxelles/':'/articles/avocat-droit-des-etrangers-belgique',
  '/liste/maitre-kamaba-avocat-en-droit-des-etrangers-a-bruxelles/':'/articles/avocat-droit-des-etrangers-belgique',
  '/liste/maitre-chloe-fricke-avocat-a-mons-et-quievrain/':'/articles/avocat-droit-roulage-belgique',
  '/liste/maitre-eric-jacobs-avocat-en-droit-des-affaires-a-bruxelles/':'/articles/avocat-droit-affaires-belgique',
  '/liste/maitre-francois-leboutte-avocat-en-droit-familial-a-dinant/':'/articles/avocat-droit-famille-belgique',
  '/liste/maitre-marine-ysebaert-avocat-en-droit-de-la-famille-a-dour-pres-de-mons/':'/articles/avocat-droit-famille-belgique',
  '/liste/maitre-jessica-dallapiccola-avocat-a-tamines-proche-namur/':'/articles/avocat-construction-belgique',
  '/liste/maitre-philippe-barbier-avocat-en-droit-de-la-famille-et-divorce-a-ixelles-bruxelles/':'/articles/divorce-belgique',
  '/liste/maitre-cyrille-dony-avocat-en-droit-des-marches-publics-et-droit-administratif-a-waterloo-bruxelles/':'/articles/avocat-marches-publics-belgique',
  '/liste/wpbdp_tag/droit-des-etrangers/':'/articles/avocat-droit-des-etrangers-belgique',
  '/liste/wpbdp_tag/droit-de-roulage/':'/articles/avocat-droit-roulage-belgique'
};

async function wait(){
  for(let i=0;i<50;i++){try{const r=await fetch(base+'/health');if(r.ok)return;}catch{} await sleep(150);}
  throw new Error('server did not become healthy');
}
function count(text,needle){return text.split(needle).length-1;}
function visibleWords(html){
  const text=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&[a-z#0-9]+;/gi,' ').replace(/\s+/g,' ').trim();
  return text?text.split(' ').filter(Boolean).length:0;
}

try{
  await wait();
  const health=await (await fetch(base+'/health')).json();
  if(!health.ok||health.service!=='avocat-belgique'||health.version!=='2.0.0') throw new Error('bad health contract');

  const core=['/','/methodologie','/a-propos','/politique-editoriale','/sources','/mentions-legales'];
  const editorial=[...citySlugs.map(s=>'/avocat/'+s),...articleSlugs.map(s=>'/articles/'+s)];
  for(const path of [...core,...editorial]){
    const r=await fetch(base+path);
    const html=await r.text();
    if(r.status!==200) throw new Error(path+' not 200');
    if(count(html,'<h1>')!==1) throw new Error(path+' must have one H1');
    if(!html.includes('<link rel="canonical" href="https://avocat-belgique.com')) throw new Error(path+' missing canonical');
    if(!html.includes('application/ld+json')) throw new Error(path+' missing schema');
    if(!html.includes('name="description"')) throw new Error(path+' missing description');
    if(!html.includes('justice-belgique.svg')) throw new Error(path+' missing image');
    if(!/<img[^>]+justice-belgique\.svg[^>]+width="1280"[^>]+height="720"/i.test(html)) throw new Error(path+' hero must expose real 1280x720 dimensions');
    if(!html.includes('property="og:image:width" content="1280"')) throw new Error(path+' missing og image width');
    if(editorial.includes(path)){
      const wc=visibleWords(html);
      console.log('WORDCOUNT',path,wc);
      if(wc<1500) throw new Error(path+' only '+wc+' visible words, minimum is 1500');
    }
  }

  for(const [oldPath,target] of Object.entries(legacy)){
    const r=await fetch(base+oldPath,{redirect:'manual'});
    if(r.status!==301) throw new Error(oldPath+' should return 301, got '+r.status);
    if(r.headers.get('location')!==target) throw new Error(oldPath+' wrong redirect '+r.headers.get('location'));
  }

  const robots=await (await fetch(base+'/robots.txt')).text();
  if(!robots.includes('Sitemap: https://avocat-belgique.com/sitemap.xml')) throw new Error('robots missing sitemap');
  const sitemap=await (await fetch(base+'/sitemap.xml')).text();
  for(const path of editorial) if(!sitemap.includes('https://avocat-belgique.com'+path)) throw new Error('sitemap missing '+path);
  if((sitemap.match(/<url>/g)||[]).length<27) throw new Error('sitemap too small');

  const missing=await fetch(base+'/definitely-missing');
  const mh=await missing.text();
  if(missing.status!==404||!mh.includes('noindex,follow')) throw new Error('404 contract failed');

  console.log('ASTRA_SITE_TEST_PASS',{
    articles:articleSlugs.length,
    cityPages:citySlugs.length,
    legacyRedirects:Object.keys(legacy).length,
    sitemapUrls:(sitemap.match(/<url>/g)||[]).length
  });
} finally {
  child.kill('SIGTERM');
}
