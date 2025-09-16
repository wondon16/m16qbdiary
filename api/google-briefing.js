const SAMPLE_RESULTS = [
  {
    title: 'Neuromuscular priming for sprint return-to-play',
    url: 'https://www.nsca.com/education/articles/return-to-sprint-protocol/',
    snippet: 'Progressive sprint exposures balance acute to chronic workload ratio. Integrate micro-dosed accelerations and isometric hamstring work.'
  },
  {
    title: 'ISSN position stand — Nutrient timing',
    url: 'https://jissn.biomedcentral.com/articles/10.1186/1550-2783-11-33',
    snippet: 'High-level athletes benefit from peri-workout carbohydrate + protein dosing to maximize glycogen resynthesis and muscle protein synthesis.'
  },
  {
    title: 'Sleep extension for performance',
    url: 'https://pubmed.ncbi.nlm.nih.gov/21357937/',
    snippet: 'Stanford research shows 8-10 hours of sleep improves reaction time and sprint speed. Track sleep hygiene as part of readiness.'
  }
];

async function readBody(req) {
  if (req.body) {
    return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
  }
  return await new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); }
      catch (error) { reject(error); }
    });
    req.on('error', reject);
  });
}

async function fetchKnowledgeGraph({ apiKey, query }) {
  const url = new URL('https://kgsearch.googleapis.com/v1/entities:search');
  url.searchParams.set('query', query.slice(0, 256));
  url.searchParams.set('limit', '6');
  url.searchParams.set('indent', 'false');
  url.searchParams.set('key', apiKey);
  const response = await fetch(url);
  if (!response.ok) throw new Error('Knowledge Graph fetch failed');
  const json = await response.json();
  const list = Array.isArray(json?.itemListElement) ? json.itemListElement : [];
  return list.map((item) => {
    const result = item?.result || {};
    const detail = result?.detailedDescription || {};
    return {
      title: result?.name || detail?.title || query,
      url: detail?.url || result?.url || '',
      snippet: detail?.articleBody?.slice(0, 320) || result?.description || '',
    };
  }).filter((entry) => entry.title || entry.snippet).slice(0, 5);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const body = await readBody(req);
    const topic = String(body.topic || '').trim();
    const sport = String(body.sport || '').trim();
    if (!topic) {
      res.status(400).json({ ok: false, error: 'Topic is required' });
      return;
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    let results = [];
    if (apiKey) {
      try {
        const query = `${sport} ${topic}`.trim();
        results = await fetchKnowledgeGraph({ apiKey, query });
      } catch (error) {
        console.error('google-briefing lookup failed:', error.message);
      }
    }

    if (!results.length) {
      results = SAMPLE_RESULTS;
    }

    res.status(200).json({ ok: true, results });
  } catch (error) {
    console.error('google-briefing error', error);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
};
