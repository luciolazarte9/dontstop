import { ObjectId } from 'mongodb';
import { database } from '../_lib/db.js';
import { requireAdmin } from '../_lib/auth.js';
import { method, fail } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!method(req, res, 'GET') || !(await requireAdmin(req, res))) return;
  const id = req.query?.guestId;
  if (id !== undefined && (typeof id !== 'string' || !/^[a-f0-9]{24}$/.test(id))) return res.status(400).json({ error: 'Invitado inválido.' });
  try {
    const entries = await (await database()).collection('auditLog').find(id ? { guestId: new ObjectId(id) } : { action: { $ne: 'rsvp' } }).sort({ at: -1, _id: -1 }).limit(100).toArray();
    return res.status(200).json({ entries: entries.map(({ _id, guestId, ...entry }) => ({ ...entry, id: String(_id), guestId: guestId ? String(guestId) : null })) });
  } catch (error) { return fail(res, error); }
}
