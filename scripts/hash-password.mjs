import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline';
const readline = createInterface({ input: process.stdin, output: process.stdout });
const password = await new Promise(resolve => readline.question('Contraseña de administrador (mínimo 12 caracteres): ', resolve));
readline.close();
if (password.length < 12) { console.error('Usá al menos 12 caracteres.'); process.exit(1); }
const salt = randomBytes(16).toString('hex');
console.log(`ADMIN_PASSWORD_HASH=${salt}:${scryptSync(password, salt, 64).toString('hex')}`);
console.log(`SESSION_SECRET=${randomBytes(32).toString('hex')}`);
