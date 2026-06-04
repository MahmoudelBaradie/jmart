/**
 * Centralized design tokens for the mobile app.
 *
 * 🎨 Palette MUST stay in sync with:
 *   - apps/admin/tailwind.config.ts  → brand.600 = #16a34a
 *   - apps/farmer/tailwind.config.ts → brand.600 = #16a34a
 *
 * Use these constants instead of hardcoded hex/numbers in StyleSheets.
 */

export const colors = {
  // Brand
  brand:        '#16a34a',
  brandDark:    '#15803d',
  brandLight:   '#dcfce7',

  // Neutrals
  bg:           '#f9fafb',
  surface:      '#ffffff',
  border:       '#e5e7eb',
  borderLight:  '#f3f4f6',

  // Text
  textPrimary:   '#111827',
  textSecondary: '#4b5563',
  textMuted:     '#6b7280',
  textSubtle:    '#9ca3af',

  // Status accents (badges/alerts)
  success:    '#16a34a',
  successBg:  '#dcfce7',
  warning:    '#d97706',
  warningBg:  '#fef3c7',
  danger:     '#dc2626',
  dangerBg:   '#fee2e2',
  info:       '#2563eb',
  infoBg:     '#dbeafe',

  // Other
  white:      '#ffffff',
  black:      '#000000',
  overlay:    'rgba(0, 0, 0, 0.4)',
} as const;

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
} as const;

export const radii = {
  sm:   6,
  md:   8,
  lg:   12,
  xl:   16,
  '2xl': 20,
  full: 9999,
} as const;

export const typography = {
  // Font sizes
  caption:  10,
  small:    12,
  body:     14,
  bodyLg:   16,
  title:    18,
  heading:  22,
  display:  28,

  // Font weights (RN expects string keys for weight)
  weightRegular:  '400' as const,
  weightMedium:   '500' as const,
  weightSemibold: '600' as const,
  weightBold:     '700' as const,
  weightBlack:    '800' as const,
} as const;

/** Minimum touch-target size per WCAG / Apple HIG */
export const minTouch = 44;

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;
