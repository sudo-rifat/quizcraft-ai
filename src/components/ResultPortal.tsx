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

interface AiResponseSection {
  title: string;
  lines: string[];
}

function cleanAiSectionTitle(title: string) {
  return title.replace(/^#+\s*/, '').replace(/[*_`]/g, '').replace(/[✅❌🔍💡🌟🎯📝]/g, '').trim();
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
  const pieces = line.split(/(\*\*[^*]+\*\*)/g);
  return pieces.map((piece, index) =>
    piece.startsWith('**') && piece.endsWith('**')
      ? <strong key={index} className="font-headline font-semibold text-on-surface">{piece.slice(2, -2)}</strong>
      : <React.Fragment key={index}>{piece}</React.Fragment>
  );
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
            <span className="material-symbols-outlined text-[16px]">home</span>
            <span>Home</span>
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
            const correctChoice = q.correct_answer;
            const isCorrect = userChoice === correctChoice;
            const isUnattempted = userChoice === undefined;

            return (
              <div
                key={qId}
                className="rounded-xl bg-surface-container-lowest border border-surface-container/80 px-3.5 py-3"
              >
                {/* Question row */}
                <div className="flex items-start gap-2 mb-2.5">
                  {isCorrect ? (
                    <span className="material-symbols-outlined text-tertiary text-[17px] mt-0.5 shrink-0">check_circle</span>
                  ) : !isUnattempted ? (
                    <span className="material-symbols-outlined text-error text-[17px] mt-0.5 shrink-0">cancel</span>
                  ) : null}
                  <p className="text-xs font-headline font-semibold text-on-surface leading-snug">{q.question}</p>
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
                        {optText}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation + Ask AI */}
                {(q.explanation || true) && (
                  <div className="mt-2.5 flex items-start justify-between gap-2">
                    {q.explanation ? (
                      <p className="text-[10px] font-body text-on-surface-variant/70 leading-relaxed flex-1">
                        {q.explanation}
                      </p>
                    ) : <span />}
                    <button
                      type="button"
                      onClick={() => handleAskAi(q)}
                      className="flex items-center gap-0.5 text-[10px] font-headline font-semibold text-primary/50 hover:text-primary transition-colors cursor-pointer shrink-0"
                    >
                      <span className="material-symbols-outlined text-[12px]">smart_toy</span>
                      Ask AI
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
                  AI Doubt Solver ({
                    prefs.preferredAiProvider === 'openai' ? 'OpenAI ChatGPT'
                    : prefs.preferredAiProvider === 'openrouter' ? 'OpenRouter'
                    : prefs.preferredAiProvider === 'groq' ? 'Groq'
                    : 'Google Gemini'
                  })
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
