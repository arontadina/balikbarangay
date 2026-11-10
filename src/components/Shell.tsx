'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { isStaff } from '@/lib/constants';
import Art from './Art';
import { stormCloud } from '@/lib/art';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export default function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const path = usePathname();

  const staff = isStaff(profile?.role);
  const nav: NavItem[] = staff
    ? [
        { href: '/staff', label: 'Inbox', icon: '📥' },
        { href: '/dashboard', label: 'Summary', icon: '📊' },
        ...(profile?.role === 'admin' ? [{ href: '/staff/users', label: 'Users', icon: '👥' }] : []),
      ]
    : [
        { href: '/reports', label: 'My reports', icon: '📋' },
        { href: '/report/new', label: 'New report', icon: '➕' },
        { href: '/dashboard', label: 'Progress', icon: '📊' },
      ];

  const isActive = (href: string) =>
    path === href || (href !== '/staff' && href !== '/' && path.startsWith(href + '/'));

  if (profile && !profile.active) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6 text-center">
        <p className="text-lg font-semibold">Account deactivated</p>
        <p className="mt-2 text-sm text-slate-600">
          Please contact your barangay office if you think this is a mistake.
        </p>
        <button className="btn mt-6" onClick={signOut}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
      <div className="sticky top-0 z-10">
        <header className="flex items-center justify-between bg-brand-600 px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <Art svg={stormCloud()} className="h-9 w-9 shrink-0" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#051332]/70">BalikBarangay</p>
              <h1 className="text-lg font-extrabold leading-tight">{title}</h1>
            </div>
          </div>
          <button onClick={signOut} className="rounded-lg bg-[#051332]/20 px-3 py-1.5 text-xs font-bold">
            Sign out
          </button>
        </header>
        <div className="hazard h-1.5" />
      </div>

      <main className="flex-1 space-y-4 p-4 pb-28">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t-2 border-brand-600 bg-white">
        <div className="mx-auto flex max-w-2xl">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex flex-1 flex-col items-center py-2 text-xs ${
                isActive(n.href) ? 'font-semibold text-brand-700' : 'text-slate-500'
              }`}
            >
              <span className="text-lg leading-none">{n.icon}</span>
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function Loading({ text = 'Loading…' }: { text?: string }) {
  return <div className="p-8 text-center text-sm text-slate-500">{text}</div>;
}
