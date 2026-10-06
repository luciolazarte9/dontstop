# Dont Stop · versión 3.5.0

Esta actualización agrega reset con archivo, contactos con consentimiento, campañas de email y balances por fiesta y socio. Para aplicar sobre tu deploy existente, seguí [ACTUALIZAR.md](ACTUALIZAR.md).

# JUANHER + LUCI — versión MongoDB

Invitación React + Vite, API Node.js en Vercel y MongoDB para invitados, configuración e imágenes. `/admin` permite gestionar invitados y editar la página pública sin volver a desplegar.

## Actualizar desde la versión 3.4.0

Esta versión agrupa todas las rutas del backend en **una sola función de Vercel**, para resolver el límite de 12 funciones por deployment. Las URLs y variables de entorno siguen siendo las mismas.

En tu carpeta local vinculada a GitHub, eliminá la carpeta `api` anterior antes de copiar los archivos de esta versión. La carpeta nueva `api` debe contener **solo `index.js`**; los controladores están en `server`. Conservá `.git` y tu `.env.local`. Si quedan archivos antiguos dentro de `api`, Vercel seguirá creando funciones adicionales.

Después ejecutá `npm install`, `npm test` y `npm run build`; guardá los cambios con `git add .`, `git commit -m "Agrupar backend para Vercel"` y `git push`. Vercel podrá volver a desplegar el commit con las variables de entorno que ya configuraste.

## Publicar

