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

## Corrección de lista negra

- Se corrigió el separador de líneas de la lista negra global en el panel. Antes, el patrón podía tratar las letras `r` y `n` como separadores y partir dominios válidos.
- Ahora acepta dominios completos separados por saltos de línea, comas o punto y coma, por ejemplo `gemini.google.com`.
- No se ha añadido Gemini como excepción automática: en modo **Lista blanca**, el administrador debe incluir `gemini.google.com` en la lista blanca para permitirlo. La lista negra global sigue teniendo prioridad y lo bloqueará si también aparece allí.

## Versión 2.0.8 — identidad visual renovada

- Rediseño del logotipo Focus Guard: escudo azul con candado y libro abierto, acabado limpio y mejor contraste en tamaños pequeños.
- Se mantiene un único recurso de marca para popup, página de bloqueo, favicon y panel de administración.
- Se actualiza la versión del manifiesto a 2.0.8.

## Versión 2.0.9 — logo del panel de administración

- Se actualiza `admin/assets/focus-guard-icon.svg` con el mismo diseño renovado que utiliza la extensión.
- El favicon y las imágenes de marca del panel ahora apuntan al recurso actualizado de su propia carpeta `admin/assets`.
- Se incrementa la versión del manifiesto para registrar este ajuste.

## Versión 2.1.0 — actualización de los logotipos completos

- Se rediseñan `assets/focus-guard-logo.svg` y `admin/assets/focus-guard-logo.svg` para incorporar el nuevo escudo azul con candado y libro abierto.
- Se conserva el nombre Focus Guard y el lema de navegación segura, con una composición horizontal adaptada a los encabezados y espacios de marca.
- Se incrementa la versión del manifiesto a 2.1.0.

## Versión 2.1.1 — corrección de composición del logotipo

- Se elimina el contenido SVG duplicado que provocaba que el icono apareciese enorme detrás del logotipo horizontal.
- Se mantiene una única instancia del escudo, correctamente escalada y alineada junto al nombre y el lema.
- Se corrigen los dos recursos: `assets/focus-guard-logo.svg` y `admin/assets/focus-guard-logo.svg`.
- Se actualiza el manifiesto a 2.1.1.


## Versión 2.1.2 — retirada del registro de auditoría

- Se elimina del panel la sección de auditoría, su acceso de navegación y el contador de eventos.
- Se retiran las consultas y escrituras de eventos desde el panel para que las operaciones habituales no generen registros de auditoría.
- Se elimina de `firestore.rules` el acceso a la colección `audit`.
- Se actualizan los README para reflejar que el panel ya no ofrece auditoría.
- Se actualiza el manifiesto a 2.1.2.

**Nota:** los documentos de auditoría que ya existan en Firestore no se borran automáticamente; esta actualización elimina su uso desde el panel y sus permisos definidos en estas reglas.


## Versión 2.2.0 — rol owner y caducidad de acceso

- Se incorpora el rol `owner`, con capacidad de asignar `admin`, `operator` o `viewer` a otras cuentas existentes, sin poder asignar ni modificar cuentas `owner`.
- El owner puede establecer una fecha y hora de caducidad para el acceso de cada usuario gestionado, o dejarlo sin límite.
- El panel cierra la sesión al alcanzar la fecha de caducidad y Firestore deniega el acceso a los datos del panel a cuentas caducadas.
- El resumen muestra el tiempo restante y un botón que explica su significado.
- Se amplían las reglas de Firestore para proteger la gestión de roles y fechas de caducidad.
- Las cuentas existentes no se convierten automáticamente en owner: el primer owner debe configurarse de forma segura en Firebase Console.


## Versión 2.2.1 — restricción de eliminación para owner

- Se retira al rol `owner` cualquier permiso para eliminar dispositivos, perfiles de política o documentos de configuración.
- Las reglas de Firestore reservan esas operaciones de borrado al rol `admin`; la colección `users` continúa sin permitir eliminaciones.
- La interfaz ya no muestra acciones de eliminación al owner; se mantiene la capacidad de gestión de usuarios y caducidades.
- Se actualiza la versión del manifiesto a 2.2.1.

**Nota:** para que la restricción se aplique en Firebase, hay que publicar la versión actualizada de `firestore.rules` en Firebase Console.


## Versión 2.2.2 — permisos completos de admin para owner

- El rol `owner` tiene todas las funciones de `admin`, incluidos los permisos para eliminar dispositivos, perfiles de políticas y configuraciones.
- Conserva además la gestión de roles y caducidades de usuarios.
- No puede asignar el rol `owner` a otras cuentas.

**Comprobación funcional (confirmada por el usuario):** se ha probado que el bloqueo offline actúa al apagar el Wi-Fi, que el rol `owner` dispone de todas las funciones previstas y que el botón **Sincronizar** funciona correctamente. El usuario confirma que todo funciona bien en sus pruebas.


