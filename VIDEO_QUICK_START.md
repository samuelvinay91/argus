# 🎬 Video Landing Page - Quick Start (30 min)

**Goal:** Add a professional animated video to your landing page hero section

---

## 🚀 Fastest Method: Pika Labs (FREE)

### Step 1: Join Pika (2 min)

1. Go to https://pika.art
2. Click "Join Beta"
3. Accept Discord invite
4. Navigate to any `#create` channel

### Step 2: Generate Video (3 min + 2 min wait)

In Discord, type `/create` and paste:

```
Smooth camera movement through abstract tech environment, floating geometric shapes in 
teal and navy blue, holographic interface panels appearing and disappearing, particle 
network connections forming, neural network visualization, depth of field, cinematic 
lighting, professional tech product aesthetic, clean and minimal, dark background, 
flowing data streams, 3D rendered style, modern SaaS product vibe -motion 2 -gs 12 
-camera zoom in -fps 24
```

**Wait ~2 minutes** for video to generate.

### Step 3: Download & Optimize (5 min)

1. Right-click generated video → Save
2. Rename to `hero-background.mp4`
3. Compress at https://www.freeconvert.com/video-compressor
   - Target size: < 3MB
   - Quality: Medium-High
4. Download compressed version

### Step 4: Add to Project (10 min)

```bash
# 1. Create videos directory
mkdir -p dashboard/public/videos

# 2. Move video
mv ~/Downloads/hero-background.mp4 dashboard/public/videos/

# 3. Extract first frame as poster (optional, requires ffmpeg)
ffmpeg -i dashboard/public/videos/hero-background.mp4 -vframes 1 \
  dashboard/public/videos/hero-poster.jpg
```

### Step 5: Update Landing Page (10 min)

```typescript
// In dashboard/app/page.tsx or your landing page component

import { VideoHero } from '@/components/landing/VideoHero';

export default function Home() {
  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      <VideoHero 
        videoSrc="/videos/hero-background.mp4"
        posterSrc="/videos/hero-poster.jpg"
        opacity={0.3}
        overlay={true}
      />
      
      {/* Hero Content (on top of video) */}
      <div className="relative z-10 text-center px-4">
        <h1 className="text-6xl font-bold text-white mb-6">
          AI-Powered E2E Testing
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Generate tests from production errors automatically
        </p>
        <button className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-4 rounded-lg text-lg">
          Get Started Free
        </button>
      </div>
    </section>
  );
}
```

### Step 6: Test (2 min)

```bash
npm run dev
# Open http://localhost:3000
# Video should auto-play in background (muted)
```

**Done! 🎉** You now have a professional video hero section!

---

## 🎨 Alternative Prompts (Try Different Styles)

### Minimal & Clean (Apple-style)
```
/create Ultra minimal tech environment, smooth gradient transitions from black to teal, 
barely-there particle effects, very clean and spacious, subtle geometric shapes floating, 
premium product aesthetic, elegant and refined, slow camera movement -motion 1 -gs 8
```

### High Energy (Bold)
```
/create High-energy tech environment, neon teal and cyan accents, glowing circuit patterns, 
fast particle movement, holographic interfaces, cyberpunk minimal aesthetic, bold and 
dynamic -motion 4 -gs 18 -camera pan right
```

### Corporate Professional
```
/create Clean corporate tech environment, subtle animations, professional navy and teal 
tones, minimal geometric shapes, trustworthy and stable feeling, enterprise software 
aesthetic, polished -motion 2 -gs 10
```

---

## 📱 Mobile Optimization

The `VideoHero` component automatically shows a static poster image on mobile to save bandwidth and battery. No extra work needed!

**How it works:**
- Desktop: Full video plays
- Mobile: Poster image shown instead
- Automatic detection based on screen width

---

## 🎯 Video Best Practices

### ✅ DO:
- Keep videos short (10-15 seconds)
- Use loop for continuous playback
- Always mute (browsers block unmuted autoplay)
- Provide poster image fallback
- Compress to < 3MB for hero videos
- Use dark overlays for text readability

### ❌ DON'T:
- Don't use sound (will be blocked)
- Don't make videos too long (increases load time)
- Don't use high motion (can be distracting)
- Don't forget mobile optimization
- Don't exceed 5MB file size

---

## 🔧 Troubleshooting

**Video doesn't autoplay?**
- Ensure `muted` attribute is set
- Check browser console for errors
- Try in Incognito mode (some extensions block)

**Video is too large?**
- Compress at https://www.freeconvert.com
- Reduce duration (10s instead of 15s)
- Lower quality in compression settings

