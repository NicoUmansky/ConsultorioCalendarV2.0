# ConsultorioCalendarV2.0

Aplicación web para gestionar turnos de consultorio con integración a Google Calendar, Google Contacts y recordatorios por WhatsApp.

## Propósito

El objetivo del proyecto es centralizar la gestión de turnos en una interfaz simple:

- Crear eventos de atención para pacientes.
- Visualizar, editar y eliminar turnos.
- Buscar o crear contactos asociados a pacientes.
- Preparar recordatorios por WhatsApp para los turnos.

## Funcionalidades principales

- **Inicio de sesión con Google** mediante Supabase OAuth.
- **Creación automática del calendario** `ConsultorioCalendar` (si no existe) en Google Calendar.
- **Alta de turnos** con:
  - fecha/hora de inicio,
  - fecha/hora de finalización,
  - nombre del paciente,
  - observaciones.
- **Listado de eventos** ordenado por fecha.
- **Eliminación y edición de eventos** desde la vista principal.
- **Búsqueda de contactos en Google Contacts** por nombre del paciente.
- **Creación de contacto** si no existe.
- **Recordatorio por WhatsApp** abriendo un enlace `wa.me` con un mensaje prearmado.

## Flujo general de uso

1. Iniciar sesión con Google.
2. Cargar datos del turno (fecha/hora, paciente, observación).
3. Crear el evento en el calendario del consultorio.
4. Ver turnos creados y, según necesidad:
   - editar,
   - eliminar,
   - notificar por WhatsApp,
   - ejecutar la opción de recordatorio de turnos.

## Tecnologías utilizadas

Según la composición actual del repositorio, el proyecto está desarrollado con:

- **JavaScript** (lógica de aplicación y consumo de APIs).
- **HTML** (estructura base de la app web en `public/index.html`).
- **CSS** (estilos en `src/App.css` e `src/index.css`).

Bibliotecas relevantes:

- React (Create React App).
- Supabase (`@supabase/supabase-js`, `@supabase/auth-helpers-react`).
- Google APIs (Calendar y People vía `fetch`).
- `react-datetime-picker`.
- `react-icons`.

## Instalación y ejecución local

### Requisitos

- Node.js 18+ recomendado.
- npm.
- Credenciales/configuración válidas de Supabase y Google OAuth.

### 1) Clonar e instalar dependencias

```bash
npm ci
```

### 2) Configurar variables de entorno

Crear un archivo `.env` en la raíz con:

```env
REACT_APP_SUPABASE_URL=tu_url_de_supabase
REACT_APP_SUPABASE_KEY=tu_anon_key_de_supabase
```

> La aplicación usa estas variables para inicializar el cliente de Supabase.

### 3) Ejecutar en desarrollo

```bash
npm run dev
```

Abrir en el navegador: `http://localhost:3000`

### 4) Build de producción

```bash
npm run build
```

### 5) Tests

```bash
npm test
```

## Estructura del proyecto

```text
ConsultorioCalendarV2.0/
├─ public/               # Archivos estáticos y HTML base
├─ src/
│  ├─ App.js             # Lógica principal (turnos, calendario, contactos, WhatsApp)
│  ├─ App.css            # Estilos principales de la interfaz
│  ├─ index.js           # Inicialización de React + Supabase SessionContextProvider
│  └─ ...                # Archivos auxiliares de CRA
├─ package.json
└─ README.md
```

## Notas de uso

- El envío de recordatorios se realiza abriendo WhatsApp con un mensaje precompletado (no envía mensajes en segundo plano).
- El acceso a Calendar/Contacts depende de los permisos OAuth de la cuenta de Google usada en el login.