## Versión 2.2.3 — iconos PNG compatibles con Chrome

- Se añaden versiones PNG del icono Focus Guard en `assets/focus-guard-icon.png` y `admin/assets/focus-guard-icon.png`.
- El manifiesto MV3 utiliza PNG para `icons` y `action.default_icon`, evitando SVG en los iconos de la extensión, que Chrome no admite como formato de icono del manifiesto.
- Se actualizan los favicon y las imágenes del popup, la pantalla de bloqueo y el panel para utilizar el PNG.
- Los SVG originales se conservan como recursos vectoriales de la marca.
- Se incrementa el manifiesto a `2.2.3`.


## Versión 2.2.4 — conversión fiel del icono a PNG

- Se regeneran `assets/focus-guard-icon.png` y `admin/assets/focus-guard-icon.png` convirtiendo directamente el SVG original `focus-guard-icon.svg` con sus colores, formas, proporciones, degradados y sombras.
- Los dos PNG ahora contienen el mismo diseño vectorial original; se elimina la imagen provisional distinta.
- Se mantiene el formato PNG requerido por los iconos del manifiesto de Chrome.
- Se actualiza `manifest.json` a `2.2.4`.



## Versión 2.2.5 — historial de navegación y protección de iframes

### Historial de URLs
- Se añade al panel el botón **Últimas 30 URLs** para cada dispositivo, manteniendo el botón **Ver URL** y las demás acciones existentes.
- La extensión registra las últimas 30 direcciones HTTP/HTTPS de navegación principal por perfil de Chrome, con fecha y hora.
- El historial se conserva en el documento del dispositivo en Firestore y se consulta desde el panel.
- Se amplían los permisos de la extensión con `webNavigation` para detectar cambios de dirección.

### Protección de iframes y entrada de sitios
- Se bloquean los iframes que reciben HTML directamente mediante `srcdoc`, `data:text/html` o marcado HTML introducido como origen.
- Los iframes que apuntan a una URL HTTP/HTTPS siguen sujetos a la política existente: los dominios permitidos pueden cargar y los no permitidos se bloquean mediante DNR.
- El popup rechaza código HTML pegado en la lista de sitios y solicita un dominio válido.

### Archivos modificados
- `service-worker.js`, `manifest.json`, `iframe-guard.js`, `firestore.rules`, `admin/index.html`, `admin/admin.js`, `admin/admin.css`, `popup.js`.

**Privacidad:** el historial guarda URLs completas, que pueden incluir rutas o parámetros de página. Debe informarse a los usuarios de los dispositivos y limitarse el acceso al panel a personal autorizado.

**Pendiente de despliegue y prueba:** publicar las reglas actualizadas de Firestore, recargar la extensión para aceptar el permiso `webNavigation`, y comprobar en un Chromebook que el historial se registra, se limita a 30 entradas y aparece en el panel. También deben probarse los casos de iframe con URL permitida, URL no permitida y HTML insertado.


## Versión 2.2.6 — política individual por dispositivo

- Se añade el botón **Política** en cada dispositivo del inventario.
- Permite configurar Libertad total, Bloqueo total, Lista blanca o Heredar la política del grupo/global.
- La política individual tiene prioridad sobre la política del aula/grupo y la global.
- La política de seguridad por falta de conexión continúa teniendo prioridad sobre las políticas remotas.
- Los campos de política individual solo pueden ser modificados por usuarios autorizados del panel; las extensiones de los dispositivos no pueden cambiarlos.
- La política se descarga en la sincronización periódica de la extensión.

**Pendiente de despliegue y prueba:** publicar las reglas Firestore actualizadas, esperar a Render, y comprobar en equipos reales los cuatro modos y la prioridad sobre las políticas de grupo y global.


## Versión 3.0.0 — nueva etapa de Focus Guard

Se agrupan bajo una versión principal las funciones incorporadas en las últimas actualizaciones:

- Historial de las últimas 30 URLs por dispositivo, visible desde el panel.
- Protección frente a HTML insertado directamente en iframes.
- Políticas individuales por dispositivo con prioridad sobre las políticas de grupo y global.
- Modos de política individual: Heredar, Libertad total, Bloqueo total y Lista blanca.
- Se mantiene el bloqueo de seguridad cuando no hay conexión.

El manifiesto de Chrome se actualiza a **3.0.0**.

**Despliegue:** publicar las reglas actuales de Firestore, recargar la extensión y comprobar las funciones en dispositivos reales. El cambio de numeración no sustituye estas tareas de despliegue y validación.


## Versión 3.1.0 — panel multi-colegio y roles por centro

