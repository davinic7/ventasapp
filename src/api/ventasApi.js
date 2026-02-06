/**
 * Cliente API para VentasApp.
 * Si VITE_API_URL está definida, el contexto usa estos métodos para persistir en el backend.
 */

const getBase = () => {
  const url = import.meta.env.VITE_API_URL;
  if (!url || typeof url !== 'string') return '';
  return url.replace(/\/$/, '');
};

export const isApiMode = () => !!getBase();

const request = async (path, options = {}) => {
  const base = getBase();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!res.ok) {
    const err = new Error(await res.text().catch(() => res.statusText));
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
};

// ---- Puestos ----
export const fetchPuestos = () => request('/api/puestos');
export const createPuesto = (body) => request('/api/puestos', { method: 'POST', body: JSON.stringify(body) });
export const updatePuesto = (id, body) => request(`/api/puestos/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deletePuesto = (id) => request(`/api/puestos/${id}`, { method: 'DELETE' });

// ---- Productos ----
export const fetchProductos = () => request('/api/productos');
export const createProducto = (body) => request('/api/productos', { method: 'POST', body: JSON.stringify(body) });
export const updateProducto = (id, body) => request(`/api/productos/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const patchStock = (id, delta) => request(`/api/productos/${id}/stock`, { method: 'PATCH', body: JSON.stringify({ delta }) });
export const deleteProducto = (id) => request(`/api/productos/${id}`, { method: 'DELETE' });

// ---- Pedidos ----
export const fetchPedidos = () => request('/api/pedidos');
export const createPedido = (body) => request('/api/pedidos', { method: 'POST', body: JSON.stringify(body) });
export const updatePedido = (id, body) => request(`/api/pedidos/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deletePedido = (id) => request(`/api/pedidos/${id}`, { method: 'DELETE' });

// ---- Ventas ----
export const fetchVentas = () => request('/api/ventas');
export const createVenta = (body) => request('/api/ventas', { method: 'POST', body: JSON.stringify(body) });
