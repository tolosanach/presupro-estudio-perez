# PresuPro Studio

Generador de presupuestos profesionales con tracking de visualización.

## Archivos

| Archivo | Descripción |
|---|---|
| `index.html` | App principal — generador y panel admin |
| `viewer.html` | Vista pública para clientes (tracking) |
| `styles.css` | Estilos |
| `script.js` | Lógica de la app |
| `supabase_setup.sql` | Script SQL para crear las tablas en Supabase |

## Setup en 5 minutos

### 1. Publicar en GitHub Pages

1. Subí todos los archivos a este repositorio
2. Ir a **Settings → Pages → Branch: main → Save**
3. Tu URL queda: `https://TU-USUARIO.github.io/NOMBRE-REPO`

### 2. Configurar Supabase

1. Crear cuenta gratis en [supabase.com](https://supabase.com)
2. Crear proyecto
3. Ir a **SQL Editor → New Query**, pegar el contenido de `supabase_setup.sql` y ejecutar
4. Ir a **Settings → API** y copiar:
   - Project URL
   - anon public key

### 3. Configurar credenciales

En `script.js` (~línea 19):
```js
var SB = {
  url: 'https://TU-PROYECTO.supabase.co',
  key: 'eyJ...',
};
var VIEWER_BASE_URL = 'https://TU-USUARIO.github.io/NOMBRE-REPO';
```

En `viewer.html` (~línea 198):
```js
var SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
var SUPABASE_KEY = 'eyJ...';
```

### 4. Commitear los cambios y listo

---

## Uso

1. Abrí `https://TU-USUARIO.github.io/NOMBRE-REPO` en tu navegador
2. Creá un presupuesto → Guardalo en Historial
3. En Historial → botón 🔗 → copia el link automáticamente
4. Enviá el link al cliente por WhatsApp o email
5. Cuando el cliente lo abra, el estado cambia a **Visto**
6. El cliente puede **Aceptar** o **Rechazar** desde su celular

## Contraseña admin

Por defecto: `admin123`  
Cambiala desde Admin → Seguridad.