- Se reconstruye la navegación del panel: inicio de sesión → colegios asignados → clases del colegio → dispositivos de la clase.
- Los usuarios sin colegios asignados reciben un mensaje explicativo.
- Owner y administrador general disponen de **Gestión** para crear, modificar y eliminar colegios, administrar clases y crear cuentas.
- Se incorporan los roles globales `owner` y `general_admin`. El owner puede crear administradores generales; el administrador general no puede crear ni modificar owners ni otros administradores generales.
- Los roles `admin`, `operator` y `viewer` se asignan individualmente dentro de cada colegio. Una misma cuenta puede tener roles distintos en varios colegios.
- Se añaden documentos `schools/{schoolId}`, clases en `schools/{schoolId}/classes` y asignaciones en `users/{uid}/schoolRoles/{schoolId}`.
- Las políticas de navegación pasan a estar separadas por colegio, con excepciones por clase, lista negra del colegio y prioridad de política individual por dispositivo.
- Se conserva la consulta de URL actual, el historial de 30 URLs, el bloqueo/desbloqueo del perfil y la política individual del dispositivo.
- Se añade una sección para asignar los dispositivos existentes que todavía no pertenecen a un colegio.
- Se mantienen los perfiles documentales de política, ahora separados por colegio.
- Se amplían las reglas Firestore para comprobar los permisos por colegio y para que los dispositivos anónimos solo lean la política del colegio al que están asignados.

### Archivos principales
- `admin/index.html`, `admin/admin.js`, `admin/admin.css`: nueva interfaz y gestión multi-colegio.
- `firestore.rules`: permisos globales, asignaciones por colegio, clases, dispositivos y políticas.
- `service-worker.js`: sincronización de políticas por colegio y clase.
- `manifest.json`: versión `3.1.0`.

**Migración y despliegue necesarios:** publicar las nuevas reglas de Firestore. Crear los colegios y clases desde Gestión y asignar a cada usuario sus roles por colegio. Los dispositivos antiguos aparecen en **Dispositivos sin asignar** para incorporarlos a una clase. Las cuentas existentes con `role: admin/operator/viewer` no reciben automáticamente un colegio: deben asignarse a uno desde Gestión (o mediante Firebase Console si su documento no tiene correo electrónico). El owner existente con `role: owner` se reconoce como owner sin cambiar su documento.

**Pendiente de prueba:** no se ha ejecutado la aplicación contra Firebase ni se ha probado la sincronización en Chromebooks reales. Antes de usar datos reales, probar el acceso de cada rol, la creación de colegios/cuentas, las asignaciones, la caducidad, las políticas y la migración de dispositivos.


## Versión 4.0.0 — nueva versión principal del panel multi-colegio

- Se establece `4.0.0` como nueva versión de Focus Guard.
- Se conserva la arquitectura multi-colegio introducida en 3.1.0: navegación por colegios, clases y dispositivos, y roles locales por colegio.
- Se conservan los roles globales de owner y administrador general, con sus restricciones de asignación.
- Se mantienen las políticas de navegación por colegio, clase y dispositivo, el historial de URLs y las funciones de gestión existentes.

**Nota:** este cambio actualiza el número de versión; no incorpora por sí mismo nuevas funciones ni implica que se hayan completado pruebas en Firebase o Chromebooks.


## Versión 4.0.1 — formulario integrado para políticas individuales

- Se sustituye la edición de la política individual mediante cuadros `prompt()` del navegador por un formulario dentro del panel Focus Guard.
- El formulario permite seleccionar Heredar, Libertad total, Bloqueo total o Lista blanca.
- El campo de dominios permitidos aparece únicamente al seleccionar Lista blanca e incluye validación y límite de 50 dominios.
- Se mantienen la prioridad de la política individual y el guardado en el documento del dispositivo en Firestore.
- Se actualiza `manifest.json` a `4.0.1`.

**Pendiente de prueba:** comprobar en el panel desplegado los cuatro modos, la validación de dominios y el guardado/lectura en Firestore. No se ha probado en un navegador real ni en Chromebooks.


## Versión 4.0.2 — edición de cuentas existentes

- Se añade el botón **Editar** a cada cuenta gestionada, excluyendo las cuentas owner.
- Se pueden modificar la caducidad y el rol asignado al colegio seleccionado sin crear una cuenta Auth duplicada.
- Se conservan las asignaciones a otros colegios al editar un rol local.
- El owner puede cambiar el ámbito de una cuenta a administrador general o volver a convertir un administrador general en usuario de colegio; al convertir a administrador general se eliminan sus asignaciones locales.
- Los administradores generales pueden editar cuentas de colegio, pero no otros administradores generales ni owners.
- El correo queda bloqueado durante la edición para evitar desincronizar el correo del perfil Firestore con Firebase Authentication. El cambio de contraseña no se ofrece en este formulario.
- Se actualiza el manifiesto a `4.0.2`.

