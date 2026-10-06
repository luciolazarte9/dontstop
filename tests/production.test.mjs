import test from 'node:test';
import assert from 'node:assert/strict';
import {movement,balance} from '../server/_lib/production.js';
import {token,validToken,personalized,campaignInput,siteUrl} from '../server/_lib/marketing.js';
const base={type:'expense',category:'Alcohol',amount:'12500,15',date:'2026-10-06',partnerId:'0123456789abcdef01234567',status:'paid',description:'Compra'};
test('finance validates dates and stores exact cent amounts, keeping pending amounts separate',()=>{
 const expense=movement(base);assert.equal(expense.cents,1250015);
 const income=movement({...base,type:'income',category:'Entradas anticipadas',amount:'20000.20',quantity:10});
 const pending=movement({...base,status:'pending',amount:'10.50'});
 const result=balance([expense,income,pending]);
 assert.equal(result.net,750005);assert.equal(result.expense,1250015);assert.equal(result.pendingExpense,1050);assert.equal(result.tickets,10);
 for(const bad of [{amount:'-10'},{amount:'1.001'},{amount:'0'},{date:'2026-02-30'},{quantity:2},{partnerId:'invalid'},{status:'delivered'}])assert.throws(()=>movement({...base,...bad}));
});
test('marketing rejects header injection and forged unsubscribe links',()=>{
 process.env.SESSION_SECRET='testing-only-secret-12345678901234567890';
 const id='0123456789abcdef01234567';assert.ok(validToken(id,token(id)));
 assert.equal(validToken('1123456789abcdef01234567',token(id)),false);
 assert.equal(validToken(id,'invalid'),false);
 assert.throws(()=>campaignInput({subject:'a\r\nBcc: attacker',text:'Hello world'}));
 assert.equal(personalized('Hola {nombre}',{name:'Lucio $&'}),'Hola Lucio $&');
 process.env.APP_URL='https://dontstop.example';assert.equal(siteUrl(),'https://dontstop.example');
 process.env.APP_URL='https://dontstop.example/admin';assert.throws(siteUrl);
});
