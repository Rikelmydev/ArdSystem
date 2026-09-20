// Splash / Boot Screen
(function() {
  var splash = document.getElementById('splash');
  var statusEl = document.getElementById('splashStatus');
  var phrases = ['Inicializando sistema…', 'Verificando conexões…', 'Carregando painel…'];
  var i = 0;
  var cycle = setInterval(function() {
    i = (i + 1) % phrases.length;
    statusEl.textContent = phrases[i];
  }, 500);

  function dismiss() {
    clearInterval(cycle);
    splash.classList.add('splash-hidden');
    document.body.classList.remove('no-scroll');
    setTimeout(function() { splash.remove(); }, 650);
  }

  window.addEventListener('load', function() {
    setTimeout(dismiss, 1300);
  });
  // Safety net in case 'load' fires very late (slow external fonts/CDNs)
  setTimeout(dismiss, 4000);
})();

// AOS Init
AOS.init({ duration: 700, once: true, offset: 40, easing: 'ease-out-cubic' });

// Swiper Testimonials Init
var swiper = new Swiper(".mySwiper", {
  slidesPerView: 1,
  spaceBetween: 24,
  grabCursor: true,
  loop: true,
  autoplay: {
    delay: 3500,
    disableOnInteraction: false,
  },
  breakpoints: {
    768: { slidesPerView: 2 },
    1024: { slidesPerView: 3 }
  }
});

// Header Scroll
const header = document.getElementById('mainHeader');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) header.classList.add('scrolled');
  else header.classList.remove('scrolled');
});

// Mobile Nav Toggle
const navToggle = document.getElementById('navToggle');
const mobileNav = document.getElementById('mobileNav');
const mnavClose = document.getElementById('mnavClose');
function closeMobileNav() {
  mobileNav.classList.remove('open');
  navToggle.classList.remove('active');
  navToggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('no-scroll');
}
navToggle.addEventListener('click', () => {
  const isOpen = mobileNav.classList.toggle('open');
  navToggle.classList.toggle('active', isOpen);
  navToggle.setAttribute('aria-expanded', String(isOpen));
  document.body.classList.toggle('no-scroll', isOpen);
});
mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMobileNav));
mnavClose.addEventListener('click', closeMobileNav);
window.addEventListener('resize', () => {
  if (window.innerWidth > 1024) closeMobileNav();
});

// Phone mask
document.getElementById('fphone').addEventListener('input', function(e) {
  let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
  e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
});

// Form Submit
document.getElementById('contactForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const nome = document.getElementById('fname').value;
  const tel = document.getElementById('fphone').value;
  const servico = document.getElementById('fservice').value;
  const msg = document.getElementById('fmsg').value;

  const texto = `Olá, sou *${nome}*.\nTelefone: ${tel}\nInteresse: *${servico}*\n\n${msg}`;
  const encodedText = encodeURIComponent(texto);
  window.open(`https://wa.me/5511999999999?text=${encodedText}`, '_blank');
});
