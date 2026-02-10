# 🎨 Generate OG Image Using Replicate AI

This guide shows you how to generate a professional Open Graph image using Replicate's AI models.

## Quick Start (3 minutes)

### 1. Get Replicate API Token

1. Go to https://replicate.com
2. Sign up (free account)
3. Go to https://replicate.com/account/api-tokens
4. Click "Create token"
5. Copy your token (starts with `r8_...`)

### 2. Generate the Image

```bash
cd dashboard

# Set your API token
export REPLICATE_API_TOKEN=r8_your_token_here

# Generate OG image
npm run seo:generate-og
```

That's it! The image will be saved to `dashboard/public/og-image.png`

---

## Model Options

The script supports multiple AI models. Edit `scripts/generate-og-image.js` to choose:

### Option 1: FLUX 1.1 Pro (Recommended)
**Best quality, highest resolution**

- **Cost:** ~$0.04 per image
- **Quality:** ⭐⭐⭐⭐⭐ (Best)
- **Speed:** ~30 seconds
- **Best for:** Final production images

```javascript
model: 'black-forest-labs/flux-1.1-pro',
```

### Option 2: FLUX Schnell (Free!)
**Fast and free**

- **Cost:** FREE ✅
- **Quality:** ⭐⭐⭐⭐ (Excellent)
- **Speed:** ~5 seconds (fastest)
- **Best for:** Testing and iteration

```javascript
model: 'black-forest-labs/flux-schnell',
```

### Option 3: SDXL
**Good balance**

- **Cost:** ~$0.003 per image
- **Quality:** ⭐⭐⭐⭐ (Very Good)
- **Speed:** ~15 seconds
- **Best for:** Budget-conscious production

```javascript
model: 'stability-ai/sdxl',
```

---

## Customizing the Prompt

Edit the `prompt` in `scripts/generate-og-image.js` to customize your image:

### Current Prompt Structure

```javascript
prompt: `A professional Open Graph social media image for "Skopaq" - an AI-powered E2E testing platform.

Design specifications:
- Dimensions: 1200x630 pixels
- Modern, clean tech startup aesthetic
- Dark gradient background (navy to teal)
- Bold headline: "AI-Powered E2E Testing"
- Subheading: "Generate tests from production errors"
- Minimalist geometric shapes
- Professional typography
- High contrast, readable at small sizes

Style: Modern, minimal, tech-forward, professional
`,
```

### Example Variations

