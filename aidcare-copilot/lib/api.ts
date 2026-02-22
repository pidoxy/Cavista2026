'use client';

import { AuthTokenResponse, AuthUser, Patient, PatientDetail, ActionItem, ScribeResult, HandoverReport, Language, MedicationChange } from '../types';
import { getToken, clearSession } from './session';
import { cachedFetch, clearCachePrefix } from './api-cache';

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://cavista2026-production.up.railway.app';

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(`API ${status}: ${detail}`);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...(init?.headers as Record<string, string> || {}),
  };
  const res = await fetch(`${API}${path}`, { ...init, headers });
  if (res.status === 401) {
    clearSession();
    const text = await res.text().catch(() => '');
    let detail = 'Session expired';
    try { detail = JSON.parse(text).detail || detail; } catch {}
    // Don't redirect on login/register 401 — show error. Redirect only for session expired.
    if (typeof window !== 'undefined' && !path.includes('/auth/login') && !path.includes('/auth/register')) {
      window.location.href = '/login';
    }
    throw new ApiError(401, detail);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    let detail = text;
    try { detail = JSON.parse(text).detail || text; } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

async function apiForm<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  if (res.status === 401) {
    clearSession();
    const text = await res.text().catch(() => '');
    let detail = 'Session expired';
    try { detail = JSON.parse(text).detail || detail; } catch {}
    if (typeof window !== 'undefined' && !path.includes('/auth/login') && !path.includes('/auth/register')) {
      window.location.href = '/login';
    }
    throw new ApiError(401, detail);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    let detail = text;
    try { detail = JSON.parse(text).detail || text; } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export function getError(err: unknown, fallback = 'Something went wrong.'): string {
  if (err instanceof ApiError) return err.detail || fallback;
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}

// ── Auth ──
export const login = (email: string, password: string) =>
  api<AuthTokenResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });

export const register = (params: { email: string; password: string; full_name: string; specialty?: string; role?: string }) =>
  api<AuthTokenResponse>('/auth/register', { method: 'POST', body: JSON.stringify(params) });

export const getMe = () => api<AuthUser>('/auth/me');

// ── Shifts ──
export const startShift = (wardUuid?: string) =>
  api<{ shift_id: string; started_at: string; ward_id: string | null }>('/doctor/shifts/start/', {
    method: 'POST', body: JSON.stringify({ ward_uuid: wardUuid || null }),
  });

export const endShift = (shiftUuid: string) =>
  api<{ ended_at: string; final_cls: number; status: string }>('/doctor/shifts/end/', {
    method: 'POST', body: JSON.stringify({ shift_uuid: shiftUuid }),
  });

export const getActiveShift = () =>
  api<{ shift: { shift_id: string; started_at: string; ward_id: string | null; ward_name: string | null } | null }>('/doctor/shifts/active');

// ── Scribe ──
export async function transcribeAndScribe(audioBlob: Blob, patientUuid: string, patientRef: string, language: Language): Promise<ScribeResult> {
  const fd = new FormData();
  fd.append('audio_file', audioBlob, 'recording.webm');
  fd.append('patient_uuid', patientUuid);
  fd.append('patient_ref', patientRef);
  fd.append('language', language);
  const result = await apiForm<ScribeResult>('/doctor/scribe/', fd);
  clearCachePrefix('burnout:');
  clearCachePrefix('patients:');
  clearCachePrefix('admin:');
  return result;
}

export function regenerateScribeSoap(transcript: string, language: Language): Promise<{
  soap_note: ScribeResult['soap_note'];
  patient_summary: string;
  complexity_score: number;
  flags: string[];
  medication_changes: MedicationChange[];
  soap_error?: string;
}> {
  return api('/doctor/scribe/regenerate', {
    method: 'POST',
    body: JSON.stringify({ transcript, language }),
  });
}

// ── Patients ──
const getPatientsRaw = (wardUuid?: string) =>
  api<{ total: number; patients: { critical: Patient[]; stable: Patient[]; discharged: Patient[] } }>(
    `/patients/${wardUuid ? `?ward_uuid=${wardUuid}` : ''}`
  );

export const getPatients = (wardUuid?: string) =>
  cachedFetch(`patients:list:${wardUuid ?? ''}`, () => getPatientsRaw(wardUuid));

const getPatientDetailRaw = (uuid: string) => api<PatientDetail>(`/patients/${uuid}`);

