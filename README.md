# VentasApp

Aplicación para gestionar **ventas**, **pedidos** y **despacho** en un negocio (bar, kiosco, comedor, etc.). Permite tomar pedidos y cobrar, prepararlos por puesto (cocina, barra) y registrar la entrega.

- **Tecnología:** React + Vite (frontend), Node.js + Express + PostgreSQL (backend opcional).
- **Uso:** Un solo dispositivo (datos en el navegador) o varios dispositivos compartiendo la misma base de datos.

---

## Documentación

| Documento | Contenido |
|-----------|-----------|
| **[DOCUMENTACION.md](./DOCUMENTACION.md)** | **Guía completa:** qué es la app, cómo funciona, puesta en marcha y uso de cada sección (Ventas, Pedidos, Despacho, Configuraciones). Pensada para usuario nuevo sin capacitación. |
| **[BACKEND_Y_RENDER.md](./BACKEND_Y_RENDER.md)** | Cómo crear la base de datos y el backend en Render y conectar el frontend para usar la app en varios dispositivos. |
| **[SUBIR_A_INTERNET.md](./SUBIR_A_INTERNET.md)** | Cómo subir solo el frontend a Vercel o Netlify. |

---

## Inicio rápido (desarrollo local)

```bash
npm install
npm run dev
```

Abrí en el navegador la URL que indique Vite (ej. `http://localhost:5173`).

**Primera vez:** Entrá a **Configuraciones** → **Puestos** y creá al menos un puesto; después **Productos** y cargá productos asignados a ese puesto. Luego ya podés usar **Ventas**, **Pedidos** y **Despacho**.

---

## Estructura del proyecto

```
VentasApp/
├── src/                    # Frontend (React)
│   ├── components/         # Ventas, Pedidos, Despacho, Configuraciones, etc.
│   ├── context/            # Estado global (VentasContext)
│   ├── api/                # Cliente API para el backend
│   └── utils/              # Sincronización, etc.
├── backend/                # API REST (Node + Express + PostgreSQL)
│   ├── db/schema.sql       # Esquema de la base de datos
│   └── server.js           # Servidor
├── DOCUMENTACION.md        # Guía completa de uso y puesta en marcha
├── BACKEND_Y_RENDER.md     # Deploy del backend en Render
└── SUBIR_A_INTERNET.md     # Deploy del frontend
```

---

## Licencia

Proyecto de uso libre. Ver repositorio para más detalles.
