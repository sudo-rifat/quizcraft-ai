import React, { useState, useRef, useEffect } from 'react';
import StitchSelect from './StitchSelect';
import { Quiz } from '../types';
import { db } from '../db/db';
import { useActiveProfile } from '../context/ProfileContext';

interface QuizWizardProps {
  onStartExam: (data: { quiz: Quiz; config: any }) => void;
  onRequestStartExam?: (quiz: Quiz) => void;
  onSwitchTab?: (tabId: string) => void;
  showToast: (type: string, message: string) => void;
}

export default function QuizWizard({ onStartExam, onRequestStartExam, onSwitchTab, showToast }: QuizWizardProps) {
  const { activeProfile, activeProfileId } = useActiveProfile();
  const [creationMode, setCreationMode] = useState<'topic' | 'readymade_text' | 'readymade_image' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableSubjects = activeProfile?.subjects && activeProfile.subjects.length > 0
    ? activeProfile.subjects
    : ['Physics', 'Chemistry', 'Higher Math', 'Biology', 'ICT', 'English'];

  // Topic Mode State
  const [grade, setGrade] = useState(() => activeProfile?.grade || 'Class 10');
  const [subject, setSubject] = useState(() => availableSubjects[0] || 'Physics');
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [chapter, setChapter] = useState('');
  const [topic, setTopic] = useState('');

  // Readymade Text Mode State
  const [readymadeTitle, setReadymadeTitle] = useState('');
  const [readymadeText, setReadymadeText] = useState('');

  // Step 2: Difficulty & Settings
  const [difficulty, setDifficulty] = useState('intermediate');
  const [count, setCount] = useState('10');
  const [duration, setDuration] = useState('10');
  const [marks, setMarks] = useState('1');
  const [negative, setNegative] = useState('0');

  // Step 3: Prompt & JSON
  const [promptText, setPromptText] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [validation, setValidation] = useState<{ isValid: boolean; message: string; parsed: Quiz | null }>({ isValid: false, message: '', parsed: null });

  useEffect(() => {
    if (activeProfile?.grade) {
      setGrade(activeProfile.grade);
    }
    if (activeProfile?.subjects && activeProfile.subjects.length > 0) {
      if (!subject || (!isCustomSubject && !activeProfile.subjects.includes(subject))) {
        setSubject(activeProfile.subjects[0]);
      }
    }
  }, [activeProfile?.grade, activeProfile?.subjects]);

  // Generate AI Prompt tailored to the exact Creation Mode
  useEffect(() => {
    if (step === 3) {
      if (creationMode === 'readymade_image') {
        const text = `Act as an expert Academic Educator and Vision OCR Assistant. I am attaching an image from a book, exam paper, or notebook.

SMART DETECTION RULES:
- If the image contains ready-made MCQs (questions with options A/B/C/D): Extract them exactly as they appear, identify the correct answer for each, and write a short Bengali explanation.
- If the image contains a text passage, paragraph, or notes (no pre-made options): Generate exactly ${count} Multiple Choice Questions (MCQs) from that content. Create 4 options (A/B/C/D) for each question, mark the correct answer, and write a short Bengali explanation.
- If the image contains BOTH MCQs and a passage: First extract the existing MCQs, then generate additional MCQs from the passage content — targeting ${count} questions total.

INSTRUCTIONS:
1. Apply the Smart Detection Rules above based on what you see in the image.
2. All questions and options should be in Bengali (or the same language as the image content).
3. Respond ONLY with a raw, valid JSON object strictly matching this schema (no markdown fences, no explanatory text outside JSON):

{
  "quiz_title": "Image MCQ Quiz",
  "questions": [
    {
      "id": 1,
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Short Bengali explanation of why this answer is correct."
    }
  ]
}`;
        setPromptText(text);
      } else if (creationMode === 'readymade_text') {
        const title = readymadeTitle.trim() || 'Readymade MCQ Quiz';
        const rawContent = readymadeText.trim() || 'Paste raw MCQs here';

        const text = `Act as an expert Academic Educator. I am providing you raw text that may contain ready-made MCQs or plain notes/passages.

Quiz Title: "${title}"
Target Question Count: ${count}

SMART DETECTION RULES:
- If the text already contains MCQs (questions with options): Extract them directly, identify the correct answer, and write a short Bengali explanation for each.
- If the text is a passage, notes, or paragraph (no pre-made options): Generate exactly ${count} MCQs from the content with 4 options (A/B/C/D) each.
- If the text contains BOTH MCQs and passage content: Extract existing MCQs first, then generate additional questions from the passage — targeting ${count} questions total.

RAW INPUT:
----------------------------------------
${rawContent}
----------------------------------------

IMPORTANT: Respond ONLY with a raw, valid JSON object strictly matching this schema (no markdown fences, no explanatory text):
{
  "quiz_title": "${title}",
  "questions": [
    {
      "id": 1,
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Short Bengali explanation of why this answer is correct."
    }
  ]
}`;
        setPromptText(text);
      } else {
        const sub = subject.trim() || 'Physics';
        const ch = chapter.trim() || 'Chapter 4';
        const top = topic.trim() || 'Core Concepts';

        const text = `Act as an expert Academic Educator. Generate exactly ${count} Multiple Choice Questions (MCQs) in Bengali for Level: ${grade}, Subject: "${sub}", Chapter: "${ch}", Specific Topics: "${top}", Difficulty: ${difficulty}.

IMPORTANT: You MUST respond ONLY with a raw, valid JSON object strictly matching this schema format (no markdown fences, no explanatory text):
{
  "quiz_title": "${sub}: ${ch} - ${top}",
  "questions": [
    {
      "id": 1,
      "question": "Question text in Bengali?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Short Bengali explanation of why this answer is correct."
    }
  ]
}`;
        setPromptText(text);
      }
    }
  }, [step, creationMode, grade, subject, chapter, topic, count, difficulty, readymadeTitle, readymadeText, count]);

  // Auto-validate JSON input
  useEffect(() => {
    if (!jsonText.trim()) {
      setValidation({ isValid: false, message: '', parsed: null });
      return;
    }

    try {
      const cleaned = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (parsed && parsed.quiz_title && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        setValidation({ isValid: true, message: '✓ Valid Quiz Format', parsed });
      } else {
        setValidation({ isValid: false, message: 'Missing required quiz_title or questions array.', parsed: null });
      }
    } catch (e: any) {
      setValidation({ isValid: false, message: 'JSON Syntax Error: ' + e.message, parsed: null });
    }
  }, [jsonText]);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(promptText);
    showToast('success', 'AI Prompt copied to clipboard! Paste in ChatGPT/Gemini.');
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setReadymadeText(text);
        showToast('success', 'Pasted content from clipboard!');
      }
    } catch (err) {
      showToast('error', 'Clipboard access permission required.');
    }
  };

  const handleFileUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setJsonText(e.target?.result as string);
    reader.readAsText(file);
  };

  const handleStartExam = () => {
    if (!validation.isValid || !validation.parsed) return;

    if (onRequestStartExam) {
      onRequestStartExam(validation.parsed);
    } else {
      onStartExam({
        quiz: validation.parsed,
        config: {
          durationMinutes: parseInt(duration) || 10,
          marksPerQuestion: parseFloat(marks) || 1,
          negativeMarking: parseFloat(negative) || 0
        }
      });
    }
  };

  const handleSaveQuiz = async () => {
    if (!validation.isValid || !validation.parsed || !activeProfileId) return;

    setIsSaving(true);
    try {
      const existing = await db.quizzes
        .where('profileId')
        .equals(activeProfileId)
        .filter((q) => q.quiz_title === validation.parsed!.quiz_title)
        .first();

      if (existing) {
        showToast('warning', `"${validation.parsed.quiz_title}" is already in your library!`);
        setIsSaving(false);
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
      setJsonText('');
    } catch (err: any) {
      showToast('error', 'Failed to save quiz. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Selection Screen when creationMode is null (3 Mode Options)
  if (creationMode === null) {
    return (
      <div className="flex-1 w-full pb-28 max-w-md mx-auto flex flex-col space-y-6 pt-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
              Create New Quiz ⚡
            </h1>
            <p className="text-xs text-outline mt-0.5 font-body">
              Choose how you want to create your quiz session
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSwitchTab?.('home')}
            className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-outline hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* 3 Mode Option Cards */}
        <div className="space-y-3">
          {/* Option 1: Topic & Subject */}
          <div
            onClick={() => {
              setCreationMode('topic');
              setStep(1);
            }}
            className="group rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-4 shadow-xs hover:border-primary hover:shadow-md transition-all cursor-pointer active:scale-[0.99] space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
              </div>
              <span className="text-[10px] font-headline font-semibold text-primary uppercase tracking-wider">
                Option 1
              </span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-base text-on-surface">
                Generate by Topic & Subject
              </h3>
              <p className="text-xs font-body text-outline mt-0.5 leading-relaxed">
                Generate new questions based on subject, chapter, and topic.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-headline font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
              <span>Select Mode</span>
              <span className="material-symbols-outlined text-[15px]">chevron_right</span>
            </div>
          </div>

          {/* Option 2: Readymade Text / Copied MCQs */}
          <div
            onClick={() => {
              setCreationMode('readymade_text');
              setStep(1);
            }}
            className="group rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-4 shadow-xs hover:border-tertiary hover:shadow-md transition-all cursor-pointer active:scale-[0.99] space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">description</span>
              </div>
              <span className="text-[10px] font-headline font-semibold text-tertiary uppercase tracking-wider">
                Option 2
              </span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-base text-on-surface">
                Readymade Text / Copied MCQs
              </h3>
              <p className="text-xs font-body text-outline mt-0.5 leading-relaxed">
                Paste copied text, questions, or notes to build AI prompt.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-headline font-semibold text-tertiary group-hover:translate-x-0.5 transition-transform">
              <span>Select Mode</span>
              <span className="material-symbols-outlined text-[15px]">chevron_right</span>
            </div>
          </div>

          {/* Option 3: Image / Photo of MCQs */}
          <div
            onClick={() => {
              setCreationMode('readymade_image');
              setStep(3); // Direct to Generate & Import!
            }}
            className="group rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-4 shadow-xs hover:border-secondary hover:shadow-md transition-all cursor-pointer active:scale-[0.99] space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-secondary-container/40 text-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">add_a_photo</span>
              </div>
              <span className="text-[10px] font-headline font-semibold text-secondary uppercase tracking-wider">
                Option 3
              </span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-base text-on-surface">
                Image / Photo of MCQs 📷
              </h3>
              <p className="text-xs font-body text-outline mt-0.5 leading-relaxed">
                Copy OCR prompt to use with photos of MCQs from books/notes.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-headline font-semibold text-secondary group-hover:translate-x-0.5 transition-transform">
              <span>Direct to AI Prompt</span>
              <span className="material-symbols-outlined text-[15px]">chevron_right</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full pb-28 max-w-md mx-auto flex flex-col space-y-5">
      {/* Wizard Header Bar with Back button */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-headline">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (step > 1) {
                  if (creationMode === 'readymade_text' && step === 3) {
                    setStep(1); // Go back to text input
                  } else {
                    setStep(prev => prev - 1);
                  }
                } else {
                  setCreationMode(null);
                }
              }}
              className="w-7 h-7 rounded-full bg-surface-container-low text-on-surface flex items-center justify-center hover:bg-surface-container transition-all cursor-pointer"
              title="Back"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            </button>
            <span className="font-semibold text-on-surface">
              {creationMode === 'readymade_image'
                ? 'Image MCQ OCR Prompt'
                : creationMode === 'readymade_text'
                ? 'Readymade Text Importer'
                : 'Topic Quiz Generator'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-outline">
              {creationMode === 'readymade_image' ? 'Step 1 of 1' : creationMode === 'readymade_text' ? 'Step 1 of 2' : `Step ${step} of 3`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 w-full">
          <div className={`h-1.5 rounded-full transition-all ${step >= 1 ? 'bg-primary' : 'bg-surface-container-highest'}`}></div>
          <div className={`h-1.5 rounded-full transition-all ${creationMode !== 'topic' || step >= 2 ? 'bg-primary' : 'bg-surface-container-highest'}`}></div>
          <div className={`h-1.5 rounded-full transition-all ${step >= 3 ? 'bg-primary' : 'bg-surface-container-highest'}`}></div>
        </div>
      </div>

      {/* Mode 1: TOPIC BASED STEP 1 */}
      {creationMode === 'topic' && step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-headline text-2xl font-bold text-on-surface tracking-tight">
              Topic & Details
            </h2>
            <p className="text-xs text-outline mt-0.5 font-body">
              Set subject and topic details
            </p>
          </div>

          <div className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                  Subject
                </label>
                {!isCustomSubject ? (
                  <StitchSelect
                    value={subject}
                    onChange={(e) => {
                      if (e.target.value === '✏️ + Custom Subject...') {
                        setIsCustomSubject(true);
                        setSubject('');
                      } else {
                        setSubject(e.target.value);
                      }
                    }}
                    options={[
                      ...availableSubjects,
                      '✏️ + Custom Subject...'
                    ]}
                    className="w-full h-11 px-3 text-xs font-semibold"
                  />
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Type custom subject..."
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full h-11 pl-3 pr-14 rounded-xl bg-surface-container-lowest border border-outline-variant text-xs font-body text-on-surface focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomSubject(false);
                        setSubject(availableSubjects[0] || 'Physics');
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-headline font-semibold text-primary hover:underline px-1.5 py-1"
                    >
                      List
                    </button>
                  </div>
                )}
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

      {/* Mode 2: READYMADE TEXT MCQS STEP 1 */}
      {creationMode === 'readymade_text' && step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-headline text-2xl font-bold text-on-surface tracking-tight">
              Paste Readymade MCQs 📝
            </h2>
            <p className="text-xs text-outline mt-0.5 font-body">
              Paste questions or notes to build an AI prompt
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-headline font-semibold text-on-surface mb-1">
                Quiz Title
              </label>
              <input
                type="text"
                placeholder="e.g. Physics Chapter 3 Model Test"
                value={readymadeTitle}
                onChange={(e) => setReadymadeTitle(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-surface-container-lowest border border-outline-variant text-xs font-body text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-headline font-semibold text-on-surface">
                  Paste MCQs / Notes Text
                </label>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="text-xs text-primary font-headline font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">content_paste</span>
                  Paste Clipboard
                </button>
              </div>

              <textarea
                value={readymadeText}
                onChange={(e) => setReadymadeText(e.target.value)}
                placeholder="Paste your questions or raw notes text here..."
                rows={6}
                className="w-full p-3 font-body text-xs rounded-xl bg-surface-container-lowest border border-outline-variant focus:outline-none focus:border-primary resize-none"
              />
            </div>

            {/* Question Count for Readymade Text */}
            <div className="space-y-1.5">
              <label className="block text-xs font-headline font-semibold text-on-surface">
                Questions Count
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['5', '10', '20', '30'].map((qCount) => (
                  <button
                    key={qCount}
                    type="button"
                    onClick={() => setCount(qCount)}
                    className={`h-10 rounded-xl font-headline text-xs font-semibold transition-all cursor-pointer ${
                      count === qCount
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'bg-surface-container-lowest border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low'
                    }`}
                  >
                    {qCount} Qs
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 1: TOPIC BASED STEP 2 */}
      {creationMode === 'topic' && step === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="font-headline text-2xl font-bold text-on-surface tracking-tight">
              Select Difficulty
            </h2>
          </div>

          {/* Minimal 3-Column Difficulty Selector */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { id: 'beginner', label: 'Beginner', icon: 'eco' },
              { id: 'intermediate', label: 'Intermediate', icon: 'trending_up' },
              { id: 'advanced', label: 'Advanced', icon: 'bolt' },
            ].map((item) => {
              const isSelected = difficulty === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDifficulty(item.id)}
                  className={`py-4 px-2 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                      : 'bg-surface-container-lowest border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                  <span className="text-xs font-headline font-semibold">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Minimal Question Count Selector */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-headline font-semibold text-on-surface">
              Questions Count
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['5', '10', '20', '30'].map((qCount) => (
                <button
                  key={qCount}
                  type="button"
                  onClick={() => setCount(qCount)}
                  className={`h-11 rounded-xl font-headline text-xs font-semibold transition-all cursor-pointer ${
                    count === qCount
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container-lowest border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  {qCount} Qs
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: AI Prompt & JSON Load (Shared for all 3 modes!) */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-headline text-2xl font-bold text-on-surface tracking-tight">
              {creationMode === 'readymade_image' ? 'Image OCR Prompt' : 'Generate & Import'}
            </h2>
            <p className="text-xs text-outline mt-0.5 font-body">
              {creationMode === 'readymade_image'
                ? 'Copy prompt → paste in ChatGPT/Gemini → attach photo'
                : 'Copy AI prompt or paste quiz JSON'}
            </p>
          </div>

          {/* Question Count — only for image mode */}
          {creationMode === 'readymade_image' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-headline font-semibold text-on-surface">
                Questions Count
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['5', '10', '20', '30'].map((qCount) => (
                  <button
                    key={qCount}
                    type="button"
                    onClick={() => setCount(qCount)}
                    className={`h-10 rounded-xl font-headline text-xs font-semibold transition-all cursor-pointer ${
                      count === qCount
                        ? 'bg-secondary text-on-secondary shadow-xs'
                        : 'bg-surface-container-lowest border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low'
                    }`}
                  >
                    {qCount} Qs
                  </button>
                ))}
              </div>
            </div>
          )}

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
            </div>
          )}

          {/* JSON Textarea */}
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder="Paste generated quiz JSON here..."
            rows={6}
            className={`w-full p-3 font-mono text-xs rounded-xl bg-surface-container-lowest border-2 focus:outline-none transition-all resize-none ${
              validation.isValid ? 'border-tertiary focus:border-tertiary' : jsonText ? 'border-error focus:border-error' : 'border-outline-variant focus:border-primary'
            }`}
          />
        </div>
      )}

      {/* Fixed Bottom Wizard Actions */}
      <footer className="fixed bottom-0 left-0 w-full z-40 pb-safe bg-surface/95 backdrop-blur-lg border-t border-surface-container-high/70">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => {
              if (step > 1) {
                if (creationMode === 'readymade_image' && step === 3) {
                  setCreationMode(null); // Go back to 3 mode selector
                } else if (creationMode === 'readymade_text' && step === 3) {
                  setStep(1); // Go back to text input
                } else {
                  setStep(prev => prev - 1);
                }
              } else {
                setCreationMode(null);
              }
            }}
            className="h-11 px-5 rounded-xl border border-surface-container-high bg-surface-container-lowest text-on-surface font-headline text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-surface-container shrink-0 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Back</span>
          </button>

          {step < 3 ? (
            <button
              onClick={() => {
                if (creationMode === 'readymade_text') {
                  if (!readymadeText.trim()) {
                    showToast('warning', 'Please paste your MCQs or notes first.');
                    return;
                  }
                  setStep(3); // Go straight to Generate & Import!
                } else {
                  setStep(prev => prev + 1);
                }
              }}
              className="flex-1 h-11 rounded-xl bg-primary text-on-primary font-headline text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer"
              type="button"
            >
              <span>{creationMode === 'readymade_text' ? 'Generate AI Prompt →' : 'Continue'}</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          ) : (
            <div className="flex-1 flex items-center gap-2">
              <button
                onClick={handleSaveQuiz}
                disabled={!validation.isValid || isSaving}
                className="flex-1 h-11 rounded-xl bg-surface-container-low border border-surface-container-high text-on-surface font-headline text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">{isSaving ? 'hourglass_empty' : 'bookmark_add'}</span>
                <span>{isSaving ? 'Saving...' : 'Save Quiz'}</span>
              </button>
              <button
                onClick={handleStartExam}
                disabled={!validation.isValid}
                className="flex-1 h-11 rounded-xl bg-primary text-on-primary font-headline text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all cursor-pointer"
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
