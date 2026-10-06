import { guestsCollection, database, mongoClient } from './_lib/db.js';
import {accessCategories} from './_lib/access-categories.js';
import { audit } from './_lib/audit.js';
import { production, lock } from './_lib/production.js';
import { requestStatus } from './_lib/capacity.js';
import { method, fail, noStore } from './_lib/http.js';
import { sameOrigin } from './_lib/auth.js';
export default async function handler(req, res) {
  noStore(res);
  if (!method(req, res, 'POST') || !sameOrigin(req, res)) return;
  const { name, email, attending, gender } = req.body || {};
  const accessCategory = req.body?.accessCategory ?? 'general';
  const cleanName = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (cleanName.length < 2 || cleanName.length > 120 || cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || !['yes', 'no'].includes(attending) || !['man', 'woman', 'unspecified'].includes(gender) || typeof accessCategory !== 'string' || !Object.hasOwn(accessCategories, accessCategory))
    return res.status(400).json({ error: 'Revisá el nombre, email, asistencia y categoría.' });
  try {
    const collection = await guestsCollection();
    const db = await production();
    const session = (await mongoClient()).startSession();
    let status;
    try {
      await session.withTransaction(async () => {
        await lock(db, session);
        if (attending === 'yes') {
          const event = await db.collection('settings').findOne({ _id: 'event' }, { session });
          const capacity = event?.config?.capacity || 0;
          const confirmed = capacity ? await collection.countDocuments({ status: 'confirmed' }, { session }) : 0;
          status = requestStatus(true, capacity, confirmed);
        } else status = requestStatus(false, 0, 0);
        const now = new Date();
        const result = await collection.insertOne({ name: cleanName, email: cleanEmail, gender, accessCategory, attending: attending === 'yes', status, createdAt: now, updatedAt: now }, { session });
        await db.collection('contacts').updateOne({email:cleanEmail}, { $set:{name:cleanName,lastSeenAt:now}, $setOnInsert:{email:cleanEmail,subscribed:false,createdAt:now} }, {upsert:true,session});
        if(req.body.marketingConsent === true) await db.collection('contacts').updateOne({email:cleanEmail}, {$set:{subscribed:true,consentedAt:now,consentSource:'rsvp-checkbox'},$unset:{unsubscribedAt:''}}, {session});
        await audit({ guestId: result.insertedId, action: 'rsvp', actor: { role: 'guest', email: cleanEmail }, after: { status, gender, accessCategory } }, session);
      });
    } finally { await session.endSession(); }
    return res.status(201).json({ message: 'Respuesta recibida.', status, accessCategory });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'Ese email ya registró una respuesta. Contactá a los organizadores si necesitás cambiarla.' });
    return fail(res, error);
  }
}
