import { ObjectId } from 'mongodb';
import { database, mongoClient } from '../../_lib/db.js';
import { requireAdmin, sameOrigin, hashPassword } from '../../_lib/auth.js';
import { audit, actor, ActionError } from '../../_lib/audit.js';
import { method, fail } from '../../_lib/http.js';

export default async function handler(req, res) {
  if (!method(req, res, 'PATCH') || !(await requireAdmin(req, res, true)) || !sameOrigin(req, res)) return;
  const id = String(req.query?.id || req.params?.id || '');
  const { active, password } = req.body || {};
  if (!/^[a-f0-9]{24}$/.test(id) || (active === undefined && password === undefined) || (active !== undefined && typeof active !== 'boolean') || (password !== undefined && (typeof password !== 'string' || password.length < 12 || password.length > 1024)))
    return res.status(400).json({ error: 'Datos de administrador inválidos.' });
  try {
    const change = { updatedAt: new Date() };
    if (active !== undefined) change.active = active;
    if (password !== undefined) change.passwordHash = hashPassword(password);
    const collection = (await database()).collection('admins');
    const session = (await mongoClient()).startSession();
    let admin;
    try {
      await session.withTransaction(async () => {
        const previous = await collection.findOne({ _id: new ObjectId(id) }, { session });
        if (!previous) throw new ActionError(404, 'Administrador no encontrado.');
        admin = await collection.findOneAndUpdate({ _id: previous._id }, { $set: change, $inc: { authVersion: 1 } }, { returnDocument: 'after', projection: { email: 1, active: 1, createdAt: 1 }, session });
        await audit({ action: 'admin_update', actor: actor(req), before: { email: previous.email, active: previous.active }, after: { email: previous.email, active: admin.active, passwordChanged: password !== undefined } }, session);
      });
    } finally { await session.endSession(); }
    const { _id, ...fields } = admin;
    return res.status(200).json({ admin: { id: String(_id), ...fields } });
  } catch (error) { return error instanceof ActionError ? res.status(error.status).json({ error: error.message }) : fail(res, error); }
}
