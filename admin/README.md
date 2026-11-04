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
6. En Authentication, crea una cuenta para el administrador inicial.
7. Copia el UID de esa cuenta. En Firestore crea un documento en la colección `users` con el ID exactamente igual al UID y estos datos:

   ```json
   { "role": "admin" }
   ```

   Los roles válidos son `admin`, `operator` y `viewer`. Asigna roles únicamente a personal autorizado.
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

- `admin`: acceso completo, incluida la eliminación de registros.
- `operator`: puede consultar y gestionar dispositivos/perfiles.
- `viewer`: puede consultar dispositivos y perfiles, pero no modificarlos ni consultar auditoría.

El rol se obtiene del documento `users/{UID}` de Firestore. Las asignaciones deben realizarse desde un entorno de confianza.

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

