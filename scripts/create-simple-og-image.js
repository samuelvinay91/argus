#!/usr/bin/env node

/**
 * Create a simple OG image using SVG -> PNG conversion
 * No external dependencies, works offline!
 */

const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, '..', 'public', 'og-image.svg');
const outputPngPath = path.join(__dirname, '..', 'public', 'og-image.png');

// SVG template for OG image
const svgContent = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <!-- Background Gradient -->
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a0a;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#1a1a2e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#14b8a6;stop-opacity:0.8" />
    </linearGradient>
    
    <!-- Subtle pattern -->
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(20, 184, 166, 0.1)" stroke-width="1"/>
    </pattern>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGradient)"/>
  <rect width="1200" height="630" fill="url(#grid)" opacity="0.3"/>
  
  <!-- Decorative circles -->
  <circle cx="100" cy="100" r="150" fill="rgba(20, 184, 166, 0.1)" />
  <circle cx="1100" cy="530" r="200" fill="rgba(20, 184, 166, 0.08)" />
  
  <!-- Main content -->
  <g>
    <!-- Logo placeholder (you can replace with actual logo later) -->
    <circle cx="150" cy="315" r="60" fill="rgba(20, 184, 166, 0.2)" stroke="#14b8a6" stroke-width="3"/>
    <text x="150" y="330" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="#14b8a6" text-anchor="middle">A</text>
    
    <!-- Main headline -->
    <text x="280" y="280" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="#ffffff">
      AI-Powered E2E Testing
    </text>
    
    <!-- Subheading -->
    <text x="280" y="340" font-family="Arial, sans-serif" font-size="32" fill="#a1a1aa">
      Generate tests from production errors
    </text>
    
    <!-- Feature bullets -->
    <g transform="translate(280, 390)">
      <circle cx="0" cy="0" r="4" fill="#14b8a6"/>
      <text x="15" y="6" font-family="Arial, sans-serif" font-size="24" fill="#14b8a6">Self-healing tests</text>
    </g>
    
    <g transform="translate(560, 390)">
      <circle cx="0" cy="0" r="4" fill="#14b8a6"/>
      <text x="15" y="6" font-family="Arial, sans-serif" font-size="24" fill="#14b8a6">Bug prediction</text>
    </g>
    
    <g transform="translate(780, 390)">
      <circle cx="0" cy="0" r="4" fill="#14b8a6"/>
      <text x="15" y="6" font-family="Arial, sans-serif" font-size="24" fill="#14b8a6">Claude AI powered</text>
    </g>
  </g>
  
  <!-- Bottom branding -->
  <text x="600" y="580" font-family="Arial, sans-serif" font-size="20" fill="#71717a" text-anchor="middle">
    skopaq.ai
  </text>
</svg>`;

console.log('\x1b[36m🎨 Creating Simple OG Image\x1b[0m\n');

// Save SVG
fs.writeFileSync(outputPath, svgContent);
console.log(`\x1b[32m✓ SVG created: ${outputPath}\x1b[0m`);

console.log('\n\x1b[33mℹ️  Next steps to convert SVG to PNG:\x1b[0m\n');
console.log('Option 1 - Use online converter:');
console.log('  1. Go to: https://svgtopng.com');
console.log(`  2. Upload: ${outputPath}`);
console.log('  3. Download as PNG (1200x630)');
console.log(`  4. Save to: ${outputPngPath}\n`);

console.log('Option 2 - Use macOS Preview:');
console.log(`  1. Open ${outputPath} in Preview`);
console.log('  2. File → Export');
console.log('  3. Format: PNG');
console.log('  4. Resolution: 144 pixels/inch');
console.log(`  5. Save as: og-image.png\n`);

console.log('Option 3 - Use ImageMagick (if installed):');
console.log(`  convert ${outputPath} -resize 1200x630 ${outputPngPath}\n`);

console.log('Option 4 - Use this Canva template:');
console.log('  Copy the design from the SVG and recreate in Canva\n');

// Try to convert using macOS built-in tools if available
try {
  const { execSync } = require('child_process');
  
  // Check if we're on macOS
  if (process.platform === 'darwin') {
    console.log('\x1b[33m⏳ Attempting automatic conversion using macOS tools...\x1b[0m');
    
    // Try using qlmanage (macOS Quick Look thumbnail generator)
    try {
      execSync(`qlmanage -t -s 1200 -o "${path.dirname(outputPath)}" "${outputPath}"`, { stdio: 'ignore' });
      
      // The file will be named og-image.svg.png
      const tempFile = outputPath + '.png';
      if (fs.existsSync(tempFile)) {
        fs.renameSync(tempFile, outputPngPath);
        console.log(`\x1b[32m✓ PNG created: ${outputPngPath}\x1b[0m`);
        console.log('\n\x1b[32m✅ OG image ready!\x1b[0m');
        console.log('\nNext: npm run seo:validate\n');
        return;
      }
    } catch (e) {
      // qlmanage failed, continue to other methods
    }
  }
  
  // Check if ImageMagick is installed
  try {
    execSync('which convert', { stdio: 'ignore' });
    console.log('\x1b[33m⏳ Converting with ImageMagick...\x1b[0m');
    execSync(`convert "${outputPath}" -resize 1200x630 "${outputPngPath}"`);
    console.log(`\x1b[32m✓ PNG created: ${outputPngPath}\x1b[0m`);
    console.log('\n\x1b[32m✅ OG image ready!\x1b[0m');
    console.log('\nNext: npm run seo:validate\n');
    return;
  } catch (e) {
    // ImageMagick not installed
  }
  
  console.log('\x1b[33m⚠️  Automatic conversion not available.\x1b[0m');
  console.log('Please use one of the manual options above.\n');
  
} catch (error) {
  console.log('\x1b[33m⚠️  Please manually convert the SVG to PNG using one of the options above.\x1b[0m\n');
}
