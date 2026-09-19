/* Configuración pública. Nunca poner contraseñas, PIN ni claves de Apps Script aquí. */
window.AMARED_CONFIG = Object.freeze({
  // Completar con la URL del NUEVO Worker de pruebas. La conexión anterior no se reutiliza.
  apiUrl: window.AMARED_PREVIEW ? '/__demo/api' : '',
  requestTimeoutMs: 45000
});
