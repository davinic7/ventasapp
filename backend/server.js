import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 3001;

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null;

/** Ejecutar esquema al arrancar si hay DB (crea tablas si no existen). */
async function runSchema() {
  if (!pool) return;
  try {
    const schemaPath = path.join(__dirname, 'db', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(sql);
    console.log('Esquema de base de datos verificado/creado.');
  } catch (e) {
    console.error('Error al ejecutar esquema:', e.message);
  }
}

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ---- Helpers: camelCase <-> DB ----
const puestoToApi = (row) => row ? {
  id: row.id,
  nombre: row.nombre,
  avatar: row.avatar || '👨‍🍳',
  fechaCreacion: row.fecha_creacion
} : null;

const productoToApi = (row) => row ? {
  id: row.id,
  nombre: row.nombre,
  categoria: row.categoria || 'Otros',
  precio: Number(row.precio),
  stock: Number(row.stock),
  puestoId: row.puesto_id,
  descripcion: row.descripcion || '',
  icono: row.icono || '📦',
  imagenUrl: row.imagen_url,
  esCombo: row.es_combo || false,
  productosCombo: row.productos_combo || [],
  precioCombo: row.precio_combo != null ? Number(row.precio_combo) : null,
  unidadBase: row.unidad_base || 'unidad',
  unidadesVenta: row.unidades_venta || null,
  fechaCreacion: row.fecha_creacion
} : null;

const pedidoToApi = (row) => row ? {
  id: row.id,
  numero: row.numero,
  cliente: row.cliente,
  estado: row.estado || 'pendiente',
  total: Number(row.total),
  metodoPago: row.metodo_pago || 'efectivo',
  comprobanteUrl: row.comprobante_url,
  items: row.items || [],
  itemsPorPuesto: row.items_por_puesto || {},
  estadosPorPuesto: row.estados_por_puesto || {},
  fechaCreacion: row.fecha_creacion,
  fechaActualizacion: row.fecha_actualizacion
} : null;

const ventaToApi = (row) => row ? {
  id: row.id,
  pedidoId: row.pedido_id,
  numeroPedido: row.numero_pedido,
  cliente: row.cliente,
  total: Number(row.total),
  metodoPago: row.metodo_pago || 'efectivo',
  comprobanteUrl: row.comprobante_url,
  items: row.items || [],
  fecha: row.fecha,
  fechaVenta: row.fecha_venta
} : null;

// ---- API: Puestos ----
app.get('/api/puestos', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Base de datos no configurada' });
  try {
    const { rows } = await pool.query('SELECT * FROM puestos ORDER BY fecha_creacion');
    res.json(rows.map(puestoToApi));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/puestos', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Base de datos no configurada' });
  try {
    const { id, nombre, avatar } = req.body;
    await pool.query(
      'INSERT INTO puestos (id, nombre, avatar) VALUES ($1, $2, $3)',
      [id || Date.now().toString(), nombre || '', avatar || '👨‍🍳']
    );
    const { rows } = await pool.query('SELECT * FROM puestos WHERE id = $1', [id || Date.now().toString()]);
    res.status(201).json(puestoToApi(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/puestos/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Base de datos no configurada' });
  try {
    const { nombre, avatar } = req.body;
    await pool.query(
      'UPDATE puestos SET nombre = COALESCE($2, nombre), avatar = COALESCE($3, avatar) WHERE id = $1',
      [req.params.id, nombre, avatar]
    );
    const { rows } = await pool.query('SELECT * FROM puestos WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Puesto no encontrado' });
    res.json(puestoToApi(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/puestos/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Base de datos no configurada' });
  try {
    const { rowCount } = await pool.query('DELETE FROM puestos WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Puesto no encontrado' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- API: Productos ----
app.get('/api/productos', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Base de datos no configurada' });
  try {
    const { rows } = await pool.query('SELECT * FROM productos ORDER BY fecha_creacion');
    res.json(rows.map(productoToApi));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/productos', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Base de datos no configurada' });
  try {
    const p = req.body;
    const id = p.id || Date.now().toString();
    await pool.query(
      `INSERT INTO productos (id, nombre, categoria, precio, stock, puesto_id, descripcion, icono, imagen_url, es_combo, productos_combo, precio_combo, unidad_base, unidades_venta)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        id, p.nombre || '', p.categoria || 'Otros', Number(p.precio) || 0, Number(p.stock) || 0,
        p.puestoId || null, p.descripcion || '', p.icono || '📦', p.imagenUrl || null,
        Boolean(p.esCombo), JSON.stringify(p.productosCombo || []), p.precioCombo != null ? Number(p.precioCombo) : null,
        p.unidadBase || 'unidad', p.unidadesVenta ? JSON.stringify(p.unidadesVenta) : null
      ]
    );
    const { rows } = await pool.query('SELECT * FROM productos WHERE id = $1', [id]);
    res.status(201).json(productoToApi(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/productos/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Base de datos no configurada' });
  try {
    const p = req.body;
    await pool.query(
      `UPDATE productos SET
        nombre = COALESCE($2, nombre), categoria = COALESCE($3, categoria), precio = COALESCE($4, precio),
        stock = COALESCE($5, stock), puesto_id = COALESCE($6, puesto_id), descripcion = COALESCE($7, descripcion),
        icono = COALESCE($8, icono), imagen_url = COALESCE($9, imagen_url), es_combo = COALESCE($10, es_combo),
        productos_combo = COALESCE($11, productos_combo), precio_combo = COALESCE($12, precio_combo),
        unidad_base = COALESCE($13, unidad_base), unidades_venta = COALESCE($14, unidades_venta)
       WHERE id = $1`,
      [
        req.params.id, p.nombre, p.categoria, p.precio != null ? Number(p.precio) : null, p.stock != null ? Number(p.stock) : null,
        p.puestoId, p.descripcion, p.icono, p.imagenUrl, p.esCombo,
        p.productosCombo ? JSON.stringify(p.productosCombo) : null, p.precioCombo != null ? Number(p.precioCombo) : null,
        p.unidadBase, p.unidadesVenta ? JSON.stringify(p.unidadesVenta) : null
      ]
    );
    const { rows } = await pool.query('SELECT * FROM productos WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(productoToApi(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/productos/:id/stock', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Base de datos no configurada' });
  try {
    const delta = Number(req.body.delta) || 0;
    await pool.query('UPDATE productos SET stock = GREATEST(0, stock + $2) WHERE id = $1', [req.params.id, delta]);
    const { rows } = await pool.query('SELECT * FROM productos WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(productoToApi(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/productos/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Base de datos no configurada' });
  try {
    const { rowCount } = await pool.query('DELETE FROM productos WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- API: Pedidos ----
app.get('/api/pedidos', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Base de datos no configurada' });
  try {
    const { rows } = await pool.query('SELECT * FROM pedidos ORDER BY numero');
    res.json(rows.map(pedidoToApi));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/pedidos', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Base de datos no configurada' });
  try {
    const p = req.body;
    const id = p.id || Date.now().toString();
    await pool.query(
      `INSERT INTO pedidos (id, numero, cliente, estado, total, metodo_pago, comprobante_url, items, items_por_puesto, estados_por_puesto)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id, p.numero || 0, p.cliente || '', p.estado || 'pendiente', Number(p.total) || 0,
        p.metodoPago || 'efectivo', p.comprobanteUrl || null,
        JSON.stringify(p.items || []), JSON.stringify(p.itemsPorPuesto || {}), JSON.stringify(p.estadosPorPuesto || {})
      ]
    );
    const { rows } = await pool.query('SELECT * FROM pedidos WHERE id = $1', [id]);
    res.status(201).json(pedidoToApi(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/pedidos/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Base de datos no configurada' });
  try {
    const p = req.body;
    await pool.query(
      `UPDATE pedidos SET estado = COALESCE($2, estado), estados_por_puesto = COALESCE($3, estados_por_puesto), fecha_actualizacion = NOW() WHERE id = $1`,
      [req.params.id, p.estado, p.estadosPorPuesto ? JSON.stringify(p.estadosPorPuesto) : null]
    );
    const { rows } = await pool.query('SELECT * FROM pedidos WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(pedidoToApi(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/pedidos/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Base de datos no configurada' });
  try {
    const { rowCount } = await pool.query('DELETE FROM pedidos WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- API: Ventas ----
app.get('/api/ventas', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Base de datos no configurada' });
  try {
    const { rows } = await pool.query('SELECT * FROM ventas ORDER BY fecha DESC');
    res.json(rows.map(ventaToApi));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ventas', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Base de datos no configurada' });
  try {
    const v = req.body;
    const id = v.id || Date.now().toString();
    await pool.query(
      `INSERT INTO ventas (id, pedido_id, numero_pedido, cliente, total, metodo_pago, comprobante_url, items, fecha_venta)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id, v.pedidoId || '', v.numeroPedido || 0, v.cliente || '', Number(v.total) || 0,
        v.metodoPago || 'efectivo', v.comprobanteUrl || null, JSON.stringify(v.items || []), v.fechaVenta || null
      ]
    );
    const { rows } = await pool.query('SELECT * FROM ventas WHERE id = $1', [id]);
    res.status(201).json(ventaToApi(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Health (para Render)
app.get('/health', (req, res) => {
  res.json({ ok: true, database: !!pool });
});

async function start() {
  await runSchema();
  app.listen(PORT, () => {
    console.log(`Servidor en http://localhost:${PORT}`);
    if (!pool) console.warn('DATABASE_URL no definida: la API responderá 503 en rutas de datos.');
  });
}
start().catch((e) => {
  console.error('Error al iniciar:', e);
  process.exit(1);
});
