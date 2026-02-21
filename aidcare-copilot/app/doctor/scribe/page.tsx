'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  clearSessionDoctor,
  getSessionDoctor,
  getSessionShift,
  getShiftDuration,
} from '../../../lib/session';

export default function DoctorScribePage() {
  const router = useRouter();
  const doctor = getSessionDoctor();
  const shift = getSessionShift();

  useEffect(() => {
    if (!doctor || !shift) {
      router.replace('/doctor');
    }
  }, [doctor, shift, router]);

  if (!doctor || !shift) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Shift started</h1>
          <p className="mt-1 text-sm text-gray-600">
            Welcome, {doctor.name}. Your session is active in {shift.ward}.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-700">
            Shift ID: <span className="font-mono text-gray-900">{shift.shift_id}</span>
          </p>
          <p className="mt-2 text-sm text-gray-700">
            Started: <span className="text-gray-900">{new Date(shift.started_at).toLocaleString()}</span>
          </p>
          <p className="mt-2 text-sm text-gray-700">
            Duration: <span className="text-gray-900">{getShiftDuration(shift.started_at)}</span>
          </p>

          <p className="mt-6 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
            Scribe workspace is scaffolded and ready for the next feature pass.
          </p>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => router.push('/doctor')}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Back to Login
            </button>
            <button
              onClick={() => {
                clearSessionDoctor();
                router.replace('/doctor');
              }}
              className="rounded-lg bg-[#0066CC] px-4 py-2 text-sm font-medium text-white hover:bg-[#0052a3]"
            >
              End Local Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
