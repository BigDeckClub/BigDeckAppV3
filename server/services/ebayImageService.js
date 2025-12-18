/**
 * eBay Listing Image Generation Service
 *
 * Generates composite listing images for MTG decks using card images from Scryfall.
 * Images are created server-side and can be hosted locally or uploaded to cloud storage.
 */

import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Output directory for generated images
const IMAGE_OUTPUT_DIR = path.join(process.cwd(), 'public', 'generated-images');

// Ensure output directory exists
if (!fs.existsSync(IMAGE_OUTPUT_DIR)) {
  fs.mkdirSync(IMAGE_OUTPUT_DIR, { recursive: true });
}

/**
 * Generate a listing image for a deck
 * @param {Object} options
 * @param {string} options.commander - Commander card name
 * @param {string} options.theme - Deck theme/strategy
 * @param {string} options.commanderImageUrl - Scryfall image URL for commander
 * @param {string[]} options.featuredCardUrls - Array of featured card image URLs
 * @returns {Promise<{imageUrl: string, imagePath: string}>}
 */
export async function generateListingImage({ commander, theme, commanderImageUrl, featuredCardUrls = [] }) {
  // Canvas dimensions (1200x1200 for eBay square format)
  const width = 1200;
  const height = 1200;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background gradient (dark theme)
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(0.5, '#16213e');
  gradient.addColorStop(1, '#0f0f23');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add decorative border
  ctx.strokeStyle = '#4ade80';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // Add inner glow effect
  ctx.strokeStyle = 'rgba(74, 222, 128, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 30, width - 60, height - 60);

  // Card positioning
  const cardWidth = 336;
  const cardHeight = 468;
  const scaleFactor = 0.85;
  const scaledWidth = cardWidth * scaleFactor;
  const scaledHeight = cardHeight * scaleFactor;

  try {
    // Load and draw commander image (centered, larger)
    if (commanderImageUrl) {
      try {
        const commanderImg = await loadImage(commanderImageUrl);
        const cmdX = (width - scaledWidth * 1.1) / 2;
        const cmdY = 120;

        // Add shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;

        ctx.drawImage(commanderImg, cmdX, cmdY, scaledWidth * 1.1, scaledHeight * 1.1);

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      } catch (err) {
        console.warn('[ImageGen] Failed to load commander image:', err.message);
      }
    }

    // Draw featured cards (up to 2, positioned on sides)
    const sideCards = featuredCardUrls.slice(0, 2);
    for (let i = 0; i < sideCards.length; i++) {
      try {
        const cardImg = await loadImage(sideCards[i]);
        const cardX = i === 0 ? 50 : width - scaledWidth * 0.7 - 50;
        const cardY = height - scaledHeight * 0.8 - 200;

        ctx.globalAlpha = 0.9;
        ctx.drawImage(cardImg, cardX, cardY, scaledWidth * 0.7, scaledHeight * 0.7);
        ctx.globalAlpha = 1.0;
      } catch (err) {
        console.warn(`[ImageGen] Failed to load featured card ${i}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[ImageGen] Error loading images:', err);
  }

  // Add title text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Text shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Commander name
  const displayName = commander || 'Commander Deck';
  ctx.fillText(displayName, width / 2, 50);

  // Theme/strategy
  if (theme) {
    ctx.font = 'italic 32px Arial, sans-serif';
    ctx.fillStyle = '#4ade80';
    ctx.fillText(theme, width / 2, 110);
  }

  // Footer text
  ctx.font = '28px Arial, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('100 Card EDH MTG Commander Deck', width / 2, height - 80);

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Generate unique filename
  const hash = crypto.createHash('md5').update(`${commander}-${theme}-${Date.now()}`).digest('hex').slice(0, 12);
  const filename = `listing-${hash}.png`;
  const imagePath = path.join(IMAGE_OUTPUT_DIR, filename);

  // Save image
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(imagePath, buffer);

  // Return public URL
  const imageUrl = `/generated-images/${filename}`;

  return {
    imageUrl,
    imagePath,
    filename,
  };
}

/**
 * Clean up old generated images (older than 7 days)
 */
export async function cleanupOldImages() {
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  const now = Date.now();

  try {
    const files = fs.readdirSync(IMAGE_OUTPUT_DIR);
    for (const file of files) {
      if (!file.startsWith('listing-')) continue;

      const filePath = path.join(IMAGE_OUTPUT_DIR, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`[ImageGen] Cleaned up old image: ${file}`);
      }
    }
  } catch (err) {
    console.error('[ImageGen] Cleanup error:', err);
  }
}

export default {
  generateListingImage,
  cleanupOldImages,
};
