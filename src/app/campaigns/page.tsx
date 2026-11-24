'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { SERVICE_OPTIONS } from '@/lib/constants';
import { Play, Plus, Trash2, Loader2, Target, AlertTriangle, ArrowRight } from 'lucide-react';

interface CampaignRow {
  _id: string;
  name: string;
  industry: string;
  country: string;
  city: string;
  targetBusinessType: string;
  companySize: string;
  requiredServices: string[];
  targetCount: number;
  status: string;
  discoveredCount: number;
  auditedCount: number;
  lastRunError?: string;
  createdAt: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runReport, setRunReport] = useState<string>('');
  const [runWarnings, setRunWarnings] = useState<string[]>([]);

  const [form, setForm] = useState({
    name: '',
    industry: 'Healthcare',
    country: 'India',
    city: 'Pune',
    targetBusinessType: 'Clinics and Healthcare Startups',
    companySize: '1-50',
    requiredServices: ['Website Development & Redesign', 'Custom CRM / ERP Software'],
    keywords: '',
    targetCount: 15,
  });

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/campaigns');
      const data = await res.json();
      if (data.success) setCampaigns(data.campaigns);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const toggleService = (svc: string) => {
    setForm((prev) => ({
      ...prev,
      requiredServices: prev.requiredServices.includes(svc)
        ? prev.requiredServices.filter((s) => s !== svc)
        : [...prev.requiredServices, svc],
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) {
      setShowCreate(false);
      setForm({ ...form, name: '' });
      await fetchCampaigns();
    } else {
      alert(data.error || 'Failed to create campaign');
    }
  };

  const handleRunCampaign = async (id: string) => {
    setRunningId(id);
    setRunReport('');
    setRunWarnings([]);
    try {
      const res = await fetch(`/api/campaigns/${id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoAudit: true }),
      });
      const data = await res.json();
      if (data.success) {
        setRunReport(
          `Discovered ${data.discoveredCount} new leads, audited ${data.auditedCount}, skipped ${data.duplicatesSkipped} duplicates (${data.sourcesUsed?.join(', ') || 'No discovery API active'}).`
        );
        if (Array.isArray(data.warnings)) setRunWarnings(data.warnings);
        await fetchCampaigns();
      } else {
        setRunWarnings([data.error || 'Campaign execution failed']);
      }
    } finally {
      setRunningId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign? Discovered leads will remain in your CRM.')) return;
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
    await fetchCampaigns();
  };

  return (
    <AppShell
      title="AI Lead Hunter Campaigns"
      subtitle="Configure target market criteria to discover, deduplicate, extract contacts & auto-audit prospects"
      actions={
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition"
        >
          <Plus className="w-4 h-4" />
          Create Campaign
        </button>
      }
    >
      <div className="space-y-6">
        {runReport && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm flex items-center justify-between gap-4">
            <span>{runReport}</span>
            <Link href="/leads" className="text-xs font-semibold underline flex items-center gap-1 shrink-0">
              View Leads <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {runWarnings.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4" />
              Campaign Notice
            </div>
            {runWarnings.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>
        )}

        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="bg-[#0b1120] border border-slate-800 rounded-2xl p-6 space-y-4"
          >
            <h2 className="text-base font-bold text-white">New Lead Discovery Campaign</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Campaign Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Pune Healthcare & Clinics Q4"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Target Industry *</label>
                <input
                  required
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  placeholder="Healthcare, E-commerce, SaaS..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Target Business Type</label>
                <input
                  value={form.targetBusinessType}
                  onChange={(e) => setForm({ ...form, targetBusinessType: e.target.value })}
                  placeholder="Clinics, Cafes, D2C Brands..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Country *</label>
                <input
                  required
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">City / Region</label>
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Lead Quantity (1–50)</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={form.targetCount}
                  onChange={(e) => setForm({ ...form, targetCount: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Services to Pitch</label>
              <div className="flex flex-wrap gap-2">
                {SERVICE_OPTIONS.map((svc) => {
                  const selected = form.requiredServices.includes(svc);
                  return (
                    <button
                      type="button"
                      key={svc}
                      onClick={() => toggleService(svc)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                        selected
                          ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200 font-medium'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      {svc}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Extra Search Keywords (Optional)</label>
              <input
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                placeholder="e.g. dental clinic, physiotherapy, no booking..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
              >
                Save Campaign
              </button>
            </div>
          </form>
        )}

        {/* Campaign List */}
        {loading ? (
          <div className="h-40 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
        ) : campaigns.length === 0 ? (
          <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-12 text-center">
            <Target className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No Campaigns Yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Create your first campaign to instruct the AI Lead Hunter & Business Auditor to discover real businesses and score opportunities.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map((c) => (
              <div
                key={c._id}
                className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-white text-base">{c.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {c.industry} · {c.city ? `${c.city}, ` : ''}
                        {c.country} · Target: {c.targetCount}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-800 text-slate-300">
                      {c.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {c.requiredServices.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300"
                      >
                        {s}
                      </span>
                    ))}
                  </div>

                  {c.lastRunError && (
                    <p className="mt-3 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                      {c.lastRunError}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    <span className="text-white font-semibold">{c.discoveredCount}</span> Leads ·{' '}
                    <span className="text-cyan-300 font-semibold">{c.auditedCount}</span> Audited
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(c._id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                      title="Delete Campaign"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRunCampaign(c._id)}
                      disabled={runningId === c._id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 text-xs font-semibold text-white"
                    >
                      {runningId === c._id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running...
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" /> Run Hunter + Audit
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

