# Historial de versiones — Focus Guard

Este documento recoge la evolución conocida del proyecto desde sus primeras etapas. Se irá actualizando junto con cada cambio funcional o técnico que se solicite para la extensión o su panel.

> **Nota sobre el historial inicial:** no dispongo aquí de un registro verificable de todos los cambios del primer día ni de sus fechas. Por eso, las primeras etapas se describen por funcionalidades y no se les asignan números de versión, fechas o commits inventados. El historial detallado comienza con los hitos que se han podido reconstruir.

## Primeras etapas — creación del proyecto (antes de 2.0.2)

- Inicio de Focus Guard como extensión de Chrome basada en Manifest V3.
- Desarrollo de los componentes principales: manifiesto, service worker, popup y página de bloqueo.
- Incorporación de Firebase Authentication y Firestore para gestionar dispositivos y políticas.
- Creación del panel web de administración y preparación de su publicación independiente.
- Incorporación de roles de administración: `admin`, `operator` y `viewer`.
- Desarrollo del inventario de dispositivos, con datos como nombre, aula/grupo, responsable, plataforma, estado y última comunicación.
- Incorporación de políticas globales: libertad (`free`), bloqueo total (`block_all`) y lista permitida (`whitelist`).
- Incorporación de políticas por aula/grupo mediante `settings/groupPolicies`, vinculadas al grupo indicado en `deviceRoom`.
- Incorporación de auditoría y exportación CSV en el panel.
- Configuración de sincronización periódica y aplicación de políticas a las pestañas abiertas.

## Versión 2.0.2

Versión anterior a la actualización 2.0.3.

- Base funcional de la extensión y del panel de administración.
- Sincronización de dispositivos y políticas con Firebase.
- Aplicación de políticas globales y por grupo.
- Página de bloqueo personalizada.
- Publicación del panel en Render: https://extension-2-85.onrender.com/

## Versión 2.0.3

Actualización que reúne mejoras de aplicación de políticas y nuevas opciones de bloqueo.

### Detección y bloqueo de navegación
- Ampliación de las reglas de Declarative Net Request (DNR) para cubrir navegación principal (`main_frame`) y subdocumentos/iframes (`sub_frame`).
- Las reglas permiten aplicar las políticas también a los dominios cargados dentro de iframes.
- La aplicación a iframes depende del dominio real solicitado por el iframe y de las reglas activas.

### Bloqueo cuando no se puede sincronizar
- Incorporación de `offlineLock` para activar un bloqueo de navegación cuando fallan las comprobaciones de conectividad o sincronización.
- La navegación se redirige a `blocked.html` con prioridad alta mientras el bloqueo offline está activo.
- La sincronización correcta del dispositivo y de la política permite retirar el bloqueo offline.
- Se refuerza la aplicación de políticas a pestañas que ya estaban abiertas.

**Limitación conocida:** la detección de desconexión depende de comprobaciones como `navigator.onLine` y las solicitudes de red/heartbeat. No es necesariamente instantánea. Un fallo de Firebase también puede activar el bloqueo aunque el acceso general a Internet siga disponible. Los iframes que ya estaban cargados no tienen por qué desaparecer inmediatamente.

### Lista negra global
- Incorporación de una lista negra de dominios que se aplica en todos los modos de política, incluido `free`.
- Las reglas DNR de la lista negra tienen prioridad sobre las reglas de autorización de la lista permitida.
- Se contempla la navegación principal y la carga de subdocumentos/iframes.
- El panel permite editar la lista negra global.
- Validación de dominios y límite de 50 entradas.
- La lista negra global se sincroniza también con las políticas por grupo para mantener su carácter global.

### Archivos principales modificados para estos cambios
- `service-worker.js`: aplicación de reglas, sincronización de lista negra y bloqueo offline.
- `admin/index.html`: campo de edición de la lista negra global.
- `admin/admin.js`: carga, validación y guardado de la lista negra.
- `firestore.rules`: autorización y validación del campo `blacklist` en `settings/globalPolicy`.
- `manifest.json`: actualización del número de versión a `2.0.3`.

### Referencias de commits conocidos
- `74407032f471467ab538b14e739c7204864cbe52`: primera incorporación de la lista negra en el service worker.
- `334056a2023c7d0ab73254bfd5443276698a5d71`: corrección posterior del service worker.
- `816ca1c4f16d5cdd19ce953510949c34a3f3b3d6`: campo de lista negra en el panel.
- `8bcb22ecb5d1400b9f17059116bbbc41ef559b2a`: carga, validación y guardado desde el panel.
- `f85999fddec06358295fc0f44be6713521386088`: corrección de las reglas de Firestore.
- `03ebda01b16c85d79c3a50a6c5d2db8fc69b7f18`: actualización de versión en `manifest.json` a `2.0.3`.

## Estado y notas pendientes

- La versión indicada en el manifiesto es **2.0.3**.
- La publicación de las reglas corregidas de Firestore debe confirmarse en Firebase Console; el último paso documentado fue pedir que se volviesen a cargar y publicar.
- Las funciones nuevas de iframes y bloqueo offline no deben considerarse verificadas en Chromebook hasta realizar una prueba real allí.
- Las políticas por grupo requieren que el valor de `deviceRoom` coincida exactamente con el nombre del grupo configurado en el panel.
- Una extensión de Chrome normal no puede interceptar páginas internas como `chrome://extensions` ni impedir por sí sola que el usuario la desinstale. Para instalación forzada y control de desinstalación se necesita gestión de Chrome mediante Google Admin Console / Chrome Enterprise o Education.

---

## Cómo se actualizará este documento

Cada vez que se realice un cambio solicitado en el proyecto:
1. Se añadirá una entrada bajo la versión correspondiente o se documentará una nueva versión si cambia el número del manifiesto.
2. Se indicarán las funciones añadidas, modificadas o corregidas.
3. Se anotarán los archivos afectados y, cuando estén disponibles, los commits.
4. Se distinguirán las funciones implementadas de las que todavía no se han probado en los dispositivos reales.
