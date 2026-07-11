/**
 * Mesh Viewer Module
 * Lazy-loaded three.js viewer for the FYP vascular reconstruction,
 * embedded in the "From Normals to Mesh" project card.
 *
 * Presents the dissertation pipeline as a sequential showcase:
 *   Stage 1 — surface point cloud (the mesh's vertices)
 *   Stage 2 — oriented normals (spikes along vertex normals)
 *   Stage 3 — the final Screened Poisson surface
 * Stages crossfade and auto-advance; chips let the visitor jump.
 *
 * - three.js is only downloaded (from CDN, via the import map in
 *   index.html) once the projects section approaches the viewport.
 * - Tries to load the real dissertation mesh from models/vessel.glb
 *   (Draco-compressed glb supported). If the file isn't there yet,
 *   a procedural vessel-like placeholder is shown instead.
 * - Rotate-only orbit controls: no zoom/pan, so page scrolling is
 *   never hijacked; touch stays pan-y so mobile scrolling works.
 */

import { prefersReducedMotion } from '../utils.js';

const MODEL_URL = 'models/vessel.glb';
const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';
const GOLD = 0xd7a021;        // matches the dissertation figures' mesh colour
const POINT_COLOR = 0xcabffd; // pale purple point cloud
const NORMAL_COLOR = 0x60a5fa; // blue normal spikes

const STAGE_SECONDS = 4.2;    // auto-advance dwell per stage
const FADE_SPEED = 0.07;      // opacity lerp per frame

const STAGE_LABELS = ['Points', 'Normals', 'Mesh'];
const STAGE_CAPTIONS = [
  'Stage 1 · Surface point cloud extracted from segmented CT voxels',
  'Stage 2 · PCA normals oriented by signed-distance gradient',
  'Stage 3 · Screened Poisson surface · Data: 3D-IRCADb-01',
];
const STAGE_CAPTION_PLACEHOLDER =
  'Stage 3 · Screened Poisson surface (placeholder — real mesh coming soon)';

// opacity targets per stage: [points, normals, mesh]
const STAGE_TARGETS = [
  [1.00, 0.00, 0.00],
  [0.35, 1.00, 0.00],
  [0.00, 0.00, 1.00],
];

