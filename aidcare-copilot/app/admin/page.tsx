'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import Icon from '../../components/Icon';
import { getAdminDashboard, getAdminAllocation, getError } from '../../lib/api';
import { getSessionUser } from '../../lib/session';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DoctorCard {
  doctor_id: string;
  name: string;
  specialty: string;
  ward_name: string;
  cls: number;
  status: 'green' | 'amber' | 'red';
  patients_seen: number;
  hours_active: number;
  is_on_shift: boolean;
  shift_duration_hours: number;
}

interface RedAlert {
  doctor_id: string;
  name: string;
  cls: number;
  message: string;
}

interface TeamStats {
  total_active: number;
  red_count: number;
  amber_count: number;
  green_count: number;
  avg_cls: number;
  total_patients_today: number;
}

interface DashboardData {
  generated_at: string;
  team_stats: TeamStats;
  doctors: DoctorCard[];
  red_zone_alerts: RedAlert[];
}

interface Recommendation {
  id: string;
  source_ward: string;
  source_fatigue: number;
  source_available_staff: number;
  target_ward: string;
  target_fatigue: number;
  projected_fatigue_after: number;
  fatigue_reduction: string;
  priority: 'top' | 'normal';
}

interface AllocationData {
  hospital_name: string;
  overburdened_units: { ward_name: string; fatigue_index: number; patient_count: number; doctor_count: number }[];
  stable_units: { ward_name: string; fatigue_index: number; patient_count: number; doctor_count: number }[];
  recommendations: Recommendation[];
  overburdened_count: number;
  stable_count: number;
}

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  red:   { label: 'Critical Load', dot: 'bg-red-500',    badge: 'bg-red-50 text-red-700 border-red-100',    bar: 'bg-red-500' },
  amber: { label: 'High Load',     dot: 'bg-amber-500',  badge: 'bg-amber-50 text-amber-700 border-amber-100', bar: 'bg-amber-500' },
  green: { label: 'Optimal',       dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100', bar: 'bg-emerald-500' },
};

