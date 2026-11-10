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
  const c = tone === 'red' ? 'bg-red-500/10 text-red-300 ring-red-400/30' : 'bg-amber-400/10 text-amber-200 ring-amber-400/30';
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${c}`}>{children}</span>;
}
