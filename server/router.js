import production from './admin/production.js';
import contacts from './admin/contacts.js';
import campaigns from './admin/campaigns.js';
import unsubscribe from './unsubscribe.js';
import config from './config.js';
import rsvp from './rsvp.js';
import login from './admin/login.js';
import me from './admin/me.js';
import logout from './admin/logout.js';
import guests from './admin/guests.js';
import guest from './admin/guests/[id].js';
import adminConfig from './admin/config.js';
import upload from './admin/upload.js';
import notify from './admin/notify/[id].js';
import image from './image/[id].js';
import exportPdf from './admin/export-pdf.js';
import gender from './admin/gender/[id].js';
import admins from './admin/admins.js';
import adminAccount from './admin/admins/[id].js';
import checkin from './admin/checkin/[id].js';
import audit from './admin/audit.js';

const routes = new Map([
  ['admin/production',production], ['admin/contacts',contacts], ['admin/campaigns',campaigns], ['unsubscribe',unsubscribe], ['config', config], ['rsvp', rsvp],
  ['admin/login', login], ['admin/me', me], ['admin/logout', logout],
  ['admin/guests', guests], ['admin/config', adminConfig],
  ['admin/upload', upload], ['admin/export-pdf', exportPdf],
  ['admin/admins', admins], ['admin/audit', audit]
]);
const dynamicRoutes = new Map([
  ['image', image], ['admin/guests', guest], ['admin/gender', gender],
  ['admin/notify', notify], ['admin/admins', adminAccount], ['admin/checkin', checkin]
]);

// Both the public URL and Vercel's rewritten URL use the same dispatch table.
export function resolveRoute(url, query = {}) {
  const parsed = new URL(url, 'http://localhost');
  const pathname = parsed.pathname.replace(/\/$/, '');
  let path;
  if (pathname === '/api/index' || pathname === '/api') {
    const route = query.route ?? parsed.searchParams.get('route');
    if (typeof route !== 'string') return null;
    path = route;
  } else if (pathname.startsWith('/api/')) {
    path = pathname.slice(5);
  } else return null;
  if (!/^[a-z0-9/-]+$/.test(path)) return null;
  if (routes.has(path)) return { handler: routes.get(path) };
  const slash = path.lastIndexOf('/');
  const base = path.slice(0, slash), id = path.slice(slash + 1);
  if (dynamicRoutes.has(base) && /^[a-f0-9]{24}$/.test(id))
    return { handler: dynamicRoutes.get(base), id };
  return null;
}

export async function dispatch(req, res) {
  const parsed = new URL(req.url, 'http://localhost');
  const query = { ...Object.fromEntries(parsed.searchParams), ...req.query };
  const route = resolveRoute(req.url, query);
  if (!route) return res.status(404).json({ error: 'Ruta de API no encontrada.' });
  // IDs in the URL always override query-string values supplied by the caller.
  req.query = { ...query, ...(route.id && { id: route.id }) };
  req.params = { ...req.params, ...(route.id && { id: route.id }) };
  return route.handler(req, res);
}
