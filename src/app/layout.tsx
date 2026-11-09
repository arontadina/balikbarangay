import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/components/AuthProvider';
import RegisterSW from '@/components/RegisterSW';

export const metadata: Metadata = {
  title: 'BalikBarangay',
  description: 'Post-Calamity Recovery Tracker',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'BalikBarangay', statusBarStyle: 'default' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
};

export const viewport: Viewport = {
  themeColor: '#0e7556',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
