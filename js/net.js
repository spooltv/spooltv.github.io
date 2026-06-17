/* ============================================================
   spool.tv — hero "live network / feed" background.
   Dependency-free vanilla canvas particle network.

   Adapted & reworked from liamfiddler/canvas-particle-network (MIT)
   https://github.com/liamfiddler/canvas-particle-network
   Changes: theme-aware colors via CSS custom props, prefers-reduced-motion
   (renders one static frame), DPR cap, visibility pause, gentle mouse pull.
   ============================================================ */
(function () {
  var canvas = document.getElementById('net');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var W = 0, H = 0, DPR = 1;
  var particles = [];
  var maxDist = 150;
  var dot = '47,107,255', line = '18,181,214', baseAlpha = 0.55;
  var mouse = { x: -9999, y: -9999, active: false };
  var raf = null, running = false;

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    dot = (cs.getPropertyValue('--net-dot') || '47,107,255').trim();
    line = (cs.getPropertyValue('--net-line') || '18,181,214').trim();
    var a = parseFloat(cs.getPropertyValue('--net-alpha'));
    baseAlpha = isNaN(a) ? 0.55 : a;
  }

  function count() {
    // density scales with area; capped for performance
    var n = Math.round((W * H) / 16000);
    return Math.max(24, Math.min(window.innerWidth < 700 ? 38 : 92, n));
  }

  function seed() {
    particles = [];
    var n = count();
    for (var i = 0; i < n; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5
      });
    }
  }

  function resize() {
    var r = canvas.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seed();
  }

  function frame(animate) {
    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      if (animate) {
        // gentle pull toward the cursor for a "live signal" feel
        if (mouse.active) {
          var mdx = mouse.x - p.x, mdy = mouse.y - p.y;
          var md = Math.sqrt(mdx * mdx + mdy * mdy);
          if (md < 150 && md > 0) { p.vx += (mdx / md) * 0.012; p.vy += (mdy / md) * 0.012; }
        }
        p.x += p.vx; p.y += p.vy;
        // friction + soft speed cap
        p.vx *= 0.995; p.vy *= 0.995;
        var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (sp > 0.9) { p.vx *= 0.9 / sp; p.vy *= 0.9 / sp; }
        if (sp < 0.06) { p.vx += (Math.random() - 0.5) * 0.05; p.vy += (Math.random() - 0.5) * 0.05; }
        // wrap edges
        if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20; else if (p.y > H + 20) p.y = -20;
      }
    }

    // links
    for (var a = 0; a < particles.length; a++) {
      for (var b = a + 1; b < particles.length; b++) {
        var dx = particles[a].x - particles[b].x;
        var dy = particles[a].y - particles[b].y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < maxDist) {
          ctx.strokeStyle = 'rgba(' + line + ',' + (1 - d / maxDist) * baseAlpha * 0.7 + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(particles[a].x, particles[a].y);
          ctx.lineTo(particles[b].x, particles[b].y);
          ctx.stroke();
        }
      }
    }
    // dots
    ctx.fillStyle = 'rgba(' + dot + ',' + baseAlpha + ')';
    for (var k = 0; k < particles.length; k++) {
      ctx.beginPath();
      ctx.arc(particles[k].x, particles[k].y, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop() { frame(true); raf = requestAnimationFrame(loop); }

  function start() {
    if (running) return;
    running = true;
    if (reduce.matches) { frame(false); running = false; return; } // single static frame
    loop();
  }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  // interactions
  window.addEventListener('resize', function () { resize(); if (reduce.matches) frame(false); }, { passive: true });
  window.addEventListener('mousemove', function (e) {
    var r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = true;
  }, { passive: true });
  window.addEventListener('mouseout', function () { mouse.active = false; mouse.x = mouse.y = -9999; });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
  // re-read colors when the theme flips
  new MutationObserver(function () { readColors(); if (reduce.matches) frame(false); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  reduce.addEventListener('change', function () { stop(); start(); });

  readColors();
  resize();
  start();
})();
