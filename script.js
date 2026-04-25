// Grill Time — site interactions

(() => {
  const nav = document.getElementById('nav');
  const burger = document.getElementById('burger');
  const links = document.querySelector('.nav__links');
  const year = document.getElementById('year');

  if (year) year.textContent = new Date().getFullYear();

  // Sticky nav background on scroll
  const onScroll = () => {
    if (window.scrollY > 24) nav.classList.add('is-stuck');
    else nav.classList.remove('is-stuck');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile nav toggle
  if (burger && links) {
    burger.addEventListener('click', () => {
      const open = links.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        links.classList.remove('is-open');
        burger.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Reveal-on-scroll for major blocks
  const targets = document.querySelectorAll(
    '.about__copy, .about__visual, .menu .dish, .boxes__copy, .boxes__visual, .timefood .sauce, .visit__copy, .visit__map, .section-head'
  );
  targets.forEach(el => el.classList.add('reveal'));

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          // small stagger for grid children
          const delay = e.target.dataset.delay || (i % 3) * 80;
          setTimeout(() => e.target.classList.add('is-in'), delay);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(t => io.observe(t));
  } else {
    targets.forEach(t => t.classList.add('is-in'));
  }
})();
