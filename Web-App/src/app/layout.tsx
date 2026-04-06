import type { Metadata } from 'next';
import { Quicksand } from 'next/font/google';
import { Providers } from '@/lib/providers';
import '@/styles/globals.css';

const quicksand = Quicksand({ 
  subsets: ['latin'],
  variable: '--font-quicksand',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Fishcake - Polygon Airdrop Platform',
  description: 'Create events, distribute tokens, and manage airdrops on Polygon',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${quicksand.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
