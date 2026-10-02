import { clamp01, lerp, smoothstep, gateWin, easeInOutCubic } from './math.js';

// ---- the one mutable object -----------------------------------------------
// Scroll writes p here once per frame; every useFrame and every DOM overlay
// reads it. React never re-renders from scroll. Scrubbing backwards must
// resolve to exactly the frame forwards produced: nothing in here integrates,
// springs, or lerps toward a target — every value is a direct function of
// (p, wall-clock for ambient drift, cursor for tilt).
export const film = {
  p: 0, // real scroll 0..1
  sp: 0, // act axis = clamp01(p / 0.82)
  t: 0, // ambient wall clock (float, drift, grain)
  cx: 0, // cursor -1..1 (tilt input, no smoothing)
  cy: 0,
  reduce: false, // prefers-reduced-motion
  dpr: 1,
  g: null, // gate bundle, recomputed per frame
};

export const isMobile =
  typeof window !== 'undefined' &&
  (window.innerWidth < 768 ||
    Math.min(window.innerWidth, window.innerHeight) < 520);

film.dpr = Math.min(
  (typeof window !== 'undefined' && window.devicePixelRatio) || 1,
  isMobile ? 1.0 : 1.5,
);

export function computeGates(sp, p, g) {
  // Six acts, every boundary overlapping its neighbour by 0.06-0.14 of sp.
  // A boundary where exactly one act is live is a cut, and a cut is a slideshow.
  g.a1 = gateWin(sp, 0.0, 0.0, 0.24, 0.32); // the figure + the lattice
  g.a2 = gateWin(sp, 0.2, 0.28, 0.44, 0.52); // the grid room
  g.a3 = gateWin(sp, 0.42, 0.5, 0.62, 0.7); // the swing corridor
  g.a4 = gateWin(sp, 0.6, 0.68, 0.76, 0.84); // let go (scatter)
  g.a5 = gateWin(sp, 0.74, 0.82, 9, 9); // begin again (gather)

  g.room = Math.max(g.a2, g.a3);
  g.strands = Math.max(g.a2, g.a3);
  // the bar lives and dies with the room; acts 4-5 get the ember sea instead
  g.bar = Math.max(g.a2, g.a3);
  // ONE scalar weaves the lattice and un-weaves it
  g.lattice = smoothstep(0.02, 0.12, sp) * (1 - smoothstep(0.24, 0.32, sp));
  g.idle = 1 - smoothstep(0.16, 0.28, sp); // float/tilt only while figure-form

  // bead life: dissolve forward into the room at the act 1 handoff, full
  // scatter in act 4, gather into the dawn in act 5
  g.scatter = 0.3 * smoothstep(0.14, 0.26, sp) + 0.7 * smoothstep(0.56, 0.72, sp);
  g.gather = smoothstep(0.76, 0.92, sp);
  // embers while scattered, full burn as the dawn completes
  g.boost =
    1 + 0.65 * smoothstep(0.56, 0.72, sp) + 3.2 * smoothstep(0.8, 0.94, sp);

  // the closing wipe runs on real p, not sp
  g.wipe = smoothstep(0.84, 0.945, p);
  // act 5 lifts the fog so the dawn at depth reads, then the wipe closes it
  g.fogFar =
    lerp(lerp(120, 160, smoothstep(0.74, 0.86, sp)), 34, smoothstep(0.84, 0.985, p));
  g.fogNear = lerp(10, 4, g.wipe);
}

function initGates() {
  film.g = {};
  computeGates(0, 0, film.g);
}
initGates();

// ---- DOM overlay registry --------------------------------------------------
// Overlays register their per-letter spans once; the driver touches only
// transform / filter / opacity per frame.
const registry = [];
export function registerOverlay(entry) {
  registry.push(entry);
  return () => {
    const i = registry.indexOf(entry);
    if (i >= 0) registry.splice(i, 1);
  };
}

