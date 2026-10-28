# Focus Guard · Panel de administración educativa

Panel web estático para inventario de equipos, documentación de perfiles de política y auditoría local.

## Abrir

Abre `index.html` en un navegador moderno o sirve la carpeta `admin/` mediante un servidor web estático. No requiere dependencias ni compilación.

## Funciones de la demo

- Inventario local: registrar, editar, buscar, filtrar y eliminar registros de equipos.
- Perfiles de política: documentar grupos, propósito y notas de configuración.
- Auditoría local: registra las acciones realizadas desde esta interfaz.
- Exportación del inventario a CSV.
- Persistencia en `localStorage` del navegador actual.

## Limitaciones importantes

Esta versión es un **prototipo local**, no una consola multiusuario ni un sistema de administración remota. Los dispositivos de ejemplo no están conectados ni se consultan en tiempo real. Los perfiles son documentación: no se despliegan ni aplican políticas automáticamente. Los datos se guardan en el navegador y no se sincronizan con otros administradores.

Para un despliegue escolar real, añade autenticación y autorización del lado del servidor, una API con base de datos, comunicación segura con agentes inscritos, gestión de claves, retención limitada de registros y controles de acceso por rol. Para aplicar políticas en dispositivos, integra herramientas autorizadas como Google Admin/Chrome Enterprise o la solución MDM del centro. No uses datos identificativos reales en esta demo.

## Privacidad

No envía telemetría ni datos a un servidor. El inventario local puede incluir nombres de equipos y responsables; usa datos ficticios mientras evalúas el prototipo.