'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { isStaff } from '@/lib/constants';

export default function Home() {
  const { session, profile, loading, profileError, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session && profile) {
      router.replace(isStaff(profile.role) ? '/staff' : '/reports');
    }
  }, [loading, session, profile, router]);

  if (!loading && session && !profile && profileError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6 text-center">
        <p className="text-lg font-semibold">We couldn&apos;t load your profile</p>
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{profileError}</p>
        <p className="text-sm text-slate-600">
          Make sure <code>supabase/schema.sql</code> was run completely in the Supabase SQL Editor,
          then sign out and sign in again.
        </p>
        <button className="btn" onClick={signOut}>
          Sign out
        </button>
      </div>
    );
  }

  if (loading || session) {
    return <div className="p-10 text-center text-sm text-slate-500">Loading…</div>;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <img src="/icons/icon-192.png" alt="" className="mx-auto h-20 w-20 rounded-2xl" />
        <h1 className="mt-4 text-2xl font-bold text-brand-700">BalikBarangay</h1>
        <p className="text-sm font-medium text-slate-600">Post-Calamity Recovery Tracker</p>
        <p className="mt-3 text-sm text-slate-600">
          Report damage after a calamity, get a tracking number, and follow what happens next in
          your barangay.
        </p>
      </div>

      <div className="space-y-3">
        <Link href="/login" className="btn w-full">
          Sign in / Create account
        </Link>
        <Link href="/dashboard" className="btn-secondary w-full">
          View community recovery progress
        </Link>
      </div>

      <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
        <strong>This is not an emergency service.</strong> For immediate danger, call 911 or your
        barangay / local DRRM hotline. A submitted report is not an official finding or a guarantee
        of assistance until verified by authorized personnel.
      </div>
    </div>
  );
}
