import { ObjectId } from 'mongodb';
import { guestsCollection, mongoClient } from '../../_lib/db.js';
import { requireAdmin, sameOrigin } from '../../_lib/auth.js';
import { audit, actor, ActionError } from '../../_lib/audit.js';
import { method, fail } from '../../_lib/http.js';

export default async function handler(req, res) {
  if (!method(req, res, 'PATCH') || !(await requireAdmin(req, res)) || !sameOrigin(req, res)) return;
  const id = String(req.query?.id || req.params?.id || '');
  const checkedIn = req.body?.checkedIn;
  if (!/^[a-f0-9]{24}$/.test(id) || typeof checkedIn !== 'boolean') return res.status(400).json({ error: 'Datos de ingreso inválidos.' });
  try {
    const collection = await guestsCollection();
    const session = (await mongoClient()).startSession();
    let guest;
    try {
      await session.withTransaction(async () => {
        const current = await collection.findOne({ _id: new ObjectId(id) }, { session });
        if (!current) throw new ActionError(404, 'Invitado no encontrado.');
        if (current.status !== 'confirmed') throw new ActionError(409, 'Solo se puede registrar el ingreso de invitados confirmados.');
        if (!!current.checkedInAt === checkedIn) throw new ActionError(409, checkedIn ? 'Este invitado ya ingresó. Actualizá la lista.' : 'El ingreso ya fue anulado. Actualizá la lista.');
        const filter = { _id: current._id, status: 'confirmed', checkedInAt: checkedIn ? { $exists: false } : current.checkedInAt };
        const change = checkedIn ? { $set: { checkedInAt: new Date(), checkedInBy: actor(req), updatedAt: new Date() } } : { $unset: { checkedInAt: '', checkedInBy: '' }, $set: { updatedAt: new Date() } };
        guest = await collection.findOneAndUpdate(filter, change, { returnDocument: 'after', session });
        if (!guest) throw new ActionError(409, 'El ingreso cambió en otra sesión. Actualizá la lista.');
        await audit({ guestId: current._id, action: checkedIn ? 'checkin' : 'checkin_undo', actor: actor(req), before: { checkedIn: !checkedIn }, after: { checkedIn } }, session);
      });
    } finally { await session.endSession(); }
    const { _id, ...fields } = guest;
    return res.status(200).json({ guest: { ...fields, id: String(_id), created_at: fields.createdAt, updated_at: fields.updatedAt } });
  } catch (error) { return error instanceof ActionError ? res.status(error.status).json({ error: error.message }) : fail(res, error); }
}
