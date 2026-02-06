# Subir VentasApp a internet

Hay **dos formas** según lo que necesites:

- **Solo la app (frontend)** → En 5 minutos tenés una URL. Los datos se guardan en cada dispositivo (localStorage).
- **App + base de datos** → Misma URL para todos y datos compartidos entre dispositivos (ver [BACKEND_Y_RENDER.md](./BACKEND_Y_RENDER.md)).

---

## Opción 1: Solo frontend (rápido)

### 1. Subir el código a GitHub

Si todavía no tenés el proyecto en GitHub:

1. Creá un repositorio nuevo en [github.com](https://github.com) (por ejemplo `ventasapp`).
2. En la carpeta del proyecto, abrí la terminal y ejecutá:

```bash
git init
git add .
git commit -m "VentasApp lista para subir"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/ventasapp.git
git push -u origin main
```

(Reemplazá `TU_USUARIO/ventasapp` por tu usuario y nombre del repo.)

### 2. Desplegar en Vercel (recomendado)

1. Entrá a [vercel.com](https://vercel.com) e iniciá sesión (con GitHub).
2. **Add New** → **Project**.
3. **Import** el repositorio `ventasapp` (o el nombre que hayas usado).
4. Vercel detecta Vite solo. Dejá:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Root Directory:** vacío (raíz del repo)
5. **Deploy**.

En unos minutos te dan una URL tipo:  
`https://ventasapp-xxx.vercel.app`

Listo: cualquiera puede entrar desde el celular o la PC. Los datos se guardan en el navegador de cada dispositivo (localStorage).

### Alternativa: Netlify

1. [netlify.com](https://netlify.com) → **Add new site** → **Import an existing project** → GitHub → elegí el repo.
2. **Build command:** `npm run build`
3. **Publish directory:** `dist`
4. **Deploy**.

---

## Opción 2: App + base de datos (múltiples dispositivos, mismos datos)

Para que todos los que entren vean los mismos productos, pedidos y ventas:

1. **Backend + Postgres en Render**  
   Seguí los pasos de [BACKEND_Y_RENDER.md](./BACKEND_Y_RENDER.md): crear PostgreSQL, crear Web Service con la carpeta `backend`, ejecutar `backend/db/schema.sql`.

2. **Conectar el frontend al backend**  
   En el frontend hay que usar la API en lugar de solo localStorage (por ahora eso sigue pendiente de implementar en el código).

3. **Subir el frontend**  
   Mismo proceso que Opción 1 (Vercel/Netlify). Si ya conectaste el frontend al backend, en Vercel/Netlify agregá la variable de entorno `VITE_API_URL` con la URL de tu backend en Render (ej. `https://ventasapp-backend.onrender.com`).

---

## Resumen rápido (solo frontend)

| Paso | Acción |
|------|--------|
| 1 | Código en GitHub |
| 2 | vercel.com → Import repo → Deploy |
| 3 | Usar la URL que te dan |

Si algo no te cuadra en alguno de los pasos, decime en cuál (GitHub, Vercel o backend) y lo detallamos.
