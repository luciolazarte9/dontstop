import { database } from '../_lib/db.js';
import { requireAdmin, sameOrigin } from '../_lib/auth.js';
import { method, fail } from '../_lib/http.js';
export default async function handler(req, res) {
  if (!method(req, res, 'POST') || !(await requireAdmin(req, res)) || !sameOrigin(req, res)) return;
  const { data } = req.body || {};
  if (typeof data !== 'string' || data.length > 2_100_000) return res.status(400).json({ error: 'La imagen debe pesar menos de 1,5 MB.' });
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
  if (!match) return res.status(400).json({ error: 'Usá una imagen JPEG, PNG o WebP.' });
  const bytes = Buffer.from(match[2], 'base64');
  const detected = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? 'image/jpeg'
    : bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) ? 'image/png'
    : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp' : null;
  if (!detected || detected !== `image/${match[1]}` || bytes.length > 1_500_000) return res.status(400).json({ error: 'Imagen inválida o demasiado grande.' });
  try {
    const result = await (await database()).collection('images').insertOne({ data: bytes, mime: detected, createdAt: new Date() });
    return res.status(201).json({ url: `/api/image/${result.insertedId}` });
  } catch (error) { return fail(res, error); }
}