export const getPatientDetail = (uuid: string) =>
  cachedFetch(`patients:detail:${uuid}`, () => getPatientDetailRaw(uuid));

const getPatientAISummaryRaw = (uuid: string) =>
  api<{ chronic_conditions: { condition: string; details: string }[]; flagged_patterns: string[]; summary: string }>(
    `/patients/${uuid}/ai-summary`
  );

export const getPatientAISummary = (uuid: string) =>
  cachedFetch(`patients:ai-summary:${uuid}`, () => getPatientAISummaryRaw(uuid));

export const createPatient = async (params: Record<string, unknown>) => {
  const result = await api<Patient>('/patients/', { method: 'POST', body: JSON.stringify(params) });
  clearCachePrefix('patients:');
  return result;
};

export const createActionItem = async (patientUuid: string, params: { description: string; priority?: string }) => {
  const result = await api<ActionItem>(`/patients/${patientUuid}/action-items`, { method: 'POST', body: JSON.stringify(params) });
  clearCachePrefix('patients:');
  return result;
};

export const completeActionItem = async (itemUuid: string) => {
  const result = await api<ActionItem>(`/patients/action-items/${itemUuid}/complete`, { method: 'PATCH' });
  clearCachePrefix('patients:');
  return result;
};

// ── Handover ──
export const generateHandover = (shiftUuid: string, wardUuid?: string, notes?: string) =>
  api<HandoverReport>('/doctor/handover/', {
    method: 'POST',
    body: JSON.stringify({ shift_uuid: shiftUuid, ward_uuid: wardUuid || null, handover_notes: notes || '' }),
  });

export const getShiftConsultations = (shiftUuid: string) =>
  api<{ consultations_count: number; consultations: import('../types').Consultation[] }>(
    `/doctor/handover/consultations?shift_uuid=${shiftUuid}`
  );

// ── Triage ──
export const triageContinue = (params: { conversation_history: string; patient_message: string; staff_notes?: string; language: string }) =>
  api<{ response: string; response_english?: string | null; language: string; conversation_complete: boolean; should_auto_complete: boolean }>(
    '/triage/conversation/continue', { method: 'POST', body: JSON.stringify(params) }
  );

export const triageTranslate = (text: string, sourceLanguage: string) =>
  api<{ transcript_english: string | null; language: string }>(
    '/triage/translate', { method: 'POST', body: JSON.stringify({ text, source_language: sourceLanguage }) }
  );

export const triageProcessText = (transcript: string, language: string, staffNotes?: string) =>
  api<{ language: string; extracted_symptoms: string[]; triage_recommendation: Record<string, unknown>; risk_level: string }>(
    '/triage/process_text', { method: 'POST', body: JSON.stringify({ transcript_text: transcript, staff_notes: staffNotes || '', language }) }
  );

export function triageTranscribe(audioBlob: Blob, language: string) {
  const fd = new FormData();
  fd.append('audio_file', audioBlob, 'triage.webm');
  fd.append('language', language);
  return apiForm<{ transcript: string; transcript_english?: string; language: string }>('/triage/transcribe', fd);
}

export function triageProcessAudio(audioBlob: Blob, language: string, staffNotes?: string) {
  const fd = new FormData();
  fd.append('audio_file', audioBlob, 'triage.webm');
  fd.append('language', language);
  fd.append('staff_notes', staffNotes || '');
  return apiForm<Record<string, unknown>>('/triage/process_audio', fd);
}

