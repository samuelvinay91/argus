'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatedCounter } from '../ui/animated-counter';
import { TrendingUp, TrendingDown, Users, Globe, Building2, TestTube2 } from 'lucide-react';

interface Stat {
  value: number;
  displayValue?: string;
  suffix?: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  gradient?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
}

interface StatsSectionProps {
  stats?: Stat[];
  title?: string;
  subtitle?: string;
}

const defaultStats: Stat[] = [
  {
    value: 1.2,
    displayValue: '1.2B',
    suffix: '+',
    label: 'Tests Run',
    description: 'Automated tests executed globally',
    icon: <TestTube2 className="w-6 h-6" />,
    gradient: 'from-teal-500 to-cyan-500',
    trend: { value: 23, direction: 'up' },
  },
  {
    value: 2,
    displayValue: '2M',
    suffix: '+',
    label: 'Users',
    description: 'Developers shipping with confidence',
    icon: <Users className="w-6 h-6" />,
    gradient: 'from-violet-500 to-purple-500',
    trend: { value: 18, direction: 'up' },
  },
  {
    value: 10,
    displayValue: '10K',
    suffix: '+',
    label: 'Enterprises',
    description: 'Companies trusting Argus',
    icon: <Building2 className="w-6 h-6" />,
    gradient: 'from-amber-500 to-orange-500',
    trend: { value: 12, direction: 'up' },
  },
  {
    value: 132,
    displayValue: '132',
    label: 'Countries',
    description: 'Global reach across continents',
    icon: <Globe className="w-6 h-6" />,
    gradient: 'from-emerald-500 to-teal-500',
  },
];

export function StatsSection({
  stats = defaultStats,
  title,
  subtitle,
}: StatsSectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(section);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section ref={sectionRef} className="py-20 px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2" />
        <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-[100px] -translate-y-1/2" />
      </div>

      <div className="max-w-6xl mx-auto relative">
        {/* Optional title and subtitle */}
        {(title || subtitle) && (
          <div className="text-center mb-12">
            {title && (
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">{title}</h2>
            )}
            {subtitle && (
              <p className="text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
            )}
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`
                relative group
                transition-all duration-500 ease-out
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
              `}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Glass card with gradient overlay */}
              <div className="relative h-full rounded-2xl border border-white/10 bg-background/50 backdrop-blur-xl overflow-hidden hover:border-white/20 transition-colors">
                {/* Gradient overlay */}
                <div
                  className={`
                    absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300
                    bg-gradient-to-br ${stat.gradient || 'from-primary to-primary/50'}
                  `}
                />

                {/* Top gradient accent line */}
                <div
                  className={`
                    absolute top-0 left-0 right-0 h-1
                    bg-gradient-to-r ${stat.gradient || 'from-primary to-primary/50'}
                    opacity-80
                  `}
                />

                {/* Content */}
                <div className="relative p-6">
                  {/* Icon with gradient background */}
                  <div
                    className={`
                      w-12 h-12 rounded-xl mb-4
                      bg-gradient-to-br ${stat.gradient || 'from-primary to-primary/50'}
                      flex items-center justify-center text-white
                      group-hover:scale-110 transition-transform duration-300
                    `}
                  >
                    {stat.icon}
                  </div>

                  {/* Value display */}
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-bold tracking-tight">
                      {stat.displayValue || stat.value}
                    </span>
                    {stat.suffix && (
                      <span className="text-2xl font-bold text-primary">
                        {stat.suffix}
                      </span>
                    )}
                  </div>

                  {/* Label */}
                  <div className="text-lg font-semibold text-foreground mb-1">
                    {stat.label}
                  </div>

                  {/* Description */}
                  {stat.description && (
                    <p className="text-sm text-muted-foreground">
                      {stat.description}
                    </p>
                  )}

                  {/* Trend indicator */}
                  {stat.trend && (
                    <div
                      className={`
                        absolute top-4 right-4
                        flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                        ${stat.trend.direction === 'up'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-rose-500/10 text-rose-500'
                        }
                      `}
                    >
                      {stat.trend.direction === 'up' ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>{stat.trend.value}%</span>
                    </div>
                  )}
                </div>

                {/* Subtle shine effect on hover */}
                <div
                  className="
                    absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500
                    bg-gradient-to-r from-transparent via-white/5 to-transparent
                    -translate-x-full group-hover:translate-x-full
                    pointer-events-none
                  "
                  style={{ transition: 'transform 0.8s ease-out, opacity 0.3s ease-out' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
