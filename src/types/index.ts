export interface Avatar {
  type: 'initial' | 'image' | 'emoji';
  value: string;
  color: string;
}

export interface Profile {
  id: string;
  name: string;
  grade: string;
  subjects?: string[];
  avatar: Avatar;
  createdAt: number;
  updatedAt: number;
  pinEnabled: boolean;
  pinHash: string | null;
}

export interface Question {
  id: number | string;
  question: string;
  question_text?: string;
  stimulusId?: string;
  stimulus?: string;
  options: string[];
  correct_answer: number;
  correct_answer_index?: number;
  explanation: string;
}

export interface StimulusGroup {
  id: string;
  text: string;
}

export interface Quiz {
  id?: string;
  quiz_title: string;
  created_at?: string;
  total_questions?: number;
  stimulusGroups?: StimulusGroup[];
  questions: Question[];
}

export interface BookmarkedQuestion {
  id?: number;
  profileId: string;
  quiz_title: string;
  question_text: string;
  stimulus?: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
  savedAt: string;
}

export interface SavedQuiz {
  id?: number;
  profileId: string;
  quiz_title: string;
  quiz_data: Quiz;
  savedAt: string; // ISO timestamp
  questionCount: number;
}

export interface ActiveExamSession {
  profileId: string;
  quiz: Quiz;
  examConfig: {
    durationMinutes: number;
    marksPerQuestion: number;
    negativeMarking: number;
  };
  answers: Record<string, number>;
  currentQuestionIndex: number;
  timerSeconds: number;
  updatedAt: number;
}

export interface DoubtResponse {
  id?: number;
  profileId: string;
  quizKey: string;
  questionKey: string;
  doubtKey: string;
  quizTitle: string;
  questionText: string;
  doubtText: string;
  response: string;
  historyIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ExamResult {
  id: string;
  profileId: string;
  quiz_title: string;
  timestamp: string;
  quiz_data: Quiz;
  exam_config: {
    durationMinutes: number;
    marksPerQuestion: number;
    negativeMarking: number;
  };
  user_answers: Record<string | number, number>;
  score: number;
  maxScore: number;
  percentage: number;
  accuracy: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  timeSpentFormatted: string;
}

export interface Settings {
  id: string;
  theme: 'light' | 'dark' | 'system';
  autoSubmit: boolean;
  warnBeforeLeave: boolean;
  timerWarningSound: boolean;
  geminiApiKey?: string;
  openaiApiKey?: string;
  openrouterApiKey?: string;
  openrouterModel?: string;
  groqApiKey?: string;
  groqModel?: string;
  huggingfaceApiKey?: string;
  huggingfaceModel?: string;
  preferredAiProvider?: 'gemini' | 'openai' | 'openrouter' | 'groq' | 'huggingface';
}

export interface Progress {
  id?: number;
  profileId: string;
  topic: string;
  correct: number;
  attempted: number;
  accuracy: number;
}
