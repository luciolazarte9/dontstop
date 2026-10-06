# Actualizar Dont Stop a 3.5.0

Preparado sobre el repositorio público luciolazarte9/dontstop, commit d916cc3d951a17ddbed1c53fcaa0acd147d5ebda. No hace falta borrar el proyecto, el dominio ni el deploy de Vercel. El título Dont Stop de index.html se conserva.

## 1. Qué copiar

Descomprimí el ZIP de actualización y copiá su contenido dentro de la carpeta donde está package.json de tu repositorio. Reemplazá los archivos coincidentes:

- **server/**: backend completo actualizado, incluidas las rutas anteriores.
- **src/**: main.jsx, styles.css y el nuevo ProductionPanel.jsx.
- **tests/**: pruebas anteriores y nuevas.
- **package.json** y **package-lock.json**: versión 3.5.0; mismas dependencias de producción.
- **README.md**, **ACTUALIZAR.md** y **.env.example**: documentación y ejemplo sin credenciales.

No cambian api/, scripts/, vercel.json, index.html ni public/. No copies nada sobre .env.local. Si tenés cambios locales todavía sin subir (por ejemplo Speed Insights en main.jsx), comparalos antes de reemplazar ese archivo y conservá esas líneas y su dependencia en package.json/package-lock.json. El ZIP se basa en lo que está publicado en GitHub, no en archivos que solo existen en tu Mac.

Desde la carpeta del proyecto:

```bash
npm ci
npm test
npm run build
```

Las pruebas normales no necesitan tu MongoDB. El test de integración se omite si no hay MONGODB_TEST_URI; fue ejecutado en desarrollo contra un replica set de MongoDB aislado, con correo simulado. No se hicieron envíos reales a tus contactos.

## 2. Configuración de Vercel

En el mismo proyecto: Settings → Environment Variables. Conservá MONGODB_URI, MONGODB_DB, ADMIN_EMAIL, ADMIN_PASSWORD_HASH, SESSION_SECRET y las variables de correo que ya funcionan.

Agregá **una sola variable nueva**:

| Key | Value de ejemplo | Entorno |
| --- | --- | --- |
| APP_URL | https://dontstop-tu-proyecto.vercel.app | Production |

Usá tu URL pública real y estable, sin /admin, rutas, parámetros o comillas. Si ya usás un dominio propio, poné ese dominio. APP_URL sirve para los enlaces de baja de los emails; no es una nueva base de datos. Una Preview debe usar su URL propia y, si vas a probar envíos, una base de prueba y credenciales de prueba.

Con Gmail, mantené:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=tu-cuenta@gmail.com
SMTP_PASSWORD=contraseña-de-aplicación-de-16-caracteres-sin-espacios
EMAIL_FROM=tu-cuenta@gmail.com
```

RESEND_API_KEY debe quedar eliminada o vacía si querés usar SMTP: el backend prioriza Resend cuando existe esa clave. No uses la contraseña habitual de Gmail. El envío de campañas usa el mismo proveedor que las confirmaciones, pero no depende del interruptor de emails automáticos del evento.

En .env.local agregá:

```dotenv
APP_URL="http://localhost:3000"
```

Luego `npm run dev:full`. Al cambiar variables locales, reiniciá el servidor. El archivo .env.example es solo un modelo: no lo completés con claves reales ni subas .env.local a GitHub.

## 3. Subir sin dar de baja el deploy

Después de copiar los archivos y verificar el build:

```bash
git status
git add server src tests package.json package-lock.json README.md ACTUALIZAR.md .env.example
git diff --cached --stat
git commit -m "Agrega contactos, campañas y balances por fiesta"
git push origin main
```

Vercel construirá el nuevo deployment y mantendrá el anterior sirviendo mientras lo prepara. Esperá a que termine en estado Ready. Si agregaste APP_URL después del build, hacé Redeploy para que ese deployment reciba la variable. No elimines tu proyecto ni cambies la conexión con GitHub.

Se mantiene **una sola Serverless Function** en api/index.js. Las rutas nuevas pasan por server/router.js; no agregues funciones individuales dentro de api/.

## 4. MongoDB: mismo cluster gratuito

No necesitás un segundo cluster ni una segunda conexión. La actualización usa colecciones separadas en la misma base indicada en MONGODB_DB. Comparten el almacenamiento de tu cluster gratuito; los archivos de invitados, imágenes y demás datos también consumen ese espacio.

Colecciones nuevas: contacts, campaigns, campaignRecipients, partners, movements, rounds y guestArchive. Se crean automáticamente. La primera visita a uno de los paneles nuevos, o el primer RSVP nuevo, migra los emails de invitados existentes a contacts. Esa migración no borra invitados ni cambia sus estados y se puede repetir sin duplicar emails. Los históricos quedan subscribed:false; registrar un email no equivale a aceptar campañas.

El usuario de la conexión MongoDB debe conservar permiso readWrite sobre esa misma base. Los balances, los accesos y los contactos quedan en MongoDB; no requieren más variables de entorno.

## 5. Empezar a usar el panel

### Socios y balance

1. Entrá con tu cuenta propietaria (ADMIN_EMAIL).
2. En Administradores, creá un acceso por socio: email y contraseña individual de al menos 12 caracteres.
3. En Balance, agregá el nombre del socio y el mismo email de su cuenta. También podés agregar tu cuenta propietaria como socio.
4. Editá el nombre y la referencia de fecha de la fiesta. Este nombre corresponde al balance, separado del título de la landing.
5. Cada socio entra a /admin con su cuenta y carga sus movimientos, indicando monto total en pesos argentinos, fecha, categoría, descripción y pagado/cobrado o pendiente.
6. Un socio carga movimientos a su propio nombre y puede marcar pagados o anular sus propios registros. El propietario puede cargar o corregir registros de cualquier socio. Las anulaciones conservan el registro y la auditoría.

**Ingresos:** entradas anticipadas, entradas en puerta, estacionamiento, barra y otros ingresos.

**Egresos:** Venue, DJs, técnica y sonido, seguridad, living, hielo, alcohol y Techo (pagos sin categoría específica).

Los montos se guardan en centavos para evitar errores de decimales. El resultado es ingresos cobrados menos egresos pagados; los pendientes aparecen separados. Las ventas de entradas pueden incluir cantidad, independiente del monto total: no se multiplica el monto por esa cantidad. Los resúmenes por categoría y por socio permiten ver qué se cobró y quién pagó.

Cargá una compra una sola vez a nombre de quien efectivamente pagó. Un aporte de capital o devolución entre socios no es una venta ni un gasto nuevo de la fiesta: esta versión no incluye un libro de aportes/reintegros o reparto automático de utilidades. No dupliques un gasto al devolverle dinero al socio.

Los administradores conservan sus permisos existentes sobre evento e invitados. Esta versión agrega estas reglas básicas; la gestión avanzada de roles queda para una actualización posterior.

### Contactos y emails personalizados

1. La landing incluye una casilla opcional, desmarcada por defecto, para recibir novedades.
2. Contactos muestra todos los emails conservados, con búsqueda, paginación y estado de suscripción. Podés excluir un contacto de futuras campañas. Para volver a suscribirse, la persona debe aceptar nuevamente la casilla al registrar una nueva invitación.
3. En Emails, escribí el asunto y el mensaje. Podés usar `{nombre}` en ambos. Los correos son texto, con enlaces escritos en el mensaje; no es un editor de HTML.
4. Registrá una invitación con tu email de propietario para habilitar el botón de prueba. La prueba se envía solo a ese email y se identifica con [PRUEBA].
5. Guardá el borrador, revisalo, presioná Preparar campaña y confirmá. Se toma una lista de los suscriptos de ese momento. Los nuevos suscriptos posteriores se incluirán en otra campaña.
6. Presioná Continuar envío. Dejá el panel abierto para que procese las tandas. Podés pausarlo; al cerrar el panel se termina, como máximo, la tanda en curso y el resto queda pendiente.
7. Para retomar, volvé a Emails y presioná Continuar envío. Las bajas posteriores a preparar una campaña se verifican antes de cada intento.

Cada mensaje incorpora un enlace para confirmar la baja; abrir el enlace no da de baja automáticamente, para evitar que los escáneres de correo lo hagan por el destinatario. Una baja detiene campañas futuras y los intentos todavía pendientes. Un mensaje ya en proceso puede completarse.

Los contadores distinguen pendientes, solicitados al proveedor, fallidos, excluidos por baja y en proceso/inciertos. Que el proveedor acepte el email no garantiza que llegue a la bandeja principal. Si el proveedor rechaza un envío, el panel detiene el avance automático: revisá los logs y la configuración. Los fallidos o intentos interrumpidos no se reintentan solos, porque podrían haberse enviado antes de perder la respuesta. Verificá el proveedor y luego usá Reintentar este destinatario, confirmando el posible duplicado. Solo se vuelve a poner en cola ese destinatario. Para un resultado incierto hay que esperar 10 minutos y actualizar el panel; se muestran hasta 20 incidencias por campaña.

Las tandas evitan agotar una petición de Vercel, pero no eliminan los límites diarios de Gmail o del proveedor. No hay cron ni envíos programados en segundo plano en esta versión. Máximo: 10.000 contactos por campaña; el listado muestra las últimas 30 campañas. Contactos, Emails y Reset están reservados al propietario.

### Reset de invitados

1. Terminada la fiesta, revisá invitados y balance.
2. En Resetear lista, verificá el balance que se cerrará y escribí RESETEAR.
3. Confirmá con Archivar y resetear lista.

En una transacción se archivan los invitados en guestArchive, se conservan sus contactos, se cierra el balance actual y se abre el siguiente. La lista activa queda en cero y el mismo email puede registrarse otra vez para la próxima fiesta. Las suscripciones y bajas anteriores se conservan.

Los balances cerrados aparecen en el selector de Balance y son de solo lectura. El archivo de invitados queda en MongoDB (guestArchive, agrupado por roundId); el PDF de invitados existente sigue exportando la lista activa. No se añade todavía un panel de consulta de invitados archivados ni un botón para deshacer el reset.

Después del reset, editá Configurar evento (fecha, contador, ubicación, imágenes, textos) y el nombre/referencia del nuevo balance. El reset no cambia esos textos automáticamente ni elimina campañas o administradores. No hay un creador de varios eventos simultáneos.

## 6. Comprobación rápida después del deploy

- La invitación carga y el checkbox de novedades está desmarcado.
- Una inscripción nueva aparece en Invitados y en Contactos; el estado de suscripción coincide con el checkbox.
- Podés crear un socio, registrar un gasto y ver el total actualizado.
- La prueba de email llega al propietario y su enlace abre la confirmación de baja.
- El PDF de invitados y las herramientas anteriores siguen funcionando.
- Probá el reset primero en localhost con una base de prueba o en una Preview aislada. No lo uses sobre una fiesta en curso para comprobarlo.

QR, venta de entradas con cobro online y gestión avanzada de roles quedan pendientes, tal como pediste.
