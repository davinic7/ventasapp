import logoApp from '../assets/logo-app.jpg';
import './MenuPrincipal.css';

const MenuPrincipal = ({ cambiarVista }) => {
  const opciones = [
    { id: 'ventas', nombre: 'VENTAS', icono: '💰', color: '#10b981' },
    { id: 'pedidos', nombre: 'PEDIDOS', icono: '📝', color: '#06b6d4' },
    { id: 'despacho', nombre: 'DESPACHO', icono: '📦', color: '#f59e0b' },
    { id: 'configuraciones', nombre: 'CONFIGURACIONES', icono: '⚙️', color: '#64748b' }
  ];

  return (
    <div className="menu-principal">
      <div className="menu-header">
        <img src={logoApp} alt="Comunidad Cenáculo Argentina" className="menu-logo" />
        <h1>Sistema de Ventas</h1>
        <p className="menu-subtitle">Selecciona una opción</p>
      </div>
      
      <div className="menu-opciones">
        {opciones.map(opcion => (
          <button
            key={opcion.id}
            className="menu-boton"
            onClick={() => cambiarVista(opcion.id)}
            style={{ '--color-accent': opcion.color }}
          >
            <div className="menu-boton-icono">{opcion.icono}</div>
            <div className="menu-boton-texto">{opcion.nombre}</div>
          </button>
        ))}
      </div>

      <footer className="menu-footer">
        <a href="#" className="menu-footer-link" aria-label="Desarrollado por DaviNic" title="DaviNic Developer">
          <img src="/davinic-logo.png" alt="DaviNic Developer" className="menu-footer-logo" />
        </a>
      </footer>
    </div>
  );
};

export default MenuPrincipal;

