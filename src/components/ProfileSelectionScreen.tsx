import React, { useState } from 'react';
import { useActiveProfile } from '../context/ProfileContext';
import StitchSelect from './StitchSelect';
import { Profile } from '../types';

const PRESET_COLORS = ['#006a60', '#00658f', '#6750a4', '#984061', '#705d00', '#825500', '#2b6b37', '#9c4300'];
const GRADE_OPTIONS = [
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 
  'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 
  'Class 11', 'Class 12', 
  'Admission Test', 'Job / BCS', 'General Learning'
];

const SUGGESTED_SUBJECTS = [
  'Physics', 'Chemistry', 'Higher Math', 'General Math',
  'Biology', 'ICT', 'English', 'Bangla', 'Accounting',
  'Finance', 'Economics', 'General Knowledge'
];

interface ProfileSelectionScreenProps {
  showToast?: (type: string, message: string) => void;
}

export default function ProfileSelectionScreen({ showToast }: ProfileSelectionScreenProps) {
  const { profiles, switchProfile, createProfile } = useActiveProfile();

  const [isCreating, setIsCreating] = useState(false);
  const [selectedForPin, setSelectedForPin] = useState<Profile | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Form State for New Profile
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('Class 10');
  const [color, setColor] = useState('#006a60');
  const [pin, setPin] = useState('');
  const [subjects, setSubjects] = useState<string[]>(['Physics', 'Chemistry', 'Higher Math', 'Biology', 'ICT', 'English']);
  const [newSubjectInput, setNewSubjectInput] = useState('');

  const handleSelectProfile = async (profile: Profile) => {
    if (profile.pinEnabled) {
      setSelectedForPin(profile);
      setPinInput('');
      setPinError('');
    } else {
      try {
        await switchProfile(profile.id);
      } catch (err: any) {
        showToast?.('error', err.message);
      }
    }
  };

  const handleAddSubject = (subjectName: string) => {
    const trimmed = subjectName.trim();
    if (!trimmed) return;
    if (!subjects.includes(trimmed)) {
      setSubjects([...subjects, trimmed]);
    }
    setNewSubjectInput('');
  };

  const handleRemoveSubject = (subjectToRemove: string) => {
    setSubjects(subjects.filter((s) => s !== subjectToRemove));
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForPin) return;

    try {
      await switchProfile(selectedForPin.id, pinInput);
      setSelectedForPin(null);
      setPinInput('');
    } catch (err: any) {
      setPinError(err.message || 'Incorrect PIN');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast?.('warning', 'Please enter a student name');
      return;
    }

    try {
      await createProfile({
        name,
        grade,
        subjects,
        avatar: {
          type: 'initial',
          value: name.trim().charAt(0).toUpperCase(),
          color
        } as any,
        pin: pin.trim() ? pin.trim() : null
      });

      showToast?.('success', `Welcome, ${name}!`);
      setIsCreating(false);
      setName('');
      setPin('');
    } catch (err: any) {
      showToast?.('error', err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-surface flex items-center justify-center p-4 overflow-y-auto antialiased">
      <div className="w-full max-w-md my-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-container text-on-primary-container shadow-sm mb-1">
            <span className="material-symbols-outlined text-3xl">school</span>
          </div>
          <h1 className="font-headline text-2xl font-bold text-on-surface tracking-tight">
            Who's learning today?
          </h1>
          <p className="text-xs font-body text-outline">
            Select a student profile to continue
          </p>
        </div>

        {/* Profile List / Cards */}
        {!isCreating && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  onClick={() => handleSelectProfile(profile)}
                  className="group relative rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-4 shadow-xs hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex flex-col items-center text-center space-y-3 active:scale-[0.98]"
                >
                  {/* Avatar */}
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center font-headline text-xl font-bold text-white shadow-xs transition-transform group-hover:scale-105"
                    style={{ backgroundColor: profile.avatar?.color || '#006a60' }}
                  >
                    {profile.avatar?.value || profile.name.charAt(0)}
                  </div>

                  <div className="min-w-0 w-full">
                    <h3 className="font-headline font-semibold text-sm text-on-surface truncate">
                      {profile.name}
                    </h3>
                    <p className="text-[11px] font-body text-outline mt-0.5 truncate">
                      {profile.grade || 'Student'} • {profile.subjects?.length || 0} subjects
                    </p>
                  </div>

                  {profile.pinEnabled && (
                    <div className="absolute top-2 right-2 text-outline/60">
                      <span className="material-symbols-outlined text-[16px]">lock</span>
                    </div>
                  )}
                </div>
              ))}

              {/* Add Profile Card */}
              <div
                onClick={() => setIsCreating(true)}
                className="rounded-2xl border-2 border-dashed border-surface-container-high p-4 flex flex-col items-center justify-center text-center space-y-2 min-h-[140px] hover:border-primary hover:bg-surface-container-lowest transition-all cursor-pointer text-outline hover:text-primary active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">add</span>
                </div>
                <span className="font-headline text-xs font-semibold">Add New Profile</span>
              </div>
            </div>
          </div>
        )}

        {/* Create Profile Form */}
        {isCreating && (
          <form onSubmit={handleCreateSubmit} className="rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-5 space-y-4 shadow-sm max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <h2 className="font-headline text-base font-semibold text-on-surface">Create Student Profile</h2>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-xs font-body text-outline hover:text-on-surface cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-body text-outline mb-1">Student Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Ayesha Rahman"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-body text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            {/* Grade / Class */}
            <div>
              <label className="block text-xs font-body text-outline mb-1">Class / Goal</label>
              <StitchSelect
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                options={GRADE_OPTIONS}
                className="w-full h-10 px-3 text-xs"
              />
            </div>

            {/* Subjects List Input */}
            <div className="space-y-2">
              <label className="block text-xs font-headline font-semibold text-on-surface">
                Taught Subjects List 📚
              </label>

              <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2.5 rounded-xl bg-surface-container-low border border-surface-container-high">
                {subjects.map((sub) => (
                  <span
                    key={sub}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-headline font-semibold"
                  >
                    {sub}
                    <button
                      type="button"
                      onClick={() => handleRemoveSubject(sub)}
                      className="hover:text-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type new subject..."
                  value={newSubjectInput}
                  onChange={(e) => setNewSubjectInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubject(newSubjectInput);
                    }
                  }}
                  className="flex-1 h-9 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-body text-on-surface focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => handleAddSubject(newSubjectInput)}
                  className="px-3 h-9 rounded-xl bg-primary text-on-primary font-headline text-xs font-semibold hover:bg-primary/90 cursor-pointer"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Color Avatar */}
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

            {/* Optional PIN */}
            <div>
              <label className="block text-xs font-body text-outline mb-1">Optional PIN Protection (4 digits)</label>
              <input
                type="password"
                maxLength={4}
                placeholder="Leave blank for no PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-body text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-xl text-xs font-headline font-semibold text-on-surface hover:bg-surface-container-low cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-headline font-semibold shadow-xs hover:bg-primary/90 cursor-pointer"
              >
                Create Profile
              </button>
            </div>
          </form>
        )}

        {/* PIN Entry Modal */}
        {selectedForPin && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <form onSubmit={handlePinSubmit} className="w-full max-w-xs rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-5 space-y-4 shadow-xl">
              <div className="text-center space-y-1">
                <div
                  className="w-12 h-12 rounded-full mx-auto flex items-center justify-center font-headline text-lg font-bold text-white mb-2"
                  style={{ backgroundColor: selectedForPin.avatar?.color || '#006a60' }}
                >
                  {selectedForPin.avatar?.value || selectedForPin.name.charAt(0)}
                </div>
                <h3 className="font-headline font-semibold text-base text-on-surface">Enter PIN for {selectedForPin.name}</h3>
                <p className="text-[11px] font-body text-outline">This profile is PIN protected</p>
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
    </div>
  );
}
