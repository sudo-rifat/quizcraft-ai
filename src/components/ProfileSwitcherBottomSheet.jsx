import React, { useState } from 'react';
import { useActiveProfile } from '../context/ProfileContext';

export default function ProfileSwitcherBottomSheet({ isOpen, onClose, onOpenManagement, showToast, currentTab, onRequestSwitchProfile }) {
  const { profiles, activeProfile, switchProfile, setIsProfileSelectorOpen } = useActiveProfile();

  const [selectedForPin, setSelectedForPin] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  if (!isOpen) return null;

  const handleSelect = async (profile) => {
    if (profile.id === activeProfile?.id) {
      onClose();
      return;
    }

    // Safety check if in active exam
    if (currentTab === 'exam') {
      onRequestSwitchProfile(() => performSwitch(profile));
      onClose();
      return;
    }

    await performSwitch(profile);
  };

  const performSwitch = async (profile) => {
    if (profile.pinEnabled) {
      setSelectedForPin(profile);
      setPinInput('');
      setPinError('');
    } else {
      try {
        await switchProfile(profile.id);
        onClose();
        showToast?.('success', `Switched to ${profile.name}`);
      } catch (err) {
        showToast?.('error', err.message);
      }
    }
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (!selectedForPin) return;

    try {
      await switchProfile(selectedForPin.id, pinInput);
      setSelectedForPin(null);
      onClose();
      showToast?.('success', `Switched to ${selectedForPin.name}`);
    } catch (err) {
      setPinError(err.message || 'Incorrect PIN');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex flex-col justify-end transition-opacity">
      {/* Backdrop overlay touch to dismiss */}
      <div className="flex-1" onClick={onClose} />

      {/* Sheet Content */}
      <div className="w-full max-w-md mx-auto bg-surface border-t border-surface-container-high rounded-t-3xl p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-300">
        
        {/* Handlebar */}
        <div className="w-10 h-1 rounded-full bg-surface-container-high mx-auto mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">group</span>
            <h2 className="font-headline font-semibold text-base text-on-surface">Switch Profile</h2>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-outline hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Profile List */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
          {profiles.map((p) => {
            const isActive = p.id === activeProfile?.id;
            return (
              <div
                key={p.id}
                onClick={() => handleSelect(p)}
                className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary-container/30 border-primary/40 text-on-surface'
                    : 'bg-surface-container-lowest border-surface-container/80 text-on-surface hover:bg-surface-container-low'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-headline font-bold text-white text-sm shrink-0"
                    style={{ backgroundColor: p.avatar?.color || '#006a60' }}
                  >
                    {p.avatar?.value || p.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-headline font-semibold text-xs text-on-surface flex items-center gap-1.5">
                      <span>{p.name}</span>
                      {p.pinEnabled && (
                        <span className="material-symbols-outlined text-[14px] text-outline">lock</span>
                      )}
                    </h3>
                    <p className="text-[11px] font-body text-outline">{p.grade || 'Student'}</p>
                  </div>
                </div>

                {isActive ? (
                  <span className="px-2.5 py-1 rounded-full bg-primary text-on-primary font-headline text-[11px] font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">check</span>
                    Active
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-outline/50 text-lg">chevron_right</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-surface-container flex items-center gap-2">
          <button
            onClick={() => {
              onClose();
              setIsProfileSelectorOpen(true);
            }}
            className="flex-1 h-10 rounded-xl bg-surface-container-low border border-surface-container-high text-on-surface font-headline text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            <span>Add Profile</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenManagement?.();
            }}
            className="flex-1 h-10 rounded-xl bg-primary text-on-primary font-headline text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs hover:bg-primary/90"
          >
            <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
            <span>Manage Profiles</span>
          </button>
        </div>
      </div>

      {/* PIN Prompt inside Bottom Sheet */}
      {selectedForPin && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handlePinSubmit} className="w-full max-w-xs rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-5 space-y-4 shadow-xl">
            <div className="text-center space-y-1">
              <h3 className="font-headline font-semibold text-base text-on-surface">PIN required for {selectedForPin.name}</h3>
              <p className="text-[11px] font-body text-outline">Enter 4-digit PIN</p>
            </div>

            <div>
              <input
                type="password"
                autoFocus
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full h-12 text-center text-lg font-mono tracking-widest rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface focus:outline-none focus:border-primary"
                placeholder="••••"
              />
              {pinError && <p className="text-[11px] text-error font-body mt-1 text-center">{pinError}</p>}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedForPin(null)}
                className="flex-1 h-10 rounded-xl bg-surface-container-low text-on-surface font-headline text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 h-10 rounded-xl bg-primary text-on-primary font-headline text-xs font-semibold"
              >
                Unlock
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
