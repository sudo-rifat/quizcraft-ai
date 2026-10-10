import { Settings } from '../types';

interface AskAiParams {
  questionText: string;
  options: string[];
  correctAnswerText: string;
  userAnswerText?: string;
  userQuery?: string;
  settings: Settings;
}

export async function askAiForExplanation({
  questionText,
  options,
  correctAnswerText,
  userAnswerText,
  userQuery,
  settings,
}: AskAiParams): Promise<string> {
  const provider = settings.preferredAiProvider || 'gemini';
  const geminiKey = settings.geminiApiKey?.trim();
  const openaiKey = settings.openaiApiKey?.trim();
  const openrouterKey = settings.openrouterApiKey?.trim();
  const groqKey = settings.groqApiKey?.trim();

  if (provider === 'gemini' && !geminiKey) {
    throw new Error('Google Gemini API Key is missing. Please add your key in Settings.');
  }

  if (provider === 'openai' && !openaiKey) {
    throw new Error('OpenAI API Key is missing. Please add your key in Settings.');
  }
  if (provider === 'openrouter' && !openrouterKey) {
    throw new Error('OpenRouter API Key is missing. Please add your key in Settings.');
  }
  if (provider === 'groq' && !groqKey) {
    throw new Error('Groq API Key is missing. Please add your key in Settings.');
  }

  const prompt = `
You are an expert tutor helping a student understand a quiz question.

Question: "${questionText}"
Options:
${options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}

Correct Answer: "${correctAnswerText}"
${userAnswerText ? `Student's Selected Answer: "${userAnswerText}"` : 'Student did not answer this question.'}

Student's Query: ${userQuery || 'Please explain why the correct answer is right, analyze why other options are wrong, and explain the underlying concept clearly.'}

Respond in student-friendly Bengali (use English only where needed) using this compact format:

## Correct Answer
State the correct option and answer in one line.
## Why It Is Correct
Give a short, clear explanation.
## Why Other Options Are Wrong
Use one short bullet for each relevant incorrect option.
## Key Takeaway
Give one memorable rule or formula.

Do not add greetings, emojis, repeated encouragement, or extra closing remarks. Keep the full answer under 180 words unless the student specifically asks for more detail.
`.trim();

  if (provider === 'gemini') {
    const candidateModels = [
      'gemini-flash-latest',
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-2.5-flash',
      'gemini-flash-lite-latest',
      'gemini-3.5-flash',
    ];
    let lastError: Error | null = null;

    for (const model of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errorMsg = errData.error?.message || response.statusText || 'Gemini API Error';
          const msgLower = errorMsg.toLowerCase();

          const isModelNotFound =
            response.status === 404 ||
            msgLower.includes('not found') ||
            msgLower.includes('not supported') ||
            msgLower.includes('no longer available');

          if (isModelNotFound) {
            lastError = new Error(`Gemini (${model}): ${errorMsg}`);
            continue;
          }

          throw new Error(`Gemini API Error (${response.status}): ${errorMsg}`);
        }

        const data = await response.json();
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!resultText) throw new Error('Received empty response from Gemini AI.');
        return resultText;
      } catch (err: any) {
        if (err.message && !err.message.includes('not found') && !err.message.includes('not supported') && !err.message.includes('404')) {
          throw err;
        }
        lastError = err;
      }
    }

    throw lastError || new Error('All Gemini model candidates failed. Please verify your API key.');
  } else {
    const config = provider === 'openrouter'
      ? { key: openrouterKey!, url: 'https://openrouter.ai/api/v1/chat/completions', model: 'openrouter/free', name: 'OpenRouter' }
      : provider === 'groq'
      ? { key: groqKey!, url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile', name: 'Groq' }
      : { key: openaiKey!, url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini', name: 'OpenAI' };

    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.key}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: 'You are an empathetic, clear, and expert quiz tutor.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errorMsg = errData.error?.message || response.statusText || 'OpenAI API Error';
      throw new Error(`${config.name} API Error: ${errorMsg}`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content;
    if (!resultText) throw new Error(`Received empty response from ${config.name}.`);
    return resultText;
  }
}
