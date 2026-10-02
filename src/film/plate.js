import { clamp, rgbToHsl, hslToRgb, hash1, shortestArc, hueDist } from './math.js';

// The portrait plate: any figure cut out on transparency. This one is drawn
// procedurally — a crouched figure, one arm thrown up on the thwip. What
// matters to the bake is the ALPHA (positions) and the COLOUR (the suit):
// red head/chest/arms, cobalt legs, two near-white eye lenses, dark webbing.
function drawPlate(ctx, W, H) {
  const RED = '#c81f2b';
  const BLUE = '#20398c';
  const DARK = 'rgba(40,6,10,0.9)';
  const WHITE = '#f2f3f5';

  const limb = (pts, w, col) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
    ctx.stroke();
  };

  // legs + hips (cobalt)
  limb([[318, 452], [424, 548], [388, 692]], 56, BLUE);
  limb([[278, 458], [188, 612], [118, 762]], 56, BLUE);
  limb([[388, 692], [432, 718]], 30, BLUE);
  limb([[118, 762], [76, 794]], 30, BLUE);
  limb([[298, 400], [296, 478]], 96, BLUE);
  // torso (red)
  limb([[296, 228], [299, 408]], 98, RED);
  // arms (red) — right thrown up on the thwip, left trailing
  limb([[332, 232], [400, 150], [480, 68]], 44, RED);
  limb([[260, 236], [194, 316], [134, 400]], 42, RED);
  // head + neck (red)
  limb([[297, 172], [293, 210]], 42, RED);
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.arc(299, 126, 47, 0, Math.PI * 2);
  ctx.fill();

  // the eye lenses — the only near-white in the figure; S < 0.12 skips the
  // remap so tinting cannot cost the specular highlights
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.ellipse(276, 116, 17, 10, -0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(326, 112, 17, 10, 0.5, 0, Math.PI * 2);
  ctx.fill();

  // webbing hint — dark red keeps its own dark lightness through the remap
  ctx.strokeStyle = DARK;
  ctx.lineWidth = 3;
  for (let k = 0; k < 5; k++) {
    ctx.beginPath();
    ctx.arc(299, 126, 10 + k * 9, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  }
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(272 + k * 18, 192);
    ctx.quadraticCurveTo(262 + k * 18, 285, 274 + k * 18, 372);
    ctx.stroke();
  }

  // photographic-ish grain inside the silhouette: per-bead lightness variance
  for (let k = 0; k < 5200; k++) {
    ctx.fillStyle =
      Math.random() < 0.5 ? 'rgba(0,0,0,0.10)' : 'rgba(255,235,235,0.08)';
    ctx.fillRect(Math.random() * W, Math.random() * H, 2.2, 2.2);
  }
}

// Sample `count` beads from the plate's alpha, bake the remap + shade into
// instanceColor ONCE, and pack scatter seeds. Runs a single time at init.
export function bakeFigure(count) {
  const W = 512;
  const H = 1024;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  drawPlate(ctx, W, H);
  const data = ctx.getImageData(0, 0, W, H).data;

  const hits = [];
  let minX = W, maxX = 0, minY = H, maxY = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 102) {
        hits.push(y * W + x);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // map the plate's content bbox to 14 world units tall, centred (0, 9, 0)
  const bh = Math.max(1, maxY - minY);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const scale = 14 / bh;

  // form-normal light: the normal is the bead's offset from the FIGURE'S OWN
  // axis (x, y*0.15, z), never from the world origin — subtract the centre
  // from itself and you get a degenerate radial and the cloud shades flat
  const L = [-0.55, 0.35, 0.75];
  const ll = Math.hypot(...L);
  L[0] /= ll; L[1] /= ll; L[2] /= ll;

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 4);
  const sunOff = new Float32Array(count * 3);

  let i = 0;
  let guard = 0;
  while (i < count && guard < count * 40) {
    guard++;
    const idx = hits[(Math.random() * hits.length) | 0];
    const x = (idx % W) + Math.random() - 0.5;
    const y = ((idx / W) | 0) + Math.random() - 0.5;
    const wx = (x - cx) * scale;
    const wy = 9 + (cy - y) * scale;
    const wz = (Math.random() - 0.5) * 0.3;

    const o = idx * 4;
    let [h, s, l] = rgbToHsl(data[o] / 255, data[o + 1] / 255, data[o + 2] / 255);
    l = clamp(l + (hash1(i + 1) - 0.5) * 0.1, 0.02, 0.98);

    if (s >= 0.12) {
      // rotate to the nearer of scarlet (0.985) or cobalt (0.625), shortest
      // arc, 85% pull, own lightness kept — the photograph's modelling
      // survives; replacing colour outright flattens 40k beads to a silhouette
      const toScarlet = hueDist(h, 0.985);
      const toCobalt = hueDist(h, 0.625);
      const target = toScarlet < toCobalt ? 0.985 : 0.625;
      h = (h + shortestArc(target - h) * 0.85 + 1) % 1;
      s = Math.min(s, 0.85);
    }
    let [r, g, b] = hslToRgb(h, s, l);

    // bake the shade once
    const nx = wx;
    const ny = (wy - 9) * 0.15;
    const nz = wz;
    const nl = Math.hypot(nx, ny, nz) || 1;
    const d = ((nx * L[0] + ny * L[1] + nz * L[2]) / nl) * 0.5 + 0.5;
    const shade = 0.55 + 0.75 * Math.pow(d, 1.6);

    positions[i * 3] = wx;
    positions[i * 3 + 1] = wy;
    positions[i * 3 + 2] = wz;
    colors[i * 3] = r * shade;
    colors[i * 3 + 1] = g * shade;
    colors[i * 3 + 2] = b * shade;

    // scatter seed: unit direction biased down-corridor + one random scalar
    const th = Math.random() * Math.PI * 2;
    const sx = Math.cos(th) * (Math.random() * 0.8 + 0.2);
    const sy = (Math.random() * 2 - 1) * 0.8;
    const sz = Math.random() * 0.8 + 0.2;
    const sl = Math.hypot(sx, sy, sz) || 1;
    seeds[i * 4] = sx / sl;
    seeds[i * 4 + 1] = sy / sl;
    seeds[i * 4 + 2] = sz / sl;
    seeds[i * 4 + 3] = Math.random();
    // independent per-bead dawn offset: a near-spherical glowing disc
    const sa = Math.random() * Math.PI * 2;
    const sr = Math.sqrt(Math.random()) * 10;
    sunOff[i * 3] = Math.cos(sa) * sr;
    sunOff[i * 3 + 1] =
      (Math.random() - 0.5) * 2 * 5.5 * Math.sqrt(Math.max(0, 1 - (sr / 10) ** 2));
    sunOff[i * 3 + 2] = Math.sin(sa) * sr * 0.4;
    i++;
  }

  return { positions, colors, seeds, sunOff, placed: i };
}
