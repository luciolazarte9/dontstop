import { config as loadEnv } from 'dotenv';
import express from 'express';
import { createServer } from 'vite';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import configHandler from '../api/config.js';
import rsvpHandler from '../api/rsvp.js';
import loginHandler from '../api/admin/login.js';
import meHandler from '../api/admin/me.js';
import logoutHandler from '../api/admin/logout.js';
import guestsHandler from '../api/admin/guests.js';
import guestHandler from '../api/admin/guests/[id].js';
import adminConfigHandler from '../api/admin/config.js';
import uploadHandler from '../api/admin/upload.js';
import notifyHandler from '../api/admin/notify/[id].js';
import imageHandler from '../api/image/[id].js';
import exportPdfHandler from '../api/admin/export-pdf.js';
import genderHandler from '../api/admin/gender/[id].js';
import adminsHandler from '../api/admin/admins.js';
import adminAccountHandler from '../api/admin/admins/[id].js';
import checkinHandler from '../api/admin/checkin/[id].js';
import auditHandler from '../api/admin/audit.js';

loadEnv({ path: resolve('.env.local') });
process.env.LOCAL_DEV = 'true';
const app = express();
app.use(express.json({ limit: '3mb' }));
const routes = [
  ['/api/config', configHandler], ['/api/rsvp', rsvpHandler],
  ['/api/admin/login', loginHandler], ['/api/admin/me', meHandler], ['/api/admin/logout', logoutHandler],
  ['/api/admin/guests', guestsHandler], ['/api/admin/guests/:id', guestHandler], ['/api/admin/gender/:id', genderHandler], ['/api/admin/export-pdf', exportPdfHandler], ['/api/admin/notify/:id', notifyHandler],
  ['/api/admin/admins', adminsHandler], ['/api/admin/admins/:id', adminAccountHandler],
  ['/api/admin/checkin/:id', checkinHandler], ['/api/admin/audit', auditHandler],
  ['/api/admin/config', adminConfigHandler], ['/api/admin/upload', uploadHandler], ['/api/image/:id', imageHandler]
];
for (const [path, handler] of routes) app.all(path, (req, res, next) => Promise.resolve(handler(req, res)).catch(next));
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
app.use(vite.middlewares);
app.use(async (req, res, next) => {
  try {
    const html = await readFile(resolve('index.html'), 'utf8');
    res.status(200).type('html').send(await vite.transformIndexHtml(req.originalUrl, html));
  } catch (error) { next(error); }
});
const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Invitación: http://localhost:${port}`);
  console.log(`Administrador: http://localhost:${port}/admin`);
  if (!process.env.MONGODB_URI) console.warn('Falta MONGODB_URI en .env.local: el evento no podrá cargarse.');
});
