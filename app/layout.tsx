import type { Metadata } from 'next';
import '@/app/globals.css';
import { inter } from '@/app/ui/fonts';

export const metadata: Metadata = {
  title: { default: 'HL Budget', template: '%s · HL Budget' },
  description: 'Personal budgeting for the household.',
  metadataBase: new URL(process.env.APP_BASE_URL ?? 'http://localhost:3000'),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} min-h-screen bg-slate-50 text-slate-900 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
