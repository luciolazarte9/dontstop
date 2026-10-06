import { database } from './db.js';
export const defaults = {
  eventAnnounced: true, musicAudioUrl: '', musicAutoplay: true,
  heroTitle: 'JUANHER+LUCI', heroImage: '', tagline: 'UNA TARDE · UNA NOCHE · UNA HISTORIA', city: 'TUCUMÁN · ARG',
  eventDate: '2026-09-26T17:00:00-03:00', dateLabel: '26 SEP 2026', startTime: '17:00', endTime: '01:00',
  infoTitle: 'El cielo cambia.', infoSubtitle: 'Nosotros seguimos.',
  description: 'JUANHER y LUCI celebran un nuevo año con ocho horas de música al aire libre: desde la luz de la tarde hasta la profundidad de la noche.',
  location: 'UBICACIÓN SECRETA', locationNote: 'La dirección se envía por email únicamente a invitados confirmados.',
  format: 'SUNSET OPEN AIR', formatNote: 'Del sol a la pista. Traé tu propia consumición.',
  lineupTitle: 'CUATRO ACTOS.', lineupSubtitle: 'UNA SOLA NOCHE.',
  countdownLabel: 'HASTA QUE CAIGA EL SOL', rsvpTitle: '¿VENÍS', rsvpSubtitle: 'AL SUNSET?',
  rsvpDescription: 'La ubicación es privada. Enviá tu solicitud y esperá la confirmación de los organizadores.',
  sendEmails: true, capacity: 0,
  privateLocation: '',
  acceptedSubject: 'Tu invitación fue confirmada — JUANHER + LUCI',
  acceptedBody: 'Hola {nombre},\n\nConfirmamos tu invitación para {evento} el {fecha}.\nUbicación: {ubicacion}\n\n¡Nos vemos en el sunset!',
  rejectedSubject: 'Actualización sobre tu solicitud — JUANHER + LUCI',
  rejectedBody: 'Hola {nombre},\n\nGracias por tu interés en {evento}. En esta ocasión no podremos confirmar tu solicitud.\n\nSaludos,\nJUANHER + LUCI',
  musicTitle: 'MACULA', musicArtist: 'GAI BARONE', musicUrl: 'https://www.youtube.com/watch?v=JNW0I5CW8eQ',
  artists: [
    { name:'GUILLERMO MONTEROS', role:'OPENING SET', time:'17:00—19:00', genre:'Deep · Organic House', bio:'Cofundador de El Altillo Estudio y formado en Arjaus, Guillermo abre el sunset con una selección versátil que cruza progressive, deep y organic house. Un comienzo de pulso preciso, pensado para recibir la tarde y construir la energía desde el primer track.', image:'https://juanher-lucia-birthday.vercel.app/artists/guillermo-editorial-02.webp' },
    { name:'JUANHER', role:'ANFITRIÓN', time:'19:00—21:00', genre:'Progressive house', bio:'Anfitrión del encuentro, JUANHER construye su identidad desde el progressive house: melodías profundas, desarrollo paciente y una narrativa que crece sin apuro. Durante la golden hour guiará la transición entre el último sol y el comienzo de la noche.', image:'https://juanher-lucia-birthday.vercel.app/artists/juanher-01.webp' },
    { name:'MARTÍN DUARTE', role:'', time:'21:00—23:00', genre:'Progressive house', bio:'DJ y productor argentino, director de Support Studio Music. Groove, energía y una trayectoria conectada con la evolución de la escena progressive.', image:'https://juanher-lucia-birthday.vercel.app/artists/martin-hq.png' },
    { name:'GUSTAVO FILGUEIRA', role:'NIGHT CLOSING', time:'23:00—01:00', genre:'', bio:'Cuando el sunset ya sea noche, una figura fundacional del underground tucumano tomará el cierre. Casi tres décadas de historia y una lectura de pista que atraviesa generaciones.', image:'https://juanher-lucia-birthday.vercel.app/artists/gus-01.webp' }
  ]
};
export const privateFields = ['sendEmails','privateLocation','acceptedSubject','acceptedBody','rejectedSubject','rejectedBody'];
export function publicConfig(config) { const copy = { ...config }; for (const field of privateFields) delete copy[field]; return copy; }
const fields = Object.fromEntries(Object.entries(defaults).filter(([key]) => !['artists','sendEmails','capacity','eventAnnounced','musicAutoplay','musicAudioUrl'].includes(key)).map(([key]) => [key, key === 'description' || key.endsWith('Body') ? 3000 : key.endsWith('Note') || key === 'rsvpDescription' || key === 'privateLocation' ? 500 : 240]));
function imageUrl(value) {
  if (value === '') return true;
  if (/^\/api\/image\/[a-f0-9]{24}$/.test(value)) return true;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}
export function validateConfig(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const output = {};
  for (const [key, max] of Object.entries(fields)) {
    const value = input[key];
    if (typeof value !== 'string' || value.length > max) return null;
    output[key] = value.trim();
  }
  output.eventAnnounced=input.eventAnnounced??true;
  output.musicAutoplay=input.musicAutoplay??true;
  output.musicAudioUrl=input.musicAudioUrl??'';
  if(typeof output.eventAnnounced!=='boolean'||typeof output.musicAutoplay!=='boolean'||typeof output.musicAudioUrl!=='string'||output.musicAudioUrl.length>1500)return null;
  if(output.musicAudioUrl){
    if(!/^\/music\/[a-z0-9_/-]+\.(mp3|wav|ogg|m4a)$/i.test(output.musicAudioUrl)){
      try{const url=new URL(output.musicAudioUrl);if(url.protocol!=='https:'||url.username||url.password||! /\.(mp3|wav|ogg|m4a)$/i.test(url.pathname))return null}catch{return null}
    }
  }
  if (typeof input.sendEmails !== 'boolean') return null;
  output.sendEmails = input.sendEmails;
  if (!Number.isInteger(input.capacity) || input.capacity < 0 || input.capacity > 5000) return null;
  output.capacity = input.capacity;
  if (!Number.isFinite(Date.parse(output.eventDate)) || !imageUrl(output.musicUrl) || !imageUrl(output.heroImage)) return null;
  if (!Array.isArray(input.artists) || input.artists.length > 12) return null;
  output.artists = [];
  for (const artist of input.artists) {
    if (!artist || typeof artist !== 'object') return null;
    const row = {};
    for (const [key, max] of Object.entries({ name:120,role:120,time:80,genre:120,bio:2000,image:500 })) {
      if (typeof artist[key] !== 'string' || artist[key].length > max) return null;
      row[key] = artist[key].trim();
    }
    if (!row.name || !imageUrl(row.image)) return null;
    output.artists.push(row);
  }
  return output;
}
export async function getConfig() {
  const doc = await (await database()).collection('settings').findOne({ _id: 'event' });
  return { ...defaults, ...doc?.config };
}
