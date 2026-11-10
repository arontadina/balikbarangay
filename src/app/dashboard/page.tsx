'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { categoryLabel, statusInfo } from '@/lib/constants';
import Art from '@/components/Art';
import { iconStrip } from '@/lib/art';

interface Row {
  label: string;
  count: number;
  closed?: number;
}
interface Summary {
  total: number;
  closed: number;
  by_status: Row[];
  by_category: Row[];
  by_purok: Row[];
  generated_at: string;
}

function Bars({ rows, labelFn }: { rows: Row[]; labelFn?: (s: string) => string }) {
  if (!rows.length)
    return <p className="text-sm text-slate-500">Not enough cases yet to show this breakdown.</p>;
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex justify-between text-sm">
            <span>{labelFn ? labelFn(r.label) : r.label}</span>
            <span className="font-medium">
              {r.count}
              {typeof r.closed === 'number' ? ` (${r.closed} closed)` : ''}
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-brand-500" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Body() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.rpc('public_summary').then(({ data: d, error: err }) => {
      if (err) setError(err.message);
      else setData(d as Summary);
    });
  }, []);

  if (error) return <p className="rounded-lg bg-red-500/10 p-2 text-sm text-red-300">{error}</p>;
  if (!data) return <p className="p-6 text-center text-sm text-slate-500">Loading…</p>;

  return (
    <>
      <div className="card flex items-center gap-4">
        <Art svg={iconStrip()} className="w-40 shrink-0" />
        <p className="text-sm text-slate-600">
          Every report counts. This page shows how the barangay is recovering, without revealing anyone&apos;s identity.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <p className="text-3xl font-bold text-brand-700">{data.total}</p>
          <p className="text-xs text-slate-500">Reports received</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-brand-700">{data.closed}</p>
          <p className="text-xs text-slate-500">Cases closed</p>
        </div>
      </div>

      <section className="card">
        <h2 className="mb-3 font-semibold">By status</h2>
        <Bars rows={data.by_status} labelFn={(s) => statusInfo(s).label} />
      </section>
      <section className="card">
        <h2 className="mb-3 font-semibold">By type of concern</h2>
        <Bars rows={data.by_category} labelFn={categoryLabel} />
      </section>
      <section className="card">
        <h2 className="mb-3 font-semibold">By purok</h2>
        <Bars rows={data.by_purok} />
      </section>

      <p className="text-xs text-slate-500">
        Figures are counts of submitted reports, not confirmed damage totals or measures of who
        needs help. Groups with fewer than 3 cases are hidden to protect privacy. No names,
        addresses or contact details are shown. Updated{' '}
        {new Date(data.generated_at).toLocaleString('en-PH')}.
      </p>
    </>
  );
}

export default function DashboardPage() {
  const { session, loading } = useAuth();

  if (!loading && !session) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <Link href="/" className="text-sm font-medium text-brand-700">
          ← Back
        </Link>
        <h1 className="text-xl font-bold text-brand-700">Community recovery progress</h1>
        <Body />
      </div>
    );
  }

  return (
    <Shell title="Community progress">
      <Body />
    </Shell>
  );
}
