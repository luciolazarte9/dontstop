import { clear, sameOrigin } from '../_lib/auth.js';
import { method, noStore } from '../_lib/http.js';
export default function handler(req, res) {
  noStore(res);
  if (!method(req, res, 'POST') || !sameOrigin(req, res)) return;
  clear(res);
  res.status(200).json({ ok: true });
}
