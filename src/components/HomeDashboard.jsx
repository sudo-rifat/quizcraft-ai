import React from 'react';
import { useActiveProfile } from '../context/ProfileContext';
import { useProfileStats } from '../hooks/useProfileStats';

export default function HomeDashboard({ onSwitchTab }) {
  const { activeProfile, activeProfileId } = useActiveProfile();
  const { totalQuizzes, averageAccuracy, bestScore, recentQuizzes, latestUnfinished, totalQuestionsSolved } = useProfileStats(activeProfileId);
  
  const userName = activeProfile?.name || 'Student';
  const totalTests = totalQuizzes;


  return (
    <div className="flex-1 flex flex-col w-full max-w-md mx-auto space-y-6 pb-28 pt-2">
      {/* User Greeting Section */}
      <section className="pt-2">
        <div>
          <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
            Good evening, {userName}
          </h1>
          <p className="text-sm text-outline mt-0.5 font-body">
            Ready to continue your study session?
          </p>
        </div>
      </section>

      {/* Hero CTA: Create Quiz Card */}
      <section>
        <div 
          onClick={() => onSwitchTab('create')}
          className="group relative rounded-2xl bg-gradient-to-br from-primary to-[#004f48] p-5 text-on-primary shadow-sm hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[20px]">add</span>
            </div>
            <span className="text-xs font-headline font-medium text-primary-fixed tracking-wide uppercase">
              New Session
            </span>
          </div>

          <h2 className="font-headline text-lg font-semibold text-white tracking-tight">
            Create Quiz
          </h2>
          <p className="text-xs text-white/80 font-body mt-1 leading-relaxed">
            Generate targeted practice questions from notes, topics, or files.
          </p>

          <div className="mt-4 flex items-center gap-1.5 text-xs font-headline font-medium text-primary-fixed group-hover:translate-x-0.5 transition-transform">
            <span>Get started</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </div>
        </div>
      </section>

      {/* Resume Quiz Card (Dynamic based on latest exam) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <span className="font-headline text-xs font-semibold text-on-surface uppercase tracking-wider">
            Resume Quiz
          </span>
          <span className="text-xs text-primary font-medium">In Progress</span>
        </div>

        <div className="rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-headline font-semibold text-on-surface text-base">
                {latestUnfinished ? latestUnfinished.quiz_title : 'Physics: Modern Physics'}
              </h3>
              <p className="text-xs text-outline font-body mt-0.5">
                {latestUnfinished 
                  ? `${latestUnfinished.correctCount + latestUnfinished.incorrectCount} of ${latestUnfinished.quiz_data?.questions?.length || 20} Questions completed`
                  : '12 of 20 Questions completed'
                }
              </p>
            </div>
            <span className="text-sm font-headline font-bold text-primary">
              {latestUnfinished ? `${latestUnfinished.percentage}%` : '60%'}
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden mb-4">
            <div 
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${latestUnfinished ? Math.max(15, latestUnfinished.percentage) : 60}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-end">
            <button 
              onClick={() => onSwitchTab('create')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-headline font-medium transition-transform active:scale-95 shadow-sm cursor-pointer"
            >
              <span>Resume</span>
              <span className="material-symbols-outlined text-[15px]">play_arrow</span>
            </button>
          </div>
        </div>
      </section>

      {/* Weekly Overview Metrics */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <span className="font-headline text-xs font-semibold text-on-surface uppercase tracking-wider">
            Weekly Overview
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-3.5 flex flex-col">
            <span className="text-xs text-outline font-body">Quizzes</span>
            <span className="font-headline text-xl font-bold text-on-surface mt-1">{totalTests}</span>
            <span className="text-[11px] text-tertiary font-medium font-body mt-0.5">+4 this wk</span>
          </div>

          <div className="rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-3.5 flex flex-col">
            <span className="text-xs text-outline font-body">Accuracy</span>
            <span className="font-headline text-xl font-bold text-on-surface mt-1">{averageAccuracy}%</span>
            <span className="text-[11px] text-tertiary font-medium font-body mt-0.5">
              {averageAccuracy > 80 ? 'Top 5%' : 'Standard'}
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

      {/* Recent Activity List */}
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
          <div className="rounded-2xl bg-surface-container-lowest border border-dashed border-surface-container-high p-6 text-center">
            <p className="text-xs font-body text-outline">No recent activity yet. Create a quiz to start tracking!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentQuizzes.map((result) => {
              const dateObj = new Date(result.timestamp);
              const dateFormatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return (
                <div 
                  key={result.id}
                  onClick={() => onSwitchTab('history')}
                  className="group rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-3.5 flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  <div className="min-w-0 pr-3">
                    <h4 className="font-headline font-medium text-sm text-on-surface truncate">
                      {result.quiz_title}
                    </h4>
                    <p className="text-xs text-outline font-body mt-0.5">
                      {result.correctCount}/{result.quiz_data?.questions?.length || 20} correct • {dateFormatted}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-2 py-0.5 rounded-full bg-surface-container text-primary font-headline text-xs font-semibold">
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
