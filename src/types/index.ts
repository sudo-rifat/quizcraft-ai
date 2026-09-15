export interface Avatar {
  type: 'initial' | 'image' | 'emoji';
  value: string;
  color: string;
}

export interface Profile {
  id: string;
  name: string;
  grade: string;
  avatar: Avatar;
  createdAt: number;
  updatedAt: number;
  pinEnabled: boolean;
  pinHash: string | null;
}

export interface Question {
  id: number | string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

export interface Quiz {
  quiz_title: string;
  questions: Question[];
}

export interface SavedQuiz {
  id?: number;
  profileId: string;
  quiz_title: string;
  quiz_data: Quiz;
  savedAt: string; // ISO timestamp
  questionCount: number;
}

export interface ExamResult {
  id: string;
  profileId: string;
  quiz_title: string;
  timestamp: string;
  quiz_data: {
    quiz_title: string;
    questions: Question[];
  };
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
}

export interface Progress {
  id?: number;
  profileId: string;
  topic: string;
  correct: number;
  attempted: number;
  accuracy: number;
}
