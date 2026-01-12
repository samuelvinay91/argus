'use client';

import { useMemo, useState } from 'react';

interface Logo {
  name: string;
  src: string;
  category?: 'ci-cd' | 'framework' | 'cloud' | 'monitoring';
}

interface IntegrationLogosProps {
  logos?: Logo[];
  title?: string;
  speed?: 'slow' | 'normal' | 'fast';
}

// Using Devicon CDN - comprehensive tech icon library with all major brands
// https://devicon.dev/
const defaultLogos: Logo[] = [
  // CI/CD
  { name: 'GitHub', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg', category: 'ci-cd' },
  { name: 'GitLab', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/gitlab/gitlab-original.svg', category: 'ci-cd' },
  { name: 'Jenkins', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jenkins/jenkins-original.svg', category: 'ci-cd' },
  { name: 'CircleCI', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/circleci/circleci-plain.svg', category: 'ci-cd' },
  // Frameworks
  { name: 'Selenium', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/selenium/selenium-original.svg', category: 'framework' },
  { name: 'Cypress', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cypressio/cypressio-original.svg', category: 'framework' },
  { name: 'Puppeteer', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/puppeteer/puppeteer-original.svg', category: 'framework' },
  { name: 'Jest', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jest/jest-plain.svg', category: 'framework' },
  // Cloud
  { name: 'AWS', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original-wordmark.svg', category: 'cloud' },
  { name: 'Azure', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg', category: 'cloud' },
  { name: 'Google Cloud', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/googlecloud/googlecloud-original.svg', category: 'cloud' },
  // Monitoring
  { name: 'Slack', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/slack/slack-original.svg', category: 'monitoring' },
  { name: 'Sentry', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sentry/sentry-original.svg', category: 'monitoring' },
  { name: 'Datadog', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/datadog/datadog-original.svg', category: 'monitoring' },
];

const speedMap = {
  slow: '60s',
  normal: '40s',
  fast: '25s',
};

export function IntegrationLogos({
  logos = defaultLogos,
  title = 'Seamlessly integrates with your favorite tools',
  speed = 'normal',
}: IntegrationLogosProps) {
  const duplicatedLogos = useMemo(() => [...logos, ...logos], [logos]);
  const animationDuration = speedMap[speed];
  const [loadedLogos, setLoadedLogos] = useState<Set<string>>(new Set());

  const handleImageLoad = (logoName: string) => {
    setLoadedLogos(prev => new Set(prev).add(logoName));
  };

  return (
    <section className="py-16 px-6 lg:px-8 overflow-hidden border-y border-border/30">
      <div className="max-w-7xl mx-auto">
        {title && (
          <p className="text-center text-sm text-muted-foreground mb-10">
            {title}
          </p>
        )}

        <div className="relative">
          {/* Gradient masks */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

          {/* Scrolling container */}
          <div
            className="flex items-center gap-16"
            style={{
              animation: `scroll ${animationDuration} linear infinite`,
              width: 'max-content',
            }}
          >
            {duplicatedLogos.map((logo, index) => (
              <div
                key={`${logo.name}-${index}`}
                className="group flex flex-col items-center gap-3 flex-shrink-0"
              >
                <div className="w-12 h-12 flex items-center justify-center opacity-40 hover:opacity-100 transition-all duration-300 hover:scale-110">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logo.src}
                    alt={logo.name}
                    width={40}
                    height={40}
                    className={`w-10 h-10 object-contain transition-opacity duration-300 ${
                      loadedLogos.has(logo.name) ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{
                      // Invert dark icons (GitHub, CircleCI) to white for dark backgrounds
                      filter: ['GitHub', 'CircleCI'].includes(logo.name) ? 'invert(1)' : undefined,
                    }}
                    onLoad={() => handleImageLoad(logo.name)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground/60 group-hover:text-muted-foreground transition-colors duration-300">
                  {logo.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}

export default IntegrationLogos;
