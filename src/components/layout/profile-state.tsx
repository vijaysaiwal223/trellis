"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Profile = "lead" | "owner" | "admin";

/** Who the owner profile acts as. Matches the owner on the demo renewals. */
export const OWNER_NAME: string = "Priya Sharma";

/** The person behind each profile, as they appear in the profile menu. */
export const profileIdentity: Record<Profile, { name: string; role: string; initials: string }> = {
  lead: { name: "Anika Rao", role: "Lead", initials: "AR" },
  owner: { name: OWNER_NAME, role: "Owner", initials: "PS" },
  admin: { name: "Vijay Saiwal", role: "Admin", initials: "VS" },
};

/** Where each profile lands when it's switched to. */
export const profileHome: Record<Profile, string> = {
  lead: "/",
  owner: "/owner",
  admin: "/admin",
};

const STORAGE_KEY = "trellis-profile-v1";

type ProfileContextValue = {
  profile: Profile;
  setProfile: (profile: Profile) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile>("lead");

  // Read the saved profile after mount, so server and client render the same first frame.
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved === "lead" || saved === "owner" || saved === "admin") setProfileState(saved);
      } catch {
        // Storage blocked: the switcher still works for this session.
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const setProfile = useCallback((next: Profile) => {
    setProfileState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not saved; the choice lasts until reload.
    }
  }, []);

  const value = useMemo(() => ({ profile, setProfile }), [profile, setProfile]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error("useProfile must be used inside ProfileProvider");
  return context;
}
