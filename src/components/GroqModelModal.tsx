import React, { useState, useEffect } from 'react';

export interface GroqModelItem {
  id: string;
  name: string;
  description?: string;
  context_window?: number;
  developer?: string;
}

export const CURATED_GROQ_MODELS: GroqModelItem[] = [
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    description: 'Flagship multilingual reasoning and instruction following (128k context).',
    context_window: 131072,
    developer: 'Meta',
  },
  {
    id: 'llama-3.3-70b-specdec',
    name: 'Llama 3.3 70B Speculative Decoding',
    description: 'High-throughput accelerated variant of Llama 3.3 70B.',
    context_window: 8192,
    developer: 'Meta',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    description: 'Ultra-fast sub-second generation, ideal for quizzes and quick Q&A.',
    context_window: 131072,
    developer: 'Meta',
  },
  {
    id: 'deepseek-r1-distill-llama-70b',
    name: 'DeepSeek R1 Distill Llama 70B',
    description: 'Deep reasoning and step-by-step problem solving.',
    context_window: 131072,
    developer: 'DeepSeek / Meta',
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B (Legacy)',
    description: 'Sparse mixture of experts with 32k context.',
    context_window: 32768,
    developer: 'Mistral AI',
  },
  {
    id: 'gemma2-9b-it',
    name: 'Gemma 2 9B IT',
    description: 'Fast, compact instruction model by Google DeepMind.',
    context_window: 8192,
    developer: 'Google',
  },
];

interface GroqModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  apiKey?: string;
  showToast: (type: string, message: string) => void;
}

export default function GroqModelModal({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
  apiKey,
  showToast,
}: GroqModelModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [models, setModels] = useState<GroqModelItem[]>(CURATED_GROQ_MODELS);
  const [isLoading, setIsLoading] = useState(false);
  const [customInput, setCustomInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setCustomInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFetchLiveModels = async () => {
    if (!apiKey?.trim()) {
      showToast('error', 'Please enter your Groq API key first to fetch live models.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Failed to fetch models (${res.status})`);
      }

      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        // Filter out whisper / audio-only models if desired, or keep chat/text models
        const fetched: GroqModelItem[] = data
          .map((m: any) => ({
            id: m.id,
            name: m.id,
            description: m.owned_by ? `Owned by: ${m.owned_by}` : undefined,
            context_window: m.context_window,
            developer: m.owned_by,
          }))
          .sort((a: GroqModelItem, b: GroqModelItem) => a.id.localeCompare(b.id));

        setModels(fetched);
        showToast('success', `Found ${fetched.length} models from your Groq account!`);
      } else {
        throw new Error('Invalid response structure from Groq API');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to fetch live Groq models.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredModels = models.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    onSelectModel(customInput.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[85vh] rounded-3xl bg-surface-container-lowest border border-surface-container shadow-2xl flex flex-col overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-surface-container/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">bolt</span>
            </div>
            <div>
              <h2 className="font-headline font-bold text-base text-on-surface">Groq Models</h2>
              <p className="text-[11px] font-body text-outline">Select an active model from your Groq account</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-surface-container/60 space-y-3 shrink-0 bg-surface-container-low/30">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline material-symbols-outlined text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search models (e.g., llama-3.1, deepseek, 70b)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs font-headline text-on-surface focus:outline-none focus:border-primary transition-all"
              />
            </div>
            <button
              type="button"
              onClick={handleFetchLiveModels}
              disabled={isLoading}
              className="h-9 px-3 rounded-xl bg-primary text-on-primary font-headline text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50 shrink-0"
              title="Query Groq API to see the exact models your API key has access to"
            >
              {isLoading ? (
                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-[16px]">sync</span>
              )}
              <span>Fetch Live</span>
            </button>
          </div>

          {/* Direct Model ID Form */}
          <form onSubmit={handleCustomSubmit} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Or enter any custom model ID..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="flex-1 h-8 px-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs font-mono text-on-surface focus:outline-none focus:border-primary transition-all"
            />
            <button
              type="submit"
              disabled={!customInput.trim()}
              className="h-8 px-3 rounded-xl bg-surface-container border border-surface-container-high hover:border-primary/50 text-xs font-headline font-semibold text-on-surface transition-all cursor-pointer disabled:opacity-40"
            >
              Use ID
            </button>
          </form>
        </div>

        {/* Model List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          {filteredModels.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <span className="material-symbols-outlined text-3xl text-outline">search_off</span>
              <p className="text-xs text-outline font-headline">No matching models found.</p>
              <button
                type="button"
                onClick={handleFetchLiveModels}
                className="text-xs font-headline text-primary underline"
              >
                Fetch live models from your Groq API key
              </button>
            </div>
          ) : (
            filteredModels.map((item) => {
              const isSelected = selectedModel === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectModel(item.id);
                    onClose();
                  }}
                  className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-xs'
                      : 'bg-surface-container-low/70 border-surface-container hover:bg-surface-container hover:border-surface-container-high'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-headline font-semibold text-xs text-on-surface">{item.name}</span>
                      {isSelected && (
                        <span className="text-[10px] font-headline font-bold text-primary px-1.5 py-0.2 rounded-md bg-primary/15">
                          Selected
                        </span>
                      )}
                      {item.context_window && (
                        <span className="text-[10px] font-mono text-outline px-1.5 py-0.2 rounded bg-surface-container border border-surface-container-high">
                          {(item.context_window / 1024).toFixed(0)}k context
                        </span>
                      )}
                    </div>
                    <code className="text-[10px] font-mono text-outline block mt-0.5 break-all">{item.id}</code>
                    {item.description && (
                      <p className="text-[11px] font-body text-outline mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <span
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isSelected ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant'
                    }`}
                  >
                    {isSelected && <span className="material-symbols-outlined text-[13px]">check</span>}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-surface-container/60 shrink-0 bg-surface-container-lowest flex items-center justify-between text-[11px] text-outline font-body">
          <span>Click any model or use <strong>Fetch Live</strong> with your API key.</span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-headline font-semibold text-primary hover:underline cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
