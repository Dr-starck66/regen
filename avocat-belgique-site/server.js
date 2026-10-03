import http from 'node:http';

const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';
const ORIGIN = 'https://avocat-belgique.com';

const cities = {
  bruxelles: { name:'Bruxelles', intro:"Trouver un avocat à Bruxelles commence par identifier la matière juridique concernée, le niveau d'urgence et la langue de travail souhaitée. Ce guide indépendant aide à préparer cette recherche sans recommander ni classer les professionnels." },
  liege: { name:'Liège', intro:"À Liège, le bon point de départ est de définir le type de dossier avant de contacter un avocat : famille, travail, pénal, succession, logement ou autre matière. Cette page fournit une méthode de recherche et des sources officielles." },
  charleroi: { name:'Charleroi', intro:"Pour chercher un avocat à Charleroi, mieux vaut distinguer la matière juridique, le degré d'urgence et les documents disponibles. Ce guide donne une méthode structurée et renvoie vers des annuaires professionnels." },
  namur: { name:'Namur', intro:"À Namur, comparer des avocats signifie surtout vérifier leur domaine de pratique, leur disponibilité et les modalités de consultation. Cette page présente les questions à poser avant un premier rendez-vous." },
  mons: { name:'Mons', intro:"La recherche d'un avocat à Mons gagne à être préparée : objet du litige, chronologie, pièces et objectif recherché. Le site ne classe pas les avocats et privilégie les sources professionnelles vérifiables." }
};

const practices = {
  divorce: { name:'Divorce', intro:"Un dossier de divorce peut impliquer des questions distinctes : procédure, résidence des enfants, contributions financières, logement familial et partage patrimonial. Un avocat peut préciser quelles règles s'appliquent à votre situation." },
  'droit-des-etrangers': { name:"Droit des étrangers", intro:"Les démarches de séjour, nationalité, regroupement familial ou recours administratifs sont sensibles aux délais et aux pièces justificatives. Cette page aide à préparer la recherche d'un avocat compétent sans fournir de conseil juridique individualisé." },
  succession: { name:'Succession', intro:"Une succession peut soulever des questions de partage, testament, dettes, indivision ou conflit entre héritiers. L'objectif de cette page est d'aider à structurer les informations à réunir avant de consulter un professionnel." },
  'droit-du-travail': { name:'Droit du travail', intro:"Licenciement, rémunération, contrat, harcèlement, incapacité ou statut professionnel peuvent nécessiter une analyse juridique contextualisée. Cette page présente une méthode pour chercher un avocat en droit du travail en Belgique." },
  'droit-penal': { name:'Droit pénal', intro:"En matière pénale, les délais, la nature de la procédure et le stade du dossier peuvent être déterminants. En cas d'urgence, il est préférable de contacter rapidement un avocat ou un service officiel plutôt que de se fier à une information générale en ligne." }
};

const nav = [
  ['/', 'Accueil'], ['/avocat/bruxelles','Bruxelles'], ['/avocat/liege','Liège'],
  ['/specialites/divorce','Divorce'], ['/specialites/droit-des-etrangers','Étrangers'],
  ['/methodologie','Méthodologie'], ['/a-propos','À propos']
];

