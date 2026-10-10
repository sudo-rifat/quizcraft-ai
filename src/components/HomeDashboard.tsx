import React from 'react';
import { useActiveProfile } from '../context/ProfileContext';
import { useProfileStats } from '../hooks/useProfileStats';
import { ExamResult } from '../types';

interface HomeDashboardProps {
  onSwitchTab: (tabId: string) => void;
  onViewResult?: (result: ExamResult) => void;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

export default function HomeDashboard({ onSwitchTab, onViewResult }: HomeDashboardProps) {
  const { activeProfile, activeProfileId } = useActiveProfile();
  const { totalQuizzes, averageAccuracy, bestScore, recentQuizzes } = useProfileStats(activeProfileId);

  const userName = activeProfile?.name || 'Student';
  const totalTests = totalQuizzes;

  return (
    <div className="flex-1 flex flex-col w-full max-w-md mx-auto space-y-6 pb-28 pt-2">
      {/* User Greeting */}
      <section className="pt-2">
        <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
          {getGreeting()}, {userName} 👋
        </h1>
      </section>

      {/* Hero CTA: Create Quiz */}
      <section>
        <div
          onClick={() => onSwitchTab('create')}
          className="group relative rounded-2xl bg-gradient-to-br from-primary to-[#004f48] p-5 text-on-primary shadow-sm hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
              <span className="material-symbols-outlined text-[24px]">add</span>
            </div>
            <h2 className="font-headline text-lg font-bold text-white tracking-tight">
              Create New Quiz
            </h2>
          </div>
        </div>
      </section>

      {/* Overview Stats */}
      <section className="space-y-3">
        <span className="font-headline text-xs font-semibold text-on-surface uppercase tracking-wider px-0.5">
          Overview
        </span>
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-3.5 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-outline font-body">Quizzes</span>
            <span className="font-headline text-xl font-bold text-on-surface mt-0.5">{totalTests}</span>
          </div>
          <div className="rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-3.5 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-outline font-body">Accuracy</span>
            <span className="font-headline text-xl font-bold text-on-surface mt-0.5">{averageAccuracy}%</span>
          </div>
          <div className="rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-3.5 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-outline font-body">Best</span>
            <span className="font-headline text-xl font-bold text-on-surface mt-0.5">
              {bestScore}<span className="text-xs font-normal text-outline">%</span>
            </span>
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