**Pendiente de prueba:** validar edición de roles, caducidad y cambio de ámbito con cuentas de prueba y reglas Firestore publicadas. No se ha probado en Firebase ni en Chromebooks reales.


## Versión 4.0.3 — retirar acceso a un colegio

- En **Gestión → Cuentas y asignaciones** se añade la acción **Quitar colegio** para retirar una asignación escolar concreta de una cuenta.
- La operación elimina únicamente el documento `users/{uid}/schoolRoles/{schoolId}`; no elimina la cuenta de usuario, el colegio, las clases ni los dispositivos.
- Se mantienen las protecciones para no modificar cuentas owner.
- Se actualiza el manifiesto a `4.0.3`.

**Pendiente de prueba:** comprobar con cuentas de prueba que el acceso desaparece solo en el colegio elegido y que el usuario conserva el acceso a sus otros colegios. No se ha probado contra Firebase ni en Chromebooks reales.


## Versión 4.0.4 — desactivar y retirar usuarios administradores

- Se añade **Eliminar usuario** en Gestión → Cuentas y asignaciones para revocar el acceso de una cuenta al panel y a todos sus colegios.
- La operación elimina sus asignaciones de `schoolRoles`, marca el perfil como inactivo y establece su caducidad en el pasado. El documento `users/{uid}` se conserva, de acuerdo con la política de no borrar documentos de usuario.
- Las reglas de Firestore y la validación de inicio de sesión rechazan cuentas inactivas. El formulario de edición permite reactivar una cuenta al guardar cambios.
- Los administradores generales pueden eliminar cuentas de colegio; solo el owner puede eliminar administradores generales. Las cuentas owner están protegidas.
- No se elimina el usuario de Firebase Authentication, ni ningún colegio, clase o dispositivo; el acceso al panel queda revocado.

**Pendiente de prueba:** validar la desactivación, el rechazo de inicio de sesión, la reactivación y las restricciones de rol con Firebase real y reglas publicadas. No se ha probado en Firebase ni en Chromebooks reales.


## Versión 4.0.5 — permisos de política y política de grupo contextual

- El rol `operator` ya no puede cambiar la política global del colegio ni sus listas blanca/negra; la interfaz lo deja en solo lectura y Firestore exige rol `admin` o superior para modificar esos campos.
- Los operadores conservan la capacidad de gestionar la política de su grupo/clase. Las reglas de Firestore limitan sus escrituras a los campos `groups`, `updatedAt` y `updatedBy`, impidiendo que alteren la política global aunque manipulen el cliente.
- La configuración de política por grupo se mueve desde la pantalla del colegio a la pantalla de dispositivos de la clase seleccionada. Se configura directamente el grupo que se está consultando, sin selector de clase.
- Se actualiza el manifiesto a `4.0.5`.

**Pendiente de prueba:** publicar las reglas actualizadas y probar con cuentas `operator` y `admin` que la política global no se puede guardar como operador y que la política del grupo sí se guarda desde la pantalla de sus dispositivos. No se ha probado contra Firebase ni en Chromebooks reales.


## Versión 4.0.6 — registro inicial por alumno, colegio y clase

- El popup solicita el nombre del alumno, el colegio y una clase del colegio seleccionado.
- El desplegable de clases se carga según el colegio elegido; no se permite guardar sin completar los tres datos.
- El nombre del alumno se guarda como responsable del dispositivo y el grupo seleccionado determina la clase y la política de navegación correspondiente.
- Al guardar, el perfil queda bloqueado en Firestore. El alumno no puede cambiar nombre, colegio ni clase desde el popup; el personal autorizado puede desbloquearlo desde el panel.
- Se permite a la sesión anónima de la extensión consultar únicamente los documentos de colegios y clases para mostrar las opciones del registro; no obtiene permisos de escritura sobre esos datos.
- Se actualiza el manifiesto a 4.0.6.

**Pendiente de despliegue y prueba:** publicar las reglas Firestore actualizadas y recargar la extensión. Comprobar el registro, el filtrado de clases por colegio, la asignación del dispositivo, el bloqueo y el desbloqueo desde el panel. No se ha probado contra Firebase ni en Chromebooks reales.


## Versión 4.0.7 — permitir sincronización de perfiles aún no bloqueados

- Se corrige la regla de actualización del documento propio del dispositivo: una sesión anónima puede sincronizar mientras el perfil siga desbloqueado, tanto antes como durante el registro inicial.
- Cuando el perfil ya está bloqueado, se mantienen las comprobaciones que impiden cambiar el nombre del alumno, el colegio o la clase.
- Se actualiza el manifiesto a `4.0.7`.

**Pendiente de despliegue y prueba:** publicar las reglas Firestore, recargar la extensión y comprobar la sincronización de un dispositivo existente y el registro inicial. No se ha probado contra Firebase ni en Chromebooks reales.
