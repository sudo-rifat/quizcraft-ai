import { Settings, Quiz } from '../types';
import { normalizeQuizJson } from '../utils/quizJson';

export interface QuizGenerationResult {
  success: boolean;
  quiz?: Quiz;
  error?: string;
  isRateLimit?: boolean;
}

/**
 * Generate quiz JSON by calling Gemini or OpenAI API directly.
 * Supports text prompts and optional image (base64) for Gemini Vision.
 */
export async function generateQuizViaApi(
  prompt: string,
  settings: Settings,
  imageBase64?: string,
  imageMimeType?: string,
): Promise<QuizGenerationResult> {
  const provider = settings.preferredAiProvider || 'gemini';
  const geminiKey = settings.geminiApiKey?.trim();
  const openaiKey = settings.openaiApiKey?.trim();
  const openrouterKey = settings.openrouterApiKey?.trim();
  const groqKey = settings.groqApiKey?.trim();

  // Validate API key exists
  if (provider === 'gemini' && !geminiKey) {
    return { success: false, error: 'Gemini API Key not configured.', isRateLimit: false };
  }
  if (provider === 'openai' && !openaiKey) {
    return { success: false, error: 'OpenAI API Key not configured.', isRateLimit: false };
  }
  if (provider === 'openrouter' && !openrouterKey) {
    return { success: false, error: 'OpenRouter API Key not configured.', isRateLimit: false };
  }
  if (provider === 'groq' && !groqKey) {
    return { success: false, error: 'Groq API Key not configured.', isRateLimit: false };
  }

  try {
    let rawText: string;

    if (provider === 'gemini') {
      rawText = await callGemini(prompt, geminiKey!, imageBase64, imageMimeType);
    } else if (provider === 'openai') {
      rawText = await callOpenAI(prompt, openaiKey!, imageBase64, imageMimeType);
    } else if (provider === 'openrouter') {
      rawText = await callOpenAI(prompt, openrouterKey!, imageBase64, imageMimeType, 'https://openrouter.ai/api/v1/chat/completions', 'openrouter/free');
    } else {
      rawText = await callOpenAI(prompt, groqKey!, imageBase64, imageMimeType, 'https://api.groq.com/openai/v1/chat/completions', 'llama-3.3-70b-versatile');
    }

    // Parse and validate JSON from response
    const quiz = parseQuizJson(rawText);
    if (!quiz) {
      return {
        success: false,
        error: 'AI returned an invalid response. Please try again or use Copy Prompt mode.',
        isRateLimit: false,
      };
    }

    return { success: true, quiz };
  } catch (err: any) {
    const isRateLimit = detectRateLimit(err);
    return {
      success: false,
      error: isRateLimit
        ? 'API rate limit reached. Switched to Prompt Mode.'
        : err.message || 'AI generation failed. Please try Copy Prompt mode.',
      isRateLimit,
    };
  }
}

/**
 * Check if user has a valid API key configured for quiz generation.
 */
export function hasApiKeyConfigured(settings: Settings): boolean {
  const provider = settings.preferredAiProvider || 'gemini';
  if (provider === 'gemini') return !!settings.geminiApiKey?.trim();
  if (provider === 'openai') return !!settings.openaiApiKey?.trim();
  if (provider === 'openrouter') return !!settings.openrouterApiKey?.trim();
  if (provider === 'groq') return !!settings.groqApiKey?.trim();
  return false;
}

// ─── Internal Helpers ────────────────────────────────────────────────