class MeshViewer {
  constructor() {
    this.container = null;
    this.caption = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.controls = null;

    this.pointsObj = null;
    this.normalsObj = null;
    this.meshObj = null;
    this.meshMat = null;

    this.stage = 0;
    this.stageTimer = 0;
    this.userLocked = false;   // manual chip click stops auto-advance
    this.stageBtns = [];

    this.visible = true;
    this.started = false;
    this.ready = false;
    this.usingPlaceholder = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    this.container = document.getElementById('fyp-mesh-viewer');
    if (!this.container) return;
    this.caption = this.container.querySelector('.mesh-viewer-caption');

    // Start loading three.js once the projects section gets close.
    const trigger = document.getElementById('projects') || this.container;
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        io.disconnect();
        this._start();
      }
    }, { rootMargin: '800px' });
    io.observe(trigger);

    this.initialized = true;
  }

  async _start() {
    if (this.started) return;
    this.started = true;

    let THREE, OrbitControls;
    try {
      THREE = await import('three');
      ({ OrbitControls } = await import('three/addons/controls/OrbitControls.js'));
    } catch (err) {
      console.warn('MeshViewer: three.js failed to load', err);
      this._setCaption('3D viewer unavailable');
      return;
    }
    this.THREE = THREE;

    // ── Scene ────────────────────────────────────────────────────────────
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    this.camera.position.set(0, 0.15, 2.6);

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.container.appendChild(this.renderer.domElement);

    // Lighting: soft purple ambient to match the site, warm key light
    this.scene.add(new THREE.HemisphereLight(0xa78bfa, 0x1a1030, 0.9));
    const key = new THREE.DirectionalLight(0xfff2d0, 2.2);
    key.position.set(2.5, 3, 2);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x60a5fa, 1.1);
    rim.position.set(-2.5, -1, -2);
    this.scene.add(rim);

    // ── Model: real mesh if present, placeholder otherwise ───────────────
    let object = await this._loadRealMesh(THREE);
    if (object) {
      this.usingPlaceholder = false;
    } else {
      object = this._buildPlaceholder(THREE);
      this.usingPlaceholder = true;
    }
    this._normalize(THREE, object);
    this.meshObj = object;
    this.scene.add(object);

    // ── Pipeline stages derived from the same geometry ────────────────────
    this._buildStages(THREE, object);
    this._buildStageUI();
    this._setStage(0);

    // ── Controls: rotate only, never captures the page scroll ────────────
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.autoRotate = !prefersReducedMotion();
    this.controls.autoRotateSpeed = 1.2;

    // No auto-advance for reduced-motion users; chips still work.
    if (prefersReducedMotion()) this.userLocked = true;

    this._clock = new THREE.Clock();

    // ── Sizing & visibility ───────────────────────────────────────────────
    this._resize();
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => this._resize()).observe(this.container);
    }
    new IntersectionObserver(entries => {
      this.visible = entries.some(e => e.isIntersecting);
    }).observe(this.container);

    this.ready = true;
    this._loop();
    console.log('✅ Mesh Viewer initialized' + (this.usingPlaceholder ? ' (placeholder mesh)' : ''));
  }

  async _loadRealMesh(THREE) {
    try {
      const head = await fetch(MODEL_URL, { method: 'HEAD' });
      if (!head.ok) return null;

      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const { DRACOLoader } = await import('three/addons/loaders/DRACOLoader.js');
      const loader = new GLTFLoader();
      const draco = new DRACOLoader();
      draco.setDecoderPath(DRACO_DECODER_PATH);
      loader.setDRACOLoader(draco);

      const gltf = await new Promise((resolve, reject) =>
        loader.load(MODEL_URL, resolve, undefined, reject));
      return gltf.scene;
    } catch {
      return null;
    }
  }

  /**
   * Procedural vessel-like branching structure — stands in until the
   * real dissertation mesh is exported to models/vessel.glb.
   */
  _buildPlaceholder(THREE) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: GOLD, roughness: 0.38, metalness: 0.15
    });
    const rand = (min, max) => min + Math.random() * (max - min);

    const branch = (start, dir, len, radius, depth) => {
      const pts = [];
      let p = start.clone();
      const d = dir.clone().normalize();
      const segs = 6;
      for (let i = 0; i <= segs; i++) {
        pts.push(p.clone());
        const step = d.clone().multiplyScalar(len / segs).add(
          new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1))
            .multiplyScalar(len * 0.07));
        p = p.clone().add(step);
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      group.add(new THREE.Mesh(
        new THREE.TubeGeometry(curve, 28, radius, 8, false), mat));

      if (depth > 0) {
        const end = pts[pts.length - 1];
        for (let k = 0; k < 2; k++) {
          const axis = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
          const nd = d.clone().applyAxisAngle(axis, rand(0.35, 0.8));
          branch(end, nd, len * rand(0.6, 0.8), radius * rand(0.55, 0.7), depth - 1);
        }
      }
    };

    branch(new THREE.Vector3(0, -0.9, 0), new THREE.Vector3(0.12, 1, 0), 1.0, 0.085, 4);
    return group;
  }

  /** Center the object and scale it to fit the camera framing. */
  _normalize(THREE, object) {
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 1.7 / maxDim;
    object.position.sub(center).multiplyScalar(scale);
    object.scale.setScalar(scale);
  }

  // ── Pipeline stage objects ──────────────────────────────────────────────

  /**
   * Derive the point-cloud and normal-spike stages from the mesh itself,
   * and unify the mesh under one fadeable material.
   */
  _buildStages(THREE, object) {
    // One shared gold material so the whole mesh fades as a unit.
    this.meshMat = new THREE.MeshStandardMaterial({
      color: GOLD, roughness: 0.38, metalness: 0.15,
      transparent: true, opacity: 0
    });
    object.traverse(node => { if (node.isMesh) node.material = this.meshMat; });

    // Collect world-space vertices + normals from every sub-mesh.
    object.updateMatrixWorld(true);
    const positions = [];
    const normals = [];
    const v = new THREE.Vector3();
    const n = new THREE.Vector3();
    const nm = new THREE.Matrix3();
    object.traverse(node => {
      if (!node.isMesh) return;
      const pos = node.geometry.attributes.position;
      const nor = node.geometry.attributes.normal;
      nm.getNormalMatrix(node.matrixWorld);
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(node.matrixWorld);
        positions.push(v.x, v.y, v.z);
        if (nor) {
          n.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
          normals.push(n.x, n.y, n.z);
        } else {
          normals.push(0, 0, 1);
        }
      }
    });
    const count = positions.length / 3;

    // Stage 1 — point cloud (stride-sampled if very dense)
    const maxPoints = 30000;
    const pStride = Math.max(1, Math.ceil(count / maxPoints));
    const pArr = [];
    for (let i = 0; i < count; i += pStride) {
      pArr.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pArr), 3));
    this.pointsObj = new THREE.Points(pGeo, new THREE.PointsMaterial({
      color: POINT_COLOR, size: 0.016, transparent: true, opacity: 1, depthWrite: false
    }));
    this.scene.add(this.pointsObj);

    // Stage 2 — normal spikes on a sparser subset
    const maxSpikes = 6000;
    const nStride = Math.max(1, Math.ceil(count / maxSpikes));
    const spikeLen = 0.05;
    const lArr = [];
    for (let i = 0; i < count; i += nStride) {
      const px = positions[i * 3], py = positions[i * 3 + 1], pz = positions[i * 3 + 2];
      lArr.push(px, py, pz,
                px + normals[i * 3] * spikeLen,
                py + normals[i * 3 + 1] * spikeLen,
                pz + normals[i * 3 + 2] * spikeLen);
    }
    const lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lArr), 3));
    this.normalsObj = new THREE.LineSegments(lGeo, new THREE.LineBasicMaterial({
      color: NORMAL_COLOR, transparent: true, opacity: 0, depthWrite: false
    }));
    this.scene.add(this.normalsObj);
  }

  _buildStageUI() {
    const box = document.createElement('div');
    box.className = 'mesh-stages';
    this.stageBtns = STAGE_LABELS.map((label, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this.userLocked = true;   // visitor took control — stop auto-advance
        this._setStage(i);
      });
      box.appendChild(btn);
      return btn;
    });
    this.container.appendChild(box);
  }

  _setStage(i) {
    this.stage = i;
    this.stageTimer = 0;
    this.stageBtns.forEach((btn, k) => btn.classList.toggle('active', k === i));
    if (i === 2 && this.usingPlaceholder) {
      this._setCaption(STAGE_CAPTION_PLACEHOLDER);
    } else {
      this._setCaption(STAGE_CAPTIONS[i]);
    }
  }

  // ── Render loop ─────────────────────────────────────────────────────────

  _fade(material, target) {
    const o = material.opacity + (target - material.opacity) * FADE_SPEED;
    material.opacity = Math.abs(o - target) < 0.005 ? target : o;
  }

  _renderFrame() {
    const dt = this._clock ? this._clock.getDelta() : 0.016;

    // auto-advance through the pipeline stages
    if (!this.userLocked) {
      this.stageTimer += dt;
      if (this.stageTimer >= STAGE_SECONDS) {
        this._setStage((this.stage + 1) % STAGE_TARGETS.length);
      }
    }

    // crossfade toward the current stage's opacity targets
    const [tp, tn, tm] = STAGE_TARGETS[this.stage];
    this._fade(this.pointsObj.material, tp);
    this._fade(this.normalsObj.material, tn);
    this._fade(this.meshMat, tm);
    this.pointsObj.visible = this.pointsObj.material.opacity > 0.01;
    this.normalsObj.visible = this.normalsObj.material.opacity > 0.01;
    this.meshObj.visible = this.meshMat.opacity > 0.01;
    // opaque mesh renders cleaner without transparency sorting
    this.meshMat.transparent = this.meshMat.opacity < 0.999;

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  _loop() {
    if (this.visible && !document.hidden) this._renderFrame();
    requestAnimationFrame(() => this._loop());
  }

  _resize() {
    if (!this.renderer) return;
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _setCaption(text) {
    if (this.caption) this.caption.textContent = text;
  }
}

// Singleton
const meshViewer = new MeshViewer();
export default meshViewer;
export { MeshViewer };
