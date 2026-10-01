import { guestsCollection } from '../_lib/db.js';
import { getConfig } from '../_lib/config.js';
import { createGuestListPdf } from '../_lib/guest-pdf.js';
import { requireAdmin } from '../_lib/auth.js';
import { method, fail } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!method(req, res, 'GET') || !(await requireAdmin(req, res))) return;
  try {
    const [guests, config] = await Promise.all([
      (await guestsCollection()).find({}, { projection: { name: 1, email: 1, gender: 1, status: 1, checkedInAt: 1 } }).sort({ createdAt: -1, _id: -1 }).limit(5000).toArray(),
      getConfig()
    ]);
    const pdf = await createGuestListPdf(guests, config);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="control-invitados.pdf"');
    return res.status(200).send(pdf);
  } catch (error) { return fail(res, error); }
}
