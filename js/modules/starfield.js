
import { isMobile } from '../utils.js';

// ─── Tuning ───────────────────────────────────────────────────────────────────
const CONFIG = {
  count        : 500,   // number of stars
  spread       : 350,   // half-extent of the 3D cube (px equivalent)
  focal        : 480,   // perspective focal length — higher = flatter/less warp

  // Scroll rotation (Y axis — pans the field left/right as you scroll down)
  scrollRotSpeed : 0.00055,  // radians added per pixel of scroll
  scrollEase     : 0.055,    // how smoothly rotation catches up to scroll

  // Slow automatic Y rotation so the field never looks static
  autoRotY       : 0.00014,

  // Cursor lean — mouse position nudges Y and X rotation slightly
  cursorLeanY    : 0.00018,  // per pixel from centre, Y axis
  cursorLeanX    : 0.00010,  // per pixel from centre, X axis

  // Cursor repel (works in 2D screen-space — cheaper & feels right)
  repelDist      : 110,
  repelForce     : 7,

  // Visuals
  minSize  : 0.8,   // radius of a far star (px)
  maxSize  : 3.2,   // radius of a near star (px)
  minAlpha : 0.24,
  maxAlpha : 1,
  lineDistSq : 140 * 140,   // squared 2D screen distance for connection lines
  maxLineLinksPerStar: 5,    // cap link checks to avoid O(n²) spikes

  colorDark  : '167, 139, 250',
  colorLight : '124, 58, 237',
};
// ─────────────────────────────────────────────────────────────────────────────

class Starfield {
  constructor() {
    this.canvas  = null;
    this.ctx     = null;
    this.W = 0;  this.H = 0;
    this.stars   = [];

    // Current rotation state
    this.rotX       = 0;   // cursor lean
    this.rotY       = 0;   // driven by scroll
    this.targetRotY = 0;
    this.autoY      = 0;   // accumulates every frame

    // Input
    this.scrollY = 0;
    this.mouseX  = -99999;
    this.mouseY  = -99999;
    this.isLight = false;

    this.rafId = null;
    this.initialized = false;
  }

  // ── Public ────────────────────────────────────────────────────────────────

  init() {
    if (this.initialized) return;
    if (isMobile()) { console.log('Starfield3D: off on mobile'); return; }

    this._buildCanvas();
    this._spawnStars();
    this._listen();
    this._loop();

    this.initialized = true;
    console.log('✅ Starfield 3D initialized');
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.canvas?.parentNode?.removeChild(this.canvas);
    this.initialized = false;
  }

  // ── Setup ─────────────────────────────────────────────────────────────────

