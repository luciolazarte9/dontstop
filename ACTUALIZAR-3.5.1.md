# Dont Stop 3.5.1: listas por acceso y PDF del balance

Esta corrección se aplica sobre la versión 3.5.0 de tu proyecto. Conserva contactos, campañas, socios, balances, reset, configuración e invitados. No hace falta borrar el proyecto de Vercel ni crear otro cluster.

## Archivos que hay que actualizar

Copiá el contenido del ZIP dentro de la carpeta de tu repositorio donde está package.json. Reemplazá los archivos coincidentes de:

- **server/**: backend completo, con las nuevas rutas de acceso y exportación del balance.
- **src/**: main.jsx, styles.css y ProductionPanel.jsx.
- **tests/**: pruebas actualizadas.
- **package.json** y **package-lock.json**: versión 3.5.1, sin nuevas dependencias de producción.
- **ACTUALIZAR-3.5.1.md**: esta guía.

No cambian api/, vercel.json, scripts/, public/, index.html ni las variables de entorno. Conservá .env.local. Si agregaste cambios propios al frontend después de la 3.5.0, comparalos antes de reemplazar main.jsx y styles.css. El ZIP contiene los módulos de la 3.5.0 más esta corrección, no los archivos personales que solo existen en tu Mac.

Los cambios concretos respecto de 3.5.0 son:

| Archivo | Cambio |
| --- | --- |
| server/_lib/access-categories.js | Categorías de acceso y valor General para registros anteriores |
| server/admin/access-category/[id].js | Edición de acceso con auditoría |
| server/rsvp.js | Nuevas solicitudes con acceso General |
| server/admin/guests.js | Incluye la categoría en los datos del panel |
| server/admin/export-pdf.js | Exportación independiente por categoría |
| server/_lib/guest-pdf.js | Títulos, totales y listas por acceso; conserva detalle de género |
| server/_lib/balance-pdf.js | Documento del balance actual y previsto, con movimientos y socios |
| server/admin/export-balance-pdf.js | Descarga del balance actual o archivado |
| server/router.js | Rutas nuevas dentro de la misma función de Vercel |
| src/main.jsx | Selectores, filtro, totales y cuatro botones de PDF de invitados |
| src/styles.css | Distribución de las nuevas columnas y totales |
| src/ProductionPanel.jsx | Botón de descarga de balance |
| tests/router.test.mjs, tests/access-categories.test.mjs, tests/integration.test.mjs | Verificación de rutas, categorías y exportaciones |
| package.json, package-lock.json | Número de versión |

## Aplicar y subir

Primero actualizá tu copia local antes de copiar el ZIP:

```bash
git status
git pull --no-rebase origin main
```

Si hay un merge pendiente o conflictos, resolvelos antes de continuar. Si tenés cambios sin guardar, guardalos en un commit antes del pull. Si main ya está actualizado, el pull no cambia nada.

Después copiá los archivos del ZIP en el proyecto y ejecutá:

```bash
npm ci
npm test
npm run build
```

Una vez que esas verificaciones terminen correctamente:

```bash
git add server src tests package.json package-lock.json ACTUALIZAR-3.5.1.md
git diff --cached --stat
git commit -m "Agrega listas por acceso y PDF de balance"
git push origin main
```

Vercel creará el nuevo deployment manteniendo el anterior disponible durante el build. Esperá a que indique Ready y recargá /admin. No hay variables nuevas: conservá las de MongoDB, administrador, APP_URL y correo que ya configuraste para la 3.5.0. .env.example sigue siendo un ejemplo, no una configuración que Vercel lea automáticamente.

## Clasificar y descargar invitados

En **Invitados**, cada fila tiene dos selectores independientes:

- **Acceso:** General, General Difusión, VIP o Backstage.
- **Género:** hombre, mujer o sin especificar.

Las solicitudes nuevas quedan en General. Las personas no pueden elegirse VIP o Backstage desde el formulario público. Los invitados anteriores sin categoría se muestran como General, sin alterar su asistencia, aprobación o género. No hace falta una migración manual de MongoDB.

Elegí la categoría de cada invitado desde el selector de Acceso. Se guarda inmediatamente y queda registrada en Historial. Podés filtrar por acceso y consultar sus totales. La categoría también se ve en Control de ingreso, junto al nombre y email de los confirmados.

Botones disponibles:

- **PDF LISTA GENERAL** → lista-general.pdf
- **PDF LISTA GENERAL DIFUSIÓN** → lista-difusion.pdf
- **PDF LISTA VIP** → lista-vip.pdf
- **PDF LISTA BACKSTAGE** → lista-backstage.pdf
- **PDF COMPLETO** → todas las categorías, agrupadas por acceso.

Cada archivo lleva el nombre y la fecha del evento, sus totales por estado, el detalle de hombre/mujer y los casilleros de control de ingreso. Incluye todas las solicitudes de esa categoría con su estado visible: pendiente o rechazado no significa autorizado a ingresar. El estado de aprobación sigue gestionándose por separado. Los filtros de búsqueda del panel no recortan el archivo: cada botón descarga la categoría completa.

El reset conserva la categoría en el archivo histórico de invitados. Si esa persona se anota para la nueva fiesta, su nueva solicitud empieza en General.

## Descargar balance

En **Balance**, elegí la fiesta actual o un balance archivado y presioná **DESCARGAR BALANCE PDF**.

El documento muestra:

1. Nombre y referencia de fecha de la fiesta, fecha de generación, moneda ARS y estado en curso/cerrado.
2. **Resultado actual:** ingresos cobrados menos egresos pagados; se identifica como positivo, negativo o en cero.
3. Ingresos y egresos pendientes, por separado.
4. **Resultado previsto:** resultado actual más ingresos pendientes menos egresos pendientes.
5. Entradas vendidas y cobradas.
6. Totales por categoría, pagos/cobros por socio y detalle de cada movimiento.

Ejemplo: si se cobraron $35.000 y se pagaron $50.000, el resultado actual es **negativo: -$15.000**. Si además quedan $20.000 por cobrar y nada por pagar, el resultado previsto es **$5.000**. El documento separa ambos resultados para no tratar dinero pendiente como dinero disponible.

Los registros anulados no suman en el documento. Un gasto se registra una sola vez: los aportes y reintegros entre socios no se suman como ventas o gastos nuevos. Para actualizar el documento, registrá los movimientos o marcá los pendientes como pagados/cobrados y descargalo otra vez.

## Verificaciones realizadas

Build de producción y pruebas de rutas, autorizaciones y PDF aprobados. Se verificaron clasificación, selección de destinatarios de cada lista, importes del balance y balances archivados con un replica set de MongoDB aislado. En navegador se probó el cambio de categoría, la descarga VIP y la descarga del balance, manteniendo los flujos anteriores.

`npm test` omite el test de integración si no existe MONGODB_TEST_URI; no necesita ni modifica tu base real. El backend mantiene una sola función en api/index.js.
