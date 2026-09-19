/* Shared request handling: timeouts, honest errors and concurrent read coalescing. */
(() => {
  const pending = new Map();
  const safeReads = new Set(['products_catalog_public', 'profiles_public_list', 'reviews_list']);
  window.amaredRequest = async function(url, options = {}) {
    let action = '';
    try { action = JSON.parse(options.body || '{}').action || ''; } catch {}
    const key = safeReads.has(action) && !options.signal ? `${url}:${options.body}` : null;
    if (key && pending.has(key)) return (await pending.get(key)).clone();
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (options.signal?.aborted) controller.abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, window.AMARED_CONFIG.requestTimeoutMs);
    const task = (async () => {
      try {
        return await fetch(url, { ...options, signal: controller.signal });
      } catch (error) {
        if (error.name === 'AbortError') throw new Error(action === 'create_order'
          ? 'La respuesta está tardando. Puedes reintentar: conservaremos el mismo código para evitar duplicados.'
          : 'La conexión está tardando. Revisa tu conexión y vuelve a intentar.');
        throw new Error('No pudimos conectar. Revisa tu conexión; tus datos siguen en esta pantalla.');
      } finally {
        clearTimeout(timeout);
        options.signal?.removeEventListener('abort', abort);
      }
    })();
    if (key) pending.set(key, task);
    try { return (await task).clone(); }
    finally { if (key) pending.delete(key); }
  };
})();
