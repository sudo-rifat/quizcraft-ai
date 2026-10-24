import { DoubtResponse, Quiz, Question } from '../types';
import { getQuestionStimulus } from './quizJson';

function normalizeIdentityPart(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export interface DoubtResponseIdentity {
  profileId: string;
  quizKey: string;
  questionKey: string;
  doubtKey: string;
}

function createQuestionKey(question: Question, quiz: Quiz, userAnswerText?: string): string {
  return JSON.stringify({
    text: normalizeIdentityPart(question.question || question.question_text || ''),
    options: question.options.map(normalizeIdentityPart),
    stimulus: normalizeIdentityPart(getQuestionStimulus(quiz, question) || ''),
    correctAnswer: question.correct_answer ?? question.correct_answer_index ?? -1,
    userAnswer: normalizeIdentityPart(userAnswerText || ''),
  });
}

export function createDoubtResponseIdentity(
  profileId: string,
  quizTitle: string,
  question: Question,
  quiz: Quiz,
  doubt: string,
  userAnswerText?: string,
  responseMode: 'explain' | 'simplify' | 'practice' | 'custom' = 'custom',
): DoubtResponseIdentity {
  return {
    profileId,
    quizKey: normalizeIdentityPart(quizTitle),
    questionKey: createQuestionKey(question, quiz, userAnswerText),
    doubtKey: JSON.stringify([responseMode, normalizeIdentityPart(doubt)]),
  };
}

export function createDoubtResponseRecord({
  identity,
  quizTitle,
  question,
  doubt,
  response,
  historyId,
  existing,
}: {
  identity: DoubtResponseIdentity;
  quizTitle: string;
  question: Question;
  doubt: string;
  response: string;
  historyId: string;
  existing?: DoubtResponse;
}): DoubtResponse {
  const now = Date.now();
  const questionText = question.question || question.question_text || '';

  return {
    ...(existing?.id !== undefined ? { id: existing.id } : {}),
    ...identity,
    quizTitle,
    questionText,
    doubtText: doubt.trim(),
    response,
    historyIds: Array.from(new Set([...(existing?.historyIds || []), historyId])),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}
