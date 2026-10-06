import {ObjectId} from 'mongodb';
import {requireAdmin} from '../_lib/auth.js';
import {method,fail} from '../_lib/http.js';
import {production} from '../_lib/production.js';
import {mongoClient} from '../_lib/db.js';
import {createBalancePdf} from '../_lib/balance-pdf.js';
export default async function handler(req,res) {
 if(!method(req,res,'GET')||!(await requireAdmin(req,res)))return;
 if(req.query.round&&!/^[a-f0-9]{24}$/.test(req.query.round))return res.status(400).json({error:'Balance inválido.'});
 try{
  const db=await production();const session=(await mongoClient()).startSession();let round,rows;
  try{await session.withTransaction(async()=>{
   const current=await db.collection('settings').findOne({_id:'production'},{session});
   const id=req.query.round?new ObjectId(req.query.round):current.roundId;
   round=String(id)===String(current.roundId)?current:await db.collection('rounds').findOne({_id:id},{session});
   if(round)rows=await db.collection('movements').find({roundId:id,voidedAt:{$exists:false}},{session}).sort({date:1,createdAt:1}).toArray();
  },{readConcern:{level:'snapshot'}})}finally{await session.endSession()}
  if(!round)return res.status(404).json({error:'Balance no encontrado.'});
  const pdf=await createBalancePdf(rows,round);
  res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition','attachment; filename="balance-fiesta.pdf"');return res.status(200).send(pdf);
 }catch(e){return fail(res,e)}
}
