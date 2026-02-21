'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAdminDashboard, getErrorMessage } from '../../lib/api';
import { AdminDashboard } from '../../types';

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadDashboard() {
    setLoading(true);
    setError('');
    try {
      const dashboard = await getAdminDashboard();
      setData(dashboard);
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Could not load dashboard.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <div className="hospital-shell py-6 md:py-8">
      <header className="hospital-topbar mb-4">
        <div className="hospital-brand">
          <span className="hospital-brand-mark">A</span>
          <div>
            <p className="hospital-brand-title">AidCare Admin Command Board</p>
            <p className="hospital-brand-subtitle">Staffing and Load Oversight</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadDashboard} className="hospital-btn hospital-btn-secondary">
            Refresh
          </button>
          <button onClick={() => router.push('/doctor')} className="hospital-btn hospital-btn-quiet">
            Doctor Console
          </button>
        </div>
      </header>

      {loading ? (
        <div className="hospital-card text-sm text-slate-600">Loading dashboard...</div>
      ) : error ? (
        <div className="hospital-card">
          <p className="hospital-alert hospital-alert-danger">{error}</p>
          <button onClick={loadDashboard} className="hospital-btn hospital-btn-secondary mt-3">
            Retry
          </button>
        </div>
      ) : data ? (
        <>
          <section className="hospital-card mb-4">
            <p className="hospital-panel-title">Facility Metrics</p>
            <div className="hospital-metric-grid">
              <MetricCard label="Active Doctors" value={String(data.team_stats.total_active)} />
              <MetricCard label="Average CLS" value={String(data.team_stats.avg_cls)} />
              <MetricCard label="Patients Today" value={String(data.team_stats.total_patients_today)} />
              <MetricCard label="Red Zone" value={String(data.team_stats.red_count)} />
              <MetricCard label="Amber Zone" value={String(data.team_stats.amber_count)} />
              <MetricCard label="Green Zone" value={String(data.team_stats.green_count)} />
            </div>
          </section>

          <section className="hospital-card">
            <p className="hospital-panel-title">Doctor Status Feed</p>
            <div className="hospital-scroll space-y-2 pr-1">
              {data.doctors.length === 0 && <p className="text-sm text-slate-600">No doctors found.</p>}
              {data.doctors.map((doctor) => (
                <div key={doctor.doctor_id} className="hospital-panel">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{doctor.name}</p>
                      <p className="text-xs text-slate-600">{doctor.specialty} · {doctor.ward}</p>
                    </div>
                    <span
                      className={`hospital-chip ${
                        doctor.status === 'red'
                          ? 'hospital-chip-danger'
                          : doctor.status === 'amber'
                            ? 'hospital-chip-warning'
                            : 'hospital-chip-success'
                      }`}
                    >
                      {doctor.status.toUpperCase()} · CLS {doctor.cls}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="hospital-metric">
      <p className="hospital-metric-label">{label}</p>
      <p className="hospital-metric-value">{value}</p>
    </div>
  );
}
