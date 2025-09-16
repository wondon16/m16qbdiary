const DEFAULT_GUIDING_PRINCIPLES = [
  'Tim Grover — relentless micro-dose of intensity with post-session reset to sustain high output without burnout.',
  'Loren Landow — rotational power starts with single-leg stability and ground contact mastery.',
  'Sue Falsone — nervous system recovery (breath, fascial glides) is programmed daily to unlock elasticity.',
  'EXOS methodology — movement skills, strength, energy systems, and recovery form a single integrated stack.'
];

const DEFAULT_METRICS = [
  'Explosive power index (force-velocity profile)',
  'Mobility score (hip IR/ER + thoracic rotation)',
  'Game-speed conditioning (ANAER / AER power ratio)'
];

const DEFAULT_MOBILITY = {
  Prime: [
    '3×30s diaphragmatic breathing + box breathing reset',
    'T-spine rotation with reach — 2×8/side',
    '90/90 hip flow with controlled articular rotations',
    'World’s greatest stretch with overhead reach'
  ],
  YogaReset: [
    'Sun salutation A ×3 with 3s isometric in downward dog',
    'Warrior II to reverse warrior flow — 2×45s per side',
    'Low lunge to half-split with posterior chain bias'
  ],
  Cooldown: [
    'Parasympathetic breathing — 4×6 inhale/8 exhale cadence',
    '90/90 supine feet on wall + banded hip traction',
    'Trigger point release: glute med / pec minor / calves'
  ]
};

const DEFAULT_MEAL_TEMPLATE = (diet, restrictions) => ([
  {
    day: 'Training Day',
    targets: 'Calories = TDEE + 8%, Protein 1.9g/kg, Carbs 5g/kg, Fats 1g/kg',
    hydration: '0.7 oz per lb bodyweight + electrolytes pre/post session',
    meals: [
      { type: 'Breakfast', menu: `${diet} smoothie bowl + oats + omega-3`, macros: 'P40/C70/F18', notes: restrictions },
      { type: 'Lunch', menu: 'Grilled lean protein, roasted vegetables, ancient grains', macros: 'P45/C65/F20', notes: 'Add fermented food for gut health.' },
      { type: 'Dinner', menu: 'Slow-cooked protein, sweet potato mash, leafy greens, tart cherry', macros: 'P50/C60/F22', notes: 'Magnesium glycinate 400mg before bed.' }
    ]
  },
  {
    day: 'Regeneration Day',
    targets: 'Calories = TDEE - 5%, Protein 1.7g/kg, Carbs 3.5g/kg, Fats 1.1g/kg',
    hydration: 'Infused water + collagen peptides mid-day',
    meals: [
      { type: 'Breakfast', menu: 'Greek yogurt parfait with berries + chia', macros: 'P35/C40/F15', notes: 'Add turmeric + ginger shot.' },
      { type: 'Lunch', menu: 'Power salad (mixed greens, avocado, quinoa, pumpkin seeds)', macros: 'P30/C45/F20', notes: 'Top with citrus vinaigrette.' },
      { type: 'Dinner', menu: 'Baked salmon or plant-based equivalent, broccoli, lentils', macros: 'P40/C45/F18', notes: 'Chamomile tea wind-down.' }
    ]
  }
]);

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
  url.searchParams.set('limit', '5');
  url.searchParams.set('indent', 'false');
  url.searchParams.set('key', apiKey);
  const response = await fetch(url);
  if (!response.ok) throw new Error('Knowledge Graph request failed');
  const json = await response.json();
  const results = Array.isArray(json?.itemListElement) ? json.itemListElement : [];
  return results.map((item) => {
    const result = item?.result || {};
    const detailed = result?.detailedDescription || {};
    return {
      title: result?.name || detailed?.title || 'Google Source',
      url: detailed?.url || result?.url || '',
      snippet: detailed?.articleBody?.slice(0, 320) || result?.description || '',
      score: item?.resultScore || 0,
    };
  }).filter((entry) => entry.title || entry.snippet);
}