  _buildCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'starfield-canvas';
    document.body.insertBefore(this.canvas, document.body.firstChild);
    this.ctx = this.canvas.getContext('2d');
    this._resize();
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width  = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = w;
    this.H = h;
  }

  /**
   * Each star is placed randomly in a 3D cube centred at the origin.
   * ox/oy/oz are its permanent home coordinates. Every frame the
   * rotation matrices are applied to those originals so there is
   * no drift or floating-point accumulation.
   */
  _spawnStars() {
    const { count, spread } = CONFIG;
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        ox: (Math.random() - 0.5) * spread * 2,
        oy: (Math.random() - 0.5) * spread * 2,
        oz: (Math.random() - 0.5) * spread * 2,
        // screen-space output — filled each frame by _project()
        sx: 0, sy: 0,
        // perspective scale factor (larger = closer to viewer)
        sc: 0,
        // small 2D velocity for cursor repel springback
        vx: 0, vy: 0,
        // tiny per-star twinkle phase
        twinkle     : Math.random() * Math.PI * 2,
        twinkleSpeed: 0.008 + Math.random() * 0.012,
      });
    }
  }

  // ── Events ────────────────────────────────────────────────────────────────

  _listen() {
    document.addEventListener('mousemove', e => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });
    document.addEventListener('mouseleave', () => {
      this.mouseX = -99999;
      this.mouseY = -99999;
    });
    window.addEventListener('scroll', () => {
      this.scrollY    = window.scrollY;
      this.targetRotY = this.scrollY * CONFIG.scrollRotSpeed;
    }, { passive: true });
    window.addEventListener('resize', () => this._resize());

    // Theme watcher
    const mo = new MutationObserver(() => {
      this.isLight = document.documentElement.getAttribute('data-theme') === 'light';
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    this.isLight = document.documentElement.getAttribute('data-theme') === 'light';
  }

  // ── Main loop ─────────────────────────────────────────────────────────────

  _loop() {
    this._update();
    this._draw();
    this.rafId = requestAnimationFrame(() => this._loop());
  }

  _update() {
    // ── Rotation angles ─────────────────────────────────────────────────────

    // Y: ease toward scroll-driven target
    this.rotY += (this.targetRotY - this.rotY) * CONFIG.scrollEase;

    // Auto-spin + cursor lean
    this.autoY += CONFIG.autoRotY;
    const leanY = ((this.mouseX - this.W / 2) / (this.W / 2)) * CONFIG.cursorLeanY * 80;
    const leanX = ((this.mouseY - this.H / 2) / (this.H / 2)) * CONFIG.cursorLeanX * 60;
    const finalRotY = this.rotY + this.autoY + leanY;
    const finalRotX = this.rotX + leanX;

    // Precompute trig — same for every star this frame
    const cosX = Math.cos(finalRotX), sinX = Math.sin(finalRotX);
    const cosY = Math.cos(finalRotY),  sinY = Math.sin(finalRotY);
    const { focal } = CONFIG;

    // ── Project every star into screen space ─────────────────────────────────
    this.stars.forEach(s => {
      // Rotate around X axis (cursor lean)
      const y1 =  s.oy * cosX - s.oz * sinX;
      const z1 =  s.oy * sinX + s.oz * cosX;

      // Rotate around Y axis (auto-spin + cursor lean)
      const x2 =  s.ox * cosY + z1 * sinY;
      const z2 = -s.ox * sinY + z1 * cosY;

      // Perspective — skip stars behind the camera
      const zOff = focal + z2;
      if (zOff <= 0) { s.sc = 0; return; }

      const sc = focal / zOff;
      s.sc = sc;

      // Apply repel velocity on top of the projected position
      s.sx = x2 * sc + this.W / 2 + s.vx;
      s.sy = y1 * sc + this.H / 2 + s.vy;

      // Twinkle
      s.twinkle += s.twinkleSpeed;

      // ── Cursor repel (2D screen-space) ───────────────────────────────────
      const dx   = s.sx - this.mouseX;
      const dy   = s.sy - this.mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CONFIG.repelDist && dist > 0) {
        const f = (1 - dist / CONFIG.repelDist) * CONFIG.repelForce;
        s.vx += (dx / dist) * f;
        s.vy += (dy / dist) * f;
      }

      // Spring back & dampen
      s.vx *= 0.85;
      s.vy *= 0.85;
    });
  }

  _draw() {
    const { ctx, W, H } = this;
    ctx.clearRect(0, 0, W, H);

    const color = this.isLight ? CONFIG.colorLight : CONFIG.colorDark;

    // Only render stars that are in front of the camera and on/near screen
    const visible = this.stars.filter(s =>
      s.sc > 0 &&
      s.sx > -80 && s.sx < W + 80 &&
      s.sy > -80 && s.sy < H + 80
    );

    // Sort far → near so closer stars paint over farther ones
    visible.sort((a, b) => a.sc - b.sc);

    // ── Map perspective scale to normalised 0-1 depth value ─────────────────
    //    sc ranges roughly from (focal/(focal+spread)) to (focal/(focal-spread))
    //    We clamp to a safe range and normalise.
    const scMin = CONFIG.focal / (CONFIG.focal + CONFIG.spread); // far end
    const scMax = CONFIG.focal / Math.max(1, CONFIG.focal - CONFIG.spread); // near end

    const norm = s => Math.min(1, Math.max(0, (s.sc - scMin) / (scMax - scMin)));

    // ── Connection lines (capped per star to avoid quadratic spikes) ─────────
    for (let i = 0; i < visible.length; i++) {
      const a = visible[i];
      let links = 0;
      for (let j = i + 1; j < visible.length; j++) {
        const b  = visible[j];
        const dx = a.sx - b.sx;
        const dy = a.sy - b.sy;
        if (dx * dx + dy * dy > CONFIG.lineDistSq) continue;

        const d        = Math.sqrt(dx * dx + dy * dy);
        links++;
        const depthFac = (norm(a) + norm(b)) * 0.5;
        const lineAlpha = (1 - d / 160) * depthFac * 0.34;
        ctx.strokeStyle = `rgba(${color}, ${lineAlpha})`;
        ctx.lineWidth   = 0.5 + depthFac * 0.4;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();

        if (links >= CONFIG.maxLineLinksPerStar) break;
      }
    }

    // ── Stars ────────────────────────────────────────────────────────────────
    visible.forEach(s => {
      const t = norm(s);

      // Twinkle modulates alpha slightly
      const twinkMod = 0.85 + 0.15 * Math.sin(s.twinkle);

      const alpha  = (CONFIG.minAlpha + t * (CONFIG.maxAlpha - CONFIG.minAlpha)) * twinkMod;
      const radius = CONFIG.minSize  + t * (CONFIG.maxSize  - CONFIG.minSize);

      // Cursor proximity glow
      const mdx   = s.sx - this.mouseX;
      const mdy   = s.sy - this.mouseY;
      const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
      const prox  = mdist < CONFIG.repelDist ? 1 - mdist / CONFIG.repelDist : 0;

      const finalAlpha  = Math.min(1, alpha + prox * 0.55);
      const finalRadius = radius + prox * (CONFIG.maxSize * 1.4 - radius);

      // Glow halo near cursor
      if (prox > 0.05) {
        const grd = ctx.createRadialGradient(s.sx, s.sy, 0, s.sx, s.sy, finalRadius * 7);
        grd.addColorStop(0, `rgba(${color}, ${finalAlpha * prox * 0.45})`);
        grd.addColorStop(1, `rgba(${color}, 0)`);
        ctx.beginPath();
        ctx.arc(s.sx, s.sy, finalRadius * 7, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      // Core dot — near stars get a tiny inner highlight
      ctx.beginPath();
      ctx.arc(s.sx, s.sy, finalRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color}, ${finalAlpha})`;
      ctx.fill();

      if (t > 0.7) {
        // Bright near-stars: white specular centre
        ctx.beginPath();
        ctx.arc(s.sx, s.sy, finalRadius * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${(t - 0.7) * 0.9})`;
        ctx.fill();
      }
    });
  }
}

// Singleton — same export name as before, nothing else needs updating
const starfield = new Starfield();
export default starfield;
export { Starfield };
