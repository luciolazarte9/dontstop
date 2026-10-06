import { ObjectId } from 'mongodb';
import { requireAdmin, sameOrigin } from '../_lib/auth.js';
import { mongoClient } from '../_lib/db.js';
import { production, lock, serialize, movement, balance, categories } from '../_lib/production.js';
import { audit, actor, ActionError } from '../_lib/audit.js';
import { fail } from '../_lib/http.js';
export default async function handler(req,res) {
 if(!['GET','POST','PATCH','DELETE'].includes(req.method))return res.status(405).json({error:'Método no permitido.'});
 if(!(await requireAdmin(req,res)))return;
 if(req.method!=='GET'&&!sameOrigin(req,res))return;
 try {
  const db=await production();
  if(req.method==='GET') {
   const current=await db.collection('settings').findOne({_id:'production'});
   const rounds=await db.collection('rounds').find().sort({closedAt:-1}).toArray();
   const requested=req.query.round;
   if(requested && !/^[a-f0-9]{24}$/.test(requested))return res.status(400).json({error:'Fiesta inválida.'});
   const roundId=requested?new ObjectId(requested):current.roundId;
   const rows=await db.collection('movements').find({roundId,voidedAt:{$exists:false}}).sort({date:-1,createdAt:-1}).toArray();
   const partners=await db.collection('partners').find().sort({name:1}).toArray();
   const admins=req.admin.role==='owner'?await db.collection('admins').find({},{projection:{email:1,active:1}}).toArray():[];
   const guestCount=await db.collection('guests').countDocuments();
   return res.json({guestCount,viewerEmail:req.admin.email.trim().toLowerCase(),current,rounds:rounds.map(serialize),rows:rows.map(serialize),partners:partners.map(serialize),admins:admins.map(serialize),summary:balance(rows),categories});
  }
  const body=req.body||{}, action=body.action;
  if(['partner','reset'].includes(action)&&req.admin.role!=='owner')return res.status(403).json({error:'Solo el propietario puede gestionar socios o resetear la lista.'});
  if(action==='partner') {
   const name=typeof body.name==='string'?body.name.trim():'';
   const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
   if(name.length<2||name.length>120||!/^\S+@\S+\.\S+$/.test(email)||email.length>254)return res.status(400).json({error:'Revisá nombre y email del socio.'});
   const account=await db.collection('admins').findOne({email,active:true});
   if(email!==process.env.ADMIN_EMAIL.trim().toLowerCase()&&!account)return res.status(400).json({error:'Primero creá un administrador activo con ese email en Administradores.'});
   await db.collection('partners').updateOne({email},{$set:{name,email},$setOnInsert:{createdAt:new Date()}},{upsert:true});
   await audit({action:'partner_save',actor:actor(req),after:{name,email}});
   return res.json({message:'Socio guardado.'});
  }
  const session=(await mongoClient()).startSession();
  try {await session.withTransaction(async()=>{
   const current=await lock(db,session);
   if(action==='reset') {
    if(body.confirm!=='RESETEAR'||body.roundId!==String(current.roundId))throw new ActionError(409,'La lista cambió o falta escribir RESETEAR. Actualizá el panel.');
    const guests=await db.collection('guests').find({},{session}).toArray();
    const now=new Date();
    if(guests.length) {
     await db.collection('guestArchive').insertMany(guests.map(g=>({...g,roundId:current.roundId,archivedAt:now})),{session});
     await db.collection('contacts').bulkWrite(guests.map(g=>({updateOne:{filter:{email:g.email},update:{$setOnInsert:{email:g.email,name:g.name,subscribed:false,createdAt:g.createdAt||now}},upsert:true}})),{session});
     await db.collection('guests').deleteMany({},{session});
    }
    const event=await db.collection('settings').findOne({_id:'event'},{session});
    await db.collection('rounds').insertOne({_id:current.roundId,name:current.name,date:current.date,createdAt:current.createdAt,closedAt:now,guestCount:guests.length,config:event?.config},{session});
    await db.collection('settings').updateOne({_id:'production'},{$set:{roundId:new ObjectId(),name:event?.config?.heroTitle||'Dont Stop',date:event?.config?.dateLabel||'',createdAt:now}},{session});
    await audit({action:'guest_reset',actor:actor(req),after:{archived:guests.length,roundId:String(current.roundId)}},session);
   } else if(action==='round') {
    if(req.admin.role!=='owner')throw new ActionError(403,'Solo el propietario puede editar el nombre de la fiesta.');
    if(typeof body.name!=='string'||body.name.trim().length<2||body.name.length>120||typeof body.date!=='string'||body.date.length>120)throw new ActionError(400,'Revisá nombre y fecha.');
    await db.collection('settings').updateOne({_id:'production'},{$set:{name:body.name.trim(),date:body.date.trim()}},{session});
   } else if(action==='movement') {
    if(body.roundId!==String(current.roundId))throw new ActionError(409,'Este balance está cerrado. Actualizá el panel.');
    if(!/^[a-f0-9-]{36}$/.test(body.requestId||''))throw new ActionError(400,'Falta el identificador del registro.');
    if(await db.collection('movements').findOne({roundId:current.roundId,requestId:body.requestId},{session}))return;
    let data;try{data=movement(body)}catch(e){throw new ActionError(400,e.message)}
    const partner=await db.collection('partners').findOne({_id:data.partnerId},{session});
    if(!partner)throw new ActionError(400,'Socio inexistente.');
    if(req.admin.role!=='owner'&&partner.email!==req.admin.email)throw new ActionError(403,'Seleccioná tu propio socio para registrar un movimiento.');
    const result=await db.collection('movements').insertOne({...data,requestId:body.requestId,roundId:current.roundId,partnerName:partner.name,actor:actor(req),createdAt:new Date()},{session});
    await audit({action:'movement_create',actor:actor(req),after:{id:String(result.insertedId),cents:data.cents,category:data.category}},session);
   } else if(action==='paid'||action==='void') {
    if(!/^[a-f0-9]{24}$/.test(body.id||''))throw new ActionError(400,'Movimiento inválido.');
    const row=await db.collection('movements').findOne({_id:new ObjectId(body.id),roundId:current.roundId,voidedAt:{$exists:false}},{session});
    if(!row)throw new ActionError(409,'Movimiento inexistente o balance cerrado.');
    if(req.admin.role!=='owner'&&row.actor.email!==req.admin.email)throw new ActionError(403,'Solo podés modificar tus propios registros.');
    await db.collection('movements').updateOne({_id:row._id},{$set:action==='paid'?{status:'paid',updatedAt:new Date()}:{voidedAt:new Date(),voidedBy:actor(req)}},{session});
    await audit({action:action==='paid'?'movement_paid':'movement_void',actor:actor(req),after:{id:body.id}},session);
   } else throw new ActionError(400,'Acción inválida.');
  })}finally{await session.endSession()}
  return res.json({message:action==='reset'?'Lista reiniciada. Contactos y balance anterior conservados.':'Cambios guardados.'});
 }catch(e){return e instanceof ActionError?res.status(e.status).json({error:e.message}):fail(res,e)}
}
