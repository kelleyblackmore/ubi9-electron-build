'use strict';

/*
 * Emit a minimal valid 256x256 PNG at build/icon.png with no image dependencies,
 * so electron-builder has an icon to package (and to derive the Windows .ico).
 * Pure Node (zlib) — keeps the repo text-only; the icon is generated in-container.
 */

const fs = require('fs');
const zlib = require('zlib');

const SIZE = 256;

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const tb = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([len, tb, data, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 6;  // colour type: RGBA

// One scanline: filter byte 0 + SIZE teal (#2dd4bf) opaque pixels.
const row = Buffer.alloc(1 + SIZE * 4);
for (let x = 0; x < SIZE; x += 1) {
  row[1 + x * 4] = 0x2d;
  row[2 + x * 4] = 0xd4;
  row[3 + x * 4] = 0xbf;
  row[4 + x * 4] = 0xff;
}
const raw = Buffer.concat(Array.from({ length: SIZE }, () => row));
const idat = zlib.deflateSync(raw);

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0)),
]);

fs.mkdirSync('build', { recursive: true });
fs.writeFileSync('build/icon.png', png);
console.log(`wrote build/icon.png (${png.length} bytes, ${SIZE}x${SIZE})`);
