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

## Versión 2.0.4

### Mejoras en la pantalla de bloqueo
- Se ha añadido una sección informativa con los motivos habituales por los que una página puede quedar bloqueada.
- Se explican la lista negra global, el bloqueo total, la lista permitida, las políticas del aula/grupo y el bloqueo de seguridad por problemas de conexión o sincronización.
- Se aclara que son causas posibles y que la pantalla no siempre puede determinar cuál ha provocado el bloqueo concreto.
- Se mantiene la opción para volver a la página anterior.

### Archivos modificados
- `blocked.html`: diseño y contenido explicativo de los posibles motivos del bloqueo.
- `manifest.json`: actualización de la versión a `2.0.4`.

## Estado y notas pendientes

- La versión indicada en el manifiesto es **2.0.4**.
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

## Versión 2.0.5

### URL actual de cada dispositivo
- El service worker consulta la pestaña activa del navegador y guarda su URL HTTP/HTTPS completa (incluidos ruta y parámetros) en el campo `currentUrl` del documento del dispositivo.
- El dato se actualiza junto con el heartbeat de cada minuto.
- En el inventario del panel se incorpora el botón **Ver URL** para consultar la dirección exacta y abrirla en una pestaña nueva.
- El panel vuelve a consultar el inventario cada minuto para mostrar los cambios sin tener que recargar la página.
- Si no hay una pestaña web activa o el equipo aún no ha sincronizado este campo, el panel lo indica.

### Archivos modificados
- `service-worker.js`: captura y sincronización de la URL activa.
- `firestore.rules`: permite al dispositivo guardar su propia URL, con un máximo de 2048 caracteres.
- `admin/admin.js`: botón de consulta, ventana de detalle y actualización periódica del inventario.
- `admin/index.html` y `admin/admin.css`: interfaz para mostrar la dirección.
- `manifest.json`: versión `2.0.5`.

**Privacidad y alcance:** la URL se guarda completa, por lo que puede incluir rutas, términos de búsqueda o parámetros de una página. Debe informarse de esta supervisión a los usuarios de los dispositivos conforme a las normas del centro. Solo se captura la pestaña activa en la ventana enfocada; no se recopilan las URL de todas las pestañas.

**Pendiente de verificación:** publicar las nuevas reglas de `firestore.rules` en Firebase Console, actualizar la extensión a 2.0.5 y comprobar en un Chromebook real que la URL se actualiza en Firestore y aparece en el panel aproximadamente cada minuto. Esta función todavía no se considera probada en dispositivos reales.

## Versión 2.0.6

### Icono de la extensión
- Se configura el recurso gráfico de Focus Guard como icono general de la extensión y como icono de la acción del navegador, en lugar del icono genérico con inicial.
- Se utilizan las variantes de tamaño declaradas en el manifiesto y el recurso existente `assets/focus-guard-icon.svg`.

### Archivos modificados
- `manifest.json`: campos `icons` y `action.default_icon`; versión `2.0.6`.

**Pendiente de verificación:** recargar/actualizar la extensión en Chrome y comprobar el icono de la barra de herramientas. Si Chrome no acepta SVG como icono del manifiesto en el entorno utilizado, habrá que añadir versiones PNG del mismo logo.


## Documentación — actualización de los dos README

- Se ha reescrito `README.md` para describir las funciones actuales de la extensión 2.0.6: modos globales, lista negra, políticas por aula/grupo, sincronización, página de bloqueo, consulta de URL y límites operativos.
- Se ha actualizado `admin/README.md` con pasos actuales de configuración de Firebase, publicación de reglas, registro de perfiles, control web, consulta de URL, roles, privacidad y despliegue del panel.
- Se han corregido indicaciones antiguas sobre la frecuencia de sincronización y la disponibilidad de políticas por grupo.
- Se han aclarado las limitaciones de supervisión de URL, funcionamiento offline y administración de Chrome.
- No cambia el número de versión de la extensión: sigue siendo `2.0.6`.


## Versión 2.0.7

### Bloqueo de los datos iniciales del perfil
- Después de pulsar **Guardar y sincronizar** con nombre y aula/grupo, la extensión guarda el indicador `profileLocked` en Firestore y bloquea esos campos y el botón de guardado del popup.
- El bloqueo persiste al cerrar y volver a abrir el popup y se aplica también desde las reglas de Firestore: el cliente anónimo no puede cambiar nombre/aula mientras el perfil siga bloqueado.
- El panel muestra el estado de los datos del perfil y permite a usuarios con rol `admin` u `operator` bloquearlos o desbloquearlos.
- Tras desbloquear desde el panel, el popup recupera el permiso en la siguiente sincronización. Al guardar de nuevo, los datos vuelven a quedar bloqueados.
- Los heartbeats periódicos conservan el bloqueo actual y no vuelven a bloquear automáticamente un perfil que el centro haya desbloqueado.

- El popup exige que el nombre y el aula/grupo estén completos antes de guardar y bloquear el perfil.

### Archivos modificados
- `popup.html` y `popup.js`: aviso, validación y controles bloqueados cuando el perfil está bloqueado.
- `service-worker.js`: sincronización del indicador de bloqueo y protección de los valores almacenados en Firestore.
- `admin/index.html` y `admin/admin.js`: estado visible y control de bloqueo/desbloqueo desde el panel.
- `firestore.rules`: impide al cliente anónimo quitar el bloqueo o cambiar los datos protegidos; permite cambios desde roles autorizados.
- `manifest.json`: versión `2.0.7`.

**Pendiente de despliegue y prueba:** publicar las nuevas reglas Firestore en Firebase Console y actualizar la extensión. Comprobar el primer registro, el bloqueo al reabrir el popup, el desbloqueo desde el panel, la edición y el nuevo bloqueo después de guardar. No se ha probado en un Chromebook real.
