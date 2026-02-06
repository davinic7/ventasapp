import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useVentas } from '../context/VentasContext';
import { AVATARES_PUESTOS } from '../utils/avatars';
import './Puestos.css';

/**
 * COMPONENTE: Puestos
 * 
 * FUNCIONALIDADES:
 * - Crear nuevos puestos de trabajo
 * - Editar puestos existentes
 * - Eliminar puestos
 * - Asignar productos a puestos
 * - Ver productos asignados a cada puesto
 * 
 * FLUJO:
 * 1. Crear puesto con nombre y avatar
 * 2. Asignar productos del stock disponible
 * 3. Ver lista de puestos creados
 * 4. Editar o eliminar puestos
 */
const Puestos = ({ onVolver, triggerAgregar, onTriggerConsumido }) => {
  const {
    puestos,
    productos,
    crearPuesto,
    actualizarPuesto,
    eliminarPuesto,
    asignarProductoAPuesto,
    obtenerProductosDisponibles
  } = useVentas();

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [puestoEditando, setPuestoEditando] = useState(null);
  const [nombrePuesto, setNombrePuesto] = useState('');
  const [avatarPuesto, setAvatarPuesto] = useState('👨‍🍳');
  const [mostrarProductosPuesto, setMostrarProductosPuesto] = useState(null);
  const [mostrarAsignarProductos, setMostrarAsignarProductos] = useState(null);
  const [confirmarEliminarPuesto, setConfirmarEliminarPuesto] = useState(null);

  /**
   * Abre el formulario para crear o editar un puesto
   */
  const abrirFormulario = (puesto = null) => {
    if (puesto) {
      setPuestoEditando(puesto);
      setNombrePuesto(puesto.nombre);
      setAvatarPuesto(puesto.avatar || '👨‍🍳');
    } else {
      setPuestoEditando(null);
      setNombrePuesto('');
      setAvatarPuesto('👨‍🍳');
    }
    setMostrarFormulario(true);
  };

  /**
   * Cierra el formulario y resetea los estados
   */
  const cerrarFormulario = () => {
    setMostrarFormulario(false);
    setPuestoEditando(null);
    setNombrePuesto('');
    setAvatarPuesto('👨‍🍳');
  };

  /**
   * Guarda el puesto (crear o actualizar)
   */
  const guardarPuesto = (e) => {
    e.preventDefault();
    if (!nombrePuesto.trim()) return;

    if (puestoEditando) {
      actualizarPuesto(puestoEditando.id, {
        nombre: nombrePuesto.trim(),
        avatar: avatarPuesto
      });
    } else {
      crearPuesto(nombrePuesto.trim(), avatarPuesto);
    }

    cerrarFormulario();
  };

  /**
   * Obtiene los productos asignados a un puesto
   */
  const obtenerProductosDelPuesto = (puestoId) => {
    return productos.filter(p => p.puestoId === puestoId);
  };

  useEffect(() => {
    if (triggerAgregar && onTriggerConsumido) {
      abrirFormulario();
      onTriggerConsumido();
    }
  }, [triggerAgregar, onTriggerConsumido]);

  return (
    <div className="puestos-container">
      {/* LISTA DE PUESTOS */}
      {puestos.length === 0 ? (
        <div className="sin-puestos">
          <p>No hay puestos creados</p>
          <p className="sin-puestos-info">Crea un puesto para comenzar a gestionar pedidos</p>
        </div>
      ) : (
        <div className="puestos-grid">
          {puestos.map(puesto => {
            const productosDelPuesto = obtenerProductosDelPuesto(puesto.id);
            return (
              <div key={puesto.id} className="puesto-card">
                <div className="puesto-card-header">
                  <div className="puesto-avatar-grande">{puesto.avatar || '👨‍🍳'}</div>
                  <div className="puesto-info">
                    <h3>{puesto.nombre}</h3>
                    <span className="puesto-productos-count">
                      {productosDelPuesto.length} producto{productosDelPuesto.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="puesto-acciones">
                    <button
                      type="button"
                      className="btn-icono-puesto btn-editar-puesto"
                      onClick={() => abrirFormulario(puesto)}
                      title="Editar puesto"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="btn-icono-puesto btn-asignar-productos"
                      onClick={() => setMostrarProductosPuesto(puesto.id)}
                      title="Ver / asignar productos"
                    >
                      📋
                    </button>
                    <button
                      type="button"
                      className="btn-icono-puesto btn-eliminar-puesto"
                      onClick={() => setConfirmarEliminarPuesto(puesto)}
                      title="Eliminar puesto"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Formulario de puesto */}
      {mostrarFormulario && createPortal(
        <div className="modal-overlay" onClick={cerrarFormulario}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{puestoEditando ? 'Editar Puesto' : 'Crear Nuevo Puesto'}</h3>
            <form onSubmit={guardarPuesto}>
              <div className="form-group">
                <label>Nombre del Puesto *</label>
                <input
                  type="text"
                  value={nombrePuesto}
                  onChange={(e) => setNombrePuesto(e.target.value)}
                  placeholder="Ej: Cocina, Bebidas, Postres..."
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Avatar/Icono</label>
                <div className="avatar-selector">
                  {AVATARES_PUESTOS.map((avatar, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`avatar-option ${avatarPuesto === avatar ? 'selected' : ''}`}
                      onClick={() => setAvatarPuesto(avatar)}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
                <div className="avatar-preview">
                  <span className="avatar-preview-icon">{avatarPuesto}</span>
                  <span className="avatar-preview-text">Vista previa</span>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-guardar">
                  {puestoEditando ? 'Actualizar' : 'Crear'} Puesto
                </button>
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={cerrarFormulario}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: Listado de productos del puesto + botón para abrir asignar */}
      {mostrarProductosPuesto && createPortal(
        <div className="modal-overlay" onClick={() => setMostrarProductosPuesto(null)}>
          <div className="modal-content modal-productos-puesto" onClick={(e) => e.stopPropagation()}>
            <h3>Productos del puesto</h3>
            <p className="modal-puesto-nombre">{puestos.find(p => p.id === mostrarProductosPuesto)?.nombre}</p>
            {(() => {
              const lista = productos.filter(p => p.puestoId === mostrarProductosPuesto);
              return lista.length === 0 ? (
                <p className="sin-productos-puesto">Ningún producto asignado todavía.</p>
              ) : (
                <ul className="lista-productos-puesto">
                  {lista.map(producto => (
                    <li key={producto.id}>{producto.icono || '📦'} {producto.nombre}</li>
                  ))}
                </ul>
              );
            })()}
            <div className="form-actions">
              <button
                type="button"
                className="btn-asignar-desde-modal"
                onClick={() => {
                  setMostrarAsignarProductos(mostrarProductosPuesto);
                  setMostrarProductosPuesto(null);
                }}
              >
                Asignar productos
              </button>
              <button type="button" className="btn-cancelar" onClick={() => setMostrarProductosPuesto(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: Asignar productos a puesto existente */}
      {mostrarAsignarProductos && createPortal(
        <div className="modal-overlay" onClick={() => setMostrarAsignarProductos(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Asignar Productos</h3>
            <p>Selecciona los productos para el puesto "{puestos.find(p => p.id === mostrarAsignarProductos)?.nombre}"</p>
            
            <div className="productos-selector">
              {obtenerProductosDisponibles().map(producto => {
                const estaAsignado = producto.puestoId === mostrarAsignarProductos;
                return (
                  <label key={producto.id} className="producto-checkbox">
                    <input
                      type="checkbox"
                      checked={estaAsignado}
                      onChange={() => {
                        if (estaAsignado) {
                          asignarProductoAPuesto(producto.id, null);
                        } else {
                          asignarProductoAPuesto(producto.id, mostrarAsignarProductos);
                        }
                      }}
                    />
                    <span>
                      {producto.icono || '📦'} {producto.nombre}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-cerrar"
                onClick={() => setMostrarAsignarProductos(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: Confirmar eliminar puesto */}
      {confirmarEliminarPuesto && createPortal(
        <div className="modal-overlay" onClick={() => setConfirmarEliminarPuesto(null)}>
          <div className="modal-content modal-confirmar" onClick={(e) => e.stopPropagation()}>
            <h3>Eliminar puesto</h3>
            <p className="modal-confirmar-texto">
              ¿Eliminar el puesto <strong>{confirmarEliminarPuesto.nombre}</strong>?
            </p>
            <div className="modal-confirmar-actions">
              <button type="button" className="btn-cancelar" onClick={() => setConfirmarEliminarPuesto(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn-confirmar-accion btn-eliminar"
                onClick={() => {
                  eliminarPuesto(confirmarEliminarPuesto.id);
                  setConfirmarEliminarPuesto(null);
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

export default Puestos;

