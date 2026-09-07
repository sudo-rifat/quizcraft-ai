import React, { useState, useEffect } from 'react';
import { Sparkles, Sliders, Code, Copy, ArrowRight } from 'lucide-react';
import StitchSelect from './StitchSelect';

export default function PromptBuilder({ onNextStep, showToast }) {
  const [grade, setGrade] = useState('নবম-দশম (Class 9-10 / SSC)');
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState('10');
  const [language, setLanguage] = useState('Bangla');
  const [promptText, setPromptText] = useState('');

  const generatePromptText = () => {
    const sub = subject.trim() || 'General Subject';
    const ch = chapter.trim() || 'Core Chapter';
    const top = topic.trim() || 'Key Concepts';

    const text = `Act as an expert Academic Educator. Generate exactly ${count} Multiple Choice Questions (MCQs) in ${language} language for Level/Class: ${grade}, Subject: "${sub}", Chapter: "${ch}", Specific Topics: "${top}".

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
  "quiz_title": "${sub} - ${ch} (${top})",
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
  };

  useEffect(() => {
    generatePromptText();
  }, [grade, subject, chapter, topic, count, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(promptText).then(() => {
      showToast('success', 'প্রম্পট ক্লিপবোর্ডে কপি করা হয়েছে!');
    }).catch(() => {
      showToast('info', 'প্রম্পট টেক্সট কপি করা হয়েছে!');
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-tiro font-bold text-teal-950">
          এআই কুইজ প্রম্পট জেনারেটর
        </h2>
        <p className="text-slate-600 text-xs sm:text-sm max-w-xl mx-auto font-medium">
          বিষয় ও অধ্যায় লিখে প্রম্পট কপি করুন এবং Gemini বা ChatGPT থেকে JSON কুইজ সংগ্রহ করুন।
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Inputs Card */}
        <div className="lg:col-span-6 card-teal-accent p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-teal-950 font-bold text-base">
            <Sliders className="w-4 h-4 text-teal-700" />
            <span>কুইজ কনফিগারেশন</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-teal-900 mb-1">শ্রেণি / লেভেল (Class / Grade)</label>
            <StitchSelect
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              options={[
                  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 
                  'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 
                  'Class 11', 'Class 12', 
                  'Admission Test', 'Job / BCS', 'General Learning'
              ]}
              className="w-full h-10 px-3.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-teal-900 mb-1">বিষয় (Subject)</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="যেমন: পদার্থবিজ্ঞান"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-800 focus:outline-none focus:border-teal-600 text-xs font-medium placeholder-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-teal-900 mb-1">অধ্যায় (Chapter)</label>
              <input
                type="text"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                placeholder="যেমন: ২য় অধ্যায় (গতি)"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-800 focus:outline-none focus:border-teal-600 text-xs font-medium placeholder-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-teal-900 mb-1">টপিক বিবরণ (Topic Details)</label>
            <textarea
              rows={2}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="যেমন: সরণ, বেগ, ত্বরণ, নিউটনের গতিসূূত্র"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-800 focus:outline-none focus:border-teal-600 text-xs font-medium resize-none placeholder-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-teal-900 mb-1">প্রশ্ন সংখ্যা</label>
              <StitchSelect
                value={count}
                onChange={(e) => setCount(e.target.value)}
                options={[
                  { value: '5', label: '৫ টি প্রশ্ন' },
                  { value: '10', label: '১০ টি প্রশ্ন' },
                  { value: '15', label: '১৫ টি প্রশ্ন' },
                  { value: '20', label: '২০ টি প্রশ্ন' }
                ]}
                className="w-full h-10 px-3 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-teal-900 mb-1">ভাষা</label>
              <StitchSelect
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                options={[
                  { value: 'Bangla', label: 'বাংলা' },
                  { value: 'English', label: 'English' }
                ]}
                className="w-full h-10 px-3 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Prompt Output Card */}
        <div className="lg:col-span-6 card-teal-accent p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="flex items-center gap-1.5 font-bold text-teal-950 text-sm">
              <Code className="w-4 h-4 text-amber-500" />
              <span>জেনারেটেড AI Prompt</span>
            </span>
            <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full">
              JSON Format
            </span>
          </div>

          <textarea
            readOnly
            value={promptText}
            rows={10}
            className="w-full bg-slate-900 font-mono text-xs text-teal-200 border border-slate-800 rounded-xl p-3.5 leading-relaxed focus:outline-none resize-none custom-scrollbar"
          />

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={handleCopy}
              className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-teal-950 font-bold text-xs transition duration-200 flex items-center justify-center gap-1.5 border border-slate-300 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-teal-700" />
              <span>Copy Prompt</span>
            </button>

            <button
              onClick={onNextStep}
              className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs transition duration-200 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>Next (Import)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
