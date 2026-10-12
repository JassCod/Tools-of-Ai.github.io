import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createScene } from './scene.js';

gsap.registerPlugin(ScrollTrigger);

const isMobile = window.matchMedia('(max-width: 860px), (hover: none)').matches;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('js');
document.body.classList.add('is-loading');
document.getElementById('year').textContent = new Date().getFullYear();

// ---------- WebGL ----------
let scene = null;
try {
  scene = createScene(document.getElementById('webgl'), { isMobile, reduced });
  scene.start();
} catch (err) {
  console.warn('WebGL unavailable, continuing without 3D background', err);
  document.getElementById('webgl').style.background =
    'radial-gradient(circle at 70% 40%, #2a1d6b 0%, #04050d 60%)';
}

// ---------- Smooth scroll ----------
const lenis = new Lenis({ duration: 1.15, smoothWheel: !reduced });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : document.querySelector(id);
    if (target === null) return;
    e.preventDefault();
    closeMenu();
    lenis.scrollTo(target, { offset: id === '#top' ? 0 : -20, duration: 1.6 });
  });
});

// ---------- Split hero text into 3D characters ----------
function splitChars(el) {
  const words = el.textContent.split(' ');
  el.textContent = '';
  words.forEach((word, wi) => {
    const w = document.createElement('span');
    w.className = 'word';
    w.setAttribute('aria-hidden', 'true');
    for (const ch of word) {
      const s = document.createElement('span');
      s.className = 'char';
      s.textContent = ch;
      w.appendChild(s);
    }
    el.appendChild(w);
    if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
  });
}
document.querySelectorAll('.hero__title .split').forEach(splitChars);
// offset the flowing gradient per letter so colour travels across the word
document.querySelectorAll('.hero__title .aurora .char').forEach((c, i) => (c.style.animationDelay = `${-i * 0.45}s`));

// ---------- Loader ----------
const loader = document.getElementById('loader');
const countEl = document.getElementById('loaderCount');
const counter = { v: 0 };
gsap.to(counter, {
  v: 100,
  duration: reduced ? 0.2 : 1.6,
  ease: 'power2.inOut',
  onUpdate: () => (countEl.textContent = String(Math.round(counter.v)).padStart(3, '0')),
  onComplete: () => {
    loader.classList.add('is-done');
    document.body.classList.remove('is-loading');
    intro();
  },
});

function intro() {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.fromTo(
    '.hero__title .char',
    { yPercent: 120, rotateX: -95, opacity: 0, z: -200 },
    { yPercent: 0, rotateX: 0, opacity: 1, z: 0, duration: 1.6, stagger: 0.025 }
  ).to('.hero .reveal-up', { opacity: 1, y: 0, rotateX: 0, duration: 1.2, stagger: 0.1 }, '-=1.1');
  if (scene) {
    gsap.fromTo(scene.state, { hover: 1.4 }, { hover: 0, duration: 2.4, ease: 'power3.out' });
  }
}

// Hero characters: magnetic wave on hover
if (!isMobile) {
  document.querySelectorAll('.hero__title .char').forEach((c) => {
    c.addEventListener('mouseenter', () => {
      gsap.fromTo(c, { rotateY: 0 }, { rotateY: 360, duration: 1.1, ease: 'power3.out' });
      gsap.fromTo(c, { y: 0 }, { y: -18, duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.out' });
    });
  });
}

// Hero 3D parallax tilt following the pointer
const heroInner = document.getElementById('heroInner');
const mouse = { x: 0, y: 0 };
window.addEventListener('pointermove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
  if (scene) scene.state.mouse.set(mouse.x, mouse.y);
});
if (!isMobile && !reduced) {
  gsap.ticker.add(() => {
    gsap.set(heroInner, { rotateY: mouse.x * 6, rotateX: mouse.y * 4, transformPerspective: 1200 });
  });
}

// Hero scroll-out: text tumbles back into depth
gsap.to(heroInner, {
  scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  z: -400,
  rotateX: 25,
  opacity: 0,
  ease: 'none',
});

// ---------- Section → 3D scene state ----------
if (scene) {
  document.querySelectorAll('[data-morph]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 55%',
      end: 'bottom 45%',
      onToggle: (self) => {
        if (!self.isActive) return;
        scene.state.morph = parseFloat(sec.dataset.morph);
        scene.state.side = parseFloat(sec.dataset.side);
      },
    });
  });
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => (scene.state.scroll = self.progress),
  });
}

