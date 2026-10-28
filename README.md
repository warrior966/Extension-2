# Focus Guard

Herramientas iniciales para productividad y administración educativa. Para un centro con menos de 100 PC Windows, la fase 2 añade una API central de inventario y perfiles de políticas.

## Componentes

- **Extensión Chrome**: bloqueo local de dominios elegidos por el usuario.
- **Panel web estático** (`admin/`): inventario de demostración, perfiles documentales y auditoría local. Sus datos no se sincronizan con el servidor.
- **API escolar** (`server/`): backend Node.js con SQLite, inicio de sesión por sesión, roles, validación de datos, protección CSRF y auditoría de cambios.

## Panel local

Abre [admin/index.html](admin/index.html) en un navegador moderno. Consulta [admin/README.md](admin/README.md).

## API de administración (fase 2)

Consulta [server/README.md](server/README.md) para requisitos, configuración, rutas y límites. Requiere Node.js 20+ y npm. La API escucha en localhost por defecto; define credenciales iniciales y un secreto de sesión en el entorno.

La API permite inventariar equipos, crear perfiles de política y consultar acciones administrativas según el rol. **No está conectada al panel estático ni a equipos Windows reales.** El endpoint de salud declara expresamente `deviceConnectivity: not-integrated`. No hay agente Windows ni despliegue remoto de políticas.

## Instalar la extensión

1. Descarga/clona este repositorio.
2. Abre `chrome://extensions` en Chrome.
3. Activa **Modo de desarrollador**.
4. Pulsa **Cargar descomprimida** y selecciona la carpeta del proyecto.
5. Abre el popup de Focus Guard, añade dominios y activa el bloqueo.

## Límites y despliegue escolar

Este repositorio aún no es una solución de gestión lista para producción. Antes de usarlo con datos reales, hay que probar y revisar el backend, completar gestión de usuarios y recuperación/rotación de contraseñas, preparar copias de seguridad y desplegar detrás de HTTPS en una red restringida. Para gestionar Windows, la siguiente fase debe diseñar un agente de servicio firmado con inscripción por dispositivo, revocación de credenciales y políticas permitidas, o integrar una solución de gestión de endpoints ya establecida. No se acepta ejecución arbitraria de comandos.

Usa datos ficticios durante las pruebas y limita los registros a lo necesario para la administración del centro. No recopila datos en la nube por sí mismo.
