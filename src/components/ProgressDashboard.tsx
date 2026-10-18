import React, { useEffect, useState } from 'react';
import { db } from '../db/db';
import { useActiveProfile } from '../context/ProfileContext';
import { useProfileResults } from '../hooks/useProfileResults';
import { ExamResult } from '../types';
import ResultPortal from './ResultPortal';

interface ProgressDashboardProps {
  showToast: (type: string, message: string) => void;
  onViewResult?: (result: ExamResult) => void;
}

export default function ProgressDashboard({ showToast, onViewResult }: ProgressDashboardProps) {
  const { activeProfileId, activeProfile } = useActiveProfile();
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<ExamResult | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const history = useProfileResults(activeProfileId);
  const totalTests = history.length;
  
  const averageScore = totalTests > 0 
    ? Math.round(history.reduce((acc, curr) => acc + ((curr as any).percentage || 0), 0) / totalTests) 
    : 0;

  const averageAccuracy = totalTests > 0 
    ? Math.round(history.reduce((acc, curr) => acc + (curr.accuracy || 0), 0) / totalTests) 
    : 0;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting) setRecordToDelete(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDeleting]);

  const handleDeleteItem = async () => {
    if (!recordToDelete) return;

    setIsDeleting(true);
    try {
      await db.examResults.delete(recordToDelete.id);
      setRecordToDelete(null);
      showToast('info', 'Record deleted.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearData = () => {
    if (!activeProfileId) return;
    setConfirmText('');
    setShowConfirmClear(true);
  };

  const confirmClearData = async () => {
    if (!activeProfileId || confirmText !== 'Delete History') return;
    await db.examResults.where('profileId').equals(activeProfileId).delete();
    showToast('success', `Exam data for ${activeProfile?.name} has been cleared.`);
    setShowConfirmClear(false);
    setConfirmText('');
  };

  // If a result is selected, show ResultPortal inline within the history tab
  if (selectedResult) {
    return (
      <ResultPortal
        resultRecord={selectedResult}
        backLabel="Back to History"
        onRetake={() => {
          // Pass the selected record upward so App can launch the exam
          if (onViewResult) onViewResult(selectedResult);
        }}
        onGoHome={() => setSelectedResult(null)}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full pb-28 pt-2 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline font-semibold text-xl text-on-surface tracking-tight">
            Quiz History &amp; Archives
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
                      onClick={() => setSelectedResult(rec)}
                      className="flex-1 h-9 rounded-xl bg-surface-container-low border border-surface-container-high text-primary font-headline text-xs font-semibold flex items-center justify-center gap-1 hover:bg-surface-container transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">analytics</span>
                      <span>View Report</span>
                    </button>

                    <button
                      onClick={() => setRecordToDelete(rec)}
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

      <div className="rounded-2xl bg-surface-container-lowest border border-error/30 p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-headline font-semibold text-on-surface">Clear full history</p>
          <button
            onClick={handleClearData}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-error-container text-on-error-container font-headline font-semibold text-xs border border-error/20 hover:bg-error hover:text-on-error transition-all cursor-pointer"
          >
            Clear History
          </button>
        </div>
      </div>

      {recordToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isDeleting) setRecordToDelete(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-record-title"
            aria-describedby="delete-record-description"
            className="w-full max-w-xs rounded-2xl bg-surface-container-lowest border border-error/30 p-5 space-y-4 shadow-2xl"
          >
            <div className="text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-error/20 text-error flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-xl">delete_forever</span>
              </div>
              <h3 id="delete-record-title" className="font-headline font-semibold text-base text-on-surface">
                Delete Record?
              </h3>
              <p id="delete-record-description" className="text-xs font-body text-outline leading-relaxed">
                This will permanently delete <strong>{recordToDelete.quiz_title}</strong> from your quiz history. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                disabled={isDeleting}
                className="flex-1 h-10 rounded-xl bg-surface-container-low text-on-surface font-headline text-xs font-semibold hover:bg-surface-container transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteItem}
                disabled={isDeleting}
                className="flex-1 h-10 rounded-xl bg-error text-on-error font-headline text-xs font-semibold shadow-xs hover:bg-error/90 transition-all cursor-pointer disabled:cursor-wait disabled:opacity-70"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </section>
        </div>
      )}

      {showConfirmClear && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xs rounded-2xl bg-surface-container-lowest border border-error/30 p-5 space-y-4 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-error/20 text-error flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-xl">delete_forever</span>
              </div>
              <h3 className="font-headline font-semibold text-base text-on-surface">Clear History?</h3>
              <p className="text-xs font-body text-outline leading-relaxed">
                This will permanently delete all quiz history for {activeProfile?.name}. This action cannot be undone.
              </p>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="block text-[11px] font-headline font-semibold text-outline text-center">
                Type <strong className="text-error">Delete History</strong> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Delete History"
                className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-error/30 text-xs font-headline font-semibold text-center text-on-surface focus:outline-none focus:border-error"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmClear(false)}
                className="flex-1 h-10 rounded-xl bg-surface-container-low text-on-surface font-headline text-xs font-semibold hover:bg-surface-container transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmClearData}
                disabled={confirmText !== 'Delete History'}
                className={`flex-1 h-10 rounded-xl font-headline text-xs font-semibold shadow-xs transition-all ${
                  confirmText === 'Delete History'
                    ? 'bg-error text-on-error hover:bg-error/90 cursor-pointer'
                    : 'bg-error/50 text-on-error/50 cursor-not-allowed'
                }`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
