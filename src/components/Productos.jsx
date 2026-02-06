import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useVentas } from '../context/VentasContext';
import { ICONOS_COMIDAS, ICONOS_BEBIDAS, ICONOS_POSTRES, ICONOS_OTROS } from '../utils/avatars';
import './Productos.css';

/**
 * COMPONENTE: Productos
 * 
 * FUNCIONALIDADES:
 * - CRUD de productos individuales (crear, editar, eliminar)
 * - Gestión de categorías (Bebidas, Comidas, Postres, Otros)
 * - Asignación de productos a puestos de elaboración
 * - Gestión de stock (actualizar cantidad)
 * - Filtros por categoría y puesto
 * 
 * NOTA: Los combos no aparecen aquí. Son combinaciones de productos a un precio
 * especial que se crean en Ventas; se elaboran en el puesto de cada producto que los compone.
 * 
 * FLUJO:
 * 1. Crear productos individuales y asignar puesto (obligatorio)
 * 2. Los combos se arman en Ventas con esos productos
 * 3. Actualizar stock manualmente en esta vista
 */
const Productos = ({ onVolver, triggerAgregar, onTriggerConsumido }) => {
  const { 
    productos, 
    puestos,
    agregarProducto, 
    actualizarProducto, 
    actualizarStock, 
    eliminarProducto,
    asignarProductoAPuesto,
    obtenerProductosDisponibles
  } = useVentas();

  // Estados para el formulario de producto
  const [mostrarSelectorCategoria, setMostrarSelectorCategoria] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: 'Otros',
    precio: '',
    stock: '',
    puestoId: '',
    descripcion: '',
    icono: '📦',
    imagenUrl: '',
    tipoVariante: 'normal',
    precioMediaDocena: '',
    precioDocena: '',
    precioVaso: '',
    precioBotella: ''
  });

  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [confirmarEliminarProducto, setConfirmarEliminarProducto] = useState(null);

  const opcionesCategoria = ['todas', 'Bebidas', 'Comidas', 'Postres', 'Otros'];
  const categorias = ['Bebidas', 'Comidas', 'Postres', 'Otros']; // para formulario

  /**
   * Obtiene el icono de una categoría
   */
  const getCategoriaIcono = (categoria) => {
    const iconos = {
      'Comidas': '🍽️',
      'Bebidas': '🥤',
      'Postres': '🍰',
      'Otros': '🎁'
    };
    return iconos[categoria] || '🎁';
  };

  /**
   * Obtiene los iconos disponibles según la categoría
   */
  const obtenerIconosPorCategoria = (categoria) => {
    switch (categoria) {
      case 'Comidas':
        return ICONOS_COMIDAS;
      case 'Bebidas':
        return ICONOS_BEBIDAS;
      case 'Postres':
        return ICONOS_POSTRES;
      case 'Otros':
        return ICONOS_OTROS;
      default:
        return ICONOS_OTROS;
    }
  };

  const detectarTipoVariante = (p) => {
    const uv = p?.unidadesVenta;
    if (!Array.isArray(uv) || uv.length === 0) return 'normal';
    const ids = uv.map(u => u.id);
    if (ids.includes('media_docena') && ids.includes('docena')) return 'docenas';
    if (ids.includes('vaso') && ids.includes('botella')) return 'vaso_botella';
    return 'normal';
  };

  const abrirFormulario = (producto = null) => {
    if (producto) {
      setProductoEditando(producto);
      const tipoVar = detectarTipoVariante(producto);
      const uv = producto.unidadesVenta || [];
      const getPrecio = (id) => uv.find(u => u.id === id)?.precio ?? '';
      setFormData({
        nombre: producto.nombre,
        categoria: producto.categoria || 'Otros',
        precio: producto.precio,
        stock: producto.stock,
        puestoId: producto.puestoId || '',
        descripcion: producto.descripcion || '',
        icono: producto.icono || obtenerIconosPorCategoria(producto.categoria || 'Otros')[0] || '🎁',
        imagenUrl: producto.imagenUrl || '',
        tipoVariante: tipoVar,
        precioMediaDocena: tipoVar === 'docenas' ? getPrecio('media_docena') : '',
        precioDocena: tipoVar === 'docenas' ? getPrecio('docena') : '',
        precioVaso: tipoVar === 'vaso_botella' ? getPrecio('vaso') : '',
        precioBotella: tipoVar === 'vaso_botella' ? getPrecio('botella') : ''
      });
      setMostrarFormulario(true);
      setMostrarSelectorCategoria(false);
    } else {
      setProductoEditando(null);
      setMostrarSelectorCategoria(true);
      setMostrarFormulario(false);
      setFormData({
        nombre: '',
        categoria: 'Otros',
        precio: '',
        stock: '',
        puestoId: '',
        descripcion: '',
        icono: '🎁',
        imagenUrl: '',
        tipoVariante: 'normal',
        precioMediaDocena: '',
        precioDocena: '',
        precioVaso: '',
        precioBotella: ''
      });
    }
  };

  /**
   * Selecciona una categoría y pasa al formulario de datos
   */
  const seleccionarCategoria = (categoria) => {
    setCategoriaSeleccionada(categoria);
    const iconosCategoria = obtenerIconosPorCategoria(categoria);
    setFormData({
      nombre: '',
      categoria: categoria,
      precio: '',
      stock: '',
      puestoId: '',
      descripcion: '',
      icono: iconosCategoria[0] || '🎁',
      imagenUrl: '',
      tipoVariante: 'normal',
      precioMediaDocena: '',
      precioDocena: '',
      precioVaso: '',
      precioBotella: ''
    });
    setMostrarSelectorCategoria(false);
    setMostrarFormulario(true);
  };

  /**
   * Cierra el formulario y resetea los estados
   */
  const cerrarFormulario = () => {
    setMostrarFormulario(false);
    setMostrarSelectorCategoria(false);
    setProductoEditando(null);
    setCategoriaSeleccionada('');
    setFormData({
      nombre: '',
      categoria: 'Otros',
      precio: '',
      stock: '',
      puestoId: '',
      descripcion: '',
      icono: '📦',
      imagenUrl: '',
      tipoVariante: 'normal',
      precioMediaDocena: '',
      precioDocena: '',
      precioVaso: '',
      precioBotella: ''
    });
  };

  /**
   * Maneja el submit del formulario
   * Crea un nuevo producto o actualiza uno existente
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.puestoId) return;

    let unidadBase = 'unidad';
    let unidadesVenta = null;

    if (formData.tipoVariante === 'docenas') {
      unidadBase = 'docena';
      const pMed = parseFloat(formData.precioMediaDocena) || 0;
      const pDoc = parseFloat(formData.precioDocena) || 0;
      unidadesVenta = [
        { id: 'docena', nombre: 'Docena', factor: 1, precio: pDoc },
        { id: 'media_docena', nombre: 'Media docena', factor: 0.5, precio: pMed }
      ];
    } else if (formData.tipoVariante === 'vaso_botella') {
      unidadBase = 'botella';
      const pVaso = parseFloat(formData.precioVaso) || 0;
      const pBot = parseFloat(formData.precioBotella) || 0;
      unidadesVenta = [
        { id: 'vaso', nombre: 'Vaso', precio: pVaso, descuentoAutomatico: false },
        { id: 'botella', nombre: 'Botella', factor: 1, precio: pBot }
      ];
    }

    const precioPrincipal = formData.tipoVariante === 'docenas' ? (formData.precioDocena || 0)
      : formData.tipoVariante === 'vaso_botella' ? (formData.precioBotella || 0)
      : formData.precio;

    const datosProducto = {
      nombre: formData.nombre,
      categoria: formData.categoria,
      precio: parseFloat(precioPrincipal) || 0,
      stock: formData.stock,
      puestoId: formData.puestoId || null,
      descripcion: formData.descripcion,
      icono: formData.icono || '📦',
      imagenUrl: productoEditando ? null : (formData.imagenUrl || null),
      unidadBase,
      unidadesVenta
    };

    if (productoEditando) {
      actualizarProducto(productoEditando.id, datosProducto);
    } else {
      agregarProducto(datosProducto);
    }

    cerrarFormulario();
  };


  /**
   * Filtra por categoría (combos no se muestran aquí).
   */
  const productosFiltrados = productos
    .filter(p => !p.esCombo)
    .filter(p => filtroCategoria === 'todas' || p.categoria === filtroCategoria);

  /**
   * Obtiene el nombre del puesto por su ID
   */
  const obtenerNombrePuesto = (puestoId) => {
    const puesto = puestos.find(p => p.id === puestoId);
    return puesto ? puesto.nombre : 'Sin asignar';
  };

  useEffect(() => {
    if (triggerAgregar && onTriggerConsumido) {
      abrirFormulario();
      onTriggerConsumido();
    }
  }, [triggerAgregar, onTriggerConsumido]);

  return (
    <div className="productos-container">
      {/* Filtro por categoría: solo botones (como en Ventas) */}
      <div className="productos-filtro-row">
        {opcionesCategoria.map(cat => (
          <button
            key={cat}
            type="button"
            className={`productos-categoria-btn ${filtroCategoria === cat ? 'activo' : ''}`}
            onClick={() => setFiltroCategoria(cat)}
          >
            {cat === 'todas' ? 'Todas' : cat}
          </button>
        ))}
      </div>

      {/* LISTA DE PRODUCTOS: Grid responsive */}
      {productosFiltrados.length === 0 ? (
        <div className="sin-productos">
          <p>No hay productos registrados</p>
          <p className="sin-productos-hint">Usá el botón + del encabezado para agregar uno.</p>
        </div>
      ) : (
        <div className="productos-grid">
          {productosFiltrados.map(producto => (
            <div key={producto.id} className="producto-card">
              <div className="producto-card-top">
                <div className="producto-icono-header">
                  {producto.imagenUrl ? (
                    <img src={producto.imagenUrl} alt={producto.nombre} className="producto-imagen-card" />
                  ) : (
                    <span className="producto-emoji-card">{producto.icono || '📦'}</span>
                  )}
                </div>
                <div className="producto-header-info">
                  <h3 title={producto.nombre}>{producto.nombre}</h3>
                  <span className={`badge-categoria ${producto.categoria.toLowerCase()}`}>
                    {producto.categoria}
                  </span>
                </div>
                <div className="producto-acciones">
                  <button
                    type="button"
                    className="btn-icono-producto btn-editar"
                    onClick={() => abrirFormulario(producto)}
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    className="btn-icono-producto btn-eliminar"
                    onClick={() => setConfirmarEliminarProducto(producto)}
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="producto-card-body">
                <div className="producto-metricas">
                  <div className="metrica-item">
                    <span className="metrica-label">Precio</span>
                    <span className="metrica-value precio">${producto.precio}</span>
                  </div>
                  <div className="metrica-item">
                    <span className="metrica-label">Stock</span>
                    <span className={`metrica-value ${producto.stock === 0 ? 'stock-bajo' : ''}`}>
                      {producto.stock}
                    </span>
                  </div>
                </div>
                {producto.puestoId && (
                  <div className="producto-puesto-info" title={obtenerNombrePuesto(producto.puestoId)}>
                    <span className="puesto-label">Puesto:</span>
                    <span className="puesto-nombre">{obtenerNombrePuesto(producto.puestoId)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Selector de Categoría (solo para productos nuevos) */}
      {mostrarSelectorCategoria && createPortal(
        <div className="modal-overlay" onClick={cerrarFormulario}>
          <div className="modal-content modal-categoria" onClick={(e) => e.stopPropagation()}>
            <h3>Selecciona la Categoría</h3>
            <div className="categorias-selector">
              <button
                type="button"
                className="categoria-btn-selector"
                onClick={() => seleccionarCategoria('Comidas')}
              >
                <span className="categoria-icono">🍽️</span>
                <span className="categoria-nombre">Comidas</span>
              </button>
              <button
                type="button"
                className="categoria-btn-selector"
                onClick={() => seleccionarCategoria('Bebidas')}
              >
                <span className="categoria-icono">🥤</span>
                <span className="categoria-nombre">Bebidas</span>
              </button>
              <button
                type="button"
                className="categoria-btn-selector"
                onClick={() => seleccionarCategoria('Postres')}
              >
                <span className="categoria-icono">🍰</span>
                <span className="categoria-nombre">Postres</span>
              </button>
              <button
                type="button"
                className="categoria-btn-selector"
                onClick={() => seleccionarCategoria('Otros')}
              >
                <span className="categoria-icono">🎁</span>
                <span className="categoria-nombre">Otros</span>
              </button>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-cancelar" onClick={cerrarFormulario}>
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: Formulario de producto (simplificado para nuevos, completo para edición) */}
      {mostrarFormulario && createPortal(
        <div className="modal-overlay" onClick={cerrarFormulario}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{productoEditando ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            
            <form onSubmit={handleSubmit}>
              {/* Mostrar categoría seleccionada (solo para productos nuevos) */}
              {!productoEditando && categoriaSeleccionada && (
                <div className="categoria-seleccionada">
                  <span className="categoria-icono-small">{getCategoriaIcono(categoriaSeleccionada)}</span>
                  <span className="categoria-nombre-small">{categoriaSeleccionada}</span>
                </div>
              )}

              {/* Categoría (solo mostrar si es edición) */}
              {productoEditando && (
                <div className="form-group">
                  <label>Categoría *</label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    required
                  >
                    {categorias.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Nombre del producto */}
              <div className="form-group">
                <label>Nombre del Producto *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              {/* Icono/Emoji del producto (crear y editar) - según categoría */}
              <div className="form-group">
                <label>Icono del producto</label>
                <div className="icono-selector">
                  {obtenerIconosPorCategoria(formData.categoria).map((icono, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`icono-option ${formData.icono === icono ? 'selected' : ''}`}
                      onClick={() => setFormData({ ...formData, icono })}
                    >
                      {icono}
                    </button>
                  ))}
                </div>
                <div className="icono-preview">
                  <span className="icono-preview-icon">{formData.icono}</span>
                  <span className="icono-preview-text">Vista previa</span>
                </div>
              </div>

              {/* Tipo de venta: botones */}
              <div className="form-group">
                <label>Tipo de venta</label>
                <div className="tipo-venta-botones">
                  <button
                    type="button"
                    className={`tipo-venta-btn ${formData.tipoVariante === 'normal' ? 'activo' : ''}`}
                    onClick={() => setFormData({ ...formData, tipoVariante: 'normal' })}
                  >
                    📦 Normal (unidad)
                  </button>
                  <button
                    type="button"
                    className={`tipo-venta-btn ${formData.tipoVariante === 'docenas' ? 'activo' : ''}`}
                    onClick={() => setFormData({ ...formData, tipoVariante: 'docenas' })}
                  >
                    🥟 Por docenas
                  </button>
                  <button
                    type="button"
                    className={`tipo-venta-btn ${formData.tipoVariante === 'vaso_botella' ? 'activo' : ''}`}
                    onClick={() => setFormData({ ...formData, tipoVariante: 'vaso_botella' })}
                  >
                    🥤 Vaso / botella
                  </button>
                </div>
              </div>

              {/* Precios según tipo de venta */}
              {formData.tipoVariante === 'docenas' && (
                <div className="form-group form-precios-variante">
                  <label>Precios *</label>
                  <div className="precios-row">
                    <div className="precio-campo">
                      <span className="precio-campo-label">Media docena</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.precioMediaDocena}
                        onChange={(e) => setFormData({ ...formData, precioMediaDocena: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="precio-campo">
                      <span className="precio-campo-label">Docena</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.precioDocena}
                        onChange={(e) => setFormData({ ...formData, precioDocena: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.tipoVariante === 'vaso_botella' && (
                <div className="form-group form-precios-variante">
                  <label>Precios *</label>
                  <div className="precios-row">
                    <div className="precio-campo">
                      <span className="precio-campo-label">Vaso</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.precioVaso}
                        onChange={(e) => setFormData({ ...formData, precioVaso: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="precio-campo">
                      <span className="precio-campo-label">Botella</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.precioBotella}
                        onChange={(e) => setFormData({ ...formData, precioBotella: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.tipoVariante === 'normal' && (
                <div className="form-group">
                  <label>Precio *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                    required
                    placeholder="0.00"
                  />
                </div>
              )}

              {/* Stock inicial */}
              <div className="form-group">
                <label>
                  Stock * {formData.tipoVariante === 'docenas' && '(en docenas)'}
                  {formData.tipoVariante === 'vaso_botella' && '(en botellas)'}
                </label>
                <input
                  type="number"
                  step={formData.tipoVariante === 'docenas' ? '0.5' : '1'}
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  required
                  placeholder="0"
                />
              </div>

              {/* Puesto de elaboración (obligatorio) */}
              <div className="form-group">
                <label>Puesto de Elaboración *</label>
                <select
                  value={formData.puestoId}
                  onChange={(e) => setFormData({ ...formData, puestoId: e.target.value })}
                  required
                >
                  <option value="">Seleccionar puesto</option>
                  {puestos.map(puesto => (
                    <option key={puesto.id} value={puesto.id}>{puesto.nombre}</option>
                  ))}
                </select>
                <small>Obligatorio: cada producto debe tener un puesto para aparecer en ventas y pedidos.</small>
                {puestos.length === 0 && (
                  <p className="error-message">Primero creá un puesto en Configuración → Puestos.</p>
                )}
              </div>


              {/* Descripción */}
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows="3"
                />
              </div>

              {/* Botones de acción */}
              <div className="form-actions">
                <button type="button" className="btn-cancelar" onClick={cerrarFormulario}>
                  Cancelar
                </button>
                <button type="submit" className="btn-guardar">
                  {productoEditando ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: Confirmar eliminar producto */}
      {confirmarEliminarProducto && createPortal(
        <div className="modal-overlay" onClick={() => setConfirmarEliminarProducto(null)}>
          <div className="modal-content modal-confirmar" onClick={(e) => e.stopPropagation()}>
            <h3>Eliminar producto</h3>
            <p className="modal-confirmar-texto">
              ¿Eliminar el producto <strong>{confirmarEliminarProducto.nombre}</strong>?
            </p>
            <div className="modal-confirmar-actions">
              <button type="button" className="btn-cancelar" onClick={() => setConfirmarEliminarProducto(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn-confirmar-accion btn-eliminar"
                onClick={() => {
                  eliminarProducto(confirmarEliminarProducto.id);
                  setConfirmarEliminarProducto(null);
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Productos;

