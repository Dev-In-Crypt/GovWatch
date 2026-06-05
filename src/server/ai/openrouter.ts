/**
 * Minimal OpenRouter client. OpenRouter exposes an OpenAI-compatible
 * /chat/completions endpoint, so we don't pull a heavyweight SDK.
 *
 * Docs: https://openrouter.ai/docs
 */

export const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
export const OPENROUTER_EMBEDDINGS_ENDPOINT = 'https://openrouter.ai/api/v1/embeddings';
export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? 'google/gemini-2.5-flash';
export const OPENROUTER_EMBED_MODEL =
  process.env.OPENROUTER_EMBED_MODEL ?? 'openai/text-embedding-3-small';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'json' | 'text';
}

export interface ChatResponse {
  text: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

export async function chat(opts: ChatOptions): Promise<ChatResponse | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    console.warn('OPENROUTER_API_KEY missing — skipping LLM call');
    return null;
  }

  const body: Record<string, unknown> = {
    model: opts.model ?? OPENROUTER_MODEL,
    messages: opts.messages,
    max_tokens: opts.maxTokens ?? 800,
    temperature: opts.temperature ?? 0.2,
  };
  if (opts.responseFormat === 'json') {
    body.response_format = { type: 'json_object' };
  }

  try {
    const res = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
        // OpenRouter ranking metadata — optional but recommended:
        'http-referer': process.env.NEXTAUTH_URL || 'https://daosentinel.xyz',
        'x-title': 'DAO Sentinel',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      console.error('openrouter request failed', res.status, await res.text());
      return null;
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: ChatResponse['usage'];
    };
    const text = data.choices?.[0]?.message?.content?.trim() ?? '';
    return { text, usage: data.usage };
  } catch (err) {
    console.error('openrouter call threw', err);
    return null;
  }
}

/**
 * Generate an embedding vector for a single text. Returns null when the API
 * key is missing or the request fails — callers should treat embeddings as
 * best-effort enrichment and degrade gracefully.
 *
 * text-embedding-3-small returns 1536-dim float arrays at ~$0.02 per 1M
 * tokens. For our ~50 proposals/month volume this is < $0.01/mo.
 */
export async function embed(text: string): Promise<number[] | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    console.warn('OPENROUTER_API_KEY missing — skipping embedding');
    return null;
  }
  const truncated = text.length > 8000 ? text.slice(0, 8000) : text;
  try {
    const res = await fetch(OPENROUTER_EMBEDDINGS_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
        'http-referer': process.env.NEXTAUTH_URL || 'https://daosentinel.xyz',
        'x-title': 'DAO Sentinel',
      },
      body: JSON.stringify({ model: OPENROUTER_EMBED_MODEL, input: truncated }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      console.error('openrouter embed failed', res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as {
      data?: Array<{ embedding?: number[] }>;
    };
    const vec = data.data?.[0]?.embedding;
    return Array.isArray(vec) && vec.length > 0 ? vec : null;
  } catch (err) {
    console.error('openrouter embed threw', err);
    return null;
  }
}

/**
 * Cosine similarity between two equal-length vectors. Returns 0 on dimension
 * mismatch or zero magnitude rather than throwing — callers can sort & slice
 * without defensive checks.
 */
export function cosineSimilarity(a: number[] | null | undefined, b: number[] | null | undefined): number {
  if (!a || !b || a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}
