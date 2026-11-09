'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!loading && session) router.replace('/');
  }, [loading, session, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        router.replace('/');
      } else {
        if (fullName.trim().length < 2) throw new Error('Please enter your full name.');
        if (password.length < 8) throw new Error('Password must be at least 8 characters.');
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName.trim(), phone: phone.trim() || null } },
        });
        if (err) throw err;
        if (!data.session) {
          setNotice('Account created. Check your email to confirm your address, then sign in.');
          setMode('signin');
        } else {
          router.replace('/');
        }
      }
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="text-2xl font-bold text-brand-700">BalikBarangay</h1>
      <p className="mb-6 text-sm text-slate-600">
        {mode === 'signin' ? 'Sign in to continue' : 'Create a resident account'}
      </p>

      <form onSubmit={submit} className="card space-y-4">
        {mode === 'signup' && (
          <>
            <div>
              <label className="label">Full name</label>
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Mobile number (optional)</label>
              <input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </>
        )}
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        {notice && <p className="rounded-lg bg-green-50 p-2 text-sm text-green-800">{notice}</p>}

        <button className="btn w-full" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <button
        className="mt-4 text-sm font-medium text-brand-700"
        onClick={() => {
          setMode(mode === 'signin' ? 'signup' : 'signin');
          setError('');
          setNotice('');
        }}
      >
        {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
      </button>

      <p className="mt-6 text-xs text-slate-500">
        We collect only what is needed to handle your report. Your details are visible only to you
        and authorized barangay personnel.
      </p>
    </div>
  );
}
