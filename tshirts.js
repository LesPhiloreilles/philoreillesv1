/* Boutique T-shirts Philoreilles — aucune dépendance, aucun serveur.
   - sur toutes les pages : badge du compteur de panier sur les liens [data-cart-link]
   - sur tshirts.html : sélection modèle / couleur / taille, galerie face-dos, panier (localStorage) */
(function () {
  'use strict';

  var STORAGE_KEY = 'philoreilles.panier.v1';
  var PRICE_CENTS = 2499;   // 24,99 € : prix unique
  var MAX_QTY = 20;         // quantité maximale par référence (démonstration)

  var MODELS = {
    '1': {
      label: 'Drapeau monumental',
      desc: 'Le drapeau du mouvement, en grand, au centre de la poitrine. Pour celles et ceux qui préfèrent que leurs convictions soient visibles depuis l’autre côté de la place.'
    },
    '2': {
      label: 'Insigne officiel',
      desc: 'Un drapeau plus discret, floqué sur le côté gauche de la poitrine, à hauteur de cœur. L’engagement citoyen en toute sobriété, ou presque.'
    }
  };
  var COLORS = {
    bleu: { label: 'Bleu très sombre' },
    gris: { label: 'Gris très clair' },
    rose: { label: 'Rose Philoreilles' }
  };
  var SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  /* ---------- Utilitaires ---------- */

  var formatter = null;
  try { formatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }); } catch (e) { formatter = null; }
  function money(cents) {
    return formatter ? formatter.format(cents / 100) : (cents / 100).toFixed(2).replace('.', ',') + ' €';
  }
  function plural(n, one, many) { return n + ' ' + (n > 1 ? many : one); }
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function lineId(line) { return line.model + '-' + line.color + '-' + line.size; }
  function describe(line) {
    return 'T-shirt ' + MODELS[line.model].label + ', ' + COLORS[line.color].label + ', taille ' + line.size;
  }

  /* ---------- Stockage du panier (localStorage, avec repli en mémoire) ---------- */

  var storage = null;
  try {
    var probeKey = '__philoreilles_test__';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    storage = window.localStorage;
  } catch (e) { storage = null; }

  var memory = [];

  // Ne conserve que des lignes valides : les prix ne sont jamais lus depuis le stockage.
  function sanitize(data) {
    var out = [];
    if (!Array.isArray(data)) return out;
    data.forEach(function (raw) {
      if (!raw || !MODELS[String(raw.model)] || !COLORS[raw.color] || SIZES.indexOf(raw.size) === -1) return;
      var qty = Math.floor(Number(raw.qty));
      if (!isFinite(qty) || qty < 1) return;
      var line = { model: String(raw.model), color: raw.color, size: raw.size, qty: Math.min(qty, MAX_QTY) };
      var existing = out.filter(function (l) { return lineId(l) === lineId(line); })[0];
      if (existing) existing.qty = Math.min(existing.qty + line.qty, MAX_QTY);
      else out.push(line);
    });
    return out;
  }
  function loadCart() {
    if (!storage) return memory.slice();
    try {
      var raw = storage.getItem(STORAGE_KEY);
      return raw ? sanitize(JSON.parse(raw)) : [];
    } catch (e) { return []; }
  }
  function saveCart(cart) {
    memory = cart.slice();
    if (!storage) return;
    try { storage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (e) { /* stockage plein ou bloqué : le panier reste en mémoire */ }
  }

  var cart = loadCart();

  /* ---------- Compteur dans le menu et les liens « panier » ---------- */

  function updateBadges() {
    var n = cart.reduce(function (sum, l) { return sum + l.qty; }, 0);
    document.querySelectorAll('[data-cart-link]').forEach(function (link) {
      link.querySelectorAll('[data-badge]').forEach(function (old) { old.remove(); });
      if (n < 1) return;
      var badge = el('span', 'tee-badge', String(n));
      badge.setAttribute('aria-hidden', 'true');
      badge.setAttribute('data-badge', '');
      var sr = el('span', 'tee-sr', ' (' + plural(n, 'article', 'articles') + ' au panier)');
      sr.setAttribute('data-badge', '');
      link.appendChild(badge);
      link.appendChild(sr);
    });
  }

  /* ---------- Éléments de la page boutique (absents sur index.html) ---------- */

  var shop = document.getElementById('shop');
  var form = document.getElementById('shop-form');
  var listEl = document.getElementById('cart-list');
  var emptyEl = document.getElementById('cart-empty');
  var contentEl = document.getElementById('cart-content');
  var countEl = document.getElementById('cart-count');
  var subtotalEl = document.getElementById('cart-subtotal');
  var cartStatus = document.getElementById('cart-status');
  var cartTitle = document.getElementById('t-panier');
  var clearBtn = document.getElementById('cart-clear');
  var storageNote = document.getElementById('storage-note');
  var IMG = (shop && shop.getAttribute('data-images')) || 'images/';

  function renderCart() {
    updateBadges();
    if (!listEl) return;
    var count = 0;
    var total = 0;
    listEl.textContent = '';
    cart.forEach(function (line) {
      count += line.qty;
      total += line.qty * PRICE_CENTS;
      listEl.appendChild(buildLine(line));
    });
    emptyEl.hidden = cart.length > 0;
    contentEl.hidden = cart.length === 0;
    countEl.textContent = '(' + plural(count, 'article', 'articles') + ')';
    subtotalEl.textContent = money(total);
  }

  function qtyButton(symbol, action, id, label, disabled) {
    var b = el('button', '', symbol);
    b.type = 'button';
    b.setAttribute('data-action', action);
    b.setAttribute('data-id', id);
    b.setAttribute('aria-label', label);
    b.disabled = disabled;
    return b;
  }

  function buildLine(line) {
    var id = lineId(line);
    var name = describe(line);
    var li = el('li', 'tee-line');
    li.setAttribute('data-id', id);

    var img = el('img', 'tee-line__img');
    img.src = IMG + line.color + line.model + '.jpg';
    img.alt = '';
    img.decoding = 'async';

    var info = el('div', 'tee-line__info');
    info.appendChild(el('p', 'tee-line__name', 'T-shirt ' + MODELS[line.model].label));
    info.appendChild(el('p', 'tee-line__meta', COLORS[line.color].label + ', taille ' + line.size));
    info.appendChild(el('p', 'tee-line__unit', money(PRICE_CENTS) + ' l’unité'));

    var qty = el('div', 'tee-qty');
    qty.setAttribute('role', 'group');
    qty.setAttribute('aria-label', 'Quantité : ' + name);
    qty.appendChild(qtyButton('−', 'dec', id, 'Diminuer la quantité : ' + name, line.qty <= 1));
    qty.appendChild(el('span', 'tee-qty__n', String(line.qty)));
    qty.appendChild(qtyButton('+', 'inc', id, 'Augmenter la quantité : ' + name, line.qty >= MAX_QTY));

    var total = el('p', 'tee-line__total', money(line.qty * PRICE_CENTS));

    var remove = el('button', 'tee-linkbtn', 'Retirer');
    remove.type = 'button';
    remove.setAttribute('data-action', 'remove');
    remove.setAttribute('data-id', id);
    remove.setAttribute('aria-label', 'Retirer du panier : ' + name);

    [img, info, qty, total, remove].forEach(function (n) { li.appendChild(n); });
    return li;
  }

  function announce(node, text) { if (node) node.textContent = text; }

  /* Mise à jour quand un autre onglet modifie le panier, ou au retour par l’historique */
  window.addEventListener('storage', function (e) {
    if (e.key !== null && e.key !== STORAGE_KEY) return;
    cart = loadCart();
    renderCart();
  });
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    cart = loadCart();
    renderCart();
  });

  renderCart();
  if (!shop || !form) return;   // index.html : seul le compteur est actif

  if (!storage && storageNote) storageNote.hidden = false;

  /* ---------- Actions du panier ---------- */

  listEl.addEventListener('click', function (ev) {
    var btn = ev.target.closest('button[data-action]');
    if (!btn) return;
    var id = btn.getAttribute('data-id');
    var action = btn.getAttribute('data-action');
    cart = loadCart();
    var line = cart.filter(function (l) { return lineId(l) === id; })[0];
    if (!line) { renderCart(); return; }
    var label = describe(line);

    if (action === 'inc' && line.qty < MAX_QTY) line.qty += 1;
    if (action === 'dec' && line.qty > 1) line.qty -= 1;
    if (action === 'remove') cart = cart.filter(function (l) { return l !== line; });

    saveCart(cart);
    renderCart();

    if (action === 'remove') {
      announce(cartStatus, 'Retiré du panier : ' + label + '.');
      if (cartTitle) cartTitle.focus();
      return;
    }
    announce(cartStatus, 'Quantité mise à jour : ' + label + ', ' + line.qty + '.');
    var again = listEl.querySelector('li[data-id="' + id + '"] button[data-action="' + action + '"]');
    if (!again || again.disabled) again = listEl.querySelector('li[data-id="' + id + '"] button[data-action="' + (action === 'inc' ? 'dec' : 'inc') + '"]');
    if (again && !again.disabled) again.focus();
  });

  clearBtn.addEventListener('click', function () {
    cart = [];
    saveCart(cart);
    renderCart();
    announce(cartStatus, 'Panier vidé.');
    if (cartTitle) cartTitle.focus();
  });

  document.querySelectorAll('a[href="#panier"]').forEach(function (a) {
    a.addEventListener('click', function () { if (cartTitle) cartTitle.focus(); });
  });

  /* ---------- Sélection du produit et galerie ---------- */

  var stage = document.getElementById('stage');
  var stageImg = document.getElementById('stage-img');
  var thumbs = Array.prototype.slice.call(document.querySelectorAll('.tee-thumb'));
  var thumbFace = document.getElementById('thumb-face');
  var thumbDos = document.getElementById('thumb-dos');
  var modelImgs = Array.prototype.slice.call(document.querySelectorAll('[data-model-img]'));
  var titleEl = document.getElementById('shop-title');
  var descEl = document.getElementById('shop-desc');
  var colorName = document.getElementById('color-name');
  var statusEl = document.getElementById('shop-status');
  var errorEl = document.getElementById('size-error');
  var sizeField = document.getElementById('size-field');

  var view = 'face';
  var token = 0;
  var target = null;
  var ratioSet = false;

  function selected() {
    return { model: form.elements.modele.value, color: form.elements.couleur.value, size: form.elements.taille.value };
  }
  // Face : <couleur>1 (modèle 1) ou <couleur>2 (modèle 2). Dos : <couleur>3, commun aux deux modèles.
  function imageFor(color, model, which) { return IMG + color + (which === 'dos' ? '3' : model) + '.jpg'; }
  function altFor(s, which) {
    return which === 'dos'
      ? 'T-shirt ' + COLORS[s.color].label + ', vue de dos'
      : 'T-shirt ' + MODELS[s.model].label + ', ' + COLORS[s.color].label + ', vue de face';
  }

  // Seule la dernière demande peut modifier l’image : pas de visuel périmé si l’on change vite de choix.
  function setStage(src, alt) {
    if (src === target) return;
    target = src;
    var mine = ++token;
    stage.classList.add('is-loading');
    stage.classList.remove('is-error');
    var probe = new Image();
    probe.onload = function () {
      if (mine !== token) return;
      stageImg.src = src;
      stageImg.alt = alt;
      if (!ratioSet && probe.naturalWidth) {
        stage.style.setProperty('--ratio', probe.naturalWidth + ' / ' + probe.naturalHeight);
        ratioSet = true;
      }
      stage.classList.remove('is-loading');
    };
    probe.onerror = function () {
      if (mine !== token) return;
      stage.classList.remove('is-loading');
      stage.classList.add('is-error');
      if (window.console) console.warn('[boutique] image introuvable :', src);
    };
    probe.src = src;
  }

  function syncThumbs() {
    thumbs.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-view') === view ? 'true' : 'false');
    });
  }

  function refresh() {
    var s = selected();
    titleEl.textContent = 'T-shirt ' + MODELS[s.model].label;
    descEl.textContent = MODELS[s.model].desc;
    colorName.textContent = COLORS[s.color].label;
    modelImgs.forEach(function (img) {
      var src = imageFor(s.color, img.getAttribute('data-model-img'), 'face');
      if (img.getAttribute('src') !== src) img.src = src;
    });
    var face = imageFor(s.color, s.model, 'face');
    var dos = imageFor(s.color, s.model, 'dos');
    if (thumbFace.getAttribute('src') !== face) thumbFace.src = face;
    if (thumbDos.getAttribute('src') !== dos) thumbDos.src = dos;
    setStage(view === 'dos' ? dos : face, altFor(s, view));
  }

  function hideError() {
    errorEl.hidden = true;
    sizeField.removeAttribute('aria-describedby');
  }

  form.addEventListener('change', function (e) {
    announce(statusEl, '');
    if (e.target.name === 'modele' && view !== 'face') { view = 'face'; syncThumbs(); }   // la différence de modèle se voit de face
    if (e.target.name === 'taille') hideError();
    refresh();
  });

  thumbs.forEach(function (b) {
    b.addEventListener('click', function () {
      view = b.getAttribute('data-view');
      syncThumbs();
      refresh();
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var s = selected();
    if (!s.size) {
      errorEl.hidden = false;
      sizeField.setAttribute('aria-describedby', 'size-error');
      announce(statusEl, '');
      form.elements.taille[0].focus();
      return;
    }
    hideError();
    cart = loadCart();
    var id = lineId(s);
    var line = cart.filter(function (l) { return lineId(l) === id; })[0];
    if (line && line.qty >= MAX_QTY) {
      announce(statusEl, 'Quantité maximale atteinte pour ce T-shirt : ' + MAX_QTY + ' exemplaires.');
      return;
    }
    if (line) line.qty += 1;
    else { line = { model: s.model, color: s.color, size: s.size, qty: 1 }; cart.push(line); }
    saveCart(cart);
    renderCart();

    statusEl.textContent = 'Ajouté au panier : ' + describe(line) + ' (quantité : ' + line.qty + '). Le mouvement vous remercie. ';
    var link = el('a', '', 'Voir le panier');
    link.href = '#panier';
    link.addEventListener('click', function () { if (cartTitle) cartTitle.focus(); });
    statusEl.appendChild(link);
  });

  refresh();
})();
