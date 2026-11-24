'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Target,
  Users,
  CalendarClock,
  Briefcase,
  KeyRound,
  Bot,
  ShieldAlert,
  LogOut,
  Orbit,
  Menu,
  X,
} from 'lucide-react';
import { SessionUser } from '@/types';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function AppShell({ children, title, subtitle, actions }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
        } else {
          router.replace('/login');
        }
      })
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070b14]">
        <div className="flex flex-col items-center gap-3">
          <Orbit className="w-9 h-9 text-indigo-400 animate-spin" />
          <p className="text-sm text-slate-400">Loading LeadOrbit Workspace...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/campaigns', label: 'Lead Campaigns', icon: Target },
    { href: '/leads', label: 'Leads & Pipeline', icon: Users },
    { href: '/follow-ups', label: 'Follow-ups', icon: CalendarClock },
    { href: '/portfolio', label: 'Portfolio Library', icon: Briefcase },
  ];

  const adminItems = [
    { href: '/admin/integrations', label: 'API Vault', icon: KeyRound },
    { href: '/admin/ai-settings', label: 'AI Modules & Prompts', icon: Bot },
    { href: '/admin/users', label: 'Team & Suppression', icon: ShieldAlert },
  ];

  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  return (
    <div className="min-h-screen flex bg-[#070b14] text-slate-100">
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-[#0b1120] border-r border-slate-800/80 flex flex-col transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-5 py-5 border-b border-slate-800/80 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Orbit className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-white tracking-tight leading-none">LeadOrbit</div>
              <div className="text-[11px] text-slate-400 mt-0.5">NextOrbit Infotech</div>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Workspace
            </p>
            <div className="space-y-1">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                      active
                        ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {isSuperAdmin && (
            <div>
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Super Admin
              </p>
              <div className="space-y-1">
                {adminItems.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                        active
                          ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        <div className="p-3 border-t border-slate-800/80">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                {user.role.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-[#070b14]/90 backdrop-blur-md border-b border-slate-800/80 px-5 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              {title && <h1 className="text-lg lg:text-xl font-bold text-white">{title}</h1>}
              {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
        </header>

        <main className="flex-1 p-5 lg:p-8 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

