export default async function handler(req, res) {
  // Allow CORS from our frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ASTRO_KEY = process.env.ASTRO_KEY || 'ftlKEMc9Ny9ojd941FII85lsu88klBNp1g12l1p6';

  try {
    const { year, month, date, hours, minutes, latitude, longitude, timezone, type } = req.body;

    const body = {
      year, month, date,
      hours, minutes, seconds: 0,
      latitude, longitude, timezone,
      config: { observation_point: 'topocentric', ayanamsha: 'tropical' }
    };

    // Call planets and wheel in parallel
    const [planetsRes, wheelRes] = await Promise.allSettled([
      fetch('https://json.freeastrologyapi.com/western/planets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ASTRO_KEY },
        body: JSON.stringify(body)
      }),
      fetch('https://json.freeastrologyapi.com/western/natal-wheel-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ASTRO_KEY },
        body: JSON.stringify(body)
      })
    ]);

    let planets = [];
    let wheel = '';

    if (planetsRes.status === 'fulfilled' && planetsRes.value.ok) {
      const pData = await planetsRes.value.json();
      planets = pData.output || [];
    }

    if (wheelRes.status === 'fulfilled' && wheelRes.value.ok) {
      const wData = await wheelRes.value.json();
      wheel = wData.svg || wData.output || '';
    }

    return res.status(200).json({ planets, wheel });

  } catch (error) {
    console.error('Astro API error:', error);
    return res.status(500).json({ error: error.message, planets: [], wheel: '' });
  }
}
