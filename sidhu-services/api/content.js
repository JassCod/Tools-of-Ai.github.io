import { readContent, writeContent, isOwner, json } from './_lib.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return json(res, 200, await readContent());
  }
  if (req.method === 'PUT' || req.method === 'POST') {
    if (!isOwner(req)) return json(res, 401, { error: 'Not authorised' });
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const saved = await writeContent(body || {});
      return json(res, 200, { ok: true, content: saved });
    } catch (err) {
      console.error(err);
      return json(res, 500, { error: 'Could not save content' });
    }
  }
  res.setHeader('Allow', 'GET, PUT');
  return json(res, 405, { error: 'Method not allowed' });
}
