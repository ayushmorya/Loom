import { GoogleGenAI } from '@google/genai';
import { InsightsResult } from '../src/types';

// Resilient Model Fallback Ladder ordered by latency, capability, and availability
const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

let aiClient: GoogleGenAI | null = null;

export function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export const JOURNAL_SYSTEM_INSTRUCTION =
  'You are an empathetic, insightful, and grounded reflective journaling partner. Your role is not to give generic life advice, but to help the user unpack their thoughts, spot recurring patterns, gently challenge cognitive blind spots, and synthesize clarity from complexity. Keep your responses concise, focused, and conversational. Avoid corporate jargon or excessive flattery.';

function isRecoverableError(err: unknown): boolean {
  if (!err) return true;
  const msg = String((err as Error)?.message || err || '').toLowerCase();
  
  // Explicitly non-recoverable: invalid or missing API key
  if (msg.includes('api key not valid') || msg.includes('api_key_invalid')) {
    return false;
  }

  // All other errors (404 model not found/deprecated, 429 quota, 503 unavailable, etc.) can be recovered by trying the next model
  return true;
}

export interface ChatMessageParam {
  role: 'user' | 'model';
  content: string;
}

/**
 * Executes a streaming generation with fallback ladder
 */
export async function generateStreamWithFallback(
  messages: ChatMessageParam[],
  onChunk: (chunkText: string) => void
): Promise<{ modelUsed: string; fullText: string }> {
  const ai = getAI();

  // Format contents for @google/genai
  const contents = messages.map(msg => ({
    role: msg.role === 'model' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  let lastError: Error | null = null;

  for (let i = 0; i < MODEL_FALLBACK_LADDER.length; i++) {
    const model = MODEL_FALLBACK_LADDER[i];
    try {
      console.log(`[Gemini] Attempting stream with model: ${model}`);
      const responseStream = await ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction: JOURNAL_SYSTEM_INSTRUCTION,
          temperature: 0.7,
        },
      });

      let fullText = '';
      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          fullText += text;
          onChunk(text);
        }
      }

      return { modelUsed: model, fullText };
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      console.warn(`[Gemini] Model ${model} failed (${errMsg}). Trying next in fallback ladder.`);
      lastError = err instanceof Error ? err : new Error(errMsg);

      if (!isRecoverableError(err)) {
        throw lastError;
      }
    }
  }

  throw lastError || new Error('All models in fallback ladder failed.');
}

/**
 * Extracts structured title, sentiment, tags, and summary via Gemini structured JSON
 */
export async function generateInsightsWithFallback(
  contextText: string
): Promise<InsightsResult> {
  const ai = getAI();

  const prompt = `Analyze this reflective journaling entry and return structured metadata.
Journal Entry Content:
"""
${contextText.slice(0, 4000)}
"""`;

  let lastError: Error | null = null;

  for (let i = 0; i < MODEL_FALLBACK_LADDER.length; i++) {
    const model = MODEL_FALLBACK_LADDER[i];
    try {
      console.log(`[Gemini] Generating insights with model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction:
            'You analyze reflective journal entries. Extract a concise, grounded title (3-6 words), determine dominant sentiment, assign 2-4 category tags, and write a 1-2 sentence thoughtful reflection summary.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Concise title (3 to 6 words)',
              },
              sentiment: {
                type: 'string',
                description: 'Dominant emotional state',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: '2 to 4 thematic categories',
              },
              summary: {
                type: 'string',
                description: '1-2 sentence thoughtful synthesis',
              },
            },
            required: ['title', 'sentiment', 'tags', 'summary'],
          },
        },
      });

      const responseText = response.text?.trim() || '{}';
      const parsed = JSON.parse(responseText) as InsightsResult;

      return {
        title: parsed.title || 'Reflective Session',
        sentiment: parsed.sentiment || 'Reflective',
        tags: Array.isArray(parsed.tags) && parsed.tags.length > 0 ? parsed.tags : ['Reflection'],
        summary: parsed.summary || 'A moment of mindful reflection.',
      };
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      console.warn(`[Gemini] Insights generation failed with model ${model} (${errMsg}). Trying next.`);
      lastError = err instanceof Error ? err : new Error(errMsg);

      if (!isRecoverableError(err)) {
        throw lastError;
      }
    }
  }

  // Fallback default insights if all models encountered transient issue
  return {
    title: 'Mindful Reflection',
    sentiment: 'Reflective',
    tags: ['Mindfulness', 'Personal Growth'],
    summary: 'Exploration of personal thoughts and cognitive reflections.',
  };
}