// ---------- Generic 3D reveals ----------
gsap.utils.toArray('.section .reveal-up').forEach((el) => {
  gsap.to(el, {
    scrollTrigger: { trigger: el, start: 'top 88%' },
    opacity: 1,
    y: 0,
    rotateX: 0,
    duration: 1.2,
    ease: 'expo.out',
  });
});

// Cards fly in from depth along a curved path
gsap.utils.toArray('.cards .card').forEach((card, i) => {
  gsap.from(card, {
    scrollTrigger: { trigger: '.cards', start: 'top 85%' },
    opacity: 0,
    z: -600,
    rotateY: i % 2 ? 35 : -35,
    rotateX: 20,
    y: 120,
    duration: 1.5,
    delay: i * 0.12,
    ease: 'expo.out',
    clearProps: 'transform',
  });
});
gsap.utils.toArray('.stack__item').forEach((el, i) => {
  gsap.from(el, {
    scrollTrigger: { trigger: el, start: 'top 90%' },
    opacity: 0,
    x: i % 2 ? 120 : -120,
    rotateY: i % 2 ? -50 : 50,
    z: -300,
    duration: 1.4,
    ease: 'expo.out',
    clearProps: 'transform',
  });
});
gsap.utils.toArray('.bento__item').forEach((el, i) => {
  gsap.from(el, {
    scrollTrigger: { trigger: '.bento', start: 'top 85%' },
    opacity: 0,
    rotateX: -60,
    y: 80,
    transformOrigin: '50% 100%',
    duration: 1.3,
    delay: i * 0.1,
    ease: 'expo.out',
    clearProps: 'transform',
  });
});
gsap.from('.contact__panel', {
  scrollTrigger: { trigger: '.contact', start: 'top 80%' },
  opacity: 0,
  rotateX: 30,
  y: 120,
  scale: 0.9,
  transformPerspective: 1400,
  duration: 1.6,
  ease: 'expo.out',
  clearProps: 'transform',
});

// Marquee band leans with scroll velocity
gsap.to('.band', {
  scrollTrigger: { trigger: '.band', start: 'top bottom', end: 'bottom top', scrub: true },
  rotateZ: 2,
  rotateX: -10,
  ease: 'none',
});

// ---------- Process: 3D cylinder pinned & rotated by scroll ----------
const cyl = document.getElementById('cyl');
const steps = gsap.utils.toArray('.step');
const angle = 360 / steps.length;
function layoutCylinder() {
  const w = steps[0].offsetWidth;
  const radius = Math.round(w / 2 / Math.tan(Math.PI / steps.length)) + (isMobile ? 30 : 70);
  steps.forEach((s, i) => {
    s.style.transform = `rotateY(${i * angle}deg) translateZ(${radius}px)`;
  });
  return radius;
}
let radius = layoutCylinder();
gsap.set(cyl, { z: -radius, rotateX: -6 });
const procBar = document.getElementById('procBar');
ScrollTrigger.create({
  trigger: '.process',
  start: 'top top',
  end: () => `+=${window.innerHeight * 2.4}`,
  pin: '.process__pin',
  scrub: 1,
  onUpdate: (self) => {
    const rot = -self.progress * angle * (steps.length - 1);
    gsap.set(cyl, { rotateY: rot });
    procBar.style.transform = `scaleX(${self.progress})`;
    steps.forEach((s, i) => {
      const a = (((i * angle + rot) % 360) + 540) % 360 - 180; // -180..180, 0 = facing
      const facing = Math.cos((a * Math.PI) / 180);
      s.style.opacity = String(0.25 + Math.max(0, facing) * 0.75);
      s.style.filter = `blur(${(1 - Math.max(0, facing)) * 3}px)`;
    });
  },
});
window.addEventListener('resize', () => {
  radius = layoutCylinder();
  gsap.set(cyl, { z: -radius });
});

// ---------- 3D tilt on panels ----------
if (!isMobile && !reduced) {
  document.querySelectorAll('.tilt').forEach((el) => {
    const glow = el.querySelector('.card__glow');
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.transition = 'transform .1s linear';
      el.style.transform = `perspective(1000px) rotateY(${(px - 0.5) * 16}deg) rotateX(${(0.5 - py) * 14}deg) translateZ(10px)`;
      if (glow) { el.style.setProperty('--mx', `${px * 100}%`); el.style.setProperty('--my', `${py * 100}%`); }
    });
    el.addEventListener('pointerleave', () => {
      el.style.transition = '';
      el.style.transform = '';
    });
  });

  // magnetic buttons
  document.querySelectorAll('.magnetic').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.4, duration: 0.4 });
    });
    b.addEventListener('pointerleave', () => gsap.to(b, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, .4)' }));
  });

  // cursor ring
  const cursor = document.getElementById('cursor');
  const cx = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' });
  const cy = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' });
  window.addEventListener('pointermove', (e) => { cx(e.clientX); cy(e.clientY); });
  document.querySelectorAll('a, button, .card').forEach((el) => {
    el.addEventListener('pointerenter', () => cursor.classList.add('is-hover'));
    el.addEventListener('pointerleave', () => cursor.classList.remove('is-hover'));
  });
  document.querySelectorAll('.btn, .hero__title').forEach((el) => {
    el.addEventListener('pointerenter', () => scene && (scene.state.hover = 1));
    el.addEventListener('pointerleave', () => scene && (scene.state.hover = 0));
  });
}

