'use strict';

/* ══════════════════════════════════════════════════════════════════
   PRESUPRO STUDIO — script.js
   ════════════════════════════════════════════════════════════════ */

/* ── TENANT ISOLATION ───────────────────────────────────────────────
   Cuando la app corre en GitHub Pages (dominio compartido), cada
   instalación tiene un ID único para no pisar datos de otros.
   El tenantId se genera una sola vez y se guarda en localStorage.
   ─────────────────────────────────────────────────────────────── */
var _tenantId = (function() {
  var key = 'pp_tenant_id';
  var id  = localStorage.getItem(key);
  if (!id) {
    id = 'pp_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(key, id);
  }
  return id;
})();

function _k(name) { return _tenantId + '_' + name; }

var KEYS = {
  businessConfig: _k('business'),
  brandConfig:    _k('brand'),
  catalog:        _k('catalog'),
  budgetConfig:   _k('budgetcfg'),
  history:        _k('history'),
  lastNumber:     _k('lastnumber'),
  password:       _k('adminpw'),
  waMessage:      _k('wamessage'),
};

/* ══ SUPABASE CONFIG ═════════════════════════════════════════════════
   1. Creá cuenta en supabase.com (gratis)
   2. Creá un proyecto
   3. Ejecutá supabase_setup.sql en el SQL Editor
   4. Copiá la Project URL y la anon public key de Settings → API
   ════════════════════════════════════════════════════════════════ */
/* ══ SUPABASE — configuración del producto ══════════════════════════
   Como dueño del producto, reemplazá estos valores una sola vez.
   Tus clientes nunca necesitan tocar esto.
   ════════════════════════════════════════════════════════════════ */
/* URL y anon key van acá — la anon key es pública por diseño en Supabase,
   es seguro tenerla en el código. Solo permite lo que las políticas RLS permiten. */
var SB = {
  url: 'https://pdkpsbcivgndqhwitrrh.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBka3BzYmNpdmduZHFod2l0cnJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4ODQzNjgsImV4cCI6MjA5MTQ2MDM2OH0.2v3mZfrceP0pyGOCkiZNcq3AT5Pzte1qkJLP_RTNDBE',
};
function SB_ENABLED() { return true; }

/* ── URL BASE DEL VIEWER ─────────────────────────────────────────────
   Una vez que subas los archivos a GitHub Pages o Netlify,
   reemplazá esta variable con tu URL pública.
   Ejemplos:
     GitHub Pages: 'https://tu-usuario.github.io/presupro'
     Netlify:      'https://mi-app.netlify.app'
     Dominio:      'https://presupros.midominio.com'
   ─────────────────────────────────────────────────────────────────── */
var VIEWER_BASE_URL = '';   // ← pegar tu URL aquí (sin barra al final)

function sbFetch(method, path, body) {
  if (!SB_ENABLED()) {
    return Promise.reject(new Error('Supabase no configurado — pegá tu anon key en script.js línea 49'));
  }
  var key = SB.key;
  return fetch(SB.url + '/rest/v1/' + path, {
    method: method,
    headers: {
      'apikey':        key,
      'Authorization': 'Bearer ' + key,
      'Content-Type':  'application/json',
      'Prefer':        method === 'POST' ? 'return=representation' : '',
    },
    body: body ? JSON.stringify(body) : undefined,
  }).then(function(r) {
    if (!r.ok) return r.text().then(function(t){
      var msg = t; try { var j=JSON.parse(t); msg=j.message||j.hint||t; } catch(e){}
      throw new Error('Supabase error ' + r.status + ': ' + msg);
    });
    return r.json().catch(function(){ return {}; });
  });
}

var DEFAULTS = {
  businessConfig: {
    bizName:'', slogan:'',
    phone:'', whatsapp:'',
    email:'', website:'',
    address:'', cuit:'',
    paymentAlias:'', paymentTerms:'',
    deliveryTime:'',
    legal:'Los precios cotizados tienen validez por el plazo indicado. Pasado dicho plazo se deberá solicitar nueva cotización. Precios sin IVA salvo indicación expresa.',
    logo:'', logoSize:60, signature:'',
    footerText:'', thankYou:'Gracias por su consulta. Quedamos a su disposición.',
  },
  brandConfig: { colorPrimary:'#1b9aaa', colorSecondary:'#0f4c75', colorAccent:'#f0a500', font:'DM Sans', preset:'modern' },
  budgetConfig: { prefix:'PRES-', validityDays:15, currency:'$', defaultTax:0, showDiscount:true, showSurcharge:true, showSignature:true, showLegal:true, showContactFooter:true },
  catalog: [],
};

var STATE = { businessConfig:{}, brandConfig:{}, catalog:[], budgetConfig:{}, history:[] };



/* ══ ONBOARDING ══════════════════════════════════════════════════════
   Se muestra la primera vez que el usuario entra — antes de usar la app.
   Campos obligatorios: nombre del negocio, email, contraseña nueva.
   ════════════════════════════════════════════════════════════════ */
function isOnboardingComplete() {
  var b = STATE.businessConfig;
  return !!(b.bizName && b.bizName.trim() && b.email && b.email.trim());
}

function showOnboarding() {
  var ob = el('onboarding-overlay');
  if (ob) ob.classList.remove('hidden');
}

function hideOnboarding() {
  var ob = el('onboarding-overlay');
  if (ob) ob.classList.add('hidden');
}

function completeOnboarding() {
  var bizName = elVal('ob-biz-name').trim();
  var email   = elVal('ob-email').trim();
  var pw      = elVal('ob-password').trim();
  var pw2     = elVal('ob-password2').trim();

  /* Validate */
  if (!bizName) { obError('El nombre del negocio es obligatorio'); return; }
  if (!email || !email.includes('@')) { obError('Ingresá un email válido'); return; }
  if (!pw || pw.length < 6) { obError('La contraseña debe tener al menos 6 caracteres'); return; }
  if (pw !== pw2) { obError('Las contraseñas no coinciden'); return; }

  /* Save business config */
  STATE.businessConfig.bizName = bizName;
  STATE.businessConfig.slogan  = elVal('ob-slogan').trim();
  STATE.businessConfig.email   = email;
  STATE.businessConfig.phone   = elVal('ob-phone').trim();
  save(KEYS.businessConfig, STATE.businessConfig);

  /* Save new password */
  localStorage.setItem(KEYS.password, pw);
  sessionStorage.setItem(APP_SESSION_KEY, '1');

  hideOnboarding();
  applyBrand();
  populateAdminForms();
  populateLoginScreen();
  toast('¡Bienvenido! Tu cuenta está lista ✓', 'success');
}

function obError(msg) {
  var e = el('ob-error');
  if (e) { e.textContent = msg; e.style.display = 'block'; }
}

/* ══ SESIÓN DE APP ═══════════════════════════════════════════════════
   La contraseña protege TODO — no solo el panel admin.
   Se guarda en sessionStorage (se cierra al cerrar la pestaña).
   ════════════════════════════════════════════════════════════════ */
var APP_SESSION_KEY = 'pp_session_ok';

function isLoggedIn() {
  return sessionStorage.getItem(APP_SESSION_KEY) === '1';
}

function checkAppLogin() {
  var pw     = document.getElementById('app-pw-input') ?
               document.getElementById('app-pw-input').value : '';
  var stored = localStorage.getItem(KEYS.password) || 'admin123';
  if (pw === stored) {
    sessionStorage.setItem(APP_SESSION_KEY, '1');
    document.getElementById('app-login-screen').classList.add('hidden');
    document.getElementById('app-pw-input').value = '';
    /* Check onboarding first */
    if (!isOnboardingComplete()) {
      showOnboarding();
    } else {
      initApp();
    }
  } else {
    var errEl = document.getElementById('app-login-error');
    if (errEl) { errEl.style.display = 'block'; }
    var inp = document.getElementById('app-pw-input');
    if (inp) {
      inp.style.borderColor = '#b93333';
      inp.style.boxShadow   = '0 0 0 2px rgba(185,51,51,.15)';
      setTimeout(function(){ inp.style.borderColor=''; inp.style.boxShadow=''; }, 1500);
    }
  }
}

function appLogout() {
  sessionStorage.removeItem(APP_SESSION_KEY);
  /* Show login screen */
  var ls = document.getElementById('app-login-screen');
  if (ls) { ls.classList.remove('hidden'); }
  var inp = document.getElementById('app-pw-input');
  if (inp) { inp.value = ''; setTimeout(function(){ inp.focus(); }, 100); }
}

/* Populate login screen with business branding */
function populateLoginScreen() {
  var b = STATE.businessConfig;
  var nameEl   = document.getElementById('login-biz-name');
  var slogEl   = document.getElementById('login-biz-slogan');
  var logoEl   = document.getElementById('login-biz-logo');
  var iconEl   = document.getElementById('login-biz-icon');
  if (nameEl)  nameEl.textContent  = b.bizName  || 'PresuPro Studio';
  if (slogEl)  slogEl.textContent  = b.slogan   || 'Presupuestos profesionales en minutos';
  if (b.logo && logoEl) {
    logoEl.src = b.logo; logoEl.style.display = 'block';
    if (iconEl) iconEl.style.display = 'none';
  }
}

/* ══ ARRANQUE ═══════════════════════════════════════════════════════ */
/* Auto-refresh interval when on history tab */
var _refreshInterval = null;
function startAutoRefresh() {
  if (_refreshInterval) return;
  _refreshInterval = setInterval(function() {
    var historyView = el('view-history');
    if (historyView && historyView.classList.contains('active')) {
      refreshHistoryStatuses();
    }
  }, 15000); /* every 15 seconds */
}

document.addEventListener('DOMContentLoaded', function() {
  loadAll();
  /* Load Supabase key from localStorage if available */
  var savedKey = localStorage.getItem('pp_sb_key');
  if (savedKey && savedKey.length > 20) SB.key = savedKey;

  /* Populate login screen branding before showing anything */
  populateLoginScreen();

  if (!isLoggedIn()) {
    /* Show login — don't init the app yet */
    var ls = document.getElementById('app-login-screen');
    if (ls) { ls.classList.remove('hidden'); }
    var inp = document.getElementById('app-pw-input');
    if (inp) setTimeout(function(){ inp.focus(); }, 150);
    return;
  }

  /* Already logged in — hide login screen */
  var ls = document.getElementById('app-login-screen');
  if (ls) ls.classList.add('hidden');
  /* Check onboarding */
  if (!isOnboardingComplete()) {
    showOnboarding();
  } else {
    initApp();
  }
});

function initApp() {
  applyBrand();
  initBudgetMeta();
  startAutoRefresh();
  addItem();
  updatePreview();
  renderHistory();
  populateAdminForms();
  setTimeout(refreshHistoryStatuses, 1500);
}

/* ══ PERSISTENCIA ═══════════════════════════════════════════════════ */
function loadAll() {
  STATE.businessConfig = loadOrDefault(KEYS.businessConfig, DEFAULTS.businessConfig);
  STATE.brandConfig    = loadOrDefault(KEYS.brandConfig,    DEFAULTS.brandConfig);
  STATE.catalog        = loadOrDefault(KEYS.catalog,        DEFAULTS.catalog);
  STATE.budgetConfig   = loadOrDefault(KEYS.budgetConfig,   DEFAULTS.budgetConfig);
  STATE.history        = loadOrDefault(KEYS.history,        []);
  /* Migrate: fix any corrupted status fields saved as objects */
  var migrated = false;
  STATE.history.forEach(function(h) {
    var st = h.status;
    if (st && typeof st === 'object') { h.status = st.status || st.value || 'sent'; migrated = true; }
    else if (st === '[object Object]') { h.status = 'sent'; migrated = true; }
    else if (st && typeof st === 'string' && ['sent','viewed','accepted','rejected'].indexOf(st) === -1) { h.status = 'sent'; migrated = true; }
    else if (!st && h.sbId) { h.status = 'sent'; migrated = true; }
  });
  if (migrated) save(KEYS.history, STATE.history);
}
function loadOrDefault(key, def) {
  var isArr = Array.isArray(def);
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return isArr ? def.slice() : Object.assign({}, def);
    var parsed = JSON.parse(raw);
    if (isArr) return Array.isArray(parsed) ? parsed : def.slice();
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? Object.assign({}, def, parsed) : Object.assign({}, def);
  } catch(e) { return isArr ? def.slice() : Object.assign({}, def); }
}
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {} }

