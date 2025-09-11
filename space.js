// Immersive 3D starfield background
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  // Create canvas once and attach
  const canvas = document.createElement('canvas');
  canvas.id = 'space-bg';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let w = 0, h = 0, cx = 0, cy = 0, focal = 400;
  let stars = [];
  let mouseX = 0, mouseY = 0;
  let speed = reduce ? 0.2 : 0.8; // forward motion
  let tilt = 0.0025; // subtle orbit tilt

  function resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    canvas.style.width = vw + 'px';
    canvas.style.height = vh + 'px';
    canvas.width = Math.floor(vw * DPR);
    canvas.height = Math.floor(vh * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    w = vw; h = vh; cx = w / 2; cy = h / 2;
    focal = Math.max(300, Math.min(700, Math.hypot(w, h) * 0.35));
    initStars();
  }

  function initStars() {
    const density = reduce ? 200 : Math.floor((w * h) / 2500); // adaptive density
    stars = new Array(density).fill(0).map(() => newStar());
  }

  function newStar() {
    // Space in camera coordinates
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * Math.max(w, h);
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      z: Math.random() * 1000 + 50,
      px: 0, py: 0
    };
  }

  window.addEventListener('mousemove', (e) => {
    // Parallax target from -1..1
    mouseX = (e.clientX / w) * 2 - 1;
    mouseY = (e.clientY / h) * 2 - 1;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    const t = e.touches[0]; if (!t) return;
    mouseX = (t.clientX / w) * 2 - 1;
    mouseY = (t.clientY / h) * 2 - 1;
  }, { passive: true });

  function project(s) {
    // Apply slight camera pan from mouse
    const panX = mouseX * 120;
    const panY = mouseY * 120;

    const z = s.z;
    const sx = (s.x / z) * focal + cx + panX;
    const sy = (s.y / z) * focal + cy + panY;
    const size = Math.max(0.6, (focal / z) * 1.8);
    return { sx, sy, size };
  }

  let t = 0;
  function step() {
    // Paint space background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#050913';
    ctx.fillRect(0, 0, w, h);

    // Subtle nebula glow tuned to Carolina palette
    const grad = ctx.createRadialGradient(cx + 0.2*w, cy - 0.3*h, 20, cx, cy, Math.hypot(w, h));
    grad.addColorStop(0, 'rgba(19,41,75,0.35)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

    t += tilt;
    const dt = reduce ? 0.4 : 1.0;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.z -= speed * dt;
      if (s.z < 1) { stars[i] = newStar(); continue; }
      // orbit tilt
      const ox = s.x, oy = s.y;
      s.x = ox * Math.cos(tilt) - oy * Math.sin(tilt);
      s.y = ox * Math.sin(tilt) + oy * Math.cos(tilt);

      const { sx, sy, size } = project(s);
      if (sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) { stars[i] = newStar(); continue; }

      // trail from previous projected position for streak effect
      if (s.px && s.py) {
        ctx.strokeStyle = 'rgba(75,156,211,0.35)';
        ctx.lineWidth = Math.max(0.5, size * 0.12);
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(s.px, s.py); ctx.stroke();
      }

      ctx.fillStyle = '#e4f3ff';
      ctx.shadowBlur = 12; ctx.shadowColor = '#7BAFD4';
      ctx.beginPath(); ctx.arc(sx, sy, size * 0.5, 0, Math.PI * 2); ctx.fill();

      s.px = sx; s.py = sy;
    }
    ctx.restore();

    rafId = requestAnimationFrame(step);
  }

  let rafId;
  function start(){ if (!reduce) rafId = requestAnimationFrame(step); else step(); }
  function stop(){ if (rafId) cancelAnimationFrame(rafId); }

  window.addEventListener('resize', resize);
  window.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });

  resize();
  start();
})();
