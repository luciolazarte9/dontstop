import { authorized } from '../_lib/auth.js';
import { method, noStore } from '../_lib/http.js';
export default async function handler(req, res) {
  noStore(res);
  if (!method(req, res, 'GET')) return;
  try {
    const admin = await authorized(req);
    return res.status(admin ? 200 : 401).json({ authenticated: !!admin, role: admin?.role || null, email: admin?.email || null });
  } catch (error) { console.error(error); return res.status(500).json({ error: 'No se pudo verificar la sesión.' }); }
}
