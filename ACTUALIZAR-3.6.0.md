# Dont Stop 3.6.0 — campañas e importación de contactos

## Qué incluye

- Envío real a todos los contactos suscriptos, con cantidad de destinatarios, confirmación, progreso y estado por email. El envío empieza al confirmar y usa el mismo servicio SMTP o Resend que las invitaciones. Solo la copia de prueba opcional lleva [PRUEBA] en el asunto.
- Editor de asunto, título, texto personalizado con {nombre}, vista previa en bandeja, botón principal y hasta tres imágenes subidas desde el panel. Vista previa del diseño HTML y botón pequeño de baja en el pie. La alternativa de texto conserva el enlace para lectores sin HTML.
- Importación de CSV o listas de emails pegadas, con revisión previa, detección de repetidos e inválidos y protección de bajas anteriores. Se usa la colección contacts del MongoDB existente: no hace falta otro cluster.
- Se conservan las categorías General, General Difusión, VIP y Backstage, sus PDFs, el balance y su PDF, socios, reset y textos adaptables al celular.

## Archivos que reemplazar

Descomprimí el ZIP y copiá su contenido dentro de tu repositorio, donde está package.json:

- server/ completo.
- src/ completo.
- tests/ completo.
- package.json y package-lock.json.
- ACTUALIZAR-3.6.0.md.

Son las únicas carpetas y archivos incluidos. Conservá .env.local, index.html, api/, scripts/, public/ y vercel.json. No borres tu repositorio ni el proyecto de Vercel. Si modificaste el frontend por tu cuenta, compará tus cambios antes de reemplazar src/.

La actualización presupone que ya tenés el backend consolidado en una sola función api/index.js, con server/router.js y el dev-server actualizado. No reemplaces únicamente api/: los cambios están en server/ y src/.

## Actualizar el mismo deploy

Guardá primero tus cambios propios en un commit. Luego, antes de copiar los archivos:

```bash
git status
git pull --no-rebase origin main
```

Resolvé cualquier conflicto pendiente. Copiá los archivos y ejecutá:

```bash
npm ci
npm test
npm run build
```

Si termina correctamente:

```bash
git add server src tests package.json package-lock.json ACTUALIZAR-3.6.0.md
git diff --cached --stat
git commit -m "Actualiza campañas HTML e importación de contactos"
git push origin main
```

Esperá que Vercel muestre Ready y recargá /admin. No hace falta dar de baja el deploy. Para probar localmente: npm run dev:full.

## Variables de entorno

No hay variables nuevas. Conservá tu SMTP_USER, SMTP_PASSWORD de aplicación de Gmail, SMTP_HOST, SMTP_PORT y EMAIL_FROM. Si utilizás Gmail, RESEND_API_KEY debe seguir sin configurar: cuando existe, tiene prioridad sobre SMTP.

APP_URL debe contener la URL pública HTTPS de tu aplicación, por ejemplo https://tu-proyecto.vercel.app, sin /admin ni rutas adicionales. Se usa para las imágenes y las bajas. En Vercel, el Value contiene solamente el valor, sin comillas. Después de cambiar variables, hacé un nuevo deployment. Localmente, APP_URL puede ser http://localhost:3000 en .env.local.

## Importar bases existentes

Entrá como propietario a CONTACTOS → IMPORTAR BASE DE EMAILS / CSV.

1. Exportá tu planilla de Excel o Google Sheets a CSV UTF-8. El archivo puede usar coma o punto y coma; admite hasta 1 MB y 10.000 filas. Si es mayor, dividilo en archivos.
2. Usá las columnas email y nombre; nombre es opcional. También podés pegar un email por línea. No se admiten directamente archivos XLSX ni respaldos completos de bases de datos.
3. Marcá la casilla de consentimiento si esos contactos aceptaron recibir tus novedades. Sin marcarla, los contactos nuevos se guardan, pero no quedan suscriptos para campañas.
4. Pulsá REVISAR IMPORTACIÓN y verificá los conteos y ejemplos. Después, CONFIRMAR IMPORTACIÓN.

Ejemplo:

```csv
email,nombre
persona@ejemplo.com,Lucio
otra@ejemplo.com,María
```

Los emails se normalizan y se guardan una sola vez. Los existentes conservan su nombre. Importar no vuelve a activar contactos que anteriormente se dieron de baja, incluso con la casilla marcada. Si la operación falla, podés volver a importar el mismo archivo sin duplicar los contactos.

## Enviar una campaña real

Entrá a EMAILS, completá el mensaje y revisá el diseño. Podés cargar hasta tres imágenes JPEG, PNG o WebP de hasta 1,5 MB cada una. Completá texto y URL HTTPS del botón, o dejá ambos vacíos.

Pulsá ENVIAR CAMPAÑA A TODOS (N) y luego CONFIRMAR ENVÍO A TODOS. La campaña toma los contactos suscriptos en ese momento y vuelve a verificar las bajas antes de enviar cada mensaje. Cada persona recibe un email separado.

Mantené abierto el panel durante el envío. Podés pausar después del email en proceso; si cerrás el panel, los pendientes quedan guardados para CONTINUAR ENVÍO REAL. El progreso muestra procesados, pendientes, fallidos y bajas excluidas. VER TODOS LOS DESTINATARIOS permite consultar cada email.

“Solicitado al proveedor” significa que SMTP/Resend aceptó el envío; no confirma entrega ni lectura. Si falla el proveedor, la cola se pausa. Antes de reintentar un envío incierto, revisá el proveedor para evitar un duplicado. Gmail conserva sus propios límites de envío.

La opción COPIA DE PRUEBA OPCIONAL solo envía al email del propietario y requiere que exista en contactos. No es la acción principal ni inicia una campaña.

## Verificación realizada

Se verificaron importación con y sin consentimiento, duplicados, bajas protegidas, permisos, campañas y reset con MongoDB aislado. Se probaron carga de imagen, vista previa HTML, envío a dos suscriptos, progreso e importación desde el navegador. Los correos se capturaron con un servicio simulado; no se enviaron campañas reales ni se modificaron tus datos.

npm test omite la integración cuando no existe MONGODB_TEST_URI; esa prueba se ejecutó por separado contra una base de prueba. La compilación de producción también se verificó.
