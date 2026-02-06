-- VentasApp: esquema para PostgreSQL (Render)
-- Ejecutar una vez al crear la base de datos (desde Render Shell o cliente SQL)

CREATE TABLE IF NOT EXISTS puestos (
  id           TEXT PRIMARY KEY,
  nombre       TEXT NOT NULL,
  avatar       TEXT DEFAULT '👨‍🍳',
  fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS productos (
  id             TEXT PRIMARY KEY,
  nombre         TEXT NOT NULL,
  categoria      TEXT DEFAULT 'Otros',
  precio         NUMERIC(12,2) DEFAULT 0,
  stock          NUMERIC(12,2) DEFAULT 0,
  puesto_id      TEXT REFERENCES puestos(id) ON DELETE SET NULL,
  descripcion    TEXT DEFAULT '',
  icono          TEXT DEFAULT '📦',
  imagen_url     TEXT,
  es_combo       BOOLEAN DEFAULT FALSE,
  productos_combo JSONB DEFAULT '[]',
  precio_combo   NUMERIC(12,2),
  unidad_base    TEXT DEFAULT 'unidad',
  unidades_venta JSONB,
  fecha_creacion  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedidos (
  id                 TEXT PRIMARY KEY,
  numero             INTEGER NOT NULL,
  cliente            TEXT NOT NULL,
  estado             TEXT DEFAULT 'pendiente',
  total              NUMERIC(12,2) DEFAULT 0,
  metodo_pago        TEXT DEFAULT 'efectivo',
  comprobante_url    TEXT,
  items              JSONB NOT NULL DEFAULT '[]',
  items_por_puesto   JSONB NOT NULL DEFAULT '{}',
  estados_por_puesto JSONB NOT NULL DEFAULT '{}',
  fecha_creacion      TIMESTAMPTZ DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ventas (
  id             TEXT PRIMARY KEY,
  pedido_id      TEXT NOT NULL,
  numero_pedido  INTEGER NOT NULL,
  cliente        TEXT NOT NULL,
  total          NUMERIC(12,2) DEFAULT 0,
  metodo_pago    TEXT DEFAULT 'efectivo',
  comprobante_url TEXT,
  items          JSONB DEFAULT '[]',
  fecha          TIMESTAMPTZ DEFAULT NOW(),
  fecha_venta    TEXT
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_productos_puesto ON productos(puesto_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_metodo ON ventas(metodo_pago);
