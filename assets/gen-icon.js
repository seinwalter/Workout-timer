/* RAW DAWG app icon generator — pure Node, no dependencies.
   Renders a flame mark (fire gradient on near-black) and writes:
     assets/icon.png        1024x1024  (app icon source for @capacitor/assets)
     assets/splash.png      2732x2732  (light/dark-neutral splash)
     assets/splash-dark.png 2732x2732
     assets/icon.svg        editable vector source (same silhouette)
   Run: node assets/gen-icon.js */

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const OUT = __dirname;

/* ---------------- PNG encoder (8-bit RGBA) ---------------- */
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride); }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

/* ---------------- color helpers ---------------- */
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
const smooth = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

// fire gradient by vertical param v (0 bottom .. 1 top)
function fireColor(v) {
  const a = [0xd1, 0x2e, 0x00], b = [0xff, 0x7a, 0x18], c = [0xff, 0xd6, 0x55];
  return v < 0.5 ? mix(a, b, v / 0.5) : mix(b, c, (v - 0.5) / 0.5);
}
function innerColor(v) {
  const a = [0xff, 0x9a, 0x2a], b = [0xff, 0xf2, 0xcc];
  return mix(a, b, v);
}

/* ---------------- flame geometry (normalized) ----------------
   y in (0,1): 0 = bottom, 1 = tip. Returns half-width (max ~1). */
function halfWidth(y) {
  if (y <= 0 || y >= 1) return 0;
  const peak = 0.42;
  if (y < peak) { const t = y / peak; return Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t))); } // rounded bulb
  const t = (y - peak) / (1 - peak); return Math.pow(1 - t, 1.25); // taper to point
}
// horizontal lean of the centerline (in half-width units): gentle S with a curling tip
function centerLean(y) { return 0.08 * Math.sin(Math.PI * 0.92 * y) + 0.16 * Math.pow(smooth(0.55, 1, y), 1.4); }

/* ---------------- renderer ----------------
   size: output px. heightFrac: flame height as fraction of canvas.
   Background dark with a warm glow halo behind the flame. */
function render(size, heightFrac) {
  const buf = Buffer.alloc(size * size * 4);
  const SS = size > 1500 ? 2 : 3;           // supersamples per axis (AA)
  const Hpix = size * heightFrac;            // flame height in px
  const Wpix = Hpix * 0.30;                  // max half-width in px (flame is tall)
  const cx = size * 0.5;
  const bottom = size * 0.5 + Hpix * 0.5;    // vertically centered
  const bgTop = [0x0b, 0x0b, 0x0e], bgBot = [0x14, 0x0f, 0x12];
  const glowCol = [255, 110, 40];

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const x = px + (sx + 0.5) / SS;
        const y = py + (sy + 0.5) / SS;
        // background vertical gradient
        let col = mix(bgTop, bgBot, y / size);
        // flame coordinates
        const Y = (bottom - y) / Hpix;            // 0..1 up the flame
        const X = (x - cx) / Wpix;                // half-width units
        const lean = centerLean(Y);
        const hw = halfWidth(Y);
        const dx = X - lean;
        // warm glow halo (background only)
        const edge = Math.abs(dx) - hw;           // >0 outside silhouette
        if (Y > -0.15 && Y < 1.15) {
          const gd = Math.max(0, edge) * 1.7 + Math.max(0, Math.max(-Y, Y - 1)) * 2.2;
          const glow = Math.exp(-(gd * gd) * 1.6) * 0.55;
          col = [col[0] + glowCol[0] * glow, col[1] + glowCol[1] * glow, col[2] + glowCol[2] * glow];
        }
        // outer flame
        if (Y > 0 && Y < 1 && Math.abs(dx) <= hw) {
          col = fireColor(Y);
          // inner highlight flame
          const iY = (Y - 0.10) / 0.82;
          if (iY > 0 && iY < 1) {
            const ihw = halfWidth(iY) * 0.5;
            if (Math.abs(dx) <= ihw) col = innerColor(iY);
          }
        }
        r += col[0]; g += col[1]; b += col[2];
      }
      const n = SS * SS, i = (py * size + px) * 4;
      buf[i] = Math.min(255, Math.round(r / n));
      buf[i + 1] = Math.min(255, Math.round(g / n));
      buf[i + 2] = Math.min(255, Math.round(b / n));
      buf[i + 3] = 255;
    }
  }
  return buf;
}

function stats(buf) {
  let flame = 0; const n = buf.length / 4;
  for (let i = 0; i < buf.length; i += 4) if (buf[i] > 150 && buf[i + 1] > 60) flame++;
  return (100 * flame / n).toFixed(1) + '% warm/flame pixels';
}

/* ---------------- SVG source (same silhouette) ---------------- */
function buildSVG() {
  const S = 1024, H = S * 0.66, W = H * 0.30, cx = S / 2, bottom = S / 2 + H / 2;
  const L = [], R = [];
  for (let k = 0; k <= 160; k++) {
    const Y = k / 160; const hw = halfWidth(Y), lean = centerLean(Y);
    const yy = (bottom - Y * H).toFixed(2);
    L.push(`${(cx + (lean - hw) * W).toFixed(2)},${yy}`);
    R.push(`${(cx + (lean + hw) * W).toFixed(2)},${yy}`);
  }
  const outer = 'M' + L.join(' L') + ' L' + R.reverse().join(' L') + ' Z';
  const Li = [], Ri = [];
  for (let k = 0; k <= 160; k++) {
    const Y = k / 160; const iY = (Y - 0.10) / 0.82; if (iY <= 0 || iY >= 1) continue;
    const hw = halfWidth(iY) * 0.5, lean = centerLean(Y); const yy = (bottom - Y * H).toFixed(2);
    Li.push(`${(cx + (lean - hw) * W).toFixed(2)},${yy}`); Ri.push(`${(cx + (lean + hw) * W).toFixed(2)},${yy}`);
  }
  const inner = 'M' + Li.join(' L') + ' L' + Ri.reverse().join(' L') + ' Z';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="fire" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#d12e00"/><stop offset="0.5" stop-color="#ff7a18"/><stop offset="1" stop-color="#ffd655"/>
    </linearGradient>
    <linearGradient id="core" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#ff9a2a"/><stop offset="1" stop-color="#fff2cc"/>
    </linearGradient>
    <radialGradient id="bg" cx="0.5" cy="0.62" r="0.75">
      <stop offset="0" stop-color="#1a1210"/><stop offset="1" stop-color="#0a0a0e"/>
    </radialGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="26" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <g filter="url(#glow)"><path d="${outer}" fill="url(#fire)"/></g>
  <path d="${inner}" fill="url(#core)"/>
</svg>
`;
}

/* ---------------- write everything ---------------- */
function write(name, w, h, buf) { fs.writeFileSync(path.join(OUT, name), encodePNG(w, h, buf)); }

console.log('Rendering icon 1024…');
const icon = render(1024, 0.66);
write('icon.png', 1024, 1024, icon);
console.log('  icon.png:', stats(icon));

console.log('Rendering splash 2732…');
const splash = render(2732, 0.30);
write('splash.png', 2732, 2732, splash);
write('splash-dark.png', 2732, 2732, splash);
console.log('  splash.png:', stats(splash));

fs.writeFileSync(path.join(OUT, 'icon.svg'), buildSVG());
console.log('Wrote icon.svg');
console.log('Done.');