async function callGemini(
  prompt: string,
  apiKey: string,
  imageBase64?: string,
  imageMimeType?: string,
): Promise<string> {
  const candidateModels = [
    'gemini-flash-latest',
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-2.5-flash',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash',
  ];
  let lastError: Error | null = null;

  const parts: any[] = [{ text: prompt }];
  if (imageBase64 && imageMimeType) {
    parts.unshift({
      inline_data: {
        mime_type: imageMimeType,
        data: imageBase64,
      },
    });
  }

  for (const model of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const status = response.status;
        const msg = errData.error?.message || response.statusText || 'Gemini API Error';
        const msgLower = msg.toLowerCase();

        // If the model is not found or not supported for generateContent, try next candidate model
        const isModelNotFound =
          status === 404 ||
          msgLower.includes('not found') ||
          msgLower.includes('not supported') ||
          msgLower.includes('no longer available');

        if (isModelNotFound) {
          lastError = new Error(`Gemini (${model}): ${msg}`);
          continue;
        }

        const error = new Error(`Gemini API Error (${status}): ${msg}`);
        (error as any).status = status;
        throw error;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty response from Gemini AI.');
      return text;
    } catch (err: any) {
      if (err.status && err.status !== 404) {
        throw err;
      }
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini model candidates failed. Please verify your API key or use Copy Prompt mode.');
}

async function callOpenAI(
  prompt: string,
  apiKey: string,
  imageBase64?: string,
  imageMimeType?: string,
  endpoint = 'https://api.openai.com/v1/chat/completions',
  model = 'gpt-4o-mini',
): Promise<string> {
  // Build message content
  let userContent: any;
  if (imageBase64 && imageMimeType) {
    userContent = [
      { type: 'text', text: prompt },
      {
        type: 'image_url',
        image_url: {
          url: `data:${imageMimeType};base64,${imageBase64}`,
        },
      },
    ];
  } else {
    userContent = prompt;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert academic educator. Always respond with pure valid JSON only, no markdown fences or explanatory text.',
        },
        { role: 'user', content: userContent },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const status = response.status;
    const msg = errData.error?.message || response.statusText || 'OpenAI API Error';
    const error = new Error(`OpenAI API Error (${status}): ${msg}`);
    (error as any).status = status;
    throw error;
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from OpenAI.');
  return text;
}

function parseQuizJson(rawText: string): Quiz | null {
  try {
    let cleaned = normalizeQuizJson(rawText);

    // Find JSON boundaries
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');

    let jsonStr = cleaned;
    if (firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      jsonStr = cleaned.slice(firstBrace, lastBrace + 1);
    } else if (firstBracket !== -1 && lastBracket !== -1) {
      jsonStr = cleaned.slice(firstBracket, lastBracket + 1);
    }

    const parsed = JSON.parse(jsonStr);

    let title = 'Generated Quiz';
    let rawQuestions: any[] = [];

    if (Array.isArray(parsed)) {
      rawQuestions = parsed;
    } else if (parsed && typeof parsed === 'object') {
      title = parsed.quiz_title || parsed.title || parsed.quizTitle || title;
      rawQuestions = parsed.questions || parsed.mcqs || parsed.items || [];
    }

    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      return null;
    }

    const questions = rawQuestions.map((q: any, idx: number) => {
      const question_text = q.question_text || q.question || q.text || `Question ${idx + 1}`;
      let options = q.options || q.choices || [];
      if (!Array.isArray(options)) options = [];

      let correct_answer_index =
        typeof q.correct_answer_index === 'number'
          ? q.correct_answer_index
          : typeof q.correct_answer === 'number'
          ? q.correct_answer
          : typeof q.answer_index === 'number'
          ? q.answer_index
          : 0;

      if (typeof q.correct_answer === 'string') {
        const letterIdx = ['a', 'b', 'c', 'd'].indexOf(q.correct_answer.trim().toLowerCase());
        if (letterIdx !== -1) correct_answer_index = letterIdx;
      }

      const explanation = q.explanation || q.reason || '';

      return {
        id: `q_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        question_text,
        options,
        correct_answer_index,
        explanation,
      };
    });

    return {
      id: `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      quiz_title: title,
      created_at: new Date().toISOString(),
      total_questions: questions.length,
      questions,
    };
  } catch (e) {
    console.error('Quiz JSON Parse Error:', e, rawText);
    return null;
  }
}

function detectRateLimit(err: any): boolean {
  const status = err.status || err.statusCode;
  if (status === 429 || status === 503) return true;

  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes('rate limit') ||
    msg.includes('quota') ||
    msg.includes('too many requests') ||
    msg.includes('resource exhausted') ||
    msg.includes('overloaded')
  );
}
