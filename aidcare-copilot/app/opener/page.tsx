'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { assessOpenEREmergency, dispatchOpenERAlert, getErrorMessage } from '../../lib/api';
import { OpenEREmergencyAssessment, OpenERIncidentType, OpenERAlert } from '../../types/opener';

const INCIDENT_OPTIONS: { value: OpenERIncidentType; label: string; hint: string }[] = [
  { value: 'chest_pain', label: 'Chest Pain Emergency', hint: 'Possible MI, ACS, acute breath distress' },
  { value: 'ob_emergency', label: 'Obstetric Emergency', hint: 'Postpartum bleed, eclampsia, obstructed labor' },
  { value: 'trauma', label: 'Major Trauma', hint: 'Road traffic trauma, severe injury' },
  { value: 'stroke', label: 'Stroke Suspicion', hint: 'Sudden weakness, slurred speech, FAST signs' },
];

export default function OpenERPage() {
  const router = useRouter();
  const [incidentType, setIncidentType] = useState<OpenERIncidentType>('chest_pain');
  const [symptomsText, setSymptomsText] = useState('severe chest pain, sweating, shortness of breath');
  const [lat, setLat] = useState(6.5244);
  const [lng, setLng] = useState(3.3792);
  const [patientAge, setPatientAge] = useState(42);
  const [sex, setSex] = useState('female');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assessment, setAssessment] = useState<OpenEREmergencyAssessment | null>(null);
  const [alert, setAlert] = useState<OpenERAlert | null>(null);
  const [dispatchingId, setDispatchingId] = useState<string>('');

  const symptoms = useMemo(
    () => symptomsText.split(',').map((s) => s.trim()).filter(Boolean),
    [symptomsText]
  );

  async function handleAssess() {
    setLoading(true);
    setError('');
    setAlert(null);
    try {
      const data = await assessOpenEREmergency({
        incidentType,
        lat,
        lng,
        patientAge,
        sex,
        keySymptoms: symptoms,
      });
      setAssessment(data);
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Unable to assess emergency now.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleDispatch(hospitalId: string, etaMinutes: number) {
    if (!assessment) return;
    setDispatchingId(hospitalId);
    setError('');
    try {
      const res = await dispatchOpenERAlert({
        emergencyId: assessment.emergency_id,
        hospitalId,
        etaMinutes,
        summary: assessment.emergency_summary,
      });
      setAlert(res);
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Dispatch failed.'));
    } finally {
      setDispatchingId('');
    }
  }

  return (
    <div className="hospital-shell py-6 md:py-8">
      <header className="hospital-topbar mb-4">
        <div className="hospital-brand">
          <span className="hospital-brand-mark">O</span>
          <div>
            <p className="hospital-brand-title">OpenER Readiness Routing</p>
            <p className="hospital-brand-subtitle">Golden Hour Coordination</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => router.push('/triage')} className="hospital-btn hospital-btn-secondary">
            AidCare Triage
          </button>
          <button onClick={() => router.push('/opener/ops')} className="hospital-btn hospital-btn-quiet">
            Hospital Ops Console
          </button>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1.04fr_1.16fr]">
        <section className="hospital-card">
          <div className="mb-3">
            <p className="hospital-panel-title">Emergency Intake</p>
            <h1 className="text-2xl font-semibold text-slate-900">Assess Incident & Rank Hospitals</h1>
            <p className="mt-1 text-sm text-slate-600">Capture symptoms and location, then compute readiness-based routing.</p>
          </div>

          <label className="hospital-label">Incident Type</label>
          <div className="mb-3 space-y-2">
            {INCIDENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setIncidentType(opt.value)}
                className={`hospital-list-item ${incidentType === opt.value ? 'active' : ''}`}
              >
                <p className="text-sm font-semibold text-slate-900">{opt.label}</p>
                <p className="text-xs text-slate-600">{opt.hint}</p>
              </button>
            ))}
          </div>

          <label className="hospital-label">Key Symptoms (comma-separated)</label>
          <textarea value={symptomsText} onChange={(e) => setSymptomsText(e.target.value)} className="hospital-textarea mb-3" />

          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            <div>
              <label className="hospital-label">Latitude</label>
              <input type="number" step="0.0001" value={lat} onChange={(e) => setLat(Number(e.target.value))} className="hospital-input" />
            </div>
            <div>
              <label className="hospital-label">Longitude</label>
              <input type="number" step="0.0001" value={lng} onChange={(e) => setLng(Number(e.target.value))} className="hospital-input" />
            </div>
            <div>
              <label className="hospital-label">Patient Age</label>
              <input type="number" value={patientAge} onChange={(e) => setPatientAge(Number(e.target.value))} className="hospital-input" />
            </div>
            <div>
              <label className="hospital-label">Sex</label>
              <select value={sex} onChange={(e) => setSex(e.target.value)} className="hospital-select">
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
          </div>

          {error && <p className="hospital-alert hospital-alert-danger mb-3">{error}</p>}

          <button onClick={handleAssess} disabled={loading} className="hospital-btn hospital-btn-primary">
            {loading ? 'Assessing...' : 'Assess & Rank Hospitals'}
          </button>
        </section>

        <section className="hospital-card">
          {!assessment ? (
            <div className="hospital-empty">
              Submit emergency details to produce a ranked list of hospitals by readiness, specialist fit, and ETA.
            </div>
          ) : (
            <>
              <div className="hospital-panel-muted mb-3">
                <p className="hospital-panel-title">Emergency Summary</p>
                <p className="text-sm text-slate-800">{assessment.emergency_summary}</p>
                <p className="mt-2 text-xs text-slate-700">Severity Band: <span className="font-semibold uppercase">{assessment.severity_band}</span></p>
              </div>

              {alert && (
                <p className="hospital-alert hospital-alert-success mb-3">
                  Alert sent to {alert.hospital_name}. Ack at {new Date(alert.ack_time).toLocaleTimeString()}.
                </p>
              )}

              <div className="hospital-scroll space-y-2 pr-1">
                {assessment.recommended_hospitals.map((h, idx) => (
                  <article key={h.hospital_id} className="hospital-panel">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">#{idx + 1} {h.hospital_name}</p>
                        <p className="text-xs text-slate-600">ETA {h.eta_minutes} min • {h.distance_km} km • score {h.final_score}</p>
                      </div>
                      <span
                        className={`hospital-chip ${
                          h.staff_load_status === 'red'
                            ? 'hospital-chip-danger'
                            : h.staff_load_status === 'amber'
                              ? 'hospital-chip-warning'
                              : 'hospital-chip-success'
                        }`}
                      >
                        {h.staff_load_status.toUpperCase()}
                      </span>
                    </div>
                    <p className="mb-2 text-xs text-slate-700">
                      Critical beds: {h.bed_status.critical_beds} • Specialist match: {h.specialist_status.match ? 'Yes' : 'No'}
                    </p>
                    <ul className="mb-3 list-disc space-y-0.5 pl-4 text-xs text-slate-600">
                      {h.reasons.map((reason, i) => <li key={i}>{reason}</li>)}
                    </ul>
                    <button
                      onClick={() => handleDispatch(h.hospital_id, h.eta_minutes)}
                      disabled={dispatchingId === h.hospital_id}
                      className="hospital-btn hospital-btn-primary"
                    >
                      {dispatchingId === h.hospital_id ? 'Sending Alert...' : 'Send Emergency Alert'}
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
