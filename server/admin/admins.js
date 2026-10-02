import { database, mongoClient } from '../_lib/db.js';
import { requireAdmin, sameOrigin, hashPassword } from '../_lib/auth.js';
import { audit, actor } from '../_lib/audit.js';
import { fail } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Método no permitido.' });
  if (!(await requireAdmin(req, res, true))) return;
  if (req.method === 'POST' && !sameOrigin(req, res)) return;
  try {
    const collection = (await database()).collection('admins');
    if (req.method === 'GET') {
      const docs = await collection.find({}, { projection: { email: 1, active: 1, createdAt: 1 } }).sort({ createdAt: 1 }).toArray();
      return res.status(200).json({ admins: docs.map(({ _id, ...fields }) => ({ id: String(_id), ...fields })) });
    }
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = req.body?.password;
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email === process.env.ADMIN_EMAIL.trim().toLowerCase() || typeof password !== 'string' || password.length < 12 || password.length > 1024)
      return res.status(400).json({ error: 'Ingresá otro email válido y una contraseña de 12 a 1024 caracteres.' });
    await collection.createIndex({ email: 1 }, { unique: true });
    const passwordHash = hashPassword(password);
    const session = (await mongoClient()).startSession();
    let result;
    try {
      await session.withTransaction(async () => {
        result = await collection.insertOne({ email, passwordHash, active: true, authVersion: 0, createdAt: new Date(), updatedAt: new Date() }, { session });
        await audit({ action: 'admin_create', actor: actor(req), after: { email, active: true } }, session);
      });
    } finally { await session.endSession(); }
    return res.status(201).json({ admin: { id: String(result.insertedId), email, active: true } });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'Ese email ya pertenece a un administrador.' });
    return fail(res, error);
  }
}
