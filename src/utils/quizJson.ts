import { Question, Quiz, StimulusGroup } from '../types';

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
  const rawStimulusId = q.stimulusId || q.stimulus_id || q.stimulus_group_id || q.passage_id || q.context_id;

  return {
    id,
    question: text,
    question_text: text,
    stimulusId: rawStimulusId == null ? undefined : String(rawStimulusId),
    stimulus: typeof q.stimulus === 'string' ? q.stimulus.trim() : undefined,
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
  let rawStimulusGroups: any[] = [];

  if (Array.isArray(parsed)) {
    rawQuestions = parsed;
  } else if (parsed && typeof parsed === 'object') {
    title = parsed.quiz_title || parsed.title || parsed.quizTitle || title;
    rawQuestions = parsed.questions || parsed.mcqs || parsed.items || [];
    rawStimulusGroups = parsed.stimulus_groups || parsed.stimulusGroups || parsed.stimuli || [];
  }

  const stimulusGroups: StimulusGroup[] = [];
  const groupTexts = new Map<string, string>();

  const addStimulusGroup = (id: unknown, text: unknown, idx: number): string | undefined => {
    const stimulusText = typeof text === 'string' ? text.trim() : '';
    if (!stimulusText) return undefined;

    const groupId = String(id || `stimulus_${idx + 1}`);
    const existing = stimulusGroups.find((group) => group.id === groupId);
    if (!existing) {
      stimulusGroups.push({ id: groupId, text: stimulusText });
      groupTexts.set(stimulusText, groupId);
    }
    return groupId;
  };

  (Array.isArray(rawStimulusGroups) ? rawStimulusGroups : []).forEach((group, idx) => {
    if (!group || typeof group !== 'object') return;
    addStimulusGroup(
      group.id || group.stimulus_id,
      group.text || group.stimulus || group.passage || group.content,
      idx
    );
  });

  const questions = (Array.isArray(rawQuestions) ? rawQuestions : []).map((rawQuestion, idx) => {
    const q = rawQuestion && typeof rawQuestion === 'object' ? rawQuestion : {};
    const question = normalizeQuestion(q, idx);
    const stimulusValue = q.stimulus ?? q.passage ?? q.context;
    const inlineStimulus = typeof stimulusValue === 'string'
      ? stimulusValue.trim()
      : stimulusValue && typeof stimulusValue === 'object'
      ? String(stimulusValue.text || stimulusValue.content || stimulusValue.passage || '').trim()
      : '';
    const referencedId = question.stimulusId;

    if (inlineStimulus) {
      const inlineId = typeof stimulusValue === 'object'
        ? stimulusValue.id || stimulusValue.stimulus_id || referencedId
        : referencedId;
      question.stimulusId = inlineId
        ? addStimulusGroup(inlineId, inlineStimulus, idx) || String(inlineId)
        : groupTexts.get(inlineStimulus) || addStimulusGroup(undefined, inlineStimulus, idx);
      question.stimulus = undefined;
    } else if (referencedId) {
      question.stimulusId = referencedId;
    }

    return question;
  });

  return {
    id: parsed?.id || `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    quiz_title: title,
    created_at: parsed?.created_at || new Date().toISOString(),
    total_questions: questions.length,
    ...(stimulusGroups.length > 0 ? { stimulusGroups } : {}),
    questions,
  };
}

export function getQuestionStimulus(quiz: Quiz, question: Question): string | undefined {
  const groupText = question.stimulusId
    ? quiz.stimulusGroups?.find((group) => group.id === question.stimulusId)?.text
    : undefined;
  return groupText || question.stimulus?.trim() || undefined;
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
    ...(quiz.stimulusGroups?.length
      ? {
          stimulus_groups: quiz.stimulusGroups.map((group) => ({
            id: group.id,
            text: group.text,
          })),
        }
      : {}),
    questions: (quiz.questions || []).map((q, idx) => ({
      id: typeof q.id === 'number' ? q.id : idx + 1,
      ...(q.stimulusId ? { stimulus_id: q.stimulusId } : {}),
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
