import { Inter } from 'next/font/google';

/** Body font, self-hosted by next/font so the CSP can stay font-src 'self'. */
export const inter = Inter({ subsets: ['latin'], display: 'swap' });
