import { getConfig, publicConfig } from './_lib/config.js';
import { method, fail } from './_lib/http.js';
export default async function handler(req, res) {
  if (!method(req, res, 'GET')) return;
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=15');
  try { return res.status(200).json({ config: publicConfig(await getConfig()) }); }
  catch (error) { return fail(res, error); }
}
