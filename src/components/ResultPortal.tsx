import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useLiveQuery } from 'dexie-react-hooks';
import { ExamResult } from '../types';
import { db, defaultSettings } from '../db/db';
import { askAiForExplanation } from '../services/aiService';

interface ResultPortalProps {
  resultRecord: ExamResult;
  onRetake: () => void;
  onGoHome: () => void;
}

export default function ResultPortal({ resultRecord, onRetake, onGoHome }: ResultPortalProps) {
  const { 
    quiz_title, 
    score, 
    maxScore, 
    percentage, 
    accuracy, 
    correctCount, 
    incorrectCount, 
    unattemptedCount, 
    timeSpentFormatted, 
    user_answers, 
    quiz_data 
  } = resultRecord as any;

  const [filterTab, setFilterTab] = useState('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // AI Doubt Modal state
  const [aiTargetQuestion, setAiTargetQuestion] = useState<any>(null);
  const [aiCustomQuery, setAiCustomQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const prefs = useLiveQuery(() => db.settings.get('user_prefs'), []) || defaultSettings;

  useEffect(() => {
    if (percentage >= 80) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    } else if (percentage >= 60) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    }
  }, [percentage]);

  const filteredQuestions = quiz_data.questions.filter((q: any, idx: number) => {
    const qId = q.id || (idx + 1);
    const userChoice = user_answers[qId];
    const isCorrect = userChoice === q.correct_answer;
    const isUnattempted = userChoice === undefined;

    if (filterTab === 'correct') return isCorrect;
    if (filterTab === 'incorrect') return !isCorrect && !isUnattempted;
    if (filterTab === 'skipped') return isUnattempted;
    return true;
  });

  const handleAskAi = async (q: any, customPrompt?: string) => {
    setAiTargetQuestion(q);
    setAiResponse(null);
    setAiError(null);
    setIsAiLoading(true);

    const qId = q.id || (quiz_data.questions.indexOf(q) + 1);
    const userChoice = user_answers[qId];
    const correctAnswerText = q.options[q.correct_answer] || '';
    const userSelectedText = userChoice !== undefined ? q.options[userChoice] : undefined;

    try {
      const res = await askAiForExplanation({
        questionText: q.question,
        options: q.options,
        correctAnswerText,
        userAnswerText: userSelectedText,
        userQuery: customPrompt || aiCustomQuery,
        settings: prefs,
      });
      setAiResponse(res);
    } catch (err: any) {
      setAiError(err?.message || 'Failed to connect to AI API.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const circleRadius = 50;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full pb-28 pt-2 space-y-4">
      {/* Test Results Header */}
      <div className="flex items-center justify-between px-1">
        <h1 className="font-headline font-semibold text-lg text-on-surface tracking-tight">
          Test Results
        </h1>
        <button 
          onClick={onGoHome}
          className="text-xs font-headline font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">home</span>
          <span>Home</span>
        </button>
      </div>

      {/* Hero Score Card */}
      <div className="rounded-2xl bg-surface-container-lowest p-5 shadow-xs flex flex-col items-center text-center border border-surface-container/80">
        <div className="relative my-2 flex items-center justify-center">
          <svg className="w-28 h-28 -rotate-90 transform" viewBox="0 0 120 120">
            <circle 
              className="text-surface-container" 
              cx="60" 
              cy="60" 
              fill="transparent" 
              r="50" 
              stroke="currentColor" 
              strokeWidth="8"
            />
            <circle 
              className="text-primary transition-all duration-700 ease-out" 
              cx="60" 
              cy="60" 
              fill="transparent" 
              r="50" 
              stroke="currentColor" 
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="font-headline text-3xl text-primary font-bold tracking-tight">{percentage}%</span>
            <span className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">Score</span>
          </div>
        </div>

        <div className="mt-2">
          <h2 className="font-headline text-lg font-semibold text-on-surface">{quiz_title}</h2>
          <div className="mt-1 flex items-center justify-center gap-2 text-xs text-on-surface-variant">
            <span className="font-medium text-tertiary">{correctCount} of {quiz_data.questions.length} Correct</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">timer</span> {timeSpentFormatted}
            </span>
            <span>•</span>
            <span className={`font-medium ${percentage >= 50 ? 'text-primary' : 'text-error'}`}>
              {percentage >= 50 ? 'Passed' : 'Needs Practice'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-4 gap-2 p-3.5 rounded-2xl bg-surface-container-lowest border border-surface-container/80 shadow-xs">
        <div className="flex flex-col items-center text-center">
          <span className="text-[10px] font-bold tracking-wider text-on-surface-variant uppercase">Correct</span>
          <span className="font-headline text-lg text-tertiary font-bold mt-0.5">{correctCount}</span>
        </div>
        <div className="flex flex-col items-center text-center border-l border-surface-container">
          <span className="text-[10px] font-bold tracking-wider text-on-surface-variant uppercase">Wrong</span>
          <span className="font-headline text-lg text-error font-bold mt-0.5">{incorrectCount}</span>
        </div>
        <div className="flex flex-col items-center text-center border-l border-surface-container">
          <span className="text-[10px] font-bold tracking-wider text-on-surface-variant uppercase">Skipped</span>
          <span className="font-headline text-lg text-on-surface font-bold mt-0.5">{unattemptedCount}</span>
        </div>
        <div className="flex flex-col items-center text-center border-l border-surface-container">
          <span className="text-[10px] font-bold tracking-wider text-on-surface-variant uppercase">Accuracy</span>
          <span className="font-headline text-lg text-primary font-bold mt-0.5">{accuracy}%</span>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button 
          onClick={onRetake}
          className="h-11 rounded-xl bg-surface-container text-on-surface font-headline text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">replay</span>
          <span>Retake Test</span>
        </button>

        <button 
          onClick={onGoHome}
          className="h-11 rounded-xl bg-surface-container text-on-surface-variant hover:text-on-surface font-headline text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">home</span>
          <span>Back to Home</span>
        </button>
      </div>

      {/* Solutions / Question Review */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-0.5">
          <h3 className="font-headline font-semibold text-sm text-on-surface">Question Review & AI Analysis</h3>
          <span className="text-xs text-on-surface-variant">{filteredQuestions.length} Items</span>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'All', count: quiz_data.questions.length },
            { id: 'correct', label: 'Correct', count: correctCount },
            { id: 'incorrect', label: 'Wrong', count: incorrectCount },
            { id: 'skipped', label: 'Skipped', count: unattemptedCount },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterTab(f.id)}
              className={`px-3 py-1 rounded-full text-xs font-headline font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filterTab === f.id
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {/* Review Cards */}
        <div className="space-y-2.5">
          {filteredQuestions.map((q: any, idx: number) => {
            const qId = q.id || (idx + 1);
            const userChoice = user_answers[qId];
            const correctChoice = q.correct_answer;
            const isCorrect = userChoice === correctChoice;
            const isUnattempted = userChoice === undefined;
            const isExpanded = expandedId === qId;

            return (
              <div 
                key={qId}
                className={`rounded-2xl bg-surface-container-lowest border p-4 shadow-xs transition-all ${
                  isCorrect ? 'border-tertiary/40' : isUnattempted ? 'border-outline-variant' : 'border-error/40'
                }`}
              >
                <div 
                  className="flex items-start gap-3 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : qId)}
                >
                  <div className="mt-0.5 shrink-0">
                    {isCorrect ? (
                      <span className="material-symbols-outlined text-tertiary text-xl">check_circle</span>
                    ) : isUnattempted ? (
                      <span className="material-symbols-outlined text-outline text-xl">help_outline</span>
                    ) : (
                      <span className="material-symbols-outlined text-error text-xl">cancel</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-headline font-semibold text-sm text-on-surface leading-snug">
                      {q.question}
                    </h4>

                    {!isExpanded && (
                      <p className="text-xs text-primary font-headline font-medium mt-1 flex items-center gap-0.5">
                        <span>Show Options & AI Doubt Solver</span>
                        <span className="material-symbols-outlined text-[16px]">expand_more</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Expanded Answer Options & Rationale */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-surface-container space-y-3">
                    <div className="space-y-1.5">
                      {q.options.map((optText: string, optIdx: number) => {
                        const isTargetCorrect = optIdx === correctChoice;
                        const isUserWrongChoice = optIdx === userChoice && !isCorrect;

                        let optStyle = 'p-2.5 rounded-xl border text-xs font-body flex items-center justify-between ';
                        if (isTargetCorrect) {
                          optStyle += 'bg-tertiary-container/30 border-tertiary text-on-tertiary-container font-semibold';
                        } else if (isUserWrongChoice) {
                          optStyle += 'bg-error-container/30 border-error text-on-error-container font-semibold';
                        } else {
                          optStyle += 'bg-surface-container-low border-outline-variant/40 text-on-surface';
                        }

                        return (
                          <div key={optIdx} className={optStyle}>
                            <span>{optText}</span>
                            {isTargetCorrect && (
                              <span className="material-symbols-outlined text-[16px] text-tertiary">check</span>
                            )}
                            {isUserWrongChoice && (
                              <span className="material-symbols-outlined text-[16px] text-error">close</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high text-xs text-on-surface space-y-1">
                        <div className="flex items-center gap-1.5 text-primary font-headline font-semibold">
                          <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                          <span>Explanation Rationale</span>
                        </div>
                        <p className="font-body text-on-surface-variant leading-relaxed">
                          {q.explanation}
                        </p>
                      </div>
                    )}

                    {/* Ask AI Doubt Button */}
                    <button
                      type="button"
                      onClick={() => handleAskAi(q)}
                      className="w-full h-10 rounded-xl bg-primary/10 border border-primary/30 text-primary font-headline text-xs font-semibold flex items-center justify-center gap-2 hover:bg-primary/20 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                      Ask AI to Explain / Clear Doubts
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Doubt Solver Drawer / Modal */}
      {aiTargetQuestion && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg max-h-[85vh] rounded-3xl bg-surface-container-lowest border border-surface-container/80 p-5 shadow-2xl flex flex-col overflow-hidden space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-surface-container">
              <div>
                <span className="text-[11px] font-headline font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                  AI Doubt Solver ({prefs.preferredAiProvider === 'openai' ? 'OpenAI ChatGPT' : 'Google Gemini'})
                </span>
                <h3 className="font-headline font-bold text-sm text-on-surface line-clamp-1 mt-0.5">
                  {aiTargetQuestion.question}
                </h3>
              </div>
              <button
                onClick={() => setAiTargetQuestion(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Quick Action Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => handleAskAi(aiTargetQuestion, 'Explain why the correct answer is right in detail.')}
                className="px-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface font-headline text-[11px] font-medium whitespace-nowrap hover:bg-surface-container transition-all cursor-pointer"
              >
                💡 Explain Correct Answer
              </button>
              <button
                type="button"
                onClick={() => handleAskAi(aiTargetQuestion, 'Simplify the core concept for a beginner.')}
                className="px-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface font-headline text-[11px] font-medium whitespace-nowrap hover:bg-surface-container transition-all cursor-pointer"
              >
                🎯 Simplify Concept
              </button>
              <button
                type="button"
                onClick={() => handleAskAi(aiTargetQuestion, 'Give me a similar practice problem with solution.')}
                className="px-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface font-headline text-[11px] font-medium whitespace-nowrap hover:bg-surface-container transition-all cursor-pointer"
              >
                📝 Practice Problem
              </button>
            </div>

            {/* AI Answer Content Area */}
            <div className="flex-1 overflow-y-auto p-4 rounded-2xl bg-surface-container-low/60 border border-surface-container text-xs font-body text-on-surface leading-relaxed min-h-[160px] max-h-[300px]">
              {isAiLoading ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-2">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-headline font-semibold text-outline">
                    Asking AI tutor for explanation...
                  </p>
                </div>
              ) : aiError ? (
                <div className="p-3 rounded-xl bg-error-container/40 border border-error/30 text-on-error-container space-y-2">
                  <div className="flex items-center gap-1.5 font-headline font-bold text-xs">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    API Error
                  </div>
                  <p className="text-xs font-body">{aiError}</p>
                </div>
              ) : aiResponse ? (
                <div className="whitespace-pre-wrap font-body text-xs leading-relaxed text-on-surface">
                  {aiResponse}
                </div>
              ) : (
                <p className="text-outline text-xs text-center py-8">
                  Tap any chip above or type your question below to ask AI.
                </p>
              )}
            </div>

            {/* Custom Query Input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Ask any specific question about this problem..."
                value={aiCustomQuery}
                onChange={(e) => setAiCustomQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAi(aiTargetQuestion)}
                className="flex-1 h-10 px-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-body text-on-surface focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => handleAskAi(aiTargetQuestion)}
                disabled={isAiLoading}
                className="h-10 px-4 rounded-xl bg-primary text-on-primary font-headline text-xs font-semibold flex items-center justify-center gap-1 shadow-xs hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
