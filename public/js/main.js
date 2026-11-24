/* Wedding invitation template (Talvoco) — interactions */
(function () {
  'use strict';

  // ---- Settings -----------------------------------------------------------
  // demo values: replace per customer (couple, WhatsApp number, wedding date/time, label)
  var COUPLE = 'Annabel & Frederick';
  // WhatsApp number that receives RSVPs, digits only with country code (e.g. '447700900123').
  // Leave empty to let the guest pick the chat in WhatsApp themselves.
  var RSVP_WHATSAPP = '447700900123';
  // The moment the countdown counts down to (the wedding), Europe/London.
  var WEDDING_AT = new Date('2027-12-17T18:00:00+00:00');
  var WEDDING_LABEL = '17 December 2027';
  // DEMO TEMPLATE: both are empty, so an RSVP is never stored anywhere — the form
  // simply runs through to the thank-you. To collect real RSVPs, point these at your
  // own Supabase table (insert-only; read back on /dashboard with the passcode).
  var RSVP_API = '';
  var RSVP_KEY = '';
  // -------------------------------------------------------------------------

  var body = document.body;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= WELCOME / ENVELOPE ================= */
  var welcome = document.getElementById('welcome');
  var bowVideo = document.getElementById('bowVideo');
  var heroVideo = document.getElementById('heroVideo');
  // Timing (keep in sync with css): the flap and bottom take 3.1 s to clear (mostly gone by 2 s); bow.mp4
  // holds its first frame for 1.4 s, so the bow starts untying while the flaps clear (untie ~4 s).
  var ENVELOPE_MS = 3100;
  // Music: intro.mp3 plays from the first tap through the envelope and bow; as it ends
  // (1 s before the hero) music.mp3 starts from 0:00 and plays in full.
  var opened = false;

  function playQuietly(v) {
    try { var p = v.play(); if (p && p.catch) p.catch(function () {}); return p; } catch (_) { return null; }
  }

  function revealSite(fade) {
    if (opened) return;
    opened = true;
    if (heroVideo.paused) playQuietly(heroVideo);
    welcome.classList.add('is-gone');
    if (fade) welcome.classList.add('is-gone--fade');
    body.classList.remove('is-locked');
    body.classList.add('is-open');
    window.scrollTo(0, 0);
    syncMusicToHero();
    showMusicToggle();
    setTimeout(function () { welcome.remove(); }, fade ? 1100 : 300);
  }

  // the bow's last frame equals the hero's first: rewind the (already running) hero
  // video, and only swap once it is really showing frame 0 — the bow holds that same
  // frame meanwhile, so the swap is invisible
  function handover() {
    if (opened) return;
    var done = false;
    function go() { if (!done) { done = true; revealSite(false); } }
    heroVideo.addEventListener('seeked', function () { requestAnimationFrame(go); }, { once: true });
    try { heroVideo.currentTime = 0; } catch (_) { go(); }
    if (heroVideo.paused) playQuietly(heroVideo);
    setTimeout(go, 600);
  }

  var tapped = false;
  function openInvite() {
    if (tapped) return;          // only the first tap counts
    tapped = true;
    startMusic();                // inside the tap, so phones allow sound and video at once
    // start both videos now (the moment every phone allows it). The bow video's first
    // 1.4 s are a still, so it looks paused while the envelope opens.
    var bowP = playQuietly(bowVideo);
    playQuietly(heroVideo);      // keeps running hidden; rewound at the handover
    welcome.classList.add('is-unsealing');
    setTimeout(function () { welcome.classList.add('is-unsealed'); }, ENVELOPE_MS + 100);

    bowVideo.addEventListener('ended', handover, { once: true });
    // if this browser refuses to play the bow video, just fade to the site once the envelope is open
    if (bowP && bowP.catch) bowP.catch(function () { setTimeout(function () { revealSite(true); }, ENVELOPE_MS); });
    setTimeout(function () { revealSite(true); }, 14000); // never get stuck on a very slow connection
  }
  // a tap anywhere on the envelope screen opens it (and starts the music)
  welcome.addEventListener('pointerup', openInvite);
  welcome.addEventListener('click', openInvite);

  /* ================= BACKGROUND MUSIC ================= */
  var music = document.getElementById('bgMusic');
  var musicBtn = document.getElementById('musicToggle');
  var MUSIC_VOLUME = 0.6;
  var musicWanted = true;   // false once the guest pauses it
  var pausedByHide = false;

  function fadeVolume(to, ms) {
    // iPhone ignores volume changes and simply plays at device volume
    var from = music.volume, t0 = performance.now();
    (function step(now) {
      var k = Math.max(0, Math.min(1, (now - t0) / ms));
      try { music.volume = from + (to - from) * k; } catch (_) {}
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  function setMusicUI(playing) {
    musicBtn.classList.toggle('is-playing', playing);
    musicBtn.setAttribute('aria-pressed', String(playing));
    musicBtn.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
  }
  function seekMusic(t) {
    function go() { try { music.currentTime = t; } catch (_) {} }
    if (music.readyState >= 1) go(); else music.addEventListener('loadedmetadata', go, { once: true });
  }
  // keep the song locked to the hero video: lyrics at hero 0 s
  var intro = document.getElementById('introMusic');
  // Music: on the first tap the music starts from 0:00 and plays through the whole site.
  // intro.mp3 is the 2–5 s piece of the first music (fading out 4.5–5 s); it plays on top of the music
  // at that same moment (2 s after the tap).
  var INTRO_AT_MS = 2000;
  var musicStarted = false;
  function startMusic() {
    musicStarted = true;
    seekMusic(0);
    try { music.volume = MUSIC_VOLUME; } catch (_) {}
    var p = music.play();     // inside the tap, so phones allow it
    if (p && p.catch) p.catch(function () { setMusicUI(false); });
    // unlock the intro piece inside the tap, then play it 2 s later
    intro.muted = true;
    var q = intro.play();
    if (q && q.catch) q.catch(function () {});
    intro.pause();
    intro.muted = false;
    try { intro.currentTime = 0; intro.volume = MUSIC_VOLUME; } catch (_) {}
    setTimeout(function () { var r = intro.play(); if (r && r.catch) r.catch(function () {}); }, INTRO_AT_MS);
  }
  // at the hero: just make sure the music is playing
  function syncMusicToHero() {
    if (music.paused && musicWanted) { var p = music.play(); if (p && p.catch) p.catch(function () {}); }
  }
  function showMusicToggle() {
    musicBtn.hidden = false;
    requestAnimationFrame(function () { musicBtn.classList.add('is-shown'); });
  }
  music.addEventListener('play', function () { setMusicUI(true); });
  music.addEventListener('pause', function () { setMusicUI(false); });
  musicBtn.addEventListener('click', function () {
    if (music.paused) {
      musicWanted = true;
      var p = music.play();
      if (p && p.then) p.then(function () { fadeVolume(MUSIC_VOLUME, 800); }).catch(function () {});
    } else {
      musicWanted = false;
      music.pause();
    }
  });
  // pause when the guest leaves the tab or locks the phone; resume when they return
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (!intro.paused) intro.pause();
      if (!music.paused) { pausedByHide = true; music.pause(); }
    } else if (pausedByHide && musicWanted) {
      pausedByHide = false;
      var p = music.play();
      if (p && p.catch) p.catch(function () {});
    }
  });

  /* ================= FLOATING PEARLS ================= */
  if (!reduceMotion) {
    var layer = document.querySelector('.pearls');
    for (var i = 0; i < 14; i++) {
      var d = document.createElement('i');
      var size = 4 + Math.random() * 7;
      d.style.width = d.style.height = size + 'px';
      d.style.left = Math.random() * 100 + '%';
      d.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
      d.style.animationDuration = 16 + Math.random() * 18 + 's';
      d.style.animationDelay = -Math.random() * 30 + 's';
      layer.appendChild(d);
    }
  }

  /* ================= SCROLL REVEAL ================= */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal-up').forEach(function (el) { io.observe(el); });

  /* ================= SCRATCH REVEAL ================= */
  (function scratchCard() {
    var wrap = document.getElementById('scratch');
    var canvas = document.getElementById('scratchCanvas');
    var hint = document.getElementById('scratchHint');
    var caption = document.getElementById('scratchCaption');
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    var img = new Image();
    // oval in reveal-bg.jpg (941×1400), as fractions of its width / height
    var OV = { cx: 469 / 941, cy: 728.5 / 1400, rx: 169 / 941, ry: 246.5 / 1400 };
    var dpr = 1, W = 0, H = 0, done = false, strokes = 0, last = null;

    var pad = document.createElement('div');
    pad.className = 'scratch__pad';
    wrap.appendChild(pad);

    function ellipsePath() {
      ctx.beginPath();
      ctx.ellipse(OV.cx * W, OV.cy * H, OV.rx * W, OV.ry * H, 0, 0, Math.PI * 2);
    }

    function paint() {
      if (!img.complete || !img.naturalWidth) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = wrap.getBoundingClientRect();
      W = canvas.width = Math.round(r.width * dpr);
      H = canvas.height = Math.round(r.height * dpr);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(img, 0, 0, W, H);
      if (done) { ctx.save(); ellipsePath(); ctx.clip(); ctx.clearRect(0, 0, W, H); ctx.restore(); }
    }

    function scratchTo(x, y) {
      var brush = Math.max(18, W * 0.055);
      ctx.save();
      ellipsePath(); ctx.clip();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineCap = ctx.lineJoin = 'round';
      ctx.lineWidth = brush * 2;
      ctx.beginPath();
      if (last) { ctx.moveTo(last.x, last.y); ctx.lineTo(x, y); ctx.stroke(); }
      ctx.arc(x, y, brush, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      last = { x: x, y: y };
    }

    function clearedRatio() {
      var x0 = Math.floor((OV.cx - OV.rx) * W), y0 = Math.floor((OV.cy - OV.ry) * H);
      var w = Math.ceil(OV.rx * 2 * W), h = Math.ceil(OV.ry * 2 * H);
      var data = ctx.getImageData(x0, y0, w, h).data;
      var step = Math.max(4, Math.round(6 * dpr)), total = 0, clear = 0;
      for (var y = 0; y < h; y += step) {
        for (var x = 0; x < w; x += step) {
          var nx = (x - w / 2) / (w / 2), ny = (y - h / 2) / (h / 2);
          if (nx * nx + ny * ny > 1) continue;
          total++;
          if (data[(y * w + x) * 4 + 3] < 128) clear++;
        }
      }
      return total ? clear / total : 0;
    }

    function finish() {
      if (done) return;
      done = true;
      wrap.classList.add('is-done');
      var cx = OV.cx * W, cy = OV.cy * H, maxR = OV.ry * H * 1.1, t0 = performance.now();
      (function grow(t) {
        var k = Math.max(0, Math.min(1, (t - t0) / 700));
        ctx.save(); ellipsePath(); ctx.clip();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath(); ctx.arc(cx, cy, maxR * (1 - Math.pow(1 - k, 3)), 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        if (k < 1) requestAnimationFrame(grow);
      })(t0);
      caption.classList.add('show');
      sparkle();
    }

    // glitter blast: two bursts of gold, rose-gold and pearl flakes and twinkling stars
    // shoot out of the oval and drift down over the section (~3 s, frame-rate independent)
    function sparkle() {
      if (reduceMotion) return;
      var fx = document.createElement('canvas');
      fx.className = 'glitter';
      wrap.appendChild(fx);
      var r = wrap.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
      var W = fx.width = Math.round(r.width * d), H = fx.height = Math.round(r.height * d);
      var g = fx.getContext('2d');
      var cols = ['#c9962b', '#e2b84f', '#f4d27a', '#b07d2a', '#d9a441', '#e7a6b6', '#c97f94', '#fff3d6', '#ffffff'];
      var ox = OV.cx * W, oy = OV.cy * H, P = [], u = W / 390;   // u = 1 css px at phone width
      function burst(n, power) {
        for (var i = 0; i < n; i++) {
          var a = Math.random() * Math.PI * 2, sp = (180 + Math.random() * 520) * power * u;
          P.push({
            x: ox + Math.cos(a) * OV.rx * W * .7 * Math.random(), y: oy + Math.sin(a) * OV.ry * H * .7 * Math.random(),
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (160 + Math.random() * 260) * u,
            w: (3 + Math.random() * 6) * u, h: (1.5 + Math.random() * 3) * u,
            rot: Math.random() * 6.28, vr: (Math.random() - .5) * 12,
            c: cols[(Math.random() * cols.length) | 0], star: Math.random() < .22,
            life: 2.2 + Math.random() * 1.4, age: 0, tw: Math.random() * 6.28, tws: 8 + Math.random() * 10
          });
        }
      }
      burst(260, 1);
      setTimeout(function () { burst(160, .7); }, 220);
      function star(x, y, R) {
        g.beginPath();
        for (var k = 0; k < 8; k++) { var rr = k % 2 ? R * .32 : R, an = k * Math.PI / 4; g.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
        g.closePath(); g.fill();
      }
      var last = performance.now(), start = last;
      (function frame(now) {
        var dt = Math.min(.05, (now - last) / 1000); last = now;
        g.clearRect(0, 0, W, H);
        var alive = 0;
        for (var i = 0; i < P.length; i++) {
          var p = P[i]; p.age += dt; if (p.age >= p.life) continue; alive++;
          p.vy += 520 * u * dt; var drag = Math.pow(.18, dt); p.vx *= drag; p.vy *= drag;
          p.vy = Math.min(p.vy, 260 * u);
          p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.tw += p.tws * dt;
          var fade = Math.min(1, (p.life - p.age) / .8);
          g.globalAlpha = fade * (.7 + .3 * Math.sin(p.tw));
          g.fillStyle = p.c;
          g.shadowColor = 'rgba(120, 80, 20, .35)'; g.shadowBlur = 2 * u;
          if (p.star) star(p.x, p.y, p.w * 1.3);
          else { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.scale(1, Math.abs(Math.cos(p.tw * .5)) + .2); g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore(); }
        }
        if ((alive || now - start < 400) && now - start < 5000) requestAnimationFrame(frame); else fx.remove();
      })(last);
    }

    function pos(e) {
      var r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr };
    }
    var down = false;
    pad.addEventListener('pointerdown', function (e) {
      if (done) return;
      down = true; last = null;
      pad.setPointerCapture(e.pointerId);
      wrap.classList.add('is-scratching');
      var p = pos(e); scratchTo(p.x, p.y);
    });
    pad.addEventListener('pointermove', function (e) {
      if (!down || done) return;
      var p = pos(e); scratchTo(p.x, p.y);
      if (++strokes % 12 === 0 && clearedRatio() > 0.5) finish();
    });
    function up() {
      if (!down) return;
      down = false; last = null;
      if (!done && clearedRatio() > 0.45) finish();
    }
    pad.addEventListener('pointerup', up);
    pad.addEventListener('pointercancel', up);

    img.onload = paint;
    img.src = 'assets/reveal-bg.jpg';
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      // resizing redraws the cover; keep any reveal that was already completed
      rt = setTimeout(function () { var w = wrap.getBoundingClientRect().width * Math.min(window.devicePixelRatio || 1, 2); if (Math.abs(w - W) > 2) paint(); }, 200);
    });
  })();

  /* ================= SWIPEABLE MAPS ================= */
  (function maps() {
    var track = document.getElementById('maps'); if (!track) return;
    var tabs = document.querySelectorAll('.map-tabs__btn'), dots = document.querySelectorAll('.map-dots i');
    function setActive(i) {
      tabs.forEach(function (t, k) { t.classList.toggle('is-active', k === i); t.setAttribute('aria-selected', String(k === i)); });
      dots.forEach(function (d, k) { d.classList.toggle('is-active', k === i); });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { track.scrollTo({ left: track.children[i].offsetLeft - track.offsetLeft, behavior: 'smooth' }); setActive(i); });
    });
    var raf;
    track.addEventListener('scroll', function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () { setActive(Math.round(track.scrollLeft / track.clientWidth)); });
    }, { passive: true });
  })();

  /* ================= COUNTDOWN ================= */
  (function countdown() {
    var els = {
      d: document.getElementById('cdDays'), h: document.getElementById('cdHours'),
      m: document.getElementById('cdMins'), s: document.getElementById('cdSecs')
    };
    var note = document.getElementById('cdNote');
    function pad2(n) { return n < 10 ? '0' + n : '' + n; }
    function tick() {
      var diff = WEDDING_AT - Date.now();
      if (diff <= 0) {
        els.d.textContent = els.h.textContent = els.m.textContent = els.s.textContent = '00';
        note.textContent = 'The big day is here';
        return;
      }
      var s = Math.floor(diff / 1000);
      els.d.textContent = pad2(Math.floor(s / 86400));
      els.h.textContent = pad2(Math.floor(s % 86400 / 3600));
      els.m.textContent = pad2(Math.floor(s % 3600 / 60));
      els.s.textContent = pad2(s % 60);
      setTimeout(tick, 1000 - (Date.now() % 1000));
    }
    tick();
  })();

  /* ================= RSVP ================= */
  (function rsvp() {
    var form = document.getElementById('rsvpForm');
    var err = document.getElementById('rsvpError');
    var thanks = document.getElementById('rsvpThanks');
    var thanksMsg = document.getElementById('rsvpThanksMsg');
    var guestsField = document.getElementById('guestsField');

    form.addEventListener('change', function () {
      guestsField.hidden = form.attending.value !== 'yes';
    });

    var sendBtn = form.querySelector('.rsvp__btn');
    var waLink = document.getElementById('rsvpWhatsApp');

    // With RSVP_API empty (the demo template) nothing leaves the browser; the form
    // waits a beat and then shows the thank-you, exactly as the live version does.
    function send(payload) {
      if (!RSVP_API) return new Promise(function (ok) { setTimeout(ok, 600); });
      return fetch(RSVP_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: RSVP_KEY, Authorization: 'Bearer ' + RSVP_KEY, Prefer: 'return=minimal' },
        body: JSON.stringify(payload)
      }).then(function (res) {
        if (!res.ok) throw new Error('status ' + res.status);
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sendBtn.disabled) return;
      var name = form.name.value.trim();
      if (!name) { err.textContent = 'Please share your name.'; form.name.focus(); return; }
      if (!form.attending.value) { err.textContent = 'Please let us know if you will attend.'; return; }
      if (form.attending.value === 'yes' && !form.guests.value) { err.textContent = 'Please select the number of guests.'; form.guests.focus(); return; }
      err.textContent = '';
      var yes = form.attending.value === 'yes';
      var guests = yes ? parseInt(form.guests.value, 10) || 1 : null;
      var msg = form.message.value.trim();
      var text = 'RSVP for ' + COUPLE + "'s wedding (" + WEDDING_LABEL + ')\n' +
        'Name: ' + name + '\n' +
        'Attending: ' + (yes ? 'Yes, joyfully' : 'Regretfully, no') + '\n' +
        (yes ? 'Guests: ' + form.guests.value + '\n' : '') +
        (msg ? 'Message: ' + msg : '');

      sendBtn.disabled = true;
      var label = sendBtn.textContent;
      sendBtn.textContent = 'Sending…';
      send({ guest_name: name.slice(0, 120), attending: yes, guest_count: guests, message: msg.slice(0, 1000) || null })
      .then(function () {
        try { localStorage.setItem('rsvp-talvoco-demo', JSON.stringify({ name: name, yes: yes, at: Date.now() })); } catch (_) {}
        waLink.href = 'https://wa.me/' + RSVP_WHATSAPP + '?text=' + encodeURIComponent(text);
        thanksMsg.textContent = yes
          ? 'We look forward to celebrating with you, ' + name + '.'
          : 'You will be missed, ' + name + ' — please keep us in your thoughts.';
        form.hidden = true;
        thanks.hidden = false;
      }).catch(function () {
        err.textContent = 'Sorry, that didn’t send. Please check your connection and try again.';
        sendBtn.disabled = false;
        sendBtn.textContent = label;
      });
    });
  })();
})();
