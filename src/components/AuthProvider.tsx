'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, Role } from '@/lib/types';

interface AuthCtx {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileError: string;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: null,
  profile: null,
  loading: true,
  profileError: '',
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  const loadProfile = useCallback(async (uid: string) => {
    // The profile row is created by a database trigger; retry briefly right after sign-up.
    for (let i = 0; i < 4; i++) {
      const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
      if (data) {
        setProfile(data as Profile);
        setProfileError('');
        return;
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    // Self-heal: if the sign-up trigger did not create the row, create a resident profile.
    const { data: u } = await supabase.auth.getUser();
    const meta = (u.user?.user_metadata ?? {}) as { full_name?: string; phone?: string };
    const ins = await supabase
      .from('profiles')
      .insert({ id: uid, full_name: meta.full_name ?? '', phone: meta.phone ?? null })
      .select('*')
      .maybeSingle();
    if (ins.data) {
      setProfile(ins.data as Profile);
      setProfileError('');
      return;
    }
    setProfile(null);
    setProfileError(
      ins.error?.message ??
        'Your profile could not be loaded. The database setup (schema.sql) may be incomplete.'
    );
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      if (mounted) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) setTimeout(() => loadProfile(s.user.id), 0);
      else setProfile(null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  return (
    <Ctx.Provider value={{ session, profile, loading, profileError, signOut, refreshProfile }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

/** Redirects to /login when signed out, or to / when the role is not allowed. */
export function useRequireAuth(allowed?: Role[]) {
  const { session, profile, loading } = useAuth();
  const router = useRouter();
  const allowedKey = allowed ? allowed.join(',') : '';

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/login');
      return;
    }
    if (profile && allowed && !allowed.includes(profile.role)) router.replace('/');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session, profile, allowedKey, router]);

  const ready = !loading && !!session && !!profile && (!allowed || allowed.includes(profile.role));
  return { ready, profile, session };
}
