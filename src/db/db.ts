import Dexie, { Table } from 'dexie';
import { Profile, SavedQuiz, ExamResult, Settings, Progress } from '../types';

export class QuizCraftDatabase extends Dexie {
  profiles!: Table<Profile, string>;
  quizzes!: Table<SavedQuiz, number>;
  examResults!: Table<ExamResult, string>;
  settings!: Table<Settings, string>;
  progress!: Table<Progress, number>;

  constructor() {
    super('QuizCraftDB');

    this.version(1).stores({
      quizzes: '++id, title, timestamp',
      examResults: 'id, quiz_title, timestamp, score, accuracy',
      settings: 'id',
      progress: 'topic, correct, attempted, accuracy'
    });

    this.version(2).stores({
      profiles: 'id, name, createdAt',
      quizzes: '++id, profileId, title, timestamp',
      examResults: 'id, profileId, quiz_title, timestamp, score, accuracy',
      settings: 'id',
      progress: '++id, profileId, topic, correct, attempted, accuracy'
    });

    // Version 3: proper SavedQuiz structure
    this.version(3).stores({
      profiles: 'id, name, createdAt',
      quizzes: '++id, profileId, quiz_title, savedAt',
      examResults: 'id, profileId, quiz_title, timestamp, score, accuracy',
      settings: 'id',
      progress: '++id, profileId, topic, correct, attempted, accuracy'
    });
  }
}

export const db = new QuizCraftDatabase();

// Default settings
export const defaultSettings: Settings = {
  id: 'user_prefs',
  theme: 'system',
  autoSubmit: true,
  warnBeforeLeave: true,
  timerWarningSound: true,
};

export async function initSettings(): Promise<void> {
  const prefs = await db.settings.get('user_prefs');
  if (!prefs) {
    await db.settings.add(defaultSettings);
  }
}

export async function initDatabase(): Promise<void> {
  await initSettings();

  // Check profiles & handle migration if necessary
  const profilesCount = await db.profiles.count();
  if (profilesCount === 0) {
    const existingResults = await db.examResults.toArray();
    if (existingResults.length > 0) {
      const defaultProfile: Profile = {
        id: 'profile_default',
        name: 'Rifat Hasan',
        grade: 'HSC',
        avatar: { type: 'initial', value: 'R', color: '#006a60' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pinEnabled: false,
        pinHash: null,
      };

      await db.profiles.put(defaultProfile);

      for (const res of existingResults) {
        if (!res.profileId) {
          await db.examResults.update(res.id, { profileId: 'profile_default' });
        }
      }

      const existingQuizzes = await db.quizzes.toArray();
      for (const q of existingQuizzes) {
        if (!q.profileId) {
          await db.quizzes.update(q.id as number, { profileId: 'profile_default' });
        }
      }

      if (!localStorage.getItem('quizcraft_active_profile_id')) {
        localStorage.setItem('quizcraft_active_profile_id', 'profile_default');
      }
    }
  }
}
