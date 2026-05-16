export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ASTRO_KEY = process.env.ASTRO_KEY || 'ftlKEMc9Ny9ojd941FII85lsu88klBNp1g12l1p6';

  const { year, month, date, hours, minutes, latitude, longitude, timezone } = req.body;

  console.log('Received:', JSON.stringify({ year, month, date, hours, minutes, latitude, longitude, timezone }));

  const body = {
    year: parseInt(year),
    month: parseInt(month),
    date: parseInt(date),
    hours: parseInt(hours),
    minutes: parseInt(minutes),
    seconds: 0,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    timezone: parseFloat(timezone),
    config: { observation_point: 'topocentric', ayanamsha: 'tropical' }
  };

  let planets = [];
  let wheel = '';

  try {
    const planetsRes = await fetch('https://json.freeastrologyapi.com/western/planets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ASTRO_KEY },
      body: JSON.stringify(body)
    });
    console.log('Planets status:', planetsRes.status);
    const planetsText = await planetsRes.text();
    console.log('Planets response preview:', planetsText.substring(0, 300));
    if (planetsRes.ok) {
      const data = JSON.parse(planetsText);
      planets = data.output || [];
    }
  } catch (e) {
    console.error('Planets error:', e.message);
  }

  try {
    const wheelRes = await fetch('https://json.freeastrologyapi.com/western/natal-wheel-chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ASTRO_KEY },
      body: JSON.stringify(body)
    });
    console.log('Wheel status:', wheelRes.status);
    if (wheelRes.ok) {
      const data = await wheelRes.json();
      wheel = data.svg || data.output || '';
    }
  } catch (e) {
    console.error('Wheel error:', e.message);
  }

  console.log('Result: planets=' + planets.length + ' wheel=' + wheel.length);
  return res.status(200).json({ planets, wheel });
}
