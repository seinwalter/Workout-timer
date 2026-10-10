/* PROTOCOL app icon generator — pure Node, no dependencies.
   Renders a minimal mark (three ascending rounded bars, accent blue on
   near-black) and writes:
     assets/icon.png        1024x1024  (app icon source for @capacitor/assets)
     assets/splash.png      2732x2732
     assets/splash-dark.png 2732x2732
     assets/icon.svg        editable vector source (same geometry)
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

/* ---------------- helpers ---------------- */
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;

// signed distance to a rounded rectangle centered at (cx,cy), half-size (hw,hh), radius r
function sdRoundRect(x, y, cx, cy, hw, hh, r) {
  const qx = Math.abs(x - cx) - (hw - r);
  const qy = Math.abs(y - cy) - (hh - r);
  const ax = Math.max(qx, 0), ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}

/* ---------------- mark geometry (normalized to a 1024 canvas) ----------------
   Three ascending bars, bottoms aligned, fully-rounded caps. */
const BG = [0x0d, 0x11, 0x17];
const BARS = [                                   // [cx, height, color top, color bottom]
  { cx: 512 - 208, h: 300, top: [0x3a, 0x7b, 0xd5], bot: [0x2f, 0x62, 0xaa] },
  { cx: 512,       h: 460, top: [0x58, 0xa6, 0xff], bot: [0x3f, 0x84, 0xdd] },
  { cx: 512 + 208, h: 620, top: [0x85, 0xc0, 0xff], bot: [0x58, 0xa6, 0xff] },
];
const BAR_HW = 62;          // half-width (bar width 124)
const BASELINE = 762;       // y of bar bottoms
const BAR_R = 62;           // fully rounded ends

function markColorAt(x, y, scale, cx0, cy0) {
  // map canvas px -> 1024 mark space centered at (cx0, cy0)
  const mx = (x - cx0) / scale + 512;
  const my = (y - cy0) / scale + 512;
  for (const b of BARS) {
    const cy = BASELINE - b.h / 2;
    const d = sdRoundRect(mx, my, b.cx, cy, BAR_HW, b.h / 2, BAR_R);
    if (d <= 0) {
      const v = clamp01((BASELINE - my) / b.h);       // 0 bottom .. 1 top
      return mix(b.bot, b.top, v);
    }
  }
  return null;
}

/* ---------------- renderer ---------------- */
function render(size, markFrac) {
  const buf = Buffer.alloc(size * size * 4);
  const SS = size > 1500 ? 2 : 3;                    // supersampling for AA
  const scale = (size * markFrac) / 1024;            // mark scale
  const c0 = size / 2;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const x = px + (sx + 0.5) / SS, y = py + (sy + 0.5) / SS;
        const col = markColorAt(x, y, scale, c0, c0) || BG;
        r += col[0]; g += col[1]; b += col[2];
      }
      const n = SS * SS, i = (py * size + px) * 4;
      buf[i] = Math.round(r / n); buf[i + 1] = Math.round(g / n); buf[i + 2] = Math.round(b / n); buf[i + 3] = 255;
    }
  }
  return buf;
}

function stats(buf) {
  let mark = 0; const n = buf.length / 4;
  for (let i = 0; i < buf.length; i += 4) if (buf[i + 2] > 100 && buf[i + 2] > buf[i]) mark++;
  return (100 * mark / n).toFixed(1) + '% mark pixels';
}

/* ---------------- SVG source ---------------- */
function buildSVG() {
  const rects = BARS.map((b, i) =>
    `<rect x="${b.cx - BAR_HW}" y="${BASELINE - b.h}" width="${BAR_HW * 2}" height="${b.h}" rx="${BAR_R}" fill="url(#g${i})"/>`).join('\n  ');
  const grads = BARS.map((b, i) => {
    const hex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
    return `<linearGradient id="g${i}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${hex(b.bot)}"/><stop offset="1" stop-color="${hex(b.top)}"/></linearGradient>`;
  }).join('\n    ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    ${grads}
  </defs>
  <rect width="1024" height="1024" fill="#0d1117"/>
  ${rects}
</svg>
`;
}

/* ---------------- write everything ---------------- */
function write(name, w, h, buf) { fs.writeFileSync(path.join(OUT, name), encodePNG(w, h, buf)); }

console.log('Rendering icon 1024…');
const icon = render(1024, 0.86);                    // mark fills most of the tile
write('icon.png', 1024, 1024, icon);
console.log('  icon.png:', stats(icon));

console.log('Rendering splash 2732…');
const splash = render(2732, 0.22);                  // small centered mark
write('splash.png', 2732, 2732, splash);
write('splash-dark.png', 2732, 2732, splash);
console.log('  splash.png:', stats(splash));

fs.writeFileSync(path.join(OUT, 'icon.svg'), buildSVG());
console.log('Wrote icon.svg');
console.log('Done.');