function CLSBar({ cls, status }: { cls: number; status: 'green' | 'amber' | 'red' }) {
  const pct = Math.min(100, cls);
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all ${STATUS_CONFIG[status].bar}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const user = typeof window !== 'undefined' ? getSessionUser() : null;

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [allocation, setAllocation] = useState<AllocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    const isAdmin = ['super_admin', 'org_admin', 'hospital_admin', 'admin'].includes(user.role);
    if (!isAdmin) { router.push('/'); return; }
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [dash, alloc] = await Promise.all([
        getAdminDashboard(),
        getAdminAllocation(),
      ]);
      setDashboard(dash as unknown as DashboardData);
      setAllocation(alloc as unknown as AllocationData);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }

  // Sort doctors: red first, then amber, then green, then by CLS desc within each group
  const sortedDoctors = dashboard?.doctors.slice().sort((a, b) => {
    const order = { red: 0, amber: 1, green: 2 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return b.cls - a.cls;
  }) ?? [];

  const hasRedAlerts = (dashboard?.red_zone_alerts.length ?? 0) > 0;
  const stats = dashboard?.team_stats;

  return (
    <AppShell>
      <main className="flex-1 overflow-y-auto bg-slate-50">

        {/* ── Page header ── */}
        <div className="bg-white border-b border-slate-200 px-6 lg:px-10 py-5">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Prevention Dashboard</p>
              <h1 className="text-2xl font-bold text-slate-900">Ward Command Centre</h1>
              {dashboard && (
                <p className="text-sm text-slate-500 mt-0.5">
                  {allocation?.hospital_name ?? user?.hospital_name ?? 'Hospital'} &bull; Updated {new Date(dashboard.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <button onClick={load} className="flex items-center gap-2 h-9 px-4 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 transition">
              <Icon name="refresh" className="text-lg" /> Refresh
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8 space-y-8">

          {/* ── Error ── */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {/* ── Loading ── */}
          {loading && (
            <div className="flex items-center justify-center py-24">
              <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && dashboard && (
            <>
              {/* ── Red zone alert banner ── */}
              {hasRedAlerts && (
                <div className="bg-red-600 rounded-xl p-5 text-white">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Icon name="warning" className="text-2xl" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-base mb-1">
                        {dashboard.red_zone_alerts.length} Doctor{dashboard.red_zone_alerts.length > 1 ? 's' : ''} in Critical Load Zone
                      </p>
                      <div className="space-y-1">
                        {dashboard.red_zone_alerts.map(a => (
                          <p key={a.doctor_id} className="text-sm text-red-100">
                            <span className="font-semibold text-white">{a.name}</span> — CLS {a.cls}/100 &bull; {a.message}
                          </p>
                        ))}
                      </div>
                    </div>
                    {allocation && allocation.recommendations.length > 0 && (
                      <a href="#recommendations" className="flex-shrink-0 h-9 px-4 rounded-lg bg-white text-red-600 text-sm font-semibold flex items-center gap-1.5 hover:bg-red-50 transition">
                        <Icon name="swap_horiz" className="text-lg" /> View Recommendations
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* ── Team stats ── */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: 'Active Doctors', value: stats?.total_active ?? 0, color: 'text-slate-900' },
                  { label: 'Critical Load', value: stats?.red_count ?? 0, color: 'text-red-600' },
                  { label: 'High Load', value: stats?.amber_count ?? 0, color: 'text-amber-600' },
                  { label: 'Optimal Load', value: stats?.green_count ?? 0, color: 'text-emerald-600' },
                  { label: 'Avg CLS Score', value: stats?.avg_cls ?? 0, color: 'text-slate-900' },
                  { label: 'Patients Today', value: stats?.total_patients_today ?? 0, color: 'text-slate-900' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* ── Doctor cards ── */}
              <section>
                <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Icon name="groups" className="text-xl text-slate-400" /> On-Shift Staff
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedDoctors.map(doc => {
                    const cfg = STATUS_CONFIG[doc.status];
                    return (
                      <div key={doc.doctor_id}
                        className={`bg-white rounded-xl border p-5 shadow-sm ${doc.status === 'red' ? 'border-red-200 ring-1 ring-red-200' : 'border-slate-200'}`}>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`size-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                              doc.status === 'red' ? 'bg-red-500' : doc.status === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}>
                              {doc.name.split(' ').map(n => n[0]).join('').slice(1, 3)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{doc.name}</p>
                              <p className="text-[10px] text-slate-500">{doc.specialty}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                        </div>

                        {/* CLS gauge */}
                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-medium text-slate-500">Cognitive Load Score</span>
                            <span className={`text-sm font-bold ${
                              doc.status === 'red' ? 'text-red-600' : doc.status === 'amber' ? 'text-amber-600' : 'text-emerald-600'
                            }`}>{doc.cls}<span className="text-slate-400 font-normal">/100</span></span>
                          </div>
                          <CLSBar cls={doc.cls} status={doc.status} />
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{doc.patients_seen}</p>
                            <p className="text-[10px] text-slate-400">Patients</p>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{doc.hours_active}h</p>
                            <p className="text-[10px] text-slate-400">Active</p>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{doc.ward_name.split(' ')[0]}</p>
                            <p className="text-[10px] text-slate-400">Ward</p>
                          </div>
                        </div>

                        {doc.status === 'red' && (
                          <div className="mt-3 pt-3 border-t border-red-100">
                            <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wide">⚠ Action Required</p>
                            <p className="text-xs text-slate-600 mt-0.5">Redistribute patients or provide immediate support to prevent errors.</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* ── AI Reallocation Recommendations ── */}
              {allocation && allocation.recommendations.length > 0 && (
                <section id="recommendations">
                  <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <Icon name="auto_awesome" className="text-xl text-amber-500" /> AI Reallocation Recommendations
                  </h2>
                  <p className="text-sm text-slate-500 mb-4">System-generated suggestions to reduce cognitive overload and prevent medical errors.</p>
                  <div className="space-y-3">
                    {allocation.recommendations.map(rec => (
                      <div key={rec.id}
                        className={`bg-white rounded-xl border p-5 shadow-sm flex flex-col md:flex-row gap-5 items-start ${rec.priority === 'top' ? 'border-red-200' : 'border-slate-200'}`}>
                        {rec.priority === 'top' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-100 uppercase tracking-wide self-start">Priority</span>
                        )}
                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-4">
                          {/* Source */}
                          <div className="text-center sm:text-left min-w-[120px]">
                            <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Transfer from</p>
                            <p className="text-sm font-bold text-slate-900">{rec.source_ward}</p>
                            <div className="flex items-center gap-1 justify-center sm:justify-start mt-1">
                              <span className="size-2 rounded-full bg-emerald-500" />
                              <p className="text-xs text-slate-500">CLS {rec.source_fatigue}</p>
                            </div>
                          </div>

                          {/* Arrow */}
                          <div className="flex items-center justify-center flex-1">
                            <div className="flex items-center gap-2 w-full max-w-xs">
                              <div className="h-px flex-1 bg-slate-200" />
                              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-600 whitespace-nowrap">
                                <Icon name="person_add" className="text-sm text-primary" />
                                Move 1 doctor
                              </div>
                              <div className="h-px flex-1 bg-slate-200" />
                            </div>
                          </div>

                          {/* Target */}
                          <div className="text-center sm:text-right min-w-[120px]">
                            <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">To relieve</p>
                            <p className="text-sm font-bold text-slate-900">{rec.target_ward}</p>
                            <div className="flex items-center gap-1 justify-center sm:justify-end mt-1">
                              <span className="size-2 rounded-full bg-red-500" />
                              <p className="text-xs text-slate-500">CLS {rec.target_fatigue}</p>
                            </div>
                          </div>
                        </div>

                        {/* Outcome */}
                        <div className="flex-shrink-0 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 text-center min-w-[130px]">
                          <p className="text-lg font-bold text-emerald-600">{rec.fatigue_reduction}</p>
                          <p className="text-[10px] text-emerald-700 font-medium uppercase tracking-wide">Fatigue Reduction</p>
                          <p className="text-[10px] text-slate-500 mt-1">Projected CLS → {rec.projected_fatigue_after}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Unit overview table ── */}
              {allocation && (allocation.overburdened_units.length > 0 || allocation.stable_units.length > 0) && (
                <section>
                  <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Icon name="grid_view" className="text-xl text-slate-400" /> Unit Overview
                  </h2>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ward</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fatigue Index</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Patients</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Doctors</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...allocation.overburdened_units, ...allocation.stable_units].map((u, i) => {
                          const fi = u.fatigue_index;
                          const st = fi >= 70 ? 'red' : fi >= 40 ? 'amber' : 'green';
                          return (
                            <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition">
                              <td className="px-5 py-3 font-medium text-slate-900">{u.ward_name}</td>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div className={`h-1.5 rounded-full ${STATUS_CONFIG[st].bar}`} style={{ width: `${Math.min(100, fi)}%` }} />
                                  </div>
                                  <span className="text-sm font-semibold text-slate-700">{fi}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3 text-slate-700">{u.patient_count}</td>
                              <td className="px-5 py-3 text-slate-700">{u.doctor_count}</td>
                              <td className="px-5 py-3">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${STATUS_CONFIG[st].badge}`}>
                                  {STATUS_CONFIG[st].label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* No recommendations fallback */}
              {allocation && allocation.recommendations.length === 0 && !hasRedAlerts && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 text-center">
                  <Icon name="check_circle" className="text-4xl text-emerald-500 mb-2" />
                  <p className="font-semibold text-emerald-800">All units within safe operating range</p>
                  <p className="text-sm text-emerald-600 mt-1">No reallocation required at this time.</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </AppShell>
  );
}
