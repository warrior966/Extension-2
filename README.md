# Focus Guard

Extensión Chrome MV3 para bloqueo local de dominios y registro de perfiles de ChromeOS compartidos, con un panel web conectado a Firebase.

## Componentes

- **Extensión Chrome**: bloqueo local de hasta 50 dominios, configuración por perfil y sincronización del registro de dispositivo con Firebase. También aplica la política de navegación global configurada desde el panel.
- **Panel web** (`admin/`): Firebase Authentication, inventario, perfiles documentales y auditoría.
- **Firestore Rules** (`firestore.rules`): roles administrativos y escritura restringida para cada instalación anónima.
- **API anterior** (`server/`): backend Node.js/SQLite independiente conservado como prototipo.

## Configuración

Consulta [admin/README.md](admin/README.md) para activar Email/Password y Anonymous Authentication, publicar las reglas, crear el primer administrador e instalar la extensión.

## Instalación manual en Chromebook

1. Descarga el ZIP del repositorio y descomprímelo.
2. Abre `chrome://extensions`, activa Modo de desarrollador y pulsa **Cargar descomprimida**.
3. Selecciona la carpeta que contiene `manifest.json`.
4. Abre Focus Guard, asigna un nombre de perfil y aula/grupo, y pulsa **Guardar y sincronizar**.

## Identidad y seguridad

Cada perfil de Chrome usa Firebase Anonymous Authentication y solo puede escribir su propio documento `devices/{UID}`; no puede leer el inventario global, las políticas ni la auditoría. Los perfiles separados del mismo Chromebook se registran por separado. Si varias personas usan el mismo perfil de Chrome, compartirán el registro y la configuración local.

La clave Firebase web es identificador público de cliente, no una credencial de administrador. No pongas claves de service account ni Admin SDK en la extensión. La protección efectiva depende de Authentication y las reglas Firestore.

## Límites y estado

- La señal de última comunicación se actualiza aproximadamente cada cinco minutos si Chrome ejecuta el service worker y hay conexión.
- El bloqueo actúa en el navegador; la extensión no puede impedir su propia desinstalación ni controlar el sistema operativo.
- La política global de navegación del panel se sincroniza con las extensiones cuando se conectan; los perfiles documentales de políticas aún no se distribuyen automáticamente.
- La integración no se ha probado contra el proyecto Firebase real y las reglas no se han publicado desde este repositorio. Antes de usar datos reales, habilita Anonymous Authentication, publica reglas y prueba con cuentas de los distintos roles.


## Nuevas funciones (v1.2.0)

- **Página de bloqueo personalizada:** las reglas de bloqueo global, lista blanca y dominios bloqueados localmente redirigen a `blocked.html`.
- **Políticas por aulas y grupos:** desde el panel, abre «Aulas y grupos» para crear una política con libertad total, bloqueo total o lista blanca para cada grupo.
- **Asignación de grupo:** el nombre del grupo debe coincidir exactamente con el campo «Aula / grupo» del registro del dispositivo. Si no hay política para ese grupo, se usa la política global.
- **Sincronización:** la extensión consulta las políticas de grupo durante el ciclo de sincronización, aproximadamente cada cinco minutos.

### Pasos de actualización

1. Publica el contenido de `firestore.rules` en Firebase Console → Firestore Database → Rules y pulsa **Publicar**. Este paso es necesario para que el panel y la extensión lean y guarden las políticas por grupo.
2. Descarga la versión actualizada de la extensión desde GitHub.
3. Abre `chrome://extensions`, activa el modo desarrollador si hace falta, sustituye los archivos de la extensión y pulsa **Recargar**. Acepta los permisos nuevos si Chrome los solicita.
4. En el panel de Focus Guard, registra o edita un dispositivo y asigna el aula/grupo. Después, en «Aulas y grupos», crea una política con el mismo nombre.
5. Prueba primero con un Chromebook de prueba y comprueba que la página personalizada aparece al navegar a una web bloqueada.

**Limitaciones:** las políticas por grupo dependen de que el dispositivo pueda sincronizarse con Firebase y de que el nombre del aula/grupo coincida. La extensión no sustituye la administración de dispositivos de ChromeOS y no bloquea aplicaciones nativas ni otros navegadores.
