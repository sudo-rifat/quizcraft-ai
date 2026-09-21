import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Quiz } from '../types';

interface ExamPortalProps {
  quizData: Quiz;
  examConfig: any;
  onSubmitExam: (data: { userAnswers: Record<string, number>; timeSpentSecs: number }) => void;
  showToast: (type: string, message: string) => void;
}

export default function ExamPortal({ quizData, examConfig, onSubmitExam, showToast }: ExamPortalProps) {
  const [answers, setAnswers] = useState<Record<string, number>>(() => {
    const saved = sessionStorage.getItem(`quiz_answers_${quizData.quiz_title}`);
    return saved ? JSON.parse(saved) : {};
  });
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPalette, setShowPalette] = useState(false);

  // Unlimited timer check (durationMinutes === 0)
  const isUnlimitedTimer = examConfig.durationMinutes === 0;
  const initialTimerSeconds = isUnlimitedTimer ? 0 : examConfig.durationMinutes * 60;
  const [timerSeconds, setTimerSeconds] = useState(() => {
    if (isUnlimitedTimer) return 0;
    const saved = sessionStorage.getItem(`quiz_timer_${quizData.quiz_title}`);
    return saved ? parseInt(saved, 10) : initialTimerSeconds;
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  // Screen Wake Lock API (Keep Screen Awake during Exam)
  useEffect(() => {
    let wakeLockObj: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockObj = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Screen Wake Lock request failed:', err);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockObj) {
        wakeLockObj.release().catch(() => {});
      }
    };
  }, []);

  // Prevent accidental back/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Timer logic
  useEffect(() => {
    if (isUnlimitedTimer) return; // Do not count down if unlimited

    timerRef.current = setInterval(() => {
      setTimerSeconds((prev) => {
        const next = prev - 1;
        sessionStorage.setItem(`quiz_timer_${quizData.quiz_title}`, next.toString());
        if (next <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          showToast('warning', 'Time is up! Submitting exam automatically...');
          handleSubmit();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isUnlimitedTimer]);

  // Auto-save answers
  useEffect(() => {
    sessionStorage.setItem(`quiz_answers_${quizData.quiz_title}`, JSON.stringify(answers));
  }, [answers, quizData.quiz_title]);

  const totalQuestions = quizData.questions.length;

  const navigateQuestion = (nextIndex: number, direction: 'left' | 'right') => {
    if (nextIndex < 0 || nextIndex >= totalQuestions) return;
    setSlideDirection(direction);
    setCurrentQuestionIndex(nextIndex);
    setTimeout(() => setSlideDirection(null), 300);
  };

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (showConfirmModal) return;
    
    if (e.key === 'ArrowRight' && currentQuestionIndex < totalQuestions - 1) {
      navigateQuestion(currentQuestionIndex + 1, 'left');
    } else if (e.key === 'ArrowLeft' && currentQuestionIndex > 0) {
      navigateQuestion(currentQuestionIndex - 1, 'right');
    } else if (['a', 'b', 'c', 'd', '1', '2', '3', '4'].includes(e.key.toLowerCase())) {
      const qId = quizData.questions[currentQuestionIndex].id || (currentQuestionIndex + 1);
      let optIdx = -1;
      if (['a', '1'].includes(e.key.toLowerCase())) optIdx = 0;
      if (['b', '2'].includes(e.key.toLowerCase())) optIdx = 1;
      if (['c', '3'].includes(e.key.toLowerCase())) optIdx = 2;
      if (['d', '4'].includes(e.key.toLowerCase())) optIdx = 3;
      
      const maxOptions = quizData.questions[currentQuestionIndex].options.length;
      if (optIdx !== -1 && optIdx < maxOptions) {
        setAnswers(prev => ({ ...prev, [qId]: optIdx }));
      }
    }
  }, [currentQuestionIndex, totalQuestions, showConfirmModal, quizData]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current === null || touchEndXRef.current === null) return;
    const diffX = touchStartXRef.current - touchEndXRef.current;
    const minSwipeDistance = 50;

    if (diffX > minSwipeDistance && currentQuestionIndex < totalQuestions - 1) {
      // Swipe left -> Next Question
      navigateQuestion(currentQuestionIndex + 1, 'left');
    } else if (diffX < -minSwipeDistance && currentQuestionIndex > 0) {
      // Swipe right -> Previous Question
      navigateQuestion(currentQuestionIndex - 1, 'right');
    }

    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  const mins = Math.floor(Math.max(0, timerSeconds) / 60);
  const secs = Math.max(0, timerSeconds) % 60;
  const formattedTimer = isUnlimitedTimer
    ? 'No Limit'
    : `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const answeredCount = Object.keys(answers).length;
  const flaggedCount = Object.keys(flagged).filter(k => flagged[k]).length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  const handleSubmit = () => {
    setShowConfirmModal(false);
    if (timerRef.current) clearInterval(timerRef.current);
    
    sessionStorage.removeItem(`quiz_answers_${quizData.quiz_title}`);
    sessionStorage.removeItem(`quiz_timer_${quizData.quiz_title}`);

    const timeSpentSecs = isUnlimitedTimer ? 0 : (initialTimerSeconds - timerSeconds);
    onSubmitExam({ userAnswers: answers, timeSpentSecs });
  };

  const currentQ = quizData.questions[currentQuestionIndex];
  const qId = currentQ.id || (currentQuestionIndex + 1);
  const selectedOpt = answers[qId];
  const isFlagged = !!flagged[qId];

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full pt-16 pb-36 px-4 select-none">
      {/* Top App Bar Header for Exam */}
      <header className="fixed top-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md border-b border-surface-container-high/60 pt-safe">
        <div className="h-14 px-4 flex items-center justify-between max-w-lg mx-auto w-full">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <button 
              onClick={() => setShowConfirmModal(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back_ios_new</span>
            </button>
            <div className="min-w-0">
              <h1 className="font-headline font-semibold text-[15px] tracking-tight text-on-surface leading-tight truncate">
                {quizData.quiz_title}
              </h1>
              <p className="text-[11px] font-medium text-outline truncate">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </p>
            </div>
          </div>

          {/* Clean timer badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-on-surface border border-outline-variant/30 shrink-0 ${!isUnlimitedTimer && timerSeconds <= 60 ? 'timer-warning' : ''}`}>
            <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
            <span className="font-headline font-semibold text-[13px] tracking-tight">{formattedTimer}</span>
          </div>
        </div>

        {/* Sleek thin progress bar */}
        <div className="w-full bg-surface-container-high h-1 overflow-hidden">
          <div className="bg-primary h-full transition-all duration-300 ease-out" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </header>

      {/* Touch Swipeable Container with Slide Animations */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`transition-all duration-300 transform ${
          slideDirection === 'left'
            ? 'animate-slide-left'
            : slideDirection === 'right'
            ? 'animate-slide-right'
            : ''
        }`}
      >
        {/* Main Question Card (Removed "Single Choice" text) */}
        <section className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-[0_2px_12px_rgba(11,28,48,0.04)] mb-4 mt-2">
          <div className="flex items-center justify-between mb-3">
            <span className="font-headline font-bold text-xs uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-md">
              Question {String(currentQuestionIndex + 1).padStart(2, '0')} / {totalQuestions}
            </span>
            <span className="text-xs font-semibold text-outline tracking-tight">
              +{examConfig.marksPerQuestion} Mark{examConfig.marksPerQuestion > 1 ? 's' : ''}
            </span>
          </div>
          <h2 className="font-headline font-semibold text-[17px] leading-snug text-on-surface mb-2">
            {currentQ.question}
          </h2>
        </section>

        {/* Options Group */}
        <section className="flex flex-col gap-2.5">
          {currentQ.options.map((optText, optIdx) => {
            const isSelected = selectedOpt === optIdx;
            const label = String.fromCharCode(65 + optIdx); // A, B, C, D

            return (
              <div
                key={optIdx}
                onClick={() => setAnswers(prev => ({ ...prev, [qId]: optIdx }))}
                className={`group flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all active:scale-[0.99] ${
                  isSelected
                    ? 'selected-option bg-primary/5 border-2 border-primary shadow-[0_2px_10px_rgba(0,104,95,0.08)]'
                    : 'bg-surface-container-lowest border border-outline-variant/40 shadow-xs hover:border-outline hover:bg-surface-container-low/40'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-2">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-headline font-semibold text-xs shrink-0 transition-colors ${
                    isSelected ? 'bg-primary text-on-primary font-bold shadow-xs' : 'bg-surface-container text-on-surface-variant'
                  }`}>
                    {label}
                  </span>
                  <span className={`font-body text-[15px] leading-tight ${isSelected ? 'font-semibold text-on-surface' : 'font-medium text-on-surface'}`}>
                    {optText}
                  </span>
                </div>

                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all shrink-0 ${
                  isSelected ? 'bg-primary border-0 text-on-primary' : 'border-2 border-outline-variant/60 text-transparent'
                }`}>
                  <span className={`material-symbols-outlined text-[13px] ${isSelected ? 'opacity-100' : 'opacity-0'}`}>check</span>
                </div>
              </div>
            );
          })}
        </section>
      </div>

      {/* Bottom Fixed Navigation Footer */}
      <footer className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md border-t border-surface-container-high/70 pb-safe pt-2.5 px-4 shadow-[0_-4px_16px_rgba(0,0,0,0.03)]">
        <div className="max-w-lg mx-auto w-full flex flex-col gap-2.5">
          {/* Status Counter & Question Grid Drawer Toggle */}
          <div className="flex items-center justify-between px-1 text-[12px] text-on-surface-variant">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary"></span>
              <span>{answeredCount} answered</span>
              <span className="text-outline/60">•</span>
              <span className="text-outline">{totalQuestions - answeredCount} remaining</span>
            </div>
            <button 
              onClick={() => setShowPalette(!showPalette)}
              className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:text-primary-container transition-colors cursor-pointer"
            >
              <span>Question Grid</span>
              <span className={`material-symbols-outlined text-[16px] transition-transform ${showPalette ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>
          </div>

          {/* Question Grid Palette Drawer */}
          {showPalette && (
            <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-lg grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
              {quizData.questions.map((q, idx) => {
                const itemQId = q.id || (idx + 1);
                const isAns = answers[itemQId] !== undefined;
                const isFlg = !!flagged[itemQId];
                const isCurr = idx === currentQuestionIndex;

                let btnStyle = 'h-8 rounded-lg text-xs font-headline font-semibold transition-all ';
                if (isCurr) btnStyle += 'ring-2 ring-primary font-bold ';
                if (isAns) btnStyle += 'bg-primary text-on-primary ';
                else if (isFlg) btnStyle += 'bg-secondary-container text-on-secondary-container ';
                else btnStyle += 'bg-surface-container text-on-surface hover:bg-surface-container-high ';

                return (
                  <button 
                    key={idx} 
                    onClick={() => { navigateQuestion(idx, idx > currentQuestionIndex ? 'left' : 'right'); setShowPalette(false); }}
                    className={btnStyle}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          )}

          {/* Actions Bar */}
          <div className="flex items-center gap-2.5 pb-1">
            <button 
              disabled={currentQuestionIndex === 0}
              onClick={() => navigateQuestion(currentQuestionIndex - 1, 'right')}
              className="h-11 w-11 shrink-0 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-on-surface flex items-center justify-center active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container transition-all cursor-pointer"
              title="Previous Question"
            >
              <span className="material-symbols-outlined text-[19px]">arrow_back</span>
            </button>

            <button 
              onClick={() => setFlagged(prev => ({ ...prev, [qId]: !prev[qId] }))}
              className={`h-11 px-3.5 flex-1 rounded-xl font-headline font-semibold text-[13px] flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer ${
                isFlagged 
                  ? 'bg-secondary-container text-on-secondary-container border border-transparent' 
                  : 'bg-surface-container-lowest border border-outline-variant/40 text-secondary hover:bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isFlagged ? 'bookmark' : 'bookmark_border'}
              </span>
              <span>{isFlagged ? 'Flagged' : 'Review Later'}</span>
            </button>

            {currentQuestionIndex < totalQuestions - 1 ? (
              <button 
                onClick={() => navigateQuestion(currentQuestionIndex + 1, 'left')}
                className="h-11 px-4 flex-[1.4] rounded-xl bg-primary text-on-primary font-headline font-semibold text-[14px] flex items-center justify-center gap-1.5 shadow-xs active:scale-95 hover:bg-primary-container transition-all cursor-pointer"
              >
                <span>Next Question</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            ) : (
              <button 
                onClick={() => setShowConfirmModal(true)}
                className="h-11 px-4 flex-[1.4] rounded-xl bg-secondary-container text-on-secondary-container font-headline font-semibold text-[14px] flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <span>Submit Exam</span>
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-sm w-full shadow-xl border border-surface-container-high space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-2xl">help_outline</span>
            </div>

            <div>
              <h3 className="font-headline font-bold text-lg text-on-surface">Submit Exam?</h3>
              <p className="text-xs text-on-surface-variant font-body mt-1">
                You have answered <strong className="text-primary">{answeredCount}</strong> out of <strong>{totalQuestions}</strong> questions.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="h-10 rounded-xl border border-outline-variant text-on-surface font-headline font-medium text-xs hover:bg-surface-container transition-all cursor-pointer"
              >
                Continue Quiz
              </button>

              <button 
                onClick={handleSubmit}
                className="h-10 rounded-xl bg-primary text-on-primary font-headline font-semibold text-xs shadow-xs hover:bg-primary-container transition-all cursor-pointer"
              >
                Confirm Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
