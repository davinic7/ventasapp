# VentasApp – Documentación completa

Esta guía explica **qué es VentasApp**, **cómo funciona** y **cómo ponerla en marcha** desde cero, pensada para un usuario nuevo sin capacitación previa.

---

## 1. ¿Qué es VentasApp?

VentasApp es una aplicación para gestionar **ventas**, **pedidos** y **despacho** en un negocio (por ejemplo un bar, kiosco o comedor). Permite:

- **Tomar pedidos y cobrar** en un dispositivo (celular o PC).
- **Ver y preparar pedidos por puesto** (cocina, barra, etc.).
- **Entregar** el pedido al cliente y registrar la venta.
- **Llevar registro** de productos, stock y ventas.

Los datos pueden usarse **solo en un dispositivo** (guardados en el navegador) o **en varios dispositivos a la vez** (con backend y base de datos en internet).

---

## 2. Cómo funciona el flujo general

```
VENTAS (tomar pedido y cobrar)
    ↓
PEDIDOS (preparar por puesto: pendiente → en elaboración → listo)
    ↓
DESPACHO (entregar y registrar venta)
```

- **Ventas:** El cliente pide; se eligen productos, se indica nombre del cliente, método de pago y opcionalmente una descripción. Al confirmar, se crea un **pedido** y se envía a la cola de **Pedidos**.
- **Pedidos:** Cada **puesto** (ej. Cocina, Barra) ve solo los ítems que le corresponden. Se marcan: *Iniciar* (en elaboración) y luego *Marcar listo*. Cuando todos los puestos marcan listo, el pedido pasa a **Despacho**.
- **Despacho:** Se ven los pedidos listos para entregar. Al marcar *Entregado*, se registra la **venta** y el pedido queda cerrado.

Antes de usar Ventas, Pedidos y Despacho hay que **configurar puestos y productos** (ver más abajo).

---

## 3. Puesta en marcha (primera vez)

### 3.1 Ejecutar la app en tu computadora (prueba local)

