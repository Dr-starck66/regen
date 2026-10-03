export function unwrapBingHref(rawHref) {
  if (!rawHref) return '';
  try {
    const u = new URL(rawHref, 'https://www.bing.com');
    const host = u.hostname.toLowerCase();
    if (/(^|\.)bing\.com$/.test(host) && u.pathname.startsWith('/ck/a')) {
      const encoded = u.searchParams.get('u') || '';
      if (encoded.startsWith('a1') && encoded.length > 2) {
        let b64 = encoded.slice(2).replace(/-/g, '+').replace(/_/g, '/');
        b64 += '='.repeat((4 - (b64.length % 4)) % 4);
        const decoded = Buffer.from(b64, 'base64').toString('utf8');
        if (/^https?:\/\//i.test(decoded)) return decoded;
      }
    }
    return u.toString();
  } catch {
    return rawHref;
  }
}

export function serpRowsRelevant(query, rows = []) {
  const normalize = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const stop = new Set(['the','and','for','with','from','des','les','une','dans','pour','con','del','las','los','una','por','para']);
  const tokens = [...new Set(normalize(query).split(/[^a-z0-9]+/).filter(t => t.length > 2 && !stop.has(t)))];
  if (!tokens.length) return rows.length >= 3;
  const required = Math.max(1, Math.ceil(tokens.length * 0.67));
  const sample = rows.slice(0, 8);
  let relevant = 0;
  for (const row of sample) {
    let host = '';
    try { host = new URL(row.url || '').hostname; } catch {}
    const haystack = normalize([row.title, row.snippet, host].filter(Boolean).join(' '));
    const hits = tokens.filter(t => haystack.includes(t)).length;
    if (hits >= required) relevant++;
  }
  return relevant >= Math.min(3, sample.length);
}
