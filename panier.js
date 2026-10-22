/* Panier commun des boutiques Philoreilles (T-shirts et souvenirs) — aucune dépendance, aucun serveur.
   Chargé sur toutes les pages qui affichent le panier ou son compteur.
   - catalogue, prix et textes des produits
   - panier conservé dans localStorage (même clé que la première version : les anciens paniers restent lisibles)
   - compteur « Panier » ajouté au menu quand le panier n’est pas vide
   - affichage et actions du panier sur les pages qui contiennent #cart-list
   Les pages produits (tshirts.js, souvenirs.js) passent par window.PhiloreillesBoutique. */
(function () {
  'use strict';

  var STORAGE_KEY = 'philoreilles.panier.v1';
  var MAX_QTY = 20;   // quantité maximale par référence (démonstration)

  function has(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }

  /* ---------- Catalogue ---------- */

  var CATALOG = {
    tshirt: {
      price: 2499,   // 24,99 €
      models: { '1': 'Drapeau monumental', '2': 'Insigne officiel' },
      colors: { bleu: 'Bleu très sombre', gris: 'Gris très clair', rose: 'Rose Philoreilles' },
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    },
    carte: {
      price: 399,    // 3,99 €
      category: 'Carte postale',
      plural: 'Cartes postales',
      choose: 'Choisir une carte postale',
      note: 'la carte postale, au même prix pour toutes les oreilles',
      items: {
        carte1: { name: 'Salutations auriculaires', desc: 'Pour dire bonjour à quelqu’un dont vous espérez la meilleure écoute.' },
        carte2: { name: 'Message du cartilage', desc: 'Un mot affectueux, rédigé avec tout le sérieux d’une institution nationale.' },
        carte3: { name: 'Pensée philoreillienne', desc: 'À envoyer à quelqu’un qui gagnerait à grandir un peu, ou au moins à écouter.' },
        carte4: { name: 'Courrier de la Grande Oreille', desc: 'Parce qu’une conviction ne devrait jamais dormir dans un tiroir.' },
        carte5: { name: 'Souvenir officiel du mouvement', desc: 'Le petit rectangle qui fait rayonner les Philoreilles, de la boîte aux lettres jusqu’au frigo.' }
      }
    },
    portecle: {
      price: 799,    // 7,99 €
      category: 'Porte-clés',
      plural: 'Porte-clés',
      choose: 'Choisir un porte-clés',
      note: 'le porte-clés, au même prix pour tous les modèles, par souci d’équité',
      items: {
        portecle1: { name: 'Le Drapeau de poche', desc: 'Le drapeau Philoreilles en version rigide, pour que vos clés rejoignent le mouvement avant vous.', alt: 'Porte-clés rigide en forme de drapeau Philoreilles' },
        portecle2: { name: 'L’Oreille de métal', desc: 'Une oreille humaine en métal : désormais, même vos clés sont à l’écoute.', alt: 'Porte-clés en métal représentant une oreille humaine' },
        portecle3: { name: 'Le Double Lobe doré', desc: 'Deux rondeurs dorées en parfaite harmonie. Certains y verront un symbole d’équilibre, d’autres des fesses stylisées : le mouvement n’a jamais cherché à trancher.', alt: 'Porte-clés doré « Le Double Lobe doré »' }
      }
    }
  };
  // Les cartes sont décrites par leur seul statut d’objet : le contenu des visuels n’est jamais affirmé.
  Object.keys(CATALOG.carte.items).forEach(function (ref) {
    var item = CATALOG.carte.items[ref];
    item.alt = 'Carte postale « ' + item.name + ' », photographiée de biais';
  });

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

  var imgSource = document.querySelector('[data-images]');
  var IMG = (imgSource && imgSource.getAttribute('data-images')) || 'images/';

  /* ---------- Lignes du panier ----------
     T-shirt : { type:'tshirt', model, color, size, qty }
     Souvenir : { type:'carte' | 'portecle', ref, qty }
     Une ligne sans « type » vient de la première version : c’est un T-shirt. */

  function normalize(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var qty = Math.floor(Number(raw.qty));
    if (!isFinite(qty) || qty < 1) return null;
    qty = Math.min(qty, MAX_QTY);
    var type = raw.type === undefined ? 'tshirt' : raw.type;
    if (type === 'tshirt') {
      var model = String(raw.model);
      var t = CATALOG.tshirt;
      if (!has(t.models, model) || !has(t.colors, raw.color) || t.sizes.indexOf(raw.size) === -1) return null;
      return { type: 'tshirt', model: model, color: raw.color, size: raw.size, qty: qty };
    }
    if ((type === 'carte' || type === 'portecle') && typeof raw.ref === 'string' && has(CATALOG[type].items, raw.ref)) {
      return { type: type, ref: raw.ref, qty: qty };
    }
    return null;
  }
  function lineId(line) {
    return line.type === 'tshirt'
      ? 'tshirt-' + line.model + '-' + line.color + '-' + line.size
      : line.type + '-' + line.ref;
  }
  function unitPrice(line) { return CATALOG[line.type].price; }
  function productName(line) {
    return line.type === 'tshirt'
      ? 'T-shirt ' + CATALOG.tshirt.models[line.model]
      : CATALOG[line.type].items[line.ref].name;
  }
  function productMeta(line) {
    return line.type === 'tshirt'
      ? CATALOG.tshirt.colors[line.color] + ', taille ' + line.size
      : CATALOG[line.type].category;
  }
  function describe(line) {
    return line.type === 'tshirt'
      ? productName(line) + ', ' + productMeta(line)
      : CATALOG[line.type].category + ' : ' + productName(line);
  }
  function lineImage(line) {
    return IMG + (line.type === 'tshirt' ? line.color + line.model : line.ref) + '.jpg';
  }

  /* ---------- Stockage (localStorage, avec repli en mémoire) ---------- */

  var storage = null;
  try {
    var probeKey = '__philoreilles_test__';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    storage = window.localStorage;
  } catch (e) { storage = null; }

  var memory = [];

  // Ne conserve que des lignes valides ; les prix ne sont jamais lus depuis le stockage.
  function sanitize(data) {
    var out = [];
    if (!Array.isArray(data)) return out;
    data.forEach(function (raw) {
      var line = normalize(raw);
      if (!line) return;
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
  function saveCart(list) {
    memory = list.slice();
    if (!storage) return;
    try { storage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) { /* stockage plein ou bloqué : le panier reste en mémoire */ }
  }

  var cart = loadCart();

  /* ---------- Éléments du panier (présents sur les pages boutique uniquement) ---------- */

  var listEl = document.getElementById('cart-list');
  var emptyEl = document.getElementById('cart-empty');
  var contentEl = document.getElementById('cart-content');
  var countEl = document.getElementById('cart-count');
  var subtotalEl = document.getElementById('cart-subtotal');
  var cartStatus = document.getElementById('cart-status');
  var cartTitle = document.getElementById('t-panier');
  var clearBtn = document.getElementById('cart-clear');
  var storageNote = document.getElementById('storage-note');

  function announce(node, text) { if (node) node.textContent = text; }
  function focusCart() { if (cartTitle) cartTitle.focus(); }

  /* ---------- Compteur : lien « Panier » du menu et liens [data-cart-link] ---------- */

  function setBadge(link, n) {
    link.querySelectorAll('[data-badge]').forEach(function (old) { old.remove(); });
    if (n < 1) return;
    var badge = el('span', 'tee-badge', String(n));
    badge.setAttribute('aria-hidden', 'true');
    badge.setAttribute('data-badge', '');
    var sr = el('span', 'tee-sr', ' (' + plural(n, 'article', 'articles') + ' au panier)');
    sr.setAttribute('data-badge', '');
    link.appendChild(badge);
    link.appendChild(sr);
  }

  function updateCartLinks() {
    var n = cart.reduce(function (sum, l) { return sum + l.qty; }, 0);
    // Le menu ne gagne une entrée « Panier » que lorsque le panier contient quelque chose.
    var ul = document.querySelector('#nav ul');
    if (ul) {
      var item = ul.querySelector('[data-cart-nav]');
      if (n < 1 && item) item.remove();
      if (n > 0 && !item) {
        item = el('li');
        item.setAttribute('data-cart-nav', '');
        var a = el('a', '', 'Panier');
        a.href = document.getElementById('panier') ? '#panier' : 'tshirts.html#panier';
        a.setAttribute('data-cart-link', '');
        item.appendChild(a);
        ul.appendChild(item);
      }
    }
    document.querySelectorAll('[data-cart-link]').forEach(function (link) { setBadge(link, n); });
  }

  /* ---------- Affichage du panier ---------- */

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
    img.src = lineImage(line);
    img.alt = '';
    img.decoding = 'async';

    var info = el('div', 'tee-line__info');
    info.appendChild(el('p', 'tee-line__name', productName(line)));
    info.appendChild(el('p', 'tee-line__meta', productMeta(line)));
    info.appendChild(el('p', 'tee-line__unit', money(unitPrice(line)) + ' l’unité'));

    var qty = el('div', 'tee-qty');
    qty.setAttribute('role', 'group');
    qty.setAttribute('aria-label', 'Quantité : ' + name);
    qty.appendChild(qtyButton('−', 'dec', id, 'Diminuer la quantité : ' + name, line.qty <= 1));
    qty.appendChild(el('span', 'tee-qty__n', String(line.qty)));
    qty.appendChild(qtyButton('+', 'inc', id, 'Augmenter la quantité : ' + name, line.qty >= MAX_QTY));

    var total = el('p', 'tee-line__total', money(line.qty * unitPrice(line)));

    var remove = el('button', 'tee-linkbtn', 'Retirer');
    remove.type = 'button';
    remove.setAttribute('data-action', 'remove');
    remove.setAttribute('data-id', id);
    remove.setAttribute('aria-label', 'Retirer du panier : ' + name);

    [img, info, qty, total, remove].forEach(function (n) { li.appendChild(n); });
    return li;
  }

  function renderCart() {
    updateCartLinks();
    if (!listEl) return;
    var count = 0;
    var total = 0;
    listEl.textContent = '';
    cart.forEach(function (line) {
      count += line.qty;
      total += line.qty * unitPrice(line);
      listEl.appendChild(buildLine(line));
    });
    emptyEl.hidden = cart.length > 0;
    contentEl.hidden = cart.length === 0;
    countEl.textContent = '(' + plural(count, 'article', 'articles') + ')';
    subtotalEl.textContent = money(total);
  }

  /* ---------- Ajout depuis une page produit ---------- */

  // item : { type:'tshirt', model, color, size } ou { type:'carte' | 'portecle', ref }
  function add(item) {
    var line = normalize({ type: item.type, model: item.model, color: item.color, size: item.size, ref: item.ref, qty: 1 });
    if (!line) return null;
    cart = loadCart();   // relit le stockage : un autre onglet a pu modifier le panier
    var id = lineId(line);
    var existing = cart.filter(function (l) { return lineId(l) === id; })[0];
    if (existing) {
      if (existing.qty >= MAX_QTY) return { line: existing, capped: true };
      existing.qty += 1;
      line = existing;
    } else {
      cart.push(line);
    }
    saveCart(cart);
    renderCart();
    return { line: line, capped: false };
  }

  /* ---------- Galerie : grande image qui suit la sélection ---------- */

  // Seule la dernière demande peut modifier l’image : pas de visuel périmé si l’on change vite de choix.
  function createStage(stage, img) {
    var token = 0;
    var target = null;
    return {
      show: function (src, alt) {
        if (src === target) return;
        target = src;
        var mine = ++token;
        stage.classList.add('is-loading');
        stage.classList.remove('is-error');
        var probe = new Image();
        probe.onload = function () {
          if (mine !== token) return;
          img.src = src;
          img.alt = alt;
          if (probe.naturalWidth) stage.style.setProperty('--ratio', probe.naturalWidth + ' / ' + probe.naturalHeight);
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
    };
  }

  /* ---------- Événements ---------- */

  if (listEl) {
    if (!storage && storageNote) storageNote.hidden = false;

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
        focusCart();
        return;
      }
      announce(cartStatus, 'Quantité mise à jour : ' + label + ', ' + line.qty + '.');
      var again = listEl.querySelector('li[data-id="' + id + '"] button[data-action="' + action + '"]');
      if (!again || again.disabled) again = listEl.querySelector('li[data-id="' + id + '"] button[data-action="' + (action === 'inc' ? 'dec' : 'inc') + '"]');
      if (again && !again.disabled) again.focus();
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        cart = [];
        saveCart(cart);
        renderCart();
        announce(cartStatus, 'Panier vidé.');
        focusCart();
      });
    }
  }

  // Mise à jour quand un autre onglet modifie le panier, ou au retour par l’historique.
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

  window.PhiloreillesBoutique = {
    catalog: CATALOG,
    imgDir: IMG,
    maxQty: MAX_QTY,
    add: add,
    describe: describe,
    money: money,
    announce: announce,
    createStage: createStage,
    focusCart: focusCart
  };

  renderCart();
})();
