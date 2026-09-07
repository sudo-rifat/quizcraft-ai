import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

export function useProfileResults(profileId) {
  const results = useLiveQuery(async () => {
    if (!profileId) return [];
    const list = await db.examResults.where('profileId').equals(profileId).toArray();
    return list.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  }, [profileId]);

  return results || [];
}
