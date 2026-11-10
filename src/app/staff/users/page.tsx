'use client';
import { useEffect, useState } from 'react';
import Shell, { Loading } from '@/components/Shell';
import { useRequireAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { ADMIN_ROLES } from '@/lib/constants';
import type { Profile, Role } from '@/lib/types';

const ROLES: { value: Role; label: string }[] = [
  { value: 'resident', label: 'Resident' },
  { value: 'encoder', label: 'Encoder / case officer' },
  { value: 'verifier', label: 'Verifier / field personnel' },
  { value: 'admin', label: 'Administrator / DRRM focal' },
];

export default function UsersPage() {
  const { ready, profile } = useRequireAuth(ADMIN_ROLES);
  const [users, setUsers] = useState<Profile[] | null>(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (err) setError(err.message);
    setUsers((data as Profile[]) ?? []);
  }

  useEffect(() => {
    if (ready) load();
  }, [ready]);

  async function update(u: Profile, patch: Partial<Pick<Profile, 'role' | 'active'>>) {
    setError('');
    setMsg('');
    if (u.id === profile?.id) {
      setError('You cannot change your own role or status. Ask another administrator.');
      return;
    }
    const { error: err } = await supabase.from('profiles').update(patch).eq('id', u.id);
    if (err) setError(err.message);
    else setMsg(`Updated ${u.full_name || 'user'}.`);
    await load();
  }

  if (!ready || users === null) return <Loading />;

  const list = users.filter((u) => !q || u.full_name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Shell title="Users & roles">
      {error && <p className="rounded-lg bg-red-500/10 p-2 text-sm text-red-300">{error}</p>}
      {msg && <p className="rounded-lg bg-green-500/10 p-2 text-sm text-green-300">{msg}</p>}
      <input className="input" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} />
      <p className="text-xs text-slate-500">
        Give staff roles only to people the barangay has authorized. Role changes are restricted to
        administrators.
      </p>
      <ul className="space-y-3">
        {list.map((u) => (
          <li key={u.id} className="card space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{u.full_name || '(no name)'}</p>
                <p className="text-xs text-slate-500">{u.phone || 'No phone'}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs ${u.active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                {u.active ? 'Active' : 'Deactivated'}
              </span>
            </div>
            <select
              className="input !py-2 !text-sm"
              value={u.role}
              onChange={(e) => update(u, { role: e.target.value as Role })}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <button className="btn-secondary w-full !py-2" onClick={() => update(u, { active: !u.active })}>
              {u.active ? 'Deactivate account' : 'Reactivate account'}
            </button>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
