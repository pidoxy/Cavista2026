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
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-10">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">Team load and staffing snapshot.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadDashboard}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Refresh
            </button>
            <button
              onClick={() => router.push('/doctor')}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Back to Doctor Login
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">Loading dashboard...</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            <p>{error}</p>
            <button
              onClick={loadDashboard}
              className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        ) : data ? (
          <>
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard label="Active Doctors" value={String(data.team_stats.total_active)} />
              <MetricCard label="Average CLS" value={String(data.team_stats.avg_cls)} />
              <MetricCard label="Patients Today" value={String(data.team_stats.total_patients_today)} />
              <MetricCard label="Red Zone" value={String(data.team_stats.red_count)} />
              <MetricCard label="Amber Zone" value={String(data.team_stats.amber_count)} />
              <MetricCard label="Green Zone" value={String(data.team_stats.green_count)} />
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Doctor Status</h2>
              <div className="space-y-2">
                {data.doctors.length === 0 && (
                  <p className="text-sm text-gray-600">No doctors found.</p>
                )}
                {data.doctors.map((doctor) => (
                  <div key={doctor.doctor_id} className="rounded-xl border border-gray-100 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doctor.name}</p>
                        <p className="text-xs text-gray-600">{doctor.specialty} · {doctor.ward}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          doctor.status === 'red'
                            ? 'bg-red-100 text-red-700'
                            : doctor.status === 'amber'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {doctor.status.toUpperCase()} · CLS {doctor.cls}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
