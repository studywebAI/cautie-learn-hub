// app/ai/genkit.ts
import { genkit } from 'genkit';
import {
  OPENROUTER_LOCKED_MODEL,
  resolveOpenRouterApiKey,
} from '@/lib/ai/openrouter-policy';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// ─────────────────────────────
// Genkit Initialization
// ─────────────────────────────
let aiInstance: ReturnType<typeof genkit> | null = null;

const getAI = () => {
  if (!aiInstance) {
    aiInstance = genkit({ plugins: [] });
  }
  return aiInstance;
};

// ─────────────────────────────
// OpenRouter-backed Model
// ─────────────────────────────
let modelRef: any = null;

export const getGoogleAIModel = (): any => {
  if (modelRef) return modelRef;

  modelRef = getAI().defineModel(
    {
      name: 'openrouter/gemini-2.5-flash-lite',
      label: 'Gemini 2.5 Flash Lite (via OpenRouter)',
      supports: {
        multiturn: true,
        output: ['text', 'json'],
        media: true,
        tools: false,
      },
    },
    async (request: any) => {
      const apiKey = resolveOpenRouterApiKey();
      if (!apiKey) {
        const err = new Error('OPENROUTER_API_KEY is missing') as any;
        err.code = 'OPENROUTER_API_KEY_MISSING';
        throw err;
      }

      const messages = (request.messages || []).map((msg: any) => {
        const role = msg.role === 'model' ? 'assistant' : msg.role;
        const parts = (msg.content || [])
          .map((part: any) => {
            if (part.text != null) return { type: 'text', text: String(part.text) };
            if (part.media?.url) return { type: 'image_url', image_url: { url: part.media.url } };
            return null;
          })
          .filter(Boolean);

        const allText = parts.every((p: any) => p.type === 'text');
        return {
          role,
          content: allText
            ? parts.map((p: any) => p.text).join('')
            : parts,
        };
      });

      const useJson = request.output?.format === 'json';

      const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || process.env.NEXT_PUBLIC_APP_URL || '',
          'X-Title': process.env.OPENROUTER_APP_TITLE || 'Cautie Learn Hub',
        },
        body: JSON.stringify({
          model: OPENROUTER_LOCKED_MODEL,
          messages,
          temperature: request.config?.temperature ?? 0.2,
          ...(useJson ? { response_format: { type: 'json_object' } } : {}),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({} as any)) as any;
        const err = new Error(
          `OpenRouter ${res.status}: ${body?.error?.message || res.statusText}`
        ) as any;
        err.status = res.status;
        err.code = `OPENROUTER_HTTP_${res.status}`;
        throw err;
      }

      const json = await res.json() as any;
      const text = String(json.choices?.[0]?.message?.content || '');

      return {
        message: {
          role: 'model',
          content: [{ text }],
        },
        finishReason: json.choices?.[0]?.finish_reason === 'stop' ? 'stop' : 'other',
        usage: {
          inputTokens: json.usage?.prompt_tokens ?? 0,
          outputTokens: json.usage?.completion_tokens ?? 0,
          totalTokens: json.usage?.total_tokens ?? 0,
        },
      };
    }
  );

  return modelRef;
};

// ─────────────────────────────
// Proxy Wrapper for Lazy Loading
// ─────────────────────────────
export const ai = new Proxy({} as ReturnType<typeof genkit>, {
  get(_target, prop) {
    const instance = getAI();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
  has(_target, prop) {
    try { return prop in getAI(); } catch { return false; }
  },
  ownKeys() {
    try { return Reflect.ownKeys(getAI()); } catch { return []; }
  },
  getOwnPropertyDescriptor(_target, prop) {
    try { return Reflect.getOwnPropertyDescriptor(getAI(), prop); } catch { return undefined; }
  },
}) as ReturnType<typeof genkit>;
