const fs = require('fs');
const zlib = require('zlib');

function createPNG(width, height, r, g, b) {
  // Simple uncompressed or deflate PNG generator
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: truecolor RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw image data with filter byte 0 at start of each scanline
  const rowBytes = 1 + width * 3;
  const rawData = Buffer.alloc(rowBytes * height);
  
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // filter type None
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 3;
      // Gradient / accent box drawing
      const distCenter = Math.hypot(x - width / 2, y - height / 2);
      const isCenter = distCenter < width * 0.32;
      const isInner = distCenter < width * 0.18;
      
      if (isInner) {
        rawData[pixelOffset] = 129;     // R (indigo accent)
        rawData[pixelOffset + 1] = 140; // G
        rawData[pixelOffset + 2] = 248; // B
      } else if (isCenter) {
        rawData[pixelOffset] = 79;      // R (indigo main)
        rawData[pixelOffset + 1] = 70;  // G
        rawData[pixelOffset + 2] = 229; // B
      } else {
        // Dark slate background
        rawData[pixelOffset] = 15;      // R: #0f172a
        rawData[pixelOffset + 1] = 23;  // G
        rawData[pixelOffset + 2] = 42;  // B
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(8 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  
  const crcData = chunk.slice(4, 8 + length);
  const crc = crc32(crcData);
  chunk.writeInt32BE(crc, 8 + length);
  return chunk;
}

// CRC32 table
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return crc ^ -1;
}

fs.mkdirSync('public/icons', { recursive: true });
fs.writeFileSync('public/icons/icon-192.png', createPNG(192, 192, 15, 23, 42));
fs.writeFileSync('public/icons/icon-512.png', createPNG(512, 512, 15, 23, 42));
fs.writeFileSync('public/icons/maskable-icon-512.png', createPNG(512, 512, 15, 23, 42));

console.log('Icons generated successfully in public/icons/');
