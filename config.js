/* Configuración pública. Nunca poner contraseñas, PIN ni claves de Apps Script aquí. */
window.AMARED_CONFIG = Object.freeze({
  apiUrl: window.AMARED_PREVIEW ? '/__demo/api' : 'https://amared-orders.amaredpostres.workers.dev/',
  requestTimeoutMs: 45000
});
