import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { ExamResult } from '../types';

export function useProfileResults(profileId: string | null | undefined): ExamResult[] {
  const results = useLiveQuery(async () => {
    if (!profileId) return [];
    const list = await db.examResults.where('profileId').equals(profileId).toArray();
    return list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  }, [profileId]);

  return (results as ExamResult[]) || [];
}
