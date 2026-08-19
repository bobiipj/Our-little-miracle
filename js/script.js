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
     GENERATIVE MUSIC — an original little "fairy song", no audio files
     Bell/celesta tones in a bright Lydian mode, arranged as a light,
     twinkling arpeggio — evokes a fairy-tale music box, not a lullaby.
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

    // Lydian mode (raised 4th) gives that bright, floating "fairy-tale" colour.
    // Each entry: [semitone offset from base, beat length]
    const base = 261.63; // C4
    const melody = [
      [0, 0.5], [4, 0.5], [7, 0.5], [11, 0.5], [12, 1],
      [11, 0.5], [9, 0.5], [7, 0.5], [4, 0.5], [2, 1],
      [4, 0.5], [7, 0.5], [9, 0.5], [12, 0.5], [16, 1.5],
      [12, 0.5], [9, 0.5], [7, 0.5], [4, 0.5], [0, 1.5],
    ];
    const beatDur = 0.36;

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
      // bell / celesta timbre: fast attack, bright shimmer overtone, quick decay
      const osc = actx.createOscillator();
      const shimmer = actx.createOscillator();
      const g = actx.createGain();
      const shimmerGain = actx.createGain();
      osc.type = 'sine';
      shimmer.type = 'sine';
      osc.frequency.value = freq;
      shimmer.frequency.value = freq * 2.01; // slightly detuned octave = sparkle

      g.gain.setValueAtTime(0, time);
      g.gain.linearRampToValueAtTime(0.24 * gainScale, time + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.9);

      shimmerGain.gain.setValueAtTime(0, time);
      shimmerGain.gain.linearRampToValueAtTime(0.07 * gainScale, time + 0.006);
      shimmerGain.gain.exponentialRampToValueAtTime(0.0001, time + dur * 0.5);

      osc.connect(g);
      shimmer.connect(shimmerGain);
      g.connect(masterGain);
      shimmerGain.connect(masterGain);

      osc.start(time);
      shimmer.start(time);
      osc.stop(time + dur);
      shimmer.stop(time + dur);
    }

    function startPad() {
      // airy Lydian triad, very soft — background shimmer, not a lullaby drone
      const chordFreqs = [base / 2, base * Math.pow(2, 4 / 12) / 2, base * Math.pow(2, 11 / 12) / 2];
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
      padGain.gain.linearRampToValueAtTime(0.035, actx.currentTime + 3);
    }

    function scheduler() {
      const lookahead = 0.2;
      while (nextNoteTime < actx.currentTime + lookahead) {
        const [step, beats] = melody[noteIndex % melody.length];
        const octaveShift = Math.floor(noteIndex / melody.length) % 2 === 1 ? 12 : 0;
        const freq = freqFromStep(step + octaveShift);
        const dur = beats * beatDur;
        playNote(freq, nextNoteTime, dur);

        // frequent fairy-dust sparkle harmonic, higher up
        if (Math.random() < 0.4) {
          playNote(freq * 4, nextNoteTime + dur * 0.3, dur * 0.4, 0.22);
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
