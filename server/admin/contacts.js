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
