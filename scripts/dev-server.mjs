import { config as loadEnv } from 'dotenv';
import express from 'express';
import { createServer } from 'vite';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import apiHandler from '../api/index.js';

loadEnv({ path: resolve('.env.local') });
process.env.LOCAL_DEV = 'true';
const app = express();
app.use(express.json({ limit: '3mb' }));
app.all(['/api', '/api/*'], (req, res, next) => Promise.resolve(apiHandler(req, res)).catch(next));
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
