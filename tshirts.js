/* Page T-shirts : sélection du modèle, de la couleur, de la taille et de la vue (face / dos).
   Le panier lui-même (stockage, affichage, compteur) est géré par panier.js, chargé avant ce script. */
(function () {
  'use strict';

  var B = window.PhiloreillesBoutique;
  var shop = document.getElementById('shop');
  var form = document.getElementById('shop-form');
  if (!B || !shop || !form) return;

  var T = B.catalog.tshirt;
  var IMG = B.imgDir;

  var DESC = {
    '1': 'Le drapeau du mouvement, en grand, au centre de la poitrine. Pour celles et ceux qui préfèrent que leurs convictions soient visibles depuis l’autre côté de la place.',
    '2': 'Un drapeau plus discret, floqué sur le côté gauche de la poitrine, à hauteur de cœur. L’engagement citoyen en toute sobriété, ou presque.'
  };

  var stage = B.createStage(document.getElementById('stage'), document.getElementById('stage-img'));
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

  function selected() {
    return { model: form.elements.modele.value, color: form.elements.couleur.value, size: form.elements.taille.value };
  }
  // Face : <couleur>1 (modèle 1) ou <couleur>2 (modèle 2). Dos : <couleur>3, commun aux deux modèles.
  function imageFor(color, model, which) { return IMG + color + (which === 'dos' ? '3' : model) + '.jpg'; }
  function altFor(s, which) {
    return which === 'dos'
      ? 'T-shirt ' + T.colors[s.color] + ', vue de dos'
      : 'T-shirt ' + T.models[s.model] + ', ' + T.colors[s.color] + ', vue de face';
  }

  function syncThumbs() {
    thumbs.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-view') === view ? 'true' : 'false');
    });
  }

  function refresh() {
    var s = selected();
    titleEl.textContent = 'T-shirt ' + T.models[s.model];
    descEl.textContent = DESC[s.model];
    colorName.textContent = T.colors[s.color];
    modelImgs.forEach(function (img) {
      var src = imageFor(s.color, img.getAttribute('data-model-img'), 'face');
      if (img.getAttribute('src') !== src) img.src = src;
    });
    var face = imageFor(s.color, s.model, 'face');
    var dos = imageFor(s.color, s.model, 'dos');
    if (thumbFace.getAttribute('src') !== face) thumbFace.src = face;
    if (thumbDos.getAttribute('src') !== dos) thumbDos.src = dos;
    stage.show(view === 'dos' ? dos : face, altFor(s, view));
  }

  function hideError() {
    errorEl.hidden = true;
    sizeField.removeAttribute('aria-describedby');
  }

  form.addEventListener('change', function (e) {
    B.announce(statusEl, '');
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
      B.announce(statusEl, '');
      form.elements.taille[0].focus();
      return;
    }
    hideError();
    var res = B.add({ type: 'tshirt', model: s.model, color: s.color, size: s.size });
    if (!res) return;
    if (res.capped) {
      B.announce(statusEl, 'Quantité maximale atteinte pour ce T-shirt : ' + B.maxQty + ' exemplaires.');
      return;
    }
    statusEl.textContent = 'Ajouté au panier : ' + B.describe(res.line) + ' (quantité : ' + res.line.qty + '). Le mouvement vous remercie. ';
    var link = document.createElement('a');
    link.href = '#panier';
    link.textContent = 'Voir le panier';
    statusEl.appendChild(link);
  });

  refresh();
})();
