import test from 'node:test';
import assert from 'node:assert/strict';
import {parseContacts} from '../server/_lib/contact-import.js';
test('contact CSV accepts Excel delimiters, quoted names, email-only lists and deduplicates',()=>{
 const result=parseContacts('\uFEFFcorreo;nombre\r\nFIRST@example.com;"Lucio; Lazarte"\r\nfirst@example.com;Duplicado\r\nbad-address;Error');
 assert.equal(result.contacts.length,1);assert.equal(result.contacts[0].name,'Lucio; Lazarte');assert.equal(result.duplicates,1);assert.equal(result.invalid.length,1);
 assert.equal(parseContacts('a@example.com\nb@example.com').contacts.length,2);
 assert.equal(parseContacts('name,email\n"Lucio, Lazarte",a@example.com').contacts[0].name,'Lucio, Lazarte');
 assert.throws(()=>parseContacts('email,name\na@example.com,"Unclosed'));
});
