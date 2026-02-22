'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../components/AppShell';
import Icon from '../components/Icon';
import { getPatients, getActiveShift, startShift, getMyBurnout, getError } from '../lib/api';
import { getSessionUser, getSessionShift, setSessionShift } from '../lib/session';

const CARDS = [
  { title: 'Triage', desc: 'Assess patient urgency in their language', icon: 'stethoscope', href: '/triage', color: '#10b981' },
  { title: 'Scribe', desc: 'Record consultation & auto-generate SOAP', icon: 'mic', href: '/scribe', color: '#2563eb' },
  { title: 'Patients', desc: 'View patient records and history', icon: 'group', href: '/patients', color: '#f59e0b' },
  { title: 'Handover', desc: 'Generate shift handover report', icon: 'swap_horiz', href: '/handover', color: '#ef4444' },
];

export default function DashboardPage() {
  const router = useRouter();
  const user = typeof window !== 'undefined' ? getSessionUser() : null;
  const [patientData, setPatientData] = useState<{ total: number; critical: number } | null>(null);
  const [burnout, setBurnout] = useState<{ status: string; cognitive_load_score: number; recommendation: string } | null>(null);
  const [shiftActive, setShiftActive] = useState<boolean | null>(null);
  const [shiftError, setShiftError] = useState('');

  useEffect(() => {
    if (!user) return;
    getPatients(user.ward_id || undefined)
      .then(d => setPatientData({ total: d.total, critical: d.patients.critical.length }))
      .catch(() => setPatientData({ total: 0, critical: 0 }));
    getActiveShift().then(a => {
      if (a.shift) {
        setSessionShift({ shift_id: a.shift.shift_id, started_at: a.shift.started_at, ward_id: a.shift.ward_id, ward_name: a.shift.ward_name });
        setShiftActive(true);
      } else setShiftActive(false);
    }).catch(() => setShiftActive(false));
    getMyBurnout()
      .then(b => setBurnout(b as { status: string; cognitive_load_score: number; recommendation: string }))
      .catch(() => {});
  }, [user]);

  async function handleStartShift() {
    setShiftError('');
    try {
      const r = await startShift(user?.ward_id || undefined);
      setSessionShift({ shift_id: r.shift_id, started_at: r.started_at, ward_id: r.ward_id, ward_name: null });
      setShiftActive(true);
    } catch (err) { setShiftError(getError(err)); }
  }

  const shift = typeof window !== 'undefined' ? getSessionShift() : null;

  return (
    <AppShell>
      <main className="flex-1 p-6 lg:p-10 max-w-6xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back{user ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {user?.hospital_name || 'AidCare Copilot'} {user?.ward_name ? ` • ${user.ward_name}` : ''}
          </p>
        </div>

        {/* Live stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Patients in Ward</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{patientData?.total ?? '—'}</p>
            {patientData && patientData.critical > 0 && (
              <p className="text-xs font-semibold text-red-600 mt-1 flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-red-500 inline-block" />
                {patientData.critical} critical
              </p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Shift Status</p>
            <p className="text-lg font-bold mt-1">
              {shiftActive === true ? (
                <span className="text-emerald-600 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500" /> Active
                </span>
              ) : shiftActive === false ? (
                <span className="text-slate-500">No active shift</span>
              ) : '—'}
            </p>
            {shiftActive === false && (
              <button onClick={handleStartShift} className="mt-2 text-xs text-blue-600 hover:underline font-medium">
                Start shift
              </button>
            )}
            {shiftError && <p className="text-xs text-red-600 mt-1">{shiftError}</p>}
          </div>
          {shift && shiftActive ? (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Shift Duration</p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {shift.started_at ? (() => {
                  const start = new Date(shift.started_at);
                  const now = new Date();
                  const mins = Math.floor((now.getTime() - start.getTime()) / 60000);
                  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
                })() : '—'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Shift Duration</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">—</p>
            </div>
          )}
          <a href="/burnout" className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all block">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Doctor Load</p>
            {burnout ? (
              <>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`size-3 rounded-full flex-shrink-0 ${
                    burnout.status === 'red' ? 'bg-red-500' :
                    burnout.status === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                  <p className="text-lg font-bold text-slate-900 capitalize">{burnout.status}</p>
                </div>
                {burnout.status !== 'green' && (
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">{burnout.recommendation}</p>
                )}
                <p className="text-[10px] text-primary mt-1 font-medium">View tracking →</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-slate-900 mt-1">—</p>
                <p className="text-[10px] text-slate-500 mt-1">Track after Scribe use</p>
              </>
            )}
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CARDS.map(card => (
            <button
              key={card.href}
              onClick={() => router.push(card.href)}
              className="bg-white rounded-xl border border-slate-200 p-5 text-left hover:shadow-md hover:border-slate-300 transition-all group"
            >
              <div
                className="size-10 rounded-lg flex items-center justify-center mb-4"
                style={{ background: `${card.color}15`, color: card.color }}
              >
                <Icon name={card.icon} className="text-2xl" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 group-hover:text-primary transition-colors">{card.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{card.desc}</p>
            </button>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
