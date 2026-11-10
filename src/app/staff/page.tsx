'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Shell, { Loading } from '@/components/Shell';
import { Flag, PriorityBadge, StatusBadge } from '@/components/Badges';
import Art from '@/components/Art';
import { emptyScene } from '@/lib/art';
import { useRequireAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import {
  CATEGORIES,
  FINISHED_STATUSES,
  INACTIVE_DAYS,
  STAFF_ROLES,
  STATUSES,
  categoryLabel,
  daysSince,
  fmtDate,
} from '@/lib/constants';
import type { CaseRow, Purok } from '@/lib/types';

export default function StaffInboxPage() {
  const { ready } = useRequireAuth(STAFF_ROLES);
  const [cases, setCases] = useState<CaseRow[] | null>(null);
  const [puroks, setPuroks] = useState<Purok[]>([]);
  const [error, setError] = useState('');

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [purok, setPurok] = useState('');
  const [attention, setAttention] = useState(false);

  useEffect(() => {
    if (!ready) return;
    supabase
      .from('cases')
      .select('*, puroks(name)')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        setCases((data as CaseRow[]) ?? []);
      });
    supabase
      .from('puroks')
      .select('*')
      .order('id')
      .then(({ data }) => setPuroks((data as Purok[]) ?? []));
  }, [ready]);

  const needsAttention = (c: CaseRow) =>
    c.status === 'submitted' ||
    c.status === 'reopened' ||
    (c.status === 'verified' && !c.assigned_team) ||
    (!FINISHED_STATUSES.includes(c.status) && daysSince(c.updated_at) >= INACTIVE_DAYS);

  const filtered = useMemo(() => {
    if (!cases) return [];
    return cases.filter((c) => {
      if (status && c.status !== status) return false;
      if (category && c.category !== category) return false;
      if (purok && String(c.purok_id) !== purok) return false;
      if (attention && !needsAttention(c)) return false;
      if (q && !c.tracking_code.toLowerCase().includes(q.trim().toLowerCase())) return false;
      return true;
    });
  }, [cases, q, status, category, purok, attention]);

  const counts = useMemo(() => {
    const list = cases ?? [];
    return {
      total: list.length,
      newCount: list.filter((c) => c.status === 'submitted').length,
      attention: list.filter(needsAttention).length,
      open: list.filter((c) => !FINISHED_STATUSES.includes(c.status)).length,
    };
  }, [cases]);

  function exportCsv() {
    const header = ['tracking_code', 'category', 'purok', 'status', 'priority', 'assigned_team', 'due_date', 'created_at', 'updated_at'];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = filtered.map((c) =>
      [c.tracking_code, categoryLabel(c.category), c.puroks?.name ?? '', c.status, c.priority ?? '', c.assigned_team ?? '', c.due_date ?? '', c.created_at, c.updated_at]
        .map(esc)
        .join(',')
    );
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `balikbarangay-cases-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (!ready || cases === null) return <Loading />;

  return (
    <Shell title="Case inbox">
      {error && <p className="rounded-lg bg-red-500/10 p-2 text-sm text-red-300">{error}</p>}

      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          ['Total', counts.total],
          ['New', counts.newCount],
          ['Open', counts.open],
          ['Attention', counts.attention],
        ].map(([label, n]) => (
          <div key={label as string} className="card !p-2">
            <p className="text-xl font-bold text-brand-700">{n}</p>
            <p className="text-[11px] text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="card space-y-2">
        <input className="input" placeholder="Search tracking number (e.g. BB-2611)" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="grid grid-cols-3 gap-2">
          <select className="input !px-2 !py-2 !text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All status</option>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select className="input !px-2 !py-2 !text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All types</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <select className="input !px-2 !py-2 !text-sm" value={purok} onChange={(e) => setPurok(e.target.value)}>
            <option value="">All puroks</option>
            {puroks.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={attention} onChange={(e) => setAttention(e.target.checked)} />
            Needs attention only
          </label>
          <button className="text-sm font-medium text-brand-700" onClick={exportCsv}>
            Export CSV ({filtered.length})
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center">
          <Art svg={emptyScene()} className="mx-auto mb-2 w-44" />
          <p className="text-sm text-slate-500">No cases match your filters.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link href={`/cases/${c.id}`} className="card block">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-brand-700">{c.tracking_code}</p>
                    <p className="text-sm font-medium">
                      {categoryLabel(c.category)} · {c.puroks?.name ?? 'No purok'}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{c.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <PriorityBadge priority={c.priority} />
                  {c.status === 'verified' && !c.assigned_team && <Flag>Unassigned</Flag>}
                  {!FINISHED_STATUSES.includes(c.status) && daysSince(c.updated_at) >= INACTIVE_DAYS && (
                    <Flag tone="red">Inactive {daysSince(c.updated_at)}d</Flag>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-400">Submitted {fmtDate(c.created_at)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
