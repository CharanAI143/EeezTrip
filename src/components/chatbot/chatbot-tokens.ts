/* ═══════════════════════════════════════════════════════════════════
   Travel Expert AI — Chat Widget Design Tokens
   Captured from the removed widget so the redesign can reuse the exact
   ice-blue + baby-pink language already defined in src/index.css.
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Every visual decision the old widget made, in one place.
 * - `ice` palette is the EeezTrip sky blue (matches Tailwind sky-*).
 * - `pink` palette is the EeezTrip baby pink.
 * - Gradients/shadows/spacing/radii are the values actually used.
 */
export const chatbotTokens = {
  palette: {
    ice: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
    pink: {
      50: '#fdf2f8',
      100: '#fce7f3',
      200: '#fbcfe8',
      300: '#f9a8d4',
      400: '#f472b6',
      500: '#ec4899',
      600: '#db2777',
    },
    // Bot icon + muted-toggle accent (drawn from the brand palette).
    brandAmber: '#f59e0b',
  },

  gradients: {
    panel: 'linear-gradient(180deg, #ffffff, #f0f9ff 45%, #fdf2f8)',
    header: 'linear-gradient(135deg, #0369a1, #0ea5e9 55%, #ec4899)',
    launcher: 'linear-gradient(135deg, #0ea5e9, #0284c7, #ec4899)',
    userBubble: 'linear-gradient(135deg, #0ea5e9, #0284c7, #ec4899)',
    assistantBubble: 'linear-gradient(180deg, #ffffff, #f0f9ff)',
  },

  surfaces: {
    panelGlass: 'rgba(255,255,255,0.85)',
    logGlass: 'rgba(255,255,255,0.6)',
    chipsStrip: 'rgba(255,255,255,0.85)',
    input: '#ffffff',
    footerTint: 'rgba(224,247,254,0.5)',
    headerTile: 'rgba(255,255,255,0.15)',
  },

  text: {
    onHeader: 'rgba(255,255,255,0.85)',
    body: '#334155',
    chip: '#0369a1',
    muted: 'rgba(3,105,161,0.6)',
    micro: 'rgba(3,105,161,0.35)',
  },

  borders: {
    chip: '#e0f2fe',
    bubble: '#e0f2fe',
    hairline: 'rgba(255,255,255,0.6)',
    headerDivider: 'linear-gradient(90deg, rgba(255,255,255,0.5), rgba(255,255,255,0.15), rgba(255,255,255,0.5))',
  },

  statusDot: {
    idle: '#34d399',
    busy: '#fbbf24',
    recording: '#f472b6',
  },

  radius: {
    panel: 24,
    bubbles: 16,
    bubbleTails: 8,
    avatars: 8,
    chips: 9999,
    launcher: 9999,
  },

  sizing: {
    panelWidth: [380, 440], // mobile, sm+
    panelHeight: 600,
    panelMaxHeight: 'calc(100vh - 7rem)',
    launcher: 76, // 4.75rem diameter
    bubbleMaxWidth: '80%',
    avatar: 32,
    inputHeight: 48,
    micButton: 48,
  },

  spacing: {
    logPadding: 20,
    messageGap: 16,
    chipPadding: [14, 16], // horizontal, vertical
    bubblePadding: 16,
    inputAreaPadding: [20, 16], // horizontal, vertical
  },

  shadows: {
    panel: '0 24px 70px -24px rgba(2,132,199,0.55)',
    launcher: '0 18px 45px -12px rgba(2,132,199,0.6)',
    userBubble: '0 10px 24px -14px rgba(2,132,199,0.5)',
    assistantBubble: '0 8px 20px -12px rgba(2,132,199,0.45)',
    chip: '0 2px 10px -4px rgba(2,132,199,0.35)',
  },

  type: {
    panelTitle: 16,
    headerTitle: 15,
    headerStatus: 10,
    messageBody: 13,
    chip: 12,
    input: 14,
    footerStatus: 9,
    footerAttribution: 8,
    trackingWide: '0.16em',
  },
} as const;

export type ChatbotTokens = typeof chatbotTokens;