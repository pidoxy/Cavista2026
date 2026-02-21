'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDoctors, getErrorMessage, startShift } from '../../lib/api';
import { setSessionDoctor, setSessionShift, getSessionDoctor } from '../../lib/session';
import { Doctor } from '../../types';

export default function DoctorLoginPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selected, setSelected] = useState<Doctor | null>(null);
  const [ward, setWard] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  const loadDoctors = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getDoctors();
      setDoctors(result.doctors);
      if (result.doctors.filter((d) => d.role === 'doctor').length === 0) {
        setError('No doctor profiles are available yet.');
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Could not load doctors.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const existing = getSessionDoctor();
    if (existing) {
      router.replace('/doctor/scribe');
      return;
    }
    loadDoctors();
  }, [router, loadDoctors]);

  useEffect(() => {
    setCurrentTime(new Date().toLocaleString());
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleString()), 60000);
    return () => clearInterval(timer);
  }, []);

  const doctorProfiles = useMemo(() => doctors.filter((d) => d.role === 'doctor'), [doctors]);

  async function handleStart() {
    if (!selected) return;
    setStarting(true);
    setError('');
    try {
      const activeWard = ward || selected.ward;
      const shift = await startShift(selected.doctor_id, activeWard);
      setSessionDoctor({ ...selected, ward: activeWard });
      setSessionShift({ shift_id: shift.shift_id, started_at: shift.started_at, ward: activeWard });
      router.push('/doctor/scribe');
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to start shift.'));
      setStarting(false);
    }
  }

  return (
    <div className="hospital-shell py-6 md:py-8">
      <header className="hospital-topbar mb-4">
        <div className="hospital-brand">
          <span className="hospital-brand-mark">A</span>
          <div>
            <p className="hospital-brand-title">AidCare Clinical Console</p>
            <p className="hospital-brand-subtitle">Doctor Shift Access</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hospital-chip hospital-chip-success">
            <span className="hospital-live-dot" /> Live System
          </span>
          <button onClick={() => router.push('/triage')} className="hospital-btn hospital-btn-secondary">
            Public Triage
          </button>
          <button onClick={() => router.push('/admin')} className="hospital-btn hospital-btn-quiet">
            Admin Dashboard
          </button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hospital-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="hospital-panel-title">Shift Handoff</p>
              <h1 className="text-2xl font-semibold text-slate-900">Start Clinical Session</h1>
              <p className="mt-1 text-sm text-slate-600">Select attending profile and confirm assigned ward.</p>
            </div>
            <span className="hospital-chip hospital-chip-primary">Doctors {doctorProfiles.length}</span>
          </div>

          {loading ? (
            <div className="hospital-panel-muted py-10">
              <div className="mx-auto h-7 w-7 rounded-full border-2 border-[#0a65b4] border-t-transparent spinner" />
              <p className="mt-3 text-center text-sm text-slate-600">Loading clinical roster...</p>
            </div>
          ) : (
            <>
              <div className="hospital-scroll space-y-2 pr-1">
                {doctorProfiles.map((doc) => (
                  <button
                    key={doc.doctor_id}
                    onClick={() => {
                      setSelected(doc);
                      setWard(doc.ward);
                    }}
                    className={`hospital-list-item ${selected?.doctor_id === doc.doctor_id ? 'active' : ''}`}
                  >
                    <p className="text-sm font-semibold text-slate-900">{doc.name}</p>
                    <p className="text-xs text-slate-600">{doc.specialty} · {doc.ward}</p>
                  </button>
                ))}
              </div>

              {selected && (
                <div className="mt-4">
                  <label className="hospital-label">Ward Confirmation</label>
                  <input
                    type="text"
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    className="hospital-input"
                    placeholder="e.g. Ward C, ICU, A&E"
                  />
                </div>
              )}

              {error && <p className="hospital-alert hospital-alert-danger mt-3">{error}</p>}

              {!loading && doctorProfiles.length === 0 && (
                <button onClick={loadDoctors} className="hospital-btn hospital-btn-secondary mt-3">
                  Retry Roster Sync
                </button>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={handleStart}
                  disabled={!selected || starting}
                  className="hospital-btn hospital-btn-primary"
                >
                  {starting ? 'Starting Shift...' : 'Start Shift'}
                </button>
                <button onClick={() => router.push('/opener')} className="hospital-btn hospital-btn-secondary">
                  OpenER Routing
                </button>
              </div>
            </>
          )}
        </section>

        <aside className="hospital-card space-y-3">
          <div className="hospital-panel-muted">
            <p className="hospital-panel-title">Facility Snapshot</p>
            <div className="hospital-metric-grid">
              <div className="hospital-metric">
                <p className="hospital-metric-label">Profiles Loaded</p>
                <p className="hospital-metric-value">{doctorProfiles.length}</p>
                <p className="hospital-metric-note">Doctor records available</p>
              </div>
              <div className="hospital-metric">
                <p className="hospital-metric-label">Selected Ward</p>
                <p className="hospital-metric-value">{selected ? (ward || selected.ward) : '-'}</p>
                <p className="hospital-metric-note">Current assignment</p>
              </div>
            </div>
          </div>

          <div className="hospital-panel">
            <p className="hospital-panel-title">Workflow</p>
            <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-1">
              <li>Select your profile from the live roster.</li>
              <li>Confirm ward and begin shift session.</li>
              <li>Open Assist mode for multilingual triage support.</li>
            </ol>
          </div>

          <div className="hospital-panel">
            <p className="hospital-panel-title">Current Time</p>
            <p className="hospital-panel-value">{currentTime || '--'}</p>
            <p className="mt-1 text-xs text-slate-600">Use this view as your handoff point before patient intake.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
