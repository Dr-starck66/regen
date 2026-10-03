import http from 'node:http';
import { readFileSync } from 'node:fs';

const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';
const ORIGIN = 'https://avocat-belgique.com';
const articles = JSON.parse(readFileSync(new URL('./articles.json', import.meta.url),'utf8'));

const cities = {
  bruxelles: { name:'Bruxelles', intro:"Trouver un avocat à Bruxelles commence par identifier la matière juridique concernée, le niveau d'urgence et la langue de travail souhaitée. Ce guide indépendant aide à préparer cette recherche sans recommander ni classer les professionnels." },
  liege: { name:'Liège', intro:"À Liège, le bon point de départ est de définir le type de dossier avant de contacter un avocat : famille, travail, pénal, succession, logement ou autre matière. Cette page fournit une méthode de recherche et des sources officielles." },
  charleroi: { name:'Charleroi', intro:"Pour chercher un avocat à Charleroi, mieux vaut distinguer la matière juridique, le degré d'urgence et les documents disponibles. Ce guide donne une méthode structurée et renvoie vers des annuaires professionnels." },
  namur: { name:'Namur', intro:"À Namur, comparer des avocats signifie surtout vérifier leur domaine de pratique, leur disponibilité et les modalités de consultation. Cette page présente les questions à poser avant un premier rendez-vous." },
  mons: { name:'Mons', intro:"La recherche d'un avocat à Mons gagne à être préparée : objet du litige, chronologie, pièces et objectif recherché. Le site ne classe pas les avocats et privilégie les sources professionnelles vérifiables." }
};

