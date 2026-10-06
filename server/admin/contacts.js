import {parseContacts} from '../_lib/contact-import.js';
import {audit,actor} from '../_lib/audit.js';
import { ObjectId } from 'mongodb';
import { production, serialize } from '../_lib/production.js';
import { requireAdmin, sameOrigin } from '../_lib/auth.js';
import { fail } from '../_lib/http.js';
export default async function handler(req,res) {
 if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Método no permitido.'});
 if(!(await requireAdmin(req,res,true)))return;
 if(req.method==='POST'&&!sameOrigin(req,res))return;
 try{
  const db=await production(), contacts=db.collection('contacts');
  if(req.method==='POST') {
   if(['preview-import','import'].includes(req.body?.action)) {
    let parsed;try{parsed=parseContacts(req.body.csv)}catch(e){return res.status(400).json({error:e.message})}
    if(!parsed.contacts.length)return res.status(400).json({error:'No hay emails válidos para importar.'});
    const existing=await contacts.find({email:{$in:parsed.contacts.map(c=>c.email)}},{projection:{email:1,subscribed:1,unsubscribedAt:1}}).toArray();
    const summary={total:parsed.total,valid:parsed.contacts.length,invalid:parsed.invalid.length,duplicates:parsed.duplicates,existing:existing.length,newContacts:parsed.contacts.length-existing.length,excluded:existing.filter(c=>c.unsubscribedAt).length,examples:parsed.contacts.slice(0,8),errors:parsed.invalid.slice(0,8)};
    if(req.body.action==='preview-import')return res.json({summary});
    if(req.body.confirm!=='IMPORTAR')return res.status(400).json({error:'Revisá y confirmá la importación.'});
    const consent=req.body.consent===true, now=new Date();
    for(let offset=0;offset<parsed.contacts.length;offset+=500){
     const batch=parsed.contacts.slice(offset,offset+500);
     await contacts.bulkWrite(batch.map(c=>({updateOne:{filter:{email:c.email},update:{$setOnInsert:{...c,subscribed:false,createdAt:now,importedAt:now}},upsert:true}})));
     // An import never overrides an existing unsubscribe, even when consent is asserted.
     if(consent)await contacts.updateMany({email:{$in:batch.map(c=>c.email)},unsubscribedAt:{$exists:false}},{$set:{subscribed:true,consentedAt:now,consentSource:'admin-import-confirmed',consentActor:actor(req)}});
    }
    await audit({action:'contacts_import',actor:actor(req),after:{valid:summary.valid,consent,duplicates:summary.duplicates,invalid:summary.invalid}});
    return res.json({summary,message:`Importación completada: ${summary.valid} emails válidos procesados. Las bajas existentes se conservaron.`});
   }
   if(!/^[a-f0-9]{24}$/.test(req.body?.id||''))return res.status(400).json({error:'Contacto inválido.'});
   await contacts.updateOne({_id:new ObjectId(req.body.id)},{$set:{subscribed:false,unsubscribedAt:new Date()}});
   return res.json({message:'Contacto excluido de campañas.'});
  }
  const search=String(req.query.search||'').slice(0,120).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const page=Math.max(0,Math.min(100000,Math.floor(Number(req.query.page)||0)));
  const filter=search?{$or:[{email:{$regex:search,$options:'i'}},{name:{$regex:search,$options:'i'}}]}:{};
  const [rows,total,subscribed,matches]=await Promise.all([contacts.find(filter).sort({createdAt:-1,_id:-1}).skip(page*50).limit(50).toArray(),contacts.countDocuments(),contacts.countDocuments({subscribed:true}),contacts.countDocuments(filter)]);
  return res.json({contacts:rows.map(serialize),total,subscribed,matches,page});
 }catch(e){return fail(res,e)}
}
