import { describe, expect, it } from 'vitest';
import { formatQuizForExport, getQuestionStimulus, normalizeQuiz } from './quizJson';

describe('quiz stimulus groups', () => {
  it('connects questions to a shared stimulus group and exports the relationship', () => {
    const quiz = normalizeQuiz(normalizeQuiz({
      quiz_title: 'উদ্দীপক কুইজ',
      stimulus_groups: [{ id: 'passage-a', text: 'একটি সাধারণ উদ্দীপক।' }],
      questions: [
        { id: 1, stimulus_id: 'passage-a', question: 'প্রশ্ন ১?', options: ['ক', 'খ'] },
        { id: 2, stimulus_id: 'passage-a', question: 'প্রশ্ন ২?', options: ['ক', 'খ'] },
      ],
    }));

    expect(quiz.questions.map((question) => getQuestionStimulus(quiz, question))).toEqual([
      'একটি সাধারণ উদ্দীপক।',
      'একটি সাধারণ উদ্দীপক।',
    ]);
    expect(formatQuizForExport(quiz)).toMatchObject({
      stimulus_groups: [{ id: 'passage-a', text: 'একটি সাধারণ উদ্দীপক।' }],
      questions: [{ stimulus_id: 'passage-a' }, { stimulus_id: 'passage-a' }],
    });
  });

  it('converts repeated inline stimulus text into one shared group', () => {
    const quiz = normalizeQuiz({
      questions: [
        { stimulus: 'একই উদ্দীপক', question: 'প্রশ্ন ১?', options: ['ক', 'খ'] },
        { stimulus: 'একই উদ্দীপক', question: 'প্রশ্ন ২?', options: ['ক', 'খ'] },
      ],
    });

    expect(quiz.stimulusGroups).toHaveLength(1);
    expect(quiz.questions[0].stimulusId).toBe(quiz.questions[1].stimulusId);
    expect(getQuestionStimulus(quiz, quiz.questions[1])).toBe('একই উদ্দীপক');
  });

  it('keeps the existing export shape when the quiz has no stimulus', () => {
    expect(formatQuizForExport(normalizeQuiz({
      quiz_title: 'সাধারণ কুইজ',
      questions: [{ question: 'প্রশ্ন?', options: ['ক', 'খ'] }],
    }))).not.toHaveProperty('stimulus_groups');
  });
});
