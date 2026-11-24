import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LeadOrbit | AI Client Acquisition & CRM — NextOrbit Infotech',
  description:
    'AI-powered Business Development & Client Acquisition Platform by NextOrbit Infotech.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#070b14] text-slate-100 antialiased">{children}</body>
    </html>
  );
}

