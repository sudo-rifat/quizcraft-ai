import React, { useState, useEffect } from 'react';
import { Smartphone, Download, CheckCircle, X } from 'lucide-react';

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("অ্যান্ড্রয়েড ব্রাউজারের থ্রি-ডট (Three dots menu) অপশন থেকে 'Add to Home Screen' বা 'Install App' এ ক্লিক করুন!");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="bg-emerald-950/80 border border-emerald-700/60 px-4 py-2 text-xs font-semibold text-emerald-300 text-center flex items-center justify-center gap-2">
        <CheckCircle className="w-4 h-4 text-emerald-400" />
        <span>QuizCraft PWA আপনার অ্যান্ড্রয়েড ডিভাইসে ইনস্টল অবস্থায় চলছে!</span>
      </div>
    );
  }

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 border-b border-indigo-700/50 px-4 py-3 text-white text-xs sm:text-sm flex items-center justify-between shadow-lg relative z-50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-md">
          <Smartphone className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-white block">অ্যান্ড্রয়েড অ্যাপ হিসেবে ইনস্টল করুন!</span>
          <span className="text-slate-300 text-xs hidden sm:inline">হোম স্ক্রিনে সরাসরি অ্যাপের মতো ব্যবহার করতে PWA ইনস্টল করুন।</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleInstallClick}
          className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>ইনস্টল করুন</span>
        </button>

        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
