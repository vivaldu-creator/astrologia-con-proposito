export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const CLAUDE_KEY = process.env.CLAUDE_KEY || req.body.apiKey;
  if (!CLAUDE_KEY) return res.status(400).json({ error: 'No API key provided' });

  try {
    const { prompt, max_tokens } = req.body;
    const tokens = Math.min(parseInt(max_tokens) || 1500, 4000);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: tokens,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const text = data.content && data.content[0] ? data.content[0].text : '';
    return res.status(200).json({ text });

  } catch (error) {
    console.error('Claude API error:', error);
    return res.status(500).json({ error: error.message, text: '' });
  }
}
