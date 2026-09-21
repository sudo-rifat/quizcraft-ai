import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useActiveProfile } from '../context/ProfileContext';
import { useProfileStats } from '../hooks/useProfileStats';
import { ExamResult, SavedQuiz, Quiz } from '../types';
import { db } from '../db/db';

interface HomeDashboardProps {
  onSwitchTab: (tabId: string) => void;
  onViewResult?: (result: ExamResult) => void;
  onStartExam?: (data: { quiz: Quiz; config: any }) => void;
  onRequestStartExam?: (quiz: Quiz) => void;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

export default function HomeDashboard({ onSwitchTab, onViewResult, onStartExam, onRequestStartExam }: HomeDashboardProps) {
  const { activeProfile, activeProfileId } = useActiveProfile();
  const { totalQuizzes, averageAccuracy, bestScore, recentQuizzes } = useProfileStats(activeProfileId);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const userName = activeProfile?.name || 'Student';
  const totalTests = totalQuizzes;

  // Live query: saved quizzes for this profile
  const savedQuizzes = useLiveQuery(async () => {
    if (!activeProfileId) return [];
    const list = await db.quizzes
      .where('profileId')
      .equals(activeProfileId)
      .toArray();
    // Sort newest first
    return list.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  }, [activeProfileId]) as SavedQuiz[] | undefined;

  // Most recent completed result
  const lastResult: ExamResult | null = recentQuizzes.length > 0 ? recentQuizzes[0] : null;

  const handleDeleteSavedQuiz = async (id: number) => {
    setDeletingId(id);
    try {
      await db.quizzes.delete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleStartSaved = (sq: SavedQuiz) => {
    if (onRequestStartExam) {
      onRequestStartExam(sq.quiz_data);
    } else if (onStartExam) {
      onStartExam({
        quiz: sq.quiz_data,
        config: { durationMinutes: 10, marksPerQuestion: 1, negativeMarking: 0 },
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-md mx-auto space-y-6 pb-28 pt-2">
      {/* User Greeting */}
      <section className="pt-2">
        <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
          {getGreeting()}, {userName} 👋
        </h1>
        <p className="text-xs text-outline mt-0.5 font-body">
          {totalTests > 0 ? `${totalTests} quiz${totalTests > 1 ? 'zes' : ''} completed` : 'Start your practice session'}
        </p>
      </section>

      {/* Hero CTA: Create Quiz */}
      <section>
        <div
          onClick={() => onSwitchTab('create')}
          className="group relative rounded-2xl bg-gradient-to-br from-primary to-[#004f48] p-5 text-on-primary shadow-sm hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[20px]">add</span>
            </div>
            <span className="text-[11px] font-headline font-semibold text-primary-fixed tracking-wide uppercase">
              New Session
            </span>
          </div>
          <h2 className="font-headline text-lg font-bold text-white tracking-tight">
            Create New Quiz
          </h2>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-headline font-semibold text-primary-fixed group-hover:translate-x-0.5 transition-transform">
            <span>Get started</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </div>
        </div>
      </section>

      {/* My Quizzes (Saved Library) */}
      {savedQuizzes !== undefined && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <span className="font-headline text-xs font-semibold text-on-surface uppercase tracking-wider">
                My Quizzes
              </span>
              {savedQuizzes.length > 0 && (
                <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {savedQuizzes.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onSwitchTab('library')}
                className="text-xs text-primary font-headline font-medium flex items-center gap-0.5 hover:underline cursor-pointer"
              >
                View Library
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              </button>
            </div>
          </div>

          {savedQuizzes.length === 0 ? (
            <div
              onClick={() => onSwitchTab('create')}
              className="rounded-2xl border-2 border-dashed border-surface-container-high p-5 flex flex-col items-center text-center gap-2 cursor-pointer hover:border-primary/40 hover:bg-surface-container-lowest transition-all"
            >
              <span className="material-symbols-outlined text-3xl text-outline/50">library_books</span>
              <p className="text-xs font-body text-outline">
                No saved quizzes yet.<br />Create a quiz and tap <strong>Save Quiz</strong> to add it here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {savedQuizzes.map((sq) => (
                <div
                  key={sq.id}
                  className="group rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-headline font-semibold text-sm text-on-surface truncate">
                        {sq.quiz_title}
                      </h3>
                      <p className="text-xs text-outline font-body mt-0.5">
                        {sq.questionCount} questions
                        {' • '}
                        Saved {new Date(sq.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <button
                      onClick={() => sq.id !== undefined && handleDeleteSavedQuiz(sq.id)}
                      disabled={deletingId === sq.id}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-outline/60 hover:text-error hover:bg-error/10 transition-all shrink-0 cursor-pointer"
                      title="Delete quiz"
                    >
                      <span className="material-symbols-outlined text-[17px]">
                        {deletingId === sq.id ? 'hourglass_empty' : 'delete_outline'}
                      </span>
                    </button>
                  </div>

                  {/* Question count chips */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/8 text-primary text-[11px] font-headline font-medium">
                      <span className="material-symbols-outlined text-[12px]">quiz</span>
                      {sq.questionCount} MCQ
                    </span>
                  </div>

                  <button
                    onClick={() => handleStartSaved(sq)}
                    className="w-full h-9 rounded-xl bg-primary text-on-primary font-headline text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                    Start Exam
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Last Quiz Result card */}
      {lastResult && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <span className="font-headline text-xs font-semibold text-on-surface uppercase tracking-wider">
              Last Quiz
            </span>
            <span className={`text-xs font-headline font-semibold px-2 py-0.5 rounded-full ${
              lastResult.percentage >= 70
                ? 'bg-tertiary/10 text-tertiary'
                : lastResult.percentage >= 50
                ? 'bg-primary/10 text-primary'
                : 'bg-error/10 text-error'
            }`}>
              {lastResult.percentage >= 70 ? '🔥 Great' : lastResult.percentage >= 50 ? '✓ Passed' : '✗ Review needed'}
            </span>
          </div>

          <div
            onClick={() => onViewResult?.(lastResult)}
            className="group rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] cursor-pointer hover:bg-surface-container-low transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0 pr-3">
                <h3 className="font-headline font-semibold text-on-surface text-sm truncate">
                  {lastResult.quiz_title}
                </h3>
                <p className="text-xs text-outline font-body mt-0.5">
                  {lastResult.correctCount} of {lastResult.quiz_data?.questions?.length || '?'} correct
                  {' • '}
                  {new Date(lastResult.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className={`text-xl font-headline font-bold ${
                  lastResult.percentage >= 70 ? 'text-tertiary' : lastResult.percentage >= 50 ? 'text-primary' : 'text-error'
                }`}>
                  {lastResult.percentage}%
                </span>
                <span className="text-[11px] text-outline font-body">score</span>
              </div>
            </div>

            <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  lastResult.percentage >= 70 ? 'bg-tertiary' : lastResult.percentage >= 50 ? 'bg-primary' : 'bg-error'
                }`}
                style={{ width: `${lastResult.percentage}%` }}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-headline">
                <span className="material-symbols-outlined text-[13px] text-tertiary">check_circle</span>
                {lastResult.correctCount} correct
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-headline">
                <span className="material-symbols-outlined text-[13px] text-error">cancel</span>
                {lastResult.incorrectCount} wrong
              </span>
              <span className="ml-auto text-xs text-primary font-headline font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                View Results
                <span className="material-symbols-outlined text-[15px]">chevron_right</span>
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Overview Stats */}
      <section className="space-y-3">
        <span className="font-headline text-xs font-semibold text-on-surface uppercase tracking-wider px-0.5">
          Overview
        </span>
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-3.5 flex flex-col">
            <span className="text-xs text-outline font-body">Quizzes</span>
            <span className="font-headline text-xl font-bold text-on-surface mt-1">{totalTests}</span>
            <span className="text-[11px] text-tertiary font-medium font-body mt-0.5">Total taken</span>
          </div>
          <div className="rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-3.5 flex flex-col">
            <span className="text-xs text-outline font-body">Accuracy</span>
            <span className="font-headline text-xl font-bold text-on-surface mt-1">{averageAccuracy}%</span>
            <span className="text-[11px] text-tertiary font-medium font-body mt-0.5">
              {averageAccuracy > 80 ? 'Top 5%' : averageAccuracy > 60 ? 'Good' : 'Keep going'}
            </span>
          </div>
          <div className="rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-3.5 flex flex-col">
            <span className="text-xs text-outline font-body">Best</span>
            <span className="font-headline text-xl font-bold text-on-surface mt-1">
              {bestScore}<span className="text-xs font-normal text-outline">%</span>
            </span>
            <span className="text-[11px] text-secondary font-medium font-body mt-0.5">Personal best</span>
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <span className="font-headline text-xs font-semibold text-on-surface uppercase tracking-wider">
            Recent Activity
          </span>
          {totalTests > 0 && (
            <button
              onClick={() => onSwitchTab('history')}
              className="text-xs font-headline font-medium text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              See All
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </button>
          )}
        </div>

        {recentQuizzes.length === 0 ? (
          <div className="rounded-2xl bg-surface-container-lowest border border-dashed border-surface-container-high p-6 text-center space-y-2">
            <span className="material-symbols-outlined text-3xl text-outline/60">quiz</span>
            <p className="text-xs font-body text-outline">No recent activity yet. Create a quiz to start tracking!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentQuizzes.map((result) => {
              const dateFormatted = new Date(result.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return (
                <div
                  key={result.id}
                  onClick={() => onViewResult?.(result)}
                  className="group rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-3.5 flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  <div className="min-w-0 pr-3">
                    <h4 className="font-headline font-medium text-sm text-on-surface truncate">
                      {result.quiz_title}
                    </h4>
                    <p className="text-xs text-outline font-body mt-0.5">
                      {result.correctCount}/{result.quiz_data?.questions?.length || '?'} correct • {dateFormatted}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full font-headline text-xs font-semibold ${
                      result.percentage >= 70 ? 'bg-tertiary/10 text-tertiary' : result.percentage >= 50 ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error'
                    }`}>
                      {result.percentage}%
                    </span>
                    <span className="material-symbols-outlined text-outline/60 text-[18px] group-hover:translate-x-0.5 transition-transform">
                      chevron_right
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
