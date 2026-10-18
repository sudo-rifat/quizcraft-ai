import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, defaultSettings } from '../db/db';
import { useActiveProfile } from '../context/ProfileContext';
import { useProfileResults } from '../hooks/useProfileResults';
import OpenRouterModelModal from './OpenRouterModelModal';
import HuggingFaceModelModal from './HuggingFaceModelModal';
import GroqModelModal from './GroqModelModal';

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
  const [openrouterModel, setOpenrouterModel] = useState(prefs.openrouterModel || 'openrouter/free');
  const [groqKey, setGroqKey] = useState(prefs.groqApiKey || '');
  const [groqModel, setGroqModel] = useState(prefs.groqModel || 'llama-3.3-70b-versatile');
  const [huggingfaceKey, setHuggingfaceKey] = useState(prefs.huggingfaceApiKey || '');
  const [huggingfaceModel, setHuggingfaceModel] = useState(prefs.huggingfaceModel || 'meta-llama/Llama-3.3-70B-Instruct');
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'openrouter' | 'groq' | 'huggingface'>(prefs.preferredAiProvider || 'gemini');
  const [isApiKeySettingsOpen, setIsApiKeySettingsOpen] = useState(false);
  const [showBackupOptions, setShowBackupOptions] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [isHfModelModalOpen, setIsHfModelModalOpen] = useState(false);
  const [isGroqModelModalOpen, setIsGroqModelModalOpen] = useState(false);
  const [backupSelection, setBackupSelection] = useState({
    history: true,
    savedQuizzes: true,
    reviewLater: true,
  });

  useEffect(() => {
    setGeminiKey(prefs.geminiApiKey || '');
    setOpenaiKey(prefs.openaiApiKey || '');
    setOpenrouterKey(prefs.openrouterApiKey || '');
    setOpenrouterModel(prefs.openrouterModel || 'openrouter/free');
    setGroqKey(prefs.groqApiKey || '');
    setGroqModel(prefs.groqModel || 'llama-3.3-70b-versatile');
    setHuggingfaceKey(prefs.huggingfaceApiKey || '');
    setHuggingfaceModel(prefs.huggingfaceModel || 'meta-llama/Llama-3.3-70B-Instruct');
    setProvider(prefs.preferredAiProvider || 'gemini');
  }, [prefs.geminiApiKey, prefs.openaiApiKey, prefs.openrouterApiKey, prefs.openrouterModel, prefs.groqApiKey, prefs.groqModel, prefs.huggingfaceApiKey, prefs.huggingfaceModel, prefs.preferredAiProvider]);

  const handleSaveAiKeys = async () => {
    await db.settings.put({
      ...prefs,
      geminiApiKey: geminiKey.trim(),
      openaiApiKey: openaiKey.trim(),
      openrouterApiKey: openrouterKey.trim(),
      openrouterModel: openrouterModel.trim() || 'openrouter/free',
      groqApiKey: groqKey.trim(),
      groqModel: groqModel.trim() || 'llama-3.3-70b-versatile',
      huggingfaceApiKey: huggingfaceKey.trim(),
      huggingfaceModel: huggingfaceModel.trim() || 'meta-llama/Llama-3.3-70B-Instruct',
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

  const PROVIDERS = [
    {
      id: 'gemini' as const,
      name: 'Google Gemini',
      badge: 'Recommended',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      icon: 'auto_awesome',
      description: 'Generous free quotas with high speed. Powers smart Bengali explanations & Vision OCR for book images.',
      getKeyUrl: 'https://aistudio.google.com/app/apikey',
      getKeyLabel: 'Get Gemini API Key (Free)',
      placeholder: 'AIzaSy...',
    },
    {
      id: 'openrouter' as const,
      name: 'OpenRouter',
      badge: 'Free Models',
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      icon: 'route',
      description: 'Unified AI router offering free access to Meta Llama 3.3, Gemini 2.0 Flash, DeepSeek R1 and 100+ models.',
      getKeyUrl: 'https://openrouter.ai/keys',
      getKeyLabel: 'Get OpenRouter Key',
      placeholder: 'sk-or-v1-...',
      hasModelSelect: true,
    },
    {
      id: 'groq' as const,
      name: 'Groq',
      badge: 'Ultra Fast',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      icon: 'bolt',
      description: 'Sub-second quiz generation on specialized LPU chips running Llama 3.3 70B.',
      getKeyUrl: 'https://console.groq.com/keys',
      getKeyLabel: 'Get Groq Key (Free)',
      placeholder: 'gsk_...',
    },
    {
      id: 'huggingface' as const,
      name: 'Hugging Face',
      badge: 'Open Source',
      badgeColor: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
      icon: 'hub',
      description: 'Serverless access to leading open-weight LLMs. API key is optional for public models.',
      getKeyUrl: 'https://huggingface.co/settings/tokens',
      getKeyLabel: 'Get HF Access Token',
      placeholder: 'hf_...',
      hasModelSelect: true,
    },
    {
      id: 'openai' as const,
      name: 'OpenAI ChatGPT',
      badge: 'Standard',
      badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      icon: 'psychology',
      description: 'Industry standard reasoning using gpt-4o-mini for accurate and structured quiz creation.',
      getKeyUrl: 'https://platform.openai.com/api-keys',
      getKeyLabel: 'Get OpenAI Key',
      placeholder: 'sk-proj-...',
    },
  ];

  const [activeTab, setActiveTab] = useState<'gemini' | 'openai' | 'openrouter' | 'groq' | 'huggingface'>(provider);
  const [showKeyMap, setShowKeyMap] = useState<Record<string, boolean>>({});
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});

  const toggleShowKey = (id: string) => {
    setShowKeyMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getKeyForProvider = (id: string): string => {
    switch (id) {
      case 'gemini': return geminiKey;
      case 'openai': return openaiKey;
      case 'openrouter': return openrouterKey;
      case 'groq': return groqKey;
      case 'huggingface': return huggingfaceKey;
      default: return '';
    }
  };

  const setKeyForProvider = (id: string, val: string) => {
    switch (id) {
      case 'gemini': setGeminiKey(val); break;
      case 'openai': setOpenaiKey(val); break;
      case 'openrouter': setOpenrouterKey(val); break;
      case 'groq': setGroqKey(val); break;
      case 'huggingface': setHuggingfaceKey(val); break;
    }
  };

  const testProviderKey = async (providerId: string) => {
    setTestStatus((prev) => ({ ...prev, [providerId]: 'loading' }));
    try {
      if (providerId === 'gemini') {
        if (!geminiKey.trim()) throw new Error('API key is empty');
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${geminiKey.trim()}`);
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error?.message || `HTTP ${resp.status}`);
        }
      } else if (providerId === 'openai') {
        if (!openaiKey.trim()) throw new Error('API key is empty');
        const resp = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${openaiKey.trim()}` },
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error?.message || `HTTP ${resp.status}`);
        }
      } else if (providerId === 'openrouter') {
        if (!openrouterKey.trim()) throw new Error('API key is empty');
        const resp = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: { Authorization: `Bearer ${openrouterKey.trim()}` },
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error?.message || `HTTP ${resp.status}`);
        }
      } else if (providerId === 'groq') {
        if (!groqKey.trim()) throw new Error('API key is empty');
        const resp = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${groqKey.trim()}` },
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error?.message || `HTTP ${resp.status}`);
        }
      } else if (providerId === 'huggingface') {
        if (!huggingfaceKey.trim()) throw new Error('API key is empty');
        const resp = await fetch('https://huggingface.co/api/whoami-v2', {
          headers: { Authorization: `Bearer ${huggingfaceKey.trim()}` },
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error?.message || `HTTP ${resp.status}`);
        }
      }
      setTestStatus((prev) => ({ ...prev, [providerId]: 'success' }));
      showToast('success', `${PROVIDERS.find(p => p.id === providerId)?.name || 'Provider'} connection verified! ✓`);
    } catch (e: any) {
      setTestStatus((prev) => ({ ...prev, [providerId]: 'error' }));
      showToast('error', `Connection test failed: ${e?.message || 'Invalid key'}`);
    }
  };

  const configuredCount = [geminiKey, openaiKey, openrouterKey, groqKey, huggingfaceKey].filter(k => k.trim().length > 0).length;

  if (isApiKeySettingsOpen) {
    const currentProvider = PROVIDERS.find((p) => p.id === activeTab) || PROVIDERS[0];
    const currentStatus = testStatus[activeTab] || 'idle';
    const currentKey = getKeyForProvider(activeTab);
    const isDefaultEngine = provider === activeTab;

    return (
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full pb-28 pt-2 space-y-3.5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsApiKeySettingsOpen(false)}
            className="w-9 h-9 rounded-xl bg-surface-container-low text-on-surface flex items-center justify-center hover:bg-surface-container transition-all cursor-pointer"
            aria-label="Back to settings"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-headline font-semibold text-lg text-on-surface tracking-tight">AI Providers</h1>
          </div>
        </div>

        {/* Horizontal Provider Selector Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {PROVIDERS.map((p) => {
            const isTabActive = activeTab === p.id;
            const isEngineDefault = provider === p.id;
            const keyVal = getKeyForProvider(p.id);
            const hasKey = keyVal.trim().length > 0;

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveTab(p.id)}
                className={`px-3 py-2 rounded-2xl border flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                  isTabActive
                    ? 'bg-primary text-on-primary border-primary shadow-xs'
                    : 'bg-surface-container-lowest border-surface-container/80 text-on-surface hover:bg-surface-container-low'
                }`}
              >
                <span className={`material-symbols-outlined text-[17px] ${isTabActive ? 'text-on-primary' : 'text-primary'}`}>
                  {p.icon}
                </span>
                <span className="text-xs font-headline font-semibold">{p.name}</span>
                {isEngineDefault && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isTabActive ? 'bg-white' : 'bg-primary'}`} title="Default Engine" />
                )}
                {hasKey && !isEngineDefault && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Key set" />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Provider Card */}
        <div className="rounded-3xl bg-surface-container-lowest border border-surface-container/80 p-4 space-y-4 shadow-xs">
          {/* Provider Header & Selection */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-headline font-bold text-sm text-on-surface">{currentProvider.name}</span>
              {isDefaultEngine ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-headline font-bold px-2.5 py-0.5 rounded-full bg-primary text-on-primary shadow-xs">
                  <span className="material-symbols-outlined text-[12px]">check</span>
                  Selected Engine
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setProvider(activeTab);
                    showToast('info', `${currentProvider.name} selected as active provider.`);
                  }}
                  className="inline-flex items-center gap-1 text-[10px] font-headline font-semibold px-2.5 py-0.5 rounded-full bg-surface-container hover:bg-primary hover:text-on-primary text-on-surface transition-all cursor-pointer border border-surface-container-high"
                >
                  <span className="material-symbols-outlined text-[12px]">radio_button_unchecked</span>
                  Use this Provider
                </button>
              )}
            </div>

            <a
              href={currentProvider.getKeyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-headline text-primary hover:underline"
            >
              <span>Get Key</span>
              <span className="material-symbols-outlined text-[12px]">open_in_new</span>
            </a>
          </div>

          {/* API Key Input Field */}
          <div className="space-y-2">
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-outline pointer-events-none material-symbols-outlined text-[18px]">
                vpn_key
              </span>
              <input
                type={showKeyMap[activeTab] ? 'text' : 'password'}
                placeholder={`API Key (${currentProvider.placeholder})`}
                value={currentKey}
                onChange={(e) => setKeyForProvider(activeTab, e.target.value)}
                className="w-full h-10 pl-10 pr-16 rounded-2xl bg-surface-container-low border border-outline-variant/40 text-xs font-mono text-on-surface focus:outline-none focus:border-primary transition-all"
              />
              <div className="absolute right-2.5 flex items-center gap-1.5">
                {currentKey.trim() && (
                  <button
                    type="button"
                    onClick={() => setKeyForProvider(activeTab, '')}
                    className="text-[11px] font-headline text-outline hover:text-error transition-colors cursor-pointer"
                    title="Clear"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => toggleShowKey(activeTab)}
                  className="text-outline hover:text-on-surface transition-colors cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  <span className="material-symbols-outlined text-[17px]">
                    {showKeyMap[activeTab] ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Test Connection Row */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => testProviderKey(activeTab)}
                disabled={!currentKey.trim() || currentStatus === 'loading'}
                className="h-7 px-2.5 rounded-lg bg-surface-container-low border border-surface-container-high hover:bg-surface-container text-[11px] font-headline font-medium text-on-surface flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {currentStatus === 'loading' ? (
                  <>
                    <span className="material-symbols-outlined text-[13px] animate-spin text-primary">progress_activity</span>
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[13px] text-primary">speed</span>
                    <span>Test Connection</span>
                  </>
                )}
              </button>

              {currentStatus === 'success' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-headline font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  <span>Valid</span>
                </span>
              )}
              {currentStatus === 'error' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-headline font-semibold text-error">
                  <span className="material-symbols-outlined text-[14px]">cancel</span>
                  <span>Failed</span>
                </span>
              )}
            </div>
          </div>

          {/* Model Selection (for OpenRouter) */}
          {activeTab === 'openrouter' && (
            <div className="space-y-2 pt-2 border-t border-surface-container/60">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-headline font-semibold text-outline">Model</span>
                <button
                  type="button"
                  onClick={() => setIsModelModalOpen(true)}
                  className="text-[11px] font-headline font-semibold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[13px]">explore</span>
                  Browse
                </button>
              </div>

              <input
                type="text"
                placeholder="openrouter/free"
                value={openrouterModel}
                onChange={(e) => setOpenrouterModel(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
              />

              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Auto Free', val: 'openrouter/free' },
                  { label: 'Gemini 2.0 Flash', val: 'google/gemini-2.0-flash-exp:free' },
                  { label: 'Llama 3.3 70B', val: 'meta-llama/llama-3.3-70b-instruct:free' },
                  { label: 'DeepSeek R1', val: 'deepseek/deepseek-r1:free' },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setOpenrouterModel(preset.val)}
                    className={`text-[10px] px-2.5 py-1 rounded-lg border font-headline transition-all cursor-pointer ${
                      openrouterModel === preset.val
                        ? 'bg-primary text-on-primary border-primary font-bold shadow-xs'
                        : 'bg-surface-container-low border-surface-container-high text-outline hover:text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Model Selection (for Groq) */}
          {activeTab === 'groq' && (
            <div className="space-y-2 pt-2 border-t border-surface-container/60">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-headline font-semibold text-outline">Model</span>
                <button
                  type="button"
                  onClick={() => setIsGroqModelModalOpen(true)}
                  className="text-[11px] font-headline font-semibold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[13px]">explore</span>
                  Browse
                </button>
              </div>

              <input
                type="text"
                placeholder="llama-3.3-70b-versatile"
                value={groqModel}
                onChange={(e) => setGroqModel(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
              />

              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Llama 3.3 70B', val: 'llama-3.3-70b-versatile' },
                  { label: 'Llama 3.1 8B (Fast)', val: 'llama-3.1-8b-instant' },
                  { label: 'DeepSeek R1 70B', val: 'deepseek-r1-distill-llama-70b' },
                  { label: 'Gemma 2 9B', val: 'gemma2-9b-it' },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setGroqModel(preset.val)}
                    className={`text-[10px] px-2.5 py-1 rounded-lg border font-headline transition-all cursor-pointer ${
                      groqModel === preset.val
                        ? 'bg-primary text-on-primary border-primary font-bold shadow-xs'
                        : 'bg-surface-container-low border-surface-container-high text-outline hover:text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Model Selection (for Hugging Face) */}
          {activeTab === 'huggingface' && (
            <div className="space-y-2 pt-2 border-t border-surface-container/60">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-headline font-semibold text-outline">Model</span>
                <button
                  type="button"
                  onClick={() => setIsHfModelModalOpen(true)}
                  className="text-[11px] font-headline font-semibold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[13px]">explore</span>
                  Browse
                </button>
              </div>

              <input
                type="text"
                placeholder="Qwen/Qwen2.5-72B-Instruct"
                value={huggingfaceModel}
                onChange={(e) => setHuggingfaceModel(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
              />

              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Qwen 2.5 72B (Free)', val: 'Qwen/Qwen2.5-72B-Instruct' },
                  { label: 'DeepSeek R1 (Free)', val: 'deepseek-ai/DeepSeek-R1' },
                  { label: 'Mistral 7B (Free)', val: 'mistralai/Mistral-7B-Instruct-v0.3' },
                  { label: 'Gemma 2 9B (Free)', val: 'google/gemma-2-9b-it' },
                  { label: 'Phi-3.5 Mini (Free)', val: 'microsoft/Phi-3.5-mini-instruct' },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setHuggingfaceModel(preset.val)}
                    className={`text-[10px] px-2.5 py-1 rounded-lg border font-headline transition-all cursor-pointer ${
                      huggingfaceModel === preset.val
                        ? 'bg-primary text-on-primary border-primary font-bold shadow-xs'
                        : 'bg-surface-container-low border-surface-container-high text-outline hover:text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Minimal Privacy Micro-Notice */}
          <div className="flex items-center justify-between pt-1 text-[11px] text-outline">
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-primary">lock</span>
              Stored locally on this device
            </span>
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSaveAiKeys}
            className="w-full h-10 rounded-2xl bg-primary text-on-primary font-headline text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs hover:bg-primary/90 active:scale-[0.99] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            <span>Save Settings</span>
          </button>
        </div>

        {/* OpenRouter Model Selection Modal */}
        <OpenRouterModelModal
          isOpen={isModelModalOpen}
          onClose={() => setIsModelModalOpen(false)}
          selectedModel={openrouterModel}
          onSelectModel={setOpenrouterModel}
          apiKey={openrouterKey}
          showToast={showToast}
        />

        {/* Groq Model Selection Modal */}
        <GroqModelModal
          isOpen={isGroqModelModalOpen}
          onClose={() => setIsGroqModelModalOpen(false)}
          selectedModel={groqModel}
          onSelectModel={setGroqModel}
          apiKey={groqKey}
          showToast={showToast}
        />

        {/* Hugging Face Model Selection Modal */}
        <HuggingFaceModelModal
          isOpen={isHfModelModalOpen}
          onClose={() => setIsHfModelModalOpen(false)}
          selectedModel={huggingfaceModel}
          onSelectModel={setHuggingfaceModel}
          apiKey={huggingfaceKey}
          showToast={showToast}
        />
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
        onClick={() => {
          setActiveTab(provider);
          setIsApiKeySettingsOpen(true);
        }}
        className="w-full rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-4 shadow-xs flex items-center gap-3.5 text-left hover:bg-surface-container-low transition-all cursor-pointer group"
      >
        <span className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <span className="material-symbols-outlined text-[22px]">smart_toy</span>
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="block text-xs font-headline font-bold text-on-surface">AI Providers & API Keys</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-headline font-semibold bg-primary/10 text-primary border border-primary/20">
              {provider === 'gemini' ? 'Gemini' : provider === 'openai' ? 'OpenAI' : provider === 'openrouter' ? 'OpenRouter' : provider === 'groq' ? 'Groq' : 'Hugging Face'} Active
            </span>
          </span>
          <span className="block mt-1 text-[11px] font-body text-outline truncate">
            {configuredCount > 0
              ? `${configuredCount} provider${configuredCount > 1 ? 's' : ''} connected • Tap to configure keys & models`
              : 'Connect Gemini, OpenRouter, Groq & more'}
          </span>
        </span>
        <span className="material-symbols-outlined text-outline group-hover:text-on-surface text-[20px] transition-colors">chevron_right</span>
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

      {/* OpenRouter Model Selection Modal */}
      <OpenRouterModelModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        selectedModel={openrouterModel}
        onSelectModel={setOpenrouterModel}
        apiKey={openrouterKey}
        showToast={showToast}
      />

      {/* Groq Model Selection Modal */}
      <GroqModelModal
        isOpen={isGroqModelModalOpen}
        onClose={() => setIsGroqModelModalOpen(false)}
        selectedModel={groqModel}
        onSelectModel={setGroqModel}
        apiKey={groqKey}
        showToast={showToast}
      />

      {/* Hugging Face Model Selection Modal */}
      <HuggingFaceModelModal
        isOpen={isHfModelModalOpen}
        onClose={() => setIsHfModelModalOpen(false)}
        selectedModel={huggingfaceModel}
        onSelectModel={setHuggingfaceModel}
        apiKey={huggingfaceKey}
        showToast={showToast}
      />

    </div>
  );
}
