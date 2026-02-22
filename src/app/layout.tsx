import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0A0A0A',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://cliffhanger.gg'),
  title: {
    default: 'Cliffhanger',
    template: '%s · Cliffhanger',
  },
  description: 'Binge-worthy vertical video cliffhangers.',
  applicationName: 'Cliffhanger',
  manifest: '/site.webmanifest',
  icons: {
    icon: [{ url: '/favicon.ico' }, { url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-touch-icon.png' }],
  },
  openGraph: {
    type: 'website',
    url: 'https://cliffhanger.gg',
    siteName: 'Cliffhanger',
    title: 'Cliffhanger',
    description: 'Binge-worthy vertical video cliffhangers.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Cliffhanger' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cliffhanger',
    description: 'Binge-worthy vertical video cliffhangers.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-text-primary antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
