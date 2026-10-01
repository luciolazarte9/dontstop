import { ObjectId } from 'mongodb';
import { database } from '../_lib/db.js';
import { method, fail } from '../_lib/http.js';
export default async function handler(req, res) {
  if (!method(req, res, 'GET')) return;
  const id = String(req.query?.id || req.params?.id || '');
  if (!/^[a-f0-9]{24}$/.test(id)) return res.status(404).end();
  try {
    const doc = await (await database()).collection('images').findOne({ _id: new ObjectId(id) });
    if (!doc) return res.status(404).end();
    res.setHeader('Content-Type', doc.mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).end(doc.data.buffer ? Buffer.from(doc.data.buffer) : Buffer.from(doc.data));
  } catch (error) { return fail(res, error); }
}
