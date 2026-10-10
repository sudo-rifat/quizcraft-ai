import React from 'react';
import { db } from '../db/db';
import { useActiveProfile } from '../context/ProfileContext';
import { useProfileResults } from '../hooks/useProfileResults';
import { ExamResult } from '../types';

interface ProgressDashboardProps {
  showToast: (type: string, message: string) => void;
  onViewResult: (result: ExamResult) => void;
}

export default function ProgressDashboard({ showToast, onViewResult }: ProgressDashboardProps) {
  const { activeProfileId, activeProfile } = useActiveProfile();

  const history = useProfileResults(activeProfileId);
  const totalTests = history.length;
  
  const averageScore = totalTests > 0 
    ? Math.round(history.reduce((acc, curr) => acc + ((curr as any).percentage || 0), 0) / totalTests) 
    : 0;

  const averageAccuracy = totalTests > 0 
    ? Math.round(history.reduce((acc, curr) => acc + (curr.accuracy || 0), 0) / totalTests) 
    : 0;

  const handleDeleteItem = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      await db.examResults.delete(id);
      showToast('info', 'Record deleted.');
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full pb-28 pt-2 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline font-semibold text-xl text-on-surface tracking-tight">
            Quiz History & Archives
          </h1>
        </div>
      </div>

      {/* Analytics Summary */}
      {totalTests > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-4 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-body text-outline">Avg. Score</span>
            <span className="font-headline text-2xl font-bold text-primary mt-0.5">{averageScore}%</span>
          </div>

          <div className="rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-4 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-body text-outline">Accuracy</span>
            <span className="font-headline text-2xl font-bold text-on-surface mt-0.5">{averageAccuracy}%</span>
          </div>
        </div>
      )}

      {/* History Items List */}
      <div className="space-y-3">
        {totalTests === 0 ? (
          <div className="rounded-2xl bg-surface-container-lowest border border-dashed border-surface-container-high p-8 text-center space-y-2">
            <span className="material-symbols-outlined text-3xl text-outline">history</span>
            <p className="text-xs font-headline font-semibold text-on-surface">No quiz history found yet.</p>
            <p className="text-xs font-body text-outline">Take a quiz to automatically build your learning record!</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {history.map((rec) => {
              const dateObj = new Date(rec.timestamp);
              const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

              return (
                <div 
                  key={rec.id}
                  className="rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-4 shadow-xs flex flex-col space-y-3 hover:bg-surface-container-low/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-headline font-semibold text-sm text-on-surface leading-snug">
                        {rec.quiz_title}
                      </h3>
                      <p className="text-xs font-body text-outline mt-0.5">
                        {dateStr} • {(rec as any).quiz_data?.questions?.length || 20} Questions
                      </p>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-surface-container text-primary font-headline text-xs font-bold shrink-0">
                      {(rec as any).percentage}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-body text-on-surface-variant pt-1">
                    <span>Score: {rec.score} / {(rec as any).maxScore}</span>
                    <span>Accuracy: {rec.accuracy}%</span>
                    <span>Time: {(rec as any).timeSpentFormatted}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-surface-container">
                    <button
                      onClick={() => onViewResult(rec)}
                      className="flex-1 h-9 rounded-xl bg-surface-container-low border border-surface-container-high text-primary font-headline text-xs font-semibold flex items-center justify-center gap-1 hover:bg-surface-container transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">analytics</span>
                      <span>View Report</span>
                    </button>

                    <button
                      onClick={() => handleDeleteItem(rec.id)}
                      className="w-9 h-9 rounded-xl bg-error-container/30 border border-error/20 text-error flex items-center justify-center hover:bg-error-container transition-all cursor-pointer"
                      title="Delete Record"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
