/* Progressive enhancements shared by the existing AMARED modules. */
(() => {
  const $ = id => document.getElementById(id);
  const isStore = document.body.classList.contains('storefront');
  const setText = (el, value) => { if (el && el.textContent !== String(value)) el.textContent = String(value); };
  const moneyUX = value => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(value);
  let toastTimer;
  window.amaredToast = message => {
    const toast = $('uxToast');
    if (!toast) return;
    toast.textContent = message; toast.classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('visible'), 2400);
  };
  const offline = document.createElement('div');
  offline.className = 'connectionNotice'; offline.role = 'status';
  offline.textContent = 'Estás sin conexión. Conservamos lo que estás haciendo; vuelve a intentar cuando tengas internet.';
  document.body.prepend(offline);
  const syncConnection = () => { offline.hidden = navigator.onLine; };
  window.addEventListener('online', syncConnection); window.addEventListener('offline', syncConnection); syncConnection();
  if (window.AMARED_PREVIEW) {
    const banner = document.createElement('div'); banner.className = 'previewNotice';
    banner.innerHTML = 'Vista de prueba · Los pedidos y cambios se guardan solo en memoria. <a href="index.html">Tienda</a><a href="hub.html">Administración</a>';
    document.body.prepend(banner);
  }

  // Dialog semantics, initial focus, focus trapping and return to the trigger.
  const overlays = [...document.querySelectorAll('.modalOverlay,.alertOverlay,[id$="Modal"]')].filter(el => el.querySelector('button'));
  let activeDialog = null, returnFocus = null;
  const shown = el => !el.hidden && !el.classList.contains('hidden') && el.getAttribute('aria-hidden') !== 'true' && getComputedStyle(el).display !== 'none';
  const focusables = el => [...el.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex="0"]')].filter(n => !n.disabled && n.getClientRects().length);
  const syncDialogs = () => {
    const next = overlays.filter(shown).sort((a,b) => (Number(getComputedStyle(a).zIndex)||0)-(Number(getComputedStyle(b).zIndex)||0)).at(-1) || null;
    if (next === activeDialog) return;
    if (next) {
      if (!activeDialog) returnFocus = document.activeElement;
      activeDialog = next;
      const panel = next.querySelector('.modal,.alertBox') || next;
      panel.setAttribute('role', next.classList.contains('alertOverlay') ? 'alertdialog' : 'dialog');
      panel.setAttribute('aria-modal','true');
      const heading = panel.querySelector('h2,h3,.modalTitle,.alertTitle');
      if (heading) { if (!heading.id) heading.id = `heading-${next.id}`; panel.setAttribute('aria-labelledby',heading.id); }
      requestAnimationFrame(() => focusables(next)[0]?.focus());
    } else {
      activeDialog = null;
      if (returnFocus?.isConnected && returnFocus.getClientRects().length) returnFocus.focus({preventScroll:true});
      returnFocus = null;
    }
  };
  const dialogObserver = new MutationObserver(syncDialogs);
  overlays.forEach(el => dialogObserver.observe(el,{attributes:true,attributeFilter:['class','style','aria-hidden','hidden']}));
  document.addEventListener('keydown',event => {
    if (!activeDialog) return;
    const list = focusables(activeDialog);
    if (event.key === 'Tab' && list.length) {
      if (event.shiftKey && document.activeElement === list[0]) { event.preventDefault(); list.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === list.at(-1)) { event.preventDefault(); list[0].focus(); }
    }
    if (event.key === 'Escape') {
      const close = activeDialog.querySelector('[id^="btnClose"],#btnAlertOk,#btnPayBack,#btnCancelBack');
      if (close && !close.disabled) { event.preventDefault(); close.click(); }
    }
  });

  if (isStore) {
    const details = $('checkoutDetails');
    const openCheckout = () => {
      if ($('orderSuccess')) { $('orderSuccess').scrollIntoView({block:'center'}); $('orderSuccess').focus({preventScroll:true}); return; }
      details.open = true;
      $('pedido').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',block:'start'});
    };
    document.querySelectorAll('[data-checkout-open]').forEach(button => button.addEventListener('click',openCheckout));
    let draftTimer;
    const saveDraft = () => { clearTimeout(draftTimer); draftTimer = setTimeout(() => { try { saveIndexMapsDraft(); } catch {} }, 300); };
    $('pedido').addEventListener('input',saveDraft); $('pedido').addEventListener('change',saveDraft);
    window.addEventListener('pagehide', () => { try { if (!$('orderSuccess')) saveIndexMapsDraft(); } catch {} });
    const syncCart = () => {
      const qty = Number($('totalUnits').textContent || 0);
      setText($('navCartCount'),qty); setText($('mobileCartUnits'),qty);
      setText($('mobileCartTotal'),`$${$('subtotal').textContent}`);
      $('mobileCartDock').hidden = qty === 0 || shouldUseIndexAdminView() || !!$('orderSuccess');
      $('btnWhatsApp').disabled = qty === 0 || !_catalogReady || _catalogLoading;
    };
    new MutationObserver(syncCart).observe($('totalUnits'),{childList:true,subtree:true,characterData:true});
    new MutationObserver(syncCart).observe($('subtotal'),{childList:true,subtree:true,characterData:true});
    syncCart();
    $('products').addEventListener('click',event => {
      const button = event.target.closest('[data-action]');
      if (!button || button.disabled) return;
      saveDraft();
      if (button.dataset.action === 'inc') amaredToast('Agregado a tu pedido');
    });
    document.querySelectorAll('#pedido input,#pedido textarea').forEach(el => el.addEventListener('input', () => {
      el.removeAttribute('aria-invalid');
      $('checkoutError').hidden = true;
    }));
    window.showCheckoutError = (message, fieldId) => {
      details.open = true;
      $('checkoutError').textContent = message; $('checkoutError').hidden = false;
      const field = $(fieldId);
      if (field) {
        const parentDetails = field.closest('details'); if (parentDetails) parentDetails.open = true;
        field.setAttribute('aria-invalid','true'); field.focus();
      } else $('checkoutError').scrollIntoView({block:'center'});
    };
    window.showOrderSuccess = (data, orderId, message) => {
      let card = $('orderSuccess');
      if (!card) { card = document.createElement('section'); card.id='orderSuccess'; card.className='orderSuccess'; $('pedido').before(card); }
      card.innerHTML = '<p class="eyebrow">PEDIDO REGISTRADO</p><h2>¡Tu antojo ya tiene código!</h2><p class="successCode"></p><p>Falta un último paso: envíanos el mensaje por WhatsApp para acordar el pago y la entrega. Registrar el pedido todavía no confirma el pago.</p><a class="btn primary" target="_blank" rel="noopener noreferrer">Abrir WhatsApp y confirmar ↗</a><button class="btn secondary" type="button">Copiar mensaje del pedido</button><button class="btn secondary newOrder" type="button">Hacer otro pedido</button><p class="successCopied" role="status"></p>';
      card.querySelector('.successCode').textContent = orderId;
      card.querySelector('a').href = buildWhatsAppUrlWithText(message);
      card.querySelector('button').onclick = async () => { try { if (!await copyToClipboard(message)) throw new Error('copy failed'); card.querySelector('.successCopied').textContent='Mensaje copiado. Pégalo en el chat de AMARED.'; } catch { card.querySelector('.successCopied').textContent='No se pudo copiar. Usa el botón para abrir WhatsApp.'; } };
      card.querySelector('.newOrder').onclick = () => { sessionStorage.removeItem('AMARED_LAST_ORDER_V2'); card.remove(); document.body.classList.remove('hasOrderReceipt'); $('pedido').hidden=false; resetAll(); syncCart(); };
      try { sessionStorage.setItem('AMARED_LAST_ORDER_V2',JSON.stringify({orderId,message,at:Date.now()})); sessionStorage.removeItem('AMARED_DRAFT_ID_V2'); } catch {}
      $('pedido').hidden=true; $('mobileCartDock').hidden=true;
      document.body.classList.add('hasOrderReceipt');
      card.tabIndex=-1; card.focus({preventScroll:true}); card.scrollIntoView({block:'center',behavior:'smooth'});
    };
    try {
      const receipt=JSON.parse(sessionStorage.getItem('AMARED_LAST_ORDER_V2')||'null');
      if(receipt && Date.now()-receipt.at < 24*60*60*1000 && !shouldUseIndexAdminView()) showOrderSuccess({},receipt.orderId,receipt.message);
    } catch {}
  }
  const isCatalogAdmin = isStore && shouldUseIndexAdminView();
  if (!isStore || isCatalogAdmin) {
    if (isCatalogAdmin) {
      document.body.classList.add('workspacePage','is-app');
      $('postres').querySelector('.sectionKicker').textContent = 'CATÁLOGO Y OPINIONES';
      $('postres').querySelector('.cardTitle').textContent = 'Vista del catálogo';
      $('postres').querySelector('.catalogLead').textContent = 'Así se muestran los postres disponibles en la tienda.';
      const editor = $('indexAdminSection');
      editor.querySelector('.cardTitle').textContent = 'Catálogo y opiniones';
      document.querySelector('.layoutPremium').before(editor);
    }
    const nav=document.createElement('nav'); nav.className='workspaceNav'; nav.setAttribute('aria-label','Secciones del equipo');
    nav.innerHTML='<a href="hub.html" class="workspaceNavLogo"><img src="assets/Logo-Amared.svg" alt="AMARED" width="140" height="48"></a><span class="navLabel">Mi espacio de trabajo</span>';
    const entries=[['hub.html','Inicio'],['admin.html','Pedidos y pagos'],['kitchen.html','Cocina'],['delivery.html','Envíos'],['costs.html','Compras y recetas'],['index.html?admin=1','Catálogo y opiniones'],['profiles.html','Perfiles']];
    const roles=[[],['admin','payments','pago','pagos'],['admin','kitchen','cocina'],['admin','delivery','envios'],['admin','costs','purchases','costos','compras'],['admin','index_admin','indexadmin','pedidosweb','weborders'],['admin','profiles','perfiles']];
    const page=isCatalogAdmin ? 'index.html?admin=1' : location.pathname.split('/').pop();
    const renderNav=()=>{
      let categories=[];
      try { const session=JSON.parse(sessionStorage.getItem('AMARED_HUB_SESSION_V1')||localStorage.getItem('AMARED_HUB_REMEMBER_V1')||'null'); categories=session?.categories||[]; } catch {}
      if (!Array.isArray(categories)) categories=String(categories).split(',');
      nav.querySelectorAll('[data-module]').forEach(n=>n.remove());
      entries.forEach(([href,label],i)=>{
        if(i && !roles[i].some(r=>categories.includes(r)) && href!==page) return;
        const a=document.createElement('a'); a.href=href;a.textContent=label;a.dataset.module='1';
        if(href===page) a.setAttribute('aria-current','page');
        a.addEventListener('click',()=>{
          // Match the existing hub session contract when navigating between modules.
          try {
            const s=JSON.parse(sessionStorage.getItem('AMARED_HUB_SESSION_V1')||localStorage.getItem('AMARED_HUB_REMEMBER_V1')||'null');
            if(!s?.id || !s?.password) return;
            const put=(key,value)=>sessionStorage.setItem(key,JSON.stringify(value));
            if(href==='admin.html')put('AMARED_ADMIN',{operator:s.label,operatorId:s.id,pin:s.password});
            if(href==='kitchen.html')put('AMARED_KITCHEN_SESSION_V6',{operatorId:s.id,operatorLabel:s.label,pin:s.password,categories:s.categories||[]});
            if(href==='delivery.html')put('AMARED_DELIVERY_SESSION_V4',{operator:{id:s.id,label:s.label},pin:s.password});
            if(href==='costs.html')put('AMARED_COSTS_SESSION_V1',{...s,remember:false});
            if(href==='profiles.html')put('AMARED_PROFILES_SESSION_V1',{...s,remember:false});
            a.href=href+(href.includes('?')?'&':'?')+'hub=1';
          } catch {}
        });
        nav.append(a);
      });
      const a=document.createElement('a');a.href='index.html';a.className='navStore';a.textContent='Ver la tienda ↗';a.dataset.module='1';nav.append(a);
    };
    document.body.prepend(nav);document.body.classList.add('hasWorkspaceNav');renderNav();
    new MutationObserver(renderNav).observe(document.body,{attributes:true,attributeFilter:['class']});
    if(page==='admin.html') {
      const toolbar=document.createElement('div');toolbar.className='orderToolbar';
      toolbar.innerHTML='<div><label for="orderSearch">Buscar un pedido pendiente</label><input id="orderSearch" class="input" type="search" placeholder="Nombre, teléfono o código…" autocomplete="off"></div><div class="pendingValue"><small>Subtotal pendiente de pago</small><strong id="pendingAmount">—</strong></div><div id="orderSearchStatus" class="small" role="status"></div>';
      $('list').before(toolbar);
      const update=()=>{
        if(typeof pendingOrdersCache==='undefined') return;
        const q=$('orderSearch').value.trim().toLocaleLowerCase('es');
        const orders=pendingOrdersCache.filter(o=>[o.customer_name,o.phone,o.order_id].some(v=>String(v||'').toLocaleLowerCase('es').includes(q)));
        setText($('pendingAmount'),moneyUX(orders.reduce((s,o)=>s+Number(o.subtotal||0),0)));
        setText($('orderSearchStatus'),q ? `${orders.length} coincidencias` : `${orders.length} pedidos pendientes`);
        return orders;
      };
      $('orderSearch').addEventListener('input',()=>renderOrdersList($('list'),update(),{mode:'PENDIENTES'}));
      new MutationObserver(update).observe($('list'),{childList:true});update();
    }
  }
})();
