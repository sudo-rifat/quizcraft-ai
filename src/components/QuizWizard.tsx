import React, { useState, useRef, useEffect } from 'react';
import StitchSelect from './StitchSelect';
import { Quiz } from '../types';
import { db } from '../db/db';
import { useActiveProfile } from '../context/ProfileContext';

interface QuizWizardProps {
  onStartExam: (data: { quiz: Quiz; config: any }) => void;
  showToast: (type: string, message: string) => void;
}

export default function QuizWizard({ onStartExam, showToast }: QuizWizardProps) {
  const { activeProfileId } = useActiveProfile();
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Topic Data
  const [grade, setGrade] = useState('নবম-দশম (SSC)');
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [topic, setTopic] = useState('');

  // Step 2: Difficulty & Settings
  const [difficulty, setDifficulty] = useState('intermediate');
  const [count, setCount] = useState('10');
  const [duration, setDuration] = useState('10');
  const [marks, setMarks] = useState('1');
  const [negative, setNegative] = useState('0');
  const [includeMissed, setIncludeMissed] = useState(true);

  // Step 3: Prompt & JSON
  const [promptText, setPromptText] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [validation, setValidation] = useState<{ isValid: boolean; message: string; parsed: Quiz | null }>({ isValid: false, message: '', parsed: null });

  // Generate AI Prompt
  useEffect(() => {
    if (step === 3) {
      const sub = subject.trim() || 'Physics';
      const ch = chapter.trim() || 'Chapter 4';
      const top = topic.trim() || 'Core Concepts';

      const text = `Act as an expert Academic Educator. Generate exactly ${count} Multiple Choice Questions (MCQs) in Bengali for Level: ${grade}, Subject: "${sub}", Chapter: "${ch}", Specific Topics: "${top}", Difficulty: ${difficulty}.

CRITICAL INSTRUCTIONS:
1. You MUST return ONLY valid JSON. Absolutely no markdown blocks, no \`\`\`json, no introductory or concluding text. 
2. The very first character of your response MUST be "{" and the last MUST be "}".
3. Ensure all keys and string values are enclosed in double quotes (").
4. Ensure the JSON is well-formed with correct commas.
5. "correct_answer" MUST be an integer between 0 and 3, representing the 0-indexed position in the "options" array.
6. "options" MUST contain exactly 4 unique strings.
7. "id" MUST be an integer starting from 1.

STRICT JSON STRUCTURE TO FOLLOW:
{
  "quiz_title": "${sub}: ${ch} (${top})",
  "questions": [
    {
      "id": 1,
      "question": "Sample Question Text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Short explanation for the correct answer"
    }
  ]
}`;
      setPromptText(text);
    }
  }, [step, grade, subject, chapter, topic, count, difficulty]);

  // JSON Validation
  useEffect(() => {
    const text = jsonText.trim();
    if (!text) {
      setValidation({ isValid: false, message: 'JSON Data required.', parsed: null });
      return;
    }

    try {
      let sanitizedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      // Temporarily mask double backslashes so we don't double-escape them
      sanitizedText = sanitizedText.replace(/\\\\/g, '@@DOUBLE_SLASH@@');

      // Auto-escape LaTeX macros that start with valid JSON escape characters
      sanitizedText = sanitizedText.replace(/\\(text|tan|theta|tau|times|to|top|triangle|tilde|nu|nabla|neq|ni|notin|rho|right|rangle|rightarrow|frac|forall|flat|beta|bot|bullet|bar|bf)/g, '\\\\$1');

      // Auto-escape unescaped backslashes for other LaTeX
      sanitizedText = sanitizedText.replace(/\\([^"\\/bfnrtu])/g, '\\\\$1');

      // Restore the double backslashes
      sanitizedText = sanitizedText.replace(/@@DOUBLE_SLASH@@/g, '\\\\');

      const parsed = JSON.parse(sanitizedText);

      if (!parsed.quiz_title || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        throw new Error("Invalid structure: missing 'quiz_title' or 'questions' array.");
      }

      parsed.questions.forEach((q: any, idx: number) => {
        if (!q.question || !Array.isArray(q.options) || q.options.length < 2) {
          throw new Error(`Question ${idx + 1}: Invalid question or options array.`);
        }
        if (typeof q.correct_answer !== 'number' || q.correct_answer < 0 || q.correct_answer >= q.options.length) {
          throw new Error(`Question ${idx + 1}: Invalid correct answer index.`);
        }
      });

      setValidation({ isValid: true, message: `JSON Valid (${parsed.questions.length} Questions)`, parsed });
    } catch (err: any) {
      setValidation({ isValid: false, message: err.message, parsed: null });
    }
  }, [jsonText]);

  const handleFixJson = () => {
    let fixed = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    fixed = fixed.replace(/\\\\/g, '@@DOUBLE_SLASH@@');
    fixed = fixed.replace(/\\(text|tan|theta|tau|times|to|top|triangle|tilde|nu|nabla|neq|ni|notin|rho|right|rangle|rightarrow|frac|forall|flat|beta|bot|bullet|bar|bf)/g, '\\\\$1');
    fixed = fixed.replace(/\\([^"\\/bfnrtu])/g, '\\\\$1');
    fixed = fixed.replace(/@@DOUBLE_SLASH@@/g, '\\\\');

    try {
      JSON.parse(fixed);
      setJsonText(fixed);
      showToast('success', 'JSON formatting fixed automatically!');
    } catch (e) {
      showToast('error', 'Could not fix automatically. Please check the data manually.');
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(promptText).then(() => {
      showToast('success', 'Prompt copied! Paste it into Gemini or ChatGPT.');
    }).catch(() => {
      showToast('info', 'Failed to copy prompt.');
    });
  };

  const handleFileUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setJsonText(e.target?.result as string);
    reader.readAsText(file);
  };

  const handleStartExam = () => {
    if (!validation.isValid || !validation.parsed) return;

    onStartExam({
      quiz: validation.parsed,
      config: {
        durationMinutes: parseInt(duration) || 10,
        marksPerQuestion: parseFloat(marks) || 1,
        negativeMarking: parseFloat(negative) || 0
      }
    });
  };

  const handleSaveQuiz = async () => {
    if (!validation.isValid || !validation.parsed || !activeProfileId) return;
    setIsSaving(true);
    try {
      // Check if a quiz with same title already saved for this profile
      const existing = await db.quizzes
        .where('profileId').equals(activeProfileId)
        .filter(q => q.quiz_title === validation.parsed!.quiz_title)
        .first();

      if (existing) {
        showToast('warning', `"${validation.parsed.quiz_title}" is already saved in your library!`);
        return;
      }

      await db.quizzes.add({
        profileId: activeProfileId,
        quiz_title: validation.parsed.quiz_title,
        quiz_data: validation.parsed,
        savedAt: new Date().toISOString(),
        questionCount: validation.parsed.questions.length,
      });
      showToast('success', `Quiz saved to your library! ✓`);
      // Reset step 3 so they can create another
      setJsonText('');
    } catch (err: any) {
      showToast('error', 'Failed to save quiz. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 w-full pb-28 max-w-md mx-auto flex flex-col space-y-5">
      {/* Wizard Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-headline">
          <span className="font-semibold text-on-surface">Create Quiz</span>
          <span className="text-outline">Step {step} of 3</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 w-full">
          <div className={`h-1.5 rounded-full transition-all ${step >= 1 ? 'bg-primary' : 'bg-surface-container-highest'}`}></div>
          <div className={`h-1.5 rounded-full transition-all ${step >= 2 ? 'bg-primary' : 'bg-surface-container-highest'}`}></div>
          <div className={`h-1.5 rounded-full transition-all ${step >= 3 ? 'bg-primary' : 'bg-surface-container-highest'}`}></div>
        </div>
      </div>

      {/* Selected Context Chip */}
      <div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low border border-surface-container-high/80 text-xs text-on-surface-variant font-medium">
          <span className="material-symbols-outlined text-[15px] text-primary">menu_book</span>
          {subject || 'Physics'} • {chapter || 'General Chapter'}
        </span>
      </div>

      {/* Step 1: Subject & Topic Details */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-headline text-2xl font-bold text-on-surface tracking-tight">
              Topic & Details
            </h2>
            <p className="text-sm text-on-surface-variant mt-1 font-body">
              Specify class, subject, and topic to generate questions
            </p>
          </div>

          <div className="space-y-3.5 pt-2">
            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Class / Level
              </label>
              <StitchSelect
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                options={[
                  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
                  'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10',
                  'Class 11', 'Class 12',
                  'Admission Test', 'Job / BCS', 'General Learning'
                ]}
                className="w-full h-11 px-4 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  placeholder="Physics"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-surface-container-lowest border border-outline-variant text-sm font-body text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                  Chapter
                </label>
                <input
                  type="text"
                  placeholder="Chapter 4"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-surface-container-lowest border border-outline-variant text-sm font-body text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Specific Topics
              </label>
              <textarea
                placeholder="e.g. Modern Physics, Atomic Models"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={2}
                className="w-full p-3 rounded-xl bg-surface-container-lowest border border-outline-variant text-sm font-body text-on-surface focus:outline-none focus:border-primary resize-none"
              ></textarea>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Difficulty Selection & Quiz Settings */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-headline text-2xl font-bold text-on-surface tracking-tight">
              Select Difficulty
            </h2>
            <p className="text-sm text-on-surface-variant mt-1 font-body">
              Choose the challenge level for this quiz
            </p>
          </div>

          {/* Difficulty Interactive Cards */}
          <div className="flex flex-col gap-3">
            {/* Beginner */}
            <div
              onClick={() => setDifficulty('beginner')}
              className={`group relative flex items-center justify-between p-4 rounded-xl bg-surface-container-lowest cursor-pointer transition-all active:scale-[0.99] ${difficulty === 'beginner'
                  ? 'border-2 border-primary shadow-sm'
                  : 'border border-outline-variant/60 hover:border-outline'
                }`}
            >
              <div className="flex items-center gap-3.5 pr-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${difficulty === 'beginner' ? 'bg-primary/10 text-primary' : 'bg-surface-container text-outline'
                  }`}>
                  <span className="material-symbols-outlined text-[20px]">eco</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className={`font-headline font-semibold text-base ${difficulty === 'beginner' ? 'text-primary' : 'text-on-surface'}`}>
                      Beginner
                    </h3>
                    <span className="text-xs text-outline font-normal">/ সহজ</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5 leading-snug">
                    Core fundamentals & definitions
                  </p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${difficulty === 'beginner' ? 'bg-primary text-on-primary shadow-xs' : 'border-2 border-outline-variant'
                }`}>
                {difficulty === 'beginner' && <span className="material-symbols-outlined text-[14px] font-bold">check</span>}
              </div>
            </div>

            {/* Intermediate */}
            <div
              onClick={() => setDifficulty('intermediate')}
              className={`group relative flex items-center justify-between p-4 rounded-xl bg-surface-container-lowest cursor-pointer transition-all active:scale-[0.99] ${difficulty === 'intermediate'
                  ? 'border-2 border-primary shadow-sm'
                  : 'border border-outline-variant/60 hover:border-outline'
                }`}
            >
              <div className="flex items-center gap-3.5 pr-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${difficulty === 'intermediate' ? 'bg-primary/10 text-primary' : 'bg-surface-container text-outline'
                  }`}>
                  <span className="material-symbols-outlined text-[20px]">trending_up</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className={`font-headline font-semibold text-base ${difficulty === 'intermediate' ? 'text-primary' : 'text-on-surface'}`}>
                      Intermediate
                    </h3>
                    <span className="text-xs text-primary/80 font-normal">/ মধ্যম</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5 leading-snug">
                    Board exam & standard university entrance level
                  </p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${difficulty === 'intermediate' ? 'bg-primary text-on-primary shadow-xs' : 'border-2 border-outline-variant'
                }`}>
                {difficulty === 'intermediate' && <span className="material-symbols-outlined text-[14px] font-bold">check</span>}
              </div>
            </div>

            {/* Advanced */}
            <div
              onClick={() => setDifficulty('advanced')}
              className={`group relative flex items-center justify-between p-4 rounded-xl bg-surface-container-lowest cursor-pointer transition-all active:scale-[0.99] ${difficulty === 'advanced'
                  ? 'border-2 border-primary shadow-sm'
                  : 'border border-outline-variant/60 hover:border-outline'
                }`}
            >
              <div className="flex items-center gap-3.5 pr-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${difficulty === 'advanced' ? 'bg-primary/10 text-primary' : 'bg-surface-container text-outline'
                  }`}>
                  <span className="material-symbols-outlined text-[20px]">bolt</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className={`font-headline font-semibold text-base ${difficulty === 'advanced' ? 'text-primary' : 'text-on-surface'}`}>
                      Advanced
                    </h3>
                    <span className="text-xs text-outline font-normal">/ কঠিন</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5 leading-snug">
                    Olympiad & competitive engineering test questions
                  </p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${difficulty === 'advanced' ? 'bg-primary text-on-primary shadow-xs' : 'border-2 border-outline-variant'
                }`}>
                {difficulty === 'advanced' && <span className="material-symbols-outlined text-[14px] font-bold">check</span>}
              </div>
            </div>
          </div>

          {/* Quick Settings Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Questions Count
              </label>
              <StitchSelect
                value={count}
                onChange={(e) => setCount(e.target.value)}
                options={[
                  { value: '5', label: '5 Questions' },
                  { value: '10', label: '10 Questions' },
                  { value: '20', label: '20 Questions' },
                  { value: '30', label: '30 Questions' }
                ]}
                className="w-full h-10 px-3 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Duration (Mins)
              </label>
              <StitchSelect
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                options={[
                  { value: '5', label: '5 Minutes' },
                  { value: '10', label: '10 Minutes' },
                  { value: '15', label: '15 Minutes' },
                  { value: '20', label: '20 Minutes' }
                ]}
                className="w-full h-10 px-3 text-xs"
              />
            </div>
          </div>

          {/* Optional Review Toggle */}
          <div className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl p-3.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3 pr-2">
              <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">replay</span>
              </div>
              <div>
                <label className="text-xs font-semibold text-on-surface block cursor-pointer">
                  Include previously missed questions
                </label>
                <p className="text-[11px] text-outline mt-0.5">Focus revision on your previous weak points</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={includeMissed}
              onChange={(e) => setIncludeMissed(e.target.checked)}
              className="accent-primary w-4 h-4 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Step 3: AI Prompt & JSON Load */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-headline text-2xl font-bold text-on-surface tracking-tight">
              Generate & Import
            </h2>
            <p className="text-sm text-on-surface-variant mt-1 font-body">
              Copy prompt for AI or paste your generated quiz JSON
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopyPrompt}
              className="flex-1 h-11 rounded-xl bg-surface-container-low border border-surface-container-high text-primary font-headline text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-surface-container transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">content_copy</span>
              <span>Copy AI Prompt</span>
            </button>

            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={(e) => handleFileUpload(e.target.files?.[0])} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 h-11 rounded-xl bg-surface-container-lowest border border-outline-variant text-on-surface font-headline text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-surface-container transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              <span>Import JSON</span>
            </button>
          </div>

          {/* Validation Alert */}
          {!validation.isValid && jsonText && (
            <div className="p-3 rounded-xl bg-error-container text-on-error-container border border-error/20 flex items-center justify-between">
              <span className="text-xs font-headline font-semibold">Invalid JSON format. Please paste raw quiz JSON.</span>
              <button onClick={handleFixJson} className="px-2.5 py-1 bg-error text-on-error text-[10px] font-headline font-bold rounded-lg cursor-pointer">
                Fix Format
              </button>
            </div>
          )}

          {/* JSON Textarea */}
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder="Paste quiz JSON string here..."
            rows={6}
            className={`w-full p-3 font-mono text-xs rounded-xl bg-surface-container-lowest border-2 focus:outline-none transition-all resize-none ${validation.isValid ? 'border-tertiary focus:border-tertiary' : jsonText ? 'border-error focus:border-error' : 'border-outline-variant focus:border-primary'
              }`}
          />
        </div>
      )}

      {/* Fixed Bottom Wizard Actions */}
      <footer className="fixed bottom-0 left-0 w-full z-40 pb-safe bg-surface/95 backdrop-blur-lg border-t border-surface-container-high/70">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button
            disabled={step === 1}
            onClick={() => setStep(prev => prev - 1)}
            className="h-11 px-5 rounded-xl border border-surface-container-high bg-surface-container-lowest text-on-surface font-label text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Back</span>
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(prev => prev + 1)}
              className="flex-1 h-11 rounded-xl bg-primary text-on-primary font-label text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm hover:bg-primary-container active:scale-[0.98] transition-all cursor-pointer"
              type="button"
            >
              <span>Continue</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          ) : (
            <div className="flex-1 flex items-center gap-2">
              <button
                onClick={handleSaveQuiz}
                disabled={!validation.isValid || isSaving}
                className="flex-1 h-11 rounded-xl bg-surface-container-low border border-surface-container-high text-on-surface font-label text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">{isSaving ? 'hourglass_empty' : 'bookmark_add'}</span>
                <span>{isSaving ? 'Saving...' : 'Save Quiz'}</span>
              </button>
              <button
                onClick={handleStartExam}
                disabled={!validation.isValid}
                className="flex-1 h-11 rounded-xl bg-primary text-on-primary font-label text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                <span>Start Exam</span>
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
