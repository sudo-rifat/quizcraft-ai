import Dexie from 'dexie';

export const db = new Dexie('QuizCraftDB');

db.version(1).stores({
  quizzes: '++id, title, timestamp',
  examResults: 'id, quiz_title, timestamp, score, accuracy', // id is string like 'quiz_rec_...'
  settings: 'id', // just one record with id = 'user_prefs'
  progress: 'topic, correct, attempted, accuracy'
});

db.version(2).stores({
  profiles: 'id, name, createdAt',
  quizzes: '++id, profileId, title, timestamp',
  examResults: 'id, profileId, quiz_title, timestamp, score, accuracy',
  settings: 'id',
  progress: 'id, profileId, topic, correct, attempted, accuracy'
});

// Default settings
export const defaultSettings = {
  id: 'user_prefs',
  theme: 'system', // 'light', 'dark', 'system'
  autoSubmit: true,
  warnBeforeLeave: true,
  timerWarningSound: true
};

export async function initSettings() {
  const prefs = await db.settings.get('user_prefs');
  if (!prefs) {
    await db.settings.add(defaultSettings);
  }
}

export async function initDatabase() {
  await initSettings();
  
  // Check profiles & handle migration if necessary
  const profilesCount = await db.profiles.count();
  if (profilesCount === 0) {
    const existingResults = await db.examResults.toArray();
    if (existingResults.length > 0) {
      // Migrate existing unassigned data to Default Profile
      const defaultProfile = {
        id: 'profile_default',
        name: 'Rifat Hasan',
        grade: 'HSC',
        avatar: { type: 'initial', value: 'R', color: '#006a60' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pinEnabled: false,
        pinHash: null
      };

      await db.profiles.put(defaultProfile);

      // Assign all legacy exam results to profile_default
      for (const res of existingResults) {
        if (!res.profileId) {
          await db.examResults.update(res.id, { profileId: 'profile_default' });
        }
      }

      // Also migrate legacy quizzes if any exist
      const existingQuizzes = await db.quizzes.toArray();
      for (const q of existingQuizzes) {
        if (!q.profileId) {
          await db.quizzes.update(q.id, { profileId: 'profile_default' });
        }
      }

      if (!localStorage.getItem('quizcraft_active_profile_id')) {
        localStorage.setItem('quizcraft_active_profile_id', 'profile_default');
      }
    }
  }
}

