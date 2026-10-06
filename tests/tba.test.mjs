import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,validateConfig,publicConfig} from '../server/_lib/config.js';
test('event announcement and direct audio configuration preserve legacy configs and reject unsafe URLs',()=>{
 assert.equal(validateConfig({...defaults,eventAnnounced:false,musicAudioUrl:'/music/tema.mp3'}).eventAnnounced,false);
 assert.equal(validateConfig({...defaults,musicAudioUrl:'https://example.com/song.mp3?token=abc'}).musicAudioUrl,'https://example.com/song.mp3?token=abc');
 assert.equal(publicConfig({...defaults,eventAnnounced:false}).eventAnnounced,false);
 const old={...defaults};delete old.eventAnnounced;delete old.musicAutoplay;delete old.musicAudioUrl;
 assert.equal(validateConfig(old).eventAnnounced,true);
 for(const url of ['javascript:alert(1)','http://example.com/song.mp3','https://youtube.com/watch?v=abc','/music/../secret.mp3'])assert.equal(validateConfig({...defaults,musicAudioUrl:url}),null);
 assert.equal(validateConfig({...defaults,eventAnnounced:'false'}),null);
});