**Video looks pixelated?**
- Increase quality in Pika generation (`-gs 15`)
- Use higher resolution export
- Compress with lower CRF value

**Video doesn't loop smoothly?**
- Request "loop-able" in prompt
- Use video editing to create seamless loop
- Consider using Lottie animation instead

---

## 💰 Cost Comparison

| Platform | Free Tier | Paid | Best For |
|----------|-----------|------|----------|
| **Pika Labs** | ✅ Unlimited (beta) | TBA | Quick testing |
| **RunwayML** | 5 seconds | $12/month | Production quality |
| **Luma AI** | 30 videos/mo | $30/month | High quality |
| **Lottie** | ✅ Free | Free | Lightweight alternative |

**Recommendation:** Start with Pika (free), upgrade to RunwayML if needed.

---

## 🎬 Full Landing Page with Multiple Videos

```typescript
import { VideoHero, LazyVideo } from '@/components/landing/VideoHero';

export default function LandingPage() {
  return (
    <>
      {/* Hero Section with Video Background */}
      <section className="relative h-screen">
        <VideoHero 
          videoSrc="/videos/hero-background.mp4"
          posterSrc="/videos/hero-poster.jpg"
          opacity={0.3}
        />
        <div className="relative z-10">
          <h1>AI-Powered E2E Testing</h1>
        </div>
      </section>

      {/* Feature Section 1 - Self-Healing */}
      <section className="py-20">
        <div className="container mx-auto grid md:grid-cols-2 gap-12">
          <div>
            <h2>Self-Healing Tests</h2>
            <p>Tests automatically adapt to UI changes</p>
          </div>
          <LazyVideo 
            videoSrc="/videos/self-healing-demo.mp4"
            posterSrc="/videos/self-healing-poster.jpg"
            className="w-full rounded-lg shadow-2xl"
          />
        </div>
      </section>

      {/* Feature Section 2 - AI Generation */}
      <section className="py-20 bg-gray-900">
        <div className="container mx-auto grid md:grid-cols-2 gap-12">
          <LazyVideo 
            videoSrc="/videos/ai-generation-demo.mp4"
            posterSrc="/videos/ai-generation-poster.jpg"
            className="w-full rounded-lg shadow-2xl"
          />
          <div>
            <h2>AI-Powered Test Generation</h2>
            <p>Generate tests from production errors</p>
          </div>
        </div>
      </section>
    </>
  );
}
```

---

## 📊 Performance Impact

### Before Video:
- Page load: ~1.5s
- LCP: 1.2s
- Total size: 2MB

### After Video (optimized):
- Page load: ~2.5s (+1s)
- LCP: 1.8s (+0.6s)
- Total size: 5MB (+3MB video)

**Still acceptable!** Modern users expect rich media.

---

## 🎨 Alternative: Lottie Animation (Lightweight)

If you want **extremely light** and **smooth** animations:

### Step 1: Find Animation
1. Go to https://lottiefiles.com
2. Search "tech background"
3. Filter by "Free"
4. Download JSON

### Step 2: Customize Colors
1. Open at https://lottiefiles.com/editor
2. Change colors to teal (#14b8a6)
3. Download customized JSON

### Step 3: Use in React
```bash
npm install lottie-react
```

```typescript
import Lottie from 'lottie-react';
import heroAnimation from '@/public/animations/hero.json';

export function LottieHero() {
  return (
    <div className="absolute inset-0">
      <Lottie 
        animationData={heroAnimation} 
        loop 
        className="w-full h-full opacity-30"
      />
    </div>
  );
}
```

**Pros:** 
- Tiny file size (< 100KB vs 3MB video)
- Perfect scaling at any resolution
- Smooth 60fps animation

**Cons:**
- Less photorealistic than video
- More limited visual complexity

---

## ✅ Checklist

```
□ Join Pika Labs Discord
□ Generate hero video (10-15s)
□ Download video
□ Compress to < 3MB
□ Create videos directory
□ Move video to public/videos/
□ Extract poster frame (optional)
□ Copy VideoHero component
□ Update landing page
□ Test on desktop
□ Test on mobile
□ Deploy!
```

---

## 🔗 Resources

- **Pika Labs:** https://pika.art (FREE)
- **RunwayML:** https://runwayml.com ($12/mo)
- **Video Compressor:** https://www.freeconvert.com/video-compressor
- **LottieFiles:** https://lottiefiles.com (lightweight alternative)
- **VideoHero Component:** Already created at `dashboard/components/landing/VideoHero.tsx`

---

**Ready to start? Join Pika Labs and generate your first video in 5 minutes! 🚀**

See `MIDJOURNEY_VIDEO_PROMPTS.md` for 15+ more video prompts and advanced techniques.