// ---------- Nav: hide on scroll down, show on up ----------
const nav = document.getElementById('nav');
let lastY = 0;
lenis.on('scroll', ({ scroll }) => {
  nav.classList.toggle('is-hidden', scroll > lastY && scroll > 200);
  lastY = scroll;
});

// ---------- Mobile menu ----------
const burger = document.getElementById('burger');
const menu = document.getElementById('menu');
function closeMenu() {
  menu.classList.remove('is-open');
  menu.setAttribute('aria-hidden', 'true');
  burger.setAttribute('aria-expanded', 'false');
}
burger.addEventListener('click', () => {
  const open = !menu.classList.contains('is-open');
  menu.classList.toggle('is-open', open);
  menu.setAttribute('aria-hidden', String(!open));
  burger.setAttribute('aria-expanded', String(open));
});

// ---------- Live clocks ----------
function tickClocks() {
  const now = new Date();
  document.querySelectorAll('[data-tz]').forEach((el) => {
    el.textContent = new Intl.DateTimeFormat('en-AU', { timeZone: el.dataset.tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  });
  document.querySelectorAll('[data-tz-date]').forEach((el) => {
    el.textContent = new Intl.DateTimeFormat('en-AU', { timeZone: el.dataset.tzDate, weekday: 'long', day: 'numeric', month: 'short' }).format(now);
  });
  const offset = (tz) => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(now);
    const m = (parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT+0').match(/GMT([+-])(\d{2}):?(\d{2})?/);
    return m ? (m[1] === '-' ? -1 : 1) * (parseInt(m[2], 10) * 60 + parseInt(m[3] || '0', 10)) : 0;
  };
  const diff = (offset('Australia/Sydney') - offset('Asia/Kolkata')) / 60;
  document.getElementById('tzDiff').textContent = `Sydney is ${diff}h ahead · we work your hours`;
}
tickClocks();
setInterval(tickClocks, 15000);

// ---------- Contact details from the admin panel ----------
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
function contactItem(label, value, href) {
  const node = el(href ? 'a' : 'div', 'citem');
  if (href) {
    node.href = href;
    if (href.startsWith('https://')) { node.target = '_blank'; node.rel = 'noopener noreferrer'; }
  }
  node.append(el('small', '', label), el('span', '', value));
  return node;
}

async function loadContent() {
  try {
    const res = await fetch('/api/content', { headers: { Accept: 'application/json' } });
    if (!res.ok) return;
    const c = await res.json();
    const grid = document.getElementById('contactGrid');
    const items = [];
    if (c.phone) items.push(contactItem('Phone', c.phone, `tel:${c.phone.replace(/[^\d+]/g, '')}`));
    if (c.whatsapp) items.push(contactItem('WhatsApp', c.whatsapp, `https://wa.me/${c.whatsapp.replace(/\D/g, '')}`));
    if (c.email) items.push(contactItem('Email', c.email, `mailto:${c.email}`));
    if (c.officeIndia) items.push(contactItem('Operations office · India', c.officeIndia));
    if (c.officeAustralia) items.push(contactItem('Australia', c.officeAustralia));
    if (c.hours) items.push(contactItem('Working hours', c.hours));
    if (items.length) {
      grid.replaceChildren(...items);
    }
    const socials = document.getElementById('socials');
    [['LinkedIn', c.linkedin], ['Facebook', c.facebook], ['Instagram', c.instagram]].forEach(([name, url]) => {
      if (url && url.startsWith('https://')) {
        const a = el('a', '', name);
        a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        socials.append(a);
      }
    });
    if (c.announcement) {
      const bar = document.getElementById('announce');
      bar.textContent = c.announcement;
      bar.hidden = false;
      document.body.classList.add('has-announce');
    }
    ScrollTrigger.refresh();
  } catch {
    /* offline or API unavailable: keep the placeholder */
  }
}
loadContent();

window.addEventListener('load', () => ScrollTrigger.refresh());
