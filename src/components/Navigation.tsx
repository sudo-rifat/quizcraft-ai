import React from 'react';
import { useActiveProfile } from '../context/ProfileContext';

interface NavigationProps {
  currentTab: string;
  onSwitchTab: (tabId: string) => void;
}

export default function Navigation({ currentTab, onSwitchTab }: NavigationProps) {
  const { activeProfile, setIsSwitcherOpen } = useActiveProfile();
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const navItems = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'library', label: 'Library', icon: 'local_library' },
    { id: 'progress', label: 'Progress', icon: 'trending_up' },
    { id: 'history', label: 'History', icon: 'history' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <>
      {/* Top Header App Bar */}
      <header className="fixed top-0 w-full z-40 pt-safe bg-surface/90 backdrop-blur-md border-b border-surface-container/60">
        <div className="h-16 px-5 max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onSwitchTab('home')}>
            <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[20px]">auto_stories</span>
            </div>
            <span className="font-headline font-semibold text-lg tracking-tight text-on-surface">QuizCraft AI</span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-surface-container/80">
              {navItems.map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSwitchTab(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-headline font-semibold transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Offline/Online Status Light Dot */}
            <div 
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface-container-low border border-surface-container-high text-[11px] font-headline text-outline cursor-default"
              title={isOffline ? 'Offline Mode — Operating locally with IndexedDB' : 'Online'}
            >
              <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span className="hidden sm:inline font-medium">{isOffline ? 'Offline' : 'Online'}</span>
            </div>

            {/* Active Student Profile Avatar */}
            <button 
              onClick={() => setIsSwitcherOpen(true)}
              className="relative flex items-center gap-2 px-2 py-1 rounded-full bg-surface-container-low border border-surface-container-high transition-transform active:scale-95 cursor-pointer hover:bg-surface-container"
              title={`Active Profile: ${activeProfile?.name || 'Student'}. Tap to switch.`}
            >
              <div 
                className="w-7 h-7 rounded-full flex items-center justify-center font-headline font-bold text-white text-xs shadow-xs"
                style={{ backgroundColor: activeProfile?.avatar?.color || '#006a60' }}
              >
                <span>{activeProfile?.avatar?.value || activeProfile?.name?.charAt(0) || 'S'}</span>
              </div>
              <span className="hidden sm:inline font-headline font-semibold text-xs text-on-surface max-w-[100px] truncate">
                {activeProfile?.name || 'Student'}
              </span>
              <span className="material-symbols-outlined text-[16px] text-outline">expand_more</span>
            </button>
          </div>
        </div>
      </header>

      {/* Fixed Bottom Navigation (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-40 pb-safe bg-surface/95 backdrop-blur-xl border-t border-surface-container/60">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-4">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSwitchTab(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 w-14 py-1 cursor-pointer transition-colors ${
                  isActive ? 'text-primary' : 'text-outline hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className={`text-[10px] font-headline tracking-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
