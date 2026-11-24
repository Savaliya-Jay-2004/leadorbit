'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { SERVICE_OPTIONS } from '@/lib/constants';
import { Briefcase, ExternalLink, Plus, Trash2 } from 'lucide-react';

interface PortfolioRow {
  _id: string;
  title: string;
  industry: string;
  serviceType: string;
  projectUrl: string;
  summary: string;
  resultsMetric: string;
}

export default function PortfolioPage() {
  const [items, setItems] = useState<PortfolioRow[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    title: '',
    industry: '',
    serviceType: SERVICE_OPTIONS[0] as string,
    projectUrl: '',
    summary: '',
    resultsMetric: '',
  });

  const fetchItems = async () => {
    const res = await fetch('/api/portfolio');
    const data = await res.json();
    if (data.success) setItems(data.items);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) {
      setShowAdd(false);
      setForm({
        title: '',
        industry: '',
        serviceType: SERVICE_OPTIONS[0],
        projectUrl: '',
        summary: '',
        resultsMetric: '',
      });
      await fetchItems();
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/portfolio?id=${id}`, { method: 'DELETE' });
    await fetchItems();
  };

  return (
    <AppShell
      title="NextOrbit Portfolio & Case Studies"
      subtitle="AI Outreach Writer & Sales Closer automatically reference these projects when prospects match or ask for proof"
      actions={
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
        >
          <Plus className="w-4 h-4" /> Add Case Study
        </button>
      }
    >
      <div className="space-y-6">
        {showAdd && (
          <form
            onSubmit={handleAdd}
            className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                required
                placeholder="Project Title *"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
              />
              <input
                required
                placeholder="Industry (e.g. Healthcare, E-commerce) *"
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
              />
              <select
                value={form.serviceType}
                onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
              >
                {SERVICE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                required
                placeholder="Live URL / Case Study Link *"
                value={form.projectUrl}
                onChange={(e) => setForm({ ...form, projectUrl: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
              />
            </div>
            <input
              placeholder="Result / Impact Metric (e.g. +45% online bookings in 30 days)"
              value={form.resultsMetric}
              onChange={(e) => setForm({ ...form, resultsMetric: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
            />
            <textarea
              required
              rows={3}
              placeholder="Short project summary *"
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white"
            />
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
                className="px-4 py-2 rounded-xl bg-indigo-600 text-xs font-semibold text-white"
              >
                Save Project
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item._id}
              className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <button
                    onClick={() => handleDelete(item._id)}
                    className="text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-bold text-white text-sm mt-3">{item.title}</h3>
                <p className="text-[11px] text-cyan-300 mt-0.5">
                  {item.industry} · {item.serviceType}
                </p>
                <p className="text-xs text-slate-300 mt-2">{item.summary}</p>
                {item.resultsMetric && (
                  <p className="text-[11px] font-semibold text-emerald-300 mt-2">
                    Result: {item.resultsMetric}
                  </p>
                )}
              </div>
              <a
                href={item.projectUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:underline pt-2 border-t border-slate-800"
              >
                {item.projectUrl} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

