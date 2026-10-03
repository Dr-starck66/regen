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
