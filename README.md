# Focus Guard

Extensión Chrome Manifest V3 para gestionar una lista local de sitios que quieres bloquear durante sesiones de concentración.

## Funciones
- Activar y desactivar el bloqueo desde el popup.
- Añadir dominios a una lista editable (por ejemplo, `social.example`).
- Guardar configuración localmente con `chrome.storage.local`.
- Aplicar reglas de bloqueo mediante la API oficial `declarativeNetRequest`.
- No recopila ni envía datos a servidores externos.

## Instalación local
1. Descarga/clona este repositorio.
2. Abre `chrome://extensions` en Chrome.
3. Activa **Modo de desarrollador**.
4. Pulsa **Cargar descomprimida** y selecciona la carpeta del proyecto.
5. Abre el popup de Focus Guard, añade dominios y activa el bloqueo.

## Formato de dominios
Introduce solo el nombre de dominio, sin protocolo ni ruta. Ejemplos: `youtube.com`, `www.reddit.com`.
La extensión normaliza el prefijo `www.` y elimina duplicados.

## Privacidad y límites
La configuración se almacena en el navegador. Esta herramienta es un bloqueador local de productividad; no modifica políticas administradas por una organización, no evade controles de supervisión y no altera extensiones de terceros. En dispositivos gestionados, las políticas del administrador pueden limitar su instalación o funcionamiento.

## Desarrollo
No requiere dependencias ni proceso de compilación. Usa JavaScript estándar y Manifest V3.