/* ══ MARCA ═══════════════════════════════════════════════════════════ */
function applyBrand() {
  var b=STATE.businessConfig, br=STATE.brandConfig;
  setCSSVar('--color-primary',   br.colorPrimary   ||'#1b9aaa');
  setCSSVar('--color-secondary', br.colorSecondary ||'#0f4c75');
  setCSSVar('--color-accent',    br.colorAccent    ||'#f0a500');
  var ne=el('header-biz-name'), sl=el('header-biz-slogan');
  if(ne) ne.textContent = b.bizName||'Mi Negocio';
  if(sl) sl.textContent = b.slogan||'';
  if(b.logo){ show('header-logo'); hide('header-logo-placeholder'); var li=el('header-logo'); if(li) li.src=b.logo; }
  else { hide('header-logo'); show('header-logo-placeholder'); }
}
function setCSSVar(n,v){ document.documentElement.style.setProperty(n,v); }

var PRESETS = {
  elegant:  {colorPrimary:'#c9a84c',colorSecondary:'#1a1a2e',colorAccent:'#e8c97a'},
  modern:   {colorPrimary:'#1b9aaa',colorSecondary:'#0f4c75',colorAccent:'#f0a500'},
  minimal:  {colorPrimary:'#2d2d2d',colorSecondary:'#555555',colorAccent:'#999999'},
  corporate:{colorPrimary:'#0066cc',colorSecondary:'#003366',colorAccent:'#ff9900'},
  warm:     {colorPrimary:'#e07b39',colorSecondary:'#7b3f00',colorAccent:'#f5c842'},
};
function applyPreset(name, btn) {
  var p=PRESETS[name]; if(!p) return;
  STATE.brandConfig.colorPrimary=p.colorPrimary; STATE.brandConfig.colorSecondary=p.colorSecondary; STATE.brandConfig.colorAccent=p.colorAccent; STATE.brandConfig.preset=name;
  setCSSVar('--color-primary',p.colorPrimary); setCSSVar('--color-secondary',p.colorSecondary); setCSSVar('--color-accent',p.colorAccent);
  syncColorInputsToState();
  qsa('.preset-btn').forEach(function(b){b.classList.remove('active');}); if(btn) btn.classList.add('active');
  updatePreview();
}
function applyColorsFromInputs() {
  var p=elVal('cfg-color-primary'),s=elVal('cfg-color-secondary'),a=elVal('cfg-color-accent');
  if(p){STATE.brandConfig.colorPrimary=p;   setCSSVar('--color-primary',p);}
  if(s){STATE.brandConfig.colorSecondary=s; setCSSVar('--color-secondary',s);}
  if(a){STATE.brandConfig.colorAccent=a;    setCSSVar('--color-accent',a);}
  syncHexLabels(); updatePreview();
}
function syncColorInputsToState() {
  setVal('cfg-color-primary',  STATE.brandConfig.colorPrimary  ||'#1b9aaa');
  setVal('cfg-color-secondary',STATE.brandConfig.colorSecondary||'#0f4c75');
  setVal('cfg-color-accent',   STATE.brandConfig.colorAccent   ||'#f0a500');
  syncHexLabels();
}
function syncHexLabels() {
  ['primary','secondary','accent'].forEach(function(k){ var cv=elVal('cfg-color-'+k),hx=el('cfg-color-'+k+'-hex'); if(hx&&cv) hx.value=cv; });
}
function syncColorHex(which) {
  var hx=el('cfg-color-'+which+'-hex'),ci=el('cfg-color-'+which); if(!hx||!ci) return;
  var v=hx.value.trim(); if(/^#[0-9a-fA-F]{6}$/.test(v)){ci.value=v; applyColorsFromInputs();}
}

/* ══ META PRESUPUESTO ════════════════════════════════════════════════ */
function initBudgetMeta() {
  var cfg=STATE.budgetConfig, today=new Date(), vd=new Date(today);
  vd.setDate(today.getDate()+(cfg.validityDays||15));
  setVal('f-budget-date', fmtDateISO(today)); setVal('f-budget-valid',fmtDateISO(vd));
  setVal('f-budget-number',nextBudgetNumber()); setVal('f-tax',cfg.defaultTax||0);
  toggleVisible('wrap-discount', cfg.showDiscount!==false);
  toggleVisible('wrap-surcharge',cfg.showSurcharge!==false);
  toggleVisible('wrap-tax',(cfg.defaultTax||0)>0);
}
function nextBudgetNumber() {
  var prefix=STATE.budgetConfig.prefix||'PRES-', last=parseInt(localStorage.getItem(KEYS.lastNumber)||'0',10);
  return prefix+String(last+1).padStart(4,'0');
}
function bumpBudgetNumber() {
  var c=parseInt(localStorage.getItem(KEYS.lastNumber)||'0',10); localStorage.setItem(KEYS.lastNumber,String(c+1));
}

/* ══ ÍTEMS ═══════════════════════════════════════════════════════════ */
var itemCounter=0;
function addItem(prefill) {
  var id=++itemCounter, container=el('items-container'); if(!container) return;
  var acts=STATE.catalog.filter(function(s){return s.active;}), cur=STATE.budgetConfig.currency||'$';
  var opts=acts.map(function(s){return '<option value="'+s.id+'">'+escHtml(s.name)+' ('+escHtml(s.unit)+')</option>';}).join('');
  var row=document.createElement('div'); row.className='item-row'; row.id='item-row-'+id;
  row.innerHTML=
    '<div class="field"><label>Servicio / Descripción</label>'+
    '<select class="item-service-select" id="item-svc-'+id+'" onchange="onServiceSelect('+id+')">'+
    '<option value="">— Seleccioná o escribí —</option>'+opts+'<option value="__custom">Personalizado...</option></select>'+
    '<input type="text" id="item-name-'+id+'" placeholder="Descripción del ítem" style="margin-top:6px;display:none" oninput="calcItemSubtotal('+id+');updatePreview()"/></div>'+
    '<div class="field"><label>Cant.</label><input type="number" id="item-qty-'+id+'" value="1" min="0.01" step="0.01" oninput="calcItemSubtotal('+id+');updatePreview()"/></div>'+
    '<div class="field"><label>Precio unit. ('+cur+')</label><input type="number" id="item-price-'+id+'" value="" min="0" step="0.01" placeholder="0.00" oninput="calcItemSubtotal('+id+');updatePreview()"/></div>'+
    '<div class="field item-subtotal" id="item-sub-'+id+'">'+cur+' 0,00</div>'+
    '<button class="item-delete" onclick="removeItem('+id+')" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>';
  container.appendChild(row);
  if(prefill){
    if(prefill.svcId&&prefill.svcId!=='__custom'&&prefill.svcId!==''){el('item-svc-'+id).value=prefill.svcId;}
    else if(prefill.name){el('item-svc-'+id).value='__custom';el('item-name-'+id).style.display='block';el('item-name-'+id).value=prefill.name;}
    if(prefill.qty)   el('item-qty-'+id).value=prefill.qty;
    if(prefill.price) el('item-price-'+id).value=prefill.price;
    calcItemSubtotal(id);
  }
}
function onServiceSelect(id) {
  var sv=el('item-svc-'+id),nm=el('item-name-'+id),pr=el('item-price-'+id); if(!sv) return;
  var val=sv.value;
  if(val==='__custom'){nm.style.display='block';nm.focus();}
  else if(val){nm.style.display='none';var s=STATE.catalog.find(function(x){return x.id===val;});if(s&&!pr.value)pr.value=s.price;}
  else nm.style.display='none';
  calcItemSubtotal(id); updatePreview();
}
function calcItemSubtotal(id) {
  var qty=parseFloat(elVal('item-qty-'+id))||0, price=parseFloat(elVal('item-price-'+id))||0, sub=qty*price;
  var se=el('item-sub-'+id); if(se) se.textContent=(STATE.budgetConfig.currency||'$')+' '+fmtNum(sub); return sub;
}
function removeItem(id) {
  var row=el('item-row-'+id); if(!row) return;
  row.style.opacity='0'; row.style.transform='translateX(-10px)'; row.style.transition='.2s';
  setTimeout(function(){row.remove();updatePreview();},220);
}
function getItems() {
  var rows=qsa('#items-container .item-row'), result=[];
  rows.forEach(function(row){
    var id=row.id.replace('item-row-',''), sv=el('item-svc-'+id), nm=el('item-name-'+id);
    if(!sv) return;
    var val=sv.value, name='',desc='',unit='';
    if(val==='__custom'){name=nm?nm.value.trim():'';}
    else if(val){var s=STATE.catalog.find(function(x){return x.id===val;});if(s){name=s.name;desc=s.description||'';unit=s.unit||'';}}
    var qty=parseFloat(elVal('item-qty-'+id))||0, price=parseFloat(elVal('item-price-'+id))||0;
    if(name&&qty>0) result.push({id:id,svcId:val,name:name,description:desc,unit:unit,qty:qty,price:price,subtotal:qty*price});
  });
  return result;
}

/* ══ CÁLCULOS ════════════════════════════════════════════════════════ */
function calcTotals(items) {
  var sub=items.reduce(function(a,i){return a+i.subtotal;},0);
  var dp=parseFloat(elVal('f-discount'))||0, sp=parseFloat(elVal('f-surcharge'))||0, tp=parseFloat(elVal('f-tax'))||0;
  var da=sub*(dp/100), sa=(sub-da)*(sp/100), base=sub-da+sa, ta=base*(tp/100);
  return {subtotal:sub,discPct:dp,discAmt:da,surgePct:sp,surgeAmt:sa,taxPct:tp,taxAmt:ta,total:base+ta};
}

/* ══ PREVIEW ═════════════════════════════════════════════════════════ */
function updatePreview() {
  var c=el('budget-preview'); if(!c) return;
  try{ c.innerHTML=renderBudgetHTML(collectBudgetData()); }catch(e){ console.warn('preview error:',e); }
}
function collectBudgetData() {
  var items=getItems();
  return {
    biz:STATE.businessConfig, brand:STATE.brandConfig, cfg:STATE.budgetConfig, currency:STATE.budgetConfig.currency||'$',
    client:{name:elVal('f-client-name'),company:elVal('f-client-company'),phone:elVal('f-client-phone'),email:elVal('f-client-email'),address:elVal('f-client-address')},
    meta:{number:elVal('f-budget-number'),date:elVal('f-budget-date'),valid:elVal('f-budget-valid')},
    items:items, totals:calcTotals(items), notes:elVal('f-notes'),
  };
}

/* ══ RENDER DOCUMENTO ════════════════════════════════════════════════ */
function renderBudgetHTML(d) {
  var biz=d.biz,brand=d.brand,cfg=d.cfg,client=d.client,meta=d.meta,items=d.items,totals=d.totals,notes=d.notes,currency=d.currency;
  var c=totals;
  var cp=brand.colorPrimary||'#1a1a1a', cs=brand.colorSecondary||'#4a4a4a', ca=brand.colorAccent||'#888';

  var heroBlock=biz.logo
    ?'<img src="'+biz.logo+'" class="bdoc-logo" alt="'+escHtml(biz.bizName||'')+'" style="max-height:'+(biz.logoSize||60)+'px;max-width:'+Math.round((biz.logoSize||60)*3)+'px" />'
    :'<div class="bdoc-hero-name">'+escHtml(biz.bizName||'Mi Negocio')+'</div>';
  var heroSub=biz.slogan?'<div class="bdoc-hero-sub">'+escHtml(biz.slogan).toUpperCase()+'</div>':'';

  var itemsRows='';
  if(items.length>0){
    items.forEach(function(it,idx){
      itemsRows+='<tr class="bdoc-item-row'+(idx%2===1?' bdoc-item-row--alt':'')+'">'+
        '<td class="bdi-n">'+(idx+1)+'</td>'+
        '<td class="bdi-desc"><strong>'+escHtml(it.name)+'</strong>'+(it.description?'<br><span class="bdi-sub">'+escHtml(it.description)+'</span>':'')+'</td>'+
        '<td class="bdi-r">'+currency+'\u00a0'+fmtNum(it.price)+'</td>'+
        '<td class="bdi-c">'+fmtNum(it.qty)+(it.unit?'\u00a0'+escHtml(it.unit):'')+'</td>'+
        '<td class="bdi-total">'+currency+'\u00a0'+fmtNum(it.subtotal)+'</td></tr>';
    });
  } else {
    itemsRows='<tr><td colspan="5" class="bdi-empty">Sin ítems agregados</td></tr>';
  }

  var tRows=
    '<tr><td class="btot-l">Subtotal</td><td class="btot-v">'+currency+'\u00a0'+fmtNum(c.subtotal)+'</td></tr>'+
    (c.discPct>0?'<tr class="btot-red"><td class="btot-l">Descuento ('+c.discPct+'%)</td><td class="btot-v">&minus; '+currency+'\u00a0'+fmtNum(c.discAmt)+'</td></tr>':'')+
    (c.surgePct>0?'<tr><td class="btot-l">Recargo ('+c.surgePct+'%)</td><td class="btot-v">+ '+currency+'\u00a0'+fmtNum(c.surgeAmt)+'</td></tr>':'')+
    (c.taxPct>0?'<tr><td class="btot-l">Impuesto ('+c.taxPct+'%)</td><td class="btot-v">+ '+currency+'\u00a0'+fmtNum(c.taxAmt)+'</td></tr>':'')+
    '<tr class="btot-grand"><td>TOTAL</td><td>'+currency+'\u00a0'+fmtNum(c.total)+'</td></tr>';

  var bizInfo=[];
  if(biz.phone)   bizInfo.push(escHtml(biz.phone));
  if(biz.email)   bizInfo.push(escHtml(biz.email));
  if(biz.website) bizInfo.push(escHtml(biz.website));
  if(biz.address) bizInfo.push(escHtml(biz.address));

  return (
    '<div class="budget-doc" style="--cp:'+cp+';--cs:'+cs+';--ca:'+ca+'">'+
    '<div class="bdoc-head">'+
      '<div class="bdoc-head-left">'+heroBlock+heroSub+'</div>'+
      '<div class="bdoc-head-right">'+
        '<table class="bdoc-meta-table">'+
          '<tr><td class="bmt-k">PRESUPUESTO</td><td class="bmt-v">'+escHtml(meta.number||'')+'</td></tr>'+
          '<tr><td class="bmt-k">FECHA</td><td class="bmt-v">'+(meta.date?fmtDateDisplay(meta.date):'—')+'</td></tr>'+
          '<tr><td class="bmt-k">VÁLIDO HASTA</td><td class="bmt-v">'+(meta.valid?fmtDateDisplay(meta.valid):'—')+'</td></tr>'+
          (biz.cuit?'<tr><td class="bmt-k">CUIT</td><td class="bmt-v">'+escHtml(biz.cuit)+'</td></tr>':'')+
        '</table>'+
      '</div>'+
    '</div>'+
    '<div class="bdoc-band"></div>'+
    '<div class="bdoc-section-client">'+
      '<div class="bdoc-client-col">'+
        '<div class="bdoc-label-tag">CLIENTE</div>'+
        '<div class="bdoc-client-main">'+(client.name?escHtml(client.name):'<span class="bdoc-placeholder">Sin nombre</span>')+'</div>'+
        (client.company?'<div class="bdoc-client-info">'+escHtml(client.company)+'</div>':'')+
        (client.phone?  '<div class="bdoc-client-info">'+escHtml(client.phone)+'</div>':'')+
        (client.email?  '<div class="bdoc-client-info">'+escHtml(client.email)+'</div>':'')+
        (client.address?'<div class="bdoc-client-info">'+escHtml(client.address)+'</div>':'')+
      '</div>'+
      ((biz.paymentTerms||biz.deliveryTime)?
        '<div class="bdoc-client-col bdoc-client-col--right">'+
          (biz.paymentTerms?'<div class="bdoc-label-tag">CONDICIONES DE PAGO</div><div class="bdoc-client-info">'+escHtml(biz.paymentTerms)+'</div>':'')+
          (biz.deliveryTime?'<div class="bdoc-label-tag" style="margin-top:10px">ENTREGA</div><div class="bdoc-client-info">'+escHtml(biz.deliveryTime)+'</div>':'')+
        '</div>':'')+'</div>'+
    '<table class="bdoc-items-table">'+
      '<thead><tr>'+
        '<th class="bdi-n">N\u00b0</th><th class="bdi-desc">DESCRIPCI\u00d3N</th>'+
        '<th class="bdi-r">PRECIO</th><th class="bdi-c">CANTIDAD</th><th class="bdi-total">TOTAL</th>'+
      '</tr></thead><tbody>'+itemsRows+'</tbody></table>'+
    '<div class="bdoc-lower">'+
      '<div class="bdoc-lower-left">'+
        (notes?'<div class="bdoc-label-tag">OBSERVACIONES</div><div class="bdoc-notes-text">'+escHtml(notes)+'</div>':'')+'</div>'+
      '<div class="bdoc-lower-right"><table class="bdoc-totals-tbl">'+tRows+'</table></div>'+
    '</div>'+
    (cfg.showLegal&&biz.legal?'<div class="bdoc-legal-block">'+escHtml(biz.legal)+'</div>':'')+
    (cfg.showSignature&&biz.signature?'<div class="bdoc-sig-block"><div class="bdoc-sig-line"></div><div class="bdoc-sig-name">'+escHtml(biz.signature)+'</div></div>':'')+
    (cfg.showContactFooter?
      '<div class="bdoc-footer">'+
        '<div class="bdoc-footer-biz">'+bizInfo.join('&emsp;&middot;&emsp;')+'</div>'+
        '<div class="bdoc-footer-right">'+
          (biz.footerText?'<div>'+escHtml(biz.footerText)+'</div>':'')+
          (biz.thankYou?'<div class="bdoc-footer-ty">'+escHtml(biz.thankYou)+'</div>':'')+
        '</div></div>':'')+
    '</div>'
  );
}

/* ══ EXPORT PDF ══════════════════════════════════════════════════════ */
function exportPDF() {
  var data=collectBudgetData();
  if(!data.client.name)    {toast('Completá el nombre del cliente antes de exportar','error');return;}
  if(data.items.length<1)  {toast('Seleccioná al menos un servicio antes de exportar','error');return;}
  toast('Preparando PDF...','info');
  copyWAMessage(true);
  var html=buildPrintHTML(data);
  var iframe=document.createElement('iframe');
  iframe.style.cssText='position:fixed;left:-9999px;top:0;width:210mm;height:297mm;border:none;';
  document.body.appendChild(iframe);
  iframe.onload=function(){
    try{
      iframe.contentWindow.focus(); iframe.contentWindow.print();
      toast('Elegí "Guardar como PDF" en el diálogo \u2713','success');
    }catch(e){ fallbackPrint(html); }
    setTimeout(function(){if(iframe.parentNode)iframe.parentNode.removeChild(iframe);},2500);
  };
  try{iframe.srcdoc=html;}catch(e){iframe.contentWindow.document.open();iframe.contentWindow.document.write(html);iframe.contentWindow.document.close();}
}
function fallbackPrint(html){
  var win=window.open('','_blank');
  if(!win){toast('Habilitá los popups para exportar PDF','error');return;}
  win.document.open(); win.document.write(html); win.document.close(); win.focus();
  setTimeout(function(){win.print();},800);
  toast('Elegí "Guardar como PDF" \u2713','success');
}
function buildPrintHTML(data) {
  var brand = data.brand || {};
  var p = brand.colorPrimary   || '#1a1a1a';
  var s = brand.colorSecondary || '#4a4a4a';
  var a = brand.colorAccent    || '#888888';
  var biz    = data.biz    || {};
  var meta   = data.meta   || {};
  var num    = meta.number ? escHtml(meta.number) : '';

  /* ── Compact header for repeated pages ── */
  var logoSize = biz.logoSize || 60;
  var logoHTML = biz.logo
    ? '<img src="' + biz.logo + '" style="max-height:' + Math.round(logoSize * 0.55) + 'px;max-width:140px;object-fit:contain;display:block;" alt="" />'
    : '<span style="font-family:\'DM Serif Display\',serif;font-size:16px;font-weight:400;letter-spacing:-0.5px;color:' + p + '">' + escHtml(biz.bizName || '') + '</span>';

  /* ── Fixed header HTML ── */
  var pageHeader =
    '<div class="ph-wrap">' +
      '<div class="ph-left">' + logoHTML + '</div>' +
      '<div class="ph-right">' +
        '<span class="ph-label">PRESUPUESTO</span>' +
        '<span class="ph-num">' + escHtml(meta.number || '') + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="ph-band"></div>';

  /* ── Fixed footer HTML ── */
  var footerParts = [];
  if (biz.phone)   footerParts.push(escHtml(biz.phone));
  if (biz.email)   footerParts.push(escHtml(biz.email));
  if (biz.website) footerParts.push(escHtml(biz.website));
  if (biz.address) footerParts.push(escHtml(biz.address));

  var pageFooter =
    '<div class="pf-wrap">' +
      '<div class="pf-left">' + footerParts.join(' &nbsp;&middot;&nbsp; ') + '</div>' +
      '<div class="pf-right">' + escHtml(biz.footerText || '') + '</div>' +
    '</div>';

  /* ── Main body (no header/footer — those are fixed) ── */
  var bodyHTML = renderBudgetHTML(data);

  /* ── CSS ── */
  var css = buildPDFStyles(brand);

  return '<!DOCTYPE html>' +
    '<html lang="es"><head><meta charset="UTF-8"/>' +
    '<title>Presupuesto ' + num + '</title>' +
    '<style>' + css + '</style></head>' +
    '<body>' +
      '<div class="page-header">' + pageHeader + '</div>' +
      '<div class="page-footer">' + pageFooter + '</div>' +
      '<div class="page-content">' + bodyHTML + '</div>' +
    '</body></html>';
}

function buildPDFStyles(brand) {
  var p = (brand && brand.colorPrimary)   || '#1a1a1a';
  var s = (brand && brand.colorSecondary) || '#4a4a4a';
  var a = (brand && brand.colorAccent)    || '#888888';

  /* Header height + footer height in mm — must match @page margins */
  var HH = '18mm'; /* header height  → top margin    */
  var FH = '12mm'; /* footer height  → bottom margin */

  return [
    '@import url("https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap");',

    /* ── BASE ── */
    '*{box-sizing:border-box;margin:0;padding:0;}',
    "html,body{font-family:'DM Sans',sans-serif;background:#fff;color:#1a1a1a;",
    "  -webkit-print-color-adjust:exact;print-color-adjust:exact;}",

    /* ── PAGE ── */
    '@media print{',
    '  @page{',
    '    size:A4 portrait;',
    '    margin-top:' + HH + ';',
    '    margin-bottom:' + FH + ';',
    '    margin-left:0;',
    '    margin-right:0;',
    '  }',
    '  .bdoc-head{display:none !important;}',     /* hide the first-page header from the doc body */
    '  .bdoc-footer{display:none !important;}',   /* hide inline footer — repeated one is fixed */
    '}',

    /* ── FIXED HEADER (repeats on every page) ── */
    '.page-header{',
    '  position:fixed;top:0;left:0;right:0;',
    '  background:#fff;',
    '  z-index:100;',
    '}',
    '.ph-wrap{',
    '  display:flex;justify-content:space-between;align-items:center;',
    '  padding:6mm 14mm 4mm;',
    '}',
    '.ph-left{}',
    '.ph-right{text-align:right;}',
    '.ph-label{display:block;font-size:7px;letter-spacing:.14em;color:#aaa;font-weight:600;text-transform:uppercase;}',
    '.ph-num{display:block;font-size:13px;font-weight:700;color:#1a1a1a;}',
    '.ph-band{height:3px;background:' + p + ';}',

    /* ── FIXED FOOTER (repeats on every page) ── */
    '.page-footer{',
    '  position:fixed;bottom:0;left:0;right:0;',
    '  background:' + p + ';',
    '  z-index:100;',
    '}',
    '.pf-wrap{',
    '  display:flex;justify-content:space-between;align-items:center;',
    '  padding:3mm 14mm;',
    '  color:rgba(255,255,255,.85);font-size:7.5px;',
    '}',
    '.pf-right{text-align:right;color:rgba(255,255,255,.6);}',

    /* ── CONTENT WRAPPER ── */
    '.page-content{',
    '  margin-top:0;',   /* @page top margin already accounts for header */
    '}',

    /* ── DOCUMENT ── */
    ':root{--cp:' + p + ';--cs:' + s + ';--ca:' + a + ';}',
    ".budget-doc{font-family:'DM Sans',sans-serif;font-size:10px;line-height:1.6;color:#1a1a1a;background:#fff;width:100%;}",

    /* ── DOCUMENT HEADER (shown only on first page via @media screen, hidden in print) ── */
    '.bdoc-head{display:flex;justify-content:space-between;align-items:flex-start;padding:32px 48px 24px;}',
    ".bdoc-hero-name{font-family:'DM Serif Display',serif;font-size:40px;font-weight:400;letter-spacing:-1.5px;color:var(--cp);line-height:.95;}",
    '.bdoc-logo{object-fit:contain;display:block;}',
    '.bdoc-hero-sub{font-size:7.5px;letter-spacing:.2em;color:var(--cs);margin-top:7px;font-weight:500;text-transform:uppercase;}',
    '.bdoc-head-right{display:flex;flex-direction:column;align-items:flex-end;}',
    '.bdoc-meta-table{border-collapse:collapse;font-size:9px;}',
    '.bmt-k{color:#aaa;letter-spacing:.1em;font-size:7px;font-weight:600;padding:2px 12px 2px 0;text-align:right;}',
    '.bmt-v{color:#1a1a1a;font-weight:600;text-align:right;font-size:9.5px;}',

    /* ── BAND ── */
    '.bdoc-band{height:3px;background:var(--cp);}',

    /* ── CLIENT ── */
    '.bdoc-section-client{display:flex;padding:18px 48px 16px;border-bottom:1px solid #ebebeb;}',
    '.bdoc-client-col{flex:1;}',
    '.bdoc-client-col--right{flex:1;padding-left:28px;border-left:1px solid #ebebeb;margin-left:28px;}',
    '.bdoc-label-tag{font-size:6.5px;letter-spacing:.2em;color:#bbb;font-weight:700;text-transform:uppercase;margin-bottom:5px;}',
    '.bdoc-client-main{font-size:13px;font-weight:700;color:#1a1a1a;margin-bottom:3px;line-height:1.2;}',
    '.bdoc-client-info{font-size:8.5px;color:#666;line-height:1.8;}',
    '.bdoc-placeholder{color:#ccc;font-style:italic;}',

    /* ── TABLE ── */
    '.bdoc-items-table{width:100%;border-collapse:collapse;}',
    '.bdoc-items-table thead{display:table-header-group;}', /* repeat thead on every page */
    '.bdoc-items-table thead tr{background:var(--cp);}',
    '.bdoc-items-table thead th{padding:9px 13px;color:#fff;font-size:7px;letter-spacing:.14em;font-weight:600;text-transform:uppercase;}',
    '.bdi-n{width:32px;text-align:center;}.bdi-desc{text-align:left;}.bdi-r{text-align:right;width:88px;}.bdi-c{text-align:center;width:88px;}.bdi-total{text-align:right;width:88px;}',
    '.bdoc-item-row{page-break-inside:avoid;}',
    '.bdoc-item-row td{padding:10px 13px;border-bottom:1px solid #f2f2f2;vertical-align:top;}',
    '.bdoc-item-row--alt td{background:#f9f9f9;}',
    '.bdi-n{color:#ccc;font-size:8px;text-align:center;}.bdi-sub{font-size:7.5px;color:#999;font-weight:400;}',
    '.bdi-r{text-align:right;color:#444;}.bdi-c{text-align:center;color:#666;}.bdi-total{text-align:right;font-weight:600;}',
    '.bdi-empty{text-align:center;color:#ccc;padding:24px;font-style:italic;}',

    /* ── LOWER ── */
    '.bdoc-lower{display:flex;justify-content:space-between;align-items:flex-start;padding:18px 48px;gap:28px;page-break-inside:avoid;}',
    '.bdoc-lower-left{flex:1;max-width:55%;}.bdoc-lower-right{min-width:210px;}',
    '.bdoc-notes-text{font-size:8px;color:#666;line-height:1.8;margin-top:5px;}',

    /* ── TOTALS ── */
    '.bdoc-totals-tbl{width:100%;border-collapse:collapse;font-size:9px;}',
    '.bdoc-totals-tbl td{padding:3.5px 0;}.btot-l{color:#888;padding-right:20px;}.btot-v{text-align:right;color:#333;font-weight:500;}',
    '.btot-red td{color:#c0392b;}.btot-grand{border-top:2.5px solid var(--cp);}',
    '.btot-grand td{padding-top:8px;font-size:13px;font-weight:700;color:var(--cp);}',

    /* ── LEGAL / SIGNATURE ── */
    '.bdoc-legal-block{padding:12px 48px;font-size:7px;color:#bbb;line-height:1.8;border-top:1px solid #f0f0f0;page-break-inside:avoid;}',
    '.bdoc-sig-block{padding:0 48px 18px;page-break-inside:avoid;}',
    '.bdoc-sig-line{width:130px;border-top:1.5px solid #ccc;margin-top:28px;margin-bottom:5px;}.bdoc-sig-name{font-size:8px;color:#777;}',

    /* ── INLINE FOOTER (hidden in print — fixed footer used instead) ── */
    '.bdoc-footer{display:flex;justify-content:space-between;align-items:center;padding:12px 48px;background:var(--cp);color:rgba(255,255,255,.9);font-size:8px;}',
    '.bdoc-footer-right{text-align:right;}.bdoc-footer-ty{color:rgba(255,255,255,.55);font-style:italic;margin-top:2px;}',
  ].join('\n');
}


/* ══ GUARDAR / HISTORIAL ═════════════════════════════════════════════ */
/* ══ TRACKING / LINK COMPARTIBLE ════════════════════════════════════ */

/* Status labels and styles */
var STATUS_LABELS = { sent:'Enviado', viewed:'Visto', accepted:'Aceptado', rejected:'Rechazado' };
var STATUS_COLORS = { sent:'#1a5fb4', viewed:'#854d0e', accepted:'#166534', rejected:'#991b1b' };
var STATUS_BG     = { sent:'#e8f0fe', viewed:'#fef9c3', accepted:'#dcfce7', rejected:'#fee2e2' };

function generateLink(idx) {
  if (!SB_ENABLED()) {
    toast('Configurá la anon key de Supabase en script.js primero', 'error');
    return;
  }
  var h = STATE.history[idx]; if (!h) return;

  /* If link already exists — just copy it again, don't create a new one */
  if (h.sbId) {
    var base = VIEWER_BASE_URL ? VIEWER_BASE_URL.replace(/\/$/, '') : window.location.href.replace(/[^/]*$/, '').replace(/\/$/, '');
    var existingUrl = base + '/viewer.html?id=' + h.sbId;
    var doCopyExisting = function(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
          toast('Link copiado al portapapeles ✓', 'success');
        }).catch(function() { prompt('Copiá este link:', text); });
      } else {
        prompt('Copiá este link:', text);
      }
    };
    doCopyExisting(existingUrl);
    return;
  }

  toast('Generando link...', 'info');

  var payload = {
    tenant_id:   _tenantId,
    budget_data: {
      biz:      h.biz,
      brand:    h.brand,
      cfg:      h.cfg,
      currency: h.currency,
      client:   h.client,
      meta:     h.meta,
      items:    h.items,
      totals:   h.totals,
      notes:    h.notes,
    },
    status:     'sent',
    expires_at: null,
  };

  sbFetch('POST', 'budgets_shared', payload)
    .then(function(rows) {
      var row = Array.isArray(rows) ? rows[0] : rows;
      if (!row || !row.id) throw new Error('No se recibió ID');

      /* Store the supabase id on the history entry */
      STATE.history[idx].sbId     = row.id;
      STATE.history[idx].status   = 'sent';
      STATE.history[idx].notified = false;  /* reset so we get notified when accepted */
      STATE.history[idx].viewCount = 0;
      STATE.history[idx].lastViewed = null;
      save(KEYS.history, STATE.history);

      /* Build viewer URL */
      var base;
      if (VIEWER_BASE_URL) {
        /* Use configured public URL (required for sharing with clients) */
        base = VIEWER_BASE_URL.replace(/\/$/, '');
      } else {
        /* Fallback to local path — only works on same machine */
        base = window.location.href.replace(/[^/]*$/, '').replace(/\/$/, '');
      }
      var url = base + '/viewer.html?id=' + row.id;

      /* Warn if still local */
      if (url.indexOf('file://') === 0) {
        toast('⚠️ Link local — el cliente no podrá abrirlo. Configurá VIEWER_BASE_URL en script.js', 'error');
      }

      /* Copy to clipboard */
      var doCopy = function(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function() {
            toast('Link copiado al portapapeles ✓', 'success');
          }).catch(function() { prompt('Copiá este link:', text); });
        } else {
          prompt('Copiá este link:', text);
        }
      };
      doCopy(url);
      renderHistory();
    })
    .catch(function(e) {
      console.error(e);
      toast('Error al generar link: ' + e.message, 'error');
    });
}

