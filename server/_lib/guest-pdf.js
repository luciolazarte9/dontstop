import {accessCategories, accessCategoryOf} from './access-categories.js';
import PDFDocument from 'pdfkit';

const categories = [
  ['man', 'HOMBRES'], ['woman', 'MUJERES'], ['unspecified', 'SIN ESPECIFICAR']
];
const states = [
  ['confirmed', 'Confirmados'], ['pending', 'Pendientes'], ['waitlist', 'En espera'],
  ['rejected', 'Rechazados'], ['not_attending', 'No asisten']
];
const statusText = Object.fromEntries(states);
const color = { ink: '#171b24', muted: '#657080', line: '#dce1e6', accent: '#1c6664', pale: '#edf5f3' };
const formatDate = date => new Date(date).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' });
const categoryOf = guest => ['man', 'woman'].includes(guest.gender) ? guest.gender : 'unspecified';

export function createGuestListPdf(guests, config, now = new Date(), options = {}) {
  return new Promise((resolve, reject) => {
    const listTitle = options.accessCategory ? `LISTA ${accessCategories[options.accessCategory].toUpperCase()}` : 'CONTROL DE INVITADOS';
    const doc = new PDFDocument({ size: 'A4', margins: { top: 44, bottom: 48, left: 44, right: 44 }, bufferPages: true, info: { Title: `Control de invitados - ${config.heroTitle || 'Evento'}` } });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    const width = doc.page.width - 88;
    let y = 44;
    const line = (at, x = 44, w = width) => doc.moveTo(x, at).lineTo(x + w, at).lineWidth(0.7).strokeColor(color.line).stroke();
    const text = (value, x, at, options = {}) => doc.fillColor(options.color || color.ink).font(options.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(options.size || 9).text(String(value ?? ''), x, at, { lineBreak: false, ...options });
    const fit = (value, max, size = 9, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
      let s = String(value ?? '');
      if (doc.widthOfString(s) <= max) return s;
      while (s.length && doc.widthOfString(s + '…') > max) s = s.slice(0, -1);
      return s + '…';
    };
    const page = () => { doc.addPage(); y = 44; text(listTitle, 44, y, { size: 9, bold: true, color: color.accent }); text(config.heroTitle || 'EVENTO', 240, y, { size: 9, align: 'right', width: 311 }); y += 27; line(y); y += 16; };
    const ensure = height => { if (y + height > doc.page.height - 85) page(); };

    text(listTitle, 44, y, { size: 10, bold: true, color: color.accent }); y += 23;
    text(fit(config.heroTitle || 'EVENTO', width, 25, true), 44, y, { size: 25, bold: true }); y += 38;
    text(`${config.dateLabel || 'Fecha por confirmar'}  ·  Generado: ${formatDate(now)}`, 44, y, { size: 9, color: color.muted }); y += 24; line(y); y += 21;

    text('RESUMEN GENERAL', 44, y, { size: 11, bold: true }); y += 24;
    const summary = [['TOTAL', guests.length], ...states.map(([key, label]) => [label.toUpperCase(), guests.filter(g => g.status === key).length])];
    summary.forEach(([label, value], i) => {
      const x = 44 + i * (width / summary.length);
      doc.rect(x, y, width / summary.length - 6, 51).fill(color.pale);
      text(label, x + 9, y + 10, { size: 7, bold: true, color: color.muted });
      text(value, x + 9, y + 24, { size: 17, bold: true });
    });
    y += 65;
    text(`Ingresaron: ${guests.filter(g => g.status === 'confirmed' && g.checkedInAt).length} de ${guests.filter(g => g.status === 'confirmed').length} confirmados`, 44, y, { size: 9, color: color.accent, bold: true });
    y += 28;

    const detail = (title, groups, keyOf) => {
      ensure(49 + groups.length * 28);
      text(title, 44, y, { size: 11, bold: true }); y += 24;
      doc.rect(44, y, width, 25).fill(color.ink);
      const cols = [44, 176, 238, 296, 355, 414, 483];
      ['CATEGORÍA', 'TOTAL', 'CONF.', 'PEND.', 'ESPERA', 'RECH.', 'NO AS.'].forEach((label, i) => text(label, cols[i] + 8, y + 8, { size: 7, bold: true, color: '#ffffff' }));
      y += 25;
      for (const [key, label] of groups) {
        const group = guests.filter(g => keyOf(g) === key);
        text(label, cols[0] + 8, y + 9, { size: 8, bold: true });
        [group.length, ...states.map(([state]) => group.filter(g => g.status === state).length)].forEach((n, i) => text(n, cols[i + 1] + 8, y + 9, { size: 8 }));
        y += 28; line(y);
      }
      y += 25;
    };
    detail('DETALLE POR GÉNERO', categories, categoryOf);
    const accessGroups = Object.entries(accessCategories).filter(([key])=>!options.accessCategory||key===options.accessCategory).map(([key,label]) => [key,label.toUpperCase()]);
    detail('DETALLE POR CATEGORÍA DE ACCESO', accessGroups, accessCategoryOf);
    ensure(67);
    text('LISTA PARA CONTROL DE ENTRADA', 44, y, { size: 11, bold: true }); y += 19;
    text('Marcá el casillero al ingresar. Incluye todas las solicitudes; verificá el estado antes de permitir el acceso.', 44, y, { size: 8, color: color.muted }); y += 23;

    for (const [key, label] of accessGroups) {
      const group = guests.filter(g => accessCategoryOf(g) === key).sort((a, b) => (states.findIndex(s => s[0] === a.status) - states.findIndex(s => s[0] === b.status)) || String(a.name).localeCompare(String(b.name), 'es'));
      ensure(85);
      doc.rect(44, y, width, 27).fill(color.pale);
      text(`${label}  /  ${group.length}`, 54, y + 8, { size: 10, bold: true, color: color.accent }); y += 35;
      const rowHeader = () => { ensure(49); text('#', 47, y, { size: 7, bold: true, color: color.muted }); text('NOMBRE', 69, y, { size: 7, bold: true, color: color.muted }); text('EMAIL', 224, y, { size: 7, bold: true, color: color.muted }); text('ESTADO', 409, y, { size: 7, bold: true, color: color.muted }); text('INGRESO', 505, y, { size: 7, bold: true, color: color.muted }); y += 18; line(y); };
      rowHeader();
      if (!group.length) { text('Sin registros', 69, y + 7, { size: 9, color: color.muted }); y += 29; }
      group.forEach((guest, i) => {
        if (y + 43 > doc.page.height - 85) { page(); text(`${label} / CONTINUACIÓN`,44,y,{size:9,bold:true,color:color.accent});y+=24;rowHeader(); }
        text(i + 1, 47, y + 8, { size: 8, color: color.muted });
        text(fit(guest.name, 149, 9), 69, y + 7, { size: 9, bold: true });
        text(categories.find(([key])=>key===categoryOf(guest))[1],69,y+21,{size:7,color:color.muted});
        text(fit(guest.email, 177, 8), 224, y + 8, { size: 8, color: color.muted });
        text(fit(statusText[guest.status] || 'Sin estado', 86, 8), 409, y + 8, { size: 8 });
        doc.rect(522, y + 6, 12, 12).lineWidth(0.9).strokeColor(color.muted).stroke();
        if (guest.checkedInAt) { doc.moveTo(524, y + 12).lineTo(528, y + 16).lineTo(533, y + 8).lineWidth(1.5).strokeColor(color.accent).stroke(); }
        y += 42; line(y);
      });
      y += 19;
    }
    const pages = doc.bufferedPageRange().count;
    for (let i = 0; i < pages; i++) {
      doc.switchToPage(i);
      line(doc.page.height - 67);
      text('USO INTERNO · CONTROL EN PUERTA', 44, doc.page.height - 58, { size: 7, color: color.muted });
      text(`${i + 1} / ${pages}`, 480, doc.page.height - 58, { width: 71, align: 'right', size: 7, color: color.muted });
    }
    doc.end();
  });
}
