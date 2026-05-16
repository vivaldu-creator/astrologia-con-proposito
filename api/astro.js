export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ASTRO_KEY = process.env.ASTRO_KEY || 'ftlKEMc9Ny9ojd941FII85lsu88klBNp1g12l1p6';
  const { year, month, date, hours, minutes, latitude, longitude, timezone } = req.body;

  const body = {
    year: parseInt(year), month: parseInt(month), date: parseInt(date),
    hours: parseInt(hours), minutes: parseInt(minutes), seconds: 0,
    latitude: parseFloat(latitude), longitude: parseFloat(longitude),
    timezone: parseFloat(timezone),
    config: { observation_point: 'topocentric', ayanamsha: 'tropical' }
  };

  let planets = [];
  let wheel = '';
  let houseCusps = []; // house cusp degrees

  try {
    // Fetch planets, wheel, and houses in parallel
    const [planetsRes, wheelRes, housesRes] = await Promise.allSettled([
      fetch('https://json.freeastrologyapi.com/western/planets', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': ASTRO_KEY },
        body: JSON.stringify(body)
      }),
      fetch('https://json.freeastrologyapi.com/western/natal-wheel-chart', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': ASTRO_KEY },
        body: JSON.stringify(body)
      }),
      fetch('https://json.freeastrologyapi.com/western/houses', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': ASTRO_KEY },
        body: JSON.stringify(body)
      })
    ]);

    if (planetsRes.status === 'fulfilled' && planetsRes.value.ok) {
      const data = await planetsRes.value.json();
      planets = data.output || [];
    }

    if (wheelRes.status === 'fulfilled' && wheelRes.value.ok) {
      const data = await wheelRes.value.json();
      wheel = data.svg || data.output || '';
    }

    if (housesRes.status === 'fulfilled' && housesRes.value.ok) {
      const data = await housesRes.value.json();
      // Houses output: array of {house: N, degree: X} or similar
      const housesOutput = data.output || data.houses || [];
      houseCusps = housesOutput.map(h => ({
        house: h.house || h.number || h.id,
        degree: h.fullDegree || h.degree || h.cusp || 0
      }));
    }

    // Calculate house number for each planet using house cusps
    if (houseCusps.length >= 12 && planets.length > 0) {
      const cusps = houseCusps.map(h => h.degree).sort((a,b) => a-b);
      for (const planet of planets) {
        const deg = planet.fullDegree || 0;
        let houseNum = 12;
        for (let i = 0; i < cusps.length; i++) {
          const nextCusp = cusps[(i+1) % cusps.length];
          if (nextCusp > cusps[i]) {
            if (deg >= cusps[i] && deg < nextCusp) { houseNum = i+1; break; }
          } else {
            // Wraps around 360
            if (deg >= cusps[i] || deg < nextCusp) { houseNum = i+1; break; }
          }
        }
        planet.house = houseNum;
      }
    }

  } catch (e) {
    console.error('API error:', e.message);
  }

  return res.status(200).json({ planets, wheel, houseCusps });
}
