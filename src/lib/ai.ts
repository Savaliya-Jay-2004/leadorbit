import { AiModuleConfig } from '@/models/AiModuleConfig';
import { getActiveIntegrationKey, reportIntegrationError } from '@/lib/integrations';
import { AiModuleName } from '@/types';
import { DEFAULT_AI_PROMPTS } from '@/lib/constants';

interface AiRunResult {
  usedAi: boolean;
  provider?: string;
  text: string;
}

async function callProvider(
  provider: 'anthropic' | 'openai' | 'google_gemini',
  apiKey: string,
  modelName: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number
): Promise<string> {
  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName || 'gpt-4o-mini',
        temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `OpenAI HTTP ${res.status}`);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || '';
  }

  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName || 'claude-3-5-sonnet-latest',
        max_tokens: 1500,
        temperature,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Anthropic HTTP ${res.status}`);
    }
    const data = await res.json();
    return data?.content?.[0]?.text || '';
  }

  // Google Gemini
  const geminiModel = modelName || 'gemini-2.0-flash';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      geminiModel
    )}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature },
      }),
      signal: AbortSignal.timeout(30000),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini HTTP ${res.status}`);
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Runs an AI module prompt using the Super Admin's configured provider/model,
 * automatically falling back to any other active AI key if the preferred one is unconfigured.
 */
export async function runAiModule(
  moduleName: AiModuleName,
  userPrompt: string,
  workspaceId = 'nextorbit_main'
): Promise<AiRunResult> {
  const cfg = await AiModuleConfig.findOne({ workspaceId, moduleName });
  if (cfg && !cfg.isActive) {
    return { usedAi: false, text: '' };
  }

  const preferredProvider = cfg?.provider || 'openai';
  const systemPrompt = cfg?.systemPrompt || DEFAULT_AI_PROMPTS[moduleName];
  const temperature = cfg?.temperature ?? 0.4;

  const fallbackOrder: Array<{
    provider: 'anthropic' | 'openai' | 'google_gemini';
    defaultModel: string;
  }> = [
    {
      provider: preferredProvider,
      defaultModel:
        cfg?.modelName ||
        (preferredProvider === 'anthropic'
          ? 'claude-3-5-sonnet-latest'
          : preferredProvider === 'google_gemini'
            ? 'gemini-2.0-flash'
            : 'gpt-4o-mini'),
    },
    { provider: 'openai', defaultModel: 'gpt-4o-mini' },
    { provider: 'anthropic', defaultModel: 'claude-3-5-sonnet-latest' },
    { provider: 'google_gemini', defaultModel: 'gemini-2.0-flash' },
  ];

  const tried = new Set<string>();
  for (const candidate of fallbackOrder) {
    if (tried.has(candidate.provider)) continue;
    tried.add(candidate.provider);

    const apiKey = await getActiveIntegrationKey(candidate.provider, workspaceId);
    if (!apiKey) continue;

    try {
      const text = await callProvider(
        candidate.provider,
        apiKey,
        candidate.defaultModel,
        systemPrompt,
        userPrompt,
        temperature
      );
      return { usedAi: true, provider: candidate.provider, text };
    } catch (err) {
      await reportIntegrationError(
        candidate.provider,
        err instanceof Error ? err.message : 'AI invocation failed',
        workspaceId
      );
    }
  }

  return { usedAi: false, text: '' };
}

export function extractJsonBlock<T>(rawText: string): T | null {
  if (!rawText) return null;
  try {
    const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const jsonString = fenced ? fenced[1] : rawText;
    const startObj = jsonString.indexOf('{');
    const startArr = jsonString.indexOf('[');
    const start =
      startObj === -1 ? startArr : startArr === -1 ? startObj : Math.min(startObj, startArr);
    if (start === -1) return null;
    const trimmed = jsonString.slice(start).trim();
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}

