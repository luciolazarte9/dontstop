import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import express from 'express';
import nodemailer from 'nodemailer';
import {MongoClient,ObjectId} from 'mongodb';
const uri=process.env.MONGODB_TEST_URI;
test('isolated MongoDB: migration, consent, campaigns, partners, balances and atomic reset', {skip:!uri}, async t=>{
 const name=`dontstop_test_${randomUUID().replaceAll('-','')}`;
 process.env.MONGODB_URI=uri;process.env.MONGODB_DB=name;process.env.LOCAL_DEV='true';
 process.env.ADMIN_EMAIL='owner@example.com';process.env.SESSION_SECRET='test-secret-never-for-production'.repeat(2);
 delete process.env.RESEND_API_KEY;
 process.env.EMAIL_FROM='owner@example.com';process.env.SMTP_HOST='mock';process.env.SMTP_USER='mock';process.env.SMTP_PASSWORD='mock';
 let rejectMail=false;const sent=[];const original=nodemailer.createTransport;
 nodemailer.createTransport=()=>({sendMail:async m=>{if(rejectMail)throw new Error("TEST_PROVIDER_REJECTION");sent.push(m);return {messageId:randomUUID()}}});
 const {hashPassword}=await import('../server/_lib/auth.js');process.env.ADMIN_PASSWORD_HASH=hashPassword('owner-password-for-test');
 const client=await new MongoClient(uri).connect(), db=client.db(name);
 await db.collection('guests').insertOne({name:'Legacy guest',email:'legacy@example.com',status:'pending',createdAt:new Date()});
 const handler=(await import('../api/index.js')).default;
 const app=express();app.use(express.json());app.use(express.urlencoded({extended:false}));app.all(['/api','/api/*'],handler);
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base=`http://127.0.0.1:${server.address().port}`;process.env.APP_URL=base;
 t.after(async()=>{nodemailer.createTransport=original;await new Promise(r=>server.close(r));await db.dropDatabase();await client.close();await (await import('../server/_lib/db.js')).mongoClient().then(c=>c.close())});
 let cookie='';
 async function req(path,method='GET',body,customCookie=cookie){const r=await fetch(base+path,{method,headers:{Origin:base,'Content-Type':'application/json',Cookie:customCookie},...(body?{body:JSON.stringify(body)}:{})});const value=await r.json();return {status:r.status,value,cookie:r.headers.get('set-cookie')?.split(';')[0]}}
 let r=await req('/api/admin/login','POST',{email:process.env.ADMIN_EMAIL,password:'owner-password-for-test'});assert.equal(r.status,200);cookie=r.cookie;
 r=await req('/api/admin/contacts');assert.equal(r.value.total,1);assert.equal(r.value.subscribed,0);
 async function pdf(path){const response=await fetch(base+path,{headers:{Cookie:cookie}});assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/pdf');const bytes=Buffer.from(await response.arrayBuffer());const result=spawnSync('pdftotext',['-','-'],{input:bytes});return result.status===0?result.stdout.toString():null;}
 const rsvp=(email,consent,attending='yes')=>req('/api/rsvp','POST',{name:'Test Person',email,attending,gender:'unspecified',marketingConsent:consent});
 assert.equal((await rsvp('owner@example.com',true)).status,201);
 assert.equal((await rsvp('sub@example.com',true)).status,201);
 assert.equal((await rsvp('other@example.com',false,'no')).status,201);
 assert.equal((await rsvp('sub@example.com',true)).status,409);
 r=await req('/api/admin/contacts');assert.equal(r.value.total,4);assert.equal(r.value.subscribed,2);
 const applicant=await db.collection('guests').findOne({email:'sub@example.com'});
 assert.equal(applicant.accessCategory,'general');
 r=await req(`/api/admin/access-category/${applicant._id}`,'PATCH',{accessCategory:'vip'});assert.equal(r.status,200);assert.equal(r.value.guest.accessCategory,'vip');assert.equal(r.value.guest.gender,'unspecified');assert.equal(r.value.guest.status,'pending');
 assert.equal((await req(`/api/admin/access-category/${applicant._id}`,'PATCH',{accessCategory:'invalid'})).status,400);
 const oldGuest=await db.collection('guests').findOne({email:'legacy@example.com'});
 assert.equal((await req(`/api/admin/access-category/${oldGuest._id}`,'PATCH',{accessCategory:'general_diffusion'})).status,200);
 const allGuests=await req('/api/admin/guests');assert.equal(allGuests.value.guests.find(g=>g.email==='sub@example.com').accessCategory,'vip');
 const vipPdf=await pdf('/api/admin/export-pdf?category=vip');if(vipPdf){assert.ok(vipPdf.includes('sub@example.com'));assert.ok(!vipPdf.includes('owner@example.com'));assert.ok(vipPdf.includes('LISTA VIP'));}
 const diffusionPdf=await pdf('/api/admin/export-pdf?category=general_diffusion');if(diffusionPdf){assert.ok(diffusionPdf.includes('legacy@example.com'));assert.ok(!diffusionPdf.includes('sub@example.com'));}
 const generalPdf=await pdf('/api/admin/export-pdf?category=general');if(generalPdf){assert.ok(generalPdf.includes('other@example.com'));assert.ok(!generalPdf.includes('sub@example.com'));}
 assert.equal((await req('/api/admin/export-pdf?category=invalid')).status,400);
 // Individual partner login, no shared passwords and owner-only marketing/reset.
 r=await req('/api/admin/admins','POST',{email:'partner@example.com',password:'partner-password-for-test'});assert.equal(r.status,201);
 const login=await req('/api/admin/login','POST',{email:'partner@example.com',password:'partner-password-for-test'});assert.equal(login.status,200);const staffCookie=login.cookie;
 for(const path of ['contacts','campaigns'])assert.equal((await req(`/api/admin/${path}`,'GET',null,staffCookie)).status,403);
 assert.equal((await req('/api/admin/production','POST',{action:'reset'},staffCookie)).status,403);
 for(const email of ['owner@example.com','partner@example.com'])assert.equal((await req('/api/admin/production','POST',{action:'partner',name:email.split('@')[0],email})).status,200);
 r=await req('/api/admin/production');const current=r.value.current,owner=r.value.partners.find(p=>p.email==='owner@example.com'),staff=r.value.partners.find(p=>p.email==='partner@example.com');
 const entry={action:'movement',roundId:current.roundId,requestId:randomUUID(),type:'income',category:'Entradas anticipadas',amount:'2001.10',quantity:4,date:'2026-10-06',partnerId:owner.id,status:'paid',description:'Venta'};
 const duplicate=await Promise.all([req('/api/admin/production','POST',entry),req('/api/admin/production','POST',entry)]);assert.ok(duplicate.every(x=>x.status===200));
 assert.equal((await req('/api/admin/production','POST',{...entry,requestId:randomUUID(),type:'expense',category:'Hielo',amount:'1200.25',quantity:0,partnerId:staff.id},staffCookie)).status,200);
 assert.equal((await req('/api/admin/production','POST',{...entry,requestId:randomUUID()},staffCookie)).status,403);
 assert.equal((await req('/api/admin/production','POST',{...entry,requestId:randomUUID(),type:'expense',category:'Living',quantity:0,amount:'50.20',status:'pending'})).status,200);
 r=await req('/api/admin/production');assert.equal(r.value.rows.length,3);assert.equal(r.value.summary.net,80085);assert.equal(r.value.summary.pendingExpense,5020);assert.equal(r.value.summary.tickets,4);
 const financialPdf=await pdf('/api/admin/export-balance-pdf');if(financialPdf){assert.ok(financialPdf.includes('RESULTADO ACTUAL: POSITIVO'));assert.ok(financialPdf.includes('800,85'));assert.ok(financialPdf.includes('750,65'));assert.ok(financialPdf.includes('Hielo'));}
 // Prepare twice, and run parallel batches. Each subscribed contact gets one message.
 r=await req('/api/admin/campaigns','POST',{action:'draft',subject:'Hola {nombre}',text:'Próxima fiesta de Dont Stop, te esperamos.'});assert.equal(r.status,200);const campaign=r.value.id;
 await Promise.all([req('/api/admin/campaigns','POST',{action:'start',id:campaign,confirm:'ENVIAR'}),req('/api/admin/campaigns','POST',{action:'start',id:campaign,confirm:'ENVIAR'})]);
 await Promise.all([req('/api/admin/campaigns','POST',{action:'batch',id:campaign}),req('/api/admin/campaigns','POST',{action:'batch',id:campaign}),req('/api/admin/campaigns','POST',{action:'batch',id:campaign})]);
 assert.equal(sent.length,2);assert.deepEqual(sent.map(m=>m.to).sort(),['owner@example.com','sub@example.com']);
 const url=sent.find(m=>m.to==='sub@example.com').text.match(/http:\/\/[^\s]+/)[0];
 assert.equal((await fetch(url)).status,200);assert.equal((await db.collection('contacts').findOne({email:'sub@example.com'})).subscribed,true);
 assert.equal((await fetch(url,{method:'POST'})).status,200);assert.equal((await db.collection('contacts').findOne({email:'sub@example.com'})).subscribed,false);
 // Unsubscription after queue preparation is checked again before sending.
 r=await req('/api/admin/campaigns','POST',{action:'draft',subject:'Nueva fiesta',text:'Te esperamos otra vez.'});const second=r.value.id;
 await req('/api/admin/campaigns','POST',{action:'start',id:second,confirm:'ENVIAR'});
 const contact=await db.collection('contacts').findOne({email:'owner@example.com'});await req('/api/admin/contacts','POST',{id:String(contact._id)});
 await req('/api/admin/campaigns','POST',{action:'batch',id:second});assert.equal(sent.length,2);
 // Explicit retry only requeues the individual failed recipient.
 await db.collection('contacts').updateOne({_id:contact._id},{$set:{subscribed:true}});
 r=await req('/api/admin/campaigns','POST',{action:'draft',subject:'Retry test',text:'Provider retry test.'});const third=r.value.id;
 await req('/api/admin/campaigns','POST',{action:'start',id:third,confirm:'ENVIAR'});
 rejectMail=true;await req('/api/admin/campaigns','POST',{action:'batch',id:third});rejectMail=false;
 r=await req('/api/admin/campaigns');const issue=r.value.campaigns.find(c=>c.id===third).issues[0];assert.equal(issue.state,'failed');
 assert.equal((await req('/api/admin/campaigns','POST',{action:'retry',id:third,recipientId:issue.id,confirm:'REINTENTAR'})).status,200);
 await req('/api/admin/campaigns','POST',{action:'batch',id:third});assert.equal(sent.length,3);
 assert.equal((await req('/api/admin/campaigns','POST',{action:'retry',id:third,recipientId:issue.id,confirm:'REINTENTAR'})).status,409);
 // Racing reset clicks cannot close two rounds or lose the archive.
 const reset={action:'reset',confirm:'RESETEAR',roundId:current.roundId};
 const results=await Promise.all([req('/api/admin/production','POST',reset),req('/api/admin/production','POST',reset)]);assert.deepEqual(results.map(x=>x.status).sort(),[200,409]);
 assert.equal(await db.collection('guests').countDocuments(),0);assert.equal(await db.collection('guestArchive').countDocuments(),4);assert.equal(await db.collection('contacts').countDocuments(),4);assert.equal(await db.collection('rounds').countDocuments(),1);
 r=await req('/api/admin/production');assert.equal(r.value.summary.net,0);assert.equal(r.value.rows.length,0);assert.notEqual(r.value.current.roundId,current.roundId);
 const archived=await req(`/api/admin/production?round=${current.roundId}`);assert.equal(archived.value.summary.net,80085);const archivedPdf=await pdf(`/api/admin/export-balance-pdf?round=${current.roundId}`);if(archivedPdf)assert.ok(archivedPdf.includes('CERRADO'));
 assert.equal((await req('/api/admin/production','POST',entry)).status,409);
 assert.equal((await rsvp('sub@example.com',false)).status,201);assert.equal((await db.collection('contacts').findOne({email:'sub@example.com'})).subscribed,false);
 assert.equal(await db.collection('contacts').countDocuments(),4);
});