function esc(s=''){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function canonical(path){ return ORIGIN + (path === '/' ? '/' : path); }
function breadcrumb(path, label){
  const items=[{name:'Accueil',item:ORIGIN+'/'},{name:label,item:canonical(path)}];
  return { '@context':'https://schema.org','@type':'BreadcrumbList','itemListElement':items.map((x,i)=>({'@type':'ListItem','position':i+1,'name':x.name,'item':x.item})) };
}
function schema(path,title,description,label){
  return [
    {'@context':'https://schema.org','@type':'WebPage','name':title,'url':canonical(path),'description':description,'isPartOf':{'@type':'WebSite','name':'Avocat Belgique','url':ORIGIN+'/'},'inLanguage':'fr-BE'},
    breadcrumb(path,label)
  ];
}
function layout({path='/',title,description,h1,body,label='Accueil',robots='index,follow'}){
  const json = JSON.stringify(schema(path,title,description,label)).replace(/</g,'\\u003c');
  return `<!doctype html><html lang="fr-BE"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="${robots}">
<link rel="canonical" href="${canonical(path)}"><meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical(path)}">
<meta property="og:image" content="${ORIGIN}/assets/justice-belgique.svg"><script type="application/ld+json">${json}</script>
<style>
:root{--ink:#152238;--muted:#5e6b7a;--bg:#f6f8fb;--card:#fff;--accent:#163c74;--gold:#b58b34;--line:#dfe5ec}
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--ink);background:var(--bg);line-height:1.65}a{color:var(--accent)}header{background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:3}.wrap{max-width:1120px;margin:auto;padding:0 22px}.top{display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:72px}.brand{font-weight:800;text-decoration:none;color:var(--ink);font-size:1.15rem}.brand span{color:var(--gold)}nav{display:flex;gap:14px;flex-wrap:wrap}nav a{text-decoration:none;font-size:.94rem}.hero{padding:64px 0 34px;background:linear-gradient(180deg,#fff,#f6f8fb)}.hero-grid{display:grid;grid-template-columns:1.25fr .75fr;gap:32px;align-items:center}.hero img{width:100%;max-height:290px}.eyebrow{font-size:.82rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--gold)}h1{font-size:clamp(2rem,5vw,3.6rem);line-height:1.08;margin:.3rem 0 1rem}h2{font-size:1.55rem;margin:2.1rem 0 .6rem}h3{font-size:1.1rem;margin:1.3rem 0 .35rem}.lead{font-size:1.16rem;color:var(--muted);max-width:760px}.notice,.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px}.notice{border-left:4px solid var(--gold)}main{padding:28px 0 64px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.card h3{margin-top:0}.pill{display:inline-block;padding:5px 10px;border-radius:999px;background:#eaf0f9;font-size:.82rem;font-weight:700}.cta{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;padding:11px 16px;border-radius:10px;font-weight:700}.source{font-size:.92rem;color:var(--muted)}footer{border-top:1px solid var(--line);background:#fff;padding:30px 0;color:var(--muted)}ul{padding-left:20px}@media(max-width:800px){.hero-grid,.grid{grid-template-columns:1fr}.top{align-items:flex-start;padding:14px 0}nav{display:none}}
</style></head><body>
<header><div class="wrap top"><a class="brand" href="/">Avocat <span>Belgique</span></a><nav>${nav.map(([u,n])=>`<a href="${u}">${n}</a>`).join('')}</nav></div></header>
<section class="hero"><div class="wrap hero-grid"><div><div class="eyebrow">Guide indépendant • Belgique</div><h1>${h1}</h1><p class="lead">${description}</p></div><img src="/assets/justice-belgique.svg" alt="Illustration abstraite de la justice et de la Belgique" width="640" height="360"></div></section>
<main><div class="wrap">${body}</div></main>
<footer><div class="wrap">Avocat-Belgique.com est un guide indépendant. Il ne constitue pas un cabinet d'avocats, ne fournit pas de conseil juridique personnalisé et ne classe pas les avocats. <a href="/mentions-legales">Mentions légales</a> · <a href="/politique-editoriale">Politique éditoriale</a> · <a href="/sources">Sources</a></div></footer></body></html>`;
}

const commonGuide = `
<section class="notice"><strong>À savoir :</strong> les informations publiées ici sont générales. Une situation concrète peut dépendre de faits, délais et documents qui nécessitent l'analyse d'un professionnel.</section>
<h2>Comment préparer votre recherche</h2>
<p>Commencez par résumer votre situation en quelques lignes : ce qui s'est passé, les dates importantes, les personnes ou organismes impliqués et ce que vous souhaitez obtenir. Rassemblez ensuite les documents principaux, sans envoyer spontanément de données sensibles à un site non officiel. Lors d'un premier contact avec un avocat, demandez si la matière entre dans son champ de pratique, sous quel délai il peut examiner le dossier et comment sont calculés les honoraires.</p>
<h3>Vérifier le professionnel</h3>
<p>Avant de confier un dossier, vérifiez l'identité et l'inscription professionnelle de l'avocat via les annuaires des barreaux. Pour la Belgique francophone et germanophone, le portail <a href="https://avocats.be/" rel="nofollow noopener">AVOCATS.BE</a> fournit des informations institutionnelles. Pour les recherches couvrant la partie néerlandophone du pays, <a href="https://www.advocaat.be/fr/chercher-un-avocat" rel="nofollow noopener">Advocaat.be</a> propose également un annuaire.</p>
<h3>Questions utiles avant le rendez-vous</h3>
<ul><li>Traitez-vous régulièrement ce type de dossier ?</li><li>Quels documents faut-il préparer ?</li><li>Existe-t-il un délai ou une échéance proche ?</li><li>Comment les honoraires et frais sont-ils calculés ?</li><li>Quelles sont les prochaines étapes probables ?</li></ul>
<h2>Ce que ce guide fait — et ne fait pas</h2>
<p>Avocat-Belgique.com organise des informations de recherche, des listes de questions et des liens vers des sources professionnelles. Le site ne promet aucun résultat, ne désigne pas un « meilleur avocat » et ne remplace pas une consultation. Les pages locales et thématiques sont conçues pour aider un lecteur à comprendre quel type de professionnel rechercher et comment vérifier les informations avant de prendre une décision.</p>`;

function cityPage(slug, c){
  const path='/avocat/'+slug;
  const title=`Avocat à ${c.name} : trouver un professionnel en Belgique`;
  const desc=`Guide pour chercher un avocat à ${c.name} : spécialités, préparation du premier rendez-vous, vérifications et annuaires professionnels.`;
  const body=`<p class="lead">${c.intro}</p>${commonGuide}
<h2>Domaines fréquemment recherchés</h2><div class="grid">
<div class="card"><span class="pill">Famille</span><h3>Divorce et séparation</h3><p>Préparer la chronologie, les éventuelles décisions existantes et les questions relatives aux enfants, au logement et aux finances.</p><a href="/specialites/divorce">Voir le guide divorce</a></div>
<div class="card"><span class="pill">Séjour</span><h3>Droit des étrangers</h3><p>Identifier le type de démarche, la décision reçue et la date de notification avant de contacter un professionnel.</p><a href="/specialites/droit-des-etrangers">Voir le guide</a></div>
<div class="card"><span class="pill">Travail</span><h3>Relations de travail</h3><p>Contrat, courriers, fiches de paie et chronologie des faits sont souvent les premières pièces utiles à réunir.</p><a href="/specialites/droit-du-travail">Voir le guide</a></div></div>
<h2>Autres villes</h2><p>${Object.entries(cities).filter(([s])=>s!==slug).map(([s,x])=>`<a href="/avocat/${s}">Avocat ${x.name}</a>`).join(' · ')}</p>`;
  return layout({path,title,description:desc,h1:`Trouver un avocat à ${c.name}`,body,label:`Avocat ${c.name}`});
}

function practicePage(slug,p){
  const path='/specialites/'+slug;
  const title=`Avocat en ${p.name} en Belgique : guide de recherche`;
  const desc=`Comment chercher un avocat en ${p.name.toLowerCase()} en Belgique, préparer les documents utiles et vérifier les sources professionnelles.`;
  const body=`<p class="lead">${p.intro}</p>${commonGuide}
<h2>Choisir une recherche locale</h2><p>Une fois la matière identifiée, vous pouvez cibler une ville : ${Object.entries(cities).map(([s,x])=>`<a href="/avocat/${s}">${x.name}</a>`).join(' · ')}. La proximité peut être utile, mais elle ne remplace pas l'adéquation entre le dossier et le domaine de pratique du professionnel.</p>
<h2>Éviter les comparaisons trompeuses</h2><p>Un classement automatique ou une promesse de résultat ne permet pas d'évaluer correctement une situation juridique. Nous privilégions des critères vérifiables : inscription professionnelle, domaine de pratique annoncé, modalités de contact, clarté sur les honoraires et capacité à traiter le dossier dans les délais.</p>`;
  return layout({path,title,description:desc,h1:`Avocat en ${p.name} en Belgique`,body,label:p.name});
}

function home(){
  const cards=Object.entries(practices).slice(0,3).map(([s,p])=>`<div class="card"><span class="pill">Spécialité</span><h3>${p.name}</h3><p>${p.intro}</p><a href="/specialites/${s}">Ouvrir le guide</a></div>`).join('');
  const body=`<section class="notice"><strong>Guide indépendant :</strong> notre objectif est de rendre la recherche d'un avocat plus claire, sans vendre un classement ni prétendre qu'un professionnel convient à toutes les situations.</section>
<h2>Rechercher par ville</h2><div class="grid">${Object.entries(cities).slice(0,3).map(([s,c])=>`<div class="card"><h3>Avocat à ${c.name}</h3><p>${c.intro}</p><a href="/avocat/${s}">Voir le guide local</a></div>`).join('')}</div>
<h2>Rechercher par matière</h2><div class="grid">${cards}</div>
<h2>Une méthode fondée sur des sources vérifiables</h2><p>Nous privilégions les annuaires institutionnels, les informations publiées par les barreaux et les sources officielles lorsqu'elles sont disponibles. Une fiche ou une page thématique ne vaut jamais vérification de l'inscription professionnelle. Notre <a href="/methodologie">méthodologie</a> explique comment les pages sont structurées et mises à jour.</p>
<h2>Avant de contacter un avocat</h2><p>Préparez une chronologie courte, la liste de vos documents et les éventuelles échéances. Pour un sujet urgent, une décision de justice ou un délai de recours, contactez rapidement un professionnel ou un service officiel plutôt que d'attendre une réponse d'un guide en ligne.</p>`;
  return layout({path:'/',title:'Avocat Belgique : guide pour trouver un avocat',description:'Guide indépendant pour chercher un avocat en Belgique par ville et par matière, préparer un premier rendez-vous et vérifier les sources professionnelles.',h1:'Trouver un avocat en Belgique',body});
}

const staticPages = {
  '/methodologie': {
    title:'Méthodologie éditoriale | Avocat Belgique', h1:'Notre méthodologie',
    description:'Comment Avocat-Belgique.com construit ses guides, vérifie ses sources et évite les classements trompeurs.',
    body:`<h2>Sources prioritaires</h2><p>Nous privilégions les ordres et barreaux, les administrations, les textes officiels et les sites institutionnels. Les sources commerciales peuvent être utilisées pour comprendre l'offre existante, mais ne déterminent pas seules le contenu.</p><h2>Pas de classement automatique</h2><p>Nous ne publions pas de palmarès du « meilleur avocat ». Les besoins varient selon la matière, les faits, les délais et la relation de travail recherchée.</p><h2>Actualisation</h2><p>Les pages sont révisées lorsque des informations structurelles changent ou lorsqu'une source importante devient obsolète. Une date récente ne garantit toutefois pas qu'un texte général s'applique à une situation individuelle.</p><h2>Corrections</h2><p>Une erreur factuelle signalée doit être vérifiée à partir d'une source primaire ou professionnelle avant correction. Nous distinguons les informations générales des contenus promotionnels et nous indiquons les limites de nos pages.</p>`
  },
  '/a-propos': {
    title:'À propos | Avocat Belgique', h1:'À propos d’Avocat-Belgique.com',
    description:'Présentation du guide indépendant Avocat-Belgique.com et de sa mission.',
    body:`<h2>Un guide de recherche, pas un cabinet</h2><p>Avocat-Belgique.com aide les internautes à organiser leur recherche d'un professionnel du droit en Belgique. Le site n'est ni un cabinet d'avocats ni un service public.</p><h2>Objectif</h2><p>Notre objectif est de rendre plus lisibles les critères utiles : domaine de pratique, localisation, disponibilité, préparation du premier contact et vérification de l'inscription professionnelle.</p><h2>Indépendance</h2><p>Une éventuelle relation commerciale future avec un professionnel devra être identifiée clairement et ne pourra pas transformer un contenu sponsorisé en recommandation éditoriale déguisée.</p>`
  },
  '/politique-editoriale': {
    title:'Politique éditoriale | Avocat Belgique', h1:'Politique éditoriale',
    description:'Principes éditoriaux, séparation des contenus et règles de transparence du site.',
    body:`<h2>Exactitude et transparence</h2><p>Les affirmations factuelles doivent pouvoir être rattachées à une source identifiable. Nous évitons les promesses de résultat, les comparaisons non vérifiables et les formulations susceptibles de faire croire qu'un avocat est recommandé par une autorité.</p><h2>Contenus commerciaux</h2><p>Les contenus sponsorisés ou partenariats seront signalés. Ils ne modifient pas les critères de vérification appliqués aux pages éditoriales.</p><h2>Données personnelles</h2><p>Le site public est conçu pour ne pas demander aux visiteurs de publier des détails sensibles sur leur dossier. Un futur formulaire devra limiter les données collectées au strict nécessaire.</p>`
  },
  '/sources': {
    title:'Sources et annuaires officiels | Avocat Belgique', h1:'Sources utiles',
    description:'Sources professionnelles et institutionnelles pour vérifier un avocat en Belgique.',
    body:`<h2>Annuaires professionnels</h2><p><a href="https://avocats.be/" rel="nofollow noopener">AVOCATS.BE</a> représente les barreaux francophones et germanophone. <a href="https://www.advocaat.be/fr/chercher-un-avocat" rel="nofollow noopener">Advocaat.be</a> permet également de rechercher un avocat.</p><h2>Pourquoi vérifier à la source</h2><p>Un nom trouvé dans un moteur de recherche, une publicité ou un annuaire privé ne suffit pas à confirmer une inscription professionnelle ou une spécialisation reconnue. Pour une vérification importante, consultez directement le barreau ou l'ordre compétent.</p>`
  },
  '/mentions-legales': {
    title:'Mentions légales | Avocat Belgique', h1:'Mentions légales',
    description:'Informations légales et limites du service Avocat-Belgique.com.',
    body:`<h2>Nature du service</h2><p>Avocat-Belgique.com est un guide d'information indépendant. Il ne fournit pas de consultation juridique et ne crée aucune relation avocat-client.</p><h2>Responsabilité</h2><p>Les informations générales peuvent devenir obsolètes ou ne pas correspondre à une situation particulière. Les utilisateurs doivent vérifier les informations importantes auprès d'une source officielle ou d'un professionnel qualifié.</p><h2>Éditeur</h2><p>Les informations d'identification complètes de l'éditeur seront publiées avant l'ouverture commerciale du site. Cette version constitue une mise en ligne technique et éditoriale initiale.</p>`
  }
};

function svg(){
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" rx="36" fill="#eef3f8"/><path d="M640 140v390M480 230h320M530 230l-95 185h190L530 230Zm220 0-95 185h190L750 230Z" stroke="#163c74" stroke-width="28" fill="none" stroke-linejoin="round"/><path d="M470 540h340" stroke="#b58b34" stroke-width="34" stroke-linecap="round"/><circle cx="640" cy="140" r="34" fill="#b58b34"/></svg>`;
}
function sitemap(){
  const paths=['/',...Object.keys(cities).map(x=>'/avocat/'+x),...Object.keys(practices).map(x=>'/specialites/'+x),...Object.keys(staticPages)];
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p=>`<url><loc>${canonical(p)}</loc><changefreq>${p==='/'?'weekly':'monthly'}</changefreq></url>`).join('')}</urlset>`;
}

function handler(req,res){
  const url=new URL(req.url,'http://localhost');
  const path=url.pathname.replace(/\/+$/,'') || '/';
  if(path==='/health'){ res.writeHead(200,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}); return res.end(JSON.stringify({ok:true,service:'avocat-belgique',version:'1.0.0'})); }
  if(path==='/robots.txt'){ res.writeHead(200,{'content-type':'text/plain; charset=utf-8'}); return res.end(`User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`); }
  if(path==='/sitemap.xml'){ res.writeHead(200,{'content-type':'application/xml; charset=utf-8'}); return res.end(sitemap()); }
  if(path==='/assets/justice-belgique.svg'){ res.writeHead(200,{'content-type':'image/svg+xml','cache-control':'public,max-age=604800'}); return res.end(svg()); }
  let html=null;
  if(path==='/') html=home();
  else if(path.startsWith('/avocat/') && cities[path.split('/')[2]]) html=cityPage(path.split('/')[2],cities[path.split('/')[2]]);
  else if(path.startsWith('/specialites/') && practices[path.split('/')[2]]) html=practicePage(path.split('/')[2],practices[path.split('/')[2]]);
  else if(staticPages[path]){ const p=staticPages[path]; html=layout({path,title:p.title,description:p.description,h1:p.h1,body:p.body,label:p.h1}); }
  if(html){ res.writeHead(200,{'content-type':'text/html; charset=utf-8','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','x-frame-options':'SAMEORIGIN'}); return res.end(html); }
  const notFound=layout({path,title:'Page introuvable | Avocat Belgique',description:'La page demandée est introuvable.',h1:'Page introuvable',body:'<p>Cette URL ne correspond à aucune page publiée. Retournez à <a href="/">l’accueil</a>.</p>',label:'Page introuvable',robots:'noindex,follow'});
  res.writeHead(404,{'content-type':'text/html; charset=utf-8'}); res.end(notFound);
}

const server=http.createServer(handler);
server.listen(PORT,HOST,()=>console.log(`avocat-belgique listening on ${HOST}:${PORT}`));