async function callGoogleGenerative({ apiKey, model, prompt }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }]}],
      generationConfig: {
        temperature: 0.65,
        topP: 0.9,
        topK: 32,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json'
      }
    })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Google AI request failed: ${detail}`);
  }
  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No content returned from Google AI');
  const clean = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(clean);
}

function fallbackSchedule(payload) {
  const days = payload.trainingDays?.length ? payload.trainingDays : ['Monday', 'Tuesday', 'Thursday', 'Friday'];
  const focuses = ['Acceleration & Plyometrics', 'Strength & Power', 'Speed & Skill', 'Recovery & Regeneration'];
  return days.map((day, index) => ({
    day,
    focus: focuses[index % focuses.length],
    readiness: index % 3 === 0 ? 'Alpha push' : index % 3 === 1 ? 'Neural prime' : 'Regeneration bias',
    warmup: 'Soft-tissue prep, dynamic mobility, joint CARs, primer jumps',
    primary: index % 2 === 0 ? 'Trap bar deadlift clusters, resisted sprints, med-ball throws' : 'Tempo strength circuits, unilateral work, velocity-based lifts',
    conditioning: index % 2 === 0 ? 'Assault bike anaerobic intervals 15:45 ×6' : 'Tempo runs + acceleration buildups',
    mobility: '90/90 series, hip airplanes, thoracic rotation, ankle mobility ladder',
    recovery: 'Parasympathetic breath + contrast shower + magnesium',
    coachingCue: 'Emphasize intent and crisp shin angles. Film first rep for feedback.'
  }));
}

function buildFallbackPlan(payload, knowledge) {
  return {
    overview: `AI generated blueprint for ${payload.name || 'the athlete'} targeting ${payload.goal}. Sessions are structured across ${payload.timeframe || '6 weeks'} with ${payload.frequency || '4'} workouts per week to improve ${payload.metrics || 'key performance metrics'} while respecting current limitations (${payload.injuries || 'none reported'}).`,
    guidingPrinciples: DEFAULT_GUIDING_PRINCIPLES,
    timelineSummary: `${payload.timeframe || '6-week'} progression broken into foundation, build, and game-speed conversion blocks.`,
    keyMetrics: DEFAULT_METRICS,
    weeklySchedule: fallbackSchedule(payload),
    mobilitySeries: DEFAULT_MOBILITY,
    mealPlan: DEFAULT_MEAL_TEMPLATE(payload.diet || 'Balanced omnivore', payload.restrictions || 'Tailored to restrictions'),
    references: knowledge.citations.length ? knowledge.citations : [
      { title: 'Tim Grover — Relentless training manifesto', url: 'https://attackathletics.com', note: 'Mindset priming and intensity control.' },
      { title: 'Sue Falsone — Bridging the gap', url: 'https://structureandfunction.net', note: 'Fascial release + respiratory resets.' }
    ]
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const payload = await readBody(req);
    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ ok: false, error: 'Invalid payload' });
      return;
    }

    const requiredFields = ['name', 'sport', 'goal', 'timeframe'];
    const missing = requiredFields.filter((field) => !String(payload[field] || '').trim());
    if (missing.length) {
      res.status(400).json({ ok: false, error: `Missing required fields: ${missing.join(', ')}` });
      return;
    }

    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    const GOOGLE_MODEL = process.env.GOOGLE_GENERATIVE_MODEL || 'models/gemini-1.5-pro-latest';

    let citations = [];
    let researchSummary = '';
    if (GOOGLE_API_KEY) {
      try {
        const query = `${payload.sport} ${payload.goal} performance training ${payload.position || ''}`.trim();
        citations = await fetchKnowledgeGraph({ apiKey: GOOGLE_API_KEY, query });
        researchSummary = citations.map((entry) => `${entry.title}: ${entry.snippet}`).join('\n');
      } catch (error) {
        console.error('Knowledge graph lookup failed:', error.message);
      }
    }

    let plan;
    let usedAI = false;
    if (GOOGLE_API_KEY) {
      try {
        const prompt = [
          'You are a high-performance training architect blending best practices from Tim Grover, Sue Falsone, Loren Landow, and EXOS.',
          'Design a comprehensive program for the athlete profile below. Return JSON ONLY with the following keys:',
          '{',
          '  "overview": string,',
          '  "guidingPrinciples": string[],',
          '  "timelineSummary": string,',
          '  "keyMetrics": string[],',
          '  "weeklySchedule": [',
          '    {"day": string, "focus": string, "readiness": string, "warmup": string, "primary": string, "conditioning": string, "mobility": string, "recovery": string, "coachingCue": string, "metrics": string}',
          '  ],',
          '  "mobilitySeries": {"Prime": string[], "YogaReset": string[], "Cooldown": string[]},',
          '  "mealPlan": [',
          '    {"day": string, "targets": string, "hydration": string, "meals": [{"type": string, "menu": string, "macros": string, "notes": string}] }',
          '  ],',
          '  "references": [{"title": string, "url": string, "note": string}]',
          '}',
          'Athlete profile:',
          `Name: ${payload.name}`,
          `Sport: ${payload.sport}`,
          `Position/Event: ${payload.position || 'N/A'}`,
          `Goal: ${payload.goal}`,
          `Experience: ${payload.experience || 'Not provided'}`,
          `Program length: ${payload.timeframe}`,
          `Sessions per week: ${payload.frequency || 'Not provided'}`,
          `Equipment: ${payload.equipment || 'Bodyweight + field'}`,
          `Key metrics: ${payload.metrics || 'Speed, strength, recovery'}`,
          `Injuries / limitations: ${payload.injuries || 'None reported'}`,
          `Diet: ${payload.diet || 'Balanced omnivore'} with restrictions ${payload.restrictions || 'None'}`,
          `Training days: ${(payload.trainingDays || []).join(', ') || 'Coach-selected'}`,
          `Additional priorities: ${payload.priorities || 'Leadership, film study habits'}`,
          researchSummary ? `Research summary from Google Knowledge Graph:\n${researchSummary}` : 'No external research available. '
        ].join('\n');

        const aiResponse = await callGoogleGenerative({ apiKey: GOOGLE_API_KEY, model: GOOGLE_MODEL, prompt });
        plan = {
          overview: aiResponse.overview,
          guidingPrinciples: aiResponse.guidingPrinciples || DEFAULT_GUIDING_PRINCIPLES,
          timelineSummary: aiResponse.timelineSummary || '',
          keyMetrics: aiResponse.keyMetrics || DEFAULT_METRICS,
          weeklySchedule: Array.isArray(aiResponse.weeklySchedule) ? aiResponse.weeklySchedule : fallbackSchedule(payload),
          mobilitySeries: aiResponse.mobilitySeries || DEFAULT_MOBILITY,
          mealPlan: Array.isArray(aiResponse.mealPlan) ? aiResponse.mealPlan : DEFAULT_MEAL_TEMPLATE(payload.diet, payload.restrictions),
          references: Array.isArray(aiResponse.references) ? aiResponse.references : citations
        };
        usedAI = true;
      } catch (error) {
        console.error('Google AI generation failed:', error.message);
      }
    }

    if (!plan) {
      plan = buildFallbackPlan(payload, { citations });
    }

    res.status(200).json({
      ok: true,
      plan,
      googleCitations: citations,
      usedAI,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('generate-plan error', error);
    res.status(500).json({ ok: false, error: 'Server error generating plan' });
  }
};
