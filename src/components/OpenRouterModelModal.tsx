import React, { useState, useEffect } from 'react';

export interface OpenRouterModelItem {
  id: string;
  name: string;
  description?: string;
  pricing?: { prompt?: string; completion?: string };
  context_length?: number;
}

export const CURATED_FREE_MODELS: OpenRouterModelItem[] = [
  { id: 'openrouter/free', name: 'OpenRouter Free Auto-Router', description: 'Automatically routes to available free models.' },
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Google Gemini 2.0 Flash Experimental (Free)', description: 'Next-gen multimodal fast model by Google.' },
  { id: 'google/gemini-flash-1.5:free', name: 'Google Gemini Flash 1.5 (Free)', description: 'Fast and versatile with large context window.' },
  { id: 'google/gemini-pro-1.5:free', name: 'Google Gemini Pro 1.5 (Free)', description: 'Advanced reasoning and analysis by Google.' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Meta Llama 3.3 70B Instruct (Free)', description: 'Powerful open weights model for complex reasoning.' },
  { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Meta Llama 3.1 8B Instruct (Free)', description: 'Fast lightweight model for general tasks.' },
  { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Meta Llama 3.2 3B Instruct (Free)', description: 'Ultra-fast compact model.' },
  { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 Reasoning (Free)', description: 'State-of-the-art open reasoning model.' },
  { id: 'deepseek/deepseek-chat:free', name: 'DeepSeek V3 Chat (Free)', description: 'High-performance general assistant.' },
  { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B Instruct (Free)', description: 'Reliable fast instruction-tuned model.' },
  { id: 'mistralai/mistral-nemo:free', name: 'Mistral Nemo 12B (Free)', description: 'Collaborative model by Mistral & NVIDIA.' },
  { id: 'mistralai/mixtral-8x7b-instruct:free', name: 'Mistral Mixtral 8x7B (Free)', description: 'High performance sparse mixture of experts.' },
  { id: 'qwen/qwen-2.5-72b-instruct:free', name: 'Qwen 2.5 72B Instruct (Free)', description: 'Top-tier multilingual & coding model by Alibaba.' },
  { id: 'qwen/qwen-2.5-coder-7b-instruct:free', name: 'Qwen 2.5 Coder 7B (Free)', description: 'Specialized coding & logic model.' },
  { id: 'microsoft/phi-3-medium-128k-instruct:free', name: 'Microsoft Phi-3 Medium (Free)', description: 'High capability compact reasoning model.' },
  { id: 'microsoft/phi-3.5-mini-instruct:free', name: 'Microsoft Phi-3.5 Mini (Free)', description: 'Fast lightweight model by Microsoft.' },
  { id: 'google/gemma-2-9b-it:free', name: 'Google Gemma 2 9B (Free)', description: 'Open weights model by Google DeepMind.' },
  { id: 'nousresearch/hermes-3-llama-3.1-70b:free', name: 'Hermes 3 Llama 3.1 70B (Free)', description: 'Advanced roleplay and instruction following.' },
  { id: 'cognitivecomputations/dolphin-mixtral-8x7b:free', name: 'Dolphin Mixtral 8x7B (Free)', description: 'Uncensored instruction model.' },
  { id: 'openchat/openchat-7b:free', name: 'OpenChat 7B (Free)', description: 'Optimized conversational model.' },
];

interface OpenRouterModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  apiKey?: string;
  showToast: (type: string, message: string) => void;
}

export default function OpenRouterModelModal({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
  apiKey,
  showToast,
}: OpenRouterModelModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [models, setModels] = useState<OpenRouterModelItem[]>(CURATED_FREE_MODELS);
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
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey?.trim()) {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      }

      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers,
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch models (${res.status})`);
      }

      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        const fetched: OpenRouterModelItem[] = data.data.map((m: any) => ({
          id: m.id,
          name: m.name || m.id,
          description: m.description,
          pricing: m.pricing,
          context_length: m.context_length,
        }));

        // Merge with curated or keep fetched
        // Prioritize free models or show all
        setModels(fetched);
        showToast('success', `Fetched ${fetched.length} models from OpenRouter!`);
      } else {
        throw new Error('Invalid response structure from OpenRouter');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to fetch live models. Using curated list.');
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-surface-container-lowest border border-surface-container/80 p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-outline-variant/20">
          <div>
            <span className="text-[11px] font-headline font-semibold text-primary uppercase tracking-wider">
              OpenRouter Studio
            </span>
            <h2 className="font-headline text-xl font-bold text-on-surface mt-0.5">
              Select OpenRouter Model
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFetchLiveModels}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-headline font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[16px] ${isLoading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              {isLoading ? 'Fetching...' : 'Fetch Live Models'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Search & Custom Input Bar */}
        <div className="py-4 space-y-3">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline material-symbols-outlined text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search through models by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-sans text-on-surface focus:outline-none focus:border-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">clear</span>
              </button>
            )}
          </div>

          <form onSubmit={handleCustomSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Or enter custom model ID (e.g., anthropic/claude-3.5-sonnet)"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="flex-1 h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!customInput.trim()}
              className="px-4 h-10 rounded-xl bg-primary text-on-primary font-headline text-xs font-semibold hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50"
            >
              Use Custom
            </button>
          </form>
        </div>

        {/* Models List Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {filteredModels.length === 0 ? (
            <div className="py-12 text-center text-outline text-xs font-sans">
              No models found matching "{searchQuery}". Try a different search or enter a custom model ID above.
            </div>
          ) : (
            filteredModels.map((m) => {
              const isSelected = selectedModel === m.id;
              const isFree = m.id.endsWith(':free') || m.id === 'openrouter/free' || (m.pricing && Number(m.pricing.prompt) === 0 && Number(m.pricing.completion) === 0);
              return (
                <div
                  key={m.id}
                  onClick={() => {
                    onSelectModel(m.id);
                    onClose();
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-xs'
                      : 'bg-surface-container-low hover:bg-surface-container border-outline-variant/30 text-on-surface'
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-headline font-bold text-xs text-on-surface">{m.name}</span>
                      {isFree && (
                        <span className="text-[10px] font-headline font-bold bg-tertiary/15 text-tertiary px-2 py-0.5 rounded-full">
                          FREE
                        </span>
                      )}
                      {m.context_length && (
                        <span className="text-[10px] font-mono text-outline bg-surface-container px-2 py-0.5 rounded-md">
                          Ctx: {Math.round(m.context_length / 1024)}k
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-outline break-all">{m.id}</p>
                    {m.description && (
                      <p className="text-[11px] font-sans text-on-surface-variant line-clamp-2 mt-0.5">
                        {m.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center self-center">
                    {isSelected ? (
                      <span className="material-symbols-outlined text-primary text-[20px] font-bold">
                        check_circle
                      </span>
                    ) : (
                      <span className="text-xs font-headline font-semibold text-primary px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary hover:text-on-primary transition-all">
                        Select
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-outline-variant/20 flex items-center justify-between text-[11px] text-outline">
          <span>Showing {filteredModels.length} models</span>
          <span>Tip: Models ending with <code className="font-mono text-primary">:free</code> are zero-cost.</span>
        </div>
      </div>
    </div>
  );
}