function updateOverlays() {
  for (let k = 0; k < registry.length; k++) {
    const o = registry[k];
    if (o.wipe) {
      const e = smoothstep(0.84, 0.945, film.p);
      const x = -104 + 104 * easeInOutCubic(e);
      o.el.style.transform = `translate3d(${x.toFixed(2)}%,0,0)`;
      const vis = x > -103.5;
      if (vis !== o.vis) {
        o.el.style.visibility = vis ? 'visible' : 'hidden';
        o.vis = vis;
      }
      continue;
    }
    const v = o.axis === 'p' ? film.p : film.sp; // overlay windows sit on the ACT axis
    const w = clamp01((v - o.a) / (o.b - o.a));
    const rin = smoothstep(0.0, 0.28, w);
    const rout = o.hold ? 1 : 1 - smoothstep(0.72, 1.0, w);
    const op = rin * rout;
    if (op < 0.01) {
      if (!o.hidden) {
        o.root.style.visibility = 'hidden';
        o.hidden = true;
      }
      continue;
    }
    if (o.hidden) {
      o.root.style.visibility = 'visible';
      o.hidden = false;
    }
    o.root.style.opacity = op.toFixed(3);
    const letters = o.letters;
    const n = letters.length;
    for (let i = 0; i < n; i++) {
      const li = n > 1 ? i / (n - 1) : 0;
      // closings arrive FRONT-TO-BACK, resolving out of blur
      const ei = clamp01((w - 0.02 - li * 0.2) / 0.24);
      // openings leave BACK-TO-FRONT, blurring as they go
      const eo = o.hold ? 0 : clamp01((w - 0.64 - li * 0.2) / 0.24);
      const z = (1 - ei) * 520 + eo * 560;
      const y = (1 - ei) * 34 - eo * 26;
      const bl = (1 - ei) * 14 + eo * 18;
      const st = letters[i].style;
      st.transform = `translate3d(0,${y.toFixed(1)}px,${z.toFixed(1)}px)`;
      st.filter = bl > 0.05 ? `blur(${bl.toFixed(1)}px)` : 'none';
      st.opacity = (ei * (1 - eo)).toFixed(3);
    }
  }
}

// ---- the driver -------------------------------------------------------------
let started = false;

export function startDriver() {
  if (started) return;
  started = true;

  const track = document.getElementById('track');
  const stage = document.getElementById('stage');
  let max = 1;
  const measure = () => {
    if (track && stage) max = Math.max(1, track.offsetHeight - stage.offsetHeight);
  };
  measure();
  window.addEventListener('resize', measure);

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const applyReduce = () => {
    film.reduce = mq.matches;
  };
  applyReduce();
  mq.addEventListener?.('change', applyReduce);

  window.addEventListener(
    'pointermove',
    (e) => {
      film.cx = (e.clientX / window.innerWidth) * 2 - 1;
      film.cy = (e.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true },
  );

  if (import.meta.env.DEV) {
    window.__BND = { film, gates: film.g };
    devBoundaryProof();
  }

  const t0 = performance.now();
  const tick = (now) => {
    film.t = (now - t0) / 1000;
    film.p = clamp01((window.scrollY || 0) / max);
    film.sp = clamp01(film.p / 0.82);
    computeGates(film.sp, film.p, film.g);
    updateOverlays();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// PROVE the overlaps rather than assert them: at every act boundary at least
// two gates must be non-zero at once.
function devBoundaryProof() {
  const boundaries = [0.28, 0.48, 0.66, 0.8];
  const g = {};
  const rows = boundaries.map((x) => {
    computeGates(x, 0, g);
    const live = ['a1', 'a2', 'a3', 'a4', 'a5'].filter((k) => g[k] > 0.001);
    return {
      boundary: x,
      live: live.length,
      acts: live.map((k) => `${k}=${g[k].toFixed(2)}`).join(' '),
    };
  });
  // eslint-disable-next-line no-console
  console.table(rows);
  const ok = rows.every((r) => r.live >= 2);
  // eslint-disable-next-line no-console
  console.assert(ok, '[BND] act overlap broken — a boundary has a single live act');
}
