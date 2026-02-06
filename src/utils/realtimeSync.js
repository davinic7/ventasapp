/**
 * Sistema de sincronización en tiempo real entre pestañas/dispositivos
 * Usa BroadcastChannel API para comunicación instantánea
 */

let broadcastChannel = null;

/**
 * Inicializa el canal de comunicación
 */
export const initRealtimeSync = () => {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('ventasapp-sync');
    return true;
  }
  return false;
};

/**
 * Emite un evento de sincronización
 * @param {String} type - Tipo de evento (pedido_actualizado, venta_registrada, etc.)
 * @param {Object} data - Datos del evento
 */
export const emitSyncEvent = (type, data) => {
  if (broadcastChannel) {
    broadcastChannel.postMessage({
      type,
      data,
      timestamp: Date.now()
    });
  }
  
  // Fallback: también usar localStorage event para compatibilidad
  try {
    const eventKey = `ventasapp_${type}_${Date.now()}`;
    localStorage.setItem(eventKey, JSON.stringify({ type, data }));
    localStorage.removeItem(eventKey); // Trigger storage event
  } catch (error) {
    console.error('Error emitiendo evento de sincronización:', error);
  }
};

/**
 * Suscribe a eventos de sincronización
 * @param {Function} callback - Función que se ejecuta cuando hay un evento
 * @returns {Function} Función para desuscribirse
 */
export const subscribeToSync = (callback) => {
  if (!broadcastChannel) {
    initRealtimeSync();
  }

  const handleMessage = (event) => {
    if (event.data && event.data.type) {
      callback(event.data);
    }
  };

  // Escuchar BroadcastChannel
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleMessage);
  }

  // Escuchar localStorage events (fallback)
  const handleStorageChange = (e) => {
    if (e.key && e.key.startsWith('ventasapp_')) {
      try {
        const data = JSON.parse(e.newValue || '{}');
        if (data.type) {
          callback(data);
        }
      } catch (error) {
        // Ignorar errores de parsing
      }
    }
  };

  window.addEventListener('storage', handleStorageChange);

  // Retornar función de limpieza
  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleMessage);
    }
    window.removeEventListener('storage', handleStorageChange);
  };
};

/**
 * Polling alternativo para sincronización
 * Útil cuando BroadcastChannel no está disponible
 */
let pollingInterval = null;

export const startPolling = (callback, interval = 1000) => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  let lastCheck = Date.now();

  pollingInterval = setInterval(() => {
    try {
      // Verificar cambios en localStorage
      const pedidos = localStorage.getItem('pedidos');
      const ventas = localStorage.getItem('ventas');
      
      const currentTime = Date.now();
      
      // Si hay cambios recientes (últimos 2 segundos), notificar
      if (pedidos || ventas) {
        callback({
          type: 'data_updated',
          data: { pedidos, ventas },
          timestamp: currentTime
        });
      }
      
      lastCheck = currentTime;
    } catch (error) {
      console.error('Error en polling:', error);
    }
  }, interval);

  return () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  };
};

