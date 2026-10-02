import { database } from './db.js';

export function actor(req) { return { role: req.admin.role, email: req.admin.email }; }
export async function audit(entry, session = undefined) {
  const collection = (await database()).collection('auditLog');
  await collection.insertOne({ ...entry, at: new Date() }, session ? { session } : {});
}
export class ActionError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
