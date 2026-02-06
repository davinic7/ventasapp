import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useVentas } from '../context/VentasContext';
import './Pedidos.css';

/**
 * COMPONENTE: Pedidos
 * 
 * FUNCIONALIDADES:
 * - Vista Kanban con estados: Pendiente → Elaboración → Listo
 * - Crear puestos de elaboración con nombre personalizado
 * - Asignar productos del stock disponible a cada puesto
 * - Filtrar pedidos por puesto
 * - Cambiar estado de pedidos
 * - Asignar pedidos a puestos cuando pasan a "en_elaboracion"
 * - Botón de historial para revisar pedidos anteriores
 * 
 * FLUJO:
 * 1. Crear puestos desde el botón "Nuevo Puesto"
 * 2. Asignar productos a puestos (seleccionar del stock disponible)
 * 3. Ver pedidos en columnas según su estado
 * 4. Mover pedidos entre estados (Pendiente → Elaboración → Listo)
 * 5. Al pasar a "Elaboración", asignar a un puesto
 * 6. Cuando está "Listo", se comunica automáticamente a DESPACHO
 */
const Pedidos = ({ onVolver }) => {
  const { 
    puestos, 
    productos, 
    pedidos,
    obtenerPedidosPorEstado,
    obtenerPedidosPorPuesto,
    obtenerItemsPorPuesto,
    obtenerEstadoPuesto,
    actualizarEstadoPedido,
    actualizarStock
  } = useVentas();

  const [puestoSeleccionado, setPuestoSeleccionado] = useState(null);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [mostrarHistorialGeneral, setMostrarHistorialGeneral] = useState(false);
  const [mostrarSelectorPuestoInicial, setMostrarSelectorPuestoInicial] = useState(true);
  /** Líneas donde ya se usó "Descontar 1 botella" (key: pedidoId-index) para ocultar el botón solo en esa línea */
  const [botellaDescontadaPorLinea, setBotellaDescontadaPorLinea] = useState({});
  /** Modal confirmar descontar botella: { pedidoId, idx, item } */
  const [confirmarDescontarBotella, setConfirmarDescontarBotella] = useState(null);

  /**
   * Obtiene la COLA de pedidos para el puesto seleccionado.
   * - Siempre filtrando por el puesto seleccionado.
   * - Excluye pedidos "listos" (van a DESPACHO).
   * - Mantiene orden FIFO por número de pedido, independientemente del estado.
   */
  const obtenerPedidosEnCola = () => {
    if (!puestoSeleccionado) return [];

    let pedidosFiltrados = [...pedidos];

    // Filtrar por puesto seleccionado (que tenga items para ese puesto)
    pedidosFiltrados = pedidosFiltrados.filter(pedido => {
      const itemsDelPuesto = obtenerItemsPorPuesto(pedido, puestoSeleccionado);
      return itemsDelPuesto.length > 0;
    });

    // Excluir pedidos que están completamente listos (van a DESPACHO)
    pedidosFiltrados = pedidosFiltrados.filter(pedido => {
      const estadoPuesto = obtenerEstadoPuesto(pedido, puestoSeleccionado);
      return estadoPuesto !== 'listo';
    });

    // Ordenar por número de pedido (más antiguos primero → cola FIFO)
    pedidosFiltrados.sort((a, b) => a.numero - b.numero);

    return pedidosFiltrados;
  };

  const pedidosEnCola = obtenerPedidosEnCola();


  /**
   * Mueve los items de un pedido (de un puesto específico) al siguiente estado
   */
  const moverItemsPuesto = (pedidoId, nuevoEstado) => {
    if (!puestoSeleccionado) {
      return;
    }

    const pedido = pedidos.find(p => p.id === pedidoId);
    if (!pedido) return;

    // Verificar que el pedido tenga items para este puesto
    const itemsDelPuesto = obtenerItemsPorPuesto(pedido, puestoSeleccionado);
    if (itemsDelPuesto.length === 0) {
      return;
    }

    // Actualizar el estado del puesto específico
    actualizarEstadoPedido(pedidoId, nuevoEstado, puestoSeleccionado);
  };

  /**
   * Renderiza una tarjeta de pedido simplificada: número, cliente y un solo botón de estado.
   */
  const renderPedido = (pedido) => {
    if (!puestoSeleccionado) return null;

    const itemsAMostrar = obtenerItemsPorPuesto(pedido, puestoSeleccionado);
    const estadoPuesto = obtenerEstadoPuesto(pedido, puestoSeleccionado);

    if (itemsAMostrar.length === 0) return null;

    const handleSiguienteEstado = () => {
      if (estadoPuesto === 'pendiente') moverItemsPuesto(pedido.id, 'en_elaboracion');
      else if (estadoPuesto === 'en_elaboracion') moverItemsPuesto(pedido.id, 'listo');
    };

    const esClickeable = estadoPuesto === 'pendiente' || estadoPuesto === 'en_elaboracion';

    return (
      <div key={pedido.id} className="pedido-card-lista">
        <div className="pedido-card-contenido">
          <div className="pedido-numero-cliente">
            <h4>Pedido #{pedido.numero}</h4>
            <span className="pedido-cliente">{pedido.cliente}</span>
          </div>
          <ul className="pedido-items-resumen">
            {itemsAMostrar.map((item, idx) => {
              const producto = productos.find(p => String(p.id) === String(item.productoId));
              const unidadVenta = producto?.unidadesVenta?.find(u => u.id === item.unidadVentaId);
              const esVasoSinDescontar = item.unidadVentaId && unidadVenta?.descuentoAutomatico === false;
              const lineaKey = `${pedido.id}-${idx}`;
              const yaDescontado = botellaDescontadaPorLinea[lineaKey];
              const mostrarBtnDescontarBotella = esVasoSinDescontar && !yaDescontado;
              return (
                <li key={idx} className="pedido-item-row">
                  <span className="item-cantidad">{item.cantidad}×</span>
                  <span className="item-nombre">
                    {item.nombre}
                    {item.esParteDeCombo && item.nombreCombo && (
                      <span className="item-combo-badge"> ({item.nombreCombo})</span>
                    )}
                  </span>
                  {mostrarBtnDescontarBotella && (
                    <button
                      type="button"
                      className="btn-descontar-botella"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmarDescontarBotella({ pedidoId: pedido.id, idx, item });
                      }}
                      title="Descontar 1 botella del stock"
                    >
                      🍾 −1
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        {esClickeable ? (
          <button
            type="button"
            className={`btn-estado-unico ${estadoPuesto === 'pendiente' ? 'btn-estado-pendiente' : 'btn-estado-elaboracion'}`}
            onClick={handleSiguienteEstado}
          >
            {estadoPuesto === 'pendiente' ? '▶️ Iniciar' : '✅ Marcar listo'}
          </button>
        ) : (
          <span className="estado-finalizado">✅ Listo</span>
        )}
      </div>
    );
  };

  const hayPuestos = puestos.length > 0;

  return (
    <div className="pedidos-container">
      {onVolver && (
        <header className="pedidos-header-row">
          <button type="button" className="btn-volver-inline" onClick={onVolver}>
            ← Menú
          </button>
          <h1 className="pedidos-titulo">📝 PEDIDOS</h1>
          <button
            type="button"
            className="btn-historial-general"
            onClick={() => setMostrarHistorialGeneral(true)}
          >
            📜 Historial general
          </button>
        </header>
      )}
      {hayPuestos && mostrarSelectorPuestoInicial ? (
        <div className="selector-puesto-inicial">
          <h2>👨‍🍳 Selecciona un puesto</h2>
          <p className="selector-puesto-subtitle">
            Elige el puesto que va a gestionar los pedidos en esta vista.
          </p>
          <div className="selector-puesto-grid">
            {puestos.map(puesto => (
              <button
                key={puesto.id}
                type="button"
                className="selector-puesto-card"
                onClick={() => {
                  setPuestoSeleccionado(puesto.id);
                  setMostrarSelectorPuestoInicial(false);
                }}
              >
                <div className="selector-puesto-avatar">
                  {puesto.avatar || '👨‍🍳'}
                </div>
                <div className="selector-puesto-info">
                  <h3>{puesto.nombre}</h3>
                  <span>Ver pedidos asignados a este puesto</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="pedidos-header">
            <div>
              {!onVolver && <h2>📝 PEDIDOS</h2>}
              <p className="pedidos-subtitle">
                Gestiona el flujo de elaboración para el puesto seleccionado
              </p>
              {puestoSeleccionado && (
                <div className="pedidos-puesto-actual">
                  <div className="pedidos-puesto-titulo">
                    <span className="puesto-avatar-grande-header">
                      {puestos.find(p => p.id === puestoSeleccionado)?.avatar || '👨‍🍳'}
                    </span>
                    <span className="puesto-nombre-grande">
                      {puestos.find(p => p.id === puestoSeleccionado)?.nombre}
                    </span>
                  </div>
                  <div className="pedidos-puesto-botones">
                    <button
                      type="button"
                      className="btn-historial-icono"
                      onClick={() => setMostrarHistorial(true)}
                      title={`Historial del puesto ${puestos.find(p => p.id === puestoSeleccionado)?.nombre || ''}`}
                    >
                      📜
                    </button>
                    {hayPuestos && (
                      <button
                        type="button"
                        className="btn-cambiar-puesto-icono"
                        onClick={() => setMostrarSelectorPuestoInicial(true)}
                        title="Cambiar puesto"
                      >
                        🔄
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* FILTRO: Solo por Puesto (opcional) */}
          {!hayPuestos && (
            <div className="pedidos-filtro">
              <p className="sin-puestos">⚠️ Primero debes crear puestos en CONFIGURACIONES → PUESTOS</p>
            </div>
          )}

          {/* VISTA FLUIDA: COLA única de pedidos */}
          <div className="pedidos-lista-container">
            {pedidosEnCola.length > 0 && (
              <div className="pedidos-seccion">
                <div className="seccion-header pendiente">
                  <h3>📥 Cola de pedidos ({pedidosEnCola.length})</h3>
                </div>
                <div className="pedidos-lista-vista">
                  {pedidosEnCola.map(renderPedido).filter(Boolean)}
                </div>
              </div>
            )}

            {/* Sin pedidos en la cola */}
            {pedidosEnCola.length === 0 && (
              <div className="sin-pedidos">
                <p>No hay pedidos pendientes o en elaboración</p>
                <p className="sin-pedidos-info">Los pedidos listos aparecen en DESPACHO</p>
              </div>
            )}
          </div>

          {/* MODAL: Confirmar descontar 1 botella */}
          {confirmarDescontarBotella && createPortal(
            <div
              className="modal-overlay"
              onClick={() => setConfirmarDescontarBotella(null)}
            >
              <div className="modal-content modal-confirmar-botella" onClick={(e) => e.stopPropagation()}>
                <h3>🍾 Descontar botella</h3>
                <p className="modal-confirmar-texto">
                  ¿Descontar 1 botella del stock de <strong>{productos.find(p => String(p.id) === String(confirmarDescontarBotella.item?.productoId))?.nombre || 'este producto'}</strong>?
                </p>
                <div className="modal-confirmar-actions">
                  <button
                    type="button"
                    className="btn-cancelar"
                    onClick={() => setConfirmarDescontarBotella(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn-confirmar-descontar"
                    onClick={() => {
                      const { item, pedidoId, idx } = confirmarDescontarBotella;
                      if (item?.productoId) {
                        actualizarStock(item.productoId, -1);
                        setBotellaDescontadaPorLinea(prev => ({ ...prev, [`${pedidoId}-${idx}`]: true }));
                      }
                      setConfirmarDescontarBotella(null);
                    }}
                  >
                    Descontar
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* MODAL: Historial general (todos) o del puesto */}
          {(mostrarHistorial || mostrarHistorialGeneral) && createPortal(
            <div
              className="modal-overlay"
              onClick={() => { setMostrarHistorial(false); setMostrarHistorialGeneral(false); }}
            >
              <div className="modal-content modal-historial" onClick={(e) => e.stopPropagation()}>
                <h3>
                  {mostrarHistorialGeneral
                    ? 'Historial general'
                    : `Historial (${puestos.find(p => p.id === puestoSeleccionado)?.nombre || 'puesto'})`}
                </h3>
                <div className="historial-lista">
                  {(() => {
                    const esGeneral = mostrarHistorialGeneral;
                    const lista = esGeneral
                      ? pedidos.slice().reverse()
                      : pedidos
                          .filter(p => obtenerItemsPorPuesto(p, puestoSeleccionado).length > 0)
                          .slice()
                          .reverse();
                    if (lista.length === 0) {
                      return <p>{esGeneral ? 'No hay pedidos en el historial' : 'No hay pedidos para este puesto'}</p>;
                    }
                    return lista.map(pedido => {
                      const items = esGeneral
                        ? (pedido.items || [])
                        : obtenerItemsPorPuesto(pedido, puestoSeleccionado);
                      return (
                        <div key={pedido.id} className="historial-item">
                          <strong>Pedido #{pedido.numero}</strong>
                          <p className="historial-cliente">{pedido.cliente}</p>
                          <ul className="historial-items">
                            {items.map((item, idx) => (
                              <li key={idx}>{item.cantidad}× {item.nombre}</li>
                            ))}
                          </ul>
                        </div>
                      );
                    });
                  })()}
                </div>
                <button
                  type="button"
                  className="btn-cerrar"
                  onClick={() => { setMostrarHistorial(false); setMostrarHistorialGeneral(false); }}
                >
                  Cerrar
                </button>
              </div>
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
};

export default Pedidos;


