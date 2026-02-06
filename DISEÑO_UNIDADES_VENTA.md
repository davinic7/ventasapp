# Diseño: Unidades de venta y stock (empanadas por docena, bebidas vaso/botella)

Documento de diseño **sin implementar**. Objetivo: (1) productos que se venden por docenas/medias docenas, con opción al crear el producto; (2) bebidas que se venden por vaso o botella, con precios distintos y descuento de botellas **opcional y manual** en Procesamiento (Pedidos), sin factor fijo.

---

## 1. Dos flujos distintos

### 1.1 Productos por docenas (ej. empanadas)

- **Un solo stock** en unidad base: **docena**. Variantes de venta: **Media docena** y **Docena**, cada una con su precio.
- Al vender, el descuento es **automático** con factor: media docena = 0,5 docena, docena = 1 docena.
- En **Config → Productos**, al crear/editar: opción tipo **“Se vende por docenas”** (variante de venta) para configurar media docena y docena con sus precios; el stock se carga en docenas.

### 1.2 Bebidas (vaso / botella)

- **Ventas:** al vender una bebida, el usuario elige **Vaso** o **Botella**, con sus precios correspondientes. Se registra el ítem con esa unidad y precio.
- **Stock:** se maneja en **botellas**. No se usa un factor fijo (vasos por botella) porque no todas las botellas rinden igual ni los vasos son del mismo tamaño.
- **Descuento de stock:**
  - Si vende **botella** → se descuenta **1 botella** del stock al confirmar la venta (automático).
  - Si vende **vaso** → **no** se descuenta nada en el momento de la venta. En **Procesamiento (Pedidos)**, cuando el puesto recibe el pedido, se muestra un botón **opcional**: **“Descontar 1 botella”** del producto base. El personal lo usa cuando realmente abre una botella para servir esos vasos. Así cada negocio decide cuándo descontar según su realidad (tamaño de vaso, tamaño de botella).

Resumen:

| Caso | Unidad base (stock) | En ventas | Descuento de stock |
|------|----------------------|-----------|----------------------|
| Docenas (empanadas) | Docena | Opción Media docena / Docena y precios | Automático: cantidad × factor (0,5 o 1). |
| Bebidas | Botella | Opción Vaso / Botella y precios | Botella: -1 al vender. Vaso: **manual** en Pedidos con botón “Descontar 1 botella”. |
| Producto normal | Unidad | Sin selector | 1 venta = 1 unidad (como ahora). |

---

## 2. Modelo de datos (propuesta)

### 2.1 Producto (ampliación)

Campos **nuevos opcionales** (si no existen, se asume “producto simple” como hoy):

- **`unidadBase`** (string, opcional): nombre de la unidad en que se carga el stock.  
  Ejemplos: `"unidad"`, `"docena"`, `"botella"`. Por defecto: `"unidad"`.

- **`unidadesVenta`** (array, opcional): formas de vender este producto.  
  Cada elemento:
  - `id`: string único (ej. `"media_docena"`, `"docena"`, `"vaso"`, `"botella"`).
  - `nombre`: texto para mostrar (ej. "Media docena", "Vaso", "Botella").
  - `precio`: número. Precio al vender en esta unidad.
  - **`factor`** (opcional): número > 0. Cuántas unidades base se descontan **automáticamente** por cada venta.  
    Si no se usa (bebidas vaso), no se descuenta en la venta.
  - **`descuentoAutomatico`** (boolean, opcional):  
    - `true` o factor presente: al confirmar venta se descuenta `cantidad × factor` (o 1 si es “botella” con factor 1).  
    - `false`: no se descuenta al vender; el descuento se hace **en Procesamiento (Pedidos)** con el botón “Descontar 1 botella” (solo aplicable a unidades tipo vaso que comparten stock con botella).

Si `unidadesVenta` no existe o está vacío → un solo modo de venta: unidad, factor 1, precio = `producto.precio` (comportamiento actual).

- **Stock**: un único número en **unidad base**. Puede ser decimal para docenas (ej. 10,5 docenas).

Resumen por tipo:

