import {accessCategories} from '../_lib/access-categories.js';
import { guestsCollection } from '../_lib/db.js';
import { getConfig } from '../_lib/config.js';
import { createGuestListPdf } from '../_lib/guest-pdf.js';
import { requireAdmin } from '../_lib/auth.js';
import { method, fail } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!method(req, res, 'GET') || !(await requireAdmin(req, res))) return;
  const category=req.query.category;
  if(category && !Object.hasOwn(accessCategories,category)) return res.status(400).json({error:'Categoría de acceso inválida.'});
  const filter=category==='general'?{accessCategory:{$nin:['general_diffusion','vip','backstage']}}:category?{accessCategory:category}:{};
  try {
    const [guests, config] = await Promise.all([
      (await guestsCollection()).find(filter, { projection: { name: 1, email: 1, gender: 1, accessCategory: 1, status: 1, checkedInAt: 1 } }).sort({ createdAt: -1, _id: -1 }).toArray(),
      getConfig()
    ]);
    const pdf = await createGuestListPdf(guests, config, new Date(), {accessCategory:category});
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${category?`lista-${({general:'general',general_diffusion:'difusion',vip:'vip',backstage:'backstage'})[category]}`:'control-invitados'}.pdf"`);
    return res.status(200).send(pdf);
  } catch (error) { return fail(res, error); }
}
