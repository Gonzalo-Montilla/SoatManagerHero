import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const publicDir = resolve(process.cwd(), 'public');
const sourceLogoPath = resolve(process.cwd(), 'src/assets/logoSoatManagerHero.jpeg');

async function generate() {
  const sourceBuffer = await readFile(sourceLogoPath);

  const outputs = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
  ];

  for (const output of outputs) {
    const png = await sharp(sourceBuffer)
      .resize(output.size, output.size, { fit: 'cover' })
      .png({ compressionLevel: 9 })
      .toBuffer();

    await writeFile(resolve(publicDir, output.name), png);
    console.log(`Generated ${output.name} (${output.size}x${output.size})`);
  }
}

generate().catch((error) => {
  console.error('Error generating PWA icons:', error);
  process.exit(1);
});
