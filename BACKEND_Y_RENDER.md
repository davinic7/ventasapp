# Backend + PostgreSQL en Render – Pasos para subir la app

Para que la VentasApp tenga **persistencia real** y funcione en **múltiples dispositivos**, hay que usar un backend con base de datos. Acá tenés los pasos.

---

## 1. Lo que ya está en el proyecto

- **Carpeta `backend/`**: servidor Node (Express) que expone una API REST y usa PostgreSQL.
- **`backend/db/schema.sql`**: script para crear las tablas (puestos, productos, pedidos, ventas).
- **`backend/.env.example`**: ejemplo de variables de entorno.

La API usa el mismo formato de datos que el frontend (camelCase: `itemsPorPuesto`, `metodoPago`, etc.).

---

## 2. Crear la base de datos en Render

1. Entrá a [render.com](https://render.com) y creá una **PostgreSQL** (New → Database).
2. Elegí nombre, región y plan (por ejemplo Free).
3. Cuando esté creada, entrá a la base y en **Connect** copiá la **Internal Database URL** (para usarla desde otro servicio de Render).

Opcional: en la pestaña **Shell** de la base de datos podés conectarte y ejecutar el contenido de `backend/db/schema.sql` para crear las tablas.  
(O podés hacerlo desde un “Web Service” que al arrancar ejecute las migraciones; por ahora lo más simple es ejecutar `schema.sql` a mano una vez.)

---

## 3. Subir el backend a Render (Web Service)

1. En Render: **New → Web Service**.
2. Conectá el repo de GitHub donde esté este proyecto (o subí el código).
3. Configuración sugerida:
   - **Root Directory**: `backend` (así Render solo usa la carpeta del backend).
   - **Build Command**: `npm install`.
   - **Start Command**: `npm start`.
   - **Environment**:
     - `DATABASE_URL`: pegá la **Internal Database URL** de la base que creaste (Render suele completarla si vinculás la DB al servicio).
     - `NODE_VERSION`: `20` (o la que uses).
4. Deploy. Render te da una URL tipo `https://ventasapp-backend.onrender.com`.

---

## 4. Ejecutar el esquema en la base (solo una vez)

Si no lo hiciste antes, tenés que crear las tablas:

- Opción A: En el **Shell** de la base de datos en Render, conectarte con `psql` y pegar/ejecutar el contenido de `backend/db/schema.sql`.
- Opción B: Desde tu PC, si tenés `psql` y la **External Database URL** de Render:  
  `psql "URL_EXTERNA" -f backend/db/schema.sql`

Después de esto, la API del backend ya puede leer/escribir en Postgres.

---

## 5. Conectar el frontend a la API

El frontend **ya está preparado** para usar la API: si existe `VITE_API_URL`, carga y guarda todo en el backend. Solo falta configurar la variable:

1. **En el despliegue del frontend (Render, Vercel, Netlify)**  
   Agregá una variable de entorno:
   - **Key:** `VITE_API_URL`
   - **Value:** la URL de tu Web Service del backend (sin barra al final), por ejemplo:  
     `https://ventasapp-backend.onrender.com`

2. **Volver a desplegar** el frontend para que el build tome la variable. Después de eso, celular y PC verán los mismos puestos, productos, pedidos y ventas.

3. **CORS**  
   El backend ya tiene `cors()` habilitado; no debería bloquear peticiones desde tu dominio del frontend.

---

## 6. Subir el frontend a internet

- **Solo frontend (sin backend):** podés desplegar la carpeta raíz del proyecto en **Vercel**, **Netlify** o **Render (Static Site)**. Sin `VITE_API_URL` la app seguiría usando solo localStorage.
- **Frontend que usa el backend:** mismo despliegue, pero configurando `VITE_API_URL` en el panel de Vercel/Netlify/Render para que en build quede la URL del backend. Así todos los dispositivos que abran esa URL comparten la misma base de datos.

---

## Resumen de URLs después del deploy

| Qué              | Dónde                         |
|------------------|-------------------------------|
| Base PostgreSQL  | Render (Database)             |
| API (backend)    | `https://tu-backend.onrender.com` |
| App (frontend)   | `https://tu-app.vercel.app` (o Netlify/Render estático) |

En el frontend, `VITE_API_URL` debe ser la URL del backend (sin `/api` al final; el código agregará `/api/puestos`, etc.).

**Nota:** Si no definís `VITE_API_URL`, la app sigue usando solo localStorage (cada dispositivo con sus propios datos).
