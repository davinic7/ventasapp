import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useVentas } from '../context/VentasContext';
import './Ventas.css';

/**
 * COMPONENTE: Ventas
 * 
 * FUNCIONALIDADES:
 * - Interfaz para tomar pedidos y REALIZAR COBROS
 * - Selección de productos/combos del stock disponible
 * - Agrupación de productos por categoría para fácil selección
 * - Cálculo automático de totales
 * - Selección de método de pago (Efectivo/Transferencia)
 * - Captura de foto del comprobante si el pago es por transferencia
 * - Creación de pedido con método de pago y comprobante → se envía a PEDIDOS
 * 
 * FLUJO:
 * 1. Usuario ingresa nombre del cliente (OBLIGATORIO)
 * 2. Selecciona productos/combos disponibles
 * 3. Ve resumen del pedido con total
 * 4. Selecciona método de pago
 * 5. Si es transferencia, toma foto del comprobante con la cámara
 * 6. Crea el pedido con método de pago y comprobante → se envía a PEDIDOS con estado "pendiente"
 */
const Ventas = ({ onVolver }) => {
  const {
    productos,
    puestos,
    crearPedido,
    obtenerProductosDisponibles,
    actualizarStock,
    agregarProducto,
    actualizarProducto,
    eliminarProducto,
    cuantasVecesSePuedeVenderCombo,
    descontarStockCombo,
    devolverStockCombo
  } = useVentas();

  // Estados del formulario
  const [items, setItems] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [comprobanteUrl, setComprobanteUrl] = useState(null);
  const [mostrarModalCompra, setMostrarModalCompra] = useState(false);
  const [mostrarCamara, setMostrarCamara] = useState(false);
  // Alias por compatibilidad (evita ReferenceError si algo referenciaba el nombre antiguo)
  const mostrarModalCobro = mostrarModalCompra;
  const setMostrarModalCobro = setMostrarModalCompra;
  const [cliente, setCliente] = useState('');
  const [descripcionPedido, setDescripcionPedido] = useState('');
  const [errorCliente, setErrorCliente] = useState(false);
  const [mostrarModalListaCombos, setMostrarModalListaCombos] = useState(false);
  const [mostrarModalCombo, setMostrarModalCombo] = useState(false);
  const [comboEditando, setComboEditando] = useState(null);
  const [comboData, setComboData] = useState({
    nombre: '',
    itemsCombo: [], // [{ productoId, cantidad, unidadVentaId? }, ...]
    precioCombo: ''
  });
  const [productoParaUnidad, setProductoParaUnidad] = useState(null);
  const [comboProductoParaUnidad, setComboProductoParaUnidad] = useState(null);
  const [mostrarConfirmacionHijoComunidad, setMostrarConfirmacionHijoComunidad] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Obtener productos disponibles
  const productosDisponibles = obtenerProductosDisponibles();

  // Categorías disponibles
  const categorias = ['todas', 'Bebidas', 'Comidas', 'Postres', 'Otros'];

  /**
   * Filtra productos por categoría seleccionada
   */
  const productosFiltrados = categoriaSeleccionada === 'todas'
    ? productosDisponibles
    : productosDisponibles.filter(p => p.categoria === categoriaSeleccionada);

  /** Icono para cada unidad de venta (vaso/botella) en el modal "Elegí unidad" */
  const getIconoUnidad = (unidadId) => {
    const iconos = { vaso: '🥤', botella: '🍾' };
    return iconos[unidadId] || '📦';
  };

  /** Para empanadas: número grande (12 / 6). Para el resto, null = no mostrar número */
  const getNumeroUnidad = (unidadId) => {
    if (unidadId === 'docena') return '12';
    if (unidadId === 'media_docena') return '6';
    return null;
  };

  /** Icono empanadas: docena = conjunto (varias), media docena = una */
  const getIconoEmpanada = (unidadId) => {
    if (unidadId === 'docena') return '🥟🥟'; /* conjunto de empanadas */
    if (unidadId === 'media_docena') return '🥟'; /* una empanada */
    return '🥟';
  };

  /** Orden de unidades de venta: Docena primero, luego Media docena (empanadas) */
  const ordenUnidadesVenta = (unidades) => {
    if (!Array.isArray(unidades)) return unidades || [];
    return [...unidades].sort((a, b) => {
      if (a.id === 'docena' && b.id === 'media_docena') return -1;
      if (a.id === 'media_docena' && b.id === 'docena') return 1;
      return 0;
    });
  };

  /** Encuentra un ítem del carrito por producto y unidad de venta */
  const findItem = (productoId, unidadVentaId) =>
    items.find(i =>
      String(i.productoId) === String(productoId) &&
      (i.unidadVentaId || '') === (unidadVentaId || '')
    );

  /**
   * Agrega un producto (o combo) al pedido.
   * Si el producto tiene varias unidades de venta (docena/vaso-botella), se debe llamar con unidadVenta.
   */
  const agregarItem = (producto, unidadVenta = null) => {
    if (producto.esCombo) {
      const disponibles = cuantasVecesSePuedeVenderCombo(producto);
      if (disponibles < 1) return;
      descontarStockCombo(producto.id, 1);
      const itemExistente = items.find(i => String(i.productoId) === String(producto.id));
      const precioCombo = producto.precioCombo ?? producto.precio;
      if (itemExistente) {
        setItems(items.map(i =>
          String(i.productoId) === String(producto.id) ? { ...i, cantidad: i.cantidad + 1 } : i
        ));
      } else {
        setItems([...items, {
          productoId: producto.id,
          nombre: producto.nombre,
          precio: precioCombo,
          cantidad: 1,
          esCombo: true
        }]);
      }
      return;
    }

    const uv = producto.unidadesVenta;
    const tieneVariantes = Array.isArray(uv) && uv.length > 1;
    if (tieneVariantes && !unidadVenta) {
      setProductoParaUnidad(producto);
      return;
    }

    const productoActual = productos.find(p => String(p.id) === String(producto.id));
    if (!productoActual) return;

    let nombreItem = producto.nombre;
    let precioItem = producto.precio;
    let unidadVentaId = null;
    let factor = 1;
    let descuentoAutomatico = true;

    if (unidadVenta) {
      nombreItem = `${producto.nombre} (${unidadVenta.nombre})`;
      precioItem = unidadVenta.precio;
      unidadVentaId = unidadVenta.id;
      factor = unidadVenta.factor != null ? unidadVenta.factor : 1;
      descuentoAutomatico = unidadVenta.descuentoAutomatico !== false;
    }

    const stockNecesario = factor * 1;
    if (descuentoAutomatico && (Number(productoActual.stock) || 0) < stockNecesario) return;

    const itemExistente = findItem(producto.id, unidadVentaId);
    if (itemExistente) {
      if (descuentoAutomatico) actualizarStock(producto.id, -stockNecesario);
      setItems(items.map(i =>
        i === itemExistente ? { ...i, cantidad: i.cantidad + 1 } : i
      ));
    } else {
      if (descuentoAutomatico) actualizarStock(producto.id, -stockNecesario);
      setItems([...items, {
        productoId: producto.id,
        nombre: nombreItem,
        precio: precioItem,
        cantidad: 1,
        esCombo: false,
        unidadVentaId: unidadVentaId || undefined,
        factor,
        descuentoAutomatico
      }]);
    }
  };

  /**
   * Crea o actualiza el combo y vuelve al listado de combos.
   */
  const guardarComboComoProducto = (e) => {
    e.preventDefault();
    if (!comboData.nombre.trim() || !comboData.precioCombo) return;
    const itemsConCantidad = comboData.itemsCombo.filter(i => i.cantidad > 0);
    if (itemsConCantidad.length === 0) return;

    const sinPuesto = itemsConCantidad.some(({ productoId }) => {
      const p = productos.find(pr => String(pr.id) === String(productoId));
      return !p || p.puestoId == null;
    });
    if (sinPuesto) return;

    const precio = parseFloat(comboData.precioCombo);
    const productosComboNormalizados = itemsConCantidad.map(({ productoId, cantidad, unidadVentaId }) => ({
      productoId: String(productoId),
      cantidad: Number(cantidad) || 1,
      ...(unidadVentaId != null && unidadVentaId !== '' ? { unidadVentaId: String(unidadVentaId) } : {})
    }));

    if (comboEditando) {
      actualizarProducto(comboEditando.id, {
        nombre: comboData.nombre.trim(),
        precio,
        precioCombo: precio,
        productosCombo: productosComboNormalizados
      });
    } else {
      agregarProducto({
        nombre: comboData.nombre.trim(),
        categoria: 'Otros',
        precio,
        precioCombo: precio,
        stock: 0,
        esCombo: true,
        productosCombo: productosComboNormalizados,
        puestoId: null,
        icono: '🎁'
      });
    }

    setComboProductoParaUnidad(null);
    setComboEditando(null);
    setMostrarModalCombo(false);
    setComboData({ nombre: '', itemsCombo: [], precioCombo: '' });
    setMostrarModalListaCombos(true);
  };

  /** Abre el formulario para crear un combo nuevo. */
  const abrirFormularioNuevoCombo = () => {
    setComboEditando(null);
    setComboData({ nombre: '', itemsCombo: [], precioCombo: '' });
    setMostrarModalListaCombos(false);
    setMostrarModalCombo(true);
  };

  /** Abre el formulario para editar un combo existente. */
  const abrirFormularioEditarCombo = (combo) => {
    const items = (combo.productosCombo || []).map(({ productoId, cantidad, unidadVentaId }) => ({
      productoId: String(productoId),
      cantidad: Number(cantidad) || 1,
      ...(unidadVentaId != null && unidadVentaId !== '' ? { unidadVentaId: String(unidadVentaId) } : undefined)
    }));
    setComboEditando(combo);
    setComboData({
      nombre: combo.nombre || '',
      itemsCombo: items,
      precioCombo: String(combo.precioCombo ?? combo.precio ?? '')
    });
    setMostrarModalListaCombos(false);
    setMostrarModalCombo(true);
  };

  /** Pide confirmación para eliminar un combo. */
  const [confirmarEliminarCombo, setConfirmarEliminarCombo] = useState(null);

  const combosExistentes = productos.filter(p => p.esCombo);

  /** Suma al combo: producto + unidad opcional (para vaso/botella). */
  const sumarAlCombo = (productoId, unidadVentaId = undefined) => {
    setComboData(prev => {
      const list = prev.itemsCombo.filter(i =>
        !(String(i.productoId) === String(productoId) && (i.unidadVentaId || '') === (unidadVentaId || ''))
      );
      const actual = prev.itemsCombo.find(i =>
        String(i.productoId) === String(productoId) && (i.unidadVentaId || '') === (unidadVentaId || '')
      );
      const nuevaCant = (actual?.cantidad ?? 0) + 1;
      list.push({
        productoId: String(productoId),
        cantidad: nuevaCant,
        unidadVentaId: unidadVentaId != null && unidadVentaId !== '' ? unidadVentaId : undefined
      });
      return { ...prev, itemsCombo: list };
    });
  };

  /** Resta 1 del combo para (productoId, unidadVentaId). Si no se pasa unidad, resta del primer ítem con cantidad > 0 de ese producto. */
  const restarDelCombo = (productoId, unidadVentaId = undefined) => {
    setComboData(prev => {
      const items = [...prev.itemsCombo];
      const idx = unidadVentaId !== undefined && unidadVentaId !== null
        ? items.findIndex(i => String(i.productoId) === String(productoId) && (i.unidadVentaId || '') === (unidadVentaId || ''))
        : items.findIndex(i => String(i.productoId) === String(productoId) && (i.cantidad || 0) > 0);
      if (idx === -1) return prev;
      const item = items[idx];
      const nuevaCant = (item.cantidad || 1) - 1;
      if (nuevaCant <= 0) {
        items.splice(idx, 1);
        return { ...prev, itemsCombo: items };
      }
      items[idx] = { ...item, cantidad: nuevaCant };
      return { ...prev, itemsCombo: items };
    });
  };

  const getCantidadEnCombo = (productoId, unidadVentaId = undefined) => {
    const item = comboData.itemsCombo.find(i =>
      String(i.productoId) === String(productoId) && (i.unidadVentaId || '') === (unidadVentaId || '')
    );
    return item?.cantidad ?? 0;
  };

  /** Total de unidades de un producto en el combo (suma todas las variantes). */
  const getTotalEnCombo = (productoId) => {
    return comboData.itemsCombo
      .filter(i => String(i.productoId) === String(productoId))
      .reduce((s, i) => s + (i.cantidad || 0), 0);
  };

  /** Items del combo para un producto (para mostrar "2 Vaso, 1 Botella"). */
  const getItemsComboPorProducto = (productoId) => {
    return comboData.itemsCombo.filter(i => String(i.productoId) === String(productoId) && (i.cantidad || 0) > 0);
  };

  /**
   * Elimina un ítem del pedido (por productoId y unidadVentaId) y devuelve el stock reservado.
   */
  const eliminarItem = (productoId, unidadVentaId = undefined) => {
    const item = findItem(productoId, unidadVentaId);
    if (!item) return;

    if (item.esCombo) {
      devolverStockCombo(productoId, item.cantidad);
    } else if (item.descuentoAutomatico !== false) {
      const devolver = item.cantidad * (item.factor ?? 1);
      actualizarStock(productoId, devolver);
    }
    setItems(items.filter(i =>
      !(String(i.productoId) === String(productoId) && (i.unidadVentaId || '') === (unidadVentaId || ''))
    ));
  };

  /**
   * Actualiza la cantidad de un ítem (identificado por productoId y unidadVentaId).
   */
  const actualizarCantidad = (productoId, unidadVentaId, nuevaCantidad) => {
    const item = findItem(productoId, unidadVentaId);
    if (!item) return;

    if (nuevaCantidad <= 0) {
      eliminarItem(productoId, unidadVentaId);
      return;
    }

    const delta = nuevaCantidad - item.cantidad;
    if (delta === 0) return;

    if (item.esCombo) {
      if (delta > 0) {
        const combo = productos.find(p => String(p.id) === String(productoId) && p.esCombo);
        if (!combo) return;
        const disponibles = cuantasVecesSePuedeVenderCombo(combo);
        if (disponibles < delta) return;
        descontarStockCombo(productoId, delta);
      } else {
        devolverStockCombo(productoId, -delta);
      }
    } else {
      const f = item.factor ?? 1;
      const deltaStock = delta * f;
      if (item.descuentoAutomatico !== false) {
        if (delta > 0) {
          const p = productos.find(pr => String(pr.id) === String(productoId));
          if (!p || (Number(p.stock) || 0) < deltaStock) return;
          actualizarStock(productoId, -deltaStock);
        } else {
          actualizarStock(productoId, -deltaStock);
        }
      }
    }

    setItems(items.map(i =>
      i === item ? { ...i, cantidad: nuevaCantidad } : i
    ));
  };

  /**
   * Calcula el total del pedido
   */
  const calcularTotal = () => {
    return items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  };

  /**
   * Activa la cámara del dispositivo usando la API getUserMedia
   */
  const activarCamara = async () => {
    try {
      // Solicitar acceso a la cámara trasera (environment) o frontal (user)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment' // Cámara trasera (mejor para documentos)
        },
        audio: false
      });
      
      streamRef.current = stream;
      setMostrarCamara(true);
      
      // Esperar a que el video esté listo
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      console.error('Error al acceder a la cámara:', error);
      // El error se maneja silenciosamente, el usuario puede intentar de nuevo
    }
  };

  /**
   * Captura la foto desde el video de la cámara
   */
  const capturarFoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      
      // Convertir a base64
      const fotoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setComprobanteUrl(fotoDataUrl);
      
      // Detener la cámara
      detenerCamara();
    }
  };

  /**
   * Detiene la cámara y cierra el modal
   */
  const detenerCamara = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setMostrarCamara(false);
  };

  /** Cantidad seleccionada de un producto (suma todos los ítems que coincidan por id) */
  const getCantidadSeleccionada = (productoId) => {
    return items
      .filter(i => String(i.productoId) === String(productoId))
      .reduce((s, i) => s + i.cantidad, 0);
  };

  /** Restar una unidad desde la tarjeta del producto (resta del primer ítem de ese producto) */
  const restarUno = (producto) => {
    const item = items.find(i => String(i.productoId) === String(producto.id));
    if (!item) return;
    actualizarCantidad(producto.id, item.unidadVentaId, item.cantidad - 1);
  };

  /**
   * Abre el modal de compra (carrito): nombre, descripción, método de pago
   */
  const abrirModalCompra = () => {
    if (items.length === 0) return;
    setErrorCliente(false);
    setCliente('');
    setDescripcionPedido('');
    setMetodoPago('efectivo');
    setComprobanteUrl(null);
    setMostrarModalCompra(true);
  };

  /**
   * Cierra el modal de compra sin guardar
   */
  const cerrarModalCompra = () => {
    setMostrarModalCompra(false);
    setErrorCliente(false);
    detenerCamara();
  };

  /**
   * Procesa el pedido: valida cliente y crea el pedido con método de pago.
   * Si es "Hijo de la comunidad", debe haberse confirmado antes (modal de confirmación).
   */
  const confirmarCompra = () => {
    if (!cliente.trim()) {
      setErrorCliente(true);
      return;
    }

    crearPedido(items, cliente.trim(), metodoPago, comprobanteUrl, descripcionPedido);
    setItems([]);
    setCliente('');
    setDescripcionPedido('');
    setMetodoPago('efectivo');
    setComprobanteUrl(null);
    setMostrarModalCompra(false);
    setMostrarConfirmacionHijoComunidad(false);
    setErrorCliente(false);
    detenerCamara();
  };

  /** Al hacer clic en "Confirmar compra": si es Hijo de la comunidad, pedir confirmación (compra sin costo) */
  const alConfirmarCompra = () => {
    if (!cliente.trim()) {
      setErrorCliente(true);
      return;
    }
    if (metodoPago === 'hijo_comunidad') {
      setMostrarConfirmacionHijoComunidad(true);
      return;
    }
    confirmarCompra();
  };

  // Limpiar cámara al desmontar o cambiar método de pago
  useEffect(() => {
    return () => {
      detenerCamara();
    };
  }, []);

  // Detener cámara si cambia el método de pago (solo transferencia requiere comprobante)
  useEffect(() => {
    if (metodoPago !== 'transferencia') {
      detenerCamara();
      setComprobanteUrl(null);
    }
  }, [metodoPago]);

  const totalUnidades = items.reduce((sum, item) => sum + item.cantidad, 0);

  const resetearProducto = (producto, e) => {
    e.stopPropagation();
    items.filter(i => String(i.productoId) === String(producto.id)).forEach(item => {
      if (item.esCombo) devolverStockCombo(producto.id, item.cantidad);
      else if (item.descuentoAutomatico !== false)
        actualizarStock(producto.id, item.cantidad * (item.factor ?? 1));
    });
    setItems(items.filter(i => String(i.productoId) !== String(producto.id)));
  };

  return (
    <div className="ventas-container">
      <header className="ventas-header-row">
        {onVolver && (
          <button type="button" className="btn-volver-inline" onClick={onVolver}>
            ← Menú
          </button>
        )}
        <h1 className="ventas-titulo">💰 VENTAS</h1>
        <button
          type="button"
          className="btn-combo-icono"
          onClick={() => setMostrarModalListaCombos(true)}
          title="Combos"
        >
          🎁
        </button>
        {items.length > 0 && (
          <button
            type="button"
            className="btn-carrito-icono"
            onClick={abrirModalCompra}
            title="Ver carrito y realizar compra"
          >
            <span className="carrito-icono">🛒</span>
            <span className="carrito-badge">{totalUnidades}</span>
          </button>
        )}
      </header>

      <div className="ventas-contenido">
        <div className="ventas-filtro-row">
          {categorias.map(cat => (
            <button
              key={cat}
              type="button"
              className={`categoria-btn ${categoriaSeleccionada === cat ? 'activo' : ''}`}
              onClick={() => setCategoriaSeleccionada(cat)}
            >
              {cat === 'todas' ? 'Todas' : cat}
            </button>
          ))}
        </div>

        <div className="productos-lista">
          {productosFiltrados.length === 0 ? (
            <p className="sin-productos">No hay productos en esta categoría</p>
          ) : (
            productosFiltrados.map(producto => {
              const cantidad = getCantidadSeleccionada(producto.id);
              const uv = producto.unidadesVenta;
              const tieneVariantes = Array.isArray(uv) && uv.length > 1;
              const disponibles = producto.esCombo
                ? cuantasVecesSePuedeVenderCombo(producto)
                : (tieneVariantes
                  ? (uv.some(u => u.descuentoAutomatico === false) ? Infinity : Math.floor((Number(producto.stock) || 0) / (Math.min(...uv.filter(u => u.factor != null).map(u => u.factor)) || 1)))
                  : producto.stock);
              const puedeSumar = disponibles >= 1 || (tieneVariantes && uv.some(u => u.descuentoAutomatico === false));
              const precio = producto.esCombo ? (producto.precioCombo ?? producto.precio) : producto.precio;
              return (
                <div
                  key={producto.id}
                  role="button"
                  tabIndex={puedeSumar ? 0 : -1}
                  aria-disabled={!puedeSumar}
                  className={`producto-card producto-card-btn ${!puedeSumar ? 'producto-card-disabled' : ''}`}
                  onClick={() => {
                    if (!puedeSumar) return;
                    if (tieneVariantes) setProductoParaUnidad(producto);
                    else agregarItem(producto);
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && puedeSumar) {
                      e.preventDefault();
                      if (tieneVariantes) setProductoParaUnidad(producto);
                      else agregarItem(producto);
                    }
                  }}
                >
                  <div className="producto-card-icono">
                    {producto.imagenUrl ? (
                      <img src={producto.imagenUrl} alt={producto.nombre} className="producto-imagen" />
                    ) : (
                      <span className="producto-emoji">{producto.icono || '📦'}</span>
                    )}
                    {cantidad > 0 && (
                      <span className="producto-card-cantidad">{cantidad}</span>
                    )}
                  </div>
                  <div className="producto-card-info">
                    <strong>{producto.nombre}</strong>
                    {producto.esCombo && <span className="badge-combo-mini">COMBO</span>}
                    {tieneVariantes ? (
                      <span className="producto-precio">Varios</span>
                    ) : (
                      <span className="producto-precio">${precio}</span>
                    )}
                    <span className="producto-stock-info">
                      {producto.esCombo ? `${disponibles}` : (tieneVariantes ? producto.stock : producto.stock)}
                    </span>
                  </div>
                  {cantidad > 0 && (
                    <button
                      type="button"
                      className="btn-reset-card"
                      onClick={(e) => resetearProducto(producto, e)}
                      title="Quitar todos"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL: Elegir unidad de venta (docena/vaso-botella) */}
      {productoParaUnidad && createPortal(
        <div className="modal-overlay" onClick={() => setProductoParaUnidad(null)}>
          <div className="modal-content modal-unidad" onClick={(e) => e.stopPropagation()}>
            <h3>Elegí unidad</h3>
            <p className="modal-unidad-producto">{productoParaUnidad.nombre}</p>
            <div className="modal-unidad-opciones">
              {ordenUnidadesVenta(productoParaUnidad.unidadesVenta).map(u => (
                <button
                  key={u.id}
                  type="button"
                  className="modal-unidad-btn modal-unidad-btn-cuadrado"
                  onClick={() => {
                    agregarItem(productoParaUnidad, u);
                    setProductoParaUnidad(null);
                  }}
                >
                  {getNumeroUnidad(u.id) ? (
                    <>
                      <span className="modal-unidad-numero" aria-hidden>{getNumeroUnidad(u.id)}</span>
                      <span className="modal-unidad-icon modal-unidad-icon-empanada" aria-hidden>{getIconoEmpanada(u.id)}</span>
                    </>
                  ) : (
                    <span className="modal-unidad-icon" aria-hidden>{getIconoUnidad(u.id)}</span>
                  )}
                  <span className="modal-unidad-nombre">{u.nombre}</span>
                  <span className="modal-unidad-precio">${Number(u.precio).toFixed(2)}</span>
                </button>
              ))}
            </div>
            <button type="button" className="btn-cancelar" onClick={() => setProductoParaUnidad(null)}>
              Cancelar
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: Realizar compra (nombre, descripción, método de pago) */}
      {mostrarModalCompra && createPortal(
        <div className="modal-overlay" onClick={cerrarModalCompra}>
          <div className="modal-content modal-compra" onClick={(e) => e.stopPropagation()}>
            <h3>🛒 Realizar compra</h3>

            <div className="form-group">
              <label>Nombre de quien es el pedido *</label>
              <input
                type="text"
                value={cliente}
                onChange={(e) => {
                  setCliente(e.target.value);
                  if (e.target.value.trim()) setErrorCliente(false);
                }}
                placeholder="Nombre del cliente"
                className={errorCliente ? 'input-error' : ''}
              />
              {errorCliente && (
                <span className="error-message">El nombre es obligatorio</span>
              )}
            </div>

            <div className="form-group">
              <label>Descripción del pedido (opcional)</label>
              <textarea
                value={descripcionPedido}
                onChange={(e) => setDescripcionPedido(e.target.value)}
                placeholder="Ej: Para llevar, sin hielo, etc."
                rows={2}
                className="input-descripcion"
              />
            </div>

            <div className="modal-compra-resumen">
              <p className="resumen-titulo">Resumen</p>
              <ul className="resumen-lista-items">
                {items.map((item, idx) => (
                  <li key={`${item.productoId}-${item.unidadVentaId ?? 'u'}-${idx}`} className="resumen-item">
                    <span>{item.nombre} × {item.cantidad}</span>
                    <span>${(item.precio * item.cantidad).toFixed(2)}</span>
                    <div className="resumen-item-actions">
                      <button
                        type="button"
                        className="btn-cantidad-modal"
                        onClick={() => actualizarCantidad(item.productoId, item.unidadVentaId, item.cantidad - 1)}
                      >
                        −
                      </button>
                      <span className="resumen-cantidad">{item.cantidad}</span>
                      <button
                        type="button"
                        className="btn-cantidad-modal"
                        onClick={() => actualizarCantidad(item.productoId, item.unidadVentaId, item.cantidad + 1)}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="btn-quitar-item-modal"
                        onClick={() => {
                          eliminarItem(item.productoId, item.unidadVentaId);
                          if (items.length <= 1) cerrarModalCompra();
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="resumen-total">
                <strong>Total:</strong>{' '}
                {metodoPago === 'hijo_comunidad' ? (
                  <span className="total-sin-costo">$0.00 (sin costo)</span>
                ) : (
                  `$${calcularTotal().toFixed(2)}`
                )}
              </p>
            </div>

            <div className="form-group">
              <label>Método de pago</label>
              <div className="metodo-pago-buttons">
                <button
                  type="button"
                  className={`metodo-btn ${metodoPago === 'efectivo' ? 'activo' : ''}`}
                  onClick={() => {
                    setMetodoPago('efectivo');
                    setComprobanteUrl(null);
                    detenerCamara();
                  }}
                >
                  💵 Efectivo
                </button>
                <button
                  type="button"
                  className={`metodo-btn ${metodoPago === 'transferencia' ? 'activo' : ''}`}
                  onClick={() => setMetodoPago('transferencia')}
                >
                  📱 Transferencia
                </button>
                <button
                  type="button"
                  className={`metodo-btn ${metodoPago === 'hijo_comunidad' ? 'activo' : ''}`}
                  onClick={() => {
                    setMetodoPago('hijo_comunidad');
                    setComprobanteUrl(null);
                    detenerCamara();
                  }}
                >
                  🤝 Hijo de la comunidad
                </button>
              </div>
            </div>

            {metodoPago === 'transferencia' && (
              <div className="form-group">
                <label>Comprobante de transferencia</label>
                {!comprobanteUrl ? (
                  <>
                    <button type="button" className="btn-tomar-foto" onClick={activarCamara}>
                      📷 Tomar foto del comprobante
                    </button>
                  </>
                ) : (
                  <div className="comprobante-preview">
                    <img src={comprobanteUrl} alt="Comprobante" />
                    <button type="button" className="btn-eliminar-foto" onClick={() => setComprobanteUrl(null)}>
                      🗑️ Eliminar foto
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="form-actions">
              <button type="button" className="btn-cancelar" onClick={cerrarModalCompra}>
                Cancelar
              </button>
              <button type="button" className="btn-confirmar-cobro" onClick={alConfirmarCompra}>
                ✅ Confirmar compra
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: Confirmación Hijo de la comunidad (compra sin costo) */}
      {mostrarConfirmacionHijoComunidad && createPortal(
        <div className="modal-overlay" onClick={() => setMostrarConfirmacionHijoComunidad(false)}>
          <div className="modal-content modal-confirmacion-sin-costo" onClick={(e) => e.stopPropagation()}>
            <h3>🤝 Hijo de la comunidad</h3>
            <p className="confirmacion-sin-costo-texto">
              Esta compra va <strong>sin costo</strong>. ¿Confirmar como Hijo de la comunidad?
            </p>
            <div className="form-actions">
              <button type="button" className="btn-cancelar" onClick={() => setMostrarConfirmacionHijoComunidad(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-confirmar-cobro" onClick={confirmarCompra}>
                ✅ Confirmar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: Cámara para tomar foto */}
      {mostrarCamara && createPortal(
        <div className="modal-overlay modal-camara" onClick={detenerCamara}>
          <div className="modal-content modal-camara-content" onClick={(e) => e.stopPropagation()}>
            <h3>Tomar Foto del Comprobante</h3>
            
            <div className="camara-container">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="video-camara"
              />
            </div>

            <div className="camara-acciones">
              <button
                className="btn-cancelar-foto"
                onClick={detenerCamara}
              >
                ❌ Cancelar
              </button>
              <button
                className="btn-capturar-foto"
                onClick={capturarFoto}
              >
                📸 Capturar Foto
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: Lista de combos (ver, editar, eliminar, nuevo) */}
      {mostrarModalListaCombos && createPortal(
        <div className="modal-overlay" onClick={() => setMostrarModalListaCombos(false)}>
          <div className="modal-content modal-lista-combos" onClick={(e) => e.stopPropagation()}>
            <h3>🎁 Combos</h3>
            <p className="combo-ayuda">Gestioná los combos. Podés editarlos, eliminarlos o agregar uno nuevo.</p>
            <div className="combos-lista-cards">
              {combosExistentes.length === 0 ? (
                <p className="combos-sin-items">No hay combos. Creá uno con el botón de abajo.</p>
              ) : (
                combosExistentes.map(combo => (
                  <div key={combo.id} className="combo-lista-card">
                    <div className="combo-lista-info">
                      <span className="combo-lista-nombre">{combo.nombre}</span>
                      <span className="combo-lista-precio">${Number(combo.precioCombo ?? combo.precio ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="combo-lista-actions">
                      <button
                        type="button"
                        className="btn-combo-editar"
                        onClick={() => abrirFormularioEditarCombo(combo)}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="btn-combo-eliminar"
                        onClick={() => setConfirmarEliminarCombo(combo)}
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="modal-lista-combos-footer">
              <button type="button" className="btn-cancelar" onClick={() => setMostrarModalListaCombos(false)}>
                Cerrar
              </button>
              <button type="button" className="btn-guardar" onClick={abrirFormularioNuevoCombo}>
                ➕ Nuevo combo
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: Confirmar eliminar combo */}
      {confirmarEliminarCombo && createPortal(
        <div className="modal-overlay" onClick={() => setConfirmarEliminarCombo(null)}>
          <div className="modal-content modal-confirmar" onClick={(e) => e.stopPropagation()}>
            <h3>Eliminar combo</h3>
            <p className="modal-confirmar-texto">
              ¿Eliminar el combo <strong>{confirmarEliminarCombo.nombre}</strong>?
            </p>
            <div className="modal-confirmar-actions">
              <button type="button" className="btn-cancelar" onClick={() => setConfirmarEliminarCombo(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn-confirmar-accion btn-eliminar"
                onClick={() => {
                  eliminarProducto(confirmarEliminarCombo.id);
                  setConfirmarEliminarCombo(null);
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: Crear / Editar Combo */}
      {mostrarModalCombo && createPortal(
        <div className="modal-overlay" onClick={() => { setComboProductoParaUnidad(null); setComboEditando(null); setMostrarModalCombo(false); setComboData({ nombre: '', itemsCombo: [], precioCombo: '' }); setMostrarModalListaCombos(true); }}>
          <div className="modal-content modal-combo" onClick={(e) => e.stopPropagation()}>
            <h3>{comboEditando ? 'Editar Combo' : 'Crear Combo'}</h3>
            <p className="combo-ayuda">Podés elegir la misma unidad varias veces. El combo quedará en la lista de productos.</p>
            <form onSubmit={guardarComboComoProducto}>
              <div className="form-group">
                <label>Nombre del Combo *</label>
                <input
                  type="text"
                  value={comboData.nombre}
                  onChange={(e) => setComboData({ ...comboData, nombre: e.target.value })}
                  placeholder="Ej: Combo Familiar, Combo Promo..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Productos del combo (tocá el cuadro para sumar) *</label>
                <div className="combo-productos-grid">
                  {productos.filter(p => !p.esCombo && p.puestoId != null).map(producto => {
                    const tieneVariantes = Array.isArray(producto.unidadesVenta) && producto.unidadesVenta.length > 1;
                    const totalEnCombo = getTotalEnCombo(producto.id);
                    const itemsProducto = getItemsComboPorProducto(producto.id);
                    return (
                      <div
                        key={producto.id}
                        role="button"
                        tabIndex={0}
                        className="combo-producto-card"
                        onClick={() => {
                          if (tieneVariantes) setComboProductoParaUnidad(producto);
                          else sumarAlCombo(producto.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (tieneVariantes) setComboProductoParaUnidad(producto);
                            else sumarAlCombo(producto.id);
                          }
                        }}
                      >
                        <div className="combo-card-icono">
                          {producto.imagenUrl ? (
                            <img src={producto.imagenUrl} alt={producto.nombre} className="combo-card-imagen" />
                          ) : (
                            <span className="combo-card-emoji">{producto.icono || '📦'}</span>
                          )}
                          {totalEnCombo > 0 && (
                            <span className="combo-card-badge">{totalEnCombo}</span>
                          )}
                        </div>
                        <div className="combo-card-info">
                          <span className="combo-card-nombre">{producto.nombre}</span>
                          {tieneVariantes ? (
                            <span className="combo-card-precio" title={ordenUnidadesVenta(producto.unidadesVenta).map(u => u.nombre).join(' / ')}>
                              {ordenUnidadesVenta(producto.unidadesVenta).map(u => u.nombre).join(' / ') || 'Varios'}
                            </span>
                          ) : (
                            <span className="combo-card-precio">${producto.precio}</span>
                          )}
                          {itemsProducto.length > 0 && (
                            <div className="combo-card-desglose">
                              {itemsProducto.map(it => {
                                const u = producto.unidadesVenta?.find(uv => uv.id === it.unidadVentaId);
                                const nombreUnidad = u?.nombre || it.unidadVentaId || 'Unidad';
                                return (
                                  <span key={it.unidadVentaId || 'u'} className="combo-desglose-item">
                                    {it.cantidad} {nombreUnidad}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        {totalEnCombo > 0 && (
                          <button
                            type="button"
                            className="combo-card-restar"
                            onClick={(e) => {
                              e.stopPropagation();
                              restarDelCombo(producto.id);
                            }}
                            title="Restar uno"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {comboProductoParaUnidad && createPortal(
                  <div className="modal-overlay modal-combo-unidad" onClick={() => setComboProductoParaUnidad(null)}>
                    <div className="modal-content modal-unidad" onClick={(e) => e.stopPropagation()}>
                      <h3>Elegí unidad</h3>
                      <p className="modal-unidad-producto">{comboProductoParaUnidad.nombre}</p>
                      <div className="modal-unidad-opciones">
                        {ordenUnidadesVenta(comboProductoParaUnidad.unidadesVenta).map(u => (
                          <button
                            key={u.id}
                            type="button"
                            className="modal-unidad-btn modal-unidad-btn-cuadrado"
                            onClick={() => {
                              sumarAlCombo(comboProductoParaUnidad.id, u.id);
                              setComboProductoParaUnidad(null);
                            }}
                          >
                            {getNumeroUnidad(u.id) ? (
                              <>
                                <span className="modal-unidad-numero" aria-hidden>{getNumeroUnidad(u.id)}</span>
                                <span className="modal-unidad-icon modal-unidad-icon-empanada" aria-hidden>{getIconoEmpanada(u.id)}</span>
                              </>
                            ) : (
                              <span className="modal-unidad-icon" aria-hidden>{getIconoUnidad(u.id)}</span>
                            )}
                            <span className="modal-unidad-nombre">{u.nombre}</span>
                            <span className="modal-unidad-precio">${Number(u.precio).toFixed(2)}</span>
                          </button>
                        ))}
                      </div>
                      <button type="button" className="btn-cancelar" onClick={() => setComboProductoParaUnidad(null)}>
                        Cancelar
                      </button>
                    </div>
                  </div>,
                  document.body
                )}
                {comboData.itemsCombo.filter(i => i.cantidad > 0).length === 0 && (
                  <small className="error-message">Agregá al menos un producto (tocá el cuadro)</small>
                )}
              </div>

              <div className="form-group">
                <label>Precio del Combo *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={comboData.precioCombo}
                  onChange={(e) => setComboData({ ...comboData, precioCombo: e.target.value })}
                  placeholder="0.00"
                  required
                />
                <small>Precio de venta del combo (puede ser menor que la suma de los productos)</small>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={() => {
                    setComboProductoParaUnidad(null);
                    setComboEditando(null);
                    setMostrarModalCombo(false);
                    setComboData({ nombre: '', itemsCombo: [], precioCombo: '' });
                    setMostrarModalListaCombos(true);
                  }}
                >
                  Volver
                </button>
                <button
                  type="submit"
                  className="btn-guardar"
                  disabled={comboData.itemsCombo.filter(i => i.cantidad > 0).length === 0}
                >
                  {comboEditando ? 'Guardar cambios' : 'Crear combo y agregar a la lista'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Ventas;

