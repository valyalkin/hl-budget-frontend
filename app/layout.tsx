import type { Metadata, Viewport } from 'next';
import '@/app/globals.css';
import { display, mono, sans } from '@/app/ui/fonts';

export const metadata: Metadata = {
  title: { default: 'HL Budget', template: '%s · HL Budget' },
  description: 'Personal budgeting for the household.',
  metadataBase: new URL(process.env.APP_BASE_URL ?? 'http://localhost:3000'),
};

/**
 * Phones: draw under the notch and home indicator (padded with safe-area insets), and let Android
 * shrink the page for the keyboard (specs/006-mobile-view R-014). Desktop browsers ignore both.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="min-h-screen bg-ground font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
