import { configured, verifyPassword, issue, sameOrigin } from '../_lib/auth.js';
import { database } from '../_lib/db.js';
import { method, noStore, fail } from '../_lib/http.js';
export default async function handler(req, res) {
  noStore(res);
  if (!method(req, res, 'POST') || !sameOrigin(req, res)) return;
  if (!configured()) return res.status(503).json({ error: 'Revisá ADMIN_EMAIL, ADMIN_PASSWORD_HASH y SESSION_SECRET del entorno.' });
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || password.length > 1024)
    return res.status(400).json({ error: 'Ingresá email y contraseña.' });
  const normalized = email.trim().toLowerCase();
  if (normalized === process.env.ADMIN_EMAIL.trim().toLowerCase() && verifyPassword(password)) {
    issue(res);
    return res.status(200).json({ ok: true, role: 'owner' });
  }
  try {
    const admin = await (await database()).collection('admins').findOne({ email: normalized, active: true });
    if (!admin || !verifyPassword(password, admin.passwordHash))
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    issue(res, admin);
    return res.status(200).json({ ok: true, role: 'admin' });
  } catch (error) { return fail(res, error); }
}
