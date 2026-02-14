// Simple script to generate PNG icons from SVG for PWA
// Run: node scripts/generate-icons.js

const fs = require("fs");
const path = require("path");

// Create a simple terminal-style SVG icon
const createSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#141d2b"/>
  <rect x="${size * 0.05}" y="${size * 0.05}" width="${size * 0.9}" height="${size * 0.9}" rx="${size * 0.1}" fill="#1a2636" stroke="#2a3a50" stroke-width="${size * 0.02}"/>
  <text x="${size * 0.18}" y="${size * 0.45}" font-family="monospace" font-size="${size * 0.18}" font-weight="bold" fill="#9fef00">&gt;_</text>
  <text x="${size * 0.15}" y="${size * 0.72}" font-family="monospace" font-size="${size * 0.14}" font-weight="bold" fill="#0dcdcd">AWT</text>
</svg>`;

const iconsDir = path.join(__dirname, "..", "public", "icons");
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// Write SVG files (browsers can use these as fallback)
[192, 512].forEach((size) => {
  const svg = createSvg(size);
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.svg`), svg);
  // Also write as a simple placeholder - in production you'd convert to PNG
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), svg);
});

console.log("Icons generated in public/icons/");