#### Variation 1: More Futuristic
```javascript
prompt: `Ultra-modern futuristic Open Graph image for Skopaq AI testing platform.
Cyberpunk aesthetic, neon teal (#14b8a6) accents, holographic effects,
3D geometric shapes, glowing circuit patterns, "AI-Powered E2E Testing" in bold neon text.
Dark background with depth, sci-fi tech vibe, 1200x630px.`,
```

#### Variation 2: Minimalist Clean
```javascript
prompt: `Extremely minimal and clean Open Graph image for Skopaq testing platform.
Pure white background, single teal (#14b8a6) accent color, simple geometric logo,
"AI-Powered E2E Testing" in clean sans-serif, lots of whitespace,
Apple/Stripe aesthetic, sophisticated and professional, 1200x630px.`,
```

#### Variation 3: Code-Focused
```javascript
prompt: `Developer-focused Open Graph image for Skopaq E2E testing.
Dark VS Code-style background, subtle code snippets in background,
terminal window aesthetic, "AI-Powered E2E Testing" in monospace font,
green/teal (#14b8a6) syntax highlighting, hacker aesthetic but professional,
1200x630px.`,
```

---

## Advanced: Generate Multiple Variations

Want to try different styles? Create variations:

```bash
# Generate 3 different styles
for i in 1 2 3; do
  REPLICATE_API_TOKEN=r8_... node scripts/generate-og-image.js
  mv dashboard/public/og-image.png dashboard/public/og-image-v$i.png
done

# Then pick your favorite!
```

---

## Troubleshooting

### Error: "REPLICATE_API_TOKEN not set"

**Solution:**
```bash
export REPLICATE_API_TOKEN=r8_your_token_here
```

Or add to your `.env.local`:
```bash
REPLICATE_API_TOKEN=r8_your_token_here
```

### Error: "API Error: 402 Payment Required"

**Solution:** You've hit the free tier limit. Either:
1. Add a credit card to Replicate (they give you $5 free credit)
2. Use the free `flux-schnell` model instead

### Image doesn't match what I wanted

**Solution:** Edit the prompt in `scripts/generate-og-image.js`:
- Be more specific about colors, layout, style
- Add more details about what you DON'T want in `negativePrompt`
- Try a different model

### Image is too busy/cluttered

**Solution:** Add to `negativePrompt`:
```javascript
negativePrompt: 'cluttered, busy, noisy, too many elements, complex, messy, chaotic',
```

---

## Cost Breakdown

### Free Tier
- **FLUX Schnell:** Unlimited free generations ✅
- **First $5 on other models:** Free with account

### Paid (if you exceed free tier)
- **FLUX 1.1 Pro:** $0.04 per image (~25 images for $1)
- **SDXL:** $0.003 per image (~333 images for $1)

**For this project:** You'll likely only generate 1-5 images total = **FREE** or < $0.20

---

## Testing Your Generated Image

### 1. View locally
```bash
open dashboard/public/og-image.png
```

### 2. Validate SEO
```bash
npm run seo:validate
```

Should show:
```
✓ og-image.png exists (XXX KB)
```

### 3. Test Open Graph preview

**Before deploying:**
- Can't test locally (OG scrapers need public URL)

**After deploying:**
1. Go to https://www.opengraph.xyz/
2. Enter: `https://skopaq.ai`
3. See your image preview

**Alternative test sites:**
- https://cards-dev.twitter.com/validator (Twitter)
- https://developers.facebook.com/tools/debug/ (Facebook)
- https://www.linkedin.com/post-inspector/ (LinkedIn)

---

## Recommended Workflow

### First time (testing):
```bash
# Use free model to test
# Edit scripts/generate-og-image.js:
model: 'black-forest-labs/flux-schnell',

# Generate
REPLICATE_API_TOKEN=r8_... npm run seo:generate-og

# View result
open dashboard/public/og-image.png

# Not happy? Edit prompt and regenerate (it's free!)
```

### Final production image:
```bash
# Switch to best quality
# Edit scripts/generate-og-image.js:
model: 'black-forest-labs/flux-1.1-pro',

# Generate final image (~$0.04)
REPLICATE_API_TOKEN=r8_... npm run seo:generate-og

# Verify quality
open dashboard/public/og-image.png

# Deploy!
git add dashboard/public/og-image.png
git commit -m "feat: add AI-generated OG image"
git push
```

---

## Alternative: Use Replicate Web UI

Don't want to use the script? Generate manually:

1. Go to https://replicate.com/black-forest-labs/flux-schnell
2. Paste the prompt from `scripts/generate-og-image.js`
3. Add parameters:
   - Width: 1200
   - Height: 630
   - Aspect ratio: 16:9
4. Click "Run"
5. Download the image
6. Save as `dashboard/public/og-image.png`

---

## Best Practices

### ✅ Do's
- Use high contrast (dark background, white text)
- Keep text large and readable
- Use your brand colors (#14b8a6 teal)
- Test at 50% size to ensure readability
- Include your main value proposition

### ❌ Don'ts
- Don't use small text (min 48px)
- Don't use too many colors (stick to 2-3)
- Don't make it too busy/cluttered
- Don't forget to test on actual social media
- Don't use low-resolution images

---

## Example Prompts by Style

### Tech Startup (Vercel/Linear style)
```
Clean, minimal tech startup OG image for Skopaq. Simple gradient background
(#0a0a0a to #14b8a6), large bold text "AI-Powered E2E Testing", subtle
geometric shapes, lots of whitespace, professional, 1200x630px.
```

### Bold & Vibrant
```
Bold, eye-catching OG image for Skopaq testing platform. Vibrant teal (#14b8a6)
and purple gradients, 3D floating elements, dynamic composition, "AI-Powered
E2E Testing" in huge bold letters, energetic but professional, 1200x630px.
```

### Developer-Focused
```
Dark mode developer OG image for Skopaq. Code editor aesthetic, dark background,
syntax highlighting in teal, terminal window showing test results, "AI-Powered
E2E Testing" in monospace font, technical but clean, 1200x630px.
```

### Enterprise/Professional
```
Professional enterprise OG image for Skopaq platform. Navy blue and white,
minimal and trustworthy, geometric patterns, "AI-Powered E2E Testing" in
clean sans-serif, Fortune 500 aesthetic, sophisticated, 1200x630px.
```

---

## FAQ

**Q: How long does generation take?**
- FLUX Schnell: 5-10 seconds
- FLUX 1.1 Pro: 20-40 seconds
- SDXL: 15-30 seconds

**Q: Can I generate multiple images and choose the best?**
- Yes! FLUX Schnell is free, so generate as many as you want.

**Q: What if I want a different size?**
- OG images MUST be 1200x630 (2:1 ratio) for best results.

**Q: Can I edit the generated image?**
- Yes! Download and edit in Canva, Figma, or Photoshop.

**Q: Will this work for Twitter/LinkedIn/Facebook?**
- Yes! 1200x630 is the standard size for all platforms.

**Q: Do I need to credit Replicate?**
- No, you own the generated images.

---

## Support

- **Replicate Docs:** https://replicate.com/docs
- **FLUX Model:** https://replicate.com/black-forest-labs/flux-schnell
- **Pricing:** https://replicate.com/pricing

---

**Happy generating! 🎨**
