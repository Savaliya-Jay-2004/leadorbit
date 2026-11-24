'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { LEAD_CATEGORIES, PIPELINE_STAGES } from '@/lib/constants';
import { PipelineStage } from '@/types';
import {
  Download,
  Plus,
  Search,
  LayoutList,
  Kanban,
  Phone,
  Mail,
  Globe,
  ExternalLink,
  Ban,
} from 'lucide-react';

interface LeadRow {
  _id: string;
  companyName: string;
  website: string;
  phone: string;
  email: string;
  linkedinUrl: string;
  instagramUrl: string;
  country: string;
  city: string;
  industry: string;
  category: string;
  source: string;
  aiStatus: string;
  pipelineStage: PipelineStage;
  auditScore: number;
  doNotContact: boolean;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newLead, setNewLead] = useState({
    companyName: '',
    website: '',
    phone: '',
    email: '',
    contactPerson: '',
    designation: '',
    industry: '',
    category: 'Small & Medium Business',
    city: '',
    country: 'India',
    linkedinUrl: '',
    instagramUrl: '',
  });

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.set('search', search);
      if (stageFilter !== 'ALL') qs.set('stage', stageFilter);
      if (categoryFilter !== 'ALL') qs.set('category', categoryFilter);
      const res = await fetch(`/api/leads?${qs.toString()}`);
      const data = await res.json();
      if (data.success) setLeads(data.leads);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageFilter, categoryFilter]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead),
      });
      const data = await res.json();
      if (data.success) {
        setShowAdd(false);
        setNewLead({
          companyName: '',
          website: '',
          phone: '',
          email: '',
          contactPerson: '',
          designation: '',
          industry: '',
          category: 'Small & Medium Business',
          city: '',
          country: 'India',
          linkedinUrl: '',
          instagramUrl: '',
        });
        await fetchLeads();
      } else {
        alert(data.error || 'Could not add lead');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStageChange = async (leadId: string, nextStage: PipelineStage) => {
    setLeads((prev) =>
      prev.map((l) => (l._id === leadId ? { ...l, pipelineStage: nextStage } : l))
    );
    await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipelineStage: nextStage }),
    });
  };

  return (
    <AppShell
      title="Centralized CRM & Lead Pipeline"
      subtitle="Review verified contact channels, audit scores, and guide prospects from discovery to Won"
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/api/leads/export"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </a>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
          >
            <Plus className="w-3.5 h-3.5" /> Add Lead Manually
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Filter & View Bar */}
        <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative min-w-[220px] flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchLeads()}
                placeholder="Search company, domain, email, phone..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white"
              />
            </div>
            <button
              onClick={fetchLeads}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium"
            >
              Search
            </button>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
            >
              <option value="ALL">All Stages</option>
              {PIPELINE_STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
            >
              <option value="ALL">All Categories</option>
              {LEAD_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" /> Table
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                viewMode === 'kanban' ? 'bg-indigo-600 text-white' : 'text-slate-400'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" /> Pipeline
            </button>
          </div>
        </div>

        {/* Manual Lead Form */}
        {showAdd && (
          <form
            onSubmit={handleAddLead}
            className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Add Lead Manually (Auto-crawls website for Email/Phone/Socials if blank)
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                required
                placeholder="Company Name *"
                value={newLead.companyName}
                onChange={(e) => setNewLead({ ...newLead, companyName: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
              <input
                placeholder="Website (e.g. https://company.com)"
                value={newLead.website}
                onChange={(e) => setNewLead({ ...newLead, website: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
              <input
                placeholder="Phone / WhatsApp"
                value={newLead.phone}
                onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
              <input
                placeholder="Business Email"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
              <input
                placeholder="Contact Person (e.g. Dr. Mehta)"
                value={newLead.contactPerson}
                onChange={(e) => setNewLead({ ...newLead, contactPerson: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
              <input
                placeholder="Industry (e.g. Healthcare)"
                value={newLead.industry}
                onChange={(e) => setNewLead({ ...newLead, industry: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
              <input
                placeholder="City"
                value={newLead.city}
                onChange={(e) => setNewLead({ ...newLead, city: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
              <input
                placeholder="LinkedIn URL"
                value={newLead.linkedinUrl}
                onChange={(e) => setNewLead({ ...newLead, linkedinUrl: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
              <input
                placeholder="Instagram URL"
                value={newLead.instagramUrl}
                onChange={(e) => setNewLead({ ...newLead, instagramUrl: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-xs font-semibold text-white"
              >
                {saving ? 'Adding & Scanning Site...' : 'Save Lead'}
              </button>
            </div>
          </form>
        )}

        {/* Content */}
        {loading ? (
          <div className="h-60 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
        ) : viewMode === 'table' ? (
          <div className="bg-[#0b1120] border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Company</th>
                    <th className="px-4 py-3 font-semibold">Contacts Available</th>
                    <th className="px-4 py-3 font-semibold">Location / Category</th>
                    <th className="px-4 py-3 font-semibold">Audit Score</th>
                    <th className="px-4 py-3 font-semibold">Pipeline Stage</th>
                    <th className="px-4 py-3 font-semibold text-right">Workspace</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                        No leads match your filters yet. Run a campaign or add a lead manually.
                      </td>
                    </tr>
                  ) : (
                    leads.map((l) => (
                      <tr key={l._id} className="hover:bg-slate-900/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/leads/${l._id}`}
                              className="font-semibold text-white hover:text-indigo-300"
                            >
                              {l.companyName}
                            </Link>
                            {l.doNotContact && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 text-[10px]">
                                <Ban className="w-2.5 h-2.5" /> DNC
                              </span>
                            )}
                          </div>
                          {l.website && (
                            <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
                              {l.website}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {l.phone && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[11px]">
                                <Phone className="w-3 h-3" /> {l.phone}
                              </span>
                            )}
                            {l.email && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 text-[11px]">
                                <Mail className="w-3 h-3" /> {l.email}
                              </span>
                            )}
                            {!l.phone && !l.email && (
                              <span className="inline-flex items-center gap-1 text-slate-500 text-[11px]">
                                <Globe className="w-3 h-3" /> Run Audit to scan
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          <div>{l.category}</div>
                          <div className="text-[11px] text-slate-500">
                            {[l.city, l.country].filter(Boolean).join(', ')}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-lg font-bold ${
                              l.auditScore >= 75
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : l.auditScore >= 45
                                  ? 'bg-amber-500/15 text-amber-300'
                                  : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {l.aiStatus === 'AUDITED' ? `${l.auditScore}/100` : l.aiStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={l.pipelineStage}
                            onChange={(e) =>
                              handleStageChange(l._id, e.target.value as PipelineStage)
                            }
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200"
                          >
                            {PIPELINE_STAGES.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/leads/${l._id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-medium"
                          >
                            Open <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Kanban Pipeline View */
          <div className="flex gap-4 overflow-x-auto pb-4">
            {PIPELINE_STAGES.map((stage) => {
              const items = leads.filter((l) => l.pipelineStage === stage.id);
              return (
                <div
                  key={stage.id}
                  className="w-72 shrink-0 bg-[#0b1120] border border-slate-800 rounded-2xl p-3 flex flex-col max-h-[75vh]"
                >
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      {stage.label}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-semibold text-slate-300">
                      {items.length}
                    </span>
                  </div>
                  <div className="space-y-2.5 overflow-y-auto pr-1">
                    {items.map((l) => (
                      <Link
                        key={l._id}
                        href={`/leads/${l._id}`}
                        className="block p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-white">{l.companyName}</p>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300">
                            {l.auditScore}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {l.phone || l.email || l.website || 'No contact yet'}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

