'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { PIPELINE_STAGES, REPLY_INTENT_LABELS, SERVICE_OPTIONS } from '@/lib/constants';
import {
  OutreachChannel,
  OutreachLength,
  OutreachTone,
  PipelineStage,
  ReplyIntent,
} from '@/types';
import {
  ArrowLeft,
  Globe,
  Phone,
  Mail,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Send,
  MessageSquarePlus,
  ShieldCheck,
  AlertTriangle,
  Ban,
  Trash2,
  Briefcase,
} from 'lucide-react';

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const leadId = params.id;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [analyzingReply, setAnalyzingReply] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [channel, setChannel] = useState<OutreachChannel>('WHATSAPP');
  const [tone, setTone] = useState<OutreachTone>('DIRECT');
  const [length, setLength] = useState<OutreachLength>('SHORT');
  const [serviceFocus, setServiceFocus] = useState<string>('');

  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

  const [prospectReply, setProspectReply] = useState('');
  const [replyChannel, setReplyChannel] = useState<OutreachChannel>('WHATSAPP');
  const [notes, setNotes] = useState('');

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
        setNotes(json.lead.notes || '');
        if (json.audit?.suggestedService) setServiceFocus(json.audit.suggestedService);
        const latestDraft = json.outreachMessages?.[0];
        if (latestDraft) {
          setActiveDraftId(latestDraft._id);
          setEditSubject(latestDraft.subject || '');
          setEditBody(latestDraft.body || '');
          setChannel(latestDraft.channel);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleRunAudit = async (forceRefresh = true) => {
    setAuditing(true);
    try {
      await fetch(`/api/leads/${leadId}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRefresh }),
      });
      await fetchDetail();
    } finally {
      setAuditing(false);
    }
  };

  const handleGenerateOutreach = async () => {
    setGeneratingDraft(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/outreach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, tone, length, serviceFocus }),
      });
      const json = await res.json();
      if (json.success && json.message) {
        setActiveDraftId(json.message._id);
        setEditSubject(json.message.subject || '');
        setEditBody(json.message.body || '');
        await fetchDetail();
      }
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleSaveOrMarkSent = async (status: 'APPROVED' | 'MANUALLY_SENT') => {
    if (!activeDraftId) return;
    await fetch(`/api/leads/${leadId}/outreach`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId: activeDraftId,
        subject: editSubject,
        body: editBody,
        status,
      }),
    });
    await fetchDetail();
  };

  const handleAnalyzeReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prospectReply.trim()) return;
    setAnalyzingReply(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/closer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectReply, channel: replyChannel }),
      });
      const json = await res.json();
      if (json.success) {
        setProspectReply('');
        await fetchDetail();
      }
    } finally {
      setAnalyzingReply(false);
    }
  };

  const handleLogManualBdeReply = async (text: string) => {
    copyText(text, 'closer-reply');
    await fetch(`/api/leads/${leadId}/closer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: 'BDE', channel: replyChannel, messageText: text }),
    });
    await fetchDetail();
  };

  const handleUpdateLead = async (patch: Record<string, unknown>) => {
    await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    await fetchDetail();
  };

  const handleDeleteLead = async () => {
    if (!confirm('Permanently delete this lead and all its records?')) return;
    await fetch(`/api/leads/${leadId}`, { method: 'DELETE' });
    router.replace('/leads');
  };

  if (loading || !data?.lead) {
    return (
      <AppShell title="Lead Command Center">
        <div className="h-72 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
      </AppShell>
    );
  }

  const { lead, audit, conversations, followUps, activities } = data;
  const whatsappClean = (lead.whatsapp || lead.phone || '').replace(/[^\d]/g, '');

  const buildLaunchUrl = (targetChannel: OutreachChannel, subjectText: string, bodyText: string) => {
    if (targetChannel === 'WHATSAPP' && whatsappClean) {
      return `https://wa.me/${whatsappClean}?text=${encodeURIComponent(bodyText)}`;
    }
    if (targetChannel === 'EMAIL' && lead.email) {
      return `mailto:${lead.email}?subject=${encodeURIComponent(subjectText || `Quick note for ${lead.companyName}`)}&body=${encodeURIComponent(bodyText)}`;
    }
    if (targetChannel === 'LINKEDIN' && lead.linkedinUrl) return lead.linkedinUrl;
    if (targetChannel === 'INSTAGRAM' && lead.instagramUrl) return lead.instagramUrl;
    return null;
  };

  const launchHref = buildLaunchUrl(channel, editSubject, editBody);

  return (
    <AppShell
      title={lead.companyName}
      subtitle={`${lead.industry || 'Business'} · ${[lead.city, lead.country].filter(Boolean).join(', ') || 'Location N/A'} · Source: ${lead.source}`}
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/leads"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
          <select
            value={lead.pipelineStage}
            onChange={(e) => handleUpdateLead({ pipelineStage: e.target.value as PipelineStage })}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold"
          >
            {PIPELINE_STAGES.map((st) => (
              <option key={st.id} value={st.id}>
                Stage: {st.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => handleUpdateLead({ doNotContact: !lead.doNotContact })}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border ${
              lead.doNotContact
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            {lead.doNotContact ? 'Blocked (DNC)' : 'Mark DNC'}
          </button>
          <button
            onClick={handleDeleteLead}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400"
            title="Delete Lead"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Verified Contact Strip */}
        <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center gap-3">
          {lead.website && (
            <a
              href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 hover:border-indigo-500/50"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              {lead.normalizedDomain || lead.website}
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
          )}

          {lead.phone ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
              <Phone className="w-3.5 h-3.5" />
              <span>{lead.phone}</span>
              <button
                onClick={() => copyText(lead.phone, 'phone')}
                className="ml-1 hover:text-white"
                title="Copy Phone"
              >
                {copiedId === 'phone' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-500 px-2">No phone listed</span>
          )}

          {lead.email ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-300">
              <Mail className="w-3.5 h-3.5" />
              <span>{lead.email}</span>
              <button
                onClick={() => copyText(lead.email, 'email')}
                className="ml-1 hover:text-white"
                title="Copy Email"
              >
                {copiedId === 'email' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-500 px-2">No email extracted yet</span>
          )}

          {lead.linkedinUrl && (
            <a
              href={lead.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300"
            >
              LinkedIn <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {lead.instagramUrl && (
            <a
              href={lead.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500/10 border border-pink-500/30 text-xs text-pink-300"
            >
              Instagram <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Business Auditor + Notes + Activity */}
          <div className="lg:col-span-5 space-y-6">
            {/* AI Business Auditor Card */}
            <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    Module 2: AI Business Audit
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Evidence-backed website, speed, tech stack & hiring checks
                  </p>
                </div>
                <button
                  onClick={() => handleRunAudit(true)}
                  disabled={auditing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-xs font-semibold text-cyan-300"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${auditing ? 'animate-spin' : ''}`} />
                  {auditing ? 'Auditing...' : audit ? 'Re-run Audit' : 'Run Audit'}
                </button>
              </div>

              {audit ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                      <p className="text-[10px] text-slate-400 uppercase">Score</p>
                      <p className="text-xl font-bold text-emerald-400 mt-0.5">{audit.score}/100</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                      <p className="text-[10px] text-slate-400 uppercase">Load / Speed</p>
                      <p className="text-sm font-bold text-white mt-1">
                        {audit.loadTimeSeconds ? `${audit.loadTimeSeconds}s` : 'N/A'}
                        {audit.pagespeedMobileScore !== undefined && ` (${audit.pagespeedMobileScore})`}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                      <p className="text-[10px] text-slate-400 uppercase">Status</p>
                      <p className="text-[11px] font-bold text-cyan-300 mt-1.5">
                        {audit.verificationStatus}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <span
                      className={`px-2 py-0.5 rounded border ${
                        audit.sslValid
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      SSL: {audit.sslValid ? 'Valid' : 'Missing'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded border ${
                        audit.hasMobileViewport
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      }`}
                    >
                      Mobile: {audit.hasMobileViewport ? 'Responsive' : 'No Viewport'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded border ${
                        audit.hasBookingCta
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      }`}
                    >
                      Booking CTA: {audit.hasBookingCta ? 'Found' : 'Missing'}
                    </span>
                  </div>

                  {audit.techStack?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 mb-1">Detected Tech Stack</p>
                      <div className="flex flex-wrap gap-1.5">
                        {audit.techStack.map((t: string) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[11px]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 mb-1">Verified Evidence</p>
                    <ul className="space-y-1 text-xs text-slate-300 list-disc pl-4">
                      {audit.evidence?.map((ev: string, i: number) => (
                        <li key={i}>{ev}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 mb-1">
                      Identified Opportunities · Suggested: <span className="text-indigo-300">{audit.suggestedService}</span>
                    </p>
                    <ul className="space-y-1 text-xs text-emerald-300/90 list-disc pl-4">
                      {audit.identifiedOpportunities?.map((op: string, i: number) => (
                        <li key={i}>{op}</li>
                      ))}
                    </ul>
                  </div>

                  {audit.hiringSignals?.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                      <p className="font-semibold flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5" /> Hiring Signals ({audit.hiringType})
                      </p>
                      {audit.hiringSignals.map((h: string, i: number) => (
                        <p key={i} className="text-[11px] mt-1">
                          • {h}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
                  <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                  Not audited yet. Click <strong>Run Audit</strong> to inspect the website and calculate a 0–100 score.
                </div>
              )}
            </div>

            {/* Notes & Follow-ups */}
            <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">BDE Notes</h3>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal discovery notes or client context..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white"
              />
              <button
                onClick={() => handleUpdateLead({ notes })}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
              >
                Save Notes
              </button>

              {followUps?.length > 0 && (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <p className="text-xs font-semibold text-slate-300">Scheduled Follow-ups</p>
                  {followUps.map((f: { _id: string; stepDay: number; dueAt: string; status: string }) => (
                    <div
                      key={f._id}
                      className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900 border border-slate-800"
                    >
                      <span>
                        Day {f.stepDay} · {new Date(f.dueAt).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {f.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity Timeline */}
            <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">Activity Log</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activities?.map((a: { _id: string; details: string; userName: string; createdAt: string }) => (
                  <div key={a._id} className="text-[11px] border-l-2 border-slate-700 pl-2.5">
                    <p className="text-slate-300">{a.details}</p>
                    <p className="text-slate-500">
                      {a.userName} · {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Outreach Writer (Manual-Send) + AI Sales Closer */}
          <div className="lg:col-span-7 space-y-6">
            {/* Module 3: AI Outreach Writer */}
            <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    Module 3: AI Outreach Writer (Manual-Send Studio)
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    System prepares the draft & contact launcher — you copy and send manually from your own app.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as OutreachChannel)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white"
                >
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">Business Email</option>
                  <option value="LINKEDIN">LinkedIn</option>
                  <option value="INSTAGRAM">Instagram DM</option>
                </select>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as OutreachTone)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white"
                >
                  <option value="DIRECT">Tone: Direct</option>
                  <option value="FRIENDLY">Tone: Friendly</option>
                  <option value="PROFESSIONAL">Tone: Professional</option>
                  <option value="CONVERSATIONAL">Tone: Conversational</option>
                </select>
                <select
                  value={length}
                  onChange={(e) => setLength(e.target.value as OutreachLength)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white"
                >
                  <option value="SHORT">Short (&lt;80w)</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="DETAILED">Detailed</option>
                </select>
                <button
                  onClick={handleGenerateOutreach}
                  disabled={generatingDraft}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {generatingDraft ? 'Writing...' : 'Generate Draft'}
                </button>
              </div>

              <select
                value={serviceFocus}
                onChange={(e) => setServiceFocus(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="">Auto-detect best service from Audit</option>
                {SERVICE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    Pitch Service: {s}
                  </option>
                ))}
              </select>

              {channel === 'EMAIL' && (
                <input
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  placeholder="Email Subject..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              )}

              <textarea
                rows={6}
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                placeholder="Click 'Generate Draft' above to craft a personalized message from the verified business audit..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3.5 text-sm text-slate-100 leading-relaxed"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    disabled={!editBody}
                    onClick={() => copyText(editSubject ? `${editSubject}\n\n${editBody}` : editBody, 'draft')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-white"
                  >
                    {copiedId === 'draft' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy Message
                  </button>

                  {launchHref && editBody && (
                    <a
                      href={launchHref}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => copyText(editBody, 'draft')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-xs font-semibold text-emerald-300"
                    >
                      Open in {channel} <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {activeDraftId && (
                  <button
                    type="button"
                    onClick={() => handleSaveOrMarkSent('MANUALLY_SENT')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-xs font-semibold text-white"
                  >
                    <Send className="w-3.5 h-3.5" /> Mark as Sent & Schedule Follow-ups
                  </button>
                )}
              </div>
            </div>

            {/* Module 4: AI Sales Closer */}
            <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquarePlus className="w-4 h-4 text-amber-400" />
                  Module 4: AI Sales Closer (Paste Prospect Reply)
                </h2>
                <p className="text-[11px] text-slate-400">
                  Paste what the prospect replied on WhatsApp, Email, LinkedIn, or IG to classify intent & generate tailored closing replies.
                </p>
              </div>

              {/* Conversation Thread */}
              {conversations?.length > 0 && (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1 bg-slate-950/50 border border-slate-800/80 rounded-xl p-3">
                  {conversations.map(
                    (c: {
                      _id: string;
                      sender: 'BDE' | 'PROSPECT';
                      channel: string;
                      messageText: string;
                      aiIntent?: ReplyIntent;
                      aiSummary?: string;
                      suggestedReplies?: Array<{ label: string; text: string }>;
                      createdAt: string;
                    }) => (
                      <div
                        key={c._id}
                        className={`p-3 rounded-xl text-xs space-y-2 ${
                          c.sender === 'BDE'
                            ? 'bg-indigo-500/10 border border-indigo-500/20 ml-6'
                            : 'bg-slate-900 border border-slate-700 mr-6'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-200">
                            {c.sender === 'BDE' ? 'You (BDE)' : lead.companyName} · {c.channel}
                          </span>
                          {c.aiIntent && (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                REPLY_INTENT_LABELS[c.aiIntent]?.badgeClass || ''
                              }`}
                            >
                              {REPLY_INTENT_LABELS[c.aiIntent]?.label || c.aiIntent}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-200 whitespace-pre-wrap">{c.messageText}</p>
                        {c.aiSummary && <p className="text-[11px] text-cyan-300 italic">{c.aiSummary}</p>}

                        {c.suggestedReplies && c.suggestedReplies.length > 0 && (
                          <div className="pt-2 border-t border-slate-800 space-y-2">
                            <p className="text-[11px] font-semibold text-amber-300">
                              AI Closer Suggested Replies (Copy & Send Manually):
                            </p>
                            {c.suggestedReplies.map((sr, idx) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-semibold text-indigo-300">
                                    {sr.label}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleLogManualBdeReply(sr.text)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-[10px] font-semibold text-indigo-200"
                                  >
                                    <Copy className="w-3 h-3" /> Copy & Log Reply
                                  </button>
                                </div>
                                <p className="text-[11px] text-slate-300">{sr.text}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}

              <form onSubmit={handleAnalyzeReply} className="space-y-3">
                <div className="flex items-center gap-2">
                  <select
                    value={replyChannel}
                    onChange={(e) => setReplyChannel(e.target.value as OutreachChannel)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="WHATSAPP">Replied on WhatsApp</option>
                    <option value="EMAIL">Replied on Email</option>
                    <option value="LINKEDIN">Replied on LinkedIn</option>
                    <option value="INSTAGRAM">Replied on Instagram</option>
                  </select>
                </div>
                <textarea
                  rows={3}
                  value={prospectReply}
                  onChange={(e) => setProspectReply(e.target.value)}
                  placeholder='Paste prospect reply here (e.g. "How much does this cost?", "Send your portfolio", "Not interested")...'
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white"
                />
                <button
                  type="submit"
                  disabled={analyzingReply || !prospectReply.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-xs font-semibold text-white"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {analyzingReply ? 'Analyzing Reply...' : 'Analyze Reply & Suggest Closers'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