/* ── NOTIFICACIÓN DE CAMBIO DE ESTADO ───────────────────────────────
   Cuando un presupuesto pasa a aceptado o rechazado, mostramos:
   1. Un toast grande y persistente
   2. Un banner en la history card
   3. Intento de notificación por email via Supabase (si está configurado)
   ─────────────────────────────────────────────────────────────────── */
function notifyStatusChange(entry, newStatus) {
  var client  = (entry.client  && entry.client.name)  || 'El cliente';
  var number  = (entry.meta    && entry.meta.number)  || '';
  var total   = (entry.totals  && entry.totals.total) || 0;
  var currency= entry.currency || '$';

  if (newStatus === 'accepted') {
    /* Big persistent toast */
    toastPersistent(
      '🎉 ' + client + ' aceptó el presupuesto ' + number + ' · ' + currency + ' ' + fmtNum(total),
      'success'
    );
    /* Browser notification if permitted */
    sendBrowserNotification(
      '✅ Presupuesto aceptado',
      client + ' aceptó ' + number + ' por ' + currency + ' ' + fmtNum(total)
    );
  } else if (newStatus === 'rejected') {
    toastPersistent(
      '❌ ' + client + ' rechazó el presupuesto ' + number,
      'error'
    );
    sendBrowserNotification(
      '❌ Presupuesto rechazado',
      client + ' rechazó ' + number
    );
  }
}

