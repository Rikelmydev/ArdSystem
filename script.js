/* =========================================================
   ARD System Telecom — script do site
   ========================================================= */

/* ---------------------------------------------------------
   WhatsApp da empresa: +55 11 95903-5860
   Formato: DDI + DDD + número, só dígitos.
   Este é o único lugar do site onde o número precisa ser editado:
   todos os links com data-wa são montados a partir daqui.
   (Se mudar, atualize também "telephone" no JSON-LD do index.html.)
   --------------------------------------------------------- */
const WHATSAPP = '5511959035860';

const MSG_PADRAO = 'Olá! Vim pelo site e gostaria de um orçamento.';

const prefereMenosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --------------------- WhatsApp --------------------- */
function linkWhats(texto) {
  return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(texto);
}

document.querySelectorAll('a[data-wa]').forEach(function (a) {
  a.href = linkWhats(a.getAttribute('data-wa') || MSG_PADRAO);
});

/* --------------------- Ano do rodapé --------------------- */
const anoEl = document.getElementById('year');
if (anoEl) anoEl.textContent = new Date().getFullYear();

/* =========================================================
   Tela de carregamento
   Sai assim que a página carrega, respeitando um tempo mínimo
   para a barra não piscar. Tem rede de segurança caso o evento
   'load' demore (fonte ou CDN lenta).
   ========================================================= */
const splash = document.getElementById('splash');

(function () {
  if (!splash) return;

  // Quem pediu menos movimento não precisa esperar a animação
  const TEMPO_MINIMO = prefereMenosMovimento ? 0 : 1250;
  const inicio = Date.now();
  let saiu = false;

  function sair() {
    if (saiu) return;
    saiu = true;
    splash.setAttribute('aria-busy', 'false');
    splash.classList.add('hidden');
    document.body.classList.remove('is-loading');
    revelaHero();
    setTimeout(function () { splash.remove(); }, 600);
  }

  function agendarSaida() {
    const restante = Math.max(0, TEMPO_MINIMO - (Date.now() - inicio));
    setTimeout(sair, restante);
  }

  if (document.readyState === 'complete') agendarSaida();
  else window.addEventListener('load', agendarSaida);

  // Rede de segurança: nunca deixar a pessoa presa na tela de carregamento
  setTimeout(sair, 4000);
})();

/* =========================================================
   Animações — Motion (motion.dev), o mesmo motor do Framer Motion.
   O Framer Motion em si é um pacote React; como este site é HTML/JS
   puro, usamos a API vanilla da mesma biblioteca.
   ========================================================= */
const temMotion = !!window.Motion && !prefereMenosMovimento;
const EASE = [0.16, 1, 0.3, 1];

function revelaHero() { /* substituída abaixo quando o Motion existe */ }