1. Descomprimí este ZIP y subí la carpeta como proyecto a Vercel mediante un repositorio Git o `npx vercel`. El framework es Vite, el comando de build `npm run build` y la salida `dist`.
2. Creá un cluster en [MongoDB Atlas](https://www.mongodb.com/atlas), un **database user** con contraseña y autorizá la conexión de la aplicación en **Network Access**. Copiá la connection string de **Connect → Drivers → Node.js**. Sustituí `<db_password>` por la contraseña del database user; si contiene caracteres especiales, codificalos como URL. En entornos con salida IP variable, necesitás una opción de acceso compatible con las IP de Vercel; restringí la red cuando tengas egreso fijo. No publiques la cadena en el código.
3. En la carpeta ejecutá `npm run setup-admin` y elegí una contraseña de al menos 12 caracteres. Copiá los valores `ADMIN_PASSWORD_HASH` y `SESSION_SECRET` generados. Si ya habías configurado estas variables en la versión anterior, podés conservarlas y usar el mismo login.
4. En **Vercel → Project → Settings → Environment Variables** configurá:

   | Variable | Valor |
   | --- | --- |
   | `MONGODB_URI` | La cadena de conexión completa de Atlas |
   | `MONGODB_DB` | `juanher_luci` (opcional; este es el valor por defecto) |
   | `ADMIN_EMAIL` | Tu email de administrador |
   | `ADMIN_PASSWORD_HASH` | El hash generado por `npm run setup-admin` |
   | `SESSION_SECRET` | El secreto generado por `npm run setup-admin` |

5. Seleccioná **Production** (y Preview si usás previews), guardá y hacé **Redeploy**. Entrá a `/admin` con el email y la contraseña que elegiste, **no con el hash**.

**La versión anterior usaba `DATABASE_URL` de PostgreSQL. Esta versión usa `MONGODB_URI`; `DATABASE_URL` ya no se utiliza.** Los invitados que existan en PostgreSQL no se migran automáticamente. Si ya recibiste respuestas en la base anterior, exportalas antes de cambiar el despliegue.

## Qué se edita desde `/admin`

- **Invitados:** ver, buscar, filtrar, confirmar, rechazar y exportar un PDF para control de entrada.
- **Administradores:** la cuenta propietaria puede crear otras cuentas, cambiar sus contraseñas y desactivarlas desde la pestaña Administradores. Esas cuentas acceden a invitados y configuración, pero no pueden crear administradores. La cuenta propietaria sigue definida por `ADMIN_EMAIL` y `ADMIN_PASSWORD_HASH`; no aparece entre las cuentas de MongoDB. Desactivar una cuenta o cambiarle la contraseña invalida su sesión anterior.
- **Control de ingreso:** la pestaña Control de ingreso permite buscar confirmados, registrar o anular su entrada y ver el total ingresado. Se actualiza cada 10 segundos si hay conexión; la operación se guarda en MongoDB y evita un segundo ingreso simultáneo. El PDF sirve como respaldo e indica los ingresos ya registrados al exportarlo.
- **Cupo y espera:** en Configurar evento definí el máximo de confirmados; 0 significa sin límite. Las solicitudes nuevas pasan a `en espera` cuando se alcanza el cupo. Los pendientes anteriores siguen pendientes y se deben gestionar manualmente. La API impide superar el cupo incluso si dos administradores confirman simultáneamente. Si se libera un lugar, seleccioná manualmente a un invitado en espera y confirmalo. No se puede reducir el cupo por debajo de los confirmados existentes.
- **Historial:** la pestaña Historial muestra los últimos 100 cambios con fecha y cuenta responsable. Registra RSVP, estado, categoría, ingreso, cupo/configuración y gestión de cuentas; empieza a registrar a partir de esta versión. No reconstruye cambios anteriores.
- **Evento:** título, portada, ciudad, fecha y hora del contador, textos, ubicación visible, formato, música, line up y sección RSVP.
- **DJs:** añadir, quitar, reordenar, cambiar nombre, rol, horario, género, biografía y foto.
- Las fotos se pueden subir desde el panel en JPEG, PNG o WebP hasta **1,5 MB por archivo**, o configurar con URL HTTPS. Se guardan en la colección `images` de MongoDB. Al subir una imagen, presioná **GUARDAR CAMBIOS** para publicarla.

Al elegir «Sí, quiero ir», la solicitud queda **pendiente** hasta que el administrador la confirme. «No puedo» queda **no asiste**. Cada email puede responder una vez. El formulario permite elegir hombre, mujer o prefiero no indicar; las respuestas antiguas quedan sin especificar hasta que las clasifiques en el panel. El PDF incluye el nombre y la fecha del evento, totales por estado y categoría y una lista imprimible con casillas de ingreso. Incluye todas las solicitudes, por lo que el personal de entrada debe comprobar el estado antes de dar acceso. Confirmar/rechazar envía un correo automáticamente **si configuraste un proveedor y activaste la opción en el panel**. Si el envío falla, el estado del invitado se conserva y el panel permite reintentar. La ubicación privada aparece solo en el correo de aceptación si la configuraste en la plantilla; nunca se expone en `/api/config`.

## Desarrollo y límites

`npm install`, `npm test` y `npm run build` verifican las rutas y el frontend. Para probar el sitio y la API en tu computadora:

```bash
cp .env.example .env.local
# Abrí .env.local en un editor y completá los valores reales
npm install
npm run dev:full
```

Abrí `http://localhost:3000` y `http://localhost:3000/admin`. **No pegues tu URI o contraseña en el código ni subas `.env.local`**: el archivo está ignorado por Git. Si preferís vincular el proyecto a Vercel, `npx vercel dev` también inicia las funciones y utiliza las variables del entorno Development. `npm run dev` ejecuta solo Vite; con ese comando `/api/config` no funciona. Para comprobar la conexión abrí `http://localhost:3000/api/config`: debe devolver JSON con la propiedad `config`. Si da error 500, revisá `MONGODB_URI`, el usuario de Atlas y la IP autorizada en Network Access. `MONGODB_DB=juanher_luci_dev` permite separar tus pruebas de los datos reales.

 La aplicación reutiliza la conexión MongoDB entre llamadas de la función. Las fotos antiguas que dejen de estar referenciadas no se eliminan solas de la colección; limpialas en Atlas si necesitás recuperar espacio. La lista del panel carga hasta 5000 invitados. Las operaciones de cupo, RSVP y check-in utilizan transacciones MongoDB; probalas con MongoDB Atlas o un replica set compatible (una instalación local standalone de MongoDB no admite este flujo). La autenticación usa hash scrypt y cookie firmada HttpOnly/Secure/SameSite, pero no incluye recuperación de contraseña ni limitación distribuida de intentos de login.

### Si el login local dice «Credenciales incorrectas»

Ejecutá `npm run reset-admin-local` para elegir un email y una contraseña nuevos: el comando escribe el hash y el secreto correctos directamente en `.env.local`, conservando la conexión MongoDB. Después detené el servidor con `Ctrl+C`, ejecutá `npm run dev:full` y entrá con ese email y contraseña. Esto cambia **solo la configuración local**; para el sitio publicado tenés que actualizar las variables de Vercel y redesplegar.

## Correos automáticos

Al confirmar o rechazar desde `/admin`, la API envía un correo de texto con la plantilla editable en **Configurar evento → Correos a invitados**. Se pueden usar `{nombre}`, `{evento}`, `{fecha}` y `{ubicacion}`. La dirección privada y las plantillas no se publican en la API de la landing. El panel guarda el resultado del intento y ofrece **REENVIAR EMAIL**. Usalo con cuidado si no estás seguro de si un intento anterior llegó: un reenvío manual puede duplicar el mensaje. «EMAIL SOLICITADO» significa que el proveedor aceptó la solicitud, no garantiza que haya llegado a la bandeja de entrada.

Elegí **una** de estas configuraciones en `.env.local` para localhost y en Environment Variables de Vercel para Production:

### Opción A: Resend

Verificá un dominio propio en Resend. Agregá `RESEND_API_KEY` y `EMAIL_FROM` (por ejemplo `Invitaciones <hola@tudominio.com>`). El dominio `resend.dev` solo permite enviar a la cuenta con la que te registraste en Resend, por lo que para invitados reales necesitás un dominio verificado.

### Opción B: SMTP / Gmail

Agregá `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=tu-direccion@gmail.com`, `SMTP_PASSWORD=tu-contraseña-de-aplicación` y `EMAIL_FROM=tu-direccion@gmail.com`. Gmail requiere verificación en dos pasos para generar una contraseña de aplicación; **no uses tu contraseña normal de Gmail**. Otros proveedores SMTP también funcionan con sus propios datos. Si están configurados Resend y SMTP, se usa Resend.

Reiniciá `npm run dev:full` después de editar `.env.local`; en Vercel hacé Redeploy después de configurar las variables. Probá primero con una solicitud RSVP enviada desde **tu propio email**, confirmala o rechazala en el panel y revisá tanto el estado del envío como tu bandeja. Si falta el proveedor o falla, la decisión de asistencia se guarda igual y el panel lo indica. Las credenciales nunca deben ir en React ni en archivos subidos al repositorio.
