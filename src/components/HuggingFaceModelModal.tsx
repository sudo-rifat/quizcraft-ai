import React, { useState, useEffect } from 'react';

export interface HuggingFaceModelItem {
  id: string;
  name: string;
  description?: string;
  downloads?: number;
}

export const CURATED_HF_MODELS: HuggingFaceModelItem[] = [
  { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B Instruct (Free & Un-gated)', description: 'State-of-the-art multilingual and reasoning model by Alibaba. Completely open and free.' },
  { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1 (Free & Un-gated)', description: 'Top-tier open reasoning model. No license gating.' },
  { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3 (Free & Un-gated)', description: 'High-performance mixture of experts chat model.' },
  { id: 'mistralai/Mistral-7B-Instruct-v0.3', name: 'Mistral 7B Instruct v0.3 (Free)', description: 'Fast, lightweight, reliable instruction-following model.' },
  { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', name: 'Qwen 2.5 Coder 32B (Free)', description: 'Specialized model for code generation, math, and logic.' },
  { id: 'google/gemma-2-9b-it', name: 'Google Gemma 2 9B IT (Free)', description: 'Balanced high-accuracy model by Google DeepMind.' },
  { id: 'google/gemma-2-2b-it', name: 'Google Gemma 2 2B IT (Fast & Free)', description: 'Ultra-fast lightweight model for instant generation.' },
  { id: 'microsoft/Phi-3.5-mini-instruct', name: 'Microsoft Phi-3.5 Mini (Free)', description: 'Compact, high-capability mini model by Microsoft.' },
  { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral 8x7B Instruct (Free)', description: 'High-performance sparse mixture of experts.' },
  { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Meta Llama 3.3 70B (Gated - Requires Meta Agreement)', description: 'Requires accepting license terms on Hugging Face first.' },
];

interface HuggingFaceModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  apiKey?: string;
  showToast: (type: string, message: string) => void;
}

export default function HuggingFaceModelModal({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
  apiKey,
  showToast,
}: HuggingFaceModelModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [models, setModels] = useState<HuggingFaceModelItem[]>(CURATED_HF_MODELS);
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
      const res = await fetch('https://huggingface.co/api/models?pipeline_tag=text-generation&sort=downloads&direction=-1&limit=40', {
        headers: apiKey?.trim() ? { Authorization: `Bearer ${apiKey.trim()}` } : {},
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch Hugging Face models (${res.status})`);
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        const fetched: HuggingFaceModelItem[] = data.map((m: any) => ({
          id: m.modelId || m._id || m.id,
          name: m.modelId || m.id,
          description: m.tags ? `Tags: ${m.tags.slice(0, 4).join(', ')}` : undefined,
          downloads: m.downloads,
        }));
        setModels(fetched);
        showToast('success', `Fetched ${fetched.length} models from Hugging Face Hub!`);
      } else {
        throw new Error('Invalid response from Hugging Face');
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
              Hugging Face Hub
            </span>
            <h2 className="font-headline text-xl font-bold text-on-surface mt-0.5">
              Select Hugging Face Model
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
              {isLoading ? 'Fetching...' : 'Fetch Top Models'}
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
              placeholder="Search through Hugging Face models by name or ID..."
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
              placeholder="Or enter custom repository ID (e.g., meta-llama/Llama-3.3-70B-Instruct)"
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
                      {m.downloads !== undefined && (
                        <span className="text-[10px] font-mono text-outline bg-surface-container px-2 py-0.5 rounded-md">
                          Downloads: {m.downloads.toLocaleString()}
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
          <span>Hugging Face Serverless Inference API</span>
        </div>
      </div>
    </div>
  );
}
