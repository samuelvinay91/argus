#!/usr/bin/env node

/**
 * SEO Validation Script for Argus Dashboard
 * Checks for common SEO issues before deployment
 * 
 * Usage: node scripts/validate-seo.js
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

let errors = 0;
let warnings = 0;
let success = 0;

function log(color, icon, message) {
  console.log(`${color}${icon} ${message}${COLORS.reset}`);
}

function error(message) {
  errors++;
  log(COLORS.red, '✗', message);
}

function warn(message) {
  warnings++;
  log(COLORS.yellow, '⚠', message);
}

function pass(message) {
  success++;
  log(COLORS.green, '✓', message);
}

function info(message) {
  log(COLORS.blue, 'ℹ', message);
}

console.log(`\n${COLORS.magenta}╔═══════════════════════════════════════╗${COLORS.reset}`);
console.log(`${COLORS.magenta}║   Argus Dashboard SEO Validator       ║${COLORS.reset}`);
console.log(`${COLORS.magenta}╚═══════════════════════════════════════╝${COLORS.reset}\n`);

// Check 1: robots.ts exists
info('Checking robots.ts...');
const robotsPath = path.join(__dirname, '..', 'app', 'robots.ts');
if (fs.existsSync(robotsPath)) {
  pass('robots.ts exists');
  const content = fs.readFileSync(robotsPath, 'utf8');
  if (content.includes('sitemap')) {
    pass('robots.ts references sitemap');
  } else {
    warn('robots.ts does not reference sitemap');
  }
} else {
  error('robots.ts is missing');
}

// Check 2: sitemap.ts exists
info('\nChecking sitemap.ts...');
const sitemapPath = path.join(__dirname, '..', 'app', 'sitemap.ts');
if (fs.existsSync(sitemapPath)) {
  pass('sitemap.ts exists');
} else {
  error('sitemap.ts is missing');
}

// Check 3: layout.tsx has structured data
info('\nChecking layout.tsx for structured data...');
const layoutPath = path.join(__dirname, '..', 'app', 'layout.tsx');
if (fs.existsSync(layoutPath)) {
  const content = fs.readFileSync(layoutPath, 'utf8');
  
  if (content.includes('application/ld+json')) {
    pass('JSON-LD structured data found');
  } else {
    error('No JSON-LD structured data in layout.tsx');
  }
  
  if (content.includes('@type')) {
    pass('Schema.org types detected');
  } else {
    warn('No Schema.org types found');
  }
  
  if (content.includes('metadataBase')) {
    pass('metadataBase is set');
  } else {
    error('metadataBase is missing');
  }
  
  if (content.includes('openGraph')) {
    pass('Open Graph metadata exists');
  } else {
    error('Open Graph metadata missing');
  }
  
  if (content.includes('twitter')) {
    pass('Twitter Card metadata exists');
  } else {
    warn('Twitter Card metadata missing');
  }
} else {
  error('layout.tsx not found');
}

// Check 4: Open Graph image exists
info('\nChecking for Open Graph image...');
const ogImagePath = path.join(__dirname, '..', 'public', 'og-image.png');
if (fs.existsSync(ogImagePath)) {
  const stats = fs.statSync(ogImagePath);
  if (stats.size > 100000) { // > 100KB
    pass(`og-image.png exists (${Math.round(stats.size / 1024)}KB)`);
  } else {
    warn(`og-image.png is very small (${Math.round(stats.size / 1024)}KB) - may be placeholder`);
  }
} else {
  error('og-image.png is missing from /public');
}

// Check 5: manifest.json exists
info('\nChecking PWA manifest...');
const manifestPath = path.join(__dirname, '..', 'public', 'manifest.json');
if (fs.existsSync(manifestPath)) {
  pass('manifest.json exists');
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.name && manifest.short_name) {
      pass('manifest.json has name and short_name');
    } else {
      warn('manifest.json missing required fields');
    }
  } catch (e) {
    error('manifest.json is invalid JSON');
  }
} else {
  warn('manifest.json is missing');
}

// Check 6: Environment variables
info('\nChecking environment variables...');
const envExamplePath = path.join(__dirname, '..', '.env.example');
if (fs.existsSync(envExamplePath)) {
  const content = fs.readFileSync(envExamplePath, 'utf8');
  
  if (content.includes('GA_MEASUREMENT_ID')) {
    pass('.env.example includes GA_MEASUREMENT_ID');
  } else {
    warn('.env.example missing GA_MEASUREMENT_ID placeholder');
  }
  
  if (content.includes('CLARITY_PROJECT_ID')) {
    pass('.env.example includes CLARITY_PROJECT_ID');
  } else {
    warn('.env.example missing CLARITY_PROJECT_ID placeholder');
  }
} else {
  warn('.env.example not found');
}

// Check 7: Analytics component exists
info('\nChecking analytics components...');
const analyticsPath = path.join(__dirname, '..', 'components', 'analytics', 'GoogleAnalytics.tsx');
if (fs.existsSync(analyticsPath)) {
  pass('GoogleAnalytics.tsx component exists');
  const content = fs.readFileSync(analyticsPath, 'utf8');
  if (content.includes('MSClarity')) {
    pass('MSClarity component exists');
  }
} else {
  warn('GoogleAnalytics.tsx component not found');
}

// Check 8: next.config has security headers
info('\nChecking next.config.ts for security headers...');
const nextConfigPath = path.join(__dirname, '..', 'next.config.ts');
if (fs.existsSync(nextConfigPath)) {
  const content = fs.readFileSync(nextConfigPath, 'utf8');
  
  if (content.includes('X-Frame-Options')) {
    pass('X-Frame-Options header configured');
  } else {
    warn('X-Frame-Options header missing');
  }
  
  if (content.includes('Strict-Transport-Security')) {
    pass('HSTS header configured');
  } else {
    warn('HSTS header missing');
  }
} else {
  error('next.config.ts not found');
}

// Summary
console.log(`\n${COLORS.magenta}╔═══════════════════════════════════════╗${COLORS.reset}`);
console.log(`${COLORS.magenta}║            Summary Report              ║${COLORS.reset}`);
console.log(`${COLORS.magenta}╚═══════════════════════════════════════╝${COLORS.reset}\n`);

console.log(`${COLORS.green}✓ Passed:  ${success}${COLORS.reset}`);
console.log(`${COLORS.yellow}⚠ Warnings: ${warnings}${COLORS.reset}`);
console.log(`${COLORS.red}✗ Errors:   ${errors}${COLORS.reset}\n`);

if (errors > 0) {
  console.log(`${COLORS.red}❌ SEO validation failed. Please fix the errors above.${COLORS.reset}\n`);
  process.exit(1);
} else if (warnings > 0) {
  console.log(`${COLORS.yellow}⚠️  SEO validation passed with warnings. Consider addressing them.${COLORS.reset}\n`);
  process.exit(0);
} else {
  console.log(`${COLORS.green}✅ All SEO checks passed! Your site is ready for search engines.${COLORS.reset}\n`);
  process.exit(0);
}
