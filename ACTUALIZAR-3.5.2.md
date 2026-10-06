# Actualización Dont Stop 3.5.2

## Cambios

- El formulario público permite elegir General, General Difusión, VIP o Backstage. La elección se guarda en MongoDB y se refleja en el panel y los PDFs de esa categoría. Solicitar VIP o Backstage no aprueba automáticamente la invitación: la aprobación del administrador y el cupo siguen funcionando como antes. El administrador puede corregir la categoría.
- El título principal, los títulos de secciones y los nombres de DJs en el line up y en sus tarjetas ajustan el tamaño de letra al ancho disponible. Los nombres muy largos se dividen en varias líneas al llegar a un tamaño mínimo legible. Funciona también con palabras largas sin espacios y al cambiar el tamaño de la ventana.
- Se conservan los PDFs separados, el PDF del balance, contactos, campañas, socios y reset de invitados.

## Qué actualizar

Este ZIP puede copiarse sobre la versión 3.5.0 o 3.5.1. Copiá su contenido dentro de la carpeta de tu repositorio donde está package.json, reemplazando los archivos coincidentes:

- **server/**: backend completo actualizado.
- **src/**: frontend completo actualizado, incluido el nuevo AdaptiveHeading.jsx.
- **tests/**: pruebas actualizadas.
- **package.json** y **package-lock.json**: versión 3.5.2, sin nuevas dependencias de producción.
- **ACTUALIZAR-3.5.2.md**: esta guía.

Los cambios nuevos respecto de 3.5.1 están en server/rsvp.js, server/_lib/access-categories.js, server/admin/access-category/[id].js, src/main.jsx, src/styles.css, src/AdaptiveHeading.jsx y tests/integration.test.mjs, además de los archivos de versión. Se incluyen las carpetas completas para facilitar la copia.

Conservá .env.local, index.html, api/, scripts/, public/ y vercel.json. No hay nuevas variables de entorno, ni otro cluster, ni migraciones manuales. Si hiciste cambios propios al frontend después de la versión anterior, comparalos antes de reemplazar main.jsx y styles.css.

## Pasos

Antes de copiar el ZIP, con tus cambios anteriores guardados en un commit:

```bash
git status
git pull --no-rebase origin main
```

Si aparecen conflictos o hay un merge pendiente, completalo antes de continuar. Después copiá los archivos del ZIP y ejecutá:

```bash
npm ci
npm test
npm run build
```

Cuando esas verificaciones terminen correctamente:

```bash
git add server src tests package.json package-lock.json ACTUALIZAR-3.5.2.md
git diff --cached --stat
git commit -m "Agrega selección pública de categoría y textos adaptables"
git push origin main
```

Vercel actualizará el mismo proyecto. Esperá a que el deployment esté Ready y recargá la invitación. No hace falta borrar el deploy ni cambiar el dominio.

Para probar localmente, conservá la configuración de .env.local y ejecutá `npm run dev:full`. Editá los nombres y los títulos desde Configurar evento: no hace falta tocar el código para ajustar el tamaño.

## Comprobaciones

Se probó que las cuatro categorías se guarden sin aprobar automáticamente al invitado y que una categoría inválida sea rechazada. Se comprobó la solicitud de Backstage desde el formulario hasta el panel del administrador, y se mantienen las descargas de PDF y el resto de las funciones.

En el navegador se probaron nombres cortos, largos y sin espacios en anchos de 320, 390, 768 y 1365 píxeles, sin desbordamiento horizontal. La tipografía vuelve a crecer cuando el nombre es más corto o dispone de más ancho.

Los clientes antiguos que no envíen una categoría siguen registrando General. Los registros anteriores no cambian su categoría, estado ni género. `npm test` omite la prueba de integración si no existe MONGODB_TEST_URI; las pruebas con MongoDB se realizaron en una base aislada, sin modificar tus datos reales.
