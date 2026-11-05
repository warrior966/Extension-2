# Focus Guard · Panel de administración

Panel web para gestionar perfiles de Chrome, políticas de navegación mediante Firebase Authentication y Cloud Firestore. La extensión Chrome se registra mediante autenticación anónima; el personal del centro accede al panel con cuentas autorizadas.

## Configuración inicial de Firebase

1. Abre Firebase Console y selecciona el proyecto `fidelazion`.
2. En **Authentication → Sign-in method**, habilita **Email/Password** para el personal que utilizará el panel.
3. Habilita también **Anonymous** para que cada perfil de Chrome pueda registrarse sin pedir una cuenta personal al usuario.
4. Crea o selecciona la base de datos en **Firestore Database**.
5. Publica las reglas del archivo raíz `firestore.rules`. Desde la raíz del repositorio, con Firebase CLI instalado y autenticado, puedes ejecutar:

   ```bash
   firebase deploy --only firestore:rules --project fidelazion
   ```

   Como alternativa, copia el contenido de `firestore.rules` en **Firestore → Rules** y pulsa **Publish**. Publicar el archivo en GitHub no publica las reglas en Firebase.
6. En Authentication, crea una cuenta para el owner inicial.
7. Copia el UID de esa cuenta. En Firestore crea un documento `users/{UID}` con `{ "globalRole": "owner" }`. El owner inicial es la cuenta raíz de gestión; no asignes `owner` a ninguna otra cuenta. Si ya existe un owner antiguo con `role: "owner"`, el panel lo reconoce.
8. Publica la carpeta `admin/` mediante HTTP/HTTPS. No abras el panel mediante `file://`.

## Instalar y registrar la extensión

1. Descarga el repositorio como ZIP y descomprímelo.
2. En el Chromebook, abre `chrome://extensions` y activa **Modo de desarrollador**.
3. Pulsa **Cargar descomprimida** y selecciona la carpeta del proyecto que contiene `manifest.json`.
4. Abre Focus Guard, introduce el nombre del perfil y el aula/grupo y pulsa **Guardar y sincronizar**.
5. En el panel, revisa el registro del dispositivo. El personal con permisos de operación puede editar el registro y cambiar su estado según el procedimiento del centro.

La extensión utiliza Firebase Anonymous Authentication. El registro corresponde a un perfil de Chrome: dos perfiles separados pueden aparecer como dispositivos distintos aunque estén en el mismo Chromebook. Las personas que compartan un único perfil compartirán también ese registro.

## Inventario y URL actual

El inventario muestra nombre, aula/grupo, responsable, plataforma, estado y última comunicación.

Cada fila dispone del botón **Ver URL**. Muestra la URL HTTP/HTTPS de la pestaña activa comunicada por ese perfil, si existe. La extensión actualiza este dato junto con la sincronización periódica; el panel vuelve a consultar el inventario aproximadamente cada minuto.

**Privacidad:** la dirección se guarda completa y puede contener rutas, términos de búsqueda o parámetros. Solo se recoge la pestaña activa de la última ventana enfocada que la extensión haya podido consultar; no es un historial de navegación ni una captura de todas las pestañas. Informa de esta supervisión a los usuarios conforme a las normas del centro y define una política adecuada de acceso y retención.

## Control web global

En **Control web** puedes seleccionar:

- **Libertad total** (`free`): permite navegar salvo los dominios incluidos en la lista negra global.
- **Bloqueo total** (`block_all`): bloquea la navegación HTTP/HTTPS.
- **Lista blanca** (`whitelist`): permite únicamente los dominios autorizados y sus subdominios.

La lista negra global se aplica independientemente del modo seleccionado. Las listas admiten hasta 50 dominios. Las reglas de navegación incluyen páginas principales e iframes/subdocumentos HTTP/HTTPS.

