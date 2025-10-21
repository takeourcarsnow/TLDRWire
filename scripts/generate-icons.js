const fs = require('fs');
const path = require('path');

const sharp = require('sharp');
const toIco = require('to-ico');

const POTRACE_AVAILABLE = (() => {
  try {
    require.resolve('potrace');
    return true;
  } catch (e) {
    return false;
  }
})();

async function run() {
  const root = path.resolve(__dirname, '..');
  const srcPath = path.join(root, 'public', 'logo.png');
  if (!fs.existsSync(srcPath)) {
    console.error('Source logo not found at', srcPath);
    process.exit(1);
  }

  const out192 = path.join(root, 'public', 'icon-192.png');
  const out512 = path.join(root, 'public', 'icon-512.png');
  const outSvg = path.join(root, 'public', 'logo.svg');
  const outFavicon = path.join(root, 'public', 'favicon.ico');

  console.log('Reading source:', srcPath);
  const inputBuf = fs.readFileSync(srcPath);

  // Generate PNG sizes with padding for maskable icons
  console.log('Generating PNG variants...');
  const generatePaddedIcon = async (size) => {
    const paddedSize = Math.floor(size * 0.8); // 80% safe zone
    const resized = await sharp(inputBuf)
      .resize(paddedSize, paddedSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{ input: resized, top: Math.floor((size - paddedSize) / 2), left: Math.floor((size - paddedSize) / 2) }])
      .png()
      .toFile(path.join(root, 'public', `icon-${size}.png`));
  };
  await generatePaddedIcon(192);
  console.log('Wrote', out192);
  await generatePaddedIcon(512);
  console.log('Wrote', out512);

  // Create favicon (use 32x32 and 16x16 source by resizing)
  console.log('Creating favicon.ico...');
  const ico32 = await sharp(inputBuf).resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const ico16 = await sharp(inputBuf).resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const icoBuf = await toIco([ico32, ico16]);
  fs.writeFileSync(outFavicon, icoBuf);
  console.log('Wrote', outFavicon);

  // Attempt to trace to SVG if potrace is available
  if (POTRACE_AVAILABLE) {
    console.log('Potrace available — attempting vector trace...');
    try {
      const Potrace = require('potrace');
      await new Promise((resolve, reject) => {
        Potrace.trace(inputBuf, (err, svg) => {
          if (err) return reject(err);
          fs.writeFileSync(outSvg, svg);
          console.log('Wrote traced SVG at', outSvg);
          resolve();
        });
      });
    } catch (e) {
      console.warn('Tracing with potrace failed:', e.message || e);
      // fallback to embedding PNG in an SVG wrapper
      const data = inputBuf.toString('base64');
      const wrapper = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">\n  <image href="data:image/png;base64,${data}" width="512" height="512" />\n</svg>`;
      fs.writeFileSync(outSvg, wrapper);
      console.log('Wrote fallback SVG wrapper at', outSvg);
    }
  } else {
    console.log('Potrace not installed — writing fallback SVG wrapper (embedded PNG)');
    const data = inputBuf.toString('base64');
    const wrapper = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">\n  <image href="data:image/png;base64,${data}" width="512" height="512" />\n</svg>`;
    fs.writeFileSync(outSvg, wrapper);
    console.log('Wrote fallback SVG wrapper at', outSvg);
  }

  console.log('All done.');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
