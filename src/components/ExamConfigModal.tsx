import React, { useState } from 'react';
import { Quiz } from '../types';

interface ExamConfigModalProps {
  quiz: Quiz;
  isOpen: boolean;
  onClose: () => void;
  onConfirmStart: (config: {
    durationMinutes: number;
    marksPerQuestion: number;
    negativeMarking: number;
  }) => void;
}

const TIMER_PRESETS = [5, 10, 15, 20, 30, 60];

export default function ExamConfigModal({
  quiz,
  isOpen,
  onClose,
  onConfirmStart,
}: ExamConfigModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<number | 'custom' | 'none'>(10);
  const [customMinutes, setCustomMinutes] = useState<string>('15');
  const [marksPerQuestion, setMarksPerQuestion] = useState<number>(1);
  const [negativeMarking, setNegativeMarking] = useState<number>(0);

  if (!isOpen) return null;

  const getFinalDuration = (): number => {
    if (selectedPreset === 'none') return 0; // 0 = unlimited time
    if (selectedPreset === 'custom') {
      const parsed = parseInt(customMinutes, 10);
      return isNaN(parsed) || parsed <= 0 ? 10 : Math.min(180, parsed);
    }
    return selectedPreset;
  };

  const handleStart = () => {
    const durationMinutes = getFinalDuration();
    onConfirmStart({
      durationMinutes,
      marksPerQuestion,
      negativeMarking,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-surface-container-lowest border border-surface-container/80 p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-headline font-semibold text-primary uppercase tracking-wider">
              Exam Configuration
            </span>
            <h2 className="font-headline text-xl font-bold text-on-surface mt-0.5">
              {quiz.quiz_title}
            </h2>
            <p className="text-xs text-outline font-body mt-0.5">
              {quiz.questions.length} Questions • Configure session parameters before starting
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Section: Timer Option */}
        <div className="space-y-3">
          <label className="text-xs font-headline font-semibold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">timer</span>
            Timer Setup
          </label>

          {/* Preset Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {TIMER_PRESETS.map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setSelectedPreset(mins)}
                className={`h-10 rounded-xl font-headline text-xs font-semibold transition-all ${
                  selectedPreset === mins
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {mins} Mins
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedPreset('custom')}
              className={`h-10 rounded-xl font-headline text-xs font-semibold transition-all ${
                selectedPreset === 'custom'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              Custom
            </button>
            <button
              type="button"
              onClick={() => setSelectedPreset('none')}
              className={`h-10 rounded-xl font-headline text-xs font-semibold transition-all ${
                selectedPreset === 'none'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              No Limit
            </button>
          </div>

          {/* Custom timer input if selected */}
          {selectedPreset === 'custom' && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                min="1"
                max="180"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                placeholder="Minutes"
                className="flex-1 h-10 px-3.5 rounded-xl bg-surface-container-low border border-surface-container-high font-body text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <span className="text-xs text-outline font-headline">minutes</span>
            </div>
          )}
        </div>

        {/* Section: Marks & Penalties */}
        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-surface-container/60">
          <div>
            <label className="text-[11px] font-headline font-semibold text-outline block mb-1.5">
              Marks per Question
            </label>
            <select
              value={marksPerQuestion}
              onChange={(e) => setMarksPerQuestion(parseFloat(e.target.value))}
              className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-surface-container-high text-xs font-headline text-on-surface focus:outline-none focus:border-primary"
            >
              <option value={1}>1 Mark</option>
              <option value={2}>2 Marks</option>
              <option value={5}>5 Marks</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-headline font-semibold text-outline block mb-1.5">
              Negative Marking
            </label>
            <select
              value={negativeMarking}
              onChange={(e) => setNegativeMarking(parseFloat(e.target.value))}
              className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-surface-container-high text-xs font-headline text-on-surface focus:outline-none focus:border-primary"
            >
              <option value={0}>None (0)</option>
              <option value={0.25}>-0.25 Marks</option>
              <option value={0.5}>-0.50 Marks</option>
              <option value={1}>-1.00 Mark</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-surface-container-low text-on-surface font-headline text-xs font-semibold hover:bg-surface-container transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStart}
            className="flex-1 h-11 rounded-xl bg-primary text-on-primary font-headline text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">play_arrow</span>
            Start Quiz Exam
          </button>
        </div>
      </div>
    </div>
  );
}