if (temMotion) {
  document.documentElement.classList.add('motion-ready');

  const { animate, inView, stagger } = window.Motion;

  // Limpa o transform inline depois da animação, para não travar
  // os transforms de hover definidos no CSS.
  function limpaTransform(alvos) {
    requestAnimationFrame(function () {
      alvos.forEach(function (el) { el.style.removeProperty('transform'); });
    });
  }

  // Sempre dentro de um array: passar um <form> direto faria o Motion
  // tratá-lo como a lista dos seus próprios campos.
  function entra(el) {
    const delay = (parseInt(el.getAttribute('data-delay'), 10) || 0) / 1000;
    animate(
      [el],
      { opacity: [0, 1], transform: ['translateY(26px)', 'none'] },
      { duration: 0.7, delay: delay, ease: EASE }
    ).then(function () { limpaTransform([el]); });
  }

  // O hero fica atrás da tela de carregamento: só entra quando ela sai.
  revelaHero = function () {
    document.querySelectorAll('.hero [data-reveal]').forEach(entra);
  };

  document.querySelectorAll('[data-reveal]').forEach(function (el) {
    if (el.closest('.hero')) return;
    inView([el], function () { entra(el); }, { amount: 0.15 });
  });

  // Grupos em cascata
  function cascata(seletorGrupo, seletorFilhos, deslocamento) {
    const grupo = document.querySelector(seletorGrupo);
    if (!grupo) return;
    const filhos = Array.from(grupo.querySelectorAll(seletorFilhos));
    if (!filhos.length) return;

    inView([grupo], function () {
      animate(
        filhos,
        { opacity: [0, 1], transform: [deslocamento, 'none'] },
        { duration: 0.6, delay: stagger(0.09), ease: EASE }
      ).then(function () { limpaTransform(filhos); });
    }, { amount: 0.1 });
  }

  cascata('#appsGrid', '.app', 'translateY(24px)');
  cascata('.steps', '.step', 'translateX(-20px)');

  // Contador do comodato (36 meses)
  document.querySelectorAll('[data-count]').forEach(function (el) {
    const alvo = parseInt(el.getAttribute('data-count'), 10);
    if (isNaN(alvo)) return;
    inView([el], function () {
      animate(0, alvo, {
        duration: 1.2, delay: 0.2, ease: EASE,
        onUpdate: function (v) { el.textContent = Math.round(v); },
        onComplete: function () { el.textContent = alvo; }
      });
    }, { amount: 0.6 });
  });
}

/* =========================================================
   Carrossel
   O deslize é o próprio scroll do sistema (scroll-snap), então
   a inércia no celular e a navegação por teclado vêm de graça.
   Este script só cuida dos indicadores, das setas e do avanço
   automático — que para de vez assim que a pessoa assume o controle.
   ========================================================= */
