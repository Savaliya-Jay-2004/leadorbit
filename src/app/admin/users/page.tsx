'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { UserRole } from '@/types';
import { Ban, Plus, Trash2, UserPlus } from 'lucide-react';

interface TeamUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

interface SuppressionRow {
  _id: string;
  email: string;
  normalizedDomain: string;
  phone: string;
  reason: string;
  addedBy: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [suppression, setSuppression] = useState<SuppressionRow[]>([]);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'BDE' as UserRole,
  });
  const [newSup, setNewSup] = useState({ domain: '', email: '', phone: '', reason: '' });

  const loadData = async () => {
    const [uRes, sRes] = await Promise.all([
      fetch('/api/admin/users').then((r) => r.json()),
      fetch('/api/admin/suppression').then((r) => r.json()),
    ]);
    if (uRes.success) setUsers(uRes.users);
    if (sRes.success) setSuppression(sRes.entries);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });
    const data = await res.json();
    if (data.success) {
      setNewUser({ name: '', email: '', password: '', role: 'BDE' });
      await loadData();
    } else {
      alert(data.error || 'Could not create user');
    }
  };

  const handleToggleActive = async (u: TeamUser) => {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: u._id, isActive: !u.isActive }),
    });
    await loadData();
  };

  const handleAddSuppression = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/suppression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSup),
    });
    setNewSup({ domain: '', email: '', phone: '', reason: '' });
    await loadData();
  };

  const handleDeleteSuppression = async (id: string) => {
    await fetch(`/api/admin/suppression?id=${id}`, { method: 'DELETE' });
    await loadData();
  };

  return (
    <AppShell
      title="Team Management & Do-Not-Contact List"
      subtitle="Manage Super Admins, Sales Managers, BDEs, and global opted-out suppression rules"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Management */}
        <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5 space-y-5">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-indigo-400" /> Team Accounts
          </h2>

          <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              required
              placeholder="Full Name *"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            />
            <input
              required
              type="email"
              placeholder="Email *"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            />
            <input
              required
              type="password"
              placeholder="Password *"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            />
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="BDE">BDE Executive</option>
              <option value="SALES_MANAGER">Sales Manager</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
            <button
              type="submit"
              className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
            >
              <Plus className="w-3.5 h-3.5" /> Create User
            </button>
          </form>

          <div className="space-y-2">
            {users.map((u) => (
              <div
                key={u._id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs"
              >
                <div>
                  <p className="font-semibold text-white">{u.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {u.email} · {u.role}
                  </p>
                </div>
                <button
                  onClick={() => handleToggleActive(u)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                    u.isActive
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-rose-500/15 text-rose-300'
                  }`}
                >
                  {u.isActive ? 'Active' : 'Disabled'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Global Do-Not-Contact Suppression */}
        <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5 space-y-5">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Ban className="w-4 h-4 text-rose-400" /> Global Do-Not-Contact Suppression
          </h2>

          <form onSubmit={handleAddSuppression} className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              placeholder="Domain (e.g. acme.com)"
              value={newSup.domain}
              onChange={(e) => setNewSup({ ...newSup, domain: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            />
            <input
              placeholder="Email"
              value={newSup.email}
              onChange={(e) => setNewSup({ ...newSup, email: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            />
            <input
              placeholder="Phone"
              value={newSup.phone}
              onChange={(e) => setNewSup({ ...newSup, phone: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            />
            <input
              placeholder="Reason"
              value={newSup.reason}
              onChange={(e) => setNewSup({ ...newSup, reason: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            />
            <button
              type="submit"
              className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-xs font-semibold text-white"
            >
              <Ban className="w-3.5 h-3.5" /> Add to Suppression List
            </button>
          </form>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {suppression.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                No suppressed domains, emails, or numbers yet.
              </p>
            ) : (
              suppression.map((s) => (
                <div
                  key={s._id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs"
                >
                  <div>
                    <p className="font-semibold text-white">
                      {s.normalizedDomain || s.email || s.phone}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {s.reason} · By {s.addedBy}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteSuppression(s._id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

