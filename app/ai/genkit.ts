// app/ai/genkit.ts
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// ─────────────────────────────
// Shared Plugin Instance
// ─────────────────────────────
let googleAIInstance: ReturnType<typeof googleAI> | null = null;

let currentKeyIndex = 0;

const getGoogleAI = () => {
  const keys = [
    process.env.GEMINI_API_KEY,           // ← Now GEMINI_API_KEY first

    process.env.GEMINI_API_KEY_2,

  ];

  const apiKey = keys[currentKeyIndex];
  if (apiKey) {
    console.log(`✅ Using API key ${currentKeyIndex + 1} (length: ${apiKey.length}, starts with: ${apiKey.substring(0,4)}...)`);
    return googleAI({ apiKey });
  }

  console.error(`❌ Fatal Error: GEMINI_API_KEY at index ${currentKeyIndex} not found.`);
  throw new Error("Missing GEMINI_API_KEY");
};

// ─────────────────────────────
// Model Getter
// ─────────────────────────────
export const getGoogleAIModel = async () => {
  const plugin = getGoogleAI();
  const model = await plugin.model('gemini-2.5-flash');

  if (!model) throw new Error("Gemini model returned undefined.");
  return model;
};

// ─────────────────────────────
// Genkit Initialization
// ─────────────────────────────
let aiInstance: ReturnType<typeof genkit> | null = null;
let initError: Error | null = null;

const initializeAI = () => {
  if (aiInstance) return aiInstance;
  if (initError) throw initError;

  try {
    aiInstance = genkit({
      plugins: [getGoogleAI()],
    });
    return aiInstance;
  } catch (err) {
    initError = err instanceof Error ? err : new Error(String(err));
    throw initError;
  }
};

const getAI = () => initializeAI();

// ─────────────────────────────
// Proxy Wrapper for Lazy Loading
// ─────────────────────────────
const createVirtualAI = () => ({
  definePrompt: (...args: any[]) => (getAI() as any).definePrompt(...args),
  defineFlow: (name: string, schema: any, fn: any) => {
    const wrappedFn = async (input: any) => {
      currentKeyIndex = 0; // Reset to first key
      const keyIndices = [0, 1];
      for (const keyIndex of keyIndices) {
        try {
          currentKeyIndex = keyIndex;
          return await fn(input);
        } catch (err: any) {
          console.error(`[${name}] Error with key ${keyIndex + 1}: ${err.message}`);
          if (keyIndex === keyIndices.length - 1) {
            throw err;
          }
        }
      }
    };
    return (getAI() as any).defineFlow(name, schema, wrappedFn);
  },
});

export const ai = new Proxy(createVirtualAI(), {
  get(_target, prop) {
    const instance = getAI();
    const value = (instance as any)[prop];
    return typeof value === "function" ? value.bind(instance) : value;
  },
  has(_target, prop) {
    try {
      return prop in getAI();
    } catch {
      return false;
    }
  },
  ownKeys() {
    try {
      return Reflect.ownKeys(getAI());
    } catch {
      return [];
    }
  },
  getOwnPropertyDescriptor(_target, prop) {
    try {
      return Reflect.getOwnPropertyDescriptor(getAI(), prop);
    } catch {
      return undefined;
    }
  },
}) as ReturnType<typeof genkit>;
