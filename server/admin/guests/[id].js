import { ObjectId } from 'mongodb';
import { guestsCollection, database, mongoClient } from '../../_lib/db.js';
import { requireAdmin, sameOrigin } from '../../_lib/auth.js';
import { notifyGuest } from '../../_lib/mail.js';
import { audit, actor, ActionError } from '../../_lib/audit.js';
import { hasSpace } from '../../_lib/capacity.js';
import { method, fail } from '../../_lib/http.js';

const serialize = ({ _id, ...guest }) => ({ ...guest, id: String(_id), created_at: guest.createdAt, updated_at: guest.updatedAt });
export default async function handler(req, res) {
  if (!method(req, res, 'PATCH') || !(await requireAdmin(req, res)) || !sameOrigin(req, res)) return;
  const id = String(req.query?.id || req.params?.id || '');
  const status = req.body?.status;
  if (!/^[a-f0-9]{24}$/.test(id) || !['pending', 'waitlist', 'confirmed', 'rejected', 'not_attending'].includes(status))
    return res.status(400).json({ error: 'Estado o invitado inválido.' });
  try {
    const collection = await guestsCollection();
    const db = await database();
    const session = (await mongoClient()).startSession();
    let changed = false, doc;
    try {
      await session.withTransaction(async () => {
        const current = await collection.findOne({ _id: new ObjectId(id) }, { session });
        if (!current) throw new ActionError(404, 'Invitado no encontrado.');
        if (current.status === status) { doc = current; changed = false; return; }
        if (current.checkedInAt && status !== 'confirmed') throw new ActionError(409, 'Primero anulá el ingreso para cambiar el estado.');
        if (status === 'confirmed' || current.status === 'confirmed') {
          await db.collection('settings').updateOne({ _id: 'capacityLock' }, { $inc: { revision: 1 } }, { upsert: true, session });
          if (status === 'confirmed') {
            const event = await db.collection('settings').findOne({ _id: 'event' }, { session });
            const capacity = event?.config?.capacity || 0;
            if (!hasSpace(capacity, await collection.countDocuments({ status: 'confirmed' }, { session })))
              throw new ActionError(409, 'El cupo está completo. El invitado permanece en espera o pendiente.');
          }
        }
        doc = await collection.findOneAndUpdate({ _id: current._id, status: current.status }, { $set: { status, updatedAt: new Date(), notification: null } }, { returnDocument: 'after', session });
        if (!doc) throw new ActionError(409, 'El estado cambió en otra sesión. Actualizá la lista.');
        await audit({ guestId: current._id, action: 'status', actor: actor(req), before: { status: current.status }, after: { status } }, session);
        changed = true;
      });
    } finally { await session.endSession(); }
    if (!changed) return res.status(200).json({ guest: serialize(doc), notification: { sent: false, message: 'El estado no cambió; no se envió otro correo.' } });
    const notification = ['confirmed','rejected'].includes(status) ? await notifyGuest(collection, doc) : { sent: false, message: 'Estado actualizado.' };
    const updated = await collection.findOne({ _id: doc._id });
    if (!updated) return res.status(409).json({error:"La lista se reseteó. Actualizá el panel."});
    return res.status(200).json({ guest: serialize(updated), notification });
  } catch (error) { return error instanceof ActionError ? res.status(error.status).json({ error: error.message }) : fail(res, error); }
}
