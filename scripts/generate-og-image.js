#!/usr/bin/env node

/**
 * Generate OG Image using Replicate AI Models
 * 
 * Usage:
 *   REPLICATE_API_TOKEN=your_token node scripts/generate-og-image.js
 * 
 * Recommended models:
 * - black-forest-labs/flux-1.1-pro (best quality, costs ~$0.04)
 * - black-forest-labs/flux-schnell (fast, free)
 * - stability-ai/sdxl (good quality, ~$0.003)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

if (!REPLICATE_API_TOKEN) {
  console.error('\x1b[31m❌ Error: REPLICATE_API_TOKEN environment variable not set\x1b[0m');
  console.log('\nGet your API token from: https://replicate.com/account/api-tokens');
  console.log('\nUsage:');
  console.log('  REPLICATE_API_TOKEN=r8_... node scripts/generate-og-image.js');
  process.exit(1);
}

// Configuration
const CONFIG = {
  // Choose your model (uncomment one):
  
  // Option 1: FLUX 1.1 Pro - Best quality, ~$0.04 per image
  // model: 'black-forest-labs/flux-1.1-pro',
  // version: null, // Uses latest
  
  // Option 2: FLUX Schnell - Fast and FREE
  // model: 'black-forest-labs/flux-schnell',
  // version: null,
  
  // Option 3: SDXL - Good balance, ~$0.003
  model: 'stability-ai/stable-diffusion',
  version: 'db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf',
  
  prompt: `A professional Open Graph social media image for "Argus" - an AI-powered E2E testing platform.

Design specifications:
- Dimensions: 1200x630 pixels, landscape orientation
- Modern, clean tech startup aesthetic similar to Vercel, Linear, or Stripe
- Dark background with gradient from deep navy (#0a0a0a) to teal (#14b8a6)
- Bold, large headline text in the center: "AI-Powered E2E Testing"
- Subheading below: "Generate tests from production errors"
- Minimalist geometric shapes or subtle tech patterns (circuit boards, neural networks)
- Professional sans-serif typography
- High contrast, readable at small sizes
- Clean, spacious layout with breathing room
- Subtle glow effects around text for depth
- Abstract representation of: automation, AI, testing, quality
- Color palette: Teal accent (#14b8a6), white text, dark navy background
- No people, no photos - pure abstract tech design
- Professional SaaS product marketing style

Style: Modern, minimal, tech-forward, professional, clean, high-end software product`,

  negativePrompt: 'blurry, low quality, cluttered, busy, noisy, amateur, unprofessional, people, faces, photos, realistic imagery, cartoons, childish, messy text, small text, unreadable, watermark, signature, frame, border',
  
  width: 1200,
  height: 630,
  outputPath: path.join(__dirname, '..', 'public', 'og-image.png'),
};

console.log('\x1b[36m🎨 Argus OG Image Generator\x1b[0m\n');
console.log(`Model: ${CONFIG.model}`);
console.log(`Output: ${CONFIG.outputPath}\n`);

// Step 1: Create prediction
function createPrediction() {
  return new Promise((resolve, reject) => {
    const input = {
      prompt: CONFIG.prompt,
      width: CONFIG.width,
      height: CONFIG.height,
      num_outputs: 1,
      aspect_ratio: '16:9',
      output_format: 'png',
      output_quality: 100,
    };

    // Add negative prompt if model supports it
    if (CONFIG.model.includes('sdxl') || CONFIG.model.includes('flux')) {
      // input.negative_prompt = CONFIG.negativePrompt;
    }

    // Model-specific parameters
    if (CONFIG.model.includes('flux-1.1-pro')) {
      input.prompt_upsampling = true;
      input.safety_tolerance = 2;
    } else if (CONFIG.model.includes('flux-schnell')) {
      input.num_inference_steps = 4; // Fast mode
    } else if (CONFIG.model.includes('sdxl')) {
      input.num_inference_steps = 50;
      input.guidance_scale = 7.5;
    }

    const postData = JSON.stringify({
      version: CONFIG.version || undefined,
      input: input,
    });

    const options = {
      hostname: 'api.replicate.com',
      path: `/v1/models/${CONFIG.model}/predictions`,
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    console.log('\x1b[33m⏳ Creating prediction...\x1b[0m');

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 201) {
          const response = JSON.parse(data);
          console.log('\x1b[32m✓ Prediction created\x1b[0m');
          console.log(`  ID: ${response.id}`);
          console.log(`  Status: ${response.status}\n`);
          resolve(response);
        } else {
          reject(new Error(`API Error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Step 2: Poll for completion
function waitForCompletion(predictionId) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    const poll = () => {
      attempts++;

      const options = {
        hostname: 'api.replicate.com',
        path: `/v1/predictions/${predictionId}`,
        method: 'GET',
        headers: {
          'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        },
      };

      https.get(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const response = JSON.parse(data);

          if (response.status === 'succeeded') {
            console.log('\x1b[32m✓ Generation complete!\x1b[0m\n');
            resolve(response);
          } else if (response.status === 'failed') {
            reject(new Error(`Generation failed: ${response.error}`));
          } else if (response.status === 'canceled') {
            reject(new Error('Generation was canceled'));
          } else if (attempts >= maxAttempts) {
            reject(new Error('Timeout: Generation took too long'));
          } else {
            // Still processing
            process.stdout.write(`\r\x1b[33m⏳ Generating... (${attempts * 5}s)\x1b[0m`);
            setTimeout(poll, 5000); // Poll every 5 seconds
          }
        });
      }).on('error', reject);
    };

    poll();
  });
}

// Step 3: Download image
function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    console.log('\x1b[33m⏳ Downloading image...\x1b[0m');

    const file = fs.createWriteStream(outputPath);

    https.get(url, (response) => {
      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('\x1b[32m✓ Image saved\x1b[0m');
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {}); // Delete partial file
      reject(err);
    });
  });
}

// Main execution
async function main() {
  try {
    // Step 1: Create prediction
    const prediction = await createPrediction();

    // Step 2: Wait for completion
    const result = await waitForCompletion(prediction.id);

    // Step 3: Download image
    const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output;
    
    if (!imageUrl) {
      throw new Error('No output image URL received');
    }

    await downloadImage(imageUrl, CONFIG.outputPath);

    // Success!
    console.log('\n\x1b[32m✅ OG image generated successfully!\x1b[0m');
    console.log(`\nLocation: ${CONFIG.outputPath}`);
    console.log('\nNext steps:');
    console.log('  1. View the image: open dashboard/public/og-image.png');
    console.log('  2. Run validation: npm run seo:validate');
    console.log('  3. Test preview: https://www.opengraph.xyz/');
    console.log('\n');

  } catch (error) {
    console.error('\n\x1b[31m❌ Error:\x1b[0m', error.message);
    process.exit(1);
  }
}

main();
