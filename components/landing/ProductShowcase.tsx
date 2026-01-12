'use client';

import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Brain,
  RefreshCw,
  TrendingUp,
  Shield,
} from 'lucide-react';

interface ProductShowcaseProps {
  title?: string;
  subtitle?: string;
}

// Simulated test execution data
const testResults = [
  { name: 'User Authentication Flow', status: 'passed', duration: '2.3s', coverage: 98 },
  { name: 'Payment Processing', status: 'passed', duration: '1.8s', coverage: 95 },
  { name: 'Cart Operations', status: 'running', duration: '-', coverage: 92 },
  { name: 'Checkout Validation', status: 'passed', duration: '3.1s', coverage: 89 },
  { name: 'API Rate Limiting', status: 'healed', duration: '0.9s', coverage: 100 },
];

const qualityMetrics = [
  { label: 'Test Coverage', value: 94, trend: '+5%', icon: Shield },
  { label: 'Pass Rate', value: 98, trend: '+2%', icon: CheckCircle2 },
  { label: 'Avg Duration', value: '1.8s', trend: '-23%', icon: Clock },
  { label: 'Self-Healed', value: 12, trend: '+8', icon: RefreshCw },
];

export function ProductShowcase({
  title = 'Experience the Future of Testing',
  subtitle = 'Watch Argus automatically generate, execute, and heal tests in real-time',
}: ProductShowcaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-100px' });
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  // Animate through tests
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTestIndex((prev) => (prev + 1) % testResults.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <Clock className="w-4 h-4 text-amber-500" />
        </motion.div>;
      case 'healed':
        return <RefreshCw className="w-4 h-4 text-violet-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-emerald-500/10 border-emerald-500/20';
      case 'failed':
        return 'bg-red-500/10 border-red-500/20';
      case 'running':
        return 'bg-amber-500/10 border-amber-500/20';
      case 'healed':
        return 'bg-violet-500/10 border-violet-500/20';
      default:
        return 'bg-muted/50 border-border';
    }
  };

  return (
    <section ref={containerRef} className="py-24 px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ opacity }}
      >
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[100px]" />
      </motion.div>

      <div className="max-w-7xl mx-auto relative">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            {title.split(' ').map((word, i) =>
              word === 'Future' || word === 'Testing' ? (
                <span key={i} className="gradient-text">{word} </span>
              ) : (
                <span key={i}>{word} </span>
              )
            )}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {subtitle}
          </p>
        </motion.div>

        {/* Dashboard Preview */}
        <motion.div
          className="relative"
          style={{ y }}
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {/* Glow effect */}
          <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-violet-500/20 to-cyan-500/20 rounded-3xl blur-2xl opacity-50" />

          {/* Dashboard container */}
          <div className="relative rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl overflow-hidden shadow-2xl">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-md bg-muted/50 text-xs text-muted-foreground font-mono">
                  app.heyargus.ai/dashboard
                </div>
              </div>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Play className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>

            {/* Dashboard content */}
            <div className="p-6 lg:p-8">
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Quality Score Card */}
                <motion.div
                  className="lg:col-span-1 p-6 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Brain className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-semibold">AI Quality Score</span>
                  </div>

                  <div className="relative flex justify-center mb-6">
                    <svg className="w-32 h-32 -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-muted/30"
                      />
                      <motion.circle
                        cx="64"
                        cy="64"
                        r="56"
                        fill="none"
                        stroke="url(#gradient)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray="352"
                        initial={{ strokeDashoffset: 352 }}
                        animate={isInView ? { strokeDashoffset: 352 * 0.06 } : {}}
                        transition={{ duration: 2, delay: 0.5, ease: 'easeOut' }}
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="hsl(173 80% 45%)" />
                          <stop offset="100%" stopColor="hsl(190 80% 50%)" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.span
                        className="text-4xl font-bold"
                        initial={{ opacity: 0 }}
                        animate={isInView ? { opacity: 1 } : {}}
                        transition={{ duration: 0.5, delay: 1 }}
                      >
                        94
                      </motion.span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {qualityMetrics.slice(0, 2).map((metric, i) => (
                      <motion.div
                        key={metric.label}
                        className="p-3 rounded-lg bg-background/50"
                        initial={{ opacity: 0, y: 10 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.3, delay: 0.6 + i * 0.1 }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <metric.icon className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-emerald-500">{metric.trend}</span>
                        </div>
                        <div className="text-lg font-bold">{typeof metric.value === 'number' ? `${metric.value}%` : metric.value}</div>
                        <div className="text-xs text-muted-foreground">{metric.label}</div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Test Results */}
                <motion.div
                  className="lg:col-span-2 p-6 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10">
                        <Zap className="w-5 h-5 text-emerald-500" />
                      </div>
                      <span className="font-semibold">Live Test Execution</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <motion.div
                        className="w-2 h-2 rounded-full bg-emerald-500"
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <span className="text-muted-foreground">Running</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {testResults.map((test, i) => (
                      <motion.div
                        key={test.name}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ${
                          i === currentTestIndex
                            ? 'bg-primary/5 border-primary/30 shadow-lg shadow-primary/5'
                            : getStatusBg(test.status)
                        }`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.3, delay: 0.7 + i * 0.1 }}
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(test.status)}
                          <span className="text-sm font-medium">{test.name}</span>
                          {test.status === 'healed' && (
                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-violet-500/20 text-violet-400 font-medium">
                              AI Healed
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{test.coverage}% coverage</span>
                          <span className="font-mono">{test.duration}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span>Test Suite Progress</span>
                      <span>4/5 Complete</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary to-cyan-500 rounded-full"
                        initial={{ width: '0%' }}
                        animate={isInView ? { width: '80%' } : {}}
                        transition={{ duration: 2, delay: 1 }}
                      />
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Bottom stats row */}
              <motion.div
                className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                {qualityMetrics.map((metric, i) => (
                  <div
                    key={metric.label}
                    className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/30"
                  >
                    <div className="p-2 rounded-lg bg-primary/10">
                      <metric.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">
                          {typeof metric.value === 'number' ? `${metric.value}%` : metric.value}
                        </span>
                        <span className="text-xs text-emerald-500 flex items-center gap-0.5">
                          <TrendingUp className="w-3 h-3" />
                          {metric.trend}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">{metric.label}</span>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>

          {/* Floating elements */}
          <motion.div
            className="absolute -top-4 -right-4 p-3 rounded-xl bg-card border border-border shadow-xl"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <div className="text-xs font-medium">Tests Passed</div>
                <div className="text-lg font-bold text-emerald-500">1,247</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="absolute -bottom-4 -left-4 p-3 rounded-xl bg-card border border-border shadow-xl"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-violet-500" />
              </div>
              <div>
                <div className="text-xs font-medium">Self-Healed</div>
                <div className="text-lg font-bold text-violet-500">38</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default ProductShowcase;
