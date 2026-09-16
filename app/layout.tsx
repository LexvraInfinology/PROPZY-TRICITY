import type { Metadata } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { Footer } from '@/components/Footer';
import { Toast } from '@/components/Toast';
import { ClientModals } from '@/components/ClientModals';
import { HideOnRoute } from '@/components/HideOnRoute';
import { AdminRouteGuard } from '@/components/AdminRouteGuard';
import { GlobalProgressBar } from '@/components/GlobalProgressBar';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  style: ['normal', 'italic'],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Flats, Houses, PGs & Rooms for Rent, Buy & Sale | 0% Brokerage - PROPZY TRICITY',
  description: 'Search verified flats, PGs, houses & rooms for rent, buy & sale with PROPZY TRICITY. Explore real estate properties in Chandigarh, Mohali, Kharar, Zirakpur, Panchkula & more at 0% brokerage.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; }`,
          }}
        />
      </head>
      <body className="bg-[#050806] text-gray-100 antialiased min-h-screen flex flex-col font-sans selection:bg-emerald-500 selection:text-black" suppressHydrationWarning>
        <AppProvider>
          <GlobalProgressBar />
          <AdminRouteGuard />
          <HideOnRoute prefixes={['/admin', '/plans', '/pricing']}>
            <Navbar />
          </HideOnRoute>
          <main className="flex-1 w-full max-w-full overflow-x-clip">
            {children}
          </main>
          <HideOnRoute prefix="/admin">
            <Footer />
            <MobileBottomNav />
          </HideOnRoute>
          <ClientModals />
          <Toast />
        </AppProvider>
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      </body>
    </html>
  );
}
