'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Orbit, Lock, Mail, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@nextorbit.in');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  useEffect(() => {
    fetch('/api/health')
      .then((r) => (r.ok ? setDbStatus('connected') : setDbStatus('disconnected')))
      .catch(() => setDbStatus('disconnected'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Login failed');
        return;
      }
      router.replace('/dashboard');
    } catch {
      setError('Network error while logging in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 items-center justify-center shadow-xl shadow-indigo-500/20 mb-4">
            <Orbit className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">LeadOrbit</h1>
          <p className="text-sm text-slate-400 mt-1">
            AI Client Acquisition & CRM · NextOrbit Infotech
          </p>
        </div>

        {/* MongoDB Connection Indicator */}
        <div
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs ${
            dbStatus === 'connected'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : dbStatus === 'disconnected'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          {dbStatus === 'connected' ? (
            <>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>MongoDB Connected · Default accounts seeded</span>
            </>
          ) : dbStatus === 'disconnected' ? (
            <>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                MongoDB not reachable. Add your Atlas <code>MONGODB_URI</code> in{' '}
                <code>.env.local</code> and refresh.
              </span>
            </>
          ) : (
            <span>Checking MongoDB connection...</span>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#0b1120] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl"
        >
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                placeholder="admin@nextorbit.in"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition shadow-lg shadow-indigo-500/20"
          >
            {loading ? 'Signing in...' : 'Sign In to LeadOrbit'}
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Quick Role Fill */}
          <div className="pt-3 border-t border-slate-800/80">
            <p className="text-[11px] text-slate-400 mb-2">Quick Fill Default Accounts:</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@nextorbit.in');
                  setPassword('Admin@123');
                }}
                className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[11px] text-indigo-300 font-medium"
              >
                Super Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('manager@nextorbit.in');
                  setPassword('Bde@123');
                }}
                className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[11px] text-cyan-300 font-medium"
              >
                Sales Mgr
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('bde@nextorbit.in');
                  setPassword('Bde@123');
                }}
                className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[11px] text-emerald-300 font-medium"
              >
                BDE Exec
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

