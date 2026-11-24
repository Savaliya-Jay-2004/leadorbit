'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { Bot, Save, CheckCircle2 } from 'lucide-react';

interface AiModuleCfg {
  _id: string;
  moduleName: 'AUDITOR' | 'WRITER' | 'CLOSER';
  provider: 'anthropic' | 'openai' | 'google_gemini';
  modelName: string;
  systemPrompt: string;
  temperature: number;
  isActive: boolean;
  followUpDays: number[];
  scoringWeights: {
    technicalNeed: number;
    serviceFit: number;
    contactReachability: number;
    hiringSignal: number;
  };
}

export default function AdminAiSettingsPage() {
  const [configs, setConfigs] = useState<AiModuleCfg[]>([]);
  const [savedMod, setSavedMod] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/ai-settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setConfigs(d.configs);
      });
  }, []);

  const updateField = (moduleName: string, patch: Partial<AiModuleCfg>) => {
    setConfigs((prev) =>
      prev.map((c) => (c.moduleName === moduleName ? { ...c, ...patch } : c))
    );
  };

  const handleSave = async (cfg: AiModuleCfg) => {
    const res = await fetch('/api/admin/ai-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    });
    const data = await res.json();
    if (data.success) {
      setSavedMod(cfg.moduleName);
      setTimeout(() => setSavedMod(null), 2000);
    }
  };

  return (
    <AppShell
      title="AI Modules, Models & Prompts"
      subtitle="Assign AI providers, customize system prompts, configure Lead Scoring weights & Follow-up intervals"
    >
      <div className="space-y-6">
        {configs.map((cfg) => (
          <div
            key={cfg.moduleName}
            className="bg-[#0b1120] border border-slate-800 rounded-2xl p-6 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-300">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Module: {cfg.moduleName}</h2>
                  <p className="text-xs text-slate-400">
                    {cfg.moduleName === 'AUDITOR'
                      ? 'Analyzes website facts & assigns 0–100 lead score'
                      : cfg.moduleName === 'WRITER'
                        ? 'Crafts personalized outreach drafts'
                        : 'Classifies replies, writes closing replies & sets follow-up days'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => updateField(cfg.moduleName, { isActive: !cfg.isActive })}
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  cfg.isActive
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {cfg.isActive ? 'ACTIVE' : 'PAUSED'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Preferred AI Provider</label>
                <select
                  value={cfg.provider}
                  onChange={(e) =>
                    updateField(cfg.moduleName, {
                      provider: e.target.value as AiModuleCfg['provider'],
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="anthropic">Anthropic Claude</option>
                  <option value="openai">OpenAI</option>
                  <option value="google_gemini">Google Gemini</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Model Name</label>
                <input
                  value={cfg.modelName}
                  onChange={(e) => updateField(cfg.moduleName, { modelName: e.target.value })}
                  placeholder="claude-3-5-sonnet-latest / gpt-4o-mini / gemini-2.0-flash"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Temperature ({cfg.temperature})
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={cfg.temperature}
                  onChange={(e) =>
                    updateField(cfg.moduleName, { temperature: Number(e.target.value) })
                  }
                  className="w-full mt-2"
                />
              </div>
            </div>

            {cfg.moduleName === 'AUDITOR' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                {(['technicalNeed', 'serviceFit', 'contactReachability', 'hiringSignal'] as const).map(
                  (wKey) => (
                    <div key={wKey}>
                      <label className="block text-[11px] text-slate-400 mb-1">{wKey}</label>
                      <input
                        type="number"
                        value={cfg.scoringWeights?.[wKey] ?? 25}
                        onChange={(e) =>
                          updateField(cfg.moduleName, {
                            scoringWeights: {
                              ...cfg.scoringWeights,
                              [wKey]: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  )
                )}
              </div>
            )}

            {cfg.moduleName === 'CLOSER' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Follow-up Schedule Days (comma-separated, e.g. 3,7,14)
                </label>
                <input
                  value={(cfg.followUpDays || [3, 7, 14]).join(',')}
                  onChange={(e) =>
                    updateField(cfg.moduleName, {
                      followUpDays: e.target.value
                        .split(',')
                        .map((n) => Number(n.trim()))
                        .filter((n) => n > 0),
                    })
                  }
                  className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-slate-400 mb-1">System Prompt</label>
              <textarea
                rows={5}
                value={cfg.systemPrompt}
                onChange={(e) => updateField(cfg.moduleName, { systemPrompt: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              {savedMod === cfg.moduleName && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> Saved
                </span>
              )}
              <button
                onClick={() => handleSave(cfg)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
              >
                <Save className="w-3.5 h-3.5" /> Save {cfg.moduleName} Settings
              </button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

