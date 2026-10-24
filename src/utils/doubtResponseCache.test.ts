import { describe, expect, it } from 'vitest';
import { Question, Quiz } from '../types';
import { createDoubtResponseIdentity, createDoubtResponseRecord } from './doubtResponseCache';

const quiz: Quiz = {
  quiz_title: 'পদার্থবিজ্ঞান - গতি',
  questions: [],
};

const question: Question = {
  id: 1,
  question: 'বেগ কাকে বলে?',
  options: ['দূরত্ব/সময়', 'ভর/সময়'],
  correct_answer: 0,
  explanation: '',
};

describe('doubt response cache identity', () => {
  it('shares a cache identity across histories for the same profile, question, and doubt', () => {
    const firstHistoryKey = createDoubtResponseIdentity(
      'profile-a',
      quiz.quiz_title,
      question,
      quiz,
      'বেগের একক কী?'
    );
    const secondHistoryKey = createDoubtResponseIdentity(
      'profile-a',
      quiz.quiz_title,
      { ...question, id: 'different-question-id' },
      quiz,
      '  বেগের   একক কী? '
    );

    expect(secondHistoryKey).toEqual(firstHistoryKey);
  });

  it('isolates other profiles, doubts, and questions', () => {
    const base = createDoubtResponseIdentity('profile-a', quiz.quiz_title, question, quiz, 'দ্বিধা');

    expect(createDoubtResponseIdentity('profile-b', quiz.quiz_title, question, quiz, 'দ্বিধা')).not.toEqual(base);
    expect(createDoubtResponseIdentity('profile-a', quiz.quiz_title, question, quiz, 'অন্য দ্বিধা')).not.toEqual(base);
    expect(createDoubtResponseIdentity(
      'profile-a',
      quiz.quiz_title,
      { ...question, question: 'ত্বরণ কাকে বলে?' },
      quiz,
      'দ্বিধা'
    )).not.toEqual(base);
    expect(createDoubtResponseIdentity(
      'profile-a',
      quiz.quiz_title,
      { ...question, options: ['ভিন্ন বিকল্প', 'ভর/সময়'] },
      quiz,
      'দ্বিধা'
    )).not.toEqual(base);
    expect(createDoubtResponseIdentity(
      'profile-a',
      quiz.quiz_title,
      { ...question, stimulusId: 'stimulus-1' },
      { ...quiz, stimulusGroups: [{ id: 'stimulus-1', text: 'ভিন্ন উদ্দীপক' }] },
      'দ্বিধা'
    )).not.toEqual(base);
  });

  it('keeps responses distinct when the student selected a different option', () => {
    const unanswered = createDoubtResponseIdentity('profile-a', quiz.quiz_title, question, quiz, 'দ্বিধা');
    const answered = createDoubtResponseIdentity(
      'profile-a',
      quiz.quiz_title,
      question,
      quiz,
      'দ্বিধা',
      'ভর/সময়'
    );

    expect(answered).not.toEqual(unanswered);
  });

  it('keeps explanation modes distinct even when the query text is the same', () => {
    const explain = createDoubtResponseIdentity(
      'profile-a',
      quiz.quiz_title,
      question,
      quiz,
      'বুঝিয়ে বলুন',
      undefined,
      'explain'
    );
    const simplify = createDoubtResponseIdentity(
      'profile-a',
      quiz.quiz_title,
      question,
      quiz,
      'বুঝিয়ে বলুন',
      undefined,
      'simplify'
    );

    expect(simplify).not.toEqual(explain);
  });

  it('tracks the histories where a shared response was generated or refreshed', () => {
    const identity = createDoubtResponseIdentity('profile-a', quiz.quiz_title, question, quiz, 'দ্বিধা');
    const original = createDoubtResponseRecord({
      identity,
      quizTitle: quiz.quiz_title,
      question,
      doubt: 'দ্বিধা',
      response: 'আগের উত্তর',
      historyId: 'history-1',
    });
    const updated = createDoubtResponseRecord({
      identity,
      quizTitle: quiz.quiz_title,
      question,
      doubt: 'দ্বিধা',
      response: 'নতুন উত্তর',
      historyId: 'history-2',
      existing: original,
    });

    expect(updated.historyIds).toEqual(['history-1', 'history-2']);
    expect(updated).toMatchObject(identity);
  });
});