- **Simple:** sin `unidadesVenta` → stock en unidades, 1 venta = 1 unidad.
- **Por docenas:** `unidadBase: "docena"`, `unidadesVenta`: media docena (factor 0,5) y docena (factor 1); descuento automático.
- **Bebida vaso/botella:** `unidadBase: "botella"`, `unidadesVenta`: vaso (`descuentoAutomatico: false`) y botella (factor 1, descuento automático). Descuento de vasos = manual en Pedidos.

### 2.2 Item de carrito / pedido (ampliación)

Hoy: `productoId`, `nombre`, `precio`, `cantidad`, `esCombo`.

Para unidades de venta:

- **`unidadVentaId`** (string, opcional): id de la unidad con la que se vendió (ej. `"vaso"`, `"docena"`).
- Opcional: **`factor`** y/o **`descuentoAutomatico`** en el item para no depender del producto en historial/despacho.

Descuento de stock:

- Si la unidad de venta tiene **descuento automático** (y factor): al confirmar venta, `actualizarStock(productoId, -cantidad * factor)`.
- Si **no** (ej. vaso): no se descuenta en venta; en Pedidos se ofrece el botón “Descontar 1 botella” que hace `actualizarStock(productoId, -1)`.

Precio del item = precio de la unidad de venta elegida; subtotal = `precio × cantidad`.

---

## 3. Compatibilidad con lo actual

- **Productos existentes**: sin `unidadesVenta` → se tratan como “unidad”, factor 1, precio = `producto.precio`. Cero cambios en datos viejos.
- **Ventas / carrito actuales**: items sin `unidadVentaId` → factor 1, descuento `cantidad` como hoy.
- **Combos**: siguen usando productos por id y cantidad; si un componente tiene unidades de venta, la “cantidad” del componente puede seguir siendo en unidad base (ej. “2” = 2 docenas o 2 botellas según el producto). No es obligatorio que el combo elija “media docena” en el mismo flujo; se puede definir en cantidad de unidad base para no complicar el combo.

---

## 4. Flujos a adaptar (cuando se implemente)

### 4.1 Alta / edición de producto (Config → Productos)

- **Producto simple (actual):** sin cambios; si no se activa ninguna variante, sigue siendo una sola unidad y un solo precio.
- **Opción “Se vende por docenas” (variante de venta):**  
  Al crear/editar, una opción (checkbox o selector) para activar **variante por docenas**. Si se activa:
  - Unidad de stock: **docena**. Stock que se carga = cantidad de docenas.
  - Unidades de venta: **Media docena** (precio) y **Docena** (precio). Factores fijos: 0,5 y 1; descuento automático al vender.
- **Opción “Bebida (vaso / botella)”:**  
  Si se activa:
  - Unidad de stock: **botella**. Stock = cantidad de botellas.
  - Unidades de venta: **Vaso** (precio, sin descuento automático) y **Botella** (precio, descuento 1 por venta). No se usa factor para vasos; el descuento de botellas por vasos se hace en Procesamiento con el botón opcional “Descontar 1 botella”.

Así en el formulario de producto se puede elegir: producto normal, “por docenas” o “vaso/botella”, y configurar los precios correspondientes sin factores fijos para bebidas.

### 4.2 Ventas (punto de venta)

- Al tocar un producto:
  - **Sin variantes** → como ahora: un clic = +1 unidad, precio del producto.
  - **Con variantes** (docenas o vaso/botella) → mostrar **opción de unidad** con sus precios (ej. “Media docena – $X”, “Docena – $Y” o “Vaso – $Z”, “Botella – $W”) y luego sumar al carrito con esa unidad y precio.
- Stock:
  - Docenas: no permitir sumar más de lo disponible según factor (ej. 10 docenas = hasta 20 medias docenas).
  - Botella: al vender botella se valida stock ≥ 1; vasos no consumen stock en venta (no validar por factor).

### 4.3 Procesamiento (Pedidos)

