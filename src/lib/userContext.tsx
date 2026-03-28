"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type UserProfile = {
    visaType: "F1" | "H1B" | null;
    state: string | null;
    mood: number | null;
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