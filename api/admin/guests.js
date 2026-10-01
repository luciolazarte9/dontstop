import { guestsCollection } from '../_lib/db.js';
import { requireAdmin } from '../_lib/auth.js';
import { method, fail } from '../_lib/http.js';
export default async function handler(req, res) {
  if (!method(req, res, 'GET') || !(await requireAdmin(req, res))) return;
  try {
    const docs = await (await guestsCollection()).find({}, { projection: { name:1,email:1,gender:1,attending:1,status:1,checkedInAt:1,checkedInBy:1,createdAt:1,updatedAt:1,notification:1 } }).sort({ createdAt:-1, _id:-1 }).limit(5000).toArray();
    return res.status(200).json({ guests: docs.map(({ _id, ...doc }) => ({ ...doc, id: String(_id), created_at: doc.createdAt, updated_at: doc.updatedAt })) });
  } catch (error) { return fail(res, error); }
}
