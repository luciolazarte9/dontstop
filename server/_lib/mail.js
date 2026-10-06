import nodemailer from 'nodemailer';
import { getConfig } from './config.js';

export function mailConfigured() {
  return !!(process.env.EMAIL_FROM && (process.env.RESEND_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)));
}
export function render(template, guest, config) {
  const variables = {
    nombre: guest.name,
    evento: config.heroTitle,
    fecha: config.dateLabel,
    ubicacion: config.privateLocation || 'La dirección se compartirá por separado.'
  };
  return template.replace(/\{(nombre|evento|fecha|ubicacion)\}/g, (_, key) => variables[key]);
}
export async function deliver(to, subject, text) {
  const from = process.env.EMAIL_FROM;
  if (process.env.RESEND_API_KEY) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text }),
      signal: AbortSignal.timeout(12000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`El proveedor rechazó el correo (${response.status}): ${String(data.message || 'revisá remitente y dominio').slice(0,180)}`);
    return { provider: 'resend', id: data.id || '' };
  }
  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port, secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 12000
  });
  const info = await transport.sendMail({ from, to, subject, text });
  return { provider: 'smtp', id: info.messageId || '' };
}
export async function notifyGuest(collection, guest, eventConfig = null) {
  if (!['confirmed','rejected'].includes(guest.status)) return { sent: false, reason: 'Estado sin notificación.' };
  let notification;
  try {
    const config = eventConfig || await getConfig();
    if (!config.sendEmails) throw new Error('El envío automático está desactivado en el panel.');
    if (!mailConfigured()) throw new Error('Configurá EMAIL_FROM y Resend o SMTP en el servidor.');
    const accepted = guest.status === 'confirmed';
    const subject = render(accepted ? config.acceptedSubject : config.rejectedSubject, guest, config).replace(/[\r\n]+/g,' ').trim();
    const text = render(accepted ? config.acceptedBody : config.rejectedBody, guest, config);
    if (!subject || !text.trim()) throw new Error('Configurá el asunto y el mensaje del correo en el panel.');
    const result = await deliver(guest.email, subject, text);
    notification = { status: 'sent', forStatus: guest.status, attemptedAt: new Date(), provider: result.provider, providerId: result.id };
  } catch (error) {
    console.error('Email notification failed:', error);
    notification = { status: 'failed', forStatus: guest.status, attemptedAt: new Date(), error: String(error.message || 'Falló el envío.').slice(0,220) };
  }
  await collection.updateOne({ _id: guest._id, status: guest.status }, { $set: { notification } });
  return { sent: notification.status === 'sent', message: notification.status === 'sent' ? 'Correo solicitado al proveedor.' : notification.error };
}
