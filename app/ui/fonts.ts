import {
  Bricolage_Grotesque,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
} from 'next/font/google';

/**
 * The design's three typefaces (research R-012), self-hosted by next/font so the CSP can stay
 * font-src 'self'. Each sets a CSS variable that globals.css maps to a Tailwind font family.
 */
export const display = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-bricolage',
  display: 'swap',
});

export const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
});

export const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});
