/**
 * Utilidades para avatares e iconos
 * Lista de avatares disponibles para puestos y productos
 */

export const AVATARES_PUESTOS = [
  '👨‍🍳', '🍕', '🍔', '🍲',
  '🥤', '☕', '🧃', '🧊', 
  '🍰', '🏪', '🛒', '🎯', '⭐'
];

// Iconos por categoría - Específicos para Argentina
export const ICONOS_COMIDAS = [
  '🌭', // Pancho
  '🥟', // Empanadas
  '🍕', // Pizza
  '🍔', // Hamburguesas
  '🧀'  // Queso
];

export const ICONOS_BEBIDAS = [
  '🥤', // Gaseosa
  '🧃', // Jugo
  '💧', // Agua mineral
  '☕', // Café
  '🧉'  // Mate
];

export const ICONOS_POSTRES = [
  '🍦', // Helado
  '🍰', // Torta
  '🥧', // Tarta
  '🍎'  // Manzana
];

export const ICONOS_OTROS = [
  '🎁'  // Paquete de regalos
];

// Lista general para compatibilidad
export const ICONOS_PRODUCTOS = [
  ...ICONOS_COMIDAS,
  ...ICONOS_BEBIDAS,
  ...ICONOS_POSTRES,
  ...ICONOS_OTROS
];

/**
 * Obtiene un avatar aleatorio de la lista
 */
export const obtenerAvatarAleatorio = (tipo = 'puesto') => {
  const lista = tipo === 'puesto' ? AVATARES_PUESTOS : ICONOS_PRODUCTOS;
  return lista[Math.floor(Math.random() * lista.length)];
};

/**
 * Obtiene un avatar por índice
 */
export const obtenerAvatarPorIndice = (indice, tipo = 'puesto') => {
  const lista = tipo === 'puesto' ? AVATARES_PUESTOS : ICONOS_PRODUCTOS;
  return lista[indice % lista.length];
};

