/* Page souvenirs : choix de la catégorie (cartes postales / porte-clés), du produit, ajout au panier.
   Catalogue, prix et panier viennent de panier.js, chargé avant ce script. */
(function () {
  'use strict';

  var B = window.PhiloreillesBoutique;
  var form = document.getElementById('souv-form');
  if (!B || !form) return;

  var IMG = B.imgDir;
  var stage = B.createStage(document.getElementById('stage'), document.getElementById('stage-img'));
  var titleEl = document.getElementById('souv-title');
  var priceEl = document.getElementById('souv-price');
  var noteEl = document.getElementById('souv-note');
  var descEl = document.getElementById('souv-desc');
  var legendEl = document.getElementById('souv-legend');
  var listEl = document.getElementById('souv-list');
  var statusEl = document.getElementById('shop-status');
  var liveEl = document.getElementById('souv-live');

  var category = form.elements.categorie.value;
  var picked = {};   // dernier produit choisi dans chaque catégorie : on le retrouve en revenant dessus

  function refsOf(cat) { return Object.keys(B.catalog[cat].items); }
  function current() { return picked[category] || refsOf(category)[0]; }

  function buildCard(cat, ref) {
    var item = B.catalog[cat].items[ref];
    var wrap = document.createElement('div');
    wrap.className = 'tee-opt';

    var input = document.createElement('input');
    input.className = 'tee-sr';
    input.type = 'radio';
    input.name = 'produit';
    input.id = 'p-' + ref;
    input.value = ref;
    input.checked = ref === current();

    var label = document.createElement('label');
    label.className = 'tee-model tee-prod';
    label.htmlFor = input.id;

    var img = document.createElement('img');
    img.src = IMG + ref + '.jpg';
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';

    var text = document.createElement('span');
    var name = document.createElement('b');
    name.textContent = item.name;
    var desc = document.createElement('small');
    desc.textContent = item.desc;
    text.appendChild(name);
    text.appendChild(desc);

    var price = document.createElement('span');
    price.className = 'tee-prod__price';
    price.textContent = B.money(B.catalog[cat].price);

    label.appendChild(img);
    label.appendChild(text);
    label.appendChild(price);
    wrap.appendChild(input);
    wrap.appendChild(label);
    return wrap;
  }

  function buildList() {
    listEl.textContent = '';
    refsOf(category).forEach(function (ref) { listEl.appendChild(buildCard(category, ref)); });
  }

  // Met à jour l’image, le titre, le prix et la description du produit choisi.
  function renderDetails() {
    var cat = B.catalog[category];
    var ref = current();
    var item = cat.items[ref];
    titleEl.textContent = item.name;
    priceEl.textContent = B.money(cat.price);
    noteEl.textContent = cat.note;
    descEl.textContent = item.desc;
    legendEl.textContent = cat.choose;
    stage.show(IMG + ref + '.jpg', item.alt);
  }

  form.addEventListener('change', function (e) {
    B.announce(statusEl, '');
    if (e.target.name === 'categorie') {
      category = e.target.value;
      buildList();
      renderDetails();
      var n = refsOf(category).length;
      B.announce(liveEl, B.catalog[category].plural + ' : ' + n + (category === 'carte' ? ' cartes affichées.' : ' modèles affichés.'));
    } else if (e.target.name === 'produit') {
      picked[category] = e.target.value;
      renderDetails();
    }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var res = B.add({ type: category, ref: current() });
    if (!res) return;
    if (res.capped) {
      B.announce(statusEl, 'Quantité maximale atteinte pour cet article : ' + B.maxQty + ' exemplaires.');
      return;
    }
    statusEl.textContent = 'Ajouté au panier : ' + B.describe(res.line) + ' (quantité : ' + res.line.qty + '). Le mouvement vous remercie. ';
    var link = document.createElement('a');
    link.href = '#panier';
    link.textContent = 'Voir le panier';
    statusEl.appendChild(link);
  });

  buildList();
  renderDetails();
})();
