import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import './app.css';
import './slider.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Guardian Tales Mastery Planner',
  description: 'Plan Guardian Mastery upgrades, costs, and unlocks.',
  openGraph: {
    title: 'Guardian Tales Mastery Planner',
    description: 'Plan upgrades. Master every class.',
    images: [{ url: '/og.png', width: 1680, height: 945 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Guardian Tales Mastery Planner',
    description: 'Plan upgrades. Master every class.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
