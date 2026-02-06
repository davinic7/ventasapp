import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { initRealtimeSync, emitSyncEvent, subscribeToSync } from '../utils/realtimeSync';

const VentasContext = createContext();

export const useVentas = () => {
  const context = useContext(VentasContext);
  if (!context) {
    throw new Error('useVentas debe usarse dentro de VentasProvider');
  }
  return context;
};

export const VentasProvider = ({ children }) => {
  // Inicializar sincronización en tiempo real
  const syncInitialized = useRef(false);
  const isUpdatingFromSync = useRef(false);

  useEffect(() => {
    if (!syncInitialized.current) {
      initRealtimeSync();
      syncInitialized.current = true;
    }
  }, []);

  // Funciones para localStorage
  const loadFromStorage = (key, defaultValue) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error al cargar ${key} del localStorage:`, error);
      return defaultValue;
    }
  };

  const saveToStorage = (key, value, emitEvent = true) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      
      // Emitir evento de sincronización si no viene de otro dispositivo
      if (emitEvent && !isUpdatingFromSync.current) {
        emitSyncEvent(`${key}_actualizado`, value);
      }
    } catch (error) {
      console.error(`Error al guardar ${key} en localStorage:`, error);
    }
  };

  // Estados principales
  const [puestos, setPuestos] = useState(() => 
    loadFromStorage('puestos', [])
  );
  const [productos, setProductos] = useState(() => 
    loadFromStorage('productos', [])
  );
  const [pedidos, setPedidos] = useState(() => 
    loadFromStorage('pedidos', [])
  );
  const [ventas, setVentas] = useState(() => {
    const loaded = loadFromStorage('ventas', []);
    return Array.isArray(loaded) ? loaded : [];
  });

  // Guardar en localStorage cuando cambien los datos
  useEffect(() => {
    saveToStorage('puestos', puestos);
  }, [puestos]);

  useEffect(() => {
    saveToStorage('productos', productos);
  }, [productos]);

  useEffect(() => {
    saveToStorage('pedidos', pedidos);
  }, [pedidos]);

  useEffect(() => {
    saveToStorage('ventas', ventas);
  }, [ventas]);

  // Sincronización en tiempo real: escuchar cambios de otros dispositivos
  useEffect(() => {
    const unsubscribe = subscribeToSync((event) => {
      if (isUpdatingFromSync.current) return;

      isUpdatingFromSync.current = true;

      try {
        if (event.type === 'pedidos_actualizado') {
          setPedidos(event.data);
        } else if (event.type === 'ventas_actualizado') {
          setVentas(event.data);
        } else if (event.type === 'productos_actualizado') {
          setProductos(event.data);
        } else if (event.type === 'puestos_actualizado') {
          setPuestos(event.data);
        } else if (event.type === 'pedido_actualizado') {
          // Actualización específica de un pedido
          setPedidos(prev => {
            const index = prev.findIndex(p => p.id === event.data.id);
            if (index >= 0) {
              const nuevos = [...prev];
              nuevos[index] = event.data;
              return nuevos;
            }
            return prev;
          });
        } else if (event.type === 'nuevo_pedido') {
          // Nuevo pedido creado
          setPedidos(prev => [...prev, event.data]);
        } else if (event.type === 'venta_registrada') {
          // Nueva venta registrada
          setVentas(prev => {
            const prevArray = Array.isArray(prev) ? prev : [];
            return [...prevArray, event.data];
          });
        }
      } catch (error) {
        console.error('Error procesando evento de sincronización:', error);
      } finally {
        setTimeout(() => {
          isUpdatingFromSync.current = false;
        }, 100);
      }
    });

    return unsubscribe;
  }, []);

  // ========== GESTIÓN DE PUESTOS ==========
  /**
   * Crea un nuevo puesto con avatar
   * @param {String} nombre - Nombre del puesto
   * @param {String} avatar - Emoji/icono del puesto (opcional, default: 👨‍🍳)
   */
  const crearPuesto = (nombre, avatar = '👨‍🍳') => {
    const nuevoPuesto = {
      id: Date.now().toString(),
      nombre: nombre.trim(),
      avatar: avatar || '👨‍🍳',
      fechaCreacion: new Date().toISOString()
    };
    setPuestos([...puestos, nuevoPuesto]);
    return nuevoPuesto;
  };

  /**
   * Actualiza un puesto (puede ser nombre, avatar, etc.)
   */
  const actualizarPuesto = (id, datosActualizados) => {
    setPuestos(puestos.map(p => 
      p.id === id ? { ...p, ...datosActualizados } : p
    ));
  };

  const eliminarPuesto = (id) => {
    // Verificar que no haya productos asignados a este puesto
    const productosAsignados = productos.filter(p => p.puestoId === id);
    if (productosAsignados.length > 0) {
      throw new Error('No se puede eliminar el puesto porque tiene productos asignados');
    }
    setPuestos(puestos.filter(p => p.id !== id));
  };

  // ========== GESTIÓN DE PRODUCTOS ==========
  const agregarProducto = (producto) => {
    const nuevoProducto = {
      id: Date.now().toString(),
      nombre: producto.nombre.trim(),
      categoria: producto.categoria || 'Otros',
      precio: parseFloat(producto.precio) || 0,
      stock: parseFloat(producto.stock) >= 0 ? parseFloat(producto.stock) : 0,
      puestoId: producto.puestoId || null,
      descripcion: producto.descripcion || '',
      icono: producto.icono || '📦',
      imagenUrl: producto.imagenUrl || null,
      esCombo: producto.esCombo || false,
      productosCombo: producto.productosCombo || [],
      precioCombo: producto.precioCombo || null,
      unidadBase: producto.unidadBase || 'unidad',
      unidadesVenta: Array.isArray(producto.unidadesVenta) && producto.unidadesVenta.length > 0
        ? producto.unidadesVenta
        : null,
      fechaCreacion: new Date().toISOString()
    };
    setProductos([...productos, nuevoProducto]);
    return nuevoProducto;
  };

  const actualizarProducto = (id, datosActualizados) => {
    setProductos(productos.map(p => 
      p.id === id ? { 
        ...p, 
        ...datosActualizados,
        precio: datosActualizados.precio !== undefined ? parseFloat(datosActualizados.precio) : p.precio,
        stock: datosActualizados.stock !== undefined
          ? (parseFloat(datosActualizados.stock) >= 0 ? parseFloat(datosActualizados.stock) : p.stock)
          : p.stock,
        unidadesVenta: datosActualizados.unidadesVenta !== undefined ? datosActualizados.unidadesVenta : p.unidadesVenta,
        unidadBase: datosActualizados.unidadBase !== undefined ? datosActualizados.unidadBase : p.unidadBase
      } : p
    ));
  };

  const actualizarStock = (id, cantidad) => {
    const idStr = id == null ? '' : String(id);
    const delta = Number(cantidad);
    setProductos(prev => prev.map(p => 
      String(p.id) === idStr ? { ...p, stock: Math.max(0, (Number(p.stock) || 0) + delta) } : p
    ));
  };

  const eliminarProducto = (id) => {
    setProductos(productos.filter(p => p.id !== id));
  };

  const asignarProductoAPuesto = (productoId, puestoId) => {
    actualizarProducto(productoId, { puestoId: puestoId || null });
  };

  /**
   * Normaliza productosCombo a array de { productoId, cantidad, unidadVentaId? }.
   * Acepta formato legacy [id, id, id] o nuevo [{ productoId, cantidad, unidadVentaId? }, ...].
   */
  const normalizarProductosCombo = (productosCombo) => {
    if (!Array.isArray(productosCombo) || productosCombo.length === 0) return [];
    const primer = productosCombo[0];
    const esNuevoFormato = primer && typeof primer === 'object' && 'productoId' in primer;
    if (esNuevoFormato) {
      return productosCombo.map(({ productoId, cantidad, unidadVentaId }) => ({
        productoId: productoId != null ? String(productoId) : '',
        cantidad: Number(cantidad) || 1,
        unidadVentaId: unidadVentaId != null && unidadVentaId !== '' ? String(unidadVentaId) : undefined
      })).filter(i => i.productoId);
    }
    const counts = {};
    productosCombo.forEach(id => {
      const key = id != null ? String(id) : '';
      if (key) counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([productoId, cantidad]) => ({ productoId, cantidad }));
  };

  /** Para un componente de combo: unidades a descontar del stock (0 si es vaso/sin descuento automático) */
  const factorComboComponente = (productoId, unidadVentaId) => {
    const p = productos.find(pr => String(pr.id) === String(productoId));
    if (!p) return 1;
    if (!unidadVentaId) return 1;
    const u = p.unidadesVenta?.find(un => un.id === unidadVentaId);
    if (!u || u.descuentoAutomatico === false) return 0;
    return u.factor != null ? u.factor : 1;
  };

  /**
   * Cuántas unidades de un combo se pueden vender con el stock actual de sus componentes.
   * Componentes tipo vaso (descuento no automático) no limitan.
   */
  const cuantasVecesSePuedeVenderCombo = (producto) => {
    if (!producto?.esCombo || !Array.isArray(producto.productosCombo) || producto.productosCombo.length === 0) return 0;
    const items = normalizarProductosCombo(producto.productosCombo);
    let min = Infinity;
    for (const { productoId, cantidad, unidadVentaId } of items) {
      const p = productos.find(pr => String(pr.id) === String(productoId));
      if (!p || cantidad <= 0 || p.puestoId == null) return 0;
      const factor = factorComboComponente(productoId, unidadVentaId);
      if (factor === 0) continue; // vaso: no limita
      const aDescontar = cantidad * factor;
      const disponibles = Math.floor((Number(p.stock) || 0) / aDescontar);
      if (disponibles < min) min = disponibles;
    }
    return min === Infinity ? 0 : min;
  };

  /** True si todos los componentes del combo tienen puesto asignado. */
  const comboComponentesConPuesto = (producto) => {
    if (!producto?.esCombo || !Array.isArray(producto.productosCombo)) return false;
    const items = normalizarProductosCombo(producto.productosCombo);
    return items.every(({ productoId }) => {
      const p = productos.find(pr => String(pr.id) === String(productoId));
      return p && p.puestoId != null;
    });
  };

  // Productos disponibles: con puesto asignado y stock (o con unidad sin descuento automático, ej. vaso)
  const obtenerProductosDisponibles = () => {
    return productos.filter(p => {
      if (p.esCombo) return comboComponentesConPuesto(p) && cuantasVecesSePuedeVenderCombo(p) >= 1;
      if (p.puestoId == null) return false;
      const uv = p.unidadesVenta;
      const puedeVenderSinStock = Array.isArray(uv) && uv.some(u => u.descuentoAutomatico === false);
      return (Number(p.stock) || 0) > 0 || puedeVenderSinStock;
    });
  };

  /** Descuenta stock de los componentes de un combo al vender N unidades. Respeta unidad (vaso no descuenta). */
  const descontarStockCombo = (productoIdCombo, cantidadVendida) => {
    const combo = productos.find(p => String(p.id) === String(productoIdCombo) && p.esCombo);
    if (!combo) return;
    const items = normalizarProductosCombo(combo.productosCombo || []);
    const restarPorId = {};
    items.forEach(({ productoId, cantidad, unidadVentaId }) => {
      const factor = factorComboComponente(productoId, unidadVentaId);
      if (factor === 0) return;
      const idStr = String(productoId);
      const qty = (Number(cantidad) || 1) * cantidadVendida * factor;
      restarPorId[idStr] = (restarPorId[idStr] || 0) + qty;
    });
    setProductos(prev => prev.map(p => {
      const delta = restarPorId[String(p.id)];
      if (delta == null) return p;
      return { ...p, stock: Math.max(0, (Number(p.stock) || 0) - delta) };
    }));
  };

  /** Devuelve al stock los componentes de un combo. Respeta unidad (vaso no suma). */
  const devolverStockCombo = (productoIdCombo, cantidad) => {
    const combo = productos.find(p => String(p.id) === String(productoIdCombo) && p.esCombo);
    if (!combo) return;
    const items = normalizarProductosCombo(combo.productosCombo || []);
    const sumarPorId = {};
    items.forEach(({ productoId, cantidad: c, unidadVentaId }) => {
      const factor = factorComboComponente(productoId, unidadVentaId);
      if (factor === 0) return;
      const idStr = String(productoId);
      const qty = (Number(c) || 1) * cantidad * factor;
      sumarPorId[idStr] = (sumarPorId[idStr] || 0) + qty;
    });
    setProductos(prev => prev.map(p => {
      const delta = sumarPorId[String(p.id)];
      if (delta == null) return p;
      return { ...p, stock: Math.max(0, (Number(p.stock) || 0) + delta) };
    }));
  };

  // Obtener productos de un puesto específico
  const obtenerProductosPorPuesto = (puestoId) => {
    return productos.filter(p => p.puestoId === puestoId);
  };

  // ========== GESTIÓN DE PEDIDOS ==========
  /**
   * Crea un nuevo pedido
   * Los items se dividen automáticamente por puesto según el puestoId del producto
   * @param {Array} items - Array de productos del pedido
   * @param {String} cliente - Nombre del cliente (obligatorio)
   * @param {String} metodoPago - Método de pago (efectivo/transferencia)
   * @param {String} comprobanteUrl - URL de la foto del comprobante (si es transferencia)
   */
  const crearPedido = (items, cliente, metodoPago = 'efectivo', comprobanteUrl = null) => {
    // Items del pedido (para total y vista general); combos no llevan puestoId
    const itemsConPuesto = items.map(item => {
      const producto = productos.find(p => p.id === item.productoId);
      return {
        ...item,
        subtotal: item.precio * item.cantidad,
        puestoId: producto?.esCombo ? null : (producto?.puestoId ?? null)
      };
    });

    // Agrupar por puesto: productos normales van a su puesto; combos se reparten por puesto de cada componente
    const itemsPorPuesto = {};
    const agregarAPuesto = (puestoId, entry) => {
      if (!puestoId) return;
      if (!itemsPorPuesto[puestoId]) itemsPorPuesto[puestoId] = [];
      itemsPorPuesto[puestoId].push(entry);
    };

    items.forEach(item => {
      const producto = productos.find(p => p.id === item.productoId);
      if (!producto) return;

      if (!producto.esCombo) {
        if (!producto.puestoId) return;
        agregarAPuesto(producto.puestoId, {
          ...item,
          subtotal: item.precio * item.cantidad,
          puestoId: producto.puestoId
        });
        return;
      }

      // Combo: repartir en los puestos de cada producto que lo compone (con unidad si aplica: vaso/botella, docena)
      const componentes = normalizarProductosCombo(producto.productosCombo || []);
      componentes.forEach(({ productoId, cantidad, unidadVentaId }) => {
        const comp = productos.find(p => String(p.id) === String(productoId));
        if (!comp || !comp.puestoId) return;
        const qty = cantidad * item.cantidad;
        const nombreUnidad = comp.unidadesVenta?.find(u => u.id === unidadVentaId)?.nombre;
        const nombreConUnidad = (unidadVentaId && nombreUnidad) ? `${comp.nombre} (${nombreUnidad})` : comp.nombre;
        agregarAPuesto(comp.puestoId, {
          productoId: comp.id,
          nombre: nombreConUnidad,
          cantidad: qty,
          subtotal: (comp.precio || 0) * qty,
          esParteDeCombo: true,
          nombreCombo: item.nombre,
          ...(unidadVentaId != null && unidadVentaId !== '' ? { unidadVentaId } : {})
        });
      });
    });

    // Estados por puesto
    const estadosPorPuesto = {};
    Object.keys(itemsPorPuesto).forEach(puestoId => {
      estadosPorPuesto[puestoId] = 'pendiente';
    });

    const totalCalculado = items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const totalPedido = (metodoPago === 'hijo_comunidad') ? 0 : totalCalculado;

    const nuevoPedido = {
      id: Date.now().toString(),
      numero: pedidos.length + 1,
      items: itemsConPuesto, // Todos los items con su puestoId
      itemsPorPuesto: itemsPorPuesto, // Items agrupados por puesto
      estadosPorPuesto: estadosPorPuesto, // Estado de cada puesto
      cliente: cliente.trim(),
      estado: 'pendiente', // Estado general del pedido
      total: totalPedido, // 0 si es "Hijo de la comunidad"
      metodoPago: metodoPago || 'efectivo',
      comprobanteUrl: comprobanteUrl,
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString()
    };
    setPedidos([...pedidos, nuevoPedido]);
    return nuevoPedido;
  };

  /**
   * Actualiza el estado de un pedido
   * Si se proporciona puestoId, actualiza el estado de ese puesto específico
   * Si todos los puestos están listos, el pedido completo pasa a "listo"
   */
  const actualizarEstadoPedido = (id, nuevoEstado, puestoId = null) => {
    let pedidoActualizado = null;
    
    setPedidos(pedidos.map(p => {
      if (p.id !== id) return p;

      let nuevoPedido = { ...p };
      
      // Si se especifica un puesto, actualizar solo ese puesto
      if (puestoId && p.estadosPorPuesto) {
        nuevoPedido = {
          ...p,
          estadosPorPuesto: {
            ...p.estadosPorPuesto,
            [puestoId]: nuevoEstado
          },
          fechaActualizacion: new Date().toISOString()
        };

        // Verificar si todos los puestos están listos
        const todosListos = Object.values(nuevoPedido.estadosPorPuesto).every(
          estado => estado === 'listo'
        );
        
        if (todosListos) {
          nuevoPedido.estado = 'listo';
        } else if (nuevoEstado === 'en_elaboracion') {
          // Si algún puesto pasa a elaboración, el pedido general también
          nuevoPedido.estado = 'en_elaboracion';
        }
      } else {
        // Actualizar estado general del pedido
        nuevoPedido = {
          ...p,
          estado: nuevoEstado,
          fechaActualizacion: new Date().toISOString()
        };
      }

      pedidoActualizado = nuevoPedido;
      return nuevoPedido;
    }));
    
    // Emitir evento de sincronización después de actualizar
    if (!isUpdatingFromSync.current && pedidoActualizado) {
      emitSyncEvent('pedido_actualizado', pedidoActualizado);
    }
  };

  /**
   * Obtiene los items de un pedido filtrados por puesto
   */
  const obtenerItemsPorPuesto = (pedido, puestoId) => {
    if (!pedido.itemsPorPuesto || !puestoId) return [];
    return pedido.itemsPorPuesto[puestoId] || [];
  };

  /**
   * Obtiene el estado de un puesto específico en un pedido
   */
  const obtenerEstadoPuesto = (pedido, puestoId) => {
    if (!pedido.estadosPorPuesto || !puestoId) return 'pendiente';
    return pedido.estadosPorPuesto[puestoId] || 'pendiente';
  };

  const eliminarPedido = (id) => {
    setPedidos(pedidos.filter(p => p.id !== id));
  };

  // Obtener pedidos por estado
  const obtenerPedidosPorEstado = (estado) => {
    return pedidos.filter(p => p.estado === estado);
  };

  /**
   * Obtiene pedidos que tienen items asignados a un puesto específico
   * Filtra pedidos que tienen al menos un item para ese puesto
   */
  const obtenerPedidosPorPuesto = (puestoId) => {
    return pedidos.filter(p => {
      if (!p.itemsPorPuesto) return false;
      return p.itemsPorPuesto[puestoId] && p.itemsPorPuesto[puestoId].length > 0;
    });
  };

  // ========== GESTIÓN DE VENTAS ==========
  const registrarVenta = (pedidoId, metodoPago, comprobanteUrl = null) => {
    // Emitir evento antes de registrar
    if (!isUpdatingFromSync.current) {
      emitSyncEvent('venta_registrada', { pedidoId, metodoPago });
    }
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (!pedido) return null;

    const venta = {
      id: Date.now().toString(),
      pedidoId: pedidoId,
      numeroPedido: pedido.numero || 0,
      items: Array.isArray(pedido.items) ? pedido.items : [],
      cliente: pedido.cliente || 'Sin nombre',
      total: pedido.total || 0,
      metodoPago: metodoPago || pedido.metodoPago || 'efectivo',
      comprobanteUrl: comprobanteUrl,
      fecha: new Date().toISOString(),
      fechaVenta: new Date().toLocaleDateString('es-AR')
    };

    setVentas([...ventas, venta]);

    // Emitir evento de venta registrada
    if (!isUpdatingFromSync.current) {
      emitSyncEvent('venta_registrada', venta);
    }

    // El stock ya se descontó al agregar productos al pedido en Ventas; no volver a descontar.

    // Marcar pedido como entregado
    actualizarEstadoPedido(pedidoId, 'entregado');

    return venta;
  };

  // Obtener ventas del día
  const obtenerVentasDelDia = () => {
    if (!ventas || !Array.isArray(ventas)) return [];
    const hoy = new Date().toLocaleDateString('es-AR');
    return ventas.filter(v => v && v.fechaVenta === hoy);
  };

  // Obtener total de ventas del día
  const obtenerTotalVentasDelDia = () => {
    const ventasHoy = obtenerVentasDelDia();
    if (!ventasHoy || ventasHoy.length === 0) return 0;
    return ventasHoy.reduce((sum, v) => sum + (v?.total || 0), 0);
  };

  // Obtener ventas por método de pago
  const obtenerVentasPorMetodoPago = (metodo) => {
    if (!ventas || !Array.isArray(ventas)) return [];
    return ventas.filter(v => v && v.metodoPago === metodo);
  };

  // ========== REINICIO DEL SISTEMA ==========
  const reiniciarSistema = () => {
    setPedidos([]);
    setVentas([]);
  };

  const reiniciarTodo = () => {
    setPuestos([]);
    setProductos([]);
    setPedidos([]);
    setVentas([]);
  };

  const value = {
    // Estados
    puestos,
    productos,
    pedidos,
    ventas,
    
    // Puestos
    crearPuesto,
    actualizarPuesto,
    eliminarPuesto,
    
    // Productos
    agregarProducto,
    actualizarProducto,
    actualizarStock,
    eliminarProducto,
    asignarProductoAPuesto,
    obtenerProductosDisponibles,
    obtenerProductosPorPuesto,
    cuantasVecesSePuedeVenderCombo,
    descontarStockCombo,
    devolverStockCombo,
    
    // Pedidos
    crearPedido,
    actualizarEstadoPedido,
    eliminarPedido,
    obtenerPedidosPorEstado,
    obtenerPedidosPorPuesto,
    obtenerItemsPorPuesto,
    obtenerEstadoPuesto,
    
    // Ventas
    registrarVenta,
    obtenerVentasDelDia,
    obtenerTotalVentasDelDia,
    obtenerVentasPorMetodoPago,
    
    // Sistema
    reiniciarSistema,
    reiniciarTodo
  };

  return (
    <VentasContext.Provider value={value}>
      {children}
    </VentasContext.Provider>
  );
};

