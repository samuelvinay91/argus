'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
  Brain,
  GitBranch,
  BarChart3,
  Sparkles,
  Play,
  Globe,
  Eye,
  ChevronRight,
  Github,
  Twitter,
  Linkedin,
  ArrowUpRight,
  Layers,
  RefreshCw,
  FileSearch,
  TestTube,
  Code2,
  Terminal,
  ChevronDown,
  Quote,
  Star,
  TrendingUp,
  Search,
  Lightbulb,
  Target,
} from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AuthButtons } from './auth-buttons';
import { StatsSection } from './StatsSection';
import { IntegrationLogos } from './IntegrationLogos';
import { AnimatedMeshGradient } from './AnimatedMeshGradient';
import { VantaBackground } from './VantaBackground';
import { ProductShowcase } from './ProductShowcase';
import { ScrollReveal, StaggerContainer, StaggerItem, TextReveal } from './ScrollReveal';

// IDE Integrations
const ideIntegrations = [
  { name: 'Claude Code', desc: 'MCP Tools', highlight: true },
  { name: 'Cursor', desc: 'AI Editor' },
  { name: 'VS Code', desc: 'Extensions' },
  { name: 'Windsurf', desc: 'AI IDE' },
  { name: 'JetBrains', desc: 'Plugin' },
  { name: 'Zed', desc: 'Coming Soon' },
];

// Workflow steps
const workflowSteps = [
  {
    num: '01',
    title: 'Understand',
    subtitle: 'Agents Analyze',
    desc: 'Code Analyzer agent parses your codebase, PRDs, and production errors to understand what you\'re building.',
    icon: Search,
    color: 'from-violet-500 to-purple-500',
  },
  {
    num: '02',
    title: 'Validate',
    subtitle: 'Agents Test',
    desc: 'UI and API Tester agents execute tests across your entire application using real browser interaction.',
    icon: CheckCircle2,
    color: 'from-teal-500 to-cyan-500',
  },
  {
    num: '03',
    title: 'Heal',
    subtitle: 'Agents Fix',
    desc: 'Self-Healer agent automatically repairs broken tests by reading git history - 99.9% accuracy.',
    icon: RefreshCw,
    color: 'from-amber-500 to-orange-500',
  },
  {
    num: '04',
    title: 'Deliver',
    subtitle: 'Agents Report',
    desc: 'Reporter agent generates insights and integrates with your CI/CD for production-ready releases.',
    icon: Target,
    color: 'from-emerald-500 to-teal-500',
  },
];

// Testimonials
const testimonials = [
  {
    quote: "I haven't touched a test file in months. The agents handle everything - from writing to fixing to reporting.",
    author: "Sarah Chen",
    role: "Engineering Lead",
    company: "TechCorp",
  },
  {
    quote: "The self-healing is unreal. We renamed 50 components in a refactor and zero tests broke. The agents just figured it out.",
    author: "Marcus Johnson",
    role: "Senior Developer",
    company: "StartupXYZ",
  },
  {
    quote: "Finally, AI that doesn't need me to babysit it. True autonomy. We went from 20 hours/week on test maintenance to zero.",
    author: "Emily Rodriguez",
    role: "QA Manager",
    company: "Enterprise Co",
  },
  {
    quote: "The agents found edge cases we never would have thought to test. It's like having a senior QA engineer who never sleeps.",
    author: "David Kim",
    role: "CTO",
    company: "InnovateLabs",
  },
];

// FAQ items
const faqItems = [
  {
    question: "What makes Skopaq 'agentic' vs just 'AI-powered'?",
    answer: "AI-powered tools assist humans with suggestions. Agentic tools make decisions and take actions autonomously. Skopaq agents understand your code, decide what to test, execute tests, and fix themselves - all without human intervention. You set a goal; agents figure out how to achieve it."
  },
  {
    question: "How do the agents work together?",
    answer: "A Supervisor agent coordinates six specialized worker agents using LangGraph orchestration. The Supervisor analyzes the current state and routes tasks to the right agent: Code Analyzer for understanding, UI/API Testers for execution, Self-Healer for repairs, and Reporter for results. It's like having a QA team that never sleeps."
  },
  {
    question: "Is the self-healing really 99.9% accurate?",
    answer: "Yes, because we don't guess. Unlike DOM-heuristic tools, Skopaq reads your git history to find exactly when and why a selector changed. We see the commit, the author, the message, and the new selector. This code-aware healing is what makes the difference."
  },
  {
    question: "What AI models power the agents?",
    answer: "Claude Sonnet 4.5 handles most testing decisions (best cost/capability ratio). Claude Opus 4.5 is used for complex debugging. Claude Haiku 4.5 handles quick verifications. The Computer Use API enables real browser interaction where agents can see and interact with your UI like a human."
  },
  {
    question: "How does Skopaq integrate with my existing tools?",
    answer: "Skopaq agents connect to your existing tools (Sentry, GitHub, Jest, Playwright, etc.) via webhooks and APIs. We don't replace anything—agents correlate data from all your tools into one unified quality intelligence brain and take autonomous action."
  },
  {
    question: "Is there a free tier?",
    answer: "Yes! Skopaq Core is free forever. You get the AI Quality Score dashboard, 3 integrations, and basic agent capabilities. Upgrade to Pro to unlock all agents and unlimited autonomous testing."
  },
  {
    question: "Can I deploy agents in my CI/CD pipeline?",
    answer: "Absolutely. Agents run natively in GitHub Actions, GitLab CI, CircleCI, and Jenkins. They execute autonomously on every commit, heal failing tests, and report results back to your PR. No manual intervention needed."
  },
];