document.querySelectorAll('[data-carousel]').forEach(function (raiz) {
  const trilho = raiz.querySelector('.carousel-viewport');
  const slides = Array.from(trilho.children);
  const dots = raiz.querySelector('[data-carousel-dots]');
  const btnPrev = raiz.querySelector('[data-carousel-prev]');
  const btnNext = raiz.querySelector('[data-carousel-next]');
  if (!slides.length) return;

  let atual = 0;
  let timer = null;
  let pessoaAssumiu = false;

  // Cada slide pode trazer a própria cor em --svc / --svc-soft (inline, no HTML).
  function corDo(i, prop) {
    return slides[i].style.getPropertyValue(prop).trim();
  }

  /* ---------- indicadores ---------- */
  const botoesDot = slides.map(function (slide, i) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'carousel-dot';
    b.setAttribute('aria-label', 'Ir para o item ' + (i + 1) + ' de ' + slides.length);
    // O ponto nasce já com a cor do slide que representa
    const cor = corDo(i, '--svc');
    if (cor) b.style.setProperty('--dot', cor);
    b.addEventListener('click', function () {
      assumirControle();
      vaiPara(i);
    });
    if (dots) dots.appendChild(b);
    return b;
  });

  function pinta() {
    const limite = ultimoIndiceVisivel();

    botoesDot.forEach(function (b, i) {
      // Com 3 cards à vista, as últimas posições não são alcançáveis:
      // esconder esses indicadores evita clique que não leva a lugar nenhum.
      b.hidden = i > limite;
      b.setAttribute('aria-current', String(i === atual));
    });

    // O slide da vez assume a cor: barra no topo, borda e título.
    slides.forEach(function (slide, i) {
      slide.classList.toggle('is-active', i === atual);
    });

    // As setas seguem a cor do slide atual
    const cor = corDo(atual, '--svc');
    const corSuave = corDo(atual, '--svc-soft');
    if (cor) raiz.style.setProperty('--svc-atual', cor);
    if (corSuave) raiz.style.setProperty('--svc-soft-atual', corSuave);

    // Sem laço: nas pontas as setas desligam em vez de dar a volta,
    // assim a pessoa vê onde a lista começa e termina.
    if (btnPrev) btnPrev.disabled = atual === 0;
    if (btnNext) btnNext.disabled = atual >= limite;
  }

  // Com vários cards à vista, o último slide nunca chega a ficar
  // encostado à esquerda: o fim do scroll é o último índice alcançável.
  function ultimoIndiceVisivel() {
    const maxScroll = trilho.scrollWidth - trilho.clientWidth;
    let ultimo = slides.length - 1;
    for (let i = 0; i < slides.length; i++) {
      if (deslocamentoDe(i) >= maxScroll - 1) { ultimo = i; break; }
    }
    return ultimo;
  }

  function deslocamentoDe(i) {
    return slides[i].offsetLeft - slides[0].offsetLeft;
  }

  function vaiPara(i) {
    const limite = ultimoIndiceVisivel();
    atual = Math.max(0, Math.min(i, limite));
    trilho.scrollTo({ left: deslocamentoDe(atual), behavior: prefereMenosMovimento ? 'auto' : 'smooth' });
    pinta();
  }

  /* ---------- sincroniza com o scroll manual ---------- */
  let scrollTimer = null;
  trilho.addEventListener('scroll', function () {
    if (scrollTimer) return;
    scrollTimer = setTimeout(function () {
      scrollTimer = null;
      const pos = trilho.scrollLeft;
      let maisPerto = 0;
      let menorDist = Infinity;
      slides.forEach(function (_, i) {
        const d = Math.abs(deslocamentoDe(i) - pos);
        if (d < menorDist) { menorDist = d; maisPerto = i; }
      });
      if (maisPerto !== atual) { atual = maisPerto; }
      pinta();
    }, 120);
  }, { passive: true });

  /* ---------- arrastar com o mouse ----------
     No celular o swipe já é o scroll nativo. No desktop, sem isso, só
     dava para navegar pelas setas — arrastar o card é o gesto esperado. */
  (function habilitaArraste() {
    let arrastando = false;
    let xInicial = 0;
    let scrollInicial = 0;
    let moveu = 0;

    trilho.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return; // toque usa o scroll nativo
      if (e.button !== 0) return;
      arrastando = true;
      moveu = 0;
      xInicial = e.clientX;
      scrollInicial = trilho.scrollLeft;
      trilho.classList.add('arrastando');
      trilho.setPointerCapture(e.pointerId);
    });

    trilho.addEventListener('pointermove', function (e) {
      if (!arrastando) return;
      const delta = e.clientX - xInicial;
      moveu = Math.abs(delta);
      trilho.scrollLeft = scrollInicial - delta;
    });

    function solta(e) {
      if (!arrastando) return;
      arrastando = false;
      trilho.classList.remove('arrastando');
      if (e.pointerId !== undefined && trilho.hasPointerCapture(e.pointerId)) {
        trilho.releasePointerCapture(e.pointerId);
      }
      // Encaixa no card mais próximo de onde o arraste parou
      if (moveu > 4) {
        let maisPerto = 0, menorDist = Infinity;
        slides.forEach(function (_, i) {
          const d = Math.abs(deslocamentoDe(i) - trilho.scrollLeft);
          if (d < menorDist) { menorDist = d; maisPerto = i; }
        });
        vaiPara(maisPerto);
      }
    }
    trilho.addEventListener('pointerup', solta);
    trilho.addEventListener('pointercancel', solta);

    // Um arraste não deve virar clique no link/card ao soltar
    trilho.addEventListener('click', function (e) {
      if (moveu > 4) { e.preventDefault(); e.stopPropagation(); moveu = 0; }
    }, true);

    // Só mostra o cursor de "pegar" onde o arraste existe de verdade
    if (window.matchMedia('(pointer: fine)').matches) {
      trilho.classList.add('arrastavel');
    }
  })();

  /* ---------- setas ---------- */
  if (btnPrev) btnPrev.addEventListener('click', function () { assumirControle(); vaiPara(atual - 1); });
  if (btnNext) btnNext.addEventListener('click', function () { assumirControle(); vaiPara(atual + 1); });

  /* ---------- teclado ---------- */
  trilho.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    assumirControle();
    vaiPara(atual + (e.key === 'ArrowRight' ? 1 : -1));
  });

  /* ---------- avanço automático ---------- */
  const intervalo = parseInt(raiz.getAttribute('data-autoplay'), 10);

  function comecaAuto() {
    if (pessoaAssumiu || prefereMenosMovimento || !intervalo || isNaN(intervalo)) return;
    paraAuto();
    timer = setInterval(function () {
      const limite = ultimoIndiceVisivel();
      vaiPara(atual >= limite ? 0 : atual + 1);
    }, intervalo);
  }
  function paraAuto() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  // Assim que a pessoa toca, arrasta, usa o teclado ou clica num controle,
  // o avanço automático para de vez: ninguém gosta de perder a leitura.
  function assumirControle() {
    pessoaAssumiu = true;
    paraAuto();
  }
  ['pointerdown', 'touchstart', 'wheel'].forEach(function (ev) {
    trilho.addEventListener(ev, assumirControle, { passive: true, once: true });
  });

  // Pausa enquanto o mouse está em cima, com o foco dentro, ou com a aba escondida
  raiz.addEventListener('mouseenter', paraAuto);
  raiz.addEventListener('mouseleave', comecaAuto);
  raiz.addEventListener('focusin', paraAuto);
  raiz.addEventListener('focusout', comecaAuto);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) paraAuto(); else comecaAuto();
  });

  // Só roda enquanto o carrossel está à vista
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) { e.isIntersecting ? comecaAuto() : paraAuto(); });
    }, { threshold: 0.35 }).observe(raiz);
  } else {
    comecaAuto();
  }

  window.addEventListener('resize', pinta);
  pinta();
});

