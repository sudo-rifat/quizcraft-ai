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
  const [openrouterKey, setOpenrouterKey] = useState(prefs.openrouterApiKey || '');
  const [groqKey, setGroqKey] = useState(prefs.groqApiKey || '');
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'openrouter' | 'groq'>(prefs.preferredAiProvider || 'gemini');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showOpenrouterKey, setShowOpenrouterKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [isApiKeySettingsOpen, setIsApiKeySettingsOpen] = useState(false);
  const [showBackupOptions, setShowBackupOptions] = useState(false);
  const [backupSelection, setBackupSelection] = useState({
    history: true,
    savedQuizzes: true,
    reviewLater: true,
  });

  useEffect(() => {
    setGeminiKey(prefs.geminiApiKey || '');
    setOpenaiKey(prefs.openaiApiKey || '');
    setOpenrouterKey(prefs.openrouterApiKey || '');
    setGroqKey(prefs.groqApiKey || '');
    setProvider(prefs.preferredAiProvider || 'gemini');
  }, [prefs.geminiApiKey, prefs.openaiApiKey, prefs.openrouterApiKey, prefs.groqApiKey, prefs.preferredAiProvider]);

  const handleSaveAiKeys = async () => {
    await db.settings.put({
      ...prefs,
      geminiApiKey: geminiKey.trim(),
      openaiApiKey: openaiKey.trim(),
      openrouterApiKey: openrouterKey.trim(),
      groqApiKey: groqKey.trim(),
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

  const handleExportBackup = () => {
    setBackupSelection({ history: true, savedQuizzes: true, reviewLater: true });
    setShowBackupOptions(true);
  };

  const confirmExportBackup = async () => {
    if (!activeProfileId) return;

    if (!backupSelection.history && !backupSelection.savedQuizzes && !backupSelection.reviewLater) {
      showToast('warning', 'Select at least one backup option.');
      return;
    }

    const [savedQuizzes, reviewLaterQuestions] = await Promise.all([
      db.quizzes.where('profileId').equals(activeProfileId).toArray(),
      db.bookmarks.where('profileId').equals(activeProfileId).toArray(),
    ]);

    const selectedItemCount =
      (backupSelection.history ? history.length : 0) +
      (backupSelection.savedQuizzes ? savedQuizzes.length : 0) +
      (backupSelection.reviewLater ? reviewLaterQuestions.length : 0);

    if (selectedItemCount === 0) {
      showToast('warning', 'No selected data to export.');
      return;
    }

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      profileName: activeProfile?.name || 'student',
      data: {
        history: backupSelection.history ? history : [],
        savedQuizzes: backupSelection.savedQuizzes ? savedQuizzes : [],
        reviewLaterQuestions: backupSelection.reviewLater ? reviewLaterQuestions : [],
      },
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `quizcraft_${activeProfile?.name || 'student'}_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setShowBackupOptions(false);
    showToast('success', 'Backup downloaded successfully!');
  };

  const handleImportFile = (file: File | undefined) => {
    if (!file || !activeProfileId) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const result = e.target?.result as string;
        const parsed = JSON.parse(result);
        const backupData = Array.isArray(parsed) ? { history: parsed } : parsed?.data;
        const historyRecords = Array.isArray(backupData?.history) ? backupData.history : [];
        const savedQuizzes = Array.isArray(backupData?.savedQuizzes) ? backupData.savedQuizzes : [];
        const reviewLaterQuestions = Array.isArray(backupData?.reviewLaterQuestions) ? backupData.reviewLaterQuestions : [];

        if (historyRecords.length === 0 && savedQuizzes.length === 0 && reviewLaterQuestions.length === 0) {
          showToast('error', 'Invalid backup format!');
          return;
        }

        await Promise.all([
          historyRecords.length > 0
            ? db.examResults.bulkPut(historyRecords.map((record: any) => ({ ...record, profileId: activeProfileId })))
            : Promise.resolve(),
          savedQuizzes.length > 0
            ? db.quizzes.bulkAdd(savedQuizzes.map(({ id: _id, ...quiz }: any) => ({ ...quiz, profileId: activeProfileId })))
            : Promise.resolve(),
          reviewLaterQuestions.length > 0
            ? db.bookmarks.bulkAdd(reviewLaterQuestions.map(({ id: _id, ...question }: any) => ({ ...question, profileId: activeProfileId })))
            : Promise.resolve(),
        ]);

        const importedCount = historyRecords.length + savedQuizzes.length + reviewLaterQuestions.length;
        showToast('success', `${importedCount} items imported successfully for ${activeProfile?.name || 'active profile'}!`);
      } catch (err) {
        showToast('error', 'File is not valid JSON!');
      }
    };
    reader.readAsText(file);
  };

  if (isApiKeySettingsOpen) {
    return (
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full pb-28 pt-2 space-y-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsApiKeySettingsOpen(false)}
            className="w-9 h-9 rounded-xl bg-surface-container-low text-on-surface flex items-center justify-center hover:bg-surface-container transition-all cursor-pointer"
            aria-label="Back to settings"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h1 className="font-headline font-semibold text-xl text-on-surface tracking-tight">AI API Keys</h1>
            <p className="mt-0.5 text-[11px] font-body text-outline">Manage your AI provider connections.</p>
          </div>
        </div>

        <div className="rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-4 space-y-4 shadow-xs">
          <div>
            <label className="block text-[11px] font-headline font-semibold text-outline mb-1.5">Preferred AI Provider</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProvider('gemini')}
                className={`h-10 rounded-xl font-headline text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  provider === 'gemini' ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-container-low border-surface-container-high text-outline'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                Google Gemini
              </button>
              <button
                type="button"
                onClick={() => setProvider('openai')}
                className={`h-10 rounded-xl font-headline text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  provider === 'openai' ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-container-low border-surface-container-high text-outline'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">psychology</span>
                OpenAI ChatGPT
              </button>
              <button
                type="button"
                onClick={() => setProvider('openrouter')}
                className={`h-10 rounded-xl font-headline text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  provider === 'openrouter' ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-container-low border-surface-container-high text-outline'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">route</span>
                OpenRouter
              </button>
              <button
                type="button"
                onClick={() => setProvider('groq')}
                className={`h-10 rounded-xl font-headline text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  provider === 'groq' ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-container-low border-surface-container-high text-outline'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                Groq
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-headline font-semibold text-outline mb-1">Gemini API Key</label>
            <div className="relative">
              <input
                type={showGeminiKey ? 'text' : 'password'}
                placeholder="AIzaSy..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full h-10 pl-3 pr-10 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
              />
              <button type="button" onClick={() => setShowGeminiKey(!showGeminiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface" aria-label="Show or hide Gemini API key">
                <span className="material-symbols-outlined text-[18px]">{showGeminiKey ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-headline font-semibold text-outline mb-1">OpenAI API Key</label>
            <div className="relative">
              <input
                type={showOpenaiKey ? 'text' : 'password'}
                placeholder="sk-proj-..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className="w-full h-10 pl-3 pr-10 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
              />
              <button type="button" onClick={() => setShowOpenaiKey(!showOpenaiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface" aria-label="Show or hide OpenAI API key">
                <span className="material-symbols-outlined text-[18px]">{showOpenaiKey ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-headline font-semibold text-outline mb-1">OpenRouter API Key <span className="text-primary">(uses free models)</span></label>
            <div className="relative">
              <input
                type={showOpenrouterKey ? 'text' : 'password'}
                placeholder="sk-or-v1-..."
                value={openrouterKey}
                onChange={(e) => setOpenrouterKey(e.target.value)}
                className="w-full h-10 pl-3 pr-10 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
              />
              <button type="button" onClick={() => setShowOpenrouterKey(!showOpenrouterKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface" aria-label="Show or hide OpenRouter API key">
                <span className="material-symbols-outlined text-[18px]">{showOpenrouterKey ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-headline font-semibold text-outline mb-1">Groq API Key</label>
            <div className="relative">
              <input
                type={showGroqKey ? 'text' : 'password'}
                placeholder="gsk_..."
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                className="w-full h-10 pl-3 pr-10 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
              />
              <button type="button" onClick={() => setShowGroqKey(!showGroqKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface" aria-label="Show or hide Groq API key">
                <span className="material-symbols-outlined text-[18px]">{showGroqKey ? 'visibility_off' : 'visibility'}</span>
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
      </div>
    );
  }

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

      <button
        type="button"
        onClick={() => setIsApiKeySettingsOpen(true)}
        className="w-full rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-4 shadow-xs flex items-center gap-3 text-left hover:bg-surface-container-low transition-all cursor-pointer"
      >
        <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[20px]">smart_toy</span>
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-headline font-semibold text-on-surface">AI API Key Settings</span>
          <span className="block mt-0.5 text-[11px] font-body text-outline">Manage Gemini, OpenAI, and future AI providers.</span>
        </span>
        <span className="material-symbols-outlined text-outline text-[20px]">chevron_right</span>
      </button>

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
              <p className="text-[11px] font-body text-outline mt-0.5">Choose the learning data to include in a JSON backup.</p>
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
              <p className="text-[11px] font-body text-outline mt-0.5">Restore history, saved quizzes, and Review Later questions.</p>
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

      {showBackupOptions && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="backup-options-title"
            className="w-full max-w-xs rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-5 space-y-4 shadow-2xl"
          >
            <div className="text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-xl">backup</span>
              </div>
              <h3 id="backup-options-title" className="font-headline font-semibold text-base text-on-surface">Create Backup</h3>
              <p className="text-xs font-body text-outline leading-relaxed">Choose one or more types of data to download.</p>
            </div>

            <div className="space-y-2">
              {[
                { key: 'history', icon: 'history', title: 'History Backup', description: 'Completed quiz results' },
                { key: 'savedQuizzes', icon: 'local_library', title: 'Saved Quizzes', description: 'Quizzes in your library' },
                { key: 'reviewLater', icon: 'bookmark', title: 'Review Later Questions', description: 'Saved revision questions' },
              ].map((option) => {
                const isSelected = backupSelection[option.key as keyof typeof backupSelection];
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setBackupSelection((current) => ({ ...current, [option.key]: !isSelected }))}
                    className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 border-primary/50'
                        : 'bg-surface-container-low border-surface-container-high hover:bg-surface-container'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container text-outline'}`}>
                      <span className="material-symbols-outlined text-[17px]">{option.icon}</span>
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-headline font-semibold text-on-surface">{option.title}</span>
                      <span className="block mt-0.5 text-[11px] font-body text-outline">{option.description}</span>
                    </span>
                    <span className={`w-5 h-5 rounded-md border flex items-center justify-center ${isSelected ? 'bg-primary border-primary text-on-primary' : 'border-outline-variant'}`}>
                      {isSelected && <span className="material-symbols-outlined text-[14px]">check</span>}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBackupOptions(false)}
                className="flex-1 h-10 rounded-xl bg-surface-container-low text-on-surface font-headline text-xs font-semibold hover:bg-surface-container transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmExportBackup}
                className="flex-1 h-10 rounded-xl bg-primary text-on-primary font-headline text-xs font-semibold shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
              >
                Download
              </button>
            </div>
          </section>
        </div>
      )}

    </div>
  );
}
