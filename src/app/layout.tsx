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
  themeColor: '#051332',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? (
          <div className="bg-red-600 p-3 text-center text-sm text-white">
            Setup incomplete: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY are
            missing. Add them in Vercel → Settings → Environment Variables, then redeploy.
          </div>
        ) : null}
        <AuthProvider>{children}</AuthProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
