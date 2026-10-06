import test from 'node:test';
import assert from 'node:assert/strict';
import {newsletter,emailUrl} from '../src/email-template.js';
import {campaignInput} from '../server/_lib/marketing.js';
test('HTML newsletter escapes user content and hides unsubscribe URL behind a small button',()=>{
 const html=newsletter({subject:'Fiesta',headline:'Hola {nombre}',text:'Bienvenido <script>alert(1)</script>',ctaText:'Entradas',ctaUrl:'https://example.com/tickets',imageUrls:['/api/image/0123456789abcdef01234567']},{name:'Lucio & amigos',base:'https://dontstop.example',unsubscribe:'https://dontstop.example/api/unsubscribe?id=123'});
 assert.ok(html.includes('Lucio &amp; amigos'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('https://dontstop.example/api/image/0123456789abcdef01234567'));
 assert.ok(html.includes('>Dar de baja</a>'));assert.ok(!html.replace(/<[^>]*>/g,'').includes('https://dontstop.example/api/unsubscribe'));
});
test('campaign images and calls to action reject unsafe or incomplete links',()=>{
 const base={subject:'Fiesta',text:'Próxima fiesta'};
 assert.throws(()=>campaignInput({...base,ctaText:'Entradas',ctaUrl:'javascript:alert(1)'}));
 assert.throws(()=>campaignInput({...base,ctaText:'Entradas'}));
 assert.throws(()=>campaignInput({...base,imageUrls:['data:image/png;base64,abc']}));
 assert.throws(()=>campaignInput({...base,imageUrls:Array(4).fill('https://example.com/image.jpg')}));
 assert.equal(emailUrl('javascript:alert(1)','https://example.com'),'');
 assert.equal(campaignInput(base).imageUrls.length,0);
});