La política se guarda en `settings/globalPolicy` y se sincroniza con las instalaciones conectadas al proyecto Firebase. Para que el panel pueda guardar y las extensiones puedan leerla, deben estar publicadas las reglas Firestore correspondientes.

## Políticas por aula o grupo

En **Aulas y grupos** puedes configurar políticas específicas para cada grupo. El nombre del grupo debe coincidir exactamente con el campo **Aula / grupo** del dispositivo. Cuando no existe una política específica para ese grupo, se aplica la política global.

La lista negra global conserva su alcance general también al utilizar políticas por grupo. La sincronización depende de que el perfil de Chrome pueda comunicarse con Firebase.

## Página de bloqueo y modo sin conexión

La extensión muestra una página de bloqueo personalizada cuando una regla impide la navegación. La página explica motivos habituales, como bloqueo total, lista blanca, lista negra, política del grupo o bloqueo de seguridad por falta de sincronización; esos motivos son orientativos y no siempre identifican la causa concreta.

Si fallan las solicitudes de red o la sincronización, la extensión puede activar un bloqueo offline hasta que consiga sincronizar de nuevo. La detección no es necesariamente instantánea y un fallo de Firebase puede activar el bloqueo aunque Internet siga funcionando. Las pestañas e iframes que ya estaban cargados pueden requerir una nueva navegación para reflejar algunos cambios.

## Roles del panel

El modelo vigente es multi-colegio. Los roles `admin`, `operator` y `viewer` se guardan en `users/{UID}/schoolRoles/{schoolId}` y pueden variar entre colegios. `owner` y `general_admin` son roles globales guardados en `users/{UID}.globalRole`. Consulta la sección **Panel multi-colegio — versión 3.1.0** al final de este documento para ver todos los permisos y el proceso de migración.

## Identidad y seguridad

- Cada instalación/perfil utiliza Firebase Anonymous Authentication y un UID propio.
- Las reglas Firestore deben permitir que el perfil anónimo escriba únicamente su propio documento `devices/{UID}`; no debe poder leer el inventario global, las políticas ni la auditoría.
- La clave Firebase web del cliente no es una credencial de administrador. No publiques claves de service account ni credenciales Admin SDK en el código cliente.
- Antes de utilizar datos reales, valida las reglas con Firebase Emulator o Rules Playground, comprueba los permisos de cada rol y protege las cuentas del personal.

## Límites operativos

- La sincronización y la señal de actividad se producen aproximadamente cada minuto cuando Chrome permite ejecutar el service worker y hay conexión. No es una garantía de tiempo real.
- La extensión controla navegación web HTTP/HTTPS dentro de Chrome; no controla aplicaciones nativas, otros navegadores ni todo el sistema operativo.
- Una extensión normal no puede impedir su propia desinstalación ni bloquear páginas internas como `chrome://extensions`. Para instalación forzada y control de desinstalación se requiere administración de Chrome mediante Google Admin Console / Chrome Education o Chrome Enterprise.
- La funcionalidad debe probarse en Chromebooks reales antes de considerarse validada para producción.

## Publicación del panel

El panel estático se publica desde esta carpeta `admin/`. En Render, configura `admin` como **Publish Directory**. URL del panel configurado: https://extension-2-85.onrender.com/



### Owner y duración de acceso
El rol `owner` gestiona los roles `admin`, `operator` y `viewer` de documentos `users/` existentes y puede fijar `expiresAt` (fecha y hora) o quitar la caducidad. No puede asignar ni modificar otros owners. Las reglas de Firestore comprueban la caducidad en cada acceso a datos; el panel también cierra la sesión al vencer.


## Panel multi-colegio — versión 3.1.0

