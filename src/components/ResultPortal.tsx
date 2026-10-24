import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useLiveQuery } from 'dexie-react-hooks';
import { DoubtResponse, ExamResult, Question } from '../types';
import { db, defaultSettings } from '../db/db';
import { askAiForExplanation } from '../services/aiService';
import MathText from './MathText';
import { getQuestionStimulus } from '../utils/quizJson';
import { useActiveProfile } from '../context/ProfileContext';
import { createDoubtResponseIdentity, createDoubtResponseRecord } from '../utils/doubtResponseCache';

interface ResultPortalProps {
  resultRecord: ExamResult;
  onRetake: () => void;
  onGoHome: () => void;
  backLabel?: string;
}

interface AiResponseSection {
  title: string;
  lines: string[];
}

type DoubtRequestMode = 'explain' | 'simplify' | 'practice' | 'custom';

function cleanAiSectionTitle(title: string) {
  return title.replace(/^#+\s*/, '').replace(/[*_`]/g, '').replace(/[✅❌🔍💡🌟🎯📝]/gu, '').trim();
}

function parseAiResponse(response: string): AiResponseSection[] {
  const sections: AiResponseSection[] = [];
  let current: AiResponseSection = { title: 'Explanation', lines: [] };

  response.split('\n').forEach((rawLine) => {
    const line = rawLine.trim();
    const headingMatch = line.match(/^#{1,4}\s+(.+)$/);

    if (headingMatch) {
      if (current.lines.length > 0) sections.push(current);
      current = { title: cleanAiSectionTitle(headingMatch[1]), lines: [] };
    } else if (line) {
      current.lines.push(line);
    }
  });

  if (current.lines.length > 0) sections.push(current);
  return sections.length > 0 ? sections : [{ title: 'Explanation', lines: [response] }];
}

function renderAiLine(line: string) {
  // Split on **bold** markers first, then pass each plain segment through MathText
  const pieces = line.split(/(\*\*[^*]+\*\*)/g);
  return pieces.map((piece, index) =>
    piece.startsWith('**') && piece.endsWith('**') ? (
      <strong key={index} className="font-headline font-semibold text-on-surface">
        <MathText text={piece.slice(2, -2)} />
      </strong>
    ) : (
      <MathText key={index} text={piece} />
    )
  );
}

export default function ResultPortal({ resultRecord, onRetake, onGoHome, backLabel = 'Home' }: ResultPortalProps) {
  const { activeProfileId } = useActiveProfile();
  const { 
    quiz_title, 
    percentage, 
    accuracy, 
    correctCount, 
    incorrectCount, 
    unattemptedCount, 
    user_answers, 
    quiz_data 
  } = resultRecord as any;
  const responseProfileId = resultRecord.profileId || activeProfileId;

  const [filterTab, setFilterTab] = useState('all');

  // AI Doubt Modal state
  const [aiTargetQuestion, setAiTargetQuestion] = useState<any>(null);
  const [aiCustomQuery, setAiCustomQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiCacheNotice, setAiCacheNotice] = useState('');
  const [savedResponseId, setSavedResponseId] = useState<number | null>(null);
  const [pendingCachedResponse, setPendingCachedResponse] = useState<DoubtResponse | null>(null);
  const [lastDoubtRequest, setLastDoubtRequest] = useState<{
    query: string;
    mode: DoubtRequestMode;
  } | null>(null);

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
    const correctAns = typeof q.correct_answer === 'number' ? q.correct_answer : q.correct_answer_index;
    const isCorrect = userChoice === correctAns;
    const isUnattempted = userChoice === undefined;

    if (filterTab === 'correct') return isCorrect;
    if (filterTab === 'incorrect') return !isCorrect && !isUnattempted;
    if (filterTab === 'skipped') return isUnattempted;
    return true;
  });

  const handleAskAi = async (
    q: Question,
    userQuery: string,
    mode: DoubtRequestMode,
    forceRefresh = false,
  ) => {
    setLastDoubtRequest({ query: userQuery, mode });
    setAiTargetQuestion(q);
    setAiResponse(null);
    setAiError(null);
    setAiCacheNotice('');
    setSavedResponseId(null);
    setPendingCachedResponse(null);
    setIsAiLoading(true);

    const qId = q.id || (quiz_data.questions.indexOf(q) + 1);
    const userChoice = user_answers[qId];
    const correctAns = typeof q.correct_answer === 'number' ? q.correct_answer : (q.correct_answer_index ?? 0);
    const correctAnswerText = q.options[correctAns] || '';
    const userSelectedText = userChoice !== undefined ? q.options[userChoice] : undefined;
    const responseIdentity = responseProfileId
      ? createDoubtResponseIdentity(
          responseProfileId,
          quiz_title,
          q,
          quiz_data,
          userQuery,
          userSelectedText,
          mode
        )
      : null;

    try {
      if (responseIdentity && !forceRefresh) {
        try {
          const savedResponse = await db.transaction('rw', db.doubtResponses, async () => {
            const matches = await db.doubtResponses
              .where('profileId')
              .equals(responseIdentity.profileId)
              .filter((response) =>
                response.quizKey === responseIdentity.quizKey &&
                response.questionKey === responseIdentity.questionKey &&
                response.doubtKey === responseIdentity.doubtKey
              )
              .toArray();
            const latest = matches.sort((a, b) => b.updatedAt - a.updatedAt)[0];
            if (!latest) return undefined;
            const historyIds = Array.from(new Set(matches.flatMap((response) => response.historyIds || [])));
            const duplicateIds = matches
              .filter((response) => response.id !== undefined && response.id !== latest.id)
              .map((response) => response.id)
              .filter((id): id is number => id !== undefined);
            if (latest.id !== undefined && historyIds.length !== (latest.historyIds || []).length) {
              await db.doubtResponses.update(latest.id, { historyIds });
            }
            if (duplicateIds.length > 0) await db.doubtResponses.bulkDelete(duplicateIds);
            return { ...latest, historyIds };
          });
          if (savedResponse) {
            setPendingCachedResponse(savedResponse);
            setAiCacheNotice('এই প্রশ্ন ও অনুরোধের উত্তর আগে সংরক্ষিত আছে। আগের উত্তর ব্যবহার করুন অথবা নতুন করে AI-কে জিজ্ঞেস করুন।');
            return;
          }
        } catch (error) {
          console.error('Failed to look up saved doubt response:', error);
          setAiCacheNotice('আগের উত্তর খুঁজে দেখা যায়নি; নতুন করে AI-কে জিজ্ঞেস করছি।');
        }
      }

      const res = await askAiForExplanation({
        questionText: [
          getQuestionStimulus(quiz_data, q) ? `উদ্দীপক: ${getQuestionStimulus(quiz_data, q)}` : '',
          q.question || q.question_text || '',
        ].filter(Boolean).join('\n\n'),
        options: q.options,
        correctAnswerText,
        userAnswerText: userSelectedText,
        userQuery,
        responseMode: mode,
        settings: prefs,
      });
      setAiResponse(res);
      if (responseIdentity && responseProfileId) {
        try {
          const savedId = await db.transaction('rw', db.doubtResponses, async () => {
            const matches = await db.doubtResponses
              .where('profileId')
              .equals(responseIdentity.profileId)
              .filter((response) =>
                response.quizKey === responseIdentity.quizKey &&
                response.questionKey === responseIdentity.questionKey &&
                response.doubtKey === responseIdentity.doubtKey
              )
              .toArray();
            const existing = matches.sort((a, b) => b.updatedAt - a.updatedAt)[0];
            const existingHistoryIds = matches.flatMap((response) => response.historyIds || []);
            const savedRecord = createDoubtResponseRecord({
              identity: responseIdentity,
              quizTitle: quiz_title,
              question: q,
              doubt: userQuery,
              response: res,
              historyId: resultRecord.id,
              existing: existing
                ? { ...existing, historyIds: existingHistoryIds }
                : undefined,
            });
            const id = existing?.id !== undefined
              ? await db.doubtResponses.put(savedRecord)
              : await db.doubtResponses.add(savedRecord);
            const duplicateIds = matches
              .filter((response) => response.id !== undefined && response.id !== id)
              .map((response) => response.id as number);
            if (duplicateIds.length > 0) {
              await db.doubtResponses.bulkDelete(duplicateIds);
            }
            return id;
          });
          setSavedResponseId(savedId);
          setAiCacheNotice('উত্তরটি এই profile-এর জন্য সংরক্ষিত হয়েছে।');
        } catch (error) {
          console.error('Failed to save doubt response:', error);
          setAiCacheNotice('উত্তর পাওয়া গেছে, তবে সংরক্ষণ করা যায়নি।');
        }
      }
    } catch (err: any) {
      setAiError(err?.message || 'Failed to connect to AI API.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const openDoubtSolver = (question: Question) => {
    setAiCustomQuery('');
    setAiTargetQuestion(question);
    setAiResponse(null);
    setAiError(null);
    setAiCacheNotice('');
    setSavedResponseId(null);
    setPendingCachedResponse(null);
    setLastDoubtRequest(null);
  };

  const handleCustomDoubtSubmit = () => {
    const query = aiCustomQuery.trim();
    if (!query || !aiTargetQuestion || isAiLoading) return;
    void handleAskAi(aiTargetQuestion, query, 'custom');
  };

  const handleUseSavedResponse = async () => {
    if (!pendingCachedResponse) return;
    const savedResponse = pendingCachedResponse;
    if (savedResponse.id !== undefined && !savedResponse.historyIds?.includes(resultRecord.id)) {
      try {
        await db.doubtResponses.update(savedResponse.id, {
          historyIds: [...(savedResponse.historyIds || []), resultRecord.id],
        });
      } catch (error) {
        console.error('Failed to link saved doubt response to this history:', error);
      }
    }
    setAiResponse(savedResponse.response);
    setSavedResponseId(savedResponse.id ?? null);
    setAiCacheNotice(`আগের উত্তর দেখানো হচ্ছে · ${new Date(savedResponse.updatedAt).toLocaleString()}`);
    setPendingCachedResponse(null);
  };

  const handleRequestFreshResponse = () => {
    if (!pendingCachedResponse || !aiTargetQuestion || !lastDoubtRequest || isAiLoading) return;
    setPendingCachedResponse(null);
    void handleAskAi(
      aiTargetQuestion,
      lastDoubtRequest.query,
      lastDoubtRequest.mode,
      true
    );
  };

  const handleDeleteSavedResponse = async () => {
    if (!savedResponseId) return;
    try {
      await db.doubtResponses.delete(savedResponseId);
      setSavedResponseId(null);
      setAiCacheNotice('সংরক্ষিত উত্তর মুছে ফেলা হয়েছে।');
    } catch (error) {
      console.error('Failed to delete saved doubt response:', error);
      setAiCacheNotice('সংরক্ষিত উত্তর মুছতে সমস্যা হয়েছে।');
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full pb-28 pt-2 space-y-4">
      {/* Test Results Header */}
      <div className="flex items-center justify-between px-1">
        <h1 className="font-headline font-semibold text-lg text-on-surface tracking-tight">
          Test Results
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={onRetake}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
            title="Retake Test"
          >
            <span className="material-symbols-outlined text-[18px]">replay</span>
          </button>
          <button
            onClick={onGoHome}
            className="text-xs font-headline font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">{backLabel === 'Home' ? 'home' : 'arrow_back'}</span>
            <span>{backLabel}</span>
          </button>
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
        <div className="space-y-2">
          {filteredQuestions.map((q: any, idx: number) => {
            const qId = q.id || (idx + 1);
            const userChoice = user_answers[qId];
            const correctChoice = typeof q.correct_answer === 'number' ? q.correct_answer : q.correct_answer_index;
            const isCorrect = userChoice === correctChoice;
            const isUnattempted = userChoice === undefined;

            return (
              <div
                key={qId}
                className="rounded-xl bg-surface-container-lowest border border-surface-container/80 px-3.5 py-3"
              >
                {getQuestionStimulus(quiz_data, q) && (
                  <div className="mb-2.5 rounded-lg border border-primary/15 bg-primary/5 p-2.5">
                    <p className="mb-1 text-[10px] font-headline font-bold text-primary">উদ্দীপক</p>
                    <div className="text-[11px] leading-relaxed text-on-surface-variant">
                      <MathText text={getQuestionStimulus(quiz_data, q) || ''} />
                    </div>
                  </div>
                )}
                {/* Question row */}
                <div className="flex items-start gap-2 mb-2.5">
                  {isCorrect ? (
                    <span className="material-symbols-outlined text-tertiary text-[17px] mt-0.5 shrink-0">check_circle</span>
                  ) : !isUnattempted ? (
                    <span className="material-symbols-outlined text-error text-[17px] mt-0.5 shrink-0">cancel</span>
                  ) : null}
                  <p className="text-xs font-headline font-semibold text-on-surface leading-snug">
                    <MathText text={q.question || q.question_text || ''} />
                  </p>
                </div>

                {/* Options - plain text list */}
                <div className="space-y-1 pl-1">
                  {q.options.map((optText: string, optIdx: number) => {
                    const isTargetCorrect = optIdx === correctChoice;
                    const isUserWrongChoice = optIdx === userChoice && !isCorrect;
                    return (
                      <div
                        key={optIdx}
                        className={`flex items-center gap-2 text-[11px] font-body ${
                          isTargetCorrect
                            ? 'text-on-surface font-bold'
                            : isUserWrongChoice
                            ? 'text-error/70 line-through'
                            : 'text-on-surface-variant'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isTargetCorrect ? 'bg-tertiary' : isUserWrongChoice ? 'bg-error/50' : 'bg-outline-variant/50'
                        }`} />
                        <MathText text={optText} />
                      </div>
                    );
                  })}
                </div>

                {/* Explanation + Ask AI */}
                <div className="mt-2.5 flex items-start justify-between gap-2">
                  {q.explanation ? (
                    <p className="text-[10px] font-body text-on-surface-variant/70 leading-relaxed flex-1">
                      <MathText text={q.explanation} />
                    </p>
                  ) : <span />}
                  <button
                    type="button"
                    onClick={() => openDoubtSolver(q)}
                    className="flex items-center gap-0.5 text-[10px] font-headline font-semibold text-primary/50 hover:text-primary transition-colors cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-[12px]">smart_toy</span>
                    Ask AI
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full-screen AI Doubt Solver */}
      {aiTargetQuestion && (
        <div className="fixed inset-0 z-50 flex h-full w-full flex-col overflow-hidden bg-surface">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="doubt-solver-title"
            className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden bg-surface-container-lowest px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6"
          >
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-surface-container pb-3">
              <div className="min-w-0">
                <span className="text-[11px] font-headline font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                  AI Doubt Solver ({
                    prefs.preferredAiProvider === 'openai' ? 'OpenAI ChatGPT'
                    : prefs.preferredAiProvider === 'openrouter' ? 'OpenRouter'
                    : prefs.preferredAiProvider === 'groq' ? 'Groq'
                    : prefs.preferredAiProvider === 'huggingface' ? 'Hugging Face'
                    : 'Google Gemini'
                  })
                </span>
                <h3 id="doubt-solver-title" className="mt-1 font-headline font-bold text-sm text-on-surface line-clamp-2">
                  <MathText text={aiTargetQuestion.question || aiTargetQuestion.question_text || ''} />
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAiTargetQuestion(null)}
                aria-label="Close doubt solver"
                className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Quick Action Chips */}
            <div className="flex shrink-0 flex-wrap items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => handleAskAi(
                  aiTargetQuestion,
                  'Explain why the correct answer is right in detail.',
                  'explain'
                )}
                disabled={isAiLoading}
                className="px-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface font-headline text-[11px] font-medium whitespace-nowrap hover:bg-surface-container transition-all cursor-pointer"
              >
                💡 Explain Correct Answer
              </button>
              <button
                type="button"
                onClick={() => handleAskAi(
                  aiTargetQuestion,
                  'Simplify the core concept for a beginner.',
                  'simplify'
                )}
                disabled={isAiLoading}
                className="px-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface font-headline text-[11px] font-medium whitespace-nowrap hover:bg-surface-container transition-all cursor-pointer"
              >
                🎯 Simplify Concept
              </button>
              <button
                type="button"
                onClick={() => handleAskAi(
                  aiTargetQuestion,
                  'Create exactly two similar practice problems for me to solve. Provide the problems first and put the answer key with brief solutions afterward.',
                  'practice'
                )}
                disabled={isAiLoading}
                className="px-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface font-headline text-[11px] font-medium whitespace-nowrap hover:bg-surface-container transition-all cursor-pointer"
              >
                📝 Practice Problem
              </button>
            </div>

            {(aiCacheNotice || savedResponseId) && (
              <div className={`shrink-0 rounded-xl px-3 py-2 ${
                pendingCachedResponse ? 'border border-primary/20 bg-primary/10' : 'bg-primary/5'
              }`}>
                {pendingCachedResponse ? (
                  <div className="space-y-2">
                    <p role="status" className="text-xs font-body text-on-surface">
                      {aiCacheNotice}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleUseSavedResponse()}
                        className="rounded-lg bg-primary px-3 py-2 text-[11px] font-headline font-semibold text-on-primary"
                      >
                        আগের উত্তর ব্যবহার করুন
                      </button>
                      <button
                        type="button"
                        onClick={handleRequestFreshResponse}
                        className="rounded-lg bg-surface-container px-3 py-2 text-[11px] font-headline font-semibold text-on-surface"
                      >
                        নতুন করে AI-কে জিজ্ঞেস করুন
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-body text-on-surface-variant">
                      {aiCacheNotice || 'উত্তরটি সংরক্ষিত আছে।'}
                    </p>
                    {aiResponse && (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => lastDoubtRequest && handleAskAi(
                            aiTargetQuestion,
                            lastDoubtRequest.query,
                            lastDoubtRequest.mode,
                            true
                          )}
                          disabled={isAiLoading}
                          className="text-[11px] font-headline font-semibold text-primary hover:underline disabled:opacity-50"
                        >
                          নতুন করে জিজ্ঞেস করুন
                        </button>
                        {savedResponseId && (
                          <button
                            type="button"
                            onClick={handleDeleteSavedResponse}
                            disabled={isAiLoading}
                            className="text-[11px] font-headline font-semibold text-error hover:underline disabled:opacity-50"
                          >
                            সংরক্ষিত উত্তর মুছুন
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* AI Answer Content Area */}
            <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-surface-container bg-surface-container-low/60 p-4 text-sm font-body leading-relaxed text-on-surface">
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
                <div className="space-y-3">
                  {parseAiResponse(aiResponse).map((section, sectionIndex) => {
                    const title = section.title.toLowerCase();
                    const isCorrectAnswer = title.includes('correct answer') || title.includes('সঠিক উত্তর');
                    const isTakeaway = title.includes('key takeaway') || title.includes('মূল কথা') || title.includes('মনে রাখ');
                    const isAlternatives = title.includes('other option') || title.includes('অন্যান্য') || title.includes('ভুল');

                    return (
                      <section
                        key={`${section.title}-${sectionIndex}`}
                        className={`rounded-xl border p-3 ${
                          isCorrectAnswer
                            ? 'bg-tertiary-container/20 border-tertiary/30'
                            : isTakeaway
                            ? 'bg-primary/10 border-primary/25'
                            : 'bg-surface-container-lowest border-surface-container'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className={`material-symbols-outlined text-[16px] ${
                            isCorrectAnswer ? 'text-tertiary' : isTakeaway ? 'text-primary' : 'text-outline'
                          }`}>
                            {isCorrectAnswer ? 'check_circle' : isTakeaway ? 'lightbulb' : isAlternatives ? 'rule' : 'menu_book'}
                          </span>
                          <h4 className="font-headline text-xs font-bold text-on-surface">{section.title}</h4>
                        </div>
                        <div className="space-y-1.5 font-body text-xs leading-relaxed text-on-surface-variant">
                          {section.lines.map((line, lineIndex) => {
                            const isBullet = /^[-•*]\s+/.test(line);
                            const content = isBullet ? line.replace(/^[-•*]\s+/, '') : line;
                            return isBullet ? (
                              <div key={lineIndex} className="flex gap-2">
                                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                                <p>{renderAiLine(content)}</p>
                              </div>
                            ) : (
                              <p key={lineIndex}>{renderAiLine(content)}</p>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <p className="text-outline text-xs text-center py-8">
                  Tap any chip above or type your question below to ask AI.
                </p>
              )}
            </div>

            {/* Custom Query Input */}
            <div className="flex shrink-0 items-center gap-2 border-t border-surface-container pt-3">
              <input
                type="text"
                placeholder="Ask any specific question about this problem..."
                value={aiCustomQuery}
                onChange={(e) => setAiCustomQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomDoubtSubmit()}
                className="h-11 min-w-0 flex-1 rounded-xl border border-outline-variant/40 bg-surface-container-low px-3.5 text-sm font-body text-on-surface focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleCustomDoubtSubmit}
                disabled={isAiLoading || !aiCustomQuery.trim()}
                aria-label="Send question"
                className="h-11 w-11 shrink-0 rounded-xl bg-primary text-on-primary font-headline text-xs font-semibold flex items-center justify-center gap-1 shadow-xs hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
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
