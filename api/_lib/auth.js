import { createHmac, timingSafeEqual, scryptSync, randomBytes } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { database } from './db.js';
import { noStore } from './http.js';

const cookieName = 'jl_admin';
function equal(a, b) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
function signature(payload) { return createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('hex'); }
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password, hash = process.env.ADMIN_PASSWORD_HASH || '') {
  const [salt, expected] = hash.split(':');
  if (!salt || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(expected || '')) return false;
  return equal(scryptSync(password, salt, 64).toString('hex'), expected);
}
export function configured() { return !!(process.env.ADMIN_EMAIL && /^[a-f0-9]{32}:[a-f0-9]{128}$/.test(process.env.ADMIN_PASSWORD_HASH || '') && process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32); }
export function issue(res, admin = null) {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 8 * 60 * 60 * 1000, ...(admin && { id: String(admin._id), version: admin.authVersion || 0 }) })).toString('base64url');
  res.setHeader('Set-Cookie', `${cookieName}=${payload}.${signature(payload)}; Path=/; HttpOnly; ${process.env.LOCAL_DEV === 'true' ? '' : 'Secure; '}SameSite=Strict; Max-Age=28800`);
}
export function clear(res) { res.setHeader('Set-Cookie', `${cookieName}=; Path=/; HttpOnly; ${process.env.LOCAL_DEV === 'true' ? '' : 'Secure; '}SameSite=Strict; Max-Age=0`); }
export async function authorized(req) {
  if (!configured()) return null;
  const value = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!value) return null;
  const [payload, mac] = value.split('.');
  if (!payload || !mac || !equal(signature(payload), mac)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!Number.isFinite(session.exp) || session.exp <= Date.now()) return null;
    if (!session.id) return { role: 'owner', email: process.env.ADMIN_EMAIL };
    if (!/^[a-f0-9]{24}$/.test(session.id)) return null;
    const admin = await (await database()).collection('admins').findOne({ _id: new ObjectId(session.id), active: true, authVersion: session.version });
    return admin ? { role: 'admin', id: session.id, email: admin.email } : null;
  } catch (error) { if (error instanceof SyntaxError) return null; throw error; }
}
export async function requireAdmin(req, res, ownerOnly = false) {
  noStore(res);
  try {
    req.admin = await authorized(req);
    if (!req.admin) { res.status(401).json({ error: 'Iniciá sesión para continuar.' }); return false; }
    if (ownerOnly && req.admin.role !== 'owner') { res.status(403).json({ error: 'Solo la cuenta propietaria puede gestionar administradores.' }); return false; }
    return true;
  } catch (error) { console.error(error); res.status(500).json({ error: 'No se pudo verificar la sesión.' }); return false; }
}
export function sameOrigin(req, res) {
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (origin && host && new URL(origin).host === host) return true;
  res.status(403).json({ error: 'Origen no permitido.' });
  return false;
}
