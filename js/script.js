(() => {
  'use strict';

  /* ============================================================
     STARFIELD — twinkling background stars on a canvas
  ============================================================ */
  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d');
  let stars = [];
  let W, H;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = document.documentElement.scrollHeight;
  }

  function makeStars() {
    const count = Math.floor((W * H) / 9000);
    stars = new Array(count).fill(0).map(() => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.3 + 0.3,
      baseAlpha: Math.random() * 0.5 + 0.35,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.02 + 0.008,
      hue: Math.random() > 0.85 ? '243,223,160' : '246,239,224'
    }));
  }

  let t = 0;
  function drawStars() {
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      const alpha = s.baseAlpha + Math.sin(t * s.speed * 60 + s.phase) * 0.3;
      ctx.beginPath();
      ctx.fillStyle = `rgba(${s.hue},${Math.max(0.05, alpha)})`;
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    t += 0.016;
    requestAnimationFrame(drawStars);
  }

  function initStarfield() {
    resize();
    makeStars();
    drawStars();
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); makeStars(); }, 200);
  });

  /* ============================================================
     SHOOTING STARS — occasional streak across the sky
  ============================================================ */
  function spawnShootingStar() {
    const el = document.createElement('div');
    el.className = 'shooting-star';
    el.style.top = (Math.random() * 40 + 5) + 'vh';
    el.style.left = (Math.random() * 50 + 40) + 'vw';
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  function scheduleShootingStars() {
    const delay = Math.random() * 9000 + 6000;
    setTimeout(() => {
      spawnShootingStar();
      scheduleShootingStars();
    }, delay);
  }

  /* ============================================================
     MUSIC — background track, faded in/out via the <audio> element
  ============================================================ */
  const Music = (() => {
    const el = document.getElementById('bgMusic');
    const targetVolume = 0.6;
    let fadeRaf = null;

    function fadeTo(target, duration) {
      cancelAnimationFrame(fadeRaf);
      const start = el.volume;
      const t0 = performance.now();
      function step(now) {
        const p = Math.min(1, (now - t0) / duration);
        el.volume = start + (target - start) * p;
        if (p < 1) fadeRaf = requestAnimationFrame(step);
      }
      fadeRaf = requestAnimationFrame(step);
    }

    function start() {
      el.volume = 0;
      el.play().catch(() => {});
      fadeTo(targetVolume, 1800);
    }

    function mute() {
      fadeTo(0, 700);
    }

    function unmute() {
      fadeTo(targetVolume, 700);
    }

    return { start, mute, unmute };
  })();

  /* ============================================================
     GATE — tap the moon to begin the experience
  ============================================================ */
  const gate = document.getElementById('gate');
  const enterBtn = document.getElementById('enterBtn');
  const mainEl = document.getElementById('main');
  const soundToggle = document.getElementById('soundToggle');
  let muted = false;

  enterBtn.addEventListener('click', () => {
    Music.start();
    gate.classList.add('gate-hidden');
    mainEl.classList.remove('hidden');
    requestAnimationFrame(() => {
      mainEl.classList.add('revealed');
    });
    initRevealObserver();
    scheduleShootingStars();
    setTimeout(resize, 50); // ensure starfield covers full scrollable height
  }, { once: true });

  soundToggle.addEventListener('click', () => {
    muted = !muted;
    soundToggle.classList.toggle('muted', muted);
    soundToggle.setAttribute('aria-pressed', String(!muted));
    if (muted) Music.mute(); else Music.unmute();
  });

  /* ============================================================
     SCROLL REVEAL
  ============================================================ */
  function initRevealObserver() {
    const targets = document.querySelectorAll('[data-reveal]');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18 });
    targets.forEach((t) => io.observe(t));
  }

  /* ============================================================
     ADD TO CALENDAR (.ics download)
  ============================================================ */
  const calendarBtn = document.getElementById('calendarBtn');
  if (calendarBtn) {
    calendarBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Our Little Miracle//Bobin & Amrutha//EN',
        'BEGIN:VEVENT',
        'UID:' + Date.now() + '@our-little-miracle',
        'DTSTAMP:' + toICSDate(new Date()),
        'DTSTART:20260904T170000',
        'DURATION:PT4H',
        'SUMMARY:Our Little Miracle – Baby Shower',
        'LOCATION:Los Palmares\\, C. Carnero 5572\\, Arboledas\\, 45070 Zapopan\\, Jalisco',
        'DESCRIPTION:Join Bobin & Amrutha as they celebrate their little miracle\\, under the stars.',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      const blob = new Blob([ics], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'our-little-miracle.ics';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  function toICSDate(d) {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  /* ============================================================
     INIT
  ============================================================ */
  initStarfield();
})();
