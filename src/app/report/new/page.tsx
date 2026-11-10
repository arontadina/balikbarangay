'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell, { Loading } from '@/components/Shell';
import { useRequireAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/constants';
import { compressImage } from '@/lib/image';
import Art from '@/components/Art';
import { roadClosedSign, successScene } from '@/lib/art';
import type { Purok } from '@/lib/types';

const DRAFT_KEY = 'balikbarangay_report_draft';
const MAX_PHOTOS = 4;

interface FormState {
  category: string;
  description: string;
  purok_id: string;
  landmark: string;
  incident_date: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function NewReportPage() {
  const { ready, profile } = useRequireAuth();
  const [puroks, setPuroks] = useState<Purok[]>([]);
  const [form, setForm] = useState<FormState>({
    category: 'damaged_home',
    description: '',
    purok_id: '',
    landmark: '',
    incident_date: today(),
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<{ code: string; failedPhotos: number } | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  // Load puroks and any saved draft
  useEffect(() => {
    if (!ready) return;
    supabase
      .from('puroks')
      .select('*')
      .order('id')
      .then(({ data }) => setPuroks((data as Purok[]) ?? []));
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        setForm((f) => ({ ...f, ...JSON.parse(raw) }));
        setHasDraft(true);
      }
    } catch {}
    if (profile?.purok_id) setForm((f) => (f.purok_id ? f : { ...f, purok_id: String(profile.purok_id) }));
  }, [ready, profile]);

  // Auto-save text fields as a local draft
  useEffect(() => {
    if (!ready || receipt) return;
    try {
      if (form.description || form.landmark) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
        setHasDraft(true);
      }
    } catch {}
  }, [form, ready, receipt]);

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError('Location is not available on this device. Please describe a landmark instead.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setError('');
      },
      () => setError('Could not get your location. You can type a landmark instead.'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS));
    e.target.value = '';
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!profile) return;
    if (form.description.trim().length < 5) {
      setError('Please describe the problem (at least a few words).');
      return;
    }
    if (!form.purok_id && !form.landmark.trim()) {
      setError('Please choose your purok or describe a nearby landmark so staff can find the location.');
      return;
    }
    setBusy(true);
    try {
      const { data, error: err } = await supabase
        .from('cases')
        .insert({
          submitted_by: profile.id,
          category: form.category,
          description: form.description.trim(),
          purok_id: form.purok_id ? Number(form.purok_id) : null,
          landmark: form.landmark.trim() || null,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          incident_date: form.incident_date || null,
        })
        .select('id, tracking_code')
        .single();
      if (err || !data) throw err ?? new Error('Could not save the report.');

      let failed = 0;
      for (let i = 0; i < files.length; i++) {
        try {
          const blob = await compressImage(files[i]);
          const path = `${profile.id}/${data.id}/${Date.now()}-${i}.jpg`;
          const up = await supabase.storage.from('case-media').upload(path, blob, {
            contentType: 'image/jpeg',
          });
          if (up.error) throw up.error;
          const row = await supabase
            .from('case_media')
            .insert({ case_id: data.id, storage_path: path, kind: 'report', uploaded_by: profile.id });
          if (row.error) throw row.error;
        } catch {
          failed++;
        }
      }

      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
      setHasDraft(false);
      setReceipt({ code: data.tracking_code, failedPhotos: failed });
    } catch (err: any) {
      const msg = String(err?.message ?? '');
      setError(
        /fetch|network|failed to load/i.test(msg)
          ? 'Could not reach the server. Your text is saved on this device but has NOT been received by the barangay. Please check your connection and try again.'
          : `${msg || 'Could not submit.'} Your draft is still saved on this device.`
      );
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <Loading />;

  if (receipt) {
    return (
      <Shell title="Report received">
        <div className="card space-y-3 text-center">
          <Art svg={successScene()} className="mx-auto w-52" />
          <p className="text-sm text-slate-600">Your tracking number</p>
          <p className="text-3xl font-bold tracking-wider text-brand-700">{receipt.code}</p>
          <p className="text-sm text-slate-600">
            Keep this number. Your report is <strong>not yet verified</strong>; barangay personnel
            will review it. This is not a guarantee of assistance.
          </p>
          {receipt.failedPhotos > 0 && (
            <p className="rounded-lg bg-amber-400/10 p-2 text-sm text-amber-200">
              {receipt.failedPhotos} photo(s) could not be uploaded. Open the report and tell the
              barangay, or submit a new report with the photos.
            </p>
          )}
          <Link href="/reports" className="btn w-full">
            View my reports
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="New report">
      <div className="flex items-center gap-3 rounded-xl bg-amber-400/10 p-3 text-xs text-amber-200 ring-1 ring-amber-400/30">
        <Art svg={roadClosedSign()} className="h-12 w-12 shrink-0" />
        <span>
        In immediate danger? Call <strong>911</strong> or your barangay DRRM hotline first. This
        app is not an emergency dispatch service.
        </span>
      </div>

      {hasDraft && (
        <p className="text-xs text-slate-500">
          📝 Draft saved on this device (not yet sent to the barangay).
        </p>
      )}

      <form onSubmit={submit} className="card space-y-4">
        <div>
          <label className="label">What kind of problem?</label>
          <select className="input" value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Describe what happened</label>
          <textarea
            className="input min-h-[110px]"
            maxLength={2000}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Example: Roof partly blown off; two rooms exposed to rain."
            required
          />
        </div>

        <div>
          <label className="label">Purok</label>
          <select className="input" value={form.purok_id} onChange={(e) => set('purok_id', e.target.value)}>
            <option value="">Select purok…</option>
            {puroks.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Nearby landmark (optional)</label>
          <input
            className="input"
            value={form.landmark}
            onChange={(e) => set('landmark', e.target.value)}
            placeholder="Example: Beside the barangay hall"
          />
          <button type="button" className="btn-secondary mt-2 w-full" onClick={useMyLocation}>
            {coords ? '📍 Location attached (tap to refresh)' : '📍 Attach my current location'}
          </button>
          <p className="mt-1 text-xs text-slate-500">
            Your exact location is shown only to authorized barangay staff, never publicly.
          </p>
        </div>

        <div>
          <label className="label">Date it happened</label>
          <input
            type="date"
            className="input"
            max={today()}
            value={form.incident_date}
            onChange={(e) => set('incident_date', e.target.value)}
          />
        </div>

        <div>
          <label className="label">Photos (optional, up to {MAX_PHOTOS})</label>
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={onPickFiles}
            className="block w-full text-sm"
            disabled={files.length >= MAX_PHOTOS}
          />
          {files.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg bg-slate-100 px-2 py-1">
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    className="ml-2 text-xs text-red-400"
                    onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-xs text-slate-500">Avoid photos showing faces or documents.</p>
        </div>

        {error && <p className="rounded-lg bg-red-500/10 p-2 text-sm text-red-300">{error}</p>}

        <button className="btn w-full" disabled={busy}>
          {busy ? 'Sending…' : 'Submit report'}
        </button>
      </form>
    </Shell>
  );
}
