import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useVentas } from '../context/VentasContext';
import './Despacho.css';

/**
 * COMPONENTE: Despacho
 * 
 * FUNCIONALIDADES:
 * - Muestra pedidos con estado "listo" (recibidos desde PEDIDOS)
 * - Muestra información del cliente y productos del pedido
 * - Muestra método de pago (ya cobrado en VENTAS)
 * - Muestra comprobante si fue transferencia (ya tomado en VENTAS)
 * - Botón "Entregado" que registra la venta y cierra el pedido
 * - Historial de entregas realizadas
 * 
 * NOTA: DESPACHO NO COBRA. El cobro ya se realizó en VENTAS.
 * Solo entrega el pedido y registra la venta.
 * 
 * FLUJO:
 * 1. Recibe pedidos "listos" desde PEDIDOS
 * 2. Muestra tarjeta con: cliente, productos, total, método de pago, comprobante
 * 3. Al marcar "Entregado", se registra la venta (con método de pago y comprobante del pedido)
 * 4. Se descuenta stock y el pedido pasa a estado "entregado"
 */
const Despacho = ({ onVolver }) => {
  const { 
    pedidos, 
    registrarVenta,
    obtenerPedidosPorEstado
  } = useVentas();

  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [pedidoEntregando, setPedidoEntregando] = useState(null);
  const [comprobanteVer, setComprobanteVer] = useState(null);

  // Obtener pedidos listos para entregar
  const pedidosListos = obtenerPedidosPorEstado('listo');
  const pedidosEntregados = obtenerPedidosPorEstado('entregado');

  /**
   * Confirma la entrega del pedido
   * Registra la venta usando el método de pago y comprobante que ya vienen en el pedido
   */
  const confirmarEntrega = () => {
    if (!pedidoEntregando) return;

    // El método de pago y comprobante ya vienen en el pedido (cobrado en VENTAS)
    const metodoPago = pedidoEntregando.metodoPago || 'efectivo';
    const comprobanteUrl = pedidoEntregando.comprobanteUrl || null;
    
    registrarVenta(
      pedidoEntregando.id,
      metodoPago,
      comprobanteUrl
    );

    setPedidoEntregando(null);
  };

  return (
    <div className="despacho-container">
      <header className="despacho-header-row">
        {onVolver && (
          <button type="button" className="btn-volver-inline" onClick={onVolver}>
            ← Menú
          </button>
        )}
        <h1 className="despacho-titulo">📦 DESPACHO</h1>
        <button 
          className="btn-historial"
          onClick={() => setMostrarHistorial(!mostrarHistorial)}
        >
          📜 Historial
        </button>
      </header>

      {/* LISTA DE PEDIDOS LISTOS */}
      {pedidosListos.length === 0 ? (
        <div className="sin-pedidos">
          <p>No hay pedidos listos para entregar</p>
        </div>
      ) : (
        <div className="pedidos-grid">
          {pedidosListos.map(pedido => (
            <div key={pedido.id} className="pedido-despacho-card">
              <div className="pedido-despacho-contenido">
                <span className="pedido-numero-despacho">Pedido #{pedido.numero}</span>
                <p className="pedido-cliente-despacho">{pedido.cliente}</p>
                <ul className="pedido-items-despacho">
                  {pedido.items.map((item, idx) => (
                    <li key={idx}>
                      <span className="item-cantidad">{item.cantidad}×</span>
                      <span className="item-nombre">{item.nombre}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                className="btn-entregar"
                onClick={() => setPedidoEntregando(pedido)}
              >
                ✅ Entregado
              </button>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Confirmar entrega */}
      {pedidoEntregando && createPortal(
        <div className="modal-overlay" onClick={() => setPedidoEntregando(null)}>
          <div className="modal-content modal-entrega" onClick={(e) => e.stopPropagation()}>
            <h3>Confirmar entrega</h3>
            <div className="entrega-info">
              <p><strong>Pedido #{pedidoEntregando.numero}</strong></p>
              <p>{pedidoEntregando.cliente}</p>
              <p className="entrega-metodo-pago">
                Pago: {pedidoEntregando.metodoPago === 'transferencia' ? 'Transferencia' : pedidoEntregando.metodoPago === 'hijo_comunidad' ? 'Hijo de la comunidad' : 'Efectivo'}
                {pedidoEntregando.metodoPago === 'hijo_comunidad' && ' (sin costo)'}
              </p>
              <ul className="entrega-items">
                {pedidoEntregando.items.map((item, idx) => (
                  <li key={idx}>{item.cantidad}× {item.nombre}</li>
                ))}
              </ul>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-cancelar" onClick={() => setPedidoEntregando(null)}>
                Cancelar
              </button>
              <button type="button" className="btn-confirmar" onClick={confirmarEntrega}>
                ✅ Confirmar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: Ver comprobante */}
      {comprobanteVer && createPortal(
        <div className="modal-overlay" onClick={() => setComprobanteVer(null)}>
          <div className="modal-content modal-comprobante" onClick={(e) => e.stopPropagation()}>
            <h3>Comprobante de Transferencia</h3>
            <img src={comprobanteVer} alt="Comprobante" className="comprobante-imagen" />
            <button 
              className="btn-cerrar"
              onClick={() => setComprobanteVer(null)}
            >
              Cerrar
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: Historial de entregas */}
      {mostrarHistorial && createPortal(
        <div className="modal-overlay" onClick={() => setMostrarHistorial(false)}>
          <div className="modal-content modal-historial" onClick={(e) => e.stopPropagation()}>
            <h3>Historial de Entregas</h3>
            <div className="historial-lista">
              {pedidosEntregados.length === 0 ? (
                <p>No hay entregas registradas</p>
              ) : (
                pedidosEntregados.slice().reverse().map(pedido => (
                  <div key={pedido.id} className="historial-item">
                    <strong>Pedido #{pedido.numero}</strong>
                    <p className="historial-cliente">{pedido.cliente}</p>
                    <ul className="historial-items">
                      {pedido.items && pedido.items.map((item, idx) => (
                        <li key={idx}>{item.cantidad}× {item.nombre}</li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
            <button 
              className="btn-cerrar"
              onClick={() => setMostrarHistorial(false)}
            >
              Cerrar
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Despacho;

