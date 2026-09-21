import { db } from '../db/db';

export async function hashPin(pin: string): Promise<string | null> {
  if (!pin) return null;
  const msgBuffer = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function getAllProfiles() {
  return await db.profiles.toArray();
}

export async function getProfileById(id: string) {
  if (!id) return null;
  return await db.profiles.get(id);
}

export async function createProfile({ name, grade, subjects = ['Physics', 'Chemistry', 'Higher Math', 'Biology', 'ICT', 'English'], avatar, pin = null }: any) {
  if (!name || !name.trim()) {
    throw new Error('Profile name is required.');
  }

  const id = 'profile_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const pinHash = pin ? await hashPin(pin) : null;

  const defaultAvatarColors = ['#006a60', '#6750a4', '#984061', '#705d00', '#00658f', '#825500'];
  const randomColor = defaultAvatarColors[Math.floor(Math.random() * defaultAvatarColors.length)];

  const profile = {
    id,
    name: name.trim(),
    grade: grade || 'SSC',
    subjects: Array.isArray(subjects) ? subjects : ['Physics', 'Chemistry', 'Higher Math', 'Biology', 'ICT', 'English'],
    avatar: avatar || {
      type: 'initial',
      value: name.trim().charAt(0).toUpperCase(),
      color: randomColor
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pinEnabled: Boolean(pin),
    pinHash
  };

  await db.profiles.add(profile as any);
  return profile;
}

export async function updateProfile(id: string, updates: any) {
  const existing = await db.profiles.get(id);
  if (!existing) {
    throw new Error('Profile not found.');
  }

  const updatedData = {
    ...updates,
    updatedAt: Date.now()
  };

  // Do not allow changing the profile ID
  delete updatedData.id;

  if (updates.pin !== undefined) {
    if (updates.pin) {
      updatedData.pinHash = await hashPin(updates.pin);
      updatedData.pinEnabled = true;
    } else {
      updatedData.pinHash = null;
      updatedData.pinEnabled = false;
    }
    delete updatedData.pin;
  }

  await db.profiles.update(id, updatedData);
  return await db.profiles.get(id);
}

export async function deleteProfile(id: string) {
  const profile = await db.profiles.get(id);
  if (!profile) return;

  // Cascade delete all data belonging to this profile ONLY
  await db.examResults.where('profileId').equals(id).delete();
  await db.quizzes.where('profileId').equals(id).delete();
  await db.progress.where('profileId').equals(id).delete();
  await db.profiles.delete(id);
}