const cityDetails = {
  "bruxelles": {
    "region": "Région de Bruxelles-Capitale",
    "angles": [
      "famille et divorce",
      "droit des étrangers",
      "droit pénal",
      "affaires et sociétés",
      "bail et immobilier"
    ],
    "neighbours": [
      "Ixelles",
      "Schaerbeek",
      "Uccle",
      "Anderlecht",
      "Etterbeek"
    ]
  },
  "liege": {
    "region": "province de Liège",
    "angles": [
      "travail",
      "famille",
      "construction",
      "immobilier",
      "pénal"
    ],
    "neighbours": [
      "Seraing",
      "Herstal",
      "Verviers",
      "Huy",
      "Ans"
    ]
  },
  "charleroi": {
    "region": "province de Hainaut",
    "angles": [
      "famille",
      "travail",
      "roulage",
      "pénal",
      "bail"
    ],
    "neighbours": [
      "Gosselies",
      "Châtelet",
      "Fleurus",
      "Courcelles",
      "Fontaine-l’Évêque"
    ]
  },
  "namur": {
    "region": "province de Namur",
    "angles": [
      "famille",
      "succession",
      "construction",
      "immobilier",
      "médiation"
    ],
    "neighbours": [
      "Dinant",
      "Gembloux",
      "Andenne",
      "Jambes",
      "Sambreville"
    ]
  },
  "mons": {
    "region": "province de Hainaut",
    "angles": [
      "famille",
      "roulage",
      "travail",
      "pénal",
      "succession"
    ],
    "neighbours": [
      "Dour",
      "Quiévrain",
      "Saint-Ghislain",
      "Boussu",
      "Frameries"
    ]
  }
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
<meta property="og:image" content="${ORIGIN}/assets/justice-belgique.svg"><meta property="og:image:width" content="1280"><meta property="og:image:height" content="720"><script type="application/ld+json">${json}</script>
<style>
:root{--ink:#152238;--muted:#5e6b7a;--bg:#f6f8fb;--card:#fff;--accent:#163c74;--gold:#b58b34;--line:#dfe5ec}
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--ink);background:var(--bg);line-height:1.65}a{color:var(--accent)}header{background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:3}.wrap{max-width:1120px;margin:auto;padding:0 22px}.top{display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:72px}.brand{font-weight:800;text-decoration:none;color:var(--ink);font-size:1.15rem}.brand span{color:var(--gold)}nav{display:flex;gap:14px;flex-wrap:wrap}nav a{text-decoration:none;font-size:.94rem}.hero{padding:64px 0 34px;background:linear-gradient(180deg,#fff,#f6f8fb)}.hero-grid{display:grid;grid-template-columns:1.25fr .75fr;gap:32px;align-items:center}.hero img{width:100%;max-height:290px}.eyebrow{font-size:.82rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--gold)}h1{font-size:clamp(2rem,5vw,3.6rem);line-height:1.08;margin:.3rem 0 1rem}h2{font-size:1.55rem;margin:2.1rem 0 .6rem}h3{font-size:1.1rem;margin:1.3rem 0 .35rem}.lead{font-size:1.16rem;color:var(--muted);max-width:760px}.notice,.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px}.notice{border-left:4px solid var(--gold)}main{padding:28px 0 64px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.card h3{margin-top:0}.pill{display:inline-block;padding:5px 10px;border-radius:999px;background:#eaf0f9;font-size:.82rem;font-weight:700}.cta{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;padding:11px 16px;border-radius:10px;font-weight:700}.source{font-size:.92rem;color:var(--muted)}footer{border-top:1px solid var(--line);background:#fff;padding:30px 0;color:var(--muted)}ul{padding-left:20px}@media(max-width:800px){.hero-grid,.grid{grid-template-columns:1fr}.top{align-items:flex-start;padding:14px 0}nav{display:none}}
</style></head><body>
<header><div class="wrap top"><a class="brand" href="/">Avocat <span>Belgique</span></a><nav>${nav.map(([u,n])=>`<a href="${u}">${n}</a>`).join('')}</nav></div></header>
<section class="hero"><div class="wrap hero-grid"><div><div class="eyebrow">Guide indépendant • Belgique</div><h1>${h1}</h1><p class="lead">${description}</p></div><img src="/assets/justice-belgique.svg" alt="Illustration abstraite de la justice et de la Belgique" width="1280" height="720"></div></section>
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

function renderArticleBody(a){
  const sourceItems=(a.sources||[]).map(([name,url])=>`<li><a href="${url}" rel="nofollow noopener">${esc(name)}</a></li>`).join('');
  const sectionHtml=a.sections.map(([title,focus,docs,questions,caution])=>`
<section>
<h2>${esc(title)}</h2>
<p>Le point central de cette étape consiste à ${esc(focus)}. Avant une consultation, transformez le problème en une chronologie courte : dates, décisions, documents reçus, démarches déjà réalisées et résultat recherché. Cette méthode évite de partir d’une impression générale et permet au professionnel de repérer rapidement les éléments qui peuvent modifier l’analyse. Notez aussi ce qui reste incertain : une information manquante clairement identifiée est préférable à une hypothèse présentée comme un fait. Lorsque plusieurs personnes ou organismes sont impliqués, indiquez leur rôle exact et évitez les surnoms ou formulations ambiguës.</p>
<p>Pour cette partie du dossier, préparez en priorité ${esc(docs)}. Classez les pièces dans un ordre logique, idéalement avec un nom de fichier ou un numéro. N’envoyez pas spontanément des centaines de pages : commencez par les documents qui établissent les dates, les engagements et les décisions essentielles. Si plusieurs versions existent, gardez-les toutes et indiquez laquelle a été signée, envoyée ou reçue. Cette discipline permet de repérer les contradictions avant qu’elles ne deviennent un problème pendant une négociation ou une procédure.</p>
<p>Les questions utiles à poser sont notamment : ${esc(questions)}. Demandez également ce qui manque pour donner un avis plus fiable, quel calendrier peut être envisagé et quelles démarches doivent être évitées tant que certains points ne sont pas clarifiés. Une consultation efficace n’est pas celle qui promet un résultat immédiat ; c’est celle qui permet de comprendre les options, les risques, les délais et la prochaine décision concrète à prendre.</p>
<p><strong>Point d’attention :</strong> ${esc(caution)} Si une échéance est proche, signalez-la dès la prise de rendez-vous. Si un document officiel vient d’être reçu, conservez l’enveloppe, le courriel ou tout autre élément permettant d’établir la date de notification. Les délais peuvent dépendre du type de décision et du mode de notification ; ils ne doivent pas être estimés à partir d’un exemple trouvé sur un forum ou d’un dossier qui ressemble seulement en apparence au vôtre.</p>
</section>`).join('');
  return `<p class="lead">${esc(a.overview)}</p>
<section class="notice"><strong>Important :</strong> ce guide explique comment préparer un dossier et choisir les bonnes questions. Il ne fournit pas de conseil juridique personnalisé et ne remplace pas l’analyse d’un avocat ayant accès aux pièces complètes.</section>
<h2>Avant de chercher un avocat : définir l’objectif réel</h2>
<p>Commencez par écrire, en deux ou trois phrases, ce que vous voulez obtenir. Beaucoup de dossiers deviennent confus parce que plusieurs objectifs sont mélangés : comprendre ses droits, répondre à un courrier, négocier un accord, faire cesser une situation, obtenir une indemnisation ou se défendre dans une procédure. Le fait de les distinguer permet de choisir un professionnel dont l’activité correspond réellement au problème et d’éviter une consultation trop générale. Si votre priorité est seulement de sécuriser un délai ou de comprendre une décision, dites-le clairement : la première intervention n’a pas nécessairement besoin de résoudre tout le dossier.</p>
<p>Ajoutez ensuite une chronologie d’une page maximum. Pour chaque événement, notez la date, l’auteur du document ou de l’action et la pièce correspondante. Si vous ne connaissez pas une date exacte, indiquez-le. Une chronologie honnête et incomplète vaut mieux qu’une chronologie précise en apparence mais reconstituée de mémoire. Ce document sera également utile si plusieurs professionnels interviennent dans le dossier ou si la situation évolue au fil des semaines.</p>
<p>Enfin, préparez une liste de cinq questions prioritaires. Demandez ce qui est urgent, ce qui peut attendre, quelles preuves manquent, quelles voies sont possibles et quels coûts ou risques doivent être anticipés. Cette liste aide à ne pas consacrer tout le rendez-vous à raconter les faits sans obtenir de réponse opérationnelle. Elle permet aussi de comparer deux consultations sans réduire la comparaison à une promesse de résultat.</p>
${sectionHtml}
<h2>Comment choisir et vérifier l’avocat</h2>
<p>Le premier critère est la correspondance entre le dossier et la pratique du professionnel. Une page web peut indiquer des matières traitées, mais elle ne suffit pas à confirmer l’inscription actuelle ni l’expérience sur une question très précise. Vérifiez l’identité du professionnel dans un annuaire de barreau et posez directement la question de la matière concernée. Demandez également qui suivra le dossier au quotidien, surtout dans une structure où plusieurs juristes travaillent ensemble. Un cabinet peut être pertinent pour une matière sans que chaque membre de l’équipe intervienne dans les mêmes dossiers.</p>
<p>La disponibilité compte autant que la spécialisation théorique. Si une audience ou un délai arrive rapidement, indiquez-le avant de prendre rendez-vous. Un avocat compétent mais indisponible dans la période utile ne pourra pas nécessairement traiter le dossier. Demandez aussi comment seront organisés les échanges, quel délai de réponse est habituel et de quelle manière les pièces doivent être transmises. Pour un dossier long, ces aspects pratiques influencent fortement la qualité du suivi.</p>
<p>Les honoraires doivent être abordés tôt. Demandez la méthode de calcul, les frais qui peuvent s’ajouter, les provisions demandées et la façon dont le temps ou les prestations sont suivis. Pour certains dossiers, d’autres professionnels peuvent intervenir : notaire, expert, huissier, traducteur ou médiateur. Le budget global ne se limite donc pas toujours aux honoraires de l’avocat. Une information claire sur les coûts n’est pas une garantie de résultat, mais elle réduit les incompréhensions et permet de choisir une stratégie proportionnée à l’enjeu.</p>
<h2>Préparer un dossier numérique propre</h2>
<p>Créez un dossier principal avec des sous-dossiers simples : « décisions », « contrats », « paiements », « échanges », « preuves » et « notes ». Nommez les fichiers avec la date au format année-mois-jour suivie d’un titre court. Cette organisation facilite le tri chronologique et évite d’envoyer plusieurs fois la même pièce. Si un document comporte plusieurs pages, conservez-le en un seul fichier lorsqu’il forme un ensemble cohérent. Un index des pièces peut tenir sur une page et faire gagner beaucoup de temps.</p>
<p>Pour les messages et courriels, conservez le contexte. Une capture isolée peut donner une impression différente de la conversation complète. Lorsque l’original existe encore, gardez-le. Pour les photos, évitez de modifier le fichier original si la date ou les métadonnées peuvent avoir de l’importance. Lorsque des données personnelles sensibles apparaissent, utilisez les canaux de transmission recommandés par le professionnel plutôt qu’une plateforme publique ou un formulaire dont vous ne connaissez pas l’éditeur.</p>
<h2>Sources à vérifier</h2>
<p>Les informations juridiques changent et peuvent dépendre d’une région, d’une date ou d’une procédure précise. Consultez en priorité les sources institutionnelles et professionnelles, puis utilisez les articles privés comme explication complémentaire. Pour cette page, les points de départ utiles sont :</p><ul>${sourceItems}</ul>
<h2>Questions fréquentes avant le premier rendez-vous</h2>
<h3>Dois-je envoyer toutes mes pièces avant la consultation ?</h3><p>Pas nécessairement. Commencez par les documents qui établissent les faits centraux et les échéances. Un avocat pourra ensuite demander les pièces complémentaires. Un dossier trop volumineux et non trié peut rendre la première analyse plus lente et masquer le document réellement déterminant.</p>
<h3>Comment savoir si mon dossier est urgent ?</h3><p>Une convocation, une décision officielle, un recommandé, une audience, une mesure d’exécution ou un délai indiqué dans un document sont des signaux d’alerte. Mentionnez-les au moment du contact. En cas de doute, demandez explicitement si un délai doit être sécurisé avant de traiter le fond du dossier.</p>
<h3>Puis-je me fier à une réponse trouvée en ligne ?</h3><p>Une réponse en ligne peut expliquer un mécanisme mais elle ne connaît ni vos pièces ni les dates exactes. Utilisez-la pour préparer des questions, pas pour décider seul d’une démarche irréversible. Vérifiez les informations importantes auprès d’une source officielle ou d’un professionnel.</p>
<h3>Que faut-il noter pendant le rendez-vous ?</h3><p>Notez la prochaine action, la personne qui doit la réaliser, le délai, les documents manquants et les coûts annoncés. Si plusieurs options sont présentées, demandez les avantages, les inconvénients et les conditions de chacune. Un résumé écrit après le rendez-vous évite de perdre des informations importantes.</p>
<h3>Quand demander un second avis ?</h3><p>Un second avis peut être utile lorsqu’un enjeu est important, qu’une stratégie comporte des risques élevés, que les explications restent incomprises ou que plusieurs domaines du droit se croisent. Il ne s’agit pas de chercher indéfiniment la réponse souhaitée, mais de vérifier que vous comprenez les options avant une décision importante.</p>`;
}

function cityPage(slug,c){
  const d=cityDetails[slug];
  const path='/avocat/'+slug;
  const title=`Avocat à ${c.name} : trouver un professionnel en Belgique`;
  const desc=`Guide complet pour chercher un avocat à ${c.name} : matières, préparation du dossier, honoraires, vérifications et sources professionnelles.`;
  const angleBlocks=d.angles.map(angle=>`<h2>${esc(angle.charAt(0).toUpperCase()+angle.slice(1))} à ${esc(c.name)}</h2>
<p>Une recherche liée à ${esc(angle)} doit commencer par les faits et les documents, pas uniquement par un mot-clé. À ${esc(c.name)}, indiquez au professionnel où se situe le dossier, quelle autorité ou juridiction intervient déjà, quelles décisions ont été reçues et quelle échéance approche. Une matière peut relever de règles fédérales tout en impliquant une procédure, une administration ou des pratiques locales. La localisation sert donc à comprendre le contexte, mais elle ne remplace jamais l’identification du problème juridique précis.</p>
<p>Préparez une chronologie et sélectionnez les pièces essentielles. Demandez si le cabinet traite régulièrement ce type de dossier, qui assurera le suivi, comment les honoraires seront calculés et quels documents doivent encore être obtenus. Si une expertise, un notaire, un huissier ou un autre professionnel peut intervenir, demandez à quel moment cette intervention est utile. Cette coordination évite des démarches parallèles coûteuses ou contradictoires.</p>
<p>Lorsque plusieurs avocats apparaissent dans les résultats de recherche, ne choisissez pas uniquement sur la position dans Google ou sur une formule publicitaire. Vérifiez l’identité et l’inscription professionnelle via les annuaires des barreaux, puis comparez la disponibilité, la clarté des explications et l’adéquation de la pratique au dossier. Pour une urgence, indiquez la date exacte de l’audience, de la décision ou du délai dès le premier contact.</p>`).join('');
  const body=`<p class="lead">${esc(c.intro)}</p>
<section class="notice"><strong>Zone :</strong> ${esc(d.region)}. Les anciennes fiches du domaine sont restaurées uniquement lorsqu’elles peuvent être redirigées vers une ressource actuelle et utile ; les coordonnées historiques non vérifiées ne sont pas republiées.</section>
<h2>Comment organiser votre recherche à ${esc(c.name)}</h2>
<p>Commencez par classer votre besoin dans une matière principale, même si plusieurs sujets se recoupent. Un divorce peut inclure une question immobilière ; un conflit de travail peut comporter une dimension pénale ; une succession peut exiger un notaire puis devenir contentieuse. L’objectif de cette première classification est simplement d’identifier quel type d’avocat contacter en premier. Présentez ensuite le dossier en quelques lignes et précisez où se trouvent les personnes, le bien, l’entreprise ou l’administration concernés.</p>
<p>Dans la zone de ${esc(c.name)}, les recherches couvrent aussi souvent ${esc(d.neighbours.join(', '))}. La proximité peut faciliter les rendez-vous et certaines démarches, mais elle ne doit pas devenir le seul critère. Un professionnel un peu plus éloigné, mais réellement habitué à la matière concernée et disponible dans le délai utile, peut être plus adapté qu’un cabinet situé à quelques rues mais peu actif sur ce type de dossier.</p>
<h2>Vérifier l’avocat avant de lui confier des documents</h2>
<p>Utilisez un annuaire professionnel et contrôlez l’identité du cabinet. Vérifiez ensuite le site du professionnel, ses matières annoncées et ses coordonnées. Si vous avez trouvé le nom sur une ancienne fiche, un annuaire commercial ou un résultat de recherche daté, ne supposez pas que toutes les informations sont encore valables. Les adresses, structures de cabinet et domaines de pratique peuvent évoluer.</p>
<p>Lors du premier contact, ne transmettez pas immédiatement tout le dossier. Expliquez la matière, la ville, l’urgence éventuelle et l’existence d’une audience ou d’une décision. Demandez si le cabinet peut examiner le dossier et quels documents sont nécessaires pour vérifier un conflit d’intérêts ou préparer le rendez-vous. Cela protège vos données et évite de perdre du temps.</p>
${angleBlocks}
<h2>Préparer le rendez-vous</h2>
<p>Créez une chronologie d’une page : date, événement, pièce correspondante. Ajoutez un inventaire des documents et cinq questions prioritaires. Si votre dossier contient plusieurs centaines de pages, préparez un résumé qui explique comment elles sont organisées. Cette discipline permet de consacrer le rendez-vous à l’analyse plutôt qu’au tri administratif.</p>
<p>Apportez les décisions officielles dans leur intégralité, y compris les pages qui semblent secondaires. Conservez les enveloppes ou preuves de notification lorsque des délais peuvent dépendre de la date de réception. Pour un contrat, fournissez aussi les annexes et avenants. Pour un litige financier, préparez un tableau des paiements et montants contestés. Pour un dossier familial, distinguez les questions concernant les enfants, le logement, les finances et les procédures en cours.</p>
<h2>Honoraires et organisation du suivi</h2>
<p>Demandez comment les honoraires sont calculés : taux horaire, forfait éventuel, provisions, frais administratifs et interventions de tiers. Demandez également qui sera votre interlocuteur quotidien et comment vous recevrez les copies des actes ou courriers importants. Une relation de travail claire réduit les malentendus lorsque le dossier dure plusieurs mois.</p>
<p>Si votre budget est limité, signalez-le sans attendre. Demandez si des dispositifs d’aide juridique peuvent être pertinents et quelles démarches doivent être effectuées pour vérifier votre situation. N’attendez pas qu’un délai soit presque expiré avant d’aborder la question du financement de la défense.</p>
<h2>Sources et vérifications</h2>
<p>Pour les coordonnées et l’inscription professionnelle, commencez par <a href="https://avocats.be/" rel="nofollow noopener">AVOCATS.BE</a> et les sites des barreaux compétents. Pour une matière précise, ajoutez la source publique concernée : SPF Justice, SPF Emploi, SPF Économie, Office des étrangers ou autre autorité compétente. Une page de guide peut vous orienter, mais la source officielle reste prioritaire lorsqu’une règle, une procédure ou un formulaire a changé.</p>
<h2>Questions à poser à un avocat à ${esc(c.name)}</h2>
<ul><li>Traitez-vous régulièrement des dossiers de cette matière ?</li><li>Pouvez-vous intervenir dans le délai indiqué sur ma décision ou ma convocation ?</li><li>Quels documents voulez-vous recevoir avant le premier rendez-vous ?</li><li>Comment seront calculés les honoraires et frais ?</li><li>Qui suivra concrètement le dossier et comment communiquerons-nous ?</li><li>Quelles sont les prochaines étapes et quels éléments manquent pour choisir une stratégie ?</li></ul>
<p>Une bonne recherche ne vise pas à trouver le professionnel qui promet le plus. Elle vise à trouver un avocat correctement identifié, disponible, capable d’expliquer le dossier de façon compréhensible et dont la pratique correspond à votre problème. Conservez vos propres copies, demandez un calendrier clair et faites vérifier les points importants avant toute démarche irréversible.</p>`;
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
  const cityCards=Object.entries(cities).map(([s,x])=>`<div class="card"><h3>Avocat à ${x.name}</h3><p>${x.intro}</p><a href="/avocat/${s}">Voir le guide local</a></div>`).join('');
  const articleCards=Object.entries(articles).slice(0,9).map(([s,a])=>`<div class="card"><span class="pill">Guide 1500+ mots</span><h3>${esc(a.h1)}</h3><p>${esc(a.description)}</p><a href="/articles/${s}">Lire le guide</a></div>`).join('');
  const body=`<section class="notice"><strong>Guide indépendant :</strong> le site reconstruit progressivement l’ancien actif avec des pages substantielles et des redirections propres des anciennes fiches. Les coordonnées historiques non vérifiées ne sont pas recopiées.</section>
<h2>Rechercher par ville</h2><div class="grid">${cityCards}</div>
<h2>Guides juridiques détaillés</h2><div class="grid">${articleCards}</div>
<h2>Tous les guides</h2><ul>${Object.entries(articles).map(([s,a])=>`<li><a href="/articles/${s}">${esc(a.h1)}</a></li>`).join('')}</ul>
<h2>Une méthode fondée sur des sources vérifiables</h2><p>Les pages utilisent des sources institutionnelles et professionnelles comme points de départ. Elles expliquent comment préparer un dossier, quelles pièces classer et quelles questions poser, sans remplacer une consultation juridique personnalisée.</p>`;
  return layout({path:'/',title:'Avocat Belgique : guide pour trouver un avocat',description:'Guide indépendant pour chercher un avocat en Belgique par ville et matière, avec des dossiers détaillés et des sources professionnelles.',h1:'Trouver un avocat en Belgique',body});
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
  const paths=['/',...Object.keys(cities).map(x=>'/avocat/'+x),...Object.keys(practices).map(x=>'/specialites/'+x),...Object.keys(articles).map(x=>'/articles/'+x),...Object.keys(staticPages)];
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p=>`<url><loc>${canonical(p)}</loc><changefreq>${p==='/'?'weekly':'monthly'}</changefreq></url>`).join('')}</urlset>`;
}

const legacyRedirects = {
  "/liste/avocat-au-barreau-de-bruxelles-me-souade-atori/": "/articles/avocat-droit-famille-belgique",
  "/liste/me-atori-avocat-en-droit-de-la-famille-a-bruxelles/": "/articles/divorce-belgique",
  "/liste/maitre-caroline-crappe-avocat-mediateur-au-barreau-de-namur/": "/articles/mediation-belgique",
  "/liste/avocats-huysmans-en-droit-de-la-famille-a-malines-pres-de-bruxelles-anvers/": "/articles/avocat-droit-famille-belgique",
  "/liste/cabinet-davocat-de-me-alexandris-a-schaerbeek/": "/articles/avocat-droit-penal-belgique",
  "/liste/maitre-balapukayi-kamba-avocat-en-droit-des-etrangers-a-bruxelles/": "/articles/avocat-droit-des-etrangers-belgique",
  "/liste/maitre-kamaba-avocat-en-droit-des-etrangers-a-bruxelles/": "/articles/avocat-droit-des-etrangers-belgique",
  "/liste/maitre-chloe-fricke-avocat-a-mons-et-quievrain/": "/articles/avocat-droit-roulage-belgique",
  "/liste/maitre-eric-jacobs-avocat-en-droit-des-affaires-a-bruxelles/": "/articles/avocat-droit-affaires-belgique",
  "/liste/maitre-francois-leboutte-avocat-en-droit-familial-a-dinant/": "/articles/avocat-droit-famille-belgique",
  "/liste/maitre-marine-ysebaert-avocat-en-droit-de-la-famille-a-dour-pres-de-mons/": "/articles/avocat-droit-famille-belgique",
  "/liste/maitre-jessica-dallapiccola-avocat-a-tamines-proche-namur/": "/articles/avocat-construction-belgique",
  "/liste/maitre-philippe-barbier-avocat-en-droit-de-la-famille-et-divorce-a-ixelles-bruxelles/": "/articles/divorce-belgique",
  "/liste/maitre-cyrille-dony-avocat-en-droit-des-marches-publics-et-droit-administratif-a-waterloo-bruxelles/": "/articles/avocat-marches-publics-belgique",
  "/liste/wpbdp_tag/droit-des-etrangers/": "/articles/avocat-droit-des-etrangers-belgique",
  "/liste/wpbdp_tag/droit-de-roulage/": "/articles/avocat-droit-roulage-belgique"
};

function handler(req,res){
  const url=new URL(req.url,'http://localhost');
  const rawPath=url.pathname;
  const path=rawPath.replace(/\/+$/,'') || '/';
  const legacyKey=rawPath.endsWith('/')?rawPath:rawPath+'/';
  if(legacyRedirects[legacyKey]){ res.writeHead(301,{location:legacyRedirects[legacyKey],'cache-control':'public,max-age=86400'}); return res.end(); }
  if(path==='/health'){ res.writeHead(200,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}); return res.end(JSON.stringify({ok:true,service:'avocat-belgique',version:'2.0.0'})); }
  if(path==='/robots.txt'){ res.writeHead(200,{'content-type':'text/plain; charset=utf-8'}); return res.end(`User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`); }
  if(path==='/sitemap.xml'){ res.writeHead(200,{'content-type':'application/xml; charset=utf-8'}); return res.end(sitemap()); }
  if(path==='/assets/justice-belgique.svg'){ res.writeHead(200,{'content-type':'image/svg+xml','cache-control':'public,max-age=604800'}); return res.end(svg()); }
  let html=null;
  if(path==='/') html=home();
  else if(path.startsWith('/avocat/') && cities[path.split('/')[2]]) html=cityPage(path.split('/')[2],cities[path.split('/')[2]]);
  else if(path.startsWith('/specialites/') && practices[path.split('/')[2]]) html=practicePage(path.split('/')[2],practices[path.split('/')[2]]);
  else if(path.startsWith('/articles/') && articles[path.split('/')[2]]){ const a=articles[path.split('/')[2]]; html=layout({path,title:a.title,description:a.description,h1:a.h1,body:renderArticleBody(a),label:a.h1}); }
  else if(staticPages[path]){ const p=staticPages[path]; html=layout({path,title:p.title,description:p.description,h1:p.h1,body:p.body,label:p.h1}); }
  if(html){ res.writeHead(200,{'content-type':'text/html; charset=utf-8','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','x-frame-options':'SAMEORIGIN'}); return res.end(html); }
  const notFound=layout({path,title:'Page introuvable | Avocat Belgique',description:'La page demandée est introuvable.',h1:'Page introuvable',body:'<p>Cette URL ne correspond à aucune page publiée. Retournez à <a href="/">l’accueil</a>.</p>',label:'Page introuvable',robots:'noindex,follow'});
  res.writeHead(404,{'content-type':'text/html; charset=utf-8'}); res.end(notFound);
}

const server=http.createServer(handler);
server.listen(PORT,HOST,()=>console.log(`avocat-belgique listening on ${HOST}:${PORT}`));
