import { useState } from 'react';
import { createPortal } from 'react-dom';
import { jsPDF } from 'jspdf';
import { useVentas } from '../context/VentasContext';
import './Registro.css';

/**
 * COMPONENTE: Registro
 * 
 * FUNCIONALIDADES:
 * - Dashboard con resumen de ventas del día
 * - Estadísticas por productos (más vendidos)
 * - Estadísticas por métodos de pago (efectivo vs transferencia)
 * - Tabla detallada de todas las ventas
 * - Exportación de datos a PDF
 * - Botón de reinicio del sistema (con confirmación)
 * - Visualización de comprobantes de transferencia
 * 
 * FLUJO:
 * 1. Muestra resumen del día: totales, cantidad de ventas
 * 2. Desglose por método de pago
 * 3. Lista de productos más vendidos
 * 4. Tabla completa de ventas con detalles
 * 5. Exportar a PDF toda la información
 * 6. Reiniciar sistema (borra pedidos y ventas, mantiene productos/puestos)
 */
const Registro = ({ onVolver }) => {
  const { 
    ventas,
    productos,
    obtenerVentasDelDia,
    obtenerTotalVentasDelDia,
    obtenerVentasPorMetodoPago
  } = useVentas();

  const [comprobanteVer, setComprobanteVer] = useState(null);
  const [expandedVentaId, setExpandedVentaId] = useState(null);

  // Obtener datos del día con validaciones
  const ventasDelDia = obtenerVentasDelDia() || [];
  const totalDelDia = obtenerTotalVentasDelDia() || 0;
  const ventasEfectivo = obtenerVentasPorMetodoPago('efectivo') || [];
  const ventasTransferencia = obtenerVentasPorMetodoPago('transferencia') || [];
  const ventasHijoComunidad = obtenerVentasPorMetodoPago('hijo_comunidad') || [];

  const totalEfectivo = ventasEfectivo.reduce((sum, v) => sum + (v?.total || 0), 0);
  const totalTransferencia = ventasTransferencia.reduce((sum, v) => sum + (v?.total || 0), 0);
  const totalHijoComunidad = ventasHijoComunidad.reduce((sum, v) => sum + (v?.total || 0), 0); // siempre 0
  const totalGeneral = (ventas || []).reduce((sum, v) => sum + (v?.total || 0), 0);

  /**
   * Calcula los productos más vendidos
   */
  const productosMasVendidos = () => {
    const productosVendidos = {};
    
    if (!ventasDelDia || !Array.isArray(ventasDelDia)) return [];
    
    ventasDelDia.forEach(venta => {
      if (venta && venta.items && Array.isArray(venta.items)) {
        venta.items.forEach(item => {
          if (!productosVendidos[item.productoId]) {
            productosVendidos[item.productoId] = {
              nombre: item.nombre,
              cantidad: 0,
              total: 0
            };
          }
          productosVendidos[item.productoId].cantidad += item.cantidad;
          productosVendidos[item.productoId].total += item.subtotal;
        });
      }
    });

    return Object.values(productosVendidos)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);
  };

  /**
   * Genera y descarga un PDF con el reporte de ventas del día.
   */
  const exportarPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margin = 14;
    const pageW = doc.internal.pageSize.getWidth();
    let y = margin;
    const lineH = 6;
    const sectionGap = 4;

    const addText = (text, fontSize = 10, isBold = false) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.text(text, margin, y);
      y += lineH;
    };

    const addLine = () => {
      y += 2;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageW - margin, y);
      y += sectionGap;
    };

    // Título y fecha
    addText('REPORTE DE VENTAS', 16, true);
    y += 2;
    addText(new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), 10, false);
    y += sectionGap;
    addLine();

    // Resumen: Efectivo, Transferencia, Total
    addText('RESUMEN DEL DÍA', 12, true);
    y += 2;
    addText(`Efectivo: $${totalEfectivo.toFixed(2)} (${ventasEfectivo.length} ventas)`);
    addText(`Transferencia: $${totalTransferencia.toFixed(2)} (${ventasTransferencia.length} ventas)`);
    addText(`Hijo de la comunidad: $${totalHijoComunidad.toFixed(2)} (${ventasHijoComunidad.length} ventas, sin costo)`);
    addText(`Total general: $${totalDelDia.toFixed(2)} (${ventasDelDia.length} ventas)`, 10, true);
    y += sectionGap;
    addLine();

    // Total por producto (productos más vendidos)
    const prods = productosMasVendidos();
    if (prods.length > 0) {
      addText('TOTAL POR PRODUCTO (más vendidos hoy)', 12, true);
      y += 2;
      prods.forEach((p, i) => {
        addText(`${i + 1}. ${p.nombre}: ${p.cantidad} un. — $${p.total.toFixed(2)}`);
      });
      y += sectionGap;
      addLine();
    }

    // Detalle de ventas
    addText('DETALLE DE VENTAS', 12, true);
    y += 2;
    ventasDelDia.forEach((v, idx) => {
      if (y > 270) {
        doc.addPage();
        y = margin;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`Pedido #${v.numeroPedido} — ${v.cliente}`, margin, y);
      y += lineH - 1;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const items = (v.items && Array.isArray(v.items)) ? v.items : [];
      items.forEach(item => {
        doc.text(`  • ${item.cantidad}x ${item.nombre}`, margin, y);
        y += lineH - 2;
      });
      const metodo = v.metodoPago === 'transferencia' ? 'Transferencia' : v.metodoPago === 'hijo_comunidad' ? 'Hijo de la comunidad' : 'Efectivo';
      doc.text(`  Método: ${metodo}  |  Total: $${(v.total || 0).toFixed(2)}`, margin, y);
      y += lineH + 2;
    });

    addLine();
    addText(`TOTAL ENTRE AMBOS (del día): $${totalDelDia.toFixed(2)}`, 11, true);

    doc.save(`reporte-ventas-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="registro-container">
      <div className="registro-header">
        <button className="btn-exportar" onClick={exportarPDF}>
          📄 Exportar
        </button>
      </div>

      <div className="resumen-cards">
        <div className="resumen-card total-dia">
          <h3>Ventas del Día</h3>
          <p className="resumen-valor">${totalDelDia.toFixed(2)}</p>
          <p className="resumen-cantidad">{ventasDelDia.length} ventas</p>
        </div>
        <div className="resumen-card efectivo">
          <h3>Efectivo</h3>
          <p className="resumen-valor">${totalEfectivo.toFixed(2)}</p>
          <p className="resumen-cantidad">{ventasEfectivo.length} ventas</p>
        </div>
        <div className="resumen-card transferencia">
          <h3>Transferencia</h3>
          <p className="resumen-valor">${totalTransferencia.toFixed(2)}</p>
          <p className="resumen-cantidad">{ventasTransferencia.length} ventas</p>
        </div>
        <div className="resumen-card hijo-comunidad">
          <h3>Hijo de la comunidad</h3>
          <p className="resumen-cantidad resumen-contador">{ventasHijoComunidad.length} ventas</p>
        </div>
        <div className="resumen-card total-general">
          <h3>Total General</h3>
          <p className="resumen-valor">${totalGeneral.toFixed(2)}</p>
          <p className="resumen-cantidad">{ventas.length} ventas totales</p>
        </div>
      </div>

      {/* ESTADÍSTICAS: Productos más vendidos */}
      {productosMasVendidos().length > 0 && (
        <div className="estadisticas-section">
          <h3>Productos Más Vendidos (Hoy)</h3>
          <div className="productos-vendidos-lista">
            {productosMasVendidos().map((prod, idx) => (
              <div key={idx} className="producto-vendido-item">
                <span className="producto-posicion">#{idx + 1}</span>
                <span className="producto-nombre">{prod.nombre}</span>
                <span className="producto-cantidad">{prod.cantidad} unidades</span>
                <span className="producto-total">${prod.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TABLA DE VENTAS */}
      <div className="ventas-tabla-section">
        <h3>Ventas del Día de Hoy</h3>
        <p className="fecha-actual">
          {new Date().toLocaleDateString('es-AR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>

        {ventasDelDia.length === 0 ? (
          <div className="sin-ventas">
            <p>No hay ventas registradas hoy</p>
          </div>
        ) : (
          <div className="ventas-tabla-container">
            <table className="ventas-tabla ventas-tabla-compacta">
              <thead>
                <tr>
                  <th># Pedido</th>
                  <th>Cliente</th>
                  <th>Método / Detalles</th>
                </tr>
              </thead>
              <tbody>
                {ventasDelDia.flatMap(venta => [
                  <tr key={venta.id} className={expandedVentaId === venta.id ? 'fila-expandida' : ''}>
                    <td className="numero-pedido">#{venta.numeroPedido}</td>
                    <td>{venta.cliente}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-metodo-detalles"
                        onClick={() => setExpandedVentaId(prev => prev === venta.id ? null : venta.id)}
                        title="Ver detalles"
                      >
                        <span className={`metodo-badge-tabla ${venta.metodoPago}`}>
                          {venta.metodoPago === 'transferencia' ? '📱' : venta.metodoPago === 'hijo_comunidad' ? '🤝' : '💵'}
                        </span>
                        <span className="btn-detalles-label">
                          {expandedVentaId === venta.id ? 'Ocultar' : 'Detalles'}
                        </span>
                      </button>
                    </td>
                  </tr>,
                  ...(expandedVentaId === venta.id ? [(
                    <tr key={`${venta.id}-det`} className="fila-detalle">
                      <td colSpan={3} className="celda-detalle">
                        <div className="detalle-venta">
                          <div className="detalle-venta-items">
                            <strong>Items:</strong>
                            <ul className="items-lista-tabla">
                              {(venta.items && Array.isArray(venta.items) ? venta.items : []).map((item, idx) => (
                                <li key={idx}>{item.cantidad}x {item.nombre}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="detalle-venta-meta">
                            <span className="total-venta">Total: ${(venta.total || 0).toFixed(2)}</span>
                            <span className="hora-venta">{new Date(venta.fecha).toLocaleTimeString('es-AR')}</span>
                            {venta.metodoPago === 'transferencia' && (
                              venta.comprobanteUrl ? (
                                <button
                                  type="button"
                                  className="btn-ver-comprobante"
                                  onClick={() => setComprobanteVer(venta.comprobanteUrl)}
                                >
                                  Ver comprobante
                                </button>
                              ) : (
                                <span className="sin-comprobante">Sin comprobante</span>
                              )
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )] : [])
                ])}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historial completo (si hay más ventas que las del día) */}
      {ventas.length > ventasDelDia.length && (
        <div className="ventas-historial-section">
          <h3>Todas las Ventas</h3>
          <div className="ventas-tabla-container">
            <table className="ventas-tabla ventas-tabla-compacta">
              <thead>
                <tr>
                  <th># Pedido</th>
                  <th>Cliente</th>
                  <th>Método / Detalles</th>
                </tr>
              </thead>
              <tbody>
                {(ventas && Array.isArray(ventas) ? ventas.slice().reverse() : []).flatMap(venta => [
                  <tr key={venta.id} className={expandedVentaId === venta.id ? 'fila-expandida' : ''}>
                    <td className="numero-pedido">#{venta.numeroPedido}</td>
                    <td>{venta.cliente}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-metodo-detalles"
                        onClick={() => setExpandedVentaId(prev => prev === venta.id ? null : venta.id)}
                        title="Ver detalles"
                      >
                        <span className={`metodo-badge-tabla ${venta.metodoPago || 'efectivo'}`}>
                          {venta.metodoPago === 'transferencia' ? '📱' : venta.metodoPago === 'hijo_comunidad' ? '🤝' : '💵'}
                        </span>
                        <span className="btn-detalles-label">
                          {expandedVentaId === venta.id ? 'Ocultar' : 'Detalles'}
                        </span>
                      </button>
                    </td>
                  </tr>,
                  ...(expandedVentaId === venta.id ? [(
                    <tr key={`${venta.id}-det`} className="fila-detalle">
                      <td colSpan={3} className="celda-detalle">
                        <div className="detalle-venta">
                          <div className="detalle-venta-items">
                            <strong>Items:</strong>
                            <ul className="items-lista-tabla">
                              {(venta.items && Array.isArray(venta.items) ? venta.items : []).map((item, idx) => (
                                <li key={idx}>{item.cantidad}x {item.nombre}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="detalle-venta-meta">
                            <span className="total-venta">Total: ${(venta.total || 0).toFixed(2)}</span>
                            <span className="fecha-venta">{venta.fecha ? new Date(venta.fecha).toLocaleString('es-AR') : '-'}</span>
                            {venta.metodoPago === 'transferencia' && (
                              venta.comprobanteUrl ? (
                                <button
                                  type="button"
                                  className="btn-ver-comprobante"
                                  onClick={() => setComprobanteVer(venta.comprobanteUrl)}
                                >
                                  Ver comprobante
                                </button>
                              ) : (
                                <span className="sin-comprobante">Sin comprobante</span>
                              )
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )] : [])
                ])}
              </tbody>
            </table>
          </div>
        </div>
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
    </div>
  );
};

export default Registro;