1. **Requisitos:** tener instalado [Node.js](https://nodejs.org/) (versión 18 o superior).
2. Abrí una terminal en la carpeta del proyecto y ejecutá:
   ```bash
   npm install
   npm run dev
   ```
3. Abrí en el navegador la dirección que muestre (por ejemplo `http://localhost:5173`).

La app funcionará **solo en ese navegador**; los datos se guardan en el dispositivo (localStorage).

### 3.2 Configuración inicial obligatoria

Antes de tomar el primer pedido tenés que crear **al menos un puesto** y **productos**:

| Paso | Dónde | Qué hacer |
|------|--------|-----------|
| 1 | **Menú** → **CONFIGURACIONES** → **PUESTOS** | Crear los puestos de trabajo (ej. Cocina, Barra, Cafetería). Cada uno tiene nombre y un ícono (emoji). |
| 2 | **Menú** → **CONFIGURACIONES** → **PRODUCTOS** | Crear productos: nombre, precio, stock, categoría y **asignar cada producto a un puesto**. Si un producto tiene variantes (ej. vaso/botella, docena/media docena), configurarlas en “Unidades de venta”. |
| 3 | Opcional | En **VENTAS** podés crear **combos** (productos que son varios ítems con un precio único). |

Después de eso ya podés usar **VENTAS** para tomar pedidos, **PEDIDOS** para prepararlos por puesto y **DESPACHO** para entregar.

### 3.3 Poner la app en internet (para usarla desde varios dispositivos)

- **Solo la app (un dispositivo por vez, datos en cada navegador):**  
  Ver [SUBIR_A_INTERNET.md](./SUBIR_A_INTERNET.md) – desplegar el frontend en Vercel o Netlify.

- **App + base de datos (varios dispositivos, mismos datos):**  
  Ver [BACKEND_Y_RENDER.md](./BACKEND_Y_RENDER.md) – crear base de datos y backend en Render, luego desplegar el frontend con la variable `VITE_API_URL` apuntando al backend.

---

## 4. Guía por sección (uso diario)

### 4.1 Menú principal

Desde el menú se accede a:

- **VENTAS** – Tomar pedidos y cobrar.
- **PEDIDOS** – Ver y preparar pedidos por puesto.
- **DESPACHO** – Entregar pedidos listos y registrar ventas.
- **CONFIGURACIONES** – Puestos, productos, registro y reinicio.

---

### 4.2 VENTAS

**Qué hace:** Tomar el pedido del cliente, indicar método de pago y opcionalmente descripción; al confirmar se crea el pedido y se envía a Pedidos.

**Pasos típicos:**

1. Elegir **productos** (y si aplica, variante: vaso/botella, docena/media docena, etc.).
2. Ver el **carrito** (ícono de carrito con cantidad).
3. Tocar **carrito** → se abre el modal *Realizar compra*.
4. Completar:
   - **Nombre de quien es el pedido** (obligatorio).
   - **Descripción del pedido** (opcional): ej. “Para llevar”, “Sin hielo”.
   - **Método de pago:** Efectivo, Transferencia o Hijo de la comunidad (sin costo).
5. Si es **Transferencia**, tomar foto del comprobante (opcional).
6. **Confirmar compra** → el pedido aparece en **PEDIDOS** para cada puesto.

**Combos:** Desde Ventas se puede gestionar combos (ícono 🎁): crear, editar o eliminar. Un combo es un producto que incluye varios ítems con un precio único.

---

### 4.3 PEDIDOS

**Qué hace:** Cada puesto ve una **cola de pedidos** con solo los ítems que le corresponden y puede cambiar el estado (pendiente → en elaboración → listo).

**Pasos típicos:**

1. Entrar a **PEDIDOS**.
2. **Elegir el puesto** (ej. Cocina, Barra). Solo se puede ver un puesto a la vez.
3. Ver la lista de pedidos con ítems de ese puesto.
4. En cada pedido:
   - **Pedido pendiente** → botón *Iniciar* (pasa a “en elaboración”).
   - **En elaboración** → botón *Marcar listo* (ese puesto queda listo para ese pedido).
5. Cuando **todos** los puestos marcan listo, el pedido pasa a **DESPACHO**.

**Descripción del pedido:** Si el pedido tiene descripción (ej. “Para llevar”), aparece un ícono 📝 al lado del número. Tocando el ícono se abre un modal para leer la descripción completa.

**Historial:** Podés ver *Historial general* o *Historial* del puesto actual para revisar pedidos anteriores.

**Botella / vaso sin descuento automático:** Si un producto tiene “vaso” configurado sin descontar stock al vender, en la línea del ítem puede aparecer un botón para *Descontar 1 botella* cuando corresponda.

---

### 4.4 DESPACHO

**Qué hace:** Mostrar los pedidos que ya están **listos** (todos los puestos marcaron listo) para entregarlos al cliente y registrar la venta.

**Pasos típicos:**

1. Entrar a **DESPACHO**.
2. Ver las tarjetas de pedidos listos (número, cliente, ítems).
3. Si el pedido tiene descripción, usar el ícono 📝 para leerla.
4. Tocar **Entregado** en el pedido que se entrega.
5. Confirmar en el modal → se **registra la venta** (con el método de pago ya definido en Ventas) y el pedido sale de la lista.

**Importante:** En Despacho **no se cobra**; el cobro ya se hizo en Ventas. Solo se confirma la entrega y se registra la venta.

**Historial:** El botón *Historial* muestra las entregas ya registradas.

---

### 4.5 CONFIGURACIONES

**Opciones:**

- **PUESTOS** – Crear, editar y eliminar puestos (nombre, ícono/avatar). Sin puestos no se pueden asignar productos ni usar Pedidos por puesto.
- **PRODUCTOS** – Crear, editar y eliminar productos. Para cada producto: nombre, categoría, precio, stock, puesto asignado, ícono, y si aplica **unidades de venta** (vaso/botella, docena/media docena, etc.) con precios y factores de stock.
- **REGISTRO** – Ver estadísticas y reportes de ventas.
- **REINICIAR** – Reiniciar datos (parcial o total). Usar con cuidado; puede borrar pedidos, ventas, productos o todo.

---

## 5. Resumen: qué hacer según el rol

| Rol / tarea | Dónde ir | Acción principal |
|-------------|-----------|-------------------|
| Tomar pedido y cobrar | VENTAS | Agregar productos al carrito, nombre del cliente, método de pago, confirmar compra. |
| Preparar pedidos (cocina, barra, etc.) | PEDIDOS | Elegir puesto, ver cola, Iniciar → Marcar listo. |
| Entregar al cliente | DESPACHO | Ver pedidos listos, tocar Entregado y confirmar. |
| Dar de alta puestos/productos | CONFIGURACIONES → PUESTOS / PRODUCTOS | Crear y asignar productos a puestos. |
| Ver estadísticas | CONFIGURACIONES → REGISTRO | Revisar ventas y datos. |

---

## 6. Modo un dispositivo vs varios dispositivos

- **Sin backend (solo frontend):**  
  Cada dispositivo guarda sus propios datos en el navegador. No hay sincronización entre celular y PC.

- **Con backend (VITE_API_URL configurada):**  
  Todos los dispositivos que abran la misma URL de la app comparten puestos, productos, pedidos y ventas. Los cambios se actualizan automáticamente cada pocos segundos (sincronización por polling).

Para poner en marcha el backend y la base de datos, seguir [BACKEND_Y_RENDER.md](./BACKEND_Y_RENDER.md).

---

## 7. Problemas frecuentes

- **“No hay productos” en Ventas**  
  Crear productos en CONFIGURACIONES → PRODUCTOS y asignar cada uno a un puesto.

- **“Primero debes crear puestos” en Pedidos**  
  Crear al menos un puesto en CONFIGURACIONES → PUESTOS.

- **No veo los mismos datos en otro celular/PC**  
  Si querés datos compartidos, tenés que desplegar con backend y configurar `VITE_API_URL` (ver [BACKEND_Y_RENDER.md](./BACKEND_Y_RENDER.md)).

- **Errores 500 o “relation does not exist”**  
  La base de datos aún no tiene las tablas. Hacer un **redeploy del backend** en Render para que ejecute el esquema al arrancar (ver [BACKEND_Y_RENDER.md](./BACKEND_Y_RENDER.md)).

- **Pedido no aparece en Despacho**  
  En PEDIDOS, todos los puestos que tengan ítems de ese pedido deben marcar *Marcar listo*. Cuando todos estén listos, el pedido pasa a Despacho.

---

## 8. Documentación técnica adicional

- **[BACKEND_Y_RENDER.md](./BACKEND_Y_RENDER.md)** – Crear base de datos y backend en Render y conectar el frontend.
- **[SUBIR_A_INTERNET.md](./SUBIR_A_INTERNET.md)** – Subir solo el frontend a Vercel o Netlify.
- **[DISEÑO_UNIDADES_VENTA.md](./DISEÑO_UNIDADES_VENTA.md)** – Detalle sobre unidades de venta (vaso, docena, etc.) para productos.

---

*VentasApp – Documentación para usuario nuevo sin capacitación.*
