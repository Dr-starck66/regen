import express from 'express';
import * as cheerio from 'cheerio';
import dns from 'node:dns/promises';
import net from 'node:net';

const app = express();
const PORT = process.env.PORT || 3000;
const UA = 'Mozilla/5.0 (compatible; AstraSEOLab/1.0; +https://github.com/Dr-starck66/regen)';
const TIMEOUT_MS = 9000;

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public', { maxAge: '1h' }));

function isPrivateIp(ip) {
  if (!ip) return true;
  if (net.isIPv4(ip)) {
    const p = ip.split('.').map(Number);
    return p[0] === 10 || p[0] === 127 || p[0] === 0 ||
      (p[0] === 169 && p[1] === 254) ||
      (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && p[1] === 168) || p[0] >= 224;
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80:');
  }
  return true;
}

async function safeUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { throw new Error('URL invalide'); }
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Seuls HTTP/HTTPS sont autorisés');
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local')) throw new Error('Hôte local refusé');
  const rows = await dns.lookup(host, { all: true });
  if (!rows.length || rows.some(r => isPrivateIp(r.address))) throw new Error('Adresse privée ou non routable refusée');
  return u;
}

async function fetchText(raw, options = {}) {
  const u = await safeUrl(raw);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout || TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(u, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': UA,
        'accept': options.accept || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': options.language || 'en-US,en;q=0.8,fr;q=0.7'
      }
    });
    const text = await res.text();
    return { status: res.status, ok: res.ok, url: res.url, headers: Object.fromEntries(res.headers.entries()), text, elapsed_ms: Date.now() - started };
  } finally { clearTimeout(timer); }
}

function absoluteUrl(href, base) { try { return new URL(href, base).toString(); } catch { return null; } }
function uniq(arr) { return [...new Set(arr.filter(Boolean))]; }

function scoreAudit(a) {
  let s = 100;
  const issues = [];
  const penalty = (n, code, message) => { s -= n; issues.push({ code, severity: n >= 12 ? 'high' : n >= 6 ? 'medium' : 'low', message }); };
  if (a.http_status < 200 || a.http_status >= 400) penalty(25, 'HTTP_STATUS', 'HTTP ' + a.http_status);
  if (!a.https) penalty(12, 'HTTPS', 'La page n’utilise pas HTTPS.');
  if (!a.title) penalty(15, 'TITLE_MISSING', 'Balise <title> absente.');
  else if (a.title.length < 20 || a.title.length > 65) penalty(5, 'TITLE_LENGTH', 'Title de ' + a.title.length + ' caractères.');
  if (!a.meta_description) penalty(8, 'META_DESCRIPTION', 'Meta description absente.');
  if (!a.canonical) penalty(6, 'CANONICAL', 'Canonical absente.');
  if (a.noindex) penalty(30, 'NOINDEX', 'Directive noindex détectée.');
  if (a.h1.length !== 1) penalty(7, 'H1_COUNT', a.h1.length + ' H1 détecté(s).');
  if (a.images_total && a.images_missing_alt > 0) penalty(Math.min(8, Math.ceil(a.images_missing_alt / Math.max(a.images_total,1) * 8)), 'IMG_ALT', a.images_missing_alt + '/' + a.images_total + ' images sans alt.');
  if (!a.schema_count) penalty(4, 'SCHEMA', 'Aucun JSON-LD détecté.');
  if (a.word_count < 250) penalty(8, 'THIN_CONTENT', 'Seulement ' + a.word_count + ' mots visibles environ.');
  if (!a.robots_accessible) penalty(4, 'ROBOTS', 'robots.txt non confirmé.');
  if (!a.sitemap_accessible) penalty(4, 'SITEMAP', 'sitemap.xml non confirmé.');
  return { score: Math.max(0, s), issues };
}

