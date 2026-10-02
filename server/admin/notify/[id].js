import { ObjectId } from 'mongodb';
import { guestsCollection } from '../../_lib/db.js';
import { requireAdmin, sameOrigin } from '../../_lib/auth.js';
import { notifyGuest } from '../../_lib/mail.js';
import { audit, actor } from '../../_lib/audit.js';
import { method, fail } from '../../_lib/http.js';
export default async function handler(req, res) {
  if (!method(req, res, 'POST') || !(await requireAdmin(req, res)) || !sameOrigin(req, res)) return;
  const id = String(req.query?.id || req.params?.id || '');
  if (!/^[a-f0-9]{24}$/.test(id)) return res.status(400).json({ error: 'Invitado inválido.' });
  try {
    const collection = await guestsCollection();
    const guest = await collection.findOne({ _id: new ObjectId(id) });
    if (!guest) return res.status(404).json({ error: 'Invitado no encontrado.' });
    if (!['confirmed','rejected'].includes(guest.status)) return res.status(400).json({ error: 'Confirmá o rechazá antes de enviar el correo.' });
    await audit({ guestId: guest._id, action: 'email_resend', actor: actor(req), after: { status: guest.status } });
    const notification = await notifyGuest(collection, guest);
    const updated = await collection.findOne({ _id: guest._id });
    const { _id, ...fields } = updated;
    return res.status(200).json({ guest: { ...fields, id: String(_id), created_at: fields.createdAt, updated_at: fields.updatedAt }, notification });
  } catch (error) { return fail(res, error); }
}