export async function triageTTS(text: string, language: string, voiceId?: string): Promise<Blob> {
  const res = await fetch(`${API}/triage/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ text, language, voice_id: voiceId || '' }),
  });
  if (!res.ok) throw new ApiError(res.status, 'TTS failed');
  return res.blob();
}

export const triageSave = (patientUuid: string, result: Record<string, unknown>) =>
  api<{ status: string }>(`/triage/save/${patientUuid}`, { method: 'POST', body: JSON.stringify({ triage_result: result }) });

export const triageCreatePatient = (params: {
  full_name: string;
  age?: number | null;
  gender?: string | null;
  primary_diagnosis?: string | null;
  triage_result: Record<string, unknown>;
}) =>
  api<{ status: string; patient_id: string; full_name: string; risk_level: string; patient_status: string }>(
    '/triage/create-patient', { method: 'POST', body: JSON.stringify(params) }
  );

// ── Burnout ──
const getMyBurnoutRaw = () => api<{
  doctor_id: string;
  doctor_name: string;
  current_shift: { shift_id: string; start: string; patients_seen: number; hours_active: number } | null;
  cognitive_load_score: number;
  status: 'green' | 'amber' | 'red';
  score_breakdown: { volume: number; complexity: number; duration: number; consecutive: number };
  history_7_days: { date: string; cls: number; status: string }[];
  recommendation: string;
}>('/doctor/burnout/me');

export const getMyBurnout = () => cachedFetch('burnout:me', getMyBurnoutRaw);

// ── Admin ──
const getAdminDashboardRaw = (wardUuid?: string) =>
  api<{
    generated_at: string;
    team_stats: { total_active: number; red_count: number; amber_count: number; green_count: number; avg_cls: number; total_patients_today: number };
    doctors: {
      doctor_id: string; name: string; specialty: string; ward_name: string;
      cls: number; status: string; patients_seen: number; hours_active: number;
      is_on_shift: boolean; shift_duration_hours: number;
    }[];
    red_zone_alerts: { doctor_id: string; name: string; cls: number; message: string }[];
  }>(`/admin/dashboard/${wardUuid ? `?ward_uuid=${wardUuid}` : ''}`);

export const getAdminDashboard = (wardUuid?: string) =>
  cachedFetch(`admin:dashboard:${wardUuid ?? ''}`, () => getAdminDashboardRaw(wardUuid));

const getAdminAllocationRaw = (hospitalUuid?: string) =>
  api<{
    hospital_name: string;
    hospitals_in_scope: string[];
    overburdened_units: { ward_id: string; ward_name: string; ward_type: string; hospital_name: string; fatigue_index: number; patient_count: number; doctor_count: number; pat_doc_ratio: string; capacity: number; utilization: number; status: string }[];
    stable_units: { ward_id: string; ward_name: string; ward_type: string; hospital_name: string; fatigue_index: number; patient_count: number; doctor_count: number; pat_doc_ratio: string; capacity: number; utilization: number; status: string }[];
    recommendations: { id: string; source_ward: string; source_hospital: string; source_fatigue: number; source_available_staff: number; target_ward: string; target_hospital: string; target_fatigue: number; projected_fatigue_after: number; fatigue_reduction: string; priority: string }[];
    overburdened_count: number;
    stable_count: number;
  }>(`/admin/allocation${hospitalUuid ? `?hospital_uuid=${hospitalUuid}` : ''}`);

export const getAdminAllocation = (hospitalUuid?: string) =>
  cachedFetch(`admin:allocation:${hospitalUuid ?? ''}`, () => getAdminAllocationRaw(hospitalUuid));

const getAdminOrganogramRaw = () =>
  api<{
    scope: 'all' | 'org' | 'hospital' | 'ward';
    organizations?: {
      org_id: string;
      name: string;
      hospitals: {
        hospital_id: string;
        name: string;
        wards: { ward_id: string; name: string; ward_type: string; doctors: { doctor_id: string; name: string; role: string; specialty: string; cls: number; status: string }[] }[];
        admins: { doctor_id: string; name: string; role: string; specialty: string; cls: number; status: string }[];
      }[];
    }[];
    hospitals?: {
      hospital_id: string;
      name: string;
      wards: { ward_id: string; name: string; ward_type: string; doctors: { doctor_id: string; name: string; role: string; specialty: string; cls: number; status: string }[] }[];
      admins: { doctor_id: string; name: string; role: string; specialty: string; cls: number; status: string }[];
    }[];
  }>('/admin/organogram');

export const getAdminOrganogram = () => cachedFetch('admin:organogram', getAdminOrganogramRaw);

/** Invalidate admin cache (call before refresh to force fresh data) */
export const invalidateAdminCache = () => clearCachePrefix('admin:');

/** Invalidate burnout cache */
export const invalidateBurnoutCache = () => clearCachePrefix('burnout:');

export const getWardStats = (wardUuid: string) =>
  api<{
    ward_id: string; ward_name: string; hospital_name: string | null;
    capacity_percent: number; patient_count: number; ward_capacity: number;
    avg_fatigue_score: number; active_doctors: number; total_doctors: number;
    predicted_critical_time: string | null; fatigue_forecast: { time: string; cls: number }[];
    clerking_volume_per_hour: number; avg_case_complexity: number;
    unit_status: 'critical' | 'warning' | 'optimal';
  }>(`/units/${wardUuid}/stats`);
