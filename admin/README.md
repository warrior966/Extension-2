# Focus Guard · Panel de administración

Panel web que usa Firebase Authentication para iniciar sesión y Cloud Firestore para compartir inventario, perfiles documentales y auditoría entre administradores. La extensión Chrome puede registrar un perfil de ChromeOS como dispositivo y actualizar su última comunicación.

## Configuración inicial de Firebase

1. En Firebase Console, abre el proyecto `fidelazion`.
2. En **Authentication → Sign-in method**, habilita **Email/Password** para administradores.
3. En el mismo apartado, habilita **Anonymous** para que la extensión registre el perfil de Chrome sin pedir una cuenta personal al usuario. Cada perfil de Chrome recibe un UID anónimo independiente.
4. En **Firestore Database**, crea la base de datos si todavía no existe.
5. Publica las reglas del archivo raíz `firestore.rules`:
   - Con Firebase CLI instalado y autenticado, desde la raíz del repositorio ejecuta `firebase deploy --only firestore:rules --project fidelazion`.
   - Alternativamente, copia el contenido de `firestore.rules` en **Firestore → Rules** y pulsa **Publish**.
6. En Authentication, crea una cuenta para el administrador inicial.
7. Copia el UID de esa cuenta. En Firestore crea un documento en `users` con el ID exactamente igual al UID y estos datos:
   ```json
   { "role": "admin" }
   ```
   Los roles válidos son `admin`, `operator` y `viewer`. Solo personal de confianza debe asignarlos desde la consola o Admin SDK.
8. Sirve la carpeta `admin/` mediante HTTP/HTTPS. No abras el archivo con `file://`.

## Instalar y conectar la extensión en cada perfil de ChromeOS

1. Descarga el repositorio como ZIP y descomprímelo.
2. Abre `chrome://extensions` en el Chromebook y activa **Modo de desarrollador**.
3. Pulsa **Cargar descomprimida** y selecciona la carpeta del proyecto que contiene `manifest.json`.
4. Abre Focus Guard y define un nombre de perfil y aula/grupo. Pulsa **Guardar y sincronizar**.
5. Comprueba en el panel que aparece un dispositivo con plataforma `ChromeOS`. La extensión envía una señal de última comunicación aproximadamente cada cinco minutos mientras el navegador permite ejecutar el service worker.

## Identidad y privacidad en Chromebooks compartidos

- El registro identifica un **perfil de Chrome**, no un número de serie ni una identidad física garantizada del Chromebook.
- Si distintas personas usan perfiles de Chrome separados, cada perfil aparecerá como registro independiente. No se recoge el correo ni el nombre de la cuenta del usuario de ChromeOS.
- Si varias personas usan exactamente el mismo perfil de Chrome, compartirán ese registro y la configuración local de la extensión.
- La extensión usa Firebase Anonymous Authentication y solo puede escribir el documento `devices/{UID-anónimo}` asociado a su propio UID. Las reglas impiden que una extensión anónima lea el inventario global, las políticas o la auditoría.
- La clave Firebase web incluida en el código cliente no es una clave secreta. La seguridad depende de Authentication y de las reglas de Firestore. No incluyas claves de cuenta de servicio ni credenciales Admin SDK en la extensión.
- Las reglas deben publicarse y probarse en el proyecto correcto antes de usarlo con datos reales.

## Roles del panel

- `admin`: consultar y modificar registros, eliminar equipos/perfiles y leer auditoría.
- `operator`: consultar y crear/editar equipos y crear perfiles; puede leer auditoría.
- `viewer`: consultar equipos y perfiles. No puede leer auditoría ni modificar datos.

## Límites

- La extensión puede bloquear dominios configurados mediante APIs del navegador, pero no puede impedir que un usuario la desinstale ni administrar el sistema operativo completo.
- Los perfiles de políticas son documentación; todavía no se distribuyen automáticamente como políticas remotas a la extensión.
- La sincronización requiere conexión a Internet y que Firebase Authentication anónimo esté habilitado.
- No se ha probado esta integración contra el proyecto Firebase real ni se han publicado estas reglas desde aquí. Antes de producción, valida los permisos en Firebase Rules Playground/emulador, protege las cuentas de administrador y revisa privacidad y retención.