async function auditUrl(raw) {
  const page = await fetchText(raw);
  const $ = cheerio.load(page.text);
  const base = page.url;
  const baseHost = new URL(base).hostname.replace(/^www\./,'');
  const title = $('title').first().text().trim();
  const metaDescription = $('meta[name="description"]').attr('content')?.trim() || '';
  const canonical = absoluteUrl($('link[rel="canonical"]').attr('href'), base);
  const robotsMeta = $('meta[name="robots"]').attr('content') || '';
  const googlebotMeta = $('meta[name="googlebot"]').attr('content') || '';
  const noindex = /noindex/i.test(robotsMeta + ' ' + googlebotMeta);
  const h1 = $('h1').map((_, el) => $(el).text().trim()).get().filter(Boolean);
  const h2 = $('h2').map((_, el) => $(el).text().trim()).get().filter(Boolean);
  const images = $('img').toArray();
  const imagesMissingAlt = images.filter(el => !(($(el).attr('alt') || '').trim())).length;
  const schemas = $('script[type="application/ld+json"]').toArray();
  const links = $('a[href]').map((_, el) => absoluteUrl($(el).attr('href'), base)).get().filter(Boolean);
  let internal = 0, external = 0;
  for (const l of links) {
    try {
      const h = new URL(l).hostname.replace(/^www\./,'');
      h === baseHost ? internal++ : external++;
    } catch {}
  }
  $('script,style,noscript,svg').remove();
  const visible = $('body').text().replace(/\s+/g,' ').trim();
  const wordCount = visible ? visible.split(/\s+/).length : 0;
  const origin = new URL(base).origin;
  const [robots, sitemap] = await Promise.allSettled([
    fetchText(origin + '/robots.txt', { timeout: 5000, accept: 'text/plain,*/*' }),
    fetchText(origin + '/sitemap.xml', { timeout: 5000, accept: 'application/xml,text/xml,*/*' })
  ]);
  const robotsOk = robots.status === 'fulfilled' && robots.value.status < 400 && /user-agent/i.test(robots.value.text);
  const sitemapOk = sitemap.status === 'fulfilled' && sitemap.value.status < 400 && /<(urlset|sitemapindex)[\s>]/i.test(sitemap.value.text);
  const data = {
    requested_url: raw, final_url: base, http_status: page.status, response_ms: page.elapsed_ms,
    https: base.startsWith('https://'), content_type: page.headers['content-type'] || '',
    content_bytes: Buffer.byteLength(page.text), title, meta_description: metaDescription, canonical,
    robots_meta: robotsMeta, googlebot_meta: googlebotMeta, noindex, h1, h2_count: h2.length,
    images_total: images.length, images_missing_alt: imagesMissingAlt, schema_count: schemas.length,
    word_count: wordCount, internal_links: internal, external_links: external,
    robots_accessible: robotsOk, sitemap_accessible: sitemapOk
  };
  return { ...data, ...scoreAudit(data), evidence: 'VERIFIED_FROM_LIVE_HTML' };
}

