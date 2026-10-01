import { database, mongoClient } from '../_lib/db.js';
import { audit, actor, ActionError } from '../_lib/audit.js';
import { getConfig, validateConfig } from '../_lib/config.js';
import { requireAdmin, sameOrigin } from '../_lib/auth.js';
import { fail } from '../_lib/http.js';
export default async function handler(req, res) {
  if (!['GET','PUT'].includes(req.method)) return res.status(405).json({ error:'Método no permitido.' });
  if (!(await requireAdmin(req, res))) return;
  if (req.method === 'GET') {
    try { return res.status(200).json({ config: await getConfig() }); }
    catch (error) { return fail(res, error); }
  }
  if (!sameOrigin(req, res)) return;
  const config = validateConfig(req.body);
  if (!config) return res.status(400).json({ error: 'Revisá los datos del evento y las URLs de imágenes.' });
  try {
    const db = await database();
    const session = (await mongoClient()).startSession();
    try {
      await session.withTransaction(async () => {
        await db.collection('settings').updateOne({ _id: 'capacityLock' }, { $inc: { revision: 1 } }, { upsert: true, session });
        const confirmed = await db.collection('guests').countDocuments({ status: 'confirmed' }, { session });
        if (config.capacity && confirmed > config.capacity) throw new ActionError(409, `Ya hay ${confirmed} confirmados; el cupo no puede ser menor.`);
        const before = await db.collection('settings').findOne({ _id: 'event' }, { session });
        await db.collection('settings').updateOne({ _id: 'event' }, { $set: { config, updatedAt: new Date() } }, { upsert: true, session });
        await audit({ action: 'event_config', actor: actor(req), before: { capacity: before?.config?.capacity || 0 }, after: { capacity: config.capacity } }, session);
      });
    } finally { await session.endSession(); }
    return res.status(200).json({ config });
  } catch (error) { return error instanceof ActionError ? res.status(error.status).json({ error: error.message }) : fail(res, error); }
}