/* =========================================================
   Esteira de marcas — o logo sob o dedo fica colorido
   No mouse o :hover do CSS já resolve; em tela sensível ao toque
   o :hover fica "grudado", então marcamos manualmente quem está
   embaixo do dedo enquanto ele desliza.
   ========================================================= */
(function () {
  const esteira = document.querySelector('.brands-marquee');
  if (!esteira) return;

  let marcado = null;

  function limpa() {
    if (marcado) { marcado.classList.remove('is-touched'); marcado = null; }
  }

  function marcaEm(x, y) {
    const alvo = document.elementFromPoint(x, y);
    const item = alvo && alvo.closest ? alvo.closest('.brands-track li') : null;
    if (item === marcado) return;
    limpa();
    if (item) { item.classList.add('is-touched'); marcado = item; }
  }

  function aoTocar(e) {
    const t = e.touches[0];
    if (t) marcaEm(t.clientX, t.clientY);
  }

  esteira.addEventListener('touchstart', aoTocar, { passive: true });
  esteira.addEventListener('touchmove', aoTocar, { passive: true });
  esteira.addEventListener('touchend', limpa, { passive: true });
  esteira.addEventListener('touchcancel', limpa, { passive: true });
})();

/* =========================================================
   Vídeo do YouTube
   A capa é uma imagem estática: o player (e os cookies do YouTube)
   só entram na página depois que a pessoa clica em assistir.
   ========================================================= */
document.querySelectorAll('.video-capa').forEach(function (capa) {
  const img = capa.querySelector('img');

  // maxresdefault não existe para todo vídeo; cai para a miniatura padrão
  if (img && img.dataset.fallback) {
    img.addEventListener('error', function () {
      img.src = img.dataset.fallback;
    }, { once: true });
  }

  capa.addEventListener('click', function () {
    const id = capa.getAttribute('data-video');
    const inicio = capa.getAttribute('data-inicio') || '0';
    if (!id) return;

    const iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + id +
                 '?autoplay=1&start=' + inicio + '&rel=0&modestbranding=1';
    iframe.title = capa.getAttribute('aria-label') || 'Vídeo';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.loading = 'lazy';

    capa.replaceWith(iframe);
    iframe.focus();
  });
});

