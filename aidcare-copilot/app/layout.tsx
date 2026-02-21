import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AidCare',
  description: 'AI health partner for multilingual triage, emergency readiness routing, and clinical support.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="hospital-page antialiased">{children}</body>
    </html>
  );
}
