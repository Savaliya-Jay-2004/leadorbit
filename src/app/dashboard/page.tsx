'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import {
  Users,
  CheckCircle,
  SearchCheck,
  Send,
  MessageSquareReply,
  CalendarCheck,
  Trophy,
  TrendingUp,
  ArrowRight,
  CalendarClock,
  Activity,
} from 'lucide-react';

interface DashboardData {
  stats: {
    totalLeads: number;
    qualifiedLeads: number;
    auditsCount: number;
    draftedCount: number;
    sentCount: number;
    responsesCount: number;
    interestedCount: number;
    meetingsScheduled: number;
    proposalsSent: number;
    wonCount: number;
    lostCount: number;
    responseRate: number;
    conversionRate: number;
  };
  stageCounts: Array<{ stage: string; label: string; color: string; count: number }>;
  industryDistribution: Array<{ name: string; count: number }>;
  sourceDistribution: Array<{ name: string; count: number }>;
  bdePerformance: Array<{
    userId: string;
    name: string;
    role: string;
    assignedLeads: number;
    sentOutreach: number;
    wonCount: number;
  }>;
  recentLeads: Array<{
    id: string;
    companyName: string;
    industry: string;
    city: string;
    auditScore: number;
    pipelineStage: string;
    assignedName: string;
  }>;
  dueFollowUps: Array<{
    id: string;
    leadId: string;
    companyName: string;
    stepDay: number;
    channel: string;
    dueAt: string;
  }>;
  recentActivities: Array<{
    _id: string;
    userName: string;
    action: string;
    details: string;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res);
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats;
  const maxStageCount = Math.max(1, ...(data?.stageCounts.map((s) => s.count) || [1]));

  return (
    <AppShell
      title="Business Development Overview"
      subtitle="Real-time acquisition funnel, AI audits, manual outreach tracking & follow-ups"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/campaigns"
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition"
          >
            + New Campaign
          </Link>
          <Link
            href="/leads"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
          >
            Open CRM Pipeline
          </Link>
        </div>
      }
    >
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-900/70 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Leads', value: stats?.totalLeads ?? 0, icon: Users, color: 'text-sky-400' },
              { label: 'Qualified Leads', value: stats?.qualifiedLeads ?? 0, icon: CheckCircle, color: 'text-indigo-400' },
              { label: 'Audits Completed', value: stats?.auditsCount ?? 0, icon: SearchCheck, color: 'text-cyan-400' },
              {
                label: 'Sent / Drafted',
                value: `${stats?.sentCount ?? 0} / ${stats?.draftedCount ?? 0}`,
                icon: Send,
                color: 'text-purple-400',
              },
              {
                label: 'Responses (Rate)',
                value: `${stats?.responsesCount ?? 0} (${stats?.responseRate ?? 0}%)`,
                icon: MessageSquareReply,
                color: 'text-amber-400',
              },
              { label: 'Meetings Booked', value: stats?.meetingsScheduled ?? 0, icon: CalendarCheck, color: 'text-teal-400' },
              { label: 'Won / Lost', value: `${stats?.wonCount ?? 0} / ${stats?.lostCount ?? 0}`, icon: Trophy, color: 'text-emerald-400' },
              { label: 'Conversion Rate', value: `${stats?.conversionRate ?? 0}%`, icon: TrendingUp, color: 'text-emerald-400' },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="bg-[#0b1120] border border-slate-800/90 rounded-2xl p-4 flex items-start justify-between"
                >
                  <div>
                    <p className="text-xs text-slate-400 font-medium">{card.label}</p>
                    <p className="text-2xl font-bold text-white mt-2">{card.value}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl bg-slate-900 border border-slate-800 ${card.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pipeline Chart & Follow-ups Due */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#0b1120] border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-white">Sales Pipeline Breakdown</h2>
                <Link href="/leads" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
                  View Kanban <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="space-y-3">
                {data?.stageCounts.map((s) => (
                  <div key={s.stage} className="flex items-center gap-3 text-xs">
                    <span className="w-36 text-slate-300 truncate">{s.label}</span>
                    <div className="flex-1 h-2.5 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.round((s.count / maxStageCount) * 100)}%`,
                          backgroundColor: s.color,
                        }}
                      />
                    </div>
                    <span className="w-8 text-right font-semibold text-white">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-amber-400" />
                  Upcoming Follow-ups
                </h2>
                <Link href="/follow-ups" className="text-xs text-indigo-400 hover:underline">
                  All Tasks
                </Link>
              </div>
              <div className="space-y-2.5 flex-1">
                {data?.dueFollowUps.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    No pending follow-ups. Mark an outreach message as sent to auto-schedule Day 3/7/14 reminders.
                  </p>
                ) : (
                  data?.dueFollowUps.map((f) => (
                    <Link
                      key={f.id}
                      href={`/leads/${f.leadId}`}
                      className="block p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white truncate">{f.companyName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-semibold">
                          Day {f.stepDay}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {f.channel} · Due {new Date(f.dueAt).toLocaleDateString()}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row: BDE Leaderboard, Recent Leads, Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-white mb-4">Team Performance</h2>
              <div className="space-y-2.5">
                {data?.bdePerformance.map((b) => (
                  <div
                    key={b.userId}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-white">{b.name}</p>
                      <p className="text-[11px] text-slate-400">{b.role.replace('_', ' ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-200 font-medium">{b.assignedLeads} leads</p>
                      <p className="text-[11px] text-emerald-400">{b.wonCount} won</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-white mb-4">Recent Leads</h2>
              <div className="space-y-2.5">
                {data?.recentLeads.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">
                    No leads discovered yet. Create a campaign or add a lead manually.
                  </p>
                ) : (
                  data?.recentLeads.map((l) => (
                    <Link
                      key={l.id}
                      href={`/leads/${l.id}`}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-indigo-500/40 text-xs transition"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">{l.companyName}</p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {l.industry || 'General'} {l.city ? `· ${l.city}` : ''}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-semibold shrink-0">
                        Score {l.auditScore}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Recent Activity
              </h2>
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {data?.recentActivities.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No recent activity yet.</p>
                ) : (
                  data?.recentActivities.map((a) => (
                    <div key={a._id} className="text-xs border-l-2 border-slate-700 pl-3 py-0.5">
                      <p className="text-slate-200">{a.details}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {a.userName} · {new Date(a.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

