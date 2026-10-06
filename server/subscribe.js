import {production} from './_lib/production.js';
import {method,fail,noStore} from './_lib/http.js';
import {sameOrigin} from './_lib/auth.js';
export default async function handler(req,res){
 noStore(res);if(!method(req,res,'POST')||!sameOrigin(req,res))return;
 const body=req.body||{},email=typeof body.email==='string'?body.email.trim().toLowerCase():'',name=typeof body.name==='string'?body.name.trim().replace(/\s+/g,' '):'';
 if(body.marketingConsent!==true||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||name.length>120)return res.status(400).json({error:'Ingresá un email válido y aceptá recibir novedades.'});
 try{
 const contacts=(await production()).collection('contacts'),now=new Date();
 try{await contacts.updateOne({email},{$setOnInsert:{email,name,subscribed:false,createdAt:now}},{upsert:true})}catch(e){if(e.code!==11000)throw e}
 // A public submission cannot silently reactivate a previously unsubscribed address.
 await contacts.updateOne({email,unsubscribedAt:{$exists:false}},{$set:{subscribed:true,consentedAt:now,consentSource:'public-subscription',lastSeenAt:now,...(name?{name}:{})}});
 return res.json({message:'Solicitud de suscripción registrada.'});
 }catch(e){return fail(res,e)}
}
