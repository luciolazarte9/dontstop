import { randomBytes, scryptSync } from 'node:crypto';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { parse } from 'dotenv';

const path = '.env.local';
const example = '.env.example';
let current;
try { current = parse(await readFile(path)); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  current = parse(await readFile(example));
}
let email, password;
if (stdin.isTTY) {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    email = (await rl.question('Email para ingresar a /admin: ')).trim().toLowerCase();
    password = await rl.question('Nueva contraseña (mínimo 12 caracteres): ');
  } finally { rl.close(); }
} else {
  let input = '';
  for await (const chunk of stdin) input += chunk;
  [email, password] = input.split(/\r?\n/);
  email = email?.trim().toLowerCase();
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) {
  console.error('Email inválido o contraseña demasiado corta. No se modificó .env.local.');
  process.exit(1);
}
const salt = randomBytes(16).toString('hex');
current.ADMIN_EMAIL = email;
current.ADMIN_PASSWORD_HASH = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
current.SESSION_SECRET = randomBytes(32).toString('hex');
const keys = ['MONGODB_URI','MONGODB_DB','ADMIN_EMAIL','ADMIN_PASSWORD_HASH','SESSION_SECRET'];
const lines = keys.filter(key => current[key] !== undefined).map(key => `${key}=${JSON.stringify(current[key])}`);
const temporary = `${path}.tmp`;
await writeFile(temporary, lines.join('\n') + '\n', { mode: 0o600 });
await rename(temporary, path);
console.log('Administrador local configurado. Reiniciá npm run dev:full e ingresá con ese email y contraseña.');
if (!current.MONGODB_URI || current.MONGODB_URI.includes('USER:PASSWORD@CLUSTER')) console.log('Recordá completar MONGODB_URI en .env.local para cargar el evento.');
