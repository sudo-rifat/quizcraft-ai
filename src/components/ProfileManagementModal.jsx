import React, { useState } from 'react';
import { useActiveProfile } from '../context/ProfileContext';
import StitchSelect from './StitchSelect';

const PRESET_COLORS = ['#006a60', '#00658f', '#6750a4', '#984061', '#705d00', '#825500', '#2b6b37', '#9c4300'];
const GRADE_OPTIONS = [
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 
  'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 
  'Class 11', 'Class 12', 
  'Admission Test', 'Job / BCS', 'General Learning'
];

export default function ProfileManagementModal({ isOpen, onClose, showToast }) {
  const { profiles, activeProfile, updateProfile, deleteProfile, setIsProfileSelectorOpen } = useActiveProfile();

  const [editingProfile, setEditingProfile] = useState(null);
  const [deleteConfirmProfile, setDeleteConfirmProfile] = useState(null);

  // Edit Form Fields
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('Class 10');
  const [color, setColor] = useState('#006a60');
  const [pin, setPin] = useState('');

  if (!isOpen) return null;

  const handleStartEdit = (profile) => {
    setEditingProfile(profile);
    setName(profile.name);
    setGrade(profile.grade || 'Class 10');
    setColor(profile.avatar?.color || '#006a60');
    setPin('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingProfile) return;

    try {
      await updateProfile(editingProfile.id, {
        name,
        grade,
        avatar: {
          ...editingProfile.avatar,
          color,
          value: name.trim().charAt(0).toUpperCase()
        },
        pin: pin.trim() ? pin.trim() : (pin === '' && editingProfile.pinEnabled ? '' : undefined)
      });

      showToast?.('success', 'Profile updated successfully.');
      setEditingProfile(null);
    } catch (err) {
      showToast?.('error', err.message);
    }
  };

  const handleDelete = async (profile) => {
    try {
      await deleteProfile(profile.id);
      showToast?.('info', `Profile "${profile.name}" and all associated data have been permanently deleted.`);
      setDeleteConfirmProfile(null);
    } catch (err) {
      showToast?.('error', err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-surface border border-surface-container-high rounded-3xl p-5 space-y-4 shadow-2xl my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-container pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">manage_accounts</span>
            <h2 className="font-headline font-semibold text-base text-on-surface">Manage Profiles & Data</h2>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-outline hover:text-on-surface cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* List of Profiles */}
        {!editingProfile && (
          <div className="space-y-3">
            <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
              {profiles.map((p) => {
                const isActive = p.id === activeProfile?.id;
                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-2xl bg-surface-container-lowest border border-surface-container/80 flex items-center justify-between shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-headline font-bold text-white text-sm shrink-0"
                        style={{ backgroundColor: p.avatar?.color || '#006a60' }}
                      >
                        {p.avatar?.value || p.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-headline font-semibold text-xs text-on-surface flex items-center gap-1">
                          <span>{p.name}</span>
                          {isActive && (
                            <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">Active</span>
                          )}
                        </h3>
                        <p className="text-[11px] font-body text-outline">{p.grade || 'Student'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(p)}
                        className="w-8 h-8 rounded-xl bg-surface-container-low text-on-surface flex items-center justify-center hover:bg-surface-container transition-all cursor-pointer"
                        title="Edit Profile"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>

                      <button
                        onClick={() => setDeleteConfirmProfile(p)}
                        className="w-8 h-8 rounded-xl bg-error-container/30 border border-error/20 text-error flex items-center justify-center hover:bg-error-container transition-all cursor-pointer"
                        title="Delete Profile"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                onClose();
                setIsProfileSelectorOpen(true);
              }}
              className="w-full h-10 rounded-xl bg-surface-container-low border border-surface-container-high text-primary font-headline text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-surface-container cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Create New Student Profile</span>
            </button>
          </div>
        )}

        {/* Edit Profile Form */}
        {editingProfile && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-semibold text-sm text-on-surface">Edit Profile: {editingProfile.name}</h3>
              <button
                type="button"
                onClick={() => setEditingProfile(null)}
                className="text-xs font-body text-outline hover:text-on-surface cursor-pointer"
              >
                Back
              </button>
            </div>

            <div>
              <label className="block text-xs font-body text-outline mb-1">Student Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-body text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-body text-outline mb-1">Class / Goal</label>
              <StitchSelect
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                options={GRADE_OPTIONS}
                className="w-full h-10 px-3 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-body text-outline mb-1.5">Avatar Color</label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-primary ring-offset-2' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-body text-outline mb-1">
                PIN Protection (Current: {editingProfile.pinEnabled ? 'Enabled' : 'Disabled'})
              </label>
              <input
                type="password"
                maxLength={4}
                placeholder="Enter new 4-digit PIN (leave empty to keep current)"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-body text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setEditingProfile(null)}
                className="px-4 py-2 rounded-xl text-xs font-headline font-semibold text-on-surface hover:bg-surface-container-low cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-headline font-semibold shadow-xs hover:bg-primary/90 cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmProfile && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-xs rounded-2xl bg-surface-container-lowest border border-error/30 p-5 space-y-4 shadow-2xl">
              <div className="text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-error-container text-on-error-container flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-xl">warning</span>
                </div>
                <h3 className="font-headline font-semibold text-base text-on-surface">Delete this profile?</h3>
                <p className="text-xs font-body text-outline leading-relaxed">
                  This will permanently remove <strong>{deleteConfirmProfile.name}</strong>'s quizzes, results, history, and progress from this device.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmProfile(null)}
                  className="flex-1 h-10 rounded-xl bg-surface-container-low text-on-surface font-headline text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteConfirmProfile)}
                  className="flex-1 h-10 rounded-xl bg-error text-on-error font-headline text-xs font-semibold shadow-xs hover:bg-error/90 cursor-pointer"
                >
                  Delete Profile
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
