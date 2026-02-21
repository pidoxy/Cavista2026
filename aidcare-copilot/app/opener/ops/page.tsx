'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getErrorMessage, getOpenERHospitals, updateOpenERHospital } from '../../../lib/api';
import { OpenERHospital } from '../../../types/opener';

export default function OpenEROpsPage() {
  const router = useRouter();
  const [hospitals, setHospitals] = useState<OpenERHospital[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [criticalBeds, setCriticalBeds] = useState(2);
  const [specialistsText, setSpecialistsText] = useState('emergency, cardiology');
  const [queueLevel, setQueueLevel] = useState(2);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadHospitals = useCallback(async () => {
    try {
      const data = await getOpenERHospitals();
      setHospitals(data.hospitals);
      if (!selectedHospitalId && data.hospitals.length > 0) {
        setSelectedHospitalId(data.hospitals[0].hospital_id);
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Unable to load hospitals.'));
    }
  }, [selectedHospitalId]);

  useEffect(() => {
    loadHospitals();
    const id = setInterval(loadHospitals, 12000);
    return () => clearInterval(id);
  }, [loadHospitals]);

  const selectedHospital = useMemo(
    () => hospitals.find((h) => h.hospital_id === selectedHospitalId),
    [hospitals, selectedHospitalId]
  );

  useEffect(() => {
    if (!selectedHospital) return;
    setCriticalBeds(selectedHospital.critical_beds);
    setQueueLevel(selectedHospital.queue_level);
    setSpecialistsText(selectedHospital.specialists_on_seat.join(', '));
    setNotes(selectedHospital.notes || '');
  }, [selectedHospitalId, selectedHospital]);

  async function handleSave() {
    if (!selectedHospitalId) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const specialists = specialistsText.split(',').map((s) => s.trim()).filter(Boolean);
      await updateOpenERHospital(selectedHospitalId, {
        criticalBeds,
        specialistsOnSeat: specialists,
        queueLevel,
        notes,
      });
      setSuccess('Hospital readiness updated successfully.');
      await loadHospitals();
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Update failed.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="hospital-shell py-6 md:py-8">
      <header className="hospital-topbar mb-4">
        <div className="hospital-brand">
          <span className="hospital-brand-mark">O</span>
          <div>
            <p className="hospital-brand-title">OpenER Operations Console</p>
            <p className="hospital-brand-subtitle">Manual Readiness Updates</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hospital-chip hospital-chip-success">
            <span className="hospital-live-dot" /> Live Broadcast
          </span>
          <button onClick={() => router.push('/opener')} className="hospital-btn hospital-btn-secondary">
            Back to Routing
          </button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[0.94fr_1.06fr]">
        <aside className="hospital-card">
          <p className="hospital-panel-title">Hospitals</p>
          <div className="hospital-scroll space-y-2 pr-1">
            {hospitals.map((h) => (
              <button
                key={h.hospital_id}
                onClick={() => setSelectedHospitalId(h.hospital_id)}
                className={`hospital-list-item ${selectedHospitalId === h.hospital_id ? 'active' : ''}`}
              >
                <p className="text-sm font-semibold text-slate-900">{h.name}</p>
                <p className="text-xs text-slate-600">Beds {h.critical_beds} • Queue {h.queue_level}</p>
                <p className="mt-1 text-xs text-slate-500">{h.specialists_on_seat.join(', ') || 'No specialists listed'}</p>
              </button>
            ))}
          </div>
        </aside>

        <section className="hospital-card">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="hospital-panel-title">Readiness Form</p>
              <h1 className="text-2xl font-semibold text-slate-900">Push Live Facility Status</h1>
            </div>
            {selectedHospital && (
              <span className={`hospital-chip ${
                selectedHospital.staff_load_status === 'red'
                  ? 'hospital-chip-danger'
                  : selectedHospital.staff_load_status === 'amber'
                    ? 'hospital-chip-warning'
                    : 'hospital-chip-success'
              }`}>
                {selectedHospital.staff_load_status.toUpperCase()}
              </span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="hospital-label">Critical Beds</label>
              <input type="number" min={0} value={criticalBeds} onChange={(e) => setCriticalBeds(Number(e.target.value))} className="hospital-input" />
            </div>
            <div>
              <label className="hospital-label">Queue Level (0-5)</label>
              <input type="number" min={0} max={5} value={queueLevel} onChange={(e) => setQueueLevel(Number(e.target.value))} className="hospital-input" />
            </div>
          </div>

          <div className="mt-3">
            <label className="hospital-label">Specialists On Seat</label>
            <input value={specialistsText} onChange={(e) => setSpecialistsText(e.target.value)} className="hospital-input" />
          </div>

          <div className="mt-3">
            <label className="hospital-label">Operational Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="hospital-textarea" />
          </div>

          {error && <p className="hospital-alert hospital-alert-danger mt-3">{error}</p>}
          {success && <p className="hospital-alert hospital-alert-success mt-3">{success}</p>}

          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={handleSave} disabled={saving} className="hospital-btn hospital-btn-primary">
              {saving ? 'Saving...' : 'Push Live Update'}
            </button>
            <button onClick={loadHospitals} className="hospital-btn hospital-btn-secondary">
              Refresh Feed
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
