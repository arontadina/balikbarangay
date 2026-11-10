'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Shell, { Loading } from '@/components/Shell';
import { Flag, PriorityBadge, StatusBadge } from '@/components/Badges';
import { useRequireAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import {
  FINISHED_STATUSES,
  INACTIVE_DAYS,
  PRIORITIES,
  STATUSES,
  categoryLabel,
  daysSince,
  fmtDate,
  isStaff,
  statusInfo,
} from '@/lib/constants';
import { compressImage } from '@/lib/image';
import type { CaseMedia, CaseRow, CaseUpdate, Profile, Verification } from '@/lib/types';

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { ready, profile } = useRequireAuth();
  const [c, setC] = useState<CaseRow | null>(null);
  const [updates, setUpdates] = useState<CaseUpdate[]>([]);
  const [media, setMedia] = useState<CaseMedia[]>([]);
  const [verifs, setVerifs] = useState<Verification[]>([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const staff = isStaff(profile?.role);

  const load = useCallback(async () => {
    if (!id) return;
    const caseRes = await supabase
      .from('cases')
      .select('*, puroks(name), profiles(full_name, phone)')
      .eq('id', id)
      .maybeSingle();
    if (caseRes.error) setError(caseRes.error.message);
    setC((caseRes.data as CaseRow) ?? null);

    const upRes = await supabase
      .from('case_updates')
      .select('*, profiles(full_name)')
      .eq('case_id', id)
      .order('created_at', { ascending: false });
    setUpdates((upRes.data as CaseUpdate[]) ?? []);

    const mRes = await supabase.from('case_media').select('*').eq('case_id', id).order('created_at');
    const rows = (mRes.data as CaseMedia[]) ?? [];
    if (rows.length) {
      const signed = await supabase.storage
        .from('case-media')
        .createSignedUrls(rows.map((r) => r.storage_path), 600);
      const map = new Map<string, string>();
      (signed.data ?? []).forEach((s) => {
        if (s.path && s.signedUrl) map.set(s.path, s.signedUrl);
      });
      setMedia(rows.map((r) => ({ ...r, url: map.get(r.storage_path) })));
    } else {
      setMedia([]);
    }

    if (profile && isStaff(profile.role)) {
      const vRes = await supabase
        .from('verifications')
        .select('*, profiles(full_name)')
        .eq('case_id', id)
        .order('verified_at', { ascending: false });
      setVerifs((vRes.data as Verification[]) ?? []);
    }
    setLoaded(true);
  }, [id, profile]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  if (!ready || !loaded) return <Loading />;

  if (!c) {
    return (
      <Shell title="Case">
        <p className="card text-sm">{error || 'This case was not found, or you do not have access to it.'}</p>
      </Shell>
    );
  }

  const si = statusInfo(c.status);
  const open = !FINISHED_STATUSES.includes(c.status);
  const inactive = open && daysSince(c.updated_at) >= INACTIVE_DAYS;

  const authorName = (u: CaseUpdate) => {
    if (u.author_id === profile?.id) return 'You';
    if (staff) return u.profiles?.full_name || 'Staff';
    return u.author_id === c.submitted_by ? 'You' : 'Barangay';
  };

  return (
    <Shell title={c.tracking_code}>
      <Link href={staff ? '/staff' : '/reports'} className="text-sm font-medium text-brand-700">
        ← Back
      </Link>

      <section className="card space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={c.status} />
          <PriorityBadge priority={c.priority} />
          {staff && inactive && <Flag tone="red">No update in {daysSince(c.updated_at)} days</Flag>}
          {staff && c.status === 'verified' && !c.assigned_team && <Flag>Unassigned</Flag>}
        </div>
        <p className="text-xs text-slate-500">{si.meaning}</p>
        <h2 className="pt-1 font-semibold">{categoryLabel(c.category)}</h2>
        <p className="whitespace-pre-wrap text-sm">{c.description}</p>
        <dl className="grid grid-cols-2 gap-2 pt-2 text-xs text-slate-600">
          <div>
            <dt className="text-slate-400">Purok</dt>
            <dd>{c.puroks?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Date of incident</dt>
            <dd>{c.incident_date ?? '—'}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-slate-400">Landmark</dt>
            <dd>{c.landmark ?? '—'}</dd>
          </div>
          {staff && (
            <>
              <div>
                <dt className="text-slate-400">Submitted by</dt>
                <dd>{c.profiles?.full_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Contact</dt>
                <dd>{c.profiles?.phone || '—'}</dd>
              </div>
              {c.lat != null && c.lng != null && (
                <div className="col-span-2">
                  <dt className="text-slate-400">Location</dt>
                  <dd>
                    <a
                      className="text-brand-700 underline"
                      target="_blank"
                      rel="noreferrer"
                      href={`https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lng}#map=18/${c.lat}/${c.lng}`}
                    >
                      Open pin in OpenStreetMap
                    </a>
                  </dd>
                </div>
              )}
            </>
          )}
        </dl>
        {(c.assigned_team || c.next_action) && (
          <div className="mt-2 rounded-xl bg-brand-50 p-3 text-sm">
            {c.assigned_team && (
              <p>
                <span className="font-medium">Responsible team:</span> {c.assigned_team}
              </p>
            )}
            {c.next_action && (
              <p>
                <span className="font-medium">Next step:</span> {c.next_action}
              </p>
            )}
            {c.due_date && (
              <p>
                <span className="font-medium">Target date:</span> {c.due_date}
              </p>
            )}
          </div>
        )}
        {c.closed_reason && (
          <p className="text-sm">
            <span className="font-medium">Reason:</span> {c.closed_reason}
          </p>
        )}
      </section>

      {media.length > 0 && (
        <section className="card">
          <h3 className="mb-2 font-semibold">Photos & evidence</h3>
          <div className="grid grid-cols-3 gap-2">
            {media.map((m) => (
              <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="block">
                {m.url ? (
                  <img src={m.url} alt={m.kind} className="aspect-square w-full rounded-lg object-cover" />
                ) : (
                  <div className="aspect-square rounded-lg bg-slate-100" />
                )}
                <span className="mt-0.5 block text-[10px] capitalize text-slate-500">{m.kind}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h3 className="mb-3 font-semibold">Timeline</h3>
        <ol className="space-y-3 border-l-2 border-slate-200 pl-4">
          {updates.map((u) => (
            <li key={u.id} className="relative">
              <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-brand-500" />
              <div className="flex flex-wrap items-center gap-2">
                {u.status && <StatusBadge status={u.status} />}
                {staff && !u.visible_to_resident && <Flag>Internal note</Flag>}
              </div>
              {u.note && <p className="mt-1 whitespace-pre-wrap text-sm">{u.note}</p>}
              <p className="text-xs text-slate-400">
                {authorName(u)} · {fmtDate(u.created_at)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {staff && profile && (
        <StaffPanel c={c} profile={profile} verifs={verifs} onChanged={load} />
      )}
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/* Staff actions                                                       */
/* ------------------------------------------------------------------ */

function StaffPanel({
  c,
  profile,
  verifs,
  onChanged,
}: {
  c: CaseRow;
  profile: Profile;
  verifs: Verification[];
  onChanged: () => Promise<void>;
}) {
  const role = profile.role;
  const canVerify = role === 'verifier' || role === 'admin';
  const canClose = role === 'admin';

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  // verification form
  const [vOutcome, setVOutcome] = useState('confirmed');
  const [vFindings, setVFindings] = useState('');
  // priority form
  const [priority, setPriority] = useState(c.priority ?? 'medium');
  const [rationale, setRationale] = useState('');
  // assignment form
  const [team, setTeam] = useState(c.assigned_team ?? '');
  const [nextAction, setNextAction] = useState(c.next_action ?? '');
  const [due, setDue] = useState(c.due_date ?? '');
  // status form
  const [newStatus, setNewStatus] = useState(c.status);
  const [note, setNote] = useState('');
  const [visible, setVisible] = useState(true);
  const [reason, setReason] = useState('');
  // evidence form
  const [kind, setKind] = useState('progress');
  const [file, setFile] = useState<File | null>(null);

  async function run(fn: () => Promise<void>, success: string) {
    setBusy(true);
    setError('');
    setOk('');
    try {
      await fn();
      setOk(success);
      await onChanged();
    } catch (e: any) {
      setError(e?.message ?? 'Action failed.');
    } finally {
      setBusy(false);
    }
  }

  async function applyStatus(status: string, noteText: string, visibleToResident: boolean, closedReason?: string) {
    const patch: Record<string, unknown> = { status };
    if (status === 'closed' || status === 'rejected') patch.closed_reason = closedReason ?? '';
    const upd = await supabase.from('cases').update(patch).eq('id', c.id);
    if (upd.error) throw upd.error;
    const ins = await supabase.from('case_updates').insert({
      case_id: c.id,
      author_id: profile.id,
      status,
      note: noteText || null,
      visible_to_resident: visibleToResident,
    });
    if (ins.error) throw ins.error;
  }

  const submitVerification = () =>
    run(async () => {
      if (vFindings.trim().length < 3) throw new Error('Please record your findings.');
      const v = await supabase.from('verifications').insert({
        case_id: c.id,
        verifier_id: profile.id,
        outcome: vOutcome,
        findings: vFindings.trim(),
      });
      if (v.error) throw v.error;
      if (vOutcome === 'confirmed') {
        await applyStatus('verified', 'The reported issue has been verified by the barangay.', true);
      } else if (vOutcome === 'needs_info') {
        await applyStatus('needs_info', `More information is needed: ${vFindings.trim()}`, true);
      } else {
        await applyStatus('rejected', 'This report could not be accepted. See the reason below.', true, vFindings.trim());
      }
      setVFindings('');
    }, 'Verification recorded.');

  const submitPriority = () =>
    run(async () => {
      if (rationale.trim().length < 3) throw new Error('Please record the reason for this priority.');
      const upd = await supabase.from('cases').update({ priority }).eq('id', c.id);
      if (upd.error) throw upd.error;
      const ins = await supabase.from('case_updates').insert({
        case_id: c.id,
        author_id: profile.id,
        status: c.status,
        note: `Priority set to ${priority}. Rationale: ${rationale.trim()}`,
        visible_to_resident: false,
      });
      if (ins.error) throw ins.error;
      setRationale('');
    }, 'Priority saved (rationale kept as an internal note).');

  const submitAssignment = () =>
    run(async () => {
      if (!team.trim()) throw new Error('Enter the responsible team or office.');
      const upd = await supabase
        .from('cases')
        .update({
          assigned_team: team.trim(),
          next_action: nextAction.trim() || null,
          due_date: due || null,
          ...(c.status === 'verified' ? { status: 'assigned' } : {}),
        })
        .eq('id', c.id);
      if (upd.error) throw upd.error;
      const ins = await supabase.from('case_updates').insert({
        case_id: c.id,
        author_id: profile.id,
        status: c.status === 'verified' ? 'assigned' : c.status,
        note: `Assigned to ${team.trim()}.${nextAction.trim() ? ` Next step: ${nextAction.trim()}` : ''}`,
        visible_to_resident: true,
      });
      if (ins.error) throw ins.error;
    }, 'Assignment saved.');

  const submitStatus = () =>
    run(async () => {
      if ((newStatus === 'closed' || newStatus === 'rejected') && reason.trim().length < 3) {
        throw new Error('A reason is required to close or reject a case.');
      }
      await applyStatus(newStatus, note.trim(), visible, reason.trim());
      setNote('');
      setReason('');
    }, 'Status updated.');

  const submitEvidence = () =>
    run(async () => {
      if (!file) throw new Error('Choose a photo first.');
      const blob = await compressImage(file);
      const path = `${profile.id}/${c.id}/${Date.now()}-staff.jpg`;
      const up = await supabase.storage.from('case-media').upload(path, blob, { contentType: 'image/jpeg' });
      if (up.error) throw up.error;
      const row = await supabase
        .from('case_media')
        .insert({ case_id: c.id, storage_path: path, kind, uploaded_by: profile.id });
      if (row.error) throw row.error;
      setFile(null);
    }, 'Evidence uploaded.');

  return (
    <section className="space-y-4">
      <h3 className="pt-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Staff actions</h3>

      {error && <p className="rounded-lg bg-red-500/10 p-2 text-sm text-red-300">{error}</p>}
      {ok && <p className="rounded-lg bg-green-500/10 p-2 text-sm text-green-300">{ok}</p>}

      {verifs.length > 0 && (
        <div className="card">
          <h4 className="mb-2 font-semibold">Verification history</h4>
          <ul className="space-y-2 text-sm">
            {verifs.map((v) => (
              <li key={v.id}>
                <span className="font-medium capitalize">{v.outcome.replace('_', ' ')}</span> — {v.findings}
                <p className="text-xs text-slate-400">
                  {v.profiles?.full_name ?? 'Verifier'} · {fmtDate(v.verified_at)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {canVerify ? (
        <div className="card space-y-3">
          <h4 className="font-semibold">Record verification</h4>
          <select className="input" value={vOutcome} onChange={(e) => setVOutcome(e.target.value)}>
            <option value="confirmed">Confirmed — issue verified</option>
            <option value="needs_info">Needs more information</option>
            <option value="rejected">Not accepted (reason required)</option>
          </select>
          <textarea
            className="input min-h-[80px]"
            placeholder="Findings from field validation or review"
            value={vFindings}
            onChange={(e) => setVFindings(e.target.value)}
          />
          <button className="btn w-full" disabled={busy} onClick={submitVerification}>
            Save verification
          </button>
        </div>
      ) : (
        <p className="card text-sm text-slate-600">
          Only verifiers and administrators can record a verification decision.
        </p>
      )}

      <div className="card space-y-3">
        <h4 className="font-semibold">Priority (triage aid — human decision)</h4>
        <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <input
          className="input"
          placeholder="Reason, per the locally approved rubric"
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
        />
        <button className="btn-secondary w-full" disabled={busy} onClick={submitPriority}>
          Save priority
        </button>
      </div>

      <div className="card space-y-3">
        <h4 className="font-semibold">Assign / refer</h4>
        <input className="input" placeholder="Responsible team or office" value={team} onChange={(e) => setTeam(e.target.value)} />
        <input className="input" placeholder="Next action" value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
        <input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        <button className="btn-secondary w-full" disabled={busy} onClick={submitAssignment}>
          Save assignment
        </button>
      </div>

      <div className="card space-y-3">
        <h4 className="font-semibold">Update status / add note</h4>
        <select className="input" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
          {STATUSES.filter((s) => {
            if (s.value === 'closed') return canClose;
            if (s.value === 'verified' || s.value === 'rejected') return canVerify;
            return true;
          }).map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {(newStatus === 'closed' || newStatus === 'rejected') && (
          <input className="input" placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
        )}
        <textarea
          className="input min-h-[80px]"
          placeholder="Progress note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          Visible to the resident
        </label>
        <button className="btn w-full" disabled={busy} onClick={submitStatus}>
          Save update
        </button>
        {!canClose && <p className="text-xs text-slate-500">Closing a case requires an administrator.</p>}
      </div>

      <div className="card space-y-3">
        <h4 className="font-semibold">Add photo evidence</h4>
        <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="verification">Verification</option>
          <option value="progress">Progress</option>
          <option value="completion">Completion</option>
        </select>
        <input type="file" accept="image/*" capture="environment" className="block w-full text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button className="btn-secondary w-full" disabled={busy || !file} onClick={submitEvidence}>
          Upload
        </button>
      </div>
    </section>
  );
}
