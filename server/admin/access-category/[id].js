import { accessCategories, accessCategoryOf } from '../../_lib/access-categories.js';
import { ObjectId } from 'mongodb';
import { guestsCollection, mongoClient } from '../../_lib/db.js';
import { audit, actor, ActionError } from '../../_lib/audit.js';
import { requireAdmin, sameOrigin } from '../../_lib/auth.js';
import { method, fail } from '../../_lib/http.js';

export default async function handler(req, res) {
  if (!method(req, res, 'PATCH') || !(await requireAdmin(req, res)) || !sameOrigin(req, res)) return;
  const id = String(req.query?.id || req.params?.id || '');
  const accessCategory = req.body?.accessCategory;
  if (!/^[a-f0-9]{24}$/.test(id) || typeof accessCategory !== 'string' || !Object.hasOwn(accessCategories, accessCategory))
    return res.status(400).json({ error: 'Invitado o categoría inválida.' });
  try {
    const collection = await guestsCollection();
    const session = (await mongoClient()).startSession();
    let guest;
    try {
      await session.withTransaction(async () => {
        const before = await collection.findOne({ _id: new ObjectId(id) }, { session });
        if (!before) throw new ActionError(404, 'Invitado no encontrado.');
        if (accessCategoryOf(before) === accessCategory) { guest = before; return; }
        guest = await collection.findOneAndUpdate({ _id: before._id, accessCategory: before.accessCategory }, { $set: { accessCategory, updatedAt: new Date() } }, { returnDocument: 'after', session });
        if (!guest) throw new ActionError(409, 'La categoría cambió en otra sesión. Actualizá la lista.');
        await audit({ guestId: before._id, action: 'access_category', actor: actor(req), before: { accessCategory: accessCategoryOf(before) }, after: { accessCategory } }, session);
      });
    } finally { await session.endSession(); }
    const { _id, ...data } = guest;
    return res.status(200).json({ guest: { ...data, id: String(_id), created_at: data.createdAt, updated_at: data.updatedAt } });
  } catch (error) { return error instanceof ActionError ? res.status(error.status).json({ error: error.message }) : fail(res, error); }
}
