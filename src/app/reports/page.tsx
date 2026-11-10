'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell, { Loading } from '@/components/Shell';
import { StatusBadge } from '@/components/Badges';
import Art from '@/components/Art';
import { emptyScene } from '@/lib/art';
import { useRequireAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { categoryLabel, fmtDate } from '@/lib/constants';
import type { CaseRow } from '@/lib/types';

export default function MyReportsPage() {
  const { ready, profile } = useRequireAuth();
  const [cases, setCases] = useState<CaseRow[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready || !profile) return;
    supabase
      .from('cases')
      .select('*, puroks(name)')
      .eq('submitted_by', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        setCases((data as CaseRow[]) ?? []);
      });
  }, [ready, profile]);

  if (!ready || cases === null) return <Loading />;

  return (
    <Shell title="My reports">
      {error && <p className="rounded-lg bg-red-500/10 p-2 text-sm text-red-300">{error}</p>}

      {cases.length === 0 ? (
        <div className="card text-center">
          <Art svg={emptyScene()} className="mx-auto mb-2 w-48" />
          <p className="text-sm text-slate-600">You have not submitted any reports yet.</p>
          <Link href="/report/new" className="btn mt-4">
            Report a problem
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {cases.map((c) => (
            <li key={c.id}>
              <Link href={`/cases/${c.id}`} className="card block">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-brand-700">{c.tracking_code}</p>
                    <p className="text-sm font-medium">{categoryLabel(c.category)}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">{c.description}</p>
                <p className="mt-2 text-xs text-slate-400">
                  Submitted {fmtDate(c.created_at)} · Updated {fmtDate(c.updated_at)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
