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

  try {
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

    if (planetsRes.status === 'fulfilled' && planetsRes.value.ok) {
      const data = await planetsRes.value.json();
      planets = data.output || [];
    }

    if (wheelRes.status === 'fulfilled' && wheelRes.value.ok) {
      const data = await wheelRes.value.json();
      // freeastrologyapi devuelve chart_url (URL a SVG en S3)
      wheel = data.chart_url || data.svg || data.output || '';
    }

    // Calculate house numbers using Equal House system from Ascendant
    // Equal house: each house is exactly 30 degrees from Ascendant
    const ascendant = planets.find(p => p.planet && p.planet.en === 'Ascendant');
    if (ascendant && ascendant.fullDegree !== undefined) {
      const ascDeg = ascendant.fullDegree;
      // House cusps: House 1 starts at Ascendant, each next house +30 degrees
      const cusps = Array.from({length: 12}, (_, i) => (ascDeg + i * 30) % 360);
      
      for (const planet of planets) {
        if (planet.fullDegree === undefined) continue;
        const pDeg = planet.fullDegree;
        let houseNum = 1;
        for (let h = 11; h >= 0; h--) {
          const cusp = cusps[h];
          const nextCusp = cusps[(h + 1) % 12];
          // Handle wrap-around
          let inHouse;
          if (cusp <= nextCusp) {
            inHouse = pDeg >= cusp && pDeg < nextCusp;
          } else {
            inHouse = pDeg >= cusp || pDeg < nextCusp;
          }
          if (inHouse) { houseNum = h + 1; break; }
        }
        planet.house = houseNum;
      }
    }

  } catch (e) {
    console.error('API error:', e.message);
  }

  return res.status(200).json({ planets, wheel });
}
