# Focus Guard

Herramientas iniciales para productividad y administración educativa.

## Componentes

- **Extensión Chrome**: bloqueo local de dominios elegidos por el usuario.
- **Panel web** (`admin/`): inicio de sesión con Firebase Authentication; inventario, perfiles documentales y auditoría compartidos mediante Cloud Firestore.
- **Reglas Firestore** (`firestore.rules`): autorización por rol (`admin`, `operator`, `viewer`). Configuración de despliegue en `firebase.json`.
- **API anterior** (`server/`): backend Node.js/SQLite independiente, conservado como prototipo y no usado por el panel Firebase.

## Configurar el panel Firebase

Consulta [admin/README.md](admin/README.md) para activar Email/Password, publicar las reglas, crear la primera cuenta y asignar su rol en la colección `users`.

Panel: [admin/index.html](admin/index.html)

## Límites importantes

La integración Firebase sincroniza registros de inventario y perfiles; **no detecta ni administra los PC Windows reales**. Los perfiles no se despliegan automáticamente. No hay agente Windows, estado de conectividad ni ejecución remota de comandos. Esta versión no se ha probado en el proyecto Firebase ni está lista para producción: valida las reglas con cada rol y revisa privacidad, retención de auditoría y recuperación de cuentas antes de usar datos reales.

## Instalar la extensión

1. Descarga/clona este repositorio.
2. Abre `chrome://extensions` en Chrome.
3. Activa **Modo de desarrollador**.
4. Pulsa **Cargar descomprimida** y selecciona la carpeta del proyecto.
5. Abre el popup de Focus Guard, añade dominios y activa el bloqueo.
