import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'IREX — Make Better Target Decisions',
  description: 'Transforming exploration from pattern matching to Computational Geological Reasoning™.',
  icons: { icon: '/brand/irex-logo.png' },
  metadataBase: new URL('https://irex.earth'),
  openGraph: {
    title: 'IREX — Make Better Target Decisions',
    description: 'Reasoning under uncertainty for exploration decisions.',
    images: ['/media/frame-05-layers.png'],
    type: 'website',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
