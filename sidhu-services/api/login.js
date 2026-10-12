import { checkPassword, sessionCookie, json } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  // Small fixed delay to slow down password guessing.
  await new Promise((r) => setTimeout(r, 600));
  if (!checkPassword(body.password)) return json(res, 401, { error: 'Incorrect password' });
  res.setHeader('Set-Cookie', sessionCookie());
  return json(res, 200, { ok: true });
}
