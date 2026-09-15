import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, defaultSettings } from './db/db';

import { ProfileProvider, useActiveProfile } from './context/ProfileContext';
import ProfileSelectionScreen from './components/ProfileSelectionScreen';
import ProfileSwitcherBottomSheet from './components/ProfileSwitcherBottomSheet';
import ProfileManagementModal from './components/ProfileManagementModal';

import Navigation from './components/Navigation';
import HomeDashboard from './components/HomeDashboard';
import QuizWizard from './components/QuizWizard';
import ExamPortal from './components/ExamPortal';
import ResultPortal from './components/ResultPortal';
import ProgressDashboard from './components/ProgressDashboard';
import Settings from './components/Settings';

import { Quiz, ExamResult } from './types';

interface Toast {
  id: number;
  type: string;
  message: string;
}

function AppContent() {
  const [currentTab, setCurrentTab] = useState('home');
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [examConfig, setExamConfig] = useState<any>(null);
  const [activeResultRecord, setActiveResultRecord] = useState<ExamResult | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Active Exam Switch Profile Prompt State
  const [pendingSwitchAction, setPendingSwitchAction] = useState<(() => void) | null>(null);

  const {
    activeProfileId,
    isLoading: isProfileLoading,
    isProfileSelectorOpen,
    isSwitcherOpen,
    setIsSwitcherOpen,
    isManagementOpen,
    setIsManagementOpen
  } = useActiveProfile();

  useEffect(() => {
    const handleOnlineStatus = () => {
      setIsOffline(false);
      showToast('success', 'ইন্টারনেট ফিরে এসেছে. এখন আবার অনলাইন ডেটা sync করতে পারছেন।');
    };

    const handleOfflineStatus = () => {
      setIsOffline(true);
      showToast('warning', 'অফলাইন মোডে আছেন। অ্যাপটি লোকাল ডেটা দিয়ে কাজ করছে।');
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOfflineStatus);
    };
  }, []);

  // Theme Management
  const prefs = useLiveQuery(() => db.settings.get('user_prefs'), []) || defaultSettings;
  useEffect(() => {
    if (!prefs) return;
    const root = document.documentElement;
    if (prefs.theme === 'dark') {
      root.classList.add('dark');
    } else if (prefs.theme === 'light') {
      root.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [prefs?.theme]);

  const showToast = (type: string, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleStartExam = ({ quiz, config }: { quiz: Quiz; config: any }) => {
    setActiveQuiz(quiz);
    setExamConfig(config);
    setCurrentTab('exam');
  };

  const handleSubmitExam = async ({ userAnswers, timeSpentSecs }: { userAnswers: Record<string, number>; timeSpentSecs: number }) => {
    if (!activeQuiz || !activeProfileId) return;

    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;

    activeQuiz.questions.forEach((q, idx) => {
      const qId = q.id || (idx + 1);
      const choice = userAnswers[qId];

      if (choice === undefined) {
        unattemptedCount++;
      } else if (choice === q.correct_answer) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    });

    const marksPerQ = examConfig.marksPerQuestion;
    const negMark = examConfig.negativeMarking;

    const rawScore = (correctCount * marksPerQ) - (incorrectCount * negMark);
    const score = Math.max(0, parseFloat(rawScore.toFixed(2)));
    const maxScore = activeQuiz.questions.length * marksPerQ;
    
    const percentage = Math.round((score / maxScore) * 100);
    const attempted = correctCount + incorrectCount;
    const accuracy = attempted > 0 ? Math.round((correctCount / attempted) * 100) : 0;

    const minsSpent = Math.floor(timeSpentSecs / 60);
    const secsSpent = timeSpentSecs % 60;
    const timeSpentFormatted = `${minsSpent.toString().padStart(2, '0')}:${secsSpent.toString().padStart(2, '0')}`;

    const record: ExamResult = {
      id: 'quiz_rec_' + Date.now(),
      profileId: activeProfileId, // CRITICAL: Explicit profile ID isolation
      timestamp: new Date().toISOString(),
      quiz_title: activeQuiz.quiz_title,
      quiz_data: activeQuiz as any,
      exam_config: examConfig,
      user_answers: userAnswers,
      score,
      maxScore,
      percentage,
      accuracy,
      correctCount,
      incorrectCount,
      unattemptedCount,
      timeSpentFormatted
    };

    // Save to IndexedDB
    await db.examResults.put(record);

    setActiveResultRecord(record);
    setCurrentTab('result');
  };

  const handleRequestSwitchProfile = (switchAction: () => void) => {
    if (currentTab === 'exam') {
      setPendingSwitchAction(() => switchAction);
    } else {
      switchAction();
    }
  };

  const confirmSwitchDuringExam = () => {
    if (pendingSwitchAction) {
      pendingSwitchAction();
      setPendingSwitchAction(null);
      setActiveQuiz(null);
      setExamConfig(null);
      setCurrentTab('home');
    }
  };

  if (isProfileLoading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-headline font-semibold text-outline">Loading QuizCraft AI...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body selection:bg-primary/10 flex flex-col antialiased">
      <Navigation currentTab={currentTab} onSwitchTab={setCurrentTab} />

      {/* Main Content Area */}
      <main className="flex-1 w-full pt-20 pb-24 px-4 max-w-md md:max-w-3xl mx-auto relative">
        {isOffline && (
          <div className="sticky top-16 z-40 border-b border-secondary/30 bg-secondary-container/90 px-4 py-2 text-center text-xs font-headline font-semibold text-on-secondary-container backdrop-blur-sm rounded-xl mb-4">
            Offline Mode: Operating with local IndexedDB storage.
          </div>
        )}
        
        {/* Toast Notifications */}
        <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-xs sm:max-w-sm pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-2.5 p-3.5 rounded-xl shadow-md border text-xs font-headline font-semibold transition-all duration-300 ${
                t.type === 'success' ? 'bg-tertiary-container text-on-tertiary-container border-tertiary/30'
                  : t.type === 'error' ? 'bg-error-container text-on-error-container border-error/30'
                  : t.type === 'warning' ? 'bg-secondary-container text-on-secondary-container border-secondary/30'
                  : 'bg-primary-container text-on-primary-container border-primary/30'
              }`}
            >
              <span className="leading-relaxed">{t.message}</span>
            </div>
          ))}
        </div>

        <div className="w-full">
          {currentTab === 'home' && (
            <HomeDashboard
              onSwitchTab={setCurrentTab}
              onViewResult={(rec) => {
                setActiveResultRecord(rec);
                setCurrentTab('result');
              }}
              onStartExam={handleStartExam}
            />
          )}

          {currentTab === 'create' && (
            <QuizWizard onStartExam={handleStartExam} showToast={showToast} />
          )}

          {currentTab === 'exam' && activeQuiz && (
            <ExamPortal
              quizData={activeQuiz}
              examConfig={examConfig}
              onSubmitExam={handleSubmitExam}
              showToast={showToast}
            />
          )}

          {currentTab === 'result' && activeResultRecord && (
            <ResultPortal
              resultRecord={activeResultRecord}
              onRetake={() => {
                setActiveQuiz(activeResultRecord.quiz_data as any);
                setExamConfig(activeResultRecord.exam_config);
                setCurrentTab('exam');
              }}
              onGoHome={() => setCurrentTab('home')}
            />
          )}

          {currentTab === 'progress' && (
            <ProgressDashboard showToast={showToast} onViewResult={(rec) => {
              setActiveResultRecord(rec);
              setCurrentTab('result');
            }} />
          )}

          {currentTab === 'history' && (
            <ProgressDashboard showToast={showToast} onViewResult={(rec) => {
              setActiveResultRecord(rec);
              setCurrentTab('result');
            }} />
          )}

          {currentTab === 'settings' && (
            <Settings showToast={showToast} />
          )}
        </div>
      </main>

      {/* Profile Selection First Launch Screen */}
      {isProfileSelectorOpen && (
        <ProfileSelectionScreen showToast={showToast} />
      )}

      {/* Profile Switcher Bottom Sheet */}
      <ProfileSwitcherBottomSheet
        isOpen={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
        onOpenManagement={() => setIsManagementOpen(true)}
        showToast={showToast}
        currentTab={currentTab}
        onRequestSwitchProfile={handleRequestSwitchProfile}
      />

      {/* Profile Management Modal */}
      <ProfileManagementModal
        isOpen={isManagementOpen}
        onClose={() => setIsManagementOpen(false)}
        showToast={showToast}
      />

      {/* Confirmation Modal when switching profiles during an active exam */}
      {pendingSwitchAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xs rounded-2xl bg-surface-container-lowest border border-amber-500/30 p-5 space-y-4 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-xl">warning</span>
              </div>
              <h3 className="font-headline font-semibold text-base text-on-surface">You're currently taking a quiz</h3>
              <p className="text-xs font-body text-outline leading-relaxed">
                Switching profiles will leave this active quiz session unfinished. Are you sure you want to proceed?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingSwitchAction(null)}
                className="flex-1 h-10 rounded-xl bg-surface-container-low text-on-surface font-headline text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSwitchDuringExam}
                className="flex-1 h-10 rounded-xl bg-error text-on-error font-headline text-xs font-semibold shadow-xs hover:bg-error/90"
              >
                Switch Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ProfileProvider>
      <AppContent />
    </ProfileProvider>
  );
}
