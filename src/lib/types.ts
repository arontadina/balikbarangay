export type Role = 'resident' | 'encoder' | 'verifier' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  role: Role;
  purok_id: number | null;
  active: boolean;
  created_at: string;
}

export interface Purok {
  id: number;
  name: string;
}

export interface CaseRow {
  id: string;
  tracking_code: string;
  submitted_by: string;
  category: string;
  description: string;
  purok_id: number | null;
  landmark: string | null;
  lat: number | null;
  lng: number | null;
  incident_date: string | null;
  status: string;
  priority: string | null;
  assigned_team: string | null;
  next_action: string | null;
  due_date: string | null;
  closed_reason: string | null;
  created_at: string;
  updated_at: string;
  puroks?: { name: string } | null;
  profiles?: { full_name: string; phone: string | null } | null;
}

export interface CaseUpdate {
  id: string;
  case_id: string;
  author_id: string | null;
  status: string | null;
  note: string | null;
  visible_to_resident: boolean;
  created_at: string;
  profiles?: { full_name: string } | null;
}

export interface CaseMedia {
  id: string;
  case_id: string;
  storage_path: string;
  kind: string;
  uploaded_by: string;
  created_at: string;
  url?: string;
}

export interface Verification {
  id: string;
  case_id: string;
  verifier_id: string;
  outcome: string;
  findings: string;
  verified_at: string;
  profiles?: { full_name: string } | null;
}
