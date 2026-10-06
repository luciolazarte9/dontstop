import { ObjectId } from 'mongodb';
import { database } from './db.js';
export const categories = {
 income: ['Entradas anticipadas','Entradas en puerta','Estacionamiento','Barra','Otros ingresos'],
 expense: ['Venue','DJs','Técnica y sonido','Seguridad','Living','Hielo','Alcohol','Techo']
};
export function movement(input) {
 const { type, category, description, date, partnerId, status } = input || {};
 const amount = String(input?.amount ?? '');
 if (!categories[type]?.includes(category) || !/^\d{1,10}(?:[.,]\d{1,2})?$/.test(amount)) throw new Error('Revisá tipo, categoría y monto (hasta dos decimales).');
 const cents = Math.round(Number(amount.replace(',','.')) * 100);
 const quantity = input.quantity === '' || input.quantity == null ? 0 : Number(input.quantity);
 if (!cents || !Number.isSafeInteger(cents) || !['paid','pending'].includes(status) || typeof description !== 'string' || description.trim().length > 500 || !/^\d{4}-\d{2}-\d{2}$/.test(date || '') || new Date(date).toISOString().slice(0,10) !== date || !/^[a-f0-9]{24}$/.test(partnerId || '') || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 1000000) throw new Error('Revisá fecha, socio, estado y cantidad.');
 if (quantity && !['Entradas anticipadas','Entradas en puerta'].includes(category)) throw new Error('La cantidad de entradas solo corresponde a venta de entradas.');
 return { type, category, description:description.trim(), date, partnerId:new ObjectId(partnerId), status, cents, quantity };
}
export function balance(rows) {
 const sum = (type,status) => rows.filter(r=>r.type===type && r.status===status).reduce((n,r)=>n+r.cents,0);
 const income=sum('income','paid'), expense=sum('expense','paid');
 return { income, expense, net:income-expense, pendingIncome:sum('income','pending'), pendingExpense:sum('expense','pending'), tickets:rows.filter(r=>r.type==='income'&&r.status==='paid').reduce((n,r)=>n+(r.quantity||0),0), categories:Object.fromEntries(Object.values(categories).flat().map(c=>[c,rows.filter(r=>r.category===c&&r.status==='paid').reduce((n,r)=>n+r.cents,0)])) };
}
let ready;
export async function production() {
 const db=await database();
 ready ??= (async()=>{
  await db.collection('contacts').createIndex({email:1},{unique:true});
  await db.collection('campaignRecipients').createIndex({campaignId:1,contactId:1},{unique:true});
  await db.collection('movements').createIndex({roundId:1,createdAt:-1});
  await db.collection('movements').createIndex({roundId:1,requestId:1},{unique:true,partialFilterExpression:{requestId:{$type:'string'}}});
  await db.collection('partners').createIndex({email:1},{unique:true});
  // Existing registrations are contacts, never implied marketing subscribers.
  const migration=await db.collection('settings').findOne({_id:'contactsMigrationV350'});
  if(!migration) {
   let batch=[];
   for await (const guest of db.collection('guests').find({}, {projection:{name:1,email:1,createdAt:1}})) {
    batch.push({updateOne:{filter:{email:guest.email},update:{$setOnInsert:{email:guest.email,name:guest.name,subscribed:false,createdAt:guest.createdAt||new Date()}},upsert:true}});
    if(batch.length===500){await db.collection('contacts').bulkWrite(batch);batch=[];}
   }
   if(batch.length)await db.collection('contacts').bulkWrite(batch);
   await db.collection('settings').updateOne({_id:'contactsMigrationV350'},{$set:{completedAt:new Date()}},{upsert:true});
  }
  const config=await db.collection('settings').findOne({_id:'event'});
  await db.collection('settings').updateOne({_id:'production'},{$setOnInsert:{roundId:new ObjectId(),name:config?.config?.heroTitle||'Dont Stop',date:config?.config?.dateLabel||'',createdAt:new Date()}},{upsert:true});
 })().catch(e=>{ready=undefined;throw e});
 await ready;
 return db;
}
export async function lock(db,session) {
 await db.collection('settings').updateOne({_id:'capacityLock'},{$inc:{revision:1}},{upsert:true,session});
 return db.collection('settings').findOne({_id:'production'},{session});
}
export function serialize(doc) { return {...doc,id:String(doc._id)}; }
