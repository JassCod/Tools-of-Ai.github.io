import { isOwner, clearCookie, json } from './_lib.js';

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearCookie());
    return json(res, 200, { ok: true });
  }
  return json(res, 200, { owner: isOwner(req) });
}