/* Toast que no desaparece hasta que el usuario lo cierra */
function toastPersistent(msg, type) {
  type = type || 'info';
  var icons = { success:'fa-circle-check', error:'fa-circle-xmark', info:'fa-circle-info' };
  var t = document.createElement('div');
  t.className = 'toast toast-persistent ' + type;
  t.innerHTML =
    '<i class="fa-solid ' + (icons[type]||icons.info) + '"></i>' +
    '<span style="flex:1">' + msg + '</span>' +
    '<button onclick="this.parentNode.remove()" style="background:none;border:none;color:inherit;cursor:pointer;padding:0 0 0 12px;font-size:1rem;opacity:.7">✕</button>';
  var c = el('toast-container');
  if (c) c.appendChild(t);
  /* Auto-dismiss after 12 seconds */
  setTimeout(function() { if (t.parentNode) { t.classList.add('out'); setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); }, 400); } }, 12000);
}

/* Browser push notification (requiere permiso del usuario) */
function sendBrowserNotification(title, body) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body: body, icon: '/presupro/favicon.ico' });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(function(p) {
      if (p === 'granted') new Notification(title, { body: body });
    });
  }
}

/* Pedir permiso de notificaciones al cargar (si hay presupuestos pendientes) */
function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    /* Solo pedirlo si hay presupuestos con sbId pendientes */
    var hasPending = STATE.history.some(function(h) {
      return h.sbId && h.status !== 'accepted' && h.status !== 'rejected';
    });
    if (hasPending) Notification.requestPermission();
  }
}

