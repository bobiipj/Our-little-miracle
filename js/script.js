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
     GENERATIVE MUSIC — soft music-box lullaby, no audio files
  ============================================================ */
  const Music = (() => {
    let actx = null;
    let masterGain = null;
    let padGain = null;
    let playing = false;
    let nextNoteTime = 0;
    let noteIndex = 0;
    let schedulerId = null;
    let padOsc = [];

    // A gentle pentatonic melody (Db major pentatonic-ish), original composition.
    // Each entry: [semitone offset from base, beat length]
    const base = 261.63; // C4
    const scaleSteps = [0, 2, 4, 7, 9, 12, 14, 16]; // major pentatonic across 2 octaves
    const melody = [
      [4, 1], [7, 1], [9, 2], [7, 1], [4, 1],
      [2, 2], [0, 1], [4, 1], [7, 2],
      [9, 1], [12, 1], [9, 2], [7, 1], [4, 1],
      [2, 1], [0, 2], [4, 2],
    ];
    const beatDur = 0.62;

    function freqFromStep(step) {
      return base * Math.pow(2, step / 12);
    }

    function ensureContext() {
      if (!actx) {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = actx.createGain();
        masterGain.gain.value = 0;

        const delay = actx.createDelay();
        delay.delayTime.value = 0.34;
        const feedback = actx.createGain();
        feedback.gain.value = 0.28;
        const delayFilter = actx.createBiquadFilter();
        delayFilter.type = 'lowpass';
        delayFilter.frequency.value = 2200;

        masterGain.connect(delay);
        delay.connect(delayFilter);
        delayFilter.connect(feedback);
        feedback.connect(delay);

        masterGain.connect(actx.destination);
        delay.connect(actx.destination);
      }
    }

    function playNote(freq, time, dur, gainScale = 1) {
      const osc = actx.createOscillator();
      const sub = actx.createOscillator();
      const g = actx.createGain();
      osc.type = 'triangle';
      sub.type = 'sine';
      osc.frequency.value = freq;
      sub.frequency.value = freq / 2;

      g.gain.setValueAtTime(0, time);
      g.gain.linearRampToValueAtTime(0.22 * gainScale, time + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.95);

      osc.connect(g);
      sub.connect(g);
      g.connect(masterGain);

      osc.start(time);
      sub.start(time);
      osc.stop(time + dur);
      sub.stop(time + dur);
    }

    function startPad() {
      const chordFreqs = [base / 2, base * Math.pow(2, 4 / 12) / 2, base * Math.pow(2, 7 / 12) / 2];
      padGain = actx.createGain();
      padGain.gain.value = 0;
      padGain.connect(masterGain);
      padOsc = chordFreqs.map((f) => {
        const o = actx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        o.connect(padGain);
        o.start();
        return o;
      });
      padGain.gain.linearRampToValueAtTime(0.05, actx.currentTime + 3);
    }

    function scheduler() {
      const lookahead = 0.2;
      while (nextNoteTime < actx.currentTime + lookahead) {
        const [step, beats] = melody[noteIndex % melody.length];
        const octaveShift = Math.floor(noteIndex / melody.length) % 2 === 1 ? 12 : 0;
        const freq = freqFromStep(step + octaveShift);
        const dur = beats * beatDur;
        playNote(freq, nextNoteTime, dur);

        // occasional high twinkle harmonic
        if (Math.random() < 0.22) {
          playNote(freq * 2, nextNoteTime + dur * 0.4, dur * 0.6, 0.35);
        }

        nextNoteTime += dur;
        noteIndex++;
      }
      schedulerId = setTimeout(scheduler, 120);
    }

    function start() {
      ensureContext();
      if (actx.state === 'suspended') actx.resume();
      if (playing) return;
      playing = true;
      nextNoteTime = actx.currentTime + 0.1;
      startPad();
      scheduler();
      masterGain.gain.cancelScheduledValues(actx.currentTime);
      masterGain.gain.setValueAtTime(masterGain.gain.value, actx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.55, actx.currentTime + 2.2);
    }

    function mute() {
      if (!actx) return;
      masterGain.gain.cancelScheduledValues(actx.currentTime);
      masterGain.gain.setValueAtTime(masterGain.gain.value, actx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0, actx.currentTime + 0.8);
    }

    function unmute() {
      if (!actx) return;
      masterGain.gain.cancelScheduledValues(actx.currentTime);
      masterGain.gain.setValueAtTime(masterGain.gain.value, actx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.55, actx.currentTime + 0.8);
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
