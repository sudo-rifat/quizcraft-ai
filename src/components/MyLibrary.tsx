import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useActiveProfile } from '../context/ProfileContext';
import { SavedQuiz, Quiz, BookmarkedQuestion } from '../types';
import { db } from '../db/db';

interface MyLibraryProps {
  onSwitchTab: (tabId: string) => void;
  onStartExam: (data: { quiz: Quiz; config: any }) => void;
  onRequestStartExam?: (quiz: Quiz) => void;
  showToast?: (type: string, message: string) => void;
}

export default function MyLibrary({ onSwitchTab, onStartExam, onRequestStartExam, showToast }: MyLibraryProps) {
  const { activeProfileId } = useActiveProfile();
  const [activeSubTab, setActiveSubTab] = useState<'quizzes' | 'reviewLater'>('quizzes');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewQuiz, setPreviewQuiz] = useState<SavedQuiz | null>(null);
  const [quizToDelete, setQuizToDelete] = useState<SavedQuiz | null>(null);
  const [bookmarkToDelete, setBookmarkToDelete] = useState<BookmarkedQuestion | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Live query for saved quizzes belonging to active profile
  const savedQuizzes = useLiveQuery(async () => {
    if (!activeProfileId) return [];
    const list = await db.quizzes
      .where('profileId')
      .equals(activeProfileId)
      .toArray();
    return list.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  }, [activeProfileId]) as SavedQuiz[] | undefined;

  // Live query for bookmarked / Review Later MCQs belonging to active profile
  const bookmarkedQuestions = useLiveQuery(async () => {
    if (!activeProfileId) return [];
    const list = await db.bookmarks
      .where('profileId')
      .equals(activeProfileId)
      .toArray();
    return list.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  }, [activeProfileId]) as BookmarkedQuestion[] | undefined;

  const filteredQuizzes = (savedQuizzes || []).filter((q) =>
    q.quiz_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBookmarks = (bookmarkedQuestions || []).filter((bm) =>
    bm.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bm.quiz_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: number, title: string) => {
    setDeletingId(id);
    try {
      await db.quizzes.delete(id);
      setQuizToDelete(null);
      showToast?.('success', `"${title}" has been deleted from your library.`);
    } catch (err) {
      showToast?.('error', 'Failed to delete quiz.');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && deletingId === null) {
        setQuizToDelete(null);
        setBookmarkToDelete(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deletingId]);

  const handleDeleteBookmark = async (id: number) => {
    setDeletingId(id);
    try {
      await db.bookmarks.delete(id);
      setBookmarkToDelete(null);
      showToast?.('info', 'Question removed from Review Later.');
    } catch (err) {
      showToast?.('error', 'Failed to remove question.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStartExam = (sq: SavedQuiz) => {
    if (onRequestStartExam) {
      onRequestStartExam(sq.quiz_data);
    } else {
      onStartExam({
        quiz: sq.quiz_data,
        config: { durationMinutes: 10, marksPerQuestion: 1, negativeMarking: 0 },
      });
    }
  };

  const handlePracticeBookmarks = () => {
    if (!bookmarkedQuestions || bookmarkedQuestions.length === 0) return;

    const practiceQuiz: Quiz = {
      quiz_title: 'Review Later Practice Exam',
      questions: bookmarkedQuestions.map((bm, i) => ({
        id: bm.id || i + 1,
        question: bm.question_text,
        options: bm.options,
        correct_answer: bm.correct_answer,
        explanation: bm.explanation || '',
      })),
    };

    if (onRequestStartExam) {
      onRequestStartExam(practiceQuiz);
    } else {
      onStartExam({
        quiz: practiceQuiz,
        config: {
          durationMinutes: Math.max(5, Math.ceil(bookmarkedQuestions.length * 1.5)),
          marksPerQuestion: 1,
          negativeMarking: 0,
        },
      });
    }
  };

  const totalQuestions = (savedQuizzes || []).reduce((acc, curr) => acc + (curr.questionCount || 0), 0);

  return (
    <div className="flex-1 flex flex-col w-full max-w-md md:max-w-2xl mx-auto space-y-6 pb-28 pt-2">
      {/* Header */}
      <section className="pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
              My Library 📚
            </h1>
          </div>
          <button
            onClick={() => onSwitchTab('create')}
            className="px-3.5 py-2 rounded-xl bg-primary text-on-primary font-headline text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Create New
          </button>
        </div>
      </section>



      {/* Subtab Navigation Pills */}
      <section className="flex items-center gap-2 p-1 rounded-2xl bg-surface-container-low border border-surface-container-high/60">
        <button
          onClick={() => setActiveSubTab('quizzes')}
          className={`flex-1 py-2 rounded-xl font-headline font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSubTab === 'quizzes'
              ? 'bg-surface-container-lowest text-on-surface shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">folder_open</span>
          <span>Saved Quizzes ({savedQuizzes?.length || 0})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('reviewLater')}
          className={`flex-1 py-2 rounded-xl font-headline font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSubTab === 'reviewLater'
              ? 'bg-surface-container-lowest text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">bookmark</span>
          <span>Review Later ({bookmarkedQuestions?.length || 0})</span>
        </button>
      </section>

      {/* Search Input */}
      <section className="relative">
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">
          search
        </span>
        <input
          type="text"
          placeholder={activeSubTab === 'quizzes' ? "Search saved quizzes by title..." : "Search review later MCQs..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface-container-lowest border border-surface-container-high font-body text-xs text-on-surface placeholder:text-outline/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[16px]">cancel</span>
          </button>
        )}
      </section>

      {/* TAB 1: SAVED QUIZZES LIST */}
      {activeSubTab === 'quizzes' && (
        <section className="space-y-3">
          {savedQuizzes === undefined ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-surface-container-high p-8 flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-container-high/50 flex items-center justify-center text-outline">
                <span className="material-symbols-outlined text-3xl">local_library</span>
              </div>
              <div>
                <h3 className="font-headline font-semibold text-sm text-on-surface">
                  {searchQuery ? 'No matching quizzes found' : 'Your library is empty'}
                </h3>
                <p className="text-xs font-body text-outline mt-1 max-w-xs">
                  {searchQuery
                    ? 'Try searching with a different keyword.'
                    : 'Create or import a quiz, then tap "Save Quiz" to keep it in your library.'}
                </p>
              </div>
              {!searchQuery && (
                <button
                  onClick={() => onSwitchTab('create')}
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary font-headline text-xs font-semibold shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
                >
                  Create First Quiz
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuizzes.map((sq) => {
                const formattedDate = new Date(sq.savedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div
                    key={sq.id}
                    className="group rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-surface-container-high transition-all"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-headline font-semibold text-base text-on-surface tracking-tight">
                          {sq.quiz_title}
                        </h3>
                        <p className="text-xs text-outline font-body mt-0.5">
                          Saved on {formattedDate}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setPreviewQuiz(sq)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
                          title="Preview Questions"
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                        <button
                          onClick={() => setQuizToDelete(sq)}
                          disabled={deletingId === sq.id}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-outline/70 hover:text-error hover:bg-error/10 transition-all cursor-pointer"
                          title="Delete Quiz"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {deletingId === sq.id ? 'hourglass_empty' : 'delete_outline'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-headline font-medium">
                        <span className="material-symbols-outlined text-[14px]">quiz</span>
                        {sq.questionCount} Questions
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartExam(sq)}
                        className="flex-1 h-9 rounded-xl bg-primary text-on-primary font-headline text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                        Start Exam
                      </button>
                      <button
                        onClick={() => setPreviewQuiz(sq)}
                        className="px-3 h-9 rounded-xl bg-surface-container-low text-on-surface-variant hover:text-on-surface font-headline text-xs font-medium transition-all cursor-pointer"
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: REVIEW LATER (BOOKMARKED MCQs) */}
      {activeSubTab === 'reviewLater' && (
        <section className="space-y-4">
          {bookmarkedQuestions && bookmarkedQuestions.length > 0 && (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-headline font-semibold">
                <span className="material-symbols-outlined text-[18px]">bookmark</span>
                <span>{bookmarkedQuestions.length} Saved Review Questions</span>
              </div>
              <button
                onClick={handlePracticeBookmarks}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-white font-headline text-xs font-semibold flex items-center gap-1 shadow-xs hover:bg-amber-600 active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">play_arrow</span>
                Practice All
              </button>
            </div>
          )}

          {bookmarkedQuestions === undefined ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredBookmarks.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-surface-container-high p-8 flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <span className="material-symbols-outlined text-3xl">bookmark_border</span>
              </div>
              <div>
                <h3 className="font-headline font-semibold text-sm text-on-surface">
                  {searchQuery ? 'No matching review questions found' : 'No Review Later questions'}
                </h3>
                <p className="text-xs font-body text-outline mt-1 max-w-xs">
                  {searchQuery
                    ? 'Try searching with a different keyword.'
                    : 'During an exam, tap "Review Later" under any question to save it here for revision.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-4 space-y-3 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-headline text-[11px] font-semibold">
                        {bm.quiz_title}
                      </span>
                    </div>

                    <button
                      onClick={() => setBookmarkToDelete(bm)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-outline/70 hover:text-error hover:bg-error/10 transition-all shrink-0 cursor-pointer"
                      title="Remove from Review Later"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>

                  <h4 className="font-headline font-semibold text-sm text-on-surface leading-snug">
                    {bm.question_text}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                    {bm.options.map((opt, optIdx) => {
                      const isCorrect = optIdx === bm.correct_answer;
                      return (
                        <div
                          key={optIdx}
                          className={`p-2 rounded-xl text-xs font-body border flex items-center justify-between ${
                            isCorrect
                              ? 'bg-tertiary-container/40 border-tertiary/40 text-on-tertiary-container font-semibold'
                              : 'bg-surface-container-lowest border-surface-container/60 text-outline'
                          }`}
                        >
                          <span>
                            <span className="mr-1.5 opacity-70">
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            {opt}
                          </span>
                          {isCorrect && (
                            <span className="material-symbols-outlined text-[14px] text-tertiary">check_circle</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {bm.explanation && (
                    <div className="p-2.5 rounded-xl bg-surface-container-low border border-surface-container-high/60 text-[11px] font-body text-on-surface-variant leading-relaxed">
                      <strong className="text-on-surface">Explanation: </strong>
                      {bm.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Saved Quiz Delete Confirmation */}
      {quizToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && deletingId === null) setQuizToDelete(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-quiz-title"
            aria-describedby="delete-quiz-description"
            className="w-full max-w-xs rounded-2xl bg-surface-container-lowest border border-error/30 p-5 space-y-4 shadow-2xl"
          >
            <div className="text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-error/20 text-error flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-xl">delete_forever</span>
              </div>
              <h3 id="delete-quiz-title" className="font-headline font-semibold text-base text-on-surface">
                Delete Quiz?
              </h3>
              <p id="delete-quiz-description" className="text-xs font-body text-outline leading-relaxed">
                This will permanently delete <strong>{quizToDelete.quiz_title}</strong> from your library. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuizToDelete(null)}
                disabled={deletingId !== null}
                className="flex-1 h-10 rounded-xl bg-surface-container-low text-on-surface font-headline text-xs font-semibold hover:bg-surface-container transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => quizToDelete.id !== undefined && handleDelete(quizToDelete.id, quizToDelete.quiz_title)}
                disabled={quizToDelete.id === undefined || deletingId !== null}
                className="flex-1 h-10 rounded-xl bg-error text-on-error font-headline text-xs font-semibold shadow-xs hover:bg-error/90 transition-all cursor-pointer disabled:cursor-wait disabled:opacity-70"
              >
                {deletingId !== null ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Review Later Delete Confirmation */}
      {bookmarkToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && deletingId === null) setBookmarkToDelete(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-review-title"
            aria-describedby="delete-review-description"
            className="w-full max-w-xs rounded-2xl bg-surface-container-lowest border border-error/30 p-5 space-y-4 shadow-2xl"
          >
            <div className="text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-error/20 text-error flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-xl">delete_forever</span>
              </div>
              <h3 id="delete-review-title" className="font-headline font-semibold text-base text-on-surface">
                Remove Question?
              </h3>
              <p id="delete-review-description" className="text-xs font-body text-outline leading-relaxed">
                This question will be permanently removed from Review Later. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBookmarkToDelete(null)}
                disabled={deletingId !== null}
                className="flex-1 h-10 rounded-xl bg-surface-container-low text-on-surface font-headline text-xs font-semibold hover:bg-surface-container transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => bookmarkToDelete.id !== undefined && handleDeleteBookmark(bookmarkToDelete.id)}
                disabled={bookmarkToDelete.id === undefined || deletingId !== null}
                className="flex-1 h-10 rounded-xl bg-error text-on-error font-headline text-xs font-semibold shadow-xs hover:bg-error/90 transition-all cursor-pointer disabled:cursor-wait disabled:opacity-70"
              >
                {deletingId !== null ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Preview Quiz Modal */}
      {previewQuiz && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg max-h-[85vh] rounded-3xl bg-surface-container-lowest border border-surface-container/80 p-5 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-surface-container/80">
              <div>
                <h3 className="font-headline font-bold text-lg text-on-surface">
                  {previewQuiz.quiz_title}
                </h3>
                <p className="text-xs text-outline font-body mt-0.5">
                  {previewQuiz.questionCount} Questions Preview
                </p>
              </div>
              <button
                onClick={() => setPreviewQuiz(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Questions List scrollable */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {previewQuiz.quiz_data.questions.map((q, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-surface-container-low/60 border border-surface-container/60 p-4 space-y-2.5"
                >
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-md bg-primary/10 text-primary font-headline font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="font-headline font-medium text-xs text-on-surface leading-relaxed">
                      {q.question || q.question_text}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-7">
                    {q.options.map((opt, optIdx) => {
                      const correctAns = typeof q.correct_answer === 'number' ? q.correct_answer : q.correct_answer_index;
                      const isCorrect = optIdx === correctAns;
                      return (
                        <div
                          key={optIdx}
                          className={`p-2 rounded-xl text-xs font-body border ${
                            isCorrect
                              ? 'bg-tertiary-container/40 border-tertiary/40 text-on-tertiary-container font-semibold'
                              : 'bg-surface-container-lowest border-surface-container/60 text-outline'
                          }`}
                        >
                          <span className="mr-1.5 opacity-70">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          {opt}
                          {isCorrect && ' ✓'}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div className="ml-7 p-2.5 rounded-xl bg-surface-container-lowest border border-surface-container/40 text-[11px] font-body text-outline leading-relaxed">
                      <strong className="text-on-surface">Explanation: </strong>
                      {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-surface-container/80 flex items-center gap-2">
              <button
                onClick={() => setPreviewQuiz(null)}
                className="flex-1 h-10 rounded-xl bg-surface-container-low text-on-surface font-headline text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const target = previewQuiz;
                  setPreviewQuiz(null);
                  handleStartExam(target);
                }}
                className="flex-1 h-10 rounded-xl bg-primary text-on-primary font-headline text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs hover:bg-primary/90"
              >
                <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                Start Exam Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
