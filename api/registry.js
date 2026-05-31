const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return res.status(500).json({ 
      error: 'Missing environment variables',
      hasUrl: !!UPSTASH_URL,
      hasToken: !!UPSTASH_TOKEN
    });
  }

  try {
    if (req.method === 'GET') {
      const response = await fetch(`${UPSTASH_URL}/get/registry`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        return res.status(500).json({ error: 'Upstash parse error', raw: text.substring(0, 200) });
      }
      return res.status(200).json(data.result ? JSON.parse(data.result) : {});
    }

    if (req.method === 'POST') {
      const body = JSON.stringify(req.body);
      const response = await fetch(`${UPSTASH_URL}/set/registry`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${UPSTASH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(["registry", body]),
      });
      const data = await response.json();
      return res.status(200).json({ ok: true, result: data });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
