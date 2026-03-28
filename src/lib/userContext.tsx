"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type UserProfile = {
    visaType: "F1" | "H1B" | null;
    state: string | null;
    mood: number | null;
    gradDate: string | null;     // ISO date string e.g. "2026-05-15"
    optEndDate: string | null;   // ISO date string — for OPT/STEM OPT holders
};

type UserContextType = {
    profile: UserProfile;
    setProfile: (profile: UserProfile) => void;
};

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
    const [profile, setProfile] = useState<UserProfile>({
        visaType: null,
        state: null,
        mood: null,
        gradDate: null,
        optEndDate: null,
    });

    return (
        <UserContext.Provider value={{ profile, setProfile }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error("useUser must be used within UserProvider");
    return ctx;
}