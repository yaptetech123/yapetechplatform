# YAPETECH — Plataforma de servicio técnico

App web para el control diario de trabajos de reparación de celulares y
tablets (iOS y Android), con registro de clientes/equipos, evidencia
fotográfica/video y un dashboard de ganancias mensual.

## Requisitos

- **Node.js** 18 o superior (descárgalo de https://nodejs.org, versión "LTS").

## Primer uso

1. Descomprime la carpeta `yapetech` en tu computadora.
2. Abre una terminal dentro de la carpeta.
3. Instala las dependencias (solo la primera vez):
   ```
   npm install
   ```
4. Inicia la app:
   ```
   npm run dev
   ```
5. Se abrirá en `http://localhost:5173`.

### Usar desde el celular en la misma red (para tomar fotos con la cámara)

```
npm run movil
```

Esto muestra una dirección tipo `http://192.168.x.x:5173` — ábrela desde el
navegador del celular (conectado al mismo WiFi que la computadora) para
registrar trabajos usando la cámara del teléfono directamente.

## Acceso

- Usuario: `admin`
- Contraseña: `yapetech2026`

Puedes cambiar ambos datos desde **Ajustes → Acceso de administrador** una
vez dentro de la app.

## ¿Dónde se guardan los datos?

Todo (trabajos, fotos y videos) se guarda en el navegador de este
dispositivo, usando **IndexedDB** (a diferencia de `localStorage`, soporta
guardar fotos/videos sin límite de ~5 MB). Esto significa:

- Los datos no se comparten automáticamente entre computadoras/navegadores.
- Si borras los datos de navegación de ese navegador, se pierde la
  información. Usa **Ajustes → Exportar respaldo** regularmente (genera un
  archivo `.json` con todo, incluida la evidencia fotográfica) y guárdalo en
  un lugar seguro (Drive, USB, etc.). Desde **Ajustes → Importar respaldo**
  puedes restaurarlo cuando lo necesites.

## Funcionalidades

- **Nuevo trabajo**: fecha/hora, DNI y nombre del cliente, teléfono,
  tipo de equipo, marca (detecta automáticamente iOS/Android), modelo,
  número de serie, IMEI 1 y 2 (con validación), tipo de reparación,
  descripción del estado al recibirlo, fotos (cámara o galería), video,
  costo cobrado e inversión en repuestos — con cálculo automático de la
  ganancia.
- **Trabajos**: listado buscable y filtrable por estado, con vista de
  detalle, edición y eliminación.
- **Ganancias**: dashboard con ingresos, inversión, ganancia total,
  cantidad de trabajos, gráfico de ganancia por mes, trabajos por mes y
  ranking de reparaciones/marcas más frecuentes.
- **Ajustes**: cambio de usuario/contraseña, exportar/importar respaldo
  completo y eliminar todos los datos.

## Compilar una versión de producción

```
npm run build
npm run preview
```
