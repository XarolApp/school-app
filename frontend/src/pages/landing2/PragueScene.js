import * as THREE from 'three';
import { DISTRICTS } from '../../lib/pragueDistricts';

/**
 * The landing page's 3D centrepiece: every real Prague school as a point of
 * light on the real district map, in the same projection as
 * lib/pragueDistricts.js (constants copied from lib/pragueDistricts.js at the
 * repo root — regenerate together if the map is ever rebuilt).
 *
 * The page drives it through `scene.state` (GSAP scrubs those numbers); the
 * scene eases every point toward its target each frame, so a chip click and a
 * scroll both animate without a separate tween per point.
 *
 * Colours are read from the live CSS custom properties, so all four palettes
 * and both modes work, and a theme switch repaints without a reload.
 */

const PROJ = { minX: 0.5395123208333333, minY: 0.33837659838327977, scale: 734402.6510144448, pad: 8 };
const mercX = (lon) => (lon + 180) / 360;
const mercY = (lat) => {
  const r = (lat * Math.PI) / 180;
  return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2;
};

const UNIT = 0.012; // world units per map pixel → Prague is ~12 × 9 units
const toWorld = (px, py) => [(px - 500) * UNIT, (py - 382) * UNIT];
const lonLatToWorld = (lon, lat) =>
  toWorld((mercX(lon) - PROJ.minX) * PROJ.scale + PROJ.pad, (mercY(lat) - PROJ.minY) * PROJ.scale + PROJ.pad);

// "Home" for the commute step: Anděl, a plausible central starting point.
const HOME = lonLatToWorld(14.4035, 50.0707);
export const COMMUTE_RADIUS = 2.6;
export const TOP_COUNT = 6;

const POINT_VERT = /* glsl */ `
  attribute vec3 aColor;
  attribute float aAlpha;
  attribute float aSize;
  uniform float uPR;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPR * (400.0 / -mv.z);
  }
`;

const POINT_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = smoothstep(0.2, 0.13, d);
    float halo = pow(1.0 - d * 2.0, 2.2) * 0.5;
    gl_FragColor = vec4(vColor, (core + halo) * vAlpha);
    #include <colorspace_fragment>
  }
