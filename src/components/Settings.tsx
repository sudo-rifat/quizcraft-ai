import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, defaultSettings } from '../db/db';
import { useActiveProfile } from '../context/ProfileContext';
import { useProfileResults } from '../hooks/useProfileResults';

interface SettingsProps {
  showToast: (type: string, message: string) => void;
}

export default function Settings({ showToast }: SettingsProps) {
  const prefs = useLiveQuery(() => db.settings.get('user_prefs'), []) || defaultSettings;
  const { activeProfile, activeProfileId, updateProfile, setIsManagementOpen, setIsProfileSelectorOpen } = useActiveProfile();

  const history = useProfileResults(activeProfileId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [geminiKey, setGeminiKey] = useState(prefs.geminiApiKey || '');
  const [openaiKey, setOpenaiKey] = useState(prefs.openaiApiKey || '');
  const [provider, setProvider] = useState<'gemini' | 'openai'>(prefs.preferredAiProvider || 'gemini');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    setGeminiKey(prefs.geminiApiKey || '');
    setOpenaiKey(prefs.openaiApiKey || '');
    setProvider(prefs.preferredAiProvider || 'gemini');
  }, [prefs.geminiApiKey, prefs.openaiApiKey, prefs.preferredAiProvider]);

  const handleSaveAiKeys = async () => {
    await db.settings.put({
      ...prefs,
      geminiApiKey: geminiKey.trim(),
      openaiApiKey: openaiKey.trim(),
      preferredAiProvider: provider,
    } as any);
    showToast('success', 'AI API Key settings updated successfully!');
  };

  const handleNameChange = async (newName: string) => {
    if (!activeProfileId || !newName.trim() || !activeProfile) return;
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
    setConfirmText('');
    setShowConfirmClear(true);
  };

  const confirmClearData = async () => {
    if (!activeProfileId || confirmText !== 'Delete History') return;
    await db.examResults.where('profileId').equals(activeProfileId).delete();
    showToast('success', `Exam data for ${activeProfile?.name} has been cleared.`);
    setShowConfirmClear(false);
    setConfirmText('');
  };

  const handleExportBackup = async () => {
    if (history.length === 0) {
      showToast('warning', 'No data to export!');
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `quizcraft_${activeProfile?.name || 'student'}_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('success', 'Backup downloaded successfully!');
  };

  const handleImportFile = (file: File | undefined) => {
    if (!file || !activeProfileId) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const result = e.target?.result as string;
        const parsed = JSON.parse(result);
        if (Array.isArray(parsed)) {
          const recordsToImport = parsed.map((record: any) => ({
            ...record,
            profileId: record.profileId || activeProfileId
          }));
          await db.examResults.bulkPut(recordsToImport);
          showToast('success', `${parsed.length} records imported successfully for ${activeProfile?.name || 'active profile'}!`);
        } else {
          showToast('error', 'Invalid backup format!');
        }
      } catch (err) {
        showToast('error', 'File is not valid JSON!');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full pb-28 pt-2 space-y-5">
      <div>
        <h1 className="font-headline font-semibold text-xl text-on-surface tracking-tight">
          Settings & Preferences
        </h1>
      </div>

      {/* Student Profile Card */}
      <div className="rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center font-headline font-bold text-white text-base shrink-0"
            style={{ backgroundColor: activeProfile?.avatar?.color || '#006a60' }}
          >
            {activeProfile?.avatar?.value || activeProfile?.name?.charAt(0) || 'S'}
          </div>

          {/* Name + Grade */}
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={activeProfile?.name || ''}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full bg-transparent text-sm font-headline font-bold text-on-surface focus:outline-none focus:border-b focus:border-primary leading-tight"
              placeholder="Student name"
            />
            {activeProfile?.grade && (
              <span className="text-[10px] font-body text-on-surface-variant">{activeProfile.grade}</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsProfileSelectorOpen(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
              title="Switch Profile"
            >
              <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
            </button>
            <button
              onClick={() => setIsManagementOpen(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
              title="Manage Profiles"
            >
              <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI Configuration Section (Gemini & OpenAI API Keys) */}
      <div className="rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-4 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-headline font-semibold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">smart_toy</span>
            AI API Keys
          </span>
        </div>

        {/* Preferred Provider Selector */}
        <div>
          <label className="block text-[11px] font-headline font-semibold text-outline mb-1.5">
            Preferred AI Provider
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setProvider('gemini')}
              className={`h-10 rounded-xl font-headline text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                provider === 'gemini'
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-surface-container-low border-surface-container-high text-outline'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              Google Gemini
            </button>

            <button
              type="button"
              onClick={() => setProvider('openai')}
              className={`h-10 rounded-xl font-headline text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                provider === 'openai'
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-surface-container-low border-surface-container-high text-outline'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">psychology</span>
              OpenAI ChatGPT
            </button>
          </div>
        </div>

        {/* Gemini API Key Input */}
        <div>
          <label className="block text-[11px] font-headline font-semibold text-outline mb-1">
            Gemini API Key
          </label>
          <div className="relative">
            <input
              type={showGeminiKey ? 'text' : 'password'}
              placeholder="AIzaSy..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="w-full h-10 pl-3 pr-10 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setShowGeminiKey(!showGeminiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[18px]">
                {showGeminiKey ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        {/* OpenAI API Key Input */}
        <div>
          <label className="block text-[11px] font-headline font-semibold text-outline mb-1">
            OpenAI API Key
          </label>
          <div className="relative">
            <input
              type={showOpenaiKey ? 'text' : 'password'}
              placeholder="sk-proj-..."
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              className="w-full h-10 pl-3 pr-10 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setShowOpenaiKey(!showOpenaiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[18px]">
                {showOpenaiKey ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveAiKeys}
          className="w-full h-10 rounded-xl bg-primary text-on-primary font-headline text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">save</span>
          Save AI Settings
        </button>
      </div>

      {/* Data Management */}
      <div className="rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-4 space-y-4 shadow-xs">
        <span className="text-xs font-headline font-semibold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-primary">cloud_sync</span>
          Data Management
        </span>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-headline font-semibold text-on-surface">Export Backup</p>
              <p className="text-[11px] font-body text-outline mt-0.5">Download a JSON backup of your quiz history.</p>
            </div>
            <button
              onClick={handleExportBackup}
              className="h-9 px-3 rounded-xl bg-primary/10 text-primary font-headline text-xs font-semibold flex items-center gap-1.5 hover:bg-primary/20 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Backup
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-surface-container/50 pt-3">
            <div>
              <p className="text-xs font-headline font-semibold text-on-surface">Import Backup</p>
              <p className="text-[11px] font-body text-outline mt-0.5">Restore quiz history from a JSON backup file.</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => handleImportFile(e.target.files?.[0])}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-9 px-3 rounded-xl bg-surface-container-low border border-surface-container-high text-on-surface font-headline text-xs font-semibold flex items-center gap-1.5 hover:bg-surface-container transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">upload</span>
              Import
            </button>
          </div>
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

      {/* Confirmation Modal */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xs rounded-2xl bg-surface-container-lowest border border-error/30 p-5 space-y-4 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-error/20 text-error flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-xl">delete_forever</span>
              </div>
              <h3 className="font-headline font-semibold text-base text-on-surface">Clear History?</h3>
              <p className="text-xs font-body text-outline leading-relaxed">
                This will permanently delete all quiz history for {activeProfile?.name}. This action cannot be undone.
              </p>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="block text-[11px] font-headline font-semibold text-outline text-center">
                Type <strong className="text-error">Delete History</strong> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Delete History"
                className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-error/30 text-xs font-headline font-semibold text-center text-on-surface focus:outline-none focus:border-error"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmClear(false)}
                className="flex-1 h-10 rounded-xl bg-surface-container-low text-on-surface font-headline text-xs font-semibold hover:bg-surface-container transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmClearData}
                disabled={confirmText !== 'Delete History'}
                className={`flex-1 h-10 rounded-xl font-headline text-xs font-semibold shadow-xs transition-all ${
                  confirmText === 'Delete History'
                    ? 'bg-error text-on-error hover:bg-error/90 cursor-pointer'
                    : 'bg-error/50 text-on-error/50 cursor-not-allowed'
                }`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
