'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  clearSessionDoctor,
  getSessionDoctor,
  getSessionShift,
  getShiftDuration,
} from '../../../lib/session';
import { endShift, getErrorMessage } from '../../../lib/api';

export default function DoctorScribePage() {
  const router = useRouter();
  const doctor = getSessionDoctor();
  const shift = getSessionShift();
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!doctor || !shift) {
      router.replace('/doctor');
    }
  }, [doctor, shift, router]);

  if (!doctor || !shift) return null;

  async function handleEndShift() {
    if (!doctor || !shift) return;
    setEnding(true);
    setError('');
    try {
      await endShift(doctor.doctor_id, shift.shift_id);
      clearSessionDoctor();
      router.replace('/doctor');
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to end shift. Please try again.'));
      setEnding(false);
    }
  }

  return (
    <div className="hospital-shell py-6 md:py-8">
      <header className="hospital-topbar mb-4">
        <div className="hospital-brand">
          <span className="hospital-brand-mark">A</span>
          <div>
            <p className="hospital-brand-title">AidCare Shift Workspace</p>
            <p className="hospital-brand-subtitle">Clinical Session Active</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hospital-chip hospital-chip-success">
            <span className="hospital-live-dot" /> On Duty
          </span>
          <button onClick={() => router.push('/doctor')} className="hospital-btn hospital-btn-secondary">
            Back to Login
          </button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="hospital-card">
          <div className="mb-4">
            <p className="hospital-panel-title">Shift Context</p>
            <h1 className="text-2xl font-semibold text-slate-900">{doctor.name}</h1>
            <p className="mt-1 text-sm text-slate-600">{doctor.specialty} · {shift.ward}</p>
          </div>

          <div className="hospital-metric-grid mb-4">
            <div className="hospital-metric">
              <p className="hospital-metric-label">Shift ID</p>
              <p className="hospital-metric-value text-[1rem] font-mono">{shift.shift_id.slice(0, 8)}...</p>
              <p className="hospital-metric-note">Session token</p>
            </div>
            <div className="hospital-metric">
              <p className="hospital-metric-label">Started</p>
              <p className="hospital-metric-value text-[1rem]">{new Date(shift.started_at).toLocaleTimeString()}</p>
              <p className="hospital-metric-note">{new Date(shift.started_at).toLocaleDateString()}</p>
            </div>
            <div className="hospital-metric">
              <p className="hospital-metric-label">Duration</p>
              <p className="hospital-metric-value text-[1rem]">{getShiftDuration(shift.started_at)}</p>
              <p className="hospital-metric-note">Active duty window</p>
            </div>
          </div>

          <div className="hospital-panel-muted mb-4">
            <p className="hospital-panel-title">Clinical Notes Workspace</p>
            <p className="text-sm text-slate-700">
              This shift shell is ready for live scribing and decision support. Use Assist Mode for multilingual symptom intake,
              guideline-backed urgency ranking, and quick action recommendations.
            </p>
          </div>

          {error && <p className="hospital-alert hospital-alert-danger mb-3">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <button onClick={() => router.push('/doctor/assist')} className="hospital-btn hospital-btn-primary">
              Open Assist Mode
            </button>
            <button onClick={() => router.push('/opener')} className="hospital-btn hospital-btn-secondary">
              OpenER Routing
            </button>
            <button onClick={handleEndShift} disabled={ending} className="hospital-btn hospital-btn-danger">
              {ending ? 'Ending Shift...' : 'End Shift'}
            </button>
          </div>
        </section>

        <aside className="hospital-card space-y-3">
          <div className="hospital-panel">
            <p className="hospital-panel-title">Quick Checklist</p>
            <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-1">
              <li>Confirm patient identity and chief complaint.</li>
              <li>Run multilingual intake in Assist mode.</li>
              <li>Escalate high-risk cases to OpenER dispatch.</li>
            </ol>
          </div>
          <div className="hospital-panel">
            <p className="hospital-panel-title">Handoff Reminder</p>
            <p className="text-sm text-slate-700">
              Keep recommendations explainable and cite evidence cards before escalation decisions.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
