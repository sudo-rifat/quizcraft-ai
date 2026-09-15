import React, { useRef } from 'react';
import { Archive, Trash2, RotateCcw, PieChart, Calendar, Star, Download, Upload, TrendingUp } from 'lucide-react';

interface HistoryPortalProps {
  history: any[];
  onRetakeItem: (id: string) => void;
  onViewResult: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
  onImportHistory: (data: any[]) => void;
  showToast: (type: string, message: string) => void;
}

export default function HistoryPortal({ history, onRetakeItem, onViewResult, onDeleteItem, onClearAll, onImportHistory, showToast }: HistoryPortalProps) {
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleExportBackup = () => {
    if (history.length === 0) {
      showToast('warning', 'এক্সপোর্ট করার জন্য কোনো হিস্ট্রি পাওয়া যায়নি!');
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `quizcraft_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('success', 'হিস্ট্রি ব্যাকআপ ডাউনলোড করা হয়েছে!');
  };

  const handleImportFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const parsed = JSON.parse(result);
        if (Array.isArray(parsed)) {
          onImportHistory(parsed);
        } else {
          showToast('error', 'অবৈধ ব্যাকআপ ফাইল ফরম্যাট!');
        }
      } catch (err) {
        showToast('error', 'ব্যাকআপ ফাইলটি সঠিক JSON নয়!');
      }
    };
    reader.readAsText(file);
  };

  const recentHistory = [...history].reverse().slice(-10);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-tiro font-bold text-teal-950">
          সংরক্ষিত কুইজ ও হিস্ট্রি
        </h2>
        <p className="text-slate-600 text-xs sm:text-sm max-w-lg mx-auto font-medium">
          আপনার আগের নেওয়া সকল পরীক্ষা ব্রাউজারে সুরক্ষিত রয়েছে।
        </p>
      </div>

      {/* Action Bar */}
      <div className="card-teal-accent p-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold text-teal-950">
          মোট সেভড পরীক্ষা: <strong className="text-amber-600 font-display text-sm">{history.length}</strong>
        </span>

        <div className="flex items-center gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => handleImportFile(e.target.files?.[0])}
          />
          <button
            onClick={() => importInputRef.current?.click()}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-teal-900 text-xs font-bold transition border border-slate-300 flex items-center gap-1 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-teal-700" />
            <span>ইমপোর্ট</span>
          </button>

          <button
            onClick={handleExportBackup}
            className="px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-300" />
            <span>এক্সপোর্ট ব্যাকআপ</span>
          </button>

          {history.length > 0 && (
            <button
              onClick={onClearAll}
              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition border border-rose-200 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            </button>
          )}
        </div>
      </div>

      {/* Performance Graph Card */}
      {recentHistory.length > 0 && (
        <div className="card-teal-accent p-4 space-y-2">
          <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-teal-700" /> পারফরম্যান্স ট্রেন্ড (% Score)
          </span>

          <div className="h-32 flex items-end justify-between gap-1.5 pt-4 border-b border-slate-200">
            {recentHistory.map((rec, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] font-bold text-teal-900">{rec.stats?.accuracyPercent || 0}%</span>
                <div
                  className="w-full max-w-[20px] bg-teal-700 rounded-t-md transition-all duration-300"
                  style={{ height: `${Math.max(10, rec.stats?.accuracyPercent || 0)}%` }}
                />
                <span className="text-[9px] text-slate-500 font-bold">#{idx + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid */}
      {history.length === 0 ? (
        <div className="text-center py-12 space-y-2 bg-white border border-slate-200 rounded-2xl p-6">
          <Archive className="w-10 h-10 text-slate-400 mx-auto" />
          <p className="text-slate-500 text-xs font-bold">কোনো সেভ করা কুইজ পাওয়া যায়নি। একটি পরীক্ষা শুরু করুন!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {history.map((rec) => {
            const dateStr = new Date(rec.timestamp).toLocaleDateString('bn-BD');

            return (
              <div key={rec.id} className="card-teal-accent p-4 space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" /> {dateStr}
                    </span>
                    <span className="font-bold text-teal-900 bg-teal-100 px-2 py-0.5 rounded-full">
                      {rec.stats?.accuracyPercent || 0}% Score
                    </span>
                  </div>

                  <h3 className="font-bold text-teal-950 text-sm font-tiro line-clamp-1">
                    {rec.quiz_title}
                  </h3>

                  <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600">
                    <span>{rec.quiz_data?.questions?.length || 0} প্রশ্ন</span>
                    <span className="flex items-center gap-1 text-amber-600">
                      <Star className="w-3 h-3" /> {rec.stats?.obtainedMarks || 0} / {rec.stats?.totalMarks || 0}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                  <button
                    onClick={() => onRetakeItem(rec.id)}
                    className="flex-grow py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3 text-amber-300" /> Re-take
                  </button>
                  <button
                    onClick={() => onViewResult(rec.id)}
                    className="py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-teal-900 font-bold text-xs transition border cursor-pointer"
                  >
                    <PieChart className="w-3.5 h-3.5 text-teal-700" />
                  </button>
                  <button
                    onClick={() => onDeleteItem(rec.id)}
                    className="py-1.5 px-2.5 rounded-lg bg-rose-50 text-rose-700 font-bold text-xs transition border border-rose-200 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