/* ── REFRESH DE ESTADOS ──────────────────────────────────────────────
   Estrategia: siempre consultar Supabase y actualizar.
   La notificación se dispara cuando:
     1. El estado en Supabase es accepted/rejected
     2. El status local era distinto (sent/viewed) → cambio real
   El badge se actualiza siempre sin importar si cambió o no.
   ─────────────────────────────────────────────────────────────── */
function refreshHistoryStatuses() {
  if (!SB_ENABLED()) return;

  var withSbId = STATE.history.filter(function(h) { return !!h.sbId; });
  if (!withSbId.length) return;

  var ids = withSbId.map(function(h){ return h.sbId; }).join(',');

  sbFetch('GET', 'budgets_shared?id=in.(' + ids + ')&select=id,status,view_count,last_viewed_at')
    .then(function(rows) {
      if (!rows || !rows.length) return;
      var changed = false;

      rows.forEach(function(row) {
        var idx = STATE.history.findIndex(function(h){ return h.sbId === row.id; });
        if (idx === -1) return;

        var entry     = STATE.history[idx];
        var newStatus = typeof row.status === 'string' ? row.status : 'sent';
        /* Normalize prevStatus — handle object corruption */
        var prevStatus = entry.status;
        if (prevStatus && typeof prevStatus === 'object') prevStatus = prevStatus.status || 'sent';
        prevStatus = String(prevStatus || 'sent');

        /* Always update counts */
        entry.viewCount  = row.view_count  || entry.viewCount  || 0;
        entry.lastViewed = row.last_viewed_at || entry.lastViewed || null;
        changed = true;

        /* Update status */
        entry.status = newStatus;

        /* Notify if:
           - new status is a final state (accepted/rejected)
           - AND previous local status was not already that final state
             (i.e. this is new information) */
        var wasAlreadyFinal = (prevStatus === 'accepted' || prevStatus === 'rejected');
        if (!wasAlreadyFinal && (newStatus === 'accepted' || newStatus === 'rejected')) {
          notifyStatusChange(entry, newStatus);
        }
      });

      if (changed) { save(KEYS.history, STATE.history); renderHistory(); }
    })
    .catch(function(e){ console.warn('[PresuPro] refresh error:', e.message); });
}


function saveBudget() {
  var data=collectBudgetData();
  if(!data.client.name)   {toast('Completá el nombre del cliente antes de guardar','error');return;}
  if(data.items.length<1) {toast('Agregá al menos un ítem antes de guardar','error');return;}
  bumpBudgetNumber();
  STATE.history.unshift({biz:data.biz,brand:data.brand,cfg:data.cfg,currency:data.currency,client:data.client,meta:data.meta,items:data.items,totals:data.totals,notes:data.notes,savedAt:new Date().toISOString()});
  save(KEYS.history,STATE.history);
  renderHistory();
  toast('Presupuesto guardado \u2713','success');
}
function clearBudget() {
  confirmAction('\u00bfLimpiar presupuesto?','Se borrarán todos los datos del formulario actual.',function(){
    ['f-client-name','f-client-company','f-client-phone','f-client-email','f-client-address','f-notes'].forEach(function(id){setVal(id,'');});
    setVal('f-discount','0'); setVal('f-surcharge','0'); setVal('f-tax',String(STATE.budgetConfig.defaultTax||0));
    var c=el('items-container'); if(c) c.innerHTML=''; itemCounter=0; addItem(); initBudgetMeta(); updatePreview();
    toast('Formulario limpiado','info');
  });
}
function loadBudgetFromHistory(idx) {
  var h=STATE.history[idx]; if(!h) return;
  confirmAction('\u00bfCargar este presupuesto?','Se reemplazarán los datos del formulario actual.',function(){
    var c=h.client||{};
    setVal('f-client-name',c.name||''); setVal('f-client-company',c.company||'');
    setVal('f-client-phone',c.phone||''); setVal('f-client-email',c.email||''); setVal('f-client-address',c.address||'');
    setVal('f-notes',h.notes||'');
    setVal('f-discount',String((h.totals&&h.totals.discPct)||0));
    setVal('f-surcharge',String((h.totals&&h.totals.surgePct)||0));
    setVal('f-tax',String((h.totals&&h.totals.taxPct)||0));
    var cont=el('items-container'); if(cont) cont.innerHTML=''; itemCounter=0;
    (h.items||[]).forEach(function(it){addItem(it);});
    initBudgetMeta(); updatePreview(); switchView('generator');
    toast('Presupuesto cargado \u2713','success');
  });
}
function deleteBudgetFromHistory(idx) {
  confirmAction('\u00bfEliminar presupuesto?','Esta acción no se puede deshacer.',function(){
    STATE.history.splice(idx,1); save(KEYS.history,STATE.history); renderHistory();
    toast('Eliminado','info');
  });
}
function exportHistoryPDF(idx) {
  var h=STATE.history[idx]; if(!h) return;
  var win=window.open('','_blank');
  if(!win){toast('Habilitá los popups para exportar PDF','error');return;}
  win.document.open(); win.document.write(buildPrintHTML(h)); win.document.close(); win.focus();
  setTimeout(function(){win.print();},800);
  toast('Elegí "Guardar como PDF" \u2713','success');
}

/* ══ HISTORIAL CON BÚSQUEDA ══════════════════════════════════════════ */
var historyFilter = { text:'', dateFrom:'', dateTo:'' };

function renderHistory() {
  var container=el('history-list'); if(!container) return;
  var list=getFilteredHistory();
  if(!STATE.history||STATE.history.length===0){
    container.innerHTML='<div class="empty-state"><i class="fa-solid fa-folder-open"></i><h3>Sin presupuestos guardados</h3><p>Creá tu primer presupuesto y guardalo para verlo aquí.</p></div>';
    updateHistoryCount(0,0); return;
  }
  if(list.length===0){
    container.innerHTML='<div class="empty-state"><i class="fa-solid fa-magnifying-glass"></i><h3>Sin resultados</h3><p>No hay presupuestos que coincidan con la búsqueda.</p></div>';
    updateHistoryCount(0,STATE.history.length); return;
  }
  container.innerHTML=list.map(function(item){
    var h=item.h, idx=item.idx, c=h.client||{}, m=h.meta||{}, t=h.totals||{};
    /* Sanitize status — always a plain string */
    var rawStatus = h.status;
    if (rawStatus && typeof rawStatus === 'object') rawStatus = rawStatus.status || rawStatus.value || 'sent';
    var status = String(rawStatus || (h.sbId ? 'sent' : ''));
    /* Handle any corruption including "[object Object]" string */
    if (!status || status.indexOf('[') === 0 || ['sent','viewed','accepted','rejected'].indexOf(status) === -1) {
      /* Try to recover from sbId-based refresh */
      status = h.sbId ? 'sent' : '';
      /* Fix in storage too */
      if (h.status !== status) { h.status = status; save(KEYS.history, STATE.history); }
    }
    var label     = STATUS_LABELS[status] || '';
    var badgeStyle= status ? 'background:'+STATUS_BG[status]+';color:'+STATUS_COLORS[status]+';' : '';
    var viewInfo  = '';
    if (h.sbId && h.viewCount > 0) {
      viewInfo = '<div class="hc-view-info"><i class="fa-solid fa-eye"></i> Visto '+h.viewCount+' vez'+(h.viewCount!==1?'es':'')+
        (h.lastViewed ? ' · Último: '+timeAgo(h.lastViewed) : '')+'</div>';
    }
    return (
      '<div class="history-card">'+
        '<div class="hc-top">'+
          '<span class="hc-number">'+escHtml(m.number||'—')+'</span>'+
          '<div style="display:flex;align-items:center;gap:8px">'+
            (status ? '<span class="hc-status-badge" style="'+badgeStyle+'"><span class="hc-status-dot"></span>'+label+'</span>' : '')+
            '<span class="hc-date">'+(m.date?fmtDateDisplay(m.date):'—')+'</span>'+
          '</div>'+
        '</div>'+
        '<div class="hc-client">'+escHtml(c.name||'Sin nombre')+'</div>'+
        (c.company?'<div class="hc-company">'+escHtml(c.company)+'</div>':'')+
        viewInfo+
        '<div class="hc-total">'+(h.currency||'$')+' '+fmtNum(t.total||0)+'</div>'+
        '<div class="hc-actions">'+
          '<button class="btn btn-ghost" onclick="loadBudgetFromHistory('+idx+')"><i class="fa-solid fa-file-import"></i> Cargar</button>'+
          '<button class="btn btn-ghost" onclick="exportHistoryPDF('+idx+')"><i class="fa-solid fa-file-pdf"></i> PDF</button>'+
          '<button class="btn btn-secondary" onclick="generateLink('+idx+')" title="Generar link para el cliente"><i class="fa-solid fa-link"></i></button>'+
          '<button class="btn btn-danger" onclick="deleteBudgetFromHistory('+idx+')"><i class="fa-solid fa-trash"></i></button>'+
        '</div>'+
      '</div>'
    );
  }).join('');
  updateHistoryCount(list.length,STATE.history.length);
}

function getFilteredHistory() {
  var result=[];
  STATE.history.forEach(function(h,idx){
    var c=h.client||{}, m=h.meta||{};
    // text filter: client name, company, budget number
    if(historyFilter.text){
      var q=historyFilter.text.toLowerCase();
      var hay=((c.name||'')+(c.company||'')+(m.number||'')).toLowerCase();
      if(hay.indexOf(q)===-1) return;
    }
    // date range filter (uses savedAt or meta.date)
    var dateStr=m.date||'';
    if(historyFilter.dateFrom && dateStr && dateStr<historyFilter.dateFrom) return;
    if(historyFilter.dateTo   && dateStr && dateStr>historyFilter.dateTo)   return;
    result.push({h:h,idx:idx});
  });
  return result;
}

function updateHistoryCount(shown, total) {
  var el_count=el('history-count'); if(!el_count) return;
  if(total===0) { el_count.textContent=''; return; }
  el_count.textContent = shown===total ? total+' presupuesto'+(total!==1?'s':'') : shown+' de '+total+' resultado'+(shown!==1?'s':'');
}

function onHistorySearch() {
  historyFilter.text    = elVal('history-search').trim();
  historyFilter.dateFrom= elVal('history-date-from');
  historyFilter.dateTo  = elVal('history-date-to');
  renderHistory();
}
function clearHistorySearch() {
  historyFilter={text:'',dateFrom:'',dateTo:''};
  setVal('history-search',''); setVal('history-date-from',''); setVal('history-date-to','');
  renderHistory();
}

