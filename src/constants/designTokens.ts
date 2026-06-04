// ─────────────────────────────────────────────────────────────────────────────
// FinTech Guinée — Design Tokens
// ─────────────────────────────────────────────────────────────────────────────

// ── Palette principale ────────────────────────────────────────────────────────
export const Palette = {
  // Indigo / Violet — couleur brand
  indigo50:  '#EEF2FF',
  indigo100: '#E0E7FF',
  indigo400: '#818CF8',
  indigo500: '#6366F1',
  indigo600: '#4F46E5',
  indigo700: '#4338CA',
  indigo900: '#312E81',

  // Bleu complémentaire
  blue400: '#60A5FA',
  blue500: '#3B82F6',
  blue900: '#1E3A8A',

  // Émeraude — succès / revenus
  emerald400: '#34D399',
  emerald500: '#10B981',

  // Ambre — avertissement
  amber400:  '#FBBF24',
  amber500:  '#F59E0B',

  // Rouge — danger
  red400: '#F87171',
  red500: '#EF4444',

  // Ardoise — fond / surface
  slate50:  '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate850: '#172032',
  slate900: '#0F172A',
  slate950: '#07101E',

  // Neutres
  white: '#FFFFFF',
  black: '#000000',
};

// ── Couleurs sémantiques ──────────────────────────────────────────────────────
export const LightColors = {
  background:   Palette.slate100,
  surface:      Palette.white,
  surfaceLight: Palette.slate50,
  surfaceCard:  Palette.white,

  text:         Palette.slate900,
  textMuted:    Palette.slate500,
  textSubtle:   Palette.slate400,

  primary:      Palette.indigo600,
  primaryLight: Palette.indigo400,
  primaryDark:  Palette.indigo700,

  secondary:    Palette.emerald500,
  accent:       Palette.amber500,
  danger:       Palette.red500,
  success:      Palette.emerald500,
  warning:      Palette.amber500,

  border:       Palette.slate200,
  borderLight:  Palette.slate100,
  separator:    Palette.slate200,

  cardGradient: [Palette.indigo600, Palette.blue500] as [string, string],

  // Ombres
  shadowColor:  Palette.indigo600,
  overlay:      'rgba(15,23,42,0.45)',
};

export const DarkColors = {
  background:   Palette.slate950,
  surface:      Palette.slate900,
  surfaceLight: Palette.slate850,
  surfaceCard:  Palette.slate800,

  text:         Palette.slate50,
  textMuted:    Palette.slate400,
  textSubtle:   Palette.slate500,

  primary:      Palette.indigo500,
  primaryLight: Palette.indigo400,
  primaryDark:  Palette.indigo700,

  secondary:    Palette.emerald400,
  accent:       Palette.amber400,
  danger:       Palette.red400,
  success:      Palette.emerald400,
  warning:      Palette.amber400,

  border:       Palette.slate700,
  borderLight:  Palette.slate800,
  separator:    Palette.slate700,

  cardGradient: [Palette.indigo900, Palette.blue900] as [string, string],

  shadowColor:  Palette.black,
  overlay:      'rgba(0,0,0,0.65)',
};

export type AppColors = typeof LightColors;

// ── Espacements ────────────────────────────────────────────────────────────────
export const Spacing = {
  half: 4,
  two:  8,
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
};

// ── Rayons de bordure ──────────────────────────────────────────────────────────
export const Radius = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  28,
  full: 9999,
};

// ── Typographie ───────────────────────────────────────────────────────────────
export const Typography = {
  // Tailles
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
  xxl:  30,
  xxxl: 38,

  // Graisses
  regular:   '400' as const,
  medium:    '500' as const,
  semiBold:  '600' as const,
  bold:      '700' as const,
  extraBold: '800' as const,

  // Interlignage
  tight:   1.2,
  normal:  1.5,
  relaxed: 1.75,

  // Lettre-espacement
  tight_ls: -0.5,
  base_ls:   0,
  wide_ls:   0.5,
  wider_ls:  1,
};

// ── Ombres portées ─────────────────────────────────────────────────────────────
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  primary: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  }),
};
