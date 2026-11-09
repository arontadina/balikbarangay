import { PRIORITIES, statusInfo } from '@/lib/constants';

export function StatusBadge({ status }: { status: string }) {
  const s = statusInfo(status);
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${s.color}`}>
      {s.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) return null;
  const p = PRIORITIES.find((x) => x.value === priority);
  if (!p) return null;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${p.color}`}>
      {p.label} priority
    </span>
  );
}

export function Flag({ children, tone = 'amber' }: { children: React.ReactNode; tone?: 'amber' | 'red' }) {
  const c = tone === 'red' ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-amber-50 text-amber-800 ring-amber-200';
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${c}`}>{children}</span>;
}