/* ══ WHATSAPP ════════════════════════════════════════════════════════ */
var WA_TEMPLATES=[
  'Estimado/a {cliente}, le hacemos llegar el presupuesto N\u00b0 {numero} de {negocio} por un total de {total}, con validez hasta el {fecha}. Quedamos a su disposici\u00f3n ante cualquier consulta.',
  'Hola {cliente}! \uD83D\uDC4B Te mando el presupuesto que arm\u00e9 para vos \u2014 n\u00famero {numero}, total {total}. Tiene validez hasta el {fecha}. Cualquier duda me avis\u00e1s. Saludos, {negocio} \uD83D\uDE0A',
  '\uD83D\uDCCB Presupuesto {numero}\nCliente: {cliente}\nTotal: {total} \u00b7 V\u00e1lido hasta: {fecha}\n{negocio}',
];
function selectWATemplate(idx,btn) {
  qsa('.wa-tpl-card').forEach(function(c){c.classList.remove('active');}); if(btn) btn.classList.add('active');
  setVal('cfg-wa-message',WA_TEMPLATES[idx]||''); updateWAPreview();
}
function updateWAPreview() {
  var msg=elVal('cfg-wa-message'), pv=el('cfg-wa-preview'); if(!pv) return;
  pv.textContent=buildWAMessage(msg,{cliente:'Ana García',numero:'PRES-0001',total:'$ 45.000,00',negocio:STATE.businessConfig.bizName||'Mi Negocio',fecha:'25/04/2026'})||'—';
}
function saveWAConfig() {
  var msg=elVal('cfg-wa-message').trim(); if(!msg){toast('Escribí un mensaje antes de guardar','error');return;}
  save(KEYS.waMessage,msg); markClean(); markClean(); markClean(); markClean(); markClean(); toast('Mensaje guardado \u2713','success');
}
function buildWAMessage(tpl,vars) {
  if(!tpl) return '';
  return tpl.replace(/\{cliente\}/g,vars.cliente||'').replace(/\{numero\}/g,vars.numero||'').replace(/\{total\}/g,vars.total||'').replace(/\{negocio\}/g,vars.negocio||'').replace(/\{fecha\}/g,vars.fecha||'');
}
function copyWAMessage(silent) {
  var tpl=localStorage.getItem(KEYS.waMessage)||''; if(!tpl){if(!silent) toast('Configurá el mensaje en Admin \u2192 WhatsApp primero','error'); return;}
  var data=collectBudgetData(), client=data.client, totals=data.totals, biz=data.biz, currency=data.currency;
  var msg=buildWAMessage(tpl,{cliente:client.name||'Cliente',numero:data.meta.number||'',total:currency+' '+fmtNum(totals.total),negocio:biz.bizName||'Mi Negocio',fecha:data.meta.valid?fmtDateDisplay(data.meta.valid):'—'});
  var cb=function(ok){
    if(ok){ if(!silent) toast('Mensaje copiado \u2713','success'); else toast('PDF listo \u00b7 Mensaje WhatsApp copiado \uD83D\uDCCB','success'); }
    else    toast('No se pudo copiar autom\u00e1ticamente','error');
  };
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(msg).then(function(){cb(true);}).catch(function(){fbCopy(msg,cb);}); }
  else fbCopy(msg,cb);
}
function fbCopy(text,cb){
  var ta=document.createElement('textarea'); ta.value=text; ta.style.cssText='position:fixed;left:-9999px;opacity:0;';
  document.body.appendChild(ta); ta.focus(); ta.select();
  try{document.execCommand('copy');cb(true);}catch(e){cb(false);}
  document.body.removeChild(ta);
}
function populateWAForm() {
  var saved=localStorage.getItem(KEYS.waMessage)||''; setVal('cfg-wa-message',saved);
  qsa('.wa-tpl-card').forEach(function(card,idx){ card.classList.toggle('active',saved&&saved===WA_TEMPLATES[idx]); });
  if(!saved){var f=document.querySelector('.wa-tpl-card[data-tpl="0"]'); if(f){f.classList.add('active');setVal('cfg-wa-message',WA_TEMPLATES[0]);}}
  updateWAPreview();
}

/* ══ ADMIN ═══════════════════════════════════════════════════════════ */
function openAdminModal() {
  /* Already authenticated via app login — go straight to panel */
  el('admin-overlay').classList.remove('hidden');
  el('admin-login').classList.add('hidden');
  el('admin-panel').classList.remove('hidden');
  el('admin-overlay').querySelector('.modal-box').classList.add('expanded');
  populateAdminForms();
  renderServicesAdmin();
  markClean();
  setTimeout(attachDirtyListeners, 100);
}
function closeAdminModal(){el('admin-overlay').classList.add('hidden');}
function checkAdminPw() {
  var pw=elVal('admin-pw-input'),stored=localStorage.getItem(KEYS.password)||'admin123';
  if(pw===stored){
    el('admin-login').classList.add('hidden'); el('admin-panel').classList.remove('hidden');
    el('admin-overlay').querySelector('.modal-box').classList.add('expanded');
    populateAdminForms(); renderServicesAdmin();
  } else {
    var inp=el('admin-pw-input'); inp.style.borderColor='#e53e3e'; inp.style.boxShadow='0 0 0 3px rgba(229,62,62,.2)';
    toast('Contraseña incorrecta','error');
    setTimeout(function(){inp.style.borderColor='';inp.style.boxShadow='';},1500);
  }
}

/* ══ AVISO DE CAMBIOS SIN GUARDAR ═══════════════════════════════════ */
var _adminDirty = false; /* true cuando hay cambios sin guardar */

function markDirty() { _adminDirty = true; }
function markClean() { _adminDirty = false; }

/* Attach dirty listeners to all admin inputs after panel opens */
function attachDirtyListeners() {
  var inputs = document.querySelectorAll('.admin-content input, .admin-content textarea, .admin-content select');
  inputs.forEach(function(inp) {
    inp.removeEventListener('input', markDirty);
    inp.removeEventListener('change', markDirty);
    inp.addEventListener('input', markDirty);
    inp.addEventListener('change', markDirty);
  });
}

/* Intercept tab switching to warn about unsaved changes */
function switchAdminTabSafe(tab, btn) {
  if (_adminDirty) {
    confirmAction(
      '¿Cambiar de pestaña?',
      'Tenés cambios sin guardar en esta sección. Si cambiás de pestaña se van a perder.',
      function() { markClean(); switchAdminTab(tab, btn); }
    );
  } else {
    switchAdminTab(tab, btn);
  }
}

function switchAdminTab(tab,btn) {
  qsa('.admin-tab-content').forEach(function(c){c.classList.remove('active');});
  qsa('.admin-tab').forEach(function(b){b.classList.remove('active');});
  var content=el('tab-'+tab); if(content) content.classList.add('active'); if(btn) btn.classList.add('active');
  if(tab==='services')      renderServicesAdmin();
  if(tab==='whatsapp')      populateWAForm();
  if(tab==='integrations')  populateIntegrationsForm();
}
function populateAdminForms() {
  var b=STATE.businessConfig,br=STATE.brandConfig,bc=STATE.budgetConfig;
  setVal('cfg-biz-name',b.bizName||''); setVal('cfg-biz-slogan',b.slogan||'');
  setVal('cfg-footer-text',b.footerText||''); setVal('cfg-signature',b.signature||''); setVal('cfg-thank-you',b.thankYou||'');
  if(b.logo){var pv=el('cfg-logo-preview');if(pv){pv.src=b.logo;show('cfg-logo-preview');hide('cfg-logo-placeholder');}var cb=el('btn-crop-logo');if(cb)cb.style.display='';} applyLogoSizeInput();
  setVal('cfg-color-primary',br.colorPrimary||'#1b9aaa'); setVal('cfg-color-secondary',br.colorSecondary||'#0f4c75'); setVal('cfg-color-accent',br.colorAccent||'#f0a500');
  syncHexLabels(); setVal('cfg-font',br.font||'DM Sans');
  qsa('.preset-btn').forEach(function(btn){btn.classList.toggle('active',btn.dataset.preset===br.preset);});
  setVal('cfg-phone',b.phone||''); setVal('cfg-whatsapp',b.whatsapp||''); setVal('cfg-email',b.email||'');
  setVal('cfg-website',b.website||''); setVal('cfg-address',b.address||''); setVal('cfg-cuit',b.cuit||'');
  setVal('cfg-payment-alias',b.paymentAlias||''); setVal('cfg-payment-terms',b.paymentTerms||'');
  setVal('cfg-delivery-time',b.deliveryTime||''); setVal('cfg-legal',b.legal||'');
  setVal('cfg-prefix',bc.prefix||'PRES-'); setVal('cfg-validity-days',bc.validityDays||15);
  setVal('cfg-currency',bc.currency||'$'); setVal('cfg-default-tax',bc.defaultTax||0);
  var chkMap={'cfg-show-discount':'showDiscount','cfg-show-surcharge':'showSurcharge','cfg-show-signature':'showSignature','cfg-show-legal':'showLegal','cfg-show-contact-footer':'showContactFooter'};
  Object.keys(chkMap).forEach(function(id){var c=el(id);if(c)c.checked=bc[chkMap[id]]!==false;});
}
function saveBrandConfig() {
  var b=STATE.businessConfig,br=STATE.brandConfig;
  b.bizName=elVal('cfg-biz-name'); b.slogan=elVal('cfg-biz-slogan'); b.footerText=elVal('cfg-footer-text'); b.signature=elVal('cfg-signature'); b.thankYou=elVal('cfg-thank-you');
  br.colorPrimary=elVal('cfg-color-primary')||br.colorPrimary; br.colorSecondary=elVal('cfg-color-secondary')||br.colorSecondary; br.colorAccent=elVal('cfg-color-accent')||br.colorAccent; br.font=elVal('cfg-font')||'DM Sans';
  save(KEYS.businessConfig,b); save(KEYS.brandConfig,br); applyBrand(); updatePreview(); markClean(); markClean(); markClean(); markClean(); markClean(); toast('Identidad guardada \u2713','success');
}
function saveBusinessConfig() {
  var b=STATE.businessConfig;
  b.phone=elVal('cfg-phone'); b.whatsapp=elVal('cfg-whatsapp'); b.email=elVal('cfg-email'); b.website=elVal('cfg-website');
  b.address=elVal('cfg-address'); b.cuit=elVal('cfg-cuit'); b.paymentAlias=elVal('cfg-payment-alias');
  b.paymentTerms=elVal('cfg-payment-terms'); b.deliveryTime=elVal('cfg-delivery-time'); b.legal=elVal('cfg-legal');
  save(KEYS.businessConfig,b); updatePreview(); markClean(); markClean(); markClean(); markClean(); markClean(); toast('Datos guardados \u2713','success');
}
function saveBudgetConfig() {
  var bc=STATE.budgetConfig;
  bc.prefix=elVal('cfg-prefix')||'PRES-'; bc.validityDays=parseInt(elVal('cfg-validity-days'),10)||15;
  bc.currency=elVal('cfg-currency')||'$'; bc.defaultTax=parseFloat(elVal('cfg-default-tax'))||0;
  var cm={'cfg-show-discount':'showDiscount','cfg-show-surcharge':'showSurcharge','cfg-show-signature':'showSignature','cfg-show-legal':'showLegal','cfg-show-contact-footer':'showContactFooter'};
  Object.keys(cm).forEach(function(id){var c=el(id);if(c)bc[cm[id]]=c.checked;});
  save(KEYS.budgetConfig,bc); initBudgetMeta(); updatePreview(); markClean(); markClean(); markClean(); markClean(); markClean(); toast('Configuración guardada \u2713','success');
}
function changePassword() {
  var cur=elVal('cfg-pw-current'),np=elVal('cfg-pw-new'),conf=elVal('cfg-pw-confirm'),stored=localStorage.getItem(KEYS.password)||'admin123';
  if(cur!==stored){toast('Contraseña actual incorrecta','error');return;}
  if(np.length<6){toast('Mínimo 6 caracteres','error');return;}
  if(np!==conf){toast('Las contraseñas no coinciden','error');return;}
  localStorage.setItem(KEYS.password,np);
  sessionStorage.setItem(APP_SESSION_KEY,'1'); /* keep session valid with new pw */
  setVal('cfg-pw-current',''); setVal('cfg-pw-new',''); setVal('cfg-pw-confirm','');
  toast('Contraseña actualizada \u2713','success');
}

