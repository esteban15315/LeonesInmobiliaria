# Cómo publicar el Geovisor (Netlify + Render + Neon)

Tres servicios gratuitos, cada uno con su parte:

| Parte | Servicio | Qué se publica |
|---|---|---|
| Frontend (React + Vite) | **Netlify** | carpeta `frontend/` |
| Backend (Express) | **Render** | carpeta `backend/` |
| Base de datos (PostgreSQL + PostGIS) | **Neon** | base nueva, con `database/schema.sql` |

Orden recomendado: **1) Neon → 2) Render → 3) Netlify → 4) volver a Render a poner la dirección de Netlify**.

## 0. Antes de empezar

- El código debe estar en un repositorio de **GitHub** (Render y Netlify lo leen de ahí). No subas `backend/.env` ni `frontend/.env` (ya están en `.gitignore`).
- Necesitas tu token **público** de Mapbox (`pk...`).

## 1. Base de datos en Neon

1. Crea una cuenta en <https://neon.tech> y un proyecto nuevo (Postgres 16). Elige la región más cercana.
2. Copia la **connection string** (algo como `postgresql://usuario:clave@ep-xxxx.neon.tech/neondb?sslmode=require`).
3. Prepara la base **desde tu computadora** (aplica el esquema con PostGIS y crea los 4 usuarios internos):

   ```powershell
   cd backend
   $env:DATABASE_URL = "postgresql://...tu cadena de Neon..."
   $env:USUARIOS_PASSWORD = "una clave larga y propia"     # mínimo 10 caracteres; NO uses leones123
   node scripts/inicializar-bd.js
   ```

   Crea `tecnica@leones.test`, `legal@leones.test`, `administrativa@leones.test` y `gerencia@leones.test`, todos con esa clave. Se puede repetir sin problema (no pisa claves existentes). Para otro dominio de correo: `$env:CORREO_DOMINIO = "tuempresa.com"`.

## 2. Backend en Render

1. Crea una cuenta en <https://render.com> y conéctala con GitHub.
2. **New → Blueprint** y elige tu repositorio: Render lee `render.yaml` y crea el servicio `geovisor-api`.
3. Cuando lo pida, completa las variables marcadas como manuales:
   - `DATABASE_URL`: la cadena de Neon.
   - `CORS_ORIGIN`: por ahora déjala vacía; la pones en el paso 4.
4. Al terminar el primer despliegue, abre `https://geovisor-api.onrender.com/api/poligonos/registrados`. Debe responder `{"type":"FeatureCollection",...}`. (La dirección exacta la muestra Render.)

`JWT_SECRET` lo genera Render solo. `NODE_ENV=production` y `TRUST_PROXY=1` ya vienen en `render.yaml`.

## 3. Frontend en Netlify

1. Crea una cuenta en <https://netlify.com> → **Add new site → Import from Git** y elige el repositorio. `frontend/netlify.toml` ya trae la configuración (base `frontend`, comando `yarn build`, carpeta `dist`, reglas para que `/panel` y `/ofrecer` funcionen al recargar).
2. En **Site configuration → Environment variables** agrega:
   - `VITE_MAPBOX_TOKEN` = tu token público de Mapbox.
   - `VITE_API_URL` = la dirección de Render **sin `/api`** (p. ej. `https://geovisor-api.onrender.com`).
3. **Deploy**. Si cambias una variable, hay que volver a desplegar (el valor se incorpora al compilar).

## 4. Cerrar el círculo

1. En Render → `geovisor-api` → **Environment**, pon `CORS_ORIGIN` = la dirección de tu sitio en Netlify (p. ej. `https://mi-geovisor.netlify.app`, sin barra final). Guarda: Render reinicia solo.
2. En <https://account.mapbox.com> → tu token → **URL restrictions**: agrega esa misma dirección de Netlify, para que nadie más use tu token.

## 5. Comprobar que funciona

- [ ] `https://tu-sitio.netlify.app` carga y el mapa se ve.
- [ ] `/login` entra con `tecnica@leones.test` y la clave de `USUARIOS_PASSWORD`.
- [ ] En `/ofrecer`, el mapa deja elegir un lote con un clic y el envío termina en la pantalla de confirmación.
- [ ] En el panel, el oferente nuevo aparece en la lista, y al activar **Catastro** y hacer clic en un lote se ven sus datos.

## Variables de entorno (resumen)

| Dónde | Variable | Para qué |
|---|---|---|
| Render | `DATABASE_URL` | Conexión a Neon |
| Render | `JWT_SECRET` | Firma de sesiones y de los sellos de predio (la genera Render) |
| Render | `CORS_ORIGIN` | Quién puede llamar a la API desde el navegador |
| Render | `TRUST_PROXY` | `1`: el límite de uso por IP distingue a cada visitante |
| Render | `OFERTAS_SOLO_PREDIOS` | `true` = el oferente solo puede elegir lotes del catastro (sin dibujar) |
| Render | `NODE_ENV` | `production` |
| Netlify | `VITE_MAPBOX_TOKEN` | Mapas |
| Netlify | `VITE_API_URL` | Dirección del backend |

Otras variables opcionales del backend (límites, catastro, validación) están en `backend/.env.example`.

## Limitaciones de los planes gratuitos

- **Render se duerme** tras ~15 minutos sin visitas: la primera petición tarda 30-60 s. Conviene abrir el sitio unos minutos antes de una exposición.
- **Las fotos y reportes de la revisión técnica se pierden** al reiniciar el servicio: el disco de Render gratuito no es persistente. Para conservarlos hay que pasar a un plan con disco (`UPLOADS_DIR` apuntando a él) o guardarlos en un servicio de archivos.
- **Neon** suspende la base tras unos minutos de inactividad y la reactiva sola (agrega un par de segundos a la primera consulta).
- Los servicios externos (COFOPRI, MIDAGRI, Overpass, Mapbox) siguen su propio ritmo; el de MIDAGRI es lento a veces.
- El certificado intermedio que permite consultar MIDAGRI vence el **2 de noviembre de 2027** (hay una prueba que avisa).

## Seguridad antes de compartir el enlace

- Usa claves propias (nunca `leones123`) y no publiques las contraseñas en el repositorio.
- Es una demo con datos de prueba: no ingreses contactos o nombres reales de terceros sin avisarles.
- Si algún día la publicas en serio, revisa permisos, copias de seguridad y la política de datos personales.
