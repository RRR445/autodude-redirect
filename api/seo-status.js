const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = 'RRR445/autodude-redirect';
const FILE_PATH = 'seo-report/status.json';
const API = 'https://api.github.com';

const HEADERS = () => ({
  'Authorization': `Bearer ${GITHUB_TOKEN}`,
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'seo-pipeline',
});

async function readFile() {
  const res = await fetch(`${API}/repos/${REPO}/contents/${FILE_PATH}`, { headers: HEADERS() });
  if (res.status === 404) return { content: {}, sha: null };
  if (!res.ok) throw new Error(`GitHub read ${res.status}`);
  const data = await res.json();
  return {
    content: JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8')),
    sha: data.sha,
  };
}

async function writeFile(content, sha) {
  const body = {
    message: 'Update SEO status [skip ci]',
    content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
  };
  if (sha) body.sha = sha;
  const res = await fetch(`${API}/repos/${REPO}/contents/${FILE_PATH}`, {
    method: 'PUT',
    headers: { ...HEADERS(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GitHub write ${res.status}: ${await res.text()}`);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const { content } = await readFile();
      return res.status(200).json(content);
    } catch (e) {
      console.error('seo-status GET:', e.message);
      return res.status(200).json({});
    }
  }

  if (req.method === 'POST') {
    const { key, status } = req.body || {};
    if (!key) return res.status(400).json({ error: 'key required' });
    try {
      const { content, sha } = await readFile();
      if (status === 'Avoin') delete content[key];
      else content[key] = status;
      await writeFile(content, sha);
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('seo-status POST:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