const features = [
  {
    icon: Brain,
    title: 'Agents That Discover Tests',
    description: 'No templates needed. Agents explore your app and generate comprehensive tests automatically.',
    color: 'from-teal-500 to-cyan-500',
  },
  {
    icon: RefreshCw,
    title: 'Auto-Repair Without Human Intervention',
    description: 'When selectors change, agents read your git history and fix tests with 99.9% accuracy.',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    icon: Shield,
    title: 'Agents That Anticipate Failures',
    description: 'Pattern analysis across your test history predicts issues before they reach production.',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: GitBranch,
    title: 'Agents In Your Pipeline',
    description: 'Deploy testing agents in GitHub Actions, GitLab CI, or any pipeline. They run autonomously.',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: BarChart3,
    title: 'Agent-Reported Insights',
    description: 'Reporter agents generate dashboards, not just data. Root cause analysis, not stack traces.',
    color: 'from-violet-500 to-purple-500',
  },
  {
    icon: Globe,
    title: 'Agents Test Every Browser',
    description: 'Real browser interaction via Computer Use on Chrome, Firefox, Safari, and Edge.',
    color: 'from-pink-500 to-rose-500',
  },
];

const integrations = [
  { name: 'Sentry', desc: 'Error tracking', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sentry/sentry-original.svg' },
  { name: 'Datadog', desc: 'Monitoring', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/datadog/datadog-original.svg' },
  { name: 'GitHub', desc: 'Source control', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg', invert: true },
  { name: 'Slack', desc: 'Notifications', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/slack/slack-original.svg' },
  { name: 'Linear', desc: 'Issue tracking', logo: 'https://cdn.simpleicons.org/linear/white' },
  { name: 'Jira', desc: 'Project mgmt', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jira/jira-original.svg' },
  { name: 'PagerDuty', desc: 'Incidents', logo: 'https://cdn.simpleicons.org/pagerduty/06AC38' },
  { name: 'Vercel', desc: 'Deployment', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vercel/vercel-original.svg', invert: true },
];

const pricingPlans = [
  {
    name: 'Core',
    price: '$0',
    period: 'forever',
    description: 'Basic agent capabilities',
    features: [
      'AI Quality Score dashboard',
      'Code Analyzer agent',
      '1 project',
      'Production error monitoring',
      'Basic risk analysis',
      'Community support',
    ],
    cta: 'Deploy Free Agent',
    popular: false,
    badge: null,
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/month',
    description: 'Full agent suite',
    features: [
      'Everything in Core',
      'All 6 testing agents',
      'Unlimited integrations',
      '5 projects',
      'MCP tools for Claude Code',
      'Email support',
    ],
    cta: 'Unlock All Agents',
    popular: true,
    badge: 'All Agents',
  },
  {
    name: 'Team',
    price: '$149',
    period: '/month',
    description: 'Agents + Self-Healing',
    features: [
      'Everything in Pro',
      'Self-healing agent enabled',
      'Long-term memory (pgvector)',
      'Unlimited projects',
      'CI/CD deep integration',
      'Priority support',
    ],
    cta: 'Deploy Agent Fleet',
    popular: false,
    badge: 'Agents + Memory',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'Custom agent deployment',
    features: [
      'Everything in Team',
      'Visual regression agent',
      'Custom agent training',
      'Dedicated compute',
      'SSO/SAML & SLA',
      'Dedicated support',
    ],
    cta: 'Contact Sales',
    popular: false,
    badge: 'Enterprise Fleet',
  },
];

const stats = [
  { value: '10x', label: 'Faster Testing', desc: 'vs manual test writing' },
  { value: '70%', label: 'Less Maintenance', desc: 'with self-healing' },
  { value: '99.9%', label: 'Uptime', desc: 'edge-powered reliability' },
  { value: '<50ms', label: 'Response', desc: 'global edge network' },
];

const steps = [
  {
    num: '01',
    title: 'Point',
    desc: 'Point Skopaq at your codebase and running app. That\'s it.',
    icon: Target,
  },
  {
    num: '02',
    title: 'Learn',
    desc: 'Agents discover routes, APIs, and user flows autonomously.',
    icon: Brain,
  },
  {
    num: '03',
    title: 'Execute',
    desc: 'Real browser interaction via Computer Use API.',
    icon: Play,
  },
  {
    num: '04',
    title: 'Heal',
    desc: 'Self-Healer fixes broken tests automatically.',
    icon: RefreshCw,
  },
  {
    num: '05',
    title: 'Report',
    desc: 'Actionable insights, not just logs.',
    icon: BarChart3,
  },
];

// Hero rotating texts - Agentic messaging (Full-Stack)
const heroCapabilities = [
  {
    text: 'Agents That Understand',
    color: 'from-violet-400 to-purple-400',
    subheadline: 'Code Analyzer agent parses your entire stack—frontend, backend, APIs, database schemas. No configuration needed.'
  },
  {
    text: 'Agents That Decide',
    color: 'from-teal-400 to-cyan-400',
    subheadline: 'Test Planner agent creates risk-weighted test plans across UI, API, and data layers. Zero human prioritization.'
  },
  {
    text: 'Agents That Test Everything',
    color: 'from-amber-400 to-orange-400',
    subheadline: 'UI via Computer Use. APIs via schema validation. Databases via state verification. True full-stack coverage.'
  },
  {
    text: 'Agents That Self-Heal',
    color: 'from-emerald-400 to-teal-400',
    subheadline: 'Self-Healer agent reads git commits to understand WHY things changed—then fixes tests automatically. 99.9% accuracy.'
  },
  {
    text: 'Agents That Report',
    color: 'from-pink-400 to-rose-400',
    subheadline: 'Reporter agent correlates failures across UI, API, and DB layers. Root cause analysis, not just stack traces.'
  },
  {
    text: 'Agents That Learn',
    color: 'from-cyan-400 to-blue-400',
    subheadline: 'Every failure makes agents smarter. Long-term memory ensures your full-stack testing improves over time.'
  },
];

export function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [heroTextIndex, setHeroTextIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Typewriter effect for hero text
  useEffect(() => {
    const currentText = heroCapabilities[heroTextIndex].text;

    if (isTyping && !isDeleting) {
      if (displayedText.length < currentText.length) {
        const timeout = setTimeout(() => {
          setDisplayedText(currentText.slice(0, displayedText.length + 1));
        }, 50); // Typing speed
        return () => clearTimeout(timeout);
      } else {
        // Finished typing, wait then start deleting
        const timeout = setTimeout(() => {
          setIsDeleting(true);
        }, 2500); // Pause before deleting
        return () => clearTimeout(timeout);
      }
    }

    if (isDeleting) {
      if (displayedText.length > 0) {
        const timeout = setTimeout(() => {
          setDisplayedText(displayedText.slice(0, -1));
        }, 30); // Deleting speed (faster)
        return () => clearTimeout(timeout);
      } else {
        // Finished deleting, move to next text
        setIsDeleting(false);
        setHeroTextIndex((prev) => (prev + 1) % heroCapabilities.length);
      }
    }
  }, [displayedText, isTyping, isDeleting, heroTextIndex]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation - Dark transparent for hero */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-background" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">Skopaq</span>
            </Link>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#products" className="text-sm text-foreground/70 hover:text-foreground transition-colors">Products</a>
              <a href="#features" className="text-sm text-foreground/70 hover:text-foreground transition-colors">Features</a>
              <a href="#integrations" className="text-sm text-foreground/70 hover:text-foreground transition-colors">Integrations</a>
              <a href="#pricing" className="text-sm text-foreground/70 hover:text-foreground transition-colors">Pricing</a>
              <Link href="/legal" className="text-sm text-foreground/70 hover:text-foreground transition-colors">Legal</Link>
            </div>

            {/* Auth Buttons */}
            <AuthButtons variant="nav" />
          </div>
        </div>
      </nav>

      {/* Hero Section - Vanta RINGS Background */}
      <section className="relative overflow-hidden min-h-screen bg-background">
        {/* Vanta.js RINGS animated background */}
        <div className="absolute inset-0 z-0">
          <VantaBackground effect="rings" />
          {/* Gradient overlay for text readability on left */}
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-32 pb-24 min-h-screen flex items-center">
          <div className="grid lg:grid-cols-2 gap-12 items-center w-full">
            {/* Left Column - Text Content */}
            <div className="text-left">
              {/* Tagline - single line, smaller */}
              <motion.p
                className="text-sm sm:text-base font-medium tracking-widest uppercase text-muted-foreground mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                World&apos;s First Fully Autonomous Agentic AI Quality Platform
              </motion.p>

              {/* Headline with typewriter effect - PROMINENT */}
              <motion.h1
                className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
              >
                {/* Typewriter line - highlighted and glowing */}
                <span className="block min-h-[1.3em] relative">
                  <span
                    className={`bg-gradient-to-r ${heroCapabilities[heroTextIndex].color} bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(20,184,166,0.5)]`}
                    style={{
                      textShadow: '0 0 40px rgba(20, 184, 166, 0.3), 0 0 80px rgba(20, 184, 166, 0.2)'
                    }}
                  >
                    {displayedText}
                  </span>
                  {/* Glowing cursor */}
                  <motion.span
                    className="inline-block w-[4px] h-[0.85em] ml-2 rounded-full bg-gradient-to-b from-primary to-cyan-400 shadow-[0_0_20px_rgba(20,184,166,0.8)]"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                    style={{ verticalAlign: 'middle' }}
                  />
                </span>
              </motion.h1>

              {/* Subheadline - synced with capability */}
              <motion.p
                key={heroTextIndex}
                className="text-lg text-muted-foreground mb-8 max-w-md"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {heroCapabilities[heroTextIndex].subheadline}
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                className="flex flex-wrap gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <AuthButtons variant="hero" />
                <button className="px-6 py-3 rounded-full border border-border bg-muted/20 backdrop-blur-sm text-foreground font-medium hover:bg-muted/40 transition-all flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Watch Demo
                </button>
              </motion.div>

              {/* Powered by Claude */}
              <motion.div
                className="flex items-center gap-2 mt-8 text-sm text-muted-foreground/80"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <span>Powered by</span>
                <span className="flex items-center gap-1.5 text-[#D97757] font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="m3.127 10.604 3.135-1.76.053-.153-.053-.085H6.11l-.525-.032-1.791-.048-1.554-.065-1.505-.08-.38-.081L0 7.832l.036-.234.32-.214.455.04 1.009.069 1.513.105 1.097.064 1.626.17h.259l.036-.105-.089-.065-.068-.064-1.566-1.062-1.695-1.121-.887-.646-.48-.327-.243-.306-.104-.67.435-.48.585.04.15.04.593.456 1.267.981 1.654 1.218.242.202.097-.068.012-.049-.109-.181-.9-1.626-.96-1.655-.428-.686-.113-.411a2 2 0 0 1-.068-.484l.496-.674L4.446 0l.662.089.279.242.411.94.666 1.48 1.033 2.014.302.597.162.553.06.17h.105v-.097l.085-1.134.157-1.392.154-1.792.052-.504.25-.605.497-.327.387.186.319.456-.045.294-.19 1.23-.37 1.93-.243 1.29h.142l.161-.16.654-.868 1.097-1.372.484-.545.565-.601.363-.287h.686l.505.751-.226.775-.707.895-.585.759-.839 1.13-.524.904.048.072.125-.012 1.897-.403 1.024-.186 1.223-.21.553.258.06.263-.218.536-1.307.323-1.533.307-2.284.54-.028.02.032.04 1.029.098.44.024h1.077l2.005.15.525.346.315.424-.053.323-.807.411-3.631-.863-.872-.218h-.12v.073l.726.71 1.331 1.202 1.667 1.55.084.383-.214.302-.226-.032-1.464-1.101-.565-.497-1.28-1.077h-.084v.113l.295.432 1.557 2.34.08.718-.112.234-.404.141-.444-.08-.911-1.28-.94-1.44-.759-1.291-.093.053-.448 4.821-.21.246-.484.186-.403-.307-.214-.496.214-.98.258-1.28.21-1.016.19-1.263.112-.42-.008-.028-.092.012-.953 1.307-1.448 1.957-1.146 1.227-.274.109-.477-.247.045-.44.266-.39 1.586-2.018.956-1.25.617-.723-.004-.105h-.036l-4.212 2.736-.75.096-.324-.302.04-.496.154-.162 1.267-.871z"/>
                  </svg>
                  Claude
                </span>
              </motion.div>
            </div>

            {/* Right Column - Only 3 clean floating metrics */}
            <div className="relative h-[500px] lg:h-[600px] hidden lg:block">
              {/* Floating Metric Card 1 - 99.9% */}
              <motion.div
                className="absolute top-[15%] right-[10%]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <motion.div
                  className="px-6 py-4 rounded-2xl bg-[#1a1a2e]/80 backdrop-blur-xl border border-border"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">99.9%</div>
                      <div className="text-xs text-muted-foreground">Self-Healing Accuracy</div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Floating Metric Card 2 - 10x */}
              <motion.div
                className="absolute top-[45%] right-[5%]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1 }}
              >
                <motion.div
                  className="px-6 py-4 rounded-2xl bg-[#1a1a2e]/80 backdrop-blur-xl border border-border"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">10x</div>
                      <div className="text-xs text-muted-foreground">Faster Testing</div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Floating Metric Card 3 - Zero Touch */}
              <motion.div
                className="absolute top-[72%] right-[15%]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.2 }}
              >
                <motion.div
                  className="px-6 py-4 rounded-2xl bg-[#1a1a2e]/80 backdrop-blur-xl border border-border"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-foreground">Zero-Touch</div>
                      <div className="text-xs text-muted-foreground">Automation</div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* What Makes Us Agentic Section */}
      <section className="section-padding bg-gradient-to-b from-background to-card">
        <div className="container-wide px-6 lg:px-8">
          <ScrollReveal className="text-center mb-16">
            <h6 className="text-primary mb-3">THE AGENTIC DIFFERENCE</h6>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">
              Beyond AI-Assisted.<br />
              <span className="gradient-text">This is AI-Agentic.</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Other tools assist humans with suggestions. Skopaq agents make decisions and take actions autonomously.
            </p>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* AI-Assisted Column */}
            <div className="p-8 rounded-2xl bg-muted/10 backdrop-blur-sm border border-border/50 opacity-70">
              <h3 className="text-lg font-semibold mb-6 text-muted-foreground/80">AI-Assisted (Others)</h3>
              <ul className="space-y-4">
                {[
                  'You write tests, AI improves them',
                  'You identify what to test',
                  'You fix broken selectors',
                  'AI suggests next steps',
                  'Results need human interpretation',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-muted-foreground/80">
                    <div className="w-5 h-5 rounded-full bg-muted/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs text-muted-foreground/60">×</span>
                    </div>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* AI-Agentic Column */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-cyan-500/5 to-transparent backdrop-blur-xl border border-primary/30 shadow-[0_0_40px_hsl(var(--primary)/0.15)]">
              <h3 className="text-lg font-semibold mb-6 text-primary">AI-Agentic (Skopaq)</h3>
              <ul className="space-y-4">
                {[
                  'Agents discover and create tests',
                  'Agents analyze risk and prioritize',
                  'Agents self-heal automatically',
                  'Agents decide and execute autonomously',
                  'Agents report with root cause analysis',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground/90">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - New animated component */}
      <StatsSection />

      {/* Integration Logos Carousel */}
      <IntegrationLogos title="Seamlessly integrates with your favorite AI-powered editors and tools" />

      {/* Product Showcase - Animated Dashboard Preview */}
      <ProductShowcase
        title="Experience the Future of Testing"
        subtitle="Watch Skopaq automatically generate, execute, and heal tests in real-time"
      />

      {/* How It Works */}
      <section id="how-it-works" className="section-padding bg-gradient-to-b from-card to-background">
        <div className="container-wide px-6 lg:px-8">
          <ScrollReveal className="text-center mb-16">
            <h6 className="text-primary mb-3">HOW IT WORKS</h6>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">
              Set It. Forget It.<br />
              <span className="gradient-text">Trust It.</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              One command starts an autonomous testing cycle that runs continuously.
            </p>
          </ScrollReveal>

          <StaggerContainer className="grid md:grid-cols-5 gap-6" staggerDelay={0.1}>
            {steps.map((step, i) => (
              <StaggerItem key={i} className="relative">
                <div className="p-6 h-full group text-center rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-xl border border-border hover:border-primary/30 hover:shadow-[0_0_30px_hsl(var(--primary)/0.1)] transition-all duration-300">
                  <div className="text-4xl font-bold bg-gradient-to-b from-primary/40 to-primary/10 bg-clip-text text-transparent mb-3 group-hover:from-primary/60 group-hover:to-primary/20 transition-all">{step.num}</div>
                  <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-black/30">
                    <step.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">{step.title}</h3>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
                {i < 4 && (
                  <ChevronRight className="hidden md:block absolute top-1/2 -right-3 w-6 h-6 text-primary/30 -translate-y-1/2 z-10" />
                )}
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Meet Your Testing Agents */}
      <section id="products" className="section-padding bg-background">
        <div className="container-wide px-6 lg:px-8">
          <ScrollReveal className="text-center mb-16">
            <h6 className="text-primary mb-3">MEET YOUR TESTING AGENTS</h6>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">
              Six Specialized Agents.<br />
              <span className="gradient-text">One Unified Mission.</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Each agent is purpose-built for a specific task, coordinated by a supervisor that routes work intelligently.
            </p>
          </ScrollReveal>

          <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto" staggerDelay={0.1}>
            {[
              {
                name: 'Code Analyzer',
                icon: FileSearch,
                tagline: 'Understands any codebase',
                desc: 'Autonomously parses your application structure, identifies routes, APIs, and authentication flows. No configuration required.',
                color: 'from-violet-500 to-purple-500',
                glow: 'violet'
              },
              {
                name: 'Test Planner',
                icon: Target,
                tagline: 'Prioritizes what matters',
                desc: 'Creates risk-weighted test plans based on code changes, production errors, and business criticality.',
                color: 'from-teal-500 to-cyan-500',
                glow: 'teal'
              },
              {
                name: 'UI Tester',
                icon: Eye,
                tagline: 'Tests like a human',
                desc: 'Uses Claude Computer Use API to actually see and interact with your UI. Clicks, types, navigates - exactly like a real user.',
                color: 'from-amber-500 to-orange-500',
                glow: 'amber'
              },
              {
                name: 'API Tester',
                icon: Code2,
                tagline: 'Validates every endpoint',
                desc: 'Tests your REST and GraphQL APIs with schema validation, authentication flows, and edge case coverage.',
                color: 'from-cyan-500 to-blue-500',
                glow: 'cyan'
              },
              {
                name: 'Self-Healer',
                icon: RefreshCw,
                tagline: 'Fixes before you notice',
                desc: 'Analyzes git history to find new selectors and fixes tests automatically. 99.9% accuracy - not DOM heuristics guessing.',
                color: 'from-emerald-500 to-teal-500',
                glow: 'emerald'
              },
              {
                name: 'Reporter',
                icon: BarChart3,
                tagline: 'Explains what happened',
                desc: 'Generates human-readable reports with root cause analysis, not just stack traces. Integrates with GitHub, Slack, and CI/CD.',
                color: 'from-pink-500 to-rose-500',
                glow: 'pink'
              },
            ].map((agent, i) => (
              <StaggerItem key={i} animation="scale">
                <div className={`p-8 h-full group rounded-2xl relative overflow-hidden
                  bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent
                  backdrop-blur-xl border border-border
                  hover:border-${agent.glow}-500/40
                  transition-all duration-500
                  shadow-[0_8px_32px_rgba(0,0,0,0.4)]
                  hover:shadow-[0_8px_40px_rgba(0,0,0,0.5),0_0_60px_hsl(var(--primary)/0.1)]`}>
                  {/* Gradient glow on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${agent.color} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500 pointer-events-none`} />
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${agent.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-black/40`}>
                    <agent.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1 text-foreground">{agent.name}</h3>
                  <p className="text-sm text-primary font-medium mb-3">&ldquo;{agent.tagline}&rdquo;</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{agent.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="section-padding bg-gradient-to-b from-background via-card to-background">
        <div className="container-wide px-6 lg:px-8">
          <ScrollReveal className="text-center mb-16">
            <h6 className="text-primary mb-3">AGENT CAPABILITIES</h6>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">
              What Your Agents<br />
              <span className="gradient-text">Can Do</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Each capability is powered by specialized agents working autonomously
            </p>
          </ScrollReveal>

          <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.1}>
            {features.map((feature, i) => (
              <StaggerItem key={i} animation="scale">
                <div
                  className={`p-8 cursor-default transition-all duration-500 h-full rounded-2xl
                    bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent
                    backdrop-blur-xl border
                    ${activeFeature === i
                      ? 'border-primary/50 shadow-[0_0_50px_hsl(var(--primary)/0.15)]'
                      : 'border-border hover:border-border'
                    }`}
                  onMouseEnter={() => setActiveFeature(i)}
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 transition-transform hover:scale-110 shadow-lg shadow-black/40`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* The Agentic Advantage */}
      <section className="section-padding bg-background">
        <div className="container-wide px-6 lg:px-8">
          <ScrollReveal className="text-center mb-16">
            <h6 className="text-primary mb-3">THE AGENTIC ADVANTAGE</h6>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">
              Why Agentic Testing<br />
              <span className="gradient-text">Changes Everything</span>
            </h2>
          </ScrollReveal>

          <StaggerContainer className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto" staggerDelay={0.15}>
            {[
              {
                icon: Lightbulb,
                title: 'Autonomous Decision-Making',
                desc: 'Agents analyze your code, git history, and production errors to autonomously prioritize testing. No human needed to decide what to test.',
                highlight: 'Changed the checkout flow? Agents know to test it first.',
                gradient: 'from-amber-500 to-orange-500'
              },
              {
                icon: GitBranch,
                title: 'Self-Healing That Actually Works',
                desc: 'Other tools use brittle DOM heuristics. Skopaq reads your git commits to understand WHY a selector changed.',
                highlight: '99.9% accuracy - code-aware, not guessing.',
                gradient: 'from-emerald-500 to-teal-500'
              },
              {
                icon: Brain,
                title: 'Long-Term Memory & Learning',
                desc: 'Every failure makes Skopaq smarter. Healing patterns are stored in a semantic memory store (pgvector).',
                highlight: 'Your testing gets better over time, automatically.',
                gradient: 'from-violet-500 to-purple-500'
              },
            ].map((item, i) => (
              <StaggerItem key={i} animation="fadeUp">
                <div className="p-8 h-full rounded-2xl relative overflow-hidden
                  bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent
                  backdrop-blur-xl border border-border
                  hover:border-primary/30 hover:shadow-[0_0_40px_hsl(var(--primary)/0.1)]
                  transition-all duration-500 group">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-6 shadow-lg shadow-black/40 group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-foreground">{item.title}</h3>
                  <p className="text-muted-foreground mb-4 leading-relaxed">{item.desc}</p>
                  <p className="text-sm font-medium bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">{item.highlight}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Game-Changing Capabilities */}
      <section className="section-padding bg-gradient-to-b from-background to-card">
        <div className="container-wide px-6 lg:px-8">
          <ScrollReveal className="text-center mb-16">
            <h6 className="text-primary mb-3">CUTTING-EDGE TECHNOLOGY</h6>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">
              Features That<br />
              <span className="gradient-text">Change the Game</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Not just another testing tool. This is next-generation infrastructure.
            </p>
          </ScrollReveal>

          <div className="grid lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {/* MCP Server */}
            <div className="p-8 rounded-2xl relative overflow-hidden group bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent backdrop-blur-xl border border-border hover:border-violet-500/30 transition-all duration-500">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-violet-500/20 to-purple-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                    <Terminal className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">MCP Server for AI IDEs</h3>
                    <p className="text-xs text-muted-foreground/80">Claude Code · Cursor · Windsurf</p>
                  </div>
                </div>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Test directly from your IDE. Our MCP server brings Skopaq into Claude Code, Cursor, and any MCP-compatible editor.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['argus_discover', 'argus_act', 'argus_test', 'argus_agent'].map((tool) => (
                    <span key={tool} className="text-xs px-2.5 py-1 rounded-lg bg-violet-500/15 text-violet-400 font-mono border border-violet-500/20">{tool}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Global Edge Testing */}
            <div className="p-8 rounded-2xl relative overflow-hidden group bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent backdrop-blur-xl border border-border hover:border-cyan-500/30 transition-all duration-500">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/20 to-blue-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Global Edge Testing</h3>
                    <p className="text-xs text-muted-foreground/80">300+ Cloudflare Locations</p>
                  </div>
                </div>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Test from real user locations worldwide. Catch geo-specific issues, measure actual latency, zero infrastructure to manage.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['US East', 'UK', 'Germany', 'Japan', 'Singapore', 'Australia'].map((loc) => (
                    <span key={loc} className="text-xs px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">{loc}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Infra Cost Optimization */}
            <div className="p-8 rounded-2xl relative overflow-hidden group bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent backdrop-blur-xl border border-border hover:border-emerald-500/30 transition-all duration-500">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">AI Infrastructure Management</h3>
                    <p className="text-xs text-muted-foreground/80">Cost Optimization + Auto-Scaling</p>
                  </div>
                </div>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Track spend across Vultr, Railway, Cloudflare, and AI costs. Get AI-powered recommendations and apply optimizations with one click.
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-emerald-400 font-medium">↓ 40% cost reduction</span>
                  <span className="text-muted-foreground/80">avg. after optimization</span>
                </div>
              </div>
            </div>

            {/* Multi-Modal Visual Testing */}
            <div className="p-8 rounded-2xl relative overflow-hidden group bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent backdrop-blur-xl border border-border hover:border-pink-500/30 transition-all duration-500">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-pink-500/20 to-rose-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Multi-Modal Visual AI</h3>
                    <p className="text-xs text-muted-foreground/80">Claude Vision · GPT-4V · Gemini</p>
                  </div>
                </div>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Visual regression testing with cross-model validation. Detects layout, content, and style changes with intelligent severity scoring.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Layout', 'Content', 'Style', 'Missing Elements'].map((type) => (
                    <span key={type} className="text-xs px-2.5 py-1 rounded-lg bg-pink-500/15 text-pink-400 border border-pink-500/20">{type}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Multi-Language Export */}
            <div className="p-8 rounded-2xl relative overflow-hidden group bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent backdrop-blur-xl border border-border hover:border-amber-500/30 transition-all duration-500">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-500/20 to-orange-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Code2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Multi-Language Test Export</h3>
                    <p className="text-xs text-muted-foreground/80">Generate Production-Ready Code</p>
                  </div>
                </div>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Export tests to Python, TypeScript, Java, C#, Ruby, or Go. Framework-specific best practices included.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Playwright', 'Cypress', 'Selenium', 'Puppeteer', 'pytest'].map((fw) => (
                    <span key={fw} className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/20">{fw}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* WCAG Accessibility */}
            <div className="p-8 rounded-2xl relative overflow-hidden group bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent backdrop-blur-xl border border-border hover:border-indigo-500/30 transition-all duration-500">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-500/20 to-violet-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">WCAG 2.1 Accessibility Audit</h3>
                    <p className="text-xs text-muted-foreground/80">Level AA Compliance</p>
                  </div>
                </div>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Automatic a11y testing for perceivable, operable, understandable, and robust criteria. Fix suggestions included.
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-indigo-400 font-medium">WCAG 2.1 AA</span>
                  <span className="text-muted-foreground/80">· ADA Compliant</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Quality Score Section */}
      <section className="section-padding bg-card">
        <div className="container-wide px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h6 className="text-primary mb-3">AI QUALITY INTELLIGENCE</h6>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-foreground">
                Your Codebase's
                <br />
                <span className="gradient-text">Health Score</span>
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed text-lg">
                Get a comprehensive view of your software quality with AI-powered metrics,
                predictive insights, and actionable recommendations.
              </p>
              <ul className="space-y-4">
                {[
                  'Real-time quality monitoring across all projects',
                  'Predictive bug detection using pattern analysis',
                  'Risk-prioritized test recommendations',
                  'Trend analysis and team performance insights',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/80">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quality Score Card */}
            <div className="p-8 lg:p-10 rounded-2xl bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent backdrop-blur-xl border border-border">
              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-4 border-emerald-500/30 mb-4 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                  <span className="text-5xl font-bold text-emerald-400">A+</span>
                </div>
                <div className="text-lg font-medium text-foreground">AI Quality Score</div>
                <div className="text-sm text-muted-foreground/80">Updated 2 min ago</div>
              </div>

              <div className="space-y-6">
                {[
                  { label: 'Test Coverage', value: 94, color: 'bg-emerald-500' },
                  { label: 'Error Resolution', value: 88, color: 'bg-teal-500' },
                  { label: 'Code Health', value: 96, color: 'bg-cyan-500' },
                  { label: 'Risk Score', value: 92, color: 'bg-primary' },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-semibold text-foreground">{item.value}%</span>
                    </div>
                    <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-1000`}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section id="integrations" className="section-padding bg-background">
        <div className="container-wide px-6 lg:px-8">
          <div className="text-center mb-16">
            <h6 className="text-primary mb-3">INTEGRATIONS</h6>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">Works With Your Stack</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Connect your existing tools in minutes with our native integrations
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-8">
            {integrations.map((integration, i) => (
              <div
                key={i}
                className="p-6 text-center rounded-xl bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent backdrop-blur-xl border border-border hover:border-primary/30 transition-all duration-300 group"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-muted/30 border border-border flex items-center justify-center group-hover:scale-110 group-hover:bg-muted/50 transition-all">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={integration.logo}
                    alt={integration.name}
                    className="w-7 h-7 object-contain"
                    style={{
                      filter: integration.invert ? 'invert(1) brightness(1.2)' : 'brightness(1.1) saturate(1.2)',
                    }}
                  />
                </div>
                <div className="font-medium mb-1 text-foreground">{integration.name}</div>
                <div className="text-xs text-muted-foreground">{integration.desc}</div>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground/80">
            + FullStory, LogRocket, NewRelic, Bugsnag, Rollbar, and 15 more
          </p>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="section-padding bg-gradient-to-b from-background to-card">
        <div className="container-wide px-6 lg:px-8">
          <div className="text-center mb-16">
            <h6 className="text-primary mb-3">THE AUTONOMOUS WORKFLOW</h6>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">
              From Broken Code to<br />
              <span className="gradient-text">Working Software</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Agents autonomously understand, validate, suggest, and deliver - turning AI-generated code into production-ready software.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {workflowSteps.map((step, i) => (
              <div key={i} className="p-8 text-center relative group rounded-2xl bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent backdrop-blur-xl border border-border hover:border-primary/30 transition-all duration-300">
                <div className={`w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-black/40`}>
                  <step.icon className="w-7 h-7 text-white" />
                </div>
                <div className="text-xs font-bold text-primary/60 mb-2">{step.num}</div>
                <h3 className="text-xl font-bold mb-1 text-foreground">{step.title}</h3>
                <p className="text-sm text-primary font-medium mb-3">{step.subtitle}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Comparison */}
      <section className="section-padding bg-background">
        <div className="container-tight px-6 lg:px-8">
          <div className="p-12 lg:p-16 relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent backdrop-blur-2xl border border-border">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-[100px]" />
              <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-primary/20 rounded-full blur-[100px]" />
            </div>

            <div className="relative grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h6 className="text-primary mb-3">FROM AI-ASSISTED TO AI-AGENTIC</h6>
                <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-foreground">
                  The Autonomous<br />
                  <span className="gradient-text">Testing Difference</span>
                </h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Traditional AI testing assists humans. Agentic testing replaces the need for human intervention entirely.
                </p>
                <AuthButtons variant="hero" />
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground/80">Traditional AI Testing</span>
                      <span className="text-2xl font-bold text-muted-foreground/80">42%</span>
                    </div>
                    <div className="h-4 bg-muted/40 rounded-full overflow-hidden">
                      <div className="h-full bg-white/20 rounded-full" style={{ width: '42%' }} />
                    </div>
                    <p className="text-xs text-muted-foreground/60 mt-1">Manual test creation with AI hints</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-emerald-400">Skopaq Agentic Testing</span>
                      <span className="text-2xl font-bold text-emerald-400">93%</span>
                    </div>
                    <div className="h-4 bg-muted/40 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000" style={{ width: '93%' }} />
                    </div>
                    <p className="text-xs text-emerald-400/80 mt-1">Fully autonomous with self-healing</p>
                  </div>
                </div>

                <div className="text-center pt-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-400">+121% Test Coverage</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section-padding bg-gradient-to-b from-background to-card">
        <div className="container-wide px-6 lg:px-8">
          <div className="text-center mb-16">
            <h6 className="text-primary mb-3">TESTIMONIALS</h6>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">
              Teams Trust<br />
              <span className="gradient-text">Autonomous Agents</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Engineering teams worldwide have deployed Skopaq agents to eliminate test maintenance forever.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="p-6 rounded-2xl bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent backdrop-blur-xl border border-border hover:border-primary/30 transition-all duration-300">
                <Quote className="w-8 h-8 text-primary/30 mb-4" />
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed italic">
                  &quot;{testimonial.quote}&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{testimonial.author[0]}</span>
                  </div>
                  <div>
                    <div className="font-medium text-sm text-foreground">{testimonial.author}</div>
                    <div className="text-xs text-muted-foreground/80">{testimonial.role} · {testimonial.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="section-padding bg-background">
        <div className="container-wide px-6 lg:px-8">
          <div className="text-center mb-16">
            <h6 className="text-primary mb-3">PRICING</h6>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Start free, scale as you grow. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <div
                key={i}
                className={`relative p-8 rounded-2xl backdrop-blur-xl transition-all duration-500 group ${
                  plan.popular
                    ? 'bg-gradient-to-br from-primary/20 via-cyan-500/10 to-transparent border-2 border-primary/50 shadow-[0_0_60px_hsl(var(--primary)/0.2)]'
                    : 'bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent border border-border hover:border-border hover:shadow-[0_0_30px_rgba(0,0,0,0.3)]'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1.5 text-xs font-semibold rounded-full bg-gradient-to-r from-primary to-cyan-500 text-black shadow-lg shadow-primary/30">Most Popular</span>
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-2 text-foreground">Skopaq {plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className={`text-4xl font-bold ${plan.popular ? 'text-primary' : 'text-foreground'}`}>{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground/80">{plan.period}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{plan.description}</p>
                  {plan.badge && (
                    <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${plan.popular ? 'text-primary' : 'text-emerald-500'}`} />
                      <span className="text-foreground/70">{feature}</span>
                    </li>
                  ))}
                </ul>

                <AuthButtons variant="pricing" ctaText={plan.cta} popular={plan.popular} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-background">
        <div className="container-tight px-6 lg:px-8">
          <div className="p-12 lg:p-16 text-center relative overflow-hidden rounded-3xl
            bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent
            backdrop-blur-2xl border border-border
            shadow-[0_0_80px_hsl(var(--primary)/0.1)]">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-br from-primary/30 to-cyan-500/20 rounded-full blur-[100px]" />
              <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-gradient-to-br from-violet-500/20 to-primary/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-foreground">
                Deploy Autonomous Testing<br />
                <span className="gradient-text">Agents Today.</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-10 max-w-xl mx-auto">
                One command. Autonomous agents. Zero test maintenance.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <AuthButtons variant="cta" />
                <a
                  href="https://github.com/skopaq/skopaq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-glass px-6 py-3.5 text-base rounded-xl"
                >
                  <Github className="w-5 h-5" />
                  View on GitHub
                </a>
              </div>
              <p className="text-sm text-muted-foreground/80 mt-6">
                No credit card required · Free forever tier
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="section-padding bg-gradient-to-b from-background to-card">
        <div className="container-tight px-6 lg:px-8">
          <div className="text-center mb-16">
            <h6 className="text-primary mb-3">FAQ</h6>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            {faqItems.map((item, i) => (
              <details key={i} className="group rounded-xl bg-gradient-to-br from-white/[0.05] to-transparent backdrop-blur-xl border border-border hover:border-border transition-all duration-300">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="font-medium pr-4 text-foreground">{item.question}</span>
                  <ChevronDown className="w-5 h-5 text-primary group-open:rotate-180 transition-transform flex-shrink-0" />
                </summary>
                <div className="px-6 pb-6 pt-0">
                  <p className="text-muted-foreground leading-relaxed">{item.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 lg:px-8 border-t border-border bg-background">
        <div className="container-wide">
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
            {/* Brand */}
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">Skopaq</span>
              </Link>
              <p className="text-muted-foreground mb-4 max-w-sm">
                World&apos;s first fully autonomous agentic AI quality intelligence platform. Autonomous agents that understand, test, heal, and report - without human intervention.
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                <a href="mailto:hello@skopaq.ai" className="hover:text-foreground transition-colors">hello@skopaq.ai</a>
              </p>
              <div className="flex items-center gap-4">
                <a href="https://github.com/skopaq/skopaq" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground p-2 hover:bg-muted/40 rounded-lg transition-colors">
                  <Github className="w-5 h-5" />
                </a>
                <a href="https://twitter.com/argaborai" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground p-2 hover:bg-muted/40 rounded-lg transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="https://linkedin.com/company/raphaenterprises" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground p-2 hover:bg-muted/40 rounded-lg transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h6 className="font-semibold mb-4">Product</h6>
              <ul className="space-y-3">
                <li><a href="#features" className="text-sm link-subtle">Features</a></li>
                <li><a href="#pricing" className="text-sm link-subtle">Pricing</a></li>
                <li><Link href="/integrations" className="text-sm link-subtle">Integrations</Link></li>
                <li><Link href="/dashboard" className="text-sm link-subtle">Dashboard</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h6 className="font-semibold mb-4">Resources</h6>
              <ul className="space-y-3">
                <li>
                  <a href="https://docs.skopaq.ai" target="_blank" rel="noopener noreferrer" className="text-sm link-subtle inline-flex items-center gap-1">
                    Documentation <ArrowUpRight className="w-3 h-3" />
                  </a>
                </li>
                <li><Link href="/api-docs" className="text-sm link-subtle">API Reference</Link></li>
                <li>
                  <a href="https://github.com/skopaq/skopaq" target="_blank" rel="noopener noreferrer" className="text-sm link-subtle inline-flex items-center gap-1">
                    GitHub <ArrowUpRight className="w-3 h-3" />
                  </a>
                </li>
                <li><Link href="/legal/licenses" className="text-sm link-subtle">Open Source</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h6 className="font-semibold mb-4">Legal</h6>
              <ul className="space-y-3">
                <li><Link href="/legal/privacy" className="text-sm link-subtle">Privacy Policy</Link></li>
                <li><Link href="/legal/terms" className="text-sm link-subtle">Terms of Service</Link></li>
                <li><Link href="/legal/security" className="text-sm link-subtle">Security</Link></li>
                <li><Link href="/legal/gdpr" className="text-sm link-subtle">GDPR</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground" suppressHydrationWarning>
              © {new Date().getFullYear()} Skopaq. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