/* ══ SERVICIOS ═══════════════════════════════════════════════════════ */
var editingServiceId=null;
function renderServicesAdmin() {
  var list=el('services-list'); if(!list) return;
  if(STATE.catalog.length===0){list.innerHTML='<div class="empty-state" style="padding:32px"><i class="fa-solid fa-box-open"></i><h3>Sin servicios</h3><p>Creá tu primer servicio.</p></div>';return;}
  list.innerHTML=STATE.catalog.map(function(svc){
    return '<div class="service-item '+(svc.active?'':'inactive')+'">'+
      '<div class="svc-badge"><i class="fa-solid fa-cube"></i></div>'+
      '<div class="svc-info"><div class="svc-name">'+escHtml(svc.name)+(!svc.active?' <span class="tag-inactive">Inactivo</span>':'')+
      '</div><div class="svc-meta">'+escHtml(svc.category||'')+' · '+escHtml(svc.unit)+'</div></div>'+
      '<div class="svc-price">'+(STATE.budgetConfig.currency||'$')+' '+fmtNum(svc.price)+'</div>'+
      '<div class="svc-actions">'+
        '<button class="btn-icon" onclick="openServiceModal(\''+svc.id+'\')" title="Editar"><i class="fa-solid fa-pen"></i></button>'+
        '<button class="btn-icon" onclick="deleteService(\''+svc.id+'\')" title="Eliminar" style="color:#e53e3e;border-color:#fecaca"><i class="fa-solid fa-trash"></i></button>'+
      '</div></div>';
  }).join('');
}
function openServiceModal(id) {
  editingServiceId=id||null; el('service-modal-title').textContent=id?'Editar Servicio':'Nuevo Servicio';
  if(id){var svc=STATE.catalog.find(function(s){return s.id===id;});if(svc){setVal('svc-id',svc.id);setVal('svc-name',svc.name);setVal('svc-description',svc.description||'');setVal('svc-price',svc.price);setVal('svc-unit',svc.unit);setVal('svc-category',svc.category||'');setVal('svc-active',String(svc.active));}}
  else{['svc-id','svc-name','svc-description','svc-price','svc-category'].forEach(function(i){setVal(i,'');});setVal('svc-unit','servicio');setVal('svc-active','true');}
  el('service-overlay').classList.remove('hidden');
}
function closeServiceModal(){el('service-overlay').classList.add('hidden');editingServiceId=null;}
function saveService() {
  var name=elVal('svc-name').trim(); if(!name){toast('El nombre es obligatorio','error');return;}
  var svc={id:editingServiceId||('svc_'+Date.now()),name:name,description:elVal('svc-description'),price:parseFloat(elVal('svc-price'))||0,unit:elVal('svc-unit')||'servicio',category:elVal('svc-category'),active:elVal('svc-active')==='true'};
  if(editingServiceId){var idx=STATE.catalog.findIndex(function(s){return s.id===editingServiceId;});if(idx!==-1)STATE.catalog[idx]=svc;}else STATE.catalog.push(svc);
  save(KEYS.catalog,STATE.catalog); renderServicesAdmin(); closeServiceModal();
  toast(editingServiceId?'Servicio actualizado \u2713':'Servicio creado \u2713','success');
}
function deleteService(id) {
  confirmAction('\u00bfEliminar servicio?','Esta acción no se puede deshacer.',function(){
    STATE.catalog=STATE.catalog.filter(function(s){return s.id!==id;}); save(KEYS.catalog,STATE.catalog); renderServicesAdmin(); toast('Servicio eliminado','info');
  });
}

/* ══ LOGO ════════════════════════════════════════════════════════════ */
function onLogoSizeChange(val) {
  val = parseInt(val, 10);
  STATE.businessConfig.logoSize = val;
  var disp = el('cfg-logo-size-display'); if(disp) disp.textContent = val + 'px';
  updatePreview();
}
function applyLogoSizeInput() {
  var size = STATE.businessConfig.logoSize || 60;
  setVal('cfg-logo-size', size);
  var disp = el('cfg-logo-size-display'); if(disp) disp.textContent = size + 'px';
}

function handleLogoUpload(event) {
  var file=event.target.files[0]; if(!file) return;
  if(file.size>2*1024*1024){toast('Máx 2MB','error');return;}
  var reader=new FileReader();
  reader.onload=function(e){STATE.businessConfig.logo=e.target.result;var pv=el('cfg-logo-preview');if(pv){pv.src=e.target.result;show('cfg-logo-preview');hide('cfg-logo-placeholder');}save(KEYS.businessConfig,STATE.businessConfig);applyBrand();updatePreview();var cb=el('btn-crop-logo');if(cb)cb.style.display='';toast('Logo cargado \u2713','success');};
  reader.readAsDataURL(file);
}
function removeLogo(){STATE.businessConfig.logo='';var pv=el('cfg-logo-preview');if(pv){pv.src='';hide('cfg-logo-preview');show('cfg-logo-placeholder');}var cb=el('btn-crop-logo');if(cb)cb.style.display='none';save(KEYS.businessConfig,STATE.businessConfig);applyBrand();updatePreview();toast('Logo removido','info');}

/* ══ CONFIRMAR ═══════════════════════════════════════════════════════ */
var confirmCb=null;
function confirmAction(title,msg,fn){el('confirm-title').textContent=title;el('confirm-message').textContent=msg;confirmCb=fn;el('confirm-overlay').classList.remove('hidden');}
function closeConfirmModal(){el('confirm-overlay').classList.add('hidden');confirmCb=null;}
document.addEventListener('DOMContentLoaded',function(){
  var btn=el('confirm-action-btn'); if(btn) btn.addEventListener('click',function(){if(confirmCb)confirmCb();closeConfirmModal();});
  el('admin-overlay')  &&el('admin-overlay').addEventListener('click',  function(e){if(e.target===el('admin-overlay'))  closeAdminModal();});
  el('service-overlay')&&el('service-overlay').addEventListener('click',function(e){if(e.target===el('service-overlay'))closeServiceModal();});
  el('confirm-overlay')&&el('confirm-overlay').addEventListener('click',function(e){if(e.target===el('confirm-overlay'))closeConfirmModal();});
});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeAdminModal();closeServiceModal();closeConfirmModal();}});

/* ══ VISTAS ══════════════════════════════════════════════════════════ */
function switchView(name){
  qsa('.view').forEach(function(v){v.classList.remove('active');});
  qsa('.nav-btn').forEach(function(b){b.classList.remove('active');});
  var v=el('view-'+name);if(v)v.classList.add('active');
  var b=document.querySelector('[data-view="'+name+'"]');if(b)b.classList.add('active');
  if(name==='history'){renderHistory();refreshHistoryStatuses();requestNotificationPermission();}
}
function togglePwVisibility(inputId,btn){var inp=el(inputId);if(!inp)return;var isText=inp.type==='text';inp.type=isText?'password':'text';btn.innerHTML=isText?'<i class="fa-solid fa-eye"></i>':'<i class="fa-solid fa-eye-slash"></i>';}

/* ══ TOASTS ══════════════════════════════════════════════════════════ */
function toast(msg,type){
  type=type||'info';var icons={success:'fa-circle-check',error:'fa-circle-xmark',info:'fa-circle-info'};
  var t=document.createElement('div');t.className='toast '+type;t.innerHTML='<i class="fa-solid '+(icons[type]||icons.info)+'"></i> '+msg;
  var c=el('toast-container');if(c)c.appendChild(t);
  setTimeout(function(){t.classList.add('out');setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},350);},3200);
}

/* ══ LOGO CROP ═══════════════════════════════════════════════════════ */
/* ══ LOGO CROP ═══════════════════════════════════════════════════════
   Estado:
     scale    → escala actual de la imagen en canvas pixels
     minScale → scale que hace fit completo (imagen entera visible)
     x, y     → offset top-left de la imagen dentro del canvas
   El slider va de minScale (fit) a minScale*5 (zoom máximo).
   Zoom siempre hacia el centro del canvas.
   Paneo clampeado para que la imagen nunca se salga completamente.
   ═══════════════════════════════════════════════════════════════════ */
var cropState = {
  img:null, x:0, y:0, scale:1, minScale:1,
  dragging:false, lastX:0, lastY:0, originalSrc:''
};
var CROP_SIZE = 300; /* canvas pixels */

function openCropModal() {
  var logo = STATE.businessConfig.logo;
  if (!logo) { toast('Subí un logo primero', 'error'); return; }
  cropState.originalSrc = logo;
  el('crop-overlay').classList.remove('hidden');
  var img = new Image();
  img.onload = function() {
    cropState.img = img;
    cropInitCanvas();
    cropResetView();
    cropDraw();
  };
  img.src = logo;
}
function closeCropModal() { el('crop-overlay').classList.add('hidden'); }

function cropInitCanvas() {
  var canvas = el('crop-canvas');
  canvas.width  = CROP_SIZE;
  canvas.height = CROP_SIZE;
  canvas.style.width  = CROP_SIZE + 'px';
  canvas.style.height = CROP_SIZE + 'px';

  /* Mouse */
  canvas.onmousedown = function(e) {
    cropState.dragging = true;
    cropState.lastX = e.clientX;
    cropState.lastY = e.clientY;
    e.preventDefault();
  };
  canvas.onmousemove = function(e) {
    if (!cropState.dragging) return;
    cropState.x += e.clientX - cropState.lastX;
    cropState.y += e.clientY - cropState.lastY;
    cropState.lastX = e.clientX;
    cropState.lastY = e.clientY;
    cropClampPos();
    cropDraw();
  };
  canvas.onmouseup    = function() { cropState.dragging = false; };
  canvas.onmouseleave = function() { cropState.dragging = false; };

  /* Touch */
  canvas.ontouchstart = function(e) {
    e.preventDefault();
    var t = e.touches[0];
    cropState.dragging = true;
    cropState.lastX = t.clientX;
    cropState.lastY = t.clientY;
  };
  canvas.ontouchmove = function(e) {
    e.preventDefault();
    if (!cropState.dragging) return;
    var t = e.touches[0];
    cropState.x += t.clientX - cropState.lastX;
    cropState.y += t.clientY - cropState.lastY;
    cropState.lastX = t.clientX;
    cropState.lastY = t.clientY;
    cropClampPos();
    cropDraw();
  };
  canvas.ontouchend = function() { cropState.dragging = false; };

  /* Wheel zoom */
  canvas.onwheel = function(e) {
    e.preventDefault();
    var step = e.deltaY > 0 ? -0.03 : 0.03;
    var newScale = Math.max(cropState.minScale, Math.min(cropState.minScale * 5, cropState.scale + step * cropState.minScale * 5));
    cropApplyScale(newScale);
    /* sync slider */
    var slr = el('crop-zoom');
    if (slr) slr.value = cropScaleToSlider(newScale);
  };
}

/* Fit the image inside the canvas, centered */
function cropResetView() {
  var img = cropState.img;
  var scaleW = CROP_SIZE / img.naturalWidth;
  var scaleH = CROP_SIZE / img.naturalHeight;
  var fit    = Math.min(scaleW, scaleH);

  cropState.minScale = fit;
  cropState.scale    = fit;
  cropState.x = (CROP_SIZE - img.naturalWidth  * fit) / 2;
  cropState.y = (CROP_SIZE - img.naturalHeight * fit) / 2;

  /* Reset slider to midpoint (fit = slider 0) */
  var slr = el('crop-zoom');
  if (slr) {
    slr.min   = '0';
    slr.max   = '100';
    slr.step  = '1';
    slr.value = '0';
  }
}

/* slider value 0–100 → actual scale */
function cropSliderToScale(v) {
  /* 0 = fit, 100 = fit*5 */
  return cropState.minScale * (1 + (parseFloat(v) / 100) * 4);
}
function cropScaleToSlider(scale) {
  return Math.round((scale / cropState.minScale - 1) / 4 * 100);
}

function cropZoomChange(sliderVal) {
  if (!cropState.img) return;
  var newScale = cropSliderToScale(sliderVal);
  cropApplyScale(newScale);
}

/* Zoom toward canvas center, then clamp */
function cropApplyScale(newScale) {
  var img = cropState.img;
  var cx = CROP_SIZE / 2, cy = CROP_SIZE / 2;
  var ratio = newScale / cropState.scale;
  cropState.x = cx - (cx - cropState.x) * ratio;
  cropState.y = cy - (cy - cropState.y) * ratio;
  cropState.scale = newScale;
  cropClampPos();
  cropDraw();
}

