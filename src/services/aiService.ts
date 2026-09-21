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

  if (provider === 'gemini' && !geminiKey) {
    throw new Error('Google Gemini API Key is missing. Please add your key in Settings.');
  }

  if (provider === 'openai' && !openaiKey) {
    throw new Error('OpenAI API Key is missing. Please add your key in Settings.');
  }

  const prompt = `
You are an expert tutor helping a student understand a quiz question.

Question: "${questionText}"
Options:
${options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}

Correct Answer: "${correctAnswerText}"
${userAnswerText ? `Student's Selected Answer: "${userAnswerText}"` : 'Student did not answer this question.'}

Student's Query: ${userQuery || 'Please explain why the correct answer is right, analyze why other options are wrong, and explain the underlying concept clearly.'}

Respond concisely and clearly in student-friendly Bengali and English where relevant. Keep the tone encouraging.
`.trim();

  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
    
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
      throw new Error(`Gemini API Error: ${errorMsg}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) throw new Error('Received empty response from Gemini AI.');
    return resultText;
  } else {
    const url = 'https://api.openai.com/v1/chat/completions';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
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
      throw new Error(`OpenAI API Error: ${errorMsg}`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content;
    if (!resultText) throw new Error('Received empty response from OpenAI.');
    return resultText;
  }
}
