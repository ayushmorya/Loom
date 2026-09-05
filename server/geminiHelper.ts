import { GoogleGenAI } from '@google/genai';
import { InsightsResult, FutureReflectResponse, FutureCompareResponse } from '../src/types';

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

/**
 * Analyzes a message to future self before sealing
 */
export async function generateFutureReflectionWithFallback(
  messageText: string
): Promise<FutureReflectResponse> {
  const ai = getAI();

  const prompt = `Analyze this heartfelt personal letter written by a person to their future self.
Provide an empathetic, grounded reflection without pretending to know their future. Do not provide clinical diagnoses or make mental health assumptions.

Message to Future Self:
"""
${messageText.slice(0, 4000)}
"""`;

  let lastError: Error | null = null;

  for (let i = 0; i < MODEL_FALLBACK_LADDER.length; i++) {
    const model = MODEL_FALLBACK_LADDER[i];
    try {
      console.log(`[Gemini] Generating Future Reflection with model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction:
            'You are an emotionally intelligent, gentle guide helping a user prepare a letter to their future self. You provide: 1) a warm, validating reflection of their current state (1-2 sentences), 2) 2-4 key priorities or themes that matter to them right now, and 3) one poignant, open-ended question for their future self to ponder.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              reflection: {
                type: 'string',
                description: 'Concise, gentle 1-2 sentence reflection of what they are experiencing.',
              },
              mattersNow: {
                type: 'array',
                items: { type: 'string' },
                description: '2 to 4 bullet items of what matters to the author right now.',
              },
              questionForFuture: {
                type: 'string',
                description: 'One thoughtful, emotionally intelligent question for their future self.',
              },
            },
            required: ['reflection', 'mattersNow', 'questionForFuture'],
          },
        },
      });

      const responseText = response.text?.trim() || '{}';
      const parsed = JSON.parse(responseText) as FutureReflectResponse;

      return {
        reflection: parsed.reflection || 'You are holding space for honesty and intention in this moment.',
        mattersNow: Array.isArray(parsed.mattersNow) && parsed.mattersNow.length > 0
          ? parsed.mattersNow
          : ['Personal clarity', 'Inner growth'],
        questionForFuture: parsed.questionForFuture || 'How does the path look from where you are standing now?',
      };
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      console.warn(`[Gemini] Future reflection failed with model ${model} (${errMsg}). Trying next.`);
      lastError = err instanceof Error ? err : new Error(errMsg);

      if (!isRecoverableError(err)) {
        throw lastError;
      }
    }
  }

  return {
    reflection: 'It takes courage to capture your present moment so honestly for who you will become.',
    mattersNow: ['Present awareness', 'Future hope'],
    questionForFuture: 'Did you find peace with the questions you carried back then?',
  };
}

/**
 * Compares Then (original message) and Now (unlocked reflection)
 */
export async function generateThenVsNowComparisonWithFallback(
  thenText: string,
  nowText: string
): Promise<FutureCompareResponse> {
  const ai = getAI();

  const prompt = `Compare these two personal reflection entries from different points in time:
ENTRY FROM THE PAST ("THEN"):
"""
${thenText.slice(0, 3000)}
"""

ENTRY FROM TODAY ("NOW"):
"""
${nowText.slice(0, 3000)}
"""

Identify meaningful differences, shifts in perspective, or continuity. Keep the analysis supportive and avoid exaggerated claims. If there isn't enough information or if things have remained steady, state that honestly: "Some things haven't changed yet — and that's okay." Never manufacture artificial growth.`;

  let lastError: Error | null = null;

  for (let i = 0; i < MODEL_FALLBACK_LADDER.length; i++) {
    const model = MODEL_FALLBACK_LADDER[i];
    try {
      console.log(`[Gemini] Generating Then vs Now comparison with model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction:
            'You compare past and present personal reflection letters. You identify authentic perspective shifts with warmth and nuance. Do not exaggerate or claim dramatic transformations where simple perseverance or subtle shifting occurred.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              summary: {
                type: 'string',
                description: 'Supportive summary of how the author has evolved or stayed grounded.',
              },
              thenSummary: {
                type: 'string',
                description: 'Concise summary of their state back then (1 sentence).',
              },
              nowSummary: {
                type: 'string',
                description: 'Concise summary of their state today (1 sentence).',
              },
              biggestShift: {
                type: 'string',
                description: 'Short phrase summarizing the shift (e.g. "Uncertainty → Direction" or "Striving → Acceptance").',
              },
              growthTrajectory: {
                type: 'object',
                properties: {
                  then: { type: 'string', description: 'State then, e.g. "Uncertain"' },
                  journey: { type: 'string', description: 'What carried them through, e.g. "Patience"' },
                  now: { type: 'string', description: 'State now, e.g. "Grounded"' },
                },
                required: ['then', 'journey', 'now'],
              },
            },
            required: ['summary', 'thenSummary', 'nowSummary', 'biggestShift'],
          },
        },
      });

      const responseText = response.text?.trim() || '{}';
      const parsed = JSON.parse(responseText) as FutureCompareResponse;

      return {
        summary: parsed.summary || 'A meaningful snapshot of your personal trajectory over time.',
        thenSummary: parsed.thenSummary || 'You were navigating questions of direction.',
        nowSummary: parsed.nowSummary || 'You bring fresh perspective to your earlier self.',
        biggestShift: parsed.biggestShift || 'Seeking → Grounding',
        growthTrajectory: parsed.growthTrajectory || {
          then: 'Searching',
          journey: 'Reflection',
          now: 'Clarity',
        },
      };
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      console.warn(`[Gemini] Then vs Now comparison failed with model ${model} (${errMsg}). Trying next.`);
      lastError = err instanceof Error ? err : new Error(errMsg);

      if (!isRecoverableError(err)) {
        throw lastError;
      }
    }
  }

  return {
    summary: 'Looking back, you can see how each step, quiet or bold, brought you to this present moment.',
    thenSummary: 'You shared your candid thoughts from that day.',
    nowSummary: 'You revisited your past self with compassion.',
    biggestShift: 'Past Memory → Present Perspective',
    growthTrajectory: {
      then: 'Contemplative',
      journey: 'Time',
      now: 'Reflective',
    },
  };
}
