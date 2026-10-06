import { createHmac, timingSafeEqual } from 'node:crypto';
export function siteUrl() {
 let url;
 try{url=new URL(process.env.APP_URL || '')}catch{throw new Error('Configurá APP_URL con la URL pública de tu aplicación.');}
 if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||(url.protocol!=='https:' && !(process.env.LOCAL_DEV==='true'&&url.protocol==='http:')))throw new Error('Configurá APP_URL con la URL pública HTTPS de tu aplicación, sin rutas.');
 return url.origin;
}
export function token(id) {return createHmac('sha256',process.env.SESSION_SECRET).update(`marketing-unsubscribe:${id}`).digest('hex');}
export function validToken(id,value) {
 if(!/^[a-f0-9]{24}$/.test(id||'')||!/^[a-f0-9]{64}$/.test(value||''))return false;
 return timingSafeEqual(Buffer.from(token(id)),Buffer.from(value));
}
export function personalized(text,contact) {return text.replace(/\{nombre\}/g,()=>contact.name||'Hola');}
export function campaignInput(body) {
 if(typeof body.subject!=='string'||body.subject.trim().length<2||body.subject.length>180||/[\r\n]/.test(body.subject)||typeof body.text!=='string'||body.text.trim().length<5||body.text.length>10000)throw new Error('Completá un asunto (2–180 caracteres) y un mensaje (5–10.000 caracteres).');
 return {subject:body.subject.trim(),text:body.text.trim()};
}
