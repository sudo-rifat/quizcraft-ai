import { Question, Quiz } from '../types';

/**
 * Prepares AI-generated quiz text for JSON.parse.
 * Some chat interfaces escape Markdown punctuation (for example `quiz\_title`
 * and `\[`), even though those escapes are not valid in JSON object syntax.
 */
export function normalizeQuizJson(text: string): string {
  return text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/\\([_[\]{}])/g, '$1')
    .trim();
}

/**
 * Normalizes question object ensuring both `question` and `question_text`
 * as well as `correct_answer` and `correct_answer_index` are consistently populated.
 */
export function normalizeQuestion(q: any, idx = 0): Question {
  const text = (q.question || q.question_text || q.text || `Question ${idx + 1}`).trim();
  let options = Array.isArray(q.options) ? q.options : Array.isArray(q.choices) ? q.choices : [];
  options = options.map((opt: any) => String(opt ?? ''));

  let correctIndex = 0;
  if (typeof q.correct_answer === 'number') {
    correctIndex = q.correct_answer;
  } else if (typeof q.correct_answer_index === 'number') {
    correctIndex = q.correct_answer_index;
  } else if (typeof q.answer_index === 'number') {
    correctIndex = q.answer_index;
  } else if (typeof q.correct_answer === 'string') {
    const letterIdx = ['a', 'b', 'c', 'd'].indexOf(q.correct_answer.trim().toLowerCase());
    if (letterIdx !== -1) correctIndex = letterIdx;
  } else if (typeof q.correct_answer_index === 'string') {
    const letterIdx = ['a', 'b', 'c', 'd'].indexOf(q.correct_answer_index.trim().toLowerCase());
    if (letterIdx !== -1) correctIndex = letterIdx;
  }

  const explanation = (q.explanation || q.reason || '').trim();
  const id = q.id ?? `q_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;

  return {
    id,
    question: text,
    question_text: text,
    options,
    correct_answer: correctIndex,
    correct_answer_index: correctIndex,
    explanation,
  };
}

/**
 * Normalizes an entire Quiz structure.
 */
export function normalizeQuiz(parsed: any): Quiz {
  let title = 'Generated Quiz';
  let rawQuestions: any[] = [];

  if (Array.isArray(parsed)) {
    rawQuestions = parsed;
  } else if (parsed && typeof parsed === 'object') {
    title = parsed.quiz_title || parsed.title || parsed.quizTitle || title;
    rawQuestions = parsed.questions || parsed.mcqs || parsed.items || [];
  }

  const questions = (Array.isArray(rawQuestions) ? rawQuestions : []).map((q, idx) =>
    normalizeQuestion(q, idx)
  );

  return {
    id: parsed?.id || `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    quiz_title: title,
    created_at: parsed?.created_at || new Date().toISOString(),
    total_questions: questions.length,
    questions,
  };
}

/**
 * Formats a quiz to clean JSON strictly matching the standard prompt schema:
 * {
 *   quiz_title: string,
 *   questions: [
 *     { id: 1, question: string, options: string[], correct_answer: number, explanation: string }
 *   ]
 * }
 */
export function formatQuizForExport(quiz: Quiz) {
  return {
    quiz_title: quiz.quiz_title,
    questions: (quiz.questions || []).map((q, idx) => ({
      id: typeof q.id === 'number' ? q.id : idx + 1,
      question: q.question || q.question_text || `Question ${idx + 1}`,
      options: q.options || [],
      correct_answer: typeof q.correct_answer === 'number'
        ? q.correct_answer
        : typeof q.correct_answer_index === 'number'
        ? q.correct_answer_index
        : 0,
      explanation: q.explanation || '',
    })),
  };
}