/* Prevent image from leaving canvas completely — always keep ≥40px visible */
function cropClampPos() {
  var img = cropState.img;
  var w = img.naturalWidth  * cropState.scale;
  var h = img.naturalHeight * cropState.scale;
  var margin = 40;
  /* x: image right edge must be at least `margin` px inside canvas */
  if (cropState.x + w < margin)       cropState.x = margin - w;
  if (cropState.x > CROP_SIZE - margin) cropState.x = CROP_SIZE - margin;
  /* y */
  if (cropState.y + h < margin)       cropState.y = margin - h;
  if (cropState.y > CROP_SIZE - margin) cropState.y = CROP_SIZE - margin;
}

function cropDraw() {
  var canvas = el('crop-canvas');
  if (!canvas || !cropState.img) return;
  var ctx = canvas.getContext('2d');

  /* Checkerboard background (shows transparency) */
  ctx.clearRect(0, 0, CROP_SIZE, CROP_SIZE);
  var sq = 12;
  for (var ry = 0; ry < CROP_SIZE; ry += sq) {
    for (var rx = 0; rx < CROP_SIZE; rx += sq) {
      ctx.fillStyle = ((rx / sq + ry / sq) % 2 === 0) ? '#e8e8e8' : '#fff';
      ctx.fillRect(rx, ry, sq, sq);
    }
  }

  /* Image */
  ctx.drawImage(
    cropState.img,
    cropState.x, cropState.y,
    cropState.img.naturalWidth  * cropState.scale,
    cropState.img.naturalHeight * cropState.scale
  );

  /* Subtle border overlay */
  ctx.strokeStyle = 'rgba(0,0,0,.15)';
  ctx.lineWidth   = 1;
  ctx.strokeRect(0.5, 0.5, CROP_SIZE - 1, CROP_SIZE - 1);
}

function applyCrop() {
  var canvas = el('crop-canvas'); if (!canvas) return;
  var out = canvas.toDataURL('image/png');
  STATE.businessConfig.logo = out;
  var pv = el('cfg-logo-preview');
  if (pv) { pv.src = out; show('cfg-logo-preview'); hide('cfg-logo-placeholder'); }
  save(KEYS.businessConfig, STATE.businessConfig);
  applyBrand(); updatePreview();
  closeCropModal();
  toast('Logo recortado ✓', 'success');
}


/* ══ SUPABASE CONFIG (Admin) ══════════════════════════════════════════ */
function saveSupabaseConfig() {
  var url = elVal('cfg-sb-url').trim();
  var key = elVal('cfg-sb-key').trim();
  if (!url || !key) { toast('Completá URL y Key', 'error'); return; }
  if (!url.startsWith('https://')) { toast('La URL debe comenzar con https://', 'error'); return; }
  SB.url = url;
  SB.key = key;
  localStorage.setItem('pp_sb_url', url);
  localStorage.setItem('pp_sb_key', key);
  SB_ENABLED(); // trigger update
  toast('Configuración de Supabase guardada ✓', 'success');
}

function loadSupabaseConfig() {
  var url = localStorage.getItem('pp_sb_url');
  var key = localStorage.getItem('pp_sb_key');
  if (url) SB.url = url;
  if (key) SB.key = key;
}

function populateIntegrationsForm() {
  setVal('cfg-sb-url', localStorage.getItem('pp_sb_url') || '');
  setVal('cfg-sb-key', localStorage.getItem('pp_sb_key') || '');
  var res = el('sb-test-result'); if (res) res.textContent = '';
}

function testSupabase() {
  var url = elVal('cfg-sb-url').trim();
  var key = elVal('cfg-sb-key').trim();
  if (!url || !key) { toast('Completá URL y Key primero', 'error'); return; }
  var res = el('sb-test-result');
  if (res) { res.textContent = 'Probando...'; res.className = 'sb-test-result'; }
  fetch(url + '/rest/v1/budgets_shared?limit=1', {
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  }).then(function(r) {
    if (r.ok || r.status === 200 || r.status === 206) {
      if (res) { res.textContent = '✓ Conexión exitosa'; res.className = 'sb-test-result ok'; }
      SB.url = url; SB.key = key;
    } else if (r.status === 404) {
      if (res) { res.textContent = '⚠ Conectado, pero la tabla no existe. Ejecutá supabase-setup.sql'; res.className = 'sb-test-result warn'; }
    } else {
      if (res) { res.textContent = '✗ Error ' + r.status + '. Verificá las credenciales'; res.className = 'sb-test-result err'; }
    }
  }).catch(function() {
    if (res) { res.textContent = '✗ No se pudo conectar. Verificá la URL'; res.className = 'sb-test-result err'; }
  });
}


/* ══ TRACKING / SHARING ══════════════════════════════════════════════ */

/* Returns or creates a stable tenant_id (email or random UUID) */
function getTenantId() {
  var stored = localStorage.getItem(KEYS.tenantId);
  if (stored) return stored;
  /* Use business email if set, else generate a uuid-like string */
  var email = STATE.businessConfig.email || '';
  var tid = email || ('tenant_' + Date.now() + '_' + Math.random().toString(36).slice(2,8));
  localStorage.setItem(KEYS.tenantId, tid);
  return tid;
}

/* Share a budget: uploads to Supabase and copies link */
function shareBudget(idx) {
  /* idx === undefined means current form, else from history */
  var data;
  if (idx === undefined) {
    data = collectBudgetData();
    if (!data.client.name)    { toast('Completá el nombre del cliente antes de compartir', 'error'); return; }
    if (!data.items.length)   { toast('Agregá al menos un ítem antes de compartir', 'error'); return; }
  } else {
    data = STATE.history[idx];
    if (!data) return;
  }

  /* Check Supabase is configured */
  if (SB.url.indexOf('TU-PROYECTO') !== -1) {
    toast('Configurá la anon key de Supabase en script.js primero', 'error'); return;
  }

  toast('Generando link...', 'info');

  var tenantId = getTenantId();
  var meta = data.meta || {};

  /* Check if already shared (has a shareId saved) */
  var existingShareId = data.shareId || null;
  if (existingShareId) {
    /* Update existing record */
    sbFetch('PATCH', 'shared_budgets', 'id=eq.' + existingShareId, { budget_data: data })
      .then(function() { copyShareLink(existingShareId, data); })
      .catch(function() { toast('Error al actualizar el link compartido', 'error'); });
    return;
  }

  /* Calculate expiry: validity date + 30 days buffer */
  var expiresAt = null;
  if (meta.valid) {
    var exp = new Date(meta.valid);
    exp.setDate(exp.getDate() + 30);
    expiresAt = exp.toISOString();
  }

  sbFetch('POST', 'shared_budgets', '', {
    tenant_id:     tenantId,
    budget_number: meta.number || '',
    budget_data:   data,
    status:        'sent',
    expires_at:    expiresAt,
  }).then(function(rows) {
    var row = Array.isArray(rows) ? rows[0] : rows;
    if (!row || !row.id) { toast('Error al crear el link', 'error'); return; }

    /* Save shareId back to history entry */
    if (idx !== undefined) {
      STATE.history[idx].shareId = row.id;
      STATE.history[idx].shareStatus = 'sent';
      save(KEYS.history, STATE.history);
      renderHistory();
    }

    copyShareLink(row.id, data);
  }).catch(function(e) {
    console.error(e);
    toast('No se pudo conectar con Supabase. Verificá la configuración.', 'error');
  });
}

function copyShareLink(shareId, data) {
  /* Build the URL — same folder as index.html */
  var base = window.location.href.replace(/\/[^\/]*$/, '/');
  var url  = base + 'viewer.html?id=' + shareId;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url)
      .then(function() { toast('Link copiado al portapapeles ✓', 'success'); })
      .catch(function() { fallbackCopyText(url); });
  } else {
    fallbackCopyText(url);
  }
}

function fallbackCopyText(text) {
  var ta = document.createElement('textarea');
  ta.value = text; ta.style.cssText = 'position:fixed;left:-9999px;opacity:0;';
  document.body.appendChild(ta); ta.focus(); ta.select();
  try { document.execCommand('copy'); toast('Link copiado ✓', 'success'); }
  catch(e) { toast('No se pudo copiar. URL: ' + text, 'info'); }
  document.body.removeChild(ta);
}

/* Poll tracking status for a shared budget */
function refreshShareStatus(shareId, idx) {
  if (SB.url.indexOf('TU-PROYECTO') !== -1) return;
  sbFetch('GET', 'shared_budgets', 'id=eq.' + shareId + '&select=status,view_count,first_viewed_at,last_viewed_at,accepted_at,rejected_at,reject_reason')
    .then(function(rows) {
      var row = Array.isArray(rows) ? rows[0] : null;
      if (!row) return;
      STATE.history[idx].shareStatus       = row.status;
      STATE.history[idx].shareViewCount    = row.view_count;
      STATE.history[idx].shareFirstViewed  = row.first_viewed_at;
      STATE.history[idx].shareLastViewed   = row.last_viewed_at;
      STATE.history[idx].shareAcceptedAt   = row.accepted_at;
      STATE.history[idx].shareRejectedAt   = row.rejected_at;
      STATE.history[idx].shareRejectReason = row.reject_reason;
      save(KEYS.history, STATE.history);
      renderHistory();
    }).catch(console.error);
}

/* Status label helpers */
var SHARE_STATUS_LABELS = {
  sent:     { text:'Enviado',   cls:'status-sent'     },
  viewed:   { text:'Visto',     cls:'status-viewed'   },
  accepted: { text:'Aceptado',  cls:'status-accepted' },
  rejected: { text:'Rechazado', cls:'status-rejected' },
};
function shareStatusBadge(h) {
  if (!h.shareId) return '';
  var st = h.shareStatus || 'sent';
  var lbl = SHARE_STATUS_LABELS[st] || SHARE_STATUS_LABELS.sent;
  var extra = '';
  if (st === 'viewed' && h.shareLastViewed) {
    extra = ' &middot; ' + timeAgo(h.shareLastViewed);
  } else if (st === 'accepted' && h.shareAcceptedAt) {
    extra = ' &middot; ' + timeAgo(h.shareAcceptedAt);
  } else if (st === 'rejected' && h.shareRejectedAt) {
    extra = ' &middot; ' + timeAgo(h.shareRejectedAt);
  }
  var views = h.shareViewCount > 0 ? ' <span class="badge-views">' + h.shareViewCount + 'x</span>' : '';
  return '<span class="share-badge ' + lbl.cls + '">' + lbl.text + extra + views + '</span>';
}

function timeAgo(isoStr) {
  var diff = Math.floor((Date.now() - new Date(isoStr)) / 1000);
  if (diff < 60)   return 'hace un momento';
  if (diff < 3600) return 'hace ' + Math.floor(diff/60) + ' min';
  if (diff < 86400)return 'hace ' + Math.floor(diff/3600) + ' h';
  return 'hace ' + Math.floor(diff/86400) + ' d';
}


/* ══ UTILIDADES ══════════════════════════════════════════════════════ */
function el(id){return document.getElementById(id);}
function qsa(sel){return Array.prototype.slice.call(document.querySelectorAll(sel));}
function show(id){var e=el(id);if(e)e.classList.remove('hidden');}
function hide(id){var e=el(id);if(e)e.classList.add('hidden');}
function setVal(id,val){var e=el(id);if(e)e.value=val;}
function elVal(id){var e=el(id);return e?e.value:'';}
function toggleVisible(id,visible){var e=el(id);if(e)e.style.display=visible?'':'none';}
function escHtml(str){if(str===null||str===undefined)return '';return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function fmtNum(n){return Number(n||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});}
function timeAgo(isoStr) {
  if (!isoStr) return '';
  var diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (diff < 60)   return 'hace ' + diff + 's';
  if (diff < 3600) return 'hace ' + Math.floor(diff/60) + 'min';
  if (diff < 86400)return 'hace ' + Math.floor(diff/3600) + 'h';
  return 'hace ' + Math.floor(diff/86400) + 'd';
}
function fmtDateISO(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function fmtDateDisplay(iso){if(!iso)return '—';var p=iso.split('-');return p[2]+'/'+p[1]+'/'+p[0];}
