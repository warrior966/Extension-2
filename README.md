# Focus Guard

Extensión Chrome Manifest V3 para gestionar una lista local de sitios que quieres bloquear durante sesiones de concentración.

## Componentes

- **Extensión Chrome**: bloqueo local de dominios configurados por el usuario.
- **Panel de administración educativa**: prototipo estático para inventario, perfiles de políticas y auditoría local.

## Abrir el panel educativo

Abre [admin/index.html](admin/index.html) en un navegador moderno, o sirve la carpeta `admin/` con un servidor web estático. Consulta [admin/README.md](admin/README.md) para instrucciones y limitaciones.

### Funciones del panel

- Registrar, editar, buscar y filtrar el inventario de dispositivos.
- Asignar aula/grupo, responsable, plataforma y estado a cada registro.
- Documentar perfiles de política para grupos educativos.
- Consultar un historial local de cambios.
- Exportar el inventario como CSV.

**Importante:** el panel actual es una demo local. No tiene servidor, autenticación, sincronización entre administradores ni conexión real con los dispositivos. Los perfiles de política no se aplican remotamente.

## Instalar la extensión

1. Descarga/clona este repositorio.
2. Abre `chrome://extensions` en Chrome.
3. Activa **Modo de desarrollador**.
4. Pulsa **Cargar descomprimida** y selecciona la carpeta del proyecto.
5. Abre el popup de Focus Guard, añade dominios y activa el bloqueo.

## Formato de dominios

Introduce solo el nombre de dominio, sin protocolo ni ruta. Ejemplos: `youtube.com`, `www.reddit.com`.

## Privacidad y límites

La extensión almacena la configuración en el navegador y no envía datos a servidores externos. Esta herramienta no modifica políticas administradas por una organización, no evade controles de supervisión y no altera extensiones de terceros. En dispositivos gestionados, las políticas del administrador pueden limitar su instalación o funcionamiento.

Para gestionar equipos escolares reales, integra el panel con una API autenticada y una solución autorizada de gestión de dispositivos (MDM o políticas empresariales de Chrome). Usa datos ficticios en esta demo y evita recopilar datos personales innecesarios.

## Desarrollo

No requiere dependencias ni proceso de compilación. Usa JavaScript estándar y Manifest V3.
