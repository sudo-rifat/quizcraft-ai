import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initDatabase } from '../db/db';
import * as profileService from '../services/profileService';
import { Profile } from '../types';

interface ProfileContextType {
  profiles: Profile[];
  activeProfile: Profile | null;
  activeProfileId: string | null;
  isLoading: boolean;
  isProfileSelectorOpen: boolean;
  setIsProfileSelectorOpen: (isOpen: boolean) => void;
  isSwitcherOpen: boolean;
  setIsSwitcherOpen: (isOpen: boolean) => void;
  isManagementOpen: boolean;
  setIsManagementOpen: (isOpen: boolean) => void;
  createProfile: (data: profileService.CreateProfileParams) => Promise<Profile>;
  switchProfile: (profileId: string, pinInput?: string | null) => Promise<void>;
  updateProfile: (id: string, updates: profileService.UpdateProfileParams) => Promise<Profile | undefined>;
  deleteProfile: (id: string) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

export const ACTIVE_PROFILE_KEY = 'quizcraft_active_profile_id';

interface ProfileProviderProps {
  children: ReactNode;
}

export function ProfileProvider({ children }: ProfileProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(() => {
    return localStorage.getItem(ACTIVE_PROFILE_KEY) || null;
  });
  
  const [isProfileSelectorOpen, setIsProfileSelectorOpen] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isManagementOpen, setIsManagementOpen] = useState(false);

  // Live Query to get all profiles reactively from Dexie
  const profiles = useLiveQuery(() => db.profiles.toArray(), []) || [];

  // Initialize DB and migration on launch
  useEffect(() => {
    initDatabase().then(() => {
      setIsLoading(false);
    }).catch(err => {
      console.error('Error initializing database:', err);
      setIsLoading(false);
    });
  }, []);

  // Validate activeProfileId against fetched profiles once DB is ready
  useEffect(() => {
    if (isLoading) return;

    const storedId = localStorage.getItem(ACTIVE_PROFILE_KEY);

    if (profiles.length === 0) {
      // No profiles exist -> prompt profile creation/selection
      setActiveProfileIdState(null);
      localStorage.removeItem(ACTIVE_PROFILE_KEY);
      setIsProfileSelectorOpen(true);
    } else if (storedId) {
      const exists = profiles.some(p => p.id === storedId);
      if (exists) {
        setActiveProfileIdState(storedId);
      } else {
        // Stale profile ID
        localStorage.removeItem(ACTIVE_PROFILE_KEY);
        setActiveProfileIdState(null);
        setIsProfileSelectorOpen(true);
      }
    } else {
      // Profiles exist but no active profile set
      setIsProfileSelectorOpen(true);
    }
  }, [isLoading, profiles]);

  const activeProfile = profiles.find(p => p.id === activeProfileId) || null;

  const setActiveProfileId = (id: string | null) => {
    if (id) {
      localStorage.setItem(ACTIVE_PROFILE_KEY, id);
      setActiveProfileIdState(id);
    } else {
      localStorage.removeItem(ACTIVE_PROFILE_KEY);
      setActiveProfileIdState(null);
    }
  };

  const createProfile = async (data: profileService.CreateProfileParams): Promise<Profile> => {
    const newProfile = await profileService.createProfile(data);
    setActiveProfileId(newProfile.id);
    setIsProfileSelectorOpen(false);
    return newProfile;
  };

  const switchProfile = async (profileId: string, pinInput: string | null = null): Promise<void> => {
    const target = profiles.find(p => p.id === profileId);
    if (!target) {
      throw new Error('Profile not found.');
    }

    if (target.pinEnabled) {
      if (!pinInput) {
        throw new Error('PIN_REQUIRED');
      }
      const hash = await profileService.hashPin(pinInput);
      if (hash !== target.pinHash) {
        throw new Error('Invalid PIN. Please try again.');
      }
    }

    setActiveProfileId(profileId);
    setIsProfileSelectorOpen(false);
    setIsSwitcherOpen(false);
  };

  const updateProfile = async (id: string, updates: profileService.UpdateProfileParams): Promise<Profile | undefined> => {
    const updated = await profileService.updateProfile(id, updates);
    return updated;
  };

  const deleteProfile = async (id: string): Promise<void> => {
    await profileService.deleteProfile(id);
    if (activeProfileId === id) {
      const remaining = profiles.filter(p => p.id !== id);
      if (remaining.length > 0) {
        setActiveProfileId(remaining[0].id);
      } else {
        setActiveProfileId(null);
        setIsProfileSelectorOpen(true);
      }
    }
  };

  const value: ProfileContextType = {
    profiles,
    activeProfile,
    activeProfileId,
    isLoading,
    isProfileSelectorOpen,
    setIsProfileSelectorOpen,
    isSwitcherOpen,
    setIsSwitcherOpen,
    isManagementOpen,
    setIsManagementOpen,
    createProfile,
    switchProfile,
    updateProfile,
    deleteProfile
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useActiveProfile(): ProfileContextType {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useActiveProfile must be used within a ProfileProvider');
  }
  return context;
}

export function useProfiles() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfiles must be used within a ProfileProvider');
  }
  return {
    profiles: context.profiles,
    isLoading: context.isLoading,
    createProfile: context.createProfile,
    updateProfile: context.updateProfile,
    deleteProfile: context.deleteProfile
  };
}
