/**
 * @file TypingIndicator Component Tests
 * Tests for the TypingIndicator UI component
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TypingIndicator, typingIndicatorVariants } from '@/components/ui/typing-indicator';

describe('TypingIndicator Component', () => {
  describe('Basic Rendering', () => {
    it('renders the component', () => {
      const { container } = render(<TypingIndicator />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('has status role for accessibility', () => {
      render(<TypingIndicator />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has default aria-label', () => {
      render(<TypingIndicator />);
      expect(screen.getByLabelText('typing')).toBeInTheDocument();
    });

    it('accepts custom aria-label through label prop', () => {
      render(<TypingIndicator label="AI is thinking" />);
      expect(screen.getByLabelText('AI is thinking')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    describe('Dots Variant (default)', () => {
      it('renders three dots by default', () => {
        const { container } = render(<TypingIndicator variant="dots" />);
        const dots = container.querySelectorAll('.rounded-full');
        expect(dots.length).toBe(3);
      });

      it('has animation on dots', () => {
        const { container } = render(<TypingIndicator variant="dots" />);
        const dots = container.querySelectorAll('.rounded-full');
        dots.forEach((dot) => {
          expect(dot.className).toContain('animate');
        });
      });

      it('dots have staggered animation delay', () => {
        const { container } = render(<TypingIndicator variant="dots" />);
        const dots = container.querySelectorAll('.rounded-full');

        // Check that each dot has a different animation delay
        const delays: string[] = [];
        dots.forEach((dot) => {
          const style = (dot as HTMLElement).style.animationDelay;
          delays.push(style);
        });

        // All delays should be different
        expect(delays[0]).toBe('0s');
        expect(delays[1]).toBe('0.15s');
        expect(delays[2]).toBe('0.3s');
      });
    });

    describe('Pulse Variant', () => {
      it('renders single pulsing dot', () => {
        const { container } = render(<TypingIndicator variant="pulse" />);
        const dots = container.querySelectorAll('.rounded-full');
        expect(dots.length).toBe(1);
      });

      it('has pulse animation class', () => {
        const { container } = render(<TypingIndicator variant="pulse" />);
        expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
      });
    });

    describe('Wave Variant', () => {
      it('renders three dots', () => {
        const { container } = render(<TypingIndicator variant="wave" />);
        const dots = container.querySelectorAll('.rounded-full');
        expect(dots.length).toBe(3);
      });

      it('has wave animation class', () => {
        const { container } = render(<TypingIndicator variant="wave" />);
        const dots = container.querySelectorAll('.rounded-full');
        expect(dots[0].className).toContain('animate');
      });
    });
  });

  describe('Sizes', () => {
    describe('Small Size', () => {
      it('renders with small gap', () => {
        const { container } = render(<TypingIndicator size="sm" />);
        expect(container.firstChild).toHaveClass('gap-[3px]');
      });

      it('renders with small dot size', () => {
        const { container } = render(<TypingIndicator size="sm" />);
        expect(container.querySelector('.h-1\\.5.w-1\\.5')).toBeInTheDocument();
      });
    });

    describe('Medium Size (default)', () => {
      it('renders with medium gap', () => {
        const { container } = render(<TypingIndicator size="md" />);
        expect(container.firstChild).toHaveClass('gap-1');
      });

      it('renders with medium dot size', () => {
        const { container } = render(<TypingIndicator size="md" />);
        expect(container.querySelector('.h-2.w-2')).toBeInTheDocument();
      });
    });

    describe('Large Size', () => {
      it('renders with large gap', () => {
        const { container } = render(<TypingIndicator size="lg" />);
        expect(container.firstChild).toHaveClass('gap-[5px]');
      });

      it('renders with large dot size', () => {
        const { container } = render(<TypingIndicator size="lg" />);
        expect(container.querySelector('.h-2\\.5.w-2\\.5')).toBeInTheDocument();
      });
    });
  });

  describe('Colors', () => {
    it('renders with primary color by default', () => {
      const { container } = render(<TypingIndicator />);
      expect(container.firstChild).toHaveClass('[--dot-color:hsl(var(--primary))]');
    });

    it('renders with violet color', () => {
      const { container } = render(<TypingIndicator color="violet" />);
      expect(container.firstChild).toHaveClass('[--dot-color:hsl(var(--skopaq-violet-400))]');
    });

    it('renders with muted color', () => {
      const { container } = render(<TypingIndicator color="muted" />);
      expect(container.firstChild).toHaveClass('[--dot-color:hsl(var(--muted-foreground))]');
    });
  });

  describe('Label', () => {
    it('does not show label by default', () => {
      render(<TypingIndicator />);
      expect(screen.queryByText(/typing/i)).not.toBeInTheDocument();
    });

    it('shows label when provided', () => {
      render(<TypingIndicator label="Thinking..." />);
      expect(screen.getByText('Thinking...')).toBeInTheDocument();
    });

    it('label has correct styling for small size', () => {
      render(<TypingIndicator size="sm" label="Loading" />);
      const label = screen.getByText('Loading');
      expect(label).toHaveClass('ml-1.5', 'text-xs');
    });

    it('label has correct styling for medium size', () => {
      render(<TypingIndicator size="md" label="Loading" />);
      const label = screen.getByText('Loading');
      expect(label).toHaveClass('ml-2', 'text-sm');
    });

    it('label has correct styling for large size', () => {
      render(<TypingIndicator size="lg" label="Loading" />);
      const label = screen.getByText('Loading');
      expect(label).toHaveClass('ml-2.5', 'text-base');
    });

    it('label inherits dot color', () => {
      render(<TypingIndicator label="Loading" />);
      const label = screen.getByText('Loading');
      expect(label).toHaveClass('text-[var(--dot-color)]');
    });
  });

  describe('Custom ClassName', () => {
    it('accepts custom className', () => {
      const { container } = render(<TypingIndicator className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('merges custom className with default classes', () => {
      const { container } = render(<TypingIndicator className="my-indicator" />);
      expect(container.firstChild).toHaveClass('inline-flex', 'items-center', 'my-indicator');
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref to root element', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<TypingIndicator ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('HTML Attributes', () => {
    it('passes through data attributes', () => {
      render(<TypingIndicator data-testid="typing" data-state="active" />);
      const indicator = screen.getByTestId('typing');
      expect(indicator).toHaveAttribute('data-state', 'active');
    });

    it('passes through id attribute', () => {
      render(<TypingIndicator id="my-indicator" />);
      expect(document.getElementById('my-indicator')).toBeInTheDocument();
    });
  });

  describe('typingIndicatorVariants Function', () => {
    it('exports typingIndicatorVariants function', () => {
      expect(typeof typingIndicatorVariants).toBe('function');
    });

    it('generates correct classes for default', () => {
      const classes = typingIndicatorVariants({});
      expect(classes).toContain('inline-flex');
      expect(classes).toContain('items-center');
    });

    it('generates correct classes for size sm', () => {
      const classes = typingIndicatorVariants({ size: 'sm' });
      expect(classes).toContain('gap-[3px]');
    });

    it('generates correct classes for color violet', () => {
      const classes = typingIndicatorVariants({ color: 'violet' });
      expect(classes).toContain('[--dot-color:hsl(var(--skopaq-violet-400))]');
    });
  });

  describe('Display Name', () => {
    it('has correct display name', () => {
      expect(TypingIndicator.displayName).toBe('TypingIndicator');
    });
  });

  describe('Use Cases', () => {
    it('renders in a chat message context', () => {
      render(
        <div data-testid="chat">
          <div>Previous message</div>
          <div>
            <TypingIndicator label="AI is typing..." />
          </div>
        </div>
      );

      expect(screen.getByText('AI is typing...')).toBeInTheDocument();
    });

    it('renders as loading indicator', () => {
      render(
        <div data-testid="loading">
          <TypingIndicator variant="pulse" label="Loading" />
        </div>
      );

      expect(screen.getByText('Loading')).toBeInTheDocument();
    });

    it('renders without label for inline use', () => {
      const { container } = render(
        <span>
          Processing <TypingIndicator size="sm" />
        </span>
      );

      expect(container.querySelector('.inline-flex')).toBeInTheDocument();
    });
  });

  describe('Combination of Props', () => {
    it('combines size and color', () => {
      const { container } = render(
        <TypingIndicator size="lg" color="violet" />
      );
      expect(container.firstChild).toHaveClass(
        'gap-[5px]',
        '[--dot-color:hsl(var(--skopaq-violet-400))]'
      );
    });

    it('combines variant, size, and label', () => {
      render(
        <TypingIndicator variant="wave" size="sm" label="Processing" />
      );

      const label = screen.getByText('Processing');
      expect(label).toHaveClass('ml-1.5', 'text-xs');
    });

    it('combines all props', () => {
      const { container } = render(
        <TypingIndicator
          variant="dots"
          size="lg"
          color="muted"
          label="Please wait"
          className="my-custom"
          data-testid="full-indicator"
        />
      );

      const indicator = screen.getByTestId('full-indicator');
      expect(indicator).toHaveClass('my-custom');
      expect(indicator).toHaveClass('[--dot-color:hsl(var(--muted-foreground))]');
      expect(screen.getByText('Please wait')).toBeInTheDocument();
    });
  });
});