### Estructura de datos
- `schools/{schoolId}`: colegio (nombre y localidad).
- `schools/{schoolId}/classes/{classId}`: clases del colegio.
- `users/{uid}/schoolRoles/{schoolId}`: rol `admin`, `operator` o `viewer` de esa cuenta en ese colegio.
- `users/{uid}`: datos de cuenta, caducidad opcional y, para cuentas centrales, `globalRole: "owner"` o `globalRole: "general_admin"`.
- `schools/{schoolId}/settings/navigationPolicy`: política general del colegio, lista negra, lista blanca y excepciones por clase.
- `schools/{schoolId}/policies/{policyId}`: perfiles documentales del colegio.
- Los dispositivos llevan `schoolId` y `classId` además del campo `room`, que conserva el nombre de clase utilizado por la extensión.

### Roles
- **owner**: todos los permisos de administración y gestión central; puede crear administradores generales. No puede crear ni modificar otro owner.
- **general_admin**: acceso a todos los colegios y sus dispositivos, políticas y clases; puede crear usuarios y asignarles `admin`, `operator` o `viewer` por colegio. No puede crear ni modificar owners ni administradores generales.
- **admin**: administración completa dentro de cada colegio asignado, incluidas las eliminaciones.
- **operator**: gestión operativa dentro de cada colegio asignado, sin permisos de eliminación.
- **viewer**: consulta de los datos del colegio asignado, sin cambios.

Una cuenta puede tener un documento `schoolRoles/{schoolId}` distinto para cada colegio. Si no tiene asignaciones, el panel informa de que no hay colegios asociados.

### Migración de la versión anterior
1. Publica el contenido actualizado de `firestore.rules` en el proyecto `fidelazion`. Subirlo a GitHub no lo publica en Firebase.
2. Inicia sesión con el owner existente. El documento antiguo `users/{UID}` con `role: "owner"` se reconoce como owner.
3. En **Gestión**, crea los colegios y sus clases.
4. Crea las cuentas nuevas desde Gestión. Para asignar un usuario existente, escribe el mismo correo electrónico registrado en su documento `users/{UID}` y deja vacía la contraseña. Repite el proceso para asignarle otro colegio con otro rol.
5. Los usuarios antiguos con `role: "admin"`, `"operator"` o `"viewer"` no reciben un colegio automáticamente. Asígnales un colegio desde Gestión si su documento tiene correo electrónico; si no lo tiene, añade el correo o crea la asignación `users/{UID}/schoolRoles/{schoolId}` desde Firebase Console.
6. Los dispositivos existentes aparecen en **Gestión → Dispositivos sin asignar**. Elige el colegio, escribe el nombre exacto de una clase existente y pulsa **Asignar**. La extensión conserva esos campos en las siguientes sincronizaciones.
7. Revisa las políticas por colegio y clase y prueba cada rol antes de usar datos reales.

### Cuentas y autenticación
El panel crea cuentas de correo y contraseña mediante una instancia secundaria de Firebase Authentication para no cerrar la sesión del administrador actual. La creación del documento de usuario y de sus asignaciones se realiza con la sesión del administrador y queda sujeta a las reglas Firestore. Si la creación de Auth termina pero falla la escritura de Firestore, puede quedar una cuenta de Authentication sin perfil; comprueba ambas consolas antes de volver a intentarlo.

### Políticas de navegación
La prioridad es: **política individual del dispositivo → política de clase → política general del colegio**. La lista negra del colegio se aplica también a las políticas individuales y de clase. Los dispositivos sin asignación de colegio continúan usando el sistema global antiguo hasta que se incorporan a un colegio.

### Despliegue y verificación
- Publica las nuevas reglas Firestore.
- Render debe publicar la carpeta `admin/`.
- Actualiza la extensión a la versión `3.1.0` para incorporar la lectura de políticas por colegio.
- Prueba acceso de owner, administrador general, admin, operator y viewer; caducidad; cuentas; asignaciones; altas/bajas de colegios y clases; dispositivos antiguos; políticas y lista negra.
- No se ha probado esta actualización en Firebase ni en Chromebooks reales. No debe considerarse validada hasta completar esas pruebas.
