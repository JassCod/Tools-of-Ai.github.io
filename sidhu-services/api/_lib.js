import crypto from 'node:crypto';
import { get, put } from '@vercel/blob';

const CONTENT_PATH = 'site/content.json';
const COOKIE = 'ss_admin';
const SESSION_HOURS = 12;

// Fields the owner can edit from the admin panel. Anything else is dropped.
export const FIELDS = {
  phone: 60,
  whatsapp: 60,
  email: 120,
  officeIndia: 300,
  officeAustralia: 300,
  hours: 160,
  linkedin: 300,
  facebook: 300,
  instagram: 300,
  announcement: 220,
};

export function sanitize(input) {
  const out = {};
  for (const [key, max] of Object.entries(FIELDS)) {
    const v = input && typeof input[key] === 'string' ? input[key].trim().slice(0, max) : '';
    out[key] = v;
  }
  for (const key of ['linkedin', 'facebook', 'instagram']) {
    if (out[key] && !/^https:\/\/[^\s]+$/i.test(out[key])) out[key] = '';
  }
  if (out.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)) out.email = '';
  return out;
}

export async function readContent() {
  try {
    const res = await get(CONTENT_PATH, { access: 'private', useCache: false });
    if (!res || !res.stream) return sanitize({});
    const text = await new Response(res.stream).text();
    return sanitize(JSON.parse(text));
  } catch {
    return sanitize({});
  }
}

export async function writeContent(data) {
  const clean = sanitize(data);
  await put(CONTENT_PATH, JSON.stringify({ ...clean, updatedAt: new Date().toISOString() }), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
  return clean;
}

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET is not configured');
  return s;
}

function hmac(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function checkPassword(password) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof password !== 'string') return false;
  return safeEqual(password, expected);
}

export function sessionCookie() {
  const exp = Date.now() + SESSION_HOURS * 3600 * 1000;
  const body = Buffer.from(JSON.stringify({ role: 'owner', exp })).toString('base64url');
  const token = `${body}.${hmac(body)}`;
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function isOwner(req) {
  const raw = req.headers.cookie || '';
  const match = raw.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`));
  if (!match) return false;
  const [body, sig] = match.slice(COOKIE.length + 1).split('.');
  if (!body || !sig) return false;
  try {
    if (!safeEqual(sig, hmac(body))) return false;
    const { role, exp } = JSON.parse(Buffer.from(body, 'base64url').toString());
    return role === 'owner' && typeof exp === 'number' && exp > Date.now();
  } catch {
    return false;
  }
}

export function json(res, status, data) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).send(JSON.stringify(data));
}
