'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { CalendarClock, Check, Copy, ExternalLink, SkipForward } from 'lucide-react';

interface FollowUpRow {
  _id: string;
  leadId: string;
  stepDay: number;
  channel: string;
  dueAt: string;
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED';
  suggestedMessage: string;
  lead?: {
    id: string;
    companyName: string;
    phone: string;
    whatsapp: string;
    email: string;
    linkedinUrl: string;
    instagramUrl: string;
    pipelineStage: string;
  } | null;
}

export default function FollowUpsPage() {
  const [tasks, setTasks] = useState<FollowUpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/follow-ups');
      const data = await res.json();
      if (data.success) setTasks(data.tasks);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleAction = async (taskId: string, status: 'COMPLETED' | 'SKIPPED') => {
    await fetch('/api/follow-ups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, status }),
    });
    await fetchTasks();
  };

  const copyMessage = (id: string, msg: string) => {
    navigator.clipboard.writeText(msg);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const visibleTasks = filter === 'PENDING' ? tasks.filter((t) => t.status === 'PENDING') : tasks;

  return (
    <AppShell
      title="Follow-up Action Queue"
      subtitle="Manual Day 3, Day 7, and Day 14 follow-up schedule with ready-to-copy reminders"
      actions={
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              filter === 'PENDING' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              filter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            All Tasks
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="h-48 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
      ) : visibleTasks.length === 0 ? (
        <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-12 text-center">
          <CalendarClock className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Follow-ups Pending</h3>
          <p className="text-xs text-slate-400 mt-1">
            When you mark an outreach message as manually sent on a lead, Day 3, Day 7, and Day 14 follow-up tasks appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleTasks.map((t) => {
            const isOverdue = t.status === 'PENDING' && new Date(t.dueAt).getTime() <= Date.now();
            const waNum = (t.lead?.whatsapp || t.lead?.phone || '').replace(/[^\d]/g, '');
            const launchLink =
              t.channel === 'WHATSAPP' && waNum
                ? `https://wa.me/${waNum}?text=${encodeURIComponent(t.suggestedMessage)}`
                : t.channel === 'EMAIL' && t.lead?.email
                  ? `mailto:${t.lead.email}?subject=${encodeURIComponent(`Following up — ${t.lead.companyName}`)}&body=${encodeURIComponent(t.suggestedMessage)}`
                  : null;

            return (
              <div
                key={t._id}
                className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5 flex flex-col gap-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Link
                      href={`/leads/${t.leadId}`}
                      className="font-bold text-white hover:text-indigo-300"
                    >
                      {t.lead?.companyName || 'Lead'}
                    </Link>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 text-[11px] font-semibold">
                      Day {t.stepDay} · {t.channel}
                    </span>
                    {isOverdue && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[11px] font-semibold">
                        Due Now
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">
                    Due: {new Date(t.dueAt).toLocaleDateString()} · Status: {t.status}
                  </span>
                </div>

                <p className="text-xs text-slate-300 bg-slate-900 border border-slate-800 rounded-xl p-3">
                  {t.suggestedMessage}
                </p>

                {t.status === 'PENDING' && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyMessage(t._id, t.suggestedMessage)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
                      >
                        {copiedId === t._id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        Copy Draft
                      </button>
                      {launchLink && (
                        <a
                          href={launchLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-xs font-semibold text-emerald-300"
                        >
                          Open in {t.channel} <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAction(t._id, 'SKIPPED')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-400 hover:text-white"
                      >
                        <SkipForward className="w-3.5 h-3.5" /> Skip
                      </button>
                      <button
                        onClick={() => handleAction(t._id, 'COMPLETED')}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
                      >
                        <Check className="w-3.5 h-3.5" /> Mark Sent
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

