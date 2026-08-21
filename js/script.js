(() => {
  'use strict';

  /* ============================================================
     STARFIELD — twinkling stars on a viewport-sized canvas, with a
     slow vertical drift tied to scroll (parallax: much slower than
     the page itself, tiling infinitely via modulo wrap)
  ============================================================ */
  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d');
  let stars = [];
  let W, H;
  let scrollY = 0;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function makeStars() {
    const count = Math.floor((W * H) / 7000);
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
    const offset = scrollY * 0.06;
    for (const s of stars) {
      const y = ((s.y + offset) % H + H) % H;
      const alpha = s.baseAlpha + Math.sin(t * s.speed * 60 + s.phase) * 0.3;
      ctx.beginPath();
      ctx.fillStyle = `rgba(${s.hue},${Math.max(0.05, alpha)})`;
      ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
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
     SKY PARALLAX — moon & planets drift gently on scroll, each at
     a different depth, layered under the rotating-planet CSS anim
  ============================================================ */
  function initSkyParallax() {
    const moon = document.getElementById('bgMoon');
    const p1 = document.getElementById('planet1Wrap');
    const p2 = document.getElementById('planet2Wrap');
    let raf = null;

    function update() {
      scrollY = window.scrollY;
      if (moon) moon.style.transform = `translateY(${scrollY * 0.035}px)`;
      if (p1) p1.style.transform = `translateY(${scrollY * 0.07}px)`;
      if (p2) p2.style.transform = `translateY(${scrollY * 0.05}px)`;
      raf = null;
    }

    window.addEventListener('scroll', () => {
      if (!raf) raf = requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  /* ============================================================
     COUNTDOWN — live countdown to the event
  ============================================================ */
  function initCountdown() {
    const dEl = document.getElementById('cdDays');
    const hEl = document.getElementById('cdHours');
    const mEl = document.getElementById('cdMins');
    const sEl = document.getElementById('cdSecs');
    if (!dEl) return;
    const target = new Date('2026-09-04T23:00:00Z').getTime(); // 5:00 PM CST (UTC-6)

    function tick() {
      const diff = Math.max(0, target - Date.now());
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      dEl.textContent = String(days).padStart(2, '0');
      hEl.textContent = String(hours).padStart(2, '0');
      mEl.textContent = String(mins).padStart(2, '0');
      sEl.textContent = String(secs).padStart(2, '0');
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ============================================================
     STAR-BURST — a little confetti of sparkles from a click point
  ============================================================ */
  function burstStars(x, y, count = 18) {
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'star-burst';
      const angle = Math.random() * Math.PI * 2;
      const dist = 55 + Math.random() * 95;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.setProperty('--dx', (Math.cos(angle) * dist) + 'px');
      el.style.setProperty('--dy', (Math.sin(angle) * dist) + 'px');
      el.style.animationDuration = (0.7 + Math.random() * 0.5) + 's';
      if (Math.random() < 0.4) el.style.background = 'var(--cream)';
      document.body.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
    }
  }

  /* ============================================================
     SCROLL PROGRESS — a comet traces your path down the story
  ============================================================ */
  function initScrollProgress() {
    const fill = document.getElementById('scrollProgressFill');
    const comet = document.getElementById('scrollProgressComet');
    if (!fill || !comet) return;
    let raf = null;

    function update() {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      fill.style.height = (pct * 100) + '%';
      comet.style.top = (pct * 100) + '%';
      raf = null;
    }

    window.addEventListener('scroll', () => {
      if (!raf) raf = requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('resize', () => {
      if (!raf) raf = requestAnimationFrame(update);
    });
    update();
  }

  /* ============================================================
     DETAILS ARRIVAL — the scroll comet "hits" the details card and
     bursts into sparkles the first time it comes into view
  ============================================================ */
  function initDetailsArrival() {
    const details = document.getElementById('details');
    const comet = document.getElementById('scrollProgressComet');
    const card = document.querySelector('.detail-card');
    if (!details || !comet) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.disconnect();

        const rect = comet.getBoundingClientRect();
        comet.classList.add('comet-hit');
        burstStars(rect.left + rect.width / 2, rect.top + rect.height / 2, 30);
        setTimeout(() => comet.classList.remove('comet-hit'), 700);

        if (card) {
          card.classList.add('highlight');
          setTimeout(() => card.classList.remove('highlight'), 1700);
        }
      });
    }, { threshold: 0.35 });
    io.observe(details);
  }

  /* ============================================================
     CONSTELLATION DRAW-IN — story lines, rings, and the closing
     heart trace themselves stroke-by-stroke as each panel reveals
  ============================================================ */
  function initConstellationDraw() {
    const groups = [
      { selector: '.const-lines line', overrideDasharray: true, stagger: 140 },
      { selector: '.rings-svg .ring', overrideDasharray: true, stagger: 160 },
      { selector: '.heart-line', overrideDasharray: false, stagger: 0 },
    ];

    groups.forEach(({ selector, overrideDasharray, stagger }) => {
      document.querySelectorAll(selector).forEach((el, i) => {
        if (typeof el.getTotalLength !== 'function') return;
        const total = el.getTotalLength();
        if (overrideDasharray) el.style.strokeDasharray = String(total);
        el.style.strokeDashoffset = String(total);
        el.style.transition = `stroke-dashoffset 1.1s ease ${i * stagger}ms`;
      });
    });

    const drawSelector = '.const-lines line, .rings-svg .ring, .heart-line';
    const panels = document.querySelectorAll('[data-reveal]');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.querySelectorAll(drawSelector).forEach((el) => {
          el.style.strokeDashoffset = '0';
        });
        io.unobserve(entry.target);
      });
    }, { threshold: 0.25 });
    panels.forEach((p) => io.observe(p));
  }

  /* ============================================================
     STARDUST TRAIL — faint sparkles follow the pointer/finger
  ============================================================ */
  function initStardustTrail() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;
    let last = 0;
    const minInterval = 45;

    function spawn(x, y) {
      const el = document.createElement('div');
      el.className = 'stardust';
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      if (Math.random() < 0.35) el.style.background = 'var(--cream)';
      document.body.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
    }

    window.addEventListener('pointermove', (e) => {
      const now = performance.now();
      if (now - last < minInterval) return;
      last = now;
      spawn(e.clientX, e.clientY);
    }, { passive: true });
  }

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
      // safety net: requestAnimationFrame can stall under mobile
      // power-saving/background throttling, silently freezing the fade
      // partway -- setTimeout is far more reliable, so it guarantees the
      // target volume is reached even if the rAF loop never runs
      setTimeout(() => { el.volume = target; }, duration + 80);
    }

    function start() {
      el.volume = 0;
      const p = el.play();
      fadeTo(targetVolume, 500);
      if (p && typeof p.then === 'function') {
        p.catch((err) => {
          console.warn('Playback blocked, will retry on sound-toggle tap:', err);
          document.dispatchEvent(new CustomEvent('music-blocked'));
        });
      }
    }

    function mute() {
      // instant, not a fade: requestAnimationFrame (used by fadeTo) can stall
      // under mobile power-saving/background throttling, which left the
      // volume stuck mid-fade -- a real bug, not just a test-harness quirk
      cancelAnimationFrame(fadeRaf);
      el.volume = 0;
    }

    function unmute() {
      // if the initial autoplay attempt was blocked, this manual tap retries it
      if (el.paused) el.play().catch(() => {});
      cancelAnimationFrame(fadeRaf);
      el.volume = targetVolume;
    }

    return { start, mute, unmute };
  })();

  /* ============================================================
     SOUND PULSE — a simple looping CSS glow while music is playing.
     Deliberately NOT wired to the Web Audio API: routing the
     <audio> element through an AnalyserNode caused real playback
     failures on mobile Safari, so this is decorative-only and can
     never affect actual audio output.
  ============================================================ */
  function initSoundPulse() {
    const btn = document.getElementById('soundToggle');
    if (!btn) return { start() {}, stop() {} };
    return {
      start() { btn.classList.add('pulsing'); },
      stop() { btn.classList.remove('pulsing'); },
    };
  }

  /* ============================================================
     MIRACLE EASTER EGG — tapping the reveal text bursts sparkles
  ============================================================ */
  function initMiracleEasterEgg() {
    const title = document.querySelector('.miracle-title');
    if (!title) return;
    title.addEventListener('click', () => {
      const rect = title.getBoundingClientRect();
      burstStars(rect.left + rect.width / 2, rect.top + rect.height / 2);
      title.classList.remove('pop');
      void title.offsetWidth; // restart the animation if tapped again quickly
      title.classList.add('pop');
    });
  }

  /* ============================================================
     GATE — tap the moon to begin: a "flying into the sky" transition
  ============================================================ */
  const gate = document.getElementById('gate');
  const enterBtn = document.getElementById('enterBtn');
  const mainEl = document.getElementById('main');
  const soundToggle = document.getElementById('soundToggle');
  const flashOverlay = document.getElementById('flashOverlay');
  const SoundPulse = initSoundPulse();
  let muted = false;

  document.addEventListener('music-blocked', () => {
    soundToggle.classList.add('needs-tap');
  });

  enterBtn.addEventListener('click', () => {
    Music.start(); // call first, closest to the trusted click gesture
    SoundPulse.start(); // must also start within this same gesture, or it can silence playback
    if (navigator.vibrate) navigator.vibrate(15); // tiny haptic "click" on the launch
    enterBtn.classList.add('launching');
    flashOverlay.classList.add('flashing');

    setTimeout(() => {
      gate.classList.add('gate-hidden');
      mainEl.classList.remove('hidden');
      mainEl.classList.add('revealed');
      initRevealObserver();
      initConstellationDraw();
      scheduleShootingStars();
      initStardustTrail();
      initDetailsArrival();
      const progress = document.getElementById('scrollProgress');
      if (progress) progress.classList.add('visible');
    }, 550);
  }, { once: true });

  soundToggle.addEventListener('click', () => {
    soundToggle.classList.remove('needs-tap');
    muted = !muted;
    soundToggle.classList.toggle('muted', muted);
    soundToggle.setAttribute('aria-pressed', String(!muted));
    if (muted) {
      Music.mute();
      SoundPulse.stop();
    } else {
      Music.unmute();
      SoundPulse.start();
    }
    DebugPanel.log('sound-toggle tapped, muted=' + muted);
  });

  /* ============================================================
     DEBUG PANEL — visible only with ?debug=1 in the URL. Shows
     live <audio> state on-screen so issues can be diagnosed on a
     phone without remote dev tools.
  ============================================================ */
  const DebugPanel = (() => {
    const enabled = new URLSearchParams(location.search).has('debug');
    if (!enabled) return { log() {} };

    const el = document.createElement('div');
    el.id = 'debugPanel';
    el.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:999;' +
      'background:rgba(0,0,0,0.88);color:#0f0;font:11px/1.5 monospace;' +
      'padding:8px;max-height:35vh;overflow:auto;white-space:pre-wrap;' +
      'pointer-events:none;';
    document.body.appendChild(el);

    const audioEl = document.getElementById('bgMusic');
    const lines = [];

    function render() {
      const state = [
        'volume=' + audioEl.volume.toFixed(2),
        'paused=' + audioEl.paused,
        'muted(attr)=' + audioEl.muted,
        'readyState=' + audioEl.readyState,
        'networkState=' + audioEl.networkState,
        'currentSrc=' + audioEl.currentSrc,
        'error=' + (audioEl.error ? audioEl.error.code : 'none'),
      ].join(' | ');
      el.textContent = state + '\n---\n' + lines.slice(-12).join('\n');
    }

    function log(msg) {
      lines.push(new Date().toISOString().slice(11, 19) + ' ' + msg);
      render();
    }

    ['play', 'pause', 'volumechange', 'error', 'stalled', 'canplay', 'loadeddata']
      .forEach((evt) => audioEl.addEventListener(evt, () => log('audio event: ' + evt)));

    setInterval(render, 500);
    render();

    return { log };
  })();

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
      burstStars(e.clientX, e.clientY);
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
  initSkyParallax();
  initCountdown();
  initScrollProgress();
  initMiracleEasterEgg();
})();
