/**
 * @file Footer Component Tests
 * Tests for the Footer (landing page) layout component
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from '@/components/layout/footer';

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('Footer Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders the footer element', () => {
      render(<Footer />);
      expect(document.querySelector('footer')).toBeInTheDocument();
    });

    it('renders the Skopaq brand name', () => {
      render(<Footer />);
      expect(screen.getByText('Skopaq')).toBeInTheDocument();
    });

    it('renders brand description', () => {
      render(<Footer />);
      expect(screen.getByText(/AI-powered end-to-end testing/i)).toBeInTheDocument();
    });

    it('renders the Eye logo icon', () => {
      const { container } = render(<Footer />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Product Section', () => {
    it('renders Product section heading', () => {
      render(<Footer />);
      expect(screen.getByRole('heading', { name: 'Product' })).toBeInTheDocument();
    });

    it('renders Features link', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: 'Features' });
      expect(link).toHaveAttribute('href', '/features');
    });

    it('renders Pricing link', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: 'Pricing' });
      expect(link).toHaveAttribute('href', '/pricing');
    });

    it('renders Integrations link', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: 'Integrations' });
      expect(link).toHaveAttribute('href', '/integrations');
    });

    it('renders Documentation link', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: 'Documentation' });
      expect(link).toHaveAttribute('href', '/docs');
    });
  });

  describe('Company Section', () => {
    it('renders Company section heading', () => {
      render(<Footer />);
      expect(screen.getByRole('heading', { name: 'Company' })).toBeInTheDocument();
    });

    it('renders About link', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: 'About' });
      expect(link).toHaveAttribute('href', '/about');
    });

    it('renders Blog link', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: 'Blog' });
      expect(link).toHaveAttribute('href', '/blog');
    });

    it('renders Careers link', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: 'Careers' });
      expect(link).toHaveAttribute('href', '/careers');
    });

    it('renders Contact link', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: 'Contact' });
      expect(link).toHaveAttribute('href', '/contact');
    });
  });

  describe('Legal Section', () => {
    it('renders Legal section heading', () => {
      render(<Footer />);
      expect(screen.getByRole('heading', { name: 'Legal' })).toBeInTheDocument();
    });

    it('renders Terms of Service link', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: 'Terms of Service' });
      expect(link).toHaveAttribute('href', '/legal/terms');
    });

    it('renders Privacy Policy link', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: 'Privacy Policy' });
      expect(link).toHaveAttribute('href', '/legal/privacy');
    });

    it('renders Security link in Legal section', () => {
      render(<Footer />);
      // There are multiple Security links, get the one in Legal section
      const links = screen.getAllByRole('link', { name: 'Security' });
      expect(links.some(link => link.getAttribute('href') === '/legal/security')).toBe(true);
    });

    it('renders GDPR DPA link', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: 'GDPR DPA' });
      expect(link).toHaveAttribute('href', '/legal/gdpr');
    });

    it('renders Licenses link', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: 'Licenses' });
      expect(link).toHaveAttribute('href', '/legal/licenses');
    });
  });

  describe('Support Section', () => {
    it('renders Support section heading', () => {
      render(<Footer />);
      expect(screen.getByRole('heading', { name: 'Support' })).toBeInTheDocument();
    });

    it('renders Help Center link', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: 'Help Center' });
      expect(link).toHaveAttribute('href', '/help');
    });

    it('renders Status link as external', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: 'Status' });
      expect(link).toHaveAttribute('href', 'https://status.skopaq.ai');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders API Reference link', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: 'API Reference' });
      expect(link).toHaveAttribute('href', '/api');
    });

    it('renders Contact Us link as mailto', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: 'Contact Us' });
      expect(link).toHaveAttribute('href', 'mailto:hello@skopaq.ai');
    });
  });

  describe('Bottom Section', () => {
    it('renders copyright notice with current year', () => {
      render(<Footer />);
      expect(screen.getByText(/© 2024 Skopaq Technologies\. All rights reserved\./)).toBeInTheDocument();
    });

    it('renders bottom Terms link', () => {
      render(<Footer />);
      const links = screen.getAllByRole('link', { name: 'Terms' });
      expect(links.length).toBeGreaterThan(0);
    });

    it('renders bottom Privacy link', () => {
      render(<Footer />);
      const links = screen.getAllByRole('link', { name: 'Privacy' });
      expect(links.length).toBeGreaterThan(0);
    });
  });

  describe('Brand Section', () => {
    it('brand logo links to home', () => {
      render(<Footer />);
      const brandLink = screen.getByRole('link', { name: /Skopaq/i });
      expect(brandLink).toHaveAttribute('href', '/');
    });

    it('logo has correct styling', () => {
      const { container } = render(<Footer />);
      const logoContainer = container.querySelector('.bg-primary');
      expect(logoContainer).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('uses grid layout', () => {
      const { container } = render(<Footer />);
      expect(container.querySelector('.grid')).toBeInTheDocument();
    });

    it('has responsive columns', () => {
      const { container } = render(<Footer />);
      expect(container.querySelector('.grid-cols-2')).toBeInTheDocument();
      expect(container.querySelector('.md\\:grid-cols-5')).toBeInTheDocument();
    });

    it('has border-t on footer', () => {
      const { container } = render(<Footer />);
      expect(container.querySelector('footer')).toHaveClass('border-t');
    });

    it('has proper padding', () => {
      const { container } = render(<Footer />);
      const innerDiv = container.querySelector('.px-6.py-12');
      expect(innerDiv).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('section headings have proper styling', () => {
      render(<Footer />);
      const headings = screen.getAllByRole('heading', { level: 3 });
      headings.forEach(heading => {
        expect(heading).toHaveClass('font-semibold');
      });
    });

    it('links have hover transition', () => {
      render(<Footer />);
      const productLinks = screen.getAllByRole('link').filter(link =>
        link.getAttribute('href')?.startsWith('/')
      );
      productLinks.forEach(link => {
        if (link.textContent !== 'Skopaq') {
          expect(link).toHaveClass('transition-colors');
        }
      });
    });
  });

  describe('Accessibility', () => {
    it('is a semantic footer element', () => {
      render(<Footer />);
      expect(document.querySelector('footer')).toBeInTheDocument();
    });

    it('has proper heading hierarchy', () => {
      render(<Footer />);
      const h3s = screen.getAllByRole('heading', { level: 3 });
      expect(h3s.length).toBe(4); // Product, Company, Legal, Support
    });

    it('external links have rel="noopener noreferrer"', () => {
      render(<Footer />);
      const statusLink = screen.getByRole('link', { name: 'Status' });
      expect(statusLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('all links are navigable', () => {
      render(<Footer />);
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(10);
    });
  });

  describe('Link Categories', () => {
    it('has correct number of product links', () => {
      render(<Footer />);
      const productLinks = ['Features', 'Pricing', 'Integrations', 'Documentation'];
      productLinks.forEach(linkName => {
        expect(screen.getByRole('link', { name: linkName })).toBeInTheDocument();
      });
    });

    it('has correct number of company links', () => {
      render(<Footer />);
      const companyLinks = ['About', 'Blog', 'Careers', 'Contact'];
      companyLinks.forEach(linkName => {
        expect(screen.getByRole('link', { name: linkName })).toBeInTheDocument();
      });
    });

    it('has correct number of legal links', () => {
      render(<Footer />);
      const legalLinks = ['Terms of Service', 'Privacy Policy', 'GDPR DPA', 'Licenses'];
      legalLinks.forEach(linkName => {
        expect(screen.getByRole('link', { name: linkName })).toBeInTheDocument();
      });
    });

    it('has correct number of support links', () => {
      render(<Footer />);
      const supportLinks = ['Help Center', 'Status', 'API Reference', 'Contact Us'];
      supportLinks.forEach(linkName => {
        expect(screen.getByRole('link', { name: linkName })).toBeInTheDocument();
      });
    });
  });
});
