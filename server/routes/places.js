import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { distillFunFacts, funFactsConfigured } from '../utils/funFacts.js';

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/places/search?query=...
 * Geocode a place name via OpenStreetMap Nominatim (free, no API key).
 * Proxied server-side so the browser isn't subject to Nominatim CORS/rate rules.
 */
router.get('/search', async (req, res) => {
  try {
    const { query: q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'query parameter is required' });
    }

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q.trim());
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '5');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('extratags', '1'); // carries the wikipedia article tag

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Atlasly-TripPlanner/1.0 (contact: dev@atlasly.local)' },
    });
    if (!response.ok) {
      console.error(`[Places Route] ✗ Nominatim responded ${response.status}`);
      return res.status(502).json({ error: 'Place search service unavailable' });
    }

    const data = await response.json();
    const results = data.map((place) => ({
      place_id: String(place.place_id),
      name: place.name || place.display_name.split(',')[0],
      display_name: place.display_name,
      latitude: parseFloat(place.lat),
      longitude: parseFloat(place.lon),
      type: place.type,
      wikipedia: place.extratags?.wikipedia || null,
    }));
    res.json({ results });
  } catch (error) {
    console.error('[Places Route] ❌ Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const WIKI_HEADERS = {
  'User-Agent': 'Atlasly-TripPlanner/1.0 (contact: dev@atlasly.local)',
};

// Trim an article extract to a couple of sentences that fit a fun-fact card
const trimExtract = (text, maxLen = 280) => {
  if (!text) return null;
  const sentences = text.split(/(?<=[.!?])\s+/);
  let out = '';
  for (const s of sentences) {
    if (out && (out + ' ' + s).length > maxLen) break;
    out = out ? `${out} ${s}` : s;
  }
  return out || text.slice(0, maxLen);
};

const fetchWikiSummary = async (lang, title) => {
  const response = await fetch(
    `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    { headers: WIKI_HEADERS }
  );
  if (!response.ok) return null;
  const data = await response.json();
  if (!data.extract || data.type === 'disambiguation') return null;
  return {
    fun_fact: trimExtract(data.extract),
    source_title: data.title,
    source_url: data.content_urls?.desktop?.page || null,
    coordinates: data.coordinates || null,
  };
};

// Map a non-English article to its English counterpart, if one exists
const resolveEnglishTitle = async (lang, title) => {
  const url = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  url.searchParams.set('action', 'query');
  url.searchParams.set('titles', title);
  url.searchParams.set('prop', 'langlinks');
  url.searchParams.set('lllang', 'en');
  url.searchParams.set('format', 'json');
  const response = await fetch(url, { headers: WIKI_HEADERS });
  if (!response.ok) return null;
  const data = await response.json();
  const pages = data.query?.pages || {};
  for (const page of Object.values(pages)) {
    const en = page.langlinks?.[0]?.['*'];
    if (en) return en;
  }
  return null;
};

// Fetch a large plain-text slice of the article — the lead paragraph alone
// is "basic info"; the fun facts live deeper in the article body
const fetchWikiFullText = async (lang, title) => {
  const url = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  url.searchParams.set('action', 'query');
  url.searchParams.set('titles', title);
  url.searchParams.set('prop', 'extracts');
  url.searchParams.set('explaintext', '1');
  // no exchars — it silently caps at 1200; take the full extract and slice
  url.searchParams.set('redirects', '1');
  url.searchParams.set('format', 'json');
  const response = await fetch(url, { headers: WIKI_HEADERS });
  if (!response.ok) return null;
  const data = await response.json();
  const pages = data.query?.pages || {};
  for (const page of Object.values(pages)) {
    if (page.extract) return page.extract.slice(0, 12000);
  }
  return null;
};

/**
 * Upgrade a plain summary fact into genuinely fun facts: pull the full
 * article text and have Claude distill the surprising bits. Falls back to
 * the summary untouched when no API key is configured or anything fails.
 */
const enrichFact = async (fact, lang, placeName) => {
  if (!funFactsConfigured()) return { ...fact, generated: false };
  const article = await fetchWikiFullText(lang, fact.source_title).catch(() => null);
  const distilled = await distillFunFacts(placeName || fact.source_title, article);
  if (!distilled) return { ...fact, generated: false };
  return { ...fact, fun_fact: distilled, generated: true };
};

const distKm = (lat1, lon1, lat2, lon2) => {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
    Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
};

// Reject an article whose own coordinates are far from the pin —
// catches "Springfield" resolving to the wrong Springfield
const nearPin = (fact, lat, lon) => {
  if (!fact.coordinates || !lat || !lon) return true;
  return distKm(fact.coordinates.lat, fact.coordinates.lon, parseFloat(lat), parseFloat(lon)) < 80;
};

/**
 * GET /api/places/funfact?wikipedia=lang:Title&name=...&lat=..&lon=..
 * Pull a short blurb about a place from Wikipedia, best source first:
 *   1. Nominatim's article tag (translated to English when possible)
 *   2. The place name looked up on English Wikipedia (distance-checked)
 *   3. The nearest geotagged article to the pin
 * Responds { fact: {...} } or { fact: null } — a missing fact is a
 * normal outcome, never a client-facing error.
 */
router.get('/funfact', async (req, res) => {
  try {
    const { wikipedia, name, lat, lon } = req.query;

    if (wikipedia && wikipedia.includes(':')) {
      const [lang, ...titleParts] = wikipedia.split(':');
      const title = titleParts.join(':');

      if (lang !== 'en') {
        const enTitle = await resolveEnglishTitle(lang, title);
        if (enTitle) {
          const fact = await fetchWikiSummary('en', enTitle);
          if (fact) return res.json({ fact: await enrichFact(fact, 'en', name) });
        }
      }
      const fact = await fetchWikiSummary(lang, title);
      if (fact) return res.json({ fact: await enrichFact(fact, lang, name) });
    }

    if (name) {
      const fact = await fetchWikiSummary('en', name);
      if (fact && nearPin(fact, lat, lon)) {
        return res.json({ fact: await enrichFact(fact, 'en', name) });
      }
    }

    if (lat && lon) {
      const geoUrl = new URL('https://en.wikipedia.org/w/api.php');
      geoUrl.searchParams.set('action', 'query');
      geoUrl.searchParams.set('list', 'geosearch');
      geoUrl.searchParams.set('gscoord', `${lat}|${lon}`);
      geoUrl.searchParams.set('gsradius', '1000');
      geoUrl.searchParams.set('gslimit', '1');
      geoUrl.searchParams.set('format', 'json');
      const geoRes = await fetch(geoUrl, { headers: WIKI_HEADERS });
      if (geoRes.ok) {
        const geo = await geoRes.json();
        const page = geo.query?.geosearch?.[0];
        if (page) {
          const fact = await fetchWikiSummary('en', page.title);
          if (fact) return res.json({ fact: await enrichFact(fact, 'en', name) });
        }
      }
    }

    res.json({ fact: null });
  } catch (error) {
    console.error('[Places Route] ❌ Fun fact error:', error);
    res.json({ fact: null });
  }
});

export default router;
