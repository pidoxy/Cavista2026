'use client';

import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import Icon from '../../components/Icon';
import { getMyBurnout, getAdminDashboard, getAdminOrganogram, getError } from '../../lib/api';
import { getSessionUser } from '../../lib/session';

type BurnoutStatus = 'green' | 'amber' | 'red';

interface BurnoutData {
  doctor_id: string;
  doctor_name: string;
  current_shift: { shift_id: string; start: string; patients_seen: number; hours_active: number } | null;
  cognitive_load_score: number;
  status: BurnoutStatus;
  score_breakdown: { volume: number; complexity: number; duration: number; consecutive: number };
  history_7_days: { date: string; cls: number; status: string }[];
  recommendation: string;
}

const STATUS_COLORS: Record<BurnoutStatus, { bg: string; text: string; border: string }> = {
  green: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

const ADMIN_ROLES = ['super_admin', 'org_admin', 'hospital_admin', 'admin'];

export default function BurnoutPage() {
  const user = typeof window !== 'undefined' ? getSessionUser() : null;
  const isAdmin = user ? ADMIN_ROLES.includes(user.role) : false;

  const [data, setData] = useState<BurnoutData | null>(null);
  const [teamData, setTeamData] = useState<{
    team_stats: { total_active: number; red_count: number; amber_count: number; green_count: number; avg_cls: number };
    doctors: { doctor_id: string; name: string; specialty: string; role?: string; ward_name: string; hospital_name?: string; cls: number; status: string }[];
    red_zone_alerts: { doctor_id: string; name: string; cls: number; message: string }[];
  } | null>(null);
  const [organogramData, setOrganogramData] = useState<{
    scope: string;
    organizations?: { org_id: string; name: string; hospitals: { hospital_id: string; name: string; wards: { ward_id: string; name: string; ward_type: string; doctors: { doctor_id: string; name: string; role: string; cls: number; status: string }[] }[]; admins: { doctor_id: string; name: string; role: string; cls: number; status: string }[] }[] }[];
    hospitals?: { hospital_id: string; name: string; wards: { ward_id: string; name: string; ward_type: string; doctors: { doctor_id: string; name: string; role: string; cls: number; status: string }[] }[]; admins: { doctor_id: string; name: string; role: string; cls: number; status: string }[] }[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'mine' | 'team' | 'organogram'>('mine');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timeout = (ms: number) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms));
    const load = async () => {
      try {
        const my = await Promise.race([getMyBurnout(), timeout(10000)]);
        setData(my as BurnoutData);
        setLoading(false);
        if (isAdmin) {
          Promise.allSettled([getAdminDashboard(), getAdminOrganogram()]).then(([teamRes, orgRes]) => {
            if (teamRes.status === 'fulfilled') setTeamData(teamRes.value as never);
            if (orgRes.status === 'fulfilled') setOrganogramData(orgRes.value as never);
          });
        }
      } catch (err) {
        setError(getError(err));
        setLoading(false);
      }
    };
    load();
  }, [isAdmin]);

  if (loading) {
    return (
      <AppShell>
        <main className="flex-1 p-6 lg:p-10 max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-center py-20">
            <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </main>
      </AppShell>
    );
  }

  if (error && !data && !teamData) {
    return (
      <AppShell>
        <main className="flex-1 p-6 lg:p-10 max-w-4xl mx-auto w-full">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700">{error || 'Unable to load burnout data.'}</p>
          </div>
        </main>
      </AppShell>
    );
  }

  const statusStyle = data ? (STATUS_COLORS[data.status as BurnoutStatus] || STATUS_COLORS.green) : STATUS_COLORS.green;
  const breakdown = data?.score_breakdown ?? { volume: 0, complexity: 0, duration: 0, consecutive: 0 };
  const totalBreakdown = breakdown.volume + breakdown.complexity + breakdown.duration + breakdown.consecutive;

  return (
    <AppShell>
      <main className="flex-1 p-6 lg:p-10 max-w-4xl mx-auto w-full">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Burnout Tracking</h1>
            <p className="text-sm text-slate-500 mt-1">
              Cognitive load score (CLS) based on consultation volume, complexity, and shift duration
            </p>
          </div>
          {isAdmin && (
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                onClick={() => setActiveTab('mine')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${activeTab === 'mine' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                My Burnout
              </button>
              <button
                onClick={() => setActiveTab('team')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${activeTab === 'team' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Team Dashboard
              </button>
              <button
                onClick={() => setActiveTab('organogram')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${activeTab === 'organogram' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Organogram
              </button>
            </div>
          )}
        </div>

        {/* Team Dashboard (admin only) */}
        {isAdmin && activeTab === 'team' && teamData && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Active', value: teamData.team_stats.total_active, color: 'text-slate-900' },
                { label: 'Critical', value: teamData.team_stats.red_count, color: 'text-red-600' },
                { label: 'High Load', value: teamData.team_stats.amber_count, color: 'text-amber-600' },
                { label: 'Optimal', value: teamData.team_stats.green_count, color: 'text-emerald-600' },
                { label: 'Avg CLS', value: teamData.team_stats.avg_cls, color: 'text-slate-900' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamData.doctors.map(doc => (
                <div key={doc.doctor_id} className={`bg-white rounded-xl border p-4 ${doc.status === 'red' ? 'border-red-200' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-slate-900">{doc.name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      doc.status === 'red' ? 'bg-red-50 text-red-700' :
                      doc.status === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>{doc.status}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{doc.specialty}{doc.hospital_name ? ` • ${doc.hospital_name}` : ''}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-2 rounded-full ${
                        doc.status === 'red' ? 'bg-red-500' : doc.status === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} style={{ width: `${Math.min(100, doc.cls)}%` }} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">{doc.cls}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Organogram (admin only) */}
        {isAdmin && activeTab === 'organogram' && organogramData && (
          <OrganogramSection data={organogramData} />
        )}

        {/* My Burnout (default) */}
        {activeTab === 'mine' && (
          data ? (
          <>
        {/* Current status */}
        <div className={`rounded-xl border p-6 mb-6 ${statusStyle.bg} ${statusStyle.border}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`size-14 rounded-xl flex items-center justify-center ${
                data.status === 'red' ? 'bg-red-100' :
                data.status === 'amber' ? 'bg-amber-100' : 'bg-emerald-100'
              }`}>
                <Icon name="monitoring" className={`text-3xl ${
                  data.status === 'red' ? 'text-red-600' :
                  data.status === 'amber' ? 'text-amber-600' : 'text-emerald-600'
                }`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Current Status</p>
                <p className={`text-2xl font-bold capitalize ${statusStyle.text}`}>{data.status}</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{data.cognitive_load_score} <span className="text-lg font-normal text-slate-500">/ 100</span></p>
              </div>
            </div>
            {data.current_shift && (
              <div className="text-right text-sm text-slate-600">
                <p className="font-medium text-slate-900">Active Shift</p>
                <p>{data.current_shift.patients_seen} patients seen</p>
                <p>{data.current_shift.hours_active?.toFixed(1) || '0'} hours</p>
              </div>
            )}
          </div>
          {data.recommendation && (
            <div className="mt-4 pt-4 border-t border-slate-200/50">
              <p className="text-sm font-medium text-slate-700">{data.recommendation}</p>
            </div>
          )}
        </div>

        {/* Score breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Score Breakdown</h2>
          <div className="space-y-3">
            {[
              { key: 'volume', label: 'Volume (consultations)', value: breakdown.volume, desc: 'Based on number of patients seen' },
              { key: 'complexity', label: 'Complexity', value: breakdown.complexity, desc: 'Average case complexity' },
              { key: 'duration', label: 'Duration', value: breakdown.duration, desc: 'Hours on shift' },
              { key: 'consecutive', label: 'Consecutive shifts', value: breakdown.consecutive, desc: 'Back-to-back shifts' },
            ].map(({ key, label, value, desc }) => (
              <div key={key} className="flex items-center gap-4">
                <div className="w-24 text-sm font-medium text-slate-700">{label}</div>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${totalBreakdown ? (value / totalBreakdown) * 100 : 0}%` }}
                  />
                </div>
                <div className="w-12 text-right text-sm font-bold text-slate-900">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 7-day history */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Last 7 Days</h2>
          {data.history_7_days.length > 0 ? (
            <div className="space-y-2">
              {data.history_7_days.map((h, i) => (
                <div key={i} className="flex items-center gap-4 py-2 border-b border-slate-50 last:border-0">
                  <span className="w-28 text-sm text-slate-600">
                    {new Date(h.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-48">
                    <div
                      className={`h-full rounded-full ${
                        h.status === 'red' ? 'bg-red-500' :
                        h.status === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${h.cls}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm font-bold text-slate-900">{h.cls}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${
                    h.status === 'red' ? 'bg-red-50 text-red-700' :
                    h.status === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {h.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No history yet. Burnout scores are recorded after each Scribe consultation.</p>
          )}
        </div>
          </>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500">
              <p>Unable to load your burnout data.</p>
            </div>
          )
        )}
      </main>
    </AppShell>
  );
}

function OrganogramSection({ data }: { data: { scope: string; organizations?: { org_id: string; name: string; hospitals: { hospital_id: string; name: string; wards: { ward_id: string; name: string; ward_type: string; doctors: { doctor_id: string; name: string; role: string; cls: number; status: string }[] }[]; admins: { doctor_id: string; name: string; role: string; cls: number; status: string }[] }[] }[]; hospitals?: { hospital_id: string; name: string; wards: { ward_id: string; name: string; ward_type: string; doctors: { doctor_id: string; name: string; role: string; cls: number; status: string }[] }[]; admins: { doctor_id: string; name: string; role: string; cls: number; status: string }[] }[] } }) {
  const chip = (d: { doctor_id: string; name: string; role: string; cls: number; status: string }) => (
    <span key={d.doctor_id} className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs ${
      d.status === 'red' ? 'bg-red-50 text-red-700 border-red-100' :
      d.status === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
    }`}>
      {d.name} • {d.role.replace(/_/g, ' ')} • CLS {d.cls}
    </span>
  );
  if (data.organizations?.length) {
    return (
      <div className="space-y-6">
        {data.organizations.map(org => (
          <div key={org.org_id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-800 text-white px-5 py-4">
              <h3 className="text-lg font-bold">{org.name}</h3>
                <p className="text-slate-300 text-sm">Organization</p>
            </div>
            <div className="p-5 space-y-6">
              {org.hospitals.map(h => (
                <div key={h.hospital_id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-4 py-3 font-semibold text-slate-800">{h.name}</div>
                  <div className="p-4 space-y-4">
                    {h.admins.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Hospital Admins</p>
                        <div className="flex flex-wrap gap-2">{h.admins.map(a => chip(a))}</div>
                      </div>
                    )}
                    {h.wards.map(w => (
                      <div key={w.ward_id} className="border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                        <p className="text-sm font-semibold text-slate-700 mb-2">{w.name} ({w.ward_type})</p>
                        <div className="flex flex-wrap gap-2">
                          {w.doctors.map(d => chip(d))}
                          {w.doctors.length === 0 && <span className="text-xs text-slate-400 italic">No doctors</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (data.hospitals?.length) {
    return (
      <div className="space-y-6">
        {data.hospitals.map(h => (
          <div key={h.hospital_id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-700 text-white px-5 py-4 font-bold">{h.name}</div>
            <div className="p-5 space-y-4">
              {h.admins.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Hospital Admins</p>
                  <div className="flex flex-wrap gap-2">{h.admins.map(a => chip(a))}</div>
                </div>
              )}
              {h.wards.map(w => (
                <div key={w.ward_id} className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                  <p className="text-sm font-semibold text-slate-700 mb-2">{w.name} ({w.ward_type})</p>
                  <div className="flex flex-wrap gap-2">
                    {w.doctors.map(d => chip(d))}
                    {w.doctors.length === 0 && <span className="text-xs text-slate-400 italic">No doctors</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500">No hierarchy data for your scope.</div>;
}
