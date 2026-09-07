import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, defaultSettings } from '../db/db';
import { useActiveProfile } from '../context/ProfileContext';

export default function Settings({ showToast }) {
  const prefs = useLiveQuery(() => db.settings.get('user_prefs'), []) || defaultSettings;
  const { activeProfile, activeProfileId, updateProfile, setIsManagementOpen, setIsProfileSelectorOpen } = useActiveProfile();

  const updatePref = async (key, value) => {
    await db.settings.put({ ...prefs, [key]: value });
  };

  const handleNameChange = async (newName) => {
    if (!activeProfileId || !newName.trim()) return;
    await updateProfile(activeProfileId, {
      name: newName.trim(),
      avatar: {
        ...activeProfile.avatar,
        value: newName.trim().charAt(0).toUpperCase()
      }
    });
  };

  const handleClearData = async () => {
    if (!activeProfileId) return;
    if (window.confirm(`This will permanently delete all quiz history for ${activeProfile?.name}. Are you absolutely sure?`)) {
      await db.examResults.where('profileId').equals(activeProfileId).delete();
      showToast('success', `Exam data for ${activeProfile?.name} has been cleared.`);
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full pb-28 pt-2 space-y-5">
      <div>
        <h1 className="font-headline font-semibold text-xl text-on-surface tracking-tight">
          Settings & Preferences
        </h1>
        <p className="text-xs font-body text-outline mt-0.5">
          Customize theme, student profile and data backups
        </p>
      </div>

      {/* Student Profile Card */}
      <div className="rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-4 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-headline font-semibold text-on-surface uppercase tracking-wider">
            Active Student Profile
          </span>
          <button
            onClick={() => setIsManagementOpen(true)}
            className="text-xs font-headline font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
            <span>Manage All Profiles</span>
          </button>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center font-headline font-bold text-white text-lg shrink-0 shadow-xs"
            style={{ backgroundColor: activeProfile?.avatar?.color || '#006a60' }}
          >
            {activeProfile?.avatar?.value || activeProfile?.name?.charAt(0) || 'S'}
          </div>

          <div className="flex-1">
            <label className="block text-[11px] font-body text-outline">Student Name</label>
            <input 
              type="text" 
              value={activeProfile?.name || ''}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full h-9 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-headline font-semibold text-on-surface focus:outline-none focus:border-primary mt-0.5"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-surface-container">
          <span className="text-xs font-body text-outline">Class / Goal: <strong className="text-on-surface">{activeProfile?.grade || 'Not set'}</strong></span>
          <button
            onClick={() => setIsProfileSelectorOpen(true)}
            className="px-3 py-1 rounded-xl bg-surface-container-low text-xs font-headline font-semibold text-on-surface hover:bg-surface-container transition-all cursor-pointer"
          >
            Switch Profile
          </button>
        </div>
      </div>

      {/* Appearance */}
      <div className="rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-4 space-y-3 shadow-xs">
        <span className="text-xs font-headline font-semibold text-on-surface uppercase tracking-wider">
          Appearance & Theme
        </span>
        
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'light', label: 'Light', icon: 'light_mode' },
            { id: 'dark', label: 'Dark', icon: 'dark_mode' },
            { id: 'system', label: 'System', icon: 'desktop_windows' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => updatePref('theme', t.id)}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                prefs.theme === t.id
                  ? 'bg-primary/10 border-primary text-primary font-semibold'
                  : 'bg-surface-container-low border-outline-variant/40 text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{t.icon}</span>
              <span className="text-xs font-headline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl bg-surface-container-lowest border border-error/30 p-4 space-y-3 shadow-xs">
        <span className="text-xs font-headline font-semibold text-error uppercase tracking-wider">
          Danger Zone
        </span>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-headline font-semibold text-on-surface">Clear Current Profile History</p>
            <p className="text-[11px] font-body text-outline mt-0.5">Remove quiz results for {activeProfile?.name || 'this student'}</p>
          </div>

          <button
            onClick={handleClearData}
            className="px-3 py-1.5 rounded-xl bg-error-container text-on-error-container font-headline font-semibold text-xs border border-error/20 hover:bg-error hover:text-on-error transition-all cursor-pointer"
          >
            Clear Data
          </button>
        </div>
      </div>
    </div>
  );
}
