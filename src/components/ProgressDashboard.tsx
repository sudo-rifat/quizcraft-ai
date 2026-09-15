import React, { useRef } from 'react';
import { db } from '../db/db';
import { useActiveProfile } from '../context/ProfileContext';
import { useProfileResults } from '../hooks/useProfileResults';
import { ExamResult } from '../types';

interface ProgressDashboardProps {
  showToast: (type: string, message: string) => void;
  onViewResult: (result: ExamResult) => void;
}

export default function ProgressDashboard({ showToast, onViewResult }: ProgressDashboardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { activeProfileId, activeProfile } = useActiveProfile();

  const history = useProfileResults(activeProfileId);
  const totalTests = history.length;
  
  const averageScore = totalTests > 0 
    ? Math.round(history.reduce((acc, curr) => acc + ((curr as any).percentage || 0), 0) / totalTests) 
    : 0;

  const averageAccuracy = totalTests > 0 
    ? Math.round(history.reduce((acc, curr) => acc + (curr.accuracy || 0), 0) / totalTests) 
    : 0;

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
          const recordsToImport = parsed.map(record => ({
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

  const handleDeleteItem = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      await db.examResults.delete(id);
      showToast('info', 'Record deleted.');
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full pb-28 pt-2 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline font-semibold text-xl text-on-surface tracking-tight">
            Quiz History & Archives
          </h1>
          <p className="text-xs font-body text-outline mt-0.5">
            {totalTests} completed assessments recorded
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => handleImportFile(e.target.files?.[0])}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-9 px-3 rounded-xl bg-surface-container-low border border-surface-container-high text-on-surface text-xs font-headline font-semibold flex items-center gap-1 transition-all cursor-pointer"
            title="Import Backup"
          >
            <span className="material-symbols-outlined text-[16px]">upload</span>
            <span>Import</span>
          </button>

          <button
            onClick={handleExportBackup}
            className="h-9 px-3 rounded-xl bg-primary text-on-primary text-xs font-headline font-semibold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
            title="Export JSON Backup"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Backup</span>
          </button>
        </div>
      </div>

      {/* Analytics Summary */}
      {totalTests > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-4 flex flex-col">
            <span className="text-xs font-body text-outline">Avg. Score</span>
            <span className="font-headline text-2xl font-bold text-primary mt-1">{averageScore}%</span>
            <span className="text-[11px] font-body text-tertiary mt-0.5">Overall Performance</span>
          </div>

          <div className="rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-4 flex flex-col">
            <span className="text-xs font-body text-outline">Accuracy</span>
            <span className="font-headline text-2xl font-bold text-on-surface mt-1">{averageAccuracy}%</span>
            <span className="text-[11px] font-body text-secondary mt-0.5">Precision Ratio</span>
          </div>
        </div>
      )}

      {/* History Items List */}
      <div className="space-y-3">
        {totalTests === 0 ? (
          <div className="rounded-2xl bg-surface-container-lowest border border-dashed border-surface-container-high p-8 text-center space-y-2">
            <span className="material-symbols-outlined text-3xl text-outline">history</span>
            <p className="text-xs font-headline font-semibold text-on-surface">No quiz history found yet.</p>
            <p className="text-xs font-body text-outline">Take a quiz to automatically build your learning record!</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {history.map((rec) => {
              const dateObj = new Date(rec.timestamp);
              const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

              return (
                <div 
                  key={rec.id}
                  className="rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-4 shadow-xs flex flex-col space-y-3 hover:bg-surface-container-low/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-headline font-semibold text-sm text-on-surface leading-snug">
                        {rec.quiz_title}
                      </h3>
                      <p className="text-xs font-body text-outline mt-0.5">
                        {dateStr} • {(rec as any).quiz_data?.questions?.length || 20} Questions
                      </p>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-surface-container text-primary font-headline text-xs font-bold shrink-0">
                      {(rec as any).percentage}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-body text-on-surface-variant pt-1">
                    <span>Score: {rec.score} / {(rec as any).maxScore}</span>
                    <span>Accuracy: {rec.accuracy}%</span>
                    <span>Time: {(rec as any).timeSpentFormatted}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-surface-container">
                    <button
                      onClick={() => onViewResult(rec)}
                      className="flex-1 h-9 rounded-xl bg-surface-container-low border border-surface-container-high text-primary font-headline text-xs font-semibold flex items-center justify-center gap-1 hover:bg-surface-container transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">analytics</span>
                      <span>View Report</span>
                    </button>

                    <button
                      onClick={() => handleDeleteItem(rec.id)}
                      className="w-9 h-9 rounded-xl bg-error-container/30 border border-error/20 text-error flex items-center justify-center hover:bg-error-container transition-all cursor-pointer"
                      title="Delete Record"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