/* =========================================================
   Cabeçalho + navegação
   ========================================================= */
const header = document.getElementById('mainHeader');
let ticking = false;

window.addEventListener('scroll', function () {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(function () {
    header.classList.toggle('scrolled', window.scrollY > 24);
    ticking = false;
  });
}, { passive: true });

const navToggle = document.getElementById('navToggle');
const mobileNav = document.getElementById('mobileNav');
const mnavClose = document.getElementById('mnavClose');

function fechaMenu() {
  mobileNav.classList.remove('open');
  navToggle.classList.remove('active');
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-label', 'Abrir menu');
  document.body.classList.remove('menu-open');
}

navToggle.addEventListener('click', function () {
  const aberto = mobileNav.classList.toggle('open');
  navToggle.classList.toggle('active', aberto);
  navToggle.setAttribute('aria-expanded', String(aberto));
  navToggle.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
  document.body.classList.toggle('menu-open', aberto);
});

mnavClose.addEventListener('click', fechaMenu);
mobileNav.querySelectorAll('a').forEach(function (a) {
  a.addEventListener('click', fechaMenu);
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
    fechaMenu();
    navToggle.focus();
  }
});

window.addEventListener('resize', function () {
  if (window.innerWidth >= 1120) fechaMenu();
});

/* =========================================================
   Formulário
   ========================================================= */
const form = document.getElementById('contactForm');
const campoNome = document.getElementById('fname');
const campoTel = document.getElementById('fphone');
const campoServico = document.getElementById('fservice');
const campoMsg = document.getElementById('fmsg');

// Máscara de telefone: (11) 91234-5678 / (11) 1234-5678
campoTel.addEventListener('input', function (e) {
  const d = e.target.value.replace(/\D/g, '').slice(0, 11);
  let saida = d;
  if (d.length > 2) saida = '(' + d.slice(0, 2) + ') ' + d.slice(2);
  if (d.length > 6) {
    const corte = d.length > 10 ? 7 : 6;
    saida = '(' + d.slice(0, 2) + ') ' + d.slice(2, corte) + '-' + d.slice(corte);
  }
  e.target.value = saida;
});

function marcaErro(campo, mostrar) {
  const erro = document.getElementById(campo.id + '-error');
  if (erro) erro.hidden = !mostrar;
  campo.setAttribute('aria-invalid', String(mostrar));
  return !mostrar;
}

// Some com a mensagem de erro assim que a pessoa corrige o campo.
[campoNome, campoTel, campoServico].forEach(function (campo) {
  ['input', 'change'].forEach(function (ev) {
    campo.addEventListener(ev, function () {
      if (campo.getAttribute('aria-invalid') === 'true') marcaErro(campo, false);
    });
  });
});

form.addEventListener('submit', function (e) {
  e.preventDefault();

  const nome = campoNome.value.trim();
  const digitos = campoTel.value.replace(/\D/g, '');
  const servico = campoServico.value;

  const nomeOk = marcaErro(campoNome, nome.length < 2);
  const telOk = marcaErro(campoTel, digitos.length < 10);
  const servicoOk = marcaErro(campoServico, servico === '');

  if (!nomeOk || !telOk || !servicoOk) {
    const primeiroErro = form.querySelector('[aria-invalid="true"]');
    if (primeiroErro) primeiroErro.focus();
    return;
  }

  const detalhes = campoMsg.value.trim();
  const texto =
    'Olá! Vim pelo site da ARD System.\n\n' +
    'Nome: ' + nome + '\n' +
    'WhatsApp: ' + campoTel.value + '\n' +
    'Preciso de: ' + servico +
    (detalhes ? '\n\nDetalhes: ' + detalhes : '');

  window.open(linkWhats(texto), '_blank', 'noopener');
});
