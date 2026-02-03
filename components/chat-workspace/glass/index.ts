/**
 * Glass UI Primitives for Chat Workspace
 *
 * A collection of glassmorphic components for building modern,
 * translucent UI elements with depth and visual hierarchy.
 *
 * Design Tokens:
 * - Subtle:    rgba(255,255,255,0.03) - For backgrounds, containers
 * - Medium:    rgba(255,255,255,0.06) - Default card surfaces
 * - Prominent: rgba(255,255,255,0.10) - Active/focused elements
 * - Border:    rgba(255,255,255,0.08) - Subtle edge definition
 * - Blur:      20px standard, 32px heavy (overlays)
 */

export { GlassCard, glassCardVariants, type GlassCardProps } from './GlassCard';
export { GlassOverlay, type GlassOverlayProps } from './GlassOverlay';
export { GlowEffect, glowColors, type GlowEffectProps } from './GlowEffect';
