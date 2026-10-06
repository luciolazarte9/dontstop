import test from 'node:test';
import assert from 'node:assert/strict';
import {accessCategories,accessCategoryOf} from '../server/_lib/access-categories.js';
import {createGuestListPdf} from '../server/_lib/guest-pdf.js';
test('legacy guests default to General and admission classification does not replace gender',()=>{
 assert.equal(accessCategoryOf({gender:'woman'}),'general');
 for(const key of Object.keys(accessCategories))assert.equal(accessCategoryOf({gender:'man',accessCategory:key}),key);
 assert.equal(accessCategoryOf({accessCategory:'unknown'}),'general');
});
test('PDF handles all admission categories, legacy records and multiple pages',async()=>{
 const rows=Array.from({length:100},(_,i)=>({name:`Invitado ${i}`,email:`guest${i}@example.com`,status:'confirmed',gender:i%2?'man':'woman',accessCategory:Object.keys(accessCategories)[i%4]}));
 rows.push({name:'Anterior',email:'old@example.com',status:'pending'});
 const bytes=await createGuestListPdf(rows,{heroTitle:'Dont Stop',dateLabel:'Octubre 2026'});
 assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
});
