import { ObjectId } from 'mongodb';
import { database } from './_lib/db.js';
import { validToken } from './_lib/marketing.js';
export default async function handler(req,res) {
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Security-Policy',"default-src 'none'; form-action 'self'; style-src 'unsafe-inline'; frame-ancestors 'none'");
 if(!['GET','POST'].includes(req.method))return res.status(405).end();
 const {id,token}=req.query;
 if(!validToken(id,token))return res.status(400).send('Enlace de baja inválido.');
 if(req.method==='POST')await (await database()).collection('contacts').updateOne({_id:new ObjectId(id)},{$set:{subscribed:false,unsubscribedAt:new Date()}});
 res.setHeader('Content-Type','text/html; charset=utf-8');
 return res.send(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dont Stop · Baja de novedades</title><body style="font:18px system-ui;padding:40px;max-width:600px;margin:auto"><h1>Dont Stop</h1>${req.method==='POST'?'<p>Tu baja está registrada. No recibirás nuevas campañas.</p>':'<p>¿Querés dejar de recibir nuestras novedades?</p><form method="post"><button style="padding:16px;font:inherit">Confirmar baja</button></form>'}</body></html>`);
}
