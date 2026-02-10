/**
 * @file VersionBadge Component Tests
 * Tests for the VersionBadge UI component
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VersionBadge } from '@/components/ui/version-badge';

// Mock the version module
vi.mock('@/lib/version', () => ({
  APP_VERSION: '1.2.3',
  APP_NAME: 'Skopaq',
}));

describe('VersionBadge Component', () => {
  describe('Default Variant', () => {
    it('renders version number', () => {
      render(<VersionBadge />);
      expect(screen.getByText('v1.2.3')).toBeInTheDocument();
    });

    it('does not show app name by default', () => {
      render(<VersionBadge />);
      expect(screen.queryByText('Skopaq')).not.toBeInTheDocument();
    });

    it('shows app name when showName is true', () => {
      render(<VersionBadge showName />);
      expect(screen.getByText('Skopaq')).toBeInTheDocument();
    });

    it('applies correct default styling', () => {
      render(<VersionBadge />);
      // Version text is in an inner span; classes are on the parent container
      const versionText = screen.getByText('v1.2.3');
      const badge = versionText.parentElement;
      expect(badge).toHaveClass(
        'inline-flex',
        'items-center',
        'px-2',
        'py-1',
        'text-xs',
        'rounded-md',
        'bg-muted',
        'text-muted-foreground',
        'font-mono'
      );
    });

    it('accepts custom className', () => {
      render(<VersionBadge className="custom-class" />);
      // Version text is in an inner span; custom class is on the parent container
      const versionText = screen.getByText('v1.2.3');
      const badge = versionText.parentElement;
      expect(badge).toHaveClass('custom-class');
    });
  });

  describe('Minimal Variant', () => {
    it('renders only version in minimal format', () => {
      render(<VersionBadge variant="minimal" />);
      expect(screen.getByText('v1.2.3')).toBeInTheDocument();
    });

    it('applies minimal styling', () => {
      render(<VersionBadge variant="minimal" />);
      const badge = screen.getByText('v1.2.3');
      expect(badge).toHaveClass('text-xs', 'text-muted-foreground');
    });

    it('is just a span element', () => {
      const { container } = render(<VersionBadge variant="minimal" />);
      expect(container.querySelector('span')).toBeInTheDocument();
    });

    it('accepts custom className', () => {
      render(<VersionBadge variant="minimal" className="custom-minimal" />);
      const badge = screen.getByText('v1.2.3');
      expect(badge).toHaveClass('custom-minimal');
    });
  });

  describe('Full Variant', () => {
    it('renders app name and version', () => {
      render(<VersionBadge variant="full" />);
      expect(screen.getByText('Skopaq')).toBeInTheDocument();
      expect(screen.getByText('v1.2.3')).toBeInTheDocument();
    });

    it('renders in a flex container', () => {
      const { container } = render(<VersionBadge variant="full" />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'items-center', 'gap-2');
    });

    it('renders app name with correct styling', () => {
      render(<VersionBadge variant="full" />);
      const appName = screen.getByText('Skopaq');
      expect(appName).toHaveClass('text-sm', 'font-medium');
    });

    it('renders version in a styled pill', () => {
      render(<VersionBadge variant="full" />);
      const version = screen.getByText('v1.2.3');
      expect(version).toHaveClass(
        'px-2',
        'py-0.5',
        'text-xs',
        'rounded-full',
        'bg-primary/10',
        'text-primary',
        'font-mono'
      );
    });

    it('accepts custom className', () => {
      const { container } = render(<VersionBadge variant="full" className="custom-full" />);
      expect(container.firstChild).toHaveClass('custom-full');
    });
  });

  describe('Props', () => {
    it('showName prop is ignored in minimal variant', () => {
      render(<VersionBadge variant="minimal" showName />);
      expect(screen.queryByText('Skopaq')).not.toBeInTheDocument();
    });

    it('showName prop is ignored in full variant (always shows name)', () => {
      render(<VersionBadge variant="full" showName={false} />);
      expect(screen.getByText('Skopaq')).toBeInTheDocument();
    });

    it('default variant respects showName prop', () => {
      const { rerender } = render(<VersionBadge showName={false} />);
      expect(screen.queryByText('Skopaq')).not.toBeInTheDocument();

      rerender(<VersionBadge showName={true} />);
      expect(screen.getByText('Skopaq')).toBeInTheDocument();
    });
  });

  describe('Version Format', () => {
    it('prepends v to version number', () => {
      render(<VersionBadge />);
      expect(screen.getByText('v1.2.3')).toBeInTheDocument();
      expect(screen.queryByText('1.2.3')).not.toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('merges custom className with default classes', () => {
      render(<VersionBadge className="my-badge" />);
      // Version text is in an inner span; classes are on the parent container
      const versionText = screen.getByText('v1.2.3');
      const badge = versionText.parentElement;
      expect(badge).toHaveClass('inline-flex', 'my-badge');
    });

    it('custom className can override default styles', () => {
      render(<VersionBadge className="text-red-500" />);
      // Custom class is on the parent container
      const versionText = screen.getByText('v1.2.3');
      const badge = versionText.parentElement;
      expect(badge).toHaveClass('text-red-500');
    });
  });

  describe('Use Cases', () => {
    it('renders in footer context', () => {
      render(
        <footer>
          <VersionBadge variant="minimal" />
        </footer>
      );
      expect(screen.getByText('v1.2.3')).toBeInTheDocument();
    });

    it('renders in header context', () => {
      render(
        <header>
          <VersionBadge variant="full" />
        </header>
      );
      expect(screen.getByText('Skopaq')).toBeInTheDocument();
      expect(screen.getByText('v1.2.3')).toBeInTheDocument();
    });

    it('renders in about page context', () => {
      render(
        <div>
          <h1>About</h1>
          <VersionBadge variant="full" />
        </div>
      );
      expect(screen.getByText('Skopaq')).toBeInTheDocument();
    });

    it('can be styled for dark mode', () => {
      render(<VersionBadge className="dark:bg-gray-800 dark:text-gray-200" />);
      // Custom class is on the parent container, not the inner text span
      const versionText = screen.getByText('v1.2.3');
      const badge = versionText.parentElement;
      expect(badge).toHaveClass('dark:bg-gray-800', 'dark:text-gray-200');
    });
  });

  describe('Accessibility', () => {
    it('version text is readable', () => {
      render(<VersionBadge />);
      expect(screen.getByText('v1.2.3')).toBeVisible();
    });

    it('can be given a role', () => {
      render(
        <div role="contentinfo">
          <VersionBadge />
        </div>
      );
      expect(screen.getByRole('contentinfo')).toContainElement(screen.getByText('v1.2.3'));
    });
  });
});
