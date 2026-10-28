# Focus Guard · Panel de administración

Panel web que usa Firebase Authentication para iniciar sesión y Cloud Firestore para compartir inventario, perfiles documentales y auditoría entre administradores.

## Configuración inicial

1. En Firebase Console, abre el proyecto `fidelazion`.
2. En **Authentication → Sign-in method**, habilita **Email/Password**.
3. En **Firestore Database**, crea la base de datos si todavía no existe.
4. Publica las reglas del archivo raíz `firestore.rules`:
   - Con Firebase CLI instalado y autenticado, desde la raíz del repositorio ejecuta `firebase deploy --only firestore:rules --project fidelazion`.
   - Alternativamente, copia el contenido de `firestore.rules` en la pestaña **Firestore → Rules** y pulsa **Publish**.
5. En Authentication, crea una cuenta para el administrador inicial.
6. Copia el **UID** de esa cuenta. En Firestore crea manualmente un documento en la colección `users` con el ID exactamente igual al UID y estos datos:
   ```json
   { "role": "admin" }
   ```
   Los roles válidos son `admin`, `operator` y `viewer`. Solo el personal de confianza debe asignar roles desde la consola o Admin SDK; el panel web no puede crear ni cambiar roles.
7. Sirve la carpeta `admin/` mediante un servidor web estático (por ejemplo, Firebase Hosting o un servidor local). Para módulos JavaScript, no abras el archivo con `file://`; usa HTTP/HTTPS.
8. Abre el panel e inicia sesión. Los registros se almacenan en las colecciones `devices`, `policies` y `audit`.

## Permisos

- `admin`: consultar y modificar registros, eliminar equipos/perfiles y leer auditoría.
- `operator`: consultar y crear/editar equipos y crear perfiles; puede leer auditoría.
- `viewer`: consultar equipos y perfiles. No puede leer auditoría ni modificar datos.

Las reglas de Firestore son la barrera de seguridad real; las restricciones de interfaz solo mejoran la experiencia. Revisa y prueba las reglas antes de almacenar información real.

## Límites importantes

- El inventario refleja registros manuales en la nube, no conectividad en tiempo real.
- Los perfiles de políticas son documentación y **no se aplican** automáticamente a los PC Windows.
- No hay agente Windows, inscripción de dispositivos, telemetría de estado ni despliegue remoto.
- Configuración Firebase del cliente incluida en `admin.js` identifica el proyecto; no es un secreto. Nunca incluyas claves de cuenta de servicio ni credenciales de Admin SDK en el navegador.
- No se ha validado esta versión en el proyecto Firebase ni se han ejecutado pruebas de integración. Antes de producción, prueba reglas con cuentas de cada rol, activa protecciones de cuenta, configura copias de seguridad y revisa privacidad/retención de auditoría.
