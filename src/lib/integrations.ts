import { ApiIntegration } from '@/models/ApiIntegration';
import { decryptSecret } from '@/lib/crypto';
import { IntegrationProvider } from '@/types';

/**
 * Fetches a decrypted API key for a provider ONLY if it is enabled in Admin Panel
 * and within its daily quota limit. Increments usage count automatically.
 */
export async function getActiveIntegrationKey(
  provider: IntegrationProvider,
  workspaceId = 'nextorbit_main'
): Promise<string | null> {
  const doc = await ApiIntegration.findOne({ workspaceId, provider });
  if (!doc || !doc.isEnabled || !doc.encryptedApiKey) {
    return null;
  }

  const today = new Date().toISOString().slice(0, 10);
  if (doc.usageResetDate !== today) {
    doc.usedToday = 0;
    doc.usageResetDate = today;
  }

  if (doc.dailyLimit > 0 && doc.usedToday >= doc.dailyLimit) {
    doc.lastError = `Daily quota limit (${doc.dailyLimit}) reached for ${today}`;
    await doc.save();
    return null;
  }

  const key = decryptSecret(doc.encryptedApiKey);
  if (!key) return null;

  doc.usedToday += 1;
  await doc.save();
  return key;
}

/**
 * Records an integration error cleanly in MongoDB for Admin visibility.
 */
export async function reportIntegrationError(
  provider: IntegrationProvider,
  errorMessage: string,
  workspaceId = 'nextorbit_main'
): Promise<void> {
  await ApiIntegration.updateOne(
    { workspaceId, provider },
    {
      $set: {
        status: 'ERROR',
        lastError: errorMessage.slice(0, 400),
        lastTestedAt: new Date(),
      },
    }
  );
}

/**
 * Live tests an API key before or after saving in the Super Admin Integration Vault.
 */
export async function testProviderKey(
  provider: IntegrationProvider,
  apiKey: string
): Promise<{ ok: boolean; message: string }> {
  const key = apiKey.trim();
  if (!key) {
    return { ok: false, message: 'API key cannot be empty.' };
  }

  try {
    switch (provider) {
      case 'google_pagespeed': {
        const res = await fetch(
          `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com&strategy=mobile&key=${encodeURIComponent(key)}`,
          { signal: AbortSignal.timeout(12000) }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { ok: false, message: err?.error?.message || `HTTP ${res.status}` };
        }
        return { ok: true, message: 'PageSpeed Insights API connected successfully.' };
      }

      case 'google_places': {
        const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': key,
            'X-Goog-FieldMask': 'places.displayName',
          },
          body: JSON.stringify({ textQuery: 'cafe in Pune', maxResultCount: 1 }),
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { ok: false, message: err?.error?.message || `HTTP ${res.status}` };
        }
        return { ok: true, message: 'Google Places API (New) connected successfully.' };
      }

      case 'serper': {
        const res = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': key,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ q: 'NextOrbit Infotech', num: 1 }),
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) {
          return { ok: false, message: `Serper returned HTTP ${res.status}` };
        }
        return { ok: true, message: 'Serper.dev Search API connected successfully.' };
      }

      case 'hunter': {
        const res = await fetch(
          `https://api.hunter.io/v2/account?api_key=${encodeURIComponent(key)}`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (!res.ok) {
          return { ok: false, message: `Hunter.io returned HTTP ${res.status}` };
        }
        return { ok: true, message: 'Hunter.io API connected successfully.' };
      }

      case 'apollo': {
        const res = await fetch('https://api.apollo.io/v1/auth/health', {
          method: 'GET',
          headers: { 'x-api-key': key },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) {
          return { ok: false, message: `Apollo.io returned HTTP ${res.status}` };
        }
        return { ok: true, message: 'Apollo.io API connected successfully.' };
      }

      case 'openai': {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { ok: false, message: err?.error?.message || `HTTP ${res.status}` };
        }
        return { ok: true, message: 'OpenAI API key verified successfully.' };
      }

      case 'anthropic': {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-5-haiku-latest',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'ping' }],
          }),
          signal: AbortSignal.timeout(12000),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { ok: false, message: err?.error?.message || `HTTP ${res.status}` };
        }
        return { ok: true, message: 'Anthropic Claude API verified successfully.' };
      }

      case 'google_gemini': {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { ok: false, message: err?.error?.message || `HTTP ${res.status}` };
        }
        return { ok: true, message: 'Google Gemini API verified successfully.' };
      }

      default:
        return { ok: false, message: 'Unknown provider.' };
    }
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Connection failed.',
    };
  }
}

