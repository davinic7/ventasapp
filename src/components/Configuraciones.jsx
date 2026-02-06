import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useVentas } from '../context/VentasContext';
import Puestos from './Puestos';
import Productos from './Productos';
import Registro from './Registro';
import './Configuraciones.css';

/**
 * COMPONENTE: Configuraciones
 * 
 * FUNCIONALIDADES:
 * - Menú de opciones de configuración del sistema
 * - PUESTOS: Gestión de puestos de trabajo
 * - PRODUCTOS: Gestión de productos
 * - REGISTRO: Estadísticas y reportes
 * - REINICIAR SISTEMA: Opciones de reinicio
 * - Otras opciones de configuración
 * 
 * FLUJO:
 * 1. Usuario selecciona una opción del menú
 * 2. Se muestra el componente correspondiente
 * 3. Puede volver al menú de configuraciones
 */
const Configuraciones = ({ onVolver }) => {
  const { reiniciarSistema, reiniciarTodo } = useVentas();
  const [vistaActual, setVistaActual] = useState('menu');
  const [mostrarReinicio, setMostrarReinicio] = useState(false);
  const [confirmarReinicio, setConfirmarReinicio] = useState(null); // 'parcial' | 'total'
  const [triggerAgregarPuesto, setTriggerAgregarPuesto] = useState(false);
  const [triggerAgregarProducto, setTriggerAgregarProducto] = useState(false);

  const opciones = [
    { id: 'puestos', nombre: 'PUESTOS', icono: '👨‍🍳', descripcion: 'Puestos de trabajo' },
    { id: 'productos', nombre: 'PRODUCTOS', icono: '📋', descripcion: 'Productos y stock' },
    { id: 'registro', nombre: 'REGISTRO', icono: '📊', descripcion: 'Estadísticas' },
    { id: 'reiniciar', nombre: 'REINICIAR', icono: '🔄', descripcion: 'Reiniciar datos' }
  ];

  const titulosSeccion = { puestos: '👨‍🍳 PUESTOS', productos: '📋 PRODUCTOS', registro: '📊 REGISTRO' };

  const renderVista = () => {
    switch (vistaActual) {
      case 'puestos':
        return (
          <Puestos
            onVolver={() => setVistaActual('menu')}
            triggerAgregar={triggerAgregarPuesto}
            onTriggerConsumido={() => setTriggerAgregarPuesto(false)}
          />
        );
      case 'productos':
        return (
          <Productos
            onVolver={() => setVistaActual('menu')}
            triggerAgregar={triggerAgregarProducto}
            onTriggerConsumido={() => setTriggerAgregarProducto(false)}
          />
        );
      case 'registro':
        return <Registro onVolver={() => setVistaActual('menu')} />;
      case 'reiniciar':
        setMostrarReinicio(true);
        return null;
      default:
        return (
          <div className="config-menu">
            <div className="config-opciones-grid">
              {opciones.map(opcion => (
                <button
                  key={opcion.id}
                  className="config-opcion-card"
                  onClick={() => {
                    if (opcion.id === 'reiniciar') {
                      setMostrarReinicio(true);
                    } else {
                      setVistaActual(opcion.id);
                    }
                  }}
                >
                  <div className="config-opcion-icono">{opcion.icono}</div>
                  <div className="config-opcion-nombre">{opcion.nombre}</div>
                  <div className="config-opcion-descripcion">{opcion.descripcion}</div>
                </button>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="configuraciones-container">
      <header className="config-header-row">
        {vistaActual === 'menu' ? (
          <>
            {onVolver && (
              <button type="button" className="btn-volver-inline" onClick={onVolver}>
                ← Menú
              </button>
            )}
            <h1 className="config-titulo">⚙️ CONFIGURACIONES</h1>
          </>
        ) : (
          <>
            <button type="button" className="btn-volver-inline" onClick={() => setVistaActual('menu')} title="Volver a opciones">
              ←
            </button>
            <h1 className="config-titulo">{titulosSeccion[vistaActual] || vistaActual}</h1>
            {(vistaActual === 'puestos' || vistaActual === 'productos') && (
              <button
                type="button"
                className="btn-agregar-header"
                onClick={() => vistaActual === 'puestos' ? setTriggerAgregarPuesto(true) : setTriggerAgregarProducto(true)}
                title={vistaActual === 'puestos' ? 'Nuevo puesto' : 'Nuevo producto'}
              >
                +
              </button>
            )}
          </>
        )}
      </header>
      {renderVista()}

      {/* MODAL: Reiniciar sistema */}
      {mostrarReinicio && createPortal(
        <div className="modal-overlay" onClick={() => setMostrarReinicio(false)}>
          <div className="modal-content modal-reinicio" onClick={(e) => e.stopPropagation()}>
            <h3>🔄 Reiniciar Sistema</h3>
            <p>Selecciona el tipo de reinicio:</p>
            <div className="reinicio-opciones">
              <button
                type="button"
                className="btn-reinicio-parcial"
                onClick={() => setConfirmarReinicio('parcial')}
              >
                Reinicio Parcial
                <small>Elimina pedidos y ventas, mantiene productos y puestos</small>
              </button>
              <button
                type="button"
                className="btn-reinicio-total"
                onClick={() => setConfirmarReinicio('total')}
              >
                Reinicio Total
                <small>Elimina TODO: productos, puestos, pedidos y ventas</small>
              </button>
            </div>
            <button 
              type="button"
              className="btn-cancelar"
              onClick={() => setMostrarReinicio(false)}
            >
              Cancelar
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: Confirmar reinicio */}
      {confirmarReinicio && createPortal(
        <div className="modal-overlay" onClick={() => setConfirmarReinicio(null)}>
          <div className="modal-content modal-confirmar" onClick={(e) => e.stopPropagation()}>
            <h3>🔄 Confirmar reinicio</h3>
            <p className="modal-confirmar-texto">
              {confirmarReinicio === 'parcial'
                ? '¿Reiniciar el sistema? Se eliminarán todos los pedidos y ventas. Se mantendrán productos y puestos.'
                : '¿Está seguro? Esto eliminará TODO: productos, puestos, pedidos y ventas.'}
            </p>
            <div className="modal-confirmar-actions">
              <button type="button" className="btn-cancelar" onClick={() => setConfirmarReinicio(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn-confirmar-accion"
                onClick={() => {
                  if (confirmarReinicio === 'parcial') reiniciarSistema();
                  else reiniciarTodo();
                  setConfirmarReinicio(null);
                  setMostrarReinicio(false);
                  setVistaActual('menu');
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Configuraciones;

