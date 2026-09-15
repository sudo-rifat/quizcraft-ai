import { useMemo } from 'react';
import { useProfileResults } from './useProfileResults';
import { ExamResult } from '../types';

export function useProfileStats(profileId: string | null | undefined) {
  const results = useProfileResults(profileId);

  const stats = useMemo(() => {
    const totalQuizzes = results.length;
    
    if (totalQuizzes === 0) {
      return {
        totalQuizzes: 0,
        averageAccuracy: 0,
        averageScore: 0,
        bestScore: 0,
        totalQuestionsSolved: 0,
        recentQuizzes: [] as ExamResult[],
        latestUnfinished: null as ExamResult | null
      };
    }

    const totalAccuracySum = results.reduce((acc, curr) => acc + (curr.accuracy || curr.percentage || 0), 0);
    const averageAccuracy = Math.round(totalAccuracySum / totalQuizzes);

    const totalScoreSum = results.reduce((acc, curr) => acc + (curr.score || 0), 0);
    const averageScore = Math.round(totalScoreSum / totalQuizzes);

    const bestScore = Math.max(...results.map(r => r.percentage || 0));

    const totalQuestionsSolved = results.reduce((acc, curr) => {
      const attempted = (curr.correctCount || 0) + (curr.incorrectCount || 0);
      return acc + attempted;
    }, 0);

    const recentQuizzes = results.slice(0, 3);
    const latestUnfinished = results.find(r => r.unattemptedCount && r.unattemptedCount > 0) || null;

    return {
      totalQuizzes,
      averageAccuracy,
      averageScore,
      bestScore,
      totalQuestionsSolved,
      recentQuizzes,
      latestUnfinished
    };
  }, [results]);

  return { results, ...stats };
}
