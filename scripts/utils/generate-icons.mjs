#!/usr/bin/env node

/**
 * PWA Icon Generator
 * Generates all required icon sizes from logo.svg
 */

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '../../public');

// Icon sizes required for PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  const logoPath = resolve(publicDir, 'logo.svg');
  const svgBuffer = readFileSync(logoPath);

  console.log('🎨 Generating PWA icons from logo.svg...\n');

  for (const size of ICON_SIZES) {
    const outputPath = resolve(publicDir, `icon-${size}x${size}.png`);

    try {
      await sharp(svgBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ Generated icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`❌ Failed to generate icon-${size}x${size}.png:`, error.message);
      process.exit(1);
    }
  }

  // Also update favicon.svg
  const faviconPath = resolve(publicDir, 'favicon.svg');
  const logoContent = readFileSync(logoPath, 'utf-8');
  readFileSync(faviconPath, 'utf-8'); // Check if exists

  console.log('\n📝 Updating favicon.svg with logo...');

  // Copy logo.svg to favicon.svg
  const fs = await import('fs/promises');
  await fs.copyFile(logoPath, faviconPath);
  console.log('✅ Updated favicon.svg');

  console.log('\n✨ All icons generated successfully!');
  console.log('\n📋 Generated files:');
  ICON_SIZES.forEach(size => {
    console.log(`   - icon-${size}x${size}.png`);
  });
  console.log('   - favicon.svg (updated)');

  console.log('\n🚀 Next steps:');
  console.log('   1. Test PWA installation on mobile device');
  console.log('   2. Check DevTools > Application > Manifest');
  console.log('   3. Deploy to production with HTTPS');
}

generateIcons().catch(error => {
  console.error('\n❌ Error generating icons:', error);
  process.exit(1);
});
