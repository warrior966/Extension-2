# Focus Guard

Extensión para Chrome basada en Manifest V3 y panel web de administración. Permite aplicar políticas de navegación web globales y por aula/grupo, registrar perfiles de Chrome y consultar su estado desde Firebase.

<text>Versión actual de la extensión: **2.0.6**.</text>

## Componentes

- **Extensión Chrome**: aplica reglas de navegación, sincroniza el perfil del navegador con Firebase y muestra una página de bloqueo personalizada.
- **Panel web** (`admin/`): autenticación de administradores, inventario de dispositivos, control web, políticas por aula/grupo y exportación CSV.
- **Firestore** (`firestore.rules`): controla qué pueden leer y modificar los perfiles anónimos de la extensión y los usuarios del panel.
- **API anterior** (`server/`): backend Node.js/SQLite conservado como prototipo independiente.

## Funciones principales

### Control de navegación

La política global se configura en **Control web**:

- **Libertad total** (`free`): permite navegar, salvo los dominios de la lista negra global.
- **Bloqueo total** (`block_all`): bloquea la navegación web HTTP/HTTPS.
- **Lista blanca** (`whitelist`): permite únicamente los dominios autorizados y sus subdominios, además de respetar la lista negra global.

La lista negra global se aplica en todos los modos. Se admiten hasta 50 dominios en cada lista. Las reglas cubren navegación principal e iframes/subdocumentos HTTP/HTTPS.

Las políticas por aula/grupo se configuran desde **Aulas y grupos**. El nombre del grupo debe coincidir exactamente con el campo **Aula / grupo** del dispositivo. Si no existe una política para ese grupo, se utiliza la política global.

### Sincronización y dispositivos

- Cada perfil de Chrome se registra mediante Firebase Anonymous Authentication y tiene su propio UID.
- El panel muestra nombre, aula/grupo, responsable, plataforma, estado y última comunicación.
- La sincronización y el heartbeat se realizan periódicamente (aproximadamente cada minuto cuando Chrome ejecuta el service worker y hay conexión).
- El panel incluye **Ver URL** para consultar la URL HTTP/HTTPS de la pestaña activa que el perfil haya comunicado. El panel refresca el inventario aproximadamente cada minuto.
- Si falla una solicitud de red o la sincronización, puede activarse el bloqueo de seguridad offline hasta que la sincronización se recupere.

### Página de bloqueo

Cuando una regla bloquea una navegación, la extensión muestra `blocked.html`, con información sobre los motivos habituales del bloqueo.

## Configuración de Firebase

Consulta [admin/README.md](admin/README.md) para configurar Authentication, publicar las reglas de Firestore, crear el primer administrador, instalar la extensión y preparar las políticas.

Proyecto Firebase configurado en el cliente: `fidelazion`.

**Importante:** los cambios del archivo `firestore.rules` no se publican automáticamente al subirlos a GitHub. Deben desplegarse en el proyecto Firebase correcto antes de utilizar las funciones correspondientes.

## Instalación manual en Chromebook

1. Descarga el ZIP del repositorio y descomprímelo.
2. Abre `chrome://extensions`, activa **Modo de desarrollador** y pulsa **Cargar descomprimida**.
3. Selecciona la carpeta que contiene `manifest.json`.
4. Abre Focus Guard, asigna un nombre de perfil y aula/grupo, y pulsa **Guardar y sincronizar**.
5. En el panel, revisa el nuevo registro y apruébalo/cambia su estado según el procedimiento del centro.

Para entornos educativos administrados, se recomienda distribuir y controlar la extensión mediante Google Admin Console / Chrome Education o Chrome Enterprise.

## Roles del panel

- `admin`: administración completa de los registros, incluida su eliminación.
- `operator`: consulta y gestión operativa de dispositivos y perfiles, además de auditoría.
- `viewer`: consulta de dispositivos y perfiles, sin cambios ni acceso a auditoría.

Los roles se asignan en Firestore mediante documentos de `users` cuyo ID coincide con el UID de Authentication.

## Identidad, privacidad y seguridad

- El registro representa un **perfil de Chrome**, no necesariamente un Chromebook físico único ni una persona.
- Perfiles de Chrome separados generan registros independientes. Si varias personas utilizan el mismo perfil, comparten su registro y configuración.
- La extensión usa autenticación anónima y debe limitarse mediante las reglas Firestore a escribir su propio documento `devices/{UID}`.
- La URL comunicada corresponde únicamente a la pestaña activa de la última ventana enfocada que se haya podido consultar. Puede incluir rutas, términos de búsqueda o parámetros; informa a los usuarios y aplica las normas de privacidad y retención del centro.
- La clave Firebase web incluida en el cliente identifica el proyecto, pero no sustituye las reglas de seguridad. Nunca incluyas claves de service account ni credenciales Admin SDK en la extensión.

## Límites y verificaciones

- La extensión controla navegación web HTTP/HTTPS dentro de Chrome; no controla aplicaciones nativas, otros navegadores ni todo el sistema operativo.
- Una extensión normal no puede impedir por sí sola que el usuario la desinstale ni interceptar páginas internas como `chrome://extensions`. Para instalación forzada y políticas de desinstalación se necesita administración de Chrome.
- El bloqueo offline depende de las comprobaciones de conectividad y sincronización; no tiene por qué activarse instantáneamente. Un fallo de Firebase puede activar el bloqueo aunque la conexión general a Internet funcione.
- Las pestañas ya abiertas se vuelven a comprobar cuando se actualizan las reglas. El contenido de un iframe que ya se haya cargado no necesariamente desaparece al instante.
- No se debe considerar una función verificada en Chromebook hasta probarla en dispositivos reales. Antes de producción, publica y valida las reglas Firestore, prueba todos los roles y políticas y revisa la configuración de privacidad.

## Publicación del panel

El panel está preparado para publicarse desde la carpeta `admin/` (por ejemplo, en Render como sitio estático, con `admin` como directorio de publicación).



### Roles de acceso al panel
- `owner`: gestiona roles y fechas de caducidad de otros usuarios; no puede crear otros owners ni eliminar dispositivos, perfiles o configuraciones.
- `admin`, `operator` y `viewer`: mantienen sus permisos funcionales y pueden tener una fecha de caducidad asignada por el owner.
