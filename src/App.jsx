import { useState } from 'react';
import { VentasProvider } from './context/VentasContext';
import MenuPrincipal from './components/MenuPrincipal';
import Ventas from './components/Ventas';
import Pedidos from './components/Pedidos';
import Despacho from './components/Despacho';
import Configuraciones from './components/Configuraciones';
import './App.css';

function App() {
  const [vistaActual, setVistaActual] = useState('menu');

  const cambiarVista = (vista) => {
    setVistaActual(vista);
  };

  const renderVista = () => {
    switch (vistaActual) {
      case 'menu':
        return <MenuPrincipal cambiarVista={cambiarVista} />;
      case 'ventas':
        return <Ventas onVolver={() => cambiarVista('menu')} />;
      case 'pedidos':
        return <Pedidos onVolver={() => cambiarVista('menu')} />;
      case 'despacho':
        return <Despacho onVolver={() => cambiarVista('menu')} />;
      case 'configuraciones':
        return <Configuraciones onVolver={() => cambiarVista('menu')} />;
      default:
        return <MenuPrincipal cambiarVista={cambiarVista} />;
    }
  };

  return (
    <VentasProvider>
      <div className="app">
        {renderVista()}
      </div>
    </VentasProvider>
  );
}

export default App;
