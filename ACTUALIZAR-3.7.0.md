# Dont Stop 3.7.0 — TBA, suscripción y música en la página

## Qué incluye

Modo sin evento anunciado: pantalla TBA / TO BE ANNOUNCED, logo de marca, suscripción por email y reproductor. Se ocultan fecha, DJs, contador e invitación completa. La API también rechaza nuevas solicitudes de invitados mientras el evento no esté anunciado.

El propietario o administrador puede cambiar el modo desde CONFIGURAR EVENTO. Los datos del evento y de producción se conservan; activar TBA no resetea la lista. La suscripción se guarda en la colección contacts del mismo MongoDB y no crea una invitación. Los duplicados se guardan una sola vez y se respetan bajas anteriores.

El reproductor funciona dentro de la página, tanto en modo TBA como con evento anunciado. Permite pausar, reproducir, cambiar volumen y avanzar con los controles del navegador. Intenta comenzar automáticamente, con volumen inicial del 50 % y repetición del tema. Si el navegador bloquea el sonido, ofrece REPRODUCIR; no es posible garantizar el inicio con sonido sin interacción en todos los navegadores.

## Qué actualizar

Copiá dentro de tu repositorio, donde está package.json:

- src/ completo.
- server/ completo.
- tests/ completo.
- public/brand/ y public/music/, combinándolos con tu public existente, sin borrar otros archivos.
- package.json y package-lock.json.
- ACTUALIZAR-3.7.0.md.

Se incluyen las funciones anteriores de 3.6.1 y el logo para evitar archivos faltantes. Conservá .env.local, index.html, api/, scripts/, vercel.json y tus archivos propios de public/. Compará cualquier cambio que hayas hecho en src/ antes de reemplazarlo.

Respecto de 3.6.1, los cambios están en src/main.jsx, src/styles.css, el nuevo src/TbaPage.jsx, server/_lib/config.js, server/rsvp.js, server/router.js y el nuevo server/subscribe.js, además de pruebas y versión. La ruta de suscripción usa la misma única función de Vercel; no agrega funciones serverless.

Con los cambios anteriores guardados en un commit, antes de copiar el ZIP:

```bash
git status
git pull --no-rebase origin main
```

Resolvé cualquier conflicto pendiente. Copiá el ZIP y ejecutá:

```bash
npm ci
npm test
npm run build
```

Después:

```bash
git add src server tests public/brand public/music package.json package-lock.json ACTUALIZAR-3.7.0.md
git diff --cached --stat
git commit -m "Agrega modo TBA con suscripción y música"
git push origin main
```

Esperá Ready en Vercel. No hace falta borrar el deploy ni cambiar las variables de entorno. Para probar localmente: npm run dev:full.

## Activar TBA

Entrá a /admin → CONFIGURAR EVENTO → ESTADO DE LA PÁGINA. Desmarcá EVENTO ANUNCIADO / MOSTRAR INVITACIÓN COMPLETA y pulsá GUARDAR CAMBIOS. Abrí o recargá la página pública para ver TBA.

Cuando anuncies una fiesta, completá sus datos, marcá nuevamente EVENTO ANUNCIADO y guardá. Vuelve la landing completa. Las instalaciones anteriores siguen en modo evento anunciado hasta que lo cambies; no se activa TBA simplemente porque pasó la fecha.

Las personas que se registran desde TBA deben marcar la aceptación de novedades. Los contactos nuevos quedan disponibles en CONTACTOS y en las campañas dirigidas a todos los suscriptos. Nombre es opcional. No se envía un email de confirmación de invitación al suscribirse, porque no se está solicitando una entrada.

## Elegir la canción

CONFIGURAR EVENTO → MÚSICA:

1. Completá Tema y Artista.
2. En Audio directo pegá una URL pública HTTPS que termine en .mp3, .m4a, .wav u .ogg. Puede tener parámetros después de la extensión. Debe responder con audio, sin inicio de sesión.
3. Alternativamente, copiá tu MP3 a public/music/tema.mp3. Subilo con git add public/music, commit y push. Esperá el deploy y colocá /music/tema.mp3 en Audio directo. Usá nombres sin espacios ni tildes. MP3 es la opción recomendada por tamaño y compatibilidad.
4. Dejá marcada INTENTAR REPRODUCIR AUTOMÁTICAMENTE y guardá. Si preferís que la gente lo inicie, desmarcala.

Los links de YouTube, Spotify y SoundCloud no son archivos de audio directos y no sirven en este campo. El campo URL de ESCUCHAR mantiene el enlace externo anterior cuando no hay audio directo configurado. Si Audio directo está vacío, no aparece un reproductor vacío.

El ZIP no incluye una canción: elegís tu propio archivo. No requiere otro cluster ni credenciales de un servicio de música. Recordá que los archivos en public/music son públicos.

## Pruebas

Pruebas de configuración, rutas, integración en MongoDB aislado, suscripción con consentimiento, duplicados, bajas protegidas y bloqueo/reapertura de RSVP correctas. Se probó desde el navegador guardar TBA en el administrador, registrar el contacto, reproducir y pausar audio real de prueba y verificar anchos de 320, 390 y 1365 px. También se probó el botón de reproducción cuando el inicio automático es bloqueado. Los emails se simularon; no se contactó a tus invitados.

npm test omite la prueba de integración sin MONGODB_TEST_URI. Esa prueba se ejecutó separadamente en una base aislada. La compilación de producción se verificó sin agregar dependencias de producción.