- Para ítems del pedido que correspondan a **venta por vaso** (unidad con descuento no automático): mostrar en la tarjeta del pedido un botón **opcional**: **“Descontar 1 botella”** del producto base. Al pulsarlo se descuenta 1 del stock de ese producto. El personal lo usa cuando abre una botella para servir esos vasos; no es obligatorio en cada pedido (depende de cuántas botellas abran).
- Para docenas y botellas vendidas como “botella” no hace falta este botón; el stock ya se descontó en la venta.

### 4.4 Despacho / Historial / Registro

- Mostrar en cada ítem el nombre del producto y la unidad de venta cuando aplique, ej. “Gaseosa (vaso)”, “Empanada (media docena)”, para que quede claro en listas y reportes.

---

## 5. Casos de uso concretos

### 5.1 Empanadas por docena y media docena

- Al **crear el producto** se activa la opción **“Se vende por docenas”** (variante de venta).
- `unidadBase`: `"docena"`. Stock: ej. 10 (docenas); puede ser decimal (10,5 docenas).
- `unidadesVenta`:
  - `{ id: "media_docena", nombre: "Media docena", factor: 0.5, precio: 1200 }`
  - `{ id: "docena", nombre: "Docena", factor: 1, precio: 2200 }`
- En **Ventas**: el usuario elige “Media docena” o “Docena” y ve el precio; se descuenta automáticamente `cantidad × factor` docenas del stock.

### 5.2 Bebidas: vaso y botella, descuento manual de botella

- Al crear el producto se activa la opción **“Bebida (vaso / botella)”**.
- `unidadBase`: `"botella"`. Stock: ej. 20 (botellas).
- `unidadesVenta`:
  - `{ id: "vaso", nombre: "Vaso", precio: 300, descuentoAutomatico: false }`  → no se usa factor; no se descuenta en la venta.
  - `{ id: "botella", nombre: "Botella", factor: 1, precio: 1000 }`  → al vender se descuenta 1 botella.
- En **Ventas**: el usuario elige “Vaso” o “Botella” con sus precios. Vasos no descontan stock.
- En **Procesamiento (Pedidos)**: para ítems “Gaseosa (vaso)” (u otra bebida vendida por vaso), se muestra el botón **“Descontar 1 botella”**; al usarlo se descuenta 1 del stock del producto. Es opcional: el negocio decide cuándo descontar según tamaño de botella y vaso.

### 5.3 Producto normal (sin cambios visibles)

- Sin activar “por docenas” ni “vaso/botella”. Sin `unidadesVenta` o una sola entrada con factor 1.
- Comportamiento idéntico al actual.

---

## 6. Resumen de cambios por capa (solo diseño)

| Capa | Cambio |
|------|--------|
| **Producto (contexto)** | Persistir `unidadBase`, `unidadesVenta` (id, nombre, precio, factor opcional, `descuentoAutomatico` opcional). Stock en unidad base; puede ser float para docenas. |
| **actualizarStock** | Sigue `stock + delta`. Delta decimal para docenas; para “vaso” no se llama en venta; en Pedidos se llama -1 al usar “Descontar 1 botella”. |
| **Carrito / crear pedido** | Item con `unidadVentaId`, precio de esa unidad. Descuento solo si la unidad tiene descuento automático (factor). |
| **Productos (UI)** | Al crear/editar: opción **“Se vende por docenas”** (media docena + docena, precios, stock en docenas) y opción **“Bebida (vaso / botella)”** (precios vaso y botella, stock en botellas). |
| **Ventas (UI)** | Si el producto tiene variantes, mostrar opción Vaso/Botella o Media docena/Docena con sus precios; sumar al carrito con esa unidad. |
| **Pedidos (Procesamiento)** | Para ítems vendidos por **vaso** (descuento no automático): botón opcional **“Descontar 1 botella”** que descuenta 1 del stock del producto base. |
| **Despacho / Historial / Registro** | Mostrar nombre + unidad cuando aplique (ej. “Gaseosa (vaso)”, “Empanada (media docena)”). |

Con esto quedan cubiertos: (1) productos por docenas con opción de variante al crear el producto, y (2) bebidas con opción Vaso/Botella y precios en venta, y descuento de botellas opcional y manual en Procesamiento, sin factor fijo. Cuando quieras, se puede bajar a tareas por archivo e implementar paso a paso.