`;

function parsePath(d) {
  return d
    .replace(/[MZ]/g, '')
    .split('L')
    .map((pair) => pair.split(',').map(Number))
    .filter((p) => p.length === 2 && !Number.isNaN(p[0]));
}

const lerp = (a, b, t) => a + (b - a) * t;

export class PragueScene {
  constructor(canvas, { reduced = false, onHover, onSelect } = {}) {
    this.canvas = canvas;
    this.reduced = reduced;
    this.onHover = onHover;
    this.onSelect = onSelect;
    this.schools = [];
    this.predicate = null;
    this.chipOn = false;
    this.hovered = -1;
    this.labels = [];

    // Everything the page animates. Angles in radians.
    this.state = {
      tilt: 0.95, // polar angle from straight down
      rot: -0.35, // azimuth
      dist: 16.5,
      offset: 0.2, // shifts the map right so copy can sit left
      filterMix: 0,
      radiusMix: 0,
      barsMix: 0,
      topMix: 0,
      hover: true,
    };
    this.pointer = { x: 0, y: 0, sx: 0, sy: 0, px: -1e4, py: -1e4 };

    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }));
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(-4, 10, 6);
    this.scene.add(sun);

    this.#buildDistricts();
    this.#buildRing();

    this.colors = {};
    this.readColors();

    this.clock = new THREE.Clock();
    this.running = false;
    this.#bindPointer();
    this.resize();
  }

  // ---------- construction ----------

  #buildDistricts() {
    this.landGroup = new THREE.Group();
    this.fillMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, depthWrite: false });
    this.lineMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.9 });
    for (const district of DISTRICTS) {
      const pts = parsePath(district.d).map(([x, y]) => toWorld(x, y));
      const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
      const fill = new THREE.Mesh(new THREE.ShapeGeometry(shape), this.fillMat);
      fill.rotation.x = -Math.PI / 2;
      fill.position.y = -0.01;
      this.landGroup.add(fill);
      const line = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(pts.map(([x, z]) => new THREE.Vector3(x, 0, z))),
        this.lineMat,
      );
      this.landGroup.add(line);
    }
    this.scene.add(this.landGroup);
  }

  #buildRing() {
    this.ringMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    this.discMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(COMMUTE_RADIUS - 0.03, COMMUTE_RADIUS, 128), this.ringMat);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(COMMUTE_RADIUS, 128), this.discMat);
    const home = new THREE.Mesh(new THREE.CircleGeometry(0.09, 32), this.ringMat);
    for (const m of [ring, disc, home]) {
      m.rotation.x = -Math.PI / 2;
      m.position.set(HOME[0], 0.005, HOME[1]);
      this.scene.add(m);
    }
  }

  /** @param schools rows from /api/schools, each already tagged with `cats` */
  setSchools(schools) {
    this.schools = schools
      .filter((s) => s.latitude && s.longitude)
      .map((s) => {
        const [x, z] = lonLatToWorld(s.longitude, s.latitude);
        return { ...s, x, z, home: Math.hypot(x - HOME[0], z - HOME[1]) };
      });
    const n = this.schools.length;

    const pos = new Float32Array(n * 3);
    this.schools.forEach((s, i) => pos.set([s.x, 0.02, s.z], i * 3));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(n).fill(0), 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n).fill(0), 1));
    this.pointMat = new THREE.ShaderMaterial({
      vertexShader: POINT_VERT,
      fragmentShader: POINT_FRAG,
      uniforms: { uPR: { value: this.renderer.getPixelRatio() } },
      transparent: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, this.pointMat);
    this.points.renderOrder = 2;
    this.scene.add(this.points);

    this.bars = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
      new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05, transparent: true, opacity: 0.92 }),
      n,
    );
    this.bars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bars.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    this.scene.add(this.bars);

    // Per-point eased values, start from nothing so the map "fills in".
    this.cur = this.schools.map((_, i) => ({
      a: 0,
      size: 0,
      h: 0,
      c: new THREE.Color(),
      delay: this.reduced ? 0 : 0.2 + (i % 37) * 0.018 + Math.random() * 0.6,
    }));
    this.#pickTop();
  }

  /** Filter used by the hero chips and the "co tě baví" step. */
  setPredicate(fn, chipOn) {
    this.predicate = fn;
    this.chipOn = chipOn;
    this.#pickTop();
  }

  setLabelLayer(el) {
    this.labelLayer = el;
    this.#pickTop();
  }

  #inFilter(s) {
    return this.predicate ? this.predicate(s) : true;
  }

  #pickTop() {
    if (!this.schools.length) return;
    const pool = this.schools
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => this.#inFilter(s) && s.home < COMMUTE_RADIUS)
      .sort((a, b) => a.s.home - b.s.home);
    // Nearest first, but keep them apart so their labels never stack.
    const picked = [];
    for (const c of pool) {
      if (picked.every((p) => Math.hypot(p.s.x - c.s.x, p.s.z - c.s.z) > 1.15)) picked.push(c);
      if (picked.length === TOP_COUNT) break;
    }
    pool.length = 0;
    pool.push(...picked);
    this.top = new Set(pool.map((p) => p.i));
    this.topList = pool.map((p) => p.s);

    if (!this.labelLayer) return;
    this.labelLayer.replaceChildren();
    this.labels = pool.map(({ s, i }, rank) => {
      const el = document.createElement('div');
      el.className = 'l2-label';
      el.innerHTML = `<span class="l2-label-rank">${rank + 1}</span><span class="l2-label-name"></span>`;
      el.lastChild.textContent = s.name;
      this.labelLayer.appendChild(el);
      return { el, i };
    });
  }

  readColors() {
    const cs = getComputedStyle(this.canvas);
    const get = (v, fallback) => new THREE.Color((cs.getPropertyValue(v) || fallback).trim() || fallback);
    this.colors = {
      dot: get('--ink3', '#888').lerp(get('--acc', '#1C58A3'), 0.45),
      accent: get('--acc', '#1C58A3'),
      match: get('--match-fill', '#2C7340'),
      line: get('--line2', '#ccc'),
      land: get('--surface2', '#eee'),
    };
    this.lineMat.color.copy(this.colors.line);
    this.fillMat.color.copy(this.colors.land);
    this.ringMat.color.copy(this.colors.accent);
    this.discMat.color.copy(this.colors.accent);
  }

  // ---------- interaction ----------

  #bindPointer() {
    this.onMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.px = e.clientX - rect.left;
      this.pointer.py = e.clientY - rect.top;
      this.pointer.x = (this.pointer.px / rect.width) * 2 - 1;
      this.pointer.y = (this.pointer.py / rect.height) * 2 - 1;
    };
    this.onLeave = () => {
      this.pointer.px = this.pointer.py = -1e4;
      this.pointer.x = this.pointer.y = 0;
    };
    this.onClick = () => {
      if (this.hovered >= 0 && this.state.hover) this.onSelect?.(this.schools[this.hovered]);
    };
    window.addEventListener('pointermove', this.onMove, { passive: true });
    this.canvas.addEventListener('pointerleave', this.onLeave);
    this.canvas.addEventListener('click', this.onClick);
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.canvas;
    if (!w || !h) return;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---------- loop ----------

  start() {
    if (this.running) return;
    this.running = true;
    const tick = () => {
      if (!this.running) return;
      this.frame();
      this.raf = requestAnimationFrame(tick);
    };
    tick();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  frame() {
    const t = this.clock.getElapsedTime();
    const st = this.state;
    const p = this.pointer;
    const ease = this.reduced ? 1 : 0.06;
    p.sx = lerp(p.sx, p.x, ease);
    p.sy = lerp(p.sy, p.y, ease);

    // Camera: orbit + pointer parallax + a very slow idle sway.
    const sway = this.reduced ? 0 : Math.sin(t * 0.12) * 0.05;
    const rot = st.rot + p.sx * 0.12 + sway;
    const tilt = Math.min(1.35, Math.max(0.02, st.tilt + p.sy * 0.06));
    const cam = this.camera;
    cam.position.set(
      st.dist * Math.sin(tilt) * Math.sin(rot),
      st.dist * Math.cos(tilt),
      st.dist * Math.sin(tilt) * Math.cos(rot),
    );
    cam.lookAt(0, 0, 0);
    cam.setViewOffset(this.width, this.height, -this.width * st.offset, 0, this.width, this.height);

    this.ringMat.opacity = st.radiusMix * 0.9;
    this.discMat.opacity = st.radiusMix * 0.07;

    if (this.points) this.#updatePoints(t);
    this.renderer.render(this.scene, cam);
  }

  #updatePoints(t) {
    const st = this.state;
    const C = this.colors;
    const geo = this.points.geometry;
    const aColor = geo.attributes.aColor.array;
    const aAlpha = geo.attributes.aAlpha.array;
    const aSize = geo.attributes.aSize.array;
    const filt = Math.max(this.chipOn && st.hover ? 1 : 0, st.filterMix);
    const k = this.reduced ? 1 : 0.09;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const target = new THREE.Color();
    const hl = new THREE.Color();

    // Hover: nearest projected point within 16px, hero only.
    let best = -1;
    let bestD = 16 * 16;
    const hoverOn = st.hover && p_inside(this.pointer, this.width, this.height);

    for (let i = 0; i < this.schools.length; i++) {
      const s = this.schools[i];
      const cur = this.cur[i];
      const inF = this.#inFilter(s) ? 1 : 0;
      const inR = s.home < COMMUTE_RADIUS ? 1 : 0;
      const isTop = this.top?.has(i) ? 1 : 0;
      const born = t > cur.delay ? 1 : 0;

      let a = 1 - filt * (1 - inF) * 0.82;
      a *= 1 - st.radiusMix * (1 - inR) * 0.8;
      a *= 1 - st.topMix * (1 - isTop) * 0.75;
      const light = filt * inF * (1 - st.radiusMix * (1 - inR));
      target.copy(C.dot).lerp(C.accent, light);
      hl.copy(target).lerp(C.match, st.topMix * isTop);
      let size = 1 + light * 0.35 + st.topMix * isTop * 1.1;
      if (i === this.hovered) size += 0.9;

      cur.a = lerp(cur.a, a * born, k);
      cur.size = lerp(cur.size, size * born, k);
      cur.c.lerp(hl, k);

      aAlpha[i] = cur.a;
      aSize[i] = cur.size;
      aColor[i * 3] = cur.c.r;
      aColor[i * 3 + 1] = cur.c.g;
      aColor[i * 3 + 2] = cur.c.b;

      // Bars: height = latest admission cutoff, only where the point is lit.
      const cutoff = s.admission_cutoff ?? 0;
      const h =
        st.barsMix * (cutoff ? ((cutoff - 8) / 72) * 1.5 : 0) * Math.max(0, (a - 0.5) / 0.5) * (1 - st.topMix * (1 - isTop));
      cur.h = lerp(cur.h, h, k);
      v.set(s.x, 0, s.z);
      const w = cur.h > 0.004 ? 0.06 : 0; // no flat squares for zero-height bars
      sc.set(w, Math.max(cur.h, 0.0001), w);
      m.compose(v, q, sc);
      this.bars.setMatrixAt(i, m);
      this.bars.setColorAt(i, cur.c);

      if (hoverOn) {
        v.set(s.x, 0.02, s.z).project(this.camera);
        const sx = (v.x * 0.5 + 0.5) * this.width;
        const sy = (-v.y * 0.5 + 0.5) * this.height;
        const d = (sx - this.pointer.px) ** 2 + (sy - this.pointer.py) ** 2;
        if (d < bestD && cur.a > 0.5) {
          bestD = d;
          best = i;
        }
      }
    }
    geo.attributes.aColor.needsUpdate = true;
    geo.attributes.aAlpha.needsUpdate = true;
    geo.attributes.aSize.needsUpdate = true;
    this.bars.instanceMatrix.needsUpdate = true;
    this.bars.instanceColor.needsUpdate = true;
    this.bars.visible = st.barsMix > 0.001;

    if (best !== this.hovered) {
      this.hovered = best;
      this.canvas.style.cursor = best >= 0 ? 'pointer' : '';
    }
    if (this.onHover) {
      if (best >= 0) {
        const s = this.schools[best];
        v.set(s.x, 0.02, s.z).project(this.camera);
        this.onHover(s, (v.x * 0.5 + 0.5) * this.width, (-v.y * 0.5 + 0.5) * this.height);
      } else {
        this.onHover(null);
      }
    }

    // Labels for the final shortlist, pinned to the top of each bar.
    for (const { el, i } of this.labels) {
      const s = this.schools[i];
      v.set(s.x, this.cur[i].h + 0.05, s.z).project(this.camera);
      const x = (v.x * 0.5 + 0.5) * this.width;
      const y = (-v.y * 0.5 + 0.5) * this.height;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%)`;
      el.style.opacity = String(Math.max(0, (st.topMix - 0.3) / 0.7));
    }
  }

  destroy() {
    this.stop();
    window.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerleave', this.onLeave);
    this.canvas.removeEventListener('click', this.onClick);
    this.scene.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose?.();
    });
    this.renderer.dispose();
  }
}

function p_inside(p, w, h) {
  return p.px >= 0 && p.py >= 0 && p.px <= w && p.py <= h;
}