function extractDdg(html) {
  const $ = cheerio.load(html);
  const out = [];
  $('.result').each((_, el) => {
    const a = $(el).find('.result__a').first();
    let href = a.attr('href');
    const title = a.text().trim();
    const snippet = $(el).find('.result__snippet').text().trim();
    if (!href) return;
    try {
      const u = new URL(href, 'https://duckduckgo.com');
      const uddg = u.searchParams.get('uddg');
      if (uddg) href = decodeURIComponent(uddg);
    } catch {}
    if (/^https?:\/\//i.test(href)) out.push({ title, url: href, snippet });
  });
  return out;
}

async function searchDdg(query, limit = 20) {
  const r = await fetchText('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query), { timeout: 10000 });
  if (!r.ok) throw new Error('DuckDuckGo HTTP ' + r.status);
  return extractDdg(r.text).slice(0, limit);
}

function extractGoogle(html) {
  const $ = cheerio.load(html);
  const out = [];
  $('a').each((_, el) => {
    const h3 = $(el).find('h3').first();
    if (!h3.length) return;
    let href = $(el).attr('href') || '';
    if (href.startsWith('/url?')) {
      try { href = new URL(href, 'https://www.google.com').searchParams.get('q') || ''; } catch {}
    }
    if (!/^https?:\/\//i.test(href)) return;
    let host = ''; try { host = new URL(href).hostname; } catch {}
    if (/google\./i.test(host)) return;
    out.push({ title: h3.text().trim(), url: href, snippet: '' });
  });
  return uniq(out.map(x => x.url)).map(url => out.find(x => x.url === url)).filter(Boolean);
}

async function searchSerp(query, limit = 20, language = 'en') {
  let googleError = null;
  try {
    const url = 'https://www.google.com/search?q=' + encodeURIComponent(query) + '&num=' + Math.min(limit,30) + '&hl=' + encodeURIComponent(language) + '&filter=0&pws=0';
    const r = await fetchText(url, { timeout: 10000, language: language + ',en;q=0.8' });
    const rows = extractGoogle(r.text).slice(0, limit);
    if (r.ok && rows.length >= 3) return { source: 'google_live_html', partial: false, results: rows };
    googleError = 'Google returned ' + r.status + ', ' + rows.length + ' parsed results';
  } catch (e) { googleError = e.message; }
  const rows = await searchDdg(query, limit);
  return { source: 'duckduckgo_fallback', partial: true, note: googleError, results: rows };
}

async function getSuggestions(q, lang = 'fr') {
  const u = 'https://suggestqueries.google.com/complete/search?client=firefox&hl=' + encodeURIComponent(lang) + '&q=' + encodeURIComponent(q);
  const r = await fetchText(u, { timeout: 7000, accept: 'application/json,text/plain,*/*' });
  if (!r.ok) throw new Error('Google Suggest HTTP ' + r.status);
  const data = JSON.parse(r.text);
  return Array.isArray(data?.[1]) ? data[1] : [];
}

async function verifyBacklink(sourceUrl, targetHost) {
  try {
    const r = await fetchText(sourceUrl, { timeout: 6500 });
    if (!r.ok || !/text\/html/i.test(r.headers['content-type'] || '')) return null;
    const $ = cheerio.load(r.text);
    let found = null;
    $('a[href]').each((_, el) => {
      if (found) return;
      const href = absoluteUrl($(el).attr('href'), r.url);
      if (!href) return;
      try {
        const h = new URL(href).hostname.replace(/^www\./,'');
        if (h === targetHost || h.endsWith('.' + targetHost)) {
          const rel = ($(el).attr('rel') || '').toLowerCase();
          found = { source_url: r.url, target_url: href, anchor: $(el).text().replace(/\s+/g,' ').trim().slice(0,240), rel, follow: !/(nofollow|ugc|sponsored)/.test(rel), http_status: r.status };
        }
      } catch {}
    });
    return found;
  } catch { return null; }
}

async function backlinkDiscovery(domain, limit = 20) {
  const clean = domain.replace(/^https?:\/\//,'').replace(/^www\./,'').split('/')[0].toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(clean)) throw new Error('Domaine invalide');
  const queries = ['"' + clean + '" -site:' + clean, '"www.' + clean + '" -site:' + clean];
  const buckets = [];
  for (const q of queries) { try { buckets.push(...await searchDdg(q,30)); } catch {} }
  const candidates = uniq(buckets.map(x => x.url)).filter(u => {
    try { return new URL(u).hostname.replace(/^www\./,'') !== clean; } catch { return false; }
  }).slice(0, Math.max(30, limit * 3));
  const confirmed = [];
  const concurrency = 5;
  for (let i=0; i<candidates.length && confirmed.length<limit; i+=concurrency) {
    const rows = await Promise.all(candidates.slice(i,i+concurrency).map(u => verifyBacklink(u, clean)));
    confirmed.push(...rows.filter(Boolean));
  }
  const deduped = [], seen = new Set();
  for (const b of confirmed) {
    const key = b.source_url + '|' + b.target_url;
    if (!seen.has(key)) { seen.add(key); deduped.push(b); }
  }
  return {
    domain: clean, discovered_candidates: candidates.length, confirmed_backlinks: deduped.length,
    referring_domains_confirmed: uniq(deduped.map(x => { try { return new URL(x.source_url).hostname.replace(/^www\./,''); } catch { return null; } })).length,
    backlinks: deduped.slice(0,limit), evidence: 'CONFIRMED_BY_FETCHING_SOURCE_PAGES',
    coverage: 'PARTIAL_DISCOVERY_NOT_A_FULL_WEB_LINK_INDEX',
    note: 'Le compteur est un minimum confirmé, pas le total absolu du Web.'
  };
}

const commercialTerms = new Map([
  ['insurance',10],['assurance',10],['lawyer',10],['avocat',9],['loan',9],['credit',8],
  ['mortgage',10],['quote',8],['devis',8],['attorney',10],['software',6],['saas',7],
  ['hosting',7],['hébergement',7],['casino',9],['trading',8],['broker',8],['rehab',9]
]);
function commercialIntent(q) {
  const x = q.toLowerCase();
  let score = 0;
  for (const [term,weight] of commercialTerms) if (x.includes(term)) score += weight;
  if (/\b(buy|acheter|prix|price|cost|tarif|best|meilleur|compare|comparatif|quote|devis)\b/i.test(x)) score += 8;
  return Math.min(100, score * 4);
}

app.get('/api/health', (_,res) => res.json({ ok:true, service:'ASTRA SEO Lab', version:'1.0.0' }));
app.get('/api/audit', async (req,res) => {
  try { const url=String(req.query.url||'').trim(); if(!url) return res.status(400).json({error:'url requis'}); res.json(await auditUrl(url)); }
  catch(e){ res.status(400).json({error:e.message||'audit_failed'}); }
});
app.get('/api/suggest', async (req,res) => {
  try { const q=String(req.query.q||'').trim(); const lang=String(req.query.lang||'fr').slice(0,5); if(!q) return res.status(400).json({error:'q requis'}); res.json({query:q,source:'google_suggest_live',suggestions:await getSuggestions(q,lang),evidence:'VERIFIED_LIVE'}); }
  catch(e){ res.status(400).json({error:e.message||'suggest_failed'}); }
});
app.get('/api/serp', async (req,res) => {
  try {
    const q=String(req.query.q||'').trim(); const lang=String(req.query.lang||'fr').slice(0,5); const limit=Math.min(30,Math.max(5,Number(req.query.limit||20)));
    if(!q) return res.status(400).json({error:'q requis'});
    const data=await searchSerp(q,limit,lang);
    res.json({query:q,...data,results:data.results.map((x,i)=>({position:i+1,...x})),evidence:data.source==='google_live_html'?'VERIFIED_GOOGLE_LIVE_HTML':'VERIFIED_FALLBACK_SERP_NOT_GOOGLE'});
  } catch(e){ res.status(400).json({error:e.message||'serp_failed'}); }
});
app.get('/api/backlinks', async (req,res) => {
  try { const domain=String(req.query.domain||'').trim(); const limit=Math.min(50,Math.max(5,Number(req.query.limit||20))); if(!domain) return res.status(400).json({error:'domain requis'}); res.json(await backlinkDiscovery(domain,limit)); }
  catch(e){ res.status(400).json({error:e.message||'backlinks_failed'}); }
});
app.get('/api/keyword', async (req,res) => {
  try {
    const q=String(req.query.q||'').trim(); const lang=String(req.query.lang||'fr').slice(0,5); if(!q) return res.status(400).json({error:'q requis'});
    const [suggestions,serp]=await Promise.allSettled([getSuggestions(q,lang),searchSerp(q,10,lang)]);
    res.json({
      query:q, commercial_intent_score:commercialIntent(q), commercial_intent_method:'transparent_keyword_heuristic_not_cpc',
      exact_cpc:null, exact_search_volume:null, proprietary_metrics_status:'UNVERIFIED_WITHOUT_GOOGLE_ADS_OR_PAID_INDEX',
      suggestions:suggestions.status==='fulfilled'?suggestions.value:[], serp:serp.status==='fulfilled'?serp.value:null,
      evidence:'MIXED_LIVE_PUBLIC_SOURCES'
    });
  } catch(e){ res.status(400).json({error:e.message||'keyword_failed'}); }
});

app.listen(PORT, () => console.log('ASTRA SEO Lab listening on ' + PORT));
