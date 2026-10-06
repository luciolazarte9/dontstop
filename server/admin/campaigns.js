import { ObjectId } from 'mongodb';
import { production, serialize } from '../_lib/production.js';
import { mongoClient } from '../_lib/db.js';
import { requireAdmin, sameOrigin } from '../_lib/auth.js';
import { deliver, mailConfigured } from '../_lib/mail.js';
import { siteUrl, token, personalized, campaignInput } from '../_lib/marketing.js';
import { fail } from '../_lib/http.js';
import { audit, actor, ActionError } from '../_lib/audit.js';
async function message(contact,campaign) {
 const url=`${siteUrl()}/api/unsubscribe?id=${contact._id}&token=${token(String(contact._id))}`;
 return deliver(contact.email,personalized(campaign.subject,contact).replace(/[\r\n]/g,' '),`${personalized(campaign.text,contact)}\n\nDont Stop · Para dejar de recibir novedades:\n${url}`);
}
export default async function handler(req,res) {
 if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Método no permitido.'});
 if(!(await requireAdmin(req,res,true)))return;
 if(req.method==='POST'&&!sameOrigin(req,res))return;
 try {
  const db=await production(), campaigns=db.collection('campaigns'), recipients=db.collection('campaignRecipients');
  if(req.method==='GET') {
   const docs=await campaigns.find().sort({createdAt:-1}).limit(30).toArray();
   const results=[];
   for(const doc of docs) {
    const counts=await recipients.aggregate([{$match:{campaignId:doc._id}},{$group:{_id:'$state',count:{$sum:1}}}]).toArray();
    const issues=await recipients.aggregate([{$match:{campaignId:doc._id,state:{$in:['failed','sending']}}},{$sort:{claimedAt:-1}},{$limit:20},{$lookup:{from:'contacts',localField:'contactId',foreignField:'_id',as:'contact'}},{$project:{state:1,error:1,claimedAt:1,email:{$arrayElemAt:['$contact.email',0]}}}]).toArray();
    results.push({...serialize(doc),issues:issues.map(serialize),counts:Object.fromEntries(counts.map(c=>[c._id,c.count]))});
   }
   let configured=false, configurationError='';
   try{siteUrl();configured=mailConfigured();if(!configured)configurationError='Configurá EMAIL_FROM y SMTP o Resend.';}catch(e){configurationError=e.message}
   return res.json({campaigns:results,configured,configurationError});
  }
  const body=req.body||{}, action=body.action;
  if(action==='draft'||action==='test') {
   let data;try{data=campaignInput(body)}catch(e){return res.status(400).json({error:e.message})}
   try{siteUrl()}catch(e){throw new ActionError(400,e.message)};if(!mailConfigured())throw new ActionError(400,'Configurá SMTP o Resend y EMAIL_FROM.');
   if(action==='test') {
    // A preview only goes to the authenticated owner, never an arbitrary address.
    const contact=await db.collection('contacts').findOne({email:req.admin.email.toLowerCase()});
    if(!contact)throw new ActionError(400,'Registrá una invitación con tu email de administrador para habilitar la prueba.');
    await message(contact,{...data,subject:`[PRUEBA] ${data.subject}`});
    return res.json({message:'Prueba solicitada al proveedor para tu email de administrador.'});
   }
   const result=await campaigns.insertOne({...data,status:'draft',createdAt:new Date(),actor:actor(req)});
   return res.json({id:String(result.insertedId),message:'Borrador guardado.'});
  }
  if(!/^[a-f0-9]{24}$/.test(body.id||''))throw new ActionError(400,'Campaña inválida.');
  const id=new ObjectId(body.id);
  if(action==='start') {
   if(body.confirm!=='ENVIAR')throw new ActionError(400,'Confirmá el envío.');
   const session=(await mongoClient()).startSession();
   try{await session.withTransaction(async()=>{
    const campaign=await campaigns.findOne({_id:id},{session});
    if(!campaign)throw new ActionError(404,'Campaña inexistente.');
    if(campaign.status!=='draft')return;
    const contacts=await db.collection('contacts').find({subscribed:true},{session,projection:{_id:1}}).toArray();
    if(!contacts.length)throw new ActionError(400,'No hay contactos con consentimiento.');
    if(contacts.length>10000)throw new ActionError(400,'Esta versión admite hasta 10.000 destinatarios por campaña.');
    await campaigns.updateOne({_id:id,status:'draft'},{$set:{status:'queued',startedAt:new Date()}},{session});
    await recipients.insertMany(contacts.map(c=>({campaignId:id,contactId:c._id,state:'pending'})),{session});
    await audit({action:'campaign_start',actor:actor(req),after:{id:body.id,recipients:contacts.length}},session);
   })}finally{await session.endSession()}
   return res.json({message:'Campaña preparada. Continuá el envío por tandas.'});
  }
  if(action==='retry') {
   if(body.confirm!=='REINTENTAR'||!/^[a-f0-9]{24}$/.test(body.recipientId||''))throw new ActionError(400,'Confirmá el reintento individual.');
   const result=await recipients.updateOne({_id:new ObjectId(body.recipientId),campaignId:id,$or:[{state:'failed'},{state:'sending',claimedAt:{$lt:new Date(Date.now()-10*60*1000)}}]},{$set:{state:'pending'},$unset:{error:'',claimedAt:''}});
   if(!result.modifiedCount)throw new ActionError(409,'El intento sigue en proceso o ya cambió. Esperá al menos 10 minutos para un resultado incierto.');
   await campaigns.updateOne({_id:id},{$set:{status:'queued'},$unset:{completedAt:''}});
   await audit({action:'campaign_retry',actor:actor(req),after:{id:body.id,recipientId:body.recipientId}},null);
   return res.json({message:'Destinatario pendiente nuevamente. Continuá el envío cuando el proveedor esté configurado.'});
  }
  if(action!=='batch')throw new ActionError(400,'Acción inválida.');
  const campaign=await campaigns.findOne({_id:id});
  if(!campaign||campaign.status==='draft')throw new ActionError(409,'Primero prepará la campaña.');
  try{siteUrl()}catch(e){throw new ActionError(400,e.message)};if(!mailConfigured())throw new ActionError(400,'El proveedor de correo no está configurado.');
  // Atomic claim prevents duplicate sends when two panels run concurrently.
  // Claimed/uncertain items are never retried automatically.
  let failed=false;
  for(let i=0;i<1;i++) {
   const recipient=await recipients.findOneAndUpdate({campaignId:id,state:'pending'},{$set:{state:'sending',claimedAt:new Date()}},{returnDocument:'after'});
   if(!recipient)break;
   const contact=await db.collection('contacts').findOne({_id:recipient.contactId,subscribed:true});
   if(!contact){await recipients.updateOne({_id:recipient._id},{$set:{state:'skipped'}});continue}
   try {
    const result=await message(contact,campaign);
    await recipients.updateOne({_id:recipient._id},{$set:{state:'sent',sentAt:new Date(),providerId:result.id}});
   }catch(e){
    console.error('Campaign email failed:',e);
    await recipients.updateOne({_id:recipient._id},{$set:{state:'failed',error:String(e.message).slice(0,220),attemptedAt:new Date()}});
    failed=true;break;
   }
  }
  const pending=await recipients.countDocuments({campaignId:id,state:'pending'});
  const sending=await recipients.countDocuments({campaignId:id,state:'sending'});
  if(!pending&&!sending)await campaigns.updateOne({_id:id},{$set:{status:'completed',completedAt:new Date()}});
  return res.json({pending,sending,failed,message:failed?'El proveedor rechazó un envío. Revisá la configuración antes de continuar.':'Tanda procesada.'});
 }catch(e){return e instanceof ActionError?res.status(e.status).json({error:e.message}):fail(res,e)}
}
