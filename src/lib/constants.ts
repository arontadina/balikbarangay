import type { Role } from './types';

export const STAFF_ROLES: Role[] = ['encoder', 'verifier', 'admin'];
export const ADMIN_ROLES: Role[] = ['admin'];

export const isStaff = (role?: string | null) =>
  role === 'encoder' || role === 'verifier' || role === 'admin';

export const CATEGORIES = [
  { value: 'damaged_home', label: 'Damaged home' },
  { value: 'blocked_road', label: 'Blocked road / access' },
  { value: 'public_facility', label: 'Damaged public facility' },
  { value: 'water_power', label: 'Water / power interruption' },
  { value: 'assistance', label: 'General recovery assistance' },
];

export const categoryLabel = (v: string) =>
  CATEGORIES.find((c) => c.value === v)?.label ?? v;

export interface StatusInfo {
  value: string;
  label: string;
  meaning: string;
  color: string; // tailwind classes
}

export const STATUSES: StatusInfo[] = [
  { value: 'submitted', label: 'Submitted', meaning: 'Received by the system; not yet officially verified.', color: 'bg-slate-100 text-slate-700' },
  { value: 'needs_info', label: 'Needs information', meaning: 'More details are required from the submitter.', color: 'bg-amber-100 text-amber-800' },
  { value: 'under_verification', label: 'Under verification', meaning: 'Awaiting review or field validation.', color: 'bg-blue-100 text-blue-800' },
  { value: 'verified', label: 'Verified', meaning: 'An authorized reviewer has confirmed the reported issue.', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'assigned', label: 'Assigned / referred', meaning: 'A responsible team or external office has been identified.', color: 'bg-violet-100 text-violet-800' },
  { value: 'in_progress', label: 'In progress', meaning: 'An action has started.', color: 'bg-sky-100 text-sky-800' },
  { value: 'awaiting_external', label: 'Awaiting external action', meaning: 'A partner agency, utility, or other organization must act.', color: 'bg-orange-100 text-orange-800' },
  { value: 'resolved_pending', label: 'Resolved – pending confirmation', meaning: 'Completion evidence submitted; awaiting review.', color: 'bg-teal-100 text-teal-800' },
  { value: 'closed', label: 'Closed', meaning: 'Closed by authorized staff with a recorded reason.', color: 'bg-green-100 text-green-800' },
  { value: 'reopened', label: 'Reopened', meaning: 'The issue remains or has recurred.', color: 'bg-red-100 text-red-800' },
  { value: 'rejected', label: 'Not accepted', meaning: 'Reviewed and not accepted, with a recorded reason.', color: 'bg-gray-200 text-gray-700' },
];

export const statusInfo = (v: string): StatusInfo =>
  STATUSES.find((s) => s.value === v) ?? STATUSES[0];

export const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-slate-100 text-slate-700' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' },
];

// Statuses in which a case is no longer "open"
export const FINISHED_STATUSES = ['closed', 'rejected', 'resolved_pending'];

// Locally agreed "inactive" interval in days. Adjust after consulting the barangay.
export const INACTIVE_DAYS = 7;

export const daysSince = (iso: string) =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
