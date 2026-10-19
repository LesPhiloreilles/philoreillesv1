(function () {
  var btn = document.querySelector('.burger');
  var nav = document.getElementById('nav');
  if (!btn || !nav) return;
  function fermer() {
    nav.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }
  btn.addEventListener('click', function () {
    var ouvert = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(ouvert));
  });
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) fermer();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      fermer();
      btn.focus();
    }
  });
})();
