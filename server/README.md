# Focus Guard School API (fase 2)

API inicial para un centro educativo con menos de 100 PC Windows. Gestiona registros de inventario y perfiles de política; **no instala software, no ejecuta comandos en Windows y no afirma que los equipos estén conectados**.

## Requisitos

- Node.js 20 o posterior.
- npm.
- Un directorio de datos con permisos restringidos.
- Para cualquier despliegue compartido: HTTPS, copias de seguridad, responsable técnico y revisión de seguridad.

## Ejecutar en local

Desde esta carpeta:

1. Instala dependencias: `npm install`.
2. Copia `.env.example` a `.env`.
3. Define `SESSION_SECRET` con al menos 32 caracteres aleatorios.
4. Define `BOOTSTRAP_ADMIN_USERNAME` y una contraseña única de al menos 12 caracteres.
5. Ejecuta `npm start`.

La API escucha por defecto en `127.0.0.1:3030`. El usuario administrador inicial solo se crea cuando la tabla de usuarios está vacía. Las credenciales se leen del entorno y no deben guardarse en Git.

Comprueba el estado con `GET /api/health`. El endpoint devuelve `deviceConnectivity: not-integrated` a propósito.

## Rutas principales

| Método | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/health` | Público; solo estado del servicio |
| GET | `/api/csrf` | Token de sesión CSRF |
| POST | `/api/auth/login` | Límite de intentos; usuario y contraseña |
| POST | `/api/auth/logout` | Sesión autenticada y token CSRF |
| GET | `/api/auth/me` | Cualquier usuario autenticado |
| GET | `/api/devices` | Cualquier usuario autenticado |
| POST / PATCH | `/api/devices` | Admin u operador |
| DELETE | `/api/devices/:id` | Solo administrador |
| GET | `/api/policies` | Cualquier usuario autenticado |
| POST | `/api/policies` | Admin u operador |
| DELETE | `/api/policies/:id` | Solo administrador |
| GET | `/api/audit` | Admin u operador |
| GET | `/api/users` | Solo administrador |
| POST | `/api/users` | Solo administrador; crea usuario y rol |
| DELETE | `/api/users/:id` | Solo administrador; protege la última cuenta admin |

Las solicitudes que modifican datos requieren `X-CSRF-Token`. Solicita el token con `GET /api/csrf` y conserva la cookie de sesión. Tras iniciar sesión, usa el token devuelto en la respuesta. Las rutas de escritura validan los campos y limitan el tamaño del JSON.

## Roles previstos

- **admin:** gestiona registros y puede eliminarlos.
- **operator:** registra y modifica equipos, crea perfiles y consulta auditoría.
- **viewer:** consulta inventario y perfiles.

El administrador puede crear usuarios con roles `admin`, `operator` o `viewer`, listarlos y eliminar cuentas que no sean la propia. La API impide eliminar al último administrador. Aún faltan cambio y recuperación de contraseñas, revocación de todas las sesiones de un usuario y una interfaz gráfica para gestionar cuentas. No uses la API en producción sin completar esas funciones y realizar pruebas de seguridad.

## Controles incluidos

- Hash de contraseña con bcrypt.
- Sesiones en SQLite, cookie HttpOnly, SameSite Strict y expiración de 30 minutos.
- Protección CSRF, límites de peticiones y validación de entrada con esquemas.
- Cabeceras de seguridad mediante Helmet, consultas SQL parametrizadas y registros de auditoría.
- Bind a localhost por defecto y comprobaciones para no escuchar directamente en interfaces públicas en modo producción.

## Limitaciones y plan de despliegue

Esta API **no está integrada con el panel HTML actual** ni con equipos Windows. El inventario del panel estático y el de la API son independientes. Tampoco existe aún agente, heartbeat, inscripción de equipos, envío/aplicación de políticas, canal de actualización ni sistema de alertas. No se debe interpretar un registro de inventario como prueba de que un PC está en línea.

Antes de desplegar en el centro:
1. Añadir gestión segura de usuarios, roles y rotación de credenciales.
2. Ejecutar pruebas automatizadas y revisión de seguridad.
3. Desplegar tras HTTPS en una red restringida, con copias de seguridad y restauración probada.
4. Definir un protocolo de inscripción de agentes con credenciales únicas por dispositivo, revocación y rotación.
5. Implementar el agente Windows como servicio firmado, con configuración permitida y auditada; no aceptar ejecución arbitraria de comandos desde la API.
6. Probar primero en un grupo piloto y usar herramientas oficiales de administración de Windows siempre que sea posible.

## Privacidad

Guarda solo datos necesarios para administrar el inventario. Establece responsables, aviso interno, control de acceso, retención y eliminación de registros de acuerdo con las normas del centro y la legislación aplicable. No incluyas nombres de alumnado ni datos sensibles en el prototipo.