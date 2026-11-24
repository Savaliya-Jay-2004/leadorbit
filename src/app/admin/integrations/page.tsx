'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { ApiIntegrationDTO, IntegrationProvider } from '@/types';
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  PlugZap,
  Save,
  Shield,
  Loader2,
} from 'lucide-react';

export default function AdminIntegrationsPage() {
  const [integrations, setIntegrations] = useState<ApiIntegrationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [limitInputs, setLimitInputs] = useState<Record<string, number>>({});
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, { ok: boolean; msg: string }>>({});

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/integrations');
      const data = await res.json();
      if (data.success) {
        setIntegrations(data.integrations);
        const limits: Record<string, number> = {};
        for (const item of data.integrations as ApiIntegrationDTO[]) {
          limits[item.provider] = item.dailyLimit;
        }
        setLimitInputs(limits);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleSave = async (provider: IntegrationProvider, toggleValue?: boolean) => {
    setBusyProvider(provider);
    try {
      const payload: Record<string, unknown> = {
        provider,
        dailyLimit: limitInputs[provider] ?? 500,
      };
      if (typeof toggleValue === 'boolean') {
        payload.isEnabled = toggleValue;
      }
      const typedKey = keyInputs[provider];
      if (typedKey !== undefined && typedKey.trim() !== '') {
        payload.apiKey = typedKey.trim();
        // Auto-enable when admin saves a new key unless explicitly toggled off
        if (toggleValue === undefined) payload.isEnabled = true;
      }

      const res = await fetch('/api/admin/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setKeyInputs((prev) => ({ ...prev, [provider]: '' }));
        setFeedback((prev) => ({
          ...prev,
          [provider]: { ok: true, msg: 'Saved & encrypted with AES-256.' },
        }));
        await fetchAll();
      } else {
        setFeedback((prev) => ({
          ...prev,
          [provider]: { ok: false, msg: data.error || 'Failed to save' },
        }));
      }
    } finally {
      setBusyProvider(null);
    }
  };

  const handleTest = async (provider: IntegrationProvider) => {
    setBusyProvider(provider);
    try {
      const res = await fetch('/api/admin/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: keyInputs[provider]?.trim() || undefined,
        }),
      });
      const data = await res.json();
      setFeedback((prev) => ({
        ...prev,
        [provider]: { ok: Boolean(data.ok), msg: data.message || 'Test completed' },
      }));
      await fetchAll();
    } finally {
      setBusyProvider(null);
    }
  };

  const handleClearKey = async (provider: IntegrationProvider) => {
    if (!confirm('Remove saved API key and disable this integration?')) return;
    setBusyProvider(provider);
    try {
      await fetch('/api/admin/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: '', isEnabled: false }),
      });
      await fetchAll();
    } finally {
      setBusyProvider(null);
    }
  };

  return (
    <AppShell
      title="Admin Encrypted API Vault"
      subtitle="Configure, toggle, set daily quotas, and live-test all Discovery, Audit & AI APIs from one secure screen"
    >
      <div className="space-y-6">
        <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-200 flex items-start gap-3">
          <Shield className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">AES-256-GCM Encrypted Server-Side Storage</p>
            <p className="text-cyan-200/80 mt-0.5">
              All API credentials are encrypted before being saved in MongoDB and are never exposed to BDEs or client browsers. Free built-in crawlers and heuristic fallbacks remain active even when optional APIs are disabled.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {integrations.map((item) => {
              const fb = feedback[item.provider];
              const isBusy = busyProvider === item.provider;

              return (
                <div
                  key={item.provider}
                  className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 text-[10px] font-bold">
                          {item.category}
                        </span>
                        <h3 className="font-bold text-white text-sm">{item.label}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                    </div>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleSave(item.provider, !item.isEnabled)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold border transition shrink-0 ${
                        item.isEnabled
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {item.isEnabled ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>

                  {/* Status + Usage */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      {item.status === 'CONNECTED' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : item.status === 'ERROR' ? (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span className="text-slate-300 font-medium">
                        {item.hasKey ? `Saved: ${item.maskedKey}` : 'No Key Saved'}
                      </span>
                    </div>
                    <span className="text-slate-400">
                      Usage Today: <strong className="text-white">{item.usedToday}</strong> / {item.dailyLimit}
                    </span>
                  </div>

                  {/* Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="password"
                      value={keyInputs[item.provider] || ''}
                      onChange={(e) =>
                        setKeyInputs((prev) => ({ ...prev, [item.provider]: e.target.value }))
                      }
                      placeholder={item.hasKey ? 'Enter new key to replace...' : 'Paste API key...'}
                      className="sm:col-span-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                    <input
                      type="number"
                      min={0}
                      value={limitInputs[item.provider] ?? item.dailyLimit}
                      onChange={(e) =>
                        setLimitInputs((prev) => ({
                          ...prev,
                          [item.provider]: Number(e.target.value),
                        }))
                      }
                      title="Daily Request Limit"
                      placeholder="Daily Limit"
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  {(fb || item.lastError) && (
                    <p
                      className={`text-[11px] px-3 py-1.5 rounded-lg border ${
                        fb?.ok
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      {fb ? fb.msg : item.lastError}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <a
                      href={item.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-300"
                    >
                      API Docs <ExternalLink className="w-3 h-3" />
                    </a>
                    <div className="flex items-center gap-2">
                      {item.hasKey && (
                        <button
                          type="button"
                          onClick={() => handleClearKey(item.provider)}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] text-rose-400 hover:bg-rose-500/10"
                        >
                          Clear
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleTest(item.provider)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300"
                      >
                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlugZap className="w-3.5 h-3.5" />}
                        Test Key
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleSave(item.provider)}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
                      >
                        <Save className="w-3.5 h-3.5" /> Save
                      </button>
                    </div>
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

