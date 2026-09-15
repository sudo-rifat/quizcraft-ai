import React, { useState, useEffect, useRef } from 'react';
import { FileCode, Lightbulb, Atom, BookOpen, Languages, Settings, Play, AlertTriangle, CheckCircle, UploadCloud, Eye, Clock } from 'lucide-react';
import StitchSelect from './StitchSelect';
import { SAMPLE_QUIZZES } from '../data/sampleQuizzes';
import { Quiz } from '../types';

interface JsonImporterProps {
  onStartExam: (data: { quiz: Quiz; config: any }) => void;
  showToast: (type: string, message: string) => void;
}

export default function JsonImporter({ onStartExam, showToast }: JsonImporterProps) {
  const [jsonText, setJsonText] = useState('');
  const [duration, setDuration] = useState<number | string>(5);
  const [marks, setMarks] = useState<number | string>(1);
  const [negative, setNegative] = useState<number | string>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [validationState, setValidationState] = useState<{
    isValid: boolean;
    message: string;
    parsedQuiz: Quiz | null;
  }>({
    isValid: false,
    message: '',
    parsedQuiz: null
  });

  // Validate JSON whenever jsonText changes
  useEffect(() => {
    const text = jsonText.trim();
    if (!text) {
      setValidationState({ isValid: false, message: 'জেসন ডাটা দিন', parsedQuiz: null });
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

      if (!parsed.quiz_title || typeof parsed.quiz_title !== 'string') {
        throw new Error("Missing 'quiz_title' string.");
      }

      if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        throw new Error("Empty or invalid 'questions' array.");
      }

      parsed.questions.forEach((q: any, idx: number) => {
        if (!q.question || typeof q.question !== 'string') {
          throw new Error(`Question #${idx + 1} text missing.`);
        }
        if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
          throw new Error(`Question #${idx + 1} must have 2+ options.`);
        }
        if (typeof q.correct_answer !== 'number' || q.correct_answer < 0 || q.correct_answer >= q.options.length) {
          throw new Error(`Question #${idx + 1} invalid correct_answer index (${q.correct_answer}).`);
        }
      });

      setValidationState({
        isValid: true,
        message: `জেসন সঠিক (${parsed.questions.length} টি প্রশ্ন)`,
        parsedQuiz: parsed
      });

    } catch (err: any) {
      setValidationState({
        isValid: false,
        message: err.message,
        parsedQuiz: null
      });
    }
  }, [jsonText]);

  const loadSample = (key: string) => {
    if (SAMPLE_QUIZZES[key]) {
      setJsonText(JSON.stringify(SAMPLE_QUIZZES[key], null, 2));
      showToast('info', 'ডেমো কুইজ ডাটা লোড হয়েছে!');
    }
  };

  const handleFileUpload = (file: File | undefined) => {
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      showToast('error', 'শুধুমাত্র .json ফাইল নির্বাচন করুন!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setJsonText(e.target?.result as string);
      showToast('success', `"${file.name}" ফাইলটি লোড হয়েছে!`);
    };
    reader.readAsText(file);
  };

  const handleStart = () => {
    if (!validationState.isValid || !validationState.parsedQuiz) {
      showToast('error', 'অনগ্রহ করে সঠিক জেসন ডাটা প্রদান করুন!');
      return;
    }

    onStartExam({
      quiz: validationState.parsedQuiz,
      config: {
        durationMinutes: parseInt(String(duration)) || 5,
        marksPerQuestion: parseFloat(String(marks)) || 1,
        negativeMarking: parseFloat(String(negative)) || 0
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-tiro font-bold text-teal-950">
          কুইজ ডাটা লোড ও সেটআপ
        </h2>
        <p className="text-slate-600 text-xs sm:text-sm max-w-lg mx-auto font-medium">
          AI থেকে প্রাপ্ত JSON ডাটা পেস্ট করুন, ড্রাগ-অ্যান্ড-ড্রপ করুন অথবা ডেমো টেস্ট সিলেক্ট করুন।
        </p>
      </div>

      <div className="card-teal-accent p-5 sm:p-6 space-y-5">
        {/* Presets & File Upload Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-teal-950">ডেমো টেস্ট:</span>
            <button
              onClick={() => loadSample('physics')}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 transition cursor-pointer"
            >
              পদার্থবিজ্ঞান
            </button>
            <button
              onClick={() => loadSample('bangla')}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 transition cursor-pointer"
            >
              বাংলা সাহিত্য
            </button>
            <button
              onClick={() => loadSample('english')}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 transition cursor-pointer"
            >
              English
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files?.[0])}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-teal-950 border border-slate-300 transition flex items-center gap-1 cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-teal-700" />
            <span>.json আপলোড</span>
          </button>
        </div>

        {/* Textarea */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <label className="font-bold text-teal-900 uppercase">
              AI Raw JSON Data
            </label>
            <span
              className={`font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                validationState.isValid
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : jsonText.trim()
                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                  : 'bg-slate-100 text-slate-600 border-slate-300'
              }`}
            >
              {validationState.isValid ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              ) : jsonText.trim() ? (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              ) : null}
              <span>{validationState.message}</span>
            </span>
          </div>

          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={7}
            placeholder="এখানে জেসন পেস্ট করুন..."
            className="w-full bg-slate-900 font-mono text-xs text-teal-200 border border-slate-800 rounded-xl p-3.5 focus:outline-none focus:border-teal-500 transition custom-scrollbar"
          />
        </div>

        {/* Live Structural Pre-exam Teaser Preview Card */}
        {validationState.isValid && validationState.parsedQuiz && (
          <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-teal-900 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-teal-700" /> Pre-Exam Summary
              </span>
              <span className="font-bold text-teal-800">
                {validationState.parsedQuiz.questions.length} টি প্রশ্ন
              </span>
            </div>
            <h4 className="font-tiro font-bold text-base text-teal-950">
              {validationState.parsedQuiz.title || (validationState.parsedQuiz as any).quiz_title}
            </h4>
          </div>
        )}

        {/* Exam Rules Controls */}
        <div className="pt-3 border-t border-slate-200 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-teal-900 uppercase flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-teal-700" /> নিয়মাবলী
            </span>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-500" />
              {[3, 5, 10, 15, 30].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setDuration(mins)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                    parseInt(String(duration)) === mins ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {mins}মি
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-teal-900 mb-1">সময় (মিনিট)</label>
              <input
                type="number"
                min={1}
                max={180}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 font-bold text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-teal-900 mb-1">প্রতি প্রশ্ন মার্ক</label>
              <input
                type="number"
                min={0.5}
                max={10}
                step={0.5}
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 font-bold text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-teal-900 mb-1">নেগেটিভ মার্ক</label>
              <StitchSelect
                value={negative}
                onChange={(e) => setNegative(e.target.value)}
                options={[
                  { value: '0', label: '0.00' },
                  { value: '0.25', label: '0.25' },
                  { value: '0.5', label: '0.50' }
                ]}
                className="w-full h-8 px-2 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={!validationState.isValid}
          className={`w-full py-3.5 rounded-xl font-bold text-base transition flex items-center justify-center gap-2 shadow-xs ${
            validationState.isValid
              ? 'bg-amber-500 hover:bg-amber-400 text-amber-950 cursor-pointer shadow-amber-500/20'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>পরীক্ষা শুরু করুন (Start Exam)</span>
        </button>
      </div>
    </div>
  );
}
